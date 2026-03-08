import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import type { CRMLead } from '@/pages/CRM';

interface LeadEditDialogProps {
  lead: CRMLead | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onUpdated: () => void;
}

const REGIMES = ['Simples Nacional', 'Lucro Presumido', 'Lucro Real'];

export function LeadEditDialog({ lead, open, onOpenChange, onUpdated }: LeadEditDialogProps) {
  const [form, setForm] = useState({
    cliente_nome: '', empresa: '', cliente_telefone: '', cliente_email: '',
    source: '', produto_interesse: '', notes: '', cliente_cnpj: '',
    ramo_atuacao: '', regime_tributario: '',
  });
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    if (lead) {
      setForm({
        cliente_nome: lead.cliente_nome || '',
        empresa: lead.empresa || '',
        cliente_telefone: lead.cliente_telefone || lead.contact_phone || '',
        cliente_email: lead.cliente_email || lead.contact_email || '',
        source: lead.source || lead.origem || '',
        produto_interesse: lead.produto_interesse || '',
        notes: lead.notes || lead.observacoes || '',
        cliente_cnpj: lead.cliente_cnpj || '',
        ramo_atuacao: (lead as any).ramo_atuacao || '',
        regime_tributario: (lead as any).regime_tributario || '',
      });
    }
  }, [lead]);

  const handleSave = async () => {
    if (!lead || !form.cliente_nome.trim()) return;
    setLoading(true);
    try {
      const { error } = await (supabase as any).from('leads').update({
        cliente_nome: form.cliente_nome.trim(),
        client_name: form.cliente_nome.trim(),
        empresa: form.empresa || null,
        cliente_telefone: form.cliente_telefone || null,
        contact_phone: form.cliente_telefone || null,
        cliente_email: form.cliente_email || null,
        contact_email: form.cliente_email || null,
        source: form.source || null,
        produto_interesse: form.produto_interesse || null,
        notes: form.notes || null,
        cliente_cnpj: form.cliente_cnpj.replace(/\D/g, '') || null,
        ramo_atuacao: form.ramo_atuacao || null,
        regime_tributario: form.regime_tributario || null,
        updated_at: new Date().toISOString(),
      }).eq('id', lead.id);
      if (error) throw error;
      toast({ title: 'Lead atualizado!' });
      onOpenChange(false);
      onUpdated();
    } catch (err: any) {
      toast({ title: 'Erro ao atualizar', description: err.message, variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Editar Lead</DialogTitle>
        </DialogHeader>
        <div className="grid gap-3 py-2">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1 sm:col-span-2">
              <Label className="text-xs">Nome do Cliente *</Label>
              <Input value={form.cliente_nome} onChange={(e) => setForm(f => ({ ...f, cliente_nome: e.target.value }))} />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Empresa</Label>
              <Input value={form.empresa} onChange={(e) => setForm(f => ({ ...f, empresa: e.target.value }))} />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Telefone</Label>
              <Input value={form.cliente_telefone} onChange={(e) => setForm(f => ({ ...f, cliente_telefone: e.target.value }))} />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Email</Label>
              <Input value={form.cliente_email} onChange={(e) => setForm(f => ({ ...f, cliente_email: e.target.value }))} />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">CNPJ</Label>
              <Input value={form.cliente_cnpj} onChange={(e) => setForm(f => ({ ...f, cliente_cnpj: e.target.value }))} placeholder="00.000.000/0000-00" />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Origem</Label>
              <Input value={form.source} onChange={(e) => setForm(f => ({ ...f, source: e.target.value }))} />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Produto de Interesse</Label>
              <Input value={form.produto_interesse} onChange={(e) => setForm(f => ({ ...f, produto_interesse: e.target.value }))} />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Ramo de Atuação</Label>
              <Input value={form.ramo_atuacao} onChange={(e) => setForm(f => ({ ...f, ramo_atuacao: e.target.value }))} />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Regime Tributário</Label>
              <Select value={form.regime_tributario} onValueChange={(v) => setForm(f => ({ ...f, regime_tributario: v }))}>
                <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
                <SelectContent>{REGIMES.map(r => <SelectItem key={r} value={r}>{r}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-1 sm:col-span-2">
              <Label className="text-xs">Observações</Label>
              <Textarea value={form.notes} onChange={(e) => setForm(f => ({ ...f, notes: e.target.value }))} rows={2} />
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button onClick={handleSave} disabled={loading}>{loading ? 'Salvando...' : 'Salvar'}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
