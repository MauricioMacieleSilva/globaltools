import React, { useEffect, useState } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { supabase } from '@/integrations/supabase/client'
import { useToast } from '@/hooks/use-toast'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Loader2, CheckCircle, XCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'

type ConfirmationStatus = 'loading' | 'success' | 'error'

export const EmailConfirmation: React.FC = () => {
  const [status, setStatus] = useState<ConfirmationStatus>('loading')
  const [message, setMessage] = useState('')
  const navigate = useNavigate()
  const location = useLocation()
  const { toast } = useToast()

  useEffect(() => {
    const handleEmailConfirmation = async () => {
      try {
        // Capturar tokens da URL (tanto hash quanto search params)
        const hashParams = new URLSearchParams(location.hash.substring(1))
        const searchParams = new URLSearchParams(location.search)
        
        const accessToken = hashParams.get('access_token') || searchParams.get('access_token')
        const refreshToken = hashParams.get('refresh_token') || searchParams.get('refresh_token')
        const type = hashParams.get('type') || searchParams.get('type')

        console.log('Email confirmation - Tokens found:', { accessToken: !!accessToken, refreshToken: !!refreshToken, type })

        if (!accessToken || !refreshToken) {
          setStatus('error')
          setMessage('Tokens de confirmação não encontrados na URL.')
          return
        }

        // Definir a sessão com os tokens
        const { data, error } = await supabase.auth.setSession({
          access_token: accessToken,
          refresh_token: refreshToken
        })

        if (error) {
          console.error('Erro ao confirmar email:', error)
          setStatus('error')
          setMessage(`Erro na confirmação: ${error.message}`)
          toast({
            title: "Erro na confirmação",
            description: error.message,
            variant: "destructive"
          })
          return
        }

        if (data.user && data.session) {
          console.log('Email confirmado com sucesso:', data.user.email)
          setStatus('success')
          
          if (type === 'signup') {
            setMessage('Email confirmado com sucesso! Redirecionando para o dashboard...')
            toast({
              title: "Email confirmado!",
              description: "Sua conta foi ativada com sucesso.",
            })
          } else if (type === 'recovery') {
            setMessage('Confirmação de recuperação de senha realizada. Redirecionando...')
            toast({
              title: "Recuperação confirmada",
              description: "Você pode agora definir uma nova senha.",
            })
          } else {
            setMessage('Confirmação realizada com sucesso! Redirecionando...')
            toast({
              title: "Confirmação realizada",
              description: "Redirecionando para o dashboard.",
            })
          }

          // Redirecionar após 2 segundos
          setTimeout(() => {
            navigate('/', { replace: true })
          }, 2000)
        } else {
          setStatus('error')
          setMessage('Falha na confirmação do email.')
        }
      } catch (error) {
        console.error('Erro inesperado na confirmação:', error)
        setStatus('error')
        setMessage('Erro inesperado durante a confirmação.')
        toast({
          title: "Erro inesperado",
          description: "Erro durante a confirmação do email.",
          variant: "destructive"
        })
      }
    }

    handleEmailConfirmation()
  }, [location, navigate, toast])

  const handleReturnToLogin = () => {
    navigate('/auth', { replace: true })
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/30 flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4">
            {status === 'loading' && (
              <Loader2 className="h-12 w-12 text-primary animate-spin" />
            )}
            {status === 'success' && (
              <CheckCircle className="h-12 w-12 text-green-500" />
            )}
            {status === 'error' && (
              <XCircle className="h-12 w-12 text-destructive" />
            )}
          </div>
          <CardTitle>
            {status === 'loading' && 'Confirmando Email...'}
            {status === 'success' && 'Email Confirmado!'}
            {status === 'error' && 'Erro na Confirmação'}
          </CardTitle>
          <CardDescription>
            {message}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {status === 'error' && (
            <div className="space-y-4">
              <Button 
                onClick={handleReturnToLogin}
                className="w-full"
              >
                Voltar ao Login
              </Button>
            </div>
          )}
          {status === 'success' && (
            <div className="text-center text-sm text-muted-foreground">
              Você será redirecionado automaticamente em instantes...
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}