export type UserRole = 'admin' | 'comercial' | 'operacional' | 'visitante' | 'sdr'

export interface UserProfile {
  id: string
  email: string
  full_name: string
  role: UserRole
  department?: string
  is_external: boolean
  invited_by?: string
  created_at: string
  last_login?: string
  avatar_url?: string
}

// Função para verificar se o email é do domínio Global Aço
export const isGlobalAcoEmail = (email: string): boolean => {
  return email.toLowerCase().endsWith('@globalaco.com.br')
}

// Função para verificar se o usuário tem permissão para acessar determinada funcionalidade
export const hasPermission = (userRole: UserRole, requiredRole: UserRole): boolean => {
  const roleHierarchy: Record<UserRole, number> = {
    admin: 4,
    comercial: 3,
    operacional: 2,
    sdr: 2,
    visitante: 1
  }
  
  return roleHierarchy[userRole] >= roleHierarchy[requiredRole]
}