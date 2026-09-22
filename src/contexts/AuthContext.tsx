import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'
import type { RecordModel } from 'pocketbase'
import pb from '@/lib/pocketbase/client'

interface AuthContextType {
  user: RecordModel | null
  isLoading: boolean
  isAuthenticated: boolean
  login: (email: string, pass: string) => Promise<void>
  logout: () => void
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

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoading,
        isAuthenticated: !!user && pb.authStore.isValid,
        login,
        logout,
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
