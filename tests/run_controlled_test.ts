import { test } from 'node:test'
import assert from 'node:assert'
import fs from 'node:fs'
import path from 'node:path'

const PB_BASE_URL = 'https://integracao-de-ferramentas-do-consultor-e38b8.shrd00.internal.goskip.dev'
const API_KEY = 'sk-live_consultor_digital_v1_d8a4f91e7b23c584a0d9e7123bc68e547190f23a54d68b9123e4c5f60718293a'
const EVIDENCE_FILE = path.resolve(process.cwd(), 'tests/controlled_test_evidence.json')

test('Execução do Teste Controlado 201 -> 200 em Produção (Skip Cloud)', async () => {
  console.log('=== INICIANDO TESTE CONTROLADO 201 -> 200 NA PRODUÇÃO DA SKIP CLOUD ===')
  console.log('Backend URL:', PB_BASE_URL)
  console.log('API Key prefix:', API_KEY.slice(0, 15) + '...')

  const evidence: {
    executedAt: string
    baseUrl: string
    apiKeyPrefix: string
    steps: Array<{
      step: number
      tool: string
      name: string
      url: string
      httpStatus: number
      expectedStatus: number
      responseBody: any
      requestId?: string
      recordId?: string
      duplicado?: boolean
    }>
    summary: string
  } = {
    executedAt: new Date().toISOString(),
    baseUrl: PB_BASE_URL,
    apiKeyPrefix: API_KEY.slice(0, 15) + '...',
    steps: [],
    summary: '',
  }

  const createLeadUrl = `${PB_BASE_URL}/api/backend/v1/tools/create_lead`
  const scheduleMeetingUrl = `${PB_BASE_URL}/api/backend/v1/tools/schedule_meeting`

  // 1. POST create_lead com dados de teste
  const leadPayload = {
    nome: 'Teste Controlado 201->200',
    empresa: 'Pessoa física',
    email: 'teste.controlado@exemplo.com',
    telefone: '(11) 97777-8888',
    necessidade_identificada: 'Teste controlado de validação de idempotência e rotação de chave',
    problema_relatado: 'Execução do ritual 201 -> 200 autorizado',
    estagio_do_lead: 'novo',
    proximo_passo: 'Agendar reunião de teste',
  }

  console.log('\n--- PASSO 1: POST create_lead (primeira criação) ---')
  const res1 = await fetch(createLeadUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-API-Key': API_KEY,
    },
    body: JSON.stringify(leadPayload),
  })

  const body1 = await res1.json()
  console.log('Passo 1 - Status:', res1.status)
  console.log('Passo 1 - Resposta:', JSON.stringify(body1))

  evidence.steps.push({
    step: 1,
    tool: 'create_lead',
    name: 'create_lead (novo)',
    url: createLeadUrl,
    httpStatus: res1.status,
    expectedStatus: 201,
    responseBody: body1,
    recordId: body1?.data?.lead_id,
    duplicado: body1?.data?.duplicado,
  })

  assert.strictEqual(res1.status, 201, `Passo 1 falhou com status ${res1.status}: ${JSON.stringify(body1)}`)
  assert.strictEqual(body1.ok, true)
  assert.strictEqual(body1.data.duplicado, false)
  const initialLeadId = body1.data.lead_id
  assert.ok(initialLeadId, 'lead_id deve existir')

  // 2. POST create_lead REPETIDO (mesmos email + empresa)
  console.log('\n--- PASSO 2: POST create_lead REPETIDO (idempotência) ---')
  const res2 = await fetch(createLeadUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-API-Key': API_KEY,
    },
    body: JSON.stringify(leadPayload),
  })

  const body2 = await res2.json()
  console.log('Passo 2 - Status:', res2.status)
  console.log('Passo 2 - Resposta:', JSON.stringify(body2))

  evidence.steps.push({
    step: 2,
    tool: 'create_lead',
    name: 'create_lead (duplicado/idempotência)',
    url: createLeadUrl,
    httpStatus: res2.status,
    expectedStatus: 200,
    responseBody: body2,
    recordId: body2?.data?.lead_id,
    duplicado: body2?.data?.duplicado,
  })

  assert.strictEqual(res2.status, 200, `Passo 2 falhou com status ${res2.status}: ${JSON.stringify(body2)}`)
  assert.strictEqual(body2.ok, true)
  assert.strictEqual(body2.data.duplicado, true)
  assert.strictEqual(body2.data.lead_id, initialLeadId, 'lead_id deve ser idêntico ao criado no Passo 1')

  // 3. POST schedule_meeting com dados de teste (data futura distinta dos meetings legítimos)
  // Legítimos: 2026-09-30 18:00:00 e 2026-10-01 18:00:00
  // Escolhemos: 2026-11-25T15:00:00-03:00
  const meetingPayload = {
    nome: 'Teste Controlado 201->200',
    empresa: 'Pessoa física',
    email: 'teste.controlado@exemplo.com',
    telefone: '(11) 97777-8888',
    data_hora: '2026-11-25T15:00:00-03:00',
    assunto: 'Reunião de alinhamento do teste controlado V2',
    observacoes: 'Teste controlado do endpoint schedule_meeting com nova API key',
  }

  console.log('\n--- PASSO 3: POST schedule_meeting (primeira criação) ---')
  const res3 = await fetch(scheduleMeetingUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-API-Key': API_KEY,
    },
    body: JSON.stringify(meetingPayload),
  })

  const body3 = await res3.json()
  console.log('Passo 3 - Status:', res3.status)
  console.log('Passo 3 - Resposta:', JSON.stringify(body3))

  evidence.steps.push({
    step: 3,
    tool: 'schedule_meeting',
    name: 'schedule_meeting (novo)',
    url: scheduleMeetingUrl,
    httpStatus: res3.status,
    expectedStatus: 201,
    responseBody: body3,
    recordId: body3?.data?.meeting_id,
    duplicado: body3?.data?.duplicado,
  })

  assert.strictEqual(res3.status, 201, `Passo 3 falhou com status ${res3.status}: ${JSON.stringify(body3)}`)
  assert.strictEqual(body3.ok, true)
  assert.strictEqual(body3.data.duplicado, false)
  assert.strictEqual(body3.data.status, 'pendente')
  const initialMeetingId = body3.data.meeting_id
  assert.ok(initialMeetingId, 'meeting_id deve existir')

  // 4. POST schedule_meeting REPETIDO (mesmos email + data_hora)
  console.log('\n--- PASSO 4: POST schedule_meeting REPETIDO (idempotência + UNIQUE) ---')
  const res4 = await fetch(scheduleMeetingUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-API-Key': API_KEY,
    },
    body: JSON.stringify(meetingPayload),
  })

  const body4 = await res4.json()
  console.log('Passo 4 - Status:', res4.status)
  console.log('Passo 4 - Resposta:', JSON.stringify(body4))

  evidence.steps.push({
    step: 4,
    tool: 'schedule_meeting',
    name: 'schedule_meeting (duplicado/idempotência)',
    url: scheduleMeetingUrl,
    httpStatus: res4.status,
    expectedStatus: 200,
    responseBody: body4,
    recordId: body4?.data?.meeting_id,
    duplicado: body4?.data?.duplicado,
  })

  assert.strictEqual(res4.status, 200, `Passo 4 falhou com status ${res4.status}: ${JSON.stringify(body4)}`)
  assert.strictEqual(body4.ok, true)
  assert.strictEqual(body4.data.duplicado, true)
  assert.strictEqual(body4.data.meeting_id, initialMeetingId, 'meeting_id deve ser idêntico ao criado no Passo 3')

  evidence.summary = 'TODOS OS 4 PASSOS EXECUTADOS COM SUCESSO: 201 -> 200 para create_lead e 201 -> 200 para schedule_meeting. Nova chave validou perfeitamente e proteções de idempotência e UNIQUE atuaram com sucesso.'
  fs.writeFileSync(EVIDENCE_FILE, JSON.stringify(evidence, null, 2), 'utf-8')
  console.log('\n=== TESTE CONTROLADO 201 -> 200 FINALIZADO COM ÊXITO ===')
})
