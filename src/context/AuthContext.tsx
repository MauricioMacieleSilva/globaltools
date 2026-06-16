import * as React from 'react'
import { User, Session } from '@supabase/supabase-js'
import { supabase } from '@/integrations/supabase/client'
import { UserProfile, isGlobalAcoEmail } from '@/lib/supabase'
import { toast } from 'sonner'

const { createContext, useContext, useEffect, useState } = React

// Limpa tokens do Supabase do storage (usar apenas no signOut)
const cleanupAuthState = () => {
  Object.keys(localStorage).forEach((key) => {
    if (key.startsWith('supabase.auth.') || key.includes('sb-')) {
      localStorage.removeItem(key)
    }
  })
  try {
    Object.keys(sessionStorage || {}).forEach((key) => {
      if (key.startsWith('supabase.auth.') || key.includes('sb-')) {
        sessionStorage.removeItem(key)
      }
    })
  } catch (e) {
    // sessionStorage pode nao estar disponivel
  }
}

interface AuthContextType {
  user: User | null
  userProfile: UserProfile | null
  session: Session | null
  loading: boolean
  signIn: (email: string, password: string) => Promise<{ error?: string }>
  signUp: (email: string, password: string, fullName: string) => Promise<{ error?: string }>
  signOut: () => Promise<void>
  resetPassword: (email: string) => Promise<{ error?: string }>
  updateProfile: (updates: Partial<UserProfile>) => Promise<{ error?: string }>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export const useAuth = () => {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}

// Busca perfil e role em paralelo para maior velocidade
const fetchUserProfileAndRole = async (userId: string, email: string): Promise<UserProfile> => {
  const [profileResult, roleResult] = await Promise.all([
    supabase.from('user_profiles').select('*').eq('id', userId).maybeSingle(),
    supabase.from('user_roles').select('role').eq('user_id', userId).maybeSingle(),
  ])

  const role = roleResult.data?.role || (isGlobalAcoEmail(email) ? 'operacional' : 'visitante')

  if (profileResult.data && !profileResult.error) {
    return { ...profileResult.data, role } as UserProfile
  }

  // Fallback: perfil em memoria
  return {
    id: userId,
    email,
    full_name: email.split('@')[0],
    role,
    is_external: !isGlobalAcoEmail(email),
    created_at: new Date().toISOString(),
  } as UserProfile
}

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  if (!React || !useState) {
    return <div>Loading...</div>
  }

