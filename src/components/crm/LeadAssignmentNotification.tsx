import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { UserCheck } from 'lucide-react';

export function LeadAssignmentNotification() {
  const [notification, setNotification] = useState<{ leadName: string; assignerName: string } | null>(null);

  useEffect(() => {
    let userId: string | null = null;

    const setup = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      userId = user.id;

      const channel = supabase
        .channel('lead-assignments')
        .on(
          'postgres_changes',
          {
            event: 'UPDATE',
            schema: 'public',
            table: 'leads',
          },
          async (payload: any) => {
            const newRow = payload.new;
            const oldRow = payload.old;
            
            // Check if vendedor_id changed to current user AND status moved from passagem_bastao
            if (
              newRow.vendedor_id === userId &&
              oldRow.vendedor_id !== userId &&
              oldRow.status === 'passagem_bastao'
            ) {
              setNotification({
                leadName: newRow.empresa || newRow.cliente_nome || 'Lead',
                assignerName: 'Um gestor',
              });
            }
          }
        )
        .subscribe();

      return () => { supabase.removeChannel(channel); };
    };

    setup();
  }, []);

  if (!notification) return null;

  return (
    <Dialog open={!!notification} onOpenChange={(v) => { if (!v) setNotification(null); }}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <UserCheck className="h-5 w-5 text-primary" />
            Novo Lead Atribuído a Você!
          </DialogTitle>
          <DialogDescription>
            {notification.assignerName} atribuiu o lead <strong>{notification.leadName}</strong> a você através da Passagem de Bastão. Acesse o CRM para dar continuidade ao atendimento.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button onClick={() => setNotification(null)}>
            Entendi
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
