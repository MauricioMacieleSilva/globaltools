
import { useEffect, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, AlertTriangle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import type { CRMLead } from '@/pages/CRM';

interface LeadEnrichGateDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  lead: CRMLead;
  onConfirm: () => void;
}

const REGIMES = ['Simples Nacional', 'Lucro Presumido', 'Lucro Real'];

export function LeadEnrichGateDialog({ open, onOpenChange, lead, onConfirm }: LeadEnrichGateDialogProps) {
  const [sectors, setSectors] = useState<{ id: string; name: string }[]>([]);
  const [products, setProducts] = useState<{ id: string; name: string }[]>([]);
  const [ramo, setRamo] = useState('');
  const [produto, setProduto] = useState('');
  const [cnpj, setCnpj] = useState('');
  const [regime, setRegime] = useState('');
  const [observacoes, setObservacoes] = useState('');
  const [saving, setSaving] = useState(false);
  const [addingSector, setAddingSector] = useState(false);
  const [newSector, setNewSector] = useState('');
  const [addingProduct, setAddingProduct] = useState(false);
  const [newProduct, setNewProduct] = useState('');

  useEffect(() => {
    if (open) {
      setRamo(lead.ramo_atuacao || '');
      setProduto(lead.produto_interesse || '');
      setCnpj(lead.cliente_cnpj || '');
      setRegime(lead.regime_tributario || '');
      setObservacoes(lead.observacoes || lead.notes || '');
      loadLookups();
    }
  }, [open, lead.id]);

  const loadLookups = async () => {
    const [s, p] = await Promise.all([
      (supabase as any).from('crm_business_sectors').select('id, name').eq('is_active', true).order('name'),
      (supabase as any).from('crm_product_interests').select('id, name').eq('is_active', true).order('name'),
    ]);
    setSectors(s.data || []);
    setProducts(p.data || []);
  };

  const handleAddSector = async () => {
    const trimmed = newSector.trim();
    if (!trimmed) return;
    await (supabase as any).from('crm_business_sectors').insert({ name: trimmed });
    setNewSector('');
    setAddingSector(false);
    setRamo(trimmed);
    loadLookups();
  };

  const handleAddProduct = async () => {
    const trimmed = newProduct.trim();
    if (!trimmed) return;
    await (supabase as any).from('crm_product_interests').insert({ name: trimmed });
    setNewProduct('');
    setAddingProduct(false);
    setProduto(trimmed);
    loadLookups();
  };

  const formatCnpj = (value: string) => {
    const digits = value.replace(/\D/g, '').slice(0, 14);
    return digits
      .replace(/^(\d{2})(\d)/, '$1.$2')
      .replace(/^(\d{2})\.(\d{3})(\d)/, '$1.$2.$3')
      .replace(/\.(\d{3})(\d)/, '.$1/$2')
      .replace(/(\d{4})(\d)/, '$1-$2');
  };

  const hasAnyData = () => {
    return !!(
      ramo.trim() ||
      produto.trim() ||
      cnpj.replace(/\D/g, '').trim() ||
      regime.trim() ||
      observacoes.trim()
    );
  };

  const handleSave = async () => {
    if (!hasAnyData()) {
      toast.error('Preencha pelo menos um campo', {
        description: 'É necessário informar ao menos uma informação antes de mover o lead.',
      });
      return;
    }

    setSaving(true);
    try {
      const { error } = await (supabase as any).from('leads').update({
        ramo_atuacao: ramo || null,
        produto_interesse: produto || null,
        cliente_cnpj: cnpj.replace(/\D/g, '') || null,
        regime_tributario: regime || null,
        observacoes: observacoes || null,
        updated_at: new Date().toISOString(),
      }).eq('id', lead.id);
      if (error) throw error;
      toast.success('Dados salvos com sucesso');
      onConfirm();
      onOpenChange(false);
    } catch {
      toast.error('Erro ao salvar dados do lead');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-base">
            <AlertTriangle className="h-4 w-4 text-amber-500" />
            Enriquecer Lead antes de Mover
          </DialogTitle>
          <DialogDescription className="text-xs">
            Para mover <strong>{lead.client_name || lead.cliente_nome}</strong> para "Contato Feito", preencha pelo menos um campo abaixo.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          {/* Ramo */}
          <div className="space-y-1">
            <Label className="text-xs">Ramo de Atuação</Label>
            {addingSector ? (
              <div className="flex gap-1">
                <Input value={newSector} onChange={(e) => setNewSector(e.target.value)} placeholder="Novo ramo..." className="h-8 text-xs" onKeyDown={(e) => e.key === 'Enter' && handleAddSector()} autoFocus />
                <Button size="sm" className="h-8 text-xs" onClick={handleAddSector}>OK</Button>
                <Button size="sm" variant="ghost" className="h-8 text-xs" onClick={() => { setAddingSector(false); setNewSector(''); }}>✕</Button>
              </div>
            ) : (
              <div className="flex gap-1">
                <Select value={ramo} onValueChange={setRamo}>
                  <SelectTrigger className="h-8 text-xs flex-1"><SelectValue placeholder="Selecione..." /></SelectTrigger>
                  <SelectContent>{sectors.map(s => <SelectItem key={s.id} value={s.name}>{s.name}</SelectItem>)}</SelectContent>
                </Select>
                <Button size="icon" variant="outline" className="h-8 w-8" onClick={() => setAddingSector(true)}><Plus className="h-3 w-3" /></Button>
              </div>
            )}
          </div>

          {/* Produto */}
          <div className="space-y-1">
            <Label className="text-xs">Produto de Interesse</Label>
            {addingProduct ? (
              <div className="flex gap-1">
                <Input value={newProduct} onChange={(e) => setNewProduct(e.target.value)} placeholder="Novo produto..." className="h-8 text-xs" onKeyDown={(e) => e.key === 'Enter' && handleAddProduct()} autoFocus />
                <Button size="sm" className="h-8 text-xs" onClick={handleAddProduct}>OK</Button>
                <Button size="sm" variant="ghost" className="h-8 text-xs" onClick={() => { setAddingProduct(false); setNewProduct(''); }}>✕</Button>
              </div>
            ) : (
              <div className="flex gap-1">
                <Select value={produto} onValueChange={setProduto}>
                  <SelectTrigger className="h-8 text-xs flex-1"><SelectValue placeholder="Selecione..." /></SelectTrigger>
                  <SelectContent>{products.map(p => <SelectItem key={p.id} value={p.name}>{p.name}</SelectItem>)}</SelectContent>
                </Select>
                <Button size="icon" variant="outline" className="h-8 w-8" onClick={() => setAddingProduct(true)}><Plus className="h-3 w-3" /></Button>
              </div>
            )}
          </div>

          {/* CNPJ */}
          <div className="space-y-1">
            <Label className="text-xs">CNPJ</Label>
            <Input value={formatCnpj(cnpj)} onChange={(e) => setCnpj(e.target.value)} placeholder="00.000.000/0000-00" className="h-8 text-xs" />
          </div>

          {/* Regime */}
          <div className="space-y-1">
            <Label className="text-xs">Regime Tributário</Label>
            <Select value={regime} onValueChange={setRegime}>
              <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Selecione..." /></SelectTrigger>
              <SelectContent>{REGIMES.map(r => <SelectItem key={r} value={r}>{r}</SelectItem>)}</SelectContent>
            </Select>
          </div>

          {/* Observações / Notas */}
          <div className="space-y-1">
            <Label className="text-xs">Observações / Notas</Label>
            <Textarea
              value={observacoes}
              onChange={(e) => setObservacoes(e.target.value)}
              placeholder="Informações do primeiro contato, contexto, necessidades..."
              className="text-xs min-h-[80px] resize-none"
            />
          </div>
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button variant="outline" size="sm" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button size="sm" onClick={handleSave} disabled={saving}>
            {saving ? 'Salvando...' : 'Salvar e Mover para Contato'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
