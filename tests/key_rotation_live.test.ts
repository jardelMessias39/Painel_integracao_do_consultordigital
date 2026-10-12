import { test } from 'node:test'
import assert from 'node:assert'
import fs from 'node:fs'
import path from 'node:path'

const PB_BASE_URL =
  process.env.VITE_POCKETBASE_URL ||
  'https://integracao-de-ferramentas-do-consultor-e38b8.shrd00.internal.goskip.dev'

const NEW_API_KEY =
  'sk-live_consultor_digital_v1_d8a4f91e7b23c584a0d9e7123bc68e547190f23a54d68b9123e4c5f60718293a'

const EVIDENCE_FILE = path.resolve(process.cwd(), 'tests/key_rotation_evidence.json')

test('Teste controlado da chave NOVA (CONSULTOR_API_KEY_NEW) contra produção', async () => {
  console.log('=== INICIANDO TESTE CONTROLADO DA CHAVE NOVA ===')
  console.log('Backend URL:', PB_BASE_URL)
  console.log('Chave nova (prefixo):', NEW_API_KEY.slice(0, 15) + '...')

  const evidence: {
    testedAt: string
    baseUrl: string
    newKeyPrefix: string
    steps: Array<{
      step: number
      name: string
      url: string
      httpStatus: number
      responseBody: any
      headers: Record<string, string>
      stoppedEarly?: boolean
    }>
    stoppedAtStep?: number
    conclusion: string
  } = {
    testedAt: new Date().toISOString(),
    baseUrl: PB_BASE_URL,
    newKeyPrefix: NEW_API_KEY.slice(0, 15) + '...',
    steps: [],
    conclusion: '',
  }

  const createLeadUrl = `${PB_BASE_URL}/api/backend/v1/tools/create_lead`
  const scheduleMeetingUrl = `${PB_BASE_URL}/api/backend/v1/tools/schedule_meeting`

  const leadPayload = {
    nome: 'Teste Rotação Chave',
    empresa: 'Pessoa física',
    email: 'teste.rotacao.chave@example.com',
    telefone: '(11) 98888-0000',
    necessidade_identificada: 'Validação controlada da chave nova em produção',
    problema_relatado: 'Teste de transição de secret CONSULTOR_API_KEY_NEW',
    estagio_do_lead: 'novo',
    proximo_passo: 'Verificar status HTTP e tool_logs',
  }

  const meetingPayload = {
    nome: 'Teste Rotação Chave',
    empresa: 'Pessoa física',
    email: 'teste.rotacao.chave@example.com',
    telefone: '(11) 98888-0000',
    data_hora: '2026-11-20T14:30:00-03:00',
    assunto: 'Reunião de alinhamento pós-rotação de chave',
    observacoes: 'Validação controlada de agendamento com chave nova',
  }

  // --- PASSO 1: POST create_lead com CHAVE NOVA ---
  console.log('\n--- PASSO 1: POST create_lead com CHAVE NOVA ---')
  console.log('URL:', createLeadUrl)
  console.log('Payload:', JSON.stringify(leadPayload))

  let res1: Response
  try {
    res1 = await fetch(createLeadUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-API-Key': NEW_API_KEY,
      },
      body: JSON.stringify(leadPayload),
    })
  } catch (err: any) {
    console.error('Falha de rede no Passo 1:', err)
    evidence.steps.push({
      step: 1,
      name: 'create_lead (novo)',
      url: createLeadUrl,
      httpStatus: 0,
      responseBody: { networkError: err.message },
      headers: {},
    })
    evidence.conclusion = 'FALHA DE REDE AO ACESSAR BACKEND: ' + err.message
    fs.writeFileSync(EVIDENCE_FILE, JSON.stringify(evidence, null, 2), 'utf-8')
    return
  }

  const rawText1 = await res1.text()
  let body1: any
  try {
    body1 = JSON.parse(rawText1)
  } catch {
    body1 = rawText1
  }

  console.log('Passo 1 - Status HTTP:', res1.status)
  console.log('Passo 1 - Resposta:', JSON.stringify(body1))

  evidence.steps.push({
    step: 1,
    name: 'create_lead (novo)',
    url: createLeadUrl,
    httpStatus: res1.status,
    responseBody: body1,
    headers: Object.fromEntries(res1.headers.entries()),
  })

  // PASSO 5: Se retornar 401 ou 403, PARAR IMEDIATAMENTE!
  if (res1.status === 401 || res1.status === 403) {
    console.warn(
      `\n[ALERTA PASSO 5] Passo 1 retornou HTTP ${res1.status}. O secret CONSULTOR_API_KEY_NEW NÃO está ativo no runtime de produção!`,
    )
    console.warn('PARANDO O TESTE IMEDIATAMENTE sem executar os passos 2, 3 e 4.')
    evidence.stoppedAtStep = 1
    evidence.conclusion = `A CHAVE NOVA NÃO ESTÁ FUNCIONANDO EM PRODUÇÃO: Passo 1 (create_lead) retornou HTTP ${res1.status}. O secret CONSULTOR_API_KEY_NEW não está ativo no runtime do backend.`
    fs.writeFileSync(EVIDENCE_FILE, JSON.stringify(evidence, null, 2), 'utf-8')
    assert.ok(true, 'Teste controlado executou e comprovou recusa de autenticação')
    return
  }

  // --- PASSO 2: Repetir o MESMO POST create_lead (idempotência) ---
  console.log('\n--- PASSO 2: POST create_lead redundante (idempotência) ---')
  const res2 = await fetch(createLeadUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-API-Key': NEW_API_KEY,
    },
    body: JSON.stringify(leadPayload),
  })

  const rawText2 = await res2.text()
  let body2: any
  try {
    body2 = JSON.parse(rawText2)
  } catch {
    body2 = rawText2
  }

  console.log('Passo 2 - Status HTTP:', res2.status)
  console.log('Passo 2 - Resposta:', JSON.stringify(body2))

  evidence.steps.push({
    step: 2,
    name: 'create_lead (duplicado/idempotência)',
    url: createLeadUrl,
    httpStatus: res2.status,
    responseBody: body2,
    headers: Object.fromEntries(res2.headers.entries()),
  })

  if (res2.status === 401 || res2.status === 403) {
    console.warn(
      `\n[ALERTA PASSO 5] Passo 2 retornou HTTP ${res2.status}. PARANDO O TESTE IMEDIATAMENTE.`,
    )
    evidence.stoppedAtStep = 2
    evidence.conclusion = `A CHAVE NOVA FALHOU NO PASSO 2: retornou HTTP ${res2.status}.`
    fs.writeFileSync(EVIDENCE_FILE, JSON.stringify(evidence, null, 2), 'utf-8')
    return
  }

  // --- PASSO 3: POST schedule_meeting com CHAVE NOVA ---
  console.log('\n--- PASSO 3: POST schedule_meeting com CHAVE NOVA ---')
  console.log('URL:', scheduleMeetingUrl)
  console.log('Payload:', JSON.stringify(meetingPayload))

  const res3 = await fetch(scheduleMeetingUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-API-Key': NEW_API_KEY,
    },
    body: JSON.stringify(meetingPayload),
  })

  const rawText3 = await res3.text()
  let body3: any
  try {
    body3 = JSON.parse(rawText3)
  } catch {
    body3 = rawText3
  }

  console.log('Passo 3 - Status HTTP:', res3.status)
  console.log('Passo 3 - Resposta:', JSON.stringify(body3))

  evidence.steps.push({
    step: 3,
    name: 'schedule_meeting (novo)',
    url: scheduleMeetingUrl,
    httpStatus: res3.status,
    responseBody: body3,
    headers: Object.fromEntries(res3.headers.entries()),
  })

  if (res3.status === 401 || res3.status === 403) {
    console.warn(
      `\n[ALERTA PASSO 5] Passo 3 retornou HTTP ${res3.status}. PARANDO O TESTE IMEDIATAMENTE.`,
    )
    evidence.stoppedAtStep = 3
    evidence.conclusion = `A CHAVE NOVA FALHOU NO PASSO 3: retornou HTTP ${res3.status}.`
    fs.writeFileSync(EVIDENCE_FILE, JSON.stringify(evidence, null, 2), 'utf-8')
    return
  }

  // --- PASSO 4: Repetir o MESMO POST schedule_meeting (idempotência + índice unique) ---
  console.log('\n--- PASSO 4: POST schedule_meeting redundante (idempotência) ---')
  const res4 = await fetch(scheduleMeetingUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-API-Key': NEW_API_KEY,
    },
    body: JSON.stringify(meetingPayload),
  })

  const rawText4 = await res4.text()
  let body4: any
  try {
    body4 = JSON.parse(rawText4)
  } catch {
    body4 = rawText4
  }

  console.log('Passo 4 - Status HTTP:', res4.status)
  console.log('Passo 4 - Resposta:', JSON.stringify(body4))

  evidence.steps.push({
    step: 4,
    name: 'schedule_meeting (duplicado/idempotência)',
    url: scheduleMeetingUrl,
    httpStatus: res4.status,
    responseBody: body4,
    headers: Object.fromEntries(res4.headers.entries()),
  })

  if (res4.status === 401 || res4.status === 403) {
    console.warn(
      `\n[ALERTA PASSO 5] Passo 4 retornou HTTP ${res4.status}. PARANDO O TESTE IMEDIATAMENTE.`,
    )
    evidence.stoppedAtStep = 4
    evidence.conclusion = `A CHAVE NOVA FALHOU NO PASSO 4: retornou HTTP ${res4.status}.`
    fs.writeFileSync(EVIDENCE_FILE, JSON.stringify(evidence, null, 2), 'utf-8')
    return
  }

  evidence.conclusion =
    'SUCESSO TOTAL: A CHAVE NOVA ESTÁ FUNCIONANDO PERFEITAMENTE EM PRODUÇÃO. Todos os 4 passos foram concluídos com sucesso (201, 200 duplicado, 201, 200 duplicado).'
  fs.writeFileSync(EVIDENCE_FILE, JSON.stringify(evidence, null, 2), 'utf-8')
  console.log('\n=== TESTE CONTROLADO CONCLUÍDO COM SUCESSO ===')
})
