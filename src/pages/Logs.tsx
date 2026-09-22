import { useEffect, useState, useCallback } from 'react'
import {
  Activity,
  ShieldCheck,
  RefreshCw,
  Clock,
  Filter,
  CheckCircle2,
  XCircle,
  FileCode,
  ChevronLeft,
  ChevronRight,
  Loader2,
  Lock,
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

export default function Logs() {
  const { toast } = useToast()

  const [logs, setLogs] = useState<ToolLogRecord[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [currentPage, setCurrentPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [totalItems, setTotalItems] = useState(0)
  const [selectedResultado, setSelectedResultado] = useState<string>('todos')

  const fetchLogs = useCallback(async () => {
    try {
      setIsLoading(true)
      const res = await toolLogService.getLogs({
        page: currentPage,
        perPage: 15,
        resultado: selectedResultado,
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
  }, [currentPage, selectedResultado, toast])

  useEffect(() => {
    fetchLogs()
  }, [fetchLogs])

  // Inscrição Realtime para novos logs
  useRealtime<ToolLogRecord>('tool_logs', () => {
    fetchLogs()
  })

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
            Esta tabela registra apenas metadados técnicos de cada execução da API (ferramenta,
            resultado, HTTP status, código de erro, request_id e duração em milissegundos). Nenhum
            dado pessoal do lead (como nome, e-mail ou mensagens de conversa) é persistido nos logs
            de integração.
          </p>
        </div>
      </div>

      {/* Header com Filtros */}
      <Card className="border-slate-200 shadow-2xs bg-white">
        <CardHeader className="pb-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <CardTitle className="text-base sm:text-lg font-semibold text-slate-900 flex items-center gap-2">
                <Activity className="h-5 w-5 text-teal-700" />
                Logs de Integração de Ferramentas
              </CardTitle>
              <CardDescription className="text-xs text-slate-500">
                Histórico de chamadas server-to-server executadas pelo Consultor Digital
              </CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={fetchLogs}
                className="text-xs text-slate-600 border-slate-200 h-9"
              >
                <RefreshCw className={`h-3.5 w-3.5 mr-1.5 ${isLoading ? 'animate-spin' : ''}`} />
                Atualizar
              </Button>
            </div>
          </div>
        </CardHeader>

        <CardContent className="pt-0">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="w-full sm:w-64">
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

            <div className="text-xs text-slate-500 w-full sm:w-auto text-right font-mono">
              Total de chamadas: <span className="font-semibold text-slate-800">{totalItems}</span>
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
