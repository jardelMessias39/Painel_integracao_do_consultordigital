import { useState } from 'react'
import { useNavigate, Navigate, Link } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext'
import { Layers, KeyRound, Mail, AlertCircle, ArrowRight, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'

// Expressão regular padrão para validação de formato de e-mail
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export default function Login() {
  const { login, isAuthenticated, isLoading: authLoading } = useAuth()
  const navigate = useNavigate()

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  if (!authLoading && isAuthenticated) {
    return <Navigate to="/" replace />
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setErrorMessage(null)

    const trimmedEmail = email.trim()

    if (!trimmedEmail || !password) {
      setErrorMessage('Por favor, informe seu e-mail e sua senha.')
      return
    }

    if (!EMAIL_REGEX.test(trimmedEmail)) {
      setErrorMessage('Por favor, informe um endereço de e-mail válido.')
      return
    }

    try {
      setIsSubmitting(true)
      await login(trimmedEmail, password)
      navigate('/')
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Falha na autenticação'
      const status =
        typeof err === 'object' && err !== null && 'status' in err
          ? (err as { status?: number }).status
          : undefined

      const lowerMsg = msg.toLowerCase()

      if (status === 400 || lowerMsg.includes('failed to authenticate')) {
        setErrorMessage('Credenciais inválidas. Verifique seu e-mail e senha.')
      } else if (status === 404) {
        setErrorMessage(
          'Servidor PocketBase não encontrado (HTTP 404). O endereço configurado para o backend não respondeu à rota de autenticação.',
        )
      } else if (
        status === 0 ||
        lowerMsg.includes('failed to fetch') ||
        lowerMsg.includes('networkerror') ||
        lowerMsg.includes('load failed')
      ) {
        setErrorMessage(
          'Erro de conexão com o servidor PocketBase. Verifique se a URL do backend está acessível e tente novamente.',
        )
      } else if (status && status >= 500) {
        setErrorMessage(
          `O servidor do backend retornou um erro interno (HTTP ${status}). Tente novamente em instantes.`,
        )
      } else {
        setErrorMessage('Erro ao autenticar. Verifique sua conexão e tente novamente.')
      }
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#F8FAFC] px-4 py-12">
      <div className="w-full max-w-md space-y-6">
        {/* Brand header */}
        <div className="flex flex-col items-center text-center">
          <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-[#0F766E] text-white shadow-md shadow-teal-900/10 mb-4">
            <Layers className="h-7 w-7" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Consultor Digital</h1>
          <p className="text-sm text-slate-600 mt-1">
            Camada de Integração de Ferramentas — Skip Cloud
          </p>
        </div>

        {/* Login Card */}
        <Card className="border-slate-200 shadow-sm bg-white">
          <CardHeader className="space-y-1 pb-4">
            <CardTitle className="text-lg font-semibold text-slate-900">
              Acesso Administrativo
            </CardTitle>
            <CardDescription className="text-xs text-slate-500">
              Entre com suas credenciais de administrador para monitorar os leads e logs de
              auditoria.
            </CardDescription>
          </CardHeader>
          <form onSubmit={handleSubmit}>
            <CardContent className="space-y-4">
              {errorMessage && (
                <div className="flex items-start gap-2.5 rounded-lg border border-red-200 bg-red-50 p-3 text-xs text-red-800 animate-fade-in-up">
                  <AlertCircle className="h-4 w-4 shrink-0 text-red-600 mt-0.5" />
                  <span>{errorMessage}</span>
                </div>
              )}

              <div className="space-y-1.5">
                <Label htmlFor="email" className="text-xs font-medium text-slate-700">
                  E-mail do Administrador
                </Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                  <Input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="admin@exemplo.com"
                    autoComplete="email"
                    required
                    className="pl-9 text-sm border-slate-200 focus-visible:ring-[#0F766E]"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <Label htmlFor="password" className="text-xs font-medium text-slate-700">
                    Senha de Acesso
                  </Label>
                  <Link
                    to="/forgot-password"
                    className="text-[11px] font-medium text-[#0F766E] hover:text-[#115E59] hover:underline"
                  >
                    Esqueci minha senha
                  </Link>
                </div>
                <div className="relative">
                  <KeyRound className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                  <Input
                    id="password"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    autoComplete="current-password"
                    required
                    className="pl-9 text-sm border-slate-200 focus-visible:ring-[#0F766E]"
                  />
                </div>
              </div>
            </CardContent>

            <CardFooter className="pt-2 flex flex-col gap-3">
              <Button
                type="submit"
                disabled={isSubmitting}
                className="w-full bg-[#0F766E] hover:bg-[#115E59] text-white shadow-xs font-medium text-sm flex items-center justify-center gap-2"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span>Autenticando...</span>
                  </>
                ) : (
                  <>
                    <span>Entrar no Painel</span>
                    <ArrowRight className="h-4 w-4" />
                  </>
                )}
              </Button>

              <p className="text-[11px] text-slate-500 text-center">
                Acesso restrito. Todas as chamadas de API são registradas com request_id auditável.
              </p>
            </CardFooter>
          </form>
        </Card>
      </div>
    </div>
  )
}
