// Hook: POST /api/backend/v1/tools/schedule_meeting e POST /backend/v1/tools/schedule_meeting
// Camada de Integração do Consultor Digital - Capability V2: schedule_meeting
//
// Roteamento e Compatibilidade no Skip Cloud:
// 1. Rota pública: POST /api/backend/v1/tools/schedule_meeting
//    No domínio público (*.goskip.app), o reverse proxy da plataforma Skip roteia
//    apenas o prefixo /api/* para o PocketBase.
// 2. Rota canônica interna: POST /backend/v1/tools/schedule_meeting
//    Mantida para acesso direto/interno ao host do PocketBase.
//
// Reutilização de Mecanismos e Padrões da V1:
// - Mesma autenticação server-to-server (X-API-Key fail-closed via $secrets.get('CONSULTOR_API_KEY'))
// - Mesma comparação em tempo constante para mitigar timing attacks
// - Mesmo rate limiting compartilhado em memória (120 req/min)
// - Mesmo auditLog unificado gravando em tool_logs com duracao_ms >= 1 (Math.max(1, Date.now() - startTime)) e LGPD sem PII
// - Mesmo envelope padronizado { ok: true, data: { ... } } ou { ok: false, error: { code, message, details } }
// - Idempotência por email + data_hora (HTTP 200 com duplicado: true se mesma data_hora)

