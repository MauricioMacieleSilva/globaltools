import { useState, useEffect } from 'react'
import { supabase } from '@/integrations/supabase/client'
import { useAuth } from '@/context/AuthContext'
import { hasPermission, UserRole } from '@/lib/supabase'

// Definição das páginas disponíveis no sistema
export const SYSTEM_PAGES = {
  // Páginas principais
  dashboard: { 
    label: 'Dashboard Comercial', 
    category: 'Principais',
    supportsEdit: true,
    route: '/dashboard-comercial'
  },
  crm: { 
    label: 'CRM', 
    category: 'Principais',
    supportsEdit: true,
    route: '/crm'
  },
  clientes: { 
    label: 'Clientes', 
    category: 'Principais',
    supportsEdit: true,
    route: '/clientes'
  },
  producao: { 
    label: 'Produção', 
    category: 'Principais',
    supportsEdit: true,
    route: '/producao'
  },
  estoque: { 
    label: 'Estoque', 
    category: 'Principais',
    supportsEdit: true,
    route: '/producao' // Estoque é uma aba dentro de Produção
  },
  politica: { 
    label: 'Política Comercial', 
    category: 'Principais',
    supportsEdit: true,
    route: '/politica-comercial'
  },
  corteperfil: { 
    label: 'Corte Perfil', 
    category: 'Principais',
    supportsEdit: true,
    route: '/corte-perfil'
  },
  corteblank: { 
    label: 'Corte Blank', 
    category: 'Principais',
    supportsEdit: true,
    route: '/corte-blank'
  },
  fretes: { 
    label: 'Fretes', 
    category: 'Principais',
    supportsEdit: true,
    route: '/fretes'
  },
  assistente: {
    label: 'Assistente Global', 
    category: 'Principais',
    supportsEdit: false,
    route: '/assistente-global'
  },
  centralprecos: { 
    label: 'Central de Preços', 
    category: 'Principais',
    supportsEdit: false,
    route: '/central-precos'
  },
  treinamentos: { 
    label: 'Treinamentos', 
    category: 'Principais',
    supportsEdit: false,
    route: '/treinamentos'
  },
  reunioes: { 
    label: 'Reuniões', 
    category: 'Principais',
    supportsEdit: false,
    route: '/reunioes'
  },
  
  // Páginas administrativas
  usuarios: { 
    label: 'Administração', 
    category: 'Administrativas',
    supportsEdit: true,
    route: '/admin/usuarios'
  },
  conhecimento: { 
    label: 'Gestão de Conhecimento', 
    category: 'Administrativas',
    supportsEdit: true,
    route: '/admin/conhecimento'
  },
  relatorios: { 
    label: 'Configuração de Relatórios', 
    category: 'Administrativas',
    supportsEdit: true,
    route: '/admin/relatorios'
  }
} as const

export type PageKey = keyof typeof SYSTEM_PAGES
export type AccessType = 'view' | 'edit'

// Interface ajustada para compatibilidade com retorno do Supabase
export interface UserPermission {
  id: string
  user_id: string
  page_key: string // String genérica do banco, será convertida para PageKey quando necessário
  access_type: AccessType
  is_active: boolean
  created_at: string
  updated_at: string
  created_by?: string
}

interface PermissionCheck {
  canView: boolean
  canEdit: boolean
}

