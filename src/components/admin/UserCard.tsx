import React from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Edit, Trash2, User, Building2, Globe, Calendar } from 'lucide-react'
import { UserProfile } from '@/lib/supabase'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'

interface UserCardProps {
  user: UserProfile
  onEdit: (user: UserProfile) => void
  onDelete: (user: UserProfile) => void
}

const getRoleBadgeVariant = (role: string) => {
  switch (role) {
    case 'admin': return 'destructive'
    case 'comercial': return 'default'
    case 'operacional': return 'secondary'
    case 'visitante': return 'outline'
    default: return 'outline'
  }
}

const getRoleLabel = (role: string) => {
  switch (role) {
    case 'admin': return 'Admin'
    case 'comercial': return 'Comercial'
    case 'operacional': return 'Operacional'
    case 'visitante': return 'Visitante'
    default: return role
  }
}

export const UserCard: React.FC<UserCardProps> = ({ user, onEdit, onDelete }) => {
  return (
    <Card className="w-full">
      <CardContent className="p-4">
        <div className="flex items-start space-x-3">
          <Avatar className="h-10 w-10 flex-shrink-0">
            <AvatarImage src={user.avatar_url} alt={user.full_name} />
            <AvatarFallback>
              {user.full_name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()}
            </AvatarFallback>
          </Avatar>
          
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between">
              <div className="flex-1 min-w-0">
                <h3 className="font-semibold text-sm truncate">{user.full_name}</h3>
                <p className="text-xs text-muted-foreground truncate">{user.email}</p>
              </div>
              <div className="flex gap-1 flex-shrink-0">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => onEdit(user)}
                  className="h-8 w-8 p-0"
                >
                  <Edit className="h-3 w-3" />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => onDelete(user)}
                  className="h-8 w-8 p-0 text-destructive hover:text-destructive hover:bg-destructive/10"
                >
                  <Trash2 className="h-3 w-3" />
                </Button>
              </div>
            </div>
            
            <div className="mt-2 space-y-1">
              <Badge variant={getRoleBadgeVariant(user.role)} className="text-xs">
                {getRoleLabel(user.role)}
              </Badge>
              
              {user.department && (
                <div className="flex items-center text-xs text-muted-foreground">
                  <Building2 className="h-3 w-3 mr-1" />
                  <span className="truncate">{user.department}</span>
                </div>
              )}
              
              <div className="flex items-center justify-between text-xs">
                <div className="flex items-center text-muted-foreground">
                  <Globe className="h-3 w-3 mr-1" />
                  <span>{user.is_external ? 'Externo' : 'Interno'}</span>
                </div>
                
                {(() => {
                  // Um usuário é considerado ativo se fez login nas últimas 24 horas
                  const isActive = user.last_login && 
                    new Date(user.last_login).getTime() > Date.now() - (24 * 60 * 60 * 1000)
                  
                  return isActive ? (
                    <Badge variant="outline" className="text-xs text-green-600">
                      Ativo
                    </Badge>
                  ) : (
                    <Badge variant="outline" className="text-xs text-orange-600">
                      Inativo
                    </Badge>
                  )
                })()}
              </div>
              
              <div className="flex items-center text-xs text-muted-foreground mt-1">
                <Calendar className="h-3 w-3 mr-1" />
                <span>
                  {user.last_login ? (
                    <>Último acesso: {format(new Date(user.last_login), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}</>
                  ) : (
                    'Nunca acessou'
                  )}
                </span>
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}