import type { ToolDefinition } from '@/types/integration'

// Prefixos e caminhos dos endpoints
const ROUTE_API_PREFIX = '/api'
const ROUTE_CREATE_LEAD = '/backend/v1/tools/create_lead'
const ROUTE_SCHEDULE_MEETING = '/backend/v1/tools/schedule_meeting'
const ROUTE_SEND_EMAIL = '/backend/v1/tools/send_email'
const ROUTE_LIST_MEETINGS = '/backend/v1/tools/list_meetings'
const ROUTE_TOOLS_REGISTRY = '/backend/v1/tools'

const PUBLIC_CREATE_LEAD_PATH = `${ROUTE_API_PREFIX}${ROUTE_CREATE_LEAD}`
const PUBLIC_SCHEDULE_MEETING_PATH = `${ROUTE_API_PREFIX}${ROUTE_SCHEDULE_MEETING}`
const PUBLIC_SEND_EMAIL_PATH = `${ROUTE_API_PREFIX}${ROUTE_SEND_EMAIL}`
const PUBLIC_LIST_MEETINGS_PATH = `${ROUTE_API_PREFIX}${ROUTE_LIST_MEETINGS}`
const PUBLIC_TOOLS_REGISTRY_PATH = `${ROUTE_API_PREFIX}${ROUTE_TOOLS_REGISTRY}`

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
    nome: 'tools_registry',
    descricao:
      'Índice canônico de descoberta de ferramentas disponíveis na Camada de Integração para os chamadores.',
    escopo: 'tools:read',
    endpoint: PUBLIC_TOOLS_REGISTRY_PATH,
    metodo: 'GET',
    status: 'ativa',
  },
]

export const INTEGRATION_CONFIG = {
  version: 'v2.3.0',
  // Domínio público do Skip Cloud e caminhos públicos roteados via /api/*
  publicDomain: 'https://integracao-de-ferramentas-do-consultor-e38b8' + '.goskip.app',
  publicEndpointPath: PUBLIC_CREATE_LEAD_PATH,
  publicScheduleMeetingPath: PUBLIC_SCHEDULE_MEETING_PATH,
  publicSendEmailPath: PUBLIC_SEND_EMAIL_PATH,
  publicListMeetingsPath: PUBLIC_LIST_MEETINGS_PATH,
  publicToolsRegistryPath: PUBLIC_TOOLS_REGISTRY_PATH,
  // URL interna/direta ao PocketBase
  backendUrl:
    import.meta.env.VITE_POCKETBASE_URL ||
    'https://integracao-de-ferramentas-do-consultor-e38b8.shrd00.internal.goskip.dev',
  internalEndpointPath: ROUTE_CREATE_LEAD,
  internalScheduleMeetingPath: ROUTE_SCHEDULE_MEETING,
  internalSendEmailPath: ROUTE_SEND_EMAIL,
  internalListMeetingsPath: ROUTE_LIST_MEETINGS,
  internalToolsRegistryPath: ROUTE_TOOLS_REGISTRY,
  endpointPath: PUBLIC_CREATE_LEAD_PATH,
}
