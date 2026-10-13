// Hook: POST /api/backend/v1/tools/update_lead_stage e POST /backend/v1/tools/update_lead_stage
// Camada de Integração do Consultor Digital - Capability V2: update_lead_stage (Tool de Escrita)
//
// Roteamento e Compatibilidade no Skip Cloud:
// 1. Rota pública: POST /api/backend/v1/tools/update_lead_stage
//    No domínio público (*.goskip.app), o reverse proxy da plataforma Skip roteia
//    apenas o prefixo /api/* para o PocketBase.
// 2. Rota canônica interna: POST /backend/v1/tools/update_lead_stage
//    Mantida para acesso direto/interno ao host do PocketBase (...shrd00.internal.goskip.dev).
//
// Reutilização de Mecanismos e Padrões da Camada (ADR-001):
// - Autenticação server-to-server (X-API-Key fail-closed via CONSULTOR_API_KEY / CONSULTOR_API_KEY_NEW)
// - Comparação em tempo constante contra timing attacks
// - Rate limiting em memória: 120 req/min por chave
// - AuditLog unificado gravando em tool_logs com duracao_ms >= 1 (ferramenta: 'update_lead_stage', LGPD: sem e-mail, estágios ou observações)
// - Contrato: body { lead_id OU email, estagio_do_lead (obrigatório), observacao (opcional, <= 500 chars) }
// - Regras de negócio:
//   * lead_id tem precedência se ambos forem enviados.
//   * Se não encontrado: HTTP 200 { ok: true, data: { atualizado: false, motivo: "lead_nao_encontrado" } }
//   * Se encontrado: atualiza SOMENTE o campo estagio_do_lead e retorna { ok: true, data: { atualizado: true, lead_id, estagio_anterior, estagio_novo } }
//   * Idempotência natural: se estagio_anterior === estagio_novo, retorna HTTP 200 com atualizado: true e ambos estágios iguais.
// - IMPORTANTE Goja engine: sempre construir filtros PocketBase com variáveis intermediárias explícitas (filterParts/filterParams/pbFilter).

