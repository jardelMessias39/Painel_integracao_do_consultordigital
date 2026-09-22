// Hook: POST /backend/v1/tools/create_lead
// Camada de Integração do Consultor Digital - Refactor Arquitetural (ADR-001)
//
// Arquitetura em Camadas Desacopladas:
// [TRANSPORTE HTTP] -> [INFRAESTRUTURA] -> [TOOL REGISTRY & CAPABILITY] -> [DOMÍNIO] -> [PERSISTÊNCIA]
//
// Premissas do ADR-001:
// 1. Transporte HTTP lê request, orquestra camadas e responde com envelope. Zero regra de negócio.
// 2. Infraestrutura: Autenticação via X-API-Key (tempo constante, fail-closed sem fallback hardcoded),
//    Rate limit em memória (120 req/min por chave) e Audit Logger unificado (grava em tool_logs sem dados sensíveis).
// 3. Tool Registry: Registro formal de capabilities ({ nome, descricao, escopo, inputSchema, run }).
// 4. Domínio: Regras puras da capability create_lead (sanitização, enum fechado de estágio novo|qualificado|proposta|descartado,
//    política de idempotência email+empresa). Desacoplado de HTTP e PocketBase (opera sobre porta/repositório abstrato).
// 5. Persistência: Adaptador PocketBase que implementa a porta do repositório (findLeadByEmailEmpresa, insertLead) usando $app.
// 6. MCP Readyness: Um futuro adaptador MCP poderá invocar diretamente registry.get('create_lead').run(...)
//    reutilizando as camadas de Domínio e Persistência sem duplicação.
// 7. Contrato externo 100% preservado (mesmo path, mesmos envelopes, mesmos status e códigos).
// 8. Fail-closed: se CONSULTOR_API_KEY não estiver no ambiente, retorna 500 INTERNAL_ERROR e loga o erro.

