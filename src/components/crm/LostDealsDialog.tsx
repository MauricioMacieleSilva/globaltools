
import { useEffect, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Plus } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import type { CRMLead } from '@/pages/CRM';

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
  const [reasons, setReasons] = useState<{ id: string; name: string }[]>([]);
  const [addingReason, setAddingReason] = useState(false);
  const [newReason, setNewReason] = useState('');

  useEffect(() => {
    if (open) loadReasons();
  }, [open]);

  const loadReasons = async () => {
    const { data } = await (supabase as any)
      .from('crm_loss_reasons')
      .select('id, name')
      .eq('is_active', true)
      .order('display_order', { ascending: true });
    setReasons(data || []);
  };

  const handleAddReason = async () => {
    const trimmed = newReason.trim();
    if (!trimmed) return;
    await (supabase as any).from('crm_loss_reasons').insert({ name: trimmed });
    setNewReason('');
    setAddingReason(false);
    setSelectedReason(trimmed);
    loadReasons();
    toast.success('Motivo de perda adicionado com sucesso');
  };

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
            {addingReason ? (
              <div className="flex gap-2">
                <Input value={newReason} onChange={(e) => setNewReason(e.target.value)} placeholder="Novo motivo..." onKeyDown={(e) => e.key === 'Enter' && handleAddReason()} autoFocus />
                <Button size="sm" onClick={handleAddReason}>OK</Button>
                <Button size="sm" variant="ghost" onClick={() => { setAddingReason(false); setNewReason(''); }}>✕</Button>
              </div>
            ) : (
              <div className="flex gap-1">
                <Select value={selectedReason} onValueChange={setSelectedReason}>
                  <SelectTrigger className="flex-1">
                    <SelectValue placeholder="Selecione o motivo..." />
                  </SelectTrigger>
                  <SelectContent>
                    {reasons.map(r => (
                      <SelectItem key={r.id} value={r.name}>{r.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button size="icon" variant="outline" onClick={() => setAddingReason(true)} title="Adicionar motivo">
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
            )}
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
