import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { useState } from 'react';

interface HideOrderDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  numeroPedido: string;
  onConfirm: (motivo?: string) => void;
}

export function HideOrderDialog({
  open,
  onOpenChange,
  numeroPedido,
  onConfirm,
}: HideOrderDialogProps) {
  const [motivo, setMotivo] = useState('');

  const handleConfirm = () => {
    onConfirm(motivo || undefined);
    setMotivo('');
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Ocultar Pedido {numeroPedido}</DialogTitle>
          <DialogDescription>
            Este pedido será ocultado da visualização de produção. Você poderá reexibi-lo
            posteriormente através do botão "Pedidos Ocultos".
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="motivo">Motivo (opcional)</Label>
            <Textarea
              id="motivo"
              placeholder="Digite o motivo para ocultar este pedido..."
              value={motivo}
              onChange={(e) => setMotivo(e.target.value)}
              rows={3}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button onClick={handleConfirm}>Ocultar Pedido</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
