import pb from '@/lib/pocketbase/client'
import type { ToolLogRecord } from '@/types/integration'

export const toolLogService = {
  async getLogs(params?: {
    page?: number
    perPage?: number
    resultado?: string
    ferramenta?: string
  }) {
    const page = params?.page || 1
    const perPage = params?.perPage || 20
    const filters: string[] = []

    if (params?.resultado && params.resultado !== 'todos') {
      filters.push(`resultado = '${params.resultado}'`)
    }

    if (params?.ferramenta && params.ferramenta !== 'todas') {
      filters.push(`ferramenta = '${params.ferramenta}'`)
    }

    const filterString = filters.join(' && ')

    return await pb.collection<ToolLogRecord>('tool_logs').getList(page, perPage, {
      filter: filterString || undefined,
      sort: '-created',
    })
  },

  async getRecentLogs(limit = 5) {
    return await pb.collection<ToolLogRecord>('tool_logs').getList(1, limit, {
      sort: '-created',
    })
  },

  async getMetrics() {
    const totalLogsRes = await pb.collection('tool_logs').getList(1, 1, { fields: 'id' })
    const successLogsRes = await pb.collection('tool_logs').getList(1, 1, {
      filter: "resultado = 'sucesso'",
      fields: 'id',
    })
    const rateLimitedLogsRes = await pb.collection('tool_logs').getList(1, 1, {
      filter: "error_code = 'RATE_LIMITED'",
      fields: 'id',
    })

    const total = totalLogsRes.totalItems
    const success = successLogsRes.totalItems
    const rateLimited = rateLimitedLogsRes.totalItems

    const successRate = total > 0 ? Math.round((success / total) * 100) : 100

    return {
      total,
      success,
      rateLimited,
      successRate,
    }
  },
}
