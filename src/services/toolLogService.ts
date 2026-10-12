import pb from '@/lib/pocketbase/client'
import type { ToolLogRecord } from '@/types/integration'

export const toolLogService = {
  async getLogs(params?: {
    page?: number
    perPage?: number
    resultado?: string
    ferramenta?: string
    createdGte?: string
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

    if (params?.createdGte) {
      filters.push(`created >= '${params.createdGte}'`)
    }

    const filterString = filters.join(' && ')

    return await pb.collection<ToolLogRecord>('tool_logs').getList(page, perPage, {
      filter: filterString || undefined,
      sort: '-created',
    })
  },

  /**
   * Busca logs para computar métricas consolidadas
   */
  async getLogsForMetrics(params?: { createdGte?: string }) {
    const filters: string[] = []
    if (params?.createdGte) {
      filters.push(`created >= '${params.createdGte}'`)
    }
    const filterString = filters.join(' && ')

    return await pb.collection<ToolLogRecord>('tool_logs').getFullList({
      filter: filterString || undefined,
      sort: '-created',
    })
  },

  /**
   * Busca todos os logs filtrados para exportação CSV (até o teto de registros)
   */
  async getLogsForExport(params?: {
    resultado?: string
    ferramenta?: string
    createdGte?: string
    maxRecords?: number
  }): Promise<{ items: ToolLogRecord[]; totalMatched: number; hitCap: boolean }> {
    const maxRecords = params?.maxRecords || 5000
    const filters: string[] = []

    if (params?.resultado && params.resultado !== 'todos') {
      filters.push(`resultado = '${params.resultado}'`)
    }

    if (params?.ferramenta && params.ferramenta !== 'todas') {
      filters.push(`ferramenta = '${params.ferramenta}'`)
    }

    if (params?.createdGte) {
      filters.push(`created >= '${params.createdGte}'`)
    }

    const filterString = filters.join(' && ')

    const batchSize = 500
    let currentPage = 1
    const allItems: ToolLogRecord[] = []
    let totalMatched = 0
    let hitCap = false

    while (allItems.length < maxRecords) {
      const remaining = maxRecords - allItems.length
      const perPage = Math.min(batchSize, remaining)

      const res = await pb.collection<ToolLogRecord>('tool_logs').getList(currentPage, perPage, {
        filter: filterString || undefined,
        sort: '-created',
      })

      totalMatched = res.totalItems
      allItems.push(...res.items)

      if (currentPage >= res.totalPages || res.items.length === 0) {
        break
      }

      currentPage++
    }

    if (totalMatched > maxRecords) {
      hitCap = true
    }

    return {
      items: allItems,
      totalMatched,
      hitCap,
    }
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
