// Hook: POST /api/backend/v1/tools/send_email e POST /backend/v1/tools/send_email
// Camada de Integração do Consultor Digital - Capability V2: send_email
//
// Roteamento e Compatibilidade no Skip Cloud:
// 1. Rota pública: POST /api/backend/v1/tools/send_email
//    No domínio público (*.goskip.app), o reverse proxy da plataforma Skip roteia
//    apenas o prefixo /api/* para o PocketBase.
// 2. Rota canônica interna: POST /backend/v1/tools/send_email
//    Mantida para acesso direto/interno ao host do PocketBase (...shrd00.internal.goskip.dev).
//
// Reutilização de Mecanismos e Padrões da Camada:
// - Mesma autenticação server-to-server (X-API-Key fail-closed via $secrets.get('CONSULTOR_API_KEY') e CONSULTOR_API_KEY_NEW)
// - Mesma comparação em tempo constante para mitigar timing attacks
// - Rate limiting MAIS apertado: 30 req/min por chave (e-mails são mais sensíveis a abuso)
// - Mesmo auditLog unificado gravando em tool_logs com duracao_ms >= 1 e NUNCA gravando corpo ou assunto (LGPD)
// - Mesmo envelope padronizado { ok: true, data: { ... } } ou { ok: false, error: { code, message, details } }
// - Idempotência por idempotency_key (quando informada pelo chamador):
//     * Se já enviada: retorna HTTP 200 { ok: true, data: { message_id, status, duplicado: true } } sem reenviar
//     * Se não informada: envia diretamente (HTTP 201 com duplicado: false)
// - Envio REAL via $app.newMailClient().send(message) com SMTP padrão da Skip Cloud
// - Tabela de rastreio email_sends guarda apenas: idempotency_key, message_id, status, request_id, timestamps (SEM PII/conteúdo)

