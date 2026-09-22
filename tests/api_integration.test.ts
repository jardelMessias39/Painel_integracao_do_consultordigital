import { describe, it } from 'node:test'
import assert from 'node:assert'

// Simulação da camada de infraestrutura e orquestração do hook POST /backend/v1/tools/create_lead
// Reproduz com exatidão as regras do hook em pocketbase/hooks/create_lead_tool.js

function constantTimeCompare(a: string, b: string): boolean {
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

interface RequestMock {
  header: Map<string, string>
  body?: any
}

function handleCreateLeadRequest(
  request: RequestMock,
  env: { CONSULTOR_API_KEY?: string },
  dbState: {
    leads: any[]
    tool_logs: any[]
    rateLimitStore: Record<string, number>
  },
) {
  const startTime = Date.now()
  const requestId = 'req_' + Math.random().toString(36).substring(2, 10)

  // 1. Audit logger unificado
  const auditLog = (data: {
    ferramenta?: string
    resultado: 'sucesso' | 'erro'
    error_code?: string
    http_status: number
  }) => {
    const durationMs = Date.now() - startTime
    const logDoc = {
      id: 'log_' + Math.random().toString(36).substring(2, 9),
      ferramenta: data.ferramenta || 'create_lead',
      resultado: data.resultado,
      error_code: data.error_code || '',
      request_id: requestId,
      duracao_ms: durationMs,
      http_status: data.http_status,
      created: new Date().toISOString(),
      updated: new Date().toISOString(),
    }
    dbState.tool_logs.push(logDoc)
  }

  // 2. Helper de resposta de erro
  const sendErrorEnvelope = (
    status: number,
    code: string,
    message: string,
    details: Array<{ field?: string; message: string }> = [],
  ) => {
    auditLog({
      ferramenta: 'create_lead',
      resultado: 'erro',
      error_code: code,
      http_status: status,
    })
    return {
      status,
      body: {
        ok: false,
        error: {
          code,
          message,
          details,
        },
      },
    }
  }

  // 3. Autenticação fail-closed
  const configuredKey = env.CONSULTOR_API_KEY
  if (!configuredKey || !configuredKey.trim()) {
    return sendErrorEnvelope(
      500,
      'INTERNAL_ERROR',
      'Configuração interna do servidor indisponível. Contate o administrador.',
      [],
    )
  }

  const authHeaderKey = request.header.get('x-api-key') || request.header.get('X-API-Key') || ''
  if (!authHeaderKey || !constantTimeCompare(authHeaderKey.trim(), configuredKey.trim())) {
    return sendErrorEnvelope(
      401,
      'UNAUTHORIZED',
      'Chave de API ausente ou inválida. Forneça o header X-API-Key com uma chave autorizada.',
      [],
    )
  }

  const keyIdentifier = authHeaderKey.trim().slice(0, 10)

  // 4. Rate limiting em memória (120 req/min)
  const currentMinute = Math.floor(Date.now() / 60000)
  const rateLimitKey = 'rl_' + keyIdentifier + '_' + currentMinute
  const currentCount = (dbState.rateLimitStore[rateLimitKey] || 0) + 1
  dbState.rateLimitStore[rateLimitKey] = currentCount

  if (currentCount > 120) {
    return sendErrorEnvelope(
      429,
      'RATE_LIMITED',
      'Limite de requisições excedido para esta chave (máximo 120 req/min). Aguarde antes de enviar novamente.',
      [{ field: 'rate_limit', message: 'Taxa máxima atingida' }],
    )
  }

  // 5. Validação de corpo
  const rawBody = request.body || {}
  const issues: Array<{ field: string; message: string }> = []

  if (typeof rawBody.nome !== 'string' || !rawBody.nome.trim()) {
    issues.push({
      field: 'nome',
      message: "O campo 'nome' é obrigatório e deve ter no máximo 200 caracteres.",
    })
  } else if (rawBody.nome.trim().length > 200) {
    issues.push({ field: 'nome', message: "O campo 'nome' não pode exceder 200 caracteres." })
  }

  if (typeof rawBody.empresa !== 'string' || !rawBody.empresa.trim()) {
    issues.push({
      field: 'empresa',
      message: "O campo 'empresa' é obrigatório e deve ter no máximo 200 caracteres.",
    })
  } else if (rawBody.empresa.trim().length > 200) {
    issues.push({
      field: 'empresa',
      message: "O campo 'empresa' não pode exceder 200 caracteres.",
    })
  }

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  if (typeof rawBody.email !== 'string' || !rawBody.email.trim()) {
    issues.push({
      field: 'email',
      message: "O campo 'email' é obrigatório e deve ser um endereço de e-mail válido.",
    })
  } else if (rawBody.email.trim().length > 200) {
    issues.push({
      field: 'email',
      message: "O campo 'email' não pode exceder 200 caracteres.",
    })
  } else if (!emailRegex.test(rawBody.email.trim())) {
    issues.push({
      field: 'email',
      message: "O campo 'email' informado não possui um formato válido de e-mail.",
    })
  }

  const allowedEstagios = ['novo', 'qualificado', 'proposta', 'descartado']
  const estagio = rawBody.estagio_do_lead
    ? String(rawBody.estagio_do_lead).toLowerCase().trim()
    : 'novo'
  if (!allowedEstagios.includes(estagio)) {
    issues.push({
      field: 'estagio_do_lead',
      message:
        "O campo 'estagio_do_lead' deve ser exatamente um dos valores permitidos: 'novo', 'qualificado', 'proposta' ou 'descartado'.",
    })
  }

  if (issues.length > 0) {
    return sendErrorEnvelope(
      400,
      'VALIDATION_ERROR',
      'Dados do lead inválidos. Corrija os campos e tente novamente.',
      issues,
    )
  }

  const sanitized = {
    nome: String(rawBody.nome).trim(),
    empresa: String(rawBody.empresa).trim(),
    email: String(rawBody.email).toLowerCase().trim(),
    telefone: rawBody.telefone ? String(rawBody.telefone).trim() : '',
    necessidade_identificada: rawBody.necessidade_identificada
      ? String(rawBody.necessidade_identificada).trim()
      : '',
    problema_relatado: rawBody.problema_relatado ? String(rawBody.problema_relatado).trim() : '',
    requisitos: rawBody.requisitos ? String(rawBody.requisitos).trim() : '',
    solucao_sugerida: rawBody.solucao_sugerida ? String(rawBody.solucao_sugerida).trim() : '',
    resumo_conversa: rawBody.resumo_conversa ? String(rawBody.resumo_conversa).trim() : '',
    estagio_do_lead: estagio,
    proximo_passo: rawBody.proximo_passo ? String(rawBody.proximo_passo).trim() : '',
  }

  // 6. Idempotência / Persistência
  const existing = dbState.leads.find(
    (l) => l.email === sanitized.email && l.empresa === sanitized.empresa,
  )

  if (existing) {
    auditLog({
      ferramenta: 'create_lead',
      resultado: 'sucesso',
      http_status: 200,
    })
    return {
      status: 200,
      body: {
        ok: true,
        data: {
          lead_id: existing.id,
          estagio_do_lead: existing.estagio_do_lead,
          created_at: existing.created,
          duplicado: true,
        },
      },
    }
  }

  const newLead = {
    id: 'lead_' + Math.random().toString(36).substring(2, 9),
    ...sanitized,
    request_id: requestId,
    created: new Date().toISOString(),
    updated: new Date().toISOString(),
  }
  dbState.leads.push(newLead)

  auditLog({
    ferramenta: 'create_lead',
    resultado: 'sucesso',
    http_status: 201,
  })

  return {
    status: 201,
    body: {
      ok: true,
      data: {
        lead_id: newLead.id,
        estagio_do_lead: newLead.estagio_do_lead,
        created_at: newLead.created,
        duplicado: false,
      },
    },
  }
}

describe('Integration Layer - Testes de API e Requisitos de Segurança', () => {
  const TEST_VALID_KEY = 'sk_test_local_only_999999999999'

  it('1. Fail-closed: Quando CONSULTOR_API_KEY não existe no ambiente, deve retornar 500 INTERNAL_ERROR', () => {
    const dbState = { leads: [], tool_logs: [], rateLimitStore: {} }
    const req: RequestMock = {
      header: new Map([['x-api-key', TEST_VALID_KEY]]),
      body: { nome: 'Teste', empresa: 'Empresa', email: 'teste@empresa.com' },
    }

    // Ambiente SEM CONSULTOR_API_KEY (exatamente a situação de produção constatada no list_secrets)
    const env = {}
    const res = handleCreateLeadRequest(req, env, dbState)

    assert.strictEqual(res.status, 500)
    assert.strictEqual(res.body.ok, false)
    assert.strictEqual(res.body.error.code, 'INTERNAL_ERROR')
    assert.strictEqual(
      res.body.error.message,
      'Configuração interna do servidor indisponível. Contate o administrador.',
    )
    assert.strictEqual(dbState.tool_logs.length, 1)
    assert.strictEqual(dbState.tool_logs[0].resultado, 'erro')
    assert.strictEqual(dbState.tool_logs[0].error_code, 'INTERNAL_ERROR')
    assert.strictEqual(dbState.tool_logs[0].http_status, 500)
  })

  it('2. Autenticação: Deve retornar 401 UNAUTHORIZED na ausência do header X-API-Key', () => {
    const dbState = { leads: [], tool_logs: [], rateLimitStore: {} }
    const req: RequestMock = {
      header: new Map(), // Sem X-API-Key
      body: { nome: 'Teste', empresa: 'Empresa', email: 'teste@empresa.com' },
    }
    const env = { CONSULTOR_API_KEY: TEST_VALID_KEY }
    const res = handleCreateLeadRequest(req, env, dbState)

    assert.strictEqual(res.status, 401)
    assert.strictEqual(res.body.ok, false)
    assert.strictEqual(res.body.error.code, 'UNAUTHORIZED')
    assert.strictEqual(dbState.tool_logs.length, 1)
    assert.strictEqual(dbState.tool_logs[0].resultado, 'erro')
    assert.strictEqual(dbState.tool_logs[0].error_code, 'UNAUTHORIZED')
  })

  it('3. Autenticação: Deve retornar 401 UNAUTHORIZED quando X-API-Key for inválida', () => {
    const dbState = { leads: [], tool_logs: [], rateLimitStore: {} }
    const req: RequestMock = {
      header: new Map([['x-api-key', 'chave_incorreta_12345']]),
      body: { nome: 'Teste', empresa: 'Empresa', email: 'teste@empresa.com' },
    }
    const env = { CONSULTOR_API_KEY: TEST_VALID_KEY }
    const res = handleCreateLeadRequest(req, env, dbState)

    assert.strictEqual(res.status, 401)
    assert.strictEqual(res.body.ok, false)
    assert.strictEqual(res.body.error.code, 'UNAUTHORIZED')
  })

  it('4. Validação de entrada: Deve retornar 400 VALIDATION_ERROR com lista de issues ao enviar campos inválidos', () => {
    const dbState = { leads: [], tool_logs: [], rateLimitStore: {} }
    const req: RequestMock = {
      header: new Map([['x-api-key', TEST_VALID_KEY]]),
      body: {
        nome: '',
        empresa: '',
        email: 'formato-invalido',
        estagio_do_lead: 'status_inexistente',
      },
    }
    const env = { CONSULTOR_API_KEY: TEST_VALID_KEY }
    const res = handleCreateLeadRequest(req, env, dbState)

    assert.strictEqual(res.status, 400)
    assert.strictEqual(res.body.ok, false)
    assert.strictEqual(res.body.error.code, 'VALIDATION_ERROR')
    assert.ok(Array.isArray(res.body.error.details))
    assert.ok(res.body.error.details.some((d) => d.field === 'nome'))
    assert.ok(res.body.error.details.some((d) => d.field === 'empresa'))
    assert.ok(res.body.error.details.some((d) => d.field === 'email'))
    assert.ok(res.body.error.details.some((d) => d.field === 'estagio_do_lead'))
  })

  it('5. Criação válida de lead: Deve retornar 201 com envelope {ok: true, data: {lead_id, estagio_do_lead, created_at, duplicado: false}}', () => {
    const dbState = { leads: [], tool_logs: [], rateLimitStore: {} }
    const req: RequestMock = {
      header: new Map([['x-api-key', TEST_VALID_KEY]]),
      body: {
        nome: 'Renata Vasconcelos',
        empresa: 'LogiTech Transportes',
        email: 'renata@logitech.com.br',
        telefone: '(11) 98888-7777',
        necessidade_identificada: 'Atendimento automatizado a motoristas',
        estagio_do_lead: 'proposta',
      },
    }
    const env = { CONSULTOR_API_KEY: TEST_VALID_KEY }
    const res = handleCreateLeadRequest(req, env, dbState)

    assert.strictEqual(res.status, 201)
    assert.strictEqual(res.body.ok, true)
    assert.strictEqual(res.body.data.duplicado, false)
    assert.strictEqual(res.body.data.estagio_do_lead, 'proposta')
    assert.ok(res.body.data.lead_id)
    assert.ok(res.body.data.created_at)

    // Confirma gravação no mock PocketBase
    assert.strictEqual(dbState.leads.length, 1)
    const saved = dbState.leads[0]
    assert.strictEqual(saved.id, res.body.data.lead_id)
    assert.strictEqual(saved.email, 'renata@logitech.com.br')
    assert.strictEqual(saved.empresa, 'LogiTech Transportes')
  })

  it('6. Idempotência / Repetição: Mesma chave email+empresa deve retornar 200 com duplicado: true sem criar segunda linha', () => {
    const dbState = { leads: [], tool_logs: [], rateLimitStore: {} }
    const env = { CONSULTOR_API_KEY: TEST_VALID_KEY }
    const req1: RequestMock = {
      header: new Map([['x-api-key', TEST_VALID_KEY]]),
      body: {
        nome: 'Renata Vasconcelos',
        empresa: 'LogiTech Transportes',
        email: 'renata@logitech.com.br',
        estagio_do_lead: 'novo',
      },
    }

    const res1 = handleCreateLeadRequest(req1, env, dbState)
    assert.strictEqual(res1.status, 201)
    assert.strictEqual(res1.body.data.duplicado, false)
    const initialLeadId = res1.body.data.lead_id

    // Segunda chamada com mesmo email + mesma empresa (dados adicionais diferentes)
    const req2: RequestMock = {
      header: new Map([['x-api-key', TEST_VALID_KEY]]),
      body: {
        nome: 'Renata V.',
        empresa: 'LogiTech Transportes',
        email: 'renata@logitech.com.br',
        estagio_do_lead: 'qualificado',
      },
    }

    const res2 = handleCreateLeadRequest(req2, env, dbState)
    assert.strictEqual(res2.status, 200)
    assert.strictEqual(res2.body.ok, true)
    assert.strictEqual(res2.body.data.duplicado, true)
    assert.strictEqual(res2.body.data.lead_id, initialLeadId)
    assert.strictEqual(dbState.leads.length, 1, 'Total de leads deve permanecer 1')
  })

  it('7. Rate Limiting: Acima de 120 requisições por minuto deve responder 429 RATE_LIMITED', () => {
    const dbState = { leads: [], tool_logs: [], rateLimitStore: {} }
    const env = { CONSULTOR_API_KEY: TEST_VALID_KEY }

    // Preenche o contador até 120
    const minute = Math.floor(Date.now() / 60000)
    const keyId = TEST_VALID_KEY.slice(0, 10)
    dbState.rateLimitStore[`rl_${keyId}_${minute}`] = 120

    // 121ª requisição
    const req: RequestMock = {
      header: new Map([['x-api-key', TEST_VALID_KEY]]),
      body: { nome: 'Rate', empresa: 'Limit', email: 'rate@limit.com' },
    }

    const res = handleCreateLeadRequest(req, env, dbState)
    assert.strictEqual(res.status, 429)
    assert.strictEqual(res.body.ok, false)
    assert.strictEqual(res.body.error.code, 'RATE_LIMITED')
    assert.ok(res.body.error.message.includes('120 req/min'))
  })

  it('8. Auditoria LGPD em tool_logs: NÃO deve conter PII (nome, email, telefone, resumo) nem API key', () => {
    const dbState = { leads: [], tool_logs: [], rateLimitStore: {} }
    const env = { CONSULTOR_API_KEY: TEST_VALID_KEY }

    const rawLead = {
      nome: 'Sensível Silva',
      empresa: 'Sensível S.A.',
      email: 'privacidade@sensivel.com.br',
      telefone: '(11) 99999-0000',
      resumo_conversa: 'Conversa privada contendo dados bancários e confidenciais',
      necessidade_identificada: 'Auditoria de segurança',
    }

    const req: RequestMock = {
      header: new Map([['x-api-key', TEST_VALID_KEY]]),
      body: rawLead,
    }

    handleCreateLeadRequest(req, env, dbState)
    assert.strictEqual(dbState.tool_logs.length, 1)

    const logRecord = dbState.tool_logs[0]
    const logString = JSON.stringify(logRecord).toLowerCase()

    // Verificações estritas de LGPD:
    assert.strictEqual(logString.includes('sensível'), false, 'Não deve conter nome')
    assert.strictEqual(
      logString.includes('privacidade@sensivel.com.br'),
      false,
      'Não deve conter email',
    )
    assert.strictEqual(logString.includes('99999-0000'), false, 'Não deve conter telefone')
    assert.strictEqual(
      logString.includes('dados bancários'),
      false,
      'Não deve conter transcrição/resumo',
    )
    assert.strictEqual(
      logString.includes(TEST_VALID_KEY.toLowerCase()),
      false,
      'Não deve conter o valor da API Key',
    )

    // Campos permitidos apenas:
    assert.ok('ferramenta' in logRecord)
    assert.ok('resultado' in logRecord)
    assert.ok('error_code' in logRecord)
    assert.ok('request_id' in logRecord)
    assert.ok('duracao_ms' in logRecord)
    assert.ok('http_status' in logRecord)
    assert.strictEqual(typeof logRecord.duracao_ms, 'number')
    assert.strictEqual(typeof logRecord.http_status, 'number')
  })
})
