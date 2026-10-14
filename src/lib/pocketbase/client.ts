import PocketBase from 'pocketbase'

/**
 * Host padrão do PocketBase no Skip Cloud para este projeto.
 * Atende tanto a autenticação nativa (/api/collections/users/auth-with-password)
 * quanto os hooks customizados de ferramentas (/api/backend/v1/tools/...).
 */
export const FALLBACK_POCKETBASE_URL =
  'https://integracao-de-ferramentas-do-consultor-e38b8.shrd00.internal.goskip.dev'

/**
 * Normaliza e valida uma URL informada para o backend PocketBase.
 * Rejeita valores indefinidos, vazios, "undefined", "null" ou que não comecem com http:// ou https://.
 */
export function sanitizePocketBaseUrl(raw: unknown): string | null {
  if (typeof raw !== 'string') return null
  const trimmed = raw.trim()
  if (!trimmed) return null
  if (trimmed === 'undefined' || trimmed === 'null') return null

  // Só aceita URLs absolutas HTTP/HTTPS válidas
  if (!/^https?:\/\//i.test(trimmed)) return null

  // Remove barras finais redundantes para manter o client limpo
  return trimmed.replace(/\/+$/, '')
}

/**
 * Resolve a URL canônica do PocketBase com prioridade resiliente:
 * 1. import.meta.env.VITE_POCKETBASE_URL (canônica no padrão Vite)
 * 2. import.meta.env.VITE_PB_URL (alias curto padrão)
 * 3. FALLBACK_POCKETBASE_URL (garante funcionamento mesmo sem env var na Vercel/outros)
 *
 * Se o usuário definir variáveis sem o prefixo VITE_ (como POCKETBASE_URL),
 * o Vite não as expõe no cliente web; a função cai de forma segura no fallback.
 */
export function resolvePocketBaseUrl(): string {
  const envVitePocketbaseUrl = sanitizePocketBaseUrl(import.meta.env.VITE_POCKETBASE_URL)
  if (envVitePocketbaseUrl) return envVitePocketbaseUrl

  const envVitePbUrl = sanitizePocketBaseUrl(import.meta.env.VITE_PB_URL)
  if (envVitePbUrl) return envVitePbUrl

  return FALLBACK_POCKETBASE_URL
}

export const pocketBaseUrl = resolvePocketBaseUrl()

const pb = new PocketBase(pocketBaseUrl)
pb.autoCancellation(false)

export default pb
