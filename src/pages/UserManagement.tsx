import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Users, UserPlus, Filter, Search, RefreshCw, Settings, Shield, Target } from 'lucide-react'
import { supabase } from '@/integrations/supabase/client'
import { UserProfile, UserRole } from '@/lib/supabase'
import { useToast } from '@/hooks/use-toast'
import { UserTable } from '@/components/admin/UserTable'
import { UserEditDialog } from '@/components/admin/UserEditDialog'
import { InviteUserDialog } from '@/components/admin/InviteUserDialog'
import { UserStats } from '@/components/admin/UserStats'
import { SessionResetDialog } from '@/components/admin/SessionResetDialog'
import { LeadQualificationConfig } from '@/components/admin/LeadQualificationConfig'
import { LeadOrigemRamoConfig } from '@/components/admin/LeadOrigemRamoConfig'
import { DeleteUserDialog } from '@/components/admin/DeleteUserDialog'
import { DefaultPermissionsConfig } from '@/components/admin/DefaultPermissionsConfig'
import { GoalsManagement } from '@/components/admin/GoalsManagement'

export const UserManagement: React.FC = () => {
  const [users, setUsers] = useState<UserProfile[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [roleFilter, setRoleFilter] = useState<string>('all')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [selectedUser, setSelectedUser] = useState<UserProfile | null>(null)
  const [editDialogOpen, setEditDialogOpen] = useState(false)
  const [inviteDialogOpen, setInviteDialogOpen] = useState(false)
  const [sessionResetDialogOpen, setSessionResetDialogOpen] = useState(false)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const { toast } = useToast()

  useEffect(() => {
    loadUsers()
  }, [])

  const loadUsers = async () => {
    console.log('🔄 Iniciando carregamento de usuários...')
    setLoading(true)
    try {
      console.log('📡 Fazendo consulta ao Supabase...')
      // Buscar perfis de usuários
      const { data: profiles, error: profilesError } = await supabase
        .from('user_profiles')
        .select('id, email, full_name, department, is_external, invited_by, created_at, last_login, avatar_url')
        .order('created_at', { ascending: false })

      if (profilesError) {
        console.error('❌ Erro ao buscar perfis:', profilesError)
        throw profilesError
      }

      // Buscar roles dos usuários
      const { data: roles, error: rolesError } = await supabase
        .from('user_roles')
        .select('user_id, role')

      if (rolesError) {
        console.error('❌ Erro ao buscar roles:', rolesError)
        throw rolesError
      }

      // Combinar perfis com roles
      const rolesMap = new Map(roles?.map(r => [r.user_id, r.role]) || [])
      const userProfiles = (profiles || []).map(profile => ({
        ...profile,
        role: rolesMap.get(profile.id) || 'visitante'
      })) as UserProfile[]

      console.log('👥 Usuários carregados:', userProfiles.map(u => ({ 
        name: u.full_name, 
        email: u.email, 
        role: u.role,
        avatar_url: u.avatar_url,
        is_external: u.is_external 
      })))
      
      setUsers(userProfiles)
      console.log('✅ Estado atualizado com', userProfiles.length, 'usuários')
    } catch (error) {
      console.error('❌ Erro ao carregar usuários:', error)
      toast({
        title: 'Erro',
        description: 'Não foi possível carregar os usuários. Verifique o console para mais detalhes.',
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
      console.log('🏁 Carregamento finalizado')
    }
  }

  const handleEditUser = (user: UserProfile) => {
    setSelectedUser(user)
    setEditDialogOpen(true)
  }

  const handleDeleteUser = (user: UserProfile) => {
    setSelectedUser(user)
    setDeleteDialogOpen(true)
  }

  const handleUserDeleted = () => {
    loadUsers()
    setDeleteDialogOpen(false)
    setSelectedUser(null)
  }

  const handleUserUpdated = () => {
    loadUsers()
    setEditDialogOpen(false)
    setSelectedUser(null)
  }

  const handleSessionReset = async () => {
    try {
      const { data, error } = await supabase.auth.getSession()
      if (error) throw error
      
      if (data.session?.user) {
        console.log('🔄 Forçando atualização de last_login para usuário atual:', data.session.user.id)
        const { error: updateError } = await supabase
          .from('user_profiles')
          .update({ 
            last_login: new Date().toISOString(),
            updated_at: new Date().toISOString()
          })
          .eq('id', data.session.user.id)
        
        if (updateError) {
          console.error('❌ Erro ao forçar atualização:', updateError)
          toast({
            title: 'Erro',
            description: 'Erro ao atualizar último acesso',
            variant: 'destructive',
          })
        } else {
          console.log('✅ Last_login forçado com sucesso')
          toast({
            title: 'Sessões atualizadas',
            description: 'Último acesso atualizado para usuários conectados',
          })
          loadUsers() // Recarregar a lista
        }
      }
    } catch (error) {
      console.error('❌ Erro ao resetar sessão:', error)
      toast({
        title: 'Erro',
        description: 'Erro ao resetar sessões',
        variant: 'destructive',
      })
    }
  }

  const handleInviteSent = () => {
    setInviteDialogOpen(false)
    toast({
      title: 'Convite enviado',
      description: 'O convite foi enviado com sucesso',
    })
  }

  const filteredUsers = users.filter(user => {
    const matchesSearch = 
      user.full_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (user.department?.toLowerCase() || '').includes(searchTerm.toLowerCase())
    
    const matchesRole = roleFilter === 'all' || user.role === roleFilter
    
    // Um usuário é considerado ativo se fez login nas últimas 24 horas
    const isUserActive = user.last_login && 
      new Date(user.last_login).getTime() > Date.now() - (24 * 60 * 60 * 1000)
    
    const matchesStatus = statusFilter === 'all' || 
      (statusFilter === 'active' && isUserActive) ||
      (statusFilter === 'inactive' && !isUserActive) ||
      (statusFilter === 'internal' && !user.is_external) ||
      (statusFilter === 'external' && user.is_external)
    
    return matchesSearch && matchesRole && matchesStatus
  })

  return (
    <div className="min-h-screen w-full bg-background">
      <div className="container mx-auto p-2 space-y-2">
        
        {/* Stats */}
        <UserStats users={users} />

        <Tabs defaultValue="users" className="w-full">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="users" className="flex items-center gap-2">
              <Users className="h-4 w-4" />
              Usuários
            </TabsTrigger>
            <TabsTrigger value="goals" className="flex items-center gap-2">
              <Target className="h-4 w-4" />
              Metas
            </TabsTrigger>
            <TabsTrigger value="default-permissions" className="flex items-center gap-2">
              <Shield className="h-4 w-4" />
              Permissões Padrão
            </TabsTrigger>
            <TabsTrigger value="lead-config" className="flex items-center gap-2">
              <Settings className="h-4 w-4" />
              Config. de Leads
            </TabsTrigger>
          </TabsList>

          <TabsContent value="users" className="mt-4">
            {/* Filters and Table */}
            <Card>
              <CardHeader className="pb-3">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <CardTitle>Usuários</CardTitle>
                    <Badge variant="secondary">{filteredUsers.length}</Badge>
                  </div>
                  <div className="flex gap-2">
                    <Button 
                      onClick={handleSessionReset}
                      size="sm" 
                      variant="outline"
                    >
                      <RefreshCw className="mr-2 h-4 w-4" />
                      Atualizar Acessos
                    </Button>
                    <Button onClick={() => setInviteDialogOpen(true)} size="sm">
                      <UserPlus className="mr-2 h-4 w-4" />
                      Convidar Usuário
                    </Button>
                  </div>
                </div>
                
                <div className="flex flex-col lg:flex-row gap-2">
                  <div className="flex-1">
                    <Input
                      placeholder="Buscar por nome ou email..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="max-w-sm"
                    />
                  </div>
                  <div className="flex gap-2">
                    <Select value={roleFilter} onValueChange={setRoleFilter}>
                      <SelectTrigger className="w-[140px]">
                        <SelectValue placeholder="Role" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Todos os roles</SelectItem>
                        <SelectItem value="admin">Admin</SelectItem>
                        <SelectItem value="comercial">Comercial</SelectItem>
                        <SelectItem value="operacional">Operacional</SelectItem>
                        <SelectItem value="visitante">Visitante</SelectItem>
                      </SelectContent>
                    </Select>

                    <Select value={statusFilter} onValueChange={setStatusFilter}>
                      <SelectTrigger className="w-[120px]">
                        <SelectValue placeholder="Status" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Todos</SelectItem>
                        <SelectItem value="active">Ativos</SelectItem>
                        <SelectItem value="inactive">Inativos</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="p-0">
                <UserTable 
                  users={filteredUsers} 
                  loading={loading} 
                  onEditUser={handleEditUser}
                  onDeleteUser={handleDeleteUser}
                />
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="goals" className="mt-4">
            <GoalsManagement />
          </TabsContent>

          <TabsContent value="default-permissions" className="mt-4">
            <DefaultPermissionsConfig />
          </TabsContent>

          <TabsContent value="lead-config" className="mt-4">
            <div className="space-y-6">
              <LeadQualificationConfig />
              <LeadOrigemRamoConfig />
            </div>
          </TabsContent>
        </Tabs>

        {/* Dialogs */}
        <UserEditDialog
          user={selectedUser}
          open={editDialogOpen}
          onOpenChange={setEditDialogOpen}
          onUserUpdated={handleUserUpdated}
        />

        <InviteUserDialog
          open={inviteDialogOpen}
          onOpenChange={setInviteDialogOpen}
          onInviteSent={handleInviteSent}
        />

        <DeleteUserDialog
          user={selectedUser}
          open={deleteDialogOpen}
          onOpenChange={setDeleteDialogOpen}
          onUserDeleted={handleUserDeleted}
        />

        <SessionResetDialog
          isOpen={sessionResetDialogOpen}
          onClose={() => setSessionResetDialogOpen(false)}
        />
      </div>
    </div>
  )
}