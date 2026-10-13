// Hook: GET /api/backend/v1/tools/list_meetings e GET /backend/v1/tools/list_meetings
// Camada de Integração do Consultor Digital - Capability V2: list_meetings (Tool de Leitura)
//
// Roteamento e Compatibilidade no Skip Cloud:
// 1. Rota pública: GET /api/backend/v1/tools/list_meetings
//    No domínio público (*.goskip.app), o reverse proxy da plataforma Skip roteia
//    apenas o prefixo /api/* para o PocketBase.
// 2. Rota canônica interna: GET /backend/v1/tools/list_meetings
//    Mantida para acesso direto/interno ao host do PocketBase (...shrd00.internal.goskip.dev).
//
// Reutilização de Mecanismos e Padrões da Camada (ADR-001):
// - Mesma autenticação server-to-server (X-API-Key fail-closed via $secrets.get('CONSULTOR_API_KEY') e CONSULTOR_API_KEY_NEW)
// - Mesma comparação em tempo constante para mitigar timing attacks
// - Rate limiting em memória: 120 req/min por chave (alinhado ao padrão operacional de ferramentas da camada)
// - Mesmo auditLog unificado gravando em tool_logs com duracao_ms >= 1 (ferramenta: 'list_meetings', LGPD: sem valor de filtros)
// - Mesmo envelope padronizado { ok: true, data: { ... } } ou { ok: false, error: { code, message, details } }
// - Estritamente leitura (idempotência não aplicável, sem mutação de banco de dados)

