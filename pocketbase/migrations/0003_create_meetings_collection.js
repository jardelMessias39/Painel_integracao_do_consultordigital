migrate(
  (app) => {
    // Coleção meetings (Solcitações de reunião do Consultor Digital - V2)
    const meetingsCollection = new Collection({
      name: 'meetings',
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
        { name: 'telefone', type: 'text', required: true, max: 30 },
        { name: 'data_hora', type: 'date', required: true },
        { name: 'assunto', type: 'text', required: true, max: 500 },
        { name: 'observacoes', type: 'text', required: false, max: 3000 },
        {
          name: 'status',
          type: 'select',
          required: true,
          values: ['pendente', 'confirmada', 'cancelada', 'realizada'],
          maxSelect: 1,
        },
        { name: 'request_id', type: 'text', required: false, max: 100 },
        { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
        { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
      ],
      indexes: [
        'CREATE INDEX idx_meetings_email_data_hora ON meetings (email, data_hora)',
        'CREATE INDEX idx_meetings_status ON meetings (status)',
        'CREATE INDEX idx_meetings_data_hora ON meetings (data_hora)',
        'CREATE INDEX idx_meetings_created ON meetings (created DESC)',
      ],
    })
    app.save(meetingsCollection)
  },
  (app) => {
    try {
      const meetings = app.findCollectionByNameOrId('meetings')
      app.delete(meetings)
    } catch (_) {}
  },
)
