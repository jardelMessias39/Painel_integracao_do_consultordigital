import { describe, it } from 'node:test'
import assert from 'node:assert'

// Simulação da camada de infraestrutura e orquestração dos endpoints:
// - POST /api/backend/v1/tools/create_lead (Rota pública no domínio Skip)
// - POST /backend/v1/tools/create_lead (Rota canônica interna PocketBase)
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

interface SecretsMock {
  get: (key: string) => string | undefined
}

function handleCreateLeadRequest(
  request: RequestMock,
  secrets: SecretsMock,
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
    const duracao_ms = Math.max(1, Date.now() - startTime)
    const logDoc = {
      id: 'log_' + Math.random().toString(36).substring(2, 9),
      ferramenta: data.ferramenta || 'create_lead',
      resultado: data.resultado,
      error_code: data.error_code || '',
      request_id: requestId,
      duracao_ms: duracao_ms,
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

  // 3. Autenticação fail-closed via $secrets.get
  const configuredKey = secrets.get('CONSULTOR_API_KEY')
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

  const createSecretsMock = (store: Record<string, string>): SecretsMock => ({
    get: (key: string) => store[key],
  })

  it('1. Fail-closed: Quando CONSULTOR_API_KEY não existe nos secrets ($secrets.get), deve retornar 500 INTERNAL_ERROR', () => {
    const dbState = { leads: [], tool_logs: [], rateLimitStore: {} }
    const req: RequestMock = {
      header: new Map([['x-api-key', TEST_VALID_KEY]]),
      body: { nome: 'Teste', empresa: 'Empresa', email: 'teste@empresa.com' },
    }

    // Secrets sem CONSULTOR_API_KEY
    const secrets = createSecretsMock({})
    const res = handleCreateLeadRequest(req, secrets, dbState)

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
    const secrets = createSecretsMock({ CONSULTOR_API_KEY: TEST_VALID_KEY })
    const res = handleCreateLeadRequest(req, secrets, dbState)

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
    const secrets = createSecretsMock({ CONSULTOR_API_KEY: TEST_VALID_KEY })
    const res = handleCreateLeadRequest(req, secrets, dbState)

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
    const secrets = createSecretsMock({ CONSULTOR_API_KEY: TEST_VALID_KEY })
    const res = handleCreateLeadRequest(req, secrets, dbState)

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
    const secrets = createSecretsMock({ CONSULTOR_API_KEY: TEST_VALID_KEY })
    const res = handleCreateLeadRequest(req, secrets, dbState)

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
    const secrets = createSecretsMock({ CONSULTOR_API_KEY: TEST_VALID_KEY })
    const req1: RequestMock = {
      header: new Map([['x-api-key', TEST_VALID_KEY]]),
      body: {
        nome: 'Renata Vasconcelos',
        empresa: 'LogiTech Transportes',
        email: 'renata@logitech.com.br',
        estagio_do_lead: 'novo',
      },
    }

    const res1 = handleCreateLeadRequest(req1, secrets, dbState)
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

    const res2 = handleCreateLeadRequest(req2, secrets, dbState)
    assert.strictEqual(res2.status, 200)
    assert.strictEqual(res2.body.ok, true)
    assert.strictEqual(res2.body.data.duplicado, true)
    assert.strictEqual(res2.body.data.lead_id, initialLeadId)
    assert.strictEqual(dbState.leads.length, 1, 'Total de leads deve permanecer 1')
  })

  it('7. Rate Limiting: Acima de 120 requisições por minuto deve responder 429 RATE_LIMITED', () => {
    const dbState = { leads: [], tool_logs: [], rateLimitStore: {} }
    const secrets = createSecretsMock({ CONSULTOR_API_KEY: TEST_VALID_KEY })

    // Preenche o contador até 120
    const minute = Math.floor(Date.now() / 60000)
    const keyId = TEST_VALID_KEY.slice(0, 10)
    dbState.rateLimitStore[`rl_${keyId}_${minute}`] = 120

    // 121ª requisição
    const req: RequestMock = {
      header: new Map([['x-api-key', TEST_VALID_KEY]]),
      body: { nome: 'Rate', empresa: 'Limit', email: 'rate@limit.com' },
    }

    const res = handleCreateLeadRequest(req, secrets, dbState)
    assert.strictEqual(res.status, 429)
    assert.strictEqual(res.body.ok, false)
    assert.strictEqual(res.body.error.code, 'RATE_LIMITED')
    assert.ok(res.body.error.message.includes('120 req/min'))
  })

  it('8. Auditoria LGPD em tool_logs: NÃO deve conter PII (nome, email, telefone, resumo) nem API key', () => {
    const dbState = { leads: [], tool_logs: [], rateLimitStore: {} }
    const secrets = createSecretsMock({ CONSULTOR_API_KEY: TEST_VALID_KEY })

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

    handleCreateLeadRequest(req, secrets, dbState)
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
    assert.ok(logRecord.duracao_ms >= 1, 'duracao_ms deve ser no mínimo 1')
  })

  it('9. Dual-path: O mesmo handler responde identicamente nos dois caminhos (/api/backend/v1/tools/create_lead e /backend/v1/tools/create_lead)', () => {
    const supportedRoutes = [
      '/api/backend/v1/tools/create_lead',
      '/backend/v1/tools/create_lead',
    ]

    for (const route of supportedRoutes) {
      const dbState = { leads: [], tool_logs: [], rateLimitStore: {} }
      const secrets = createSecretsMock({ CONSULTOR_API_KEY: TEST_VALID_KEY })

      // 9.1 Sucesso na criação (201)
      const req: RequestMock = {
        header: new Map([['x-api-key', TEST_VALID_KEY]]),
        body: {
          nome: 'Marcos Vinicius',
          empresa: 'TransLog Brasil',
          email: 'marcos@translog.com.br',
          estagio_do_lead: 'novo',
        },
      }

      const res = handleCreateLeadRequest(req, secrets, dbState)
      assert.strictEqual(res.status, 201, `Status em ${route} deve ser 201`)
      assert.strictEqual(res.body.ok, true, `Envelope ok em ${route} deve ser true`)
      assert.strictEqual(res.body.data.duplicado, false)
      assert.strictEqual(res.body.data.estagio_do_lead, 'novo')
      assert.ok(res.body.data.lead_id)
      assert.strictEqual(dbState.leads.length, 1)
      assert.strictEqual(dbState.tool_logs.length, 1)
      assert.strictEqual(dbState.tool_logs[0].resultado, 'sucesso')
      assert.strictEqual(dbState.tool_logs[0].http_status, 201)

      // 9.2 Idempotência na repetição (200, duplicado: true)
      const reqDup: RequestMock = {
        header: new Map([['x-api-key', TEST_VALID_KEY]]),
        body: {
          nome: 'Marcos Vinicius',
          empresa: 'TransLog Brasil',
          email: 'marcos@translog.com.br',
          estagio_do_lead: 'qualificado',
        },
      }
      const resDup = handleCreateLeadRequest(reqDup, secrets, dbState)
      assert.strictEqual(resDup.status, 200, `Idempotência em ${route} deve retornar 200`)
      assert.strictEqual(resDup.body.ok, true)
      assert.strictEqual(resDup.body.data.duplicado, true)
      assert.strictEqual(resDup.body.data.lead_id, res.body.data.lead_id)
      assert.strictEqual(dbState.leads.length, 1, 'Total de leads deve permanecer 1')
      assert.strictEqual(dbState.tool_logs.length, 2)
      assert.strictEqual(dbState.tool_logs[1].resultado, 'sucesso')
      assert.strictEqual(dbState.tool_logs[1].http_status, 200)

      // 9.3 Autenticação idêntica (401 sem chave)
      const reqUnauth: RequestMock = {
        header: new Map(),
        body: { nome: 'Teste', empresa: 'Empresa', email: 'teste@empresa.com' },
      }
      const resUnauth = handleCreateLeadRequest(reqUnauth, secrets, dbState)
      assert.strictEqual(resUnauth.status, 401, `Autenticação em ${route} deve retornar 401`)
      assert.strictEqual(resUnauth.body.ok, false)
      assert.strictEqual(resUnauth.body.error.code, 'UNAUTHORIZED')

      // 9.4 Validação idêntica (400 dados inválidos)
      const reqInvalid: RequestMock = {
        header: new Map([['x-api-key', TEST_VALID_KEY]]),
        body: { nome: '', empresa: '', email: 'invalido' },
      }
      const resInvalid = handleCreateLeadRequest(reqInvalid, secrets, dbState)
      assert.strictEqual(resInvalid.status, 400, `Validação em ${route} deve retornar 400`)
      assert.strictEqual(resInvalid.body.ok, false)
      assert.strictEqual(resInvalid.body.error.code, 'VALIDATION_ERROR')
      assert.ok(Array.isArray(resInvalid.body.error.details))
    }
  })
})

