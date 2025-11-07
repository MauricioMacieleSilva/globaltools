import React from 'react'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Edit, Trash2, Calendar } from 'lucide-react'
import { UserProfile } from '@/lib/supabase'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { useIsMobile } from '@/hooks/use-mobile'
import { UserCard } from './UserCard'

interface UserTableProps {
  users: UserProfile[]
  loading: boolean
  onEditUser: (user: UserProfile) => void
  onDeleteUser: (user: UserProfile) => void
}

const getRoleBadgeVariant = (role: string) => {
  switch (role) {
    case 'admin':
      return 'destructive'
    case 'comercial':
      return 'default'
    case 'operacional':
      return 'secondary'
    case 'visitante':
      return 'outline'
    default:
      return 'outline'
  }
}

const getRoleLabel = (role: string) => {
  switch (role) {
    case 'admin':
      return 'Administrador'
    case 'comercial':
      return 'Comercial'
    case 'operacional':
      return 'Operacional'
    case 'visitante':
      return 'Visitante'
    default:
      return role
  }
}

export const UserTable: React.FC<UserTableProps> = ({ users, loading, onEditUser, onDeleteUser }) => {
  const isMobile = useIsMobile()
  if (loading) {
    return (
      <div className="flex justify-center items-center h-48">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    )
  }

  if (users.length === 0) {
    return (
      <div className="text-center py-8">
        <p className="text-muted-foreground">Nenhum usuário encontrado</p>
      </div>
    )
  }

  if (isMobile) {
    return (
      <div className="space-y-3">
        {users.map((user) => (
          <UserCard key={user.id} user={user} onEdit={onEditUser} onDelete={onDeleteUser} />
        ))}
      </div>
    )
  }

  return (
    <div className="rounded-md border">
      <ScrollArea className="h-[500px] w-full">
        <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Usuário</TableHead>
            <TableHead className="hidden sm:table-cell">Email</TableHead>
            <TableHead>Role</TableHead>
            <TableHead className="hidden lg:table-cell">Último Acesso</TableHead>
            <TableHead className="hidden md:table-cell">Status</TableHead>
            <TableHead className="text-right">Ações</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {users.map((user) => (
            <TableRow key={user.id}>
              <TableCell>
                <div className="flex items-center gap-3">
                  <Avatar className="h-8 w-8">
                    <AvatarFallback className="text-xs">
                      {user.full_name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div className="min-w-0 flex-1">
                    <div className="font-medium truncate">{user.full_name}</div>
                    <div className="text-sm text-muted-foreground sm:hidden truncate">
                      {user.email}
                    </div>
                  </div>
                </div>
              </TableCell>
              <TableCell className="hidden sm:table-cell">
                <div className="truncate max-w-[200px]">
                  {user.email}
                </div>
              </TableCell>
              <TableCell>
                <Badge variant={getRoleBadgeVariant(user.role)} className="text-xs">
                  {getRoleLabel(user.role)}
                </Badge>
              </TableCell>
              <TableCell className="hidden lg:table-cell">
                <div className="text-sm">
                  {user.last_login ? (
                    <div className="flex items-center gap-1 text-muted-foreground">
                      <Calendar className="h-3 w-3" />
                      <span>
                        {format(new Date(user.last_login), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                      </span>
                    </div>
                  ) : (
                    <span className="text-muted-foreground text-xs">Nunca acessou</span>
                  )}
                </div>
              </TableCell>
              <TableCell className="hidden md:table-cell">
                {(() => {
                  // Um usuário é considerado ativo se fez login nas últimas 24 horas
                  const isActive = user.last_login && 
                    new Date(user.last_login).getTime() > Date.now() - (24 * 60 * 60 * 1000)
                  
                  return isActive ? (
                    <Badge variant="default" className="bg-green-100 text-green-800 text-xs">
                      Ativo
                    </Badge>
                  ) : (
                    <Badge variant="outline" className="text-orange-600 text-xs">
                      Inativo
                    </Badge>
                  )
                })()}
              </TableCell>
              <TableCell className="text-right">
                <div className="flex gap-2 justify-end">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => onEditUser(user)}
                    className="h-8 px-3"
                  >
                    <Edit className="h-3 w-3" />
                    <span className="ml-1 hidden sm:inline">Editar</span>
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => onDeleteUser(user)}
                    className="h-8 px-3 text-destructive hover:bg-destructive hover:text-destructive-foreground"
                  >
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
      </ScrollArea>
    </div>
  )
}