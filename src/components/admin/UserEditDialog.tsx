import React, { useState, useEffect, useRef } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { supabase } from '@/integrations/supabase/client'
import { UserProfile, UserRole } from '@/lib/supabase'
import { useToast } from '@/hooks/use-toast'
import { UserPermissionsTab } from './UserPermissionsTab'
import { UserAccessCard } from './UserAccessCard'
import { AccessCredentials, manageUser } from '@/lib/admin-users'
import { Save, X, User, Lock, Camera, Loader2, KeyRound } from 'lucide-react'

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
    department: '',
    avatar_url: ''
  })
  const [loading, setLoading] = useState(false)
  const [uploadingAvatar, setUploadingAvatar] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const { toast } = useToast()

  // Aba "Acesso": gerar senha provisória / passar o usuário para outra pessoa
  const [accessName, setAccessName] = useState('')
  const [accessLoading, setAccessLoading] = useState(false)
  const [accessConfirming, setAccessConfirming] = useState(false)
  const [accessError, setAccessError] = useState<string | null>(null)
  const [accessCredentials, setAccessCredentials] = useState<AccessCredentials | null>(null)

  // A senha provisória nunca pode ficar na tela de um usuário para outro.
  useEffect(() => {
    setAccessName(user?.full_name || '')
    setAccessLoading(false)
    setAccessConfirming(false)
    setAccessError(null)
    setAccessCredentials(null)
  }, [user?.id, user?.full_name, open])

  const handleGenerateAccess = async () => {
    if (!user || accessLoading) return

    setAccessLoading(true)
    setAccessError(null)

    const result = await manageUser({
      action: 'reassign',
      userId: user.id,
      fullName: accessName.trim(),
    })

    setAccessLoading(false)
    setAccessConfirming(false)

    if (result.ok === true) {
      setAccessCredentials(result.credentials)
      setFormData(prev => ({ ...prev, full_name: result.credentials.fullName }))
      return
    }

    setAccessError(result.error)
  }

  // Fechar o diálogo depois de gerar um acesso recarrega a lista (o nome pode ter mudado).
  const handleDialogOpenChange = (nextOpen: boolean) => {
    if (!nextOpen && accessCredentials) {
      onUserUpdated()
      return
    }
    onOpenChange(nextOpen)
  }

  useEffect(() => {
    if (user) {
      setFormData({
        full_name: user.full_name,
        email: user.email,
        role: user.role,
        department: user.department || '',
        avatar_url: user.avatar_url || ''
      })
    }
  }, [user])

  const handleAvatarUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file || !user) return

    // Validar tipo de arquivo
    if (!file.type.startsWith('image/')) {
      toast({
        title: 'Erro',
        description: 'Por favor, selecione uma imagem válida',
        variant: 'destructive',
      })
      return
    }

    // Validar tamanho (máximo 2MB)
    if (file.size > 2 * 1024 * 1024) {
      toast({
        title: 'Erro',
        description: 'A imagem deve ter no máximo 2MB',
        variant: 'destructive',
      })
      return
    }

    setUploadingAvatar(true)
    try {
      const fileExt = file.name.split('.').pop()
      const fileName = `${user.id}/avatar.${fileExt}`

      // Upload para o storage
      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(fileName, file, { upsert: true })

      if (uploadError) throw uploadError

      // Obter URL pública
      const { data: { publicUrl } } = supabase.storage
        .from('avatars')
        .getPublicUrl(fileName)

      // Adicionar timestamp para forçar refresh do cache
      const avatarUrlWithTimestamp = `${publicUrl}?t=${Date.now()}`

      // Atualizar perfil do usuário
      const { error: updateError } = await supabase
        .from('user_profiles')
        .update({ avatar_url: avatarUrlWithTimestamp })
        .eq('id', user.id)

      if (updateError) throw updateError

      setFormData(prev => ({ ...prev, avatar_url: avatarUrlWithTimestamp }))
      
      toast({
        title: 'Foto atualizada',
        description: 'A foto do usuário foi atualizada com sucesso',
      })

      onUserUpdated()
    } catch (error) {
      console.error('Erro ao fazer upload da foto:', error)
      toast({
        title: 'Erro',
        description: 'Não foi possível fazer upload da foto',
        variant: 'destructive',
      })
    } finally {
      setUploadingAvatar(false)
    }
  }

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(part => part[0])
      .join('')
      .toUpperCase()
      .slice(0, 2)
  }

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
      const roleChanged = formData.role !== user.role

      // Atualizar dados básicos do perfil (sem role, que fica em user_roles)
      const { error: profileError } = await supabase
        .from('user_profiles')
        .update({
          full_name: formData.full_name.trim(),
          department: formData.department?.trim() || null
        })
        .eq('id', user.id)

      if (profileError) {
        throw profileError
      }

      // Se a role mudou, atualizar tabela de roles e permissões padrão
      if (roleChanged) {
        // Delete old role first, then insert new one
        // (upsert doesn't work because the unique key includes role)
        const { error: deleteRoleError } = await supabase
          .from('user_roles')
          .delete()
          .eq('user_id', user.id)

        if (deleteRoleError) {
          throw deleteRoleError
        }

        const { error: roleError } = await supabase
          .from('user_roles')
          .insert({ user_id: user.id, role: formData.role })

        if (roleError) {
          throw roleError
        }

        // Regerar permissões padrão para o novo papel
        const { error: permsError } = await supabase.rpc('create_default_permissions_for_user', {
          _user_id: user.id,
          _role: formData.role,
        })

        if (permsError) {
          console.error('Erro ao atualizar permissões padrão:', permsError)
        }
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
    <Dialog open={open} onOpenChange={handleDialogOpenChange}>
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
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="profile" className="flex items-center gap-2">
              <User className="w-4 h-4" />
              Dados do Perfil
            </TabsTrigger>
            <TabsTrigger value="permissions" className="flex items-center gap-2">
              <Lock className="w-4 h-4" />
              Telas Liberadas
            </TabsTrigger>
            <TabsTrigger value="access" className="flex items-center gap-2">
              <KeyRound className="w-4 h-4" />
              Senha e Acesso
            </TabsTrigger>
          </TabsList>

          <TabsContent value="profile" className="space-y-4">
            <form onSubmit={handleSubmit} className="space-y-4">
          {/* Avatar Upload */}
          <div className="flex items-center gap-4">
            <div className="relative">
              <Avatar className="h-20 w-20">
                <AvatarImage src={formData.avatar_url} alt={formData.full_name} />
                <AvatarFallback className="text-lg bg-primary text-primary-foreground">
                  {getInitials(formData.full_name || 'U')}
                </AvatarFallback>
              </Avatar>
              <Button
                type="button"
                variant="secondary"
                size="icon"
                className="absolute -bottom-1 -right-1 h-7 w-7 rounded-full"
                onClick={() => fileInputRef.current?.click()}
                disabled={uploadingAvatar}
              >
                {uploadingAvatar ? (
                  <Loader2 className="h-3 w-3 animate-spin" />
                ) : (
                  <Camera className="h-3 w-3" />
                )}
              </Button>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleAvatarUpload}
              />
            </div>
            <div className="flex-1">
              <Label>Foto do Usuário</Label>
              <p className="text-xs text-muted-foreground">
                Clique no ícone da câmera para alterar a foto. Máximo 2MB.
              </p>
            </div>
          </div>

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
            <Label htmlFor="role">Perfil de acesso</Label>
            <Select value={formData.role} onValueChange={(value) => handleInputChange('role', value)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="admin">Administrador</SelectItem>
                <SelectItem value="comercial">Comercial</SelectItem>
                <SelectItem value="financeiro">Financeiro</SelectItem>
                <SelectItem value="operacional">Operacional</SelectItem>
                <SelectItem value="sdr">SDR</SelectItem>
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

      <TabsContent value="access" className="space-y-4">
        {accessCredentials ? (
          <UserAccessCard credentials={accessCredentials} />
        ) : (
          <>
            <div className="space-y-1">
              <h3 className="text-sm font-semibold">Gerar novo acesso</h3>
              <p className="text-sm text-muted-foreground">
                Use quando a pessoa esqueceu a senha ou quando este e-mail passou para outra pessoa.
                Uma senha provisória é gerada, quem estava logado com este usuário é desconectado e
                no primeiro acesso a pessoa cria a própria senha.
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="access_email">E-mail de acesso</Label>
              <Input id="access_email" value={formData.email} disabled className="bg-muted" />
            </div>

            <div className="space-y-2">
              <Label htmlFor="access_name">Nome de quem vai usar</Label>
              <Input
                id="access_name"
                value={accessName}
                onChange={(e) => {
                  setAccessName(e.target.value)
                  setAccessConfirming(false)
                  setAccessError(null)
                }}
                placeholder="Nome de quem vai usar este acesso"
                maxLength={255}
              />
              <p className="text-xs text-muted-foreground">
                Se o e-mail mudou de dono, troque o nome aqui. Carteira, leads e histórico continuam ligados a este usuário.
              </p>
            </div>

            {accessError && (
              <p className="rounded-md border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive">
                {accessError}
              </p>
            )}

            {accessConfirming ? (
              <div className="space-y-3 rounded-lg border border-amber-500/40 bg-amber-500/10 p-3">
                <p className="text-sm text-foreground">
                  A senha atual de <strong>{formData.email}</strong> deixa de funcionar agora. Confirma?
                </p>
                <div className="flex justify-end gap-2">
                  <Button type="button" variant="outline" onClick={() => setAccessConfirming(false)} disabled={accessLoading}>
                    Voltar
                  </Button>
                  <Button type="button" onClick={handleGenerateAccess} disabled={accessLoading}>
                    {accessLoading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                    Confirmar e gerar
                  </Button>
                </div>
              </div>
            ) : (
              <div className="flex justify-end">
                <Button type="button" onClick={() => setAccessConfirming(true)} disabled={!accessName.trim()}>
                  <KeyRound className="w-4 h-4 mr-2" />
                  Gerar senha provisória
                </Button>
              </div>
            )}
          </>
        )}
      </TabsContent>
    </Tabs>
  </DialogContent>
</Dialog>
)
}