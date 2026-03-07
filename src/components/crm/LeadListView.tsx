
import { useState, useMemo } from 'react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Search, ArrowUpDown, Edit2, Check, X } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { CRM_STAGES, type CRMLead } from '@/pages/CRM';
import { useIsMobile } from '@/hooks/use-mobile';
import { Card } from '@/components/ui/card';

interface LeadListViewProps {
  leads: CRMLead[];
  onLeadClick: (lead: CRMLead) => void;
  onLeadUpdated: () => void;
}

type SortKey = 'cliente_nome' | 'status' | 'valor_estimado' | 'updated_at' | 'created_at';

export function LeadListView({ leads, onLeadClick, onLeadUpdated }: LeadListViewProps) {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [dateFilter, setDateFilter] = useState('all');
  const [sortKey, setSortKey] = useState<SortKey>('updated_at');
  const [sortAsc, setSortAsc] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValues, setEditValues] = useState<Partial<CRMLead>>({});
  const { toast } = useToast();
  const isMobile = useIsMobile();

  const toggleSort = (key: SortKey) => {
    if (sortKey === key) setSortAsc(!sortAsc);
    else { setSortKey(key); setSortAsc(true); }
  };

  const filteredLeads = useMemo(() => {
    let result = [...leads];

    if (search) {
      const q = search.toLowerCase();
      result = result.filter(l =>
        (l.client_name || l.cliente_nome || '').toLowerCase().includes(q) ||
        (l.empresa || '').toLowerCase().includes(q) ||
        (l.contact_phone || l.cliente_telefone || '').includes(q)
      );
    }
    if (statusFilter !== 'all') result = result.filter(l => l.status === statusFilter);
    if (dateFilter !== 'all') {
      const now = new Date();
      const days = dateFilter === '7d' ? 7 : dateFilter === '30d' ? 30 : 90;
      const cutoff = new Date(now.getTime() - days * 86400000);
      result = result.filter(l => new Date(l.created_at) >= cutoff);
    }

    result.sort((a, b) => {
      let va: any, vb: any;
      if (sortKey === 'cliente_nome') { va = (a.client_name || a.cliente_nome || '').toLowerCase(); vb = (b.client_name || b.cliente_nome || '').toLowerCase(); }
      else if (sortKey === 'valor_estimado') { va = a.valor_estimado || 0; vb = b.valor_estimado || 0; }
      else { va = a[sortKey]; vb = b[sortKey]; }
      if (va < vb) return sortAsc ? -1 : 1;
      if (va > vb) return sortAsc ? 1 : -1;
      return 0;
    });

    return result;
  }, [leads, search, statusFilter, dateFilter, sortKey, sortAsc]);

  const startEdit = (lead: CRMLead) => {
    setEditingId(lead.id);
    setEditValues({ status: lead.status, valor_estimado: lead.valor_estimado });
  };

  const saveEdit = async (leadId: string) => {
    try {
      const { error } = await (supabase as any).from('leads').update({
        ...editValues,
        updated_at: new Date().toISOString(),
      }).eq('id', leadId);
      if (error) throw error;
      setEditingId(null);
      onLeadUpdated();
      toast({ title: 'Lead atualizado' });
    } catch {
      toast({ title: 'Erro ao atualizar', variant: 'destructive' });
    }
  };

  const cancelEdit = () => { setEditingId(null); setEditValues({}); };

  const SortHeader = ({ label, sortKeyName }: { label: string; sortKeyName: SortKey }) => (
    <Button variant="ghost" size="sm" className="h-auto p-0 font-medium text-xs hover:bg-transparent" onClick={() => toggleSort(sortKeyName)}>
      {label} <ArrowUpDown className="ml-1 h-3 w-3" />
    </Button>
  );

  if (isMobile) {
    return (
      <div className="space-y-3">
        <div className="flex flex-col gap-2">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input placeholder="Buscar..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9" />
          </div>
          <div className="flex gap-2">
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="flex-1"><SelectValue placeholder="Status" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                {CRM_STAGES.map(s => <SelectItem key={s.key} value={s.key}>{s.label}</SelectItem>)}
                <SelectItem value="perdido">Perdido</SelectItem>
              </SelectContent>
            </Select>
            <Select value={dateFilter} onValueChange={setDateFilter}>
              <SelectTrigger className="flex-1"><SelectValue placeholder="Período" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todo período</SelectItem>
                <SelectItem value="7d">Últimos 7 dias</SelectItem>
                <SelectItem value="30d">Últimos 30 dias</SelectItem>
                <SelectItem value="90d">Últimos 90 dias</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        <div className="space-y-2">
          {filteredLeads.map(lead => {
            const stage = CRM_STAGES.find(s => s.key === lead.status);
            return (
              <Card key={lead.id} className="p-3 cursor-pointer hover:shadow-md transition-shadow" onClick={() => onLeadClick(lead)}>
                <div className="flex items-start justify-between">
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold text-foreground truncate">{lead.client_name || lead.cliente_nome}</p>
                    {lead.empresa && <p className="text-xs text-muted-foreground truncate">{lead.empresa}</p>}
                  </div>
                  {stage && <Badge style={{ backgroundColor: stage.color, color: '#fff' }} className="text-[10px] ml-2 shrink-0">{stage.label}</Badge>}
                </div>
                <div className="flex items-center justify-between mt-2 text-xs text-muted-foreground">
                  <span>{lead.valor_estimado ? `R$ ${lead.valor_estimado.toLocaleString('pt-BR')}` : '—'}</span>
                  <span>{new Date(lead.created_at).toLocaleDateString('pt-BR')}</span>
                </div>
              </Card>
            );
          })}
          {filteredLeads.length === 0 && <p className="text-sm text-muted-foreground text-center py-8">Nenhum lead encontrado</p>}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex gap-2">
        <div className="relative flex-1 max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Buscar cliente, empresa..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9" />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[160px]"><SelectValue placeholder="Status" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos Status</SelectItem>
            {CRM_STAGES.map(s => <SelectItem key={s.key} value={s.key}>{s.label}</SelectItem>)}
            <SelectItem value="perdido">Perdido</SelectItem>
          </SelectContent>
        </Select>
        <Select value={dateFilter} onValueChange={setDateFilter}>
          <SelectTrigger className="w-[160px]"><SelectValue placeholder="Período" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todo período</SelectItem>
            <SelectItem value="7d">Últimos 7 dias</SelectItem>
            <SelectItem value="30d">Últimos 30 dias</SelectItem>
            <SelectItem value="90d">Últimos 90 dias</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="rounded-lg border bg-card overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead><SortHeader label="Cliente" sortKeyName="cliente_nome" /></TableHead>
              <TableHead>Empresa</TableHead>
              <TableHead><SortHeader label="Status" sortKeyName="status" /></TableHead>
              <TableHead><SortHeader label="Valor" sortKeyName="valor_estimado" /></TableHead>
              <TableHead>Telefone</TableHead>
              <TableHead><SortHeader label="Criado em" sortKeyName="created_at" /></TableHead>
              <TableHead><SortHeader label="Atualizado" sortKeyName="updated_at" /></TableHead>
              <TableHead className="w-[80px]">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredLeads.map(lead => {
              const stage = CRM_STAGES.find(s => s.key === lead.status);
              const isEditing = editingId === lead.id;
              return (
                <TableRow key={lead.id} className="cursor-pointer hover:bg-accent/50" onClick={() => !isEditing && onLeadClick(lead)}>
                  <TableCell className="font-medium text-sm">{lead.client_name || lead.cliente_nome}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">{lead.empresa || '—'}</TableCell>
                  <TableCell>
                    {isEditing ? (
                      <Select value={editValues.status || ''} onValueChange={v => setEditValues(ev => ({ ...ev, status: v }))}>
                        <SelectTrigger className="h-7 text-xs w-[120px]" onClick={e => e.stopPropagation()}><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {CRM_STAGES.map(s => <SelectItem key={s.key} value={s.key}>{s.label}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    ) : (
                      stage ? <Badge style={{ backgroundColor: stage.color, color: '#fff' }} className="text-[10px]">{stage.label}</Badge>
                        : <Badge variant="outline" className="text-[10px]">{lead.status}</Badge>
                    )}
                  </TableCell>
                  <TableCell>
                    {isEditing ? (
                      <Input type="number" className="h-7 text-xs w-[100px]" value={editValues.valor_estimado ?? ''} onClick={e => e.stopPropagation()} onChange={e => setEditValues(ev => ({ ...ev, valor_estimado: e.target.value ? parseFloat(e.target.value) : null }))} />
                    ) : (
                      <span className="text-sm">{lead.valor_estimado ? `R$ ${lead.valor_estimado.toLocaleString('pt-BR')}` : '—'}</span>
                    )}
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">{lead.contact_phone || lead.cliente_telefone || '—'}</TableCell>
                  <TableCell className="text-xs text-muted-foreground">{new Date(lead.created_at).toLocaleDateString('pt-BR')}</TableCell>
                  <TableCell className="text-xs text-muted-foreground">{new Date(lead.updated_at).toLocaleDateString('pt-BR')}</TableCell>
                  <TableCell>
                    {isEditing ? (
                      <div className="flex gap-1" onClick={e => e.stopPropagation()}>
                        <Button size="icon" variant="ghost" className="h-6 w-6" onClick={() => saveEdit(lead.id)}><Check className="h-3.5 w-3.5 text-success" /></Button>
                        <Button size="icon" variant="ghost" className="h-6 w-6" onClick={cancelEdit}><X className="h-3.5 w-3.5 text-muted-foreground" /></Button>
                      </div>
                    ) : (
                      <Button size="icon" variant="ghost" className="h-6 w-6" onClick={e => { e.stopPropagation(); startEdit(lead); }}>
                        <Edit2 className="h-3.5 w-3.5 text-muted-foreground" />
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              );
            })}
            {filteredLeads.length === 0 && (
              <TableRow><TableCell colSpan={8} className="text-center text-sm text-muted-foreground py-8">Nenhum lead encontrado</TableCell></TableRow>
            )}
          </TableBody>
        </Table>
      </div>
      <p className="text-xs text-muted-foreground">{filteredLeads.length} lead(s) encontrado(s)</p>
    </div>
  );
}
