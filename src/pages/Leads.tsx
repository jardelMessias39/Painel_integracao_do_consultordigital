import { useEffect, useState, useCallback } from 'react'
import {
  Search,
  Filter,
  Eye,
  RefreshCw,
  Building,
  Mail,
  Phone,
  Calendar,
  Layers,
  ArrowUpDown,
  Tag,
  CheckCircle,
  FileText,
  HelpCircle,
  Send,
  Loader2,
} from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
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
import { leadService } from '@/services/leadService'
import { useRealtime } from '@/hooks/use-realtime'
import type { LeadRecord, EstagioLead } from '@/types/integration'
import { useToast } from '@/hooks/use-toast'

export default function Leads() {
  const { toast } = useToast()

  const [leads, setLeads] = useState<LeadRecord[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedEstagio, setSelectedEstagio] = useState<string>('todos')
  const [selectedLead, setSelectedLead] = useState<LeadRecord | null>(null)
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false)

  const fetchLeads = useCallback(async () => {
    try {
      setIsLoading(true)
      const res = await leadService.getLeads({
        estagio: selectedEstagio,
        search: searchTerm,
        perPage: 100,
      })
      setLeads(res.items)
    } catch (err) {
      console.error('Erro ao buscar leads:', err)
      toast({
        title: 'Erro ao carregar leads',
        description: 'Não foi possível carregar os registros de leads.',
        variant: 'destructive',
      })
    } finally {
      setIsLoading(false)
    }
  }, [selectedEstagio, searchTerm, toast])

  useEffect(() => {
    fetchLeads()
  }, [fetchLeads])

  // Inscrição Realtime para novos leads
  useRealtime<LeadRecord>('leads', () => {
    fetchLeads()
  })

  const handleUpdateStatus = async (newEstagio: EstagioLead) => {
    if (!selectedLead) return

    try {
      setIsUpdatingStatus(true)
      const updated = await leadService.updateLeadEstagio(selectedLead.id, newEstagio)
      setSelectedLead(updated)
      setLeads((prev) => prev.map((l) => (l.id === updated.id ? updated : l)))
      toast({
        title: 'Estágio atualizado',
        description: `O estágio do lead foi alterado para "${newEstagio}".`,
      })
    } catch (err) {
      console.error('Erro ao atualizar estágio do lead:', err)
      toast({
        title: 'Erro ao atualizar estágio',
        description: 'Não foi possível alterar o estágio do lead.',
        variant: 'destructive',
      })
    } finally {
      setIsUpdatingStatus(false)
    }
  }

  // Pills coloridas conforme decisão de arquitetura:
  // novo (azul), qualificado (verde), proposta (roxo), descartado (cinza)
  const getEstagioBadge = (estagio: string) => {
    switch (estagio) {
      case 'novo':
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-100 text-blue-800 border border-blue-200">
            Novo
          </span>
        )
      case 'qualificado':
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800 border border-emerald-200">
            Qualificado
          </span>
        )
      case 'proposta':
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-purple-100 text-purple-800 border border-purple-200">
            Proposta
          </span>
        )
      case 'descartado':
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-slate-100 text-slate-700 border border-slate-300">
            Descartado
          </span>
        )
      default:
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-slate-100 text-slate-700 border border-slate-200">
            {estagio}
          </span>
        )
    }
  }

  return (
    <div className="space-y-6">
      {/* Header com filtros */}
      <Card className="border-slate-200 shadow-2xs bg-white">
        <CardHeader className="pb-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <CardTitle className="text-base sm:text-lg font-semibold text-slate-900">
                Gestão de Leads Qualificados
              </CardTitle>
              <CardDescription className="text-xs text-slate-500">
                Leads criados pela ferramenta server-to-server com validação Zod e idempotência
              </CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={fetchLeads}
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
                placeholder="Buscar por nome, empresa ou e-mail..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9 text-xs sm:text-sm border-slate-200"
              />
            </div>

            {/* Filter by Estágio */}
            <div className="w-full sm:w-56 shrink-0">
              <Select value={selectedEstagio} onValueChange={setSelectedEstagio}>
                <SelectTrigger className="text-xs sm:text-sm border-slate-200">
                  <div className="flex items-center gap-2">
                    <Filter className="h-3.5 w-3.5 text-slate-500" />
                    <span>Estágio:</span>
                    <SelectValue />
                  </div>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todos os Estágios</SelectItem>
                  <SelectItem value="novo">Novo (Azul)</SelectItem>
                  <SelectItem value="qualificado">Qualificado (Verde)</SelectItem>
                  <SelectItem value="proposta">Proposta (Roxo)</SelectItem>
                  <SelectItem value="descartado">Descartado (Cinza)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Tabela de Leads */}
      <Card className="border-slate-200 shadow-2xs bg-white overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50/80 font-medium text-slate-600 uppercase tracking-wider text-[11px]">
                <th className="py-3 px-4">Lead / Contato</th>
                <th className="py-3 px-4">Empresa</th>
                <th className="py-3 px-4">Estágio</th>
                <th className="py-3 px-4">Necessidade Identificada</th>
                <th className="py-3 px-4">Recebido em</th>
                <th className="py-3 px-4 text-right">Ação</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {isLoading ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-slate-500">
                    <div className="flex items-center justify-center gap-2">
                      <Loader2 className="h-4 w-4 animate-spin text-[#0F766E]" />
                      <span>Carregando leads...</span>
                    </div>
                  </td>
                </tr>
              ) : leads.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-slate-500">
                    Nenhum lead encontrado para os critérios selecionados.
                  </td>
                </tr>
              ) : (
                leads.map((lead) => (
                  <tr
                    key={lead.id}
                    onClick={() => setSelectedLead(lead)}
                    className="hover:bg-slate-50/80 transition-colors cursor-pointer group"
                  >
                    <td className="py-3 px-4">
                      <div className="font-semibold text-slate-900 group-hover:text-teal-800 transition-colors">
                        {lead.nome}
                      </div>
                      <div className="text-[11px] text-slate-500 flex items-center gap-2 mt-0.5">
                        <span className="flex items-center gap-1 font-mono">
                          <Mail className="h-3 w-3 text-slate-400" />
                          {lead.email}
                        </span>
                        {lead.telefone && (
                          <span className="flex items-center gap-1 font-mono text-slate-400">
                            • <Phone className="h-3 w-3" /> {lead.telefone}
                          </span>
                        )}
                      </div>
                    </td>

                    <td className="py-3 px-4">
                      <span className="font-medium text-slate-800 flex items-center gap-1.5">
                        <Building className="h-3.5 w-3.5 text-slate-400" />
                        {lead.empresa}
                      </span>
                    </td>

                    <td className="py-3 px-4">{getEstagioBadge(lead.estagio_do_lead)}</td>

                    <td className="py-3 px-4 max-w-xs">
                      <p
                        className="text-slate-600 truncate text-[11px]"
                        title={lead.necessidade_identificada || 'Não informada'}
                      >
                        {lead.necessidade_identificada || '—'}
                      </p>
                    </td>

                    <td className="py-3 px-4 text-slate-500 font-mono text-[11px] whitespace-nowrap">
                      {new Date(lead.created).toLocaleDateString('pt-BR', {
                        day: '2-digit',
                        month: '2-digit',
                        year: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </td>

                    <td className="py-3 px-4 text-right">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation()
                          setSelectedLead(lead)
                        }}
                        className="h-8 text-xs text-teal-800 hover:text-teal-900 hover:bg-teal-50"
                      >
                        <Eye className="h-3.5 w-3.5 mr-1" />
                        Ver Detalhes
                      </Button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Drawer de Detalhe Completo do Lead */}
      <Sheet open={!!selectedLead} onOpenChange={(open) => !open && setSelectedLead(null)}>
        <SheetContent className="sm:max-w-xl w-full overflow-y-auto bg-white p-6">
          {selectedLead && (
            <div className="space-y-6">
              <SheetHeader className="text-left space-y-1 border-b border-slate-100 pb-4">
                <div className="flex items-center justify-between">
                  <Badge
                    variant="outline"
                    className="font-mono text-[11px] text-teal-800 bg-teal-50 border-teal-200"
                  >
                    Lead ID: {selectedLead.id}
                  </Badge>
                  {getEstagioBadge(selectedLead.estagio_do_lead)}
                </div>
                <SheetTitle className="text-xl font-bold text-slate-900">
                  {selectedLead.nome}
                </SheetTitle>
                <SheetDescription className="text-xs text-slate-500 flex items-center gap-1.5">
                  <Building className="h-3.5 w-3.5 text-slate-400" />
                  {selectedLead.empresa}
                </SheetDescription>
              </SheetHeader>

              {/* Ação rápida: Alterar Estágio do Lead */}
              <div className="p-4 rounded-lg bg-slate-50 border border-slate-200 space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-semibold text-slate-700 flex items-center gap-1.5">
                    <Tag className="h-3.5 w-3.5 text-teal-700" />
                    Alterar Estágio Comercial:
                  </label>
                  {isUpdatingStatus && (
                    <span className="text-[11px] text-teal-700 flex items-center gap-1">
                      <Loader2 className="h-3 w-3 animate-spin" /> Atualizando...
                    </span>
                  )}
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {(['novo', 'qualificado', 'proposta', 'descartado'] as EstagioLead[]).map(
                    (st) => (
                      <Button
                        key={st}
                        type="button"
                        variant={selectedLead.estagio_do_lead === st ? 'default' : 'outline'}
                        size="sm"
                        disabled={isUpdatingStatus}
                        onClick={() => handleUpdateStatus(st)}
                        className={`text-xs capitalize h-8 ${
                          selectedLead.estagio_do_lead === st
                            ? 'bg-[#0F766E] text-white hover:bg-[#115E59]'
                            : 'border-slate-200 text-slate-700 hover:bg-slate-100'
                        }`}
                      >
                        {st}
                      </Button>
                    ),
                  )}
                </div>
              </div>

              {/* Informações de Contato */}
              <div className="space-y-3">
                <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                  Dados de Contato
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                  <div className="p-3 rounded-lg border border-slate-200 bg-white">
                    <span className="text-slate-400 block mb-0.5">E-mail:</span>
                    <a
                      href={`mailto:${selectedLead.email}`}
                      className="font-medium text-teal-800 hover:underline flex items-center gap-1.5"
                    >
                      <Mail className="h-3.5 w-3.5 text-teal-600" />
                      {selectedLead.email}
                    </a>
                  </div>
                  <div className="p-3 rounded-lg border border-slate-200 bg-white">
                    <span className="text-slate-400 block mb-0.5">Telefone:</span>
                    <span className="font-medium text-slate-800 flex items-center gap-1.5">
                      <Phone className="h-3.5 w-3.5 text-slate-400" />
                      {selectedLead.telefone || 'Não informado'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Informações Contextuais do Consultor Digital */}
              <div className="space-y-3">
                <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                  Diagnóstico e Triagem da IA
                </h4>

                {/* Necessidade & Problema */}
                <div className="space-y-2 text-xs">
                  <div className="p-3 rounded-lg border border-slate-200 bg-white space-y-1">
                    <span className="font-semibold text-slate-700 flex items-center gap-1.5">
                      <HelpCircle className="h-3.5 w-3.5 text-teal-700" />
                      Necessidade Identificada:
                    </span>
                    <p className="text-slate-600 whitespace-pre-wrap leading-relaxed">
                      {selectedLead.necessidade_identificada || 'Nenhuma necessidade registrada.'}
                    </p>
                  </div>

                  <div className="p-3 rounded-lg border border-slate-200 bg-white space-y-1">
                    <span className="font-semibold text-slate-700 flex items-center gap-1.5">
                      <FileText className="h-3.5 w-3.5 text-amber-600" />
                      Problema Relatado:
                    </span>
                    <p className="text-slate-600 whitespace-pre-wrap leading-relaxed">
                      {selectedLead.problema_relatado || 'Nenhum problema relatado.'}
                    </p>
                  </div>

                  <div className="p-3 rounded-lg border border-slate-200 bg-white space-y-1">
                    <span className="font-semibold text-slate-700 flex items-center gap-1.5">
                      <CheckCircle className="h-3.5 w-3.5 text-blue-600" />
                      Requisitos Técnicos / Negócio:
                    </span>
                    <p className="text-slate-600 whitespace-pre-wrap leading-relaxed">
                      {selectedLead.requisitos || 'Sem requisitos adicionais.'}
                    </p>
                  </div>

                  <div className="p-3 rounded-lg border border-slate-200 bg-white space-y-1">
                    <span className="font-semibold text-slate-700 flex items-center gap-1.5">
                      <Send className="h-3.5 w-3.5 text-emerald-600" />
                      Solução Sugerida pelo Consultor:
                    </span>
                    <p className="text-slate-600 whitespace-pre-wrap leading-relaxed">
                      {selectedLead.solucao_sugerida || 'Nenhuma solução estruturada sugerida.'}
                    </p>
                  </div>

                  {selectedLead.proximo_passo && (
                    <div className="p-3 rounded-lg border border-teal-200 bg-teal-50/70 space-y-1">
                      <span className="font-semibold text-teal-900 flex items-center gap-1.5">
                        Próximo Passo Comercial:
                      </span>
                      <p className="text-teal-800 font-medium leading-relaxed">
                        {selectedLead.proximo_passo}
                      </p>
                    </div>
                  )}

                  {selectedLead.resumo_conversa && (
                    <div className="p-3 rounded-lg border border-slate-200 bg-slate-50 space-y-1">
                      <span className="font-semibold text-slate-700">
                        Resumo da Conversa no Chatbot:
                      </span>
                      <p className="text-slate-600 text-[11px] leading-relaxed whitespace-pre-wrap font-sans">
                        {selectedLead.resumo_conversa}
                      </p>
                    </div>
                  )}
                </div>
              </div>

              {/* Metadados Técnicos */}
              <div className="pt-3 border-t border-slate-200 flex flex-wrap items-center justify-between text-[11px] text-slate-400 font-mono">
                <span>Request ID: {selectedLead.request_id || 'manual'}</span>
                <span>Criado em: {new Date(selectedLead.created).toLocaleString('pt-BR')}</span>
              </div>
            </div>
          )}
        </SheetContent>
      </Sheet>
    </div>
  )
}
