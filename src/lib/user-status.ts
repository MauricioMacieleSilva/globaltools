import { UserRole } from '@/lib/supabase'

// Regra única de status de acesso, usada na lista, nos cartões e nos totais.
// "Ativo" = abriu o sistema nos últimos 7 dias.
export const ACTIVE_WINDOW_DAYS = 7

export type UserAccessStatus = 'active' | 'inactive' | 'never'

export function getUserAccessStatus(lastLogin?: string | null): UserAccessStatus {
  if (!lastLogin) return 'never'
  const last = new Date(lastLogin).getTime()
  if (Number.isNaN(last)) return 'never'
  return last > Date.now() - ACTIVE_WINDOW_DAYS * 24 * 60 * 60 * 1000 ? 'active' : 'inactive'
}

export const ACCESS_STATUS_LABEL: Record<UserAccessStatus, string> = {
  active: 'Ativo',
  inactive: 'Inativo',
  never: 'Nunca acessou',
}

export const ACCESS_STATUS_CLASS: Record<UserAccessStatus, string> = {
  active: 'border-green-200 bg-green-100 text-green-800',
  inactive: 'border-orange-200 bg-orange-50 text-orange-700',
  never: 'border-border bg-muted text-muted-foreground',
}

export const ROLE_LABELS: Record<UserRole, string> = {
  admin: 'Administrador',
  comercial: 'Comercial',
  financeiro: 'Financeiro',
  operacional: 'Operacional',
  sdr: 'SDR',
  visitante: 'Visitante',
}

export function getRoleLabel(role: string): string {
  return ROLE_LABELS[role as UserRole] || role
}

export function getRoleBadgeVariant(role: string): 'default' | 'secondary' | 'destructive' | 'outline' {
  switch (role) {
    case 'admin':
      return 'destructive'
    case 'comercial':
    case 'sdr':
      return 'default'
    case 'operacional':
    case 'financeiro':
      return 'secondary'
    default:
      return 'outline'
  }
}
