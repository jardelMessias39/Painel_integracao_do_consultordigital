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
        // Suporta múltiplas chaves separadas por vírgula em CONSULTOR_API_KEY ou CONSULTOR_API_KEY + CONSULTOR_API_KEY_NEW
        authenticate: (request) => {
          const primaryKey = $secrets.get('CONSULTOR_API_KEY') || ''
          const secondaryKey = $secrets.get('CONSULTOR_API_KEY_NEW') || ''

          // Coleta todas as chaves configuradas (suporta valores únicos ou separados por vírgula)
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

        // Busca reuniões conflitantes no mesmo horário com status pendente ou confirmada
        // pertencentes a OUTRO e-mail (ou seja, outro lead/visitante disputando o mesmo slot)
        findConflictingMeetings: (email, isoDateString) => {
          const pbDateString = meetingRepository.formatForPocketBaseDate(isoDateString)
          const conflicts = []
          try {
            const filterParts = [
              'email != {:email}',
              "(status = 'pendente' || status = 'confirmada')",
              'data_hora = {:data_hora}',
            ]
            const pbFilter = filterParts.join(' && ')
            const filterParams = { email: email, data_hora: pbDateString }

            let records = $app.findRecordsByFilter(
              'meetings',
              pbFilter,
              '+created',
              50,
              0,
              filterParams,
            )

            if ((!records || records.length === 0) && pbDateString !== isoDateString) {
              filterParams.data_hora = isoDateString
              records = $app.findRecordsByFilter(
                'meetings',
                pbFilter,
                '+created',
                50,
                0,
                filterParams,
              )
            }

            if (records && records.length > 0) {
              for (let i = 0; i < records.length; i++) {
                const r = records[i]
                conflicts.push({
                  id: r.id,
                  nome: r.getString('nome') || 'Não informado',
                  empresa: r.getString('empresa') || 'Pessoa física',
                  email: r.getString('email') || '',
                  status: r.getString('status'),
                  assunto: r.getString('assunto') || '',
                })
              }
            }
          } catch (confErr) {
            console.error(
              '[FIND_CONFLICTING_MEETINGS_ERROR]',
              confErr && confErr.message ? confErr.message : confErr,
            )
          }
          return conflicts
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
      // CAMADA 3.5: NOTIFICAÇÃO POR E-MAIL INSTANTÂNEA AOS ADMINISTRADORES
      // Reutiliza o mesmo padrão do daily_meetings_summary_cron ($app.newMailClient)
      // Execução estritamente tolerante a falhas (try/catch fail-safe)
      // Auditoria LGPD: registra evento técnico SEM corpo nem PII
      // =========================================================================
      const notificationService = {
        formatDateTimeSP: (isoDateString) => {
          try {
            const rawDateStr = String(isoDateString || '').replace(' ', 'T')
            const utcDate = new Date(rawDateStr)
            if (isNaN(utcDate.getTime())) return isoDateString

            const SP_OFFSET_MS = -3 * 60 * 60 * 1000
            const spDate = new Date(utcDate.getTime() + SP_OFFSET_MS)

            const pad = (n) => (n < 10 ? '0' + n : '' + n)
            const dia = pad(spDate.getUTCDate())
            const mes = pad(spDate.getUTCMonth() + 1)
            const ano = spDate.getUTCFullYear()
            const hora = pad(spDate.getUTCHours())
            const minuto = pad(spDate.getUTCMinutes())

            return (
              dia + '/' + mes + '/' + ano + ' às ' + hora + ':' + minuto + ' (horário de Brasília)'
            )
          } catch (_) {
            return isoDateString
          }
        },

        sendInstantMeetingEmail: (meetingData, conflictCount, conflictingList) => {
          try {
            // 1. Obter e-mails dos administradores cadastrados na coleção users
            const users = $app.findRecordsByFilter('users', "email != ''", 'created', 10, 0)
            const recipientEmails = []

            if (users && users.length > 0) {
              for (let i = 0; i < users.length; i++) {
                const uEmail = users[i].getString('email').trim().toLowerCase()
                if (uEmail && recipientEmails.indexOf(uEmail) === -1) {
                  recipientEmails.push(uEmail)
                }
              }
            }

            if (recipientEmails.length === 0) {
              console.warn(
                '[INSTANT_EMAIL] Nenhum usuário administrador com e-mail encontrado na coleção users.',
              )
              return
            }

            // 2. Formatação dos dados da reunião
            const dataHoraFormatada = notificationService.formatDateTimeSP(meetingData.data_hora)
            const nomeLead = meetingData.nome || 'Não informado'
            const empresaLead = meetingData.empresa || 'Pessoa física'
            const emailLead = meetingData.email || 'Não informado'
            const telefoneLead = meetingData.telefone || 'Não informado'
            const assuntoLead = meetingData.assunto || 'Sem assunto'
            const obsLead = meetingData.observacoes || ''

            const hasConflict = conflictCount > 0
            const subject = hasConflict
              ? '⚠ [CONFLITO] Nova reunião agendada — ' + nomeLead + ' (' + empresaLead + ')'
              : 'Nova reunião agendada — ' + nomeLead + ' (' + empresaLead + ')'

            // 3. Montar seção de conflito (se houver)
            let conflictTextSection = ''
            let conflictHtmlSection = ''
            if (hasConflict) {
              conflictTextSection =
                '\n==================================================\n' +
                '⚠ ATENÇÃO: CONFLITO DE HORÁRIO IDENTIFICADO!\n' +
                'Já existe(m) ' +
                conflictCount +
                ' outra(s) reunião(ões) neste mesmo horário:\n'

              for (let c = 0; c < conflictingList.length; c++) {
                const confItem = conflictingList[c]
                conflictTextSection +=
                  ' - ' +
                  confItem.nome +
                  ' (' +
                  confItem.empresa +
                  ') — Status: ' +
                  confItem.status +
                  '\n'
              }
              conflictTextSection += '==================================================\n\n'

              let conflictHtmlItems = ''
              for (let c = 0; c < conflictingList.length; c++) {
                const confItem = conflictingList[c]
                conflictHtmlItems +=
                  '<li style="margin-bottom: 4px;"><strong>' +
                  confItem.nome +
                  '</strong> (' +
                  confItem.empresa +
                  ') — <span style="font-family: monospace;">' +
                  confItem.status +
                  '</span></li>'
              }

              conflictHtmlSection =
                '<div style="background: #fef2f2; border: 1px solid #f87171; border-left: 5px solid #dc2626; padding: 14px 16px; border-radius: 6px; margin-bottom: 20px;">' +
                '<strong style="color: #991b1b; font-size: 14px; display: block; margin-bottom: 6px;">' +
                '⚠ Atenção: já existe(m) ' +
                conflictCount +
                ' outra(s) reunião(ões) neste mesmo horário' +
                '</strong>' +
                '<ul style="margin: 6px 0 0 18px; padding: 0; color: #7f1d1d; font-size: 13px;">' +
                conflictHtmlItems +
                '</ul>' +
                '<p style="margin: 8px 0 0 0; font-size: 12px; color: #991b1b;">Recomenda-se verificar a disponibilidade no painel para evitar sobreposição de agendas.</p>' +
                '</div>'
            }

            // 4. Montar Corpo em Texto Simples
            let textBody =
              'Olá!\n\n' +
              'Uma nova solicitação de reunião foi registrada pelo Consultor Digital.\n\n'

            if (conflictTextSection) {
              textBody += conflictTextSection
            }

            textBody +=
              'DETALHES DO AGENDAMENTO:\n' +
              '• Nome: ' +
              nomeLead +
              '\n' +
              '• Empresa: ' +
              empresaLead +
              '\n' +
              '• E-mail: ' +
              emailLead +
              '\n' +
              '• Telefone: ' +
              telefoneLead +
              '\n' +
              '• Data e Hora: ' +
              dataHoraFormatada +
              '\n' +
              '• Assunto: ' +
              assuntoLead +
              '\n' +
              '• Status: pendente\n'

            if (obsLead) {
              textBody += '• Observações: ' + obsLead + '\n'
            }

            textBody +=
              '\nPor favor, acesse o painel em /reunioes para confirmar ou gerenciar este compromisso.\n\n' +
              '---\n' +
              'Consultor Digital — Camada de Integração'

            // 5. Montar Corpo em HTML
            const htmlObsRow = obsLead
              ? '<tr><td style="padding: 8px 12px; color: #64748b; font-size: 13px; vertical-align: top;">Observações:</td><td style="padding: 8px 12px; color: #0f172a; font-size: 13px;">' +
                obsLead.replace(/\n/g, '<br/>') +
                '</td></tr>'
              : ''

            const htmlBody =
              '<div style="font-family: -apple-system, BlinkMacSystemFont, Segoe UI, Roboto, sans-serif; max-width: 600px; margin: 0 auto; color: #1e293b; line-height: 1.5;">' +
              '<div style="background: ' +
              (hasConflict ? '#b91c1c' : '#0f766e') +
              '; padding: 20px; border-radius: 8px 8px 0 0; color: #ffffff;">' +
              '<h2 style="margin: 0; font-size: 20px;">Nova Reunião Agendada</h2>' +
              '<p style="margin: 4px 0 0 0; font-size: 13px; opacity: 0.95;">' +
              (hasConflict
                ? '⚠ Alerta de conflito de horário'
                : 'Consultor Digital — Notificação Instantânea') +
              '</p>' +
              '</div>' +
              '<div style="background: #ffffff; padding: 24px; border: 1px solid #e2e8f0; border-top: none; border-radius: 0 0 8px 8px;">' +
              conflictHtmlSection +
              '<table style="width: 100%; border-collapse: collapse; margin-bottom: 20px; background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 6px;">' +
              '<tr><td style="padding: 8px 12px; color: #64748b; font-size: 13px; width: 110px;">Nome:</td><td style="padding: 8px 12px; color: #0f172a; font-size: 13px; font-weight: bold;">' +
              nomeLead +
              '</td></tr>' +
              '<tr><td style="padding: 8px 12px; color: #64748b; font-size: 13px;">Empresa:</td><td style="padding: 8px 12px; color: #0f172a; font-size: 13px;">' +
              empresaLead +
              '</td></tr>' +
              '<tr><td style="padding: 8px 12px; color: #64748b; font-size: 13px;">Data e Hora:</td><td style="padding: 8px 12px; color: #0f766e; font-size: 13px; font-weight: bold;">' +
              dataHoraFormatada +
              '</td></tr>' +
              '<tr><td style="padding: 8px 12px; color: #64748b; font-size: 13px;">E-mail:</td><td style="padding: 8px 12px; color: #0f172a; font-size: 13px; font-family: monospace;">' +
              emailLead +
              '</td></tr>' +
              '<tr><td style="padding: 8px 12px; color: #64748b; font-size: 13px;">Telefone:</td><td style="padding: 8px 12px; color: #0f172a; font-size: 13px; font-family: monospace;">' +
              telefoneLead +
              '</td></tr>' +
              '<tr><td style="padding: 8px 12px; color: #64748b; font-size: 13px;">Assunto:</td><td style="padding: 8px 12px; color: #0f172a; font-size: 13px;">' +
              assuntoLead +
              '</td></tr>' +
              '<tr><td style="padding: 8px 12px; color: #64748b; font-size: 13px;">Status:</td><td style="padding: 8px 12px;"><span style="background: #fef3c7; color: #92400e; font-size: 11px; padding: 2px 8px; border-radius: 4px; font-weight: bold;">pendente</span></td></tr>' +
              htmlObsRow +
              '</table>' +
              '<div style="text-align: center; margin-top: 24px; padding-top: 16px; border-top: 1px solid #e2e8f0;">' +
              '<p style="margin: 0; font-size: 13px; color: #475569;">Por favor, acesse o painel para confirmar ou gerenciar este agendamento.</p>' +
              '</div>' +
              '</div>' +
              '</div>'

            // 6. Configurações de remetente
            const settings = $app.settings()
            const senderAddress =
              (settings && settings.meta && settings.meta.senderAddress) ||
              (settings && settings.smtp && settings.smtp.username) ||
              'noreply@mail.goskip.dev'
            const senderName =
              (settings && settings.meta && settings.meta.senderName) || 'Consultor Digital'

            // 7. Envio do e-mail para os destinatários
            for (let i = 0; i < recipientEmails.length; i++) {
              const toEmail = recipientEmails[i]
              const msg = new MailerMessage({
                from: {
                  address: senderAddress,
                  name: senderName,
                },
                to: [{ address: toEmail }],
                subject: subject,
                text: textBody,
                html: htmlBody,
              })

              $app.newMailClient().send(msg)
              console.log(
                '[INSTANT_EMAIL] E-mail de notificação de reunião enviado com sucesso para: ' +
                  toEmail,
              )
            }

            console.log(
              '[INSTANT_EMAIL] Notificação instantânea enviada (request_id: ' + requestId + ')',
            )
          } catch (mailErr) {
            // Tolerância a falha: erro no envio de e-mail NUNCA quebra a resposta da tool
            const errStr = mailErr && mailErr.message ? String(mailErr.message) : String(mailErr)
            console.error('[INSTANT_EMAIL_ERROR] Falha ao enviar notificação por e-mail:', errStr)
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

        // Executa lógica de persistência com política de idempotência (email + data_hora),
        // detecção não-bloqueante de conflito de horário e envio instantâneo tolerante a falhas
        execute: (sanitizedData, repository, notifier, reqId) => {
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
              conflito: false,
              conflito_com: 0,
            }
          }

          // 2. Verificação de conflito de horário:
          // Existe outra reunião no mesmo data_hora com status pendente ou confirmada de OUTRO e-mail?
          // Não bloqueia o agendamento; apenas sinaliza via payload e destaca no e-mail instantâneo.
          const conflictingMeetings = repository.findConflictingMeetings
            ? repository.findConflictingMeetings(sanitizedData.email, sanitizedData.data_hora)
            : []
          const conflictCount = conflictingMeetings.length
          const hasConflict = conflictCount > 0

          // 3. Nova solicitação de reunião (status inicial sempre 'pendente')
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
                  conflito: false,
                  conflito_com: 0,
                }
              }
            }
            throw insertErr
          }

          // 4. Envio instantâneo de e-mail aos administradores (tolerante a falha)
          // Apenas para reuniões recém-criadas (não duplicadas)
          if (notifier && typeof notifier.sendInstantMeetingEmail === 'function') {
            try {
              notifier.sendInstantMeetingEmail(sanitizedData, conflictCount, conflictingMeetings)
            } catch (notifErr) {
              console.error(
                '[INSTANT_EMAIL_DISPATCH_ERROR]',
                notifErr && notifErr.message ? notifErr.message : notifErr,
              )
            }
          }

          return {
            status: 201,
            duplicado: false,
            meeting_id: createdRecord.id,
            meeting_status: createdRecord.status,
            data_hora: createdRecord.data_hora,
            created_at: createdRecord.created,
            conflito: hasConflict,
            conflito_com: conflictCount,
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
            const notif = (context && context.notifier) || notificationService
            const rId = (context && context.requestId) || requestId
            return scheduleMeetingDomainService.execute(sanitizedData, repo, notif, rId)
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
          notifier: notificationService,
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
        // Inclui campos aditivos: conflito (boolean) e conflito_com (número de reuniões no mesmo slot)
        return e.json(domainResult.status, {
          ok: true,
          data: {
            meeting_id: domainResult.meeting_id,
            status: domainResult.meeting_status,
            data_hora: domainResult.data_hora,
            created_at: domainResult.created_at,
            duplicado: domainResult.duplicado,
            conflito: Boolean(domainResult.conflito),
            conflito_com:
              typeof domainResult.conflito_com === 'number' ? domainResult.conflito_com : 0,
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
