import React, { useState, useCallback, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Loader2, Mail, Lock, Eye, EyeOff, UserPlus } from 'lucide-react'
import { useAuth } from '@/context/AuthContext'
import { ZeGlobalIcon } from '@/components/icons/ZeGlobalIcon'
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
  const { signIn, loading, user } = useAuth()
  const navigate = useNavigate()

  // Redirecionar se ja estiver logado
  useEffect(() => {
    if (user && !loading) {
      console.log('Usuario ja logado, redirecionando...')
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

    try {
      const result = await signIn(email, password)
      if (result?.error) {
        const errMsg = result.error.toLowerCase()
        if (errMsg.includes('invalid login') || errMsg.includes('invalid credentials') || errMsg.includes('email not confirmed')) {
          setError('Email ou senha incorretos')
          setSuggestSignUp(true)
        } else {
          setError(result.error)
        }
      }
      // Se login OK, o AuthContext atualiza user e Auth.tsx redireciona para /
    } catch (err) {
      setError('Erro inesperado. Tente novamente.')
    }
  }

  return (
    <Card className="w-full max-w-md mx-auto shadow-xl border-border/50">
      <CardHeader className="text-center space-y-4 pb-6">
        <div className="flex justify-center">
          <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
            <img 
              src="/lovable-uploads/f96100cc-9725-48af-9945-a9be6b4fa4b0.png" 
              alt="Global Aco" 
              className="w-10 h-10"
            />
          </div>
        </div>
        <div>
          <CardTitle className="text-2xl font-bold text-foreground">
            Global Aco
          </CardTitle>
          <CardDescription className="text-muted-foreground mt-2">
            Sistema de Gestao Corporativa
          </CardDescription>
        </div>
      </CardHeader>
      
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
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
                className="pl-10"
                disabled={loading}
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
                className="pl-10 pr-10"
                disabled={loading}
                autoComplete="current-password"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 transform -translate-y-1/2 text-muted-foreground hover:text-foreground"
                disabled={loading}
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <Button
            type="submit"
            className="w-full"
            disabled={loading}
          >
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Entrando...
              </>
            ) : (
              'Entrar'
            )}
          </Button>
        </form>

        <div className="mt-6 space-y-4">
          <div className="text-center">
            <button
              type="button"
              onClick={onForgotPassword}
              className="text-sm text-primary hover:underline"
              disabled={loading}
            >
              Esqueceu sua senha?
            </button>
          </div>

          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t border-border" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-background px-2 text-muted-foreground">
                Primeiro acesso?
              </span>
            </div>
          </div>

          <Button
            type="button"
            variant={suggestSignUp ? "default" : "outline"}
            className={`w-full transition-all duration-200 ${suggestSignUp ? 'ring-2 ring-primary/20 shadow-lg' : ''}`}
            onClick={onSwitchToSignUp}
            disabled={loading}
          >
            {suggestSignUp && <UserPlus className="mr-2 h-4 w-4" />}
            Criar Nova Conta
          </Button>
        </div>

        <div className="mt-6 text-center">
          <p className="text-xs text-muted-foreground">
            Acesso restrito aos colaboradores da Global Aco.
            <br />
            Usuarios externos devem ser convidados.
          </p>
        </div>
      </CardContent>
    </Card>
  )
}
