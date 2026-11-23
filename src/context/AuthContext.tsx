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

function loadProfileCache(userId: string, allowExpired = false): UserProfile | null {
  try {
    const raw = localStorage.getItem(PROFILE_CACHE_KEY)
    if (!raw) return null
    const cached = JSON.parse(raw)
    if (cached.userId !== userId) return null
    // Vencido: nao serve como dado fresco, mas continua guardado como reserva
    // para quando o banco nao responder (melhor que inventar um perfil).
    if (Date.now() > cached.expiresAt && !allowExpired) return null
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

// Busca perfil no banco - usa user_roles como fonte de verdade para a role
async function fetchProfile(userId: string, email: string, timeoutMs = 6000): Promise<UserProfile> {
  try {
    const fetchPromise = (async () => {
      // Busca dados do perfil e a role em paralelo para máxima performance
      const [profileRes, roleRes] = await Promise.all([
        supabase
          .from('user_profiles')
          .select('*')
          .eq('id', userId)
          .maybeSingle(),
        supabase
          .from('user_roles')
          .select('role')
          .eq('user_id', userId)
          .maybeSingle()
      ]);

      if (profileRes.error) throw profileRes.error;
      if (!profileRes.data) throw new Error('Perfil não encontrado no banco');

      if (roleRes.error) throw roleRes.error;

      // A role da tabela user_roles é a fonte de verdade para RLS e permissões.
      // Se não existir, usamos a role da tabela user_profiles ou o fallback por email
      const role = roleRes.data?.role || (profileRes.data as any).role || (isGlobalAcoEmail(email) ? 'operacional' : 'visitante');

      return { ...profileRes.data, role } as UserProfile;
    })();

    const timeoutPromise = new Promise<UserProfile>((_, reject) =>
      setTimeout(() => reject(new Error('timeout')), timeoutMs)
    );

    return await Promise.race([fetchPromise, timeoutPromise]);
  } catch (e) {
    console.error('[Auth] Erro em fetchProfile:', e);
    throw e; // Propaga o erro para o chamador decidir o que fazer (evita overwriting de cache)
  }
}

// Busca o perfil insistindo quando o banco demora. Se nao conseguir, devolve a
// ultima copia conhecida (mesmo vencida) ou null. NUNCA inventa um perfil: um
// perfil "operacional" de emergencia fazia administradores e comerciais verem
// "Acesso Negado" sempre que o banco respondia devagar.
async function loadProfileResilient(userId: string, email: string): Promise<UserProfile | null> {
  const timeouts = [6000, 10000, 15000]
  for (let attempt = 0; attempt < timeouts.length; attempt++) {
    try {
      const profile = await fetchProfile(userId, email, timeouts[attempt])
      saveProfileCache(userId, profile)
      return profile
    } catch (e) {
      console.warn(`[Auth] Tentativa ${attempt + 1} de carregar o perfil falhou`)
    }
  }
  return loadProfileCache(userId, true)
}

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  if (!React || !useState) {
    return <div>Carregando...</div>
  }

  const [user, setUser] = useState<User | null>(null)
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null)
  const [session, setSession] = useState<Session | null>(null)
  const [loading, setLoading] = useState(true)

  // Refs para obter os valores atualizados dentro da closure do timeout
  const userRef = React.useRef<User | null>(null)
  const userProfileRef = React.useRef<UserProfile | null>(null)
  const sessionRef = React.useRef<Session | null>(null)

  React.useEffect(() => { userRef.current = user }, [user])
  React.useEffect(() => { userProfileRef.current = userProfile }, [userProfile])
  React.useEffect(() => { sessionRef.current = session }, [session])

  // Registra o ultimo acesso (last_login) sem bloquear o fluxo.
  // Chamado no login, ao abrir o sistema e quando a aba volta a ficar visivel,
  // porque a sessao dura semanas e o login em si quase nunca se repete.
  // Limitado a uma gravacao a cada 15 minutos por navegador.
  const LAST_SEEN_KEY = 'gtools_last_seen_v1'
  const LAST_SEEN_INTERVAL = 15 * 60 * 1000

  const updateLastLoginAsync = (userId: string, force = false) => {
    try {
      const raw = localStorage.getItem(LAST_SEEN_KEY)
      const saved = raw ? JSON.parse(raw) : null
      if (!force && saved?.userId === userId && Date.now() - saved.at < LAST_SEEN_INTERVAL) return
      localStorage.setItem(LAST_SEEN_KEY, JSON.stringify({ userId, at: Date.now() }))
    } catch (e) { /* storage indisponivel: grava mesmo assim */ }

    setTimeout(async () => {
      const { error } = await supabase
        .from('user_profiles')
        .update({ last_login: new Date().toISOString() })
        .eq('id', userId)
      if (error) {
        console.warn('[Auth] Nao foi possivel registrar o ultimo acesso:', error.message)
        try { localStorage.removeItem(LAST_SEEN_KEY) } catch (e) { /* ignora */ }
      }
    }, 3000) // Aguarda 3s para nao competir com queries criticas de login
  }

  // Aba voltou a ficar visivel: conta como acesso (respeitando o limite acima)
  useEffect(() => {
    const onVisible = () => {
      if (document.visibilityState === 'visible' && userRef.current) {
        updateLastLoginAsync(userRef.current.id)
      }
    }
    document.addEventListener('visibilitychange', onVisible)
    return () => document.removeEventListener('visibilitychange', onVisible)
  }, [])

  useEffect(() => {
    let mounted = true

    // Timeout de seguranca: se getSession() travar, libera a tela em 4s
    const sessionTimeout = setTimeout(() => {
      if (mounted) {
        console.warn('[Auth] Timeout na sessao - liberando tela')
        setLoading(false)
        
        const currentUser = userRef.current;
        const currentProfile = userProfileRef.current;
        
        if (currentUser && !currentProfile) {
          // Sem perfil ainda: usa a ultima copia conhecida, se houver.
          // Sem copia, a tela fica em "Carregando perfil..." ate o banco responder.
          const cached = loadProfileCache(currentUser.id, true);
          if (cached) setUserProfile(cached);
        }
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
        // Abrir o sistema com sessao valida conta como acesso
        updateLastLoginAsync(session.user.id)

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
          }).catch((err) => {
            console.warn('[Auth] Falha ao atualizar perfil em background (mantendo cache ativo):', err);
          })
        } else {
          // Sem cache: busca no banco (com novas tentativas)
          const profile = await loadProfileResilient(session.user.id, session.user.email!)
          if (mounted) {
            if (profile) setUserProfile(profile)
            setLoading(false)
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
          updateLastLoginAsync(session.user.id, true)
          const profile = await loadProfileResilient(session.user.id, session.user.email!)
          if (mounted) {
            if (profile) setUserProfile(profile)
            setLoading(false)
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
