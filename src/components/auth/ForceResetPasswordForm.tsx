import React, { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Loader2, Lock, CheckCircle, RefreshCw } from 'lucide-react'
import { supabase } from '@/integrations/supabase/client'
import { useAuth } from '@/context/AuthContext'
import { ZeGlobalIcon } from '@/components/icons/ZeGlobalIcon'
import { toast } from 'sonner'

export const ForceResetPasswordForm: React.FC = () => {
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [loading, setLoading] = useState(false)
  const [isSubmitted, setIsSubmitted] = useState(false)
  const { updateProfile, signOut } = useAuth()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setSuccess('')

    if (!password) {
      setError('Por favor, digite sua nova senha.')
      return
    }

    if (password.length < 6) {
      setError('A senha deve ter pelo menos 6 caracteres.')
      return
    }

    if (password === 'Mtabi2026!') {
      setError('Sua nova senha deve ser diferente da senha temporária anterior.')
      return
    }

    if (password !== confirmPassword) {
      setError('As senhas não coincidem.')
      return
    }

    setLoading(true)
    try {
      // 1. Atualizar a senha no Supabase Auth
      console.log('🔄 Atualizando senha no auth...')
      const { error: updateAuthError } = await supabase.auth.updateUser({
        password: password
      })

      const isSamePasswordError = updateAuthError && (
        updateAuthError.message?.toLowerCase().includes('should be different') ||
        updateAuthError.message?.toLowerCase().includes('same as the old') ||
        updateAuthError.message?.toLowerCase().includes('diferente')
      )

      if (updateAuthError && !isSamePasswordError) {
        console.error('❌ Erro no auth.updateUser:', updateAuthError)
        setError(`Erro ao atualizar credenciais: ${updateAuthError.message}`)
        setLoading(false)
        return
      }

      if (isSamePasswordError) {
        console.log('ℹ️ Usuário utilizou a mesma senha anterior. Permitindo fluxo prosseguir.')
      }

      // 2. Atualizar o perfil do usuário removendo a flag de redefinição obrigatória
      console.log('🔄 Removendo flag needs_password_reset do perfil...')
      const { error: updateProfileError } = await updateProfile({
        needs_password_reset: false
      })

      if (updateProfileError) {
        console.error('❌ Erro no updateProfile:', updateProfileError)
        setError(`Senha alterada, mas erro ao salvar perfil: ${updateProfileError}`)
        setLoading(false)
        return
      }

      // Sucesso!
      console.log('✅ Redefinição obrigatória concluída com sucesso!')
      toast.success('Senha atualizada com sucesso!')
      setSuccess('Sua nova senha foi cadastrada com sucesso!')
      setIsSubmitted(true)

    } catch (err: any) {
      console.error('💥 Erro inesperado:', err)
      setError('Ocorreu um erro inesperado. Por favor, tente novamente.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/30 flex items-center justify-center p-4">
      <Card className="w-full max-w-md mx-auto shadow-2xl border-border/50 relative overflow-hidden">
        <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-primary/50 via-primary to-primary/50" />
        
        <CardHeader className="text-center space-y-4 pb-6">
          <div className="flex justify-center">
            <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center animate-pulse">
              <ZeGlobalIcon className="w-10 h-10 text-primary" />
            </div>
          </div>
          <div>
            <CardTitle className="text-2xl font-bold text-foreground">
              Atualização de Acesso
            </CardTitle>
            <CardDescription className="text-muted-foreground mt-2 text-sm leading-relaxed px-2">
              Olá! O nosso sistema passou por melhorias e atualizações recentes. Para garantir a segurança dos seus dados, é necessário cadastrar uma nova senha pessoal de sua preferência neste primeiro acesso.
            </CardDescription>
          </div>
        </CardHeader>
        
        <CardContent>
          {!isSubmitted ? (
            <form onSubmit={handleSubmit} className="space-y-4">
              {error && (
                <Alert variant="destructive">
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}
              
              <div className="space-y-2">
                <Label htmlFor="password" className="text-sm font-medium">
                  Nova Senha
                </Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
                  <Input
                    id="password"
                    type="password"
                    placeholder="Mínimo 6 caracteres"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="pl-10 h-10 focus-visible:ring-primary"
                    disabled={loading}
                    required
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="confirmPassword" className="text-sm font-medium">
                  Confirmar Nova Senha
                </Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
                  <Input
                    id="confirmPassword"
                    type="password"
                    placeholder="Confirme a nova senha"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="pl-10 h-10 focus-visible:ring-primary"
                    disabled={loading}
                    required
                  />
                </div>
              </div>

              <Button
                type="submit"
                className="w-full h-10 mt-2 font-medium"
                disabled={loading}
              >
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Atualizando acesso...
                  </>
                ) : (
                  <>
                    <RefreshCw className="mr-2 h-4 w-4" />
                    Cadastrar Nova Senha
                  </>
                )}
              </Button>
            </form>
          ) : (
            <div className="space-y-4">
              <Alert className="border-green-200 bg-green-50/50 text-green-800 flex items-start gap-2">
                <CheckCircle className="w-5 h-5 text-green-600 shrink-0 mt-0.5" />
                <AlertDescription className="font-medium">{success}</AlertDescription>
              </Alert>
              
              <div className="text-center space-y-3 pt-2">
                <p className="text-sm text-muted-foreground">
                  Seu cadastro foi atualizado com sucesso e seu acesso já está liberado. Seja bem-vindo de volta!
                </p>
                <Button
                  type="button"
                  className="w-full h-10 mt-2 font-medium"
                  onClick={() => {
                    // Recarregar a página para inicializar o dashboard com os dados limpos
                    window.location.reload()
                  }}
                >
                  Ir para o Dashboard
                </Button>
              </div>
            </div>
          )}

          {!isSubmitted && (
            <div className="mt-4 pt-4 border-t border-border/40 text-center">
              <button
                type="button"
                className="text-xs text-muted-foreground hover:text-primary transition-colors underline underline-offset-4"
                onClick={() => signOut()}
                disabled={loading}
              >
                Fazer Logout e Sair
              </button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
