import React, { useState, useEffect } from 'react'
import { LoginForm } from '@/components/auth/LoginForm'
import { SignUpForm } from '@/components/auth/SignUpForm'
import { ForgotPasswordForm } from '@/components/auth/ForgotPasswordForm'
import { ResetPasswordForm } from '@/components/auth/ResetPasswordForm'
import { useAuth } from '@/context/AuthContext'
import { Navigate } from 'react-router-dom'
import { Loader2 } from 'lucide-react'

type AuthView = 'login' | 'signup' | 'forgot-password' | 'reset-password'

const Auth: React.FC = () => {
  const [currentView, setCurrentView] = useState<AuthView>('login')
  const { user, loading } = useAuth()

  useEffect(() => {
    // Detectar via query string: ?view=reset-password
    const params = new URLSearchParams(window.location.search)
    const view = params.get('view')
    if (view === 'reset-password') {
      setCurrentView('reset-password')
      return
    }

    // Detectar via hash do Supabase: #type=recovery&access_token=...
    const hash = window.location.hash
    if (hash && hash.includes('type=recovery')) {
      setCurrentView('reset-password')
      return
    }

    // Detectar via hash do Supabase PKCE: #access_token=...&type=recovery
    if (hash && hash.includes('access_token') && hash.includes('recovery')) {
      setCurrentView('reset-password')
      return
    }
  }, [])

  // Redirecionar usuarios autenticados para a pagina inicial, EXCETO se estiverem redefinindo a senha
  if (user && !loading && currentView !== 'reset-password') {
    return <Navigate to="/" replace />
  }

  // Mostrar loading enquanto verifica autenticacao
  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/30 flex items-center justify-center p-4">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto mb-4" />
          <p className="text-sm text-muted-foreground">Carregando...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/30 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {currentView === 'login' && (
          <LoginForm
            onSwitchToSignUp={() => setCurrentView('signup')}
            onForgotPassword={() => setCurrentView('forgot-password')}
          />
        )}
        
        {currentView === 'signup' && (
          <SignUpForm
            onBackToLogin={() => setCurrentView('login')}
          />
        )}
        
        {currentView === 'forgot-password' && (
          <ForgotPasswordForm
            onBackToLogin={() => setCurrentView('login')}
          />
        )}

        {currentView === 'reset-password' && (
          <ResetPasswordForm
            onBackToLogin={() => setCurrentView('login')}
          />
        )}
      </div>
    </div>
  )
}

export default Auth
