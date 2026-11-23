import React, { useEffect, useState } from 'react'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { AlertTriangle, Loader2, UserPlus } from 'lucide-react'
import { UserRole } from '@/lib/supabase'
import { AccessCredentials, ExistingUserInfo, PagePermissionMap, fetchRolePages, manageUser } from '@/lib/admin-users'
import { SYSTEM_PAGES } from '@/hooks/useUserPermissions'
import { getRoleLabel } from '@/lib/user-status'
import { UserAccessCard } from './UserAccessCard'

interface CreateUserDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onUserSaved: () => void
}

const emptyForm = {
  email: '',
  fullName: '',
  role: 'comercial' as UserRole,
  department: '',
}

export const CreateUserDialog: React.FC<CreateUserDialogProps> = ({ open, onOpenChange, onUserSaved }) => {
  const [form, setForm] = useState(emptyForm)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [existingUser, setExistingUser] = useState<ExistingUserInfo | null>(null)
  const [credentials, setCredentials] = useState<AccessCredentials | null>(null)
  const [rolePages, setRolePages] = useState<PagePermissionMap | null>(null)

  // Mostra, antes de criar, quais telas o perfil escolhido libera
  useEffect(() => {
    if (!open) return
    let cancelled = false
    setRolePages(null)
    fetchRolePages(form.role)
      .then(map => { if (!cancelled) setRolePages(map) })
      .catch(() => { if (!cancelled) setRolePages({}) })
    return () => { cancelled = true }
  }, [open, form.role])

  const roleScreens = Object.entries(SYSTEM_PAGES)
    .filter(([key, info]) => info.category !== 'Administrativas' && rolePages?.[key]?.view)
    .map(([key, info]) => ({ key, label: info.label, edit: !!rolePages?.[key]?.edit }))

  // Sempre abre limpo: a senha provisória não pode ficar na tela de uma vez para outra.
  useEffect(() => {
    if (open) {
      setForm(emptyForm)
      setError(null)
      setExistingUser(null)
      setCredentials(null)
      setLoading(false)
    }
  }, [open])

  const setField = (field: keyof typeof emptyForm, value: string) => {
    setForm(prev => ({ ...prev, [field]: value }))
    setError(null)
    if (field === 'email') setExistingUser(null)
  }

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault()
    if (loading) return

    setLoading(true)
    setError(null)
    setExistingUser(null)

    const result = await manageUser({
      action: 'create',
      email: form.email.trim().toLowerCase(),
      fullName: form.fullName.trim(),
      role: form.role,
      department: form.department.trim() || undefined,
    })

    setLoading(false)

    if (result.ok === true) {
      setCredentials(result.credentials)
      onUserSaved()
      return
    }

    if (result.code === 'email_exists' && result.existingUser) {
      setExistingUser(result.existingUser)
      return
    }

    setError(result.error)
  }

  // E-mail genérico que mudou de dono: reaproveita o usuário existente.
  const handleReassign = async () => {
    if (!existingUser || loading) return

    setLoading(true)
    setError(null)

    const result = await manageUser({
      action: 'reassign',
      userId: existingUser.id,
      fullName: form.fullName.trim(),
    })

    setLoading(false)

    if (result.ok === true) {
      setCredentials(result.credentials)
      setExistingUser(null)
      onUserSaved()
      return
    }

    setError(result.error)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[520px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <UserPlus className="h-5 w-5" />
            {credentials ? 'Usuário liberado' : 'Novo usuário'}
          </DialogTitle>
          {!credentials && (
            <DialogDescription>
              O usuário é criado na hora, sem depender de e-mail. Você recebe uma senha provisória para enviar.
            </DialogDescription>
          )}
        </DialogHeader>

        {credentials ? (
          <div className="space-y-4">
            <UserAccessCard credentials={credentials} />
            <div className="flex justify-end">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Fechar
              </Button>
            </div>
          </div>
        ) : (
          <form onSubmit={handleCreate} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="new-user-name">Nome de quem vai usar</Label>
              <Input
                id="new-user-name"
                value={form.fullName}
                onChange={(e) => setField('fullName', e.target.value)}
                placeholder="Ex.: Ana Paula"
                maxLength={255}
                required
                autoFocus
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="new-user-email">E-mail de acesso</Label>
              <Input
                id="new-user-email"
                type="email"
                value={form.email}
                onChange={(e) => setField('email', e.target.value)}
                placeholder="comercial3@globalaco.com.br"
                required
              />
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="new-user-role">Perfil de acesso</Label>
                <Select value={form.role} onValueChange={(value) => setField('role', value)}>
                  <SelectTrigger id="new-user-role">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="comercial">Comercial</SelectItem>
                    <SelectItem value="sdr">SDR</SelectItem>
                    <SelectItem value="financeiro">Financeiro</SelectItem>
                    <SelectItem value="operacional">Operacional</SelectItem>
                    <SelectItem value="admin">Administrador</SelectItem>
                    <SelectItem value="visitante">Visitante</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="new-user-department">Departamento (opcional)</Label>
                <Input
                  id="new-user-department"
                  value={form.department}
                  onChange={(e) => setField('department', e.target.value)}
                  placeholder="Ex.: Comercial"
                  maxLength={100}
                />
              </div>
            </div>

            <div className="rounded-lg border bg-muted/40 p-3">
              <p className="text-sm font-medium text-foreground">
                Telas liberadas pelo perfil {getRoleLabel(form.role)}
              </p>
              {form.role === 'admin' ? (
                <p className="mt-1 text-sm text-muted-foreground">
                  Acesso total, incluindo a Administração.
                </p>
              ) : rolePages === null ? (
                <p className="mt-1 text-sm text-muted-foreground">Carregando...</p>
              ) : roleScreens.length === 0 ? (
                <p className="mt-1 text-sm text-amber-700">
                  Este perfil ainda não tem telas configuradas. Ajuste em "Telas por Perfil" antes de criar o usuário.
                </p>
              ) : (
                <>
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {roleScreens.map(screen => (
                      <span
                        key={screen.key}
                        className="rounded-md border bg-background px-2 py-0.5 text-xs text-foreground"
                      >
                        {screen.label}
                        <span className="text-muted-foreground">{screen.edit ? ' · edita' : ' · só vê'}</span>
                      </span>
                    ))}
                  </div>
                  <p className="mt-2 text-xs text-muted-foreground">
                    O usuário já nasce com essas telas. Para mudar o perfil inteiro, use "Telas por Perfil".
                  </p>
                </>
              )}
            </div>

            {existingUser && (
              <div className="space-y-3 rounded-lg border border-amber-500/40 bg-amber-500/10 p-3">
                <div className="flex items-start gap-2 text-sm">
                  <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" />
                  <div>
                    <p className="font-medium text-foreground">
                      Este e-mail já está em uso por {existingUser.full_name}.
                    </p>
                    <p className="text-muted-foreground">
                      Você pode passar este acesso para {form.fullName.trim() || 'a nova pessoa'}. O nome é trocado,
                      uma senha nova é gerada e quem usava antes perde o acesso. Carteira, leads e histórico
                      continuam ligados a este usuário.
                    </p>
                  </div>
                </div>
                <Button type="button" className="w-full" onClick={handleReassign} disabled={loading}>
                  {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Passar acesso para {form.fullName.trim() || 'a nova pessoa'}
                </Button>
              </div>
            )}

            {error && (
              <p className="rounded-md border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive">
                {error}
              </p>
            )}

            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>
                Cancelar
              </Button>
              {!existingUser && (
                <Button type="submit" disabled={loading}>
                  {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Criar usuário
                </Button>
              )}
            </div>
          </form>
        )}
      </DialogContent>
    </Dialog>
  )
}
