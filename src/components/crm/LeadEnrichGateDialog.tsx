
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
import { locationsService } from '@/services/locationsService';
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
  const [selectedProducts, setSelectedProducts] = useState<string[]>([]);
  const [cnpj, setCnpj] = useState('');
  const [regime, setRegime] = useState('');
  const [estado, setEstado] = useState('');
  const [cidade, setCidade] = useState('');
  const [cidadeSearch, setCidadeSearch] = useState('');
  const [showCidadeDropdown, setShowCidadeDropdown] = useState(false);
  const [observacoes, setObservacoes] = useState('');
  const [saving, setSaving] = useState(false);
  const [addingSector, setAddingSector] = useState(false);
  const [newSector, setNewSector] = useState('');
  const [addingProduct, setAddingProduct] = useState(false);
  const [newProduct, setNewProduct] = useState('');
  const [estados, setEstados] = useState<{ uf: string; nome: string }[]>([]);
  const [cidades, setCidades] = useState<string[]>([]);
  const [loadingCidades, setLoadingCidades] = useState(false);

  useEffect(() => {
    if (open) {
      setRamo(lead.ramo_atuacao || '');
      setProduto(lead.produto_interesse || '');
      setCnpj(lead.cliente_cnpj || '');
      setRegime(lead.regime_tributario || '');
      setEstado(lead.estado || 'RS');
      setCidade(lead.cidade || '');
      setCidadeSearch(lead.cidade || '');
      setObservacoes(lead.observacoes || lead.notes || '');
      loadLookups();
      loadEstados();
    }
  }, [open, lead.id]);

  useEffect(() => {
    if (estado) {
      loadCidades(estado);
    } else {
      setCidades([]);
      setCidade('');
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
      estado.trim() ||
      cidade.trim() ||
      observacoes.trim()
    );
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
    if (!hasAnyData()) {
      toast.error('Preencha pelo menos um campo', {
        description: 'É necessário informar ao menos uma informação antes de mover o lead.',
      });
      return;
    }

    setSaving(true);
    try {
      const cleanCnpj = cnpj.replace(/\D/g, '');
      const updateData = {
        ramo_atuacao: ramo || null,
        produto_interesse: produto || null,
        cliente_cnpj: cleanCnpj.length > 0 ? cleanCnpj : null,
        regime_tributario: regime || null,
        estado: estado || null,
        cidade: cidade || null,
        notes: observacoes || null,
        updated_at: new Date().toISOString(),
      };
      const { error } = await (supabase as any).from('leads').update(updateData).eq('id', lead.id);
      if (error) {
        console.error('Erro ao salvar enriquecimento:', error);
        throw error;
      }
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
