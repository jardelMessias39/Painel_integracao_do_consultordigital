migrate(
  (app) => {
    // 1. Limpeza segura na coleção meetings
    // Manter APENAS as reuniões do Zé (email 'zeconfiavel@gmail.com')
    // Apaga:
    // - 2x Teste Schedule V2
    // - 1x Teste Controlado
    // - 1x Teste Conflito
    // - 1x Lucas Souza (Inovação Soluções - teste inicial MCP aprovado para remoção)
    app
      .db()
      .newQuery(`
      DELETE FROM meetings 
      WHERE email != 'zeconfiavel@gmail.com'
    `)
      .execute()

    // 2. Limpeza segura na coleção leads
    // Manter APENAS o lead do Zé (email 'zeconfiavel@gmail.com')
    // Apaga os 15 leads de teste / demo:
    // - 5 leads demo antigos (req_seed_..._demo): Roberto, Mariana, Carlos, Felipe, Juliana
    // - 10 leads de teste: 2x Teste de Integração (validação), bank Integração, Teste Idempotência,
    //   Carlos (CarlosTech), Jardel (Empresa Teste), Auditoria Integration 2026,
    //   Teste Controlado, Teste Notificacao, Jardel Messias / Teste Boas Vindas
    app
      .db()
      .newQuery(`
      DELETE FROM leads 
      WHERE email != 'zeconfiavel@gmail.com'
    `)
      .execute()
  },
  (app) => {
    // Rollback não recria dados fictícios de teste
  },
)
