import { useState, useEffect, useRef, useCallback } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import pb from '@/lib/pocketbase/client'
import { useRealtime } from '@/hooks/use-realtime'
import { useToast } from '@/hooks/use-toast'
import type { LeadRecord, MeetingRecord } from '@/types/integration'

const STORAGE_KEY_LAST_VISIT_LEADS = 'consultor_last_visit_leads'
const STORAGE_KEY_LAST_VISIT_MEETINGS = 'consultor_last_visit_meetings'
const STORAGE_KEY_SEEN_LEAD_IDS = 'consultor_seen_lead_ids'
const STORAGE_KEY_SEEN_MEETING_IDS = 'consultor_seen_meeting_ids'

function getStoredDate(key: string): Date | null {
  const stored = localStorage.getItem(key)
  if (stored) {
    const d = new Date(stored)
    if (!isNaN(d.getTime())) {
      return d
    }
  }
  return null
}

function getStoredIdSet(key: string): Set<string> {
  try {
    const stored = localStorage.getItem(key)
    if (stored) {
      const arr = JSON.parse(stored)
      if (Array.isArray(arr)) {
        return new Set(arr)
      }
    }
  } catch {
    // ignora erro de parse
  }
  return new Set()
}

function saveStoredIdSet(key: string, set: Set<string>) {
  try {
    // Mantém apenas os últimos 500 IDs para não estourar localStorage
    const arr = Array.from(set).slice(-500)
    localStorage.setItem(key, JSON.stringify(arr))
  } catch {
    // ignora erro
  }
}

export function formatMeetingDateTime(dateString: string): string {
  try {
    const d = new Date(dateString)
    if (isNaN(d.getTime())) return dateString
    return d.toLocaleString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  } catch {
    return dateString
  }
}

