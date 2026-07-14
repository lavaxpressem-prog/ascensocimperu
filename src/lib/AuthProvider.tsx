import { createContext, useContext, useEffect, useState, useCallback, type ReactNode } from 'react'
import type { User } from '@supabase/supabase-js'
import { supabase, signIn, signUp, signOut, sendPasswordReset, getProfile } from './supabase'
import type { Profile, AuthUser } from './types'

interface AuthContextValue {
  user: User | null
  profile: Profile | null
  authUser: AuthUser | null
  loading: boolean
  error: string | null
  login: (email: string, password: string) => Promise<void>
  register: (email: string, password: string, metadata: Record<string, string>) => Promise<void>
  logout: () => Promise<void>
  resetPassword: (email: string) => Promise<void>
  refreshProfile: () => Promise<void>
}

const AuthContext = createContext<AuthContextValue | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [profile, setProfile] = useState<Profile | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchProfile = useCallback(async (userId: string) => {
    try {
      const p = await getProfile(userId)
      setProfile(p)
    } catch {
      setProfile(null)
    }
  }, [])

  useEffect(() => {
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      const u = session?.user ?? null
      setUser(u)
      if (u) {
        await fetchProfile(u.id)
      }
      setLoading(false)
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      const u = session?.user ?? null
      setUser(u)
      if (u) {
        fetchProfile(u.id)
      } else {
        setProfile(null)
      }
    })

    return () => subscription.unsubscribe()
  }, [fetchProfile])

  const login = useCallback(async (email: string, password: string) => {
    setError(null)
    try {
      const data = await signIn(email, password)
      if (data.user) {
        await fetchProfile(data.user.id)
      }
    } catch (err: any) {
      setError(err.message)
      throw err
    }
  }, [fetchProfile])

  const register = useCallback(async (email: string, password: string, metadata: Record<string, string>) => {
    setError(null)
    try {
      await signUp(email, password, metadata)
    } catch (err: any) {
      setError(err.message)
      throw err
    }
  }, [])

  const logout = useCallback(async () => {
    setError(null)
    try {
      await signOut()
      setUser(null)
      setProfile(null)
    } catch (err: any) {
      setError(err.message)
      throw err
    }
  }, [])

  const resetPassword = useCallback(async (email: string) => {
    setError(null)
    try {
      await sendPasswordReset(email)
    } catch (err: any) {
      setError(err.message)
      throw err
    }
  }, [])

  const refreshProfile = useCallback(async () => {
    if (user) {
      await fetchProfile(user.id)
    }
  }, [user, fetchProfile])

  const authUser: AuthUser | null = user && profile ? {
    id: user.id,
    email: user.email!,
    role: profile.role,
    status: profile.status,
    name: profile.name,
  } : null

  return (
    <AuthContext.Provider value={{
      user,
      profile,
      authUser,
      loading,
      error,
      login,
      register,
      logout,
      resetPassword,
      refreshProfile,
    }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext)
  if (!ctx) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return ctx
}
