
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
import { Plus } from 'lucide-react';

interface NewLeadDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onLeadCreated: () => void;
}

const DEFAULT_ORIGENS = ['Indicação', 'Site', 'WhatsApp', 'Telefone', 'Visita', 'Feira/Evento', 'LinkedIn', 'Outro'];

export function NewLeadDialog({ open, onOpenChange, onLeadCreated }: NewLeadDialogProps) {
  const [loading, setLoading] = useState(false);
  const [origens, setOrigens] = useState(DEFAULT_ORIGENS);
  const [addingOrigem, setAddingOrigem] = useState(false);
  const [novaOrigem, setNovaOrigem] = useState('');
  const [form, setForm] = useState({
    empresa: '',
    cliente_nome: '',
    source: '',
    cliente_telefone: '',
    cliente_email: '',
    status: 'lead',
    produto_interesse: '',
    notes: '',
  });
  const { toast } = useToast();

  const resetForm = () => {
    setForm({
      empresa: '', cliente_nome: '', source: '', cliente_telefone: '',
      cliente_email: '', status: 'lead', produto_interesse: '', notes: '',
    });
    setAddingOrigem(false);
    setNovaOrigem('');
  };

  const handleAddOrigem = () => {
    const trimmed = novaOrigem.trim();
    if (trimmed && !origens.includes(trimmed)) {
      setOrigens(prev => [...prev, trimmed]);
      setForm(f => ({ ...f, source: trimmed }));
    }
    setNovaOrigem('');
    setAddingOrigem(false);
  };

  const handleSubmit = async () => {
    if (!form.empresa.trim()) {
      toast({ title: 'Empresa é obrigatória', variant: 'destructive' });
      return;
    }
    if (!form.cliente_telefone.trim()) {
      toast({ title: 'Telefone é obrigatório', variant: 'destructive' });
      return;
    }
    setLoading(true);
    try {
      const user = (await supabase.auth.getUser()).data.user;
      const contactName = form.cliente_nome.trim() || form.empresa.trim();
      const { error } = await (supabase as any).from('leads').insert({
        cliente_nome: contactName,
        client_name: contactName,
        empresa: form.empresa.trim(),
        source: form.source || null,
        cliente_telefone: form.cliente_telefone || null,
        contact_phone: form.cliente_telefone || null,
        cliente_email: form.cliente_email || null,
        contact_email: form.cliente_email || null,
        status: form.status,
        produto_interesse: form.produto_interesse || null,
        notes: form.notes || null,
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
            {/* Empresa - FIRST and required */}
            <div className="space-y-1.5 sm:col-span-2">
              <Label htmlFor="empresa">Empresa *</Label>
              <Input id="empresa" value={form.empresa} onChange={(e) => setForm(f => ({ ...f, empresa: e.target.value }))} placeholder="Nome da empresa" />
            </div>

            {/* Nome do Contato - optional */}
            <div className="space-y-1.5 sm:col-span-2">
              <Label htmlFor="nome">Nome do Contato</Label>
              <Input id="nome" value={form.cliente_nome} onChange={(e) => setForm(f => ({ ...f, cliente_nome: e.target.value }))} placeholder="Ex: João, Maria, Compras..." />
            </div>

            {/* Telefone - required */}
            <div className="space-y-1.5">
              <Label htmlFor="telefone">Telefone *</Label>
              <Input id="telefone" value={form.cliente_telefone} onChange={(e) => setForm(f => ({ ...f, cliente_telefone: e.target.value }))} placeholder="(00) 00000-0000" />
            </div>

            {/* Email - optional */}
            <div className="space-y-1.5">
              <Label htmlFor="email">Email</Label>
              <Input id="email" type="email" value={form.cliente_email} onChange={(e) => setForm(f => ({ ...f, cliente_email: e.target.value }))} placeholder="email@empresa.com" />
            </div>

            {/* Origem */}
            <div className="space-y-1.5">
              <Label htmlFor="origem">Origem</Label>
              {addingOrigem ? (
                <div className="flex gap-2">
                  <Input
                    value={novaOrigem}
                    onChange={(e) => setNovaOrigem(e.target.value)}
                    placeholder="Nova origem..."
                    onKeyDown={(e) => e.key === 'Enter' && handleAddOrigem()}
                    autoFocus
                  />
                  <Button size="sm" onClick={handleAddOrigem} type="button">OK</Button>
                  <Button size="sm" variant="ghost" onClick={() => { setAddingOrigem(false); setNovaOrigem(''); }} type="button">✕</Button>
                </div>
              ) : (
                <div className="flex gap-1">
                  <Select value={form.source} onValueChange={(v) => setForm(f => ({ ...f, source: v }))}>
                    <SelectTrigger className="flex-1"><SelectValue placeholder="Selecione..." /></SelectTrigger>
                    <SelectContent>
                      {origens.map(o => <SelectItem key={o} value={o}>{o}</SelectItem>)}
                    </SelectContent>
                  </Select>
                  <Button size="icon" variant="outline" onClick={() => setAddingOrigem(true)} type="button" title="Adicionar origem">
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
              )}
            </div>

            {/* Status */}
            <div className="space-y-1.5">
              <Label htmlFor="status">Status Inicial</Label>
              <Select value={form.status} onValueChange={(v) => setForm(f => ({ ...f, status: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {CRM_STAGES.map(s => <SelectItem key={s.key} value={s.key}>{s.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>

            {/* Produto de Interesse */}
            <div className="space-y-1.5 sm:col-span-2">
              <Label htmlFor="produto">Produto de Interesse</Label>
              <Input id="produto" value={form.produto_interesse} onChange={(e) => setForm(f => ({ ...f, produto_interesse: e.target.value }))} placeholder="Ex: Chapas, Perfis, Bobinas..." />
            </div>

            {/* Observações */}
            <div className="space-y-1.5 sm:col-span-2">
              <Label htmlFor="obs">Observações</Label>
              <Textarea id="obs" value={form.notes} onChange={(e) => setForm(f => ({ ...f, notes: e.target.value }))} placeholder="Notas iniciais..." rows={2} />
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
