// Hook: Job Agendado (cron) de Resumo Diário de Reuniões Pendentes
// Camada de Integração do Consultor Digital
//
// Regras e Requisitos:
// 1. Executa todo dia de manhã:
//    - Expressão cron padrão: "0 11 * * *" (11:00 UTC = 08:00 America/Sao_Paulo UTC-3).
// 2. Busca e-mail do usuário administrador na coleção 'users'. Se houver mais de um,
//    envia para todos os usuários com e-mail válido.
// 3. Consulta reuniões do dia atual (fuso America/Sao_Paulo) com status 'pendente':
//    - Filtra data_hora no intervalo [YYYY-MM-DD 03:00:00.000Z, YYYY-MM-DD+1 02:59:59.999Z].
//    - Formata os dados de cada reunião: nome, empresa, hora (pt-BR HH:mm no fuso SP), assunto.
// 4. Se houver reuniões pendentes:
//    - Envia e-mail com a lista detalhada e ordenada por hora.
//    Se não houver reuniões pendentes:
//    - Envia e-mail curto confirmando "Nenhuma reunião pendente para hoje" (garante sinal de vida do job).
// 5. Auditoria e LGPD:
//    - Registra a execução em 'tool_logs' com ferramenta 'daily_meetings_summary', resultado 'sucesso' ou 'erro',
//      request_id, duracao_ms e http_status 200/500.
//    - NUNCA grava no tool_logs o assunto nem o corpo do e-mail nem dados pessoais.
// 6. Endpoint de acionamento manual para testes e monitoramento:
//    - POST /api/backend/v1/jobs/daily_meetings_summary (requer autenticação server-to-server X-API-Key).
//
// NOTA DE ESCOPO JSVM DO POCKETBASE:
// Cada callback roda em um pool de VMs isolado. Toda a lógica de execução é mantida
// estritamente inline dentro do corpo de cada callback (sem referências a funções top-level).

