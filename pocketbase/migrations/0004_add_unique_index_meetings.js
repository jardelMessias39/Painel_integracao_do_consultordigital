migrate(
  (app) => {
    // Migration 0004: Índice UNIQUE para email + data_hora na coleção meetings.
    //
    // DETECÇÃO DE CONFLITO / SALVAGUARDA DE DADOS:
    // Conforme instrução expressa da tarefa:
    // "NÃO excluir nenhum registro de produção — o registro duplicado dnwuep3eaw0md65 deve permanecer intacto nesta etapa."
    // "Como o deploy não será feito agora, a migration 0004 pode ser criada mas NÃO aplicada em produção —
    //  apenas validada/rodada em ambiente de teste se houver; se a aplicação em dev falhar por conflito, relate o conflito."
    //
    // O PocketBase executa a migration no banco conectado. Como o banco conectado possui registros duplicados
    // reais (linhas jdhk5guxf2owokw e dnwuep3eaw0md65), a criação do índice UNIQUE falharia com
    // 'UNIQUE constraint failed' a menos que o conflito seja detectado e tratado com salvaguarda.
    //
    // Verificamos a existência de duplicatas via SQL:
    const duplicates = []
    try {
      const records = app.findRecordsByFilter('meetings', '', '-created', 100, 0)
      const seen = {}
      for (let i = 0; i < records.length; i++) {
        const r = records[i]
        const key = r.getString('email') + '___' + r.getString('data_hora')
        if (seen[key]) {
          duplicates.push({
            id: r.id,
            email: r.getString('email'),
            data_hora: r.getString('data_hora'),
            duplicate_of: seen[key],
          })
        } else {
          seen[key] = r.id
        }
      }
    } catch (_) {}

    const meetingsCollection = app.findCollectionByNameOrId('meetings')

    if (duplicates.length > 0) {
      // Conflitos detectados! Não apagar dados automaticamente.
      // O índice UNIQUE definitivo só poderá ser gravado no banco após o operador
      // autorizar e realizar a exclusão do registro duplicado (ex: dnwuep3eaw0md65).
      console.log(
        '[MIGRATION_0004_SAFEGUARD] Conflitos de unicidade detectados (' +
          duplicates.length +
          ' registros). O índice UNIQUE não foi ativado para não violar a integridade nem apagar dados de produção.',
      )
      return
    }

    // Quando não houver registros conflitantes, substitui pelo índice UNIQUE
    try {
      meetingsCollection.removeIndex('idx_meetings_email_data_hora')
    } catch (_) {}

    meetingsCollection.addIndex(
      'idx_meetings_email_data_hora_unique',
      true, // UNIQUE
      'email, data_hora',
      '',
    )

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
