import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { useToast } from '@/hooks/use-toast'
import { useUserPermissions, SYSTEM_PAGES, PageKey, UserPermission } from '@/hooks/useUserPermissions'
import { UserProfile } from '@/lib/supabase'
import { Save, Eye, Edit, Lock } from 'lucide-react'

interface UserPermissionsTabProps {
  user: UserProfile | null
}

interface PermissionState {
  [key: string]: {
    view: boolean
    edit: boolean
  }
}

export const UserPermissionsTab: React.FC<UserPermissionsTabProps> = ({ user }) => {
  const [permissions, setPermissions] = useState<PermissionState>({})
  const [loading, setLoading] = useState(false)
  const { saveUserPermissions, fetchUserPermissionsById } = useUserPermissions()
  const { toast } = useToast()

  // Carregar permissões do usuário quando selecionado
  useEffect(() => {
    if (user?.id) {
      loadUserPermissions()
    }
  }, [user?.id])

  const loadUserPermissions = async () => {
    if (!user?.id) return

    setLoading(true)
    try {
      const userPermissions = await fetchUserPermissionsById(user.id)
      
      // Converter para o formato do estado
      const permissionState: PermissionState = {}
      
      // Inicializar todas as páginas como false
      Object.keys(SYSTEM_PAGES).forEach(pageKey => {
        permissionState[pageKey] = { view: false, edit: false }
      })

      // Aplicar permissões existentes
      userPermissions.forEach(perm => {
        if (permissionState[perm.page_key]) {
          permissionState[perm.page_key][perm.access_type] = true
        }
      })

      setPermissions(permissionState)
    } catch (error) {
      console.error('Erro ao carregar permissões:', error)
      toast({
        title: 'Erro',
        description: 'Não foi possível carregar as permissões do usuário',
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }

  const handlePermissionChange = (pageKey: string, type: 'view' | 'edit', value: boolean) => {
    setPermissions(prev => {
      const updated = { ...prev }
      if (!updated[pageKey]) {
        updated[pageKey] = { view: false, edit: false }
      }

      // Lógica especial: se marcar 'edit', automaticamente marca 'view'
      if (type === 'edit' && value) {
        updated[pageKey].view = true
        updated[pageKey].edit = true
      } 
      // Se desmarcar 'view', automaticamente desmarca 'edit'
      else if (type === 'view' && !value) {
        updated[pageKey].view = false
        updated[pageKey].edit = false
      } 
      else {
        updated[pageKey][type] = value
      }

      return updated
    })
  }

  const handleSave = async () => {
    if (!user?.id) return

    setLoading(true)
    try {
      // Converter estado para formato da API
      const permissionsToSave: { page_key: PageKey; access_type: 'view' | 'edit' }[] = []

      Object.entries(permissions).forEach(([pageKey, perms]) => {
        if (perms.view) {
          permissionsToSave.push({ page_key: pageKey as PageKey, access_type: 'view' })
        }
        if (perms.edit) {
          permissionsToSave.push({ page_key: pageKey as PageKey, access_type: 'edit' })
        }
      })

      await saveUserPermissions(user.id, permissionsToSave)

      toast({
        title: 'Permissões salvas',
        description: 'As permissões do usuário foram atualizadas com sucesso',
      })
    } catch (error) {
      console.error('Erro ao salvar permissões:', error)
      toast({
        title: 'Erro',
        description: 'Não foi possível salvar as permissões',
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }

  if (!user) {
    return (
      <Card>
        <CardContent className="p-8 text-center text-muted-foreground">
          Selecione um usuário para gerenciar suas permissões
        </CardContent>
      </Card>
    )
  }

  // Agrupar páginas por categoria
  const pagesByCategory = Object.entries(SYSTEM_PAGES).reduce((acc, [key, info]) => {
    if (!acc[info.category]) {
      acc[info.category] = []
    }
    acc[info.category].push({ key, info })
    return acc
  }, {} as Record<string, { key: string; info: typeof SYSTEM_PAGES[PageKey] }[]>)

  const isAdmin = user.role === 'admin'

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Lock className="w-5 h-5" />
              Permissões de Acesso - {user.full_name}
            </div>
            {isAdmin && (
              <Badge variant="secondary" className="bg-green-100 text-green-800">
                Administrador - Acesso Total
              </Badge>
            )}
          </CardTitle>
        </CardHeader>
        
        <CardContent className="space-y-6">
          {isAdmin ? (
            <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
              <p className="text-green-800 font-medium">
                Este usuário possui role de administrador e tem acesso total a todas as funcionalidades.
              </p>
            </div>
          ) : (
            <>
              {Object.entries(pagesByCategory).map(([category, pages]) => (
                <div key={category} className="space-y-4">
                  <div className="flex items-center gap-2">
                    <h3 className="text-lg font-semibold">{category}</h3>
                    <Separator className="flex-1" />
                  </div>
                  
                  <div className="grid gap-4">
                    {pages.map(({ key, info }) => (
                      <div key={key} className="flex items-center justify-between p-4 border rounded-lg">
                        <div className="space-y-1">
                          <Label className="text-base font-medium">{info.label}</Label>
                          <p className="text-sm text-muted-foreground">{info.route}</p>
                        </div>
                        
                        <div className="flex items-center gap-6">
                          {/* Permissão de Visualização */}
                          <div className="flex items-center gap-2">
                            <Eye className="w-4 h-4 text-blue-500" />
                            <Label htmlFor={`${key}-view`} className="text-sm">
                              Visualizar
                            </Label>
                            <Switch
                              id={`${key}-view`}
                              checked={permissions[key]?.view || false}
                              onCheckedChange={(checked) => handlePermissionChange(key, 'view', checked)}
                              disabled={loading}
                            />
                          </div>
                          
                          {/* Permissão de Edição */}
                          {info.supportsEdit && (
                            <div className="flex items-center gap-2">
                              <Edit className="w-4 h-4 text-orange-500" />
                              <Label htmlFor={`${key}-edit`} className="text-sm">
                                Editar
                              </Label>
                              <Switch
                                id={`${key}-edit`}
                                checked={permissions[key]?.edit || false}
                                onCheckedChange={(checked) => handlePermissionChange(key, 'edit', checked)}
                                disabled={loading || !permissions[key]?.view}
                              />
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}

              <div className="flex justify-end pt-4">
                <Button onClick={handleSave} disabled={loading}>
                  <Save className="w-4 h-4 mr-2" />
                  {loading ? 'Salvando...' : 'Salvar Permissões'}
                </Button>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  )
}