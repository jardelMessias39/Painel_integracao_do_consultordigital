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
