import { useState, useEffect, useCallback, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Loader2, CheckCircle2, XCircle, Building2, Phone, Mail,
  MapPin, FileText, Sparkles, CheckCheck, Trash2, ExternalLink,
  HandHelping, ChevronDown, ChevronRight, Users, UserPlus
} from 'lucide-react';

interface StagedLead {
  id: string;
  log_id: string | null;
  status: string;
  cliente_nome: string;
  empresa: string | null;
  contact_name: string | null;
  cliente_telefone: string | null;
  cliente_email: string | null;
  cliente_cnpj: string | null;
  cidade: string | null;
  estado: string | null;
  ramo_atuacao: string | null;
  produto_interesse: string | null;
  valor_estimado: number | null;
  notes: string | null;
  fonte_dados: string | null;
  source: string | null;
  source_url: string | null;
  created_at: string;
}

interface UserProfile {
  id: string;
  full_name: string;
  email: string;
}

interface Props {
  onLeadsApproved?: () => void;
  isManagerOrAdmin?: boolean;
}

export function ProspeccaoReviewPanel({ onLeadsApproved, isManagerOrAdmin = false }: Props) {
  const [leads, setLeads] = useState<StagedLead[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [approving, setApproving] = useState(false);
  const [discarding, setDiscarding] = useState(false);
  const [attendingId, setAttendingId] = useState<string | null>(null);
  const [expandedLists, setExpandedLists] = useState<Set<string>>(new Set());
  const [listPages, setListPages] = useState<Record<string, number>>({});
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [assignUserId, setAssignUserId] = useState<string>('');
  const [assigningLeadId, setAssigningLeadId] = useState<string | null>(null);

  // Fetch all pending leads with pagination to bypass 1000 limit
  const fetchAllPending = async (): Promise<StagedLead[]> => {
    const allLeads: StagedLead[] = [];
    const pageSize = 1000;
    let from = 0;
    let hasMore = true;

    while (hasMore) {
      const { data, error } = await (supabase as any)
        .from('lead_prospecting_results')
        .select('*')
        .eq('status', 'pending')
        .order('created_at', { ascending: false })
        .range(from, from + pageSize - 1);

      if (error) {
        console.error('Error fetching leads:', error);
        break;
      }

      allLeads.push(...(data || []));
      hasMore = (data?.length || 0) === pageSize;
      from += pageSize;
    }

    return allLeads;
  };

  const loadPending = useCallback(async () => {
    setLoading(true);
    const allLeads = await fetchAllPending();
    setLeads(allLeads);
    setLoading(false);
  }, []);

  useEffect(() => { loadPending(); }, [loadPending]);

  // Load users for assignment (admin only)
  useEffect(() => {
    if (!isManagerOrAdmin) return;
    const loadUsers = async () => {
      const { data } = await (supabase as any)
        .from('user_profiles')
        .select('id, full_name, email')
        .order('full_name');
      setUsers(data || []);
    };
    loadUsers();
  }, [isManagerOrAdmin]);

  // Group leads by fonte_dados
  const groupedLeads = useMemo(() => {
    const groups: Record<string, StagedLead[]> = {};
    for (const lead of leads) {
      const key = lead.fonte_dados || 'Sem lista';
      if (!groups[key]) groups[key] = [];
      groups[key].push(lead);
    }
    // Sort groups: named lists first, then "Sem lista"
    const sorted = Object.entries(groups).sort(([a], [b]) => {
      if (a === 'Sem lista') return 1;
      if (b === 'Sem lista') return -1;
      return a.localeCompare(b);
    });
    return sorted;
  }, [leads]);

  const toggleSelect = (id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const toggleSelectList = (listLeads: StagedLead[]) => {
    const listIds = listLeads.map(l => l.id);
    const allSelected = listIds.every(id => selectedIds.has(id));
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (allSelected) {
        listIds.forEach(id => next.delete(id));
      } else {
        listIds.forEach(id => next.add(id));
      }
      return next;
    });
  };

  const toggleAll = () => {
    if (selectedIds.size === leads.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(leads.map(l => l.id)));
    }
  };

  const toggleExpand = (listName: string) => {
    setExpandedLists(prev => {
      const next = new Set(prev);
      if (next.has(listName)) next.delete(listName); else next.add(listName);
      return next;
    });
  };

  const approveLead = async (lead: StagedLead, vendorId?: string) => {
    const user = (await supabase.auth.getUser()).data.user;
    const empresaNome = lead.empresa || lead.cliente_nome || '';
    const contactName = lead.contact_name || '';
    // Use fonte_dados as origin for Excel uploads, otherwise 'Auto Prospecção'
    const origin = lead.source === 'upload' ? (lead.fonte_dados || 'Upload Excel') : (lead.fonte_dados || 'Auto Prospecção');

    const { error } = await (supabase as any).from('leads').insert({
      cliente_nome: contactName || empresaNome,
      client_name: contactName || empresaNome,
      empresa: empresaNome || null,
      cliente_cnpj: lead.cliente_cnpj || null,
      contact_name: lead.contact_name || null,
      contact_phone: lead.cliente_telefone || null,
      cliente_telefone: lead.cliente_telefone || null,
      contact_email: lead.cliente_email || null,
      cliente_email: lead.cliente_email || null,
      cidade: lead.cidade || null,
      estado: lead.estado || null,
      ramo_atuacao: lead.ramo_atuacao || null,
      produto_interesse: lead.produto_interesse || null,
      valor_estimado: lead.valor_estimado || null,
      notes: lead.notes || null,
      source: origin,
      website: lead.source_url || null,
      regime_tributario: (lead as any).regime_tributario || null,
      status: 'lead',
      vendedor_id: vendorId || user?.id,
    });

    if (!error) {
      await (supabase as any).from('lead_prospecting_results')
        .update({ status: 'approved', reviewed_by: user?.id, reviewed_at: new Date().toISOString() })
        .eq('id', lead.id);
      return true;
    } else {
      console.error('Approve lead error:', error);
      return false;
    }
  };

  const approveSelected = async () => {
    if (selectedIds.size === 0) return;
    setApproving(true);
    try {
      const toApprove = leads.filter(l => selectedIds.has(l.id));
      let approved = 0;
      for (const lead of toApprove) {
        if (await approveLead(lead)) approved++;
      }
      toast.success(`${approved} lead${approved > 1 ? 's' : ''} aprovado${approved > 1 ? 's' : ''} e adicionado${approved > 1 ? 's' : ''} ao CRM`);
      setSelectedIds(new Set());
      await loadPending();
      onLeadsApproved?.();
    } catch (err: any) {
      toast.error('Erro ao aprovar leads', { description: err.message });
    } finally {
      setApproving(false);
    }
  };

  // Batch discard in chunks to avoid Bad Request
  const discardSelected = async () => {
    if (selectedIds.size === 0) return;
    setDiscarding(true);
    try {
      const user = (await supabase.auth.getUser()).data.user;
      const ids = Array.from(selectedIds);
      const batchSize = 100;
      
      for (let i = 0; i < ids.length; i += batchSize) {
        const batch = ids.slice(i, i + batchSize);
        const { error } = await (supabase as any)
          .from('lead_prospecting_results')
          .update({ status: 'discarded', reviewed_by: user?.id, reviewed_at: new Date().toISOString() })
          .in('id', batch);
        if (error) throw error;
      }

      toast.success(`${ids.length} lead${ids.length > 1 ? 's' : ''} descartado${ids.length > 1 ? 's' : ''}`);
      setSelectedIds(new Set());
      await loadPending();
    } catch (err: any) {
      toast.error('Erro ao descartar leads', { description: err.message });
    } finally {
      setDiscarding(false);
    }
  };

  const handleAttend = async (lead: StagedLead) => {
    setAttendingId(lead.id);
    try {
      const ok = await approveLead(lead);
      if (ok) {
        toast.success('Lead adicionado à sua lista!');
        await loadPending();
        onLeadsApproved?.();
      } else {
        toast.error('Erro ao atender lead');
      }
    } finally {
      setAttendingId(null);
    }
  };

  const handleAssign = async (lead: StagedLead, userId: string) => {
    setAssigningLeadId(lead.id);
    try {
      const ok = await approveLead(lead, userId);
      if (ok) {
        const user = users.find(u => u.id === userId);
        toast.success(`Lead atribuído a ${user?.full_name || 'usuário'}!`);
        await loadPending();
        onLeadsApproved?.();
      } else {
        toast.error('Erro ao atribuir lead');
      }
    } finally {
      setAssigningLeadId(null);
      setAssignUserId('');
    }
  };

  const getSourceBadge = (fonte: string | null) => {
    if (!fonte) return null;
    const colors: Record<string, string> = {
      'Google': 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
      'PNCP': 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400',
      'ObrasGov': 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
      'IA': 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400',
    };
    return (
      <Badge variant="outline" className={`text-[10px] h-4 px-1.5 ${colors[fonte] || ''}`}>
        {fonte}
      </Badge>
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (leads.length === 0) {
    return (
      <Card>
        <CardContent className="py-8 text-center">
          <Sparkles className="h-8 w-8 mx-auto mb-2 text-muted-foreground/30" />
          <p className="text-sm text-muted-foreground">Nenhum lead pendente de revisão</p>
          <p className="text-xs text-muted-foreground mt-1">
            Execute uma prospecção ou importe uma planilha para gerar leads
          </p>
        </CardContent>
      </Card>
    );
  }

  const renderLeadRow = (lead: StagedLead) => (
    <div
      key={lead.id}
      className={`flex items-start gap-3 py-2.5 px-1 rounded transition-colors ${
        selectedIds.has(lead.id) ? 'bg-primary/5' : ''
      }`}
    >
      {isManagerOrAdmin && (
        <Checkbox
          checked={selectedIds.has(lead.id)}
          onCheckedChange={() => toggleSelect(lead.id)}
          className="h-3.5 w-3.5 mt-1"
        />
      )}
      <div className="flex-1 min-w-0 space-y-1">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-xs font-semibold truncate">
            {lead.empresa || lead.cliente_nome}
          </span>
          {getSourceBadge(lead.fonte_dados)}
          {lead.source_url && (
            <a
              href={
                lead.source_url.includes('pncp.gov.br/app/editais/')
                  ? `https://www.google.com/search?q=pncp+${encodeURIComponent(lead.cliente_cnpj?.replace(/\D/g, '') || '')}+${encodeURIComponent((lead.empresa || lead.cliente_nome || '').slice(0, 60))}`
                  : lead.source_url
              }
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-0.5 text-[10px] text-primary hover:underline"
              onClick={(e) => e.stopPropagation()}
            >
              <ExternalLink className="h-2.5 w-2.5" />
              Ver fonte
            </a>
          )}
        </div>

        {lead.contact_name && (
          <div className="text-[11px] text-muted-foreground">
            Contato: {lead.contact_name}
          </div>
        )}

        <div className="flex flex-wrap gap-x-3 gap-y-0.5 text-[10px] text-muted-foreground">
          {lead.cliente_telefone && (
            <span className="flex items-center gap-0.5">
              <Phone className="h-2.5 w-2.5" /> {lead.cliente_telefone}
            </span>
          )}
          {lead.cliente_email && (
            <span className="flex items-center gap-0.5">
              <Mail className="h-2.5 w-2.5" /> {lead.cliente_email}
            </span>
          )}
          {(lead.cidade || lead.estado) && (
            <span className="flex items-center gap-0.5">
              <MapPin className="h-2.5 w-2.5" /> {[lead.cidade, lead.estado].filter(Boolean).join(' - ')}
            </span>
          )}
          {lead.ramo_atuacao && (
            <span className="flex items-center gap-0.5">
              <Building2 className="h-2.5 w-2.5" /> {lead.ramo_atuacao}
            </span>
          )}
        </div>

        {lead.notes && (
          <p className="text-[10px] text-muted-foreground/70 line-clamp-2">{lead.notes}</p>
        )}

        {lead.valor_estimado && (
          <span className="text-[10px] font-medium text-primary">
            Valor est.: R$ {lead.valor_estimado.toLocaleString('pt-BR')}
          </span>
        )}
      </div>

      {/* Action buttons */}
      <div className="flex gap-1 shrink-0 items-center">
        {isManagerOrAdmin ? (
          <>
            {/* Assign to user */}
            <Select
              value=""
              onValueChange={(userId) => handleAssign(lead, userId)}
            >
              <SelectTrigger className="h-6 w-6 p-0 border-0 [&>svg]:hidden" title="Atribuir a usuário">
                <UserPlus className="h-3.5 w-3.5 text-muted-foreground hover:text-primary" />
              </SelectTrigger>
              <SelectContent>
                {users.map(u => (
                  <SelectItem key={u.id} value={u.id} className="text-xs">
                    {u.full_name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button
              size="icon"
              variant="ghost"
              className="h-6 w-6 text-destructive hover:text-destructive"
              onClick={async () => {
                const user = (await supabase.auth.getUser()).data.user;
                await (supabase as any).from('lead_prospecting_results')
                  .update({ status: 'discarded', reviewed_by: user?.id, reviewed_at: new Date().toISOString() })
                  .eq('id', lead.id);
                toast.success('Lead descartado');
                loadPending();
              }}
              title="Descartar"
            >
              <XCircle className="h-3.5 w-3.5" />
            </Button>
            <Button
              size="icon"
              variant="ghost"
              className="h-6 w-6 text-primary hover:text-primary"
              onClick={() => handleAttend(lead)}
              disabled={attendingId === lead.id}
              title="Aprovar"
            >
              {attendingId === lead.id
                ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
                : <CheckCircle2 className="h-3.5 w-3.5" />
              }
            </Button>
          </>
        ) : (
          <Button
            size="sm"
            className="h-7 text-xs gap-1"
            onClick={() => handleAttend(lead)}
            disabled={attendingId === lead.id}
          >
            {attendingId === lead.id
              ? <Loader2 className="h-3 w-3 animate-spin" />
              : <HandHelping className="h-3 w-3" />
            }
            Atender
          </Button>
        )}
      </div>
    </div>
  );

  return (
    <Card>
      <CardHeader className="pb-2 pt-4 px-4">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <FileText className="h-4 w-4 text-primary" />
            {isManagerOrAdmin ? 'Leads Pendentes de Revisão' : 'Leads Disponíveis para Atendimento'}
            <Badge variant="secondary" className="text-[10px] h-5">{leads.length}</Badge>
          </CardTitle>
          {isManagerOrAdmin && (
            <div className="flex items-center gap-2">
              {selectedIds.size > 0 && (
                <span className="text-xs text-muted-foreground">
                  {selectedIds.size} selecionado{selectedIds.size > 1 ? 's' : ''}
                </span>
              )}
              <Button
                size="sm"
                variant="destructive"
                className="h-7 text-xs gap-1"
                disabled={selectedIds.size === 0 || discarding}
                onClick={discardSelected}
              >
                {discarding ? <Loader2 className="h-3 w-3 animate-spin" /> : <Trash2 className="h-3 w-3" />}
                Descartar
              </Button>
              <Button
                size="sm"
                className="h-7 text-xs gap-1"
                disabled={selectedIds.size === 0 || approving}
                onClick={approveSelected}
              >
                {approving ? <Loader2 className="h-3 w-3 animate-spin" /> : <CheckCheck className="h-3 w-3" />}
                Aprovar
              </Button>
            </div>
          )}
        </div>
      </CardHeader>
      <CardContent className="px-4 pb-4">
        {/* Select all - only for managers */}
        {isManagerOrAdmin && (
          <div className="flex items-center gap-2 pb-2 border-b mb-2">
            <Checkbox
              checked={selectedIds.size === leads.length && leads.length > 0}
              onCheckedChange={toggleAll}
              className="h-3.5 w-3.5"
            />
            <span className="text-xs text-muted-foreground">Selecionar todos ({leads.length})</span>
          </div>
        )}

        <div className="space-y-2 max-h-[600px] overflow-y-auto">
          {groupedLeads.map(([listName, listLeads]) => {
            const isExpanded = expandedLists.has(listName);
            const listSelectedCount = listLeads.filter(l => selectedIds.has(l.id)).length;
            const allListSelected = listSelectedCount === listLeads.length;

            return (
              <div key={listName} className="border rounded-md">
                {/* List header */}
                <div
                  className="flex items-center gap-2 px-3 py-2 cursor-pointer hover:bg-muted/50 transition-colors"
                  onClick={() => toggleExpand(listName)}
                >
                  {isManagerOrAdmin && (
                    <Checkbox
                      checked={allListSelected}
                      onCheckedChange={(e) => {
                        e; // prevent propagation handled by stopPropagation
                        toggleSelectList(listLeads);
                      }}
                      onClick={(e) => e.stopPropagation()}
                      className="h-3.5 w-3.5"
                    />
                  )}
                  {isExpanded
                    ? <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
                    : <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" />
                  }
                  <Users className="h-3.5 w-3.5 text-primary" />
                  <span className="text-xs font-medium flex-1">{listName}</span>
                  <Badge variant="secondary" className="text-[10px] h-5">
                    {listLeads.length} lead{listLeads.length > 1 ? 's' : ''}
                  </Badge>
                  {listSelectedCount > 0 && (
                    <Badge variant="outline" className="text-[10px] h-5 text-primary border-primary/30">
                      {listSelectedCount} sel.
                    </Badge>
                  )}
                </div>

                {/* Expanded leads */}
                {isExpanded && (() => {
                  const PAGE_SIZE = 50;
                  const currentPage = listPages[listName] || 1;
                  const totalPages = Math.ceil(listLeads.length / PAGE_SIZE);
                  const paginatedLeads = listLeads.slice(0, currentPage * PAGE_SIZE);

                  return (
                    <div className="px-2 pb-2">
                      <div className="divide-y divide-border/60">
                        {paginatedLeads.map(lead => renderLeadRow(lead))}
                      </div>
                      {currentPage * PAGE_SIZE < listLeads.length && (
                        <div className="flex items-center justify-center pt-3 pb-1 gap-3">
                          <span className="text-[10px] text-muted-foreground">
                            Mostrando {paginatedLeads.length} de {listLeads.length}
                          </span>
                          <Button
                            variant="outline"
                            size="sm"
                            className="h-7 text-xs"
                            onClick={(e) => {
                              e.stopPropagation();
                              setListPages(prev => ({ ...prev, [listName]: currentPage + 1 }));
                            }}
                          >
                            Carregar mais 50
                          </Button>
                        </div>
                      )}
                    </div>
                  );
                })()}
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
