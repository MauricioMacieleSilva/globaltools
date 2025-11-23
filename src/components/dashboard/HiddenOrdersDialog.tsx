import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Eye, Loader2 } from 'lucide-react';
import { useHiddenProductionOrders } from '@/hooks/useHiddenProductionOrders';
import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface HiddenOrdersDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function HiddenOrdersDialog({ open, onOpenChange }: HiddenOrdersDialogProps) {
  const { hiddenOrders, loading, unhideOrder } = useHiddenProductionOrders();

  const handleUnhide = async (numeroPedido: string) => {
    await unhideOrder(numeroPedido);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Pedidos Ocultos</DialogTitle>
          <DialogDescription>
            Gerencie os pedidos que estão ocultos na visualização de produção
          </DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : hiddenOrders.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            Nenhum pedido oculto
          </div>
        ) : (
          <div className="space-y-3">
            {hiddenOrders.map((order) => (
              <div
                key={order.id}
                className="flex items-center justify-between border rounded-lg p-4 hover:bg-muted/50 transition-colors"
              >
                <div className="flex-1">
                  <div className="font-medium">Pedido {order.numero_pedido}</div>
                  <div className="text-sm text-muted-foreground">
                    Ocultado por {order.hidden_by_name} em{' '}
                    {format(parseISO(order.hidden_at), "dd/MM/yyyy 'às' HH:mm", {
                      locale: ptBR,
                    })}
                  </div>
                  {order.motivo && (
                    <div className="text-sm text-muted-foreground mt-1">
                      Motivo: {order.motivo}
                    </div>
                  )}
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handleUnhide(order.numero_pedido)}
                  className="ml-4"
                >
                  <Eye className="h-4 w-4 mr-2" />
                  Reexibir
                </Button>
              </div>
            ))}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
