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
          <Loader2 className="h-8 w-8 animate-spin text-[#009bde] mx-auto mb-4" />
          <p className="text-sm text-slate-300">Carregando...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex flex-col md:flex-row bg-[#08182b] text-slate-100 overflow-hidden relative">
      {/* Background Animated Glows */}
      <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] rounded-full bg-[#005c8a]/20 blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] rounded-full bg-[#009bde]/15 blur-[120px] pointer-events-none" />

      {/* Left side: Premium Wallpaper display */}
      <div 
        className="hidden md:flex md:w-[55%] lg:w-[60%] flex-col justify-between p-12 relative bg-cover bg-center overflow-hidden border-r border-[#009bde]/10"
        style={{ backgroundImage: "url('/login-bg.png')" }}
      >
        <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-black/25 mix-blend-multiply pointer-events-none" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(0,155,222,0.12),transparent_70%)] pointer-events-none" />

        {/* Header brand name */}
        <div className="relative z-10 flex items-center gap-3">
          <div className="w-8 h-8 rounded-full border border-white/20 overflow-hidden flex items-center justify-center bg-[#07162c]">
            <img src="/login-bg.png" alt="Global Aço" className="w-12 h-12 object-cover scale-[1.7]" />
          </div>
          <span className="font-bold tracking-wider text-xl bg-gradient-to-r from-white via-slate-200 to-[#8fc9eb] bg-clip-text text-transparent">
            GLOBAL AÇO
          </span>
        </div>

        {/* Footer info */}
        <div className="relative z-10 space-y-2 max-w-lg">
          <h2 className="text-2xl font-semibold tracking-tight text-white drop-shadow-md">
            Líder em Soluções Metálicas e Aço de Qualidade
          </h2>
          <p className="text-sm text-slate-300 drop-shadow">
            Portal Corporativo Seguro. Acesse e gerencie orçamentos, estoque e compras de forma inteligente.
          </p>
        </div>
      </div>

      {/* Right side: Login Panel */}
      <div className="flex-1 flex items-center justify-center p-6 sm:p-12 relative z-10 bg-[#08182b] md:bg-transparent">
        {/* Mobile background fallback */}
        <div 
          className="absolute inset-0 md:hidden bg-cover bg-center opacity-15 pointer-events-none"
          style={{ backgroundImage: "url('/login-bg.png')" }}
        />
        
        <div className="w-full max-w-md space-y-8 relative">
          <div className="text-center md:hidden mb-6">
            <div className="w-20 h-20 mx-auto rounded-full border-2 border-[#009bde]/30 overflow-hidden flex items-center justify-center bg-[#07162c] shadow-lg mb-4">
              <img src="/login-bg.png" alt="Global Aço" className="w-28 h-28 object-cover scale-[1.7]" />
            </div>
            <h1 className="text-2xl font-bold tracking-wider text-white">GLOBAL AÇO</h1>
            <p className="text-xs text-slate-400 mt-1">Gestão Corporativa</p>
          </div>

          <div className="bg-[#0e2238]/60 backdrop-blur-xl border border-[#009bde]/20 p-6 sm:p-8 rounded-2xl shadow-[0_8px_32px_0_rgba(0,92,138,0.2)]">
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
      </div>
    </div>
  )
}

export default Auth
