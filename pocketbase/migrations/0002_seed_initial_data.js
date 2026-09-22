migrate(
  (app) => {
    // 1. Seed do usuário admin: jardel.messias.dev@gmail.com / Skip@Pass
    const users = app.findCollectionByNameOrId('_pb_users_auth_')
    let adminCreated = false
    try {
      app.findAuthRecordByEmail('_pb_users_auth_', 'jardel.messias.dev@gmail.com')
    } catch (_) {
      const adminRecord = new Record(users)
      adminRecord.setEmail('jardel.messias.dev@gmail.com')
      adminRecord.setPassword('Skip@Pass')
      adminRecord.setVerified(true)
      adminRecord.set('name', 'Jardel Messias')
      app.save(adminRecord)
      adminCreated = true
    }

    // 2. Seed de leads demonstrativos com estágios variados
    const leadsCol = app.findCollectionByNameOrId('leads')
    const sampleLeads = [
      {
        nome: 'Carlos Eduardo Silva',
        empresa: 'LogiTech Transportes',
        email: 'carlos.silva@logitech.com.br',
        telefone: '(11) 98765-4321',
        necessidade_identificada:
          'Automação no atendimento de motoristas parceiros e rastreamento ativo',
        problema_relatado:
          'Tempo médio de espera no WhatsApp ultrapassa 45 minutos em horários de pico',
        requisitos:
          'Integração com TMS interno via Webhooks, SLA de resposta menor que 10 segundos',
        solucao_sugerida:
          'Consultor Digital com triagem contextual e webhook para criação de tickets',
        resumo_conversa:
          'Conversa iniciada às 14:10. Cliente relatou gargalo operacional com equipe de 8 atendentes sobrecarregada.',
        estagio_do_lead: 'proposta',
        proximo_passo: 'Enviar proposta comercial até sexta-feira com piloto de 14 dias',
        request_id: 'req_seed_001_demo',
      },
      {
        nome: 'Mariana Albuquerque',
        empresa: 'Clínica Saúde Plena',
        email: 'mariana@saudeplena.med.br',
        telefone: '(21) 99123-8877',
        necessidade_identificada: 'Agendamento e reagendamento inteligente de consultas',
        problema_relatado: 'No-show de pacientes chega a 28% das consultas agendadas',
        requisitos:
          'Confirmação automática de presença 24h antes e encaixes rápidos na fila de espera',
        solucao_sugerida:
          'Fluxo conversacional do Consultor com lembrete interativo e link de confirmação',
        resumo_conversa:
          'Doutora Mariana buscou o chatbot no site e testou o fluxo de agendamento interativo.',
        estagio_do_lead: 'qualificado',
        proximo_passo: 'Agendar call de demonstração técnica com a coordenadora de recepção',
        request_id: 'req_seed_002_demo',
      },
      {
        nome: 'Roberto Fonseca',
        empresa: 'Varejo Express E-commerce',
        email: 'roberto.fonseca@varejoexpress.com.br',
        telefone: '(31) 97654-1122',
        necessidade_identificada: 'Recuperação de carrinho abandonado e status de pedidos',
        problema_relatado: 'Dúvidas repetitivas sobre entrega consomem 60% do suporte humano',
        requisitos: 'Conexão direta com Shopify e Bling ERP',
        solucao_sugerida: 'Integração de status em tempo real via agente de IA',
        resumo_conversa: 'Lead interessado na funcionalidade de rastreio proativo via chat.',
        estagio_do_lead: 'novo',
        proximo_passo: 'Qualificar volume mensal de pedidos no primeiro contato telefônico',
        request_id: 'req_seed_003_demo',
      },
      {
        nome: 'Juliana Costa e Silva',
        empresa: 'Educa Mais Cursos Online',
        email: 'juliana.costa@educamais.edu.br',
        telefone: '(41) 98833-2211',
        necessidade_identificada: 'Atendimento a pré-matrículas e dúvidas de vestibular',
        problema_relatado:
          'Pico de matrículas gera perda de 35% dos interessados por falta de resposta imediata',
        requisitos: 'Disponibilidade 24/7 e disparo de link para pagamento integrado',
        solucao_sugerida: 'Consultor Digital integrado ao funil de captação',
        resumo_conversa:
          'Conversa no site tirando dúvidas sobre pós-graduação e formas de pagamento.',
        estagio_do_lead: 'qualificado',
        proximo_passo: 'Apresentar cálculo de ROI baseado na redução da taxa de abandono',
        request_id: 'req_seed_004_demo',
      },
      {
        nome: 'Felipe Mendes',
        empresa: 'Studio Mendes Fotografia',
        email: 'felipe@mendesfoto.com.br',
        telefone: '(19) 99345-6789',
        necessidade_identificada: 'Consultor apenas para responder preço fixo',
        problema_relatado: 'Orçamento muito abaixo do ticket mínimo da solução corporativa',
        requisitos: 'Plano gratuito ou individual sem custos de setup',
        solucao_sugerida: 'Não aderente ao modelo atual de consultor empresarial',
        resumo_conversa: 'Usuário individual solicitando ferramenta sem custo de infraestrutura.',
        estagio_do_lead: 'descartado',
        proximo_passo: 'Encaminhar materiais públicos e blog post sobre automação básica',
        request_id: 'req_seed_005_demo',
      },
    ]

    for (let i = 0; i < sampleLeads.length; i++) {
      const item = sampleLeads[i]
      try {
        app.findFirstRecordByData('leads', 'email', item.email)
      } catch (_) {
        const rec = new Record(leadsCol)
        rec.set('nome', item.nome)
        rec.set('empresa', item.empresa)
        rec.set('email', item.email)
        rec.set('telefone', item.telefone)
        rec.set('necessidade_identificada', item.necessidade_identificada)
        rec.set('problema_relatado', item.problema_relatado)
        rec.set('requisitos', item.requisitos)
        rec.set('solucao_sugerida', item.solucao_sugerida)
        rec.set('resumo_conversa', item.resumo_conversa)
        rec.set('estagio_do_lead', item.estagio_do_lead)
        rec.set('proximo_passo', item.proximo_passo)
        rec.set('request_id', item.request_id)
        app.save(rec)
      }
    }

    // 3. Seed de tool_logs de exemplo (SEM dados sensíveis de lead)
    const logsCol = app.findCollectionByNameOrId('tool_logs')
    const sampleLogs = [
      {
        ferramenta: 'create_lead',
        resultado: 'sucesso',
        error_code: '',
        request_id: 'req_seed_001_demo',
        duracao_ms: 142,
        http_status: 201,
      },
      {
        ferramenta: 'create_lead',
        resultado: 'sucesso',
        error_code: '',
        request_id: 'req_seed_002_demo',
        duracao_ms: 98,
        http_status: 201,
      },
      {
        ferramenta: 'create_lead',
        resultado: 'sucesso',
        error_code: '',
        request_id: 'req_seed_003_demo',
        duracao_ms: 115,
        http_status: 201,
      },
      {
        ferramenta: 'create_lead',
        resultado: 'sucesso',
        error_code: '',
        request_id: 'req_seed_004_demo',
        duracao_ms: 88,
        http_status: 201,
      },
      {
        ferramenta: 'create_lead',
        resultado: 'sucesso',
        error_code: '',
        request_id: 'req_seed_005_demo',
        duracao_ms: 76,
        http_status: 201,
      },
      {
        ferramenta: 'create_lead',
        resultado: 'sucesso',
        error_code: '',
        request_id: 'req_seed_dup_006',
        duracao_ms: 64,
        http_status: 200,
      },
      {
        ferramenta: 'create_lead',
        resultado: 'erro',
        error_code: 'VALIDATION_ERROR',
        request_id: 'req_seed_err_007',
        duracao_ms: 32,
        http_status: 400,
      },
      {
        ferramenta: 'create_lead',
        resultado: 'erro',
        error_code: 'UNAUTHORIZED',
        request_id: 'req_seed_err_008',
        duracao_ms: 12,
        http_status: 401,
      },
      {
        ferramenta: 'create_lead',
        resultado: 'erro',
        error_code: 'RATE_LIMITED',
        request_id: 'req_seed_err_009',
        duracao_ms: 8,
        http_status: 429,
      },
    ]

    for (let j = 0; j < sampleLogs.length; j++) {
      const log = sampleLogs[j]
      try {
        app.findFirstRecordByData('tool_logs', 'request_id', log.request_id)
      } catch (_) {
        const rec = new Record(logsCol)
        rec.set('ferramenta', log.ferramenta)
        rec.set('resultado', log.resultado)
        rec.set('error_code', log.error_code || '')
        rec.set('request_id', log.request_id)
        rec.set('duracao_ms', log.duracao_ms)
        rec.set('http_status', log.http_status)
        app.save(rec)
      }
    }
  },
  (app) => {
    // Rollback opcional
  },
)
