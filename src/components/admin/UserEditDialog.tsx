import React, { useState, useEffect } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { supabase } from '@/integrations/supabase/client'
import { UserProfile, UserRole } from '@/lib/supabase'
import { useToast } from '@/hooks/use-toast'
import { UserPermissionsTab } from './UserPermissionsTab'
import { Save, X, User, Lock } from 'lucide-react'

interface UserEditDialogProps {
  user: UserProfile | null
  open: boolean
  onOpenChange: (open: boolean) => void
  onUserUpdated: () => void
}

export const UserEditDialog: React.FC<UserEditDialogProps> = ({
  user,
  open,
  onOpenChange,
  onUserUpdated
}) => {
  const [formData, setFormData] = useState({
    full_name: '',
    email: '',
    role: 'visitante' as UserRole,
    department: ''
  })
  const [loading, setLoading] = useState(false)
  const { toast } = useToast()

  useEffect(() => {
    if (user) {
      setFormData({
        full_name: user.full_name,
        email: user.email,
        role: user.role,
        department: user.department || ''
      })
    }
  }, [user])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!user) return

    // Enhanced input validation
    if (!formData.full_name.trim()) {
      toast({
        title: 'Erro',
        description: 'Nome completo é obrigatório',
        variant: 'destructive',
      })
      return
    }

    if (formData.full_name.length > 255) {
      toast({
        title: 'Erro',
        description: 'Nome completo muito longo (máximo 255 caracteres)',
        variant: 'destructive',
      })
      return
    }

    if (formData.department && formData.department.length > 100) {
      toast({
        title: 'Erro',
        description: 'Nome do departamento muito longo (máximo 100 caracteres)',
        variant: 'destructive',
      })
      return
    }

    setLoading(true)
    try {
      const { error } = await supabase
        .from('user_profiles')
        .update({
          full_name: formData.full_name.trim(),
          role: formData.role,
          department: formData.department?.trim() || null
        })
        .eq('id', user.id)

      if (error) {
        // Handle specific RLS policy errors
        if (error.message.includes('Insufficient permissions')) {
          toast({
            title: 'Erro de Permissão',
            description: 'Você não tem permissão para alterar este campo. Apenas administradores podem alterar roles e informações críticas.',
            variant: 'destructive',
          })
          return
        }
        throw error
      }

      toast({
        title: 'Usuário atualizado',
        description: 'As informações do usuário foram atualizadas com sucesso',
      })

      onUserUpdated()
    } catch (error) {
      console.error('Erro ao atualizar usuário:', error)
      toast({
        title: 'Erro',
        description: 'Não foi possível atualizar o usuário. Verifique suas permissões.',
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }))
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[800px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            Gerenciar Usuário
            {user?.is_external && (
              <Badge variant="outline" className="text-blue-600">
                Externo
              </Badge>
            )}
          </DialogTitle>
        </DialogHeader>

        <Tabs defaultValue="profile" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="profile" className="flex items-center gap-2">
              <User className="w-4 h-4" />
              Dados do Perfil
            </TabsTrigger>
            <TabsTrigger value="permissions" className="flex items-center gap-2">
              <Lock className="w-4 h-4" />
              Permissões de Acesso
            </TabsTrigger>
          </TabsList>

          <TabsContent value="profile" className="space-y-4">
            <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="full_name">Nome Completo</Label>
            <Input
              id="full_name"
              value={formData.full_name}
              onChange={(e) => handleInputChange('full_name', e.target.value)}
              placeholder="Nome completo do usuário"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              value={formData.email}
              disabled
              className="bg-muted"
            />
            <p className="text-xs text-muted-foreground">
              O email não pode ser alterado
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="role">Role</Label>
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
          </div>

          <div className="space-y-2">
            <Label htmlFor="department">Departamento</Label>
            <Input
              id="department"
              value={formData.department}
              onChange={(e) => handleInputChange('department', e.target.value)}
              placeholder="Departamento do usuário"
            />
          </div>

          {user && (
            <div className="p-4 bg-muted rounded-lg space-y-2">
              <div className="text-sm">
                <strong>Criado em:</strong> {new Date(user.created_at).toLocaleDateString('pt-BR')}
              </div>
              {user.last_login && (
                <div className="text-sm">
                  <strong>Último login:</strong> {new Date(user.last_login).toLocaleString('pt-BR')}
                </div>
              )}
              {user.invited_by && (
                <div className="text-sm">
                  <strong>Convidado por:</strong> {user.invited_by}
                </div>
              )}
            </div>
          )}

          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              <X className="w-4 h-4 mr-2" />
              Cancelar
            </Button>
            <Button type="submit" disabled={loading}>
              <Save className="w-4 h-4 mr-2" />
              {loading ? 'Salvando...' : 'Salvar'}
            </Button>
          </div>
        </form>
      </TabsContent>

      <TabsContent value="permissions">
        <UserPermissionsTab user={user} />
      </TabsContent>
    </Tabs>
  </DialogContent>
</Dialog>
)
}