import pb from '@/lib/pocketbase/client'
import type { LeadRecord, EstagioLead } from '@/types/integration'

export const leadService = {
  async getLeads(params?: { estagio?: string; search?: string; page?: number; perPage?: number }) {
    const page = params?.page || 1
    const perPage = params?.perPage || 50
    const filters: string[] = []

    if (params?.estagio && params.estagio !== 'todos') {
      filters.push(`estagio_do_lead = '${params.estagio}'`)
    }

    if (params?.search && params.search.trim()) {
      const q = params.search.trim().replace(/['"]/g, '')
      filters.push(`(nome ~ '${q}' || empresa ~ '${q}' || email ~ '${q}')`)
    }

    const filterString = filters.join(' && ')

    return await pb.collection<LeadRecord>('leads').getList(page, perPage, {
      filter: filterString || undefined,
      sort: '-created',
    })
  },

  async getLeadById(id: string) {
    return await pb.collection<LeadRecord>('leads').getOne(id)
  },

  async updateLeadEstagio(id: string, estagio: EstagioLead) {
    return await pb.collection<LeadRecord>('leads').update(id, {
      estagio_do_lead: estagio,
    })
  },

  async getStats() {
    const totalLeads = await pb.collection('leads').getList(1, 1, { fields: 'id' })

    // Início de hoje (UTC / Local)
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const todayIso = today.toISOString().replace('T', ' ').slice(0, 19)

    const leadsToday = await pb.collection('leads').getList(1, 1, {
      filter: `created >= '${todayIso}'`,
      fields: 'id',
    })

    return {
      total: totalLeads.totalItems,
      today: leadsToday.totalItems,
    }
  },
}
