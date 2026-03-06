import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import type { CRMLead } from '@/pages/CRM';

const LOST_REASONS = [
  'Preço acima do mercado',
  'Optou pela concorrência',
  'Sem resposta / Sem interesse',
  'Prazo de entrega',
  'Produto não disponível',
  'Cliente desistiu',
  'Outro',
];

interface LostDealsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  pendingLead: CRMLead | null;
  lostLeads: CRMLead[];
  onConfirmLost: (reason: string) => void;
  onCancel: () => void;
}

export function LostDealsDialog({ open, onOpenChange, pendingLead, lostLeads, onConfirmLost, onCancel }: LostDealsDialogProps) {
  const [selectedReason, setSelectedReason] = useState('');
  const [customReason, setCustomReason] = useState('');

  const handleConfirm = () => {
    const reason = selectedReason === 'Outro' ? customReason : selectedReason;
    if (!reason.trim()) return;
    onConfirmLost(reason);
    setSelectedReason('');
    setCustomReason('');
  };

  const handleCancel = () => {
    setSelectedReason('');
    setCustomReason('');
    onCancel();
  };

  // If there's a pending lead, show the reason form
  if (pendingLead) {
    return (
      <Dialog open={open} onOpenChange={(v) => { if (!v) handleCancel(); else onOpenChange(v); }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Marcar como Perdido</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Lead: <strong>{pendingLead.client_name || pendingLead.cliente_nome}</strong>
            </p>
            <Select value={selectedReason} onValueChange={setSelectedReason}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione o motivo..." />
              </SelectTrigger>
              <SelectContent>
                {LOST_REASONS.map(r => (
                  <SelectItem key={r} value={r}>{r}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            {selectedReason === 'Outro' && (
              <Textarea
                value={customReason}
                onChange={(e) => setCustomReason(e.target.value)}
                placeholder="Descreva o motivo..."
                rows={2}
              />
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={handleCancel}>Cancelar</Button>
            <Button
              onClick={handleConfirm}
              disabled={!selectedReason || (selectedReason === 'Outro' && !customReason.trim())}
            >
              Confirmar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    );
  }

  // Otherwise show lost leads list
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[80vh]">
        <DialogHeader>
          <DialogTitle>Leads Perdidos ({lostLeads.length})</DialogTitle>
        </DialogHeader>
        <div className="space-y-2 overflow-y-auto max-h-[60vh]">
          {lostLeads.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">Nenhum lead perdido</p>
          ) : (
            lostLeads.map(lead => (
              <div key={lead.id} className="p-3 rounded-lg border bg-card space-y-1">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-foreground">{lead.client_name || lead.cliente_nome}</span>
                  {lead.valor_estimado && (
                    <Badge variant="outline" className="text-xs">
                      {lead.valor_estimado.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', minimumFractionDigits: 0 })}
                    </Badge>
                  )}
                </div>
                {lead.observacoes && (
                  <p className="text-xs text-muted-foreground">Motivo: {lead.observacoes}</p>
                )}
                <p className="text-[10px] text-muted-foreground">
                  {new Date(lead.updated_at).toLocaleDateString('pt-BR')}
                </p>
              </div>
            ))
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
