import * as React from 'react'
import { User, Session } from '@supabase/supabase-js'
import { supabase } from '@/integrations/supabase/client'
import { UserProfile, isGlobalAcoEmail } from '@/lib/supabase'
import { toast } from 'sonner'

// Ensure React is properly imported before using hooks
const { createContext, useContext, useEffect, useState } = React

// FunÃ§Ã£o para limpar completamente o estado de autenticaÃ§Ã£o
const cleanupAuthState = () => {
  console.log('ðŸ§¹ Limpando estado de autenticaÃ§Ã£o...')
  
  // Remover todas as chaves relacionadas ao Supabase do localStorage
  Object.keys(localStorage).forEach((key) => {
    if (key.startsWith('supabase.auth.') || key.includes('sb-')) {
      console.log('ðŸ—‘ï¸ Removendo:', key)
      localStorage.removeItem(key)
    }
  })
  
  // Remover do sessionStorage se existir
  try {
    Object.keys(sessionStorage || {}).forEach((key) => {
      if (key.startsWith('supabase.auth.') || key.includes('sb-')) {
        console.log('ðŸ—‘ï¸ Removendo do session:', key)
        sessionStorage.removeItem(key)
      }
    })
  } catch (e) {
    // sessionStorage pode nÃ£o estar disponÃ­vel
  }
  
  console.log('âœ… Limpeza de autenticaÃ§Ã£o concluÃ­da')
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

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // Add safety check for React hooks
  if (!React || !useState) {
    console.error('React hooks not available')
    return <div>Loading...</div>
  }

  const [user, setUser] = useState<User | null>(null)
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null)
  const [session, setSession] = useState<Session | null>(null)
  const [loading, setLoading] = useState(true)

  // FunÃ§Ã£o para atualizar last_login
  const updateLastLogin = async (userId: string) => {
    try {
      console.log('ðŸ”„ Atualizando last_login para usuÃ¡rio:', userId)
      const { error } = await supabase
        .from('user_profiles')
        .update({ 
          last_login: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .eq('id', userId)
      
      if (error) {
        console.error('âŒ Erro ao atualizar last_login:', error)
      } else {
        console.log('âœ… Last_login atualizado com sucesso')
      }
    } catch (error) {
      console.error('âŒ Erro inesperado ao atualizar last_login:', error)
    }
  }

  useEffect(() => {
    let mounted = true
    let timeoutId: ReturnType<typeof setTimeout>
    
    // Verificar sessÃ£o atual com timeout de seguranÃ§a
    const sessionTimeout = setTimeout(() => {
      console.log('âš ï¸ Timeout na verificaÃ§Ã£o de sessÃ£o - prosseguindo sem sessÃ£o')
      setLoading(false)
    }, 3000)
    
    supabase.auth.getSession().then(({ data: { session }, error }) => {
      clearTimeout(sessionTimeout)
      
      if (!mounted) return
      
      if (error) {
        console.error('âŒ Erro ao obter sessÃ£o:', error)
        cleanupAuthState()
        setSession(null)
        setUser(null)
        setUserProfile(null)
        setLoading(false)
        return
      }
      
      setSession(session)
      setUser(session?.user ?? null)
      
      if (session?.user) {
        // Atualizar last_login imediatamente ao detectar sessÃ£o ativa
        updateLastLogin(session.user.id)
        
        // Primeiro tentar buscar o perfil no banco, depois criar em memÃ³ria se necessÃ¡rio
        setTimeout(async () => {
          try {
            console.log('ðŸ‘¤ Buscando perfil no banco para:', session.user.email)
            const { data: existingProfile, error } = await supabase
              .from('user_profiles')
              .select('*')
              .eq('id', session.user.id)
              .maybeSingle()

            if (existingProfile && !error) {
              const { data: roleData } = await supabase
                .from('user_roles')
                .select('role')
                .eq('user_id', session.user.id)
                .maybeSingle()
              
              console.log('âœ… Perfil encontrado no banco:', existingProfile.email)
              setUserProfile({ ...existingProfile, role: roleData?.role || 'visitante' } as UserProfile)
            } else {
              console.log('ðŸ“ Perfil nÃ£o encontrado, criando em memÃ³ria...')
              // Criar perfil em memÃ³ria apenas se nÃ£o existir no banco
              const email = session.user.email!
              const profile: UserProfile = {
                id: session.user.id,
                email,
                full_name: session.user.user_metadata?.full_name || email.split('@')[0],
                role: isGlobalAcoEmail(email) ? 'operacional' : 'visitante',
                is_external: !isGlobalAcoEmail(email),
                created_at: new Date().toISOString(),
              }
              
              console.log('âœ… Perfil criado em memÃ³ria:', profile.email, 'role:', profile.role)
              setUserProfile(profile)
            }
          } catch (error) {
            console.error('âŒ Erro ao buscar perfil:', error)
            // Fallback: criar perfil em memÃ³ria
            const email = session.user.email!
            const profile: UserProfile = {
              id: session.user.id,
              email,
              full_name: session.user.user_metadata?.full_name || email.split('@')[0],
              role: isGlobalAcoEmail(email) ? 'operacional' : 'visitante',
              is_external: !isGlobalAcoEmail(email),
              created_at: new Date().toISOString(),
            }
            setUserProfile(profile)
          } finally {
            setLoading(false)
          }
        }, 0)
      } else {
        setLoading(false)
      }
    }).catch((error) => {
      clearTimeout(sessionTimeout)
      if (!mounted) return
      
      console.error('âŒ Erro crÃ­tico ao verificar sessÃ£o:', error)
      cleanupAuthState()
      setSession(null)
      setUser(null)
      setUserProfile(null)
      setLoading(false)
    })

    // Escutar mudanÃ§as de autenticaÃ§Ã£o
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      console.log('Auth state change:', event, session?.user?.id)
      setSession(session)
      setUser(session?.user ?? null)
      
      if (session?.user) {
        // Atualizar last_login sempre que detectar sessÃ£o
        updateLastLogin(session.user.id)
        
        // Primeiro tentar buscar o perfil no banco, depois criar em memÃ³ria se necessÃ¡rio
        setTimeout(async () => {
          try {
            console.log('ðŸ‘¤ Buscando perfil no banco para:', session.user.email)
            const { data: existingProfile, error } = await supabase
              .from('user_profiles')
              .select('*')
              .eq('id', session.user.id)
              .maybeSingle()

            if (existingProfile && !error) {
              const { data: roleData } = await supabase
                .from('user_roles')
                .select('role')
                .eq('user_id', session.user.id)
                .maybeSingle()
              
              console.log('âœ… Perfil encontrado no banco:', existingProfile.email)
              setUserProfile({ ...existingProfile, role: roleData?.role || 'visitante' } as UserProfile)
            } else {
              console.log('ðŸ“ Perfil nÃ£o encontrado, criando em memÃ³ria...')
              // Criar perfil em memÃ³ria apenas se nÃ£o existir no banco
              const email = session.user.email!
              const profile: UserProfile = {
                id: session.user.id,
                email,
                full_name: session.user.user_metadata?.full_name || email.split('@')[0],
                role: isGlobalAcoEmail(email) ? 'operacional' : 'visitante',
                is_external: !isGlobalAcoEmail(email),
                created_at: new Date().toISOString(),
              }
              
              console.log('âœ… Perfil criado em memÃ³ria:', profile.email, 'role:', profile.role)
              setUserProfile(profile)
            }
          } catch (error) {
            console.error('âŒ Erro ao buscar perfil:', error)
            // Fallback: criar perfil em memÃ³ria
            const email = session.user.email!
            const profile: UserProfile = {
              id: session.user.id,
              email,
              full_name: session.user.user_metadata?.full_name || email.split('@')[0],
              role: isGlobalAcoEmail(email) ? 'operacional' : 'visitante',
              is_external: !isGlobalAcoEmail(email),
              created_at: new Date().toISOString(),
            }
            setUserProfile(profile)
          } finally {
            setLoading(false)
          }
        }, 0)
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

  const loadUserProfile = async (userId: string) => {
    console.log('ðŸ‘¤ Carregando perfil para usuÃ¡rio:', userId)
    
    try {
      const { data, error } = await supabase
        .from('user_profiles')
        .select('*')
        .eq('id', userId)
        .maybeSingle()

      if (error) {
        console.log('âŒ Erro ao carregar perfil:', error.message)
        console.log('ðŸ”§ Criando perfil automaticamente...')
        await createUserProfile(userId)
        return
      }

      if (data) {
        const { data: roleData } = await supabase
          .from('user_roles')
          .select('role')
          .eq('user_id', userId)
          .maybeSingle()
        
        console.log('âœ… Perfil carregado:', data.email)
        setUserProfile({ ...data, role: roleData?.role || 'visitante' } as UserProfile)
      } else {
        console.log('ðŸ“ Perfil nÃ£o encontrado, criando...')
        await createUserProfile(userId)
      }
    } catch (error) {
      console.error('ðŸ’¥ Erro inesperado ao carregar perfil:', error)
      await createUserProfile(userId)
    } finally {
      setLoading(false)
    }
  }

  const createUserProfile = async (userId: string) => {
    console.log('ðŸ”§ Criando perfil para usuÃ¡rio:', userId)
    
    try {
      const user = await supabase.auth.getUser()
      if (!user.data.user) {
        console.log('âŒ UsuÃ¡rio nÃ£o encontrado')
        setLoading(false)
        return
      }

      const email = user.data.user.email!
      const isExternal = !isGlobalAcoEmail(email)
      
      const profile: UserProfile = {
        id: userId,
        email,
        full_name: user.data.user.user_metadata?.full_name || email.split('@')[0],
        role: isExternal ? 'visitante' : 'operacional',
        is_external: isExternal,
        created_at: new Date().toISOString(),
      }
      
      console.log('âœ… Perfil criado:', profile.email)
      setUserProfile(profile)
      setLoading(false)
    } catch (error) {
      console.error('ðŸ’¥ Erro ao criar perfil:', error)
      setLoading(false)
    }
  }

  const signIn = async (email: string, password: string) => {
    console.log('ðŸ”¥ INICIANDO signIn function')
    
    try {
      console.log('ðŸ§¹ Limpando estado...')
      cleanupAuthState()
      
      console.log('ðŸ“¤ Chamando supabase.auth.signInWithPassword...')
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      })

      console.log('ðŸ“¥ Resposta do Supabase:', { data: !!data, error: error?.message })

      if (error) {
        console.log('âŒ Erro de login:', error.message)
        return { error: error.message }
      }

      console.log('âœ… Login Supabase bem-sucedido!')
      console.log('ðŸ‘¤ Dados do usuÃ¡rio:', data.user?.id, data.user?.email)
      
      return {}
    } catch (error) {
      console.error('ðŸ’¥ Erro capturado no signIn:', error)
      return { error: 'Erro inesperado durante o login' }
    } finally {
      console.log('ðŸ Fim da funÃ§Ã£o signIn')
    }
  }

  const signUp = async (email: string, password: string, fullName: string) => {
    try {
      setLoading(true)

      const isCorpEmail = isGlobalAcoEmail(email)
      
      if (!isCorpEmail) {
        // Verificar se existe convite vÃ¡lido para este email
        const { data: invitation, error: invError } = await supabase
          .from('user_invitations')
          .select('id, expires_at, used_at')
          .eq('email', email.toLowerCase())
          .is('used_at', null)
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle()

        if (invError || !invitation) {
          return { error: 'Acesso restrito. Apenas emails @globalaco.com.br ou usuÃ¡rios convidados pelo administrador podem se cadastrar.' }
        }

        // Verificar se o convite nÃ£o expirou
        if (new Date(invitation.expires_at) < new Date()) {
          return { error: 'Seu convite expirou. Solicite um novo convite ao administrador.' }
        }
      }

      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            full_name: fullName,
          },
          emailRedirectTo: `${window.location.origin}/auth`
        },
      })

      if (error) {
        return { error: error.message }
      }

      // Marcar convite como usado (se externo)
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
      
      // Limpar estado primeiro
      cleanupAuthState()
      
      // Tentar sign out global
      try {
        await supabase.auth.signOut({ scope: 'global' })
      } catch (err) {
        console.log('Sign out global falhou, continuando...')
      }
      
      // ForÃ§ar redirect para pÃ¡gina de login
      window.location.href = '/auth'
    } catch (error) {
      console.error('Erro no logout:', error)
      // Mesmo com erro, forÃ§ar limpeza e redirect
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
    if (!user) return { error: 'UsuÃ¡rio nÃ£o autenticado' }

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