// 1. Registro do Cron Job diário no PocketBase via cronAdd
// Executa diariamente às 11:00 UTC (08:00 America/Sao_Paulo UTC-3)
cronAdd('daily_meetings_summary', '0 11 * * *', () => {
  const startTime = Date.now()
  const requestId = 'cron_' + $security.randomString(16)

  const auditLog = (resultado, errorCode, httpStatus) => {
    const duracao_ms = Math.max(1, Date.now() - startTime)
    try {
      const logsCol = $app.findCollectionByNameOrId('tool_logs')
      const logRecord = new Record(logsCol)
      logRecord.set('ferramenta', 'daily_meetings_summary')
      logRecord.set('resultado', resultado)
      logRecord.set('error_code', errorCode || '')
      logRecord.set('request_id', requestId)
      logRecord.set('duracao_ms', duracao_ms)
      logRecord.set('http_status', httpStatus)
      $app.save(logRecord)
    } catch (err) {
      console.error('[AUDIT_LOG_DAILY_SUMMARY_ERROR]', err && err.message ? err.message : err)
    }
  }

  try {
    // 1. Obter a data atual no fuso America/Sao_Paulo (UTC - 3 horas = -180 minutos)
    const nowUtc = new Date()
    const SP_OFFSET_MS = -3 * 60 * 60 * 1000
    const nowSp = new Date(nowUtc.getTime() + SP_OFFSET_MS)

    const spYear = nowSp.getUTCFullYear()
    const spMonth = nowSp.getUTCMonth() // 0-indexed
    const spDate = nowSp.getUTCDate()

    const pad = (n) => (n < 10 ? '0' + n : '' + n)
    const dateFormattedBR = pad(spDate) + '/' + pad(spMonth + 1) + '/' + spYear

    // 2. Intervalo UTC correspondente a 00:00:00 até 23:59:59 no fuso de Brasília
    // 00:00:00 BRT (-03:00) = 03:00:00 UTC
    // 23:59:59.999 BRT (-03:00) = 02:59:59.999 UTC do dia seguinte
    const startUtc = new Date(Date.UTC(spYear, spMonth, spDate, 3, 0, 0, 0))
    const endUtc = new Date(Date.UTC(spYear, spMonth, spDate + 1, 2, 59, 59, 999))

    const startFilter = startUtc.toISOString().replace('T', ' ')
    const endFilter = endUtc.toISOString().replace('T', ' ')

    // 3. Buscar reuniões pendentes do dia
    const filter =
      "status = 'pendente' && data_hora >= '" +
      startFilter +
      "' && data_hora <= '" +
      endFilter +
      "'"
    const meetings = $app.findRecordsByFilter('meetings', filter, '+data_hora', 100, 0)

    // 4. Buscar e-mails dos usuários administradores / painel
    const users = $app.findRecordsByFilter('users', "email != ''", 'created', 10, 0)
    const recipientEmails = []

    if (users && users.length > 0) {
      for (let i = 0; i < users.length; i++) {
        const uEmail = users[i].getString('email').trim().toLowerCase()
        if (uEmail && recipientEmails.indexOf(uEmail) === -1) {
          recipientEmails.push(uEmail)
        }
      }
    }

    if (recipientEmails.length === 0) {
      console.warn('[DAILY_MEETINGS_SUMMARY] Nenhum usuário administrador com e-mail encontrado.')
      auditLog('sucesso', 'NO_RECIPIENTS', 200)
      return
    }

    // 5. Formatar dados das reuniões
    const meetingItems = []
    if (meetings && meetings.length > 0) {
      for (let i = 0; i < meetings.length; i++) {
        const m = meetings[i]
        const rawDateStr = m.getString('data_hora')
        const mUtcDate = new Date(rawDateStr.replace(' ', 'T'))

        let horaFormatada = '--:--'
        if (!isNaN(mUtcDate.getTime())) {
          const mSpDate = new Date(mUtcDate.getTime() + SP_OFFSET_MS)
          horaFormatada = pad(mSpDate.getUTCHours()) + ':' + pad(mSpDate.getUTCMinutes())
        }

        meetingItems.push({
          id: m.id,
          nome: m.getString('nome') || 'Não informado',
          empresa: m.getString('empresa') || 'Pessoa física',
          hora: horaFormatada,
          assunto: m.getString('assunto') || 'Sem assunto',
          telefone: m.getString('telefone') || '',
          email: m.getString('email') || '',
        })
      }
    }

    // 6. Montar Assunto e Corpo do E-mail
    const count = meetingItems.length
    const subject =
      count > 0
        ? '[Consultor Digital] ' +
          count +
          ' reunião(ões) pendente(s) hoje (' +
          dateFormattedBR +
          ')'
        : '[Consultor Digital] Nenhuma reunião pendente para hoje (' + dateFormattedBR + ')'

    let textBody = ''
    let htmlBody = ''

    if (count === 0) {
      textBody =
        'Olá!\n\n' +
        'Este é o seu resumo diário de agendamentos do Consultor Digital.\n\n' +
        'Data: ' +
        dateFormattedBR +
        ' (horário de Brasília)\n' +
        'Status: Nenhuma reunião pendente para hoje.\n\n' +
        'Todas as solicitações anteriores foram tratadas ou não há compromissos pendentes na agenda para esta data.\n\n' +
        '---\n' +
        'Consultor Digital — Camada de Integração'

      htmlBody =
        '<div style="font-family: -apple-system, BlinkMacSystemFont, Segoe UI, Roboto, sans-serif; max-width: 600px; margin: 0 auto; color: #1e293b; line-height: 1.5;">' +
        '<div style="background: #0f766e; padding: 20px; border-radius: 8px 8px 0 0; color: #ffffff;">' +
        '<h2 style="margin: 0; font-size: 20px;">Consultor Digital — Resumo Diário</h2>' +
        '<p style="margin: 4px 0 0 0; font-size: 13px; opacity: 0.9;">Reuniões de Hoje: ' +
        dateFormattedBR +
        ' (Brasília)</p>' +
        '</div>' +
        '<div style="background: #ffffff; padding: 24px; border: 1px solid #e2e8f0; border-top: none; border-radius: 0 0 8px 8px;">' +
        '<div style="background: #f0fdf4; border-left: 4px solid #16a34a; padding: 12px 16px; border-radius: 4px; margin-bottom: 20px;">' +
        '<strong style="color: #15803d; font-size: 14px;">Nenhuma reunião pendente para hoje.</strong>' +
        '<p style="margin: 4px 0 0 0; font-size: 13px; color: #166534;">Todas as solicitações de reunião do dia foram atendidas ou não há agendamentos pendentes.</p>' +
        '</div>' +
        '<p style="font-size: 13px; color: #64748b; margin-top: 24px;">Este é um alerta automático diário gerado pela Camada de Integração.</p>' +
        '</div>' +
        '</div>'
    } else {
      textBody =
        'Olá!\n\n' +
        'Este é o seu resumo diário de agendamentos pendentes do Consultor Digital.\n\n' +
        'Data: ' +
        dateFormattedBR +
        ' (horário de Brasília)\n' +
        'Total de reuniões pendentes hoje: ' +
        count +
        '\n\n' +
        '--------------------------------------------------\n'

      for (let i = 0; i < meetingItems.length; i++) {
        const item = meetingItems[i]
        textBody +=
          '[' +
          item.hora +
          '] ' +
          item.nome +
          ' (' +
          item.empresa +
          ')\n' +
          'Assunto: ' +
          item.assunto +
          '\n' +
          'Contato: ' +
          item.email +
          ' | ' +
          item.telefone +
          '\n' +
          '--------------------------------------------------\n'
      }

      textBody +=
        '\nPara gerenciar ou confirmar estas reuniões, acesse o painel em /reunioes.\n\n' +
        '---\n' +
        'Consultor Digital — Camada de Integração'

      let htmlItems = ''
      for (let i = 0; i < meetingItems.length; i++) {
        const item = meetingItems[i]
        htmlItems +=
          '<div style="padding: 14px; margin-bottom: 12px; background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 6px;">' +
          '<div style="display: flex; justify-content: space-between; margin-bottom: 6px;">' +
          '<span style="background: #ccfbf1; color: #0f766e; font-weight: bold; font-family: monospace; padding: 2px 8px; border-radius: 4px; font-size: 12px;">' +
          item.hora +
          '</span>' +
          '<span style="background: #fef3c7; color: #92400e; font-size: 11px; padding: 2px 6px; border-radius: 4px;">Pendente</span>' +
          '</div>' +
          '<div style="font-size: 14px; font-weight: bold; color: #0f172a;">' +
          item.nome +
          ' <span style="font-weight: normal; color: #64748b; font-size: 13px;">— ' +
          item.empresa +
          '</span></div>' +
          '<div style="font-size: 13px; color: #334155; margin-top: 6px; background: #ffffff; padding: 8px; border-radius: 4px; border: 1px solid #cbd5e1;">' +
          '<strong>Assunto:</strong> ' +
          item.assunto +
          '</div>' +
          '<div style="font-size: 11px; color: #64748b; margin-top: 6px; font-family: monospace;">' +
          item.email +
          ' • ' +
          item.telefone +
          '</div>' +
          '</div>'
      }

      htmlBody =
        '<div style="font-family: -apple-system, BlinkMacSystemFont, Segoe UI, Roboto, sans-serif; max-width: 600px; margin: 0 auto; color: #1e293b; line-height: 1.5;">' +
        '<div style="background: #0f766e; padding: 20px; border-radius: 8px 8px 0 0; color: #ffffff;">' +
        '<h2 style="margin: 0; font-size: 20px;">Consultor Digital — Resumo Diário</h2>' +
        '<p style="margin: 4px 0 0 0; font-size: 13px; opacity: 0.9;">Reuniões Pendentes de Hoje: ' +
        dateFormattedBR +
        ' (' +
        count +
        ')</p>' +
        '</div>' +
        '<div style="background: #ffffff; padding: 24px; border: 1px solid #e2e8f0; border-top: none; border-radius: 0 0 8px 8px;">' +
        '<p style="margin-top: 0; font-size: 14px; color: #334155;">Você tem <strong>' +
        count +
        ' reunião(ões) pendente(s)</strong> agendada(s) para hoje:</p>' +
        htmlItems +
        '<div style="margin-top: 20px; padding-top: 16px; border-top: 1px solid #e2e8f0; text-align: center;">' +
        '<p style="font-size: 12px; color: #64748b;">Acesse o painel operacional para gerenciar os agendamentos.</p>' +
        '</div>' +
        '</div>' +
        '</div>'
    }

    // 7. Configurações de remetente SMTP da Skip
    const settings = $app.settings()
    const senderAddress =
      (settings && settings.meta && settings.meta.senderAddress) ||
      (settings && settings.smtp && settings.smtp.username) ||
      'no-reply@goskip.app'
    const senderName =
      (settings && settings.meta && settings.meta.senderName) || 'Consultor Digital'

    // 8. Enviar o e-mail para cada destinatário
    for (let i = 0; i < recipientEmails.length; i++) {
      const toEmail = recipientEmails[i]
      const msg = new MailerMessage({
        from: {
          address: senderAddress,
          name: senderName,
        },
        to: [{ address: toEmail }],
        subject: subject,
        text: textBody,
        html: htmlBody,
      })

      $app.newMailClient().send(msg)
      console.log(
        '[DAILY_MEETINGS_SUMMARY] E-mail de resumo diário enviado com sucesso para: ' + toEmail,
      )
    }

    // 9. Gravar auditoria LGPD de sucesso
    auditLog('sucesso', '', 200)
  } catch (err) {
    const errorMsg = err && err.message ? String(err.message) : String(err)
    console.error('[DAILY_MEETINGS_SUMMARY_ERROR]', errorMsg)
    auditLog('erro', 'CRON_EXECUTION_FAILED', 500)
  }
})