;['/api/backend/v1/tools/send_email', '/backend/v1/tools/send_email'].forEach((routePath) => {
  routerAdd('POST', routePath, (e) => {
    const startTime = Date.now()
    const requestId = 'req_' + $security.randomString(16)

    // =========================================================================
    // CAMADA 1: INFRAESTRUTURA (Infra)
    // =========================================================================
    const infra = {
      // 1.1 Audit Logger Unificado (piso de 1ms, LGPD: metadados técnicos apenas)
      auditLog: (data) => {
        const duracao_ms = Math.max(1, Date.now() - startTime)
        try {
          const logsCol = $app.findCollectionByNameOrId('tool_logs')
          const logRecord = new Record(logsCol)
          logRecord.set('ferramenta', data.ferramenta || 'send_email')
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

      // 1.4 Rate Limiting em memória mais apertado: 30 req/min por chave para envio de e-mails
      checkRateLimit: (keyId) => {
        if (!globalThis.__rateLimitEmailStore) {
          globalThis.__rateLimitEmailStore = {}
        }
        const now = Date.now()
        const currentMinute = Math.floor(now / 60000)
        const rateLimitKey = 'rl_email_' + keyId + '_' + currentMinute
        const currentCount = (globalThis.__rateLimitEmailStore[rateLimitKey] || 0) + 1
        globalThis.__rateLimitEmailStore[rateLimitKey] = currentCount

        // Limpeza de minutos antigos
        for (const k in globalThis.__rateLimitEmailStore) {
          const parts = k.split('_')
          const minutePart = parseInt(parts[parts.length - 1], 10)
          if (!isNaN(minutePart) && currentMinute - minutePart > 2) {
            delete globalThis.__rateLimitEmailStore[k]
          }
        }

        const MAX_EMAIL_PER_MINUTE = 30
        if (currentCount > MAX_EMAIL_PER_MINUTE) {
          return {
            limited: true,
            status: 429,
            code: 'RATE_LIMITED',
            message:
              'Limite de requisições excedido para envio de e-mails (máximo 30 req/min). Aguarde antes de enviar novamente.',
            details: [{ field: 'rate_limit', message: 'Taxa máxima de envio de e-mails atingida' }],
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
        ferramenta: 'send_email',
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

    // --- Leitura do Corpo da Requisição HTTP ---
    let rawBody = {}
    try {
      const reqInfo = e.requestInfo()
      rawBody = reqInfo.body || {}
    } catch (_) {
      return sendErrorEnvelope(
        400,
        'VALIDATION_ERROR',
        'Corpo da requisição JSON inválido ou malformado.',
        [{ field: 'body', message: 'JSON inválido' }],
      )
    }

    // =========================================================================
    // CAMADA 3: PERSISTÊNCIA & MAILER (Repositório email_sends e Mailer Client)
    // ÚNICO ponto onde $app toca a coleção 'email_sends' e envia via SMTP.
    // =========================================================================
    const emailRepository = {
      // Localiza rastreio prévio por idempotency_key
      findSendByIdempotencyKey: (idempotencyKey) => {
        if (!idempotencyKey) return null
        try {
          const records = $app.findRecordsByFilter(
            'email_sends',
            'idempotency_key = {:key}',
            '-created',
            1,
            0,
            { key: idempotencyKey },
          )
          if (records && records.length > 0) {
            const rec = records[0]
            return {
              id: rec.id,
              idempotency_key: rec.getString('idempotency_key'),
              message_id: rec.getString('message_id'),
              status: rec.getString('status'),
              created: rec.getString('created'),
            }
          }
        } catch (findErr) {
          console.error(
            '[FIND_EMAIL_SEND_ERROR]',
            findErr && findErr.message ? findErr.message : findErr,
          )
        }
        return null
      },

      // Grava registro de rastreio de idempotência (SEM assunto/corpo - LGPD estrita)
      insertSendRecord: (recordData, reqId) => {
        const col = $app.findCollectionByNameOrId('email_sends')
        const newRecord = new Record(col)
        newRecord.set('idempotency_key', recordData.idempotency_key)
        newRecord.set('message_id', recordData.message_id)
        newRecord.set('status', recordData.status)
        newRecord.set('request_id', reqId)
        $app.save(newRecord)

        return {
          id: newRecord.id,
          idempotency_key: newRecord.getString('idempotency_key'),
          message_id: newRecord.getString('message_id'),
          status: newRecord.getString('status'),
          created: newRecord.getString('created'),
        }
      },

      // Executa o envio REAL de e-mail através do cliente de e-mail padrão do PocketBase
      sendRealEmail: (emailData) => {
        const settings = $app.settings()
        const senderAddress =
          (settings && settings.meta && settings.meta.senderAddress) ||
          (settings && settings.smtp && settings.smtp.username) ||
          'no-reply@goskip.app'
        const senderName =
          (settings && settings.meta && settings.meta.senderName) || 'Consultor Digital'

        const message = new MailerMessage({
          from: {
            address: senderAddress,
            name: senderName,
          },
          to: [{ address: emailData.destinatario }],
          subject: emailData.assunto,
          text: emailData.corpo,
          html: emailData.corpo.replace(/\n/g, '<br/>'),
        })

        // Envio síncrono via SMTP configurado no PocketBase
        $app.newMailClient().send(message)

        // Gera identificador estável para rastreio operacional da mensagem
        const generatedMessageId = 'msg_' + $security.randomString(20)
        return {
          message_id: generatedMessageId,
          status: 'enviado',
        }
      },
    }

    // =========================================================================
    // CAMADA 4: DOMÍNIO (Regras de Negócio Puras da Capability send_email)
    // =========================================================================
    const sendEmailDomainService = {
      validateAndSanitize: (input) => {
        const issues = []
        const data = input && typeof input === 'object' ? input : {}

        // destinatario (string, obrigatório, email válido RFC, máx 320)
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
        if (typeof data.destinatario !== 'string' || !data.destinatario.trim()) {
          issues.push({
            field: 'destinatario',
            message:
              "O campo 'destinatario' é obrigatório e deve ser um endereço de e-mail válido.",
          })
        } else if (data.destinatario.trim().length > 320) {
          issues.push({
            field: 'destinatario',
            message: "O campo 'destinatario' não pode exceder 320 caracteres.",
          })
        } else if (!emailRegex.test(data.destinatario.trim())) {
          issues.push({
            field: 'destinatario',
            message: "O campo 'destinatario' informado não possui um formato válido de e-mail.",
          })
        }

        // assunto (string, obrigatório, máx 200)
        if (typeof data.assunto !== 'string' || !data.assunto.trim()) {
          issues.push({
            field: 'assunto',
            message: "O campo 'assunto' é obrigatório e deve ter no máximo 200 caracteres.",
          })
        } else if (data.assunto.trim().length > 200) {
          issues.push({
            field: 'assunto',
            message: "O campo 'assunto' não pode exceder 200 caracteres.",
          })
        }

        // corpo (string, obrigatório, máx 5000)
        if (typeof data.corpo !== 'string' || !data.corpo.trim()) {
          issues.push({
            field: 'corpo',
            message: "O campo 'corpo' é obrigatório e deve ter no máximo 5000 caracteres.",
          })
        } else if (data.corpo.length > 5000) {
          issues.push({
            field: 'corpo',
            message: "O campo 'corpo' não pode exceder 5000 caracteres.",
          })
        }

        // idempotency_key (string, opcional, máx 100)
        if (
          data.idempotency_key !== undefined &&
          data.idempotency_key !== null &&
          typeof data.idempotency_key !== 'string'
        ) {
          issues.push({
            field: 'idempotency_key',
            message: "O campo 'idempotency_key' deve ser uma string de até 100 caracteres.",
          })
        } else if (
          typeof data.idempotency_key === 'string' &&
          data.idempotency_key.trim().length > 100
        ) {
          issues.push({
            field: 'idempotency_key',
            message: "O campo 'idempotency_key' não pode exceder 100 caracteres.",
          })
        }

        if (issues.length > 0) {
          return { valid: false, issues: issues }
        }

        const sanitizedIdempotencyKey =
          typeof data.idempotency_key === 'string' && data.idempotency_key.trim()
            ? data.idempotency_key.trim()
            : ''

        return {
          valid: true,
          sanitized: {
            destinatario: String(data.destinatario || '')
              .toLowerCase()
              .trim(),
            assunto: String(data.assunto || '').trim(),
            corpo: String(data.corpo || '').trim(),
            idempotency_key: sanitizedIdempotencyKey,
          },
        }
      },

      // Executa lógica com verificação e registro de idempotência
      execute: (sanitizedData, repository, reqId) => {
        // 1. Idempotência: Se o chamador forneceu idempotency_key, verificar envio prévio
        if (sanitizedData.idempotency_key) {
          const existingSend = repository.findSendByIdempotencyKey(sanitizedData.idempotency_key)
          if (existingSend) {
            return {
              status: 200,
              duplicado: true,
              message_id: existingSend.message_id,
              email_status: existingSend.status,
            }
          }
        }

        // 2. Envio REAL do e-mail via cliente SMTP do PocketBase
        const sendResult = repository.sendRealEmail(sanitizedData)

        // 3. Persistência de rastreio de idempotência (se idempotency_key fornecida)
        if (sanitizedData.idempotency_key) {
          try {
            repository.insertSendRecord(
              {
                idempotency_key: sanitizedData.idempotency_key,
                message_id: sendResult.message_id,
                status: sendResult.status,
              },
              reqId,
            )
          } catch (insertErr) {
            // Em caso de colisão concorrente no insert da chave de idempotência
            const errStr = insertErr && (insertErr.message || String(insertErr))
            const isUniqueConstraint =
              errStr &&
              (errStr.includes('UNIQUE constraint failed') ||
                errStr.includes('constraint failed') ||
                errStr.includes('unique'))

            if (isUniqueConstraint) {
              const concurrentWinner = repository.findSendByIdempotencyKey(
                sanitizedData.idempotency_key,
              )
              if (concurrentWinner) {
                return {
                  status: 200,
                  duplicado: true,
                  message_id: concurrentWinner.message_id,
                  email_status: concurrentWinner.status,
                }
              }
            }
            console.error('[INSERT_EMAIL_SEND_TRACKING_ERROR]', errStr)
          }
        }

        // 4. Retorno de Sucesso (HTTP 201 Created)
        return {
          status: 201,
          duplicado: false,
          message_id: sendResult.message_id,
          email_status: sendResult.status,
        }
      },
    }

    // =========================================================================
    // CAMADA 5: TOOL REGISTRY (Registro de Capabilities)
    // =========================================================================
    const toolRegistry = {
      send_email: {
        nome: 'send_email',
        descricao:
          'Envia um e-mail transacional real para um destinatário através do serviço padrão do servidor',
        escopo: 'emails:send',
        inputSchema: {
          type: 'object',
          properties: {
            destinatario: { type: 'string', format: 'email', maxLength: 320 },
            assunto: { type: 'string', maxLength: 200 },
            corpo: { type: 'string', maxLength: 5000 },
            idempotency_key: { type: 'string', maxLength: 100 },
          },
          required: ['destinatario', 'assunto', 'corpo'],
        },
        validate: (input) => sendEmailDomainService.validateAndSanitize(input),
        run: (sanitizedData, context) => {
          const repo = (context && context.repository) || emailRepository
          const rId = (context && context.requestId) || requestId
          return sendEmailDomainService.execute(sanitizedData, repo, rId)
        },
      },
    }

    // --- Orquestração no Transporte HTTP ---
    const tool = toolRegistry['send_email']
    if (!tool) {
      return sendErrorEnvelope(
        500,
        'INTERNAL_ERROR',
        'Ferramenta solicitada não está configurada no registro do servidor.',
        [],
      )
    }

    // 1. Validação de Domínio via Registry
    const validationResult = tool.validate(rawBody)
    if (!validationResult.valid) {
      return sendErrorEnvelope(
        400,
        'VALIDATION_ERROR',
        'Dados do e-mail inválidos. Corrija os campos e tente novamente.',
        validationResult.issues,
      )
    }

    // 2. Execução da Capability através do Registry
    try {
      const domainResult = tool.run(validationResult.sanitized, {
        repository: emailRepository,
        requestId: requestId,
      })

      // 3. Auditoria de Sucesso unificada (NUNCA grava dados pessoais nem corpo/assunto)
      infra.auditLog({
        ferramenta: tool.nome,
        resultado: 'sucesso',
        error_code: '',
        http_status: domainResult.status,
      })

      // 4. Envelope de Resposta Padronizado HTTP
      return e.json(domainResult.status, {
        ok: true,
        data: {
          message_id: domainResult.message_id,
          status: domainResult.email_status,
          duplicado: domainResult.duplicado,
        },
      })
    } catch (executionErr) {
      const errorMsg =
        executionErr && executionErr.message
          ? String(executionErr.message)
          : 'Falha interna ao processar o envio do e-mail'
      console.error('[SEND_EMAIL_EXECUTION_ERROR]', errorMsg)

      return sendErrorEnvelope(
        500,
        'INTERNAL_ERROR',
        'Ocorreu um erro interno ao enviar o e-mail. Tente novamente mais tarde.',
        [{ field: 'server', message: errorMsg }],
      )
    }
  })
})
