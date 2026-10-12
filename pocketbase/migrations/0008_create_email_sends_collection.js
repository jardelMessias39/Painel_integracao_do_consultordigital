migrate(
  (app) => {
    // Coleção email_sends (Rastreio de idempotência e auditoria mínima de envio - V2)
    // NUNCA guarda o corpo nem o assunto do e-mail (LGPD).
    // Apenas idempotency_key, message_id, status ("enviado" | "falha"), request_id e timestamps.
    const emailSendsCollection = new Collection({
      name: 'email_sends',
      type: 'base',
      listRule: "@request.auth.id != ''",
      viewRule: "@request.auth.id != ''",
      createRule: null, // superuser/hook only
      updateRule: null, // imutável após gravação
      deleteRule: null, // superuser only
      fields: [
        { name: 'idempotency_key', type: 'text', required: true, max: 100 },
        { name: 'message_id', type: 'text', required: true, max: 150 },
        {
          name: 'status',
          type: 'select',
          required: true,
          values: ['enviado', 'falha'],
          maxSelect: 1,
        },
        { name: 'request_id', type: 'text', required: false, max: 100 },
        { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
        { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
      ],
      indexes: [
        'CREATE UNIQUE INDEX idx_email_sends_idempotency_key ON email_sends (idempotency_key)',
        'CREATE INDEX idx_email_sends_message_id ON email_sends (message_id)',
        'CREATE INDEX idx_email_sends_created ON email_sends (created DESC)',
      ],
    })
    app.save(emailSendsCollection)
  },
  (app) => {
    try {
      const emailSends = app.findCollectionByNameOrId('email_sends')
      app.delete(emailSends)
    } catch (_) {}
  },
)
