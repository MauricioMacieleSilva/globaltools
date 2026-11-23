import React, { useState, useEffect, useMemo } from 'react'
import { Button } from '@/components/ui/button'
import { Switch } from '@/components/ui/switch'
import { Badge } from '@/components/ui/badge'
import { toast } from 'sonner'
import { useUserPermissions, SYSTEM_PAGES, PageKey } from '@/hooks/useUserPermissions'
import { UserProfile } from '@/lib/supabase'
import { fetchRolePages, PagePermissionMap } from '@/lib/admin-users'
import { getRoleLabel } from '@/lib/user-status'
import { Loader2, RotateCcw, Save, ShieldCheck } from 'lucide-react'

interface UserPermissionsTabProps {
  user: UserProfile | null
}

const emptyMap = (): PagePermissionMap => {
  const map: PagePermissionMap = {}
  Object.keys(SYSTEM_PAGES).forEach(key => {
    map[key] = { view: false, edit: false }
  })
  return map
}

// Telas administrativas são exclusivas do perfil Administrador (as rotas exigem
// esse perfil), então não fazem sentido como liberação individual.
const USER_PAGES = Object.entries(SYSTEM_PAGES)
  .filter(([, info]) => info.category !== 'Administrativas')
  .map(([key, info]) => ({ key, info }))

