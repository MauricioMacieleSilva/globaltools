import React, { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Loader2, Mail, ArrowLeft } from 'lucide-react'
import { useAuth } from '@/context/AuthContext'
import { ZeGlobalIcon } from '@/components/icons/ZeGlobalIcon'

interface ForgotPasswordFormProps {
  onBackToLogin: () => void
}

export const ForgotPasswordForm: React.FC<ForgotPasswordFormProps> = ({ onBackToLogin }) => {
  const [email, setEmail] = useState('')
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [isSubmitted, setIsSubmitted] = useState(false)
  const { resetPassword, loading } = useAuth()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setSuccess('')

    if (!email) {
      setError('Por favor, digite seu email')
      return
    }

    const { error: resetError } = await resetPassword(email)
    if (resetError) {
      setError(resetError)
    } else {
      setSuccess('Instruções para redefinir sua senha foram enviadas para seu email.')
      setIsSubmitted(true)
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
            Recuperar Senha
          </CardTitle>
          <CardDescription className="text-muted-foreground mt-2">
            Digite seu email para receber instruções
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
              <Label htmlFor="email" className="text-sm font-medium">
                Email
              </Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
                <Input
                  id="email"
                  type="email"
                  placeholder="seu.email@globalaco.com.br"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="pl-10"
                  disabled={loading}
                  autoComplete="email"
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
                  Enviando...
                </>
              ) : (
                'Enviar Instruções'
              )}
            </Button>
          </form>
        ) : (
          <div className="space-y-4">
            <Alert className="border-green-200 bg-green-50 text-green-800">
              <AlertDescription>{success}</AlertDescription>
            </Alert>
            
            <div className="text-center space-y-2">
              <p className="text-sm text-muted-foreground">
                Verifique sua caixa de entrada e spam.
              </p>
              <p className="text-sm text-muted-foreground">
                Não recebeu? Verifique se o email está correto e tente novamente.
              </p>
            </div>
          </div>
        )}

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
      </CardContent>
    </Card>
  )
}