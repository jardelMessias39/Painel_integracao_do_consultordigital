import PocketBase from 'pocketbase'

const DEFAULT_PB_URL =
  'https://integracao-de-ferramentas-do-consultor-e38b8.shrd00.internal.goskip.dev'

const resolvedBaseUrl =
  import.meta.env.VITE_POCKETBASE_URL || import.meta.env.VITE_PB_URL || DEFAULT_PB_URL

const pb = new PocketBase(resolvedBaseUrl)
pb.autoCancellation(false)

export default pb
