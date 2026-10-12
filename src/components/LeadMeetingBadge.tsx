import React from 'react'
import { CalendarClock, CalendarCheck, CheckCircle2 } from 'lucide-react'
import type { LeadMeetingInfo } from '@/lib/leadMeetingUtils'

interface LeadMeetingBadgeProps {
  meetingInfo?: LeadMeetingInfo
  className?: string
  showDate?: boolean
}

export const LeadMeetingBadge: React.FC<LeadMeetingBadgeProps> = ({
  meetingInfo,
  className = '',
  showDate = true,
}) => {
  if (!meetingInfo) return null

  const { meeting, isFuture, formattedShortDate } = meetingInfo
  const { status } = meeting

  // Cores idênticas à tela de Reuniões:
  // pendente: bg-amber-50 text-amber-800 border-amber-200, ícone CalendarClock text-amber-600
  // confirmada: bg-emerald-50 text-emerald-800 border-emerald-200, ícone CalendarCheck text-emerald-600
  // realizada: bg-blue-50 text-blue-800 border-blue-200, ícone CheckCircle2 text-blue-600
  switch (status) {
    case 'pendente':
      return (
        <span
          className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-amber-50 text-amber-800 border border-amber-200 ${className}`}
          title={`Reunião pendente: ${meeting.assunto}`}
        >
          <CalendarClock className="h-3 w-3 text-amber-600 shrink-0" />
          <span>Reunião pendente</span>
          {showDate && isFuture && formattedShortDate && (
            <span className="font-mono text-[10px] text-amber-900 font-bold bg-amber-100/80 px-1 rounded ml-0.5">
              {formattedShortDate}
            </span>
          )}
        </span>
      )

    case 'confirmada':
      return (
        <span
          className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-50 text-emerald-800 border border-emerald-200 ${className}`}
          title={`Reunião confirmada: ${meeting.assunto}`}
        >
          <CalendarCheck className="h-3 w-3 text-emerald-600 shrink-0" />
          <span>Reunião confirmada</span>
          {showDate && isFuture && formattedShortDate && (
            <span className="font-mono text-[10px] text-emerald-900 font-bold bg-emerald-100/80 px-1 rounded ml-0.5">
              {formattedShortDate}
            </span>
          )}
        </span>
      )

    case 'realizada':
      return (
        <span
          className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-blue-50 text-blue-800 border border-blue-200 ${className}`}
          title={`Reunião realizada: ${meeting.assunto}`}
        >
          <CheckCircle2 className="h-3 w-3 text-blue-600 shrink-0" />
          <span>Reunião realizada</span>
        </span>
      )

    default:
      return null
  }
}
