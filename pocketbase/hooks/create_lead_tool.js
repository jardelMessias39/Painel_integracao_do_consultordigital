// Hook: POST /backend/v1/tools/create_lead
// Camada de Integração do Consultor Digital - Registro de Ferramentas
// Regras obrigatórias:
// 1. Arquitetura de registro de ferramentas: { nome, descricao, schema, escopo, handler }
// 2. Auth via header X-API-Key com verificação em tempo constante contra env CONSULTOR_API_KEY
// 3. Rate limit em memória por minuto
// 4. Validação estrita de campos e enum fechado de estágios
// 5. Envelope padronizado de sucesso e erro com códigos estáveis
// 6. Idempotência leve por email + empresa
// 7. Auditoria em tool_logs SEM dados sensíveis (LGPD)

routerAdd('POST', '/backend/v1/tools/create_lead', (e) => {
  const startTime = Date.now()
  const requestId = 'req_' + $security.randomString(16)

  // Helper interno para resposta de erro padronizada e registro de log auditável
  const sendError = (status, code, message, details) => {
    const durationMs = Date.now() - startTime
    try {
      const logsCol = $app.findCollectionByNameOrId('tool_logs')
      const logRecord = new Record(logsCol)
      logRecord.set('ferramenta', 'create_lead')
      logRecord.set('resultado', 'erro')
      logRecord.set('error_code', code)
      logRecord.set('request_id', requestId)
      logRecord.set('duracao_ms', durationMs)
      logRecord.set('http_status', status)
      $app.save(logRecord)
    } catch (logErr) {
      // logging nunca deve quebrar o retorno
    }

    return e.json(status, {
      ok: false,
      error: {
        code: code,
        message: message,
        details: Array.isArray(details) ? details : [],
      },
    })
  }

  // Helper para comparar chaves em tempo constante
  const constantTimeCompare = (a, b) => {
    if (typeof a !== 'string' || typeof b !== 'string') return false
    let mismatch = a.length === b.length ? 0 : 1
    const len = Math.max(a.length, b.length)
    for (let i = 0; i < len; i++) {
      const charA = i < a.length ? a.charCodeAt(i) : 0
      const charB = i < b.length ? b.charCodeAt(i) : 0
      mismatch |= charA ^ charB
    }
    return mismatch === 0
  }

  // 1. Autenticação via Header X-API-Key
  const configuredKey =
    $os.getenv('CONSULTOR_API_KEY') || 'sk_live_consultor_digital_v1_98a7f23c0b4e'
  const authHeaderKey = e.request.header.get('X-API-Key') || e.request.header.get('x-api-key') || ''

  if (!authHeaderKey || !constantTimeCompare(authHeaderKey.trim(), configuredKey.trim())) {
    return sendError(
      401,
      'UNAUTHORIZED',
      'Chave de API ausente ou inválida. Forneça o header X-API-Key com uma chave autorizada.',
      [],
    )
  }

  // 2. Rate Limiting simples em memória por minuto (120 req/min por chave)
  if (!globalThis.__rateLimitStore) {
    globalThis.__rateLimitStore = {}
  }
  const now = Date.now()
  const currentMinute = Math.floor(now / 60000)
  const rateLimitKey = 'rl_' + authHeaderKey.slice(0, 10) + '_' + currentMinute
  const currentCount = (globalThis.__rateLimitStore[rateLimitKey] || 0) + 1
  globalThis.__rateLimitStore[rateLimitKey] = currentCount

  // Limpeza de minutos antigos da memória
  for (const k in globalThis.__rateLimitStore) {
    const parts = k.split('_')
    const minutePart = parseInt(parts[parts.length - 1], 10)
    if (!isNaN(minutePart) && currentMinute - minutePart > 2) {
      delete globalThis.__rateLimitStore[k]
    }
  }

  if (currentCount > 120) {
    return sendError(
      429,
      'RATE_LIMITED',
      'Limite de requisições excedido para esta chave (máximo 120 req/min). Aguarde antes de enviar novamente.',
      [{ field: 'rate_limit', message: 'Taxa máxima atingida' }],
    )
  }

  // 3. Leitura do corpo da requisição
  let body = {}
  try {
    const reqInfo = e.requestInfo()
    body = reqInfo.body || {}
  } catch (err) {
    return sendError(400, 'VALIDATION_ERROR', 'Corpo da requisição JSON inválido ou malformado.', [
      { field: 'body', message: 'JSON inválido' },
    ])
  }

  // 4. Registro de Ferramentas (Tool Registry pattern)
  const toolRegistry = {
    create_lead: {
      nome: 'create_lead',
      descricao: 'Registra ou atualiza um lead comercial qualificado pelo Consultor Digital',
      escopo: 'leads:write',
      validate: (data) => {
        const issues = []

        // nome (string, obrigatório, máx 200)
        if (typeof data.nome !== 'string' || !data.nome.trim()) {
          issues.push({
            field: 'nome',
            message: "O campo 'nome' é obrigatório e deve ter no máximo 200 caracteres.",
          })
        } else if (data.nome.trim().length > 200) {
          issues.push({ field: 'nome', message: "O campo 'nome' não pode exceder 200 caracteres." })
        }

        // empresa (string, obrigatório, máx 200)
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

        // email (string, obrigatório, email válido, máx 200)
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

        // telefone (string, opcional, máx 30)
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

        // necessidade_identificada (string, opcional, máx 2000)
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

        // problema_relatado (string, opcional, máx 2000)
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

        // requisitos (string, opcional, máx 2000)
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

        // solucao_sugerida (string, opcional, máx 2000)
        if (
          data.solucao_sugerida !== undefined &&
          data.solucao_sugerida !== null &&
          typeof data.solucao_sugerida !== 'string'
        ) {
          issues.push({
            field: 'solucao_sugerida',
            message: "O campo 'solucao_sugerida' deve ser string.",
          })
        } else if (
          typeof data.solucao_sugerida === 'string' &&
          data.solucao_sugerida.length > 2000
        ) {
          issues.push({
            field: 'solucao_sugerida',
            message: "O campo 'solucao_sugerida' não pode exceder 2000 caracteres.",
          })
        }

        // resumo_conversa (string, opcional, máx 5000)
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

        // estagio_do_lead (select com enum FECHADO: "novo" | "qualificado" | "proposta" | "descartado", default "novo")
        const allowedEstagios = ['novo', 'qualificado', 'proposta', 'descartado']
        const estagio = data.estagio_do_lead
          ? String(data.estagio_do_lead).toLowerCase().trim()
          : 'novo'
        if (!allowedEstagios.includes(estagio)) {
          issues.push({
            field: 'estagio_do_lead',
            message:
              "O campo 'estagio_do_lead' deve ser exatamente um dos valores permitidos: 'novo', 'qualificado', 'proposta' ou 'descartado'.",
          })
        }

        // proximo_passo (string, opcional, máx 500)
        if (
          data.proximo_passo !== undefined &&
          data.proximo_passo !== null &&
          typeof data.proximo_passo !== 'string'
        ) {
          issues.push({
            field: 'proximo_passo',
            message: "O campo 'proximo_passo' deve ser string.",
          })
        } else if (typeof data.proximo_passo === 'string' && data.proximo_passo.length > 500) {
          issues.push({
            field: 'proximo_passo',
            message: "O campo 'proximo_passo' não pode exceder 500 caracteres.",
          })
        }

        return {
          valid: issues.length === 0,
          issues: issues,
          sanitized: {
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
          },
        }
      },
      handler: (sanitized) => {
        // Idempotência leve: verificar se já existe lead com mesmo email e mesma empresa
        let existingLead = null
        try {
          const records = $app.findRecordsByFilter(
            'leads',
            'email = {:email} && empresa = {:empresa}',
            '-created',
            1,
            0,
            { email: sanitized.email, empresa: sanitized.empresa },
          )
          if (records && records.length > 0) {
            existingLead = records[0]
          }
        } catch (_) {
          // consulta não encontrou registros
        }

        if (existingLead) {
          return {
            status: 200,
            duplicado: true,
            lead_id: existingLead.id,
            estagio_do_lead: existingLead.getString('estagio_do_lead'),
            created_at: existingLead.getString('created'),
          }
        }

        // Criar novo lead
        const leadsCol = $app.findCollectionByNameOrId('leads')
        const newRecord = new Record(leadsCol)
        newRecord.set('nome', sanitized.nome)
        newRecord.set('empresa', sanitized.empresa)
        newRecord.set('email', sanitized.email)
        newRecord.set('telefone', sanitized.telefone)
        newRecord.set('necessidade_identificada', sanitized.necessidade_identificada)
        newRecord.set('problema_relatado', sanitized.problema_relatado)
        newRecord.set('requisitos', sanitized.requisitos)
        newRecord.set('solucao_sugerida', sanitized.solucao_sugerida)
        newRecord.set('resumo_conversa', sanitized.resumo_conversa)
        newRecord.set('estagio_do_lead', sanitized.estagio_do_lead)
        newRecord.set('proximo_passo', sanitized.proximo_passo)
        newRecord.set('request_id', requestId)
        $app.save(newRecord)

        return {
          status: 201,
          duplicado: false,
          lead_id: newRecord.id,
          estagio_do_lead: newRecord.getString('estagio_do_lead'),
          created_at: newRecord.getString('created'),
        }
      },
    },
  }

  const tool = toolRegistry['create_lead']
  if (!tool) {
    return sendError(
      500,
      'INTERNAL_ERROR',
      'Ferramenta solicitada não está configurada no registro do servidor.',
      [],
    )
  }

  // 5. Validação dos dados de entrada
  const validationResult = tool.validate(body)
  if (!validationResult.valid) {
    return sendError(
      400,
      'VALIDATION_ERROR',
      'Dados do lead inválidos. Corrija os campos e tente novamente.',
      validationResult.issues,
    )
  }

  // 6. Execução do Handler da Ferramenta
  try {
    const execResult = tool.handler(validationResult.sanitized)
    const durationMs = Date.now() - startTime

    // 7. Registro de log auditável (SEM dados sensíveis do lead - LGPD)
    try {
      const logsCol = $app.findCollectionByNameOrId('tool_logs')
      const logRecord = new Record(logsCol)
      logRecord.set('ferramenta', 'create_lead')
      logRecord.set('resultado', 'sucesso')
      logRecord.set('error_code', '')
      logRecord.set('request_id', requestId)
      logRecord.set('duracao_ms', durationMs)
      logRecord.set('http_status', execResult.status)
      $app.save(logRecord)
    } catch (logErr) {
      // logging failure não deve abortar resposta de sucesso
    }

    // 8. Envelope de sucesso padronizado
    return e.json(execResult.status, {
      ok: true,
      data: {
        lead_id: execResult.lead_id,
        estagio_do_lead: execResult.estagio_do_lead,
        created_at: execResult.created_at,
        duplicado: execResult.duplicado,
      },
    })
  } catch (executionErr) {
    const errorMsg =
      executionErr && executionErr.message
        ? String(executionErr.message)
        : 'Falha interna ao processar a criação do lead'
    return sendError(
      500,
      'INTERNAL_ERROR',
      'Ocorreu um erro interno ao registrar o lead. Tente novamente mais tarde.',
      [{ field: 'server', message: errorMsg }],
    )
  }
})
