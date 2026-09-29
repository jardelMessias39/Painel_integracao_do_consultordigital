import type { ToolDefinition } from '@/types/integration'

// Prefixos e caminhos dos endpoints
const ROUTE_API_PREFIX = '/api'
const ROUTE_CREATE_LEAD = '/backend/v1/tools/create_lead'
const ROUTE_SCHEDULE_MEETING = '/backend/v1/tools/schedule_meeting'

const PUBLIC_CREATE_LEAD_PATH = `${ROUTE_API_PREFIX}${ROUTE_CREATE_LEAD}`
const PUBLIC_SCHEDULE_MEETING_PATH = `${ROUTE_API_PREFIX}${ROUTE_SCHEDULE_MEETING}`

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
]

export const INTEGRATION_CONFIG = {
  version: 'v2.0.0',
  // Domínio público do Skip Cloud e caminhos públicos roteados via /api/*
  publicDomain: 'https://integracao-de-ferramentas-do-consultor-e38b8' + '.goskip.app',
  publicEndpointPath: PUBLIC_CREATE_LEAD_PATH,
  publicScheduleMeetingPath: PUBLIC_SCHEDULE_MEETING_PATH,
  // URL interna/direta ao PocketBase
  backendUrl:
    import.meta.env.VITE_POCKETBASE_URL ||
    'https://integracao-de-ferramentas-do-consultor-e38b8.shrd00.internal.goskip.dev',
  internalEndpointPath: ROUTE_CREATE_LEAD,
  internalScheduleMeetingPath: ROUTE_SCHEDULE_MEETING,
  endpointPath: PUBLIC_CREATE_LEAD_PATH,
  adminSeedUser: 'jardel.messias.dev@gmail.com',
  adminSeedPassword: 'Skip@Pass',
}
