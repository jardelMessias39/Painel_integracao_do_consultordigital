import { useEffect, useState, useMemo, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Users,
  Calendar,
  CheckCircle2,
  ShieldAlert,
  ArrowRight,
  TrendingUp,
  Clock,
  ExternalLink,
  RefreshCw,
  Wrench,
  Check,
  Copy,
} from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { leadService } from '@/services/leadService'
import { toolLogService } from '@/services/toolLogService'
import { toolRegistryList, INTEGRATION_CONFIG } from '@/services/toolRegistry'
import { useRealtime } from '@/hooks/use-realtime'
import type { LeadRecord, ToolLogRecord, EstagioLead } from '@/types/integration'
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  CartesianGrid,
} from 'recharts'
import { useToast } from '@/hooks/use-toast'

export default function Index() {
  const navigate = useNavigate()
  const { toast } = useToast()

  const [isLoading, setIsLoading] = useState(true)
  const [leadStats, setLeadStats] = useState({ total: 0, today: 0 })
  const [metrics, setMetrics] = useState({ total: 0, success: 0, rateLimited: 0, successRate: 100 })
  const [recentLogs, setRecentLogs] = useState<ToolLogRecord[]>([])
  const [allLeads, setAllLeads] = useState<LeadRecord[]>([])
  const [copiedKey, setCopiedKey] = useState(false)

  const loadData = useCallback(async () => {
    try {
      setIsLoading(true)
      const [stats, met, logsRes, leadsRes] = await Promise.all([
        leadService.getStats(),
        toolLogService.getMetrics(),
        toolLogService.getRecentLogs(5),
        leadService.getLeads({ perPage: 100 }),
      ])
      setLeadStats(stats)
      setMetrics(met)
      setRecentLogs(logsRes.items)
      setAllLeads(leadsRes.items)
    } catch (err) {
      console.error('Erro ao carregar dados do dashboard:', err)
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    loadData()
  }, [loadData])

  // Inscrições Realtime em leads e tool_logs
  useRealtime<LeadRecord>('leads', () => {
    loadData()
  })

  useRealtime<ToolLogRecord>('tool_logs', () => {
    loadData()
  })

  // Agrupamento para o gráfico dos últimos 7 dias por estágio
  const chartData = useMemo(() => {
    const days: Record<
      string,
      { data: string; novo: number; qualificado: number; proposta: number; descartado: number }
    > = {}

    // Gera os últimos 7 dias
    for (let i = 6; i >= 0; i--) {
      const d = new Date()
      d.setDate(d.getDate() - i)
      const key = d.toISOString().slice(0, 10)
      const label = d.toLocaleDateString('pt-BR', {
        weekday: 'short',
        day: '2-digit',
        month: '2-digit',
      })
      days[key] = {
        data: label,
        novo: 0,
        qualificado: 0,
        proposta: 0,
        descartado: 0,
      }
    }

    // Popula com os leads carregados
    allLeads.forEach((lead) => {
      if (!lead.created) return
      const dateKey = lead.created.slice(0, 10)
      if (days[dateKey]) {
        const estagio = (lead.estagio_do_lead || 'novo') as EstagioLead
        if (days[dateKey][estagio] !== undefined) {
          days[dateKey][estagio] += 1
        }
      }
    })

    return Object.values(days)
  }, [allLeads])

  const copyApiKey = () => {
    navigator.clipboard.writeText(INTEGRATION_CONFIG.defaultApiKey)
    setCopiedKey(true)
    toast({
      title: 'Chave copiada!',
      description: 'Chave de API do Consultor Digital copiada para a área de transferência.',
    })
    setTimeout(() => setCopiedKey(false), 2500)
  }

  return (
    <div className="space-y-6">
      {/* Welcome Banner */}
      <div className="rounded-xl border border-teal-200 bg-gradient-to-r from-teal-900 via-teal-800 to-slate-900 p-6 text-white shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <Badge className="bg-teal-500/20 text-teal-200 border-teal-400/30 text-xs">
              Camada de Integração v1
            </Badge>
            <span className="text-xs text-teal-300">• PocketBase Server-to-Server</span>
          </div>
          <h2 className="text-xl sm:text-2xl font-bold tracking-tight">
            Consultor Digital — Painel Operacional
          </h2>
          <p className="text-sm text-teal-100 max-w-2xl leading-relaxed">
            API exposta para o backend do seu chatbot cadastrar leads qualificados via ferramenta
            única padronizada{' '}
            <code className="bg-teal-950/60 px-1.5 py-0.5 rounded text-teal-200 font-mono text-xs">
              create_lead
            </code>
            .
          </p>
        </div>

        <div className="flex items-center gap-2 self-stretch md:self-auto shrink-0">
          <Button
            variant="outline"
            size="sm"
            onClick={copyApiKey}
            className="bg-white/10 hover:bg-white/20 text-white border-white/20 text-xs flex items-center gap-1.5"
          >
            {copiedKey ? (
              <Check className="h-3.5 w-3.5 text-emerald-300" />
            ) : (
              <Copy className="h-3.5 w-3.5" />
            )}
            <span>{copiedKey ? 'Copiado!' : 'Copiar API Key'}</span>
          </Button>

          <Button
            size="sm"
            onClick={() => navigate('/leads')}
            className="bg-white hover:bg-teal-50 text-teal-900 text-xs font-semibold flex items-center gap-1.5"
          >
            <span>Ver Leads</span>
            <ArrowRight className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>

      {/* 4 Stats Cards Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total de Leads */}
        <Card className="border-slate-200 shadow-2xs hover:shadow-sm transition-all bg-white">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-medium text-slate-500 uppercase tracking-wider">
              Total de Leads
            </CardTitle>
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-teal-50 text-[#0F766E]">
              <Users className="h-4 w-4" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-slate-900">{leadStats.total}</div>
            <p className="text-[11px] text-slate-500 mt-1 flex items-center gap-1">
              <TrendingUp className="h-3 w-3 text-teal-600" />
              <span>Base consolidada de contatos</span>
            </p>
          </CardContent>
        </Card>

        {/* Leads Hoje */}
        <Card className="border-slate-200 shadow-2xs hover:shadow-sm transition-all bg-white">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-medium text-slate-500 uppercase tracking-wider">
              Leads Hoje
            </CardTitle>
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-50 text-blue-600">
              <Calendar className="h-4 w-4" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-slate-900">{leadStats.today}</div>
            <p className="text-[11px] text-slate-500 mt-1">Registrados nas últimas 24 horas</p>
          </CardContent>
        </Card>

        {/* Taxa de Sucesso */}
        <Card className="border-slate-200 shadow-2xs hover:shadow-sm transition-all bg-white">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-medium text-slate-500 uppercase tracking-wider">
              Taxa de Sucesso
            </CardTitle>
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-50 text-emerald-600">
              <CheckCircle2 className="h-4 w-4" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="flex items-baseline gap-2">
              <div className="text-2xl font-bold text-slate-900">{metrics.successRate}%</div>
              <span className="text-xs text-slate-500">
                ({metrics.success} / {metrics.total})
              </span>
            </div>
            <div className="w-full bg-slate-100 rounded-full h-1.5 mt-2 overflow-hidden">
              <div
                className="bg-emerald-500 h-1.5 rounded-full transition-all duration-500"
                style={{ width: `${metrics.successRate}%` }}
              />
            </div>
          </CardContent>
        </Card>

        {/* Chamadas Rate-Limited */}
        <Card className="border-slate-200 shadow-2xs hover:shadow-sm transition-all bg-white">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-medium text-slate-500 uppercase tracking-wider">
              Rate-Limited (429)
            </CardTitle>
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-50 text-amber-600">
              <ShieldAlert className="h-4 w-4" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-slate-900">{metrics.rateLimited}</div>
            <p className="text-[11px] text-slate-500 mt-1">
              Bloqueios por taxa excessiva (&gt;120/min)
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Main Grid: Chart + Quick Architecture Registry */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Chart 7 Days */}
        <Card className="lg:col-span-2 border-slate-200 shadow-2xs bg-white">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <div>
              <CardTitle className="text-base font-semibold text-slate-900">
                Leads nos Últimos 7 Dias por Estágio
              </CardTitle>
              <CardDescription className="text-xs text-slate-500">
                Distribuição dos estágios comerciais enviados pela ferramenta create_lead
              </CardDescription>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={loadData}
              title="Recarregar"
              className="h-8 w-8 p-0 text-slate-500 hover:text-slate-800"
            >
              <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
            </Button>
          </CardHeader>
          <CardContent className="pt-4">
            <div className="h-72 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                  <XAxis
                    dataKey="data"
                    tick={{ fontSize: 11, fill: '#64748B' }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <YAxis
                    allowDecimals={false}
                    tick={{ fontSize: 11, fill: '#64748B' }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#FFFFFF',
                      borderRadius: '8px',
                      border: '1px solid #E2E8F0',
                      boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)',
                      fontSize: '12px',
                    }}
                  />
                  <Legend
                    verticalAlign="bottom"
                    iconType="circle"
                    wrapperStyle={{ paddingTop: '14px', fontSize: '12px' }}
                  />
                  {/* Cores alinhadas com pills: novo (azul), qualificado (verde), proposta (roxo), descartado (cinza) */}
                  <Bar
                    dataKey="novo"
                    name="Novo"
                    stackId="a"
                    fill="#3B82F6"
                    radius={[0, 0, 0, 0]}
                  />
                  <Bar
                    dataKey="qualificado"
                    name="Qualificado"
                    stackId="a"
                    fill="#10B981"
                    radius={[0, 0, 0, 0]}
                  />
                  <Bar
                    dataKey="proposta"
                    name="Proposta"
                    stackId="a"
                    fill="#8B5CF6"
                    radius={[0, 0, 0, 0]}
                  />
                  <Bar
                    dataKey="descartado"
                    name="Descartado"
                    stackId="a"
                    fill="#94A3B8"
                    radius={[4, 4, 0, 0]}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Registro de Ferramentas / Status da Arquitetura */}
        <Card className="border-slate-200 shadow-2xs bg-white flex flex-col">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base font-semibold text-slate-900 flex items-center gap-2">
                <Wrench className="h-4 w-4 text-[#0F766E]" />
                Registro de Ferramentas
              </CardTitle>
              <Badge
                variant="outline"
                className="text-[10px] bg-teal-50 border-teal-200 text-teal-800 font-mono"
              >
                Tool Registry
              </Badge>
            </div>
            <CardDescription className="text-xs text-slate-500">
              Arquitetura extensível baseada em objetos registrados no código
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 flex-1">
            {toolRegistryList.map((tool) => (
              <div
                key={tool.nome}
                className="p-3 rounded-lg border border-slate-200 bg-slate-50/60 hover:bg-slate-50 transition-colors"
              >
                <div className="flex items-center justify-between mb-1.5">
                  <div className="flex items-center gap-1.5">
                    <span className="font-mono text-xs font-semibold text-slate-800">
                      {tool.nome}
                    </span>
                    <Badge className="bg-emerald-100 text-emerald-800 border-emerald-200 text-[10px] py-0">
                      {tool.status}
                    </Badge>
                  </div>
                  <span className="text-[10px] font-mono text-slate-500 uppercase bg-slate-200/70 px-1.5 py-0.5 rounded">
                    {tool.metodo}
                  </span>
                </div>
                <p className="text-xs text-slate-600 line-clamp-2">{tool.descricao}</p>
                <div className="mt-2 pt-2 border-t border-slate-200 flex items-center justify-between text-[11px] text-slate-500 font-mono">
                  <span>Escopo: {tool.escopo}</span>
                  <span className="text-teal-700">v1 ativa</span>
                </div>
              </div>
            ))}

            <div className="p-3 rounded-lg border border-dashed border-slate-300 bg-white text-xs text-slate-500 space-y-1">
              <p className="font-medium text-slate-700">Próximas ferramentas preparadas:</p>
              <p className="text-[11px] text-slate-500">
                • <code className="font-mono">enviar_email</code> (Notificações transacionais)
                <br />• <code className="font-mono">consultar_lead</code> (Busca de contexto
                anterior)
                <br />• <code className="font-mono">integracao_obsidian</code> / Adaptador MCP
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Recent Activity (Audit logs without sensitive data) */}
      <Card className="border-slate-200 shadow-2xs bg-white">
        <CardHeader className="flex flex-row items-center justify-between pb-3">
          <div>
            <CardTitle className="text-base font-semibold text-slate-900 flex items-center gap-2">
              <Clock className="h-4 w-4 text-slate-500" />
              Atividade Recente (Logs de Auditoria — LGPD Compliance)
            </CardTitle>
            <CardDescription className="text-xs text-slate-500">
              Metadados técnicos das últimas chamadas recebidas (sem e-mails, nomes ou conteúdos de
              conversa)
            </CardDescription>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => navigate('/logs')}
            className="text-xs border-slate-200 text-slate-700 flex items-center gap-1.5"
          >
            <span>Ver Todos os Logs</span>
            <ExternalLink className="h-3 w-3" />
          </Button>
        </CardHeader>
        <CardContent>
          {recentLogs.length === 0 ? (
            <div className="py-8 text-center text-xs text-slate-500">
              Nenhuma atividade registrada até o momento.
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {recentLogs.map((log) => (
                <div
                  key={log.id}
                  className="py-2.5 flex items-center justify-between text-xs gap-3"
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <span
                      className={`h-2 w-2 rounded-full shrink-0 ${
                        log.resultado === 'sucesso' ? 'bg-emerald-500' : 'bg-red-500'
                      }`}
                    />
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-semibold text-slate-800">
                          {log.ferramenta}
                        </span>
                        <Badge
                          variant="outline"
                          className={`text-[10px] py-0 font-mono ${
                            log.resultado === 'sucesso'
                              ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                              : 'bg-red-50 border-red-200 text-red-800'
                          }`}
                        >
                          HTTP {log.http_status}
                        </Badge>
                        {log.error_code && (
                          <Badge
                            variant="outline"
                            className="text-[10px] py-0 border-amber-200 bg-amber-50 text-amber-800 font-mono"
                          >
                            {log.error_code}
                          </Badge>
                        )}
                      </div>
                      <p className="text-[11px] text-slate-400 font-mono truncate mt-0.5">
                        ID: {log.request_id}
                      </p>
                    </div>
                  </div>

                  <div className="text-right shrink-0">
                    <span className="font-mono text-slate-600 font-medium">
                      {log.duracao_ms} ms
                    </span>
                    <p className="text-[10px] text-slate-400">
                      {new Date(log.created).toLocaleTimeString('pt-BR')}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
