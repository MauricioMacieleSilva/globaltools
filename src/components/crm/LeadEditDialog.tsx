
import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { locationsService } from '@/services/locationsService';
import { Plus, ChevronsUpDown, X } from 'lucide-react';
import { CRM_STAGES } from '@/pages/CRM';
import type { CRMLead } from '@/pages/CRM';

interface LeadEditDialogProps {
  lead: CRMLead | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onUpdated: () => void;
}

const REGIMES = ['Simples Nacional', 'Lucro Presumido', 'Lucro Real'];
const DEFAULT_ORIGENS_FALLBACK = ['Indicação', 'Site', 'WhatsApp', 'Telefone', 'Visita', 'Feira/Evento', 'LinkedIn', 'Outro'];

export function LeadEditDialog({ lead, open, onOpenChange, onUpdated }: LeadEditDialogProps) {
  const [form, setForm] = useState({
    empresa: '', cliente_nome: '', cliente_telefone: '', cliente_email: '',
    website: '', source: '', status: 'lead', produto_interesse: '', notes: '',
    cliente_cnpj: '', budget_number: '',
    ramo_atuacao: '', regime_tributario: '', estado: '', cidade: '',
  });
  const [selectedProducts, setSelectedProducts] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);

  // Lookups
  const [sectors, setSectors] = useState<{ id: string; name: string }[]>([]);
  const [products, setProducts] = useState<{ id: string; name: string }[]>([]);
  const [origens, setOrigens] = useState<string[]>([]);
  const [estados, setEstados] = useState<{ uf: string; nome: string }[]>([]);
  const [cidades, setCidades] = useState<string[]>([]);
  const [loadingCidades, setLoadingCidades] = useState(false);
  const [cidadeSearch, setCidadeSearch] = useState('');
  const [showCidadeDropdown, setShowCidadeDropdown] = useState(false);
  const [addingSector, setAddingSector] = useState(false);
  const [newSector, setNewSector] = useState('');
  const [addingProduct, setAddingProduct] = useState(false);
  const [newProduct, setNewProduct] = useState('');
  const [addingOrigem, setAddingOrigem] = useState(false);
  const [novaOrigem, setNovaOrigem] = useState('');

  useEffect(() => {
    if (lead && open) {
      setForm({
        empresa: lead.empresa || '',
        cliente_nome: lead.cliente_nome || '',
        cliente_telefone: lead.cliente_telefone || lead.contact_phone || '',
        cliente_email: lead.cliente_email || lead.contact_email || '',
        website: (lead as any).website || '',
        source: lead.origem || lead.source || '',
        status: lead.status || 'lead',
        produto_interesse: '',
        notes: lead.notes || lead.observacoes || '',
        cliente_cnpj: lead.cliente_cnpj || '',
        budget_number: lead.budget_number || '',
        ramo_atuacao: lead.ramo_atuacao || '',
        regime_tributario: lead.regime_tributario || '',
        estado: lead.estado || '',
        cidade: lead.cidade || '',
      });
      setSelectedProducts(
        lead.produto_interesse ? lead.produto_interesse.split(',').map(p => p.trim()).filter(Boolean) : []
      );
      setCidadeSearch(lead.cidade || '');
      loadLookups();
      loadEstados();
    }
  }, [lead, open]);

  useEffect(() => {
    if (form.estado) {
      loadCidades(form.estado);
    } else {
      setCidades([]);
    }
  }, [form.estado]);

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
    const [s, p, o] = await Promise.all([
      (supabase as any).from('crm_business_sectors').select('id, name').eq('is_active', true).order('name'),
      (supabase as any).from('crm_product_interests').select('id, name').eq('is_active', true).order('name'),
      (supabase as any)
        .from('crm_lead_sources')
        .select('id, name')
        .eq('is_active', true)
        .order('display_order', { ascending: true })
        .order('name', { ascending: true }),
    ]);
    setSectors(s.data || []);
    setProducts(p.data || []);

    const names = (o.data || []).map((d: any) => d.name);
    setOrigens(names.length > 0 ? names : DEFAULT_ORIGENS_FALLBACK);
  };

  const handleAddSector = async () => {
    const trimmed = newSector.trim();
    if (!trimmed) return;
    await (supabase as any).from('crm_business_sectors').insert({ name: trimmed });
    setNewSector('');
    setAddingSector(false);
    setForm(f => ({ ...f, ramo_atuacao: trimmed }));
    loadLookups();
  };

  const handleAddProduct = async () => {
    const trimmed = newProduct.trim();
    if (!trimmed) return;
    await (supabase as any).from('crm_product_interests').insert({ name: trimmed });
    setNewProduct('');
    setAddingProduct(false);
    if (!selectedProducts.includes(trimmed)) setSelectedProducts(prev => [...prev, trimmed]);
    loadLookups();
  };

  const handleAddOrigem = async () => {
    const trimmed = novaOrigem.trim();
    if (!trimmed) return;

    if (origens.includes(trimmed)) {
      setForm(f => ({ ...f, source: trimmed }));
      setNovaOrigem('');
      setAddingOrigem(false);
      return;
    }

    try {
      const { error } = await (supabase as any).from('crm_lead_sources').insert({ name: trimmed });
      if (error) throw error;
      setForm(f => ({ ...f, source: trimmed }));
      setNovaOrigem('');
      setAddingOrigem(false);
      loadLookups();
      toast.success('Origem adicionada');
    } catch (err: any) {
      console.error('Erro ao adicionar origem:', err);
      toast.error('Erro ao adicionar origem', { description: err.message });
    }
  };

  const toggleProduct = (name: string) => {
    setSelectedProducts(prev => prev.includes(name) ? prev.filter(p => p !== name) : [...prev, name]);
  };

  const formatCnpj = (value: string) => {
    const digits = value.replace(/\D/g, '').slice(0, 14);
    return digits
      .replace(/^(\d{2})(\d)/, '$1.$2')
      .replace(/^(\d{2})\.(\d{3})(\d)/, '$1.$2.$3')
      .replace(/\.(\d{3})(\d)/, '.$1/$2')
      .replace(/(\d{4})(\d)/, '$1-$2');
  };

  const filteredCidades = cidadeSearch
    ? cidades.filter(c => c.toLowerCase().includes(cidadeSearch.toLowerCase())).slice(0, 15)
    : cidades.slice(0, 15);

  const handleSave = async () => {
    if (!lead) return;
    if (!form.empresa.trim()) {
      toast.error('Empresa é obrigatória');
      return;
    }
    if (!form.cliente_telefone.trim()) {
      toast.error('Telefone é obrigatório');
      return;
    }
    setLoading(true);
    try {
      const contactName = form.cliente_nome.trim() || form.empresa.trim();
      const { error } = await (supabase as any).from('leads').update({
        cliente_nome: contactName,
        client_name: contactName,
        empresa: form.empresa.trim(),
        cliente_telefone: form.cliente_telefone || null,
        contact_phone: form.cliente_telefone || null,
        cliente_email: form.cliente_email || null,
        contact_email: form.cliente_email || null,
        source: form.source || null,
        status: form.status,
        produto_interesse: selectedProducts.length > 0 ? selectedProducts.join(', ') : null,
        notes: form.notes || null,
        cliente_cnpj: form.cliente_cnpj.replace(/\D/g, '') || null,
        budget_number: form.budget_number.trim() || null,
        valor_estimado: form.budget_number.trim() ? undefined : null,
        ramo_atuacao: form.ramo_atuacao || null,
        regime_tributario: form.regime_tributario || null,
        estado: form.estado || null,
        cidade: form.cidade || null,
        website: form.website.trim() || null,
        updated_at: new Date().toISOString(),
      }).eq('id', lead.id);
      if (error) throw error;
      toast.success('Lead atualizado com sucesso');
      onOpenChange(false);
      onUpdated();
    } catch (err: any) {
      toast.error('Erro ao atualizar lead', { description: err.message });
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
        <div className="grid gap-4 py-2">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Empresa - FIRST and required */}
            <div className="space-y-1.5 sm:col-span-2">
              <Label>Empresa *</Label>
              <Input value={form.empresa} onChange={(e) => setForm(f => ({ ...f, empresa: e.target.value }))} placeholder="Nome da empresa" />
            </div>

            {/* Nome do Contato */}
            <div className="space-y-1.5 sm:col-span-2">
              <Label>Nome do Contato</Label>
              <Input value={form.cliente_nome} onChange={(e) => setForm(f => ({ ...f, cliente_nome: e.target.value }))} placeholder="Ex: João, Maria, Compras..." />
            </div>

            {/* Telefone - required */}
            <div className="space-y-1.5">
              <Label>Telefone *</Label>
              <Input value={form.cliente_telefone} onChange={(e) => setForm(f => ({ ...f, cliente_telefone: e.target.value }))} placeholder="(00) 00000-0000" />
            </div>

            {/* Email */}
            <div className="space-y-1.5">
              <Label>Email</Label>
              <Input type="email" value={form.cliente_email} onChange={(e) => setForm(f => ({ ...f, cliente_email: e.target.value }))} placeholder="email@empresa.com" />
            </div>

            {/* Website / URL */}
            <div className="space-y-1.5 sm:col-span-2">
              <Label>Site / URL</Label>
              <Input value={form.website} onChange={(e) => setForm(f => ({ ...f, website: e.target.value }))} placeholder="https://www.empresa.com.br" />
            </div>

            {/* CNPJ */}
            <div className="space-y-1.5">
              <Label>CNPJ</Label>
              <Input value={formatCnpj(form.cliente_cnpj)} onChange={(e) => setForm(f => ({ ...f, cliente_cnpj: e.target.value }))} placeholder="00.000.000/0000-00" />
            </div>

            {/* Nº Pedido / Orçamento */}
            <div className="space-y-1.5">
              <Label>Nº Pedido / Orçamento</Label>
              <Input value={form.budget_number} onChange={(e) => setForm(f => ({ ...f, budget_number: e.target.value }))} placeholder="Ex: 11970" />
            </div>

            {/* Origem */}
            <div className="space-y-1.5">
              <Label>Origem</Label>
              {addingOrigem ? (
                <div className="flex gap-1">
                  <Input value={novaOrigem} onChange={(e) => setNovaOrigem(e.target.value)} placeholder="Nova origem..." className="h-9 text-xs" onKeyDown={(e) => e.key === 'Enter' && handleAddOrigem()} autoFocus />
                  <Button size="sm" className="h-9 text-xs" onClick={handleAddOrigem}>OK</Button>
                  <Button size="sm" variant="ghost" className="h-9 text-xs" onClick={() => { setAddingOrigem(false); setNovaOrigem(''); }}>✕</Button>
                </div>
              ) : (
                <div className="flex gap-1">
                  <Select value={form.source} onValueChange={(v) => setForm(f => ({ ...f, source: v }))}>
                    <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
                    <SelectContent>{origens.map(o => <SelectItem key={o} value={o}>{o}</SelectItem>)}</SelectContent>
                  </Select>
                  <Button size="icon" variant="outline" className="h-9 w-9 shrink-0" onClick={() => setAddingOrigem(true)}><Plus className="h-3 w-3" /></Button>
                </div>
              )}
            </div>

            {/* Status */}
            <div className="space-y-1.5">
              <Label>Status</Label>
              <Select value={form.status} onValueChange={(v) => setForm(f => ({ ...f, status: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {CRM_STAGES.map(s => <SelectItem key={s.key} value={s.key}>{s.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>

            {/* Ramo de Atuação */}
            <div className="space-y-1.5">
              <Label>Ramo de Atuação</Label>
              {addingSector ? (
                <div className="flex gap-1">
                  <Input value={newSector} onChange={(e) => setNewSector(e.target.value)} placeholder="Novo ramo..." className="h-9 text-xs" onKeyDown={(e) => e.key === 'Enter' && handleAddSector()} autoFocus />
                  <Button size="sm" className="h-9 text-xs" onClick={handleAddSector}>OK</Button>
                  <Button size="sm" variant="ghost" className="h-9 text-xs" onClick={() => { setAddingSector(false); setNewSector(''); }}>✕</Button>
                </div>
              ) : (
                <div className="flex gap-1">
                  <Select value={form.ramo_atuacao} onValueChange={(v) => setForm(f => ({ ...f, ramo_atuacao: v }))}>
                    <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
                    <SelectContent>{sectors.map(s => <SelectItem key={s.id} value={s.name}>{s.name}</SelectItem>)}</SelectContent>
                  </Select>
                  <Button size="icon" variant="outline" className="h-9 w-9 shrink-0" onClick={() => setAddingSector(true)}><Plus className="h-3 w-3" /></Button>
                </div>
              )}
            </div>

            {/* Regime Tributário */}
            <div className="space-y-1.5">
              <Label>Regime Tributário</Label>
              <Select value={form.regime_tributario} onValueChange={(v) => setForm(f => ({ ...f, regime_tributario: v }))}>
                <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
                <SelectContent>{REGIMES.map(r => <SelectItem key={r} value={r}>{r}</SelectItem>)}</SelectContent>
              </Select>
            </div>

            {/* Estado / Cidade */}
            <div className="space-y-1.5">
              <Label>Estado (UF)</Label>
              <Select value={form.estado} onValueChange={(v) => { setForm(f => ({ ...f, estado: v, cidade: '' })); setCidadeSearch(''); }}>
                <SelectTrigger><SelectValue placeholder="UF..." /></SelectTrigger>
                <SelectContent>
                  {estados.map(e => <SelectItem key={e.uf} value={e.uf}>{e.uf} - {e.nome}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5 relative">
              <Label>Cidade</Label>
              <Input
                value={cidadeSearch}
                onChange={(e) => { setCidadeSearch(e.target.value); setForm(f => ({ ...f, cidade: e.target.value })); setShowCidadeDropdown(true); }}
                onFocus={() => setShowCidadeDropdown(true)}
                onBlur={() => setTimeout(() => setShowCidadeDropdown(false), 200)}
                placeholder={loadingCidades ? 'Carregando...' : 'Digite a cidade...'}
                disabled={!form.estado || loadingCidades}
              />
              {showCidadeDropdown && filteredCidades.length > 0 && (
                <div className="absolute z-50 top-full left-0 right-0 mt-1 max-h-40 overflow-y-auto rounded-md border bg-popover shadow-md">
                  {filteredCidades.map(c => (
                    <button
                      key={c}
                      type="button"
                      onMouseDown={() => { setCidadeSearch(c); setForm(f => ({ ...f, cidade: c })); setShowCidadeDropdown(false); }}
                      className="w-full text-left px-2 py-1.5 text-xs hover:bg-accent cursor-pointer"
                    >
                      {c}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Produto de Interesse - Multi-select */}
            <div className="space-y-1.5 sm:col-span-2">
              <Label>Produto de Interesse</Label>
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
                  <Input value={newProduct} onChange={(e) => setNewProduct(e.target.value)} placeholder="Novo produto..." className="h-9 text-xs" onKeyDown={(e) => e.key === 'Enter' && handleAddProduct()} autoFocus />
                  <Button size="sm" className="h-9 text-xs" onClick={handleAddProduct}>OK</Button>
                  <Button size="sm" variant="ghost" className="h-9 text-xs" onClick={() => { setAddingProduct(false); setNewProduct(''); }}>✕</Button>
                </div>
              ) : (
                <div className="flex gap-1">
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button variant="outline" className="h-9 text-xs flex-1 justify-between font-normal">
                        {selectedProducts.length > 0 ? `${selectedProducts.length} selecionado(s)` : 'Selecione...'}
                        <ChevronsUpDown className="ml-2 h-3 w-3 shrink-0 opacity-50" />
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-[--radix-popover-trigger-width] p-1.5" align="start">
                      <div className="max-h-40 overflow-y-auto space-y-0.5">
                        {products.map(p => (
                          <label key={p.id} className="flex items-center gap-1.5 text-xs cursor-pointer hover:bg-accent/50 rounded px-1.5 py-1">
                            <Checkbox
                              checked={selectedProducts.includes(p.name)}
                              onCheckedChange={() => toggleProduct(p.name)}
                              className="h-3.5 w-3.5"
                            />
                            {p.name}
                          </label>
                        ))}
                      </div>
                    </PopoverContent>
                  </Popover>
                  <Button size="icon" variant="outline" className="h-9 w-9 shrink-0" onClick={() => setAddingProduct(true)}><Plus className="h-3 w-3" /></Button>
                </div>
              )}
            </div>

            {/* Observações */}
            <div className="space-y-1.5 sm:col-span-2">
              <Label>Observações</Label>
              <Textarea value={form.notes} onChange={(e) => setForm(f => ({ ...f, notes: e.target.value }))} placeholder="Notas iniciais..." rows={2} />
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