routerAdd('POST', '/backend/v1/tools/create_lead', (e) => {
  const startTime = Date.now()
  const requestId = 'req_' + $security.randomString(16)

  // =========================================================================
  // CAMADA 1: INFRAESTRUTURA (Infra)
  // Reutilizável por qualquer tool futura: Auth, Rate Limit, Audit Logger
  // =========================================================================
  const infra = {
    // 1.1 Audit Logger Unificado (elimina duplicação entre sucesso e erro; LGPD compliant)
    auditLog: (data) => {
      const durationMs = Date.now() - startTime
      try {
        const logsCol = $app.findCollectionByNameOrId('tool_logs')
        const logRecord = new Record(logsCol)
        logRecord.set('ferramenta', data.ferramenta || 'create_lead')
        logRecord.set('resultado', data.resultado) // 'sucesso' | 'erro'
        logRecord.set('error_code', data.error_code || '')
        logRecord.set('request_id', requestId)
        logRecord.set('duracao_ms', durationMs)
        logRecord.set('http_status', data.http_status)
        $app.save(logRecord)
      } catch (logErr) {
        // Logging nunca deve abortar o fluxo da requisição
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

    // 1.3 Autenticação Server-to-Server (Fail-Closed: NUNCA usar chave hardcoded como fallback)
    authenticate: (request) => {
      const configuredKey = $os.getenv('CONSULTOR_API_KEY')
      if (!configuredKey || !configuredKey.trim()) {
        console.error(
          '[SECURITY] CONSULTOR_API_KEY não configurada no ambiente. Bloqueando requisição (fail-closed).',
        )
        return {
          authorized: false,
          serverConfigError: true,
          status: 500,
          code: 'INTERNAL_ERROR',
          message: 'Configuração interna do servidor indisponível. Contate o administrador.',
        }
      }

      const authHeaderKey = request.header.get('X-API-Key') || request.header.get('x-api-key') || ''

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

      // Limpeza de minutos antigos (janela móvel simples)
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
      ferramenta: 'create_lead',
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

  // --- Executa Segurança de Infra (Auth + Rate Limiting) no Transporte ---
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

  // =========================================================================
  // CAMADA 3: PERSISTÊNCIA (Adaptador PocketBase / Porta de Repositório)
  // ÚNICO ponto onde $app toca a coleção 'leads'.
  // =========================================================================
  const leadRepository = {
    findLeadByEmailEmpresa: (email, empresa) => {
      try {
        const records = $app.findRecordsByFilter(
          'leads',
          'email = {:email} && empresa = {:empresa}',
          '-created',
          1,
          0,
          { email: email, empresa: empresa },
        )
        if (records && records.length > 0) {
          const rec = records[0]
          return {
            id: rec.id,
            estagio_do_lead: rec.getString('estagio_do_lead'),
            created: rec.getString('created'),
          }
        }
      } catch (_) {
        // Nenhum registro encontrado ou erro de busca
      }
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

  // =========================================================================
  // CAMADA 4: DOMÍNIO (Regras de Negócio Puras da Capability create_lead)
  // Independente de HTTP e de PocketBase:
  // Recebe dados validados + porta/repositório e retorna resultado de domínio.
  // =========================================================================
  const createLeadDomainService = {
    ALLOWED_ESTAGIOS: ['novo', 'qualificado', 'proposta', 'descartado'],

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
      } else if (typeof data.solucao_sugerida === 'string' && data.solucao_sugerida.length > 2000) {
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
      const estagio = data.estagio_do_lead
        ? String(data.estagio_do_lead).toLowerCase().trim()
        : 'novo'
      if (!createLeadDomainService.ALLOWED_ESTAGIOS.includes(estagio)) {
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

      if (issues.length > 0) {
        return { valid: false, issues: issues }
      }

      return {
        valid: true,
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

    // Executa a lógica de negócio de criação com política de idempotência (email + empresa)
    execute: (sanitizedData, repository, reqId) => {
      // 1. Idempotência: verificar existência prévia
      const existingLead = repository.findLeadByEmailEmpresa(
        sanitizedData.email,
        sanitizedData.empresa,
      )

      if (existingLead) {
        return {
          status: 200,
          duplicado: true,
          lead_id: existingLead.id,
          estagio_do_lead: existingLead.estagio_do_lead,
          created_at: existingLead.created,
        }
      }

      // 2. Novo lead
      const createdRecord = repository.insertLead(sanitizedData, reqId)

      return {
        status: 201,
        duplicado: false,
        lead_id: createdRecord.id,
        estagio_do_lead: createdRecord.estagio_do_lead,
        created_at: createdRecord.created,
      }
    },
  }

  // =========================================================================
  // CAMADA 5: TOOL REGISTRY (Registro de Capabilities)
  // Cada tool expõe contrato canônico: { nome, descricao, escopo, inputSchema, run }
  // Permitirá que futuros adaptadores (ex: MCP server) consumam a mesma capability.
  // =========================================================================
  const toolRegistry = {
    create_lead: {
      nome: 'create_lead',
      descricao: 'Registra ou atualiza um lead comercial qualificado pelo Consultor Digital',
      escopo: 'leads:write',
      inputSchema: {
        type: 'object',
        properties: {
          nome: { type: 'string', maxLength: 200 },
          empresa: { type: 'string', maxLength: 200 },
          email: { type: 'string', format: 'email', maxLength: 200 },
          telefone: { type: 'string', maxLength: 30 },
          necessidade_identificada: { type: 'string', maxLength: 2000 },
          problema_relatado: { type: 'string', maxLength: 2000 },
          requisitos: { type: 'string', maxLength: 2000 },
          solucao_sugerida: { type: 'string', maxLength: 2000 },
          resumo_conversa: { type: 'string', maxLength: 5000 },
          estagio_do_lead: {
            type: 'string',
            enum: ['novo', 'qualificado', 'proposta', 'descartado'],
            default: 'novo',
          },
          proximo_passo: { type: 'string', maxLength: 500 },
        },
        required: ['nome', 'empresa', 'email'],
      },
      validate: (input) => createLeadDomainService.validateAndSanitize(input),
      run: (sanitizedData, context) => {
        const repo = (context && context.repository) || leadRepository
        const rId = (context && context.requestId) || requestId
        return createLeadDomainService.execute(sanitizedData, repo, rId)
      },
    },
  }

  // --- Orquestração no Transporte HTTP ---
  const tool = toolRegistry['create_lead']
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
      'Dados do lead inválidos. Corrija os campos e tente novamente.',
      validationResult.issues,
    )
  }

  // 2. Execução da Capability através do Registry
  try {
    const domainResult = tool.run(validationResult.sanitized, {
      repository: leadRepository,
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
        lead_id: domainResult.lead_id,
        estagio_do_lead: domainResult.estagio_do_lead,
        created_at: domainResult.created_at,
        duplicado: domainResult.duplicado,
      },
    })
  } catch (executionErr) {
    const errorMsg =
      executionErr && executionErr.message
        ? String(executionErr.message)
        : 'Falha interna ao processar a criação do lead'
    console.error('[CREATE_LEAD_EXECUTION_ERROR]', errorMsg)

    return sendErrorEnvelope(
      500,
      'INTERNAL_ERROR',
      'Ocorreu um erro interno ao registrar o lead. Tente novamente mais tarde.',
      [{ field: 'server', message: errorMsg }],
    )
  }
})
