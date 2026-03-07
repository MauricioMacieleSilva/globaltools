
import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { CRM_STAGES } from '@/pages/CRM';

interface NewLeadDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onLeadCreated: () => void;
}

const ORIGENS = ['Indicação', 'Site', 'WhatsApp', 'Telefone', 'Visita', 'Feira/Evento', 'LinkedIn', 'Outro'];

export function NewLeadDialog({ open, onOpenChange, onLeadCreated }: NewLeadDialogProps) {
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    cliente_nome: '',
    empresa: '',
    origem: '',
    cliente_telefone: '',
    cliente_email: '',
    status: 'lead',
    valor_estimado: '',
    produto_interesse: '',
    observacoes: '',
  });
  const { toast } = useToast();

  const resetForm = () => setForm({
    cliente_nome: '', empresa: '', origem: '', cliente_telefone: '',
    cliente_email: '', status: 'lead', valor_estimado: '', produto_interesse: '', observacoes: '',
  });

  const handleSubmit = async () => {
    if (!form.cliente_nome.trim()) {
      toast({ title: 'Nome do cliente é obrigatório', variant: 'destructive' });
      return;
    }
    setLoading(true);
    try {
      const user = (await supabase.auth.getUser()).data.user;
      const { error } = await (supabase as any).from('leads').insert({
        cliente_nome: form.cliente_nome.trim(),
        client_name: form.cliente_nome.trim(),
        empresa: form.empresa || null,
        origem: form.origem || null,
        cliente_telefone: form.cliente_telefone || null,
        contact_phone: form.cliente_telefone || null,
        cliente_email: form.cliente_email || null,
        contact_email: form.cliente_email || null,
        status: form.status,
        valor_estimado: form.valor_estimado ? parseFloat(form.valor_estimado) : null,
        produto_interesse: form.produto_interesse || null,
        observacoes: form.observacoes || null,
        vendedor_id: user?.id,
      });
      if (error) throw error;
      toast({ title: 'Lead criado com sucesso!' });
      resetForm();
      onOpenChange(false);
      onLeadCreated();
    } catch (error: any) {
      toast({ title: 'Erro ao criar lead', description: error.message, variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) resetForm(); onOpenChange(v); }}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Novo Lead</DialogTitle>
        </DialogHeader>
        <div className="grid gap-4 py-2">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5 sm:col-span-2">
              <Label htmlFor="nome">Nome do Cliente *</Label>
              <Input id="nome" value={form.cliente_nome} onChange={(e) => setForm(f => ({ ...f, cliente_nome: e.target.value }))} placeholder="Nome completo" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="empresa">Empresa</Label>
              <Input id="empresa" value={form.empresa} onChange={(e) => setForm(f => ({ ...f, empresa: e.target.value }))} placeholder="Nome da empresa" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="origem">Origem</Label>
              <Select value={form.origem} onValueChange={(v) => setForm(f => ({ ...f, origem: v }))}>
                <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
                <SelectContent>
                  {ORIGENS.map(o => <SelectItem key={o} value={o}>{o}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="telefone">Telefone</Label>
              <Input id="telefone" value={form.cliente_telefone} onChange={(e) => setForm(f => ({ ...f, cliente_telefone: e.target.value }))} placeholder="(00) 00000-0000" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="email">Email</Label>
              <Input id="email" type="email" value={form.cliente_email} onChange={(e) => setForm(f => ({ ...f, cliente_email: e.target.value }))} placeholder="email@empresa.com" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="valor">Valor Estimado (R$)</Label>
              <Input id="valor" type="number" value={form.valor_estimado} onChange={(e) => setForm(f => ({ ...f, valor_estimado: e.target.value }))} placeholder="0,00" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="status">Status Inicial</Label>
              <Select value={form.status} onValueChange={(v) => setForm(f => ({ ...f, status: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {CRM_STAGES.map(s => <SelectItem key={s.key} value={s.key}>{s.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5 sm:col-span-2">
              <Label htmlFor="produto">Produto de Interesse</Label>
              <Input id="produto" value={form.produto_interesse} onChange={(e) => setForm(f => ({ ...f, produto_interesse: e.target.value }))} placeholder="Ex: Chapas, Perfis, Bobinas..." />
            </div>
            <div className="space-y-1.5 sm:col-span-2">
              <Label htmlFor="obs">Observações</Label>
              <Textarea id="obs" value={form.observacoes} onChange={(e) => setForm(f => ({ ...f, observacoes: e.target.value }))} placeholder="Notas iniciais..." rows={2} />
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => { resetForm(); onOpenChange(false); }}>Cancelar</Button>
          <Button onClick={handleSubmit} disabled={loading}>
            {loading ? 'Criando...' : 'Criar Lead'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
