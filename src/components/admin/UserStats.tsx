import React from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Users, UserCheck, UserX, Building } from 'lucide-react'
import { UserProfile } from '@/lib/supabase'
import { ACTIVE_WINDOW_DAYS, getUserAccessStatus } from '@/lib/user-status'

interface UserStatsProps {
  users: UserProfile[]
}

export const UserStats: React.FC<UserStatsProps> = ({ users }) => {
  const totalUsers = users.length
  const activeUsers = users.filter(u => getUserAccessStatus(u.last_login) === 'active').length
  const inactiveUsers = totalUsers - activeUsers
  const internalUsers = users.filter(u => !u.is_external).length
  const externalUsers = users.filter(u => u.is_external).length

  const roleStats = {
    admin: users.filter(u => u.role === 'admin').length,
    comercial: users.filter(u => u.role === 'comercial').length,
    operacional: users.filter(u => u.role === 'operacional').length,
    visitante: users.filter(u => u.role === 'visitante').length,
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-2">
      <Card>
        <CardContent className="flex items-center p-4">
          <Users className="h-6 w-6 text-primary" />
          <div className="ml-3">
            <p className="text-xs font-medium text-muted-foreground">Total</p>
            <p className="text-xl font-bold">{totalUsers}</p>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="flex items-center p-4">
          <UserCheck className="h-6 w-6 text-green-600" />
          <div className="ml-3">
            <p className="text-xs font-medium text-muted-foreground">Ativos (últimos {ACTIVE_WINDOW_DAYS} dias)</p>
            <p className="text-xl font-bold">{activeUsers}</p>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="flex items-center p-4">
          <UserX className="h-6 w-6 text-orange-600" />
          <div className="ml-3">
            <p className="text-xs font-medium text-muted-foreground">Sem acesso recente</p>
            <p className="text-xl font-bold">{inactiveUsers}</p>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="flex items-center p-4">
          <Building className="h-6 w-6 text-destructive" />
          <div className="ml-3">
            <p className="text-xs font-medium text-muted-foreground">Admins</p>
            <p className="text-xl font-bold">{roleStats.admin}</p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}