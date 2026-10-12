import type { MeetingRecord } from '@/types/integration'

export interface LeadMeetingInfo {
  meeting: MeetingRecord
  isFuture: boolean
  formattedShortDate?: string
}

/**
 * Normaliza o e-mail para comparação consistente
 */
export function normalizeEmail(email?: string): string {
  return (email || '').trim().toLowerCase()
}

/**
 * Formata data/hora curta em pt-BR (ex: "25/11 18:00")
 */
export function formatShortMeetingDate(dateString: string): string {
  try {
    const d = new Date(dateString)
    if (isNaN(d.getTime())) return dateString

    const day = String(d.getDate()).padStart(2, '0')
    const month = String(d.getMonth() + 1).padStart(2, '0')
    const hours = String(d.getHours()).padStart(2, '0')
    const minutes = String(d.getMinutes()).padStart(2, '0')

    return `${day}/${month} ${hours}:${minutes}`
  } catch {
    return dateString
  }
}

/**
 * Calcula a pontuação de relevância de uma reunião para fins de priorização:
 * Requisito:
 * - Prioridade: pendente/confirmada futura > pendente/confirmada passada > realizada > cancelada (neutro/sem destaque)
 * - Leads sem reunião ou com apenas reuniões canceladas não recebem selo em destaque.
 */
function getMeetingRelevanceScore(meeting: MeetingRecord, now: number): number {
  const time = new Date(meeting.data_hora).getTime()
  const isFuture = time >= now

  // Cancelada: menor relevância possível (não deve ter destaque)
  if (meeting.status === 'cancelada') {
    return 0
  }

  // Realizada: reunião concluída no funil
  if (meeting.status === 'realizada') {
    return 1000 + time / 1e12 // passadas mais recentes ligeiramente à frente
  }

  // Pendente ou Confirmada no passado
  if (!isFuture) {
    return 2000 + time / 1e12
  }

  // Pendente ou Confirmada FUTURA: prioridade máxima!
  // Entre as futuras, a reunião mais próxima do momento atual deve ter prioridade máxima
  const distanceToNow = Math.max(0, time - now)
  // Quanto menor a distância para agora, maior o score dentro do tier 3000
  return 3000 + Math.max(0, 500 - distanceToNow / (1000 * 60 * 60 * 24))
}

/**
 * Cria um mapa de email -> LeadMeetingInfo com a reunião mais relevante.
 * Se todas as reuniões de um email forem "cancelada", retorna undefined para não poluir o lead.
 */
export function buildLeadMeetingsMap(meetings: MeetingRecord[]): Map<string, LeadMeetingInfo> {
  const grouped = new Map<string, MeetingRecord[]>()

  for (const m of meetings) {
    const email = normalizeEmail(m.email)
    if (!email) continue

    const list = grouped.get(email) || []
    list.push(m)
    grouped.set(email, list)
  }

  const resultMap = new Map<string, LeadMeetingInfo>()
  const now = Date.now()

  grouped.forEach((list, email) => {
    // Ordenar reuniões por relevância decrescente
    const sorted = [...list].sort((a, b) => {
      const scoreA = getMeetingRelevanceScore(a, now)
      const scoreB = getMeetingRelevanceScore(b, now)
      return scoreB - scoreA
    })

    const top = sorted[0]
    if (!top) return

    // Requisito 6: "reuniões com status 'cancelada' não devem exibir selo de destaque"
    // Se a melhor reunião que o lead tem for cancelada (ou seja, só tem canceladas), ignorar
    if (top.status === 'cancelada') {
      return
    }

    const meetingTime = new Date(top.data_hora).getTime()
    const isFuture = meetingTime >= now

    resultMap.set(email, {
      meeting: top,
      isFuture,
      formattedShortDate: isFuture ? formatShortMeetingDate(top.data_hora) : undefined,
    })
  })

  return resultMap
}
