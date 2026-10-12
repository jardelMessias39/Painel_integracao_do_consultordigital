migrate(
  (app) => {
    // Migration 0007: Recuperação controlada de senha do usuário jardel.messias.dev@gmail.com
    // Escopo restrito autorizado: apenas redefinir a senha temporária para o usuário de id uqhdzem2zn9abxc.
    // Nenhum outro campo nem outro registro deve ser alterado.
    const user = app.findAuthRecordByEmail('_pb_users_auth_', 'jardel.messias.dev@gmail.com')

    if (user.id !== 'uqhdzem2zn9abxc') {
      throw new Error(`ID inesperado para jardel.messias.dev@gmail.com: ${user.id}`)
    }

    user.setPassword('Consultor@2026Rec')
    app.save(user)
  },
  () => {
    // Reversão no-op: não altera senha na reversão para evitar deixar o usuário sem senha
  },
)