export function useGlobalRealtimeNotifications() {
  const navigate = useNavigate()
  const location = useLocation()
  const { toast } = useToast()

  const [unreadLeadsCount, setUnreadLeadsCount] = useState<number>(0)
  const [unreadMeetingsCount, setUnreadMeetingsCount] = useState<number>(0)

  // Referência para deduplicar toasts disparados na sessão
  const seenLeadIdsRef = useRef<Set<string>>(new Set())
  const seenMeetingIdsRef = useRef<Set<string>>(new Set())

  // Carrega estado e contagem inicial
  useEffect(() => {
    const storedLeadIds = getStoredIdSet(STORAGE_KEY_SEEN_LEAD_IDS)
    const storedMeetingIds = getStoredIdSet(STORAGE_KEY_SEEN_MEETING_IDS)

    storedLeadIds.forEach((id) => seenLeadIdsRef.current.add(id))
    storedMeetingIds.forEach((id) => seenMeetingIdsRef.current.add(id))

    const lastVisitLeads = getStoredDate(STORAGE_KEY_LAST_VISIT_LEADS)
    const lastVisitMeetings = getStoredDate(STORAGE_KEY_LAST_VISIT_MEETINGS)

    const now = new Date()

    // Se é a primeira vez acessando o painel, define a data da visita agora para não contar todo o histórico
    if (!lastVisitLeads) {
      localStorage.setItem(STORAGE_KEY_LAST_VISIT_LEADS, now.toISOString())
    } else if (!window.location.pathname.startsWith('/leads')) {
      // Busca quantos leads foram criados após a última visita
      const formattedFilterDate = lastVisitLeads.toISOString().replace('T', ' ')
      pb.collection<LeadRecord>('leads')
        .getList(1, 1, {
          filter: `created > "${formattedFilterDate}"`,
          fields: 'id',
        })
        .then((res) => {
          setUnreadLeadsCount(res.totalItems)
        })
        .catch(() => {})
    }

    if (!lastVisitMeetings) {
      localStorage.setItem(STORAGE_KEY_LAST_VISIT_MEETINGS, now.toISOString())
    } else if (!window.location.pathname.startsWith('/reunioes')) {
      // Busca quantas reuniões foram criadas após a última visita
      const formattedFilterDate = lastVisitMeetings.toISOString().replace('T', ' ')
      pb.collection<MeetingRecord>('meetings')
        .getList(1, 1, {
          filter: `created > "${formattedFilterDate}"`,
          fields: 'id',
        })
        .then((res) => {
          setUnreadMeetingsCount(res.totalItems)
        })
        .catch(() => {})
    }
  }, [])

  // Quando o usuário navega para /leads ou /reunioes, zera o contador e atualiza timestamp
  useEffect(() => {
    const now = new Date()
    if (location.pathname.startsWith('/leads')) {
      localStorage.setItem(STORAGE_KEY_LAST_VISIT_LEADS, now.toISOString())
      setUnreadLeadsCount(0)
    }

    if (location.pathname.startsWith('/reunioes')) {
      localStorage.setItem(STORAGE_KEY_LAST_VISIT_MEETINGS, now.toISOString())
      setUnreadMeetingsCount(0)
    }
  }, [location.pathname])

  const handleLeadCreated = useCallback(
    (record: LeadRecord) => {
      if (!record || !record.id) return

      // Deduplicação: se o mesmo ID já disparou toast nesta sessão/armazenado, ignora
      if (seenLeadIdsRef.current.has(record.id)) {
        return
      }
      seenLeadIdsRef.current.add(record.id)
      saveStoredIdSet(STORAGE_KEY_SEEN_LEAD_IDS, seenLeadIdsRef.current)

      // Se o usuário NÃO está na tela /leads, incrementa contador
      const isCurrentlyOnLeads = window.location.pathname.startsWith('/leads')
      if (!isCurrentlyOnLeads) {
        setUnreadLeadsCount((prev) => prev + 1)
      }

      // Dispara Toast interativo
      const leadNome = record.nome || 'Lead sem nome'
      const leadEmpresa = record.empresa ? ` — ${record.empresa}` : ''

      toast({
        title: 'Novo lead recebido',
        description: (
          <div
            className="cursor-pointer group flex flex-col gap-0.5 text-left"
            onClick={() => navigate('/leads')}
          >
            <p className="text-xs font-semibold text-slate-900 group-hover:text-teal-700 transition-colors">
              Novo lead: {leadNome}
              {leadEmpresa}
            </p>
            <p className="text-[11px] text-teal-700 flex items-center gap-1 font-medium underline underline-offset-2">
              Clique para visualizar na lista de leads →
            </p>
          </div>
        ),
      })
    },
    [navigate, toast],
  )

  const handleMeetingCreated = useCallback(
    (record: MeetingRecord) => {
      if (!record || !record.id) return

      // Deduplicação: se o mesmo ID já disparou toast nesta sessão/armazenado, ignora
      if (seenMeetingIdsRef.current.has(record.id)) {
        return
      }
      seenMeetingIdsRef.current.add(record.id)
      saveStoredIdSet(STORAGE_KEY_SEEN_MEETING_IDS, seenMeetingIdsRef.current)

      // Se o usuário NÃO está na tela /reunioes, incrementa contador
      const isCurrentlyOnMeetings = window.location.pathname.startsWith('/reunioes')
      if (!isCurrentlyOnMeetings) {
        setUnreadMeetingsCount((prev) => prev + 1)
      }

      // Dispara Toast interativo
      const meetingNome = record.nome || 'Participante'
      const formattedDate = record.data_hora
        ? formatMeetingDateTime(record.data_hora)
        : 'Data a definir'

      toast({
        title: 'Nova reunião agendada',
        description: (
          <div
            className="cursor-pointer group flex flex-col gap-0.5 text-left"
            onClick={() => navigate('/reunioes')}
          >
            <p className="text-xs font-semibold text-slate-900 group-hover:text-teal-700 transition-colors">
              Nova reunião: {meetingNome} — {formattedDate}
            </p>
            <p className="text-[11px] text-teal-700 flex items-center gap-1 font-medium underline underline-offset-2">
              Clique para visualizar em reuniões agendadas →
            </p>
          </div>
        ),
      })
    },
    [navigate, toast],
  )

  // Subscrições via hook useRealtime canônico do projeto
  useRealtime<LeadRecord>('leads', (data) => {
    // Filtrar apenas registros CRIADOS (action === 'create')
    if (data.action === 'create' && data.record) {
      handleLeadCreated(data.record)
    }
  })

  useRealtime<MeetingRecord>('meetings', (data) => {
    // Filtrar apenas registros CRIADOS (action === 'create')
    if (data.action === 'create' && data.record) {
      handleMeetingCreated(data.record)
    }
  })

  return {
    unreadLeadsCount,
    unreadMeetingsCount,
  }
}
