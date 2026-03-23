import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { ShieldAlert } from 'lucide-react';

interface OwnershipWarningDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  ownerName: string;
  ownerAvatarUrl?: string | null;
  entityType: 'lead' | 'cliente';
  entityName: string;
  onRequestTransfer?: () => void;
}

export function OwnershipWarningDialog({
  open,
  onOpenChange,
  ownerName,
  ownerAvatarUrl,
  entityType,
  entityName,
  onRequestTransfer,
}: OwnershipWarningDialogProps) {
  const initials = ownerName?.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2) || 'U';
  const label = entityType === 'lead' ? 'Lead' : 'Cliente';

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2">
            <ShieldAlert className="h-5 w-5 text-amber-500" />
            {label} já possui responsável
          </AlertDialogTitle>
          <AlertDialogDescription asChild>
            <div className="space-y-3">
              <p>
                O {label.toLowerCase()} <strong>{entityName}</strong> está sendo atendido por:
              </p>
              <div className="flex items-center gap-3 p-3 rounded-lg bg-muted border">
                <Avatar className="h-10 w-10">
                  <AvatarImage src={ownerAvatarUrl || undefined} alt={ownerName} />
                  <AvatarFallback className="bg-primary text-primary-foreground text-sm">
                    {initials}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <p className="font-medium text-foreground">{ownerName}</p>
                  <p className="text-xs text-muted-foreground">Responsável atual</p>
                </div>
              </div>
              <p className="text-sm">
                Você pode solicitar a transferência deste {label.toLowerCase()} para sua carteira. 
                O gestor ou administrador será notificado.
              </p>
            </div>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Fechar</AlertDialogCancel>
          {onRequestTransfer && (
            <AlertDialogAction onClick={onRequestTransfer}>
              Solicitar Transferência
            </AlertDialogAction>
          )}
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
