import { describe, it } from 'node:test'
import assert from 'node:assert'

// Extraímos ou definimos o serviço de domínio exatamente como em pocketbase/hooks/create_lead_tool.js
// para garantir que a capability e o domínio funcionem desacoplados de HTTP e PocketBase.
const ALLOWED_ESTAGIOS = ['novo', 'qualificado', 'proposta', 'descartado']

export const createLeadDomainService = {
  ALLOWED_ESTAGIOS,

  validateAndSanitize: (input: any) => {
    const issues: Array<{ field: string; message: string }> = []
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

  execute: (sanitizedData: any, repository: any, reqId: string) => {
    // 1. Idempotência: verificar existência prévia por email + empresa
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

export const createLeadToolCapability = {
  nome: 'create_lead',
  descricao: 'Registra ou atualiza um lead comercial qualificado pelo Consultor Digital',
  escopo: 'leads:write',
  validate: (input: any) => createLeadDomainService.validateAndSanitize(input),
  run: (sanitizedData: any, context: { repository: any; requestId?: string }) => {
    const rId = (context && context.requestId) || 'test_req_id'
    return createLeadDomainService.execute(sanitizedData, context.repository, rId)
  },
}

export const scheduleMeetingDomainService = {
  validateAndSanitize: (input: any) => {
    const issues: Array<{ field: string; message: string }> = []
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

    // data_hora (string ISO com timezone, futura)
    let parsedDate: Date | null = null
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
          message:
            "A 'data_hora' informada deve ser uma data e horário futuro para agendamento.",
        })
      } else {
        parsedDate = new Date(timestamp)
      }
    }

    // assunto (string, obrigatório, máx 500)
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

    return {
      valid: true,
      sanitized: {
        nome: String(data.nome || '').trim(),
        empresa: String(data.empresa || '').trim(),
        email: String(data.email || '').toLowerCase().trim(),
        telefone: String(data.telefone || '').trim(),
        data_hora: parsedDate!.toISOString(),
        assunto: String(data.assunto || '').trim(),
        observacoes: data.observacoes ? String(data.observacoes).trim() : '',
      },
    }
  },

  execute: (sanitizedData: any, repository: any, reqId: string) => {
    // 1. Idempotência: verificar por email + data_hora
    const existing = repository.findMeetingByEmailDataHora(
      sanitizedData.email,
      sanitizedData.data_hora,
    )

    if (existing) {
      return {
        status: 200,
        duplicado: true,
        meeting_id: existing.id,
        meeting_status: existing.status,
        data_hora: existing.data_hora,
        created_at: existing.created,
      }
    }

    // 2. Novo agendamento
    const createdRecord = repository.insertMeeting(sanitizedData, reqId)
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

export const scheduleMeetingToolCapability = {
  nome: 'schedule_meeting',
  descricao: 'Registra uma solicitação interna de reunião com o consultor com status inicial pendente',
  escopo: 'meetings:write',
  validate: (input: any) => scheduleMeetingDomainService.validateAndSanitize(input),
  run: (sanitizedData: any, context: { repository: any; requestId?: string }) => {
    const rId = (context && context.requestId) || 'test_req_id'
    return scheduleMeetingDomainService.execute(sanitizedData, context.repository, rId)
  },
}

describe('Capability create_lead - Testes Diretos de Domínio (Sem HTTP)', () => {
  it('1. Deve validar e higienizar entrada com sucesso e aplicar defaults (estagio=novo)', () => {
    const input = {
      nome: '  João Silva  ',
      empresa: '  Tech Inovação  ',
      email: '  JOAO@tech.com.br  ',
    }

    const valResult = createLeadToolCapability.validate(input)
    assert.strictEqual(valResult.valid, true)
    assert.ok(valResult.sanitized)
    assert.strictEqual(valResult.sanitized.nome, 'João Silva')
    assert.strictEqual(valResult.sanitized.empresa, 'Tech Inovação')
    assert.strictEqual(valResult.sanitized.email, 'joao@tech.com.br')
    assert.strictEqual(valResult.sanitized.estagio_do_lead, 'novo')
  })

  it('2. Deve rejeitar estágio fora do enum fechado (novo, qualificado, proposta, descartado)', () => {
    const input = {
      nome: 'Ana',
      empresa: 'Studio Ana',
      email: 'ana@studio.com',
      estagio_do_lead: 'invalido_status',
    }

    const valResult = createLeadToolCapability.validate(input)
    assert.strictEqual(valResult.valid, false)
    const issue = valResult.issues.find((i: any) => i.field === 'estagio_do_lead')
    assert.ok(issue, 'Deveria reportar erro no campo estagio_do_lead')
  })

  it('3. Deve aceitar todos os 4 estágios do enum fechado', () => {
    for (const estagio of ['novo', 'qualificado', 'proposta', 'descartado']) {
      const input = {
        nome: 'Lead ' + estagio,
        empresa: 'Empresa ' + estagio,
        email: `lead_${estagio}@empresa.com`,
        estagio_do_lead: estagio,
      }
      const valResult = createLeadToolCapability.validate(input)
      assert.strictEqual(valResult.valid, true)
      assert.strictEqual(valResult.sanitized.estagio_do_lead, estagio)
    }
  })

  it('4. Deve validar campos obrigatórios ausentes (nome, empresa, email inválido)', () => {
    const invalidInputs = [
      { empresa: 'Empresa', email: 'test@email.com' }, // sem nome
      { nome: 'Nome', email: 'test@email.com' }, // sem empresa
      { nome: 'Nome', empresa: 'Empresa' }, // sem email
      { nome: 'Nome', empresa: 'Empresa', email: 'email_invalido_sem_arroba' }, // email inválido
    ]

    for (const item of invalidInputs) {
      const res = createLeadToolCapability.validate(item)
      assert.strictEqual(res.valid, false)
      assert.ok(res.issues.length > 0)
    }
  })

  it('5. run(data, {repository}): deve criar lead quando não houver registro prévio (status 201, duplicado: false)', () => {
    const inMemoryDb: any[] = []
    const mockRepo = {
      findLeadByEmailEmpresa: (email: string, empresa: string) => {
        return (
          inMemoryDb.find(
            (r) =>
              r.email.toLowerCase() === email.toLowerCase() &&
              r.empresa.toLowerCase() === empresa.toLowerCase(),
          ) || null
        )
      },
      insertLead: (leadData: any, reqId: string) => {
        const newRecord = {
          id: 'lead_' + Math.random().toString(36).substring(2, 9),
          ...leadData,
          request_id: reqId,
          created: new Date().toISOString(),
        }
        inMemoryDb.push(newRecord)
        return newRecord
      },
    }

    const inputData = {
      nome: 'Mariana Lima',
      empresa: 'Delta Consultoria',
      email: 'mariana@delta.com.br',
      estagio_do_lead: 'qualificado',
      telefone: '(11) 98765-4321',
    }

    const val = createLeadToolCapability.validate(inputData)
    assert.strictEqual(val.valid, true)

    const result = createLeadToolCapability.run(val.sanitized, {
      repository: mockRepo,
      requestId: 'req_test_001',
    })

    assert.strictEqual(result.status, 201)
    assert.strictEqual(result.duplicado, false)
    assert.ok(result.lead_id)
    assert.strictEqual(result.estagio_do_lead, 'qualificado')
    assert.strictEqual(inMemoryDb.length, 1)
    assert.strictEqual(inMemoryDb[0].id, result.lead_id)
    assert.strictEqual(inMemoryDb[0].request_id, 'req_test_001')
  })

  it('6. run(data, {repository}): deve aplicar idempotência para mesmo email+empresa (status 200, duplicado: true, sem nova linha)', () => {
    const existingDate = '2026-09-22T08:00:00.000Z'
    const inMemoryDb: any[] = [
      {
        id: 'existing_lead_123',
        nome: 'Mariana Lima Antigo',
        empresa: 'Delta Consultoria',
        email: 'mariana@delta.com.br',
        estagio_do_lead: 'proposta',
        created: existingDate,
      },
    ]

    const mockRepo = {
      findLeadByEmailEmpresa: (email: string, empresa: string) => {
        return (
          inMemoryDb.find(
            (r) =>
              r.email.toLowerCase() === email.toLowerCase() &&
              r.empresa.toLowerCase() === empresa.toLowerCase(),
          ) || null
        )
      },
      insertLead: (leadData: any, reqId: string) => {
        const newRecord = {
          id: 'lead_should_not_be_created',
          ...leadData,
          request_id: reqId,
          created: new Date().toISOString(),
        }
        inMemoryDb.push(newRecord)
        return newRecord
      },
    }

    const duplicateInput = {
      nome: 'Mariana Lima Nova Tentativa',
      empresa: 'Delta Consultoria',
      email: 'mariana@delta.com.br',
      estagio_do_lead: 'descartado',
    }

    const val = createLeadToolCapability.validate(duplicateInput)
    assert.strictEqual(val.valid, true)

    const result = createLeadToolCapability.run(val.sanitized, {
      repository: mockRepo,
      requestId: 'req_test_002',
    })

    assert.strictEqual(result.status, 200)
    assert.strictEqual(result.duplicado, true)
    assert.strictEqual(result.lead_id, 'existing_lead_123')
    assert.strictEqual(result.estagio_do_lead, 'proposta') // Mantém o estágio existente
    assert.strictEqual(result.created_at, existingDate)
    assert.strictEqual(
      inMemoryDb.length,
      1,
      'Não deve criar uma segunda linha para mesma chave email+empresa',
    )
  })
})

describe('Capability schedule_meeting - Testes Diretos de Domínio (Sem HTTP)', () => {
  const FUTURE_ISO_DATE = new Date(Date.now() + 86400000 * 5).toISOString() // 5 dias no futuro

  it('1. Deve validar e higienizar entrada com sucesso para reunião futura', () => {
    const input = {
      nome: '  Carlos Drummond  ',
      empresa: '  Editora Moderna  ',
      email: '  CARLOS@editora.com  ',
      telefone: '  (21) 98765-4321  ',
      data_hora: FUTURE_ISO_DATE,
      assunto: '  Alinhamento de automação de pedidos  ',
      observacoes: '  Preferência por chamada de vídeo  ',
    }

    const valResult = scheduleMeetingToolCapability.validate(input)
    assert.strictEqual(valResult.valid, true)
    assert.strictEqual(valResult.sanitized.nome, 'Carlos Drummond')
    assert.strictEqual(valResult.sanitized.empresa, 'Editora Moderna')
    assert.strictEqual(valResult.sanitized.email, 'carlos@editora.com')
    assert.strictEqual(valResult.sanitized.telefone, '(21) 98765-4321')
    assert.strictEqual(valResult.sanitized.assunto, 'Alinhamento de automação de pedidos')
    assert.strictEqual(valResult.sanitized.observacoes, 'Preferência por chamada de vídeo')
  })

  it('2. Deve rejeitar data_hora no passado com erro explicativo', () => {
    const pastDate = new Date(Date.now() - 3600000).toISOString()
    const input = {
      nome: 'Carlos',
      empresa: 'Editora',
      email: 'carlos@editora.com',
      telefone: '12345678',
      data_hora: pastDate,
      assunto: 'Reunião retroativa',
    }

    const valResult = scheduleMeetingToolCapability.validate(input)
    assert.strictEqual(valResult.valid, false)
    const issue = valResult.issues.find((i: any) => i.field === 'data_hora')
    assert.ok(issue)
    assert.ok(issue.message.includes('futuro'))
  })

  it('3. Deve rejeitar data_hora sem indicação explícita de timezone', () => {
    const dateWithoutTz = '2026-12-01T15:00:00'
    const input = {
      nome: 'Carlos',
      empresa: 'Editora',
      email: 'carlos@editora.com',
      telefone: '12345678',
      data_hora: dateWithoutTz,
      assunto: 'Reunião sem timezone',
    }

    const valResult = scheduleMeetingToolCapability.validate(input)
    assert.strictEqual(valResult.valid, false)
    const issue = valResult.issues.find((i: any) => i.field === 'data_hora')
    assert.ok(issue)
    assert.ok(issue.message.includes('fuso horário'))
  })

  it('4. Deve validar campos obrigatórios (nome, empresa, email, telefone, data_hora, assunto)', () => {
    const requiredCheck = scheduleMeetingToolCapability.validate({})
    assert.strictEqual(requiredCheck.valid, false)
    const fields = requiredCheck.issues.map((i: any) => i.field)
    assert.ok(fields.includes('nome'))
    assert.ok(fields.includes('empresa'))
    assert.ok(fields.includes('email'))
    assert.ok(fields.includes('telefone'))
    assert.ok(fields.includes('data_hora'))
    assert.ok(fields.includes('assunto'))
  })

  it('5. run(data, {repository}): deve criar solicitação com status inicial pendente (HTTP 201, duplicado: false)', () => {
    const inMemoryMeetings: any[] = []
    const mockRepo = {
      findMeetingByEmailDataHora: (email: string, dataHora: string) => {
        return (
          inMemoryMeetings.find(
            (m) =>
              m.email.toLowerCase() === email.toLowerCase() &&
              m.data_hora === dataHora,
          ) || null
        )
      },
      insertMeeting: (data: any, reqId: string) => {
        const record = {
          id: 'meet_' + Math.random().toString(36).substring(2, 9),
          ...data,
          status: 'pendente',
          request_id: reqId,
          created: new Date().toISOString(),
        }
        inMemoryMeetings.push(record)
        return record
      },
    }

    const inputData = {
      nome: 'Beatriz Silva',
      empresa: 'Consultoria Financeira',
      email: 'beatriz@financeira.com',
      telefone: '(11) 97777-6666',
      data_hora: FUTURE_ISO_DATE,
      assunto: 'Diagnóstico de fluxos operacionais',
    }

    const val = scheduleMeetingToolCapability.validate(inputData)
    assert.strictEqual(val.valid, true)

    const result = scheduleMeetingToolCapability.run(val.sanitized, {
      repository: mockRepo,
      requestId: 'req_meet_001',
    })

    assert.strictEqual(result.status, 201)
    assert.strictEqual(result.duplicado, false)
    assert.strictEqual(result.meeting_status, 'pendente')
    assert.ok(result.meeting_id)
    assert.strictEqual(inMemoryMeetings.length, 1)
    assert.strictEqual(inMemoryMeetings[0].id, result.meeting_id)
    assert.strictEqual(inMemoryMeetings[0].status, 'pendente')
  })

  it('6. Idempotência: mesmo email + mesma data_hora retorna 200 com duplicado: true', () => {
    const existingCreated = '2026-09-26T12:00:00.000Z'
    const inMemoryMeetings: any[] = [
      {
        id: 'meet_existing_123',
        nome: 'Beatriz Silva',
        empresa: 'Consultoria Financeira',
        email: 'beatriz@financeira.com',
        telefone: '(11) 97777-6666',
        data_hora: FUTURE_ISO_DATE,
        assunto: 'Diagnóstico anterior',
        status: 'pendente',
        created: existingCreated,
      },
    ]

    const mockRepo = {
      findMeetingByEmailDataHora: (email: string, dataHora: string) => {
        return (
          inMemoryMeetings.find(
            (m) =>
              m.email.toLowerCase() === email.toLowerCase() &&
              m.data_hora === dataHora,
          ) || null
        )
      },
      insertMeeting: (data: any, reqId: string) => {
        const record = {
          id: 'meet_should_not_create',
          ...data,
          status: 'pendente',
          request_id: reqId,
          created: new Date().toISOString(),
        }
        inMemoryMeetings.push(record)
        return record
      },
    }

    const inputData = {
      nome: 'Beatriz Silva Nova Tentativa',
      empresa: 'Consultoria Financeira',
      email: 'beatriz@financeira.com',
      telefone: '(11) 97777-6666',
      data_hora: FUTURE_ISO_DATE,
      assunto: 'Tentativa duplicada no mesmo horário',
    }

    const val = scheduleMeetingToolCapability.validate(inputData)
    assert.strictEqual(val.valid, true)

    const result = scheduleMeetingToolCapability.run(val.sanitized, {
      repository: mockRepo,
      requestId: 'req_meet_002',
    })

    assert.strictEqual(result.status, 200)
    assert.strictEqual(result.duplicado, true)
    assert.strictEqual(result.meeting_id, 'meet_existing_123')
    assert.strictEqual(inMemoryMeetings.length, 1, 'Não deve criar segundo registro para mesmo email+data_hora')
  })

  it('7. Mesma pessoa com data_hora DIFERENTE gera nova solicitação (status 201)', () => {
    const inMemoryMeetings: any[] = [
      {
        id: 'meet_existing_123',
        nome: 'Beatriz Silva',
        empresa: 'Consultoria Financeira',
        email: 'beatriz@financeira.com',
        telefone: '(11) 97777-6666',
        data_hora: FUTURE_ISO_DATE,
        assunto: 'Diagnóstico anterior',
        status: 'pendente',
        created: '2026-09-26T12:00:00.000Z',
      },
    ]

    const mockRepo = {
      findMeetingByEmailDataHora: (email: string, dataHora: string) => {
        return (
          inMemoryMeetings.find(
            (m) =>
              m.email.toLowerCase() === email.toLowerCase() &&
              m.data_hora === dataHora,
          ) || null
        )
      },
      insertMeeting: (data: any, reqId: string) => {
        const record = {
          id: 'meet_new_456',
          ...data,
          status: 'pendente',
          request_id: reqId,
          created: new Date().toISOString(),
        }
        inMemoryMeetings.push(record)
        return record
      },
    }

    const differentFutureDate = new Date(Date.now() + 86400000 * 10).toISOString()
    const inputData = {
      nome: 'Beatriz Silva',
      empresa: 'Consultoria Financeira',
      email: 'beatriz@financeira.com',
      telefone: '(11) 97777-6666',
      data_hora: differentFutureDate,
      assunto: 'Segunda reunião de acompanhamento',
    }

    const val = scheduleMeetingToolCapability.validate(inputData)
    assert.strictEqual(val.valid, true)

    const result = scheduleMeetingToolCapability.run(val.sanitized, {
      repository: mockRepo,
      requestId: 'req_meet_003',
    })

    assert.strictEqual(result.status, 201)
    assert.strictEqual(result.duplicado, false)
    assert.strictEqual(result.meeting_id, 'meet_new_456')
    assert.strictEqual(inMemoryMeetings.length, 2, 'Deve permitir múltiplos agendamentos em horários distintos')
  })
})
