import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem } from '@/components/ui/command';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Check, ChevronsUpDown, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import { type Frete, type FreteInsert, type Transportadora, insertFrete, updateFrete } from '@/services/fretesService';
import { locationsService } from '@/services/locationsService';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editingFrete: Frete | null;
  clientes: Array<{ codigo: string; nome: string }>;
  pedidosByCliente: Map<string, string[]>;
  nfsByPedido: Map<string, string[]>;
  pesoByNf: Map<string, number>;
  transportadoras: Transportadora[];
  onSaved: () => void;
}

export function FreteFormDialog({ open, onOpenChange, editingFrete, clientes, pedidosByCliente, nfsByPedido, pesoByNf, transportadoras, onSaved }: Props) {
  const { toast } = useToast();
  const [saving, setSaving] = useState(false);
  const [clienteOpen, setClienteOpen] = useState(false);
  const [clienteSearch, setClienteSearch] = useState('');
  const [selectedClienteCodigo, setSelectedClienteCodigo] = useState<string | null>(null);
  const [nfInput, setNfInput] = useState('');
  const [estados, setEstados] = useState<Array<{ uf: string; nome: string; id: number }>>([]);
  const [cidades, setCidades] = useState<string[]>([]);
  const [cidadeOpen, setCidadeOpen] = useState(false);
  const [cidadeSearch, setCidadeSearch] = useState('');
  const [pedidoOpen, setPedidoOpen] = useState(false);
  const [pedidoSearch, setPedidoSearch] = useState('');
  const [valorFreteStr, setValorFreteStr] = useState('');
  const [pesoKgStr, setPesoKgStr] = useState('');

  const [form, setForm] = useState<FreteInsert>({
    numero_pedido: '',
    notas_fiscais: [],
    data_embarque: '',
    transportadora_id: null,
    transportadora_nome: '',
    valor_frete: 0,
    peso_kg: 0,
    data_entrega: null,
    observacoes: '',
    cliente_id: null,
    cliente_nome: null,
    cidade_entrega: null,
    uf_entrega: 'RS',
  });

  // Load estados on mount
  useEffect(() => {
    locationsService.getEstados().then(setEstados);
  }, []);

  // Load cidades when UF changes
  useEffect(() => {
    if (form.uf_entrega) {
      locationsService.getCidadesPorEstado(form.uf_entrega).then(setCidades);
    } else {
      setCidades([]);
    }
  }, [form.uf_entrega]);

  const filteredCidades = useMemo(() => {
    if (!cidadeSearch) return cidades.slice(0, 80);
    const search = cidadeSearch.toLowerCase();
    return cidades.filter(c => c.toLowerCase().includes(search)).slice(0, 80);
  }, [cidades, cidadeSearch]);

  useEffect(() => {
    if (editingFrete) {
      const clienteMatch = clientes.find(c => c.nome === editingFrete.cliente_nome);
      setSelectedClienteCodigo(clienteMatch?.codigo || null);
      setValorFreteStr(editingFrete.valor_frete ? String(editingFrete.valor_frete) : '');
      setPesoKgStr(editingFrete.peso_kg ? String(editingFrete.peso_kg) : '');
      setForm({
        numero_pedido: editingFrete.numero_pedido,
        notas_fiscais: editingFrete.notas_fiscais || [],
        data_embarque: editingFrete.data_embarque,
        transportadora_id: editingFrete.transportadora_id,
        transportadora_nome: editingFrete.transportadora_nome,
        valor_frete: editingFrete.valor_frete,
        peso_kg: editingFrete.peso_kg || 0,
        data_entrega: editingFrete.data_entrega,
        observacoes: editingFrete.observacoes || '',
        cliente_id: editingFrete.cliente_id,
        cliente_nome: editingFrete.cliente_nome,
        cidade_entrega: editingFrete.cidade_entrega || null,
        uf_entrega: editingFrete.uf_entrega || 'RS',
      });
    } else {
      resetForm();
    }
  }, [editingFrete, open]);

  const filteredClientes = useMemo(() => {
    if (!clienteSearch) return clientes.slice(0, 50);
    const search = clienteSearch.toLowerCase();
    return clientes.filter(c => c.nome.toLowerCase().includes(search)).slice(0, 50);
  }, [clientes, clienteSearch]);

  // Get pedidos for selected client - sorted from most recent (highest number) to oldest
  const pedidosForClient = useMemo(() => {
    if (!selectedClienteCodigo) return [];
    const pedidos = pedidosByCliente.get(selectedClienteCodigo) || [];
    return [...pedidos].sort((a, b) => Number(b) - Number(a));
  }, [selectedClienteCodigo, pedidosByCliente]);

  // Filtered pedidos for autocomplete
  const filteredPedidos = useMemo(() => {
    if (!pedidoSearch) return pedidosForClient.slice(0, 80);
    return pedidosForClient.filter(p => p.includes(pedidoSearch)).slice(0, 80);
  }, [pedidosForClient, pedidoSearch]);

  // Get NFs for selected pedido
  const nfsForPedido = useMemo(() => {
    if (!form.numero_pedido) return [];
    return nfsByPedido.get(form.numero_pedido) || [];
  }, [form.numero_pedido, nfsByPedido]);

  const resetForm = () => {
    setForm({ numero_pedido: '', notas_fiscais: [], data_embarque: '', transportadora_id: null, transportadora_nome: '', valor_frete: 0, peso_kg: 0, data_entrega: null, observacoes: '', cliente_id: null, cliente_nome: null, cidade_entrega: null, uf_entrega: 'RS' });
    setSelectedClienteCodigo(null);
    setNfInput('');
    setValorFreteStr('');
    setPesoKgStr('');
  };

  // Calculate weight from NFs
  const calcPesoFromNfs = (nfs: string[]) => {
    let total = 0;
    nfs.forEach(nf => {
      total += pesoByNf.get(nf) || 0;
    });
    return total;
  };

  const handleClienteSelect = (codigo: string) => {
    const cliente = clientes.find(c => c.codigo === codigo);
    setSelectedClienteCodigo(codigo);
    setForm(p => ({ ...p, cliente_id: null, cliente_nome: cliente?.nome || '', numero_pedido: '', notas_fiscais: [] }));
    setClienteOpen(false);
    setPesoKgStr('');
    setValorFreteStr('');
  };

  const handlePedidoChange = (pedido: string) => {
    const autoNfs = nfsByPedido.get(pedido) || [];
    const autoPeso = calcPesoFromNfs(autoNfs);
    setForm(p => ({ ...p, numero_pedido: pedido, notas_fiscais: autoNfs, peso_kg: autoPeso }));
    setPesoKgStr(autoPeso > 0 ? String(autoPeso) : '');
    setPedidoOpen(false);
    setPedidoSearch('');
  };

  const handleTransportadoraChange = (transportadoraId: string) => {
    const t = transportadoras.find(t => t.id === transportadoraId);
    setForm(p => ({ ...p, transportadora_id: transportadoraId, transportadora_nome: t?.nome || '' }));
  };

  const addNf = () => {
    const nf = nfInput.trim();
    if (nf && !form.notas_fiscais.includes(nf)) {
      const newNfs = [...form.notas_fiscais, nf];
      const newPeso = calcPesoFromNfs(newNfs);
      setForm(p => ({ ...p, notas_fiscais: newNfs, peso_kg: newPeso }));
      setPesoKgStr(newPeso > 0 ? String(newPeso) : '');
      setNfInput('');
    }
  };

  const removeNf = (nf: string) => {
    const newNfs = form.notas_fiscais.filter(n => n !== nf);
    const newPeso = calcPesoFromNfs(newNfs);
    setForm(p => ({ ...p, notas_fiscais: newNfs, peso_kg: newPeso }));
    setPesoKgStr(newPeso > 0 ? String(newPeso) : '');
  };

  const handleValorFreteChange = (value: string) => {
    // Remove leading zeros but allow empty string
    const cleaned = value.replace(/^0+(?=\d)/, '');
    setValorFreteStr(cleaned);
    setForm(p => ({ ...p, valor_frete: parseFloat(cleaned) || 0 }));
  };

  const handlePesoKgChange = (value: string) => {
    const cleaned = value.replace(/^0+(?=\d)/, '');
    setPesoKgStr(cleaned);
    setForm(p => ({ ...p, peso_kg: parseFloat(cleaned) || 0 }));
  };

  const handleSave = async () => {
    if (!form.cliente_nome || !form.numero_pedido || !form.data_embarque || !form.transportadora_nome) {
      toast({ title: 'Campos obrigatórios', description: 'Preencha cliente, pedido, data de embarque e transportadora.', variant: 'destructive' });
      return;
    }
    try {
      setSaving(true);
      if (editingFrete) {
        await updateFrete(editingFrete.id, form);
        toast({ title: 'Frete atualizado com sucesso!' });
      } else {
        await insertFrete(form);
        toast({ title: 'Frete cadastrado com sucesso!' });
      }
      onOpenChange(false);
      resetForm();
      onSaved();
    } catch (err: any) {
      toast({ title: 'Erro ao salvar', description: err.message, variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  const selectedClienteName = clientes.find(c => c.codigo === selectedClienteCodigo)?.nome;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{editingFrete ? 'Editar Frete' : 'Novo Frete'}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          {/* Cliente */}
          <div>
            <label className="text-sm font-medium">Cliente *</label>
            <Popover open={clienteOpen} onOpenChange={setClienteOpen}>
              <PopoverTrigger asChild>
                <Button variant="outline" role="combobox" className="w-full justify-between mt-1">
                  {selectedClienteName || 'Selecione o cliente...'}
                  <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-full p-0 min-w-[350px]" align="start">
                <Command shouldFilter={false}>
                  <CommandInput placeholder="Buscar cliente..." value={clienteSearch} onValueChange={setClienteSearch} />
                  <CommandEmpty>Nenhum cliente encontrado.</CommandEmpty>
                  <CommandGroup className="max-h-60 overflow-auto">
                    {filteredClientes.map(c => (
                      <CommandItem key={c.codigo} value={c.codigo} onSelect={() => handleClienteSelect(c.codigo)}>
                        <Check className={cn("mr-2 h-4 w-4", selectedClienteCodigo === c.codigo ? "opacity-100" : "opacity-0")} />
                        {c.nome}
                      </CommandItem>
                    ))}
                  </CommandGroup>
                </Command>
              </PopoverContent>
            </Popover>
          </div>

          {/* Pedido - Autocomplete */}
          <div>
            <label className="text-sm font-medium">Nº Pedido *</label>
            {selectedClienteCodigo ? (
              <Popover open={pedidoOpen} onOpenChange={setPedidoOpen}>
                <PopoverTrigger asChild>
                  <Button variant="outline" role="combobox" className="w-full justify-between mt-1">
                    {form.numero_pedido || 'Selecione ou digite o pedido...'}
                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-full p-0 min-w-[350px]" align="start">
                  <Command shouldFilter={false}>
                    <CommandInput placeholder="Buscar pedido..." value={pedidoSearch} onValueChange={setPedidoSearch} />
                    <CommandEmpty>Nenhum pedido encontrado.</CommandEmpty>
                    <CommandGroup className="max-h-60 overflow-auto">
                      {filteredPedidos.map(p => (
                        <CommandItem key={p} value={p} onSelect={() => handlePedidoChange(p)}>
                          <Check className={cn("mr-2 h-4 w-4", form.numero_pedido === p ? "opacity-100" : "opacity-0")} />
                          {p}
                        </CommandItem>
                      ))}
                    </CommandGroup>
                  </Command>
                </PopoverContent>
              </Popover>
            ) : (
              <Input disabled placeholder="Selecione um cliente primeiro" className="mt-1" />
            )}
          </div>

          {/* Notas Fiscais */}
          <div>
            <label className="text-sm font-medium">Notas Fiscais</label>
            {form.notas_fiscais.length > 0 && (
              <div className="flex flex-wrap gap-1 mt-1 mb-2">
                {form.notas_fiscais.map(nf => (
                  <Badge key={nf} variant="secondary" className="gap-1">
                    {nf}
                    <X className="h-3 w-3 cursor-pointer" onClick={() => removeNf(nf)} />
                  </Badge>
                ))}
              </div>
            )}
            <div className="flex gap-2">
              <Input value={nfInput} onChange={e => setNfInput(e.target.value)} placeholder="Adicionar NF manualmente" onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), addNf())} />
              <Button type="button" variant="outline" onClick={addNf}>Adicionar</Button>
            </div>
          </div>

          {/* Data Embarque */}
          <div>
            <label className="text-sm font-medium">Data de Embarque *</label>
            <Input type="date" value={form.data_embarque} onChange={e => setForm(p => ({ ...p, data_embarque: e.target.value }))} className="mt-1" />
          </div>

          {/* Transportadora */}
          <div>
            <label className="text-sm font-medium">Transportadora *</label>
            <Select value={form.transportadora_id || ''} onValueChange={handleTransportadoraChange}>
              <SelectTrigger className="mt-1"><SelectValue placeholder="Selecione a transportadora" /></SelectTrigger>
              <SelectContent>
                {transportadoras.map(t => (
                  <SelectItem key={t.id} value={t.id}>{t.nome}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Valor */}
          <div>
            <label className="text-sm font-medium">Valor do Frete (R$)</label>
            <Input
              type="number"
              min={0}
              step={0.01}
              value={valorFreteStr}
              onChange={e => handleValorFreteChange(e.target.value)}
              placeholder="Digite o valor"
              className="mt-1"
            />
          </div>

          {/* Peso */}
          <div>
            <label className="text-sm font-medium">Peso (kg)</label>
            <Input
              type="number"
              min={0}
              step={0.01}
              value={pesoKgStr}
              onChange={e => handlePesoKgChange(e.target.value)}
              placeholder="Digite o peso"
              className="mt-1"
            />
            <p className="text-xs text-muted-foreground mt-1">Peso puxado automaticamente das NFs. Ajuste manualmente se necessário.</p>
          </div>

          {/* R$/ton */}
          {form.valor_frete > 0 && (form.peso_kg || 0) > 0 && (
            <div className="p-3 rounded-md bg-muted">
              <span className="text-sm font-medium">R$/ton: </span>
              <span className="text-sm font-bold text-primary">
                {((form.valor_frete / (form.peso_kg || 1)) * 1000).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}/ton
              </span>
            </div>
          )}

          {/* UF / Cidade de Entrega */}
          <div className="grid grid-cols-3 gap-2">
            <div>
              <label className="text-sm font-medium">UF</label>
              <Select value={form.uf_entrega || 'RS'} onValueChange={uf => setForm(p => ({ ...p, uf_entrega: uf, cidade_entrega: null }))}>
                <SelectTrigger className="mt-1"><SelectValue placeholder="UF" /></SelectTrigger>
                <SelectContent>
                  {estados.map(e => (
                    <SelectItem key={e.uf} value={e.uf}>{e.uf}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="col-span-2">
              <label className="text-sm font-medium">Cidade de Entrega</label>
              <Popover open={cidadeOpen} onOpenChange={setCidadeOpen}>
                <PopoverTrigger asChild>
                  <Button variant="outline" role="combobox" className="w-full justify-between mt-1">
                    {form.cidade_entrega || 'Selecione a cidade...'}
                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-full p-0 min-w-[300px]" align="start">
                  <Command>
                    <CommandInput placeholder="Buscar cidade..." value={cidadeSearch} onValueChange={setCidadeSearch} />
                    <CommandEmpty>Nenhuma cidade encontrada.</CommandEmpty>
                    <CommandGroup className="max-h-60 overflow-auto">
                      {filteredCidades.map(c => (
                        <CommandItem key={c} value={c} onSelect={() => { setForm(p => ({ ...p, cidade_entrega: c })); setCidadeOpen(false); setCidadeSearch(''); }}>
                          <Check className={cn("mr-2 h-4 w-4", form.cidade_entrega === c ? "opacity-100" : "opacity-0")} />
                          {c}
                        </CommandItem>
                      ))}
                    </CommandGroup>
                  </Command>
                </PopoverContent>
              </Popover>
            </div>
          </div>

          {/* Data Entrega */}
          <div>
            <label className="text-sm font-medium">Data da Entrega</label>
            <Input type="date" value={form.data_entrega || ''} onChange={e => setForm(p => ({ ...p, data_entrega: e.target.value || null }))} className="mt-1" />
          </div>

          {/* Observações */}
          <div>
            <label className="text-sm font-medium">Observações</label>
            <Textarea value={form.observacoes || ''} onChange={e => setForm(p => ({ ...p, observacoes: e.target.value }))} rows={2} className="mt-1" />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button onClick={handleSave} disabled={saving}>{saving ? 'Salvando...' : editingFrete ? 'Salvar' : 'Cadastrar'}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
