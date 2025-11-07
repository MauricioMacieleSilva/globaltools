import React, { useState } from 'react'
import { LoginForm } from '@/components/auth/LoginForm'
import { SignUpForm } from '@/components/auth/SignUpForm'
import { ForgotPasswordForm } from '@/components/auth/ForgotPasswordForm'

type AuthView = 'login' | 'signup' | 'forgot-password'

export const Auth: React.FC = () => {
  const [currentView, setCurrentView] = useState<AuthView>('login')

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
      </div>
    </div>
  )
}