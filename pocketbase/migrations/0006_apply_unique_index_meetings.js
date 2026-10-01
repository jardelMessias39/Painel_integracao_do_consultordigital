migrate(
  (app) => {
    // Migration 0006: Efetivar índice UNIQUE para (email, data_hora) na coleção meetings.
    //
    // Contexto: A migration 0004 foi registrada como aplicada mas ignorou a criação do UNIQUE
    // por conter salvaguarda pré-deduplicação.
    // A base está deduplicada (2 registros com pares email + data_hora distintos).
    //
    // 1. Carregar a coleção meetings
    const meetingsCollection = app.findCollectionByNameOrId('meetings')

    // 2. Remover índice comum anterior (idx_meetings_email_data_hora)
    try {
      meetingsCollection.removeIndex('idx_meetings_email_data_hora')
    } catch (_) {}

    // Remover também qualquer referência residual caso já exista o nome unique
    try {
      meetingsCollection.removeIndex('idx_meetings_email_data_hora_unique')
    } catch (_) {}

    // 3. Adicionar índice UNIQUE sobre email, data_hora
    meetingsCollection.addIndex(
      'idx_meetings_email_data_hora_unique',
      true, // UNIQUE = true
      'email, data_hora',
      '',
    )

    // 4. Salvar coleção
    app.save(meetingsCollection)
  },
  (app) => {
    try {
      const meetingsCollection = app.findCollectionByNameOrId('meetings')
      meetingsCollection.removeIndex('idx_meetings_email_data_hora_unique')
      meetingsCollection.addIndex('idx_meetings_email_data_hora', false, 'email, data_hora', '')
      app.save(meetingsCollection)
    } catch (_) {}
  },
)
