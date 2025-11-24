import * as React from 'react'
import { User, Session } from '@supabase/supabase-js'
import { supabase } from '@/integrations/supabase/client'
import { UserProfile, isGlobalAcoEmail } from '@/lib/supabase'
import { toast } from 'sonner'

// Ensure React is properly imported before using hooks
const { createContext, useContext, useEffect, useState } = React

// Função para limpar completamente o estado de autenticação
const cleanupAuthState = () => {
  console.log('🧹 Limpando estado de autenticação...')
  
  // Remover todas as chaves relacionadas ao Supabase do localStorage
  Object.keys(localStorage).forEach((key) => {
    if (key.startsWith('supabase.auth.') || key.includes('sb-')) {
      console.log('🗑️ Removendo:', key)
      localStorage.removeItem(key)
    }
  })
  
  // Remover do sessionStorage se existir
  try {
    Object.keys(sessionStorage || {}).forEach((key) => {
      if (key.startsWith('supabase.auth.') || key.includes('sb-')) {
        console.log('🗑️ Removendo do session:', key)
        sessionStorage.removeItem(key)
      }
    })
  } catch (e) {
    // sessionStorage pode não estar disponível
  }
  
  console.log('✅ Limpeza de autenticação concluída')
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

  // Função para atualizar last_login
  const updateLastLogin = async (userId: string) => {
    try {
      console.log('🔄 Atualizando last_login para usuário:', userId)
      const { error } = await supabase
        .from('user_profiles')
        .update({ 
          last_login: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .eq('id', userId)
      
      if (error) {
        console.error('❌ Erro ao atualizar last_login:', error)
      } else {
        console.log('✅ Last_login atualizado com sucesso')
      }
    } catch (error) {
      console.error('❌ Erro inesperado ao atualizar last_login:', error)
    }
  }

  useEffect(() => {
    let mounted = true
    let timeoutId: NodeJS.Timeout
    
    // Verificar sessão atual com timeout de segurança
    const sessionTimeout = setTimeout(() => {
      console.log('⚠️ Timeout na verificação de sessão - prosseguindo sem sessão')
      setLoading(false)
    }, 3000)
    
    supabase.auth.getSession().then(({ data: { session }, error }) => {
      clearTimeout(sessionTimeout)
      
      if (!mounted) return
      
      if (error) {
        console.error('❌ Erro ao obter sessão:', error)
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
        // Atualizar last_login imediatamente ao detectar sessão ativa
        updateLastLogin(session.user.id)
        
        // Primeiro tentar buscar o perfil no banco, depois criar em memória se necessário
        setTimeout(async () => {
          try {
            console.log('👤 Buscando perfil no banco para:', session.user.email)
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
              
              console.log('✅ Perfil encontrado no banco:', existingProfile.email)
              setUserProfile({ ...existingProfile, role: roleData?.role || 'visitante' } as UserProfile)
            } else {
              console.log('📝 Perfil não encontrado, criando em memória...')
              // Criar perfil em memória apenas se não existir no banco
              const email = session.user.email!
              const profile: UserProfile = {
                id: session.user.id,
                email,
                full_name: session.user.user_metadata?.full_name || email.split('@')[0],
                role: isGlobalAcoEmail(email) ? 'operacional' : 'visitante',
                is_external: !isGlobalAcoEmail(email),
                created_at: new Date().toISOString(),
              }
              
              console.log('✅ Perfil criado em memória:', profile.email, 'role:', profile.role)
              setUserProfile(profile)
            }
          } catch (error) {
            console.error('❌ Erro ao buscar perfil:', error)
            // Fallback: criar perfil em memória
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
      
      console.error('❌ Erro crítico ao verificar sessão:', error)
      cleanupAuthState()
      setSession(null)
      setUser(null)
      setUserProfile(null)
      setLoading(false)
    })

    // Escutar mudanças de autenticação
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      console.log('Auth state change:', event, session?.user?.id)
      setSession(session)
      setUser(session?.user ?? null)
      
      if (session?.user) {
        // Atualizar last_login sempre que detectar sessão
        updateLastLogin(session.user.id)
        
        // Primeiro tentar buscar o perfil no banco, depois criar em memória se necessário
        setTimeout(async () => {
          try {
            console.log('👤 Buscando perfil no banco para:', session.user.email)
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
              
              console.log('✅ Perfil encontrado no banco:', existingProfile.email)
              setUserProfile({ ...existingProfile, role: roleData?.role || 'visitante' } as UserProfile)
            } else {
              console.log('📝 Perfil não encontrado, criando em memória...')
              // Criar perfil em memória apenas se não existir no banco
              const email = session.user.email!
              const profile: UserProfile = {
                id: session.user.id,
                email,
                full_name: session.user.user_metadata?.full_name || email.split('@')[0],
                role: isGlobalAcoEmail(email) ? 'operacional' : 'visitante',
                is_external: !isGlobalAcoEmail(email),
                created_at: new Date().toISOString(),
              }
              
              console.log('✅ Perfil criado em memória:', profile.email, 'role:', profile.role)
              setUserProfile(profile)
            }
          } catch (error) {
            console.error('❌ Erro ao buscar perfil:', error)
            // Fallback: criar perfil em memória
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

      if (event === 'SIGNED_IN') {
        toast.success('Login realizado com sucesso!')
      } else if (event === 'SIGNED_OUT') {
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
    console.log('👤 Carregando perfil para usuário:', userId)
    
    try {
      const { data, error } = await supabase
        .from('user_profiles')
        .select('*')
        .eq('id', userId)
        .maybeSingle()

      if (error) {
        console.log('❌ Erro ao carregar perfil:', error.message)
        console.log('🔧 Criando perfil automaticamente...')
        await createUserProfile(userId)
        return
      }

      if (data) {
        const { data: roleData } = await supabase
          .from('user_roles')
          .select('role')
          .eq('user_id', userId)
          .maybeSingle()
        
        console.log('✅ Perfil carregado:', data.email)
        setUserProfile({ ...data, role: roleData?.role || 'visitante' } as UserProfile)
      } else {
        console.log('📝 Perfil não encontrado, criando...')
        await createUserProfile(userId)
      }
    } catch (error) {
      console.error('💥 Erro inesperado ao carregar perfil:', error)
      await createUserProfile(userId)
    } finally {
      setLoading(false)
    }
  }

  const createUserProfile = async (userId: string) => {
    console.log('🔧 Criando perfil para usuário:', userId)
    
    try {
      const user = await supabase.auth.getUser()
      if (!user.data.user) {
        console.log('❌ Usuário não encontrado')
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
      
      console.log('✅ Perfil criado:', profile.email)
      setUserProfile(profile)
      setLoading(false)
    } catch (error) {
      console.error('💥 Erro ao criar perfil:', error)
      setLoading(false)
    }
  }

  const signIn = async (email: string, password: string) => {
    console.log('🔥 INICIANDO signIn function')
    
    const maxRetries = 3
    let lastError = ''
    
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        console.log(`🔄 Tentativa ${attempt} de ${maxRetries}`)
        
        if (attempt === 1) {
          console.log('🧹 Limpando estado...')
          cleanupAuthState()
        }
        
        console.log('📤 Chamando supabase.auth.signInWithPassword...')
        const { data, error } = await supabase.auth.signInWithPassword({
          email,
          password,
        })

        console.log('📥 Resposta do Supabase:', { data: !!data, error: error?.message })

        if (error) {
          console.log('❌ Erro de login:', error.message)
          
          // Erros que não devem ser retentados
          if (error.message.includes('Invalid login credentials') || 
              error.message.includes('User not found') ||
              error.message.includes('Email not confirmed')) {
            return { error: error.message }
          }
          
          lastError = error.message
          
          // Para outros erros, tentar novamente
          if (attempt < maxRetries) {
            console.log(`⏳ Aguardando ${attempt}s antes da próxima tentativa...`)
            await new Promise(resolve => setTimeout(resolve, 1000 * attempt))
            continue
          }
          
          return { error: 'Erro ao conectar. Verifique sua internet e tente novamente.' }
        }

        console.log('✅ Login Supabase bem-sucedido!')
        console.log('👤 Dados do usuário:', data.user?.id, data.user?.email)
        
        return {}
        
      } catch (error) {
        console.error(`💥 Erro capturado na tentativa ${attempt}:`, error)
        lastError = error instanceof Error ? error.message : 'Erro desconhecido'
        
        // Se for erro de fetch/rede, tentar novamente
        if (attempt < maxRetries && lastError.toLowerCase().includes('fetch')) {
          console.log(`⏳ Erro de rede. Aguardando ${attempt}s antes da próxima tentativa...`)
          await new Promise(resolve => setTimeout(resolve, 1000 * attempt))
          continue
        }
        
        if (attempt >= maxRetries) {
          break
        }
      }
    }
    
    console.log('🏁 Fim da função signIn após todas as tentativas')
    return { 
      error: lastError.toLowerCase().includes('fetch')
        ? 'Erro de conexão. Verifique sua internet e tente novamente.'
        : 'Erro ao conectar com o servidor. Tente novamente.' 
    }
  }

  const signUp = async (email: string, password: string, fullName: string) => {
    try {
      setLoading(true)

      // Verificar se é email corporativo ou se foi convidado
      const isCorpEmail = isGlobalAcoEmail(email)
      
      if (!isCorpEmail) {
        // For now, allow external signups - invitation check can be added later
        console.log('External email signup:', email)
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
      
      // Forçar redirect para página de login
      window.location.href = '/auth'
    } catch (error) {
      console.error('Erro no logout:', error)
      // Mesmo com erro, forçar limpeza e redirect
      cleanupAuthState()
      window.location.href = '/auth'
    }
  }

  const resetPassword = async (email: string) => {
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/confirm-email`,
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
    if (!user) return { error: 'Usuário não autenticado' }

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