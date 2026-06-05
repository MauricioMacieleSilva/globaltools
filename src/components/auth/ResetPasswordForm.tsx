import React, { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Loader2, Lock, ArrowLeft, CheckCircle } from 'lucide-react'
import { supabase } from '@/integrations/supabase/client'
import { ZeGlobalIcon } from '@/components/icons/ZeGlobalIcon'

interface ResetPasswordFormProps {
  onBackToLogin: () => void
}

export const ResetPasswordForm: React.FC<ResetPasswordFormProps> = ({ onBackToLogin }) => {
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [loading, setLoading] = useState(false)
  const [isSubmitted, setIsSubmitted] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setSuccess('')

    if (!password) {
      setError('Por favor, digite sua nova senha')
      return
    }

    if (password.length < 6) {
      setError('A senha deve ter pelo menos 6 caracteres')
      return
    }

    if (password !== confirmPassword) {
      setError('As senhas nao coincidem')
      return
    }

    setLoading(true)
    try {
      // 1. Atualizar a senha no Supabase Auth
      const { data: updateData, error: updateError } = await supabase.auth.updateUser({
        password: password
      })

      const isSamePasswordError = updateError && (
        updateError.message?.toLowerCase().includes('should be different') ||
        updateError.message?.toLowerCase().includes('same as the old') ||
        updateError.message?.toLowerCase().includes('diferente')
      )

      if (updateError && !isSamePasswordError) {
        setError(updateError.message)
        return
      }

      // 2. Limpar a flag needs_password_reset no perfil do usuario
      let userId = updateData?.user?.id
      if (!userId) {
        const { data: userData } = await supabase.auth.getUser()
        userId = userData?.user?.id
      }

      if (userId) {
        await supabase
          .from('user_profiles')
          .update({ needs_password_reset: false })
          .eq('id', userId)
      }

      setSuccess('Sua senha foi redefinida com sucesso!')
      setIsSubmitted(true)
    } catch (err: any) {
      setError('Erro ao redefinir senha. Tente novamente.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Card className="w-full max-w-md mx-auto shadow-xl border-border/50">
      <CardHeader className="text-center space-y-4 pb-6">
        <div className="flex justify-center">
          <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
            <ZeGlobalIcon className="w-10 h-10 text-primary" />
          </div>
        </div>
        <div>
          <CardTitle className="text-2xl font-bold text-foreground">
            Definir Nova Senha
          </CardTitle>
          <CardDescription className="text-muted-foreground mt-2">
            Digite e confirme sua nova senha de acesso
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
                  placeholder="Minimo 6 caracteres"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="pl-10"
                  disabled={loading}
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
                  placeholder="Confirme sua senha"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="pl-10"
                  disabled={loading}
                />
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
                  Salvando...
                </>
              ) : (
                'Salvar Nova Senha'
              )}
            </Button>
          </form>
        ) : (
          <div className="space-y-4">
            <Alert className="border-green-200 bg-green-50 text-green-800 flex items-start gap-2">
              <CheckCircle className="w-5 h-5 text-green-600 shrink-0 mt-0.5" />
              <AlertDescription className="font-medium">{success}</AlertDescription>
            </Alert>
            
            <div className="text-center space-y-2 pt-2">
              <p className="text-sm text-muted-foreground">
                Sua senha foi atualizada. Voce ja esta conectado e pode prosseguir.
              </p>
              <Button
                type="button"
                className="w-full mt-2"
                onClick={() => window.location.href = '/'}
              >
                Acessar o Painel
              </Button>
            </div>
          </div>
        )}

        {!isSubmitted && (
          <div className="mt-6">
            <Button
              type="button"
              variant="ghost"
              className="w-full"
              onClick={onBackToLogin}
              disabled={loading}
            >
              <ArrowLeft className="mr-2 h-4 w-4" />
              Voltar ao Login
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
