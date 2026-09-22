import type { ToolDefinition } from '@/types/integration'

export const toolRegistryList: ToolDefinition[] = [
  {
    nome: 'create_lead',
    descricao:
      'Registra ou atualiza um lead comercial qualificado gerado na conversa do Consultor Digital.',
    escopo: 'leads:write',
    endpoint: '/backend/v1/tools/create_lead',
    metodo: 'POST',
    status: 'ativa',
  },
]

export const INTEGRATION_CONFIG = {
  version: 'v1.0.0',
  defaultApiKey: 'sk_live_consultor_digital_v1_98a7f23c0b4e',
  backendUrl:
    import.meta.env.VITE_POCKETBASE_URL ||
    'https://integracao-de-ferramentas-do-consultor-e38b8.shrd00.internal.goskip.dev',
  endpointPath: '/backend/v1/tools/create_lead',
  adminSeedUser: 'jardel.messias.dev@gmail.com',
  adminSeedPassword: 'Skip@Pass',
}