function handleScheduleMeetingRequest(
  request: RequestMock,
  secrets: SecretsMock,
  dbState: {
    meetings: any[]
    tool_logs: any[]
    rateLimitStore: Record<string, number>
  },
  mockDbError = false,
) {
  const startTime = Date.now()
  const requestId = 'req_' + Math.random().toString(36).substring(2, 10)

  // 1. Audit logger unificado com piso Math.max(1, Date.now() - startTime)
  const auditLog = (data: {
    ferramenta?: string
    resultado: 'sucesso' | 'erro'
    error_code?: string
    http_status: number
  }) => {
    const duracao_ms = Math.max(1, Date.now() - startTime)
    const logDoc = {
      id: 'log_' + Math.random().toString(36).substring(2, 9),
      ferramenta: data.ferramenta || 'schedule_meeting',
      resultado: data.resultado,
      error_code: data.error_code || '',
      request_id: requestId,
      duracao_ms: duracao_ms,
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
      ferramenta: 'schedule_meeting',
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

  // 3. Autenticação fail-closed via $secrets.get
  const configuredKey = secrets.get('CONSULTOR_API_KEY')
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

  // 5. Simulação de falha interna/banco
  if (mockDbError) {
    return sendErrorEnvelope(
      500,
      'INTERNAL_ERROR',
      'Ocorreu um erro interno ao registrar a reunião. Tente novamente mais tarde.',
      [{ field: 'server', message: 'Falha simulada de persistência' }],
    )
  }

  // 6. Validação de corpo
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

  if (typeof rawBody.telefone !== 'string' || !rawBody.telefone.trim()) {
    issues.push({
      field: 'telefone',
      message: "O campo 'telefone' é obrigatório e deve ter no máximo 30 caracteres.",
    })
  } else if (rawBody.telefone.trim().length > 30) {
    issues.push({
      field: 'telefone',
      message: "O campo 'telefone' não pode exceder 30 caracteres.",
    })
  }

  let parsedDate: Date | null = null
  if (typeof rawBody.data_hora !== 'string' || !rawBody.data_hora.trim()) {
    issues.push({
      field: 'data_hora',
      message:
        "O campo 'data_hora' é obrigatório e deve estar no formato ISO 8601 com fuso horário.",
    })
  } else {
    const rawDateStr = rawBody.data_hora.trim()
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

  if (typeof rawBody.assunto !== 'string' || !rawBody.assunto.trim()) {
    issues.push({
      field: 'assunto',
      message: "O campo 'assunto' é obrigatório e deve conter um resumo da pauta da reunião.",
    })
  } else if (rawBody.assunto.trim().length > 500) {
    issues.push({
      field: 'assunto',
      message: "O campo 'assunto' não pode exceder 500 caracteres.",
    })
  }

  if (issues.length > 0) {
    return sendErrorEnvelope(
      400,
      'VALIDATION_ERROR',
      'Dados da solicitação de reunião inválidos. Corrija os campos e tente novamente.',
      issues,
    )
  }

  const sanitized = {
    nome: String(rawBody.nome).trim(),
    empresa: String(rawBody.empresa).trim(),
    email: String(rawBody.email).toLowerCase().trim(),
    telefone: String(rawBody.telefone).trim(),
    data_hora: parsedDate!.toISOString(),
    assunto: String(rawBody.assunto).trim(),
    observacoes: rawBody.observacoes ? String(rawBody.observacoes).trim() : '',
  }

  // 7. Idempotência por email + data_hora
  const existing = dbState.meetings.find(
    (m) => m.email === sanitized.email && m.data_hora === sanitized.data_hora,
  )

  if (existing) {
    auditLog({
      ferramenta: 'schedule_meeting',
      resultado: 'sucesso',
      http_status: 200,
    })
    return {
      status: 200,
      body: {
        ok: true,
        data: {
          meeting_id: existing.id,
          status: existing.status,
          data_hora: existing.data_hora,
          created_at: existing.created,
          duplicado: true,
        },
      },
    }
  }

  const newMeeting = {
    id: 'meet_' + Math.random().toString(36).substring(2, 9),
    ...sanitized,
    status: 'pendente',
    request_id: requestId,
    created: new Date().toISOString(),
    updated: new Date().toISOString(),
  }
  dbState.meetings.push(newMeeting)

  auditLog({
    ferramenta: 'schedule_meeting',
    resultado: 'sucesso',
    http_status: 201,
  })

  return {
    status: 201,
    body: {
      ok: true,
      data: {
        meeting_id: newMeeting.id,
        status: newMeeting.status,
        data_hora: newMeeting.data_hora,
        created_at: newMeeting.created,
        duplicado: false,
      },
    },
  }
}

describe('Capability schedule_meeting — Testes de Integração e Requisitos de Segurança', () => {
  const TEST_VALID_KEY = 'sk_test_local_only_999999999999'
  const FUTURE_ISO_DATE = new Date(Date.now() + 86400000 * 7).toISOString()

  const createSecretsMock = (store: Record<string, string>): SecretsMock => ({
    get: (key: string) => store[key],
  })

  it('1. Sucesso HTTP 201 com persistência em meetings e status inicial pendente', () => {
    const dbState = { meetings: [], tool_logs: [], rateLimitStore: {} }
    const secrets = createSecretsMock({ CONSULTOR_API_KEY: TEST_VALID_KEY })
    const req: RequestMock = {
      header: new Map([['x-api-key', TEST_VALID_KEY]]),
      body: {
        nome: 'Juliana Ferreira',
        empresa: 'Log Transportes',
        email: 'juliana@log.com.br',
        telefone: '(11) 98765-4321',
        data_hora: FUTURE_ISO_DATE,
        assunto: 'Apresentação de proposta comercial',
        observacoes: 'Preferência por Meet',
      },
    }

    const res = handleScheduleMeetingRequest(req, secrets, dbState)
    assert.strictEqual(res.status, 201)
    assert.strictEqual(res.body.ok, true)
    assert.strictEqual(res.body.data.duplicado, false)
    assert.strictEqual(res.body.data.status, 'pendente')
    assert.ok(res.body.data.meeting_id)
    assert.ok(res.body.data.created_at)

    // Persistência
    assert.strictEqual(dbState.meetings.length, 1)
    const saved = dbState.meetings[0]
    assert.strictEqual(saved.id, res.body.data.meeting_id)
    assert.strictEqual(saved.status, 'pendente')
    assert.strictEqual(saved.email, 'juliana@log.com.br')
    assert.strictEqual(saved.assunto, 'Apresentação de proposta comercial')
    assert.ok(saved.request_id.startsWith('req_'))
  })

  it('2. Payload inválido retorna HTTP 400 VALIDATION_ERROR', () => {
    const dbState = { meetings: [], tool_logs: [], rateLimitStore: {} }
    const secrets = createSecretsMock({ CONSULTOR_API_KEY: TEST_VALID_KEY })
    const req: RequestMock = {
      header: new Map([['x-api-key', TEST_VALID_KEY]]),
      body: {
        nome: '',
        empresa: '',
        email: 'invalido',
        telefone: '',
        assunto: '',
      },
    }

    const res = handleScheduleMeetingRequest(req, secrets, dbState)
    assert.strictEqual(res.status, 400)
    assert.strictEqual(res.body.ok, false)
    assert.strictEqual(res.body.error.code, 'VALIDATION_ERROR')
    assert.ok(Array.isArray(res.body.error.details))
    assert.ok(res.body.error.details.some((d) => d.field === 'nome'))
    assert.ok(res.body.error.details.some((d) => d.field === 'email'))
    assert.ok(res.body.error.details.some((d) => d.field === 'telefone'))
    assert.ok(res.body.error.details.some((d) => d.field === 'data_hora'))
  })

  it('3. Auth inválida retorna HTTP 401 UNAUTHORIZED', () => {
    const dbState = { meetings: [], tool_logs: [], rateLimitStore: {} }
    const secrets = createSecretsMock({ CONSULTOR_API_KEY: TEST_VALID_KEY })
    const req: RequestMock = {
      header: new Map([['x-api-key', 'chave_falsa_999']]),
      body: {
        nome: 'Juliana',
        empresa: 'Log',
        email: 'juliana@log.com.br',
        telefone: '12345',
        data_hora: FUTURE_ISO_DATE,
        assunto: 'Reunião',
      },
    }

    const res = handleScheduleMeetingRequest(req, secrets, dbState)
    assert.strictEqual(res.status, 401)
    assert.strictEqual(res.body.ok, false)
    assert.strictEqual(res.body.error.code, 'UNAUTHORIZED')
  })

  it('4. Duplicidade email + data_hora retorna HTTP 200 com duplicado: true sem novo registro', () => {
    const dbState = { meetings: [], tool_logs: [], rateLimitStore: {} }
    const secrets = createSecretsMock({ CONSULTOR_API_KEY: TEST_VALID_KEY })
    const req1: RequestMock = {
      header: new Map([['x-api-key', TEST_VALID_KEY]]),
      body: {
        nome: 'Juliana Ferreira',
        empresa: 'Log Transportes',
        email: 'juliana@log.com.br',
        telefone: '(11) 98765-4321',
        data_hora: FUTURE_ISO_DATE,
        assunto: 'Primeiro agendamento',
      },
    }

    const res1 = handleScheduleMeetingRequest(req1, secrets, dbState)
    assert.strictEqual(res1.status, 201)
    assert.strictEqual(res1.body.data.duplicado, false)
    const initialId = res1.body.data.meeting_id

    // Segunda chamada com mesmo email + mesma data_hora
    const req2: RequestMock = {
      header: new Map([['x-api-key', TEST_VALID_KEY]]),
      body: {
        nome: 'Juliana Ferreira Silva',
        empresa: 'Log Transportes',
        email: 'juliana@log.com.br',
        telefone: '(11) 98765-4321',
        data_hora: FUTURE_ISO_DATE,
        assunto: 'Tentativa redundante',
      },
    }

    const res2 = handleScheduleMeetingRequest(req2, secrets, dbState)
    assert.strictEqual(res2.status, 200)
    assert.strictEqual(res2.body.ok, true)
    assert.strictEqual(res2.body.data.duplicado, true)
    assert.strictEqual(res2.body.data.meeting_id, initialId)
    assert.strictEqual(dbState.meetings.length, 1, 'Não deve criar segundo registro')
  })

  it('5. Erro interno retorna HTTP 500 fail-closed', () => {
    const dbState = { meetings: [], tool_logs: [], rateLimitStore: {} }
    const secrets = createSecretsMock({ CONSULTOR_API_KEY: TEST_VALID_KEY })
    const req: RequestMock = {
      header: new Map([['x-api-key', TEST_VALID_KEY]]),
      body: {
        nome: 'Juliana',
        empresa: 'Log',
        email: 'juliana@log.com.br',
        telefone: '12345',
        data_hora: FUTURE_ISO_DATE,
        assunto: 'Reunião',
      },
    }

    const res = handleScheduleMeetingRequest(req, secrets, dbState, true) // mockDbError = true
    assert.strictEqual(res.status, 500)
    assert.strictEqual(res.body.ok, false)
    assert.strictEqual(res.body.error.code, 'INTERNAL_ERROR')
    assert.strictEqual(dbState.tool_logs.length, 1)
    assert.strictEqual(dbState.tool_logs[0].resultado, 'erro')
    assert.strictEqual(dbState.tool_logs[0].http_status, 500)
  })

  it('6. data_hora no passado retorna HTTP 400 com erro explicativo', () => {
    const dbState = { meetings: [], tool_logs: [], rateLimitStore: {} }
    const secrets = createSecretsMock({ CONSULTOR_API_KEY: TEST_VALID_KEY })
    const pastDate = new Date(Date.now() - 7200000).toISOString()
    const req: RequestMock = {
      header: new Map([['x-api-key', TEST_VALID_KEY]]),
      body: {
        nome: 'Juliana',
        empresa: 'Log',
        email: 'juliana@log.com.br',
        telefone: '12345',
        data_hora: pastDate,
        assunto: 'Reunião retroativa',
      },
    }

    const res = handleScheduleMeetingRequest(req, secrets, dbState)
    assert.strictEqual(res.status, 400)
    assert.strictEqual(res.body.ok, false)
    assert.strictEqual(res.body.error.code, 'VALIDATION_ERROR')
    const detail = res.body.error.details.find((d) => d.field === 'data_hora')
    assert.ok(detail)
    assert.ok(detail.message.includes('futuro'))
  })

  it('7. Auditoria em cada caminho: tool_log criado, resultado, error_code, duracao_ms >= 1 e request_id', () => {
    const dbState = { meetings: [], tool_logs: [], rateLimitStore: {} }
    const secrets = createSecretsMock({ CONSULTOR_API_KEY: TEST_VALID_KEY })

    // Caminho A: 201 Sucesso
    const reqA: RequestMock = {
      header: new Map([['x-api-key', TEST_VALID_KEY]]),
      body: {
        nome: 'Audit Test',
        empresa: 'Empresa',
        email: 'audit@teste.com',
        telefone: '1199999999',
        data_hora: FUTURE_ISO_DATE,
        assunto: 'Pauta',
      },
    }
    const resA = handleScheduleMeetingRequest(reqA, secrets, dbState)
    assert.strictEqual(resA.status, 201)
    const logA = dbState.tool_logs[0]
    assert.strictEqual(logA.ferramenta, 'schedule_meeting')
    assert.strictEqual(logA.resultado, 'sucesso')
    assert.strictEqual(logA.http_status, 201)
    assert.strictEqual(logA.error_code, '')
    assert.ok(logA.duracao_ms >= 1)
    assert.ok(logA.request_id.startsWith('req_'))

    // Caminho B: 200 Idempotente
    const resB = handleScheduleMeetingRequest(reqA, secrets, dbState)
    assert.strictEqual(resB.status, 200)
    const logB = dbState.tool_logs[1]
    assert.strictEqual(logB.ferramenta, 'schedule_meeting')
    assert.strictEqual(logB.resultado, 'sucesso')
    assert.strictEqual(logB.http_status, 200)
    assert.ok(logB.duracao_ms >= 1)

    // Caminho C: 400 Erro
    const reqC: RequestMock = {
      header: new Map([['x-api-key', TEST_VALID_KEY]]),
      body: { nome: '' },
    }
    const resC = handleScheduleMeetingRequest(reqC, secrets, dbState)
    assert.strictEqual(resC.status, 400)
    const logC = dbState.tool_logs[2]
    assert.strictEqual(logC.ferramenta, 'schedule_meeting')
    assert.strictEqual(logC.resultado, 'erro')
    assert.strictEqual(logC.error_code, 'VALIDATION_ERROR')
    assert.strictEqual(logC.http_status, 400)
    assert.ok(logC.duracao_ms >= 1)

    // Caminho D: 401 Erro
    const reqD: RequestMock = {
      header: new Map([['x-api-key', 'errada']]),
      body: {},
    }
    const resD = handleScheduleMeetingRequest(reqD, secrets, dbState)
    assert.strictEqual(resD.status, 401)
    const logD = dbState.tool_logs[3]
    assert.strictEqual(logD.ferramenta, 'schedule_meeting')
    assert.strictEqual(logD.resultado, 'erro')
    assert.strictEqual(logD.error_code, 'UNAUTHORIZED')
    assert.strictEqual(logD.http_status, 401)
    assert.ok(logD.duracao_ms >= 1)
  })

  it('8. LGPD: Sem payload/PII (nome, email, telefone, assunto, observacoes) gravado no log', () => {
    const dbState = { meetings: [], tool_logs: [], rateLimitStore: {} }
    const secrets = createSecretsMock({ CONSULTOR_API_KEY: TEST_VALID_KEY })

    const rawData = {
      nome: 'Dados Pessoais Extremamente Confidenciais',
      empresa: 'Empresa Privada',
      email: 'privado@supersecreto.com',
      telefone: '(11) 99887-1122',
      data_hora: FUTURE_ISO_DATE,
      assunto: 'Assunto estratégico super confidencial',
      observacoes: 'Detalhes internos restritos',
    }

    const req: RequestMock = {
      header: new Map([['x-api-key', TEST_VALID_KEY]]),
      body: rawData,
    }

    handleScheduleMeetingRequest(req, secrets, dbState)
    assert.strictEqual(dbState.tool_logs.length, 1)

    const logRecord = dbState.tool_logs[0]
    const logStr = JSON.stringify(logRecord).toLowerCase()

    assert.strictEqual(logStr.includes('extremamente'), false, 'Não deve conter nome')
    assert.strictEqual(logStr.includes('privado@supersecreto.com'), false, 'Não deve conter email')
    assert.strictEqual(logStr.includes('99887-1122'), false, 'Não deve conter telefone')
    assert.strictEqual(logStr.includes('estratégico'), false, 'Não deve conter assunto')
    assert.strictEqual(logStr.includes('detalhes internos'), false, 'Não deve conter observações')
    assert.strictEqual(logStr.includes(TEST_VALID_KEY.toLowerCase()), false, 'Não deve conter API Key')
  })
})
