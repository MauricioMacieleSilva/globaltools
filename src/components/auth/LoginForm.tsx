import React, { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Loader2, Mail, Lock, Eye, EyeOff, UserPlus } from 'lucide-react'
import { useAuth } from '@/context/AuthContext'
import { useNavigate } from 'react-router-dom'

interface LoginFormProps {
  onSwitchToSignUp: () => void
  onForgotPassword: () => void
}

export const LoginForm: React.FC<LoginFormProps> = ({ onSwitchToSignUp, onForgotPassword }) => {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState('')
  const [suggestSignUp, setSuggestSignUp] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const { signIn, user, loading } = useAuth()
  const navigate = useNavigate()

  // Redirecionar se ja estiver logado
  useEffect(() => {
    if (user && !loading) {
      navigate('/')
    }
  }, [user, loading, navigate])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setSuggestSignUp(false)

    if (!email || !password) {
      setError('Por favor, preencha todos os campos')
      return
    }

    setIsSubmitting(true)
    try {
      const result = await signIn(email, password)
      if (result?.error) {
        const errMsg = result.error.toLowerCase()
        if (
          errMsg.includes('invalid login') ||
          errMsg.includes('invalid credentials') ||
          errMsg.includes('invalid email') ||
          errMsg.includes('email not confirmed')
        ) {
          setError('Email ou senha incorretos')
          setSuggestSignUp(true)
        } else {
          setError(result.error)
        }
      }
      // Se login OK, o onAuthStateChange dispara e Auth.tsx redireciona para /
    } catch (err) {
      setError('Erro inesperado. Tente novamente.')
    } finally {
      setIsSubmitting(false)
    }
  }

  const isBusy = isSubmitting || loading

  return (
    <Card className="w-full max-w-md mx-auto bg-[#0e2238]/85 backdrop-blur-xl border border-[#009bde]/30 text-white shadow-[0_8px_32px_0_rgba(0,92,138,0.3)]">
      <CardHeader className="text-center space-y-3 pb-4">
        <div className="flex justify-center">
          <img
            src="/lovable-uploads/f96100cc-9725-48af-9945-a9be6b4fa4b0.png"
            alt="Global Aço"
            className="w-24 h-auto object-contain"
          />
        </div>
        <div>
          <CardTitle className="text-2xl font-bold text-white bg-gradient-to-r from-white via-slate-200 to-[#8fc9eb] bg-clip-text text-transparent">
            Global Aço
          </CardTitle>
          <CardDescription className="text-slate-300 mt-2">
            Sistema de Gestao Corporativa
          </CardDescription>
        </div>
      </CardHeader>

      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-3">
          {error && (
            <Alert variant="destructive" className="border-2 border-destructive/50">
              <AlertDescription className="font-medium">
                {error}
              </AlertDescription>
            </Alert>
          )}

          {suggestSignUp && (
            <Alert className="border-2 border-primary/50 bg-primary/5">
              <UserPlus className="h-4 w-4" />
              <AlertDescription className="font-medium">
                Parece que voce ainda nao tem uma conta. Clique em "Criar Nova Conta" abaixo para se cadastrar.
              </AlertDescription>
            </Alert>
          )}

          <div className="space-y-2">
            <Label htmlFor="email" className="text-sm font-medium">
              Email Corporativo
            </Label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
              <Input
                id="email"
                type="email"
                placeholder="seu.nome@globalaco.com.br"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="pl-10 bg-[#07162c]/65 border-[#009bde]/20 focus-visible:ring-[#00c6ff] text-white placeholder-slate-500"
                disabled={isBusy}
                autoComplete="email"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="password" className="text-sm font-medium">
              Senha
            </Label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
              <Input
                id="password"
                type={showPassword ? 'text' : 'password'}
                placeholder="Digite sua senha"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="pl-10 pr-10 bg-[#07162c]/65 border-[#009bde]/20 focus-visible:ring-[#00c6ff] text-white placeholder-slate-500"
                disabled={isBusy}
                autoComplete="current-password"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 transform -translate-y-1/2 text-muted-foreground hover:text-foreground"
                disabled={isBusy}
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <Button
            type="submit"
            className="w-full bg-gradient-to-r from-[#005c8a] to-[#009bde] hover:from-[#007cb3] hover:to-[#00c6ff] text-white shadow-[0_0_15px_rgba(0,155,222,0.3)] transition-all duration-300"
            disabled={isBusy}
          >
            {isBusy ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Entrando...
              </>
            ) : (
              'Entrar'
            )}
          </Button>
        </form>

        <div className="mt-4 space-y-3">
          <div className="text-center">
            <button
              type="button"
              onClick={onForgotPassword}
              className="text-sm text-[#00c6ff] hover:underline hover:text-white transition-colors"
              disabled={isBusy}
            >
              Esqueceu sua senha?
            </button>
          </div>

          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t border-border" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-[#0e2238] px-2 text-slate-400">
                Primeiro acesso?
              </span>
            </div>
          </div>

          <Button
            type="button"
            className="w-full bg-transparent border border-[#009bde]/50 text-slate-200 hover:bg-[#009bde]/20 hover:border-[#009bde] hover:text-white transition-all duration-200"
            onClick={onSwitchToSignUp}
            disabled={isBusy}
          >
            {suggestSignUp && <UserPlus className="mr-2 h-4 w-4" />}
            Criar Nova Conta
          </Button>
        </div>

        <div className="mt-6 text-center">
          <p className="text-xs text-slate-400">
            Acesso restrito aos colaboradores da Global Aço.
            <br />
            Usuarios externos devem ser convidados.
          </p>
        </div>
      </CardContent>
    </Card>
  )
}
