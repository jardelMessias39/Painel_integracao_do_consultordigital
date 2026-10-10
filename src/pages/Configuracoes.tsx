import { useState } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import {
  ShieldAlert,
  KeyRound,
  Lock,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Eye,
  EyeOff,
  Info,
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
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { getErrorMessage, extractFieldErrors } from '@/lib/pocketbase/errors'

export default function Configuracoes() {
  const { user, changePassword } = useAuth()

  const [oldPassword, setOldPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')

  const [showOldPassword, setShowOldPassword] = useState(false)
  const [showNewPassword, setShowNewPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)

  const [isSubmitting, setIsSubmitting] = useState(false)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({})

  // Indicador simples de requisitos de senha
  const isMinLength = newPassword.length >= 8
  const hasConfirmationMatch = newPassword.length > 0 && newPassword === confirmPassword

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSuccessMessage(null)
    setErrorMessage(null)
    setFieldErrors({})

    if (!oldPassword) {
      setErrorMessage('Por favor, informe a senha atual.')
      return
    }

    if (!newPassword) {
      setErrorMessage('Por favor, informe a nova senha.')
      return
    }

    if (newPassword.length < 8) {
      setErrorMessage('A nova senha deve ter no mínimo 8 caracteres.')
      return
    }

    if (newPassword !== confirmPassword) {
      setErrorMessage('A confirmação não confere com a nova senha.')
      return
    }

    if (newPassword === oldPassword) {
      setErrorMessage('A nova senha deve ser diferente da senha atual.')
      return
    }

    setIsSubmitting(true)

    try {
      const { error } = await changePassword(oldPassword, newPassword, confirmPassword)

      if (error) {
        const rawErrors = extractFieldErrors(error)
        setFieldErrors(rawErrors)

        const rawMsg = getErrorMessage(error)

        if (
          rawErrors.oldPassword ||
          rawMsg.toLowerCase().includes('old password') ||
          rawMsg.toLowerCase().includes('fail')
        ) {
          setErrorMessage(
            rawErrors.oldPassword ||
              'A senha atual informada está incorreta. Verifique e tente novamente.',
          )
        } else if (rawErrors.password || rawErrors.passwordConfirm) {
          setErrorMessage(
            rawErrors.password || rawErrors.passwordConfirm || 'Erro na validação da nova senha.',
          )
        } else {
          setErrorMessage('Não foi possível alterar a senha. Verifique as informações fornecidas.')
        }
        return
      }

      setSuccessMessage(
        'Senha alterada com sucesso! Sua sessão foi atualizada com a nova credencial.',
      )
      setOldPassword('')
      setNewPassword('')
      setConfirmPassword('')
    } catch (err: unknown) {
      setErrorMessage(getErrorMessage(err) || 'Erro inesperado ao alterar senha.')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Header da página */}
      <div className="flex flex-col gap-1 border-b border-slate-200 pb-4">
        <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900">
          Configurações da Conta
        </h2>
        <p className="text-xs sm:text-sm text-slate-500">
          Gerencie a segurança e credenciais de acesso do administrador à Camada de Integração.
        </p>
      </div>

      {/* Alerta de urgência de segurança (caso a senha tenha sido exposta) */}
      <Alert className="border-amber-200 bg-amber-50/70 text-amber-900">
        <ShieldAlert className="h-4 w-4 text-amber-700" />
        <AlertTitle className="text-sm font-semibold text-amber-800">
          Aviso de Segurança de Acesso
        </AlertTitle>
        <AlertDescription className="text-xs text-amber-700 leading-relaxed mt-1">
          Caso a senha anterior tenha sido compartilhada ou exposta, atualize-a imediatamente
          abaixo. Ao salvar, a sessão é preservada e reautenticada de forma segura com o token do
          PocketBase.
        </AlertDescription>
      </Alert>

      {/* Formulário de Alteração de Senha */}
      <Card className="border-slate-200 bg-white shadow-xs">
        <CardHeader className="border-b border-slate-100 pb-4">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-md bg-teal-50 text-[#0F766E]">
              <KeyRound className="h-4 w-4" />
            </div>
            <div>
              <CardTitle className="text-base font-semibold text-slate-900">
                Alterar Senha de Administrador
              </CardTitle>
              <CardDescription className="text-xs text-slate-500">
                Usuário autenticado:{' '}
                <strong className="text-slate-700">{user?.email || 'admin'}</strong>
              </CardDescription>
            </div>
          </div>
        </CardHeader>

        <form onSubmit={handleSubmit}>
          <CardContent className="pt-6 space-y-5">
            {successMessage && (
              <div className="flex items-start gap-2.5 rounded-lg border border-emerald-200 bg-emerald-50 p-3.5 text-xs text-emerald-800 animate-fade-in-up">
                <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600 mt-0.5" />
                <div>
                  <p className="font-semibold">Sucesso!</p>
                  <p className="text-emerald-700 mt-0.5">{successMessage}</p>
                </div>
              </div>
            )}

            {errorMessage && (
              <div className="flex items-start gap-2.5 rounded-lg border border-red-200 bg-red-50 p-3.5 text-xs text-red-800 animate-fade-in-up">
                <AlertCircle className="h-4 w-4 shrink-0 text-red-600 mt-0.5" />
                <div>
                  <p className="font-semibold">Não foi possível alterar a senha</p>
                  <p className="text-red-700 mt-0.5">{errorMessage}</p>
                </div>
              </div>
            )}

            {/* Senha Atual */}
            <div className="space-y-1.5">
              <Label htmlFor="oldPassword" className="text-xs font-medium text-slate-700">
                Senha Atual
              </Label>
              <div className="relative">
                <Lock className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                <Input
                  id="oldPassword"
                  type={showOldPassword ? 'text' : 'password'}
                  value={oldPassword}
                  onChange={(e) => setOldPassword(e.target.value)}
                  placeholder="Digite sua senha atual"
                  autoComplete="current-password"
                  required
                  className={`pl-9 pr-10 text-sm border-slate-200 focus-visible:ring-[#0F766E] ${
                    fieldErrors.oldPassword ? 'border-red-500 focus-visible:ring-red-500' : ''
                  }`}
                />
                <button
                  type="button"
                  onClick={() => setShowOldPassword(!showOldPassword)}
                  className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-600"
                  tabIndex={-1}
                >
                  {showOldPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              {fieldErrors.oldPassword && (
                <p className="text-[11px] text-red-600">{fieldErrors.oldPassword}</p>
              )}
            </div>

            {/* Nova Senha */}
            <div className="space-y-1.5">
              <Label htmlFor="newPassword" className="text-xs font-medium text-slate-700">
                Nova Senha
              </Label>
              <div className="relative">
                <Lock className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                <Input
                  id="newPassword"
                  type={showNewPassword ? 'text' : 'password'}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Mínimo de 8 caracteres"
                  autoComplete="new-password"
                  required
                  className={`pl-9 pr-10 text-sm border-slate-200 focus-visible:ring-[#0F766E] ${
                    fieldErrors.password ? 'border-red-500 focus-visible:ring-red-500' : ''
                  }`}
                />
                <button
                  type="button"
                  onClick={() => setShowNewPassword(!showNewPassword)}
                  className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-600"
                  tabIndex={-1}
                >
                  {showNewPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              {fieldErrors.password && (
                <p className="text-[11px] text-red-600">{fieldErrors.password}</p>
              )}
            </div>

            {/* Confirmar Nova Senha */}
            <div className="space-y-1.5">
              <Label htmlFor="confirmPassword" className="text-xs font-medium text-slate-700">
                Confirmar Nova Senha
              </Label>
              <div className="relative">
                <Lock className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                <Input
                  id="confirmPassword"
                  type={showConfirmPassword ? 'text' : 'password'}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Repita a nova senha"
                  autoComplete="new-password"
                  required
                  className={`pl-9 pr-10 text-sm border-slate-200 focus-visible:ring-[#0F766E] ${
                    fieldErrors.passwordConfirm ? 'border-red-500 focus-visible:ring-red-500' : ''
                  }`}
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-600"
                  tabIndex={-1}
                >
                  {showConfirmPassword ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </button>
              </div>
              {fieldErrors.passwordConfirm && (
                <p className="text-[11px] text-red-600">{fieldErrors.passwordConfirm}</p>
              )}
            </div>

            {/* Checklist visual de requisitos */}
            <div className="p-3 bg-slate-50 rounded-lg border border-slate-200/60 space-y-1.5 text-xs text-slate-600">
              <p className="font-medium text-slate-700 flex items-center gap-1.5">
                <Info className="h-3.5 w-3.5 text-slate-500" />
                Requisitos de Senha:
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
                <div
                  className={`flex items-center gap-1.5 ${
                    isMinLength ? 'text-emerald-700 font-medium' : 'text-slate-500'
                  }`}
                >
                  <div
                    className={`h-1.5 w-1.5 rounded-full ${
                      isMinLength ? 'bg-emerald-500' : 'bg-slate-300'
                    }`}
                  />
                  <span>Mínimo de 8 caracteres</span>
                </div>
                <div
                  className={`flex items-center gap-1.5 ${
                    hasConfirmationMatch ? 'text-emerald-700 font-medium' : 'text-slate-500'
                  }`}
                >
                  <div
                    className={`h-1.5 w-1.5 rounded-full ${
                      hasConfirmationMatch ? 'bg-emerald-500' : 'bg-slate-300'
                    }`}
                  />
                  <span>Confirmação idêntica</span>
                </div>
              </div>
            </div>
          </CardContent>

          <CardFooter className="border-t border-slate-100 bg-slate-50/50 py-3.5 px-6 flex justify-between items-center">
            <span className="text-[11px] text-slate-500">
              Ao salvar, a sessão continuará conectada.
            </span>
            <Button
              type="submit"
              disabled={isSubmitting || !isMinLength || !hasConfirmationMatch}
              className="bg-[#0F766E] hover:bg-[#115E59] text-white shadow-xs text-xs sm:text-sm font-medium flex items-center gap-2"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span>Salvando nova senha...</span>
                </>
              ) : (
                <>
                  <KeyRound className="h-4 w-4" />
                  <span>Atualizar Senha</span>
                </>
              )}
            </Button>
          </CardFooter>
        </form>
      </Card>
    </div>
  )
}
