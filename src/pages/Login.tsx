import { useState } from 'react'
import { useNavigate, Navigate } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext'
import { Layers, KeyRound, Mail, AlertCircle, ArrowRight, Loader2, ShieldCheck } from 'lucide-react'
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
import { INTEGRATION_CONFIG } from '@/services/toolRegistry'

export default function Login() {
  const { login, isAuthenticated, isLoading: authLoading } = useAuth()
  const navigate = useNavigate()

  const [email, setEmail] = useState('jardel.messias.dev@gmail.com')
  const [password, setPassword] = useState('Skip@Pass')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  if (!authLoading && isAuthenticated) {
    return <Navigate to="/" replace />
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setErrorMessage(null)

    if (!email.trim() || !password) {
      setErrorMessage('Por favor, informe seu e-mail e sua senha.')
      return
    }

    try {
      setIsSubmitting(true)
      await login(email.trim(), password)
      navigate('/')
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Falha na autenticação'
      setErrorMessage(
        msg.includes('Failed to authenticate')
          ? 'Credenciais inválidas. Verifique seu e-mail e senha.'
          : 'Erro ao autenticar. Verifique sua conexão e tente novamente.',
      )
    } finally {
      setIsSubmitting(false)
    }
  }

  const fillSeedCredentials = () => {
    setEmail(INTEGRATION_CONFIG.adminSeedUser)
    setPassword(INTEGRATION_CONFIG.adminSeedPassword)
    setErrorMessage(null)
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
                    required
                    className="pl-9 text-sm border-slate-200 focus-visible:ring-[#0F766E]"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="password" className="text-xs font-medium text-slate-700">
                  Senha de Acesso
                </Label>
                <div className="relative">
                  <KeyRound className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                  <Input
                    id="password"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    required
                    className="pl-9 text-sm border-slate-200 focus-visible:ring-[#0F766E]"
                  />
                </div>
              </div>

              {/* Credenciais de demonstração rápida */}
              <div className="rounded-lg bg-teal-50/70 border border-teal-100 p-3 text-xs text-teal-900">
                <div className="flex items-center justify-between mb-1.5">
                  <span className="font-semibold text-teal-800 flex items-center gap-1">
                    <ShieldCheck className="h-3.5 w-3.5" /> Credenciais Seed:
                  </span>
                  <button
                    type="button"
                    onClick={fillSeedCredentials}
                    className="text-[11px] font-medium text-teal-700 hover:text-teal-900 underline"
                  >
                    Preencher campos
                  </button>
                </div>
                <div className="font-mono text-[11px] text-slate-700 space-y-0.5">
                  <p>
                    Email: <span className="font-semibold">{INTEGRATION_CONFIG.adminSeedUser}</span>
                  </p>
                  <p>
                    Senha:{' '}
                    <span className="font-semibold">{INTEGRATION_CONFIG.adminSeedPassword}</span>
                  </p>
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
