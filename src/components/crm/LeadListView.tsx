
import { useState, useMemo } from 'react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Search, ArrowUpDown, Edit2, Trash2, Eye, MoreHorizontal, RotateCcw, ChevronLeft, ChevronRight } from 'lucide-react';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { CRM_STAGES, type CRMLead } from '@/pages/CRM';
import { useIsMobile } from '@/hooks/use-mobile';
import { Card } from '@/components/ui/card';
import { LeadEditDialog } from './LeadEditDialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { usePagination } from '@/hooks/usePagination';

interface LeadListViewProps {
  leads: CRMLead[];
  onLeadClick: (lead: CRMLead) => void;
  onLeadUpdated: () => void;
  userRole?: string | null;
}

type SortKey = 'cliente_nome' | 'status' | 'updated_at' | 'created_at';

export function LeadListView({ leads, onLeadClick, onLeadUpdated, userRole }: LeadListViewProps) {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [dateFilter, setDateFilter] = useState('all');
  const [sortKey, setSortKey] = useState<SortKey>('updated_at');
  const [sortAsc, setSortAsc] = useState(false);
  const [editLead, setEditLead] = useState<CRMLead | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<CRMLead | null>(null);
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
        (l.contact_phone || l.cliente_telefone || '').includes(q) ||
        (l.cliente_cnpj || '').includes(q)
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
      else { va = a[sortKey]; vb = b[sortKey]; }
      if (va < vb) return sortAsc ? -1 : 1;
      if (va > vb) return sortAsc ? 1 : -1;
      return 0;
    });

    return result;
   }, [leads, search, statusFilter, dateFilter, sortKey, sortAsc]);

  const { paginatedData, currentPage, totalPages, startIndex, endIndex, goToPage, nextPage, previousPage, canGoNext, canGoPrevious } = usePagination({ data: filteredLeads, itemsPerPage: 50 });

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      const { error } = await (supabase as any).from('leads').delete().eq('id', deleteTarget.id);
      if (error) throw error;
      toast.success('Lead excluído com sucesso');
      onLeadUpdated();
    } catch {
      toast.error('Erro ao excluir lead');
    } finally {
      setDeleteTarget(null);
    }
  };

  const handleReactivate = async (lead: CRMLead) => {
    try {
      const user = (await supabase.auth.getUser()).data.user;
      await (supabase as any)
        .from('leads')
        .update({ status: 'lead', updated_at: new Date().toISOString() })
        .eq('id', lead.id);
      await supabase.from('lead_activities').insert({
        lead_id: lead.id,
        activity_type: 'mudanca_status',
        description: 'Lead reativado — movido de "Perdido" para "Lead"',
        user_id: user?.id || '',
      } as any);
      toast.success('Lead reativado com sucesso', {
        description: `${lead.empresa || lead.client_name || lead.cliente_nome} voltou para a carteira`,
      });
      onLeadUpdated();
    } catch {
      toast.error('Erro ao reativar lead');
    }
  };

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
        <ScrollArea className="h-[calc(100vh-280px)]">
          <div className="space-y-2">
            {paginatedData.map(lead => {
              const stage = CRM_STAGES.find(s => s.key === lead.status);
              return (
                <Card key={lead.id} className="p-3">
                  <div className="flex items-start justify-between">
                    <div className="min-w-0 flex-1 cursor-pointer" onClick={() => onLeadClick(lead)}>
                      <p className="text-sm font-semibold text-foreground truncate">{lead.empresa || lead.client_name || lead.cliente_nome}</p>
                      {lead.empresa && <p className="text-xs text-muted-foreground truncate">{lead.empresa}</p>}
                    </div>
                    <div className="flex items-center gap-1 ml-2 shrink-0">
                      {stage && <Badge style={{ backgroundColor: stage.color, color: '#fff' }} className="text-[10px]">{stage.label}</Badge>}
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button size="icon" variant="ghost" className="h-7 w-7"><MoreHorizontal className="h-4 w-4" /></Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => onLeadClick(lead)}><Eye className="h-3.5 w-3.5 mr-2" />Ver detalhes</DropdownMenuItem>
                          <DropdownMenuItem onClick={() => setEditLead(lead)}><Edit2 className="h-3.5 w-3.5 mr-2" />Editar</DropdownMenuItem>
                          {lead.status === 'perdido' && (
                            <DropdownMenuItem onClick={() => handleReactivate(lead)}><RotateCcw className="h-3.5 w-3.5 mr-2" />Reativar</DropdownMenuItem>
                          )}
                          {(userRole === 'admin' || userRole === 'comercial') && (
                            <DropdownMenuItem className="text-destructive" onClick={() => setDeleteTarget(lead)}><Trash2 className="h-3.5 w-3.5 mr-2" />Excluir</DropdownMenuItem>
                          )}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </div>
                  <div className="flex items-center justify-between mt-2 text-xs text-muted-foreground">
                    <span>{lead.source || lead.origem || '—'}</span>
                    <span>{new Date(lead.created_at).toLocaleDateString('pt-BR')}</span>
                  </div>
                </Card>
              );
            })}
            {filteredLeads.length === 0 && <p className="text-sm text-muted-foreground text-center py-8">Nenhum lead encontrado</p>}
          </div>
        </ScrollArea>

        {totalPages > 1 && (
          <div className="flex items-center justify-between pt-2">
            <p className="text-xs text-muted-foreground">{startIndex}–{endIndex} de {filteredLeads.length}</p>
            <div className="flex items-center gap-1">
              <Button size="sm" variant="outline" disabled={!canGoPrevious} onClick={previousPage} className="h-8 px-2">
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <span className="text-xs text-muted-foreground px-2">{currentPage}/{totalPages}</span>
              <Button size="sm" variant="outline" disabled={!canGoNext} onClick={nextPage} className="h-8 px-2">
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )}

        <LeadEditDialog lead={editLead} open={!!editLead} onOpenChange={(v) => !v && setEditLead(null)} onUpdated={onLeadUpdated} />
        <AlertDialog open={!!deleteTarget} onOpenChange={(v) => !v && setDeleteTarget(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Excluir Lead</AlertDialogTitle>
              <AlertDialogDescription>Tem certeza que deseja excluir o lead "{deleteTarget?.client_name || deleteTarget?.cliente_nome}"? Esta ação não pode ser desfeita.</AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancelar</AlertDialogCancel>
              <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">Excluir</AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex gap-2">
        <div className="relative flex-1 max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Buscar cliente, empresa, CNPJ..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9" />
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

      <ScrollArea className="h-[calc(100vh-280px)]">
        <div className="rounded-lg border bg-card overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead><SortHeader label="Cliente" sortKeyName="cliente_nome" /></TableHead>
                <TableHead>Empresa</TableHead>
                <TableHead><SortHeader label="Status" sortKeyName="status" /></TableHead>
                <TableHead>Origem</TableHead>
                <TableHead>Telefone</TableHead>
                <TableHead><SortHeader label="Criado em" sortKeyName="created_at" /></TableHead>
                <TableHead><SortHeader label="Atualizado" sortKeyName="updated_at" /></TableHead>
                <TableHead className="w-[80px]">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {paginatedData.map(lead => {
                const stage = CRM_STAGES.find(s => s.key === lead.status);
                return (
                  <TableRow key={lead.id} className="cursor-pointer hover:bg-accent/50" onClick={() => onLeadClick(lead)}>
                    <TableCell className="font-medium text-sm">{lead.empresa || lead.client_name || lead.cliente_nome}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">{lead.empresa || '—'}</TableCell>
                    <TableCell>
                      {stage ? <Badge style={{ backgroundColor: stage.color, color: '#fff' }} className="text-[10px]">{stage.label}</Badge>
                        : <Badge variant="outline" className="text-[10px]">{lead.status}</Badge>}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">{lead.source || lead.origem || '—'}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">{lead.contact_phone || lead.cliente_telefone || '—'}</TableCell>
                    <TableCell className="text-xs text-muted-foreground">{new Date(lead.created_at).toLocaleDateString('pt-BR')}</TableCell>
                    <TableCell className="text-xs text-muted-foreground">{new Date(lead.updated_at).toLocaleDateString('pt-BR')}</TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button size="icon" variant="ghost" className="h-7 w-7" onClick={e => e.stopPropagation()}>
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onLeadClick(lead); }}><Eye className="h-3.5 w-3.5 mr-2" />Ver detalhes</DropdownMenuItem>
                          <DropdownMenuItem onClick={(e) => { e.stopPropagation(); setEditLead(lead); }}><Edit2 className="h-3.5 w-3.5 mr-2" />Editar</DropdownMenuItem>
                          {lead.status === 'perdido' && (
                            <DropdownMenuItem onClick={(e) => { e.stopPropagation(); handleReactivate(lead); }}><RotateCcw className="h-3.5 w-3.5 mr-2" />Reativar</DropdownMenuItem>
                          )}
                          {(userRole === 'admin' || userRole === 'comercial') && (
                            <DropdownMenuItem className="text-destructive" onClick={(e) => { e.stopPropagation(); setDeleteTarget(lead); }}><Trash2 className="h-3.5 w-3.5 mr-2" />Excluir</DropdownMenuItem>
                          )}
                        </DropdownMenuContent>
                      </DropdownMenu>
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
      </ScrollArea>

      <div className="flex items-center justify-between">
        <p className="text-xs text-muted-foreground">
          {filteredLeads.length > 0 ? `${startIndex}–${endIndex} de ${filteredLeads.length} lead(s)` : '0 lead(s) encontrado(s)'}
        </p>
        {totalPages > 1 && (
          <div className="flex items-center gap-1">
            <Button size="sm" variant="outline" disabled={!canGoPrevious} onClick={previousPage} className="h-8 px-2">
              <ChevronLeft className="h-4 w-4" /> <span className="ml-1 text-xs">Anterior</span>
            </Button>
            <span className="text-xs text-muted-foreground px-2">Página {currentPage} de {totalPages}</span>
            <Button size="sm" variant="outline" disabled={!canGoNext} onClick={nextPage} className="h-8 px-2">
              <span className="mr-1 text-xs">Próxima</span> <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        )}
      </div>

      <LeadEditDialog lead={editLead} open={!!editLead} onOpenChange={(v) => !v && setEditLead(null)} onUpdated={onLeadUpdated} />

      <AlertDialog open={!!deleteTarget} onOpenChange={(v) => !v && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir Lead</AlertDialogTitle>
            <AlertDialogDescription>Tem certeza que deseja excluir o lead "{deleteTarget?.client_name || deleteTarget?.cliente_nome}"? Esta ação não pode ser desfeita.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">Excluir</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
