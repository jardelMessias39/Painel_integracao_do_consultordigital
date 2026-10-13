import { useState, useEffect } from 'react'
import {
  Server,
  KeyRound,
  ShieldAlert,
  Copy,
  Check,
  Code2,
  Send,
  Calendar,
  Mail,
  Boxes,
  AlertTriangle,
  RefreshCw,
  Lock,
  Layers,
  FileText,
  Sparkles,
  ExternalLink,
  ChevronRight,
  ShieldCheck,
  CheckCircle2,
  XCircle,
  Clock,
  Terminal,
} from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { INTEGRATION_CONFIG } from '@/services/toolRegistry'
import { useToast } from '@/hooks/use-toast'
import { ToolContractViewer } from '@/components/ToolContractViewer'

interface NavSection {
  id: string
  label: string
  badge?: string
}

const SECTIONS: NavSection[] = [
  { id: 'visao-geral', label: 'Visão Geral' },
  { id: 'autenticacao', label: 'Autenticação' },
  { id: 'registro-tools', label: 'Registro de Tools', badge: 'GET' },
  { id: 'create-lead', label: 'create_lead', badge: 'POST' },
  { id: 'schedule-meeting', label: 'schedule_meeting', badge: 'POST' },
  { id: 'send-email', label: 'send_email', badge: 'POST' },
  { id: 'list-meetings', label: 'list_meetings', badge: 'GET' },
  { id: 'envelope-respostas', label: 'Envelope Padrão' },
  { id: 'erros-codigos', label: 'Erros e Códigos' },
  { id: 'idempotencia', label: 'Idempotência' },
  { id: 'exemplos-completos', label: 'Exemplos Completos' },
  { id: 'seguranca-lgpd', label: 'Segurança & LGPD' },
]

