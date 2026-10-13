// Hook: POST /api/backend/v1/mcp e POST /backend/v1/mcp
// Camada de Integração do Consultor Digital - Adaptador MCP (Model Context Protocol)
//
// Roteamento e Compatibilidade no Skip Cloud:
// 1. Rota pública: POST /api/backend/v1/mcp
//    No domínio público (*.goskip.app), o reverse proxy da plataforma Skip roteia
//    apenas o prefixo /api/* para o PocketBase.
// 2. Rota canônica interna: POST /backend/v1/mcp
//    Mantida para acesso direto/interno ao host do PocketBase (...shrd00.internal.goskip.dev).
//
// ADR-001 (Decisão Registrada):
// - A API HTTP existente é o contrato canônico da V1.
// - O MCP entra como ADAPTADOR de transporte sobre o MESMO registro de capacidades de domínio.
// - As camadas continuam estritamente desacopladas:
//   Transporte MCP (JSON-RPC 2.0) -> Infra (Auth, Rate Limiting, Audit) -> Domínio das Tools -> Persistência ($app).
// - Reutiliza os mesmos serviços e repositórios sem alterar os endpoints HTTP existentes.
//
// Métodos Suportados do Protocolo MCP (JSON-RPC 2.0):
// - initialize: handshake inicial do cliente com capacidades e metadados do servidor.
// - notifications/initialized: confirmação de inicialização do cliente (notificação sem retorno).
// - ping: verificação de conectividade.
// - tools/list: listagem das ferramentas mapeadas a partir do catálogo canônico com seus inputSchemas JSON Schema.
// - tools/call: despacho e execução da ferramenta solicitada, encapsulando resposta em content: [{ type: 'text', text }].
//
// Autenticação & Governança:
// - Header X-API-Key obrigatório (fail-closed, comparação em tempo constante).
// - Rate limiting em memória compartilhado (120 req/min).
// - Auditoria em tool_logs com ferramenta 'mcp_adapter', status HTTP, duração_ms e LGPD compliant (sem PII).

