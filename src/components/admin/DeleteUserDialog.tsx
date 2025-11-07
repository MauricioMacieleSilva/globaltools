import React, { useState } from 'react'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { UserProfile } from '@/lib/supabase'
import { supabase } from '@/integrations/supabase/client'
import { useToast } from '@/hooks/use-toast'
import { AlertTriangle } from 'lucide-react'

interface DeleteUserDialogProps {
  user: UserProfile | null
  open: boolean
  onOpenChange: (open: boolean) => void
  onUserDeleted: () => void
}

export const DeleteUserDialog: React.FC<DeleteUserDialogProps> = ({
  user,
  open,
  onOpenChange,
  onUserDeleted,
}) => {
  const [loading, setLoading] = useState(false)
  const { toast } = useToast()

  const handleDelete = async () => {
    if (!user) return

    setLoading(true)
    try {
      const { data: { session } } = await supabase.auth.getSession()
      
      if (!session) {
        throw new Error('Não autenticado')
      }

      const response = await fetch(
        `https://kqltnuyfwobzkdmxqrqm.supabase.co/functions/v1/delete-user`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${session.access_token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ userId: user.id }),
        }
      )

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || 'Erro ao remover usuário')
      }

      toast({
        title: 'Usuário removido',
        description: `${user.full_name} foi removido do sistema com sucesso.`,
      })

      onUserDeleted()
      onOpenChange(false)
    } catch (error) {
      console.error('Erro ao remover usuário:', error)
      toast({
        title: 'Erro',
        description: error instanceof Error ? error.message : 'Não foi possível remover o usuário',
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-destructive" />
            Remover Usuário
          </AlertDialogTitle>
          <AlertDialogDescription className="space-y-2">
            <p>
              Tem certeza que deseja remover <strong>{user?.full_name}</strong> ({user?.email}) do sistema?
            </p>
            <p className="text-destructive font-medium">
              Esta ação não pode ser desfeita. Todas as associações com leads e atividades serão removidas.
            </p>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={loading}>Cancelar</AlertDialogCancel>
          <AlertDialogAction
            onClick={handleDelete}
            disabled={loading}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
          >
            {loading ? 'Removendo...' : 'Remover Usuário'}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}