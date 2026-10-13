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
  Database,
  Cpu,
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
  { id: 'list-leads', label: 'list_leads', badge: 'GET' },
  { id: 'get-lead', label: 'get_lead', badge: 'GET' },
  { id: 'update-lead-stage', label: 'update_lead_stage', badge: 'POST' },
  { id: 'guia-integracao-agente-mcp', label: 'Guia do Agente (MCP)', badge: 'Agente' },
  { id: 'adaptador-mcp', label: 'Adaptador MCP', badge: 'JSON-RPC' },
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
  const canonicalListLeadsUrl = `${publicBaseUrl}${INTEGRATION_CONFIG.publicListLeadsPath}`
  const canonicalGetLeadUrl = `${publicBaseUrl}${INTEGRATION_CONFIG.publicGetLeadPath}`
  const canonicalUpdateLeadStageUrl = `${publicBaseUrl}${INTEGRATION_CONFIG.publicUpdateLeadStagePath}`
  const canonicalToolsRegistryUrl = `${publicBaseUrl}${INTEGRATION_CONFIG.publicToolsRegistryPath}`
  const canonicalMcpUrl = `${publicBaseUrl}${INTEGRATION_CONFIG.publicMcpAdapterPath}`

  const internalBaseUrl = INTEGRATION_CONFIG.backendUrl
  const internalCreateLeadUrl = `${internalBaseUrl}${INTEGRATION_CONFIG.internalEndpointPath}`
  const internalScheduleMeetingUrl = `${internalBaseUrl}${INTEGRATION_CONFIG.internalScheduleMeetingPath}`
  const internalSendEmailUrl = `${internalBaseUrl}${INTEGRATION_CONFIG.internalSendEmailPath}`
  const internalListMeetingsUrl = `${internalBaseUrl}${INTEGRATION_CONFIG.internalListMeetingsPath}`
  const internalListLeadsUrl = `${internalBaseUrl}${INTEGRATION_CONFIG.internalListLeadsPath}`
  const internalGetLeadUrl = `${internalBaseUrl}${INTEGRATION_CONFIG.internalGetLeadPath}`
  const internalUpdateLeadStageUrl = `${internalBaseUrl}${INTEGRATION_CONFIG.internalUpdateLeadStagePath}`
  const internalToolsRegistryUrl = `${internalBaseUrl}${INTEGRATION_CONFIG.internalToolsRegistryPath}`
  const internalMcpUrl = `${internalBaseUrl}${INTEGRATION_CONFIG.internalMcpAdapterPath}`

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
        total: 9,
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
          {
            nome: 'list_leads',
            metodo: 'GET',
            caminho: '/v1/tools/list_leads',
            versao: 'v1',
            descricao:
              'Consulta e lista leads comerciais qualificados com filtros por e-mail, estágio, empresa e limite',
            campos_obrigatorios: [],
            campos_opcionais: ['email', 'estagio_do_lead', 'empresa', 'limite'],
            idempotencia: 'não aplicável (leitura)',
            rate_limit: '120 req/min',
          },
          {
            nome: 'get_lead',
            metodo: 'GET',
            caminho: '/v1/tools/get_lead',
            versao: 'v1',
            descricao:
              'Consulta os detalhes sanitizados de um lead específico a partir do seu id ou endereço de e-mail',
            campos_obrigatorios: [],
            campos_opcionais: ['id', 'email'],
            idempotencia: 'não aplicável (leitura)',
            rate_limit: '120 req/min',
          },
          {
            nome: 'update_lead_stage',
            metodo: 'POST',
            caminho: '/v1/tools/update_lead_stage',
            versao: 'v1',
            descricao:
              'Atualiza o estágio comercial de um lead (novo, qualificado, proposta, descartado) por lead_id ou e-mail',
            campos_obrigatorios: ['estagio_do_lead'],
            campos_opcionais: ['lead_id', 'email', 'observacao'],
            idempotencia: 'natural (mesmo estágio devolve atualizado: true sem erro)',
            rate_limit: '120 req/min',
          },
          {
            nome: 'tools_registry',
            metodo: 'GET',
            caminho: '/v1/tools',
            versao: 'v1',
            descricao:
              'Índice canônico de descoberta e metadados das ferramentas da Camada de Integração',
            campos_obrigatorios: [],
            campos_opcionais: [],
            idempotencia: 'não aplicável (leitura)',
            rate_limit: '60 req/min',
          },
          {
            nome: 'mcp_adapter',
            metodo: 'POST',
            caminho: '/v1/mcp',
            versao: 'v1',
            descricao:
              'Adaptador MCP (Model Context Protocol via JSON-RPC 2.0) sobre o catálogo canônico de ferramentas',
            campos_obrigatorios: ['jsonrpc', 'method'],
            campos_opcionais: ['id', 'params'],
            idempotencia: 'definida por método/tool chamada',
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

  const listLeadsSuccess200 = JSON.stringify(
    {
      ok: true,
      data: {
        total: 2,
        leads: [
          {
            id: 'ljcccduj00419re',
            nome: 'Teste Controlado',
            empresa: 'Pessoa fisica',
            email: 'teste.controlado@exemplo.com',
            telefone: '(11) 97777-8888',
            necessidade_identificada: 'Validacao pos-rotacao',
            estagio_do_lead: 'novo',
            created: '2026-10-12 16:15:00.183Z',
          },
          {
            id: 'zpnga4i0zkj5r37',
            nome: 'Auditoria Integration 2026',
            empresa: 'Test Inc',
            email: 'auditoria_integration_2026@example.com',
            telefone: '11999999999',
            necessidade_identificada: 'Teste automatizado da API de integracao.',
            estagio_do_lead: 'novo',
            created: '2026-10-08 17:16:18.988Z',
          },
        ],
      },
    },
    null,
    2,
  )

  const getLeadSuccess200 = JSON.stringify(
    {
      ok: true,
      data: {
        lead: {
          id: 'ljcccduj00419re',
          nome: 'Teste Controlado',
          empresa: 'Pessoa fisica',
          email: 'teste.controlado@exemplo.com',
          telefone: '(11) 97777-8888',
          necessidade_identificada: 'Validacao pos-rotacao',
          estagio_do_lead: 'novo',
          created: '2026-10-12 16:15:00.183Z',
        },
      },
    },
    null,
    2,
  )

  const getLeadNotFound200 = JSON.stringify(
    {
      ok: true,
      data: {
        lead: null,
      },
    },
    null,
    2,
  )

  const updateLeadStagePayload = JSON.stringify(
    {
      lead_id: 'ljcccduj00419re',
      estagio_do_lead: 'qualificado',
      observacao: 'Lead demonstrou interesse após qualificação pelo Consultor Digital',
    },
    null,
    2,
  )

  const updateLeadStageSuccess200 = JSON.stringify(
    {
      ok: true,
      data: {
        atualizado: true,
        lead_id: 'ljcccduj00419re',
        estagio_anterior: 'novo',
        estagio_novo: 'qualificado',
      },
    },
    null,
    2,
  )

  const updateLeadStageIdempotent200 = JSON.stringify(
    {
      ok: true,
      data: {
        atualizado: true,
        lead_id: 'ljcccduj00419re',
        estagio_anterior: 'qualificado',
        estagio_novo: 'qualificado',
      },
    },
    null,
    2,
  )

  const updateLeadStageNotFound200 = JSON.stringify(
    {
      ok: true,
      data: {
        atualizado: false,
        motivo: 'lead_nao_encontrado',
      },
    },
    null,
    2,
  )

  const curlUpdateLeadStageById = `curl -X POST "${canonicalUpdateLeadStageUrl}" \\
  -H "Content-Type: application/json" \\
  -H "X-API-Key: sk-live_********************" \\
  -d '${updateLeadStagePayload}'`

  const curlUpdateLeadStageByEmail = `curl -X POST "${canonicalUpdateLeadStageUrl}" \\
  -H "Content-Type: application/json" \\
  -H "X-API-Key: sk-live_********************" \\
  -d '{
  "email": "carlos.silva@logitech.com.br",
  "estagio_do_lead": "proposta"
}'`

  const pythonMcpAgentClientCode = `"""
Cliente MCP JSON-RPC 2.0 funcional para integração com a Camada de Integração
Pronto para execução no backend FastAPI do Render (httpx ou requests).
Nunca exponha a API key no frontend ou nos prompts do LLM.
"""

import os
import json
import logging
from typing import Any, Dict, List, Optional
import httpx

logger = logging.getLogger("mcp_agent_client")

class ConsultorMcpClient:
    """
    Cliente de integração MCP (Model Context Protocol) sobre transporte HTTP JSON-RPC 2.0.
    Consome o endpoint /backend/v1/mcp ou /api/backend/v1/mcp com autenticação via header X-API-Key.
    """

    def __init__(
        self,
        endpoint_url: Optional[str] = None,
        api_key: Optional[str] = None,
        timeout: float = 15.0,
    ):
        # NUNCA hardcode a chave. Use sempre variável de ambiente segura no Render.
        self.endpoint_url = endpoint_url or os.getenv(
            "MCP_ENDPOINT_URL",
            "${canonicalMcpUrl}",
        )
        self.api_key = api_key or os.getenv("CONSULTOR_API_KEY", "")
        self.timeout = timeout
        self._request_counter = 0

        if not self.api_key:
            logger.warning(
                "[ALERTA SEGURANÇA] CONSULTOR_API_KEY não definida no ambiente. "
                "Chamadas falharão com HTTP 401 UNAUTHORIZED."
            )

    def _next_id(self) -> int:
        self._request_counter += 1
        return self._request_counter

    def _post_rpc(self, method: str, params: Optional[Dict[str, Any]] = None) -> Dict[str, Any]:
        """Executa uma requisição JSON-RPC 2.0 síncrona."""
        payload = {
            "jsonrpc": "2.0",
            "id": self._next_id(),
            "method": method,
            "params": params or {},
        }
        headers = {
            "Content-Type": "application/json",
            "X-API-Key": self.api_key,
        }

        with httpx.Client(timeout=self.timeout) as client:
            resp = client.post(self.endpoint_url, json=payload, headers=headers)
            resp.raise_for_status()
            data = resp.json()

        if "error" in data:
            err = data["error"]
            raise RuntimeError(
                f"Erro JSON-RPC [{err.get('code')}]: {err.get('message')} - {err.get('data')}"
            )

        return data.get("result", {})

    def initialize(self) -> Dict[str, Any]:
        """Executa o handshake inicial MCP e retorna capacidades e metadados."""
        return self._post_rpc(
            "initialize",
            {
                "protocolVersion": "2024-11-05",
                "capabilities": {},
                "clientInfo": {"name": "render-fastapi-agent", "version": "1.0.0"},
            },
        )

    def list_tools(self) -> List[Dict[str, Any]]:
        """Lista todas as tools disponíveis com seus schemas (inputSchema)."""
        result = self._post_rpc("tools/list", {})
        return result.get("tools", [])

    def call_tool(self, tool_name: str, arguments: Dict[str, Any]) -> Dict[str, Any]:
        """
        Executa uma tool específica via tools/call.
        Devolve o envelope canônico com { ok, data } ou { ok: false, error }.
        Trata isError sem quebrar a execução do agente.
        """
        result = self._post_rpc("tools/call", {"name": tool_name, "arguments": arguments})

        # O adaptador MCP fornece _canonicalEnvelope e content[0].text
        if "_canonicalEnvelope" in result:
            return result["_canonicalEnvelope"]

        content = result.get("content", [])
        if content and content[0].get("type") == "text":
            try:
                return json.loads(content[0]["text"])
            except Exception:
                pass

        return {"ok": not result.get("isError", False), "data": result}


# =========================================================================
# Exemplo de Uso e Loop de Execução do Agente no FastAPI / Render
# =========================================================================
if __name__ == "__main__":
    # 1. Instancia o cliente (lê CONSULTOR_API_KEY das variáveis de ambiente)
    client = ConsultorMcpClient()

    # 2. Handshake e Descoberta de Ferramentas
    init_res = client.initialize()
    print("Servidor MCP conectado:", init_res.get("serverInfo"))

    tools = client.list_tools()
    print(f"Tools descobertas dinamicamente ({len(tools)}):", [t["name"] for t in tools])

    # 3. Exemplo 1: Leitura de Lead (get_lead)
    lead_res = client.call_tool("get_lead", {"email": "carlos.silva@logitech.com.br"})
    print("\\nResultado get_lead:", lead_res)

    # 4. Exemplo 2: Criação de Lead (create_lead) com Idempotência
    novo_lead = client.call_tool(
        "create_lead",
        {
            "nome": "Carlos Silva",
            "empresa": "LogiTech Transportes",
            "email": "carlos.silva@logitech.com.br",
            "telefone": "(11) 98765-4321",
            "necessidade_identificada": "Automação no atendimento de motoristas parceiros",
            "estagio_do_lead": "novo",
        },
    )
    print("\\nResultado create_lead:", novo_lead)

    # 5. Exemplo 3: Atualização de Estágio Comercial (update_lead_stage)
    lead_id = novo_lead.get("data", {}).get("lead_id")
    if lead_id:
        update_res = client.call_tool(
            "update_lead_stage",
            {
                "lead_id": lead_id,
                "estagio_do_lead": "qualificado",
                "observacao": "Qualificado após demonstração de escopo",
            },
        )
        print("\\nResultado update_lead_stage:", update_res)
`

  const llmFunctionCallingMappingCode = `// Mapeamento automático das tools MCP (tools/list) para o formato OpenAI / Anthropic Function Calling
// Executado no orquestrador do chatbot no Render antes de chamar a API do modelo de linguagem.

import type { RegisteredToolSummary } from '@/types/integration';

export function mapMcpToolsToOpenAITools(mcpToolsList: any[]) {
  return mcpToolsList.map((tool) => ({
    type: 'function' as const,
    function: {
      name: tool.name,
      description: tool.description,
      parameters: tool.inputSchema, // O inputSchema do MCP já é um JSON Schema compatível!
    },
  }));
}

// Diretrizes do Loop de Agente Seguro:
// 1. Limite estrito de passos (maxSteps = 5 por turno de conversa) para evitar loops infinitos.
// 2. Se a chamada retornar isError ou ok: false, repassar o erro estruturado para o LLM replanejar
//    ou solicitar esclarecimento ao usuário, NUNCA levantar exceção que derrube o servidor.
// 3. A chave de API permanece exclusivamente nas variáveis de ambiente do backend Render,
//    NUNCA injetada nos prompts de sistema (System Message) nem exposta ao cliente web.
`

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

  // --- Exemplos MCP JSON-RPC 2.0 ---
  const mcpInitializePayload = JSON.stringify(
    {
      jsonrpc: '2.0',
      id: 1,
      method: 'initialize',
      params: {
        protocolVersion: '2024-11-05',
        capabilities: {},
        clientInfo: {
          name: 'claude-desktop-client',
          version: '1.0.0',
        },
      },
    },
    null,
    2,
  )

  const mcpInitializeResponse = JSON.stringify(
    {
      jsonrpc: '2.0',
      id: 1,
      result: {
        protocolVersion: '2024-11-05',
        capabilities: {
          tools: {
            listChanged: false,
          },
        },
        serverInfo: {
          name: 'consultor-integration-layer',
          version: '2.4.0',
        },
        instructions:
          'Adaptador MCP oficial da Camada de Integração do Consultor Digital. Reutiliza o mesmo catálogo canônico das 7 ferramentas validadas em produção com autenticação X-API-Key fail-closed e auditoria LGPD.',
      },
    },
    null,
    2,
  )

  const mcpToolsListPayload = JSON.stringify(
    {
      jsonrpc: '2.0',
      id: 2,
      method: 'tools/list',
      params: {},
    },
    null,
    2,
  )

  const mcpToolsListResponse = JSON.stringify(
    {
      jsonrpc: '2.0',
      id: 2,
      result: {
        tools: [
          {
            name: 'create_lead',
            description:
              'Registra ou atualiza um lead comercial qualificado pelo Consultor Digital. Idempotência por email+empresa.',
            inputSchema: {
              type: 'object',
              properties: {
                nome: { type: 'string', description: 'Nome completo do contato do lead' },
                empresa: { type: 'string', description: "Razão social ou 'Pessoa física'" },
                email: { type: 'string', description: 'Endereço de e-mail válido' },
                telefone: { type: 'string', description: 'Telefone com DDD' },
                necessidade_identificada: { type: 'string', description: 'Diagnóstico da dor' },
                estagio_do_lead: {
                  type: 'string',
                  enum: ['novo', 'qualificado', 'proposta', 'descartado'],
                  default: 'novo',
                },
              },
              required: [
                'nome',
                'empresa',
                'email',
                'telefone',
                'necessidade_identificada',
                'estagio_do_lead',
              ],
            },
          },
          {
            name: 'schedule_meeting',
            description:
              'Registra uma solicitação interna de reunião com o consultor com status inicial pendente.',
            inputSchema: {
              type: 'object',
              properties: {
                nome: { type: 'string' },
                empresa: { type: 'string' },
                email: { type: 'string' },
                telefone: { type: 'string' },
                data_hora: { type: 'string' },
                assunto: { type: 'string' },
              },
              required: ['nome', 'empresa', 'email', 'telefone', 'data_hora', 'assunto'],
            },
          },
          {
            name: 'send_email',
            description:
              'Envia um e-mail transacional real para o destinatário através do serviço padrão do servidor.',
            inputSchema: {
              type: 'object',
              properties: {
                destinatario: { type: 'string' },
                assunto: { type: 'string' },
                corpo: { type: 'string' },
                idempotency_key: { type: 'string' },
              },
              required: ['destinatario', 'assunto', 'corpo'],
            },
          },
          {
            name: 'list_meetings',
            description:
              'Consulta e lista reuniões agendadas com filtros por e-mail, status e período futuro.',
            inputSchema: {
              type: 'object',
              properties: {
                email: { type: 'string' },
                status: {
                  type: 'string',
                  enum: ['pendente', 'confirmada', 'realizada', 'cancelada'],
                },
                futuras_apenas: { type: 'boolean' },
                limite: { type: 'integer' },
              },
            },
          },
          {
            name: 'list_leads',
            description:
              'Consulta e lista leads comerciais qualificados com filtros por e-mail, estágio, empresa e limite.',
            inputSchema: {
              type: 'object',
              properties: {
                email: { type: 'string' },
                estagio_do_lead: {
                  type: 'string',
                  enum: ['novo', 'qualificado', 'proposta', 'descartado'],
                },
                empresa: { type: 'string' },
                limite: { type: 'integer' },
              },
            },
          },
          {
            name: 'get_lead',
            description:
              'Consulta os detalhes sanitizados de um lead específico a partir do seu id ou endereço de e-mail.',
            inputSchema: {
              type: 'object',
              properties: {
                id: { type: 'string' },
                email: { type: 'string' },
              },
            },
          },
          {
            name: 'update_lead_stage',
            description:
              'Atualiza o estágio comercial de um lead existente (novo, qualificado, proposta, descartado) por lead_id ou e-mail com idempotência natural.',
            inputSchema: {
              type: 'object',
              properties: {
                lead_id: { type: 'string' },
                email: { type: 'string' },
                estagio_do_lead: {
                  type: 'string',
                  enum: ['novo', 'qualificado', 'proposta', 'descartado'],
                },
                observacao: { type: 'string' },
              },
              required: ['estagio_do_lead'],
            },
          },
        ],
      },
    },
    null,
    2,
  )

  const mcpToolsCallPayload = JSON.stringify(
    {
      jsonrpc: '2.0',
      id: 3,
      method: 'tools/call',
      params: {
        name: 'create_lead',
        arguments: {
          nome: 'Juliana Ferreira',
          empresa: 'TechLog Soluções',
          email: 'juliana.ferreira@techlog.com.br',
          telefone: '(11) 98888-7777',
          necessidade_identificada: 'Integração de agente autônomo MCP para suporte comercial',
          estagio_do_lead: 'qualificado',
        },
      },
    },
    null,
    2,
  )

  const mcpToolsCallResponse = JSON.stringify(
    {
      jsonrpc: '2.0',
      id: 3,
      result: {
        content: [
          {
            type: 'text',
            text: JSON.stringify(
              {
                ok: true,
                data: {
                  lead_id: 'rec_mcp981247a1',
                  estagio_do_lead: 'qualificado',
                  created_at: '2026-10-13 01:30:00.000Z',
                  duplicado: false,
                },
              },
              null,
              2,
            ),
          },
        ],
        isError: false,
        _canonicalEnvelope: {
          ok: true,
          data: {
            lead_id: 'rec_mcp981247a1',
            estagio_do_lead: 'qualificado',
            created_at: '2026-10-13 01:30:00.000Z',
            duplicado: false,
          },
        },
      },
    },
    null,
    2,
  )

  const mcpClientConfigExample = JSON.stringify(
    {
      mcpServers: {
        consultor_digital: {
          command: 'npx',
          args: ['-y', '@modelcontextprotocol/server-fetch', internalMcpUrl],
          env: {
            MCP_HTTP_HEADER_X_API_KEY: 'SUA_CHAVE_CONSULTOR_API_KEY',
          },
        },
      },
    },
    null,
    2,
  )

  const curlMcpInitialize = `curl -X POST "${internalMcpUrl}" \\
  -H "Content-Type: application/json" \\
  -H "X-API-Key: SUA_CHAVE_CONSULTOR_API_KEY" \\
  -d '${mcpInitializePayload}'`

  const curlMcpToolsList = `curl -X POST "${internalMcpUrl}" \\
  -H "Content-Type: application/json" \\
  -H "X-API-Key: SUA_CHAVE_CONSULTOR_API_KEY" \\
  -d '${mcpToolsListPayload}'`

  const curlMcpToolsCall = `curl -X POST "${internalMcpUrl}" \\
  -H "Content-Type: application/json" \\
  -H "X-API-Key: SUA_CHAVE_CONSULTOR_API_KEY" \\
  -d '${mcpToolsCallPayload}'`

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

  const curlListLeads = `curl -X GET "${canonicalListLeadsUrl}?estagio_do_lead=novo&limite=10" \\
  -H "X-API-Key: sk-live_********************"`

  const curlGetLeadById = `curl -X GET "${canonicalGetLeadUrl}?id=ljcccduj00419re" \\
  -H "X-API-Key: sk-live_********************"`

  const curlGetLeadByEmail = `curl -X GET "${canonicalGetLeadUrl}?email=teste.controlado%40exemplo.com" \\
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

                    <div className="p-3 rounded-lg border border-slate-200 bg-slate-50 space-y-1.5">
                      <div className="flex items-center justify-between">
                        <span className="font-semibold text-slate-900 text-xs flex items-center gap-1.5">
                          <Database className="h-3.5 w-3.5 text-blue-600" />
                          GET /list_leads
                        </span>
                        <Badge className="bg-blue-100 text-blue-800 border-blue-200 text-[10px]">
                          V2 Leitura
                        </Badge>
                      </div>
                      <p className="text-slate-600 text-xs">
                        Lista leads qualificados com filtros por email, estágio e empresa.
                      </p>
                      <code className="text-[10px] font-mono text-slate-800 bg-white p-1 rounded border border-slate-200 block truncate">
                        .../list_leads
                      </code>
                    </div>

                    <div className="p-3 rounded-lg border border-slate-200 bg-slate-50 space-y-1.5">
                      <div className="flex items-center justify-between">
                        <span className="font-semibold text-slate-900 text-xs flex items-center gap-1.5">
                          <CheckCircle2 className="h-3.5 w-3.5 text-blue-600" />
                          GET /get_lead
                        </span>
                        <Badge className="bg-blue-100 text-blue-800 border-blue-200 text-[10px]">
                          V2 Leitura
                        </Badge>
                      </div>
                      <p className="text-slate-600 text-xs">
                        Consulta lead específico sanitizado por ID ou endereço de email.
                      </p>
                      <code className="text-[10px] font-mono text-slate-800 bg-white p-1 rounded border border-slate-200 block truncate">
                        .../get_lead
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
                        <code className="font-mono">schedule_meeting</code>,{' '}
                        <code className="font-mono">list_meetings</code>,{' '}
                        <code className="font-mono">list_leads</code> e{' '}
                        <code className="font-mono">get_lead</code>, e <strong>30 req/min</strong>{' '}
                        para <code className="font-mono">send_email</code>. Se excedido, o servidor
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
                              total: 6 ferramentas
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

            {/* SEÇÃO 4.3: ENDPOINT list_leads (NOVO - V2 LEITURA) */}
            <section id="list-leads" className="scroll-mt-20">
              <Card className="border-slate-200 bg-white shadow-2xs">
                <CardHeader className="pb-3 border-b border-slate-100">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <Badge className="bg-blue-600 text-white font-mono text-xs">GET</Badge>
                      <CardTitle className="text-base sm:text-lg font-bold text-slate-900 font-mono">
                        8. /list_leads
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
                    Permite que o Consultor Digital consulte leads qualificados cadastrados no CRM
                    com filtros por e-mail, estágio do funil, empresa e limite de paginação.
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
                              Filtra leads por endereço exato de e-mail. Valida formato RFC de
                              e-mail se fornecido.
                            </td>
                          </tr>
                          <tr>
                            <td className="py-2.5 px-3 font-mono font-semibold text-slate-900">
                              estagio_do_lead
                            </td>
                            <td className="py-2.5 px-3 font-mono text-slate-500">string (query)</td>
                            <td className="py-2.5 px-3">
                              <Badge className="bg-slate-100 text-slate-700 border-slate-200 text-[10px]">
                                Opcional
                              </Badge>
                            </td>
                            <td className="py-2.5 px-3 text-slate-600">
                              Filtra por estágio comercial. Valores estritos:{' '}
                              <code className="font-mono text-slate-800 font-semibold">
                                novo | qualificado | proposta | descartado
                              </code>
                              . Qualquer outro valor gera erro{' '}
                              <code className="font-mono">VALIDATION_ERROR</code>.
                            </td>
                          </tr>
                          <tr>
                            <td className="py-2.5 px-3 font-mono font-semibold text-slate-900">
                              empresa
                            </td>
                            <td className="py-2.5 px-3 font-mono text-slate-500">string (query)</td>
                            <td className="py-2.5 px-3">
                              <Badge className="bg-slate-100 text-slate-700 border-slate-200 text-[10px]">
                                Opcional
                              </Badge>
                            </td>
                            <td className="py-2.5 px-3 text-slate-600">
                              Filtra leads cujo nome da empresa contenha o termo informado (busca
                              parcial / case-insensitive).
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
                              Quantidade máxima de leads a retornar no array (inteiro entre{' '}
                              <strong>1 e 50</strong>). O campo{' '}
                              <code className="font-mono">total</code> da resposta indica o número
                              retornado.
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
                        A consulta retorna os leads mais recentes primeiro (ordem decrescente de
                        criação: <code className="font-mono">-created</code>), permitindo que o
                        Consultor Digital acesse rapidamente o histórico recente.
                      </p>
                    </div>

                    <div className="p-3 rounded-lg border border-slate-200 bg-slate-50 text-xs text-slate-800 space-y-1.5">
                      <div className="flex items-center gap-1.5 font-bold text-slate-900">
                        <ShieldCheck className="h-4 w-4 text-[#0F766E]" />
                        <span>Sanitização LGPD</span>
                      </div>
                      <p className="text-slate-600 leading-relaxed text-xs">
                        Retorna exclusivamente os campos de contato comercial autorizados:{' '}
                        <code className="font-mono font-semibold">
                          id, nome, empresa, email, telefone, necessidade_identificada,
                          estagio_do_lead, created
                        </code>
                        . Textos longos são truncados a 500 caracteres e a auditoria em{' '}
                        <code className="font-mono font-semibold">tool_logs</code> não grava valores
                        de filtros.
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
                              total: 2 leads encontrados
                            </span>
                          </div>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() =>
                              copyToClipboard(listLeadsSuccess200, 'Resposta GET /list_leads')
                            }
                            className="h-6 text-xs text-blue-400 hover:text-blue-300 hover:bg-slate-800"
                          >
                            {copiedSnippet === 'Resposta GET /list_leads' ? (
                              <Check className="h-3 w-3 mr-1" />
                            ) : (
                              <Copy className="h-3 w-3 mr-1" />
                            )}
                            {copiedSnippet === 'Resposta GET /list_leads' ? 'Copiado!' : 'Copiar'}
                          </Button>
                        </div>
                        <pre className="font-mono text-xs text-blue-300 overflow-x-auto whitespace-pre max-h-[380px]">
                          {listLeadsSuccess200}
                        </pre>
                      </div>
                    </TabsContent>

                    <TabsContent value="curl">
                      <div className="rounded-lg border border-slate-800 bg-slate-950 p-3 relative">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => copyToClipboard(curlListLeads, 'cURL list_leads')}
                          className="absolute top-2 right-2 h-7 text-xs text-blue-400 hover:text-blue-300 hover:bg-slate-800"
                        >
                          {copiedSnippet === 'cURL list_leads' ? (
                            <Check className="h-3.5 w-3.5 mr-1" />
                          ) : (
                            <Copy className="h-3.5 w-3.5 mr-1" />
                          )}
                          {copiedSnippet === 'cURL list_leads' ? 'Copiado!' : 'Copiar'}
                        </Button>
                        <pre className="font-mono text-xs text-slate-200 overflow-x-auto whitespace-pre pt-5 sm:pt-0">
                          {curlListLeads}
                        </pre>
                      </div>
                    </TabsContent>
                  </Tabs>
                </CardContent>
              </Card>
            </section>

            {/* SEÇÃO 4.4: ENDPOINT get_lead (NOVO - V2 LEITURA) */}
            <section id="get-lead" className="scroll-mt-20">
              <Card className="border-slate-200 bg-white shadow-2xs">
                <CardHeader className="pb-3 border-b border-slate-100">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <Badge className="bg-blue-600 text-white font-mono text-xs">GET</Badge>
                      <CardTitle className="text-base sm:text-lg font-bold text-slate-900 font-mono">
                        9. /get_lead
                      </CardTitle>
                    </div>
                    <Badge
                      variant="outline"
                      className="border-blue-300 text-blue-800 bg-blue-50 text-xs w-fit"
                    >
                      Leitura Pontual (ID ou E-mail)
                    </Badge>
                  </div>
                  <CardDescription className="text-xs text-slate-500 mt-1">
                    Retorna os dados cadastrais sanitizados de um lead individual pelo seu ID único
                    de registro ou pelo seu e-mail cadastrado.
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
                              id
                            </td>
                            <td className="py-2.5 px-3 font-mono text-slate-500">string (query)</td>
                            <td className="py-2.5 px-3">
                              <Badge className="bg-slate-100 text-slate-700 border-slate-200 text-[10px]">
                                Condicional
                              </Badge>
                            </td>
                            <td className="py-2.5 px-3 text-slate-600">
                              ID do lead gerado no momento da criação. Possui prioridade sobre o
                              e-mail se ambos forem enviados.
                            </td>
                          </tr>
                          <tr>
                            <td className="py-2.5 px-3 font-mono font-semibold text-slate-900">
                              email
                            </td>
                            <td className="py-2.5 px-3 font-mono text-slate-500">string (query)</td>
                            <td className="py-2.5 px-3">
                              <Badge className="bg-slate-100 text-slate-700 border-slate-200 text-[10px]">
                                Condicional
                              </Badge>
                            </td>
                            <td className="py-2.5 px-3 text-slate-600">
                              Endereço de e-mail do lead. Utilizado quando o ID não é conhecido.
                              Retorna o lead mais recente associado ao e-mail.
                            </td>
                          </tr>
                        </tbody>
                      </table>
                    </div>
                  </div>

                  {/* Regra de Resolução e Não Encontrado */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-1">
                    <div className="p-3 rounded-lg border border-blue-100 bg-blue-50/60 text-xs text-blue-950 space-y-1.5">
                      <div className="flex items-center gap-1.5 font-bold text-blue-900">
                        <CheckCircle2 className="h-4 w-4 text-blue-700" />
                        <span>Resolução de Prioridade</span>
                      </div>
                      <p className="text-slate-600 leading-relaxed text-xs">
                        Se ambos <code className="font-mono">id</code> e{' '}
                        <code className="font-mono">email</code> forem informados, a busca por{' '}
                        <strong>ID tem precedência estrita</strong>. Se nenhum for fornecido, a API
                        retorna HTTP 400 com <code className="font-mono">VALIDATION_ERROR</code>.
                      </p>
                    </div>

                    <div className="p-3 rounded-lg border border-slate-200 bg-slate-50 text-xs text-slate-800 space-y-1.5">
                      <div className="flex items-center gap-1.5 font-bold text-slate-900">
                        <ShieldCheck className="h-4 w-4 text-[#0F766E]" />
                        <span>Tratamento Quando Não Encontrado</span>
                      </div>
                      <p className="text-slate-600 leading-relaxed text-xs">
                        Quando nenhum lead corresponder ao ID ou e-mail fornecido, a resposta
                        retorna <strong>HTTP 200 OK</strong> com{' '}
                        <code className="font-mono font-semibold">{`{ "ok": true, "data": { "lead": null } }`}</code>
                        , permitindo que o Consultor tome a decisão de fluxo sem erros de
                        transporte.
                      </p>
                    </div>
                  </div>

                  {/* Abas com Exemplos */}
                  <Tabs defaultValue="res200" className="w-full">
                    <TabsList className="bg-slate-100 border border-slate-200 text-xs">
                      <TabsTrigger value="res200" className="text-xs">
                        200 Encontrado
                      </TabsTrigger>
                      <TabsTrigger value="resNull" className="text-xs">
                        200 Não Encontrado (null)
                      </TabsTrigger>
                      <TabsTrigger value="curlId" className="text-xs">
                        cURL por ID
                      </TabsTrigger>
                      <TabsTrigger value="curlEmail" className="text-xs">
                        cURL por E-mail
                      </TabsTrigger>
                    </TabsList>

                    <TabsContent value="res200">
                      <div className="rounded-lg border border-blue-300 bg-slate-950 p-3 relative">
                        <div className="flex items-center justify-between mb-2 pb-2 border-b border-slate-800">
                          <Badge className="bg-blue-600 text-white font-mono text-[10px]">
                            HTTP 200 OK
                          </Badge>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() =>
                              copyToClipboard(getLeadSuccess200, 'Resposta GET /get_lead')
                            }
                            className="h-6 text-xs text-blue-400 hover:text-blue-300 hover:bg-slate-800"
                          >
                            {copiedSnippet === 'Resposta GET /get_lead' ? (
                              <Check className="h-3 w-3 mr-1" />
                            ) : (
                              <Copy className="h-3 w-3 mr-1" />
                            )}
                            {copiedSnippet === 'Resposta GET /get_lead' ? 'Copiado!' : 'Copiar'}
                          </Button>
                        </div>
                        <pre className="font-mono text-xs text-blue-300 overflow-x-auto whitespace-pre max-h-[380px]">
                          {getLeadSuccess200}
                        </pre>
                      </div>
                    </TabsContent>

                    <TabsContent value="resNull">
                      <div className="rounded-lg border border-slate-700 bg-slate-950 p-3 relative">
                        <div className="flex items-center justify-between mb-2 pb-2 border-b border-slate-800">
                          <Badge className="bg-slate-700 text-slate-200 font-mono text-[10px]">
                            HTTP 200 OK (lead: null)
                          </Badge>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() =>
                              copyToClipboard(getLeadNotFound200, 'Resposta GET /get_lead null')
                            }
                            className="h-6 text-xs text-slate-400 hover:text-slate-300 hover:bg-slate-800"
                          >
                            {copiedSnippet === 'Resposta GET /get_lead null' ? (
                              <Check className="h-3 w-3 mr-1" />
                            ) : (
                              <Copy className="h-3 w-3 mr-1" />
                            )}
                            {copiedSnippet === 'Resposta GET /get_lead null'
                              ? 'Copiado!'
                              : 'Copiar'}
                          </Button>
                        </div>
                        <pre className="font-mono text-xs text-slate-300 overflow-x-auto whitespace-pre">
                          {getLeadNotFound200}
                        </pre>
                      </div>
                    </TabsContent>

                    <TabsContent value="curlId">
                      <div className="rounded-lg border border-slate-800 bg-slate-950 p-3 relative">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => copyToClipboard(curlGetLeadById, 'cURL get_lead por ID')}
                          className="absolute top-2 right-2 h-7 text-xs text-blue-400 hover:text-blue-300 hover:bg-slate-800"
                        >
                          {copiedSnippet === 'cURL get_lead por ID' ? (
                            <Check className="h-3.5 w-3.5 mr-1" />
                          ) : (
                            <Copy className="h-3.5 w-3.5 mr-1" />
                          )}
                          {copiedSnippet === 'cURL get_lead por ID' ? 'Copiado!' : 'Copiar'}
                        </Button>
                        <pre className="font-mono text-xs text-slate-200 overflow-x-auto whitespace-pre pt-5 sm:pt-0">
                          {curlGetLeadById}
                        </pre>
                      </div>
                    </TabsContent>

                    <TabsContent value="curlEmail">
                      <div className="rounded-lg border border-slate-800 bg-slate-950 p-3 relative">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() =>
                            copyToClipboard(curlGetLeadByEmail, 'cURL get_lead por E-mail')
                          }
                          className="absolute top-2 right-2 h-7 text-xs text-blue-400 hover:text-blue-300 hover:bg-slate-800"
                        >
                          {copiedSnippet === 'cURL get_lead por E-mail' ? (
                            <Check className="h-3.5 w-3.5 mr-1" />
                          ) : (
                            <Copy className="h-3.5 w-3.5 mr-1" />
                          )}
                          {copiedSnippet === 'cURL get_lead por E-mail' ? 'Copiado!' : 'Copiar'}
                        </Button>
                        <pre className="font-mono text-xs text-slate-200 overflow-x-auto whitespace-pre pt-5 sm:pt-0">
                          {curlGetLeadByEmail}
                        </pre>
                      </div>
                    </TabsContent>
                  </Tabs>
                </CardContent>
              </Card>
            </section>

            {/* SEÇÃO 4.4: ENDPOINT update_lead_stage (NOVO - V2 ESCRITA) */}
            <section id="update-lead-stage" className="scroll-mt-20">
              <Card className="border-slate-200 bg-white shadow-2xs">
                <CardHeader className="pb-3 border-b border-slate-100">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <Badge className="bg-purple-600 text-white font-mono text-xs">POST</Badge>
                      <CardTitle className="text-base sm:text-lg font-bold text-slate-900 font-mono">
                        10. /update_lead_stage
                      </CardTitle>
                    </div>
                    <Badge
                      variant="outline"
                      className="border-purple-300 text-purple-800 bg-purple-50 text-xs w-fit"
                    >
                      Idempotência Natural (lead_id ou email)
                    </Badge>
                  </div>
                  <CardDescription className="text-xs text-slate-500 mt-1">
                    Atualiza exclusivamente o estágio comercial de um lead existente (novo,
                    qualificado, proposta, descartado). Se já estiver no mesmo estágio, retorna
                    sucesso estável sem erro.
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
                              lead_id
                            </td>
                            <td className="py-2.5 px-3 font-mono text-slate-500">string</td>
                            <td className="py-2.5 px-3">
                              <Badge className="bg-slate-100 text-slate-700 border-slate-200 text-[10px]">
                                Condicional
                              </Badge>
                            </td>
                            <td className="py-2.5 px-3 text-slate-600">
                              ID do lead no PocketBase. Precede o e-mail se ambos forem fornecidos.
                              Obrigatório informar <code className="font-mono">lead_id</code> OU{' '}
                              <code className="font-mono">email</code>.
                            </td>
                          </tr>
                          <tr>
                            <td className="py-2.5 px-3 font-mono font-semibold text-slate-900">
                              email
                            </td>
                            <td className="py-2.5 px-3 font-mono text-slate-500">string</td>
                            <td className="py-2.5 px-3">
                              <Badge className="bg-slate-100 text-slate-700 border-slate-200 text-[10px]">
                                Condicional
                              </Badge>
                            </td>
                            <td className="py-2.5 px-3 text-slate-600">
                              E-mail do lead cadastrado. Utilizado para busca quando{' '}
                              <code className="font-mono">lead_id</code> não for informado. Localiza
                              o lead mais recente associado ao e-mail.
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
                              Novo estágio do lead. Valores válidos:{' '}
                              <code className="font-mono bg-slate-100 px-1 py-0.5 rounded text-slate-800 text-[11px]">
                                &quot;novo&quot; | &quot;qualificado&quot; | &quot;proposta&quot; |
                                &quot;descartado&quot;
                              </code>
                              .
                            </td>
                          </tr>
                          <tr>
                            <td className="py-2.5 px-3 font-mono font-semibold text-slate-900">
                              observacao
                            </td>
                            <td className="py-2.5 px-3 font-mono text-slate-500">string</td>
                            <td className="py-2.5 px-3">
                              <Badge className="bg-slate-100 text-slate-700 border-slate-200 text-[10px]">
                                Opcional
                              </Badge>
                            </td>
                            <td className="py-2.5 px-3 text-slate-600">
                              Texto livre de até 500 caracteres para anotações contextuais internas
                              (conforme LGPD, <strong>NÃO</strong> é gravado na tabela{' '}
                              <code className="font-mono">tool_logs</code>).
                            </td>
                          </tr>
                        </tbody>
                      </table>
                    </div>
                  </div>

                  {/* Detalhes de Comportamento e Idempotência */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-1">
                    <div className="p-3 rounded-lg border border-purple-100 bg-purple-50/60 text-xs text-purple-950 space-y-1.5">
                      <div className="flex items-center gap-1.5 font-bold text-purple-900">
                        <RefreshCw className="h-4 w-4 text-purple-700" />
                        <span>Idempotência Natural</span>
                      </div>
                      <p className="text-slate-600 leading-relaxed text-xs">
                        Se a ferramenta for chamada repetidamente com o mesmo estágio já gravado, o
                        servidor responde <strong>HTTP 200</strong> com{' '}
                        <code className="font-mono font-semibold">atualizado: true</code> e{' '}
                        <code className="font-mono">estagio_anterior === estagio_novo</code> sem
                        gerar erro.
                      </p>
                    </div>

                    <div className="p-3 rounded-lg border border-slate-200 bg-slate-50 text-xs text-slate-800 space-y-1.5">
                      <div className="flex items-center gap-1.5 font-bold text-slate-900">
                        <ShieldCheck className="h-4 w-4 text-[#0F766E]" />
                        <span>Lead Não Encontrado (Sem Erro Falso)</span>
                      </div>
                      <p className="text-slate-600 leading-relaxed text-xs">
                        Se o lead não for localizado pelo ID ou e-mail, a resposta retorna{' '}
                        <strong>HTTP 200 OK</strong> com{' '}
                        <code className="font-mono font-semibold">{`{ ok: true, data: { atualizado: false, motivo: "lead_nao_encontrado" } }`}</code>
                        , mantendo estabilidade para o agente.
                      </p>
                    </div>
                  </div>

                  {/* Abas com Exemplos de Request e Respostas */}
                  <Tabs defaultValue="res200" className="w-full">
                    <TabsList className="bg-slate-100 border border-slate-200 text-xs">
                      <TabsTrigger value="res200" className="text-xs">
                        200 Atualizado
                      </TabsTrigger>
                      <TabsTrigger value="resIdem" className="text-xs">
                        200 Idempotente
                      </TabsTrigger>
                      <TabsTrigger value="resNotFound" className="text-xs">
                        200 Não Encontrado
                      </TabsTrigger>
                      <TabsTrigger value="curlId" className="text-xs">
                        cURL por ID
                      </TabsTrigger>
                      <TabsTrigger value="curlEmail" className="text-xs">
                        cURL por E-mail
                      </TabsTrigger>
                    </TabsList>

                    <TabsContent value="res200">
                      <div className="rounded-lg border border-purple-300 bg-slate-950 p-3 relative">
                        <div className="flex items-center justify-between mb-2 pb-2 border-b border-slate-800">
                          <Badge className="bg-purple-600 text-white font-mono text-[10px]">
                            HTTP 200 OK (atualizado: true)
                          </Badge>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() =>
                              copyToClipboard(
                                updateLeadStageSuccess200,
                                'Resposta update_lead_stage 200',
                              )
                            }
                            className="h-6 text-xs text-purple-400 hover:text-purple-300 hover:bg-slate-800"
                          >
                            {copiedSnippet === 'Resposta update_lead_stage 200' ? (
                              <Check className="h-3 w-3 mr-1" />
                            ) : (
                              <Copy className="h-3 w-3 mr-1" />
                            )}
                            {copiedSnippet === 'Resposta update_lead_stage 200'
                              ? 'Copiado!'
                              : 'Copiar'}
                          </Button>
                        </div>
                        <pre className="font-mono text-xs text-purple-300 overflow-x-auto whitespace-pre">
                          {updateLeadStageSuccess200}
                        </pre>
                      </div>
                    </TabsContent>

                    <TabsContent value="resIdem">
                      <div className="rounded-lg border border-teal-300 bg-slate-950 p-3 relative">
                        <div className="flex items-center justify-between mb-2 pb-2 border-b border-slate-800">
                          <Badge className="bg-teal-600 text-white font-mono text-[10px]">
                            HTTP 200 OK (Idempotente)
                          </Badge>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() =>
                              copyToClipboard(
                                updateLeadStageIdempotent200,
                                'Resposta update_lead_stage idempotente',
                              )
                            }
                            className="h-6 text-xs text-teal-400 hover:text-teal-300 hover:bg-slate-800"
                          >
                            {copiedSnippet === 'Resposta update_lead_stage idempotente' ? (
                              <Check className="h-3 w-3 mr-1" />
                            ) : (
                              <Copy className="h-3 w-3 mr-1" />
                            )}
                            {copiedSnippet === 'Resposta update_lead_stage idempotente'
                              ? 'Copiado!'
                              : 'Copiar'}
                          </Button>
                        </div>
                        <pre className="font-mono text-xs text-teal-300 overflow-x-auto whitespace-pre">
                          {updateLeadStageIdempotent200}
                        </pre>
                      </div>
                    </TabsContent>

                    <TabsContent value="resNotFound">
                      <div className="rounded-lg border border-slate-700 bg-slate-950 p-3 relative">
                        <div className="flex items-center justify-between mb-2 pb-2 border-b border-slate-800">
                          <Badge className="bg-slate-700 text-slate-200 font-mono text-[10px]">
                            HTTP 200 OK (Não Encontrado)
                          </Badge>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() =>
                              copyToClipboard(
                                updateLeadStageNotFound200,
                                'Resposta update_lead_stage não encontrado',
                              )
                            }
                            className="h-6 text-xs text-slate-400 hover:text-slate-300 hover:bg-slate-800"
                          >
                            {copiedSnippet === 'Resposta update_lead_stage não encontrado' ? (
                              <Check className="h-3 w-3 mr-1" />
                            ) : (
                              <Copy className="h-3 w-3 mr-1" />
                            )}
                            {copiedSnippet === 'Resposta update_lead_stage não encontrado'
                              ? 'Copiado!'
                              : 'Copiar'}
                          </Button>
                        </div>
                        <pre className="font-mono text-xs text-slate-300 overflow-x-auto whitespace-pre">
                          {updateLeadStageNotFound200}
                        </pre>
                      </div>
                    </TabsContent>

                    <TabsContent value="curlId">
                      <div className="rounded-lg border border-slate-800 bg-slate-950 p-3 relative">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() =>
                            copyToClipboard(
                              curlUpdateLeadStageById,
                              'cURL update_lead_stage por ID',
                            )
                          }
                          className="absolute top-2 right-2 h-7 text-xs text-purple-400 hover:text-purple-300 hover:bg-slate-800"
                        >
                          {copiedSnippet === 'cURL update_lead_stage por ID' ? (
                            <Check className="h-3.5 w-3.5 mr-1" />
                          ) : (
                            <Copy className="h-3.5 w-3.5 mr-1" />
                          )}
                          {copiedSnippet === 'cURL update_lead_stage por ID'
                            ? 'Copiado!'
                            : 'Copiar'}
                        </Button>
                        <pre className="font-mono text-xs text-slate-200 overflow-x-auto whitespace-pre pt-5 sm:pt-0">
                          {curlUpdateLeadStageById}
                        </pre>
                      </div>
                    </TabsContent>

                    <TabsContent value="curlEmail">
                      <div className="rounded-lg border border-slate-800 bg-slate-950 p-3 relative">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() =>
                            copyToClipboard(
                              curlUpdateLeadStageByEmail,
                              'cURL update_lead_stage por E-mail',
                            )
                          }
                          className="absolute top-2 right-2 h-7 text-xs text-purple-400 hover:text-purple-300 hover:bg-slate-800"
                        >
                          {copiedSnippet === 'cURL update_lead_stage por E-mail' ? (
                            <Check className="h-3.5 w-3.5 mr-1" />
                          ) : (
                            <Copy className="h-3.5 w-3.5 mr-1" />
                          )}
                          {copiedSnippet === 'cURL update_lead_stage por E-mail'
                            ? 'Copiado!'
                            : 'Copiar'}
                        </Button>
                        <pre className="font-mono text-xs text-slate-200 overflow-x-auto whitespace-pre pt-5 sm:pt-0">
                          {curlUpdateLeadStageByEmail}
                        </pre>
                      </div>
                    </TabsContent>
                  </Tabs>
                </CardContent>
              </Card>
            </section>

            {/* SEÇÃO 4.4.1: GUIA DE INTEGRAÇÃO DO AGENTE (CONSULTOR VIA MCP) */}
            <section id="guia-integracao-agente-mcp" className="scroll-mt-20">
              <Card className="border-teal-200 bg-white shadow-2xs">
                <CardHeader className="pb-3 border-b border-teal-50">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <Sparkles className="h-5 w-5 text-teal-700" />
                      <CardTitle className="text-lg font-bold text-slate-900">
                        11. Guia de Integração do Agente (Consultor via MCP)
                      </CardTitle>
                      <Badge className="bg-teal-700 text-white font-mono text-[10px]">
                        FastAPI / Render
                      </Badge>
                    </div>
                    <Badge
                      variant="outline"
                      className="text-teal-800 border-teal-300 self-start sm:self-auto text-[11px]"
                    >
                      ADR-001: Autonomia &amp; Segurança
                    </Badge>
                  </div>
                  <CardDescription className="text-xs text-slate-500">
                    Arquitetura completa do loop de execução autônoma, credenciais seguras, cliente
                    Python em JSON-RPC 2.0 e mapeamento de function-calling
                  </CardDescription>
                </CardHeader>

                <CardContent className="space-y-5 pt-4 text-xs sm:text-sm text-slate-700">
                  {/* (a) O Loop do Agente */}
                  <div className="rounded-lg border border-teal-200 bg-teal-50/50 p-4 space-y-3">
                    <h4 className="font-bold text-teal-950 text-xs flex items-center gap-1.5 uppercase tracking-wider">
                      <RefreshCw className="h-4 w-4 text-teal-700" />
                      (a) Ciclo de Vida do Loop do Agente Autônomo
                    </h4>
                    <p className="text-xs text-teal-900 leading-relaxed">
                      O Consultor Digital opera em um ciclo contínuo e determinístico de 5 fases. A
                      Camada de Integração apenas valida e executa as ferramentas solicitadas,
                      deixando toda a autonomia de raciocínio no orquestrador do chatbot:
                    </p>

                    <div className="grid grid-cols-1 sm:grid-cols-5 gap-2 pt-1">
                      <div className="p-2.5 bg-white rounded border border-teal-200 space-y-1">
                        <span className="font-bold text-teal-900 font-mono text-[11px] block">
                          1. Descobrir
                        </span>
                        <p className="text-slate-600 text-[11px]">
                          Chama <code className="font-mono">tools/list</code> no MCP e introspecta o
                          catálogo em tempo de execução sem redeploy.
                        </p>
                      </div>

                      <div className="p-2.5 bg-white rounded border border-teal-200 space-y-1">
                        <span className="font-bold text-teal-900 font-mono text-[11px] block">
                          2. Mapear
                        </span>
                        <p className="text-slate-600 text-[11px]">
                          Converte os schemas JSON Schema para o array de tools esperado pelo modelo
                          (OpenAI / Claude).
                        </p>
                      </div>

                      <div className="p-2.5 bg-white rounded border border-teal-200 space-y-1">
                        <span className="font-bold text-teal-900 font-mono text-[11px] block">
                          3. Decidir
                        </span>
                        <p className="text-slate-600 text-[11px]">
                          O LLM raciocina sobre a conversa e emite uma ou mais chamadas
                          (tool_calls).
                        </p>
                      </div>

                      <div className="p-2.5 bg-white rounded border border-teal-200 space-y-1">
                        <span className="font-bold text-teal-900 font-mono text-[11px] block">
                          4. Executar
                        </span>
                        <p className="text-slate-600 text-[11px]">
                          O cliente envia <code className="font-mono">tools/call</code> com
                          autenticação <code className="font-mono">X-API-Key</code>.
                        </p>
                      </div>

                      <div className="p-2.5 bg-white rounded border border-teal-200 space-y-1">
                        <span className="font-bold text-teal-900 font-mono text-[11px] block">
                          5. Consumir
                        </span>
                        <p className="text-slate-600 text-[11px]">
                          Lê o resultado do envelope, alimenta o histórico do chat e responde ao
                          usuário final.
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* (b) Endpoint MCP e Autenticação */}
                  <div className="space-y-2">
                    <h4 className="font-bold text-slate-900 text-xs uppercase tracking-wider">
                      (b) Endpoint MCP e Autenticação Server-to-Server
                    </h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      <div className="p-3.5 rounded-lg border border-slate-200 bg-slate-50 space-y-2">
                        <span className="text-[11px] font-bold text-slate-700 block uppercase">
                          Endpoint MCP Canônico
                        </span>
                        <code className="font-mono text-xs text-slate-900 block bg-white p-2 rounded border border-slate-200 break-all select-all">
                          {canonicalMcpUrl}
                        </code>
                        <p className="text-[11px] text-slate-500">
                          Utiliza método HTTP <code className="font-mono font-bold">POST</code> com
                          Content-Type <code className="font-mono">application/json</code>.
                        </p>
                      </div>

                      <div className="p-3.5 rounded-lg border border-amber-200 bg-amber-50/60 space-y-2">
                        <span className="text-[11px] font-bold text-amber-950 block uppercase flex items-center gap-1.5">
                          <Lock className="h-3.5 w-3.5 text-amber-700" />
                          Header X-API-Key Seguro
                        </span>
                        <code className="font-mono text-xs text-amber-900 block bg-white p-2 rounded border border-amber-200 break-all select-all">
                          X-API-Key: sk-live_********************
                        </code>
                        <p className="text-[11px] text-amber-900">
                          <strong>Nunca exponha a chave real na interface.</strong> Configure a
                          variável de ambiente{' '}
                          <code className="font-mono font-bold">CONSULTOR_API_KEY</code> no painel
                          de ambiente do serviço FastAPI no Render.
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* (c) Snippet Python Completo e Funcional */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <h4 className="font-bold text-slate-900 text-xs uppercase tracking-wider flex items-center gap-1.5">
                        <Code2 className="h-4 w-4 text-[#0F766E]" />
                        (c) Snippet Python Completo de Cliente MCP (FastAPI / Render)
                      </h4>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() =>
                          copyToClipboard(pythonMcpAgentClientCode, 'Código Python Cliente MCP')
                        }
                        className="h-7 text-xs text-[#0F766E] border-teal-200 hover:bg-teal-50"
                      >
                        {copiedSnippet === 'Código Python Cliente MCP' ? (
                          <Check className="h-3.5 w-3.5 mr-1" />
                        ) : (
                          <Copy className="h-3.5 w-3.5 mr-1" />
                        )}
                        {copiedSnippet === 'Código Python Cliente MCP'
                          ? 'Copiado!'
                          : 'Copiar Script Python'}
                      </Button>
                    </div>
                    <div className="rounded-lg border border-slate-800 bg-slate-950 p-3 relative">
                      <pre className="font-mono text-xs text-emerald-300 overflow-x-auto whitespace-pre max-h-[460px]">
                        {pythonMcpAgentClientCode}
                      </pre>
                    </div>
                  </div>

                  {/* (d) Diretrizes de Segurança */}
                  <div className="space-y-2">
                    <h4 className="font-bold text-slate-900 text-xs uppercase tracking-wider flex items-center gap-1.5">
                      <ShieldCheck className="h-4 w-4 text-emerald-700" />
                      (d) Diretrizes Críticas de Segurança do Agente
                    </h4>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                      <div className="p-3 rounded-lg border border-slate-200 bg-slate-50 space-y-1.5">
                        <strong className="text-slate-900 text-xs block">
                          Chave NUNCA no Frontend / LLM
                        </strong>
                        <p className="text-[11px] text-slate-600 leading-relaxed">
                          A chave de API é infraestrutura pura. Ela nunca deve constar em respostas,
                          prompts de sistema, nem ser acessível pelo navegador do usuário.
                        </p>
                      </div>

                      <div className="p-3 rounded-lg border border-slate-200 bg-slate-50 space-y-1.5">
                        <strong className="text-slate-900 text-xs block">
                          Limite Máximo de Passos (5 Ações)
                        </strong>
                        <p className="text-[11px] text-slate-600 leading-relaxed">
                          Fixe uma trava de no máximo 5 iterações de ferramentas por turno de
                          conversa para interromper recursões e prevenir custos desnecessários de
                          tokens.
                        </p>
                      </div>

                      <div className="p-3 rounded-lg border border-slate-200 bg-slate-50 space-y-1.5">
                        <strong className="text-slate-900 text-xs block">
                          Tratamento Resiliente de isError
                        </strong>
                        <p className="text-[11px] text-slate-600 leading-relaxed">
                          Quando <code className="font-mono">isError: true</code> ou{' '}
                          <code className="font-mono">ok: false</code> retornar, injete a mensagem
                          de erro no contexto para o LLM tentar contornar de forma elegante.
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* (e) Mapeamento para Function-Calling */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <h4 className="font-bold text-slate-900 text-xs uppercase tracking-wider flex items-center gap-1.5">
                        <Boxes className="h-4 w-4 text-[#0F766E]" />
                        (e) Mapeamento das Tools para Function Calling de LLM
                      </h4>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() =>
                          copyToClipboard(
                            llmFunctionCallingMappingCode,
                            'Mapeamento Function Calling',
                          )
                        }
                        className="h-7 text-xs text-[#0F766E] border-teal-200 hover:bg-teal-50"
                      >
                        {copiedSnippet === 'Mapeamento Function Calling' ? (
                          <Check className="h-3.5 w-3.5 mr-1" />
                        ) : (
                          <Copy className="h-3.5 w-3.5 mr-1" />
                        )}
                        {copiedSnippet === 'Mapeamento Function Calling'
                          ? 'Copiado!'
                          : 'Copiar Mapeamento'}
                      </Button>
                    </div>
                    <div className="rounded-lg border border-slate-800 bg-slate-950 p-3 relative">
                      <pre className="font-mono text-xs text-cyan-300 overflow-x-auto whitespace-pre max-h-[320px]">
                        {llmFunctionCallingMappingCode}
                      </pre>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </section>

            {/* SEÇÃO 4.5: ADAPTADOR MCP (MODEL CONTEXT PROTOCOL) */}
            <section id="adaptador-mcp" className="scroll-mt-20">
              <Card className="border-indigo-200 bg-white shadow-2xs">
                <CardHeader className="pb-3 border-b border-indigo-50">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <Cpu className="h-5 w-5 text-indigo-700" />
                      <CardTitle className="text-lg font-bold text-slate-900">
                        12. Adaptador MCP (Model Context Protocol)
                      </CardTitle>
                      <Badge className="bg-indigo-600 text-white font-mono text-[10px]">
                        JSON-RPC 2.0
                      </Badge>
                    </div>
                    <Badge
                      variant="outline"
                      className="text-indigo-800 border-indigo-300 self-start sm:self-auto text-[11px]"
                    >
                      ADR-001: Adaptador de Transporte
                    </Badge>
                  </div>
                  <CardDescription className="text-xs text-slate-500">
                    Expõe o mesmo catálogo canônico das 8 ferramentas para agentes de IA e clientes
                    MCP (Claude Desktop, Cursor, LangChain)
                  </CardDescription>
                </CardHeader>

                <CardContent className="space-y-5 pt-4 text-xs sm:text-sm text-slate-700">
                  {/* Contexto e Arquitetura ADR-001 */}
                  <div className="rounded-lg border border-indigo-100 bg-indigo-50/50 p-4 space-y-2">
                    <h4 className="font-bold text-indigo-950 text-xs flex items-center gap-1.5">
                      <Layers className="h-4 w-4 text-indigo-700" />
                      Como funciona o Adaptador MCP na Camada de Integração
                    </h4>
                    <p className="text-xs text-indigo-900 leading-relaxed">
                      Em conformidade com a <strong>ADR-001</strong>, a API HTTP é o contrato
                      canônico do sistema. O adaptador MCP atua como uma{' '}
                      <strong>camada de transporte alternativa</strong> sobre o mesmo registro de
                      domínio. Ele não duplica nem altera regras de negócio: ao receber requisições
                      MCP, valida o envelope JSON-RPC 2.0, checa a autenticação{' '}
                      <code>X-API-Key</code> em tempo constante, consulta o mesmo catálogo de
                      ferramentas e despacha chamadas diretamente para os serviços de domínio já
                      testados e validados.
                    </p>
                    <div className="grid grid-cols-1 sm:grid-cols-4 gap-2 pt-2 text-[11px]">
                      <div className="p-2 bg-white rounded border border-indigo-200">
                        <strong className="block text-indigo-950">Transporte MCP</strong>
                        <span className="text-slate-600">JSON-RPC 2.0 sobre POST</span>
                      </div>
                      <div className="p-2 bg-white rounded border border-indigo-200">
                        <strong className="block text-indigo-950">Autenticação</strong>
                        <span className="text-slate-600">Fail-closed X-API-Key</span>
                      </div>
                      <div className="p-2 bg-white rounded border border-indigo-200">
                        <strong className="block text-indigo-950">Catálogo Canônico</strong>
                        <span className="text-slate-600">Mesmas 8 tools do registro</span>
                      </div>
                      <div className="p-2 bg-white rounded border border-indigo-200">
                        <strong className="block text-indigo-950">Auditoria LGPD</strong>
                        <span className="text-slate-600">Registro cego em tool_logs</span>
                      </div>
                    </div>
                  </div>

                  {/* URLs do Adaptador */}
                  <div className="space-y-2">
                    <h4 className="font-bold text-slate-900 text-xs uppercase tracking-wider">
                      Endpoints do Adaptador MCP
                    </h4>
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
                      <div className="rounded-lg border border-slate-200 bg-slate-50 p-3 space-y-1">
                        <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                          Rota Pública (Produção - Reverse Proxy)
                        </span>
                        <div className="flex items-center justify-between gap-2">
                          <code className="font-mono text-xs text-slate-800 break-all select-all">
                            {canonicalMcpUrl}
                          </code>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => copyToClipboard(canonicalMcpUrl, 'URL Pública MCP')}
                            className="h-7 px-2 shrink-0 text-slate-600"
                          >
                            <Copy className="h-3 w-3" />
                          </Button>
                        </div>
                      </div>

                      <div className="rounded-lg border border-teal-200 bg-teal-50/40 p-3 space-y-1">
                        <span className="text-[11px] font-semibold text-teal-700 uppercase tracking-wider">
                          Rota Interna Direta (Recomendada para Clientes MCP)
                        </span>
                        <div className="flex items-center justify-between gap-2">
                          <code className="font-mono text-xs text-teal-900 font-bold break-all select-all">
                            {internalMcpUrl}
                          </code>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => copyToClipboard(internalMcpUrl, 'URL Interna MCP')}
                            className="h-7 px-2 shrink-0 text-teal-700 hover:text-teal-900 hover:bg-teal-100"
                          >
                            <Copy className="h-3 w-3" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Métodos Suportados */}
                  <div className="space-y-2">
                    <h4 className="font-bold text-slate-900 text-xs uppercase tracking-wider">
                      Métodos JSON-RPC 2.0 Suportados
                    </h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      <div className="p-3 rounded-lg border border-slate-200 bg-white space-y-1">
                        <div className="flex items-center gap-1.5 font-mono text-xs font-bold text-indigo-700">
                          <CheckCircle2 className="h-3.5 w-3.5 text-indigo-600" />
                          initialize
                        </div>
                        <p className="text-xs text-slate-600">
                          Handshake inicial do protocolo. Retorna capacidades (capabilities.tools),
                          metadados do servidor e versão do protocolo MCP.
                        </p>
                      </div>

                      <div className="p-3 rounded-lg border border-slate-200 bg-white space-y-1">
                        <div className="flex items-center gap-1.5 font-mono text-xs font-bold text-indigo-700">
                          <CheckCircle2 className="h-3.5 w-3.5 text-indigo-600" />
                          tools/list
                        </div>
                        <p className="text-xs text-slate-600">
                          Lista todas as ferramentas disponíveis com seus schemas em JSON Schema
                          (inputSchema), derivadas da fonte única de verdade do registro.
                        </p>
                      </div>

                      <div className="p-3 rounded-lg border border-slate-200 bg-white space-y-1">
                        <div className="flex items-center gap-1.5 font-mono text-xs font-bold text-indigo-700">
                          <CheckCircle2 className="h-3.5 w-3.5 text-indigo-600" />
                          tools/call
                        </div>
                        <p className="text-xs text-slate-600">
                          Despacha e executa uma ferramenta específica (ex: create_lead,
                          schedule_meeting, send_email, list_leads, get_lead). Retorna conteúdo
                          estruturado no formato MCP.
                        </p>
                      </div>

                      <div className="p-3 rounded-lg border border-slate-200 bg-white space-y-1">
                        <div className="flex items-center gap-1.5 font-mono text-xs font-bold text-indigo-700">
                          <CheckCircle2 className="h-3.5 w-3.5 text-indigo-600" />
                          ping / notifications/initialized
                        </div>
                        <p className="text-xs text-slate-600">
                          Verificação de conectividade leve e confirmação de inicialização do
                          cliente MCP (suporte a notificações sem ID).
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Tabs com Exemplos Interativos */}
                  <Tabs defaultValue="list" className="w-full">
                    <TabsList className="bg-slate-100 border border-slate-200 text-xs flex-wrap h-auto p-1">
                      <TabsTrigger value="init" className="text-xs">
                        1. initialize
                      </TabsTrigger>
                      <TabsTrigger value="list" className="text-xs">
                        2. tools/list
                      </TabsTrigger>
                      <TabsTrigger value="call" className="text-xs">
                        3. tools/call
                      </TabsTrigger>
                      <TabsTrigger value="config" className="text-xs">
                        4. Configuração Cliente MCP
                      </TabsTrigger>
                    </TabsList>

                    {/* Tab: initialize */}
                    <TabsContent value="init" className="space-y-3">
                      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
                        <div className="rounded-lg border border-slate-800 bg-slate-950 p-3 relative">
                          <span className="text-[10px] font-mono text-slate-400 block mb-2 uppercase">
                            Payload Request (JSON-RPC 2.0)
                          </span>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() =>
                              copyToClipboard(mcpInitializePayload, 'Payload MCP initialize')
                            }
                            className="absolute top-2 right-2 h-6 text-xs text-indigo-400 hover:text-indigo-300 hover:bg-slate-800"
                          >
                            {copiedSnippet === 'Payload MCP initialize' ? 'Copiado!' : 'Copiar'}
                          </Button>
                          <pre className="font-mono text-xs text-slate-200 overflow-x-auto whitespace-pre">
                            {mcpInitializePayload}
                          </pre>
                        </div>

                        <div className="rounded-lg border border-slate-800 bg-slate-950 p-3 relative">
                          <span className="text-[10px] font-mono text-emerald-400 block mb-2 uppercase">
                            Resposta do Servidor (HTTP 200 OK)
                          </span>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() =>
                              copyToClipboard(mcpInitializeResponse, 'Resposta MCP initialize')
                            }
                            className="absolute top-2 right-2 h-6 text-xs text-emerald-400 hover:text-emerald-300 hover:bg-slate-800"
                          >
                            {copiedSnippet === 'Resposta MCP initialize' ? 'Copiado!' : 'Copiar'}
                          </Button>
                          <pre className="font-mono text-xs text-emerald-300 overflow-x-auto whitespace-pre">
                            {mcpInitializeResponse}
                          </pre>
                        </div>
                      </div>

                      <div className="rounded-lg border border-slate-800 bg-slate-950 p-3 relative">
                        <span className="text-[10px] font-mono text-indigo-400 block mb-2 uppercase">
                          Exemplo de Chamada cURL
                        </span>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => copyToClipboard(curlMcpInitialize, 'cURL MCP initialize')}
                          className="absolute top-2 right-2 h-6 text-xs text-indigo-400 hover:text-indigo-300 hover:bg-slate-800"
                        >
                          {copiedSnippet === 'cURL MCP initialize' ? 'Copiado!' : 'Copiar'}
                        </Button>
                        <pre className="font-mono text-xs text-slate-200 overflow-x-auto whitespace-pre pt-4 sm:pt-0">
                          {curlMcpInitialize}
                        </pre>
                      </div>
                    </TabsContent>

                    {/* Tab: tools/list */}
                    <TabsContent value="list" className="space-y-3">
                      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
                        <div className="rounded-lg border border-slate-800 bg-slate-950 p-3 relative">
                          <span className="text-[10px] font-mono text-slate-400 block mb-2 uppercase">
                            Payload Request (tools/list)
                          </span>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() =>
                              copyToClipboard(mcpToolsListPayload, 'Payload MCP tools/list')
                            }
                            className="absolute top-2 right-2 h-6 text-xs text-indigo-400 hover:text-indigo-300 hover:bg-slate-800"
                          >
                            {copiedSnippet === 'Payload MCP tools/list' ? 'Copiado!' : 'Copiar'}
                          </Button>
                          <pre className="font-mono text-xs text-slate-200 overflow-x-auto whitespace-pre">
                            {mcpToolsListPayload}
                          </pre>
                        </div>

                        <div className="rounded-lg border border-slate-800 bg-slate-950 p-3 relative">
                          <span className="text-[10px] font-mono text-emerald-400 block mb-2 uppercase">
                            Resposta com Catálogo Derivado (JSON Schema)
                          </span>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() =>
                              copyToClipboard(mcpToolsListResponse, 'Resposta MCP tools/list')
                            }
                            className="absolute top-2 right-2 h-6 text-xs text-emerald-400 hover:text-emerald-300 hover:bg-slate-800"
                          >
                            {copiedSnippet === 'Resposta MCP tools/list' ? 'Copiado!' : 'Copiar'}
                          </Button>
                          <pre className="font-mono text-xs text-emerald-300 overflow-x-auto whitespace-pre max-h-[380px]">
                            {mcpToolsListResponse}
                          </pre>
                        </div>
                      </div>

                      <div className="rounded-lg border border-slate-800 bg-slate-950 p-3 relative">
                        <span className="text-[10px] font-mono text-indigo-400 block mb-2 uppercase">
                          Exemplo de Chamada cURL
                        </span>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => copyToClipboard(curlMcpToolsList, 'cURL MCP tools/list')}
                          className="absolute top-2 right-2 h-6 text-xs text-indigo-400 hover:text-indigo-300 hover:bg-slate-800"
                        >
                          {copiedSnippet === 'cURL MCP tools/list' ? 'Copiado!' : 'Copiar'}
                        </Button>
                        <pre className="font-mono text-xs text-slate-200 overflow-x-auto whitespace-pre pt-4 sm:pt-0">
                          {curlMcpToolsList}
                        </pre>
                      </div>
                    </TabsContent>

                    {/* Tab: tools/call */}
                    <TabsContent value="call" className="space-y-3">
                      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
                        <div className="rounded-lg border border-slate-800 bg-slate-950 p-3 relative">
                          <span className="text-[10px] font-mono text-slate-400 block mb-2 uppercase">
                            Payload Request (tools/call: create_lead)
                          </span>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() =>
                              copyToClipboard(mcpToolsCallPayload, 'Payload MCP tools/call')
                            }
                            className="absolute top-2 right-2 h-6 text-xs text-indigo-400 hover:text-indigo-300 hover:bg-slate-800"
                          >
                            {copiedSnippet === 'Payload MCP tools/call' ? 'Copiado!' : 'Copiar'}
                          </Button>
                          <pre className="font-mono text-xs text-slate-200 overflow-x-auto whitespace-pre">
                            {mcpToolsCallPayload}
                          </pre>
                        </div>

                        <div className="rounded-lg border border-slate-800 bg-slate-950 p-3 relative">
                          <span className="text-[10px] font-mono text-emerald-400 block mb-2 uppercase">
                            Resposta MCP Result (content: text)
                          </span>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() =>
                              copyToClipboard(mcpToolsCallResponse, 'Resposta MCP tools/call')
                            }
                            className="absolute top-2 right-2 h-6 text-xs text-emerald-400 hover:text-emerald-300 hover:bg-slate-800"
                          >
                            {copiedSnippet === 'Resposta MCP tools/call' ? 'Copiado!' : 'Copiar'}
                          </Button>
                          <pre className="font-mono text-xs text-emerald-300 overflow-x-auto whitespace-pre max-h-[380px]">
                            {mcpToolsCallResponse}
                          </pre>
                        </div>
                      </div>

                      <div className="rounded-lg border border-slate-800 bg-slate-950 p-3 relative">
                        <span className="text-[10px] font-mono text-indigo-400 block mb-2 uppercase">
                          Exemplo de Chamada cURL
                        </span>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => copyToClipboard(curlMcpToolsCall, 'cURL MCP tools/call')}
                          className="absolute top-2 right-2 h-6 text-xs text-indigo-400 hover:text-indigo-300 hover:bg-slate-800"
                        >
                          {copiedSnippet === 'cURL MCP tools/call' ? 'Copiado!' : 'Copiar'}
                        </Button>
                        <pre className="font-mono text-xs text-slate-200 overflow-x-auto whitespace-pre pt-4 sm:pt-0">
                          {curlMcpToolsCall}
                        </pre>
                      </div>
                    </TabsContent>

                    {/* Tab: Configuração de Cliente MCP */}
                    <TabsContent value="config" className="space-y-3">
                      <div className="rounded-lg border border-indigo-200 bg-indigo-50/40 p-4 space-y-2">
                        <h4 className="font-bold text-indigo-950 text-xs">
                          Como conectar seu cliente MCP (Claude Desktop / Cursor / LangChain)
                        </h4>
                        <p className="text-xs text-indigo-900 leading-relaxed">
                          Para configurar o servidor MCP no seu cliente local (por exemplo, no
                          arquivo <code>claude_desktop_config.json</code>), configure a chamada HTTP
                          informando o endpoint do servidor e o header <code>X-API-Key</code>:
                        </p>
                      </div>

                      <div className="rounded-lg border border-slate-800 bg-slate-950 p-3 relative">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() =>
                            copyToClipboard(mcpClientConfigExample, 'Configuração Claude Desktop')
                          }
                          className="absolute top-2 right-2 h-7 text-xs text-indigo-400 hover:text-indigo-300 hover:bg-slate-800"
                        >
                          {copiedSnippet === 'Configuração Claude Desktop' ? (
                            <Check className="h-3.5 w-3.5 mr-1" />
                          ) : (
                            <Copy className="h-3.5 w-3.5 mr-1" />
                          )}
                          {copiedSnippet === 'Configuração Claude Desktop'
                            ? 'Copiado!'
                            : 'Copiar Configuração'}
                        </Button>
                        <pre className="font-mono text-xs text-slate-200 overflow-x-auto whitespace-pre pt-5 sm:pt-0">
                          {mcpClientConfigExample}
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
                      13. Envelope Padrão de Resposta (V1 & V2)
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
                      14. Erros e Códigos Estáveis
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
                      15. Política de Idempotência
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

                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
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

                    <div className="p-4 rounded-lg border border-purple-200 bg-purple-50/50 space-y-2">
                      <span className="font-bold text-purple-950 text-xs flex items-center gap-1.5">
                        <RefreshCw className="h-4 w-4 text-purple-700" />
                        Estágio do Lead
                      </span>
                      <p className="text-xs text-slate-600">
                        Chave:{' '}
                        <strong className="font-mono text-slate-800">lead_id ou email</strong>.
                      </p>
                      <ul className="text-xs text-slate-600 space-y-1 list-disc pl-4">
                        <li>
                          <strong>Mudança:</strong> Atualiza estagio (<strong>HTTP 200</strong>,{' '}
                          <code className="font-mono">atualizado: true</code>).
                        </li>
                        <li>
                          <strong>Mesmo estágio:</strong> Retorna <strong>HTTP 200</strong> com{' '}
                          <code className="font-mono">estagio_anterior === estagio_novo</code> sem
                          erro.
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
                      16. Exemplos Completos de Integração
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
                        Node.js / TypeScript (Full Client)
                      </TabsTrigger>
                      <TabsTrigger value="py" className="text-xs">
                        Python (Requests)
                      </TabsTrigger>
                    </TabsList>

                    <TabsContent value="node">
                      <div className="rounded-lg border border-slate-800 bg-slate-950 p-3 relative">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => copyToClipboard(nodeFullExample, 'Exemplo Node.js')}
                          className="absolute top-2 right-2 h-7 text-xs text-teal-400 hover:text-teal-300 hover:bg-slate-800"
                        >
                          {copiedSnippet === 'Exemplo Node.js' ? (
                            <Check className="h-3.5 w-3.5 mr-1" />
                          ) : (
                            <Copy className="h-3.5 w-3.5 mr-1" />
                          )}
                          {copiedSnippet === 'Exemplo Node.js' ? 'Copiado!' : 'Copiar'}
                        </Button>
                        <pre className="font-mono text-xs text-slate-200 overflow-x-auto whitespace-pre pt-5 sm:pt-0">
                          {nodeFullExample}
                        </pre>
                      </div>
                    </TabsContent>

                    <TabsContent value="py">
                      <div className="rounded-lg border border-slate-800 bg-slate-950 p-3 relative">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => copyToClipboard(pythonExample, 'Exemplo Python')}
                          className="absolute top-2 right-2 h-7 text-xs text-teal-400 hover:text-teal-300 hover:bg-slate-800"
                        >
                          {copiedSnippet === 'Exemplo Python' ? (
                            <Check className="h-3.5 w-3.5 mr-1" />
                          ) : (
                            <Copy className="h-3.5 w-3.5 mr-1" />
                          )}
                          {copiedSnippet === 'Exemplo Python' ? 'Copiado!' : 'Copiar'}
                        </Button>
                        <pre className="font-mono text-xs text-slate-200 overflow-x-auto whitespace-pre pt-5 sm:pt-0">
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
                      17. Segurança &amp; Conformidade LGPD
                    </CardTitle>{' '}
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
