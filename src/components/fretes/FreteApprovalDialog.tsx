import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { CheckCircle, XCircle } from 'lucide-react';

interface FreteApprovalDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  action: 'aprovar' | 'rejeitar';
  numeroPedido: string;
  onConfirm: (motivo: string) => void;
}

export function FreteApprovalDialog({ open, onOpenChange, action, numeroPedido, onConfirm }: FreteApprovalDialogProps) {
  const [motivo, setMotivo] = useState('');
  const [loading, setLoading] = useState(false);

  const isApprove = action === 'aprovar';

  const handleConfirm = async () => {
    setLoading(true);
    try {
      await onConfirm(motivo.trim());
      setMotivo('');
      onOpenChange(false);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {isApprove ? (
              <CheckCircle className="h-5 w-5 text-green-600" />
            ) : (
              <XCircle className="h-5 w-5 text-destructive" />
            )}
            {isApprove ? 'Aprovar' : 'Rejeitar'} Frete - Pedido {numeroPedido}
          </DialogTitle>
          <DialogDescription>
            {isApprove
              ? 'Confirme a aprovação deste frete. Você pode informar um motivo opcionalmente.'
              : 'Confirme a rejeição deste frete. Você pode informar o motivo opcionalmente.'}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          <div>
            <Label htmlFor="motivo">Motivo (opcional)</Label>
            <Textarea
              id="motivo"
              value={motivo}
              onChange={e => setMotivo(e.target.value)}
              placeholder={isApprove ? 'Ex: Frete dentro do orçamento previsto...' : 'Ex: Valor acima do permitido...'}
              rows={3}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>
            Cancelar
          </Button>
          <Button
            onClick={handleConfirm}
            disabled={loading}
            variant={isApprove ? 'default' : 'destructive'}
            className={isApprove ? 'bg-green-600 hover:bg-green-700' : ''}
          >
            {loading ? 'Processando...' : isApprove ? 'Confirmar Aprovação' : 'Confirmar Rejeição'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
