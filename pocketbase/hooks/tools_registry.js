// Hook: GET /api/backend/v1/tools e GET /backend/v1/tools
// Camada de Integração do Consultor Digital - Registro de Tools (Descoberta V2)
//
// Roteamento e Compatibilidade no Skip Cloud:
// 1. Rota pública: GET /api/backend/v1/tools
//    No domínio público (*.goskip.app), o reverse proxy da plataforma Skip roteia
//    apenas o prefixo /api/* para o PocketBase.
// 2. Rota canônica interna: GET /backend/v1/tools
//    Mantida para acesso direto/interno ao host do PocketBase (...shrd00.internal.goskip.dev).
//
// Reutilização de Mecanismos e Padrões da Camada (ADR-001):
// - Mesma autenticação server-to-server (X-API-Key fail-closed via $secrets.get('CONSULTOR_API_KEY') e CONSULTOR_API_KEY_NEW)
// - Mesma comparação em tempo constante para mitigar timing attacks
// - Rate limiting em memória: 60 req/min por chave (leitura de catálogo/descoberta)
// - Mesmo auditLog unificado gravando em tool_logs com duracao_ms >= 1 (ferramenta: 'tools_registry')
// - Mesmo envelope padronizado { ok: true, data: { ... } } ou { ok: false, error: { code, message, details } }
// - Fonte única de verdade das ferramentas registradas definida no código do handler

