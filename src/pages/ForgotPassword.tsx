import { useState } from 'react'
import { Link, Navigate } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext'
import { Layers, Mail, ArrowLeft, Loader2, CheckCircle2, AlertCircle } from 'lucide-react'
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
import { getErrorMessage } from '@/lib/pocketbase/errors'

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export default function ForgotPassword() {
  const { requestPasswordReset, isAuthenticated, isLoading: authLoading } = useAuth()

  const [email, setEmail] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  if (!authLoading && isAuthenticated) {
    return <Navigate to="/" replace />
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setErrorMessage(null)

    const trimmedEmail = email.trim()

    if (!trimmedEmail) {
      setErrorMessage('Por favor, informe seu endereço de e-mail.')
      return
    }

    if (!EMAIL_REGEX.test(trimmedEmail)) {
      setErrorMessage('Por favor, informe um e-mail válido.')
      return
    }

    setIsSubmitting(true)

    try {
      const { error } = await requestPasswordReset(trimmedEmail)

      if (error) {
        console.error('[ForgotPassword] Erro na solicitação de reset:', error)
        const msg = getErrorMessage(error)
        const lower = msg.toLowerCase()

        // Tratar erro específico de SMTP/envio de email não configurado
        if (
          lower.includes('failed to send') ||
          lower.includes('smtp') ||
          lower.includes('mail') ||
          lower.includes('connect') ||
          lower.includes('transport')
        ) {
          setErrorMessage(
            'Não foi possível enviar o e-mail agora — falha no serviço de envio de e-mails.',
          )
          return
        }

        // Erro de rede / falha ao contatar servidor de autenticação
        if (
          lower.includes('network') ||
          lower.includes('fetch') ||
          lower.includes('failed to fetch') ||
          lower.includes('load failed')
        ) {
          setErrorMessage(
            'Não foi possível conectar ao servidor de autenticação. Verifique sua conexão e tente novamente.',
          )
          return
        }

        // Qualquer outro erro retornado pelo backend
        setErrorMessage(
          msg || 'Não foi possível processar a recuperação de senha. Tente novamente mais tarde.',
        )
        return
      }

      // Sucesso: a chamada ao PocketBase completou sem erros (retornou 200 OK)
      setSubmitted(true)
    } catch (err: unknown) {
      console.error('[ForgotPassword] Exceção inesperada:', err)
      const msg = getErrorMessage(err)
      const lower = msg.toLowerCase()

      if (
        lower.includes('failed to send') ||
        lower.includes('smtp') ||
        lower.includes('mail') ||
        lower.includes('connect') ||
        lower.includes('transport')
      ) {
        setErrorMessage(
          'Não foi possível enviar o e-mail agora — falha no serviço de envio de e-mails.',
        )
      } else if (
        lower.includes('network') ||
        lower.includes('fetch') ||
        lower.includes('failed to fetch') ||
        lower.includes('load failed')
      ) {
        setErrorMessage(
          'Não foi possível conectar ao servidor de autenticação. Verifique sua conexão e tente novamente.',
        )
      } else {
        setErrorMessage(
          msg ||
            'Não foi possível conectar ao servidor de autenticação. Tente novamente mais tarde.',
        )
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
            Recuperação de Acesso à Camada de Integração
          </p>
        </div>

        {/* Card */}
        <Card className="border-slate-200 shadow-sm bg-white">
          <CardHeader className="space-y-1 pb-4">
            <CardTitle className="text-lg font-semibold text-slate-900">
              Esqueci Minha Senha
            </CardTitle>
            <CardDescription className="text-xs text-slate-500">
              Informe seu e-mail cadastrado para enviarmos as instruções de redefinição de senha.
            </CardDescription>
          </CardHeader>

          {submitted ? (
            <CardContent className="space-y-4 pt-2">
              <div className="flex items-start gap-3 rounded-lg border border-emerald-200 bg-emerald-50 p-4 text-xs text-emerald-800">
                <CheckCircle2 className="h-5 w-5 shrink-0 text-emerald-600 mt-0.5" />
                <div className="space-y-1">
                  <p className="font-semibold text-sm text-emerald-900">Solicitação Registrada</p>
                  <p className="leading-relaxed text-emerald-700">
                    Se o e-mail estiver cadastrado em nossa base, enviaremos um link de recuperação
                    com validade temporária. Por favor, verifique também sua caixa de spam.
                  </p>
                </div>
              </div>

              <div className="pt-2">
                <Link to="/login" className="w-full">
                  <Button
                    variant="outline"
                    className="w-full text-slate-700 border-slate-200 flex items-center justify-center gap-2"
                  >
                    <ArrowLeft className="h-4 w-4" />
                    <span>Voltar para o Login</span>
                  </Button>
                </Link>
              </div>
            </CardContent>
          ) : (
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
                    E-mail Cadastrado
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
                      <span>Enviando solicitação...</span>
                    </>
                  ) : (
                    <span>Enviar link de recuperação</span>
                  )}
                </Button>

                <div className="flex items-center justify-center">
                  <Link
                    to="/login"
                    className="text-xs font-medium text-slate-600 hover:text-slate-900 inline-flex items-center gap-1.5 py-1"
                  >
                    <ArrowLeft className="h-3.5 w-3.5" />
                    <span>Lembrou da senha? Voltar ao login</span>
                  </Link>
                </div>
              </CardFooter>
            </form>
          )}
        </Card>
      </div>
    </div>
  )
}
