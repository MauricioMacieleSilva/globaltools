import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Switch } from '@/components/ui/switch'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Loader2, Save, AlertTriangle, Shield } from 'lucide-react'
import { supabase } from '@/integrations/supabase/client'
import { useToast } from '@/hooks/use-toast'
import { SYSTEM_PAGES, PageKey } from '@/hooks/useUserPermissions'

type UserRole = 'visitante' | 'operacional' | 'sdr' | 'comercial'

interface PermissionState {
  [pageKey: string]: {
    view: boolean
    edit: boolean
  }
}

interface RolePermissions {
  [role: string]: PermissionState
}

const CONFIGURABLE_ROLES: { value: UserRole; label: string; description: string }[] = [
  { value: 'visitante', label: 'Visitante', description: 'Acesso básico de visualização' },
  { value: 'operacional', label: 'Operacional', description: 'Acesso às áreas de produção' },
  { value: 'sdr', label: 'SDR', description: 'Acesso ao pipeline e pré-vendas' },
  { value: 'comercial', label: 'Comercial', description: 'Acesso completo às áreas comerciais' },
]

// Agrupar páginas por categoria
const groupPagesByCategory = () => {
  const groups: Record<string, { key: PageKey; label: string; supportsEdit: boolean }[]> = {}
  
  Object.entries(SYSTEM_PAGES).forEach(([key, info]) => {
    // Excluir páginas administrativas da configuração padrão
    if (info.category === 'Administrativas') return
    
    if (!groups[info.category]) {
      groups[info.category] = []
    }
    groups[info.category].push({
      key: key as PageKey,
      label: info.label,
      supportsEdit: info.supportsEdit
    })
  })
  
  return groups
}

