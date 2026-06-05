import React from 'react'
import { Navigate } from 'react-router-dom'
import { useAuth } from '@/context/AuthContext'
import { UserRole, hasPermission } from '@/lib/supabase'
import { useUserPermissions } from '@/hooks/useUserPermissions'
import { supabase } from '@/integrations/supabase/client'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Loader2, Shield, AlertTriangle } from 'lucide-react'
import { ForceResetPasswordForm } from './ForceResetPasswordForm'

interface ProtectedRouteProps {
  children: React.ReactNode
  requireRole?: UserRole
  requirePageAccess?: string // Nova prop para verificar acesso granular por rota
  requireEdit?: boolean // Nova prop para exigir permissão de edição
}

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ 
  children, 
  requireRole = 'visitante',
  requirePageAccess,
  requireEdit = false
}) => {
  const { user, userProfile, loading } = useAuth()
  const { canAccessRoute, loading: permissionsLoading } = useUserPermissions()

  // Mostrar loading enquanto verifica autenticação
  if (loading || permissionsLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/30 flex items-center justify-center p-4">
        <Card className="w-full max-w-md mx-auto shadow-xl border-border/50">
          <CardContent className="flex flex-col items-center justify-center py-16">
            <Loader2 className="h-8 w-8 animate-spin text-primary mb-4" />
            <p className="text-sm text-muted-foreground">Verificando autenticação...</p>
          </CardContent>
        </Card>
      </div>
    )
  }

  // Se não está logado, redirecionar para login
  if (!user) {
    return <Navigate to="/auth" replace />
  }

  // Se não tem perfil carregado ainda, mostrar loading
  if (!userProfile) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/30 flex items-center justify-center p-4">
        <Card className="w-full max-w-md mx-auto shadow-xl border-border/50">
          <CardContent className="flex flex-col items-center justify-center py-16">
            <Loader2 className="h-8 w-8 animate-spin text-primary mb-4" />
            <p className="text-sm text-muted-foreground">Carregando perfil...</p>
          </CardContent>
        </Card>
      </div>
    )
  }

  // Interceptar redefinição obrigatória de senha
  if (userProfile.needs_password_reset) {
    return <ForceResetPasswordForm />
  }

  // Bloquear visitantes não autorizados (emails externos sem convite)
  const isExternalVisitante = userProfile.role === 'visitante' && userProfile.is_external
  if (isExternalVisitante) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/30 flex items-center justify-center p-4">
        <Card className="w-full max-w-md mx-auto shadow-xl border-border/50">
          <CardHeader className="text-center space-y-4">
            <div className="flex justify-center">
              <div className="w-16 h-16 rounded-full bg-amber-500/10 flex items-center justify-center">
                <AlertTriangle className="w-8 h-8 text-amber-500" />
              </div>
            </div>
            <CardTitle className="text-xl font-bold text-foreground">
              Conta Pendente de Autorização
            </CardTitle>
            <CardDescription className="text-muted-foreground">
              Sua conta foi criada, mas ainda não foi autorizada pelo administrador. Entre em contato com o administrador para liberar seu acesso.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="bg-muted/50 rounded-lg p-4 space-y-2">
              <div className="flex items-center gap-2 text-sm">
                <Shield className="w-4 h-4 text-muted-foreground" />
                <span className="font-medium">Email:</span>
                <span>{userProfile.email}</span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <AlertTriangle className="w-4 h-4 text-amber-500" />
                <span className="font-medium">Status:</span>
                <span className="text-amber-600">Aguardando autorização</span>
              </div>
            </div>
            <Button 
              onClick={async () => {
                await supabase.auth.signOut()
                window.location.href = '/auth'
              }} 
              variant="outline" 
              className="w-full"
            >
              Sair
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  // Verificar se tem permissão para acessar
  if (requirePageAccess) {
    // Usar verificação granular por rota
    const { canView, canEdit } = canAccessRoute(requirePageAccess)
    
    if (!canView) {
      return renderAccessDenied('Você não tem permissão para acessar esta página.')
    }
    
    if (requireEdit && !canEdit) {
      return renderAccessDenied('Você não tem permissão para editar nesta página.')
    }
  } else if (!hasPermission((userProfile?.role ?? 'visitante') as UserRole, requireRole)) {
    // Usar verificação antiga por role como fallback
    return renderAccessDenied('Você não tem permissão para acessar esta funcionalidade.')
  }

  // Se passou por todas as verificações, renderizar o conteúdo
  return <>{children}</>

  // Função auxiliar para renderizar erro de acesso
  function renderAccessDenied(message: string) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/30 flex items-center justify-center p-4">
        <Card className="w-full max-w-md mx-auto shadow-xl border-border/50">
          <CardHeader className="text-center space-y-4">
            <div className="flex justify-center">
              <div className="w-16 h-16 rounded-full bg-destructive/10 flex items-center justify-center">
                <Shield className="w-8 h-8 text-destructive" />
              </div>
            </div>
            <CardTitle className="text-xl font-bold text-foreground">
              Acesso Negado
            </CardTitle>
            <CardDescription className="text-muted-foreground">
              {message}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="bg-muted/50 rounded-lg p-4 space-y-2">
              <div className="flex items-center gap-2 text-sm">
                <AlertTriangle className="w-4 h-4 text-amber-500" />
                <span className="font-medium">Seu nível de acesso:</span>
                <span className="capitalize">{userProfile.role}</span>
              </div>
              {(!requirePageAccess && requireRole && requireRole !== 'visitante') && (
                <div className="flex items-center gap-2 text-sm">
                  <Shield className="w-4 h-4 text-primary" />
                  <span className="font-medium">Nível necessário:</span>
                  <span className="capitalize">{requireRole}</span>
                </div>
              )}
            </div>
            <p className="text-sm text-muted-foreground text-center">
              Entre em contato com o administrador para solicitar acesso.
            </p>
            <Button 
              onClick={() => window.history.back()} 
              variant="outline" 
              className="w-full"
            >
              Voltar
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }
}