;['/api/backend/v1/tools/schedule_meeting', '/backend/v1/tools/schedule_meeting'].forEach(
  (routePath) => {
    routerAdd('POST', routePath, (e) => {
      const startTime = Date.now()
      const requestId = 'req_' + $security.randomString(16)

      // =========================================================================
      // CAMADA 1: INFRAESTRUTURA (Infra) - Reutiliza os exatos mesmos padrões da V1
      // =========================================================================
      const infra = {
        // 1.1 Audit Logger Unificado (piso de 1ms, LGPD sem payload/PII)
        auditLog: (data) => {
          const duracao_ms = Math.max(1, Date.now() - startTime)
          try {
            const logsCol = $app.findCollectionByNameOrId('tool_logs')
            const logRecord = new Record(logsCol)
            logRecord.set('ferramenta', data.ferramenta || 'schedule_meeting')
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

        // 1.3 Autenticação Server-to-Server (Fail-Closed: mesma chave CONSULTOR_API_KEY)
        authenticate: (request) => {
          const configuredKey = $secrets.get('CONSULTOR_API_KEY')
          if (!configuredKey || !configuredKey.trim()) {
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

          const authHeaderKey =
            request.header.get('X-API-Key') || request.header.get('x-api-key') || ''

          if (
            !authHeaderKey ||
            !infra.constantTimeCompare(authHeaderKey.trim(), configuredKey.trim())
          ) {
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
            keyIdentifier: authHeaderKey.trim().slice(0, 10),
          }
        },

        // 1.4 Rate Limiting em memória (120 req/min por chave compartilhado)
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
          ferramenta: 'schedule_meeting',
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
      // CAMADA 3: PERSISTÊNCIA (Adaptador PocketBase / Repositório meetings)
      // ÚNICO ponto onde $app toca a coleção 'meetings'.
      // =========================================================================
      const meetingRepository = {
        // Converte string ISO para o formato de data do PocketBase ('YYYY-MM-DD HH:MM:SS.SSSZ')
        formatForPocketBaseDate: (isoDateString) => {
          if (!isoDateString || typeof isoDateString !== 'string') return isoDateString
          return isoDateString.replace('T', ' ')
        },

        findMeetingByEmailDataHora: (email, isoDateString) => {
          const pbDateString = meetingRepository.formatForPocketBaseDate(isoDateString)
          try {
            // Consulta no formato de data nativo do PocketBase (com espaço) e fallback para ISO
            let records = $app.findRecordsByFilter(
              'meetings',
              'email = {:email} && data_hora = {:data_hora}',
              '-created',
              1,
              0,
              { email: email, data_hora: pbDateString },
            )

            if ((!records || records.length === 0) && pbDateString !== isoDateString) {
              records = $app.findRecordsByFilter(
                'meetings',
                'email = {:email} && data_hora = {:data_hora}',
                '-created',
                1,
                0,
                { email: email, data_hora: isoDateString },
              )
            }

            if (records && records.length > 0) {
              const rec = records[0]
              return {
                id: rec.id,
                status: rec.getString('status'),
                data_hora: rec.getString('data_hora'),
                created: rec.getString('created'),
              }
            }
          } catch (findErr) {
            console.error(
              '[FIND_MEETING_ERROR]',
              findErr && findErr.message ? findErr.message : findErr,
            )
          }
          return null
        },

        insertMeeting: (meetingData, reqId) => {
          const meetingsCol = $app.findCollectionByNameOrId('meetings')
          const newRecord = new Record(meetingsCol)
          newRecord.set('nome', meetingData.nome)
          newRecord.set('empresa', meetingData.empresa)
          newRecord.set('email', meetingData.email)
          newRecord.set('telefone', meetingData.telefone)
          newRecord.set('data_hora', meetingData.data_hora)
          newRecord.set('assunto', meetingData.assunto)
          newRecord.set('observacoes', meetingData.observacoes)
          newRecord.set('status', 'pendente') // Apenas 'pendente' é gravado pela API
          newRecord.set('request_id', reqId)
          $app.save(newRecord)

          return {
            id: newRecord.id,
            status: newRecord.getString('status'),
            data_hora: newRecord.getString('data_hora'),
            created: newRecord.getString('created'),
          }
        },
      }

      // =========================================================================
      // CAMADA 4: DOMÍNIO (Regras de Negócio Puras da Capability schedule_meeting)
      // =========================================================================
      const scheduleMeetingDomainService = {
        validateAndSanitize: (input) => {
          const issues = []
          const data = input && typeof input === 'object' ? input : {}

          // nome (string, obrigatório, máx 200)
          if (typeof data.nome !== 'string' || !data.nome.trim()) {
            issues.push({
              field: 'nome',
              message: "O campo 'nome' é obrigatório e deve ter no máximo 200 caracteres.",
            })
          } else if (data.nome.trim().length > 200) {
            issues.push({
              field: 'nome',
              message: "O campo 'nome' não pode exceder 200 caracteres.",
            })
          }

          // empresa (string, obrigatório, máx 200 — suporta convenção 'Pessoa física')
          if (typeof data.empresa !== 'string' || !data.empresa.trim()) {
            issues.push({
              field: 'empresa',
              message: "O campo 'empresa' é obrigatório e deve ter no máximo 200 caracteres.",
            })
          } else if (data.empresa.trim().length > 200) {
            issues.push({
              field: 'empresa',
              message: "O campo 'empresa' não pode exceder 200 caracteres.",
            })
          }

          // email (string, obrigatório, email válido RFC, máx 200)
          const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
          if (typeof data.email !== 'string' || !data.email.trim()) {
            issues.push({
              field: 'email',
              message: "O campo 'email' é obrigatório e deve ser um endereço de e-mail válido.",
            })
          } else if (data.email.trim().length > 200) {
            issues.push({
              field: 'email',
              message: "O campo 'email' não pode exceder 200 caracteres.",
            })
          } else if (!emailRegex.test(data.email.trim())) {
            issues.push({
              field: 'email',
              message: "O campo 'email' informado não possui um formato válido de e-mail.",
            })
          }

          // telefone (string, obrigatório, máx 30)
          if (typeof data.telefone !== 'string' || !data.telefone.trim()) {
            issues.push({
              field: 'telefone',
              message: "O campo 'telefone' é obrigatório e deve ter no máximo 30 caracteres.",
            })
          } else if (data.telefone.trim().length > 30) {
            issues.push({
              field: 'telefone',
              message: "O campo 'telefone' não pode exceder 30 caracteres.",
            })
          }

          // data_hora (ISO 8601 com timezone, obrigatório, DEVE SER FUTURA)
          let parsedDate = null
          if (typeof data.data_hora !== 'string' || !data.data_hora.trim()) {
            issues.push({
              field: 'data_hora',
              message:
                "O campo 'data_hora' é obrigatório e deve estar no formato ISO 8601 com fuso horário.",
            })
          } else {
            const rawDateStr = data.data_hora.trim()
            // Verifica se possui timezone explícito (Z ou offset +/-HH:MM ou +/-HHMM)
            const hasTimezone = /(Z|[+-]\d{2}:?\d{2})$/i.test(rawDateStr)
            const timestamp = Date.parse(rawDateStr)

            if (isNaN(timestamp)) {
              issues.push({
                field: 'data_hora',
                message: "O campo 'data_hora' possui formato de data/hora inválido.",
              })
            } else if (!hasTimezone) {
              issues.push({
                field: 'data_hora',
                message:
                  "O campo 'data_hora' deve incluir indicação explícita de fuso horário (ex: '2026-10-15T14:00:00-03:00' ou sufixo Z). Timezone operacional: America/Sao_Paulo (-03:00).",
              })
            } else if (timestamp <= Date.now()) {
              issues.push({
                field: 'data_hora',
                message:
                  "A 'data_hora' informada deve ser uma data e horário futuro para agendamento.",
              })
            } else {
              parsedDate = new Date(timestamp)
            }
          }

          // assunto (string, obrigatório, resumo da pauta, máx 500)
          if (typeof data.assunto !== 'string' || !data.assunto.trim()) {
            issues.push({
              field: 'assunto',
              message:
                "O campo 'assunto' é obrigatório e deve conter um resumo da pauta da reunião.",
            })
          } else if (data.assunto.trim().length > 500) {
            issues.push({
              field: 'assunto',
              message: "O campo 'assunto' não pode exceder 500 caracteres.",
            })
          }

          // observacoes (string, opcional, máx 3000)
          if (
            data.observacoes !== undefined &&
            data.observacoes !== null &&
            typeof data.observacoes !== 'string'
          ) {
            issues.push({
              field: 'observacoes',
              message: "O campo 'observacoes' deve ser texto.",
            })
          } else if (typeof data.observacoes === 'string' && data.observacoes.length > 3000) {
            issues.push({
              field: 'observacoes',
              message: "O campo 'observacoes' não pode exceder 3000 caracteres.",
            })
          }

          if (issues.length > 0) {
            return { valid: false, issues: issues }
          }

          // Formata data_hora normalizada em UTC / ISO
          const normalizedIsoDate = parsedDate.toISOString()

          return {
            valid: true,
            sanitized: {
              nome: String(data.nome || '').trim(),
              empresa: String(data.empresa || '').trim(),
              email: String(data.email || '')
                .toLowerCase()
                .trim(),
              telefone: String(data.telefone || '').trim(),
              data_hora: normalizedIsoDate,
              assunto: String(data.assunto || '').trim(),
              observacoes: data.observacoes ? String(data.observacoes).trim() : '',
            },
          }
        },

        // Executa lógica de persistência com política de idempotência (email + data_hora)
        execute: (sanitizedData, repository, reqId) => {
          // 1. Idempotência: verificar existência prévia por email + data_hora
          const existingMeeting = repository.findMeetingByEmailDataHora(
            sanitizedData.email,
            sanitizedData.data_hora,
          )

          if (existingMeeting) {
            return {
              status: 200,
              duplicado: true,
              meeting_id: existingMeeting.id,
              meeting_status: existingMeeting.status,
              data_hora: existingMeeting.data_hora,
              created_at: existingMeeting.created,
            }
          }

          // 2. Nova solicitação de reunião (status inicial sempre 'pendente')
          // Trata race condition: se houver violação de constraint de unicidade no insert,
          // recupera o registro vencedor e retorna HTTP 200 com duplicado: true
          let createdRecord = null
          try {
            createdRecord = repository.insertMeeting(sanitizedData, reqId)
          } catch (insertErr) {
            const errStr = insertErr && (insertErr.message || String(insertErr))
            const isUniqueConstraint =
              errStr &&
              (errStr.includes('UNIQUE constraint failed') ||
                errStr.includes('constraint failed') ||
                errStr.includes('unique'))

            if (isUniqueConstraint) {
              const concurrentWinner = repository.findMeetingByEmailDataHora(
                sanitizedData.email,
                sanitizedData.data_hora,
              )
              if (concurrentWinner) {
                return {
                  status: 200,
                  duplicado: true,
                  meeting_id: concurrentWinner.id,
                  meeting_status: concurrentWinner.status,
                  data_hora: concurrentWinner.data_hora,
                  created_at: concurrentWinner.created,
                }
              }
            }
            throw insertErr
          }

          return {
            status: 201,
            duplicado: false,
            meeting_id: createdRecord.id,
            meeting_status: createdRecord.status,
            data_hora: createdRecord.data_hora,
            created_at: createdRecord.created,
          }
        },
      }

      // =========================================================================
      // CAMADA 5: TOOL REGISTRY (Registro de Capabilities)
      // =========================================================================
      const toolRegistry = {
        schedule_meeting: {
          nome: 'schedule_meeting',
          descricao:
            'Registra uma solicitação interna de reunião com o consultor com status inicial pendente',
          escopo: 'meetings:write',
          inputSchema: {
            type: 'object',
            properties: {
              nome: { type: 'string', maxLength: 200 },
              empresa: { type: 'string', maxLength: 200 },
              email: { type: 'string', format: 'email', maxLength: 200 },
              telefone: { type: 'string', maxLength: 30 },
              data_hora: { type: 'string', format: 'date-time' },
              assunto: { type: 'string', maxLength: 500 },
              observacoes: { type: 'string', maxLength: 3000 },
            },
            required: ['nome', 'empresa', 'email', 'telefone', 'data_hora', 'assunto'],
          },
          validate: (input) => scheduleMeetingDomainService.validateAndSanitize(input),
          run: (sanitizedData, context) => {
            const repo = (context && context.repository) || meetingRepository
            const rId = (context && context.requestId) || requestId
            return scheduleMeetingDomainService.execute(sanitizedData, repo, rId)
          },
        },
      }

      // --- Orquestração no Transporte HTTP ---
      const tool = toolRegistry['schedule_meeting']
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
          'Dados da solicitação de reunião inválidos. Corrija os campos e tente novamente.',
          validationResult.issues,
        )
      }

      // 2. Execução da Capability através do Registry
      try {
        const domainResult = tool.run(validationResult.sanitized, {
          repository: meetingRepository,
          requestId: requestId,
        })

        // 3. Auditoria de Sucesso unificada
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
            meeting_id: domainResult.meeting_id,
            status: domainResult.meeting_status,
            data_hora: domainResult.data_hora,
            created_at: domainResult.created_at,
            duplicado: domainResult.duplicado,
          },
        })
      } catch (executionErr) {
        const errorMsg =
          executionErr && executionErr.message
            ? String(executionErr.message)
            : 'Falha interna ao processar a solicitação de reunião'
        console.error('[SCHEDULE_MEETING_EXECUTION_ERROR]', errorMsg)

        return sendErrorEnvelope(
          500,
          'INTERNAL_ERROR',
          'Ocorreu um erro interno ao registrar a reunião. Tente novamente mais tarde.',
          [{ field: 'server', message: errorMsg }],
        )
      }
    })
  },
)