export default function Documentacao() {
  const { toast } = useToast()
  const [copiedSnippet, setCopiedSnippet] = useState<string | null>(null)
  const [activeSection, setActiveSection] = useState<string>('visao-geral')
  const [activeMainTab, setActiveMainTab] = useState<'api' | 'comportamental'>('api')

  const publicBaseUrl = INTEGRATION_CONFIG.publicDomain
  const canonicalCreateLeadUrl = `${publicBaseUrl}${INTEGRATION_CONFIG.publicEndpointPath}`
  const canonicalScheduleMeetingUrl = `${publicBaseUrl}${INTEGRATION_CONFIG.publicScheduleMeetingPath}`
  const canonicalSendEmailUrl = `${publicBaseUrl}${INTEGRATION_CONFIG.publicSendEmailPath}`
  const canonicalListMeetingsUrl = `${publicBaseUrl}${INTEGRATION_CONFIG.publicListMeetingsPath}`
  const canonicalToolsRegistryUrl = `${publicBaseUrl}${INTEGRATION_CONFIG.publicToolsRegistryPath}`

  const internalBaseUrl = INTEGRATION_CONFIG.backendUrl
  const internalCreateLeadUrl = `${internalBaseUrl}${INTEGRATION_CONFIG.internalEndpointPath}`
  const internalScheduleMeetingUrl = `${internalBaseUrl}${INTEGRATION_CONFIG.internalScheduleMeetingPath}`
  const internalSendEmailUrl = `${internalBaseUrl}${INTEGRATION_CONFIG.internalSendEmailPath}`
  const internalListMeetingsUrl = `${internalBaseUrl}${INTEGRATION_CONFIG.internalListMeetingsPath}`
  const internalToolsRegistryUrl = `${internalBaseUrl}${INTEGRATION_CONFIG.internalToolsRegistryPath}`

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text)
    setCopiedSnippet(label)
    toast({
      title: 'Copiado para a área de transferência',
      description: `${label} copiado com sucesso!`,
    })
    setTimeout(() => setCopiedSnippet(null), 2500)
  }

  const scrollToAnchor = (id: string) => {
    setActiveSection(id)
    const element = document.getElementById(id)
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }
  }

  // Observer para destacar link ativo do sumário lateral no scroll
  useEffect(() => {
    if (activeMainTab !== 'api') return

    const handleScroll = () => {
      const scrollPosition = window.scrollY + 120
      for (let i = SECTIONS.length - 1; i >= 0; i--) {
        const el = document.getElementById(SECTIONS[i].id)
        if (el && el.offsetTop <= scrollPosition) {
          setActiveSection(SECTIONS[i].id)
          break
        }
      }
    }

    window.addEventListener('scroll', handleScroll, { passive: true })
    return () => window.removeEventListener('scroll', handleScroll)
  }, [activeMainTab])

  // --- Payloads e Respostas Reais ---
  const createLeadPayload = JSON.stringify(
    {
      nome: 'Carlos Eduardo Silva',
      empresa: 'LogiTech Transportes',
      email: 'carlos.silva@logitech.com.br',
      telefone: '(11) 98765-4321',
      necessidade_identificada: 'Automação no atendimento de motoristas parceiros',
      estagio_do_lead: 'novo',
    },
    null,
    2,
  )

  const createLeadSuccess201 = JSON.stringify(
    {
      ok: true,
      data: {
        lead_id: 'c1hsdzu85woiyu6',
        estagio_do_lead: 'novo',
        created_at: '2026-09-22 02:58:37.277Z',
        duplicado: false,
      },
    },
    null,
    2,
  )

  const createLeadSuccess200 = JSON.stringify(
    {
      ok: true,
      data: {
        lead_id: 'c1hsdzu85woiyu6',
        estagio_do_lead: 'novo',
        created_at: '2026-09-22 02:58:37.277Z',
        duplicado: true,
      },
    },
    null,
    2,
  )

  const scheduleMeetingPayload = JSON.stringify(
    {
      nome: 'Carlos Eduardo Silva',
      empresa: 'LogiTech Transportes',
      email: 'carlos.silva@logitech.com.br',
      telefone: '(11) 98765-4321',
      data_hora: '2026-11-25T15:00:00-03:00',
      assunto: 'Apresentação da proposta do Consultor Digital e alinhamento de escopo',
      observacoes: 'Preferência por reunião via Google Meet; disponibilidade no período da tarde.',
    },
    null,
    2,
  )

  const scheduleMeetingSuccess201 = JSON.stringify(
    {
      ok: true,
      data: {
        meeting_id: 'm1hsdzu85woiyu7',
        status: 'pendente',
        data_hora: '2026-11-25 18:00:00.000Z',
        created_at: '2026-09-26 14:10:00.000Z',
        duplicado: false,
      },
    },
    null,
    2,
  )

  const scheduleMeetingSuccess200 = JSON.stringify(
    {
      ok: true,
      data: {
        meeting_id: 'm1hsdzu85woiyu7',
        status: 'pendente',
        data_hora: '2026-11-25 18:00:00.000Z',
        created_at: '2026-09-26 14:10:00.000Z',
        duplicado: true,
      },
    },
    null,
    2,
  )

  const sendEmailPayload = JSON.stringify(
    {
      destinatario: 'carlos.silva@logitech.com.br',
      assunto: 'Confirmação de Agendamento — Consultor Digital',
      corpo:
        'Olá Carlos,\n\nConfirmamos o agendamento da sua reunião técnica para alinhamento de escopo no dia 25/11 às 15:00.\n\nAtenciosamente,\nEquipe Consultor Digital',
      idempotency_key: 'idem_email_logitech_20261125_1500',
    },
    null,
    2,
  )

  const sendEmailSuccess201 = JSON.stringify(
    {
      ok: true,
      data: {
        message_id: 'msg_98abc72f10d9e847120a',
        status: 'enviado',
        duplicado: false,
      },
    },
    null,
    2,
  )

  const sendEmailSuccess200 = JSON.stringify(
    {
      ok: true,
      data: {
        message_id: 'msg_98abc72f10d9e847120a',
        status: 'enviado',
        duplicado: true,
      },
    },
    null,
    2,
  )

  const toolsRegistrySuccess200 = JSON.stringify(
    {
      ok: true,
      data: {
        total: 4,
        tools: [
          {
            nome: 'create_lead',
            metodo: 'POST',
            caminho: '/v1/tools/create_lead',
            versao: 'v1',
            descricao: 'Registra ou atualiza um lead comercial qualificado pelo Consultor Digital',
            campos_obrigatorios: [
              'nome',
              'empresa',
              'email',
              'telefone',
              'necessidade_identificada',
              'estagio_do_lead',
            ],
            campos_opcionais: [
              'problema_relatado',
              'requisitos',
              'solucao_sugerida',
              'resumo_conversa',
              'proximo_passo',
            ],
            idempotencia: 'email+empresa',
            rate_limit: '120 req/min',
          },
          {
            nome: 'schedule_meeting',
            metodo: 'POST',
            caminho: '/v1/tools/schedule_meeting',
            versao: 'v1',
            descricao:
              'Registra uma solicitação interna de reunião com o consultor com status inicial pendente',
            campos_obrigatorios: ['nome', 'empresa', 'email', 'telefone', 'data_hora', 'assunto'],
            campos_opcionais: ['observacoes'],
            idempotencia: 'email+data_hora',
            rate_limit: '120 req/min',
          },
          {
            nome: 'send_email',
            metodo: 'POST',
            caminho: '/v1/tools/send_email',
            versao: 'v1',
            descricao:
              'Envia um e-mail transacional real para o destinatário através do serviço padrão do servidor',
            campos_obrigatorios: ['destinatario', 'assunto', 'corpo'],
            campos_opcionais: ['idempotency_key'],
            idempotencia: 'idempotency_key do chamador',
            rate_limit: '30 req/min',
          },
          {
            nome: 'list_meetings',
            metodo: 'GET',
            caminho: '/v1/tools/list_meetings',
            versao: 'v1',
            descricao:
              'Consulta e lista reuniões agendadas com filtros por e-mail, status e período futuro',
            campos_obrigatorios: [],
            campos_opcionais: ['email', 'status', 'futuras_apenas', 'limite'],
            idempotencia: 'não aplicável (leitura)',
            rate_limit: '120 req/min',
          },
        ],
      },
    },
    null,
    2,
  )

  const listMeetingsSuccess200 = JSON.stringify(
    {
      ok: true,
      data: {
        total: 2,
        reunioes: [
          {
            id: 'd5ctzgwi356jeag',
            nome: 'Teste Controlado',
            empresa: 'Pessoa física',
            email: 'teste.controlado@exemplo.com',
            data_hora: '2026-11-25 18:00:00.000Z',
            assunto: 'Teste controlado pos-rotacao',
            observacoes: 'Validacao das tres protecoes',
            status: 'confirmada',
            created: '2026-10-12 16:27:21.779Z',
          },
          {
            id: 'jdhk5guxf2owokw',
            nome: 'Teste Schedule V2',
            empresa: 'Empresa Schedule V2',
            email: 'schedule.v2.teste@teste.com',
            data_hora: '2026-10-01 18:00:00.000Z',
            assunto: 'Sistema Web para gerenciamento de leads',
            observacoes: 'Quero discutir automação e integração com WhatsApp.',
            status: 'confirmada',
            created: '2026-09-30 19:17:49.199Z',
          },
        ],
      },
    },
    null,
    2,
  )

  const errorValidationError = JSON.stringify(
    {
      ok: false,
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Dados do lead inválidos. Corrija os campos e tente novamente.',
        details: [
          {
            field: 'email',
            message: "O campo 'email' informado não possui um formato válido de e-mail.",
          },
          {
            field: 'estagio_do_lead',
            message:
              "O campo 'estagio_do_lead' deve ser exatamente um dos valores permitidos: 'novo', 'qualificado', 'proposta' ou 'descartado'.",
          },
        ],
      },
    },
    null,
    2,
  )

  const errorUnauthorized = JSON.stringify(
    {
      ok: false,
      error: {
        code: 'UNAUTHORIZED',
        message:
          'Chave de API ausente ou inválida. Forneça o header X-API-Key com uma chave autorizada.',
        details: [],
      },
    },
    null,
    2,
  )

  const errorMethodNotAllowed = JSON.stringify(
    {
      ok: false,
      error: {
        code: 'METHOD_NOT_ALLOWED',
        message: 'Método HTTP não permitido para esta rota. Use POST.',
        details: [],
      },
    },
    null,
    2,
  )

  const errorInternal = JSON.stringify(
    {
      ok: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Ocorreu um erro interno ao registrar o lead. Tente novamente mais tarde.',
        details: [{ field: 'server', message: 'Falha interna' }],
      },
    },
    null,
    2,
  )

  const curlCreateLead = `curl -X POST "${canonicalCreateLeadUrl}" \\
  -H "Content-Type: application/json" \\
  -H "X-API-Key: sk-live_********************" \\
  -d '${createLeadPayload}'`

  const curlScheduleMeeting = `curl -X POST "${canonicalScheduleMeetingUrl}" \\
  -H "Content-Type: application/json" \\
  -H "X-API-Key: sk-live_********************" \\
  -d '${scheduleMeetingPayload}'`

  const curlSendEmail = `curl -X POST "${canonicalSendEmailUrl}" \\
  -H "Content-Type: application/json" \\
  -H "X-API-Key: sk-live_********************" \\
  -d '${sendEmailPayload}'`

  const curlListMeetings = `curl -X GET "${canonicalListMeetingsUrl}?email=teste.controlado%40exemplo.com&status=confirmada&futuras_apenas=true&limite=10" \\
  -H "X-API-Key: sk-live_********************"`

  const curlToolsRegistry = `curl -X GET "${canonicalToolsRegistryUrl}" \\
  -H "X-API-Key: sk-live_********************"`

  const nodeFullExample = `// Chamada server-to-server executada no backend do chatbot (ex: Render / Node.js)
// URL canônica com fallback automático em caso de 405 do proxy público
const CANONICAL_URL = process.env.INTEGRATION_LAYER_URL || 
  '${canonicalCreateLeadUrl}';
const FALLBACK_INTERNAL_URL = 
  '${internalCreateLeadUrl}';
const API_KEY = process.env.CONSULTOR_API_KEY; // Chave server-to-server segura

async function postToIntegrationLayer(endpointUrl, payload) {
  const response = await fetch(endpointUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-API-Key': API_KEY,
    },
    body: JSON.stringify(payload),
  });

  // Se o proxy público responder 405, tentar via URL funcional interna
  if (response.status === 405 && endpointUrl === CANONICAL_URL) {
    console.warn('[API] Rota pública retornou 405. Acionando rota interna validada...');
    return postToIntegrationLayer(FALLBACK_INTERNAL_URL, payload);
  }

  const result = await response.json();
  if (!result.ok) {
    const errorDetails = (result.error.details || [])
      .map(d => \`\${d.field}: \${d.message}\`).join(', ');
    throw new Error(\`[\${result.error.code}] \${result.error.message} (\${errorDetails})\`);
  }

  return {
    status: response.status, // 201 (novo) ou 200 (idempotente/duplicado)
    data: result.data,
  };
}

// 1. Criar lead
async function criarLead(lead) {
  return postToIntegrationLayer('${canonicalCreateLeadUrl}', {
    nome: lead.nome,
    empresa: lead.empresa, // "Pessoa física" caso seja PF sem empresa
    email: lead.email,
    telefone: lead.telefone,
    necessidade_identificada: lead.necessidade_identificada,
    estagio_do_lead: 'novo',
  });
}

// 2. Agendar reunião
async function agendarReuniao(meeting) {
  return postToIntegrationLayer('${canonicalScheduleMeetingUrl}', {
    nome: meeting.nome,
    empresa: meeting.empresa,
    email: meeting.email,
    telefone: meeting.telefone,
    data_hora: meeting.data_hora, // ISO 8601 com offset, ex: "2026-11-25T15:00:00-03:00"
    assunto: meeting.assunto,
    observacoes: meeting.observacoes || '',
  });
}

// 3. Enviar e-mail transacional (com idempotência opcional)
async function enviarEmail(emailData) {
  return postToIntegrationLayer('${canonicalSendEmailUrl}', {
    destinatario: emailData.destinatario,
    assunto: emailData.assunto,
    corpo: emailData.corpo,
    idempotency_key: emailData.idempotency_key, // ex: \`idem_email_\${emailData.meeting_id}\`
  });
}

// 4. Consultar reuniões (list_meetings - leitura)
async function listarReunioes(filtros = {}) {
  const params = new URLSearchParams();
  if (filtros.email) params.set('email', filtros.email);
  if (filtros.status) params.set('status', filtros.status);
  if (filtros.futuras_apenas !== undefined) params.set('futuras_apenas', String(filtros.futuras_apenas));
  if (filtros.limite) params.set('limite', String(filtros.limite));

  const url = \`\${'${canonicalListMeetingsUrl}'}?\${params.toString()}\`;
  const response = await fetch(url, {
    method: 'GET',
    headers: {
      'X-API-Key': API_KEY,
    },
  });
  const result = await response.json();
  if (!result.ok) {
    throw new Error(\`[\${result.error.code}] \${result.error.message}\`);
  }
  return result.data; // { total: N, reunioes: [...] }
}

// 5. Descobrir catálogo de ferramentas registradas (dinâmico, sem redeploy)
async function listarToolsDisponiveis() {
  const response = await fetch('${canonicalToolsRegistryUrl}', {
    method: 'GET',
    headers: {
      'X-API-Key': API_KEY,
    },
  });
  const result = await response.json();
  if (!result.ok) {
    throw new Error(\`[\${result.error.code}] \${result.error.message}\`);
  }
  return result.data.tools;
}`

  const pythonExample = `import os
import requests

API_KEY = os.getenv("CONSULTOR_API_KEY")
BASE_URL = os.getenv("INTEGRATION_LAYER_URL", "${canonicalCreateLeadUrl}")
FALLBACK_URL = "${internalCreateLeadUrl}"

def criar_lead(dados_lead):
    headers = {
        "Content-Type": "application/json",
        "X-API-Key": API_KEY,
    }
    
    url = BASE_URL
    response = requests.post(url, json=dados_lead, headers=headers)
    
    # Fallback em caso de 405 na rota pública
    if response.status_code == 405 and url == BASE_URL:
        response = requests.post(FALLBACK_URL, json=dados_lead, headers=headers)
        
    resultado = response.json()
    if not resultado.get("ok"):
        erro = resultado.get("error", {})
        raise RuntimeError(f"[{erro.get('code')}] {erro.get('message')}")
        
    # HTTP 201 (novo) ou HTTP 200 (duplicado: True)
    return response.status_code, resultado.get("data")`

  return (
    <div className="space-y-6">
      {/* Cabeçalho da Documentação com Toggle de Abas */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Badge className="bg-[#0F766E] text-white hover:bg-[#0F766E] text-xs font-semibold">
              v1.0.0
            </Badge>
            <Badge
              variant="outline"
              className="text-teal-800 border-teal-200 bg-teal-50 text-xs font-mono"
            >
              Server-to-Server
            </Badge>
            <Badge variant="outline" className="text-slate-600 border-slate-300 text-xs">
              REST / JSON
            </Badge>
          </div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
            Documentação da API do Consultor Digital
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
            Especificação técnica oficial dos endpoints consumidos pelo chatbot (Render) na Camada
            de Integração
          </p>
        </div>

        {/* Alternador de visualização: API técnica vs Contrato Comportamental */}
        <div className="inline-flex p-1 bg-slate-100 rounded-lg border border-slate-200 shadow-2xs self-start sm:self-center">
          <button
            type="button"
            onClick={() => setActiveMainTab('api')}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-xs font-semibold transition-all ${
              activeMainTab === 'api'
                ? 'bg-white text-[#0F766E] shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Server className="h-3.5 w-3.5 text-[#0F766E]" />
            <span>Documentação da API</span>
            <Badge className="bg-teal-100 text-[#0F766E] hover:bg-teal-100 text-[10px] py-0 px-1.5 font-mono">
              5 Endpoints
            </Badge>
          </button>

          <button
            type="button"
            onClick={() => setActiveMainTab('comportamental')}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-xs font-semibold transition-all ${
              activeMainTab === 'comportamental'
                ? 'bg-white text-[#0F766E] shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <FileText className="h-3.5 w-3.5 text-slate-600" />
            <span>Tool Contract (32 Seções)</span>
          </button>
        </div>
      </div>

      {activeMainTab === 'comportamental' ? (
        <ToolContractViewer onCopyText={copyToClipboard} />
      ) : (
        /* Layout Principal com Sumário Lateral Sticky e Conteúdo */
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Barra Lateral / Sumário de Navegação (Sticky no desktop, scroll horizontal no mobile) */}
          <aside className="lg:col-span-3 lg:sticky lg:top-20 z-10">
            <Card className="border-slate-200 bg-white shadow-2xs">
              <CardHeader className="p-3.5 pb-2 border-b border-slate-100">
                <span className="text-xs font-bold text-slate-800 uppercase tracking-wide flex items-center gap-1.5">
                  <Sparkles className="h-3.5 w-3.5 text-[#0F766E]" />
                  Índice da Documentação
                </span>
                <span className="text-[11px] text-slate-500">Navegue pelas seções técnicas</span>
              </CardHeader>
              <CardContent className="p-2 space-y-1">
                {/* Mobile scroll horizontal */}
                <div className="lg:hidden flex gap-1.5 overflow-x-auto pb-1 text-xs">
                  {SECTIONS.map((sec) => (
                    <button
                      key={sec.id}
                      type="button"
                      onClick={() => scrollToAnchor(sec.id)}
                      className={`whitespace-nowrap px-2.5 py-1.5 rounded-md text-xs font-medium border transition-colors ${
                        activeSection === sec.id
                          ? 'bg-[#0F766E] text-white border-[#0F766E]'
                          : 'bg-slate-50 text-slate-700 border-slate-200'
                      }`}
                    >
                      {sec.label}
                    </button>
                  ))}
                </div>

                {/* Desktop vertical list */}
                <div className="hidden lg:flex flex-col space-y-0.5">
                  {SECTIONS.map((sec) => {
                    const isSelected = activeSection === sec.id
                    return (
                      <button
                        key={sec.id}
                        type="button"
                        onClick={() => scrollToAnchor(sec.id)}
                        className={`w-full text-left px-2.5 py-2 rounded-md text-xs transition-colors flex items-center justify-between gap-1.5 ${
                          isSelected
                            ? 'bg-teal-50 text-[#0F766E] font-semibold border-l-2 border-[#0F766E]'
                            : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                        }`}
                      >
                        <span className="truncate">{sec.label}</span>
                        {sec.badge && (
                          <span className="text-[9px] px-1.5 py-0.5 rounded font-mono font-bold bg-emerald-100 text-emerald-800">
                            {sec.badge}
                          </span>
                        )}
                      </button>
                    )
                  })}
                </div>
              </CardContent>
            </Card>

            {/* Card de Atalhos Rápidos no Sumário */}
            <div className="hidden lg:block mt-4 p-3 rounded-lg border border-teal-100 bg-teal-50/60 text-xs text-teal-950 space-y-2">
              <div className="flex items-center gap-1.5 font-semibold text-teal-900">
                <ShieldCheck className="h-4 w-4 text-[#0F766E]" />
                <span>Chamadas Seguras</span>
              </div>
              <p className="text-[11px] text-slate-600 leading-relaxed">
                Todas as chamadas exigem header{' '}
                <code className="font-mono text-teal-900">X-API-Key</code> e ocorrem exclusivamente
                server-to-server.
              </p>
            </div>
          </aside>

          {/* Conteúdo Técnico da Documentação */}
          <div className="lg:col-span-9 space-y-6">
            {/* SEÇÃO 1: VISÃO GERAL */}
            <section id="visao-geral" className="scroll-mt-20">
              <Card className="border-slate-200 bg-white shadow-2xs">
                <CardHeader className="pb-3">
                  <div className="flex items-center gap-2">
                    <Server className="h-5 w-5 text-[#0F766E]" />
                    <CardTitle className="text-lg font-bold text-slate-900">
                      1. Visão Geral da API
                    </CardTitle>
                  </div>
                  <CardDescription className="text-xs text-slate-500">
                    Propósito, arquitetura e URLs canônicas da Camada de Integração
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4 text-xs sm:text-sm text-slate-700 leading-relaxed">
                  <p>
                    A <strong>Camada de Integração do Consultor Digital</strong> fornece uma API
                    HTTP REST privada para comunicação <em>server-to-server</em>. O chamador
                    autorizado (o chatbot Consultor Digital hospedado no Render) consome esta API
                    para registrar e sincronizar leads qualificados e agendamentos de reuniões com
                    consultores.
                  </p>

                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 pt-1">
                    <div className="p-3 rounded-lg border border-slate-200 bg-slate-50 space-y-1.5">
                      <div className="flex items-center justify-between">
                        <span className="font-semibold text-slate-900 text-xs flex items-center gap-1.5">
                          <Boxes className="h-3.5 w-3.5 text-[#0F766E]" />
                          GET /tools
                        </span>
                        <Badge className="bg-cyan-100 text-cyan-800 border-cyan-200 text-[10px]">
                          V2 Catálogo
                        </Badge>
                      </div>
                      <p className="text-slate-600 text-xs">
                        Índice canônico de descoberta das tools disponíveis.
                      </p>
                      <code className="text-[10px] font-mono text-slate-800 bg-white p-1 rounded border border-slate-200 block truncate">
                        /api/backend/v1/tools
                      </code>
                    </div>

                    <div className="p-3 rounded-lg border border-slate-200 bg-slate-50 space-y-1.5">
                      <div className="flex items-center justify-between">
                        <span className="font-semibold text-slate-900 text-xs flex items-center gap-1.5">
                          <Send className="h-3.5 w-3.5 text-[#0F766E]" />
                          POST /create_lead
                        </span>
                        <Badge className="bg-emerald-100 text-emerald-800 border-emerald-200 text-[10px]">
                          V1 Baseline
                        </Badge>
                      </div>
                      <p className="text-slate-600 text-xs">
                        Registra lead. Idempotência por <strong>email + empresa</strong>.
                      </p>
                      <code className="text-[10px] font-mono text-slate-800 bg-white p-1 rounded border border-slate-200 block truncate">
                        .../create_lead
                      </code>
                    </div>

                    <div className="p-3 rounded-lg border border-slate-200 bg-slate-50 space-y-1.5">
                      <div className="flex items-center justify-between">
                        <span className="font-semibold text-slate-900 text-xs flex items-center gap-1.5">
                          <Calendar className="h-3.5 w-3.5 text-[#0F766E]" />
                          POST /schedule_meeting
                        </span>
                        <Badge className="bg-teal-100 text-teal-800 border-teal-200 text-[10px]">
                          V2 Agendamento
                        </Badge>
                      </div>
                      <p className="text-slate-600 text-xs">
                        Agenda reunião. Idempotência por <strong>email + data_hora</strong>.
                      </p>
                      <code className="text-[10px] font-mono text-slate-800 bg-white p-1 rounded border border-slate-200 block truncate">
                        .../schedule_meeting
                      </code>
                    </div>

                    <div className="p-3 rounded-lg border border-slate-200 bg-slate-50 space-y-1.5">
                      <div className="flex items-center justify-between">
                        <span className="font-semibold text-slate-900 text-xs flex items-center gap-1.5">
                          <Mail className="h-3.5 w-3.5 text-[#0F766E]" />
                          POST /send_email
                        </span>
                        <Badge className="bg-indigo-100 text-indigo-800 border-indigo-200 text-[10px]">
                          V2 E-mails
                        </Badge>
                      </div>
                      <p className="text-slate-600 text-xs">
                        Envio real SMTP. Idempotência por <strong>idempotency_key</strong>.
                      </p>
                      <code className="text-[10px] font-mono text-slate-800 bg-white p-1 rounded border border-slate-200 block truncate">
                        .../send_email
                      </code>
                    </div>

                    <div className="p-3 rounded-lg border border-slate-200 bg-slate-50 space-y-1.5">
                      <div className="flex items-center justify-between">
                        <span className="font-semibold text-slate-900 text-xs flex items-center gap-1.5">
                          <Calendar className="h-3.5 w-3.5 text-blue-600" />
                          GET /list_meetings
                        </span>
                        <Badge className="bg-blue-100 text-blue-800 border-blue-200 text-[10px]">
                          V2 Consulta
                        </Badge>
                      </div>
                      <p className="text-slate-600 text-xs">
                        Consulta reuniões por email, status e período futuro.
                      </p>
                      <code className="text-[10px] font-mono text-slate-800 bg-white p-1 rounded border border-slate-200 block truncate">
                        .../list_meetings
                      </code>
                    </div>
                  </div>

                  {/* NOTA DE ROTEAMENTO CANÔNICA VS INTERNA */}
                  <div className="p-4 rounded-lg border border-amber-200 bg-amber-50/80 space-y-2">
                    <div className="flex items-start gap-2">
                      <AlertTriangle className="h-4 w-4 text-amber-700 shrink-0 mt-0.5" />
                      <div>
                        <span className="font-bold text-amber-950 text-xs block">
                          Atenção ao Roteamento de Infraestrutura (Skip Cloud vs Chamador Externo)
                        </span>
                        <p className="text-xs text-amber-900 leading-relaxed mt-1">
                          A URL canônica pública do projeto é{' '}
                          <code className="font-mono bg-white px-1.5 py-0.5 rounded border border-amber-300 font-semibold text-amber-950">
                            {canonicalCreateLeadUrl}
                          </code>
                          .
                        </p>
                        <p className="text-xs text-amber-900 leading-relaxed mt-1.5">
                          <strong>Nota de produção:</strong> Houve registros onde o reverse proxy do
                          domínio público (<em>*.goskip.app</em>) não roteou requisições externas
                          para o PocketBase, retornando status{' '}
                          <code className="font-mono font-bold">405 Method Not Allowed</code>. A
                          rota funcional validada em produção para o chamador externo é a URL
                          interna direta:{' '}
                          <code className="font-mono bg-white px-1.5 py-0.5 rounded border border-amber-300 font-semibold text-amber-950 break-all">
                            {internalCreateLeadUrl}
                          </code>
                          . Caso sua chamada a partir do Render retorne 405, configure a variável de
                          ambiente do chamador com o host direto{' '}
                          <code className="font-mono">shrd00.internal.goskip.dev</code>.
                        </p>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </section>

            {/* SEÇÃO 2: AUTENTICAÇÃO */}
            <section id="autenticacao" className="scroll-mt-20">
              <Card className="border-slate-200 bg-white shadow-2xs">
                <CardHeader className="pb-3">
                  <div className="flex items-center gap-2">
                    <KeyRound className="h-5 w-5 text-[#0F766E]" />
                    <CardTitle className="text-lg font-bold text-slate-900">
                      2. Autenticação Server-to-Server
                    </CardTitle>
                  </div>
                  <CardDescription className="text-xs text-slate-500">
                    Header obrigatório e boas práticas de proteção de credenciais
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4 text-xs sm:text-sm text-slate-700">
                  <p>
                    Todas as chamadas à API exigem o cabeçalho HTTP{' '}
                    <code className="font-mono font-bold text-slate-900">X-API-Key</code>. A camada
                    de autenticação opera em tempo constante (<em>constant-time comparison</em>) com
                    política <strong>fail-closed</strong> — requisições sem chave ou com credenciais
                    inválidas são imediatamente rejeitadas com HTTP 401.
                  </p>

                  <div className="p-3.5 rounded-lg border border-slate-200 bg-slate-900 text-slate-100 flex items-center justify-between font-mono text-xs">
                    <div>
                      <span className="text-slate-400 select-none mr-2">Header:</span>
                      <span className="text-emerald-400 font-bold">
                        X-API-Key: sk-live_********************
                      </span>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() =>
                        copyToClipboard('X-API-Key: <SUA_CONSULTOR_API_KEY>', 'Exemplo de Header')
                      }
                      className="h-7 text-xs text-teal-400 hover:text-teal-300 hover:bg-slate-800"
                    >
                      {copiedSnippet === 'Exemplo de Header' ? (
                        <Check className="h-3.5 w-3.5 text-emerald-400 mr-1" />
                      ) : (
                        <Copy className="h-3.5 w-3.5 mr-1" />
                      )}
                      {copiedSnippet === 'Exemplo de Header' ? 'Copiado!' : 'Copiar'}
                    </Button>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-1">
                    <div className="p-3.5 rounded-lg border border-red-200 bg-red-50/70 text-xs text-red-950 space-y-1">
                      <div className="flex items-center gap-1.5 font-bold text-red-900">
                        <Lock className="h-3.5 w-3.5 text-red-700" />
                        <span>Nunca exponha no Frontend</span>
                      </div>
                      <p className="text-red-900 leading-relaxed">
                        A chave de API <strong>jamais deve ser incluída no frontend</strong>, em
                        bundles Vite/React ou repositórios públicos. Deve residir exclusivamente na
                        variável de ambiente do chamador no Render (ex:{' '}
                        <code className="font-mono">CONSULTOR_API_KEY</code>).
                      </p>
                    </div>

                    <div className="p-3.5 rounded-lg border border-teal-200 bg-teal-50/70 text-xs text-teal-950 space-y-1">
                      <div className="flex items-center gap-1.5 font-bold text-teal-900">
                        <Clock className="h-3.5 w-3.5 text-[#0F766E]" />
                        <span>Rate Limiting por Endpoint</span>
                      </div>
                      <p className="text-teal-900 leading-relaxed">
                        A Camada aplica limites em memória por chave: <strong>60 req/min</strong>{' '}
                        para o catálogo <code className="font-mono">/tools</code>,{' '}
                        <strong>120 req/min</strong> para{' '}
                        <code className="font-mono">create_lead</code>,{' '}
                        <code className="font-mono">schedule_meeting</code> e{' '}
                        <code className="font-mono">list_meetings</code>, e{' '}
                        <strong>30 req/min</strong> para{' '}
                        <code className="font-mono">send_email</code>. Se excedido, o servidor
                        retorna HTTP 429 com código <code className="font-mono">RATE_LIMITED</code>.
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </section>

            {/* SEÇÃO 3: REGISTRO DE TOOLS (DESCOBERTA V2) */}
            <section id="registro-tools" className="scroll-mt-20">
              <Card className="border-slate-200 bg-white shadow-2xs">
                <CardHeader className="pb-3 border-b border-slate-100">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <Badge className="bg-cyan-600 text-white font-mono text-xs">GET</Badge>
                      <CardTitle className="text-base sm:text-lg font-bold text-slate-900 font-mono">
                        3. /tools (Registro &amp; Descoberta)
                      </CardTitle>
                    </div>
                    <Badge
                      variant="outline"
                      className="border-cyan-300 text-cyan-800 bg-cyan-50 text-xs w-fit"
                    >
                      Descoberta Dinâmica de Tools
                    </Badge>
                  </div>
                  <CardDescription className="text-xs text-slate-500 mt-1">
                    Permite que o Consultor Digital ou outros clientes descubram dinamicamente as
                    ferramentas disponíveis na Camada de Integração, seus caminhos, métodos, campos
                    obrigatórios/opcionais e regras de idempotência sem necessidade de redeploy do
                    chamador.
                  </CardDescription>
                </CardHeader>
                <CardContent className="pt-4 space-y-4">
                  <div className="p-3.5 rounded-lg border border-slate-200 bg-slate-50 text-xs text-slate-700 space-y-2">
                    <h4 className="font-bold text-slate-900 flex items-center gap-1.5">
                      <Boxes className="h-4 w-4 text-[#0F766E]" />
                      Propósito do Registro na Arquitetura (ADR-001)
                    </h4>
                    <p className="leading-relaxed">
                      Conforme o ADR-001, a HTTP API é o contrato canônico da Camada de Integração.
                      O endpoint{' '}
                      <code className="font-mono font-semibold text-slate-900">
                        GET /v1/tools
                      </code>{' '}
                      atua como índice de capacidades ativas. Novas ferramentas adicionadas à camada
                      tornam-se imediatamente visíveis e introspectáveis pelos chamadores
                      autorizados através de um contrato enxuto e seguro.
                    </p>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 pt-1 font-mono text-[11px]">
                      <div className="bg-white p-2 rounded border border-slate-200">
                        <span className="text-slate-400 block">Método:</span>
                        <strong className="text-cyan-700">GET</strong>
                      </div>
                      <div className="bg-white p-2 rounded border border-slate-200">
                        <span className="text-slate-400 block">Rate Limit:</span>
                        <strong className="text-slate-800">60 req/min</strong>
                      </div>
                      <div className="bg-white p-2 rounded border border-slate-200">
                        <span className="text-slate-400 block">Auditoria:</span>
                        <strong className="text-slate-800">tool_logs (tools_registry)</strong>
                      </div>
                    </div>
                  </div>

                  {/* Exemplos de Response e cURL */}
                  <Tabs defaultValue="res200" className="w-full">
                    <TabsList className="bg-slate-100 border border-slate-200 text-xs">
                      <TabsTrigger value="res200" className="text-xs">
                        Resposta 200 OK (Catálogo Completo)
                      </TabsTrigger>
                      <TabsTrigger value="curl" className="text-xs">
                        cURL
                      </TabsTrigger>
                    </TabsList>

                    <TabsContent value="res200">
                      <div className="rounded-lg border border-cyan-300 bg-slate-950 p-3 relative">
                        <div className="flex items-center justify-between mb-2 pb-2 border-b border-slate-800">
                          <div className="flex items-center gap-2">
                            <Badge className="bg-cyan-600 text-white font-mono text-[10px]">
                              HTTP 200 OK
                            </Badge>
                            <span className="text-xs text-cyan-400 font-mono">
                              total: 3 ferramentas
                            </span>
                          </div>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() =>
                              copyToClipboard(toolsRegistrySuccess200, 'Resposta GET /tools')
                            }
                            className="h-6 text-xs text-cyan-400 hover:text-cyan-300 hover:bg-slate-800"
                          >
                            {copiedSnippet === 'Resposta GET /tools' ? (
                              <Check className="h-3 w-3 mr-1" />
                            ) : (
                              <Copy className="h-3 w-3 mr-1" />
                            )}
                            {copiedSnippet === 'Resposta GET /tools' ? 'Copiado!' : 'Copiar'}
                          </Button>
                        </div>
                        <pre className="font-mono text-xs text-cyan-300 overflow-x-auto whitespace-pre max-h-[420px]">
                          {toolsRegistrySuccess200}
                        </pre>
                      </div>
                    </TabsContent>

                    <TabsContent value="curl">
                      <div className="rounded-lg border border-slate-800 bg-slate-950 p-3 relative">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => copyToClipboard(curlToolsRegistry, 'cURL GET /tools')}
                          className="absolute top-2 right-2 h-7 text-xs text-teal-400 hover:text-teal-300 hover:bg-slate-800"
                        >
                          {copiedSnippet === 'cURL GET /tools' ? (
                            <Check className="h-3.5 w-3.5 mr-1" />
                          ) : (
                            <Copy className="h-3.5 w-3.5 mr-1" />
                          )}
                          {copiedSnippet === 'cURL GET /tools' ? 'Copiado!' : 'Copiar'}
                        </Button>
                        <pre className="font-mono text-xs text-slate-200 overflow-x-auto whitespace-pre pt-5 sm:pt-0">
                          {curlToolsRegistry}
                        </pre>
                      </div>
                    </TabsContent>
                  </Tabs>
                </CardContent>
              </Card>
            </section>

            {/* SEÇÃO 4: ENDPOINT create_lead */}
            <section id="create-lead" className="scroll-mt-20">
              <Card className="border-slate-200 bg-white shadow-2xs">
                <CardHeader className="pb-3 border-b border-slate-100">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <Badge className="bg-emerald-600 text-white font-mono text-xs">POST</Badge>
                      <CardTitle className="text-base sm:text-lg font-bold text-slate-900 font-mono">
                        4. /create_lead
                      </CardTitle>
                    </div>
                    <Badge
                      variant="outline"
                      className="border-emerald-300 text-emerald-800 bg-emerald-50 text-xs w-fit"
                    >
                      Chave de Idempotência: email + empresa
                    </Badge>
                  </div>
                  <CardDescription className="text-xs text-slate-500 mt-1">
                    Registra um novo lead ou retorna o registro existente se o par email + empresa
                    já constar no sistema.
                  </CardDescription>
                </CardHeader>
                <CardContent className="pt-4 space-y-4">
                  {/* Tabela de Campos */}
                  <div>
                    <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wide mb-2">
                      Campos da Requisição (JSON Body)
                    </h3>
                    <div className="overflow-x-auto rounded-lg border border-slate-200">
                      <table className="w-full text-left text-xs border-collapse">
                        <thead>
                          <tr className="border-b border-slate-200 bg-slate-50/90 font-medium text-slate-600">
                            <th className="py-2.5 px-3">Campo</th>
                            <th className="py-2.5 px-3">Tipo</th>
                            <th className="py-2.5 px-3">Obrigatoriedade</th>
                            <th className="py-2.5 px-3">Regras / Descrição</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 font-sans">
                          <tr>
                            <td className="py-2.5 px-3 font-mono font-semibold text-slate-900">
                              nome
                            </td>
                            <td className="py-2.5 px-3 font-mono text-slate-500">string</td>
                            <td className="py-2.5 px-3">
                              <Badge className="bg-red-50 text-red-700 border-red-200 text-[10px]">
                                Obrigatório
                              </Badge>
                            </td>
                            <td className="py-2.5 px-3 text-slate-600">
                              Nome completo do contato. Máximo de 200 caracteres.
                            </td>
                          </tr>
                          <tr>
                            <td className="py-2.5 px-3 font-mono font-semibold text-slate-900">
                              empresa
                            </td>
                            <td className="py-2.5 px-3 font-mono text-slate-500">string</td>
                            <td className="py-2.5 px-3">
                              <Badge className="bg-red-50 text-red-700 border-red-200 text-[10px]">
                                Obrigatório
                              </Badge>
                            </td>
                            <td className="py-2.5 px-3 text-slate-600">
                              Razão social ou nome fantasia. Máx 200 caracteres. Para pessoa física
                              sem empresa associada, enviar o marcador operacional{' '}
                              <code className="font-mono font-semibold text-slate-800">
                                &quot;Pessoa física&quot;
                              </code>
                              .
                            </td>
                          </tr>
                          <tr>
                            <td className="py-2.5 px-3 font-mono font-semibold text-slate-900">
                              email
                            </td>
                            <td className="py-2.5 px-3 font-mono text-slate-500">string</td>
                            <td className="py-2.5 px-3">
                              <Badge className="bg-red-50 text-red-700 border-red-200 text-[10px]">
                                Obrigatório
                              </Badge>
                            </td>
                            <td className="py-2.5 px-3 text-slate-600">
                              Endereço de e-mail válido (RFC). Máximo de 200 caracteres. Normalizado
                              em caixa baixa.
                            </td>
                          </tr>
                          <tr>
                            <td className="py-2.5 px-3 font-mono font-semibold text-slate-900">
                              telefone
                            </td>
                            <td className="py-2.5 px-3 font-mono text-slate-500">string</td>
                            <td className="py-2.5 px-3">
                              <Badge className="bg-red-50 text-red-700 border-red-200 text-[10px]">
                                Obrigatório
                              </Badge>
                            </td>
                            <td className="py-2.5 px-3 text-slate-600">
                              Telefone com DDD para contato comercial. Máximo de 30 caracteres.
                            </td>
                          </tr>
                          <tr>
                            <td className="py-2.5 px-3 font-mono font-semibold text-slate-900">
                              necessidade_identificada
                            </td>
                            <td className="py-2.5 px-3 font-mono text-slate-500">string</td>
                            <td className="py-2.5 px-3">
                              <Badge className="bg-red-50 text-red-700 border-red-200 text-[10px]">
                                Obrigatório
                              </Badge>
                            </td>
                            <td className="py-2.5 px-3 text-slate-600">
                              Diagnóstico da necessidade levantada na conversa. Máx 2000 caracteres.
                            </td>
                          </tr>
                          <tr>
                            <td className="py-2.5 px-3 font-mono font-semibold text-slate-900">
                              estagio_do_lead
                            </td>
                            <td className="py-2.5 px-3 font-mono text-slate-500">enum</td>
                            <td className="py-2.5 px-3">
                              <Badge className="bg-red-50 text-red-700 border-red-200 text-[10px]">
                                Obrigatório
                              </Badge>
                            </td>
                            <td className="py-2.5 px-3 text-slate-600">
                              Estágio do funil. Valores aceitos:{' '}
                              <code className="font-mono bg-slate-100 px-1 py-0.5 rounded text-slate-800 text-[11px]">
                                &quot;novo&quot; | &quot;qualificado&quot; | &quot;proposta&quot; |
                                &quot;descartado&quot;
                              </code>
                              . (Valor comum inicial: &quot;novo&quot;).
                            </td>
                          </tr>
                        </tbody>
                      </table>
                    </div>
                  </div>

                  {/* Exemplos de Request e Response */}
                  <Tabs defaultValue="req" className="w-full">
                    <TabsList className="bg-slate-100 border border-slate-200 text-xs">
                      <TabsTrigger value="req" className="text-xs">
                        Payload de Envio
                      </TabsTrigger>
                      <TabsTrigger value="res201" className="text-xs">
                        Resposta 201 (Novo)
                      </TabsTrigger>
                      <TabsTrigger value="res200" className="text-xs">
                        Resposta 200 (Duplicado)
                      </TabsTrigger>
                      <TabsTrigger value="curl" className="text-xs">
                        cURL
                      </TabsTrigger>
                    </TabsList>

                    <TabsContent value="req">
                      <div className="rounded-lg border border-slate-800 bg-slate-950 p-3 relative">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => copyToClipboard(createLeadPayload, 'Payload create_lead')}
                          className="absolute top-2 right-2 h-7 text-xs text-teal-400 hover:text-teal-300 hover:bg-slate-800"
                        >
                          {copiedSnippet === 'Payload create_lead' ? (
                            <Check className="h-3.5 w-3.5 mr-1" />
                          ) : (
                            <Copy className="h-3.5 w-3.5 mr-1" />
                          )}
                          {copiedSnippet === 'Payload create_lead' ? 'Copiado!' : 'Copiar'}
                        </Button>
                        <pre className="font-mono text-xs text-emerald-300 overflow-x-auto whitespace-pre pt-5 sm:pt-0">
                          {createLeadPayload}
                        </pre>
                      </div>
                    </TabsContent>

                    <TabsContent value="res201">
                      <div className="rounded-lg border border-emerald-300 bg-slate-950 p-3 relative">
                        <div className="flex items-center gap-2 mb-2 pb-2 border-b border-slate-800">
                          <Badge className="bg-emerald-600 text-white font-mono text-[10px]">
                            HTTP 201 Created
                          </Badge>
                          <span className="text-xs text-emerald-400 font-mono">
                            duplicado: false
                          </span>
                        </div>
                        <pre className="font-mono text-xs text-emerald-300 overflow-x-auto whitespace-pre">
                          {createLeadSuccess201}
                        </pre>
                      </div>
                    </TabsContent>

                    <TabsContent value="res200">
                      <div className="rounded-lg border border-teal-300 bg-slate-950 p-3 relative">
                        <div className="flex items-center gap-2 mb-2 pb-2 border-b border-slate-800">
                          <Badge className="bg-teal-600 text-white font-mono text-[10px]">
                            HTTP 200 OK
                          </Badge>
                          <span className="text-xs text-teal-400 font-mono">
                            duplicado: true (idempotente)
                          </span>
                        </div>
                        <pre className="font-mono text-xs text-teal-300 overflow-x-auto whitespace-pre">
                          {createLeadSuccess200}
                        </pre>
                      </div>
                    </TabsContent>

                    <TabsContent value="curl">
                      <div className="rounded-lg border border-slate-800 bg-slate-950 p-3 relative">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => copyToClipboard(curlCreateLead, 'cURL create_lead')}
                          className="absolute top-2 right-2 h-7 text-xs text-teal-400 hover:text-teal-300 hover:bg-slate-800"
                        >
                          {copiedSnippet === 'cURL create_lead' ? (
                            <Check className="h-3.5 w-3.5 mr-1" />
                          ) : (
                            <Copy className="h-3.5 w-3.5 mr-1" />
                          )}
                          {copiedSnippet === 'cURL create_lead' ? 'Copiado!' : 'Copiar'}
                        </Button>
                        <pre className="font-mono text-xs text-slate-200 overflow-x-auto whitespace-pre pt-5 sm:pt-0">
                          {curlCreateLead}
                        </pre>
                      </div>
                    </TabsContent>
                  </Tabs>
                </CardContent>
              </Card>
            </section>

            {/* SEÇÃO 4: ENDPOINT schedule_meeting */}
            <section id="schedule-meeting" className="scroll-mt-20">
              <Card className="border-slate-200 bg-white shadow-2xs">
                <CardHeader className="pb-3 border-b border-slate-100">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <Badge className="bg-teal-600 text-white font-mono text-xs">POST</Badge>
                      <CardTitle className="text-base sm:text-lg font-bold text-slate-900 font-mono">
                        5. /schedule_meeting
                      </CardTitle>
                    </div>
                    <Badge
                      variant="outline"
                      className="border-teal-300 text-teal-800 bg-teal-50 text-xs w-fit"
                    >
                      Chave de Idempotência: email + data_hora
                    </Badge>
                  </div>
                  <CardDescription className="text-xs text-slate-500 mt-1">
                    Registra uma solicitação de reunião com status inicial{' '}
                    <code className="font-mono font-semibold">pendente</code>.
                  </CardDescription>
                </CardHeader>
                <CardContent className="pt-4 space-y-4">
                  {/* Tabela de Campos */}
                  <div>
                    <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wide mb-2">
                      Campos da Requisição (JSON Body)
                    </h3>
                    <div className="overflow-x-auto rounded-lg border border-slate-200">
                      <table className="w-full text-left text-xs border-collapse">
                        <thead>
                          <tr className="border-b border-slate-200 bg-slate-50/90 font-medium text-slate-600">
                            <th className="py-2.5 px-3">Campo</th>
                            <th className="py-2.5 px-3">Tipo</th>
                            <th className="py-2.5 px-3">Obrigatoriedade</th>
                            <th className="py-2.5 px-3">Regras / Descrição</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 font-sans">
                          <tr>
                            <td className="py-2.5 px-3 font-mono font-semibold text-slate-900">
                              nome
                            </td>
                            <td className="py-2.5 px-3 font-mono text-slate-500">string</td>
                            <td className="py-2.5 px-3">
                              <Badge className="bg-red-50 text-red-700 border-red-200 text-[10px]">
                                Obrigatório
                              </Badge>
                            </td>
                            <td className="py-2.5 px-3 text-slate-600">
                              Nome do solicitante. Máximo de 200 caracteres.
                            </td>
                          </tr>
                          <tr>
                            <td className="py-2.5 px-3 font-mono font-semibold text-slate-900">
                              empresa
                            </td>
                            <td className="py-2.5 px-3 font-mono text-slate-500">string</td>
                            <td className="py-2.5 px-3">
                              <Badge className="bg-red-50 text-red-700 border-red-200 text-[10px]">
                                Obrigatório
                              </Badge>
                            </td>
                            <td className="py-2.5 px-3 text-slate-600">
                              Empresa do contato (máx 200). Para pessoa física, enviar{' '}
                              <code className="font-mono">&quot;Pessoa física&quot;</code>.
                            </td>
                          </tr>
                          <tr>
                            <td className="py-2.5 px-3 font-mono font-semibold text-slate-900">
                              email
                            </td>
                            <td className="py-2.5 px-3 font-mono text-slate-500">string</td>
                            <td className="py-2.5 px-3">
                              <Badge className="bg-red-50 text-red-700 border-red-200 text-[10px]">
                                Obrigatório
                              </Badge>
                            </td>
                            <td className="py-2.5 px-3 text-slate-600">
                              E-mail válido RFC, máx 200. Compõe a chave de idempotência com{' '}
                              <code className="font-mono">data_hora</code>.
                            </td>
                          </tr>
                          <tr>
                            <td className="py-2.5 px-3 font-mono font-semibold text-slate-900">
                              telefone
                            </td>
                            <td className="py-2.5 px-3 font-mono text-slate-500">string</td>
                            <td className="py-2.5 px-3">
                              <Badge className="bg-red-50 text-red-700 border-red-200 text-[10px]">
                                Obrigatório
                              </Badge>
                            </td>
                            <td className="py-2.5 px-3 text-slate-600">
                              Telefone para contato. Máximo de 30 caracteres.
                            </td>
                          </tr>
                          <tr>
                            <td className="py-2.5 px-3 font-mono font-semibold text-slate-900">
                              data_hora
                            </td>
                            <td className="py-2.5 px-3 font-mono text-slate-500">
                              string (ISO 8601)
                            </td>
                            <td className="py-2.5 px-3">
                              <Badge className="bg-red-50 text-red-700 border-red-200 text-[10px]">
                                Obrigatório
                              </Badge>
                            </td>
                            <td className="py-2.5 px-3 text-slate-600">
                              <strong>DEVE ser data e horário futuro</strong> com fuso horário
                              explícito (ex:{' '}
                              <code className="font-mono bg-slate-100 px-1 py-0.5 rounded text-slate-800 text-[11px]">
                                &quot;2026-11-25T15:00:00-03:00&quot;
                              </code>{' '}
                              ou sufixo Z). Fuso operacional de referência: America/Sao_Paulo
                              (-03:00).
                            </td>
                          </tr>
                          <tr>
                            <td className="py-2.5 px-3 font-mono font-semibold text-slate-900">
                              assunto
                            </td>
                            <td className="py-2.5 px-3 font-mono text-slate-500">string</td>
                            <td className="py-2.5 px-3">
                              <Badge className="bg-red-50 text-red-700 border-red-200 text-[10px]">
                                Obrigatório
                              </Badge>
                            </td>
                            <td className="py-2.5 px-3 text-slate-600">
                              Pauta ou objetivo da reunião. Máximo de 500 caracteres.
                            </td>
                          </tr>
                          <tr>
                            <td className="py-2.5 px-3 font-mono font-semibold text-slate-900">
                              observacoes
                            </td>
                            <td className="py-2.5 px-3 font-mono text-slate-500">string</td>
                            <td className="py-2.5 px-3">
                              <Badge
                                variant="outline"
                                className="text-slate-600 border-slate-300 text-[10px]"
                              >
                                Opcional
                              </Badge>
                            </td>
                            <td className="py-2.5 px-3 text-slate-600">
                              Detalhes adicionais, link preferencial de Meet ou disponibilidade. Máx
                              3000 caracteres.
                            </td>
                          </tr>
                        </tbody>
                      </table>
                    </div>
                  </div>

                  {/* Ciclo de Status da Reunião */}
                  <div className="p-3.5 rounded-lg border border-slate-200 bg-slate-50/70 space-y-2">
                    <span className="font-bold text-slate-900 text-xs block">
                      Status da Reunião (Ciclo de Vida no Painel)
                    </span>
                    <p className="text-xs text-slate-600">
                      A API grava sempre o status inicial{' '}
                      <code className="font-mono font-semibold">pendente</code>. Os consultores
                      atualizam o status no painel administrativo:
                    </p>
                    <div className="flex flex-wrap gap-2 pt-1">
                      <Badge className="bg-amber-100 text-amber-900 border-amber-300 text-xs">
                        pendente (âmbar) — Criado pela API
                      </Badge>
                      <Badge className="bg-emerald-100 text-emerald-900 border-emerald-300 text-xs">
                        confirmada (esmeralda) — Reunião aceita
                      </Badge>
                      <Badge className="bg-blue-100 text-blue-900 border-blue-300 text-xs">
                        realizada (azul) — Encontro concluído
                      </Badge>
                      <Badge className="bg-red-100 text-red-900 border-red-300 text-xs">
                        cancelada (vermelho) — Desmarcada
                      </Badge>
                    </div>
                  </div>

                  {/* Exemplos de Request e Response */}
                  <Tabs defaultValue="req" className="w-full">
                    <TabsList className="bg-slate-100 border border-slate-200 text-xs">
                      <TabsTrigger value="req" className="text-xs">
                        Payload de Envio
                      </TabsTrigger>
                      <TabsTrigger value="res201" className="text-xs">
                        Resposta 201 (Novo)
                      </TabsTrigger>
                      <TabsTrigger value="res200" className="text-xs">
                        Resposta 200 (Duplicado)
                      </TabsTrigger>
                      <TabsTrigger value="curl" className="text-xs">
                        cURL
                      </TabsTrigger>
                    </TabsList>

                    <TabsContent value="req">
                      <div className="rounded-lg border border-slate-800 bg-slate-950 p-3 relative">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() =>
                            copyToClipboard(scheduleMeetingPayload, 'Payload schedule_meeting')
                          }
                          className="absolute top-2 right-2 h-7 text-xs text-teal-400 hover:text-teal-300 hover:bg-slate-800"
                        >
                          {copiedSnippet === 'Payload schedule_meeting' ? (
                            <Check className="h-3.5 w-3.5 mr-1" />
                          ) : (
                            <Copy className="h-3.5 w-3.5 mr-1" />
                          )}
                          {copiedSnippet === 'Payload schedule_meeting' ? 'Copiado!' : 'Copiar'}
                        </Button>
                        <pre className="font-mono text-xs text-emerald-300 overflow-x-auto whitespace-pre pt-5 sm:pt-0">
                          {scheduleMeetingPayload}
                        </pre>
                      </div>
                    </TabsContent>

                    <TabsContent value="res201">
                      <div className="rounded-lg border border-emerald-300 bg-slate-950 p-3 relative">
                        <div className="flex items-center gap-2 mb-2 pb-2 border-b border-slate-800">
                          <Badge className="bg-emerald-600 text-white font-mono text-[10px]">
                            HTTP 201 Created
                          </Badge>
                          <span className="text-xs text-emerald-400 font-mono">
                            duplicado: false | status: pendente
                          </span>
                        </div>
                        <pre className="font-mono text-xs text-emerald-300 overflow-x-auto whitespace-pre">
                          {scheduleMeetingSuccess201}
                        </pre>
                      </div>
                    </TabsContent>

                    <TabsContent value="res200">
                      <div className="rounded-lg border border-teal-300 bg-slate-950 p-3 relative">
                        <div className="flex items-center gap-2 mb-2 pb-2 border-b border-slate-800">
                          <Badge className="bg-teal-600 text-white font-mono text-[10px]">
                            HTTP 200 OK
                          </Badge>
                          <span className="text-xs text-teal-400 font-mono">
                            duplicado: true (mesmo email + data_hora)
                          </span>
                        </div>
                        <pre className="font-mono text-xs text-teal-300 overflow-x-auto whitespace-pre">
                          {scheduleMeetingSuccess200}
                        </pre>
                      </div>
                    </TabsContent>

                    <TabsContent value="curl">
                      <div className="rounded-lg border border-slate-800 bg-slate-950 p-3 relative">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() =>
                            copyToClipboard(curlScheduleMeeting, 'cURL schedule_meeting')
                          }
                          className="absolute top-2 right-2 h-7 text-xs text-teal-400 hover:text-teal-300 hover:bg-slate-800"
                        >
                          {copiedSnippet === 'cURL schedule_meeting' ? (
                            <Check className="h-3.5 w-3.5 mr-1" />
                          ) : (
                            <Copy className="h-3.5 w-3.5 mr-1" />
                          )}
                          {copiedSnippet === 'cURL schedule_meeting' ? 'Copiado!' : 'Copiar'}
                        </Button>
                        <pre className="font-mono text-xs text-slate-200 overflow-x-auto whitespace-pre pt-5 sm:pt-0">
                          {curlScheduleMeeting}
                        </pre>
                      </div>
                    </TabsContent>
                  </Tabs>
                </CardContent>
              </Card>
            </section>

            {/* SEÇÃO 4.1: ENDPOINT send_email (NOVO - V2) */}
            <section id="send-email" className="scroll-mt-20">
              <Card className="border-slate-200 bg-white shadow-2xs">
                <CardHeader className="pb-3 border-b border-slate-100">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <Badge className="bg-indigo-600 text-white font-mono text-xs">POST</Badge>
                      <CardTitle className="text-base sm:text-lg font-bold text-slate-900 font-mono">
                        6. /send_email
                      </CardTitle>
                    </div>
                    <Badge
                      variant="outline"
                      className="border-indigo-300 text-indigo-800 bg-indigo-50 text-xs w-fit"
                    >
                      Idempotência opcional: idempotency_key
                    </Badge>
                  </div>
                  <CardDescription className="text-xs text-slate-500 mt-1">
                    Envia um e-mail transacional real via serviço SMTP padrão do servidor. Suporta
                    chave de idempotência enviada pelo chamador para prevenir reenvios acidentais.
                  </CardDescription>
                </CardHeader>
                <CardContent className="pt-4 space-y-4">
                  {/* Tabela de Campos */}
                  <div>
                    <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wide mb-2">
                      Campos da Requisição (JSON Body)
                    </h3>
                    <div className="overflow-x-auto rounded-lg border border-slate-200">
                      <table className="w-full text-left text-xs border-collapse">
                        <thead>
                          <tr className="border-b border-slate-200 bg-slate-50/90 font-medium text-slate-600">
                            <th className="py-2.5 px-3">Campo</th>
                            <th className="py-2.5 px-3">Tipo</th>
                            <th className="py-2.5 px-3">Obrigatoriedade</th>
                            <th className="py-2.5 px-3">Regras / Descrição</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 font-sans">
                          <tr>
                            <td className="py-2.5 px-3 font-mono font-semibold text-slate-900">
                              destinatario
                            </td>
                            <td className="py-2.5 px-3 font-mono text-slate-500">string (email)</td>
                            <td className="py-2.5 px-3">
                              <Badge className="bg-red-50 text-red-700 border-red-200 text-[10px]">
                                Obrigatório
                              </Badge>
                            </td>
                            <td className="py-2.5 px-3 text-slate-600">
                              Endereço de e-mail de destino válido (RFC). Máximo de 320 caracteres.
                            </td>
                          </tr>
                          <tr>
                            <td className="py-2.5 px-3 font-mono font-semibold text-slate-900">
                              assunto
                            </td>
                            <td className="py-2.5 px-3 font-mono text-slate-500">string</td>
                            <td className="py-2.5 px-3">
                              <Badge className="bg-red-50 text-red-700 border-red-200 text-[10px]">
                                Obrigatório
                              </Badge>
                            </td>
                            <td className="py-2.5 px-3 text-slate-600">
                              Título/subject do e-mail. Máximo de 200 caracteres.
                            </td>
                          </tr>
                          <tr>
                            <td className="py-2.5 px-3 font-mono font-semibold text-slate-900">
                              corpo
                            </td>
                            <td className="py-2.5 px-3 font-mono text-slate-500">string</td>
                            <td className="py-2.5 px-3">
                              <Badge className="bg-red-50 text-red-700 border-red-200 text-[10px]">
                                Obrigatório
                              </Badge>
                            </td>
                            <td className="py-2.5 px-3 text-slate-600">
                              Conteúdo textual do e-mail (quebras de linha suportadas). Máximo de
                              5000 caracteres.
                            </td>
                          </tr>
                          <tr>
                            <td className="py-2.5 px-3 font-mono font-semibold text-slate-900">
                              idempotency_key
                            </td>
                            <td className="py-2.5 px-3 font-mono text-slate-500">string</td>
                            <td className="py-2.5 px-3">
                              <Badge
                                variant="outline"
                                className="text-slate-600 border-slate-300 text-[10px]"
                              >
                                Opcional
                              </Badge>
                            </td>
                            <td className="py-2.5 px-3 text-slate-600">
                              Identificador único gerado pelo chamador (máx 100). Se fornecido e já
                              processado anteriormente, a API retorna HTTP 200 com{' '}
                              <code className="font-mono">duplicado: true</code> SEM reenviar o
                              e-mail.
                            </td>
                          </tr>
                        </tbody>
                      </table>
                    </div>
                  </div>

                  {/* Notas de Arquitetura e Segurança */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div className="p-3.5 rounded-lg border border-indigo-200 bg-indigo-50/70 space-y-1">
                      <span className="font-bold text-indigo-950 text-xs block">
                        Envio Real via SMTP Padrão
                      </span>
                      <p className="text-xs text-indigo-900 leading-relaxed">
                        O envio é executado diretamente através do cliente SMTP nativo do PocketBase{' '}
                        (<code className="font-mono">$app.newMailClient().send(message)</code>). Não
                        depende de serviços externos adicionais.
                      </p>
                    </div>

                    <div className="p-3.5 rounded-lg border border-amber-200 bg-amber-50/70 space-y-1">
                      <span className="font-bold text-amber-950 text-xs block">
                        Privacidade &amp; LGPD Estrita
                      </span>
                      <p className="text-xs text-amber-900 leading-relaxed">
                        O assunto e o corpo do e-mail{' '}
                        <strong>NUNCA são persistidos em tabelas de logs</strong>. A tabela de
                        rastreio de idempotência grava apenas chave, message_id, status e
                        timestamps.
                      </p>
                    </div>
                  </div>

                  {/* Exemplos de Request e Response */}
                  <Tabs defaultValue="req" className="w-full">
                    <TabsList className="bg-slate-100 border border-slate-200 text-xs">
                      <TabsTrigger value="req" className="text-xs">
                        Payload de Envio
                      </TabsTrigger>
                      <TabsTrigger value="res201" className="text-xs">
                        Resposta 201 (Enviado)
                      </TabsTrigger>
                      <TabsTrigger value="res200" className="text-xs">
                        Resposta 200 (Duplicado)
                      </TabsTrigger>
                      <TabsTrigger value="curl" className="text-xs">
                        cURL
                      </TabsTrigger>
                    </TabsList>

                    <TabsContent value="req">
                      <div className="rounded-lg border border-slate-800 bg-slate-950 p-3 relative">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => copyToClipboard(sendEmailPayload, 'Payload send_email')}
                          className="absolute top-2 right-2 h-7 text-xs text-teal-400 hover:text-teal-300 hover:bg-slate-800"
                        >
                          {copiedSnippet === 'Payload send_email' ? (
                            <Check className="h-3.5 w-3.5 mr-1" />
                          ) : (
                            <Copy className="h-3.5 w-3.5 mr-1" />
                          )}
                          {copiedSnippet === 'Payload send_email' ? 'Copiado!' : 'Copiar'}
                        </Button>
                        <pre className="font-mono text-xs text-emerald-300 overflow-x-auto whitespace-pre pt-5 sm:pt-0">
                          {sendEmailPayload}
                        </pre>
                      </div>
                    </TabsContent>

                    <TabsContent value="res201">
                      <div className="rounded-lg border border-emerald-300 bg-slate-950 p-3 relative">
                        <div className="flex items-center gap-2 mb-2 pb-2 border-b border-slate-800">
                          <Badge className="bg-emerald-600 text-white font-mono text-[10px]">
                            HTTP 201 Created
                          </Badge>
                          <span className="text-xs text-emerald-400 font-mono">
                            duplicado: false | status: enviado
                          </span>
                        </div>
                        <pre className="font-mono text-xs text-emerald-300 overflow-x-auto whitespace-pre">
                          {sendEmailSuccess201}
                        </pre>
                      </div>
                    </TabsContent>

                    <TabsContent value="res200">
                      <div className="rounded-lg border border-teal-300 bg-slate-950 p-3 relative">
                        <div className="flex items-center gap-2 mb-2 pb-2 border-b border-slate-800">
                          <Badge className="bg-teal-600 text-white font-mono text-[10px]">
                            HTTP 200 OK
                          </Badge>
                          <span className="text-xs text-teal-400 font-mono">
                            duplicado: true (idempotency_key repetida — sem reenvio)
                          </span>
                        </div>
                        <pre className="font-mono text-xs text-teal-300 overflow-x-auto whitespace-pre">
                          {sendEmailSuccess200}
                        </pre>
                      </div>
                    </TabsContent>

                    <TabsContent value="curl">
                      <div className="rounded-lg border border-slate-800 bg-slate-950 p-3 relative">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => copyToClipboard(curlSendEmail, 'cURL send_email')}
                          className="absolute top-2 right-2 h-7 text-xs text-teal-400 hover:text-teal-300 hover:bg-slate-800"
                        >
                          {copiedSnippet === 'cURL send_email' ? (
                            <Check className="h-3.5 w-3.5 mr-1" />
                          ) : (
                            <Copy className="h-3.5 w-3.5 mr-1" />
                          )}
                          {copiedSnippet === 'cURL send_email' ? 'Copiado!' : 'Copiar'}
                        </Button>
                        <pre className="font-mono text-xs text-slate-200 overflow-x-auto whitespace-pre pt-5 sm:pt-0">
                          {curlSendEmail}
                        </pre>
                      </div>
                    </TabsContent>
                  </Tabs>
                </CardContent>
              </Card>
            </section>

            {/* SEÇÃO 4.2: ENDPOINT list_meetings (NOVO - V2 LEITURA) */}
            <section id="list-meetings" className="scroll-mt-20">
              <Card className="border-slate-200 bg-white shadow-2xs">
                <CardHeader className="pb-3 border-b border-slate-100">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <Badge className="bg-blue-600 text-white font-mono text-xs">GET</Badge>
                      <CardTitle className="text-base sm:text-lg font-bold text-slate-900 font-mono">
                        7. /list_meetings
                      </CardTitle>
                    </div>
                    <Badge
                      variant="outline"
                      className="border-blue-300 text-blue-800 bg-blue-50 text-xs w-fit"
                    >
                      Leitura Segura (LGPD &amp; Sem Mutação)
                    </Badge>
                  </div>
                  <CardDescription className="text-xs text-slate-500 mt-1">
                    Permite que o Consultor Digital consulte a agenda de reuniões de um contato ou
                    empresa em tempo real, respondendo com precisão se já existem compromissos
                    agendados em vez de apenas registrar cegamente.
                  </CardDescription>
                </CardHeader>
                <CardContent className="pt-4 space-y-4">
                  {/* Tabela de Query Parameters */}
                  <div>
                    <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wide mb-2">
                      Parâmetros de Consulta (Query Params)
                    </h3>
                    <div className="overflow-x-auto rounded-lg border border-slate-200">
                      <table className="w-full text-left text-xs border-collapse">
                        <thead>
                          <tr className="border-b border-slate-200 bg-slate-50/90 font-medium text-slate-600">
                            <th className="py-2.5 px-3">Parâmetro</th>
                            <th className="py-2.5 px-3">Tipo</th>
                            <th className="py-2.5 px-3">Obrigatoriedade</th>
                            <th className="py-2.5 px-3">Regras / Descrição</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 font-sans">
                          <tr>
                            <td className="py-2.5 px-3 font-mono font-semibold text-slate-900">
                              email
                            </td>
                            <td className="py-2.5 px-3 font-mono text-slate-500">string (query)</td>
                            <td className="py-2.5 px-3">
                              <Badge className="bg-slate-100 text-slate-700 border-slate-200 text-[10px]">
                                Opcional
                              </Badge>
                            </td>
                            <td className="py-2.5 px-3 text-slate-600">
                              Filtra reuniões de um contato específico pelo endereço de e-mail (caso
                              de uso canônico do Consultor:{' '}
                              <em>&quot;quais reuniões esse lead já tem?&quot;</em>). Valida formato
                              RFC de e-mail se fornecido.
                            </td>
                          </tr>
                          <tr>
                            <td className="py-2.5 px-3 font-mono font-semibold text-slate-900">
                              status
                            </td>
                            <td className="py-2.5 px-3 font-mono text-slate-500">string (query)</td>
                            <td className="py-2.5 px-3">
                              <Badge className="bg-slate-100 text-slate-700 border-slate-200 text-[10px]">
                                Opcional
                              </Badge>
                            </td>
                            <td className="py-2.5 px-3 text-slate-600">
                              Filtra por status da reunião. Valores estritos permitidos:{' '}
                              <code className="font-mono text-slate-800 font-semibold">
                                pendente | confirmada | realizada | cancelada
                              </code>
                              . Qualquer outro valor gera erro{' '}
                              <code className="font-mono">VALIDATION_ERROR</code>.
                            </td>
                          </tr>
                          <tr>
                            <td className="py-2.5 px-3 font-mono font-semibold text-slate-900">
                              futuras_apenas
                            </td>
                            <td className="py-2.5 px-3 font-mono text-slate-500">
                              boolean / string (query)
                            </td>
                            <td className="py-2.5 px-3">
                              <Badge className="bg-slate-100 text-slate-700 border-slate-200 text-[10px]">
                                Opcional
                              </Badge>
                            </td>
                            <td className="py-2.5 px-3 text-slate-600">
                              Quando <code className="font-mono text-slate-800">true</code> ou{' '}
                              <code className="font-mono text-slate-800">1</code>, filtra
                              exclusivamente reuniões cuja{' '}
                              <code className="font-mono">data_hora &gt;= momento atual</code>,
                              ordenadas de forma crescente. Default:{' '}
                              <code className="font-mono">false</code>.
                            </td>
                          </tr>
                          <tr>
                            <td className="py-2.5 px-3 font-mono font-semibold text-slate-900">
                              limite
                            </td>
                            <td className="py-2.5 px-3 font-mono text-slate-500">number (query)</td>
                            <td className="py-2.5 px-3">
                              <Badge className="bg-slate-100 text-slate-700 border-slate-200 text-[10px]">
                                Opcional (Default: 10)
                              </Badge>
                            </td>
                            <td className="py-2.5 px-3 text-slate-600">
                              Quantidade máxima de reuniões a retornar no array (inteiro entre{' '}
                              <strong>1 e 50</strong>). O campo{' '}
                              <code className="font-mono">total</code> da resposta indica a
                              quantidade efetivamente retornada.
                            </td>
                          </tr>
                        </tbody>
                      </table>
                    </div>
                  </div>

                  {/* Detalhes de LGPD e Ordenação */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-1">
                    <div className="p-3 rounded-lg border border-blue-100 bg-blue-50/60 text-xs text-blue-950 space-y-1.5">
                      <div className="flex items-center gap-1.5 font-bold text-blue-900">
                        <Calendar className="h-4 w-4 text-blue-700" />
                        <span>Regra de Ordenação Natural</span>
                      </div>
                      <p className="text-slate-600 leading-relaxed text-xs">
                        Para reuniões futuras, a ordenação é <strong>cronológica crescente</strong>{' '}
                        (próximos compromissos primeiro). Quando consultado sem o filtro{' '}
                        <code className="font-mono">futuras_apenas</code>, o endpoint retorna
                        reuniões futuras primeiro (crescente) seguidas por compromissos passados
                        mais recentes (decrescente).
                      </p>
                    </div>

                    <div className="p-3 rounded-lg border border-slate-200 bg-slate-50 text-xs text-slate-800 space-y-1.5">
                      <div className="flex items-center gap-1.5 font-bold text-slate-900">
                        <ShieldCheck className="h-4 w-4 text-[#0F766E]" />
                        <span>Proteção LGPD &amp; Truncamento</span>
                      </div>
                      <p className="text-slate-600 leading-relaxed text-xs">
                        A resposta sanitiza os registros expondo apenas metadados de compromisso: o
                        campo <code className="font-mono font-semibold">observacoes</code> é
                        automaticamente truncado a 500 caracteres, e a auditoria em{' '}
                        <code className="font-mono font-semibold">tool_logs</code> não grava os
                        valores dos filtros por respeito à privacidade do titular.
                      </p>
                    </div>
                  </div>

                  {/* Abas com Exemplos */}
                  <Tabs defaultValue="res200" className="w-full">
                    <TabsList className="bg-slate-100 border border-slate-200 text-xs">
                      <TabsTrigger value="res200" className="text-xs">
                        Resposta 200 OK
                      </TabsTrigger>
                      <TabsTrigger value="curl" className="text-xs">
                        cURL
                      </TabsTrigger>
                    </TabsList>

                    <TabsContent value="res200">
                      <div className="rounded-lg border border-blue-300 bg-slate-950 p-3 relative">
                        <div className="flex items-center justify-between mb-2 pb-2 border-b border-slate-800">
                          <div className="flex items-center gap-2">
                            <Badge className="bg-blue-600 text-white font-mono text-[10px]">
                              HTTP 200 OK
                            </Badge>
                            <span className="text-xs text-blue-400 font-mono">
                              total: 2 reuniões encontradas
                            </span>
                          </div>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() =>
                              copyToClipboard(listMeetingsSuccess200, 'Resposta GET /list_meetings')
                            }
                            className="h-6 text-xs text-blue-400 hover:text-blue-300 hover:bg-slate-800"
                          >
                            {copiedSnippet === 'Resposta GET /list_meetings' ? (
                              <Check className="h-3 w-3 mr-1" />
                            ) : (
                              <Copy className="h-3 w-3 mr-1" />
                            )}
                            {copiedSnippet === 'Resposta GET /list_meetings'
                              ? 'Copiado!'
                              : 'Copiar'}
                          </Button>
                        </div>
                        <pre className="font-mono text-xs text-blue-300 overflow-x-auto whitespace-pre max-h-[380px]">
                          {listMeetingsSuccess200}
                        </pre>
                      </div>
                    </TabsContent>

                    <TabsContent value="curl">
                      <div className="rounded-lg border border-slate-800 bg-slate-950 p-3 relative">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => copyToClipboard(curlListMeetings, 'cURL list_meetings')}
                          className="absolute top-2 right-2 h-7 text-xs text-blue-400 hover:text-blue-300 hover:bg-slate-800"
                        >
                          {copiedSnippet === 'cURL list_meetings' ? (
                            <Check className="h-3.5 w-3.5 mr-1" />
                          ) : (
                            <Copy className="h-3.5 w-3.5 mr-1" />
                          )}
                          {copiedSnippet === 'cURL list_meetings' ? 'Copiado!' : 'Copiar'}
                        </Button>
                        <pre className="font-mono text-xs text-slate-200 overflow-x-auto whitespace-pre pt-5 sm:pt-0">
                          {curlListMeetings}
                        </pre>
                      </div>
                    </TabsContent>
                  </Tabs>
                </CardContent>
              </Card>
            </section>

            {/* SEÇÃO 5: ENVELOPE PADRÃO DE RESPOSTA */}
            <section id="envelope-respostas" className="scroll-mt-20">
              <Card className="border-slate-200 bg-white shadow-2xs">
                <CardHeader className="pb-3">
                  <div className="flex items-center gap-2">
                    <Layers className="h-5 w-5 text-[#0F766E]" />
                    <CardTitle className="text-lg font-bold text-slate-900">
                      8. Envelope Padrão de Resposta (V1 & V2)
                    </CardTitle>
                  </div>
                  <CardDescription className="text-xs text-slate-500">
                    Todas as respostas seguem uma estrutura previsível de envelope JSON
                  </CardDescription>
                </CardHeader>{' '}
                <CardContent className="space-y-4 text-xs sm:text-sm text-slate-700">
                  <p>
                    Todas as respostas da API utilizam rigorosamente um dos dois envelopes
                    padronizados, permitindo que o chamador diferencie sucesso e falha através do
                    booleano <code className="font-mono font-bold text-slate-900">ok</code>:
                  </p>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Envelope Sucesso */}
                    <div className="rounded-lg border border-emerald-200 bg-emerald-50/40 p-4 space-y-2">
                      <div className="flex items-center gap-2">
                        <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                        <span className="font-bold text-emerald-950 text-xs">
                          Envelope de Sucesso (HTTP 200 / 201)
                        </span>
                      </div>
                      <p className="text-xs text-emerald-900">
                        Contém <code className="font-mono font-semibold">ok: true</code> e o objeto{' '}
                        <code className="font-mono font-semibold">data</code> com os dados
                        persistidos:
                      </p>
                      <pre className="font-mono text-xs bg-slate-950 text-emerald-300 p-3 rounded border border-slate-800 overflow-x-auto">
                        {`{
  "ok": true,
  "data": {
    /* campos específicos do endpoint */
    "duplicado": false // ou true
  }
}`}
                      </pre>
                    </div>

                    {/* Envelope Erro */}
                    <div className="rounded-lg border border-red-200 bg-red-50/40 p-4 space-y-2">
                      <div className="flex items-center gap-2">
                        <XCircle className="h-4 w-4 text-red-600" />
                        <span className="font-bold text-red-950 text-xs">
                          Envelope de Erro (HTTP 4xx / 5xx)
                        </span>
                      </div>
                      <p className="text-xs text-red-900">
                        Contém <code className="font-mono font-semibold">ok: false</code> e o objeto{' '}
                        <code className="font-mono font-semibold">error</code> estruturado:
                      </p>
                      <pre className="font-mono text-xs bg-slate-950 text-red-300 p-3 rounded border border-slate-800 overflow-x-auto">
                        {`{
  "ok": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Mensagem descritiva amigável",
    "details": [
      { "field": "email", "message": "..." }
    ]
  }
}`}
                      </pre>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </section>

            {/* SEÇÃO 6: ERROS E CÓDIGOS ESTÁVEIS */}
            <section id="erros-codigos" className="scroll-mt-20">
              <Card className="border-slate-200 bg-white shadow-2xs">
                <CardHeader className="pb-3">
                  <div className="flex items-center gap-2">
                    <ShieldAlert className="h-5 w-5 text-red-600" />
                    <CardTitle className="text-lg font-bold text-slate-900">
                      9. Erros e Códigos Estáveis
                    </CardTitle>
                  </div>
                  <CardDescription className="text-xs text-slate-500">
                    Códigos de erro padronizados e semântica de resposta
                  </CardDescription>
                </CardHeader>{' '}
                <CardContent className="space-y-4">
                  <div className="overflow-x-auto rounded-lg border border-slate-200">
                    <table className="w-full text-left text-xs border-collapse">
                      <thead>
                        <tr className="border-b border-slate-200 bg-slate-50/90 font-medium text-slate-600">
                          <th className="py-2.5 px-3">Código Estável (code)</th>
                          <th className="py-2.5 px-3">HTTP Status</th>
                          <th className="py-2.5 px-3">Diagnóstico e Causa</th>
                          <th className="py-2.5 px-3">Ação Recomendada no Chamador</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 font-sans text-xs">
                        <tr>
                          <td className="py-3 px-3 font-mono font-bold text-red-700">
                            VALIDATION_ERROR
                          </td>
                          <td className="py-3 px-3 font-mono font-semibold text-slate-800">
                            400 Bad Request
                          </td>
                          <td className="py-3 px-3 text-slate-600">
                            Campos obrigatórios ausentes, formato de e-mail inválido, estágio fora
                            do enum ou data passada.
                          </td>
                          <td className="py-3 px-3 text-slate-800">
                            Inspecionar array <code className="font-mono">details</code> e corrigir
                            o payload antes de retentar.
                          </td>
                        </tr>
                        <tr>
                          <td className="py-3 px-3 font-mono font-bold text-amber-700">
                            UNAUTHORIZED
                          </td>
                          <td className="py-3 px-3 font-mono font-semibold text-slate-800">
                            401 Unauthorized
                          </td>
                          <td className="py-3 px-3 text-slate-600">
                            Header <code className="font-mono">X-API-Key</code> ausente ou não
                            confere com o token ativo.
                          </td>
                          <td className="py-3 px-3 text-slate-800">
                            Verificar variável de ambiente{' '}
                            <code className="font-mono">CONSULTOR_API_KEY</code> no Render.
                          </td>
                        </tr>
                        <tr>
                          <td className="py-3 px-3 font-mono font-bold text-orange-700">
                            METHOD_NOT_ALLOWED
                          </td>
                          <td className="py-3 px-3 font-mono font-semibold text-slate-800">
                            405 Method Not Allowed
                          </td>
                          <td className="py-3 px-3 text-slate-600">
                            Requisição enviada com método diferente de POST ou proxy público
                            bloqueando a rota.
                          </td>
                          <td className="py-3 px-3 text-slate-800">
                            Garantir POST e acionar fallback para URL interna
                            (...shrd00.internal.goskip.dev).
                          </td>
                        </tr>
                        <tr>
                          <td className="py-3 px-3 font-mono font-bold text-purple-700">
                            RATE_LIMITED
                          </td>
                          <td className="py-3 px-3 font-mono font-semibold text-slate-800">
                            429 Too Many Requests
                          </td>
                          <td className="py-3 px-3 text-slate-600">
                            Limite de 120 requisições/minuto excedido pela mesma chave de API.
                          </td>
                          <td className="py-3 px-3 text-slate-800">
                            Aplicar backoff exponencial e aguardar 60 segundos antes de retentar.
                          </td>
                        </tr>
                        <tr>
                          <td className="py-3 px-3 font-mono font-bold text-slate-700">
                            INTERNAL_ERROR
                          </td>
                          <td className="py-3 px-3 font-mono font-semibold text-slate-800">
                            500 Internal Error
                          </td>
                          <td className="py-3 px-3 text-slate-600">
                            Erro inesperado durante a execução do hook ou falha na camada de
                            persistência.
                          </td>
                          <td className="py-3 px-3 text-slate-800">
                            Retentar com backoff; notificar administrador se persistir.
                          </td>
                        </tr>
                      </tbody>
                    </table>
                  </div>

                  {/* Exemplos de JSON de Erro */}
                  <Tabs defaultValue="val" className="w-full">
                    <TabsList className="bg-slate-100 border border-slate-200 text-xs">
                      <TabsTrigger value="val" className="text-xs">
                        400 VALIDATION_ERROR
                      </TabsTrigger>
                      <TabsTrigger value="unauth" className="text-xs">
                        401 UNAUTHORIZED
                      </TabsTrigger>
                      <TabsTrigger value="meth" className="text-xs">
                        405 METHOD_NOT_ALLOWED
                      </TabsTrigger>
                      <TabsTrigger value="interr" className="text-xs">
                        500 INTERNAL_ERROR
                      </TabsTrigger>
                    </TabsList>

                    <TabsContent value="val">
                      <pre className="font-mono text-xs bg-slate-950 text-red-300 p-3 rounded-lg border border-slate-800 overflow-x-auto whitespace-pre">
                        {errorValidationError}
                      </pre>
                    </TabsContent>
                    <TabsContent value="unauth">
                      <pre className="font-mono text-xs bg-slate-950 text-amber-300 p-3 rounded-lg border border-slate-800 overflow-x-auto whitespace-pre">
                        {errorUnauthorized}
                      </pre>
                    </TabsContent>
                    <TabsContent value="meth">
                      <pre className="font-mono text-xs bg-slate-950 text-orange-300 p-3 rounded-lg border border-slate-800 overflow-x-auto whitespace-pre">
                        {errorMethodNotAllowed}
                      </pre>
                    </TabsContent>
                    <TabsContent value="interr">
                      <pre className="font-mono text-xs bg-slate-950 text-slate-300 p-3 rounded-lg border border-slate-800 overflow-x-auto whitespace-pre">
                        {errorInternal}
                      </pre>
                    </TabsContent>
                  </Tabs>
                </CardContent>
              </Card>
            </section>

            {/* SEÇÃO 7: IDEMPOTÊNCIA */}
            <section id="idempotencia" className="scroll-mt-20">
              <Card className="border-slate-200 bg-white shadow-2xs">
                <CardHeader className="pb-3">
                  <div className="flex items-center gap-2">
                    <RefreshCw className="h-5 w-5 text-[#0F766E]" />
                    <CardTitle className="text-lg font-bold text-slate-900">
                      10. Política de Idempotência
                    </CardTitle>
                  </div>
                  <CardDescription className="text-xs text-slate-500">
                    Garantia de segurança contra execuções duplicadas e retries de rede
                  </CardDescription>
                </CardHeader>{' '}
                <CardContent className="space-y-4 text-xs sm:text-sm text-slate-700 leading-relaxed">
                  <p>
                    Para proteger o sistema contra re-execuções causadas por perda de conexão,
                    retentativas do LLM ou cliques duplicados do usuário no chat, todos os endpoints
                    implementam <strong>idempotência estrita</strong>.
                  </p>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="p-4 rounded-lg border border-slate-200 bg-slate-50 space-y-2">
                      <span className="font-bold text-slate-900 text-xs flex items-center gap-1.5">
                        <Send className="h-4 w-4 text-[#0F766E]" />
                        Idempotência de Leads
                      </span>
                      <p className="text-xs text-slate-600">
                        Chave: <strong className="font-mono text-slate-800">email + empresa</strong>
                        .
                      </p>
                      <ul className="text-xs text-slate-600 space-y-1 list-disc pl-4">
                        <li>
                          <strong>1ª chamada:</strong> Cria lead (<strong>HTTP 201</strong>,{' '}
                          <code className="font-mono">duplicado: false</code>).
                        </li>
                        <li>
                          <strong>Subsequentes:</strong> Retorna <strong>HTTP 200</strong> com mesmo{' '}
                          <code className="font-mono">lead_id</code> e{' '}
                          <code className="font-mono">duplicado: true</code>.
                        </li>
                      </ul>
                    </div>

                    <div className="p-4 rounded-lg border border-slate-200 bg-slate-50 space-y-2">
                      <span className="font-bold text-slate-900 text-xs flex items-center gap-1.5">
                        <Calendar className="h-4 w-4 text-teal-700" />
                        Idempotência de Reuniões
                      </span>
                      <p className="text-xs text-slate-600">
                        Chave:{' '}
                        <strong className="font-mono text-slate-800">email + data_hora</strong>.
                      </p>
                      <ul className="text-xs text-slate-600 space-y-1 list-disc pl-4">
                        <li>
                          <strong>1ª chamada:</strong> Cria reunião (<strong>HTTP 201</strong>,{' '}
                          <code className="font-mono">duplicado: false</code>).
                        </li>
                        <li>
                          <strong>Subsequentes:</strong> Retorna <strong>HTTP 200</strong> com mesmo{' '}
                          <code className="font-mono">meeting_id</code> e{' '}
                          <code className="font-mono">duplicado: true</code>.
                        </li>
                      </ul>
                    </div>

                    <div className="p-4 rounded-lg border border-slate-200 bg-slate-50 space-y-2">
                      <span className="font-bold text-slate-900 text-xs flex items-center gap-1.5">
                        <Mail className="h-4 w-4 text-indigo-700" />
                        Idempotência de E-mails
                      </span>
                      <p className="text-xs text-slate-600">
                        Chave: <strong className="font-mono text-slate-800">
                          idempotency_key
                        </strong>{' '}
                        (opcional).
                      </p>
                      <ul className="text-xs text-slate-600 space-y-1 list-disc pl-4">
                        <li>
                          <strong>Com chave nova:</strong> Envia e grava (<strong>HTTP 201</strong>,{' '}
                          <code className="font-mono">duplicado: false</code>).
                        </li>
                        <li>
                          <strong>Chave repetida:</strong> Retorna <strong>HTTP 200</strong> com{' '}
                          <code className="font-mono">duplicado: true</code> <em>SEM reenviar</em>.
                        </li>
                      </ul>
                    </div>
                  </div>

                  {/* Fluxo Passo a Passo */}
                  <div className="p-4 rounded-lg border border-teal-200 bg-teal-50/50 space-y-3">
                    <span className="font-bold text-teal-950 text-xs block">
                      Fluxo Idempotente Típico no Chatbot
                    </span>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs">
                      <div className="p-2.5 bg-white rounded border border-teal-200 space-y-1">
                        <span className="font-bold text-teal-900 font-mono text-[11px]">
                          Passo 1
                        </span>
                        <p className="text-slate-600 text-[11px]">
                          Chatbot envia dados do lead pela 1ª vez.
                        </p>
                        <Badge className="bg-emerald-100 text-emerald-800 text-[10px]">
                          HTTP 201 (Novo)
                        </Badge>
                      </div>

                      <div className="p-2.5 bg-white rounded border border-teal-200 space-y-1">
                        <span className="font-bold text-teal-900 font-mono text-[11px]">
                          Passo 2
                        </span>
                        <p className="text-slate-600 text-[11px]">
                          Instabilidade no chat provoca re-envio dos mesmos dados.
                        </p>
                        <Badge className="bg-teal-100 text-teal-800 text-[10px]">
                          HTTP 200 (Duplicado)
                        </Badge>
                      </div>

                      <div className="p-2.5 bg-white rounded border border-teal-200 space-y-1">
                        <span className="font-bold text-teal-900 font-mono text-[11px]">
                          Passo 3
                        </span>
                        <p className="text-slate-600 text-[11px]">
                          Chatbot prossegue normalmente sem duplicar no CRM.
                        </p>
                        <Badge variant="outline" className="text-slate-600 text-[10px]">
                          Idempotência OK
                        </Badge>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </section>

            {/* SEÇÃO 8: EXEMPLOS COMPLETOS */}
            <section id="exemplos-completos" className="scroll-mt-20">
              <Card className="border-slate-200 bg-white shadow-2xs">
                <CardHeader className="pb-3">
                  <div className="flex items-center gap-2">
                    <Code2 className="h-5 w-5 text-[#0F766E]" />
                    <CardTitle className="text-lg font-bold text-slate-900">
                      11. Exemplos Completos de Integração
                    </CardTitle>
                  </div>
                  <CardDescription className="text-xs text-slate-500">
                    Snippets prontos para uso em Node.js (TypeScript) e Python
                  </CardDescription>
                </CardHeader>{' '}
                <CardContent className="space-y-4">
                  <Tabs defaultValue="node" className="w-full">
                    <TabsList className="bg-slate-100 border border-slate-200 text-xs">
                      <TabsTrigger value="node" className="text-xs">
                        Node.js / Express / Next.js
                      </TabsTrigger>
                      <TabsTrigger value="python" className="text-xs">
                        Python / Requests
                      </TabsTrigger>
                    </TabsList>

                    <TabsContent value="node">
                      <div className="rounded-lg border border-slate-800 bg-slate-950 p-3 relative">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => copyToClipboard(nodeFullExample, 'Código Node.js')}
                          className="absolute top-2 right-2 h-7 text-xs text-teal-400 hover:text-teal-300 hover:bg-slate-800"
                        >
                          {copiedSnippet === 'Código Node.js' ? (
                            <Check className="h-3.5 w-3.5 mr-1" />
                          ) : (
                            <Copy className="h-3.5 w-3.5 mr-1" />
                          )}
                          {copiedSnippet === 'Código Node.js' ? 'Copiado!' : 'Copiar Código'}
                        </Button>
                        <pre className="font-mono text-xs text-slate-200 overflow-x-auto whitespace-pre pt-6 sm:pt-0 leading-relaxed">
                          {nodeFullExample}
                        </pre>
                      </div>
                    </TabsContent>

                    <TabsContent value="python">
                      <div className="rounded-lg border border-slate-800 bg-slate-950 p-3 relative">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => copyToClipboard(pythonExample, 'Código Python')}
                          className="absolute top-2 right-2 h-7 text-xs text-teal-400 hover:text-teal-300 hover:bg-slate-800"
                        >
                          {copiedSnippet === 'Código Python' ? (
                            <Check className="h-3.5 w-3.5 mr-1" />
                          ) : (
                            <Copy className="h-3.5 w-3.5 mr-1" />
                          )}
                          {copiedSnippet === 'Código Python' ? 'Copiado!' : 'Copiar Código'}
                        </Button>
                        <pre className="font-mono text-xs text-slate-200 overflow-x-auto whitespace-pre pt-6 sm:pt-0 leading-relaxed">
                          {pythonExample}
                        </pre>
                      </div>
                    </TabsContent>
                  </Tabs>
                </CardContent>
              </Card>
            </section>

            {/* SEÇÃO 9: SEGURANÇA E LGPD */}
            <section id="seguranca-lgpd" className="scroll-mt-20">
              <Card className="border-slate-200 bg-white shadow-2xs">
                <CardHeader className="pb-3">
                  <div className="flex items-center gap-2">
                    <ShieldCheck className="h-5 w-5 text-[#0F766E]" />
                    <CardTitle className="text-lg font-bold text-slate-900">
                      12. Segurança &amp; Conformidade LGPD
                    </CardTitle>
                  </div>
                  <CardDescription className="text-xs text-slate-500">
                    Diretrizes de privacidade, auditoria e armazenamento seguro de dados
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4 text-xs sm:text-sm text-slate-700 leading-relaxed">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="p-4 rounded-lg border border-amber-200 bg-amber-50/70 space-y-2">
                      <span className="font-bold text-amber-950 text-xs flex items-center gap-1.5">
                        <Lock className="h-4 w-4 text-amber-700" />
                        Segurança de Credenciais
                      </span>
                      <ul className="text-xs text-amber-950 space-y-1.5 list-disc pl-4">
                        <li>
                          A chave de API <strong>nunca deve ser commitada</strong> em repositórios
                          Git públicos ou privados.
                        </li>
                        <li>
                          Mantenha o segredo exclusivamente nas variáveis de ambiente seguras do seu
                          serviço no Render (ex:{' '}
                          <code className="font-mono font-semibold">CONSULTOR_API_KEY</code>).
                        </li>
                        <li>
                          Em caso de suspeita de vazamento, rotacione a chave na página de
                          Configurações do painel.
                        </li>
                      </ul>
                    </div>

                    <div className="p-4 rounded-lg border border-teal-200 bg-teal-50/70 space-y-2">
                      <span className="font-bold text-teal-950 text-xs flex items-center gap-1.5">
                        <ShieldCheck className="h-4 w-4 text-[#0F766E]" />
                        Conformidade com a LGPD
                      </span>
                      <ul className="text-xs text-teal-950 space-y-1.5 list-disc pl-4">
                        <li>
                          Os <strong>logs de auditoria técnica</strong> (
                          <code className="font-mono">tool_logs</code>) registram apenas metadados
                          operacionais: ferramenta, status HTTP, código de erro, request_id e tempo
                          de execução em milissegundos.
                        </li>
                        <li>
                          <strong>Nenhum dado pessoal sensível (PII)</strong> — como nome, e-mail,
                          telefone, conteúdo da conversa ou{' '}
                          <em>assunto/corpo de e-mails enviados</em> — é persistido na tabela de
                          logs de auditoria ou no rastreio de envio (
                          <code className="font-mono">email_sends</code>).
                        </li>
                        <li>
                          Os dados residem exclusivamente nas coleções de negócio (
                          <code className="font-mono">leads</code>,{' '}
                          <code className="font-mono">meetings</code> e o rastreio cego{' '}
                          <code className="font-mono">email_sends</code>), com controle estrito de
                          acesso por regras RLS do PocketBase.
                        </li>
                      </ul>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </section>
          </div>
        </div>
      )}
    </div>
  )
}
