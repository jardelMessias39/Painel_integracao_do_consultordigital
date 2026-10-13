// Hook: GET /api/backend/v1/tools/get_lead e GET /backend/v1/tools/get_lead
// Camada de Integração do Consultor Digital - Capability V2: get_lead (Tool de Leitura)
//
// Roteamento e Compatibilidade no Skip Cloud:
// 1. Rota pública: GET /api/backend/v1/tools/get_lead
//    No domínio público (*.goskip.app), o reverse proxy da plataforma Skip roteia
//    apenas o prefixo /api/* para o PocketBase.
// 2. Rota canônica interna: GET /backend/v1/tools/get_lead
//    Mantida para acesso direto/interno ao host do PocketBase (...shrd00.internal.goskip.dev).
//
// Reutilização de Mecanismos e Padrões da Camada (ADR-001):
// - Mesma autenticação server-to-server (X-API-Key fail-closed via $secrets.get('CONSULTOR_API_KEY') e CONSULTOR_API_KEY_NEW)
// - Mesma comparação em tempo constante para mitigar timing attacks
// - Rate limiting em memória: 120 req/min por chave (mesmo valor de list_meetings e list_leads)
// - Mesmo auditLog unificado gravando em tool_logs com duracao_ms >= 1 (ferramenta: 'get_lead', LGPD: sem valor de filtros)
// - Entrada: `id` OU `email`. Se os dois vierem, `id` tem prioridade; se nenhum vier, VALIDATION_ERROR.
// - Se não encontrado: resposta de sucesso estável com `data: { lead: null }`
// - Mesma sanitização LGPD da list_leads: apenas campos autorizados (id, nome, empresa, email, telefone, necessidade_identificada, estagio_do_lead, created)
//   com textos truncados a 500 caracteres
// - Envelope padronizado { ok: true, data: { lead: {...} | null } }