;['/api/backend/v1/tools/update_lead_stage', '/backend/v1/tools/update_lead_stage'].forEach(
  (routePath) => {
    routerAdd('POST', routePath, (e) => {
      const startTime = Date.now()
      const requestId = 'req_' + $security.randomString(16)

      // =========================================================================
      // CAMADA 1: INFRAESTRUTURA (Infra)
      // =========================================================================
      const infra = {
        // 1.1 Audit Logger Unificado (piso de 1ms, LGPD: SEM dados sensíveis como email, estágios ou observação)
        auditLog: (data) => {
          const duracao_ms = Math.max(1, Date.now() - startTime)
          try {
            const logsCol = $app.findCollectionByNameOrId('tool_logs')
            const logRecord = new Record(logsCol)
            logRecord.set('ferramenta', data.ferramenta || 'update_lead_stage')
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
          ferramenta: 'update_lead_stage',
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
      } catch (err) {
        return sendErrorEnvelope(
          400,
          'VALIDATION_ERROR',
          'Corpo da requisição JSON inválido ou malformado.',
          [{ field: 'body', message: 'JSON inválido' }],
        )
      }

      if (!rawBody || typeof rawBody !== 'object' || Array.isArray(rawBody)) {
        return sendErrorEnvelope(
          400,
          'VALIDATION_ERROR',
          'O corpo da requisição deve ser um objeto JSON válido.',
          [{ field: 'body', message: 'Objeto esperado' }],
        )
      }

      // =========================================================================
      // CAMADA 3: EXTRAÇÃO E VALIDAÇÃO DOS PARÂMETROS
      // =========================================================================
      const issues = []

      // 1. Identificação do lead: lead_id OU email (um dos dois obrigatório; lead_id vence)
      const rawLeadId =
        rawBody.lead_id !== undefined && rawBody.lead_id !== null ? String(rawBody.lead_id) : ''
      const rawEmail =
        rawBody.email !== undefined && rawBody.email !== null ? String(rawBody.email) : ''

      const cleanLeadId = rawLeadId.trim()
      const cleanEmail = rawEmail.trim()

      if (!cleanLeadId && !cleanEmail) {
        issues.push({
          field: 'lead_id',
          message:
            "É obrigatório informar 'lead_id' ou 'email' para localizar o lead a ser atualizado.",
        })
        issues.push({
          field: 'email',
          message:
            "É obrigatório informar 'email' ou 'lead_id' para localizar o lead a ser atualizado.",
        })
      }

      let searchById = false
      let targetLeadId = ''
      let targetEmail = ''

      if (cleanLeadId) {
        searchById = true
        targetLeadId = cleanLeadId
        if (targetLeadId.length > 50) {
          issues.push({
            field: 'lead_id',
            message: "O parâmetro 'lead_id' informado não deve exceder 50 caracteres.",
          })
        }
      } else if (cleanEmail) {
        searchById = false
        targetEmail = cleanEmail.toLowerCase()
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
        if (targetEmail.length > 200) {
          issues.push({
            field: 'email',
            message: "O campo 'email' não pode exceder 200 caracteres.",
          })
        } else if (!emailRegex.test(targetEmail)) {
          issues.push({
            field: 'email',
            message: "O parâmetro 'email' informado não possui um formato válido de e-mail.",
          })
        }
      }

      // 2. estagio_do_lead (obrigatório, enum fechado: novo | qualificado | proposta | descartado)
      const ALLOWED_ESTAGIOS = ['novo', 'qualificado', 'proposta', 'descartado']
      const rawEstagio =
        rawBody.estagio_do_lead !== undefined && rawBody.estagio_do_lead !== null
          ? String(rawBody.estagio_do_lead).toLowerCase().trim()
          : ''

      if (!rawEstagio) {
        issues.push({
          field: 'estagio_do_lead',
          message:
            "O campo 'estagio_do_lead' é obrigatório e deve ser um dos valores: 'novo', 'qualificado', 'proposta' ou 'descartado'.",
        })
      } else if (!ALLOWED_ESTAGIOS.includes(rawEstagio)) {
        issues.push({
          field: 'estagio_do_lead',
          message:
            "O campo 'estagio_do_lead' deve ser exatamente um dos valores permitidos: 'novo', 'qualificado', 'proposta' ou 'descartado'.",
        })
      }

      // 3. observacao (opcional, <= 500 chars, apenas auditoria interna - NÃO gravar em tool_logs)
      if (
        rawBody.observacao !== undefined &&
        rawBody.observacao !== null &&
        typeof rawBody.observacao !== 'string'
      ) {
        issues.push({
          field: 'observacao',
          message: "O campo 'observacao' deve ser texto de até 500 caracteres.",
        })
      } else if (typeof rawBody.observacao === 'string' && rawBody.observacao.length > 500) {
        issues.push({
          field: 'observacao',
          message: "O campo 'observacao' não pode exceder 500 caracteres.",
        })
      }

      if (issues.length > 0) {
        return sendErrorEnvelope(
          400,
          'VALIDATION_ERROR',
          'Parâmetros de atualização inválidos. Corrija os campos e tente novamente.',
          issues,
        )
      }

      // =========================================================================
      // CAMADA 4: PERSISTÊNCIA E ATUALIZAÇÃO DO LEAD
      // IMPORTANTE (Goja engine): construir filtros com variáveis intermediárias
      // explícitas (filterParts / filterParams / pbFilter).
      // =========================================================================
      try {
        let leadRecord = null

        if (searchById) {
          try {
            leadRecord = $app.findRecordById('leads', targetLeadId)
          } catch (_) {
            leadRecord = null
          }
        } else {
          // Busca por email com padrão explícito Goja (ordenado por -created para o mais recente)
          const filterParts = ['email = {:email}']
          const filterParams = { email: targetEmail }
          const pbFilter = filterParts.join(' && ')

          const records =
            $app.findRecordsByFilter('leads', pbFilter, '-created', 1, 0, filterParams) || []
          if (records.length > 0) {
            leadRecord = records[0]
          }
        }

        // Se o lead não for encontrado: padrão estável (HTTP 200, atualizado: false, sem erro falso)
        if (!leadRecord) {
          infra.auditLog({
            ferramenta: 'update_lead_stage',
            resultado: 'sucesso',
            error_code: '',
            http_status: 200,
          })

          return e.json(200, {
            ok: true,
            data: {
              atualizado: false,
              motivo: 'lead_nao_encontrado',
            },
          })
        }

        const estagioAnterior = leadRecord.getString('estagio_do_lead') || 'novo'
        const estagioNovo = rawEstagio

        // Idempotência natural: se o estágio já for o solicitado, não regrava mas responde sucesso estável
        if (estagioAnterior !== estagioNovo) {
          leadRecord.set('estagio_do_lead', estagioNovo)
          $app.save(leadRecord)
        }

        // Auditoria de Sucesso (LGPD: sem email, estágios ou observações no log)
        infra.auditLog({
          ferramenta: 'update_lead_stage',
          resultado: 'sucesso',
          error_code: '',
          http_status: 200,
        })

        return e.json(200, {
          ok: true,
          data: {
            atualizado: true,
            lead_id: leadRecord.id,
            estagio_anterior: estagioAnterior,
            estagio_novo: estagioNovo,
          },
        })
      } catch (mutationErr) {
        const errorMsg =
          mutationErr && mutationErr.message
            ? String(mutationErr.message)
            : 'Falha interna ao atualizar estágio do lead'
        console.error('[UPDATE_LEAD_STAGE_ERROR]', errorMsg)

        return sendErrorEnvelope(
          500,
          'INTERNAL_ERROR',
          'Ocorreu um erro interno ao atualizar o estágio do lead. Tente novamente mais tarde.',
          [{ field: 'server', message: errorMsg }],
        )
      }
    })
  },
)
