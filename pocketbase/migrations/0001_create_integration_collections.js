migrate(
  (app) => {
    // 1. Coleção leads
    const leadsCollection = new Collection({
      name: 'leads',
      type: 'base',
      // Escrita só via hook (superuser/admin code); leitura e atualização por usuários autenticados (admin do dashboard); delete superuser only
      listRule: "@request.auth.id != ''",
      viewRule: "@request.auth.id != ''",
      createRule: null, // superuser/hook only
      updateRule: "@request.auth.id != ''",
      deleteRule: null, // superuser only
      fields: [
        { name: 'nome', type: 'text', required: true, max: 200 },
        { name: 'empresa', type: 'text', required: true, max: 200 },
        { name: 'email', type: 'email', required: true, max: 200 },
        { name: 'telefone', type: 'text', required: false, max: 30 },
        { name: 'necessidade_identificada', type: 'text', required: false, max: 2000 },
        { name: 'problema_relatado', type: 'text', required: false, max: 2000 },
        { name: 'requisitos', type: 'text', required: false, max: 2000 },
        { name: 'solucao_sugerida', type: 'text', required: false, max: 2000 },
        { name: 'resumo_conversa', type: 'text', required: false, max: 5000 },
        {
          name: 'estagio_do_lead',
          type: 'select',
          required: true,
          values: ['novo', 'qualificado', 'proposta', 'descartado'],
          maxSelect: 1,
        },
        { name: 'proximo_passo', type: 'text', required: false, max: 500 },
        { name: 'request_id', type: 'text', required: false, max: 100 },
        { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
        { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
      ],
      indexes: [
        'CREATE INDEX idx_leads_email_empresa ON leads (email, empresa)',
        'CREATE INDEX idx_leads_estagio ON leads (estagio_do_lead)',
        'CREATE INDEX idx_leads_created ON leads (created DESC)',
      ],
    })
    app.save(leadsCollection)

    // 2. Coleção tool_logs (SOMENTE metadados auditáveis, SEM dados sensíveis do lead - LGPD)
    const logsCollection = new Collection({
      name: 'tool_logs',
      type: 'base',
      listRule: "@request.auth.id != ''",
      viewRule: "@request.auth.id != ''",
      createRule: null, // hook only
      updateRule: null,
      deleteRule: null,
      fields: [
        { name: 'ferramenta', type: 'text', required: true, max: 100 },
        {
          name: 'resultado',
          type: 'select',
          required: true,
          values: ['sucesso', 'erro'],
          maxSelect: 1,
        },
        { name: 'error_code', type: 'text', required: false, max: 50 },
        { name: 'request_id', type: 'text', required: true, max: 100 },
        { name: 'duracao_ms', type: 'number', required: true },
        { name: 'http_status', type: 'number', required: true },
        { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
        { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
      ],
      indexes: [
        'CREATE INDEX idx_tool_logs_request_id ON tool_logs (request_id)',
        'CREATE INDEX idx_tool_logs_resultado ON tool_logs (resultado)',
        'CREATE INDEX idx_tool_logs_ferramenta ON tool_logs (ferramenta)',
        'CREATE INDEX idx_tool_logs_created ON tool_logs (created DESC)',
      ],
    })
    app.save(logsCollection)
  },
  (app) => {
    try {
      const logs = app.findCollectionByNameOrId('tool_logs')
      app.delete(logs)
    } catch (_) {}
    try {
      const leads = app.findCollectionByNameOrId('leads')
      app.delete(leads)
    } catch (_) {}
  },
)
