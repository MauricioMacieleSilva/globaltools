
import { useEffect, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Plus, RotateCcw, Eye, Search, Trash2 } from 'lucide-react';
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
  onLeadClick?: (lead: CRMLead) => void;
  onLeadReactivated?: () => void;
  userRole?: string | null;
}

export function LostDealsDialog({ open, onOpenChange, pendingLead, lostLeads, onConfirmLost, onCancel, onLeadClick, onLeadReactivated, userRole }: LostDealsDialogProps) {
  const [selectedReason, setSelectedReason] = useState('');
  const [customReason, setCustomReason] = useState('');
  const [reasons, setReasons] = useState<{ id: string; name: string }[]>([]);
  const [addingReason, setAddingReason] = useState(false);
  const [newReason, setNewReason] = useState('');
  const [search, setSearch] = useState('');
  const [reactivating, setReactivating] = useState<string | null>(null);
  const [dispositions, setDispositions] = useState<Record<string, string>>({});
  const [deleteTarget, setDeleteTarget] = useState<CRMLead | null>(null);
  const [deleting, setDeleting] = useState(false);

  const canDelete = userRole === 'admin' || userRole === 'comercial';

  useEffect(() => {
    if (open) {
      loadReasons();
      if (!pendingLead) loadDispositions();
    }
  }, [open, pendingLead]);

  const loadReasons = async () => {
    const { data } = await (supabase as any)
      .from('crm_loss_reasons')
      .select('id, name')
      .eq('is_active', true)
      .order('name', { ascending: true });
    setReasons(data || []);
  };

  const loadDispositions = async () => {
    const { data } = await (supabase as any)
      .from('lead_dispositions')
      .select('lead_id, reason, custom_reason')
      .eq('disposition_type', 'lost');
    if (data) {
      const map: Record<string, string> = {};
      data.forEach((d: any) => {
        map[d.lead_id] = d.reason || d.custom_reason || '';
      });
      setDispositions(map);
    }
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

  const handleReactivate = async (lead: CRMLead) => {
    setReactivating(lead.id);
    try {
      const user = (await supabase.auth.getUser()).data.user;
      await (supabase as any)
        .from('leads')
        .update({ status: 'lead', updated_at: new Date().toISOString() })
        .eq('id', lead.id);

      await supabase.from('lead_activities').insert({
        lead_id: lead.id,
        activity_type: 'mudanca_status',
        description: 'Lead reativado — movido de "Perdido" para "Lead"',
        user_id: user?.id || '',
      } as any);

      toast.success('Lead reativado com sucesso', {
        description: `${lead.empresa || lead.client_name || lead.cliente_nome} voltou para a carteira`,
      });
      onLeadReactivated?.();
    } catch {
      toast.error('Erro ao reativar lead');
    } finally {
      setReactivating(null);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      const { error } = await (supabase as any).from('leads').delete().eq('id', deleteTarget.id);
      if (error) throw error;
      toast.success('Lead excluído permanentemente');
      onLeadReactivated?.(); // refresh list
    } catch {
      toast.error('Erro ao excluir lead');
    } finally {
      setDeleting(false);
      setDeleteTarget(null);
    }
  };

  const filteredLostLeads = lostLeads.filter(l => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (l.client_name || l.cliente_nome || '').toLowerCase().includes(q) ||
      (l.empresa || '').toLowerCase().includes(q);
  });

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
    <>
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[80vh]">
        <DialogHeader>
          <DialogTitle>Leads Perdidos ({lostLeads.length})</DialogTitle>
        </DialogHeader>

        {lostLeads.length > 3 && (
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar lead perdido..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>
        )}

        <div className="space-y-2 overflow-y-auto max-h-[60vh]">
          {filteredLostLeads.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">
              {lostLeads.length === 0 ? 'Nenhum lead perdido' : 'Nenhum resultado encontrado'}
            </p>
          ) : (
            filteredLostLeads.map(lead => (
              <div key={lead.id} className="p-3 rounded-lg border bg-card space-y-2">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <span className="text-sm font-medium text-foreground">{lead.empresa || lead.client_name || lead.cliente_nome}</span>
                    {lead.empresa && (
                      <p className="text-xs text-muted-foreground truncate">{lead.empresa}</p>
                    )}
                  </div>
                  {lead.valor_estimado && (
                    <Badge variant="outline" className="text-xs shrink-0">
                      {lead.valor_estimado.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', minimumFractionDigits: 0 })}
                    </Badge>
                  )}
                </div>

                {(dispositions[lead.id] || lead.notes) && (
                  <p className="text-xs text-muted-foreground">
                    <span className="font-medium">Motivo:</span> {dispositions[lead.id] || lead.notes}
                  </p>
                )}

                {(lead.cidade || lead.estado) && (
                  <p className="text-xs text-muted-foreground">
                    📍 {[lead.cidade, lead.estado].filter(Boolean).join('/')}
                  </p>
                )}

                <div className="flex items-center justify-between pt-1">
                  <p className="text-[10px] text-muted-foreground">
                    Perdido em {new Date(lead.updated_at).toLocaleDateString('pt-BR')}
                  </p>
                  <div className="flex gap-1.5">
                    {onLeadClick && (
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-7 text-xs gap-1 px-2"
                        onClick={() => { onOpenChange(false); onLeadClick(lead); }}
                      >
                        <Eye className="h-3.5 w-3.5" /> Detalhes
                      </Button>
                    )}
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-7 text-xs gap-1 px-2"
                      disabled={reactivating === lead.id}
                      onClick={() => handleReactivate(lead)}
                    >
                      <RotateCcw className="h-3.5 w-3.5" />
                      {reactivating === lead.id ? 'Reativando...' : 'Reativar'}
                    </Button>
                      {canDelete && (
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-7 text-xs gap-1 px-2 text-destructive hover:text-destructive hover:bg-destructive/10"
                          onClick={() => setDeleteTarget(lead)}
                          title="Excluir lead permanentemente"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleteTarget} onOpenChange={(v) => { if (!v) setDeleteTarget(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir lead permanentemente?</AlertDialogTitle>
            <AlertDialogDescription>
              O lead <strong>{deleteTarget?.empresa || deleteTarget?.client_name || deleteTarget?.cliente_nome}</strong> será removido permanentemente da base. Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={deleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleting ? 'Excluindo...' : 'Excluir'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
