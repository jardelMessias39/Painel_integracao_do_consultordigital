import pb from '@/lib/pocketbase/client'
import type { MeetingRecord } from '@/types/integration'

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
}
