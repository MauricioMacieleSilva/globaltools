import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import type { CRMLead } from '@/pages/CRM';

interface LeadEnrichFormProps {
  lead: CRMLead;
  onUpdated: () => void;
}

const REGIMES = ['Simples Nacional', 'Lucro Presumido', 'Lucro Real'];

export function LeadEnrichForm({ lead, onUpdated }: LeadEnrichFormProps) {
  const [sectors, setSectors] = useState<{ id: string; name: string }[]>([]);
  const [products, setProducts] = useState<{ id: string; name: string }[]>([]);
  const [ramo, setRamo] = useState(lead.ramo_atuacao || '');
  const [produto, setProduto] = useState(lead.produto_interesse || '');
  const [cnpj, setCnpj] = useState(lead.cliente_cnpj || '');
  const [regime, setRegime] = useState(lead.regime_tributario || '');
  const [saving, setSaving] = useState(false);
  const [addingSector, setAddingSector] = useState(false);
  const [newSector, setNewSector] = useState('');
  const [addingProduct, setAddingProduct] = useState(false);
  const [newProduct, setNewProduct] = useState('');
  const { toast } = useToast();

  useEffect(() => {
    loadLookups();
  }, []);

  useEffect(() => {
    setRamo(lead.ramo_atuacao || '');
    setProduto(lead.produto_interesse || '');
    setCnpj(lead.cliente_cnpj || '');
    setRegime(lead.regime_tributario || '');
  }, [lead.id]);

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

  const handleSave = async () => {
    setSaving(true);
    try {
      const { error } = await (supabase as any).from('leads').update({
        ramo_atuacao: ramo || null,
        produto_interesse: produto || null,
        cliente_cnpj: cnpj.replace(/\D/g, '') || null,
        regime_tributario: regime || null,
        updated_at: new Date().toISOString(),
      }).eq('id', lead.id);
      if (error) throw error;
      toast({ title: 'Cadastro enriquecido!' });
      onUpdated();
    } catch {
      toast({ title: 'Erro ao salvar', variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-3 bg-accent/30 rounded-lg p-3">
      <p className="text-xs font-semibold text-foreground">Enriquecer Cadastro</p>

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

      <Button size="sm" onClick={handleSave} disabled={saving} className="w-full">
        {saving ? 'Salvando...' : 'Salvar Enriquecimento'}
      </Button>
    </div>
  );
}