;['/api/backend/v1/mcp', '/backend/v1/mcp'].forEach((routePath) => {
  routerAdd('POST', routePath, (e) => {
    const startTime = Date.now()
    const requestId = 'mcp_' + $security.randomString(16)

    // =========================================================================
    // CAMADA 1: INFRAESTRUTURA (Infra)
    // =========================================================================
    const infra = {
      // 1.1 Audit Logger Unificado (piso de 1ms, LGPD: sem payload de dados nem PII)
      auditLog: (data) => {
        const duracao_ms = Math.max(1, Date.now() - startTime)
        try {
          const logsCol = $app.findCollectionByNameOrId('tool_logs')
          const logRecord = new Record(logsCol)
          logRecord.set('ferramenta', data.ferramenta || 'mcp_adapter')
          logRecord.set('resultado', data.resultado) // 'sucesso' | 'erro'
          logRecord.set('error_code', data.error_code || '')
          logRecord.set('request_id', requestId)
          logRecord.set('duracao_ms', duracao_ms)
          logRecord.set('http_status', data.http_status)
          $app.save(logRecord)
        } catch (logErr) {
          console.error('[MCP_AUDIT_LOG_ERROR]', logErr && logErr.message ? logErr.message : logErr)
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
        const rateLimitKey = 'rl_mcp_' + keyId + '_' + currentMinute
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
              'Limite de requisições excedido para o adaptador MCP (máximo 120 req/min). Aguarde antes de enviar novamente.',
            details: [{ field: 'rate_limit', message: 'Taxa máxima do adaptador MCP atingida' }],
          }
        }

        return { limited: false }
      },
    }

    // =========================================================================
    // CAMADA 2: FORMATADORES DE RESPOSTA MCP (JSON-RPC 2.0)
    // =========================================================================
    const sendJsonRpcResult = (id, result) => {
      infra.auditLog({
        ferramenta: 'mcp_adapter',
        resultado: 'sucesso',
        error_code: '',
        http_status: 200,
      })
      return e.json(200, {
        jsonrpc: '2.0',
        id: id !== undefined ? id : null,
        result: result,
      })
    }

    const sendJsonRpcError = (id, code, message, data, httpStatus) => {
      const status = typeof httpStatus === 'number' ? httpStatus : 200
      infra.auditLog({
        ferramenta: 'mcp_adapter',
        resultado: 'erro',
        error_code: typeof code === 'number' ? String(code) : String(code || 'RPC_ERROR'),
        http_status: status,
      })
      return e.json(status, {
        jsonrpc: '2.0',
        id: id !== undefined ? id : null,
        error: {
          code: code,
          message: message,
          data: data !== undefined ? data : null,
        },
      })
    }

    // Erros de infraestrutura (Auth / Rate Limit) no envelope canônico da camada
    const sendInfraError = (status, code, message, details) => {
      infra.auditLog({
        ferramenta: 'mcp_adapter',
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

    // --- Executa Autenticação e Rate Limiting ---
    const authResult = infra.authenticate(e.request)
    if (!authResult.authorized) {
      return sendInfraError(authResult.status, authResult.code, authResult.message, [])
    }

    const rateLimitResult = infra.checkRateLimit(authResult.keyIdentifier)
    if (rateLimitResult.limited) {
      return sendInfraError(
        rateLimitResult.status,
        rateLimitResult.code,
        rateLimitResult.message,
        rateLimitResult.details,
      )
    }

    // --- Leitura do Corpo da Requisição JSON-RPC ---
    let body = null
    try {
      const reqInfo = e.requestInfo()
      body = reqInfo.body
    } catch (_) {
      body = null
    }

    if (!body || typeof body !== 'object' || Array.isArray(body)) {
      return sendJsonRpcError(null, -32700, 'Parse error: JSON inválido ou malformado.', null, 400)
    }

    // Validações básicas JSON-RPC 2.0
    if (body.jsonrpc !== '2.0') {
      return sendJsonRpcError(
        body.id !== undefined ? body.id : null,
        -32600,
        "Invalid Request: o campo 'jsonrpc' deve ser exatamente '2.0'.",
        null,
        400,
      )
    }

    if (typeof body.method !== 'string' || !body.method.trim()) {
      return sendJsonRpcError(
        body.id !== undefined ? body.id : null,
        -32600,
        "Invalid Request: o campo 'method' é obrigatório e deve ser uma string.",
        null,
        400,
      )
    }

    const rpcId = body.id !== undefined ? body.id : null
    const method = body.method.trim()
    const params = body.params && typeof body.params === 'object' ? body.params : {}

    // Notificação sem ID (ex.: notifications/initialized): retorna 204 No Content
    const isNotification = body.id === undefined

    // =========================================================================
    // CAMADA 3: SERVIÇOS DE DOMÍNIO E PERSISTÊNCIA DAS TOOLS REUTILIZADOS
    // =========================================================================

    // 3.1 Domínio & Repositório: Leads
    const leadRepo = {
      findLeadByEmailEmpresa: (email, empresa) => {
        try {
          const filterParts = ['email = {:email} && empresa = {:empresa}']
          const filterParams = { email: email, empresa: empresa }
          const pbFilter = filterParts.join(' && ')
          const records = $app.findRecordsByFilter(
            'leads',
            pbFilter,
            '-created',
            1,
            0,
            filterParams,
          )
          if (records && records.length > 0) {
            const rec = records[0]
            return {
              id: rec.id,
              estagio_do_lead: rec.getString('estagio_do_lead'),
              created: rec.getString('created'),
            }
          }
        } catch (_) {}
        return null
      },
      insertLead: (leadData, reqId) => {
        const leadsCol = $app.findCollectionByNameOrId('leads')
        const newRecord = new Record(leadsCol)
        newRecord.set('nome', leadData.nome)
        newRecord.set('empresa', leadData.empresa)
        newRecord.set('email', leadData.email)
        newRecord.set('telefone', leadData.telefone)
        newRecord.set('necessidade_identificada', leadData.necessidade_identificada)
        newRecord.set('problema_relatado', leadData.problema_relatado)
        newRecord.set('requisitos', leadData.requisitos)
        newRecord.set('solucao_sugerida', leadData.solucao_sugerida)
        newRecord.set('resumo_conversa', leadData.resumo_conversa)
        newRecord.set('estagio_do_lead', leadData.estagio_do_lead)
        newRecord.set('proximo_passo', leadData.proximo_passo)
        newRecord.set('request_id', reqId)
        $app.save(newRecord)
        return {
          id: newRecord.id,
          estagio_do_lead: newRecord.getString('estagio_do_lead'),
          created: newRecord.getString('created'),
        }
      },
    }

    const domainCreateLead = (args) => {
      const data = args && typeof args === 'object' ? args : {}
      const issues = []

      if (typeof data.nome !== 'string' || !data.nome.trim()) {
        issues.push({
          field: 'nome',
          message: "O campo 'nome' é obrigatório e deve ter no máximo 200 caracteres.",
        })
      } else if (data.nome.trim().length > 200) {
        issues.push({ field: 'nome', message: "O campo 'nome' não pode exceder 200 caracteres." })
      }

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

      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
      if (typeof data.email !== 'string' || !data.email.trim()) {
        issues.push({
          field: 'email',
          message: "O campo 'email' é obrigatório e deve ser um endereço de e-mail válido.",
        })
      } else if (data.email.trim().length > 200) {
        issues.push({ field: 'email', message: "O campo 'email' não pode exceder 200 caracteres." })
      } else if (!emailRegex.test(data.email.trim())) {
        issues.push({
          field: 'email',
          message: "O campo 'email' informado não possui um formato válido de e-mail.",
        })
      }

      if (
        data.telefone !== undefined &&
        data.telefone !== null &&
        typeof data.telefone !== 'string'
      ) {
        issues.push({
          field: 'telefone',
          message: "O campo 'telefone' deve ser uma string de até 30 caracteres.",
        })
      } else if (typeof data.telefone === 'string' && data.telefone.length > 30) {
        issues.push({
          field: 'telefone',
          message: "O campo 'telefone' não pode exceder 30 caracteres.",
        })
      }

      if (
        data.necessidade_identificada !== undefined &&
        data.necessidade_identificada !== null &&
        typeof data.necessidade_identificada !== 'string'
      ) {
        issues.push({
          field: 'necessidade_identificada',
          message: "O campo 'necessidade_identificada' deve ser string.",
        })
      } else if (
        typeof data.necessidade_identificada === 'string' &&
        data.necessidade_identificada.length > 2000
      ) {
        issues.push({
          field: 'necessidade_identificada',
          message: "O campo 'necessidade_identificada' não pode exceder 2000 caracteres.",
        })
      }

      if (
        data.problema_relatado !== undefined &&
        data.problema_relatado !== null &&
        typeof data.problema_relatado !== 'string'
      ) {
        issues.push({
          field: 'problema_relatado',
          message: "O campo 'problema_relatado' deve ser string.",
        })
      } else if (
        typeof data.problema_relatado === 'string' &&
        data.problema_relatado.length > 2000
      ) {
        issues.push({
          field: 'problema_relatado',
          message: "O campo 'problema_relatado' não pode exceder 2000 caracteres.",
        })
      }

      if (
        data.requisitos !== undefined &&
        data.requisitos !== null &&
        typeof data.requisitos !== 'string'
      ) {
        issues.push({ field: 'requisitos', message: "O campo 'requisitos' deve ser string." })
      } else if (typeof data.requisitos === 'string' && data.requisitos.length > 2000) {
        issues.push({
          field: 'requisitos',
          message: "O campo 'requisitos' não pode exceder 2000 caracteres.",
        })
      }

      if (
        data.solucao_sugerida !== undefined &&
        data.solucao_sugerida !== null &&
        typeof data.solucao_sugerida !== 'string'
      ) {
        issues.push({
          field: 'solucao_sugerida',
          message: "O campo 'solucao_sugerida' deve ser string.",
        })
      } else if (typeof data.solucao_sugerida === 'string' && data.solucao_sugerida.length > 2000) {
        issues.push({
          field: 'solucao_sugerida',
          message: "O campo 'solucao_sugerida' não pode exceder 2000 caracteres.",
        })
      }

      if (
        data.resumo_conversa !== undefined &&
        data.resumo_conversa !== null &&
        typeof data.resumo_conversa !== 'string'
      ) {
        issues.push({
          field: 'resumo_conversa',
          message: "O campo 'resumo_conversa' deve ser string.",
        })
      } else if (typeof data.resumo_conversa === 'string' && data.resumo_conversa.length > 5000) {
        issues.push({
          field: 'resumo_conversa',
          message: "O campo 'resumo_conversa' não pode exceder 5000 caracteres.",
        })
      }

      const ALLOWED_ESTAGIOS = ['novo', 'qualificado', 'proposta', 'descartado']
      const estagio = data.estagio_do_lead
        ? String(data.estagio_do_lead).toLowerCase().trim()
        : 'novo'
      if (!ALLOWED_ESTAGIOS.includes(estagio)) {
        issues.push({
          field: 'estagio_do_lead',
          message:
            "O campo 'estagio_do_lead' deve ser exatamente um dos valores permitidos: 'novo', 'qualificado', 'proposta' ou 'descartado'.",
        })
      }

      if (
        data.proximo_passo !== undefined &&
        data.proximo_passo !== null &&
        typeof data.proximo_passo !== 'string'
      ) {
        issues.push({ field: 'proximo_passo', message: "O campo 'proximo_passo' deve ser string." })
      } else if (typeof data.proximo_passo === 'string' && data.proximo_passo.length > 500) {
        issues.push({
          field: 'proximo_passo',
          message: "O campo 'proximo_passo' não pode exceder 500 caracteres.",
        })
      }

      if (issues.length > 0) {
        return {
          ok: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Dados do lead inválidos. Corrija os campos e tente novamente.',
            details: issues,
          },
        }
      }

      const sanitized = {
        nome: String(data.nome || '').trim(),
        empresa: String(data.empresa || '').trim(),
        email: String(data.email || '')
          .toLowerCase()
          .trim(),
        telefone: data.telefone ? String(data.telefone).trim() : '',
        necessidade_identificada: data.necessidade_identificada
          ? String(data.necessidade_identificada).trim()
          : '',
        problema_relatado: data.problema_relatado ? String(data.problema_relatado).trim() : '',
        requisitos: data.requisitos ? String(data.requisitos).trim() : '',
        solucao_sugerida: data.solucao_sugerida ? String(data.solucao_sugerida).trim() : '',
        resumo_conversa: data.resumo_conversa ? String(data.resumo_conversa).trim() : '',
        estagio_do_lead: estagio,
        proximo_passo: data.proximo_passo ? String(data.proximo_passo).trim() : '',
      }

      const existing = leadRepo.findLeadByEmailEmpresa(sanitized.email, sanitized.empresa)
      if (existing) {
        return {
          ok: true,
          data: {
            lead_id: existing.id,
            estagio_do_lead: existing.estagio_do_lead,
            created_at: existing.created,
            duplicado: true,
          },
        }
      }

      const created = leadRepo.insertLead(sanitized, requestId)
      return {
        ok: true,
        data: {
          lead_id: created.id,
          estagio_do_lead: created.estagio_do_lead,
          created_at: created.created,
          duplicado: false,
        },
      }
    }

    // 3.2 Domínio & Repositório: Meetings
    const meetingRepo = {
      formatForPocketBaseDate: (isoDateString) => {
        if (!isoDateString || typeof isoDateString !== 'string') return isoDateString
        return isoDateString.replace('T', ' ')
      },
      findMeetingByEmailDataHora: (email, isoDateString) => {
        const pbDateString = meetingRepo.formatForPocketBaseDate(isoDateString)
        try {
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
        } catch (_) {}
        return null
      },
      findConflictingMeetings: (email, isoDateString) => {
        const pbDateString = meetingRepo.formatForPocketBaseDate(isoDateString)
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
        } catch (_) {}
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
        newRecord.set('status', 'pendente')
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

    const meetingNotifier = {
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
            return
          }

          const dataHoraFormatada = meetingNotifier.formatDateTimeSP(meetingData.data_hora)
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

          const settings = $app.settings()
          const senderAddress =
            (settings && settings.meta && settings.meta.senderAddress) ||
            (settings && settings.smtp && settings.smtp.username) ||
            'noreply@mail.goskip.dev'
          const senderName =
            (settings && settings.meta && settings.meta.senderName) || 'Consultor Digital'

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
          }
        } catch (mailErr) {
          console.error(
            '[MCP_INSTANT_EMAIL_ERROR] Falha ao enviar notificação de reunião:',
            mailErr,
          )
        }
      },
    }

    const domainScheduleMeeting = (args) => {
      const data = args && typeof args === 'object' ? args : {}
      const issues = []

      if (typeof data.nome !== 'string' || !data.nome.trim()) {
        issues.push({
          field: 'nome',
          message: "O campo 'nome' é obrigatório e deve ter no máximo 200 caracteres.",
        })
      } else if (data.nome.trim().length > 200) {
        issues.push({ field: 'nome', message: "O campo 'nome' não pode exceder 200 caracteres." })
      }

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

      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
      if (typeof data.email !== 'string' || !data.email.trim()) {
        issues.push({
          field: 'email',
          message: "O campo 'email' é obrigatório e deve ser um endereço de e-mail válido.",
        })
      } else if (data.email.trim().length > 200) {
        issues.push({ field: 'email', message: "O campo 'email' não pode exceder 200 caracteres." })
      } else if (!emailRegex.test(data.email.trim())) {
        issues.push({
          field: 'email',
          message: "O campo 'email' informado não possui um formato válido de e-mail.",
        })
      }

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

      let parsedDate = null
      if (typeof data.data_hora !== 'string' || !data.data_hora.trim()) {
        issues.push({
          field: 'data_hora',
          message:
            "O campo 'data_hora' é obrigatório e deve estar no formato ISO 8601 com fuso horário.",
        })
      } else {
        const rawDateStr = data.data_hora.trim()
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
            message: "A 'data_hora' informada deve ser uma data e horário futuro para agendamento.",
          })
        } else {
          parsedDate = new Date(timestamp)
        }
      }

      if (typeof data.assunto !== 'string' || !data.assunto.trim()) {
        issues.push({
          field: 'assunto',
          message: "O campo 'assunto' é obrigatório e deve conter um resumo da pauta da reunião.",
        })
      } else if (data.assunto.trim().length > 500) {
        issues.push({
          field: 'assunto',
          message: "O campo 'assunto' não pode exceder 500 caracteres.",
        })
      }

      if (
        data.observacoes !== undefined &&
        data.observacoes !== null &&
        typeof data.observacoes !== 'string'
      ) {
        issues.push({ field: 'observacoes', message: "O campo 'observacoes' deve ser texto." })
      } else if (typeof data.observacoes === 'string' && data.observacoes.length > 3000) {
        issues.push({
          field: 'observacoes',
          message: "O campo 'observacoes' não pode exceder 3000 caracteres.",
        })
      }

      if (issues.length > 0) {
        return {
          ok: false,
          error: {
            code: 'VALIDATION_ERROR',
            message:
              'Dados da solicitação de reunião inválidos. Corrija os campos e tente novamente.',
            details: issues,
          },
        }
      }

      const normalizedIsoDate = parsedDate.toISOString()
      const sanitized = {
        nome: String(data.nome || '').trim(),
        empresa: String(data.empresa || '').trim(),
        email: String(data.email || '')
          .toLowerCase()
          .trim(),
        telefone: String(data.telefone || '').trim(),
        data_hora: normalizedIsoDate,
        assunto: String(data.assunto || '').trim(),
        observacoes: data.observacoes ? String(data.observacoes).trim() : '',
      }

      const existing = meetingRepo.findMeetingByEmailDataHora(sanitized.email, sanitized.data_hora)
      if (existing) {
        return {
          ok: true,
          data: {
            meeting_id: existing.id,
            status: existing.status,
            data_hora: existing.data_hora,
            created_at: existing.created,
            duplicado: true,
            conflito: false,
            conflito_com: 0,
          },
        }
      }

      const conflictingMeetings = meetingRepo.findConflictingMeetings
        ? meetingRepo.findConflictingMeetings(sanitized.email, sanitized.data_hora)
        : []
      const conflictCount = conflictingMeetings.length
      const hasConflict = conflictCount > 0

      let created = null
      try {
        created = meetingRepo.insertMeeting(sanitized, requestId)
      } catch (insertErr) {
        const errStr = insertErr && (insertErr.message || String(insertErr))
        const isUniqueConstraint =
          errStr &&
          (errStr.includes('UNIQUE constraint failed') ||
            errStr.includes('constraint failed') ||
            errStr.includes('unique'))

        if (isUniqueConstraint) {
          const concurrentWinner = meetingRepo.findMeetingByEmailDataHora(
            sanitized.email,
            sanitized.data_hora,
          )
          if (concurrentWinner) {
            return {
              ok: true,
              data: {
                meeting_id: concurrentWinner.id,
                status: concurrentWinner.status,
                data_hora: concurrentWinner.data_hora,
                created_at: concurrentWinner.created,
                duplicado: true,
                conflito: false,
                conflito_com: 0,
              },
            }
          }
        }
        throw insertErr
      }

      // Envia notificação aos admins via e-mail (tolerante a falha)
      try {
        meetingNotifier.sendInstantMeetingEmail(sanitized, conflictCount, conflictingMeetings)
      } catch (_) {}

      return {
        ok: true,
        data: {
          meeting_id: created.id,
          status: created.status,
          data_hora: created.data_hora,
          created_at: created.created,
          duplicado: false,
          conflito: hasConflict,
          conflito_com: conflictCount,
        },
      }
    }

    // 3.3 Domínio & Repositório: Email
    const emailRepo = {
      findSendByIdempotencyKey: (idempotencyKey) => {
        if (!idempotencyKey) return null
        try {
          const filterParts = ['idempotency_key = {:key}']
          const filterParams = { key: idempotencyKey }
          const pbFilter = filterParts.join(' && ')
          const records = $app.findRecordsByFilter(
            'email_sends',
            pbFilter,
            '-created',
            1,
            0,
            filterParams,
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
        } catch (_) {}
        return null
      },
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
      sendRealEmail: (emailData) => {
        const settings = $app.settings()
        const senderAddress =
          (settings && settings.meta && settings.meta.senderAddress) ||
          (settings && settings.smtp && settings.smtp.username) ||
          'no-reply@goskip.app'
        const senderName =
          (settings && settings.meta && settings.meta.senderName) || 'Consultor Digital'

        const message = new MailerMessage({
          from: { address: senderAddress, name: senderName },
          to: [{ address: emailData.destinatario }],
          subject: emailData.assunto,
          text: emailData.corpo,
          html: emailData.corpo.replace(/\n/g, '<br/>'),
        })
        $app.newMailClient().send(message)
        const generatedMessageId = 'msg_' + $security.randomString(20)
        return { message_id: generatedMessageId, status: 'enviado' }
      },
    }

    const domainSendEmail = (args) => {
      const data = args && typeof args === 'object' ? args : {}
      const issues = []
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

      if (typeof data.destinatario !== 'string' || !data.destinatario.trim()) {
        issues.push({
          field: 'destinatario',
          message: "O campo 'destinatario' é obrigatório e deve ser um endereço de e-mail válido.",
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
        return {
          ok: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Dados do e-mail inválidos. Corrija os campos e tente novamente.',
            details: issues,
          },
        }
      }

      const sanitizedIdempotencyKey =
        typeof data.idempotency_key === 'string' && data.idempotency_key.trim()
          ? data.idempotency_key.trim()
          : ''

      const sanitized = {
        destinatario: String(data.destinatario || '')
          .toLowerCase()
          .trim(),
        assunto: String(data.assunto || '').trim(),
        corpo: String(data.corpo || '').trim(),
        idempotency_key: sanitizedIdempotencyKey,
      }

      if (sanitized.idempotency_key) {
        const existingSend = emailRepo.findSendByIdempotencyKey(sanitized.idempotency_key)
        if (existingSend) {
          return {
            ok: true,
            data: {
              message_id: existingSend.message_id,
              status: existingSend.status,
              duplicado: true,
            },
          }
        }
      }

      const sendResult = emailRepo.sendRealEmail(sanitized)

      if (sanitized.idempotency_key) {
        try {
          emailRepo.insertSendRecord(
            {
              idempotency_key: sanitized.idempotency_key,
              message_id: sendResult.message_id,
              status: sendResult.status,
            },
            requestId,
          )
        } catch (insertErr) {
          const errStr = insertErr && (insertErr.message || String(insertErr))
          const isUniqueConstraint =
            errStr &&
            (errStr.includes('UNIQUE constraint failed') ||
              errStr.includes('constraint failed') ||
              errStr.includes('unique'))

          if (isUniqueConstraint) {
            const concurrentWinner = emailRepo.findSendByIdempotencyKey(sanitized.idempotency_key)
            if (concurrentWinner) {
              return {
                ok: true,
                data: {
                  message_id: concurrentWinner.message_id,
                  status: concurrentWinner.status,
                  duplicado: true,
                },
              }
            }
          }
        }
      }

      return {
        ok: true,
        data: {
          message_id: sendResult.message_id,
          status: sendResult.status,
          duplicado: false,
        },
      }
    }

    // 3.4 Domínio: List Meetings
    const domainListMeetings = (args) => {
      const data = args && typeof args === 'object' ? args : {}
      const issues = []

      let emailFilter = ''
      if (data.email && typeof data.email === 'string' && data.email.trim() !== '') {
        const trimmedEmail = data.email.trim().toLowerCase()
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
        if (!emailRegex.test(trimmedEmail)) {
          issues.push({
            field: 'email',
            message: "O parâmetro 'email' informado não possui um formato válido de e-mail.",
          })
        } else {
          emailFilter = trimmedEmail
        }
      }

      const ALLOWED_STATUSES = ['pendente', 'confirmada', 'realizada', 'cancelada']
      let statusFilter = ''
      if (data.status && typeof data.status === 'string' && data.status.trim() !== '') {
        const trimmedStatus = data.status.trim().toLowerCase()
        if (ALLOWED_STATUSES.indexOf(trimmedStatus) === -1) {
          issues.push({
            field: 'status',
            message:
              "O parâmetro 'status' deve ser exatamente um dos valores permitidos: 'pendente', 'confirmada', 'realizada' ou 'cancelada'.",
          })
        } else {
          statusFilter = trimmedStatus
        }
      }

      let futurasApenas = false
      if (data.futuras_apenas !== undefined && data.futuras_apenas !== null) {
        if (typeof data.futuras_apenas === 'boolean') {
          futurasApenas = data.futuras_apenas
        } else {
          const valStr = String(data.futuras_apenas).trim().toLowerCase()
          if (valStr === 'true' || valStr === '1') futurasApenas = true
          else if (valStr === 'false' || valStr === '0') futurasApenas = false
          else
            issues.push({
              field: 'futuras_apenas',
              message: "O parâmetro 'futuras_apenas' deve ser 'true' ou 'false'.",
            })
        }
      }

      let limite = 10
      if (data.limite !== undefined && data.limite !== null && String(data.limite).trim() !== '') {
        const parsedLimit = parseInt(String(data.limite).trim(), 10)
        if (isNaN(parsedLimit) || parsedLimit < 1 || parsedLimit > 50) {
          issues.push({
            field: 'limite',
            message: "O parâmetro 'limite' deve ser um número inteiro entre 1 e 50.",
          })
        } else {
          limite = parsedLimit
        }
      }

      if (issues.length > 0) {
        return {
          ok: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Parâmetros de consulta inválidos.',
            details: issues,
          },
        }
      }

      const nowIso = new Date().toISOString()
      const nowPbDate = nowIso.replace('T', ' ')
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
        filterParts.push('data_hora >= {:nowDate}')
        filterParams.nowDate = nowPbDate
        const pbFilter = filterParts.join(' && ')
        const records =
          $app.findRecordsByFilter('meetings', pbFilter, 'data_hora', limite, 0, filterParams) || []
        reunioesRetornadas = records
      } else {
        const filterFuturasParts = filterParts.slice()
        const paramsFuturas = Object.assign({}, filterParams)
        filterFuturasParts.push('data_hora >= {:nowDate}')
        paramsFuturas.nowDate = nowPbDate
        const pbFuturasFilter = filterFuturasParts.join(' && ')
        const futurasRecords =
          $app.findRecordsByFilter(
            'meetings',
            pbFuturasFilter,
            'data_hora',
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
              '-data_hora',
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

      const reunioesSanitizadas = reunioesRetornadas.map((rec) => {
        let obs = rec.getString('observacoes') || ''
        if (obs.length > 500) obs = obs.substring(0, 500)
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

      return {
        ok: true,
        data: {
          total: reunioesSanitizadas.length,
          reunioes: reunioesSanitizadas,
        },
      }
    }

    // 3.5 Domínio: List Leads
    const domainListLeads = (args) => {
      const data = args && typeof args === 'object' ? args : {}
      const issues = []

      let emailFilter = ''
      if (data.email && typeof data.email === 'string' && data.email.trim() !== '') {
        const trimmedEmail = data.email.trim().toLowerCase()
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
        if (!emailRegex.test(trimmedEmail)) {
          issues.push({
            field: 'email',
            message: "O parâmetro 'email' informado não possui um formato válido de e-mail.",
          })
        } else {
          emailFilter = trimmedEmail
        }
      }

      const ALLOWED_ESTAGIOS = ['novo', 'qualificado', 'proposta', 'descartado']
      let estagioFilter = ''
      if (
        data.estagio_do_lead &&
        typeof data.estagio_do_lead === 'string' &&
        data.estagio_do_lead.trim() !== ''
      ) {
        const trimmedEstagio = data.estagio_do_lead.trim().toLowerCase()
        if (ALLOWED_ESTAGIOS.indexOf(trimmedEstagio) === -1) {
          issues.push({
            field: 'estagio_do_lead',
            message:
              "O parâmetro 'estagio_do_lead' deve ser exatamente um dos valores permitidos: 'novo', 'qualificado', 'proposta' ou 'descartado'.",
          })
        } else {
          estagioFilter = trimmedEstagio
        }
      }

      let empresaFilter = ''
      if (data.empresa && typeof data.empresa === 'string' && data.empresa.trim() !== '') {
        empresaFilter = data.empresa.trim()
        if (empresaFilter.length > 200) {
          issues.push({
            field: 'empresa',
            message: "O parâmetro 'empresa' excede o limite de 200 caracteres.",
          })
        }
      }

      let limite = 10
      if (data.limite !== undefined && data.limite !== null && String(data.limite).trim() !== '') {
        const parsedLimit = parseInt(String(data.limite).trim(), 10)
        if (isNaN(parsedLimit) || parsedLimit < 1 || parsedLimit > 50) {
          issues.push({
            field: 'limite',
            message: "O parâmetro 'limite' deve ser um número inteiro entre 1 e 50.",
          })
        } else {
          limite = parsedLimit
        }
      }

      if (issues.length > 0) {
        return {
          ok: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Parâmetros de consulta inválidos.',
            details: issues,
          },
        }
      }

      const filterParts = []
      const filterParams = {}
      if (emailFilter) {
        filterParts.push('email = {:email}')
        filterParams.email = emailFilter
      }
      if (estagioFilter) {
        filterParts.push('estagio_do_lead = {:estagio}')
        filterParams.estagio = estagioFilter
      }
      if (empresaFilter) {
        filterParts.push('empresa ~ {:empresa}')
        filterParams.empresa = empresaFilter
      }

      const pbFilter = filterParts.join(' && ')
      const records =
        $app.findRecordsByFilter('leads', pbFilter, '-created', limite, 0, filterParams) || []

      const leadsSanitizados = records.map((rec) => {
        let necessidade = rec.getString('necessidade_identificada') || ''
        if (necessidade.length > 500) necessidade = necessidade.substring(0, 500)
        let nome = rec.getString('nome') || ''
        if (nome.length > 500) nome = nome.substring(0, 500)
        let empresa = rec.getString('empresa') || ''
        if (empresa.length > 500) empresa = empresa.substring(0, 500)

        return {
          id: rec.id,
          nome: nome,
          empresa: empresa,
          email: rec.getString('email'),
          telefone: rec.getString('telefone'),
          necessidade_identificada: necessidade,
          estagio_do_lead: rec.getString('estagio_do_lead'),
          created: rec.getString('created'),
        }
      })

      return {
        ok: true,
        data: {
          total: leadsSanitizados.length,
          leads: leadsSanitizados,
        },
      }
    }

    // 3.6 Domínio: Get Lead
    const domainGetLead = (args) => {
      const data = args && typeof args === 'object' ? args : {}
      const cleanId = typeof data.id === 'string' ? data.id.trim() : ''
      const cleanEmail = typeof data.email === 'string' ? data.email.trim() : ''

      if (!cleanId && !cleanEmail) {
        return {
          ok: false,
          error: {
            code: 'VALIDATION_ERROR',
            message:
              "É obrigatório informar ao menos um parâmetro de identificação: 'id' ou 'email'.",
            details: [
              { field: 'id', message: "Forneça o parâmetro 'id' do lead ou o parâmetro 'email'." },
              {
                field: 'email',
                message: "Forneça o parâmetro 'email' do lead ou o parâmetro 'id'.",
              },
            ],
          },
        }
      }

      let foundRecord = null
      if (cleanId) {
        if (cleanId.length > 50) {
          return {
            ok: false,
            error: {
              code: 'VALIDATION_ERROR',
              message: "O parâmetro 'id' informado é inválido ou excede o tamanho permitido.",
              details: [{ field: 'id', message: "O 'id' do lead não deve exceder 50 caracteres." }],
            },
          }
        }
        try {
          foundRecord = $app.findRecordById('leads', cleanId)
        } catch (_) {
          foundRecord = null
        }
      } else {
        const targetEmail = cleanEmail.toLowerCase()
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
        if (!emailRegex.test(targetEmail)) {
          return {
            ok: false,
            error: {
              code: 'VALIDATION_ERROR',
              message: "O parâmetro 'email' informado não possui um formato válido de e-mail.",
              details: [{ field: 'email', message: 'Formato de e-mail inválido.' }],
            },
          }
        }
        const filterParts = ['email = {:email}']
        const filterParams = { email: targetEmail }
        const pbFilter = filterParts.join(' && ')
        const records =
          $app.findRecordsByFilter('leads', pbFilter, '-created', 1, 0, filterParams) || []
        if (records.length > 0) {
          foundRecord = records[0]
        }
      }

      let sanitizedLead = null
      if (foundRecord) {
        let necessidade = foundRecord.getString('necessidade_identificada') || ''
        if (necessidade.length > 500) necessidade = necessidade.substring(0, 500)
        let nome = foundRecord.getString('nome') || ''
        if (nome.length > 500) nome = nome.substring(0, 500)
        let empresa = foundRecord.getString('empresa') || ''
        if (empresa.length > 500) empresa = empresa.substring(0, 500)

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

      return {
        ok: true,
        data: {
          lead: sanitizedLead,
        },
      }
    }

    // 3.6.1 Domínio: Update Lead Stage
    const domainUpdateLeadStage = (args) => {
      const data = args && typeof args === 'object' ? args : {}
      const issues = []

      const rawLeadId =
        data.lead_id !== undefined && data.lead_id !== null ? String(data.lead_id) : ''
      const rawEmail = data.email !== undefined && data.email !== null ? String(data.email) : ''

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

      const ALLOWED_ESTAGIOS = ['novo', 'qualificado', 'proposta', 'descartado']
      const rawEstagio =
        data.estagio_do_lead !== undefined && data.estagio_do_lead !== null
          ? String(data.estagio_do_lead).toLowerCase().trim()
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

      if (
        data.observacao !== undefined &&
        data.observacao !== null &&
        typeof data.observacao !== 'string'
      ) {
        issues.push({
          field: 'observacao',
          message: "O campo 'observacao' deve ser texto de até 500 caracteres.",
        })
      } else if (typeof data.observacao === 'string' && data.observacao.length > 500) {
        issues.push({
          field: 'observacao',
          message: "O campo 'observacao' não pode exceder 500 caracteres.",
        })
      }

      if (issues.length > 0) {
        return {
          ok: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Parâmetros de atualização inválidos.',
            details: issues,
          },
        }
      }

      let leadRecord = null
      if (searchById) {
        try {
          leadRecord = $app.findRecordById('leads', targetLeadId)
        } catch (_) {
          leadRecord = null
        }
      } else {
        const filterParts = ['email = {:email}']
        const filterParams = { email: targetEmail }
        const pbFilter = filterParts.join(' && ')
        const records =
          $app.findRecordsByFilter('leads', pbFilter, '-created', 1, 0, filterParams) || []
        if (records.length > 0) {
          leadRecord = records[0]
        }
      }

      if (!leadRecord) {
        return {
          ok: true,
          data: {
            atualizado: false,
            motivo: 'lead_nao_encontrado',
          },
        }
      }

      const estagioAnterior = leadRecord.getString('estagio_do_lead') || 'novo'
      const estagioNovo = rawEstagio

      if (estagioAnterior !== estagioNovo) {
        leadRecord.set('estagio_do_lead', estagioNovo)
        $app.save(leadRecord)
      }

      return {
        ok: true,
        data: {
          atualizado: true,
          lead_id: leadRecord.id,
          estagio_anterior: estagioAnterior,
          estagio_novo: estagioNovo,
        },
      }
    }

    // 3.7 Domínio: Tools Registry (consulta canônica do catálogo)
    const canonicalToolsCatalogue = [
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
        nome: 'update_lead_stage',
        metodo: 'POST',
        caminho: '/v1/tools/update_lead_stage',
        versao: 'v1',
        descricao:
          'Atualiza o estágio comercial de um lead (novo, qualificado, proposta, descartado) por lead_id ou e-mail',
        campos_obrigatorios: ['estagio_do_lead'],
        campos_opcionais: ['lead_id', 'email', 'observacao'],
        idempotencia: 'natural (mesmo estágio devolve atualizado: true sem erro)',
        rate_limit: '120 req/min',
      },
      {
        nome: 'tools_registry',
        metodo: 'GET',
        caminho: '/v1/tools',
        versao: 'v1',
        descricao:
          'Índice canônico de descoberta e metadados das ferramentas da Camada de Integração',
        campos_obrigatorios: [],
        campos_opcionais: [],
        idempotencia: 'não aplicável (leitura)',
        rate_limit: '60 req/min',
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

    const domainToolsRegistry = () => {
      return {
        ok: true,
        data: {
          total: canonicalToolsCatalogue.length,
          tools: canonicalToolsCatalogue,
        },
      }
    }

    // =========================================================================
    // CAMADA 4: SCHEMAS MCP DAS TOOLS (DERIVADOS DO CATÁLOGO CANÔNICO)
    // =========================================================================
    const mcpToolDefinitions = [
      {
        name: 'create_lead',
        description:
          'Registra ou atualiza um lead comercial qualificado pelo Consultor Digital. Idempotência por email+empresa.',
        inputSchema: {
          type: 'object',
          properties: {
            nome: {
              type: 'string',
              description: 'Nome completo do contato do lead (máx 200 caracteres)',
            },
            empresa: {
              type: 'string',
              description:
                "Razão social ou nome fantasia da empresa (ou 'Pessoa física', máx 200 caracteres)",
            },
            email: {
              type: 'string',
              description: 'Endereço de e-mail de contato válido (máx 200 caracteres)',
            },
            telefone: {
              type: 'string',
              description: 'Telefone com DDD ou formato internacional (máx 30 caracteres)',
            },
            necessidade_identificada: {
              type: 'string',
              description:
                'Diagnóstico da dor ou oportunidade mapeada pelo Consultor (máx 2000 caracteres)',
            },
            estagio_do_lead: {
              type: 'string',
              enum: ['novo', 'qualificado', 'proposta', 'descartado'],
              description: 'Classificação comercial do estágio do lead',
              default: 'novo',
            },
            problema_relatado: {
              type: 'string',
              description: 'Problema expresso pelo cliente durante a conversa (opcional)',
            },
            requisitos: {
              type: 'string',
              description: 'Requisitos técnicos ou de negócio levantados (opcional)',
            },
            solucao_sugerida: {
              type: 'string',
              description: 'Direcionamento ou solução recomendada pelo Consultor (opcional)',
            },
            resumo_conversa: {
              type: 'string',
              description: 'Síntese das interações relevantes (opcional)',
            },
            proximo_passo: {
              type: 'string',
              description: 'Ação acordada imediata ou agendada (opcional)',
            },
          },
          required: [
            'nome',
            'empresa',
            'email',
            'telefone',
            'necessidade_identificada',
            'estagio_do_lead',
          ],
        },
      },
      {
        name: 'schedule_meeting',
        description:
          'Registra uma solicitação interna de reunião com o consultor com status inicial pendente. Idempotência por email+data_hora.',
        inputSchema: {
          type: 'object',
          properties: {
            nome: {
              type: 'string',
              description: 'Nome completo da pessoa que solicitou a reunião',
            },
            empresa: { type: 'string', description: "Empresa ou 'Pessoa física'" },
            email: { type: 'string', description: 'E-mail para envio do convite' },
            telefone: { type: 'string', description: 'Telefone para contato ou confirmação' },
            data_hora: {
              type: 'string',
              description:
                "Data e horário futuro em formato ISO 8601 com timezone (ex: '2026-11-25T15:00:00-03:00')",
            },
            assunto: {
              type: 'string',
              description: 'Resumo da pauta ou objetivo da reunião (máx 500 caracteres)',
            },
            observacoes: {
              type: 'string',
              description: 'Observações adicionais ou preferências de plataforma (opcional)',
            },
          },
          required: ['nome', 'empresa', 'email', 'telefone', 'data_hora', 'assunto'],
        },
      },
      {
        name: 'send_email',
        description:
          'Envia um e-mail transacional real para o destinatário através do serviço padrão do servidor com idempotência.',
        inputSchema: {
          type: 'object',
          properties: {
            destinatario: { type: 'string', description: 'E-mail do destinatário da mensagem' },
            assunto: { type: 'string', description: 'Assunto do e-mail (máx 200 caracteres)' },
            corpo: {
              type: 'string',
              description: 'Texto da mensagem em texto plano ou HTML (máx 5000 caracteres)',
            },
            idempotency_key: {
              type: 'string',
              description:
                'Chave exclusiva gerada pelo chamador para garantir idempotência estrita (opcional)',
            },
          },
          required: ['destinatario', 'assunto', 'corpo'],
        },
      },
      {
        name: 'list_meetings',
        description:
          'Consulta e lista reuniões agendadas com filtros por e-mail, status e período futuro.',
        inputSchema: {
          type: 'object',
          properties: {
            email: {
              type: 'string',
              description: 'Filtrar reuniões de um e-mail específico (opcional)',
            },
            status: {
              type: 'string',
              enum: ['pendente', 'confirmada', 'realizada', 'cancelada'],
              description: 'Filtrar por status da reunião (opcional)',
            },
            futuras_apenas: {
              type: 'boolean',
              description:
                'Se true, retorna apenas reuniões posteriores ao momento atual (default: false)',
            },
            limite: {
              type: 'integer',
              description: 'Quantidade máxima de reuniões a retornar (1 a 50, default 10)',
            },
          },
        },
      },
      {
        name: 'list_leads',
        description:
          'Consulta e lista leads comerciais qualificados com filtros por e-mail, estágio, empresa e limite.',
        inputSchema: {
          type: 'object',
          properties: {
            email: { type: 'string', description: 'Filtrar leads por e-mail exato (opcional)' },
            estagio_do_lead: {
              type: 'string',
              enum: ['novo', 'qualificado', 'proposta', 'descartado'],
              description: 'Filtrar por estágio de qualificação (opcional)',
            },
            empresa: {
              type: 'string',
              description: 'Filtrar por busca parcial do nome da empresa (opcional)',
            },
            limite: {
              type: 'integer',
              description: 'Quantidade máxima de leads a retornar (1 a 50, default 10)',
            },
          },
        },
      },
      {
        name: 'get_lead',
        description:
          'Consulta os detalhes sanitizados de um lead específico a partir do seu id ou endereço de e-mail.',
        inputSchema: {
          type: 'object',
          properties: {
            id: {
              type: 'string',
              description: 'Identificador único do lead no PocketBase (prioritário se informado)',
            },
            email: { type: 'string', description: 'Endereço de e-mail cadastrado do lead' },
          },
        },
      },
      {
        name: 'update_lead_stage',
        description:
          'Atualiza o estágio comercial de um lead existente (novo, qualificado, proposta, descartado) por lead_id ou e-mail com idempotência natural.',
        inputSchema: {
          type: 'object',
          properties: {
            lead_id: {
              type: 'string',
              description: 'Identificador do lead no PocketBase (prioritário se informado)',
            },
            email: {
              type: 'string',
              description: 'Endereço de e-mail do lead para busca caso lead_id não seja fornecido',
            },
            estagio_do_lead: {
              type: 'string',
              enum: ['novo', 'qualificado', 'proposta', 'descartado'],
              description: 'Novo estágio do lead (obrigatório)',
            },
            observacao: {
              type: 'string',
              description:
                'Observação ou justificativa opcional (máx 500 caracteres, não gravada em auditoria externa)',
            },
          },
          required: ['estagio_do_lead'],
        },
      },
      {
        name: 'tools_registry',
        description:
          'Índice canônico de descoberta e metadados das ferramentas da Camada de Integração.',
        inputSchema: {
          type: 'object',
          properties: {},
        },
      },
      {
        name: 'mcp_adapter',
        description:
          'Adaptador MCP oficial sobre o mesmo registro de ferramentas da Camada de Integração.',
        inputSchema: {
          type: 'object',
          properties: {
            method: {
              type: 'string',
              description: 'Método MCP (initialize, tools/list, tools/call, ping)',
            },
          },
        },
      },
    ]
    // =========================================================================
    // CAMADA 5: ROTEAMENTO DE MÉTODOS DO PROTOCOLO MCP
    // =========================================================================
    try {
      // 5.1 Método: initialize
      if (method === 'initialize') {
        const clientProtocolVersion = params.protocolVersion || '2024-11-05'
        return sendJsonRpcResult(rpcId, {
          protocolVersion: clientProtocolVersion,
          capabilities: {
            tools: {
              listChanged: false,
            },
          },
          serverInfo: {
            name: 'consultor-integration-layer',
            version: '2.4.0',
          },
          instructions:
            'Adaptador MCP oficial da Camada de Integração do Consultor Digital. Reutiliza o mesmo catálogo canônico das 7 ferramentas validadas em produção com autenticação X-API-Key fail-closed e auditoria LGPD.',
        })
      }

      // 5.2 Notificação: notifications/initialized
      if (method === 'notifications/initialized') {
        if (isNotification) {
          return e.noContent(204)
        }
        return sendJsonRpcResult(rpcId, {})
      }

      // 5.3 Método: ping
      if (method === 'ping') {
        return sendJsonRpcResult(rpcId, {})
      }

      // 5.4 Método: tools/list
      if (method === 'tools/list') {
        return sendJsonRpcResult(rpcId, {
          tools: mcpToolDefinitions,
        })
      }

      // 5.5 Método: tools/call
      if (method === 'tools/call') {
        const toolName = params.name
        const toolArguments =
          params.arguments && typeof params.arguments === 'object' ? params.arguments : {}

        if (typeof toolName !== 'string' || !toolName.trim()) {
          return sendJsonRpcError(
            rpcId,
            -32602,
            "Invalid params: o campo 'name' da ferramenta é obrigatório.",
            null,
            400,
          )
        }

        const cleanToolName = toolName.trim()
        let domainResult = null

        if (cleanToolName === 'create_lead') {
          domainResult = domainCreateLead(toolArguments)
        } else if (cleanToolName === 'schedule_meeting') {
          domainResult = domainScheduleMeeting(toolArguments)
        } else if (cleanToolName === 'send_email') {
          domainResult = domainSendEmail(toolArguments)
        } else if (cleanToolName === 'list_meetings') {
          domainResult = domainListMeetings(toolArguments)
        } else if (cleanToolName === 'list_leads') {
          domainResult = domainListLeads(toolArguments)
        } else if (cleanToolName === 'get_lead') {
          domainResult = domainGetLead(toolArguments)
        } else if (cleanToolName === 'update_lead_stage') {
          domainResult = domainUpdateLeadStage(toolArguments)
        } else if (cleanToolName === 'tools_registry') {
          domainResult = domainToolsRegistry()
        } else if (cleanToolName === 'mcp_adapter') {
          domainResult = {
            ok: true,
            data: {
              protocol: 'MCP / JSON-RPC 2.0',
              endpoint: '/backend/v1/mcp',
              methods_supported: [
                'initialize',
                'notifications/initialized',
                'ping',
                'tools/list',
                'tools/call',
              ],
              tools_available: mcpToolDefinitions.length,
            },
          }
        } else {
          return sendJsonRpcError(
            rpcId,
            -32601,
            "Method not found: ferramenta '" + cleanToolName + "' não existe no catálogo.",
            null,
            404,
          )
        }

        // Resposta no envelope MCP
        // Se a tool retornou ok: false (erro de validação/domínio), MCP padroniza isError: true com texto estruturado
        const serializedPayload = JSON.stringify(domainResult, null, 2)
        const isError = !domainResult.ok

        return sendJsonRpcResult(rpcId, {
          content: [
            {
              type: 'text',
              text: serializedPayload,
            },
          ],
          isError: isError,
          _canonicalEnvelope: domainResult,
        })
      }

      // Método desconhecido
      return sendJsonRpcError(
        rpcId,
        -32601,
        "Method not found: o método '" + method + "' não é suportado pelo adaptador MCP.",
        null,
        404,
      )
    } catch (runtimeErr) {
      const errorMsg =
        runtimeErr && runtimeErr.message
          ? String(runtimeErr.message)
          : 'Erro interno no adaptador MCP'
      console.error('[MCP_ADAPTER_ERROR]', errorMsg)

      return sendJsonRpcError(
        rpcId,
        -32603,
        'Internal error no adaptador MCP: ' + errorMsg,
        null,
        500,
      )
    }
  })
})