// O acesso de um usuário é: telas do perfil + liberações extras individuais.
// Esta aba mostra as duas coisas juntas e só deixa editar as extras.
export const UserPermissionsTab: React.FC<UserPermissionsTabProps> = ({ user }) => {
  const [rolePages, setRolePages] = useState<PagePermissionMap>(emptyMap)
  const [extras, setExtras] = useState<PagePermissionMap>(emptyMap)
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const { saveUserPermissions, fetchUserPermissionsById } = useUserPermissions()

  const isAdmin = user?.role === 'admin'

  useEffect(() => {
    if (!user?.id || isAdmin) return

    let cancelled = false
    const load = async () => {
      setLoading(true)
      try {
        const [fromRole, individual] = await Promise.all([
          fetchRolePages(user.role),
          fetchUserPermissionsById(user.id),
        ])
        if (cancelled) return

        const roleMap = { ...emptyMap(), ...fromRole }
        const extraMap = emptyMap()
        individual.forEach(perm => {
          if (extraMap[perm.page_key]) extraMap[perm.page_key][perm.access_type] = true
        })

        setRolePages(roleMap)
        setExtras(extraMap)
      } catch (error) {
        console.error('Erro ao carregar telas liberadas:', error)
        toast.error('Não foi possível carregar as telas liberadas deste usuário')
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    load()

    return () => { cancelled = true }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id, user?.role, isAdmin])

  // Só conta como "extra" o que o perfil ainda não libera
  const extraCount = useMemo(
    () => USER_PAGES.reduce((total, { key }) => {
      const role = rolePages[key] || { view: false, edit: false }
      const extra = extras[key] || { view: false, edit: false }
      return total + (extra.view && !role.view ? 1 : 0) + (extra.edit && !role.edit ? 1 : 0)
    }, 0),
    [rolePages, extras],
  )

  const roleCount = useMemo(
    () => USER_PAGES.filter(({ key }) => rolePages[key]?.view).length,
    [rolePages],
  )

  const toggleExtra = (pageKey: string, type: 'view' | 'edit', value: boolean) => {
    setExtras(prev => {
      const current = prev[pageKey] || { view: false, edit: false }
      const next = { ...current }

      if (type === 'edit') {
        next.edit = value
        if (value) next.view = true // editar implica visualizar
      } else {
        next.view = value
        // sem visualizar (nem pelo perfil), não há como editar
        if (!value && !rolePages[pageKey]?.view) next.edit = false
      }

      return { ...prev, [pageKey]: next }
    })
  }

  const persist = async (map: PagePermissionMap, successMessage: string) => {
    if (!user?.id) return

    setSaving(true)
    try {
      // Grava apenas o que vai além do perfil: o resto já vem do perfil.
      const toSave: { page_key: PageKey; access_type: 'view' | 'edit' }[] = []
      USER_PAGES.forEach(({ key }) => {
        const role = rolePages[key] || { view: false, edit: false }
        const extra = map[key] || { view: false, edit: false }
        if (extra.view && !role.view) toSave.push({ page_key: key as PageKey, access_type: 'view' })
        if (extra.edit && !role.edit) toSave.push({ page_key: key as PageKey, access_type: 'edit' })
      })

      await saveUserPermissions(user.id, toSave)
      setExtras(map)
      toast.success(successMessage)
    } catch (error) {
      console.error('Erro ao salvar telas liberadas:', error)
      toast.error('Não foi possível salvar. Tente novamente.')
    } finally {
      setSaving(false)
    }
  }

  if (!user) return null

  if (isAdmin) {
    return (
      <div className="flex items-start gap-3 rounded-lg border border-green-200 bg-green-50 p-4">
        <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-green-700" />
        <div className="text-sm">
          <p className="font-medium text-green-900">Administrador: acesso total</p>
          <p className="text-green-800">
            Este perfil enxerga e edita todas as telas, incluindo a Administração. Não há o que liberar individualmente.
          </p>
        </div>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="rounded-lg border bg-muted/40 p-4 text-sm">
        <p className="font-medium text-foreground">
          {user.full_name} segue o perfil {getRoleLabel(user.role)}
        </p>
        <p className="text-muted-foreground">
          {roleCount} {roleCount === 1 ? 'tela vem' : 'telas vêm'} do perfil
          {extraCount > 0
            ? ` e há ${extraCount} ${extraCount === 1 ? 'liberação extra' : 'liberações extras'} só para este usuário.`
            : ', sem liberações extras.'}
          {' '}Para mudar o que o perfil inteiro enxerga, use a aba "Telas por Perfil" da Administração.
        </p>
      </div>

      <div className="overflow-hidden rounded-lg border">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b bg-muted/50 text-left">
              <th className="p-3 font-medium">Tela</th>
              <th className="w-28 p-3 text-center font-medium">Visualizar</th>
              <th className="w-28 p-3 text-center font-medium">Editar</th>
            </tr>
          </thead>
          <tbody>
            {USER_PAGES.map(({ key, info }) => {
              const role = rolePages[key] || { view: false, edit: false }
              const extra = extras[key] || { view: false, edit: false }
              const canView = role.view || extra.view
              const hasExtra = (extra.view && !role.view) || (extra.edit && !role.edit)

              return (
                <tr key={key} className="border-b last:border-b-0">
                  <td className="p-3">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-medium">{info.label}</span>
                      {role.view && (
                        <Badge variant="secondary" className="text-[11px] font-normal">Pelo perfil</Badge>
                      )}
                      {hasExtra && (
                        <Badge variant="outline" className="border-amber-300 bg-amber-50 text-[11px] font-normal text-amber-800">
                          Extra
                        </Badge>
                      )}
                    </div>
                  </td>
                  <td className="p-3 text-center">
                    <Switch
                      aria-label={`Visualizar ${info.label}`}
                      checked={canView}
                      disabled={saving || role.view}
                      onCheckedChange={(checked) => toggleExtra(key, 'view', checked)}
                    />
                  </td>
                  <td className="p-3 text-center">
                    {info.supportsEdit ? (
                      <Switch
                        aria-label={`Editar ${info.label}`}
                        checked={role.edit || extra.edit}
                        disabled={saving || role.edit || !canView}
                        onCheckedChange={(checked) => toggleExtra(key, 'edit', checked)}
                      />
                    ) : (
                      <span className="text-xs text-muted-foreground">—</span>
                    )}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      <p className="text-xs text-muted-foreground">
        Chaves travadas vêm do perfil. As demais são liberações extras só para este usuário.
      </p>

      <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-between">
        <Button
          type="button"
          variant="outline"
          disabled={saving || extraCount === 0}
          onClick={() => persist(emptyMap(), 'Liberações extras removidas. O usuário segue só o perfil.')}
        >
          <RotateCcw className="mr-2 h-4 w-4" />
          Seguir só o perfil
        </Button>
        <Button type="button" disabled={saving} onClick={() => persist(extras, 'Telas liberadas atualizadas')}>
          {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
          Salvar
        </Button>
      </div>
    </div>
  )
}
