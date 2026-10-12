import { useEffect, useState, useCallback, useMemo } from 'react'
import {
  Search,
  Filter,
  Eye,
  RefreshCw,
  Building,
  Mail,
  Phone,
  Calendar,
  Clock,
  CalendarCheck,
  CalendarX,
  CalendarClock,
  CheckCircle2,
  FileText,
  Loader2,
  ChevronLeft,
  ChevronRight,
  Info,
  AlertTriangle,
} from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Checkbox } from '@/components/ui/checkbox'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from '@/components/ui/sheet'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { meetingService } from '@/services/meetingService'
import { useRealtime } from '@/hooks/use-realtime'
import type { MeetingRecord, StatusMeeting } from '@/types/integration'
import { useToast } from '@/hooks/use-toast'

export default function Reunioes() {
  const { toast } = useToast()

  const [meetings, setMeetings] = useState<MeetingRecord[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedStatus, setSelectedStatus] = useState<string>('todos')
  const [selectedMeeting, setSelectedMeeting] = useState<MeetingRecord | null>(null)
  const [currentPage, setCurrentPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [totalItems, setTotalItems] = useState(0)

  // Controle de alteração de status
  const [updatingId, setUpdatingId] = useState<string | null>(null)
  const [cancelTargetMeeting, setCancelTargetMeeting] = useState<MeetingRecord | null>(null)

  // Controle de ações em lote
  const [selectedIds, setSelectedIds] = useState<string[]>([])
  const [isBatchUpdating, setIsBatchUpdating] = useState(false)
  const [isBatchCancelConfirmOpen, setIsBatchCancelConfirmOpen] = useState(false)

  const fetchMeetings = useCallback(async () => {
    try {
      setIsLoading(true)
      const res = await meetingService.getMeetings({
        status: selectedStatus,
        search: searchTerm,
        page: currentPage,
        perPage: 25,
      })

      setMeetings(res.items)
      setTotalPages(res.totalPages || 1)
      setTotalItems(res.totalItems)
    } catch (err) {
      console.error('Erro ao buscar reuniões:', err)
      toast({
        title: 'Erro ao carregar reuniões',
        description: 'Não foi possível carregar os registros de reuniões.',
        variant: 'destructive',
      })
    } finally {
      setIsLoading(false)
    }
  }, [selectedStatus, searchTerm, currentPage, toast])

  useEffect(() => {
    fetchMeetings()
  }, [fetchMeetings])

  // Inscrição Realtime para novas reuniões ou alterações
  useRealtime<MeetingRecord>('meetings', () => {
    fetchMeetings()
  })

  // Ordenação inteligente: futuras mais próximas primeiro; passadas por último
  const sortedMeetings = useMemo(() => {
    const now = new Date().getTime()
    return [...meetings].sort((a, b) => {
      const timeA = new Date(a.data_hora).getTime()
      const timeB = new Date(b.data_hora).getTime()
      const aIsFuture = timeA >= now
      const bIsFuture = timeB >= now

      if (aIsFuture && bIsFuture) {
        // Ambas no futuro: a mais próxima primeiro (ascendente)
        return timeA - timeB
      }
      if (!aIsFuture && !bIsFuture) {
        // Ambas no passado: a mais recente no passado primeiro (descendente)
        return timeB - timeA
      }
      // Reunião futura tem prioridade sobre reunião passada
      return aIsFuture ? -1 : 1
    })
  }, [meetings])

  // Pills de status coloridas:
  // pendente (amarelo/âmbar), confirmada (verde/esmeralda), cancelada (vermelho), realizada (azul)
  const getStatusBadge = (status: StatusMeeting | string) => {
    switch (status) {
      case 'pendente':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-50 text-amber-800 border border-amber-200">
            <CalendarClock className="h-3 w-3 text-amber-600" />
            Pendente
          </span>
        )
      case 'confirmada':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-800 border border-emerald-200">
            <CalendarCheck className="h-3 w-3 text-emerald-600" />
            Confirmada
          </span>
        )
      case 'cancelada':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-red-50 text-red-800 border border-red-200">
            <CalendarX className="h-3 w-3 text-red-600" />
            Cancelada
          </span>
        )
      case 'realizada':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-50 text-blue-800 border border-blue-200">
            <CheckCircle2 className="h-3 w-3 text-blue-600" />
            Realizada
          </span>
        )
      default:
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-slate-100 text-slate-700 border border-slate-200">
            {status}
          </span>
        )
    }
  }

  const handleUpdateStatus = async (meeting: MeetingRecord, newStatus: StatusMeeting) => {
    if (meeting.status === newStatus) return

    // Se estiver mudando para cancelada, pedir confirmação leve
    if (newStatus === 'cancelada') {
      setCancelTargetMeeting(meeting)
      return
    }

    await executeStatusUpdate(meeting.id, newStatus)
  }

  const executeStatusUpdate = async (id: string, newStatus: StatusMeeting) => {
    try {
      setUpdatingId(id)
      const updated = await meetingService.updateStatus(id, newStatus)

      // Atualiza estado local imediatamente
      setMeetings((prev) =>
        prev.map((m) => (m.id === id ? { ...m, status: newStatus, updated: updated.updated } : m)),
      )
      if (selectedMeeting && selectedMeeting.id === id) {
        setSelectedMeeting((prev) => (prev ? { ...prev, status: newStatus } : null))
      }

      const statusLabels: Record<StatusMeeting, string> = {
        pendente: 'Pendente',
        confirmada: 'Confirmada',
        realizada: 'Realizada',
        cancelada: 'Cancelada',
      }

      toast({
        title: 'Status atualizado',
        description: `Reunião marcada como "${statusLabels[newStatus]}".`,
      })
    } catch (err: unknown) {
      console.error('Erro ao atualizar status da reunião:', err)
      const msg = err instanceof Error ? err.message : 'Falha ao comunicar com o banco de dados.'
      toast({
        title: 'Erro ao atualizar status',
        description: msg,
        variant: 'destructive',
      })
    } finally {
      setUpdatingId(null)
    }
  }

  // IDs visíveis na tabela atual
  const visibleMeetingIds = useMemo(() => sortedMeetings.map((m) => m.id), [sortedMeetings])

  const allVisibleSelected = useMemo(() => {
    if (visibleMeetingIds.length === 0) return false
    return visibleMeetingIds.every((id) => selectedIds.includes(id))
  }, [visibleMeetingIds, selectedIds])

  const someVisibleSelected = useMemo(() => {
    return visibleMeetingIds.some((id) => selectedIds.includes(id)) && !allVisibleSelected
  }, [visibleMeetingIds, selectedIds, allVisibleSelected])

  const handleToggleSelectAll = (checked: boolean) => {
    if (checked) {
      // Adiciona todos os visíveis aos selecionados (sem duplicar)
      setSelectedIds((prev) => Array.from(new Set([...prev, ...visibleMeetingIds])))
    } else {
      // Remove todos os visíveis dos selecionados
      setSelectedIds((prev) => prev.filter((id) => !visibleMeetingIds.includes(id)))
    }
  }

  const handleToggleSelectOne = (id: string, checked: boolean) => {
    if (checked) {
      setSelectedIds((prev) => [...prev, id])
    } else {
      setSelectedIds((prev) => prev.filter((i) => i !== id))
    }
  }

  const handleClearSelection = () => {
    setSelectedIds([])
  }

  const executeBatchStatusUpdate = async (newStatus: StatusMeeting) => {
    if (selectedIds.length === 0) return

    try {
      setIsBatchUpdating(true)
      const res = await meetingService.updateStatusBatch(selectedIds, newStatus)

      const statusLabels: Record<StatusMeeting, string> = {
        pendente: 'pendente(s)',
        confirmada: 'confirmada(s)',
        realizada: 'marcada(s) como realizada(s)',
        cancelada: 'cancelada(s)',
      }

      // Atualiza localmente os que deram certo
      const successfulIds = new Set(res.results.filter((r) => r.success).map((r) => r.id))

      if (successfulIds.size > 0) {
        setMeetings((prev) =>
          prev.map((m) => (successfulIds.has(m.id) ? { ...m, status: newStatus } : m)),
        )
        if (selectedMeeting && successfulIds.has(selectedMeeting.id)) {
          setSelectedMeeting((prev) => (prev ? { ...prev, status: newStatus } : null))
        }
      }

      // Feedback resumido por toast
      if (res.failedCount === 0) {
        toast({
          title: 'Ação em lote concluída',
          description: `${res.successCount} reunião(ões) ${statusLabels[newStatus]} com sucesso.`,
        })
        setSelectedIds([])
      } else if (res.successCount === 0) {
        toast({
          title: 'Falha na ação em lote',
          description: `Todas as ${res.failedCount} atualizações falharam.`,
          variant: 'destructive',
        })
      } else {
        toast({
          title: 'Ação em lote parcialmente concluída',
          description: `${res.successCount} atualizada(s), ${res.failedCount} falhou(aram).`,
        })
        // Mantém selecionadas apenas as que falharam para o usuário poder tentar novamente
        const failedIds = res.results.filter((r) => !r.success).map((r) => r.id)
        setSelectedIds(failedIds)
      }
    } catch (err: unknown) {
      console.error('Erro na ação em lote:', err)
      toast({
        title: 'Erro na ação em lote',
        description: 'Falha ao processar a atualização em lote.',
        variant: 'destructive',
      })
    } finally {
      setIsBatchUpdating(false)
    }
  }

  const formatDateTime = (dateString: string) => {
    try {
      const d = new Date(dateString)
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

  const isFutureMeeting = (dateString: string) => {
    try {
      return new Date(dateString).getTime() >= new Date().getTime()
    } catch {
      return false
    }
  }

  return (
    <div className="space-y-6">
      {/* Header com filtros */}
      <Card className="border-slate-200 shadow-2xs bg-white">
        <CardHeader className="pb-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <CardTitle className="text-base sm:text-lg font-semibold text-slate-900 flex items-center gap-2">
                <Calendar className="h-5 w-5 text-teal-700" />
                Gestão de Reuniões Agendadas
              </CardTitle>
              <CardDescription className="text-xs text-slate-500">
                Reuniões agendadas pela ferramenta de integração com horário, assunto e status
              </CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={fetchMeetings}
                className="text-xs text-slate-600 border-slate-200 h-9"
              >
                <RefreshCw className={`h-3.5 w-3.5 mr-1.5 ${isLoading ? 'animate-spin' : ''}`} />
                Atualizar
              </Button>
            </div>
          </div>
        </CardHeader>

        <CardContent className="pt-0">
          <div className="flex flex-col sm:flex-row gap-3">
            {/* Search input */}
            <div className="relative flex-1">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
              <Input
                placeholder="Buscar por nome, empresa, e-mail ou assunto..."
                value={searchTerm}
                onChange={(e) => {
                  setSearchTerm(e.target.value)
                  setCurrentPage(1)
                }}
                className="pl-9 text-xs sm:text-sm border-slate-200"
              />
            </div>

            {/* Filter by Status */}
            <div className="w-full sm:w-60 shrink-0">
              <Select
                value={selectedStatus}
                onValueChange={(val) => {
                  setSelectedStatus(val)
                  setCurrentPage(1)
                }}
              >
                <SelectTrigger className="text-xs sm:text-sm border-slate-200">
                  <div className="flex items-center gap-2">
                    <Filter className="h-3.5 w-3.5 text-slate-500" />
                    <span>Status:</span>
                    <SelectValue />
                  </div>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todos os Status</SelectItem>
                  <SelectItem value="pendente">Pendente (Âmbar)</SelectItem>
                  <SelectItem value="confirmada">Confirmada (Verde)</SelectItem>
                  <SelectItem value="realizada">Realizada (Azul)</SelectItem>
                  <SelectItem value="cancelada">Cancelada (Vermelho)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="mt-3 flex items-center justify-between text-xs text-slate-500">
            <span className="flex items-center gap-1.5 text-[11px]">
              <Clock className="h-3.5 w-3.5 text-teal-600" />
              Ordenação: reuniões futuras mais próximas no topo, passadas por último.
            </span>
            <span className="font-mono text-[11px]">
              Total de reuniões: <strong className="text-slate-800">{totalItems}</strong>
            </span>
          </div>
        </CardContent>
      </Card>

      {/* Barra de Ações em Lote */}
      {selectedIds.length > 0 && (
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3.5 bg-teal-50/90 border border-teal-200 rounded-lg text-xs shadow-2xs animate-in fade-in duration-200">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-teal-900 flex items-center gap-1.5">
              <span className="flex h-5 w-5 items-center justify-center rounded-full bg-teal-700 text-[11px] font-bold text-white">
                {selectedIds.length}
              </span>
              <span>
                {selectedIds.length === 1 ? 'reunião selecionada' : 'reuniões selecionadas'}
              </span>
            </span>
            {isBatchUpdating && (
              <span className="text-teal-700 flex items-center gap-1 text-[11px] font-medium ml-2">
                <Loader2 className="h-3 w-3 animate-spin" /> Processando lote...
              </span>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* Confirmar */}
            <Button
              type="button"
              size="sm"
              disabled={isBatchUpdating}
              onClick={() => executeBatchStatusUpdate('confirmada')}
              className="h-8 text-xs bg-emerald-700 hover:bg-emerald-800 text-white border-0 shadow-2xs"
            >
              <CalendarCheck className="h-3.5 w-3.5 mr-1" />
              Confirmar
            </Button>

            {/* Marcar como realizada */}
            <Button
              type="button"
              size="sm"
              disabled={isBatchUpdating}
              onClick={() => executeBatchStatusUpdate('realizada')}
              className="h-8 text-xs bg-blue-700 hover:bg-blue-800 text-white border-0 shadow-2xs"
            >
              <CheckCircle2 className="h-3.5 w-3.5 mr-1" />
              Marcar como realizada
            </Button>

            {/* Cancelar selecionadas (abre modal de confirmação) */}
            <Button
              type="button"
              size="sm"
              variant="outline"
              disabled={isBatchUpdating}
              onClick={() => setIsBatchCancelConfirmOpen(true)}
              className="h-8 text-xs border-red-200 text-red-700 hover:bg-red-50 hover:border-red-300"
            >
              <CalendarX className="h-3.5 w-3.5 mr-1" />
              Cancelar selecionadas
            </Button>

            {/* Limpar seleção */}
            <Button
              type="button"
              variant="ghost"
              size="sm"
              disabled={isBatchUpdating}
              onClick={handleClearSelection}
              className="h-8 text-xs text-slate-600 hover:text-slate-900"
            >
              Limpar seleção
            </Button>
          </div>
        </div>
      )}

      {/* Tabela de Reuniões */}
      <Card className="border-slate-200 shadow-2xs bg-white overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50/80 font-medium text-slate-600 uppercase tracking-wider text-[11px]">
                <th className="py-3 px-3 w-10 text-center">
                  <Checkbox
                    checked={
                      allVisibleSelected ? true : someVisibleSelected ? 'indeterminate' : false
                    }
                    onCheckedChange={(checked) => handleToggleSelectAll(Boolean(checked))}
                    aria-label="Selecionar todas as reuniões visíveis"
                    disabled={isLoading || sortedMeetings.length === 0}
                  />
                </th>
                <th className="py-3 px-4">Contato / Empresa</th>
                <th className="py-3 px-4">Data e Hora</th>
                <th className="py-3 px-4">Assunto</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4">Observações</th>
                <th className="py-3 px-4">Criado em</th>
                <th className="py-3 px-4 text-right">Ação</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {isLoading ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-500">
                    <div className="flex items-center justify-center gap-2">
                      <Loader2 className="h-4 w-4 animate-spin text-[#0F766E]" />
                      <span>Carregando reuniões...</span>
                    </div>
                  </td>
                </tr>
              ) : sortedMeetings.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-500">
                    Nenhuma reunião agendada encontrada para os critérios selecionados.
                  </td>
                </tr>
              ) : (
                sortedMeetings.map((meeting) => {
                  const isFuture = isFutureMeeting(meeting.data_hora)
                  const isSelected = selectedIds.includes(meeting.id)
                  return (
                    <tr
                      key={meeting.id}
                      onClick={() => setSelectedMeeting(meeting)}
                      className={`transition-colors cursor-pointer group ${
                        isSelected ? 'bg-teal-50/40 hover:bg-teal-50/60' : 'hover:bg-slate-50/80'
                      }`}
                    >
                      {/* Checkbox de Seleção */}
                      <td
                        className="py-3 px-3 text-center whitespace-nowrap"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <Checkbox
                          checked={isSelected}
                          onCheckedChange={(checked) =>
                            handleToggleSelectOne(meeting.id, Boolean(checked))
                          }
                          aria-label={`Selecionar reunião de ${meeting.nome}`}
                        />
                      </td>

                      {/* Contato / Empresa */}
                      <td className="py-3 px-4">
                        <div className="font-semibold text-slate-900 group-hover:text-teal-800 transition-colors">
                          {meeting.nome}
                        </div>
                        <div className="text-[11px] text-slate-500 flex items-center gap-1.5 mt-0.5">
                          <Building className="h-3 w-3 text-slate-400" />
                          <span>{meeting.empresa}</span>
                        </div>
                        <div className="text-[11px] text-slate-500 flex items-center gap-2 mt-0.5">
                          <span className="flex items-center gap-1 font-mono">
                            <Mail className="h-3 w-3 text-slate-400" />
                            {meeting.email}
                          </span>
                          {meeting.telefone && (
                            <span className="flex items-center gap-1 font-mono text-slate-400">
                              • <Phone className="h-3 w-3" /> {meeting.telefone}
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Data e Hora */}
                      <td className="py-3 px-4 whitespace-nowrap">
                        <div className="flex items-center gap-1.5 font-medium text-slate-900">
                          <Calendar className="h-3.5 w-3.5 text-teal-700" />
                          <span className="font-mono text-xs">
                            {formatDateTime(meeting.data_hora)}
                          </span>
                        </div>
                        <div className="text-[10px] mt-0.5 font-mono">
                          {isFuture ? (
                            <span className="text-emerald-700 font-semibold">• No futuro</span>
                          ) : (
                            <span className="text-slate-400">• Já ocorreu</span>
                          )}
                        </div>
                      </td>

                      {/* Assunto */}
                      <td className="py-3 px-4 max-w-xs">
                        <p
                          className="font-medium text-slate-800 text-xs truncate"
                          title={meeting.assunto}
                        >
                          {meeting.assunto}
                        </p>
                      </td>

                      {/* Status + Ação rápida inline */}
                      <td
                        className="py-3 px-4 whitespace-nowrap"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <div className="flex items-center gap-2">
                          <Select
                            value={meeting.status}
                            disabled={updatingId === meeting.id}
                            onValueChange={(val) =>
                              handleUpdateStatus(meeting, val as StatusMeeting)
                            }
                          >
                            <SelectTrigger className="h-7 text-xs border-slate-200 w-[130px] bg-white font-medium">
                              {updatingId === meeting.id ? (
                                <span className="flex items-center gap-1.5 text-slate-500">
                                  <Loader2 className="h-3 w-3 animate-spin" />
                                  Salvando...
                                </span>
                              ) : (
                                <SelectValue>{getStatusBadge(meeting.status)}</SelectValue>
                              )}
                            </SelectTrigger>
                            <SelectContent onClick={(e) => e.stopPropagation()}>
                              <SelectItem value="pendente">
                                <span className="flex items-center gap-1.5 text-xs text-amber-700">
                                  <CalendarClock className="h-3 w-3 text-amber-600" />
                                  Pendente
                                </span>
                              </SelectItem>
                              <SelectItem value="confirmada">
                                <span className="flex items-center gap-1.5 text-xs text-emerald-700">
                                  <CalendarCheck className="h-3 w-3 text-emerald-600" />
                                  Confirmada
                                </span>
                              </SelectItem>
                              <SelectItem value="realizada">
                                <span className="flex items-center gap-1.5 text-xs text-blue-700">
                                  <CheckCircle2 className="h-3 w-3 text-blue-600" />
                                  Realizada
                                </span>
                              </SelectItem>
                              <SelectItem value="cancelada">
                                <span className="flex items-center gap-1.5 text-xs text-red-700">
                                  <CalendarX className="h-3 w-3 text-red-600" />
                                  Cancelada
                                </span>
                              </SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </td>

                      {/* Observações truncadas com Tooltip */}
                      <td className="py-3 px-4 max-w-[200px]">
                        {meeting.observacoes ? (
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <p className="text-slate-600 truncate text-[11px] cursor-help underline decoration-dotted decoration-slate-300">
                                {meeting.observacoes}
                              </p>
                            </TooltipTrigger>
                            <TooltipContent className="max-w-xs bg-slate-900 text-white text-xs p-2">
                              <p className="whitespace-pre-wrap">{meeting.observacoes}</p>
                            </TooltipContent>
                          </Tooltip>
                        ) : (
                          <span className="text-slate-400 text-[11px]">—</span>
                        )}
                      </td>

                      {/* Criado em */}
                      <td className="py-3 px-4 text-slate-500 font-mono text-[11px] whitespace-nowrap">
                        {formatDateTime(meeting.created)}
                      </td>

                      {/* Ação */}
                      <td className="py-3 px-4 text-right whitespace-nowrap">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation()
                            setSelectedMeeting(meeting)
                          }}
                          className="h-8 text-xs text-teal-800 hover:text-teal-900 hover:bg-teal-50"
                        >
                          <Eye className="h-3.5 w-3.5 mr-1" />
                          Ver Detalhes
                        </Button>
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Paginação */}
        <div className="flex items-center justify-between px-4 py-3 border-t border-slate-100 bg-slate-50/50 text-xs text-slate-600">
          <div>
            Página <span className="font-semibold text-slate-900">{currentPage}</span> de{' '}
            <span className="font-semibold text-slate-900">{totalPages}</span>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={currentPage <= 1 || isLoading}
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              className="h-8 text-xs border-slate-200"
            >
              <ChevronLeft className="h-3.5 w-3.5 mr-1" />
              Anterior
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={currentPage >= totalPages || isLoading}
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              className="h-8 text-xs border-slate-200"
            >
              Próximo
              <ChevronRight className="h-3.5 w-3.5 ml-1" />
            </Button>
          </div>
        </div>
      </Card>

      {/* Drawer de Detalhe Completo da Reunião */}
      <Sheet open={!!selectedMeeting} onOpenChange={(open) => !open && setSelectedMeeting(null)}>
        <SheetContent className="sm:max-w-xl w-full overflow-y-auto bg-white p-6">
          {selectedMeeting && (
            <div className="space-y-6">
              <SheetHeader className="text-left space-y-1 border-b border-slate-100 pb-4">
                <div className="flex items-center justify-between">
                  <Badge
                    variant="outline"
                    className="font-mono text-[11px] text-teal-800 bg-teal-50 border-teal-200"
                  >
                    ID: {selectedMeeting.id}
                  </Badge>
                  {getStatusBadge(selectedMeeting.status)}
                </div>
                <SheetTitle className="text-xl font-bold text-slate-900">
                  {selectedMeeting.assunto}
                </SheetTitle>
                <SheetDescription className="text-xs text-slate-500 flex items-center gap-1.5">
                  <Building className="h-3.5 w-3.5 text-slate-400" />
                  {selectedMeeting.empresa} • {selectedMeeting.nome}
                </SheetDescription>
              </SheetHeader>

              {/* Card de Gestão de Status Operacional */}
              <div className="p-4 rounded-lg bg-slate-50 border border-slate-200 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-slate-800 flex items-center gap-1.5">
                    <Clock className="h-4 w-4 text-teal-700" />
                    Alterar Status da Reunião
                  </span>
                  {updatingId === selectedMeeting.id && (
                    <span className="text-[11px] text-teal-700 flex items-center gap-1 font-medium">
                      <Loader2 className="h-3 w-3 animate-spin" /> Atualizando...
                    </span>
                  )}
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  <Button
                    type="button"
                    variant={selectedMeeting.status === 'pendente' ? 'default' : 'outline'}
                    size="sm"
                    disabled={updatingId === selectedMeeting.id}
                    onClick={() => handleUpdateStatus(selectedMeeting, 'pendente')}
                    className={`h-9 text-xs justify-center ${
                      selectedMeeting.status === 'pendente'
                        ? 'bg-amber-600 hover:bg-amber-700 text-white border-amber-600'
                        : 'border-slate-200 hover:border-amber-300 hover:text-amber-800 text-slate-700'
                    }`}
                  >
                    <CalendarClock className="h-3.5 w-3.5 mr-1" />
                    Pendente
                  </Button>

                  <Button
                    type="button"
                    variant={selectedMeeting.status === 'confirmada' ? 'default' : 'outline'}
                    size="sm"
                    disabled={updatingId === selectedMeeting.id}
                    onClick={() => handleUpdateStatus(selectedMeeting, 'confirmada')}
                    className={`h-9 text-xs justify-center ${
                      selectedMeeting.status === 'confirmada'
                        ? 'bg-emerald-600 hover:bg-emerald-700 text-white border-emerald-600'
                        : 'border-slate-200 hover:border-emerald-300 hover:text-emerald-800 text-slate-700'
                    }`}
                  >
                    <CalendarCheck className="h-3.5 w-3.5 mr-1" />
                    Confirmada
                  </Button>

                  <Button
                    type="button"
                    variant={selectedMeeting.status === 'realizada' ? 'default' : 'outline'}
                    size="sm"
                    disabled={updatingId === selectedMeeting.id}
                    onClick={() => handleUpdateStatus(selectedMeeting, 'realizada')}
                    className={`h-9 text-xs justify-center ${
                      selectedMeeting.status === 'realizada'
                        ? 'bg-blue-600 hover:bg-blue-700 text-white border-blue-600'
                        : 'border-slate-200 hover:border-blue-300 hover:text-blue-800 text-slate-700'
                    }`}
                  >
                    <CheckCircle2 className="h-3.5 w-3.5 mr-1" />
                    Realizada
                  </Button>

                  <Button
                    type="button"
                    variant={selectedMeeting.status === 'cancelada' ? 'default' : 'outline'}
                    size="sm"
                    disabled={updatingId === selectedMeeting.id}
                    onClick={() => handleUpdateStatus(selectedMeeting, 'cancelada')}
                    className={`h-9 text-xs justify-center ${
                      selectedMeeting.status === 'cancelada'
                        ? 'bg-red-600 hover:bg-red-700 text-white border-red-600'
                        : 'border-slate-200 hover:border-red-300 hover:text-red-800 text-slate-700'
                    }`}
                  >
                    <CalendarX className="h-3.5 w-3.5 mr-1" />
                    Cancelada
                  </Button>
                </div>
              </div>

              {/* Data e Horário em Destaque */}
              <div className="p-4 rounded-lg bg-teal-50/70 border border-teal-200 space-y-1">
                <span className="text-xs font-semibold text-teal-900 flex items-center gap-1.5">
                  <Calendar className="h-4 w-4 text-teal-700" />
                  Data e Horário Agendado:
                </span>
                <p className="text-base font-bold text-teal-950 font-mono">
                  {formatDateTime(selectedMeeting.data_hora)}
                </p>
                <p className="text-[11px] text-teal-800">
                  {isFutureMeeting(selectedMeeting.data_hora)
                    ? 'Reunião prevista no fuso local'
                    : 'Reunião já transcorrida'}
                </p>
              </div>

              {/* Informações de Contato */}
              <div className="space-y-3">
                <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                  Dados do Participante
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                  <div className="p-3 rounded-lg border border-slate-200 bg-white">
                    <span className="text-slate-400 block mb-0.5">Nome completo:</span>
                    <span className="font-medium text-slate-800">{selectedMeeting.nome}</span>
                  </div>
                  <div className="p-3 rounded-lg border border-slate-200 bg-white">
                    <span className="text-slate-400 block mb-0.5">Empresa:</span>
                    <span className="font-medium text-slate-800 flex items-center gap-1.5">
                      <Building className="h-3.5 w-3.5 text-slate-400" />
                      {selectedMeeting.empresa}
                    </span>
                  </div>
                  <div className="p-3 rounded-lg border border-slate-200 bg-white">
                    <span className="text-slate-400 block mb-0.5">E-mail:</span>
                    <a
                      href={`mailto:${selectedMeeting.email}`}
                      className="font-medium text-teal-800 hover:underline flex items-center gap-1.5"
                    >
                      <Mail className="h-3.5 w-3.5 text-teal-600" />
                      {selectedMeeting.email}
                    </a>
                  </div>
                  <div className="p-3 rounded-lg border border-slate-200 bg-white">
                    <span className="text-slate-400 block mb-0.5">Telefone:</span>
                    <span className="font-medium text-slate-800 flex items-center gap-1.5">
                      <Phone className="h-3.5 w-3.5 text-slate-400" />
                      {selectedMeeting.telefone || 'Não informado'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Detalhes do Assunto e Observações */}
              <div className="space-y-3">
                <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                  Pauta e Observações
                </h4>
                <div className="space-y-2 text-xs">
                  <div className="p-3 rounded-lg border border-slate-200 bg-white space-y-1">
                    <span className="font-semibold text-slate-700 flex items-center gap-1.5">
                      <FileText className="h-3.5 w-3.5 text-teal-700" />
                      Assunto da Reunião:
                    </span>
                    <p className="text-slate-800 font-medium leading-relaxed">
                      {selectedMeeting.assunto}
                    </p>
                  </div>

                  <div className="p-3 rounded-lg border border-slate-200 bg-white space-y-1">
                    <span className="font-semibold text-slate-700 flex items-center gap-1.5">
                      <Info className="h-3.5 w-3.5 text-slate-500" />
                      Observações / Pauta Adicional:
                    </span>
                    <p className="text-slate-600 whitespace-pre-wrap leading-relaxed">
                      {selectedMeeting.observacoes || 'Nenhuma observação informada.'}
                    </p>
                  </div>
                </div>
              </div>

              {/* Metadados Técnicos */}
              <div className="pt-3 border-t border-slate-200 flex flex-wrap items-center justify-between text-[11px] text-slate-400 font-mono">
                <span>Request ID: {selectedMeeting.request_id || 'manual'}</span>
                <span>Criado em: {formatDateTime(selectedMeeting.created)}</span>
              </div>
            </div>
          )}
        </SheetContent>
      </Sheet>

      {/* Confirmação de Cancelamento de Reunião */}
      <AlertDialog
        open={!!cancelTargetMeeting}
        onOpenChange={(open) => !open && setCancelTargetMeeting(null)}
      >
        <AlertDialogContent className="bg-white">
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2 text-slate-900">
              <AlertTriangle className="h-5 w-5 text-red-600" />
              Cancelar esta reunião?
            </AlertDialogTitle>
            <AlertDialogDescription className="text-xs text-slate-600 space-y-2">
              <p>
                A reunião com <strong>{cancelTargetMeeting?.nome}</strong> (
                {cancelTargetMeeting?.empresa}) agendada para{' '}
                <strong>
                  {cancelTargetMeeting ? formatDateTime(cancelTargetMeeting.data_hora) : ''}
                </strong>{' '}
                será marcada como <strong>Cancelada</strong>.
              </p>
              <p className="text-slate-500">
                O selo de reunião associado a este lead na tela de Leads não terá mais prioridade de
                destaque e a reunião será exibida com status vermelho.
              </p>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="text-xs">Voltar</AlertDialogCancel>
            <AlertDialogAction
              className="bg-red-600 hover:bg-red-700 text-white text-xs"
              onClick={() => {
                if (cancelTargetMeeting) {
                  executeStatusUpdate(cancelTargetMeeting.id, 'cancelada')
                  setCancelTargetMeeting(null)
                }
              }}
            >
              Confirmar Cancelamento
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Confirmação de Cancelamento em Lote */}
      <AlertDialog
        open={isBatchCancelConfirmOpen}
        onOpenChange={(open) => !open && setIsBatchCancelConfirmOpen(false)}
      >
        <AlertDialogContent className="bg-white">
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2 text-slate-900">
              <AlertTriangle className="h-5 w-5 text-red-600" />
              Cancelar {selectedIds.length}{' '}
              {selectedIds.length === 1 ? 'reunião selecionada' : 'reuniões selecionadas'}?
            </AlertDialogTitle>
            <AlertDialogDescription className="text-xs text-slate-600 space-y-2">
              <p>
                As <strong>{selectedIds.length}</strong> reuniões atualmente selecionadas serão
                marcadas como <strong>Canceladas</strong>.
              </p>
              <p className="text-slate-500">
                O selo de reunião associado a estes leads na tela de Leads não terá mais prioridade
                de destaque e as reuniões serão exibidas com status cancelado (vermelho).
              </p>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="text-xs" disabled={isBatchUpdating}>
              Voltar
            </AlertDialogCancel>
            <AlertDialogAction
              className="bg-red-600 hover:bg-red-700 text-white text-xs"
              disabled={isBatchUpdating}
              onClick={async () => {
                setIsBatchCancelConfirmOpen(false)
                await executeBatchStatusUpdate('cancelada')
              }}
            >
              Confirmar Cancelamento em Lote
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