export const useUserPermissions = () => {
  const { user, userProfile } = useAuth()
  const [userPermissions, setUserPermissions] = useState<UserPermission[]>([])
  const [loading, setLoading] = useState(true)
  const [isAdmin, setIsAdmin] = useState(false)

  // Buscar permissões do usuário atual
  const fetchUserPermissions = async () => {
    if (!user?.id) {
      setLoading(false)
      return
    }

    try {
      const { data, error } = await supabase
        .from('user_permissions')
        .select('*')
        .eq('user_id', user.id)
        .eq('is_active', true)

      if (error) throw error

      setUserPermissions(data || [])

      // Também checar papel em user_roles para reconhecer administradores
      const { data: roles, error: roleError } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', user.id)

      if (!roleError) {
        setIsAdmin(!!roles?.some((r: any) => r.role === 'admin'))
      }
    } catch (error) {
      console.error('Erro ao buscar permissões do usuário:', error)
    } finally {
      setLoading(false)
    }
  }

  // Buscar permissões de um usuário específico (para administradores)
  const fetchUserPermissionsById = async (userId: string): Promise<UserPermission[]> => {
    try {
      const { data, error } = await supabase
        .from('user_permissions')
        .select('*')
        .eq('user_id', userId)
        .eq('is_active', true)

      if (error) throw error
      return data || []
    } catch (error) {
      console.error('Erro ao buscar permissões do usuário:', error)
      return []
    }
  }

  // Salvar permissões de um usuário
  const saveUserPermissions = async (userId: string, permissions: { page_key: PageKey; access_type: AccessType }[]) => {
    try {
      // Primeiro, desativar todas as permissões existentes do usuário
      await supabase
        .from('user_permissions')
        .update({ is_active: false })
        .eq('user_id', userId)

      // Depois, inserir/ativar as novas permissões
      const permissionsData = permissions.map(perm => ({
        user_id: userId,
        page_key: perm.page_key as string, // Conversão para string para compatibilidade
        access_type: perm.access_type,
        is_active: true,
        created_by: user?.id
      }))

      if (permissionsData.length > 0) {
        const { error } = await supabase
          .from('user_permissions')
          .upsert(permissionsData, {
            onConflict: 'user_id,page_key,access_type'
          })

        if (error) throw error
      }

      // Atualizar permissões locais se for o usuário atual
      if (userId === user?.id) {
        fetchUserPermissions()
      }

      return true
    } catch (error) {
      console.error('Erro ao salvar permissões:', error)
      throw error
    }
  }

  // Verificar se o usuário tem acesso a uma página específica
  const checkPageAccess = (pageKey: PageKey): PermissionCheck => {
    // Administradores têm acesso total sempre (via tabela user_roles)
    if (isAdmin) {
      return { canView: true, canEdit: true }
    }

    // Verificar permissões granulares
    const viewPermission = userPermissions.find(
      p => p.page_key === pageKey && p.access_type === 'view' && p.is_active
    )
    const editPermission = userPermissions.find(
      p => p.page_key === pageKey && p.access_type === 'edit' && p.is_active
    )

    // Se tem permissão de edição, automaticamente tem de visualização
    const canEdit = !!editPermission
    const canView = canEdit || !!viewPermission

    return { canView, canEdit }
  }

  // Verificar se pode acessar uma rota específica
  const canAccessRoute = (route: string): PermissionCheck => {
    const pageEntry = Object.entries(SYSTEM_PAGES).find(
      ([_, pageInfo]) => pageInfo.route === route
    )

    if (!pageEntry) {
      // Se a rota não está mapeada, NEGAR acesso por padrão
      // Apenas admins têm acesso a rotas não mapeadas
      return { 
        canView: isAdmin,
        canEdit: isAdmin
      }
    }

    const [pageKey] = pageEntry
    return checkPageAccess(pageKey as PageKey)
  }

  // Obter páginas acessíveis para navegação
  const getAccessiblePages = (): Array<{ pageKey: PageKey; info: typeof SYSTEM_PAGES[PageKey]; permissions: PermissionCheck }> => {
    return Object.entries(SYSTEM_PAGES)
      .map(([key, info]) => ({
        pageKey: key as PageKey,
        info,
        permissions: checkPageAccess(key as PageKey)
      }))
      .filter(item => item.permissions.canView)
  }

  useEffect(() => {
    fetchUserPermissions()
  }, [user?.id])

  return {
    userPermissions,
    loading,
    isAdmin,
    checkPageAccess,
    canAccessRoute,
    getAccessiblePages,
    fetchUserPermissions,
    fetchUserPermissionsById,
    saveUserPermissions,
    SYSTEM_PAGES
  }
}