export const DefaultPermissionsConfig: React.FC = () => {
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [permissions, setPermissions] = useState<RolePermissions>({})
  const [activeRole, setActiveRole] = useState<UserRole>('visitante')
  const { toast } = useToast()

  const pageGroups = groupPagesByCategory()

  useEffect(() => {
    loadDefaultPermissions()
  }, [])

  const loadDefaultPermissions = async () => {
    setLoading(true)
    try {
      const { data, error } = await supabase
        .from('default_role_permissions')
        .select('*')
        .eq('is_active', true)

      if (error) throw error

      // Organizar dados por role
      const permsByRole: RolePermissions = {}
      
      // Inicializar com todas as páginas desativadas para cada role
      CONFIGURABLE_ROLES.forEach(role => {
        permsByRole[role.value] = {}
        Object.keys(SYSTEM_PAGES).forEach(pageKey => {
          const pageInfo = SYSTEM_PAGES[pageKey as PageKey]
          if (pageInfo.category !== 'Administrativas') {
            permsByRole[role.value][pageKey] = { view: false, edit: false }
          }
        })
      })

      // Preencher com dados do banco
      data?.forEach((perm: any) => {
        if (permsByRole[perm.role] && permsByRole[perm.role][perm.page_key]) {
          if (perm.access_type === 'view') {
            permsByRole[perm.role][perm.page_key].view = true
          } else if (perm.access_type === 'edit') {
            permsByRole[perm.role][perm.page_key].edit = true
          }
        }
      })

      setPermissions(permsByRole)
    } catch (error) {
      console.error('Erro ao carregar permissões padrão:', error)
      toast({
        title: 'Erro',
        description: 'Não foi possível carregar as permissões padrão',
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }

  const handlePermissionChange = (pageKey: string, type: 'view' | 'edit', checked: boolean) => {
    setPermissions(prev => {
      const updated = { ...prev }
      if (!updated[activeRole]) {
        updated[activeRole] = {}
      }
      if (!updated[activeRole][pageKey]) {
        updated[activeRole][pageKey] = { view: false, edit: false }
      }

      if (type === 'edit' && checked) {
        // Se ativar edição, ativar visualização automaticamente
        updated[activeRole][pageKey] = { view: true, edit: true }
      } else if (type === 'view' && !checked) {
        // Se desativar visualização, desativar edição também
        updated[activeRole][pageKey] = { view: false, edit: false }
      } else {
        updated[activeRole][pageKey][type] = checked
      }

      return updated
    })
  }

  const handleSave = async () => {
    setSaving(true)
    try {
      // Desativar todas as permissões existentes do role ativo
      await supabase
        .from('default_role_permissions')
        .update({ is_active: false })
        .eq('role', activeRole)

      // Preparar novas permissões
      const newPermissions: any[] = []
      const rolePerms = permissions[activeRole] || {}

      Object.entries(rolePerms).forEach(([pageKey, perms]) => {
        if (perms.view) {
          newPermissions.push({
            role: activeRole,
            page_key: pageKey,
            access_type: 'view',
            is_active: true
          })
        }
        if (perms.edit) {
          newPermissions.push({
            role: activeRole,
            page_key: pageKey,
            access_type: 'edit',
            is_active: true
          })
        }
      })

      // Inserir novas permissões (upsert para evitar duplicatas)
      if (newPermissions.length > 0) {
        const { error } = await supabase
          .from('default_role_permissions')
          .upsert(newPermissions, {
            onConflict: 'role,page_key,access_type'
          })

        if (error) throw error
      }

      toast({
        title: 'Salvo com sucesso',
        description: `Permissões padrão para ${CONFIGURABLE_ROLES.find(r => r.value === activeRole)?.label} atualizadas`,
      })
    } catch (error) {
      console.error('Erro ao salvar permissões:', error)
      toast({
        title: 'Erro',
        description: 'Não foi possível salvar as permissões',
        variant: 'destructive',
      })
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    )
  }

  const currentRolePerms = permissions[activeRole] || {}

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <Shield className="h-5 w-5 text-primary" />
          <CardTitle>Permissões Padrão para Novos Usuários</CardTitle>
        </div>
        <CardDescription>
          Configure quais permissões novos usuários receberão automaticamente ao se cadastrar com cada perfil.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <Tabs value={activeRole} onValueChange={(v) => setActiveRole(v as UserRole)}>
          <TabsList className="grid w-full grid-cols-4">
            {CONFIGURABLE_ROLES.map(role => (
              <TabsTrigger key={role.value} value={role.value} className="text-xs sm:text-sm">
                {role.label}
              </TabsTrigger>
            ))}
          </TabsList>

          {CONFIGURABLE_ROLES.map(role => (
            <TabsContent key={role.value} value={role.value} className="space-y-4 mt-4">
              <div className="flex items-center gap-2 mb-4">
                <Badge variant="outline" className="text-sm">
                  {role.label}
                </Badge>
                <span className="text-sm text-muted-foreground">{role.description}</span>
              </div>

              {Object.entries(pageGroups).map(([category, pages]) => (
                <div key={category} className="space-y-3">
                  <h4 className="text-sm font-medium text-muted-foreground">{category}</h4>
                  <div className="rounded-lg border">
                    <table className="w-full">
                      <thead>
                        <tr className="border-b bg-muted/50">
                          <th className="text-left p-3 font-medium text-sm">Página</th>
                          <th className="text-center p-3 font-medium text-sm w-24">Visualizar</th>
                          <th className="text-center p-3 font-medium text-sm w-24">Editar</th>
                        </tr>
                      </thead>
                      <tbody>
                        {pages.map(page => {
                          const perms = currentRolePerms[page.key] || { view: false, edit: false }
                          return (
                            <tr key={page.key} className="border-b last:border-b-0">
                              <td className="p-3 text-sm">{page.label}</td>
                              <td className="p-3 text-center">
                                <Switch
                                  checked={perms.view}
                                  onCheckedChange={(checked) => handlePermissionChange(page.key, 'view', checked)}
                                />
                              </td>
                              <td className="p-3 text-center">
                                {page.supportsEdit ? (
                                  <Switch
                                    checked={perms.edit}
                                    onCheckedChange={(checked) => handlePermissionChange(page.key, 'edit', checked)}
                                    disabled={!perms.view}
                                  />
                                ) : (
                                  <span className="text-xs text-muted-foreground">N/A</span>
                                )}
                              </td>
                            </tr>
                          )
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              ))}
            </TabsContent>
          ))}
        </Tabs>

        <Alert>
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            Alterações afetam apenas <strong>novos usuários</strong>. Usuários existentes mantêm suas permissões atuais.
          </AlertDescription>
        </Alert>

        <div className="flex justify-end">
          <Button onClick={handleSave} disabled={saving}>
            {saving ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Salvando...
              </>
            ) : (
              <>
                <Save className="mr-2 h-4 w-4" />
                Salvar Alterações
              </>
            )}
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
