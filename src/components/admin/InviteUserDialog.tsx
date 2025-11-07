import React, { useState } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { supabase } from '@/integrations/supabase/client'
import { UserRole, isGlobalAcoEmail } from '@/lib/supabase'
import { useToast } from '@/hooks/use-toast'
import { useAuth } from '@/context/AuthContext'
import { Send, X, Mail } from 'lucide-react'

interface InviteUserDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onInviteSent: () => void
}

export const InviteUserDialog: React.FC<InviteUserDialogProps> = ({
  open,
  onOpenChange,
  onInviteSent
}) => {
  const [formData, setFormData] = useState({
    email: '',
    role: 'visitante' as UserRole,
    message: ''
  })
  const [loading, setLoading] = useState(false)
  const { toast } = useToast()
  const { userProfile } = useAuth()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!userProfile) {
      toast({
        title: 'Erro',
        description: 'Usuário não autenticado',
        variant: 'destructive',
      })
      return
    }

    // Enhanced email validation
    const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/
    if (!emailRegex.test(formData.email) || formData.email.length > 254) {
      toast({
        title: 'Erro',
        description: 'Email inválido. Verifique o formato do email.',
        variant: 'destructive',
      })
      return
    }

    setLoading(true)
    try {
      // Check rate limiting before proceeding
      const { data: rateLimitCheck, error: rateLimitError } = await supabase
        .rpc('check_invitation_rate_limit', { user_uuid: userProfile.id })

      if (rateLimitError) {
        console.error('Rate limit check error:', rateLimitError)
        toast({
          title: 'Erro',
          description: 'Erro ao verificar limite de convites',
          variant: 'destructive',
        })
        return
      }

      if (!rateLimitCheck) {
        toast({
          title: 'Limite excedido',
          description: 'Você atingiu o limite de 10 convites por hora. Tente novamente mais tarde.',
          variant: 'destructive',
        })
        return
      }

      // Verificar se o email já existe
      const { data: existingUser } = await supabase
        .from('user_profiles')
        .select('email')
        .eq('email', formData.email.toLowerCase())
        .maybeSingle()

      if (existingUser) {
        toast({
          title: 'Erro',
          description: 'Este email já está cadastrado no sistema',
          variant: 'destructive',
        })
        return
      }

      // Verificar se já existe um convite pendente
      const { data: existingInvite } = await supabase
        .from('user_invitations')
        .select('email')
        .eq('email', formData.email.toLowerCase())
        .is('used_at', null)
        .gt('expires_at', new Date().toISOString())
        .maybeSingle()

      if (existingInvite) {
        toast({
          title: 'Erro',
          description: 'Já existe um convite pendente para este email',
          variant: 'destructive',
        })
        return
      }

      // Determinar role baseado no domínio do email
      const isInternal = isGlobalAcoEmail(formData.email)
      let finalRole = formData.role
      
      // Se for email interno, não pode ser visitante
      if (isInternal && formData.role === 'visitante') {
        finalRole = 'operacional'
      }

      // Criar convite
      const { error } = await supabase
        .from('user_invitations')
        .insert({
          email: formData.email.toLowerCase(),
          role: finalRole,
          invited_by: userProfile.id
        })

      if (error) throw error

      // Enviar email de convite
      try {
        const { error: emailError } = await supabase.functions.invoke('send-invitation-email', {
          body: {
            email: formData.email.toLowerCase(),
            role: finalRole,
            inviterName: userProfile.full_name || userProfile.email,
            customMessage: formData.message || undefined
          }
        })

        if (emailError) {
          console.error('Erro ao enviar email:', emailError)
          toast({
            title: 'Convite criado',
            description: `Convite criado para ${formData.email}, mas houve erro no envio do email. Você pode reenviar depois.`,
            variant: 'destructive',
          })
        } else {
          toast({
            title: 'Convite enviado',
            description: `Convite enviado por email para ${formData.email} com role ${finalRole}`,
          })
        }
      } catch (emailError) {
        console.error('Erro ao enviar email:', emailError)
        toast({
          title: 'Convite criado',
          description: `Convite criado para ${formData.email}, mas houve erro no envio do email. Você pode reenviar depois.`,
          variant: 'destructive',
        })
      }

      // Reset form
      setFormData({
        email: '',
        role: 'visitante',
        message: ''
      })

      onInviteSent()
    } catch (error) {
      console.error('Erro ao enviar convite:', error)
      toast({
        title: 'Erro',
        description: 'Não foi possível enviar o convite',
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }))
  }

  const isInternalEmail = isGlobalAcoEmail(formData.email)

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Mail className="w-5 h-5" />
            Convidar Novo Usuário
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email">Email do Usuário</Label>
            <Input
              id="email"
              type="email"
              value={formData.email}
              onChange={(e) => handleInputChange('email', e.target.value)}
              placeholder="usuario@exemplo.com"
              required
            />
            {formData.email && (
              <p className="text-xs text-muted-foreground">
                {isInternalEmail ? (
                  <span className="text-green-600">
                    ✓ Email interno - usuário terá acesso completo
                  </span>
                ) : (
                  <span className="text-blue-600">
                    ℹ Email externo - usuário será marcado como visitante
                  </span>
                )}
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="role">Role Inicial</Label>
            <Select value={formData.role} onValueChange={(value) => handleInputChange('role', value)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="admin">Administrador</SelectItem>
                <SelectItem value="comercial">Comercial</SelectItem>
                <SelectItem value="operacional">Operacional</SelectItem>
                <SelectItem value="visitante">Visitante</SelectItem>
              </SelectContent>
            </Select>
            {isInternalEmail && formData.role === 'visitante' && (
              <p className="text-xs text-orange-600">
                ⚠️ Email interno será automaticamente promovido para "Operacional"
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="message">Mensagem Personalizada (Opcional)</Label>
            <Textarea
              id="message"
              value={formData.message}
              onChange={(e) => handleInputChange('message', e.target.value)}
              placeholder="Adicione uma mensagem personalizada para o convite..."
              rows={3}
            />
          </div>

          <div className="p-4 bg-muted rounded-lg">
            <h4 className="font-medium mb-2">Informações do Convite</h4>
            <ul className="text-sm text-muted-foreground space-y-1">
              <li>• O convite expira em 7 dias</li>
              <li>• O usuário receberá um email com instruções</li>
              <li>• Você pode acompanhar o status dos convites</li>
              <li>• O role pode ser alterado após o cadastro</li>
            </ul>
          </div>

          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              <X className="w-4 h-4 mr-2" />
              Cancelar
            </Button>
            <Button type="submit" disabled={loading}>
              <Send className="w-4 h-4 mr-2" />
              {loading ? 'Enviando...' : 'Enviar Convite'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}