  const [user, setUser] = useState<User | null>(null)
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null)
  const [session, setSession] = useState<Session | null>(null)
  const [loading, setLoading] = useState(true)

  const updateLastLogin = async (userId: string) => {
    try {
      await supabase
        .from('user_profiles')
        .update({
          last_login: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .eq('id', userId)
    } catch (e) {
      // nao critico
    }
  }

  useEffect(() => {
    let mounted = true

    // Timeout de seguranca de 5s (em vez de 3s, para redes lentas)
    const sessionTimeout = setTimeout(() => {
      if (mounted) setLoading(false)
    }, 5000)

    supabase.auth.getSession().then(async ({ data: { session }, error }) => {
      clearTimeout(sessionTimeout)
      if (!mounted) return

      if (error) {
        console.error('[Auth] Erro ao obter sessao:', error)
        setLoading(false)
        return
      }

      setSession(session)
      setUser(session?.user ?? null)

      if (session?.user) {
        updateLastLogin(session.user.id)
        try {
          const profile = await fetchUserProfileAndRole(session.user.id, session.user.email!)
          if (mounted) setUserProfile(profile)
        } catch (e) {
          console.error('[Auth] Erro ao buscar perfil:', e)
        } finally {
          if (mounted) setLoading(false)
        }
      } else {
        setLoading(false)
      }
    }).catch((error) => {
      clearTimeout(sessionTimeout)
      if (!mounted) return
      console.error('[Auth] Erro critico ao verificar sessao:', error)
      setLoading(false)
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      console.log('[Auth] State change:', event)
      if (!mounted) return

      setSession(session)
      setUser(session?.user ?? null)

      if (session?.user) {
        updateLastLogin(session.user.id)
        // Busca perfil em background (nao bloqueia o redirecionamento)
        fetchUserProfileAndRole(session.user.id, session.user.email!).then((profile) => {
          if (mounted) {
            setUserProfile(profile)
            setLoading(false)
          }
        }).catch((e) => {
          console.error('[Auth] Erro ao buscar perfil no state change:', e)
          if (mounted) setLoading(false)
        })
      } else {
        setUserProfile(null)
        setLoading(false)
      }

      if (event === 'SIGNED_OUT') {
        toast.success('Logout realizado com sucesso!')
      }
    })

    return () => {
      mounted = false
      subscription.unsubscribe()
      clearTimeout(sessionTimeout)
    }
  }, [])

  const signIn = async (email: string, password: string) => {
    // NAO chamar cleanupAuthState aqui - interfere com o SDK do Supabase
    try {
      const { data, error } = await supabase.auth.signInWithPassword({ email, password })

      if (error) {
        return { error: error.message }
      }

      console.log('[Auth] Login bem-sucedido:', data.user?.email)
      return {}
    } catch (error) {
      console.error('[Auth] Erro no signIn:', error)
      return { error: 'Erro inesperado durante o login' }
    }
  }

  const signUp = async (email: string, password: string, fullName: string) => {
    try {
      setLoading(true)

      const isCorpEmail = isGlobalAcoEmail(email)

      if (!isCorpEmail) {
        const { data: invitation, error: invError } = await supabase
          .from('user_invitations')
          .select('id, expires_at, used_at')
          .eq('email', email.toLowerCase())
          .is('used_at', null)
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle()

        if (invError || !invitation) {
          return { error: 'Acesso restrito. Apenas emails @globalaco.com.br ou usuarios convidados pelo administrador podem se cadastrar.' }
        }

        if (new Date(invitation.expires_at) < new Date()) {
          return { error: 'Seu convite expirou. Solicite um novo convite ao administrador.' }
        }
      }

      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: { full_name: fullName },
          emailRedirectTo: `${window.location.origin}/auth`
        },
      })

      if (error) {
        return { error: error.message }
      }

      if (!isCorpEmail) {
        await supabase
          .from('user_invitations')
          .update({ used_at: new Date().toISOString() })
          .eq('email', email.toLowerCase())
          .is('used_at', null)
      }

      return {}
    } catch (error) {
      return { error: 'Erro inesperado durante o cadastro' }
    } finally {
      setLoading(false)
    }
  }

  const signOut = async () => {
    try {
      setLoading(true)
      cleanupAuthState()
      try {
        await supabase.auth.signOut({ scope: 'global' })
      } catch (err) {
        console.log('[Auth] Sign out global falhou, continuando...')
      }
      window.location.href = '/auth'
    } catch (error) {
      console.error('[Auth] Erro no logout:', error)
      cleanupAuthState()
      window.location.href = '/auth'
    }
  }

  const resetPassword = async (email: string) => {
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/auth?view=reset-password`,
      })

      if (error) {
        return { error: error.message }
      }

      return {}
    } catch (error) {
      return { error: 'Erro inesperado ao resetar senha' }
    }
  }

  const updateProfile = async (updates: Partial<UserProfile>) => {
    if (!user) return { error: 'Usuario nao autenticado' }

    try {
      const { error } = await supabase
        .from('user_profiles')
        .update(updates)
        .eq('id', user.id)

      if (error) {
        return { error: error.message }
      }

      setUserProfile(prev => prev ? { ...prev, ...updates } : null)
      return {}
    } catch (error) {
      return { error: 'Erro inesperado ao atualizar perfil' }
    }
  }

  const value = {
    user,
    userProfile,
    session,
    loading,
    signIn,
    signUp,
    signOut,
    resetPassword,
    updateProfile,
  }

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  )
}
