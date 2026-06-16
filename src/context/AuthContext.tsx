import * as React from 'react'
import { User, Session } from '@supabase/supabase-js'
import { supabase } from '@/integrations/supabase/client'
import { UserProfile, isGlobalAcoEmail } from '@/lib/supabase'
import { toast } from 'sonner'

const { createContext, useContext, useEffect, useState } = React

// =============================================
// Cache do perfil em localStorage (TTL 10 min)
// Evita queries ao banco a cada carregamento de pagina
// =============================================
const PROFILE_CACHE_KEY = 'gtools_profile_v1'
const PROFILE_CACHE_TTL = 10 * 60 * 1000 // 10 minutos

function saveProfileCache(userId: string, profile: UserProfile) {
  try {
    localStorage.setItem(PROFILE_CACHE_KEY, JSON.stringify({
      userId,
      profile,
      expiresAt: Date.now() + PROFILE_CACHE_TTL
    }))
  } catch (e) { /* storage cheio ou indisponivel */ }
}

function loadProfileCache(userId: string): UserProfile | null {
  try {
    const raw = localStorage.getItem(PROFILE_CACHE_KEY)
    if (!raw) return null
    const cached = JSON.parse(raw)
    if (cached.userId !== userId) return null
    if (Date.now() > cached.expiresAt) {
      localStorage.removeItem(PROFILE_CACHE_KEY)
      return null
    }
    return cached.profile as UserProfile
  } catch (e) {
    return null
  }
}

function clearProfileCache() {
  try { localStorage.removeItem(PROFILE_CACHE_KEY) } catch (e) {}
}

// Limpa tokens do Supabase (usar apenas no signOut)
const cleanupAuthState = () => {
  clearProfileCache()
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
  } catch (e) {}
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

// Busca perfil no banco - usa user_profiles.role diretamente para evitar query extra
// O campo role em user_profiles e a fonte de verdade
async function fetchProfile(userId: string, email: string): Promise<UserProfile> {
  const { data, error } = await supabase
    .from('user_profiles')
    .select('*')
    .eq('id', userId)
    .maybeSingle()

  if (data && !error) {
    // Busca role separadamente apenas se nao tiver no perfil
    let role = (data as any).role
    if (!role) {
      const { data: roleData } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', userId)
        .maybeSingle()
      role = roleData?.role || (isGlobalAcoEmail(email) ? 'operacional' : 'visitante')
    }
    return { ...data, role } as UserProfile
  }

  // Fallback em memoria (nao acessa o banco)
  return {
    id: userId,
    email,
    full_name: email.split('@')[0],
    role: isGlobalAcoEmail(email) ? 'operacional' : 'visitante',
    is_external: !isGlobalAcoEmail(email),
    created_at: new Date().toISOString(),
  } as UserProfile
}

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  if (!React || !useState) {
    return <div>Carregando...</div>
  }

  const [user, setUser] = useState<User | null>(null)
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null)
  const [session, setSession] = useState<Session | null>(null)
  const [loading, setLoading] = useState(true)

  // Atualiza last_login de forma fire-and-forget, sem bloquear o fluxo
  const updateLastLoginAsync = (userId: string) => {
    setTimeout(() => {
      supabase
        .from('user_profiles')
        .update({ last_login: new Date().toISOString(), updated_at: new Date().toISOString() })
        .eq('id', userId)
        .then(() => {})
        .catch(() => {})
    }, 3000) // Aguarda 3s para nao competir com queries criticas de login
  }

  useEffect(() => {
    let mounted = true

    // Timeout de seguranca: se getSession() travar, libera a tela em 4s
    const sessionTimeout = setTimeout(() => {
      if (mounted) {
        console.warn('[Auth] Timeout na sessao - liberando tela')
        setLoading(false)
      }
    }, 4000)

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
        // 1. Serve o cache imediatamente (zero latencia)
        const cached = loadProfileCache(session.user.id)
        if (cached) {
          setUserProfile(cached)
          setLoading(false)
          // Atualiza em background sem bloquear
          fetchProfile(session.user.id, session.user.email!).then(fresh => {
            if (mounted) {
              setUserProfile(fresh)
              saveProfileCache(session.user.id, fresh)
            }
          }).catch(() => {})
        } else {
          // Sem cache: busca no banco
          try {
            const profile = await fetchProfile(session.user.id, session.user.email!)
            if (mounted) {
              setUserProfile(profile)
              saveProfileCache(session.user.id, profile)
            }
          } catch (e) {
            console.error('[Auth] Erro ao buscar perfil:', e)
          } finally {
            if (mounted) setLoading(false)
          }
        }
      } else {
        setLoading(false)
      }
    }).catch((error) => {
      clearTimeout(sessionTimeout)
      if (!mounted) return
      console.error('[Auth] Erro critico:', error)
      setLoading(false)
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      console.log('[Auth] Event:', event)
      if (!mounted) return

      setSession(session)
      setUser(session?.user ?? null)

      if (session?.user) {
        if (event === 'SIGNED_IN') {
          // Login real: busca perfil fresco e salva no cache
          updateLastLoginAsync(session.user.id)
          try {
            const profile = await fetchProfile(session.user.id, session.user.email!)
            if (mounted) {
              setUserProfile(profile)
              saveProfileCache(session.user.id, profile)
              setLoading(false)
            }
          } catch (e) {
            if (mounted) setLoading(false)
          }
        } else if (event === 'INITIAL_SESSION') {
          // Ja tratado no getSession() acima
          // Nao faz nada aqui para evitar double-fetch
        } else {
          // TOKEN_REFRESHED, USER_UPDATED etc: usa cache se disponivel
          const cached = loadProfileCache(session.user.id)
          if (cached && mounted) {
            setUserProfile(cached)
          }
          if (mounted) setLoading(false)
        }
      } else {
        clearProfileCache()
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
    // Sem cleanupAuthState aqui - nao interfere no SDK
    try {
      const { data, error } = await supabase.auth.signInWithPassword({ email, password })
      if (error) return { error: error.message }
      console.log('[Auth] Login OK:', data.user?.email)
      return {}
    } catch (error) {
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

      if (error) return { error: error.message }

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
      } catch (err) {}
      window.location.href = '/auth'
    } catch (error) {
      cleanupAuthState()
      window.location.href = '/auth'
    }
  }

  const resetPassword = async (email: string) => {
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/auth?view=reset-password`,
      })
      if (error) return { error: error.message }
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
      if (error) return { error: error.message }
      const updated = { ...userProfile, ...updates } as UserProfile
      setUserProfile(updated)
      if (user) saveProfileCache(user.id, updated)
      return {}
    } catch (error) {
      return { error: 'Erro inesperado ao atualizar perfil' }
    }
  }

  return (
    <AuthContext.Provider value={{ user, userProfile, session, loading, signIn, signUp, signOut, resetPassword, updateProfile }}>
      {children}
    </AuthContext.Provider>
  )
}
