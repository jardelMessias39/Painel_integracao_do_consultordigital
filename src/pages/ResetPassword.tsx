import { useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext'
import {
  Layers,
  Lock,
  Loader2,
  CheckCircle2,
  AlertCircle,
  Eye,
  EyeOff,
  ArrowRight,
  ShieldCheck,
} from 'lucide-react'
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
import { getErrorMessage, extractFieldErrors } from '@/lib/pocketbase/errors'

export default function ResetPassword() {
  const [searchParams] = useSearchParams()
  const token = searchParams.get('token') || ''
  const navigate = useNavigate()
  const { confirmPasswordReset } = useAuth()

  const [password, setPassword] = useState('')
  const [passwordConfirm, setPasswordConfirm] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)

  const [isSubmitting, setIsSubmitting] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({})
  const [resetSuccess, setResetSuccess] = useState(false)

  // Indicador simples de força
  const getPasswordStrength = (pass: string) => {
    let score = 0
    if (pass.length >= 8) score += 1
    if (pass.length >= 12) score += 1
    if (/[A-Z]/.test(pass) && /[a-z]/.test(pass)) score += 1
    if (/[0-9]/.test(pass)) score += 1
    if (/[^A-Za-z0-9]/.test(pass)) score += 1
    return score
  }

  const strengthScore = getPasswordStrength(password)
  const strengthLabels = ['Muito fraca', 'Fraca', 'Média', 'Boa', 'Forte', 'Excelente']
  const strengthColors = [
    'bg-slate-200',
    'bg-red-500',
    'bg-amber-500',
    'bg-yellow-500',
    'bg-teal-500',
    'bg-emerald-600',
  ]

  const isMinLength = password.length >= 8
  const isMatch = password.length > 0 && password === passwordConfirm

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setErrorMessage(null)
    setFieldErrors({})

    if (!token) {
      setErrorMessage(
        'Token de recuperação ausente ou inválido no link acessado. Solicite uma nova redefinição.',
      )
      return
    }

    if (!password) {
      setErrorMessage('Por favor, informe a nova senha.')
      return
    }

    if (password.length < 8) {
      setErrorMessage('A nova senha deve ter pelo menos 8 caracteres.')
      return
    }

    if (password !== passwordConfirm) {
      setErrorMessage('A confirmação não confere com a nova senha.')
      return
    }

    setIsSubmitting(true)

    try {
      const { error } = await confirmPasswordReset(token, password, passwordConfirm)

      if (error) {
        const rawErrors = extractFieldErrors(error)
        setFieldErrors(rawErrors)
        const msg = getErrorMessage(error)

        if (msg.toLowerCase().includes('token') || msg.toLowerCase().includes('invalid')) {
          setErrorMessage(
            'O link de recuperação expirou ou já foi utilizado. Solicite um novo link.',
          )
        } else {
          setErrorMessage(msg || 'Falha ao redefinir a senha. Tente novamente.')
        }
        return
      }

      setResetSuccess(true)
    } catch (err: unknown) {
      setErrorMessage(getErrorMessage(err) || 'Erro inesperado ao redefinir senha.')
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
          <p className="text-sm text-slate-600 mt-1">Definir Nova Senha de Acesso</p>
        </div>

        <Card className="border-slate-200 shadow-sm bg-white">
          <CardHeader className="space-y-1 pb-4">
            <CardTitle className="text-lg font-semibold text-slate-900">Redefinir Senha</CardTitle>
            <CardDescription className="text-xs text-slate-500">
              Digite e confirme sua nova senha de administrador para recuperar o acesso.
            </CardDescription>
          </CardHeader>

          {!token ? (
            <CardContent className="space-y-4 pt-2">
              <div className="flex items-start gap-2.5 rounded-lg border border-amber-200 bg-amber-50 p-3.5 text-xs text-amber-800">
                <AlertCircle className="h-4 w-4 shrink-0 text-amber-600 mt-0.5" />
                <div>
                  <p className="font-semibold">Token não encontrado</p>
                  <p className="mt-0.5 text-amber-700">
                    O link acessado não possui o código de validação de redefinição. Por favor,
                    utilize o link exato enviado ao seu e-mail.
                  </p>
                </div>
              </div>

              <div className="pt-2">
                <Link to="/forgot-password">
                  <Button variant="outline" className="w-full text-slate-700 border-slate-200">
                    Solicitar novo link de recuperação
                  </Button>
                </Link>
              </div>
            </CardContent>
          ) : resetSuccess ? (
            <CardContent className="space-y-4 pt-2">
              <div className="flex items-start gap-3 rounded-lg border border-emerald-200 bg-emerald-50 p-4 text-xs text-emerald-800">
                <CheckCircle2 className="h-5 w-5 shrink-0 text-emerald-600 mt-0.5" />
                <div className="space-y-1">
                  <p className="font-semibold text-sm text-emerald-900">
                    Senha alterada com sucesso!
                  </p>
                  <p className="leading-relaxed text-emerald-700">
                    Sua nova senha foi salva. Você já pode fazer login na plataforma utilizando a
                    nova credencial.
                  </p>
                </div>
              </div>

              <div className="pt-2">
                <Button
                  onClick={() => navigate('/login')}
                  className="w-full bg-[#0F766E] hover:bg-[#115E59] text-white flex items-center justify-center gap-2"
                >
                  <span>Ir para o Login</span>
                  <ArrowRight className="h-4 w-4" />
                </Button>
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

                {/* Nova Senha */}
                <div className="space-y-1.5">
                  <Label htmlFor="password" className="text-xs font-medium text-slate-700">
                    Nova Senha
                  </Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                    <Input
                      id="password"
                      type={showPassword ? 'text' : 'password'}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Mínimo 8 caracteres"
                      autoComplete="new-password"
                      required
                      className={`pl-9 pr-10 text-sm border-slate-200 focus-visible:ring-[#0F766E] ${
                        fieldErrors.password ? 'border-red-500' : ''
                      }`}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-600"
                      tabIndex={-1}
                    >
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                  {fieldErrors.password && (
                    <p className="text-[11px] text-red-600">{fieldErrors.password}</p>
                  )}
                </div>

                {/* Indicador de força de senha */}
                {password.length > 0 && (
                  <div className="space-y-1.5 pt-1">
                    <div className="flex justify-between items-center text-[11px]">
                      <span className="text-slate-500">Força da senha:</span>
                      <span className="font-medium text-slate-700">
                        {strengthLabels[strengthScore]}
                      </span>
                    </div>
                    <div className="flex gap-1 h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
                      {[1, 2, 3, 4, 5].map((level) => (
                        <div
                          key={level}
                          className={`flex-1 transition-all duration-300 ${
                            strengthScore >= level ? strengthColors[strengthScore] : 'bg-slate-200'
                          }`}
                        />
                      ))}
                    </div>
                  </div>
                )}

                {/* Confirmar Nova Senha */}
                <div className="space-y-1.5">
                  <Label htmlFor="passwordConfirm" className="text-xs font-medium text-slate-700">
                    Confirmar Nova Senha
                  </Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                    <Input
                      id="passwordConfirm"
                      type={showConfirm ? 'text' : 'password'}
                      value={passwordConfirm}
                      onChange={(e) => setPasswordConfirm(e.target.value)}
                      placeholder="Repita a nova senha"
                      autoComplete="new-password"
                      required
                      className={`pl-9 pr-10 text-sm border-slate-200 focus-visible:ring-[#0F766E] ${
                        fieldErrors.passwordConfirm ? 'border-red-500' : ''
                      }`}
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirm(!showConfirm)}
                      className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-600"
                      tabIndex={-1}
                    >
                      {showConfirm ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                  {fieldErrors.passwordConfirm && (
                    <p className="text-[11px] text-red-600">{fieldErrors.passwordConfirm}</p>
                  )}
                </div>
              </CardContent>

              <CardFooter className="pt-2 flex flex-col gap-3">
                <Button
                  type="submit"
                  disabled={isSubmitting || !isMinLength || !isMatch}
                  className="w-full bg-[#0F766E] hover:bg-[#115E59] text-white shadow-xs font-medium text-sm flex items-center justify-center gap-2"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      <span>Salvando nova senha...</span>
                    </>
                  ) : (
                    <>
                      <ShieldCheck className="h-4 w-4" />
                      <span>Concluir Redefinição</span>
                    </>
                  )}
                </Button>

                <div className="flex items-center justify-center">
                  <Link
                    to="/login"
                    className="text-xs font-medium text-slate-600 hover:text-slate-900"
                  >
                    Cancelar e voltar ao login
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
