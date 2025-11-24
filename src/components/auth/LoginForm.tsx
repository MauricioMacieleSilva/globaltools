import React, { useState, useCallback, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Loader2, Mail, Lock, Eye, EyeOff, UserPlus } from 'lucide-react'
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
  const { signIn, loading, user, userProfile } = useAuth()
  const { toast } = useToast()
  const navigate = useNavigate()

  // Redirecionar se já estiver logado
  useEffect(() => {
    if (user && !loading) {
      console.log('👤 Usuário já logado, redirecionando...')
      navigate('/')
    }
  }, [user, loading, navigate])

  // Debug effect to monitor error state changes
  useEffect(() => {
    if (error) {
      console.log('Estado de erro atualizado:', error)
      setDebugInfo(`Erro definido: ${error} | Timestamp: ${new Date().toLocaleTimeString()}`)
      
      // Toast como fallback para garantir que o usuário veja o erro
      toast({
        variant: "destructive",
        title: "Erro de autenticação",
        description: error,
        duration: 5000,
      })
    }
  }, [error, toast])

  // Debug effect to monitor suggestSignUp changes
  useEffect(() => {
    if (suggestSignUp) {
      console.log('Estado suggestSignUp ativado')
      toast({
        title: "Sugestão",
        description: "Clique em 'Criar Nova Conta' para se cadastrar",
        duration: 4000,
      })
    }
  }, [suggestSignUp, toast])

  const checkUserExists = async (email: string): Promise<{ exists: boolean; tableExists: boolean }> => {
    try {
      console.log('Verificando se usuário existe:', email)
      const { data, error } = await supabase
        .from('user_profiles')
        .select('email')
        .eq('email', email)
        .single()
      
      if (error) {
        console.log('Erro ao verificar usuário:', error)
        // Se a tabela não existe, retornamos que a tabela não existe
        if (error.code === 'PGRST116' || error.message?.includes('relation') || error.message?.includes('does not exist')) {
          console.log('Tabela user_profiles não existe')
          return { exists: false, tableExists: false }
        }
        // Se é erro de "not found", significa que a tabela existe mas o usuário não
        if (error.code === 'PGRST116' || error.details?.includes('0 rows')) {
          return { exists: false, tableExists: true }
        }
      }
      
      return { exists: !!data, tableExists: true }
    } catch (error) {
      console.log('Erro na verificação do usuário:', error)
      return { exists: false, tableExists: false }
    }
  }

  const displayError = useCallback((errorMessage: string, shouldSuggestSignUp: boolean = false) => {
    console.log('🔴 DEFININDO ERRO:', errorMessage)
    console.log('🔴 SUGERIR CADASTRO:', shouldSuggestSignUp)
    
    // Force um pequeno delay para garantir que o loading terminou
    setTimeout(() => {
      setError(errorMessage)
      setSuggestSignUp(shouldSuggestSignUp)
      
      // Garantir que o erro seja visível via toast também
      toast({
        variant: "destructive",
        title: "Erro de Login",
        description: errorMessage,
        duration: 6000,
      })
      
      console.log('✅ ERRO DEFINIDO NO ESTADO:', errorMessage)
    }, 100)
  }, [toast])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    console.log('🚀 INICIANDO LOGIN')
    
    // Limpar estados anteriores
    setError('')
    setSuggestSignUp(false)
    setDebugInfo('')

    // Validações básicas
    if (!email || !password) {
      console.log('❌ Campos vazios')
      setError('Por favor, preencha todos os campos')
      return
    }

    console.log('📧 Tentando login com:', email)
    console.log('🔄 Estado loading atual:', loading)

    try {
      console.log('⏳ Chamando signIn...')
      const result = await signIn(email, password)
      console.log('📥 Resultado completo do signIn:', result)
      
      if (result?.error) {
        console.log('❌ Erro de login:', result.error)
        // Evitar duplicação de "Erro:" no começo da mensagem
        const errorMsg = result.error.startsWith('Erro') 
          ? result.error 
          : 'Erro: ' + result.error
        setError(errorMsg)
      } else {
        console.log('✅ Login bem-sucedido, aguardando redirecionamento...')
        // Não fazer nada, deixar o AuthContext gerenciar
      }
    } catch (error) {
      console.error('💥 Erro inesperado capturado:', error)
      setError('Erro inesperado. Tente novamente.')
    }
    
    console.log('🏁 Fim do handleSubmit')
  }

  return (
    <Card className="w-full max-w-md mx-auto shadow-xl border-border/50">
      <CardHeader className="text-center space-y-4 pb-6">
        <div className="flex justify-center">
          <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
            <img 
              src="/lovable-uploads/f96100cc-9725-48af-9945-a9be6b4fa4b0.png" 
              alt="Global Aço" 
              className="w-10 h-10"
            />
          </div>
        </div>
        <div>
          <CardTitle className="text-2xl font-bold text-foreground">
            Global Aço
          </CardTitle>
          <CardDescription className="text-muted-foreground mt-2">
            Sistema de Gestão Corporativa
          </CardDescription>
        </div>
      </CardHeader>
      
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Debug info - only show in development */}
          {debugInfo && process.env.NODE_ENV === 'development' && (
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
                Parece que você ainda não tem uma conta. Clique em "Criar Nova Conta" abaixo para se cadastrar.
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
            className={`w-full transition-all duration-200 ${
              suggestSignUp ? 'ring-2 ring-primary/20 shadow-lg' : ''
            }`}
            onClick={onSwitchToSignUp}
            disabled={loading}
          >
            {suggestSignUp && <UserPlus className="mr-2 h-4 w-4" />}
            Criar Nova Conta
          </Button>
        </div>

        <div className="mt-6 text-center">
          <p className="text-xs text-muted-foreground">
            Acesso restrito aos colaboradores da Global Aço.
            <br />
            Usuários externos devem ser convidados.
          </p>
        </div>
      </CardContent>
    </Card>
  )
}