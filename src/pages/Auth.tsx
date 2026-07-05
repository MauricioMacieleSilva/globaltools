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
    const params = new URLSearchParams(window.location.search)
    const view = params.get('view')
    if (view === 'reset-password') {
      setCurrentView('reset-password')
      return
    }

    const hash = window.location.hash
    if (hash && hash.includes('type=recovery')) {
      setCurrentView('reset-password')
      return
    }

    if (hash && hash.includes('access_token') && hash.includes('recovery')) {
      setCurrentView('reset-password')
      return
    }
  }, [])

  if (user && !loading && currentView !== 'reset-password') {
    return <Navigate to="/" replace />
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-[#07162c] flex items-center justify-center p-4">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin text-[#00c6ff] mx-auto mb-4" />
          <p className="text-sm text-slate-300">Carregando...</p>
        </div>
      </div>
    )
  }

  return (
    <div 
      className="min-h-screen bg-cover bg-center flex items-center justify-center p-4 relative overflow-hidden"
      style={{ backgroundImage: "url('/login-bg.png')" }}
    >
      {/* Deep blue glass overlay */}
      <div className="absolute inset-0 bg-[#08182b]/60 backdrop-blur-md pointer-events-none" />
      
      {/* Extra metallic blue glow highlights */}
      <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] rounded-full bg-[#005c8a]/15 blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] rounded-full bg-[#009bde]/10 blur-[120px] pointer-events-none" />

      <div className="w-full max-w-md relative z-10 animate-fade-in">
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
