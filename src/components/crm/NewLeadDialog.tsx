import { useEffect, useState, useMemo, useCallback } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useComercial } from '@/context/ComercialContext';
import { Plus, ChevronsUpDown, Check, RotateCcw, History, AlertTriangle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useDebounce } from '@/hooks/useDebounce';

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

interface ExistingLead {
  id: string;
  cliente_nome: string;
  empresa: string | null;
  cliente_telefone: string | null;
  cliente_email: string | null;
  cliente_cnpj: string | null;
  source: string | null;
  produto_interesse: string | null;
  notes: string | null;
  website: string | null;
  ramo_atuacao: string | null;
  regime_tributario: string | null;
  estado: string | null;
  cidade: string | null;
  status: string;
  contact_name: string | null;
  contact_phone: string | null;
  contact_email: string | null;
  finance_parecer: string | null;
  budget_number: string | null;
  linked_orders_meta: any;
}

const DEFAULT_ORIGENS_FALLBACK = ['Indicação', 'Site', 'WhatsApp', 'Telefone', 'Visita', 'Feira/Evento', 'LinkedIn', 'Outro'];

export function NewLeadDialog({ open, onOpenChange, onLeadCreated }: NewLeadDialogProps) {
  const [loading, setLoading] = useState(false);
  const [origens, setOrigens] = useState<string[]>([]);
  const [addingOrigem, setAddingOrigem] = useState(false);
  const [novaOrigem, setNovaOrigem] = useState('');
  const [isClienteDaBase, setIsClienteDaBase] = useState(false);
  const [isLeadExistente, setIsLeadExistente] = useState(false);
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [existingLeads, setExistingLeads] = useState<ExistingLead[]>([]);
  const [clienteSearch, setClienteSearch] = useState('');
  const [leadSearch, setLeadSearch] = useState('');
  const [clientePopoverOpen, setClientePopoverOpen] = useState(false);
  const [leadPopoverOpen, setLeadPopoverOpen] = useState(false);
  const [selectedCliente, setSelectedCliente] = useState<Cliente | null>(null);
  const [selectedLead, setSelectedLead] = useState<ExistingLead | null>(null);
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
    cliente_cnpj: '',
    estado: '',
    cidade: '',
    regime_tributario: '',
    ramo_atuacao: '',
  });
  const { toast } = useToast();
  const { data: comercialData } = useComercial();

  // Duplicate detection state
  interface DuplicateMatch {
    id?: string;
    type: 'lead' | 'cliente';
    name: string;
    matchField: string;
    matchValue: string;
    status?: string;
    blockedReason?: string | null;
  }
  const [duplicateMatches, setDuplicateMatches] = useState<DuplicateMatch[]>([]);
  const debouncedPhone = useDebounce(form.cliente_telefone, 500);
  const debouncedCnpj = useDebounce(form.cliente_cnpj, 500);

  const normalizePhone = (phone: string) => phone.replace(/\D/g, '');
  const normalizeCnpj = (cnpj: string) => cnpj.replace(/\D/g, '');

  const checkDuplicates = useCallback(async () => {
    const phone = normalizePhone(debouncedPhone);
    const cnpj = normalizeCnpj(debouncedCnpj);
    if (phone.length < 8 && cnpj.length < 11) {
      setDuplicateMatches([]);
      return;
    }

    const matches: DuplicateMatch[] = [];

    try {
      // Check leads
      if (phone.length >= 8) {
        const { data: phoneLeads } = await (supabase as any)
          .from('leads')
          .select('id, cliente_nome, empresa, cliente_telefone, contact_phone, status')
          .or(`cliente_telefone.ilike.%${phone.slice(-8)}%,contact_phone.ilike.%${phone.slice(-8)}%`)
          .limit(5);
        (phoneLeads || []).forEach((l: any) => {
          if (!selectedLead || l.id !== selectedLead.id) {
            matches.push({
              id: l.id,
              type: 'lead',
              name: l.empresa || l.cliente_nome,
              matchField: 'Telefone',
              matchValue: l.cliente_telefone || l.contact_phone || '',
              status: l.status,
            });
          }
        });
      }

      if (cnpj.length >= 11) {
        const { data: cnpjLeads } = await (supabase as any)
          .from('leads')
          .select('id, cliente_nome, empresa, cliente_cnpj, status')
          .ilike('cliente_cnpj', `%${cnpj}%`)
          .limit(5);
        (cnpjLeads || []).forEach((l: any) => {
          if ((!selectedLead || l.id !== selectedLead.id) && !matches.some(m => m.type === 'lead' && m.name === (l.empresa || l.cliente_nome))) {
            matches.push({
              id: l.id,
              type: 'lead',
              name: l.empresa || l.cliente_nome,
              matchField: 'CNPJ',
              matchValue: l.cliente_cnpj || '',
              status: l.status,
            });
          }
        });
      }

      // Check clients table
      if (phone.length >= 8) {
        const { data: phoneClients } = await (supabase as any)
          .from('clientes')
          .select('id, nome, telefone')
          .ilike('telefone', `%${phone.slice(-8)}%`)
          .limit(5);
        (phoneClients || []).forEach((c: any) => {
          if (!matches.some(m => m.name === c.nome)) {
            matches.push({
              type: 'cliente',
              name: c.nome,
              matchField: 'Telefone',
              matchValue: c.telefone || '',
            });
          }
        });
      }

      if (cnpj.length >= 11) {
        const { data: cnpjClients } = await (supabase as any)
          .from('clientes')
          .select('id, nome, cnpj')
          .ilike('cnpj', `%${cnpj}%`)
          .limit(5);
        (cnpjClients || []).forEach((c: any) => {
          if (!matches.some(m => m.name === c.nome)) {
            matches.push({
              type: 'cliente',
              name: c.nome,
              matchField: 'CNPJ',
              matchValue: c.cnpj || '',
            });
          }
        });
      }
    } catch (err) {
      console.error('Erro ao verificar duplicatas:', err);
    }

    // Enriquece com motivo bloqueante (lead_dispositions) para destacar leads que NÃO devem ser recontatados
    const leadIds = matches.filter(m => m.type === 'lead' && m.id).map(m => m.id!) as string[];
    if (leadIds.length > 0) {
      try {
        const { data: disps } = await (supabase as any)
          .from('lead_dispositions')
          .select('lead_id, reason, custom_reason')
          .eq('disposition_type', 'lost')
          .in('lead_id', leadIds);
        const blockedById: Record<string, string> = {};
        (disps || []).forEach((d: any) => {
          const r = d.reason || d.custom_reason || '';
          if (isBlockedLossReason(r)) blockedById[d.lead_id] = r;
        });
        matches.forEach(m => {
          if (m.id && blockedById[m.id]) m.blockedReason = blockedById[m.id];
        });
      } catch {}
    }

    setDuplicateMatches(matches);
  }, [debouncedPhone, debouncedCnpj, selectedLead]);

  useEffect(() => {
    if (open) {
      checkDuplicates();
    }
  }, [debouncedPhone, debouncedCnpj, open, checkDuplicates]);

  const clientesDaBaseComercial = useMemo(() => {
    if (!comercialData?.length) return [] as Cliente[];
    const map = new Map<string, Cliente>();
    comercialData.forEach((item) => {
      const nome = item.cliente?.trim();
      if (!nome) return;
      const key = nome.toLowerCase();
      const existing = map.get(key);
      if (!existing) {
        map.set(key, {
          id: `base-${item.codigocliente || nome}`, nome,
          telefone: null, email: null,
          cnpj: item.codigocliente || null,
          cidade: item.cli_cidade || null, estado: item.uf || null,
          segmento: item.classe || null,
        });
        return;
      }
      map.set(key, {
        ...existing,
        cidade: existing.cidade || item.cli_cidade || null,
        estado: existing.estado || item.uf || null,
        segmento: existing.segmento || item.classe || null,
      });
    });
    return Array.from(map.values()).sort((a, b) => a.nome.localeCompare(b.nome));
  }, [comercialData]);

  const loadOrigens = async () => {
    const { data, error } = await (supabase as any)
      .from('crm_lead_sources')
      .select('id, name')
      .eq('is_active', true)
      .order('name', { ascending: true });
    if (error) { setOrigens(DEFAULT_ORIGENS_FALLBACK); return; }
    const names = (data || []).map((d: any) => d.name).sort((a: string, b: string) => a.localeCompare(b));
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
          .from('clientes').select('id, nome, telefone, email, cnpj, cidade, estado, segmento')
          .order('nome').range(from, from + pageSize - 1);
        if (error) break;
        allClients.push(...(data || []));
        hasMore = (data?.length || 0) === pageSize;
        from += pageSize;
      }
      const merged = new Map<string, Cliente>();
      allClients.forEach((c) => merged.set(c.nome.toLowerCase(), c));
      clientesDaBaseComercial.forEach((cb) => {
        const key = cb.nome.toLowerCase();
        const existing = merged.get(key);
        if (!existing) { merged.set(key, cb); return; }
        merged.set(key, { ...existing, cidade: existing.cidade || cb.cidade, estado: existing.estado || cb.estado, segmento: existing.segmento || cb.segmento });
      });
      setClientes(Array.from(merged.values()).sort((a, b) => a.nome.localeCompare(b.nome)));
    } catch { setClientes(clientesDaBaseComercial); }
  };

  const loadExistingLeads = async () => {
    try {
      const { data } = await (supabase as any)
        .from('leads')
        .select('id, cliente_nome, empresa, cliente_telefone, cliente_email, cliente_cnpj, source, produto_interesse, notes, website, ramo_atuacao, regime_tributario, estado, cidade, status, contact_name, contact_phone, contact_email, finance_parecer, budget_number, linked_orders_meta')
        .order('updated_at', { ascending: false });
      // Deduplicate by empresa/cliente_nome — keep the most recent (first in list since ordered by updated_at desc)
      const seen = new Map<string, ExistingLead>();
      (data || []).forEach((lead: ExistingLead) => {
        const key = (lead.empresa || lead.cliente_nome || '').toLowerCase().trim();
        if (key && !seen.has(key)) {
          seen.set(key, lead);
        }
      });
      setExistingLeads(Array.from(seen.values()));
    } catch { setExistingLeads([]); }
  };

  useEffect(() => {
    if (open) {
      loadOrigens();
      loadClientes();
      loadExistingLeads();
    }
  }, [open, clientesDaBaseComercial]);

  const filteredClientes = useMemo(() => {
    if (!clienteSearch) return clientes.slice(0, 50);
    const q = clienteSearch.toLowerCase();
    return clientes.filter(c =>
      c.nome.toLowerCase().includes(q) || c.cnpj?.toLowerCase().includes(q) || c.telefone?.toLowerCase().includes(q)
    ).slice(0, 50);
  }, [clientes, clienteSearch]);

  const filteredLeads = useMemo(() => {
    if (!leadSearch) return existingLeads.slice(0, 50);
    const q = leadSearch.toLowerCase();
    return existingLeads.filter(l =>
      l.cliente_nome?.toLowerCase().includes(q) ||
      l.empresa?.toLowerCase().includes(q) ||
      l.cliente_cnpj?.toLowerCase().includes(q) ||
      l.cliente_telefone?.toLowerCase().includes(q)
    ).slice(0, 50);
  }, [existingLeads, leadSearch]);

  const statusLabel = (s: string) => {
    const map: Record<string, string> = {
      lead: 'Lead', contato_feito: 'Contato Feito', visita_reuniao: 'Visita/Reunião',
      proposta: 'Proposta', pedido: 'Pedido', perdido: 'Perdido', novo: 'Novo',
    };
    return map[s] || s;
  };

  const handleSelectCliente = (cliente: Cliente) => {
    setSelectedCliente(cliente);
    setForm(f => ({
      ...f,
      empresa: cliente.nome,
      cliente_telefone: cliente.telefone || '',
      cliente_email: cliente.email || '',
      source: 'Carteira Global',
      cliente_cnpj: cliente.cnpj || '',
      estado: cliente.estado || '',
      cidade: cliente.cidade || '',
      ramo_atuacao: cliente.segmento || '',
    }));
    setClientePopoverOpen(false);
    setClienteSearch('');
  };

  const handleSelectLead = (lead: ExistingLead) => {
    setSelectedLead(lead);
    setForm({
      empresa: lead.empresa || lead.cliente_nome || '',
      cliente_nome: lead.contact_name || lead.cliente_nome || '',
      source: lead.source || '',
      cliente_telefone: lead.contact_phone || lead.cliente_telefone || '',
      cliente_email: lead.contact_email || lead.cliente_email || '',
      website: lead.website || '',
      status: 'lead',
      produto_interesse: lead.produto_interesse || '',
      notes: '',
      cliente_cnpj: lead.cliente_cnpj || '',
      estado: lead.estado || '',
      cidade: lead.cidade || '',
      regime_tributario: lead.regime_tributario || '',
      ramo_atuacao: lead.ramo_atuacao || '',
    });
    setLeadPopoverOpen(false);
    setLeadSearch('');
  };

  const resetForm = () => {
    setForm({ empresa: '', cliente_nome: '', source: '', cliente_telefone: '', cliente_email: '', website: '', status: 'lead', produto_interesse: '', notes: '', cliente_cnpj: '', estado: '', cidade: '', regime_tributario: '', ramo_atuacao: '' });
    setAddingOrigem(false);
    setNovaOrigem('');
    setIsClienteDaBase(false);
    setIsLeadExistente(false);
    setSelectedCliente(null);
    setSelectedLead(null);
    setClienteSearch('');
    setLeadSearch('');
    setDuplicateMatches([]);
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
      const empresaName = form.empresa.trim();
      const contactName = form.cliente_nome.trim() || empresaName;

      // Build insert payload — carry over all data from existing lead except order-related fields
      const insertPayload: Record<string, any> = {
        cliente_nome: empresaName,
        client_name: empresaName,
        empresa: empresaName,
        contact_name: form.cliente_nome.trim() || null,
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
        cliente_cnpj: form.cliente_cnpj.trim() || null,
        estado: form.estado.trim() || null,
        cidade: form.cidade.trim() || null,
        regime_tributario: form.regime_tributario || null,
        ramo_atuacao: form.ramo_atuacao.trim() || null,
      };

      // If creating from an existing lead, carry over enrichment data
      if (selectedLead) {
        // Only override if not already set from form
        if (!insertPayload.cliente_cnpj) insertPayload.cliente_cnpj = selectedLead.cliente_cnpj || null;
        if (!insertPayload.ramo_atuacao) insertPayload.ramo_atuacao = selectedLead.ramo_atuacao || null;
        if (!insertPayload.regime_tributario) insertPayload.regime_tributario = selectedLead.regime_tributario || null;
        if (!insertPayload.estado) insertPayload.estado = selectedLead.estado || null;
        if (!insertPayload.cidade) insertPayload.cidade = selectedLead.cidade || null;
        insertPayload.finance_parecer = selectedLead.finance_parecer || null;
      }

      const { data: newLead, error } = await (supabase as any).from('leads').insert(insertPayload).select('id').single();
      if (error) throw error;

       // If from existing lead, carry over the prior activity timeline and register the reopening event
      if (selectedLead && newLead?.id) {
         const { data: previousActivities } = await (supabase as any)
           .from('lead_activities')
           .select('activity_type, description, result, next_action, next_contact_date, sdr_id, sdr_name, created_at, conversation_started, user_id')
           .eq('lead_id', selectedLead.id)
           .order('created_at', { ascending: true });

         if (previousActivities?.length) {
           const clonedActivities = previousActivities.map((activity: any) => ({
             lead_id: newLead.id,
             user_id: activity.user_id || user?.id || '',
             activity_type: activity.activity_type,
             description: activity.description,
             result: activity.result || null,
             next_action: activity.next_action || null,
             next_contact_date: activity.next_contact_date || null,
             sdr_id: activity.sdr_id || null,
             sdr_name: activity.sdr_name || null,
             created_at: activity.created_at,
             conversation_started: activity.conversation_started ?? false,
           }));

           const { error: activitiesError } = await (supabase as any)
             .from('lead_activities')
             .insert(clonedActivities);

           if (activitiesError) throw activitiesError;
         }

        // Build rich reopening description with loss reason and/or order info
        let reopenDesc = `Lead reaberto a partir de negociação anterior (${selectedLead.empresa || selectedLead.cliente_nome}). Status anterior: ${statusLabel(selectedLead.status)}.`;

        // If lost, fetch the loss reason
        if (selectedLead.status === 'perdido') {
          const { data: disposition } = await (supabase as any)
            .from('lead_dispositions')
            .select('reason, custom_reason, notes, disposition_type')
            .eq('lead_id', selectedLead.id)
            .order('created_at', { ascending: false })
            .limit(1)
            .maybeSingle();

          if (disposition) {
            const reasonMap: Record<string, string> = {
              'preco': 'Preço',
              'concorrencia': 'Concorrência',
              'prazo': 'Prazo',
              'sem_retorno': 'Sem retorno',
              'sem_interesse': 'Sem interesse',
              'nao_atende': 'Não atende',
              'lost': 'Perdido',
              'outro': 'Outro',
            };
            const reasonLabel = reasonMap[disposition.reason] || disposition.reason || disposition.disposition_type || 'Não informado';
            const extra = disposition.custom_reason || disposition.notes || '';
            reopenDesc += ` Motivo da perda: ${reasonLabel}${extra ? ` — ${extra}` : ''}.`;
          }
        }

        // If had linked orders/budget, fetch order details
        if (selectedLead.budget_number) {
          const { data: orderData } = await (supabase as any)
            .from('pedidos')
            .select('numero_pedido, valor_total')
            .eq('numero_pedido', selectedLead.budget_number)
            .maybeSingle();

          if (orderData) {
            const valorFormatted = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(orderData.valor_total || 0);
            reopenDesc += ` Pedido anterior: ${orderData.numero_pedido} (${valorFormatted}).`;
          }
        }

        // Also check linked_orders_meta for order info
        if (selectedLead.linked_orders_meta && typeof selectedLead.linked_orders_meta === 'object') {
          const meta = selectedLead.linked_orders_meta as any;
          const orders = Array.isArray(meta) ? meta : (meta.orders || []);
          if (orders.length > 0) {
            const orderParts = orders.map((o: any) => {
              const val = o.valor_total ? new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(o.valor_total) : '';
              return `${o.numero_pedido || o.number || '?'}${val ? ` (${val})` : ''}`;
            });
            reopenDesc += ` Pedidos vinculados: ${orderParts.join(', ')}.`;
          }
        }

        await (supabase as any).from('lead_activities').insert({
          lead_id: newLead.id,
          activity_type: 'nota',
          description: reopenDesc,
          user_id: user?.id || '',
        });
      }

       toast({ title: `Lead ${empresaName} criado com sucesso!` });
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
          {/* Toggles */}
          <div className="flex flex-col gap-2">
            <div className="flex items-center gap-3 p-3 rounded-md bg-muted/50 border">
              <Switch
                checked={isClienteDaBase}
                onCheckedChange={(checked) => {
                  setIsClienteDaBase(checked);
                  if (checked) { setIsLeadExistente(false); setSelectedLead(null); }
                  if (!checked) { setSelectedCliente(null); setForm(f => ({ ...f, empresa: '', cliente_telefone: '', cliente_email: '' })); }
                }}
                id="cliente-base"
              />
              <Label htmlFor="cliente-base" className="text-sm cursor-pointer">Cliente da Base</Label>
            </div>

            <div className="flex items-center gap-3 p-3 rounded-md bg-muted/50 border">
              <Switch
                checked={isLeadExistente}
                onCheckedChange={(checked) => {
                  setIsLeadExistente(checked);
                  if (checked) { setIsClienteDaBase(false); setSelectedCliente(null); }
                  if (!checked) { setSelectedLead(null); resetForm(); }
                }}
                id="lead-existente"
              />
              <Label htmlFor="lead-existente" className="text-sm cursor-pointer flex items-center gap-1.5">
                <RotateCcw className="h-3.5 w-3.5" /> Lead Existente (Reabrir)
              </Label>
            </div>
          </div>

          {/* Existing Lead selector */}
          {isLeadExistente && (
            <div className="space-y-1.5">
              <Label>Selecionar Lead Anterior</Label>
              <Popover open={leadPopoverOpen} onOpenChange={setLeadPopoverOpen}>
                <PopoverTrigger asChild>
                  <Button variant="outline" role="combobox" className="w-full justify-between font-normal">
                    <span className="truncate">
                      {selectedLead ? `${selectedLead.empresa || selectedLead.cliente_nome} — ${statusLabel(selectedLead.status)}` : 'Buscar lead...'}
                    </span>
                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
                  <Command shouldFilter={false}>
                    <CommandInput placeholder="Nome, empresa, CNPJ ou telefone..." value={leadSearch} onValueChange={setLeadSearch} />
                    <CommandList className="max-h-[200px] overflow-y-auto">
                      {filteredLeads.length === 0 && <CommandEmpty className="py-3 text-center text-sm">Nenhum lead encontrado</CommandEmpty>}
                      <CommandGroup>
                        {filteredLeads.map(lead => (
                          <CommandItem key={lead.id} value={lead.id} onSelect={() => handleSelectLead(lead)}>
                            <Check className={cn("mr-2 h-4 w-4", selectedLead?.id === lead.id ? "opacity-100" : "opacity-0")} />
                            <div className="flex-1 min-w-0">
                              <div className="text-sm font-medium truncate flex items-center gap-1.5">
                                {lead.empresa || lead.cliente_nome}
                                <Badge variant="outline" className="text-[9px] h-4 shrink-0">{statusLabel(lead.status)}</Badge>
                              </div>
                              <div className="text-xs text-muted-foreground">
                                {[lead.cliente_cnpj, lead.cidade, lead.estado].filter(Boolean).join(' · ')}
                              </div>
                            </div>
                          </CommandItem>
                        ))}
                      </CommandGroup>
                    </CommandList>
                  </Command>
                </PopoverContent>
              </Popover>
              {selectedLead && (
                <div className="text-xs text-muted-foreground bg-muted/30 rounded p-2 mt-1 flex items-center gap-1.5">
                  <History className="h-3.5 w-3.5 shrink-0" />
                  Dados anteriores serão carregados automaticamente. O histórico completo ficará disponível no drawer do novo lead.
                </div>
              )}
            </div>
          )}

          {/* Cliente da Base selector */}
          {isClienteDaBase && (
            <div className="space-y-1.5">
              <Label>Selecionar Cliente</Label>
              <Popover open={clientePopoverOpen} onOpenChange={setClientePopoverOpen}>
                <PopoverTrigger asChild>
                  <Button variant="outline" role="combobox" className="w-full justify-between font-normal">
                    <span className="truncate">{selectedCliente ? selectedCliente.nome : 'Buscar cliente...'}</span>
                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
                  <Command shouldFilter={false}>
                    <CommandInput placeholder="Digite o nome, CNPJ ou telefone..." value={clienteSearch} onValueChange={setClienteSearch} />
                    <CommandList className="max-h-[200px] overflow-y-auto">
                      {filteredClientes.length === 0 && <CommandEmpty className="py-3 text-center text-sm">Nenhum cliente encontrado</CommandEmpty>}
                      <CommandGroup>
                        {filteredClientes.map(cliente => (
                          <CommandItem key={cliente.id} value={cliente.id} onSelect={() => handleSelectCliente(cliente)}>
                            <Check className={cn("mr-2 h-4 w-4", selectedCliente?.id === cliente.id ? "opacity-100" : "opacity-0")} />
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
            <div className="space-y-1.5 sm:col-span-2">
              <Label htmlFor="empresa">Empresa *</Label>
              <Input id="empresa" value={form.empresa} onChange={(e) => setForm(f => ({ ...f, empresa: e.target.value }))} placeholder="Nome da empresa" disabled={(isClienteDaBase && !!selectedCliente) || (isLeadExistente && !!selectedLead)} />
            </div>

            <div className="space-y-1.5 sm:col-span-2">
              <Label htmlFor="nome">Nome do Contato</Label>
              <Input id="nome" value={form.cliente_nome} onChange={(e) => setForm(f => ({ ...f, cliente_nome: e.target.value }))} placeholder="Ex: João, Maria, Compras..." />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="telefone">Telefone *</Label>
              <Input id="telefone" value={form.cliente_telefone} onChange={(e) => setForm(f => ({ ...f, cliente_telefone: e.target.value }))} placeholder="(00) 00000-0000" />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="email">Email</Label>
              <Input id="email" type="email" value={form.cliente_email} onChange={(e) => setForm(f => ({ ...f, cliente_email: e.target.value }))} placeholder="email@empresa.com" />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="cnpj">CNPJ</Label>
              <Input id="cnpj" value={form.cliente_cnpj} onChange={(e) => setForm(f => ({ ...f, cliente_cnpj: e.target.value }))} placeholder="00.000.000/0000-00" />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="website">Site / URL</Label>
              <Input id="website" value={form.website} onChange={(e) => setForm(f => ({ ...f, website: e.target.value }))} placeholder="https://www.empresa.com.br" />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="estado">UF</Label>
              <Input id="estado" value={form.estado} onChange={(e) => setForm(f => ({ ...f, estado: e.target.value }))} placeholder="Ex: RS, SP, MG..." />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="cidade">Cidade</Label>
              <Input id="cidade" value={form.cidade} onChange={(e) => setForm(f => ({ ...f, cidade: e.target.value }))} placeholder="Nome da cidade" />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="ramo">Ramo de Atuação</Label>
              <Input id="ramo" value={form.ramo_atuacao} onChange={(e) => setForm(f => ({ ...f, ramo_atuacao: e.target.value }))} placeholder="Ex: Construção Civil, Indústria..." />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="regime">Regime Tributário</Label>
              <Select value={form.regime_tributario} onValueChange={(v) => setForm(f => ({ ...f, regime_tributario: v }))}>
                <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="Simples Nacional">Simples Nacional</SelectItem>
                  <SelectItem value="Lucro Presumido">Lucro Presumido</SelectItem>
                  <SelectItem value="Lucro Real">Lucro Real</SelectItem>
                  <SelectItem value="MEI">MEI</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="origem">Origem</Label>
              {addingOrigem ? (
                <div className="flex gap-2">
                  <Input value={novaOrigem} onChange={(e) => setNovaOrigem(e.target.value)} placeholder="Nova origem..." onKeyDown={(e) => e.key === 'Enter' && handleAddOrigem()} autoFocus />
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

            <div className="space-y-1.5 sm:col-span-2">
              <Label htmlFor="produto">Produto de Interesse</Label>
              <Input id="produto" value={form.produto_interesse} onChange={(e) => setForm(f => ({ ...f, produto_interesse: e.target.value }))} placeholder="Ex: Chapas, Perfis, Bobinas..." />
            </div>

            <div className="space-y-1.5 sm:col-span-2">
              <Label htmlFor="obs">Observações</Label>
              <Textarea id="obs" value={form.notes} onChange={(e) => setForm(f => ({ ...f, notes: e.target.value }))} placeholder="Notas iniciais..." rows={2} />
            </div>
          </div>

          {/* Duplicate detection warning */}
          {duplicateMatches.length > 0 && (
            <Alert className="border-amber-500/50 bg-accent/50">
              <AlertTriangle className="h-4 w-4 text-amber-600" />
              <AlertDescription className="text-xs">
                <span className="font-semibold block mb-1">⚠️ Possível duplicata encontrada:</span>
                {duplicateMatches.map((m, i) => (
                  <div key={i} className="flex items-center gap-1 py-0.5">
                    <Badge variant="outline" className="text-[9px] h-4 shrink-0">
                      {m.type === 'lead' ? 'Lead' : 'Cliente'}
                    </Badge>
                    <span className="font-medium">{m.name}</span>
                    <span className="text-muted-foreground">— {m.matchField}: {m.matchValue}</span>
                    {m.status && (
                      <Badge variant="secondary" className="text-[9px] h-4 ml-1">{m.status}</Badge>
                    )}
                  </div>
                ))}
                <span className="block mt-1 text-muted-foreground">Verifique se não é o mesmo contato antes de criar.</span>
              </AlertDescription>
            </Alert>
          )}
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