// 2. Rota autenticada para acionamento manual ou testes operacionais
;['/api/backend/v1/jobs/daily_meetings_summary', '/backend/v1/jobs/daily_meetings_summary'].forEach(
  (routePath) => {
    routerAdd('POST', routePath, (e) => {
      const startTime = Date.now()
      const requestId = 'req_' + $security.randomString(16)

      // Autenticação fail-closed com X-API-Key
      const primaryKey = $secrets.get('CONSULTOR_API_KEY') || ''
      const secondaryKey = $secrets.get('CONSULTOR_API_KEY_NEW') || ''
      const rawKeys = (primaryKey + ',' + secondaryKey)
        .split(',')
        .map((k) => k.trim())
        .filter((k) => k.length > 0)

      const authHeaderKey = (
        e.request.header.get('X-API-Key') ||
        e.request.header.get('x-api-key') ||
        ''
      ).trim()

      let authorized = false
      if (authHeaderKey && rawKeys.length > 0) {
        for (let i = 0; i < rawKeys.length; i++) {
          if (authHeaderKey === rawKeys[i]) {
            authorized = true
            break
          }
        }
      }

      if (!authorized) {
        return e.json(401, {
          ok: false,
          error: {
            code: 'UNAUTHORIZED',
            message: 'Chave de API ausente ou inválida. Forneça o header X-API-Key autorizado.',
          },
        })
      }

      const auditLog = (resultado, errorCode, httpStatus) => {
        const duracao_ms = Math.max(1, Date.now() - startTime)
        try {
          const logsCol = $app.findCollectionByNameOrId('tool_logs')
          const logRecord = new Record(logsCol)
          logRecord.set('ferramenta', 'daily_meetings_summary')
          logRecord.set('resultado', resultado)
          logRecord.set('error_code', errorCode || '')
          logRecord.set('request_id', requestId)
          logRecord.set('duracao_ms', duracao_ms)
          logRecord.set('http_status', httpStatus)
          $app.save(logRecord)
        } catch (err) {
          console.error('[AUDIT_LOG_DAILY_SUMMARY_ERROR]', err && err.message ? err.message : err)
        }
      }

      try {
        const nowUtc = new Date()
        const SP_OFFSET_MS = -3 * 60 * 60 * 1000
        const nowSp = new Date(nowUtc.getTime() + SP_OFFSET_MS)

        const spYear = nowSp.getUTCFullYear()
        const spMonth = nowSp.getUTCMonth()
        const spDate = nowSp.getUTCDate()

        const pad = (n) => (n < 10 ? '0' + n : '' + n)
        const dateFormattedBR = pad(spDate) + '/' + pad(spMonth + 1) + '/' + spYear

        const startUtc = new Date(Date.UTC(spYear, spMonth, spDate, 3, 0, 0, 0))
        const endUtc = new Date(Date.UTC(spYear, spMonth, spDate + 1, 2, 59, 59, 999))

        const startFilter = startUtc.toISOString().replace('T', ' ')
        const endFilter = endUtc.toISOString().replace('T', ' ')

        const filter =
          "status = 'pendente' && data_hora >= '" +
          startFilter +
          "' && data_hora <= '" +
          endFilter +
          "'"
        const meetings = $app.findRecordsByFilter('meetings', filter, '+data_hora', 100, 0)

        const users = $app.findRecordsByFilter('users', "email != ''", 'created', 10, 0)
        const recipientEmails = []

        if (users && users.length > 0) {
          for (let i = 0; i < users.length; i++) {
            const uEmail = users[i].getString('email').trim().toLowerCase()
            if (uEmail && recipientEmails.indexOf(uEmail) === -1) {
              recipientEmails.push(uEmail)
            }
          }
        }

        if (recipientEmails.length === 0) {
          auditLog('sucesso', 'NO_RECIPIENTS', 200)
          return e.json(200, {
            ok: true,
            summary: 'Nenhum destinatário encontrado na coleção users',
            meetings_count: meetings ? meetings.length : 0,
          })
        }

        const meetingItems = []
        if (meetings && meetings.length > 0) {
          for (let i = 0; i < meetings.length; i++) {
            const m = meetings[i]
            const rawDateStr = m.getString('data_hora')
            const mUtcDate = new Date(rawDateStr.replace(' ', 'T'))

            let horaFormatada = '--:--'
            if (!isNaN(mUtcDate.getTime())) {
              const mSpDate = new Date(mUtcDate.getTime() + SP_OFFSET_MS)
              horaFormatada = pad(mSpDate.getUTCHours()) + ':' + pad(mSpDate.getUTCMinutes())
            }

            meetingItems.push({
              id: m.id,
              nome: m.getString('nome') || 'Não informado',
              empresa: m.getString('empresa') || 'Pessoa física',
              hora: horaFormatada,
              assunto: m.getString('assunto') || 'Sem assunto',
              telefone: m.getString('telefone') || '',
              email: m.getString('email') || '',
            })
          }
        }

        const count = meetingItems.length
        const subject =
          count > 0
            ? '[Consultor Digital] ' +
              count +
              ' reunião(ões) pendente(s) hoje (' +
              dateFormattedBR +
              ')'
            : '[Consultor Digital] Nenhuma reunião pendente para hoje (' + dateFormattedBR + ')'

        let textBody = ''
        let htmlBody = ''

        if (count === 0) {
          textBody =
            'Olá!\n\n' +
            'Este é o seu resumo diário de agendamentos do Consultor Digital.\n\n' +
            'Data: ' +
            dateFormattedBR +
            ' (horário de Brasília)\n' +
            'Status: Nenhuma reunião pendente para hoje.\n\n' +
            'Todas as solicitações anteriores foram tratadas ou não há compromissos pendentes na agenda para esta data.\n\n' +
            '---\n' +
            'Consultor Digital — Camada de Integração'

          htmlBody =
            '<div style="font-family: -apple-system, BlinkMacSystemFont, Segoe UI, Roboto, sans-serif; max-width: 600px; margin: 0 auto; color: #1e293b; line-height: 1.5;">' +
            '<div style="background: #0f766e; padding: 20px; border-radius: 8px 8px 0 0; color: #ffffff;">' +
            '<h2 style="margin: 0; font-size: 20px;">Consultor Digital — Resumo Diário</h2>' +
            '<p style="margin: 4px 0 0 0; font-size: 13px; opacity: 0.9;">Reuniões de Hoje: ' +
            dateFormattedBR +
            ' (Brasília)</p>' +
            '</div>' +
            '<div style="background: #ffffff; padding: 24px; border: 1px solid #e2e8f0; border-top: none; border-radius: 0 0 8px 8px;">' +
            '<div style="background: #f0fdf4; border-left: 4px solid #16a34a; padding: 12px 16px; border-radius: 4px; margin-bottom: 20px;">' +
            '<strong style="color: #15803d; font-size: 14px;">Nenhuma reunião pendente para hoje.</strong>' +
            '<p style="margin: 4px 0 0 0; font-size: 13px; color: #166534;">Todas as solicitações de reunião do dia foram atendidas ou não há agendamentos pendentes.</p>' +
            '</div>' +
            '<p style="font-size: 13px; color: #64748b; margin-top: 24px;">Este é um alerta gerado pela Camada de Integração.</p>' +
            '</div>' +
            '</div>'
        } else {
          textBody =
            'Olá!\n\n' +
            'Este é o seu resumo diário de agendamentos pendentes do Consultor Digital.\n\n' +
            'Data: ' +
            dateFormattedBR +
            ' (horário de Brasília)\n' +
            'Total de reuniões pendentes hoje: ' +
            count +
            '\n\n' +
            '--------------------------------------------------\n'

          for (let i = 0; i < meetingItems.length; i++) {
            const item = meetingItems[i]
            textBody +=
              '[' +
              item.hora +
              '] ' +
              item.nome +
              ' (' +
              item.empresa +
              ')\n' +
              'Assunto: ' +
              item.assunto +
              '\n' +
              'Contato: ' +
              item.email +
              ' | ' +
              item.telefone +
              '\n' +
              '--------------------------------------------------\n'
          }

          textBody +=
            '\nPara gerenciar ou confirmar estas reuniões, acesse o painel em /reunioes.\n\n' +
            '---\n' +
            'Consultor Digital — Camada de Integração'

          let htmlItems = ''
          for (let i = 0; i < meetingItems.length; i++) {
            const item = meetingItems[i]
            htmlItems +=
              '<div style="padding: 14px; margin-bottom: 12px; background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 6px;">' +
              '<div style="display: flex; justify-content: space-between; margin-bottom: 6px;">' +
              '<span style="background: #ccfbf1; color: #0f766e; font-weight: bold; font-family: monospace; padding: 2px 8px; border-radius: 4px; font-size: 12px;">' +
              item.hora +
              '</span>' +
              '<span style="background: #fef3c7; color: #92400e; font-size: 11px; padding: 2px 6px; border-radius: 4px;">Pendente</span>' +
              '</div>' +
              '<div style="font-size: 14px; font-weight: bold; color: #0f172a;">' +
              item.nome +
              ' <span style="font-weight: normal; color: #64748b; font-size: 13px;">— ' +
              item.empresa +
              '</span></div>' +
              '<div style="font-size: 13px; color: #334155; margin-top: 6px; background: #ffffff; padding: 8px; border-radius: 4px; border: 1px solid #cbd5e1;">' +
              '<strong>Assunto:</strong> ' +
              item.assunto +
              '</div>' +
              '<div style="font-size: 11px; color: #64748b; margin-top: 6px; font-family: monospace;">' +
              item.email +
              ' • ' +
              item.telefone +
              '</div>' +
              '</div>'
          }

          htmlBody =
            '<div style="font-family: -apple-system, BlinkMacSystemFont, Segoe UI, Roboto, sans-serif; max-width: 600px; margin: 0 auto; color: #1e293b; line-height: 1.5;">' +
            '<div style="background: #0f766e; padding: 20px; border-radius: 8px 8px 0 0; color: #ffffff;">' +
            '<h2 style="margin: 0; font-size: 20px;">Consultor Digital — Resumo Diário</h2>' +
            '<p style="margin: 4px 0 0 0; font-size: 13px; opacity: 0.9;">Reuniões Pendentes de Hoje: ' +
            dateFormattedBR +
            ' (' +
            count +
            ')</p>' +
            '</div>' +
            '<div style="background: #ffffff; padding: 24px; border: 1px solid #e2e8f0; border-top: none; border-radius: 0 0 8px 8px;">' +
            '<p style="margin-top: 0; font-size: 14px; color: #334155;">Você tem <strong>' +
            count +
            ' reunião(ões) pendente(s)</strong> agendada(s) para hoje:</p>' +
            htmlItems +
            '<div style="margin-top: 20px; padding-top: 16px; border-top: 1px solid #e2e8f0; text-align: center;">' +
            '<p style="font-size: 12px; color: #64748b;">Acesse o painel operacional para gerenciar os agendamentos.</p>' +
            '</div>' +
            '</div>' +
            '</div>'
        }

        const settings = $app.settings()
        const senderAddress =
          (settings && settings.meta && settings.meta.senderAddress) ||
          (settings && settings.smtp && settings.smtp.username) ||
          'no-reply@goskip.app'
        const senderName =
          (settings && settings.meta && settings.meta.senderName) || 'Consultor Digital'

        for (let i = 0; i < recipientEmails.length; i++) {
          const toEmail = recipientEmails[i]
          const msg = new MailerMessage({
            from: {
              address: senderAddress,
              name: senderName,
            },
            to: [{ address: toEmail }],
            subject: subject,
            text: textBody,
            html: htmlBody,
          })

          $app.newMailClient().send(msg)
        }

        auditLog('sucesso', '', 200)

        return e.json(200, {
          ok: true,
          data: {
            date: dateFormattedBR,
            recipients_count: recipientEmails.length,
            pending_meetings_count: count,
            trigger: 'manual_api',
          },
        })
      } catch (err) {
        const errorMsg = err && err.message ? String(err.message) : String(err)
        console.error('[DAILY_MEETINGS_SUMMARY_ERROR]', errorMsg)
        auditLog('erro', 'EXECUTION_FAILED', 500)
        return e.json(500, {
          ok: false,
          error: errorMsg,
        })
      }
    })
  },
)
