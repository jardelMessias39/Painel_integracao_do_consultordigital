import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'
import type { RecordModel } from 'pocketbase'
import pb from '@/lib/pocketbase/client'

interface AuthContextType {
  user: RecordModel | null
  isLoading: boolean
  isAuthenticated: boolean
  login: (email: string, pass: string) => Promise<void>
  logout: () => void
  changePassword: (
    oldPassword: string,
    newPassword: string,
    passwordConfirm: string,
  ) => Promise<{ error: Error | null }>
  requestPasswordReset: (email: string) => Promise<{ error: Error | null }>
  confirmPasswordReset: (
    token: string,
    password: string,
    passwordConfirm: string,
  ) => Promise<{ error: Error | null }>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<RecordModel | null>(pb.authStore.record)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    // Escuta alterações no estado da authStore
    const unsubscribe = pb.authStore.onChange((token, model) => {
      setUser(model)
    })

    // Valida o token existente no início
    if (pb.authStore.isValid) {
      pb.collection('users')
        .authRefresh()
        .then((res) => {
          setUser(res.record)
        })
        .catch(() => {
          pb.authStore.clear()
          setUser(null)
        })
        .finally(() => {
          setIsLoading(false)
        })
    } else {
      setIsLoading(false)
    }

    return () => {
      unsubscribe()
    }
  }, [])

  const login = async (email: string, pass: string) => {
    const authData = await pb.collection('users').authWithPassword(email, pass)
    setUser(authData.record)
  }

  const logout = () => {
    pb.authStore.clear()
    setUser(null)
  }

  const changePassword = async (
    oldPassword: string,
    newPassword: string,
    passwordConfirm: string,
  ): Promise<{ error: Error | null }> => {
    if (!pb.authStore.record?.id) {
      return { error: new Error('Usuário não autenticado.') }
    }

    try {
      const userEmail = pb.authStore.record.email

      // 1. Atualizar senha no registro do usuário via endpoint nativo de update
      const updated = await pb.collection('users').update(pb.authStore.record.id, {
        oldPassword,
        password: newPassword,
        passwordConfirm,
      })

      // 2. Garantir sessão válida: PocketBase reemite token ou podemos reautenticar com as novas credenciais
      try {
        if (userEmail) {
          const reauth = await pb.collection('users').authWithPassword(userEmail, newPassword)
          setUser(reauth.record)
        } else {
          const refreshed = await pb.collection('users').authRefresh()
          setUser(refreshed.record)
        }
      } catch {
        // Se a reautenticação automática falhar, mantemos o record atualizado se ainda for válido
        setUser(updated)
      }

      return { error: null }
    } catch (err: unknown) {
      return { error: err instanceof Error ? err : new Error(String(err)) }
    }
  }

  const requestPasswordReset = async (email: string): Promise<{ error: Error | null }> => {
    try {
      await pb.collection('users').requestPasswordReset(email)
      return { error: null }
    } catch (err: unknown) {
      return { error: err instanceof Error ? err : new Error(String(err)) }
    }
  }

  const confirmPasswordReset = async (
    token: string,
    password: string,
    passwordConfirm: string,
  ): Promise<{ error: Error | null }> => {
    try {
      await pb.collection('users').confirmPasswordReset(token, password, passwordConfirm)
      return { error: null }
    } catch (err: unknown) {
      return { error: err instanceof Error ? err : new Error(String(err)) }
    }
  }

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoading,
        isAuthenticated: !!user && pb.authStore.isValid,
        login,
        logout,
        changePassword,
        requestPasswordReset,
        confirmPasswordReset,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth deve ser usado dentro de um AuthProvider')
  }
  return context
}