;['/api/backend/v1/tools/get_lead', '/backend/v1/tools/get_lead'].forEach((routePath) => {
  routerAdd('GET', routePath, (e) => {
    const startTime = Date.now()
    const requestId = 'req_' + $security.randomString(16)

    // =========================================================================
    // CAMADA 1: INFRAESTRUTURA (Infra)
    // =========================================================================
    const infra = {
      // 1.1 Audit Logger Unificado (piso de 1ms, LGPD: sem valores de filtros ou dados do lead)
      auditLog: (data) => {
        const duracao_ms = Math.max(1, Date.now() - startTime)
        try {
          const logsCol = $app.findCollectionByNameOrId('tool_logs')
          const logRecord = new Record(logsCol)
          logRecord.set('ferramenta', data.ferramenta || 'get_lead')
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

      // 1.2 Comparação segura em tempo constante para mitigar timing attacks
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

      // 1.4 Rate Limiting em memória (120 req/min por chave)
      checkRateLimit: (keyId) => {
        if (!globalThis.__rateLimitStore) {
          globalThis.__rateLimitStore = {}
        }
        const now = Date.now()
        const currentMinute = Math.floor(now / 60000)
        const rateLimitKey = 'rl_' + keyId + '_' + currentMinute
        const currentCount = (globalThis.__rateLimitStore[rateLimitKey] || 0) + 1
        globalThis.__rateLimitStore[rateLimitKey] = currentCount

        for (const k in globalThis.__rateLimitStore) {
          const parts = k.split('_')
          const minutePart = parseInt(parts[parts.length - 1], 10)
          if (!isNaN(minutePart) && currentMinute - minutePart > 2) {
            delete globalThis.__rateLimitStore[k]
          }
        }

        if (currentCount > 120) {
          return {
            limited: true,
            status: 429,
            code: 'RATE_LIMITED',
            message:
              'Limite de requisições excedido para esta chave (máximo 120 req/min). Aguarde antes de enviar novamente.',
            details: [{ field: 'rate_limit', message: 'Taxa máxima atingida' }],
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
        ferramenta: 'get_lead',
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
    // CAMADA 3: EXTRAÇÃO E VALIDAÇÃO DOS PARÂMETROS DE CONSULTA
    // Entrada: `id` OU `email`. Se os dois vierem, `id` tem prioridade;
    // se nenhum vier, VALIDATION_ERROR.
    // =========================================================================
    let rawId = ''
    let rawEmail = ''

    try {
      const reqInfo = e.requestInfo()
      const queryParams = (reqInfo && reqInfo.query) || {}
      rawId = queryParams.id || ''
      rawEmail = queryParams.email || ''
    } catch (qpErr) {
      rawId = e.request.url.query().get('id') || ''
      rawEmail = e.request.url.query().get('email') || ''
    }

    const cleanId = typeof rawId === 'string' ? rawId.trim() : ''
    const cleanEmail = typeof rawEmail === 'string' ? rawEmail.trim() : ''

    if (!cleanId && !cleanEmail) {
      return sendErrorEnvelope(
        400,
        'VALIDATION_ERROR',
        "É obrigatório informar ao menos um parâmetro de identificação: 'id' ou 'email'.",
        [
          {
            field: 'id',
            message: "Forneça o parâmetro 'id' do lead ou o parâmetro 'email'.",
          },
          {
            field: 'email',
            message: "Forneça o parâmetro 'email' do lead ou o parâmetro 'id'.",
          },
        ],
      )
    }

    // Validação específica conforme prioridade
    let searchById = false
    let targetId = ''
    let targetEmail = ''

    if (cleanId) {
      searchById = true
      targetId = cleanId
      if (targetId.length > 50) {
        return sendErrorEnvelope(
          400,
          'VALIDATION_ERROR',
          "O parâmetro 'id' informado é inválido ou excede o tamanho permitido.",
          [{ field: 'id', message: "O 'id' do lead não deve exceder 50 caracteres." }],
        )
      }
    } else {
      searchById = false
      targetEmail = cleanEmail.toLowerCase()
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
      if (!emailRegex.test(targetEmail)) {
        return sendErrorEnvelope(
          400,
          'VALIDATION_ERROR',
          "O parâmetro 'email' informado não possui um formato válido de e-mail.",
          [{ field: 'email', message: 'Formato de e-mail inválido.' }],
        )
      }
    }

    // =========================================================================
    // CAMADA 4: PERSISTÊNCIA E BUSCA DO LEAD
    // =========================================================================
    try {
      let foundRecord = null

      if (searchById) {
        try {
          foundRecord = $app.findRecordById('leads', targetId)
        } catch (findErr) {
          // No PocketBase findRecordById lança quando não encontra
          foundRecord = null
        }
      } else {
        // Busca por email com findRecordsByFilter ordenado por -created para pegar o lead mais recente daquele email
        // Alinhado ao padrão operacional consolidado em list_leads e list_meetings
        const filterParts = ['email = {:email}']
        const filterParams = { email: targetEmail }
        const pbFilter = filterParts.join(' && ')

        const records =
          $app.findRecordsByFilter('leads', pbFilter, '-created', 1, 0, filterParams) || []

        if (records.length > 0) {
          foundRecord = records[0]
        }
      }

      // =========================================================================
      // CAMADA 5: LGPD / SANITIZAÇÃO DE CAMPOS E ENVELOPE DE RESPOSTA
      // Se não encontrado: resposta de sucesso com `data: { lead: null }`
      // Se encontrado: apenas campos autorizados (id, nome, empresa, email, telefone,
      // necessidade_identificada, estagio_do_lead, created) com truncamento a 500 chars
      // =========================================================================
      let sanitizedLead = null

      if (foundRecord) {
        let necessidade = foundRecord.getString('necessidade_identificada') || ''
        if (necessidade.length > 500) {
          necessidade = necessidade.substring(0, 500)
        }

        let nome = foundRecord.getString('nome') || ''
        if (nome.length > 500) {
          nome = nome.substring(0, 500)
        }

        let empresa = foundRecord.getString('empresa') || ''
        if (empresa.length > 500) {
          empresa = empresa.substring(0, 500)
        }

        sanitizedLead = {
          id: foundRecord.id,
          nome: nome,
          empresa: empresa,
          email: foundRecord.getString('email'),
          telefone: foundRecord.getString('telefone'),
          necessidade_identificada: necessidade,
          estagio_do_lead: foundRecord.getString('estagio_do_lead'),
          created: foundRecord.getString('created'),
        }
      }

      // Auditoria de Sucesso (LGPD: sem dados do lead ou parâmetros no log)
      infra.auditLog({
        ferramenta: 'get_lead',
        resultado: 'sucesso',
        error_code: '',
        http_status: 200,
      })

      // Retorno com envelope padronizado { ok: true, data: { lead: {...} | null } }
      return e.json(200, {
        ok: true,
        data: {
          lead: sanitizedLead,
        },
      })
    } catch (queryErr) {
      const errorMsg =
        queryErr && queryErr.message ? String(queryErr.message) : 'Falha interna ao buscar lead'
      console.error('[GET_LEAD_QUERY_ERROR]', errorMsg)

      return sendErrorEnvelope(
        500,
        'INTERNAL_ERROR',
        'Ocorreu um erro interno ao buscar o lead. Tente novamente mais tarde.',
        [{ field: 'server', message: errorMsg }],
      )
    }
  })
})
