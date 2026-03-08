
import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, X, ChevronsUpDown } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { locationsService } from '@/services/locationsService';
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
  const [selectedProducts, setSelectedProducts] = useState<string[]>(
    lead.produto_interesse ? lead.produto_interesse.split(',').map(p => p.trim()).filter(Boolean) : []
  );
  const [cnpj, setCnpj] = useState(lead.cliente_cnpj || '');
  const [regime, setRegime] = useState(lead.regime_tributario || '');
  const [estado, setEstado] = useState(lead.estado || 'RS');
  const [cidade, setCidade] = useState(lead.cidade || '');
  const [cidadeSearch, setCidadeSearch] = useState(lead.cidade || '');
  const [showCidadeDropdown, setShowCidadeDropdown] = useState(false);
  const [saving, setSaving] = useState(false);
  const [addingSector, setAddingSector] = useState(false);
  const [newSector, setNewSector] = useState('');
  const [addingProduct, setAddingProduct] = useState(false);
  const [newProduct, setNewProduct] = useState('');
  const [estados, setEstados] = useState<{ uf: string; nome: string }[]>([]);
  const [cidades, setCidades] = useState<string[]>([]);
  const [loadingCidades, setLoadingCidades] = useState(false);

  useEffect(() => {
    loadLookups();
    loadEstados();
  }, []);

  useEffect(() => {
    setRamo(lead.ramo_atuacao || '');
    setSelectedProducts(lead.produto_interesse ? lead.produto_interesse.split(',').map(p => p.trim()).filter(Boolean) : []);
    setCnpj(lead.cliente_cnpj || '');
    setRegime(lead.regime_tributario || '');
    setEstado(lead.estado || 'RS');
    setCidade(lead.cidade || '');
    setCidadeSearch(lead.cidade || '');
  }, [lead.id]);

  useEffect(() => {
    if (estado) {
      loadCidades(estado);
    } else {
      setCidades([]);
    }
  }, [estado]);

  const loadEstados = async () => {
    const data = await locationsService.getEstados();
    setEstados(data.map(e => ({ uf: e.uf, nome: e.nome })));
  };

  const loadCidades = async (uf: string) => {
    setLoadingCidades(true);
    const data = await locationsService.getCidadesPorEstado(uf);
    setCidades(data);
    setLoadingCidades(false);
  };

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
    toast.success('Ramo de atuação adicionado com sucesso');
  };

  const handleAddProduct = async () => {
    const trimmed = newProduct.trim();
    if (!trimmed) return;
    await (supabase as any).from('crm_product_interests').insert({ name: trimmed });
    setNewProduct('');
    setAddingProduct(false);
    if (!selectedProducts.includes(trimmed)) {
      setSelectedProducts(prev => [...prev, trimmed]);
    }
    loadLookups();
    toast.success('Produto de interesse adicionado com sucesso');
  };

  const toggleProduct = (name: string) => {
    setSelectedProducts(prev =>
      prev.includes(name) ? prev.filter(p => p !== name) : [...prev, name]
    );
  };

  const formatCnpj = (value: string) => {
    const digits = value.replace(/\D/g, '').slice(0, 14);
    return digits
      .replace(/^(\d{2})(\d)/, '$1.$2')
      .replace(/^(\d{2})\.(\d{3})(\d)/, '$1.$2.$3')
      .replace(/\.(\d{3})(\d)/, '.$1/$2')
      .replace(/(\d{4})(\d)/, '$1-$2');
  };

  const handleEstadoChange = (uf: string) => {
    setEstado(uf);
    setCidade('');
    setCidadeSearch('');
  };

  const handleCidadeSelect = (c: string) => {
    setCidade(c);
    setCidadeSearch(c);
    setShowCidadeDropdown(false);
  };

  const handleCidadeSearchChange = (value: string) => {
    setCidadeSearch(value);
    setCidade(value);
    setShowCidadeDropdown(true);
  };

  const filteredCidades = cidadeSearch
    ? cidades.filter(c => c.toLowerCase().includes(cidadeSearch.toLowerCase())).slice(0, 15)
    : cidades.slice(0, 15);

  const handleSave = async () => {
    setSaving(true);
    try {
      const cleanCnpj = cnpj.replace(/\D/g, '');
      const { error } = await (supabase as any).from('leads').update({
        ramo_atuacao: ramo || null,
        produto_interesse: selectedProducts.length > 0 ? selectedProducts.join(', ') : null,
        cliente_cnpj: cleanCnpj.length > 0 ? cleanCnpj : null,
        regime_tributario: regime || null,
        estado: estado || null,
        cidade: cidade || null,
        updated_at: new Date().toISOString(),
      }).eq('id', lead.id);
      if (error) throw error;
      toast.success('Cadastro enriquecido com sucesso');
      onUpdated();
    } catch {
      toast.error('Erro ao salvar enriquecimento');
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

      {/* Produto - Multi-select */}
      <div className="space-y-1">
        <Label className="text-xs">Produtos de Interesse</Label>
        {selectedProducts.length > 0 && (
          <div className="flex flex-wrap gap-1 mb-1">
            {selectedProducts.map(p => (
              <span key={p} className="inline-flex items-center gap-0.5 text-[10px] px-1.5 py-0.5 rounded bg-accent text-accent-foreground">
                {p}
                <button type="button" onClick={() => toggleProduct(p)} className="hover:text-destructive">
                  <X className="h-2.5 w-2.5" />
                </button>
              </span>
            ))}
          </div>
        )}
        {addingProduct ? (
          <div className="flex gap-1">
            <Input value={newProduct} onChange={(e) => setNewProduct(e.target.value)} placeholder="Novo produto..." className="h-8 text-xs" onKeyDown={(e) => e.key === 'Enter' && handleAddProduct()} autoFocus />
            <Button size="sm" className="h-8 text-xs" onClick={handleAddProduct}>OK</Button>
            <Button size="sm" variant="ghost" className="h-8 text-xs" onClick={() => { setAddingProduct(false); setNewProduct(''); }}>✕</Button>
          </div>
        ) : (
          <div className="flex gap-1">
            <div className="flex-1 border rounded-md max-h-28 overflow-y-auto p-1.5 space-y-1">
              {products.map(p => (
                <label key={p.id} className="flex items-center gap-1.5 text-xs cursor-pointer hover:bg-accent/50 rounded px-1 py-0.5">
                  <Checkbox
                    checked={selectedProducts.includes(p.name)}
                    onCheckedChange={() => toggleProduct(p.name)}
                    className="h-3.5 w-3.5"
                  />
                  {p.name}
                </label>
              ))}
            </div>
            <Button size="icon" variant="outline" className="h-8 w-8 self-start" onClick={() => setAddingProduct(true)}><Plus className="h-3 w-3" /></Button>
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

      {/* Estado / Cidade */}
      <div className="grid grid-cols-2 gap-2">
        <div className="space-y-1">
          <Label className="text-xs">Estado (UF)</Label>
          <Select value={estado} onValueChange={handleEstadoChange}>
            <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="UF..." /></SelectTrigger>
            <SelectContent>
              {estados.map(e => (
                <SelectItem key={e.uf} value={e.uf}>{e.uf} - {e.nome}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1 relative">
          <Label className="text-xs">Cidade</Label>
          <Input
            value={cidadeSearch}
            onChange={(e) => handleCidadeSearchChange(e.target.value)}
            onFocus={() => setShowCidadeDropdown(true)}
            onBlur={() => setTimeout(() => setShowCidadeDropdown(false), 200)}
            placeholder={loadingCidades ? 'Carregando...' : 'Digite a cidade...'}
            className="h-8 text-xs"
            disabled={!estado || loadingCidades}
          />
          {showCidadeDropdown && filteredCidades.length > 0 && (
            <div className="absolute z-50 top-full left-0 right-0 mt-1 max-h-40 overflow-y-auto rounded-md border bg-popover shadow-md">
              {filteredCidades.map(c => (
                <button
                  key={c}
                  type="button"
                  onMouseDown={() => handleCidadeSelect(c)}
                  className="w-full text-left px-2 py-1.5 text-xs hover:bg-accent cursor-pointer"
                >
                  {c}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      <Button size="sm" onClick={handleSave} disabled={saving} className="w-full">
        {saving ? 'Salvando...' : 'Salvar Enriquecimento'}
      </Button>
    </div>
  );
}