;['/api/backend/v1/tools', '/backend/v1/tools'].forEach((routePath) => {
  routerAdd('GET', routePath, (e) => {
    const startTime = Date.now()
    const requestId = 'req_' + $security.randomString(16)

    // =========================================================================
    // FONTE ÚNICA DE VERDADE: Registro canônico das ferramentas da Camada de Integração
    // Inlinado dentro do handler para escopo estrito do runtime goja (VM pool isolado)
    // =========================================================================
    const registeredTools = [
      {
        nome: 'create_lead',
        metodo: 'POST',
        caminho: '/v1/tools/create_lead',
        versao: 'v1',
        descricao: 'Registra ou atualiza um lead comercial qualificado pelo Consultor Digital',
        campos_obrigatorios: [
          'nome',
          'empresa',
          'email',
          'telefone',
          'necessidade_identificada',
          'estagio_do_lead',
        ],
        campos_opcionais: [
          'problema_relatado',
          'requisitos',
          'solucao_sugerida',
          'resumo_conversa',
          'proximo_passo',
        ],
        idempotencia: 'email+empresa',
        rate_limit: '120 req/min',
      },
      {
        nome: 'schedule_meeting',
        metodo: 'POST',
        caminho: '/v1/tools/schedule_meeting',
        versao: 'v1',
        descricao:
          'Registra uma solicitação interna de reunião com o consultor com status inicial pendente',
        campos_obrigatorios: ['nome', 'empresa', 'email', 'telefone', 'data_hora', 'assunto'],
        campos_opcionais: ['observacoes'],
        idempotencia: 'email+data_hora',
        rate_limit: '120 req/min',
      },
      {
        nome: 'send_email',
        metodo: 'POST',
        caminho: '/v1/tools/send_email',
        versao: 'v1',
        descricao:
          'Envia um e-mail transacional real para o destinatário através do serviço padrão do servidor',
        campos_obrigatorios: ['destinatario', 'assunto', 'corpo'],
        campos_opcionais: ['idempotency_key'],
        idempotencia: 'idempotency_key do chamador',
        rate_limit: '30 req/min',
      },
      {
        nome: 'list_meetings',
        metodo: 'GET',
        caminho: '/v1/tools/list_meetings',
        versao: 'v1',
        descricao:
          'Consulta e lista reuniões agendadas com filtros por e-mail, status e período futuro',
        campos_obrigatorios: [],
        campos_opcionais: ['email', 'status', 'futuras_apenas', 'limite'],
        idempotencia: 'não aplicável (leitura)',
        rate_limit: '120 req/min',
      },
      {
        nome: 'list_leads',
        metodo: 'GET',
        caminho: '/v1/tools/list_leads',
        versao: 'v1',
        descricao:
          'Consulta e lista leads comerciais qualificados com filtros por e-mail, estágio, empresa e limite',
        campos_obrigatorios: [],
        campos_opcionais: ['email', 'estagio_do_lead', 'empresa', 'limite'],
        idempotencia: 'não aplicável (leitura)',
        rate_limit: '120 req/min',
      },
      {
        nome: 'get_lead',
        metodo: 'GET',
        caminho: '/v1/tools/get_lead',
        versao: 'v1',
        descricao:
          'Consulta os detalhes sanitizados de um lead específico a partir do seu id ou endereço de e-mail',
        campos_obrigatorios: [],
        campos_opcionais: ['id', 'email'],
        idempotencia: 'não aplicável (leitura)',
        rate_limit: '120 req/min',
      },
      {
        nome: 'mcp_adapter',
        metodo: 'POST',
        caminho: '/v1/mcp',
        versao: 'v1',
        descricao:
          'Adaptador MCP (Model Context Protocol via JSON-RPC 2.0) sobre o catálogo canônico de ferramentas',
        campos_obrigatorios: ['jsonrpc', 'method'],
        campos_opcionais: ['id', 'params'],
        idempotencia: 'definida por método/tool chamada',
        rate_limit: '120 req/min',
      },
    ]

    // =========================================================================
    // CAMADA 1: INFRAESTRUTURA (Infra)
    // =========================================================================
    const infra = {
      // 1.1 Audit Logger Unificado (piso de 1ms, LGPD: sem payload)
      auditLog: (data) => {
        const duracao_ms = Math.max(1, Date.now() - startTime)
        try {
          const logsCol = $app.findCollectionByNameOrId('tool_logs')
          const logRecord = new Record(logsCol)
          logRecord.set('ferramenta', data.ferramenta || 'tools_registry')
          logRecord.set('resultado', data.resultado) // 'sucesso' | 'erro'
          logRecord.set('error_code', data.error_code || '')
          logRecord.set('request_id', requestId)
          logRecord.set('duracao_ms', duracao_ms)
          logRecord.set('http_status', data.http_status)
          $app.save(logRecord)
        } catch (logErr) {
          console.error('[AUDIT_LOG_ERROR]', logErr && logErr.message ? logErr.message : logErr)
        }
      },

      // 1.2 Comparação segura em tempo constante contra timing attacks
      constantTimeCompare: (a, b) => {
        if (typeof a !== 'string' || typeof b !== 'string') return false
        let mismatch = a.length === b.length ? 0 : 1
        const len = Math.max(a.length, b.length)
        for (let i = 0; i < len; i++) {
          const charA = i < a.length ? a.charCodeAt(i) : 0
          const charB = i < b.length ? b.charCodeAt(i) : 0
          mismatch |= charA ^ charB
        }
        return mismatch === 0
      },

      // 1.3 Autenticação Server-to-Server (Fail-Closed: CONSULTOR_API_KEY / CONSULTOR_API_KEY_NEW)
      authenticate: (request) => {
        const primaryKey = $secrets.get('CONSULTOR_API_KEY') || ''
        const secondaryKey = $secrets.get('CONSULTOR_API_KEY_NEW') || ''

        const rawKeys = (primaryKey + ',' + secondaryKey)
          .split(',')
          .map((k) => k.trim())
          .filter((k) => k.length > 0)

        if (rawKeys.length === 0) {
          console.error(
            '[SECURITY] CONSULTOR_API_KEY não configurada nos secrets. Bloqueando requisição (fail-closed).',
          )
          return {
            authorized: false,
            serverConfigError: true,
            status: 500,
            code: 'INTERNAL_ERROR',
            message: 'Configuração interna do servidor indisponível. Contate o administrador.',
          }
        }

        const authHeaderKey = (
          request.header.get('X-API-Key') ||
          request.header.get('x-api-key') ||
          ''
        ).trim()

        if (!authHeaderKey) {
          return {
            authorized: false,
            serverConfigError: false,
            status: 401,
            code: 'UNAUTHORIZED',
            message:
              'Chave de API ausente ou inválida. Forneça o header X-API-Key com uma chave autorizada.',
          }
        }

        let isMatch = false
        for (let i = 0; i < rawKeys.length; i++) {
          if (infra.constantTimeCompare(authHeaderKey, rawKeys[i])) {
            isMatch = true
            break
          }
        }

        if (!isMatch) {
          return {
            authorized: false,
            serverConfigError: false,
            status: 401,
            code: 'UNAUTHORIZED',
            message:
              'Chave de API ausente ou inválida. Forneça o header X-API-Key com uma chave autorizada.',
          }
        }

        return {
          authorized: true,
          keyIdentifier: authHeaderKey.slice(0, 10),
        }
      },

      // 1.4 Rate Limiting em memória: 60 req/min por chave para descoberta
      checkRateLimit: (keyId) => {
        if (!globalThis.__rateLimitRegistryStore) {
          globalThis.__rateLimitRegistryStore = {}
        }
        const now = Date.now()
        const currentMinute = Math.floor(now / 60000)
        const rateLimitKey = 'rl_registry_' + keyId + '_' + currentMinute
        const currentCount = (globalThis.__rateLimitRegistryStore[rateLimitKey] || 0) + 1
        globalThis.__rateLimitRegistryStore[rateLimitKey] = currentCount

        // Limpeza de minutos antigos
        for (const k in globalThis.__rateLimitRegistryStore) {
          const parts = k.split('_')
          const minutePart = parseInt(parts[parts.length - 1], 10)
          if (!isNaN(minutePart) && currentMinute - minutePart > 2) {
            delete globalThis.__rateLimitRegistryStore[k]
          }
        }

        const MAX_REGISTRY_PER_MINUTE = 60
        if (currentCount > MAX_REGISTRY_PER_MINUTE) {
          return {
            limited: true,
            status: 429,
            code: 'RATE_LIMITED',
            message:
              'Limite de requisições excedido para descoberta de ferramentas (máximo 60 req/min). Aguarde antes de enviar novamente.',
            details: [
              {
                field: 'rate_limit',
                message: 'Taxa máxima de consulta ao registro de tools atingida',
              },
            ],
          }
        }

        return { limited: false }
      },
    }

    // =========================================================================
    // CAMADA 2: TRANSPORTE HTTP (Helper de Resposta de Erro com Envelope Padronizado)
    // =========================================================================
    const sendErrorEnvelope = (status, code, message, details) => {
      infra.auditLog({
        ferramenta: 'tools_registry',
        resultado: 'erro',
        error_code: code,
        http_status: status,
      })

      return e.json(status, {
        ok: false,
        error: {
          code: code,
          message: message,
          details: Array.isArray(details) ? details : [],
        },
      })
    }

    // --- Executa Segurança de Infra (Auth + Rate Limiting) ---
    const authResult = infra.authenticate(e.request)
    if (!authResult.authorized) {
      return sendErrorEnvelope(authResult.status, authResult.code, authResult.message, [])
    }

    const rateLimitResult = infra.checkRateLimit(authResult.keyIdentifier)
    if (rateLimitResult.limited) {
      return sendErrorEnvelope(
        rateLimitResult.status,
        rateLimitResult.code,
        rateLimitResult.message,
        rateLimitResult.details,
      )
    }

    // =========================================================================
    // CAMADA 3 & 4: EXECUÇÃO DO REGISTRO & RESPOSTA DE SUCESSO
    // =========================================================================
    try {
      // 1. Auditoria de Sucesso
      infra.auditLog({
        ferramenta: 'tools_registry',
        resultado: 'sucesso',
        error_code: '',
        http_status: 200,
      })

      // 2. Retorno com envelope padronizado { ok: true, data: { ... } }
      return e.json(200, {
        ok: true,
        data: {
          total: registeredTools.length,
          tools: registeredTools,
        },
      })
    } catch (err) {
      const errorMsg =
        err && err.message ? String(err.message) : 'Falha interna ao recuperar registro de tools'
      console.error('[TOOLS_REGISTRY_ERROR]', errorMsg)

      return sendErrorEnvelope(
        500,
        'INTERNAL_ERROR',
        'Ocorreu um erro interno ao consultar o catálogo de ferramentas.',
        [{ field: 'server', message: errorMsg }],
      )
    }
  })
})
