import { useEffect, useState, useCallback, useMemo } from 'react'
import {
  Activity,
  ShieldCheck,
  RefreshCw,
  Clock,
  Filter,
  CheckCircle2,
  XCircle,
  ChevronLeft,
  ChevronRight,
  Loader2,
  Calendar,
  AlertTriangle,
  Zap,
  BarChart3,
  Server,
  Layers,
} from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { toolLogService } from '@/services/toolLogService'
import { useRealtime } from '@/hooks/use-realtime'
import type { ToolLogRecord } from '@/types/integration'
import { useToast } from '@/hooks/use-toast'

type PeriodOption = '24h' | '7d' | '30d' | 'tudo'

export default function Logs() {
  const { toast } = useToast()

  const [logs, setLogs] = useState<ToolLogRecord[]>([])
  const [metricsLogs, setMetricsLogs] = useState<ToolLogRecord[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isLoadingMetrics, setIsLoadingMetrics] = useState(true)
  const [currentPage, setCurrentPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [totalItems, setTotalItems] = useState(0)
  const [selectedResultado, setSelectedResultado] = useState<string>('todos')
  const [selectedFerramenta, setSelectedFerramenta] = useState<string>('todas')
  const [selectedPeriod, setSelectedPeriod] = useState<PeriodOption>('tudo')

  // Calcula a data de corte para o filtro de métricas
  const periodDateLimit = useMemo(() => {
    if (selectedPeriod === 'tudo') return undefined
    const now = new Date()
    if (selectedPeriod === '24h') {
      now.setHours(now.getHours() - 24)
    } else if (selectedPeriod === '7d') {
      now.setDate(now.getDate() - 7)
    } else if (selectedPeriod === '30d') {
      now.setDate(now.getDate() - 30)
    }
    return now.toISOString().replace('T', ' ').slice(0, 19)
  }, [selectedPeriod])

  // Busca logs para a tabela paginada
  const fetchLogs = useCallback(async () => {
    try {
      setIsLoading(true)
      const res = await toolLogService.getLogs({
        page: currentPage,
        perPage: 15,
        resultado: selectedResultado,
        ferramenta: selectedFerramenta,
      })
      setLogs(res.items)
      setTotalPages(res.totalPages || 1)
      setTotalItems(res.totalItems)
    } catch (err) {
      console.error('Erro ao buscar logs:', err)
      toast({
        title: 'Erro ao carregar logs',
        description: 'Não foi possível buscar a lista de auditoria.',
        variant: 'destructive',
      })
    } finally {
      setIsLoading(false)
    }
  }, [currentPage, selectedResultado, selectedFerramenta, toast])

  // Busca logs completos para o dashboard de métricas com base no período selecionado
  const fetchMetricsData = useCallback(async () => {
    try {
      setIsLoadingMetrics(true)
      const data = await toolLogService.getLogsForMetrics({
        createdGte: periodDateLimit,
      })
      setMetricsLogs(data)
    } catch (err) {
      console.error('Erro ao carregar métricas:', err)
    } finally {
      setIsLoadingMetrics(false)
    }
  }, [periodDateLimit])

  useEffect(() => {
    fetchLogs()
  }, [fetchLogs])

  useEffect(() => {
    fetchMetricsData()
  }, [fetchMetricsData])

  const handleRefreshAll = () => {
    fetchLogs()
    fetchMetricsData()
  }

  // Inscrição Realtime para novos logs
  useRealtime<ToolLogRecord>('tool_logs', () => {
    fetchLogs()
    fetchMetricsData()
  })

  // Cálculos do Dashboard de Métricas
  const metrics = useMemo(() => {
    const total = metricsLogs.length
    let success = 0
    let errors = 0
    let totalDuration = 0

    const toolsCount: Record<string, number> = {
      create_lead: 0,
      schedule_meeting: 0,
    }

    const httpStatusCount: Record<string, number> = {
      '201': 0, // Criado
      '200': 0, // Sucesso / Duplicado idempotente
      '4xx': 0, // Erros de cliente (400, 401, 404, 409, 422, 429)
      '500': 0, // Erros de servidor
    }

    const errorsByCode: Record<string, number> = {}

    metricsLogs.forEach((log) => {
      // Sucesso vs Erro
      if (log.resultado === 'sucesso') {
        success++
      } else {
        errors++
      }

      // Duração média
      if (typeof log.duracao_ms === 'number') {
        totalDuration += log.duracao_ms
      }

      // Por ferramenta
      const toolName = log.ferramenta || 'outra'
      toolsCount[toolName] = (toolsCount[toolName] || 0) + 1

      // Por status HTTP
      const code = log.http_status
      if (code === 201) {
        httpStatusCount['201']++
      } else if (code === 200) {
        httpStatusCount['200']++
      } else if (code >= 500) {
        httpStatusCount['500']++
      } else if (code >= 400 && code < 500) {
        httpStatusCount['4xx']++
      }

      // Por código de erro
      if (log.resultado === 'erro' || log.error_code) {
        const errKey = log.error_code || `HTTP_${log.http_status}`
        errorsByCode[errKey] = (errorsByCode[errKey] || 0) + 1
      }
    })

    const successRate = total > 0 ? Math.round((success / total) * 100) : 100
    const avgDuration = total > 0 ? Math.round(totalDuration / total) : 0

    return {
      total,
      success,
      errors,
      successRate,
      avgDuration,
      toolsCount,
      httpStatusCount,
      errorsByCode,
    }
  }, [metricsLogs])

  return (
    <div className="space-y-6">
      {/* Aviso de Auditoria e LGPD */}
      <div className="rounded-lg border border-teal-200 bg-teal-50/70 p-4 text-xs text-teal-900 flex items-start gap-3">
        <ShieldCheck className="h-5 w-5 text-teal-700 shrink-0 mt-0.5" />
        <div className="space-y-1">
          <p className="font-semibold text-teal-800">
            Auditoria Segura e Em Conformidade com a LGPD
          </p>
          <p className="text-slate-600 leading-relaxed">
            Esta área registra metadados técnicos de cada execução da API (ferramenta, resultado,
            HTTP status, código de erro, trace ID e duração em milissegundos). Nenhum dado pessoal
            do lead (como nome, e-mail ou mensagens de conversa) é persistido nos logs de
            integração.
          </p>
        </div>
      </div>

      {/* DASHBOARD DE MÉTRICAS (Entrega solicitada pelo usuário) */}
      <div className="space-y-4">
        {/* Header das Métricas com seletor de período */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
          <div>
            <h3 className="text-base font-semibold text-slate-900 flex items-center gap-2">
              <BarChart3 className="h-5 w-5 text-teal-700" />
              Dashboard de Métricas Operacionais
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Indicadores consolidados de desempenho, confiabilidade e chamadas da camada de
              integração
            </p>
          </div>

          <div className="flex items-center gap-2">
            {/* Seletor de Período */}
            <div className="flex items-center gap-1.5 text-xs text-slate-600">
              <Calendar className="h-3.5 w-3.5 text-slate-400" />
              <span>Período:</span>
            </div>
            <Select
              value={selectedPeriod}
              onValueChange={(val) => setSelectedPeriod(val as PeriodOption)}
            >
              <SelectTrigger className="h-8 text-xs border-slate-200 w-36 bg-slate-50/50">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="24h">Últimas 24 horas</SelectItem>
                <SelectItem value="7d">Últimos 7 dias</SelectItem>
                <SelectItem value="30d">Últimos 30 dias</SelectItem>
                <SelectItem value="tudo">Todo o Histórico</SelectItem>
              </SelectContent>
            </Select>

            <Button
              variant="outline"
              size="sm"
              onClick={handleRefreshAll}
              className="text-xs text-slate-600 border-slate-200 h-8"
              title="Recarregar logs e métricas"
            >
              <RefreshCw
                className={`h-3.5 w-3.5 mr-1.5 ${
                  isLoading || isLoadingMetrics ? 'animate-spin text-teal-700' : ''
                }`}
              />
              Atualizar
            </Button>
          </div>
        </div>

        {/* 4 Cards Principais de KPIs */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Total de Chamadas */}
          <Card className="border-slate-200 shadow-2xs hover:shadow-sm transition-all bg-white">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-xs font-medium text-slate-500 uppercase tracking-wider">
                Total de Chamadas
              </CardTitle>
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-teal-50 text-[#0F766E]">
                <Activity className="h-4 w-4" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-slate-900">{metrics.total}</div>
              <p className="text-[11px] text-slate-500 mt-1 flex items-center gap-1">
                <Clock className="h-3 w-3 text-teal-600" />
                <span>
                  {selectedPeriod === '24h' && 'Nas últimas 24 horas'}
                  {selectedPeriod === '7d' && 'Nos últimos 7 dias'}
                  {selectedPeriod === '30d' && 'Nos últimos 30 dias'}
                  {selectedPeriod === 'tudo' && 'Histórico completo acumulado'}
                </span>
              </p>
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
                  ({metrics.success} de {metrics.total})
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

          {/* Falhas / Erros Registrados */}
          <Card className="border-slate-200 shadow-2xs hover:shadow-sm transition-all bg-white">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-xs font-medium text-slate-500 uppercase tracking-wider">
                Falhas / Erros
              </CardTitle>
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-red-50 text-red-600">
                <XCircle className="h-4 w-4" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-slate-900">{metrics.errors}</div>
              <p className="text-[11px] text-slate-500 mt-1">
                {metrics.errors === 0
                  ? 'Nenhum erro no período selecionado'
                  : `${metrics.errors} requisição(ões) retornaram status != 2xx`}
              </p>
            </CardContent>
          </Card>

          {/* Latência / Duração Média */}
          <Card className="border-slate-200 shadow-2xs hover:shadow-sm transition-all bg-white">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-xs font-medium text-slate-500 uppercase tracking-wider">
                Latência Média
              </CardTitle>
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-50 text-blue-600">
                <Zap className="h-4 w-4" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-slate-900 font-mono">
                {metrics.avgDuration} <span className="text-sm font-normal text-slate-500">ms</span>
              </div>
              <p className="text-[11px] text-slate-500 mt-1">Tempo de execução no backend</p>
            </CardContent>
          </Card>
        </div>

        {/* 3 Blocos Detalhados: Ferramentas + Status HTTP + Códigos de Erro */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Bloco 1: Chamadas por Ferramenta */}
          <Card className="border-slate-200 shadow-2xs bg-white">
            <CardHeader className="pb-3">
              <CardTitle className="text-xs font-semibold text-slate-800 uppercase tracking-wider flex items-center gap-2">
                <Layers className="h-4 w-4 text-teal-700" />
                Chamadas por Ferramenta
              </CardTitle>
              <CardDescription className="text-[11px] text-slate-500">
                Distribuição das ferramentas de integração
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3 pt-0">
              {Object.entries(metrics.toolsCount).map(([ferramenta, count]) => {
                const pct = metrics.total > 0 ? Math.round((count / metrics.total) * 100) : 0
                const isLead = ferramenta === 'create_lead'
                return (
                  <div key={ferramenta} className="space-y-1">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-mono font-medium text-slate-800 flex items-center gap-1.5">
                        <span
                          className={`h-2 w-2 rounded-full ${
                            isLead ? 'bg-teal-600' : 'bg-blue-600'
                          }`}
                        />
                        {ferramenta}
                      </span>
                      <span className="font-mono text-slate-600">
                        <strong>{count}</strong> ({pct}%)
                      </span>
                    </div>
                    <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
                      <div
                        className={`h-2 rounded-full transition-all duration-500 ${
                          isLead ? 'bg-teal-600' : 'bg-blue-600'
                        }`}
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                )
              })}
            </CardContent>
          </Card>

          {/* Bloco 2: Distribuição por Status HTTP */}
          <Card className="border-slate-200 shadow-2xs bg-white">
            <CardHeader className="pb-3">
              <CardTitle className="text-xs font-semibold text-slate-800 uppercase tracking-wider flex items-center gap-2">
                <Server className="h-4 w-4 text-teal-700" />
                Status HTTP
              </CardTitle>
              <CardDescription className="text-[11px] text-slate-500">
                Respostas das chamadas da API
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-2.5 pt-0">
              {/* 201 Created */}
              <div className="flex items-center justify-between p-2 rounded-md bg-emerald-50/60 border border-emerald-100 text-xs">
                <div className="flex items-center gap-2">
                  <Badge className="bg-emerald-600 hover:bg-emerald-600 text-white font-mono text-[10px] px-1.5 py-0">
                    201
                  </Badge>
                  <span className="text-slate-700 font-medium">Criado com sucesso</span>
                </div>
                <span className="font-mono font-semibold text-emerald-800">
                  {metrics.httpStatusCount['201']}
                </span>
              </div>

              {/* 200 OK / Idempotente */}
              <div className="flex items-center justify-between p-2 rounded-md bg-blue-50/60 border border-blue-100 text-xs">
                <div className="flex items-center gap-2">
                  <Badge className="bg-blue-600 hover:bg-blue-600 text-white font-mono text-[10px] px-1.5 py-0">
                    200
                  </Badge>
                  <span className="text-slate-700 font-medium">OK / Duplicado</span>
                </div>
                <span className="font-mono font-semibold text-blue-800">
                  {metrics.httpStatusCount['200']}
                </span>
              </div>

              {/* 4xx Client Error */}
              <div className="flex items-center justify-between p-2 rounded-md bg-amber-50/60 border border-amber-100 text-xs">
                <div className="flex items-center gap-2">
                  <Badge className="bg-amber-600 hover:bg-amber-600 text-white font-mono text-[10px] px-1.5 py-0">
                    4xx
                  </Badge>
                  <span className="text-slate-700 font-medium">Erro de Validação / Rate Limit</span>
                </div>
                <span className="font-mono font-semibold text-amber-800">
                  {metrics.httpStatusCount['4xx']}
                </span>
              </div>

              {/* 500 Server Error */}
              <div className="flex items-center justify-between p-2 rounded-md bg-red-50/60 border border-red-100 text-xs">
                <div className="flex items-center gap-2">
                  <Badge className="bg-red-600 hover:bg-red-600 text-white font-mono text-[10px] px-1.5 py-0">
                    500
                  </Badge>
                  <span className="text-slate-700 font-medium">Erro Interno</span>
                </div>
                <span className="font-mono font-semibold text-red-800">
                  {metrics.httpStatusCount['500']}
                </span>
              </div>
            </CardContent>
          </Card>

          {/* Bloco 3: Erros por Código */}
          <Card className="border-slate-200 shadow-2xs bg-white">
            <CardHeader className="pb-3">
              <CardTitle className="text-xs font-semibold text-slate-800 uppercase tracking-wider flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-amber-600" />
                Erros por Código
              </CardTitle>
              <CardDescription className="text-[11px] text-slate-500">
                Classificação de erros identificados nos logs
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-2 pt-0">
              {Object.keys(metrics.errorsByCode).length === 0 ? (
                <div className="p-4 rounded-lg bg-slate-50 border border-dashed border-slate-200 text-center text-xs text-slate-500">
                  <CheckCircle2 className="h-5 w-5 text-emerald-600 mx-auto mb-1.5" />
                  Nenhum código de erro registrado no período.
                </div>
              ) : (
                Object.entries(metrics.errorsByCode).map(([errCode, count]) => (
                  <div
                    key={errCode}
                    className="flex items-center justify-between p-2 rounded-md bg-slate-50 border border-slate-200 text-xs"
                  >
                    <span className="font-mono text-amber-800 font-semibold bg-amber-50 px-1.5 py-0.5 rounded border border-amber-200 text-[11px]">
                      {errCode}
                    </span>
                    <span className="font-mono font-bold text-slate-800">
                      {count} {count === 1 ? 'ocorrência' : 'ocorrências'}
                    </span>
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Header com Filtros da Tabela */}
      <Card className="border-slate-200 shadow-2xs bg-white">
        <CardHeader className="pb-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <CardTitle className="text-base sm:text-lg font-semibold text-slate-900 flex items-center gap-2">
                <Activity className="h-5 w-5 text-teal-700" />
                Registros de Auditoria dos Logs
              </CardTitle>
              <CardDescription className="text-xs text-slate-500">
                Histórico de chamadas server-to-server executadas pelo Consultor Digital
              </CardDescription>
            </div>
          </div>
        </CardHeader>

        <CardContent className="pt-0">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="flex flex-col sm:flex-row items-center gap-3 w-full sm:w-auto">
              {/* Filtro Resultado */}
              <div className="w-full sm:w-52">
                <Select
                  value={selectedResultado}
                  onValueChange={(val) => {
                    setSelectedResultado(val)
                    setCurrentPage(1)
                  }}
                >
                  <SelectTrigger className="text-xs sm:text-sm border-slate-200">
                    <div className="flex items-center gap-2">
                      <Filter className="h-3.5 w-3.5 text-slate-500" />
                      <span>Resultado:</span>
                      <SelectValue />
                    </div>
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="todos">Todos os Resultados</SelectItem>
                    <SelectItem value="sucesso">Apenas Sucessos</SelectItem>
                    <SelectItem value="erro">Apenas Erros</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Filtro Ferramenta */}
              <div className="w-full sm:w-52">
                <Select
                  value={selectedFerramenta}
                  onValueChange={(val) => {
                    setSelectedFerramenta(val)
                    setCurrentPage(1)
                  }}
                >
                  <SelectTrigger className="text-xs sm:text-sm border-slate-200">
                    <div className="flex items-center gap-2">
                      <Layers className="h-3.5 w-3.5 text-slate-500" />
                      <span>Ferramenta:</span>
                      <SelectValue />
                    </div>
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="todas">Todas as Ferramentas</SelectItem>
                    <SelectItem value="create_lead">create_lead</SelectItem>
                    <SelectItem value="schedule_meeting">schedule_meeting</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="text-xs text-slate-500 w-full sm:w-auto text-right font-mono">
              Total listado: <span className="font-semibold text-slate-800">{totalItems}</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Tabela de Logs */}
      <Card className="border-slate-200 shadow-2xs bg-white overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50/80 font-medium text-slate-600 uppercase tracking-wider text-[11px]">
                <th className="py-3 px-4">Timestamp</th>
                <th className="py-3 px-4">Ferramenta</th>
                <th className="py-3 px-4">Resultado</th>
                <th className="py-3 px-4">HTTP Status</th>
                <th className="py-3 px-4">Código de Erro</th>
                <th className="py-3 px-4">Request ID (Trace)</th>
                <th className="py-3 px-4 text-right">Duração</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {isLoading ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-500">
                    <div className="flex items-center justify-center gap-2">
                      <Loader2 className="h-4 w-4 animate-spin text-[#0F766E]" />
                      <span>Carregando registros de auditoria...</span>
                    </div>
                  </td>
                </tr>
              ) : logs.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-500">
                    Nenhum log registrado para os filtros selecionados.
                  </td>
                </tr>
              ) : (
                logs.map((log) => (
                  <tr key={log.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-3 px-4 font-mono text-[11px] text-slate-500 whitespace-nowrap">
                      {new Date(log.created).toLocaleString('pt-BR')}
                    </td>

                    <td className="py-3 px-4 font-mono font-semibold text-slate-800">
                      {log.ferramenta}
                    </td>

                    <td className="py-3 px-4">
                      {log.resultado === 'sucesso' ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-800 border border-emerald-200">
                          <CheckCircle2 className="h-3 w-3 text-emerald-600" />
                          Sucesso
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-red-50 text-red-800 border border-red-200">
                          <XCircle className="h-3 w-3 text-red-600" />
                          Erro
                        </span>
                      )}
                    </td>

                    <td className="py-3 px-4 font-mono">
                      <Badge
                        variant="outline"
                        className={`text-xs ${
                          log.http_status >= 200 && log.http_status < 300
                            ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                            : log.http_status === 429
                              ? 'bg-amber-50 text-amber-800 border-amber-200'
                              : 'bg-red-50 text-red-800 border-red-200'
                        }`}
                      >
                        {log.http_status}
                      </Badge>
                    </td>

                    <td className="py-3 px-4 font-mono text-[11px]">
                      {log.error_code ? (
                        <span className="text-amber-800 font-semibold bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
                          {log.error_code}
                        </span>
                      ) : (
                        <span className="text-slate-400">—</span>
                      )}
                    </td>

                    <td className="py-3 px-4 font-mono text-[11px] text-slate-500">
                      <span className="bg-slate-100 px-1.5 py-0.5 rounded border border-slate-200">
                        {log.request_id}
                      </span>
                    </td>

                    <td className="py-3 px-4 text-right font-mono text-[11px] font-semibold text-slate-700">
                      {log.duracao_ms} ms
                    </td>
                  </tr>
                ))
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
    </div>
  )
}
