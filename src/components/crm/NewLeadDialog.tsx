
import { useEffect, useState, useMemo } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Plus, ChevronsUpDown, Check } from 'lucide-react';
import { cn } from '@/lib/utils';

interface NewLeadDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onLeadCreated: () => void;
}

interface Cliente {
  id: string;
  nome: string;
  telefone: string | null;
  email: string | null;
  cnpj: string | null;
  cidade: string | null;
  estado: string | null;
  segmento: string | null;
}

const DEFAULT_ORIGENS_FALLBACK = ['Indicação', 'Site', 'WhatsApp', 'Telefone', 'Visita', 'Feira/Evento', 'LinkedIn', 'Outro'];

export function NewLeadDialog({ open, onOpenChange, onLeadCreated }: NewLeadDialogProps) {
  const [loading, setLoading] = useState(false);
  const [origens, setOrigens] = useState<string[]>([]);
  const [addingOrigem, setAddingOrigem] = useState(false);
  const [novaOrigem, setNovaOrigem] = useState('');
  const [isClienteDaBase, setIsClienteDaBase] = useState(false);
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [clienteSearch, setClienteSearch] = useState('');
  const [clientePopoverOpen, setClientePopoverOpen] = useState(false);
  const [selectedCliente, setSelectedCliente] = useState<Cliente | null>(null);
  const [form, setForm] = useState({
    empresa: '',
    cliente_nome: '',
    source: '',
    cliente_telefone: '',
    cliente_email: '',
    website: '',
    status: 'lead',
    produto_interesse: '',
    notes: '',
  });
  const { toast } = useToast();

  const loadOrigens = async () => {
    const { data, error } = await (supabase as any)
      .from('crm_lead_sources')
      .select('id, name')
      .eq('is_active', true)
      .order('display_order', { ascending: true })
      .order('name', { ascending: true });

    if (error) {
      console.error('Erro ao carregar origens:', error);
      setOrigens(DEFAULT_ORIGENS_FALLBACK);
      return;
    }

    const names = (data || []).map((d: any) => d.name);
    setOrigens(names.length > 0 ? names : DEFAULT_ORIGENS_FALLBACK);
  };

  const loadClientes = async () => {
    try {
      const allClients: Cliente[] = [];
      const pageSize = 1000;
      let from = 0;
      let hasMore = true;

      while (hasMore) {
        const { data, error } = await (supabase as any)
          .from('clientes')
          .select('id, nome, telefone, email, cnpj, cidade, estado, segmento')
          .order('nome')
          .range(from, from + pageSize - 1);

        if (error) {
          console.error('Erro ao carregar clientes:', error);
          break;
        }

        allClients.push(...(data || []));
        hasMore = (data?.length || 0) === pageSize;
        from += pageSize;
      }

      console.log('Clientes carregados:', allClients.length);
      setClientes(allClients);
    } catch (err) {
      console.error('Erro inesperado ao carregar clientes:', err);
    }
  };

  useEffect(() => {
    if (open) {
      loadOrigens();
      loadClientes();
    }
  }, [open]);

  const filteredClientes = useMemo(() => {
    if (!clienteSearch) return clientes.slice(0, 50);
    const q = clienteSearch.toLowerCase();
    return clientes.filter(c =>
      c.nome.toLowerCase().includes(q) ||
      c.cnpj?.toLowerCase().includes(q) ||
      c.telefone?.toLowerCase().includes(q)
    ).slice(0, 50);
  }, [clientes, clienteSearch]);

  const handleSelectCliente = (cliente: Cliente) => {
    setSelectedCliente(cliente);
    setForm(f => ({
      ...f,
      empresa: cliente.nome,
      cliente_telefone: cliente.telefone || '',
      cliente_email: cliente.email || '',
    }));
    setClientePopoverOpen(false);
    setClienteSearch('');
  };

  const resetForm = () => {
    setForm({
      empresa: '', cliente_nome: '', source: '', cliente_telefone: '',
      cliente_email: '', website: '', status: 'lead', produto_interesse: '', notes: '',
    });
    setAddingOrigem(false);
    setNovaOrigem('');
    setIsClienteDaBase(false);
    setSelectedCliente(null);
    setClienteSearch('');
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
      await loadOrigens();
      setForm(f => ({ ...f, source: trimmed }));
      toast({ title: 'Origem adicionada!' });
    } catch (error: any) {
      console.error('Erro ao adicionar origem:', error);
      toast({ title: 'Erro ao adicionar origem', description: error.message, variant: 'destructive' });
    } finally {
      setNovaOrigem('');
      setAddingOrigem(false);
    }
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
        status: 'lead',
        produto_interesse: form.produto_interesse || null,
        website: form.website.trim() || null,
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
          {/* Cliente da Base toggle */}
          <div className="flex items-center gap-3 p-3 rounded-md bg-muted/50 border">
            <Switch
              checked={isClienteDaBase}
              onCheckedChange={(checked) => {
                setIsClienteDaBase(checked);
                if (!checked) {
                  setSelectedCliente(null);
                  setForm(f => ({ ...f, empresa: '', cliente_telefone: '', cliente_email: '' }));
                }
              }}
              id="cliente-base"
            />
            <Label htmlFor="cliente-base" className="text-sm cursor-pointer">
              Cliente da Base
            </Label>
          </div>

          {/* Cliente da Base selector */}
          {isClienteDaBase && (
            <div className="space-y-1.5">
              <Label>Selecionar Cliente</Label>
              <Popover open={clientePopoverOpen} onOpenChange={setClientePopoverOpen}>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    role="combobox"
                    className="w-full justify-between font-normal"
                  >
                    <span className="truncate">
                      {selectedCliente ? selectedCliente.nome : 'Buscar cliente...'}
                    </span>
                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
                  <Command shouldFilter={false}>
                    <CommandInput
                      placeholder="Digite o nome, CNPJ ou telefone..."
                      value={clienteSearch}
                      onValueChange={setClienteSearch}
                    />
                    <CommandList>
                      <CommandEmpty className="py-3 text-center text-sm">Nenhum cliente encontrado</CommandEmpty>
                      <CommandGroup>
                        {filteredClientes.map(cliente => (
                          <CommandItem
                            key={cliente.id}
                            value={cliente.id}
                            onSelect={() => handleSelectCliente(cliente)}
                          >
                            <Check
                              className={cn(
                                "mr-2 h-4 w-4",
                                selectedCliente?.id === cliente.id ? "opacity-100" : "opacity-0"
                              )}
                            />
                            <div className="flex-1 min-w-0">
                              <div className="text-sm font-medium truncate">{cliente.nome}</div>
                              <div className="text-xs text-muted-foreground">
                                {[cliente.cnpj, cliente.cidade, cliente.estado].filter(Boolean).join(' · ')}
                              </div>
                            </div>
                          </CommandItem>
                        ))}
                      </CommandGroup>
                    </CommandList>
                  </Command>
                </PopoverContent>
              </Popover>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Empresa - FIRST and required */}
            <div className="space-y-1.5 sm:col-span-2">
              <Label htmlFor="empresa">Empresa *</Label>
              <Input
                id="empresa"
                value={form.empresa}
                onChange={(e) => setForm(f => ({ ...f, empresa: e.target.value }))}
                placeholder="Nome da empresa"
                disabled={isClienteDaBase && !!selectedCliente}
              />
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

            {/* Website / URL */}
            <div className="space-y-1.5 sm:col-span-2">
              <Label htmlFor="website">Site / URL</Label>
              <Input id="website" value={form.website} onChange={(e) => setForm(f => ({ ...f, website: e.target.value }))} placeholder="https://www.empresa.com.br" />
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
