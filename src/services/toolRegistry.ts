import type { ToolDefinition } from '@/types/integration'

// Prefixos e caminhos do endpoint
const ROUTE_API_PREFIX = '/api'
const ROUTE_BACKEND_PREFIX = '/backend/v1/tools/create_lead'
const PUBLIC_CANONICAL_PATH = `${ROUTE_API_PREFIX}${ROUTE_BACKEND_PREFIX}`

export const toolRegistryList: ToolDefinition[] = [
  {
    nome: 'create_lead',
    descricao:
      'Registra ou atualiza um lead comercial qualificado gerado na conversa do Consultor Digital.',
    escopo: 'leads:write',
    endpoint: PUBLIC_CANONICAL_PATH,
    metodo: 'POST',
    status: 'ativa',
  },
]

export const INTEGRATION_CONFIG = {
  version: 'v1.0.0',
  // Domínio público do Skip Cloud e caminho público roteado via /api/*
  publicDomain: 'https://integracao-de-ferramentas-do-consultor-e38b8' + '.goskip.app',
  publicEndpointPath: PUBLIC_CANONICAL_PATH,
  // URL interna/direta ao PocketBase
  backendUrl:
    import.meta.env.VITE_POCKETBASE_URL ||
    'https://integracao-de-ferramentas-do-consultor-e38b8.shrd00.internal.goskip.dev',
  internalEndpointPath: '/backend/v1/tools/create_lead',
  endpointPath: PUBLIC_CANONICAL_PATH,
  adminSeedUser: 'jardel.messias.dev@gmail.com',
  adminSeedPassword: 'Skip@Pass',
}