;['/api/backend/v1/tools/list_meetings', '/backend/v1/tools/list_meetings'].forEach((routePath) => {
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
          logRecord.set('ferramenta', data.ferramenta || 'list_meetings')
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
        ferramenta: 'list_meetings',
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
    // CAMADA 3: EXTRAÇÃO E VALIDAÇÃO DE QUERY PARAMS
    // =========================================================================
    let rawEmail = ''
    let rawStatus = ''
    let rawFuturasApenas = ''
    let rawLimite = ''

    try {
      const reqInfo = e.requestInfo()
      const queryParams = (reqInfo && reqInfo.query) || {}
      rawEmail = queryParams.email || ''
      rawStatus = queryParams.status || ''
      rawFuturasApenas = queryParams.futuras_apenas || ''
      rawLimite = queryParams.limite || ''
    } catch (qpErr) {
      rawEmail = e.request.url.query().get('email') || ''
      rawStatus = e.request.url.query().get('status') || ''
      rawFuturasApenas = e.request.url.query().get('futuras_apenas') || ''
      rawLimite = e.request.url.query().get('limite') || ''
    }

    // --- Validação dos parâmetros ---
    const validationIssues = []

    // 1. email (opcional)
    let emailFilter = ''
    if (rawEmail && typeof rawEmail === 'string' && rawEmail.trim() !== '') {
      const trimmedEmail = rawEmail.trim().toLowerCase()
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
      if (!emailRegex.test(trimmedEmail)) {
        validationIssues.push({
          field: 'email',
          message: "O parâmetro 'email' informado não possui um formato válido de e-mail.",
        })
      } else {
        emailFilter = trimmedEmail
      }
    }

    // 2. status (opcional: pendente | confirmada | realizada | cancelada)
    const ALLOWED_STATUSES = ['pendente', 'confirmada', 'realizada', 'cancelada']
    let statusFilter = ''
    if (rawStatus && typeof rawStatus === 'string' && rawStatus.trim() !== '') {
      const trimmedStatus = rawStatus.trim().toLowerCase()
      if (ALLOWED_STATUSES.indexOf(trimmedStatus) === -1) {
        validationIssues.push({
          field: 'status',
          message:
            "O parâmetro 'status' deve ser exatamente um dos valores permitidos: 'pendente', 'confirmada', 'realizada' ou 'cancelada'.",
        })
      } else {
        statusFilter = trimmedStatus
      }
    }

    // 3. futuras_apenas (opcional: 'true' | 'false')
    let futurasApenas = false
    if (
      rawFuturasApenas !== undefined &&
      rawFuturasApenas !== null &&
      String(rawFuturasApenas).trim() !== ''
    ) {
      const valStr = String(rawFuturasApenas).trim().toLowerCase()
      if (valStr === 'true' || valStr === '1') {
        futurasApenas = true
      } else if (valStr === 'false' || valStr === '0') {
        futurasApenas = false
      } else {
        validationIssues.push({
          field: 'futuras_apenas',
          message: "O parâmetro 'futuras_apenas' deve ser 'true' ou 'false'.",
        })
      }
    }

    // 4. limite (opcional: 1–50, default 10)
    let limite = 10
    if (rawLimite !== undefined && rawLimite !== null && String(rawLimite).trim() !== '') {
      const parsedLimit = parseInt(String(rawLimite).trim(), 10)
      if (isNaN(parsedLimit) || parsedLimit < 1 || parsedLimit > 50) {
        validationIssues.push({
          field: 'limite',
          message: "O parâmetro 'limite' deve ser um número inteiro entre 1 e 50.",
        })
      } else {
        limite = parsedLimit
      }
    }

    if (validationIssues.length > 0) {
      return sendErrorEnvelope(
        400,
        'VALIDATION_ERROR',
        'Parâmetros de consulta inválidos. Corrija os filtros e tente novamente.',
        validationIssues,
      )
    }

    // =========================================================================
    // CAMADA 4: PERSISTÊNCIA E EXECUÇÃO DA CONSULTA
    // =========================================================================
    try {
      const nowIso = new Date().toISOString()
      const nowPbDate = nowIso.replace('T', ' ')

      // Monta filtros para o PocketBase
      // Se futuras_apenas === true: data_hora >= now
      // Se sem futuras_apenas: buscamos registros futuros (data_hora >= now) e passados (data_hora < now)
      // e ordenamos no código: futuras primeiro em ordem crescente, depois passadas em ordem decrescente.
      const filterParts = []
      const filterParams = {}

      if (emailFilter) {
        filterParts.push('email = {:email}')
        filterParams.email = emailFilter
      }

      if (statusFilter) {
        filterParts.push('status = {:status}')
        filterParams.status = statusFilter
      }

      let reunioesRetornadas = []

      if (futurasApenas) {
        // Apenas futuras em ordem crescente
        filterParts.push('data_hora >= {:nowDate}')
        filterParams.nowDate = nowPbDate

        const pbFilter = filterParts.join(' && ')
        const records = $app.findRecordsByFilter(
          'meetings',
          pbFilter,
          'data_hora', // crescente
          limite,
          0,
          filterParams,
        )

        reunioesRetornadas = records || []
      } else {
        // Sem filtro exclusor de futuras:
        // Buscamos até `limite` futuras (data_hora >= now, crescente)
        // Se não atingir `limite`, completamos com passadas (data_hora < now, decrescente)
        const filterFuturasParts = filterParts.slice()
        const paramsFuturas = Object.assign({}, filterParams)
        filterFuturasParts.push('data_hora >= {:nowDate}')
        paramsFuturas.nowDate = nowPbDate

        const pbFuturasFilter = filterFuturasParts.join(' && ')
        const futurasRecords =
          $app.findRecordsByFilter(
            'meetings',
            pbFuturasFilter,
            'data_hora', // crescente
            limite,
            0,
            paramsFuturas,
          ) || []

        const resultadoTotal = [].concat(futurasRecords)

        const faltantes = limite - resultadoTotal.length
        if (faltantes > 0) {
          const filterPassadasParts = filterParts.slice()
          const paramsPassadas = Object.assign({}, filterParams)
          filterPassadasParts.push('data_hora < {:nowDate}')
          paramsPassadas.nowDate = nowPbDate

          const pbPassadasFilter = filterPassadasParts.join(' && ')
          const passadasRecords =
            $app.findRecordsByFilter(
              'meetings',
              pbPassadasFilter,
              '-data_hora', // decrescente (passadas mais recentes primeiro)
              faltantes,
              0,
              paramsPassadas,
            ) || []

          for (let i = 0; i < passadasRecords.length; i++) {
            resultadoTotal.push(passadasRecords[i])
          }
        }

        reunioesRetornadas = resultadoTotal
      }

      // =========================================================================
      // CAMADA 5: LGPD / SANITIZAÇÃO DE CAMPOS E ENVELOPE DE RESPOSTA
      // Retornar apenas: id, nome, empresa, email, data_hora, assunto, observacoes (truncada a 500 chars), status, created
      // =========================================================================
      const reunioesSanitizadas = reunioesRetornadas.map((rec) => {
        let obs = rec.getString('observacoes') || ''
        if (obs.length > 500) {
          obs = obs.substring(0, 500)
        }

        return {
          id: rec.id,
          nome: rec.getString('nome'),
          empresa: rec.getString('empresa'),
          email: rec.getString('email'),
          data_hora: rec.getString('data_hora'),
          assunto: rec.getString('assunto'),
          observacoes: obs,
          status: rec.getString('status'),
          created: rec.getString('created'),
        }
      })

      // Auditoria de Sucesso
      infra.auditLog({
        ferramenta: 'list_meetings',
        resultado: 'sucesso',
        error_code: '',
        http_status: 200,
      })

      // Retorno com envelope padronizado
      return e.json(200, {
        ok: true,
        data: {
          total: reunioesSanitizadas.length,
          reunioes: reunioesSanitizadas,
        },
      })
    } catch (queryErr) {
      const errorMsg =
        queryErr && queryErr.message
          ? String(queryErr.message)
          : 'Falha interna ao consultar reuniões'
      console.error('[LIST_MEETINGS_QUERY_ERROR]', errorMsg)

      return sendErrorEnvelope(
        500,
        'INTERNAL_ERROR',
        'Ocorreu um erro interno ao listar reuniões. Tente novamente mais tarde.',
        [{ field: 'server', message: errorMsg }],
      )
    }
  })
})
