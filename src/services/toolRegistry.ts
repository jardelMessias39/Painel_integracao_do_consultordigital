import type { ToolDefinition } from '@/types/integration'
import { resolvePocketBaseUrl } from '@/lib/pocketbase/client'

// Prefixos e caminhos dos endpoints
const ROUTE_API_PREFIX = '/api'
const ROUTE_CREATE_LEAD = '/backend/v1/tools/create_lead'
const ROUTE_SCHEDULE_MEETING = '/backend/v1/tools/schedule_meeting'
const ROUTE_SEND_EMAIL = '/backend/v1/tools/send_email'
const ROUTE_LIST_MEETINGS = '/backend/v1/tools/list_meetings'
const ROUTE_LIST_LEADS = '/backend/v1/tools/list_leads'
const ROUTE_GET_LEAD = '/backend/v1/tools/get_lead'
const ROUTE_UPDATE_LEAD_STAGE = '/backend/v1/tools/update_lead_stage'
const ROUTE_TOOLS_REGISTRY = '/backend/v1/tools'
const ROUTE_MCP_ADAPTER = '/backend/v1/mcp'

const PUBLIC_CREATE_LEAD_PATH = `${ROUTE_API_PREFIX}${ROUTE_CREATE_LEAD}`
const PUBLIC_SCHEDULE_MEETING_PATH = `${ROUTE_API_PREFIX}${ROUTE_SCHEDULE_MEETING}`
const PUBLIC_SEND_EMAIL_PATH = `${ROUTE_API_PREFIX}${ROUTE_SEND_EMAIL}`
const PUBLIC_LIST_MEETINGS_PATH = `${ROUTE_API_PREFIX}${ROUTE_LIST_MEETINGS}`
const PUBLIC_LIST_LEADS_PATH = `${ROUTE_API_PREFIX}${ROUTE_LIST_LEADS}`
const PUBLIC_GET_LEAD_PATH = `${ROUTE_API_PREFIX}${ROUTE_GET_LEAD}`
const PUBLIC_UPDATE_LEAD_STAGE_PATH = `${ROUTE_API_PREFIX}${ROUTE_UPDATE_LEAD_STAGE}`
const PUBLIC_TOOLS_REGISTRY_PATH = `${ROUTE_API_PREFIX}${ROUTE_TOOLS_REGISTRY}`
const PUBLIC_MCP_ADAPTER_PATH = `${ROUTE_API_PREFIX}${ROUTE_MCP_ADAPTER}`

export const toolRegistryList: ToolDefinition[] = [
  {
    nome: 'create_lead',
    descricao:
      'Registra ou atualiza um lead comercial qualificado gerado na conversa do Consultor Digital.',
    escopo: 'leads:write',
    endpoint: PUBLIC_CREATE_LEAD_PATH,
    metodo: 'POST',
    status: 'ativa',
  },
  {
    nome: 'schedule_meeting',
    descricao:
      'Registra uma solicitação interna de reunião com o consultor com status inicial pendente.',
    escopo: 'meetings:write',
    endpoint: PUBLIC_SCHEDULE_MEETING_PATH,
    metodo: 'POST',
    status: 'ativa',
  },
  {
    nome: 'send_email',
    descricao:
      'Envia um e-mail transacional real para o destinatário através do serviço de correio do servidor com suporte a idempotência.',
    escopo: 'emails:send',
    endpoint: PUBLIC_SEND_EMAIL_PATH,
    metodo: 'POST',
    status: 'ativa',
  },
  {
    nome: 'list_meetings',
    descricao:
      'Consulta e lista reuniões agendadas com filtros por e-mail, status e período futuro para o Consultor Digital.',
    escopo: 'meetings:read',
    endpoint: PUBLIC_LIST_MEETINGS_PATH,
    metodo: 'GET',
    status: 'ativa',
  },
  {
    nome: 'list_leads',
    descricao:
      'Consulta e lista leads comerciais qualificados com filtros por e-mail, estágio do lead, empresa e limite para o Consultor Digital.',
    escopo: 'leads:read',
    endpoint: PUBLIC_LIST_LEADS_PATH,
    metodo: 'GET',
    status: 'ativa',
  },
  {
    nome: 'get_lead',
    descricao:
      'Consulta os detalhes sanitizados de um lead específico a partir do seu id ou endereço de e-mail cadastrado.',
    escopo: 'leads:read',
    endpoint: PUBLIC_GET_LEAD_PATH,
    metodo: 'GET',
    status: 'ativa',
  },
  {
    nome: 'update_lead_stage',
    descricao:
      'Atualiza o estágio comercial de um lead (novo, qualificado, proposta, descartado) por lead_id ou e-mail com idempotência natural.',
    escopo: 'leads:write',
    endpoint: PUBLIC_UPDATE_LEAD_STAGE_PATH,
    metodo: 'POST',
    status: 'ativa',
  },
  {
    nome: 'tools_registry',
    descricao:
      'Índice canônico de descoberta de ferramentas disponíveis na Camada de Integração para os chamadores.',
    escopo: 'tools:read',
    endpoint: PUBLIC_TOOLS_REGISTRY_PATH,
    metodo: 'GET',
    status: 'ativa',
  },
  {
    nome: 'mcp_adapter',
    descricao:
      'Adaptador MCP (Model Context Protocol via JSON-RPC 2.0) sobre o catálogo canônico de ferramentas.',
    escopo: 'tools:mcp',
    endpoint: PUBLIC_MCP_ADAPTER_PATH,
    metodo: 'POST',
    status: 'ativa',
  },
]

export const INTEGRATION_CONFIG = {
  version: 'v2.6.0',
  // Domínio público do Skip Cloud e caminhos públicos roteados via /api/*
  publicDomain: 'https://integracao-de-ferramentas-do-consultor-e38b8' + '.goskip.app',
  publicEndpointPath: PUBLIC_CREATE_LEAD_PATH,
  publicScheduleMeetingPath: PUBLIC_SCHEDULE_MEETING_PATH,
  publicSendEmailPath: PUBLIC_SEND_EMAIL_PATH,
  publicListMeetingsPath: PUBLIC_LIST_MEETINGS_PATH,
  publicListLeadsPath: PUBLIC_LIST_LEADS_PATH,
  publicGetLeadPath: PUBLIC_GET_LEAD_PATH,
  publicUpdateLeadStagePath: PUBLIC_UPDATE_LEAD_STAGE_PATH,
  publicToolsRegistryPath: PUBLIC_TOOLS_REGISTRY_PATH,
  publicMcpAdapterPath: PUBLIC_MCP_ADAPTER_PATH,
  // URL interna/direta ao PocketBase
  backendUrl: resolvePocketBaseUrl(),
  internalEndpointPath: ROUTE_CREATE_LEAD,
  internalScheduleMeetingPath: ROUTE_SCHEDULE_MEETING,
  internalSendEmailPath: ROUTE_SEND_EMAIL,
  internalListMeetingsPath: ROUTE_LIST_MEETINGS,
  internalListLeadsPath: ROUTE_LIST_LEADS,
  internalGetLeadPath: ROUTE_GET_LEAD,
  internalUpdateLeadStagePath: ROUTE_UPDATE_LEAD_STAGE,
  internalToolsRegistryPath: ROUTE_TOOLS_REGISTRY,
  internalMcpAdapterPath: ROUTE_MCP_ADAPTER,
  endpointPath: PUBLIC_CREATE_LEAD_PATH,
}
