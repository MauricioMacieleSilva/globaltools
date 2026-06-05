import React, { useState, useCallback, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Loader2, Mail, Lock, Eye, EyeOff, UserPlus, MailCheck } from 'lucide-react'
import { useAuth } from '@/context/AuthContext'
import { ZeGlobalIcon } from '@/components/icons/ZeGlobalIcon'
import { supabase } from '@/integrations/supabase/client'
import { isGlobalAcoEmail } from '@/lib/supabase'
import { useToast } from '@/hooks/use-toast'
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
  const [debugInfo, setDebugInfo] = useState('')
  // Fluxo B: controle de redefinicao obrigatoria de senha
  const [needsReset, setNeedsReset] = useState(false)
  const [resetEmailSent, setResetEmailSent] = useState(false)
  const { signIn, resetPassword, loading, user, userProfile } = useAuth()
  const { toast } = useToast()
  const navigate = useNavigate()

  // Redirecionar se ja estiver logado
  useEffect(() => {
    if (user && !loading) {
      console.log('Usuario ja logado, redirecionando...')
      navigate('/')
    }
  }, [user, loading, navigate])

  useEffect(() => {
    if (error) {
      console.log('Estado de erro atualizado:', error)
      setDebugInfo(`Erro definido: ${error} | Timestamp: ${new Date().toLocaleTimeString()}`)
      toast({
        variant: "destructive",
        title: "Erro de autenticacao",
        description: error,
        duration: 5000,
      })
    }
  }, [error, toast])

  useEffect(() => {
    if (suggestSignUp) {
      toast({
        title: "Sugestao",
        description: "Clique em 'Criar Nova Conta' para se cadastrar",
        duration: 4000,
      })
    }
  }, [suggestSignUp, toast])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setSuggestSignUp(false)
    setDebugInfo('')

    if (!email) {
      setError('Por favor, informe seu email')
      return
    }

    if (!needsReset && !password) {
      setError('Por favor, preencha todos os campos')
      return
    }

    try {
      if (!needsReset) {
        const { data: needsResetResult, error: rpcError } = await supabase
          .rpc('check_user_needs_reset', { email_to_check: email.toLowerCase().trim() })

        if (!rpcError && needsResetResult === true) {
          setNeedsReset(true)
          const { error: resetError } = await resetPassword(email)
          if (!resetError) {
            setResetEmailSent(true)
            toast({
              title: 'Email enviado!',
              description: 'Verifique sua caixa de entrada para criar sua nova senha.',
              duration: 6000,
            })
            return
          } else {
            console.warn('⚠️ Falha ao enviar email de redefinição, continuando para fluxo interno:', resetError)
            // Se falhar o envio do email, prosseguimos para o login direto.
            // O ProtectedRoute irá interceptar e forçar o reset em tela de qualquer forma.
          }
        }
      }

      if (!password) {
        setError('Por favor, informe sua senha')
        return
      }

      const result = await signIn(email, password)
      if (result?.error) {
        setError('Erro: ' + result.error)
      }
    } catch (error) {
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
        {resetEmailSent ? (
          <div className="space-y-5 py-2">
            <div className="flex justify-center">
              <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center">
                <MailCheck className="w-8 h-8 text-green-600" />
              </div>
            </div>
            <div className="text-center space-y-3">
              <h3 className="font-semibold text-foreground text-lg">Verifique seu e-mail</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">
                {`Ola! O sistema da Global Aco passou por melhorias e atualizacoes recentes. Para garantir a seguranca da sua conta, enviamos um link para ${email} para que voce cadastre sua nova senha pessoal.`}
              </p>
              <p className="text-xs text-muted-foreground">
                Nao encontrou? Verifique tambem a caixa de spam.
              </p>
            </div>
            <Button
              type="button"
              variant="outline"
              className="w-full"
              onClick={() => { setResetEmailSent(false); setNeedsReset(false); setEmail('') }}
            >
              Usar outro e-mail
            </Button>
          </div>
        ) : (
        <form onSubmit={handleSubmit} className="space-y-4">
          {debugInfo && import.meta.env.DEV && (
            <Alert>
              <AlertDescription className="text-xs font-mono">
                DEBUG: {debugInfo}
              </AlertDescription>
            </Alert>
          )}
          
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
                onChange={(e) => { setEmail(e.target.value); setNeedsReset(false); setResetEmailSent(false) }}
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
        )}

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
