import React, { useState, useEffect, useMemo } from 'react';
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
import { type Frete, type FreteInsert, type Transportadora, insertFrete, updateFrete, loadPedidosByCliente } from '@/services/fretesService';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editingFrete: Frete | null;
  clientes: Array<{ id: string; nome: string }>;
  transportadoras: Transportadora[];
  onSaved: () => void;
}

export function FreteFormDialog({ open, onOpenChange, editingFrete, clientes, transportadoras, onSaved }: Props) {
  const { toast } = useToast();
  const [saving, setSaving] = useState(false);
  const [clienteOpen, setClienteOpen] = useState(false);
  const [clienteSearch, setClienteSearch] = useState('');
  const [selectedClienteId, setSelectedClienteId] = useState<string | null>(null);
  const [pedidos, setPedidos] = useState<Array<{ id: string; numero_pedido: string }>>([]);
  const [loadingPedidos, setLoadingPedidos] = useState(false);
  const [nfInput, setNfInput] = useState('');

  const [form, setForm] = useState<FreteInsert>({
    numero_pedido: '',
    notas_fiscais: [],
    data_embarque: '',
    transportadora_id: null,
    transportadora_nome: '',
    valor_frete: 0,
    data_entrega: null,
    observacoes: '',
    cliente_id: null,
    cliente_nome: null,
  });

  useEffect(() => {
    if (editingFrete) {
      setSelectedClienteId(editingFrete.cliente_id);
      setForm({
        numero_pedido: editingFrete.numero_pedido,
        notas_fiscais: editingFrete.notas_fiscais || [],
        data_embarque: editingFrete.data_embarque,
        transportadora_id: editingFrete.transportadora_id,
        transportadora_nome: editingFrete.transportadora_nome,
        valor_frete: editingFrete.valor_frete,
        data_entrega: editingFrete.data_entrega,
        observacoes: editingFrete.observacoes || '',
        cliente_id: editingFrete.cliente_id,
        cliente_nome: editingFrete.cliente_nome,
      });
    } else {
      resetForm();
    }
  }, [editingFrete, open]);

  useEffect(() => {
    if (selectedClienteId) {
      setLoadingPedidos(true);
      loadPedidosByCliente(selectedClienteId)
        .then(setPedidos)
        .catch(() => setPedidos([]))
        .finally(() => setLoadingPedidos(false));
    } else {
      setPedidos([]);
    }
  }, [selectedClienteId]);

  const filteredClientes = useMemo(() => {
    if (!clienteSearch) return clientes.slice(0, 50);
    const search = clienteSearch.toLowerCase();
    return clientes.filter(c => c.nome.toLowerCase().includes(search)).slice(0, 50);
  }, [clientes, clienteSearch]);

  const resetForm = () => {
    setForm({ numero_pedido: '', notas_fiscais: [], data_embarque: '', transportadora_id: null, transportadora_nome: '', valor_frete: 0, data_entrega: null, observacoes: '', cliente_id: null, cliente_nome: null });
    setSelectedClienteId(null);
    setNfInput('');
    setPedidos([]);
  };

  const handleClienteSelect = (clienteId: string) => {
    const cliente = clientes.find(c => c.id === clienteId);
    setSelectedClienteId(clienteId);
    setForm(p => ({ ...p, cliente_id: clienteId, cliente_nome: cliente?.nome || '', numero_pedido: '' }));
    setClienteOpen(false);
  };

  const handleTransportadoraChange = (transportadoraId: string) => {
    const t = transportadoras.find(t => t.id === transportadoraId);
    setForm(p => ({ ...p, transportadora_id: transportadoraId, transportadora_nome: t?.nome || '' }));
  };

  const addNf = () => {
    const nf = nfInput.trim();
    if (nf && !form.notas_fiscais.includes(nf)) {
      setForm(p => ({ ...p, notas_fiscais: [...p.notas_fiscais, nf] }));
      setNfInput('');
    }
  };

  const removeNf = (nf: string) => {
    setForm(p => ({ ...p, notas_fiscais: p.notas_fiscais.filter(n => n !== nf) }));
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

  const selectedClienteName = clientes.find(c => c.id === selectedClienteId)?.nome;

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
                <Command>
                  <CommandInput placeholder="Buscar cliente..." value={clienteSearch} onValueChange={setClienteSearch} />
                  <CommandEmpty>Nenhum cliente encontrado.</CommandEmpty>
                  <CommandGroup className="max-h-60 overflow-auto">
                    {filteredClientes.map(c => (
                      <CommandItem key={c.id} value={c.nome} onSelect={() => handleClienteSelect(c.id)}>
                        <Check className={cn("mr-2 h-4 w-4", selectedClienteId === c.id ? "opacity-100" : "opacity-0")} />
                        {c.nome}
                      </CommandItem>
                    ))}
                  </CommandGroup>
                </Command>
              </PopoverContent>
            </Popover>
          </div>

          {/* Pedido */}
          <div>
            <label className="text-sm font-medium">Nº Pedido *</label>
            {selectedClienteId ? (
              <Select value={form.numero_pedido} onValueChange={v => setForm(p => ({ ...p, numero_pedido: v }))}>
                <SelectTrigger className="mt-1">
                  <SelectValue placeholder={loadingPedidos ? 'Carregando...' : 'Selecione o pedido'} />
                </SelectTrigger>
                <SelectContent>
                  {pedidos.map(p => (
                    <SelectItem key={p.id} value={p.numero_pedido}>{p.numero_pedido}</SelectItem>
                  ))}
                  {pedidos.length === 0 && !loadingPedidos && (
                    <div className="p-2 text-sm text-muted-foreground text-center">Nenhum pedido encontrado</div>
                  )}
                </SelectContent>
              </Select>
            ) : (
              <Input disabled placeholder="Selecione um cliente primeiro" className="mt-1" />
            )}
          </div>

          {/* Notas Fiscais */}
          <div>
            <label className="text-sm font-medium">Notas Fiscais</label>
            <div className="flex gap-2 mt-1">
              <Input value={nfInput} onChange={e => setNfInput(e.target.value)} placeholder="Nº da NF" onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), addNf())} />
              <Button type="button" variant="outline" onClick={addNf}>Adicionar</Button>
            </div>
            {form.notas_fiscais.length > 0 && (
              <div className="flex flex-wrap gap-1 mt-2">
                {form.notas_fiscais.map(nf => (
                  <Badge key={nf} variant="secondary" className="gap-1">
                    {nf}
                    <X className="h-3 w-3 cursor-pointer" onClick={() => removeNf(nf)} />
                  </Badge>
                ))}
              </div>
            )}
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
            <Input type="number" min={0} step={0.01} value={form.valor_frete} onChange={e => setForm(p => ({ ...p, valor_frete: parseFloat(e.target.value) || 0 }))} className="mt-1" />
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
