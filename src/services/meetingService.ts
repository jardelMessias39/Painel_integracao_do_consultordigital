import pb from '@/lib/pocketbase/client'
import type { MeetingRecord, StatusMeeting } from '@/types/integration'

export interface GetMeetingsParams {
  status?: string
  search?: string
  page?: number
  perPage?: number
  sort?: string
}

export const meetingService = {
  async getMeetings(params?: GetMeetingsParams) {
    const page = params?.page || 1
    const perPage = params?.perPage || 50
    const filters: string[] = []

    if (params?.status && params.status !== 'todos') {
      filters.push(`status = '${params.status}'`)
    }

    if (params?.search && params.search.trim()) {
      const q = params.search.trim().replace(/['"]/g, '')
      filters.push(`(nome ~ '${q}' || empresa ~ '${q}' || email ~ '${q}' || assunto ~ '${q}')`)
    }

    const filterString = filters.join(' && ')

    return await pb.collection<MeetingRecord>('meetings').getList(page, perPage, {
      filter: filterString || undefined,
      sort: params?.sort || '+data_hora',
    })
  },

  async getMeetingById(id: string) {
    return await pb.collection<MeetingRecord>('meetings').getOne(id)
  },

  /**
   * Busca todas as reuniões cadastradas para indexação em memória (ex: cruzamento por e-mail na tela de Leads)
   */
  async getAllMeetings() {
    return await pb.collection<MeetingRecord>('meetings').getFullList({
      sort: '+data_hora',
    })
  },

  /**
   * Busca as reuniões de hoje com status 'pendente' ordenadas por hora (fuso America/Sao_Paulo)
   */
  async getTodayPendingMeetings(): Promise<MeetingRecord[]> {
    // Calcula o intervalo do dia atual no fuso America/Sao_Paulo (UTC-3)
    // Para cobrir 00:00:00 a 23:59:59 em UTC-3, precisamos de:
    // 03:00:00 UTC do dia até 02:59:59.999 UTC do dia seguinte
    const now = new Date()
    // Obtém ano, mês e dia no fuso America/Sao_Paulo
    const formatter = new Intl.DateTimeFormat('en-CA', {
      timeZone: 'America/Sao_Paulo',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    })
    const dateStr = formatter.format(now) // "YYYY-MM-DD"
    const [year, month, day] = dateStr.split('-').map(Number)

    // Início do dia em SP: YYYY-MM-DD 00:00:00 BRT -> YYYY-MM-DD 03:00:00 UTC
    const startUtc = new Date(Date.UTC(year, month - 1, day, 3, 0, 0, 0))
    // Fim do dia em SP: YYYY-MM-DD 23:59:59.999 BRT -> (dia+1) 02:59:59.999 UTC
    const endUtc = new Date(Date.UTC(year, month - 1, day + 1, 2, 59, 59, 999))

    const startFilterStr = startUtc.toISOString().replace('T', ' ')
    const endFilterStr = endUtc.toISOString().replace('T', ' ')

    const filter = `status = 'pendente' && data_hora >= '${startFilterStr}' && data_hora <= '${endFilterStr}'`

    return await pb.collection<MeetingRecord>('meetings').getFullList({
      filter,
      sort: '+data_hora',
    })
  },

  /**
   * Atualiza exclusivamente o status de uma reunião
   */
  async updateStatus(id: string, status: StatusMeeting) {
    return await pb.collection<MeetingRecord>('meetings').update(id, {
      status,
    })
  },

  /**
   * Atualiza em lote o status de múltiplas reuniões de forma resiliente
   */
  async updateStatusBatch(
    ids: string[],
    status: StatusMeeting,
  ): Promise<{
    successCount: number
    failedCount: number
    results: Array<{ id: string; success: boolean; error?: unknown }>
  }> {
    const results = await Promise.allSettled(
      ids.map(async (id) => {
        await pb.collection<MeetingRecord>('meetings').update(id, { status })
        return id
      }),
    )

    let successCount = 0
    let failedCount = 0
    const detailedResults: Array<{ id: string; success: boolean; error?: unknown }> = []

    results.forEach((res, index) => {
      const id = ids[index]
      if (res.status === 'fulfilled') {
        successCount++
        detailedResults.push({ id, success: true })
      } else {
        failedCount++
        detailedResults.push({ id, success: false, error: res.reason })
      }
    })

    return {
      successCount,
      failedCount,
      results: detailedResults,
    }
  },
}
