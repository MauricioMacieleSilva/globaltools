import { useMemo, useState, useEffect, useRef } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Search, Building2, Phone, Mail, MapPin, RotateCcw, Users, Trash2, FileSpreadsheet, Loader2, Ban } from 'lucide-react';
import * as XLSX from 'xlsx';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import type { CRMLead } from '@/pages/CRM';
import { isBlockedLossReason, getBlockedReasonLabel } from '@/lib/lead-blocked-reasons';

interface MinhaCarteiraProps {
  leads: CRMLead[];
  currentUserId: string;
  onLeadClick: (lead: CRMLead) => void;
  onLeadReactivated?: () => void;
  origemFilter?: string;
  vendorFilter?: string;
  searchQuery?: string;
  kanbanDateFilter?: string;
}

const statusLabels: Record<string, { label: string; color: string }> = {
  lead: { label: 'Lead', color: 'bg-blue-100 text-blue-800' },
  contato_feito: { label: 'Contato', color: 'bg-amber-100 text-amber-800' },
  passagem_bastao: { label: 'Passagem', color: 'bg-pink-100 text-pink-800' },
  visita_reuniao: { label: 'Follow', color: 'bg-purple-100 text-purple-800' },
  analise_financeira: { label: 'Análise', color: 'bg-indigo-100 text-indigo-800' },
  proposta: { label: 'Proposta', color: 'bg-green-100 text-green-800' },
  pedido_fechado: { label: 'Fechado', color: 'bg-teal-100 text-teal-800' },
  perdido: { label: 'Perdido', color: 'bg-red-100 text-red-800' },
};

type StatusFilter = 'todos' | 'andamento' | 'kanban' | 'agendados' | 'fechados' | 'perdidos' | 'bloqueados';

export function MinhaCarteira({ leads, currentUserId, onLeadClick, onLeadReactivated, origemFilter, vendorFilter, searchQuery: externalSearch, kanbanDateFilter }: MinhaCarteiraProps) {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('todos');
  const [reactivateConfirm, setReactivateConfirm] = useState<CRMLead | null>(null);
  const [reactivating, setReactivating] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [vendors, setVendors] = useState<{ id: string; name: string }[]>([]);
  const [assignVendorOpen, setAssignVendorOpen] = useState(false);
  const [assignVendorLead, setAssignVendorLead] = useState<CRMLead | null>(null);
  const [selectedVendorId, setSelectedVendorId] = useState('');
  const [assigning, setAssigning] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<CRMLead | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [exporting, setExporting] = useState(false);
  // Map leadId -> motivo bloqueante (de lead_dispositions, para leads bloqueados mesmo que reativados)
  const [blockedMap, setBlockedMap] = useState<Record<string, string>>({});
  // Set de leadIds que possuem visita ou follow-up futuro agendado
  const [scheduledLeadIds, setScheduledLeadIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    const checkRole = async () => {
      const { data: authData } = await supabase.auth.getUser();
      if (!authData.user) return;
      const { data: roleData } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', authData.user.id)
        .maybeSingle();
      const role = (roleData as any)?.role;
      setIsAdmin(role === 'admin' || role === 'comercial');
    };
    checkRole();
  }, []);

  useEffect(() => {
    if (isAdmin) {
      supabase.from('user_profiles').select('id, full_name').then(({ data }) => {
        if (data) setVendors(data.map(v => ({ id: v.id, name: v.full_name })));
      });
    }
  }, [isAdmin]);

  // Carrega motivos bloqueantes de lead_dispositions para todos os leads visíveis
  const lastBlockedKeyRef = useRef<string>('');
  useEffect(() => {
    const loadBlocked = async () => {
      const ids = leads.map(l => l.id);
      if (ids.length === 0) { setBlockedMap({}); return; }
      // Evita refetch quando o conjunto de IDs não mudou (apenas a referência do array)
      const key = ids.slice().sort().join(',');
      if (key === lastBlockedKeyRef.current) return;
      lastBlockedKeyRef.current = key;
      const { data } = await (supabase as any)
        .from('lead_dispositions')
        .select('lead_id, reason, custom_reason')
        .eq('disposition_type', 'lost')
        .in('lead_id', ids);
      const map: Record<string, string> = {};
      (data || []).forEach((d: any) => {
        const r = d.reason || d.custom_reason || '';
        if (isBlockedLossReason(r)) map[d.lead_id] = r;
      });
      setBlockedMap(map);
    };
    loadBlocked();
  }, [leads]);

  // Carrega leads com visitas ou follow-ups futuros agendados (sem filtro .in para evitar limite de URL)
  const lastScheduledKeyRef = useRef<string>('');
  useEffect(() => {
    const loadScheduled = async () => {
      if (leads.length === 0) { setScheduledLeadIds(new Set()); return; }
      // Refetch no máximo a cada 60s, ou quando o conjunto de IDs mudar
      const ids = leads.map(l => l.id).sort().join(',');
      const minute = Math.floor(Date.now() / 60000);
      const key = `${minute}:${ids}`;
      if (key === lastScheduledKeyRef.current) return;
      lastScheduledKeyRef.current = key;
      const nowIso = new Date().toISOString();
      const [visitsRes, followsRes] = await Promise.all([
        (supabase as any).from('crm_visits').select('lead_id').gte('visit_date', nowIso),
        supabase.from('follow_ups').select('lead_id').eq('concluido', false).gte('data_agendada', nowIso).not('lead_id', 'is', null),
      ]);
      const set = new Set<string>();
      (visitsRes.data || []).forEach((v: any) => v.lead_id && set.add(v.lead_id));
      (followsRes.data || []).forEach((f: any) => f.lead_id && set.add(f.lead_id));
      setScheduledLeadIds(set);
    };
    loadScheduled();
  }, [leads]);

  // Helper: lead é bloqueado se status=perdido com motivo bloqueante OU tem disposição bloqueante registrada
  const isLeadBlocked = (lead: CRMLead): string | null => {
    if (blockedMap[lead.id]) return blockedMap[lead.id];
    if (lead.status === 'perdido' && isBlockedLossReason(lead.notes)) return lead.notes!;
    return null;
  };

  // Admin sees ALL leads, regular user sees only their own
  const myLeads = useMemo(() => {
    let result = isAdmin ? leads : leads.filter(l => l.vendedor_id === currentUserId);
    // Apply external filters from CRM header
    if (origemFilter && origemFilter !== 'all') {
      result = result.filter(l => {
        const leadOrigem = (l.source || l.origem || '').toLowerCase().trim();
        return leadOrigem === origemFilter.toLowerCase().trim();
      });
    }
    if (vendorFilter && vendorFilter !== 'all') {
      result = result.filter(l => l.vendedor_id === vendorFilter);
    }
    if (kanbanDateFilter) {
      result = result.filter(l => {
        const d = l.created_at || l.data_abertura;
        return d && d.startsWith(kanbanDateFilter);
      });
    }
    if (externalSearch) {
      const term = externalSearch.toLowerCase();
      const termDigits = externalSearch.replace(/\D/g, '');
      result = result.filter(l =>
        (l.empresa || l.cliente_nome || '').toLowerCase().includes(term) ||
        (l.cliente_cnpj || '').includes(term) ||
        (l.contact_name || '').toLowerCase().includes(term) ||
        (l.cliente_telefone || '').includes(term) ||
        (termDigits.length >= 3 && [l.contact_phone, l.cliente_telefone, l.cliente_cnpj]
          .some(p => p && p.replace(/\D/g, '').includes(termDigits)))
      );
    }
    return result;
  }, [leads, currentUserId, isAdmin, origemFilter, vendorFilter, kanbanDateFilter, externalSearch]);

  const isAndamento = (l: CRMLead) => l.status !== 'perdido' && l.status !== 'pedido_fechado' && !isLeadBlocked(l);
  // Um lead aparece em "Agendados" sempre que tem visita/follow-up futuro agendado
  // E não está bloqueado (Não Recontatar). Inclui leads "perdido" cujo kanban
  // solicitou agendamento de follow-up no momento da perda.
  const isAgendado = (l: CRMLead) => !isLeadBlocked(l) && scheduledLeadIds.has(l.id);

  const filtered = useMemo(() => {
    let result = myLeads;
    if (statusFilter === 'andamento') {
      result = result.filter(l => isAndamento(l) || isAgendado(l));
    } else if (statusFilter === 'kanban') {
      result = result.filter(l => isAndamento(l) && !isAgendado(l));
    } else if (statusFilter === 'agendados') {
      result = result.filter(isAgendado);
    } else if (statusFilter === 'fechados') {
      result = result.filter(l => l.status === 'pedido_fechado');
    } else if (statusFilter === 'perdidos') {
      // Perdidos sem follow-up agendado e sem motivo bloqueante
      result = result.filter(l => l.status === 'perdido' && !isLeadBlocked(l) && !scheduledLeadIds.has(l.id));
    } else if (statusFilter === 'bloqueados') {
      result = result.filter(l => !!isLeadBlocked(l));
    }
    if (search) {
      const term = search.toLowerCase();
      const termDigits = search.replace(/\D/g, '');
      result = result.filter(l =>
        (l.empresa || l.cliente_nome || '').toLowerCase().includes(term) ||
        (l.cliente_cnpj || '').includes(term) ||
        (l.contact_name || '').toLowerCase().includes(term) ||
        (l.cliente_telefone || '').includes(term) ||
        (termDigits.length >= 3 && [l.contact_phone, l.cliente_telefone, l.cliente_cnpj]
          .some(p => p && p.replace(/\D/g, '').includes(termDigits)))
      );
    }
    return result;
  }, [myLeads, search, statusFilter, blockedMap, scheduledLeadIds]);

  const counts = useMemo(() => {
    const blocked = myLeads.filter(l => !!isLeadBlocked(l));
    const blockedIds = new Set(blocked.map(l => l.id));
    // Agendados: qualquer lead (inclusive "perdido") com follow-up/visita futura, exceto bloqueados
    const agendadosLeads = myLeads.filter(l => !blockedIds.has(l.id) && scheduledLeadIds.has(l.id));
    const agendadosIds = new Set(agendadosLeads.map(l => l.id));
    // No Kanban: em andamento (não perdido, não fechado, não bloqueado) e sem agendamento futuro
    const kanbanLeads = myLeads.filter(l =>
      l.status !== 'perdido' && l.status !== 'pedido_fechado' && !blockedIds.has(l.id) && !agendadosIds.has(l.id)
    );
    return {
      total: myLeads.length,
      andamento: kanbanLeads.length + agendadosLeads.length,
      kanban: kanbanLeads.length,
      agendados: agendadosLeads.length,
      fechados: myLeads.filter(l => l.status === 'pedido_fechado').length,
      // Perdidos "comuns": perdido sem agendamento e sem motivo bloqueante
      perdidos: myLeads.filter(l => l.status === 'perdido' && !blockedIds.has(l.id) && !scheduledLeadIds.has(l.id)).length,
      bloqueados: blocked.length,
    };
  }, [myLeads, blockedMap, scheduledLeadIds]);

  const handleReactivate = async () => {
    if (!reactivateConfirm) return;
    setReactivating(true);
    try {
      const user = (await supabase.auth.getUser()).data.user;
      
      // If admin is reactivating and selected a vendor, assign to that vendor
      const updatePayload: any = { status: 'lead', updated_at: new Date().toISOString() };
      if (isAdmin && selectedVendorId) {
        updatePayload.vendedor_id = selectedVendorId;
      }
      
      await (supabase as any)
        .from('leads')
        .update(updatePayload)
        .eq('id', reactivateConfirm.id);

      let desc = 'Novo atendimento iniciado — lead reativado de "Perdido" para "Lead"';
      if (isAdmin && selectedVendorId) {
        const vendorName = vendors.find(v => v.id === selectedVendorId)?.name || 'vendedor';
        desc += ` — atribuído a ${vendorName}`;
      }

      await supabase.from('lead_activities').insert({
        lead_id: reactivateConfirm.id,
        activity_type: 'mudanca_status',
        description: desc,
        user_id: user?.id || '',
      } as any);

      toast.success('Novo atendimento iniciado', {
        description: `${reactivateConfirm.empresa || reactivateConfirm.cliente_nome} voltou para o Kanban`,
      });
      onLeadReactivated?.();
    } catch {
      toast.error('Erro ao iniciar novo atendimento');
    } finally {
      setReactivating(false);
      setReactivateConfirm(null);
      setSelectedVendorId('');
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      const { error } = await (supabase as any).from('leads').delete().eq('id', deleteTarget.id);
      if (error) throw error;
      toast.success('Lead excluído permanentemente');
      onLeadReactivated?.();
    } catch {
      toast.error('Erro ao excluir lead');
    } finally {
      setDeleting(false);
      setDeleteTarget(null);
    }
  };

  const handleExportExcel = async () => {
    setExporting(true);
    try {
      const statusMap: Record<string, string> = {
        lead: 'Lead',
        contato_feito: 'Contato Feito',
        passagem_bastao: 'Passagem de Bastão',
        visita_reuniao: 'Visita/Reunião',
        analise_financeira: 'Análise Financeira',
        proposta: 'Proposta',
        pedido_fechado: 'Pedido Fechado',
        perdido: 'Perdido',
      };

      const rows = filtered.map(l => ({
        'Empresa': l.empresa || l.cliente_nome || '',
        'Contato': l.contact_name || '',
        'CNPJ': l.cliente_cnpj || '',
        'Telefone': l.cliente_telefone || l.contact_phone || '',
        'E-mail': l.cliente_email || l.contact_email || '',
        'Cidade': l.cidade || '',
        'Estado': l.estado || '',
        'Origem': l.source || l.origem || '',
        'Ramo de Atuação': l.ramo_atuacao || '',
        'Produto de Interesse': l.produto_interesse || '',
        'Status': statusMap[l.status] || l.status,
        'Valor Estimado': l.valor_estimado || 0,
        'Temperatura': l.temperatura ?? '',
        'Nº Lead': l.numero_lead || '',
        'Nº Orçamento': l.budget_number || '',
        'Vendedor': l.vendedor?.full_name || '',
        'Data Abertura': l.data_abertura ? new Date(l.data_abertura).toLocaleDateString('pt-BR') : '',
        'Última Atualização': l.updated_at ? new Date(l.updated_at).toLocaleDateString('pt-BR') : '',
        'Observações': l.observacoes || l.notes || '',
      }));

      const ws = XLSX.utils.json_to_sheet(rows);
      
      // Auto-size columns
      const colWidths = Object.keys(rows[0] || {}).map(key => ({
        wch: Math.max(key.length, ...rows.map(r => String((r as any)[key] || '').length).slice(0, 50)) + 2
      }));
      ws['!cols'] = colWidths;

      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Carteira');
      XLSX.writeFile(wb, `carteira-leads-${new Date().toISOString().split('T')[0]}.xlsx`);

      toast.success('Relatório exportado com sucesso!');
    } catch {
      toast.error('Erro ao exportar relatório');
    } finally {
      setExporting(false);
    }
  };

  const renderLeadCard = (lead: CRMLead) => {
    const status = statusLabels[lead.status] || { label: lead.status, color: 'bg-muted text-muted-foreground' };
    const isLost = lead.status === 'perdido';
    const blockedReason = isLeadBlocked(lead);
    return (
      <Card
        key={lead.id}
        className={`cursor-pointer hover:shadow-md transition-shadow ${blockedReason ? 'border-destructive/60 bg-destructive/5 ring-1 ring-destructive/30' : ''}`}
        onClick={() => onLeadClick(lead)}
      >
        <CardContent className="p-3 space-y-1.5">
          {blockedReason && (
            <div className="flex items-center gap-1.5 -mx-3 -mt-3 mb-1 px-3 py-1.5 bg-destructive text-destructive-foreground rounded-t-lg">
              <Ban className="h-3.5 w-3.5 shrink-0" />
              <span className="text-[10px] font-bold uppercase tracking-wide">Não Recontatar</span>
              <span className="text-[10px] opacity-90 truncate">· {getBlockedReasonLabel(blockedReason)}</span>
            </div>
          )}
          <div className="flex items-center justify-between">
            <h4 className="font-medium text-sm truncate">{lead.empresa || lead.cliente_nome}</h4>
            <Badge className={`text-[10px] ${status.color}`}>{status.label}</Badge>
          </div>
          {lead.contact_name && (
            <p className="text-xs text-muted-foreground">{lead.contact_name}</p>
          )}
          <div className="flex flex-wrap gap-x-3 gap-y-1 text-[11px] text-muted-foreground">
            {lead.cidade && lead.estado && (
              <span className="flex items-center gap-0.5">
                <MapPin className="h-3 w-3" /> {lead.cidade}/{lead.estado}
              </span>
            )}
            {lead.cliente_telefone && (
              <span className="flex items-center gap-0.5">
                <Phone className="h-3 w-3" /> {lead.cliente_telefone}
              </span>
            )}
            {lead.cliente_email && (
              <span className="flex items-center gap-0.5">
                <Mail className="h-3 w-3" /> {lead.cliente_email}
              </span>
            )}
            {lead.ramo_atuacao && (
              <span className="flex items-center gap-0.5">
                <Building2 className="h-3 w-3" /> {lead.ramo_atuacao}
              </span>
            )}
          </div>
          {/* Show vendor name for admin view */}
          {isAdmin && lead.vendedor?.full_name && (
            <p className="text-[10px] text-muted-foreground flex items-center gap-1">
              <Users className="h-3 w-3" /> {lead.vendedor.full_name}
            </p>
          )}
          {lead.valor_estimado && lead.valor_estimado > 0 && (
            <p className="text-xs font-medium text-primary">
              R$ {lead.valor_estimado.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
            </p>
          )}
          {isLost && (
            <div className="pt-1 border-t border-border/40 flex gap-1.5">
              {!blockedReason && (
                <Button
                  size="sm"
                  variant="outline"
                  className="h-7 text-xs gap-1 flex-1"
                  onClick={(e) => {
                    e.stopPropagation();
                    setReactivateConfirm(lead);
                  }}
                >
                  <RotateCcw className="h-3 w-3" />
                  Iniciar Novo Atendimento
                </Button>
              )}
              {blockedReason && (
                <p className="flex-1 text-[10px] text-destructive font-medium italic">
                  Este lead não deve ser recontatado.
                </p>
              )}
              {isAdmin && (
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-7 w-7 p-0 text-destructive hover:text-destructive hover:bg-destructive/10"
                  onClick={(e) => {
                    e.stopPropagation();
                    setDeleteTarget(lead);
                  }}
                  title="Excluir lead permanentemente"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    );
  };

  const kpiCards: { key: StatusFilter; label: string; value: number; colorClass: string }[] = [
    { key: 'todos', label: 'Total na Carteira', value: counts.total, colorClass: '' },
    { key: 'kanban', label: 'No Kanban', value: counts.kanban, colorClass: 'text-blue-600' },
    { key: 'agendados', label: 'Agendados', value: counts.agendados, colorClass: 'text-purple-600' },
    { key: 'fechados', label: 'Fechados', value: counts.fechados, colorClass: 'text-green-600' },
    { key: 'perdidos', label: 'Perdidos', value: counts.perdidos, colorClass: 'text-red-600' },
    { key: 'bloqueados', label: '🚫 Não Recontatar', value: counts.bloqueados, colorClass: 'text-destructive' },
  ];

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2">
        {kpiCards.map(kpi => (
          <Card
            key={kpi.key}
            className={`cursor-pointer transition-all ${statusFilter === kpi.key ? 'ring-2 ring-primary shadow-md' : 'hover:shadow-sm'}`}
            onClick={() => setStatusFilter(statusFilter === kpi.key ? 'todos' : kpi.key)}
          >
            <CardContent className="p-3 text-center">
              <p className={`text-2xl font-bold ${kpi.colorClass}`}>{kpi.value}</p>
              <p className="text-[11px] text-muted-foreground">{kpi.label}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder={isAdmin ? "Buscar em todos os leads..." : "Buscar na minha carteira..."}
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="pl-8"
          />
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={handleExportExcel}
          disabled={exporting || filtered.length === 0}
          className="gap-1.5 whitespace-nowrap"
          title="Exportar carteira em Excel"
        >
          {exporting ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileSpreadsheet className="h-4 w-4" />}
          <span className="hidden sm:inline">Exportar</span>
        </Button>
      </div>

      <ScrollArea className="max-h-[calc(100vh-260px)]">
        <div className="space-y-4 pr-2">
          {filtered.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
              {filtered.map(renderLeadCard)}
            </div>
          ) : (
            <p className="text-center text-sm text-muted-foreground py-8">
              {search ? 'Nenhum lead encontrado na busca' : 'Nenhum lead nesta categoria'}
            </p>
          )}
        </div>
      </ScrollArea>

      <AlertDialog open={!!reactivateConfirm} onOpenChange={(v) => { if (!v) { setReactivateConfirm(null); setSelectedVendorId(''); } }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Iniciar Novo Atendimento</AlertDialogTitle>
            <AlertDialogDescription>
              Deseja iniciar um novo atendimento para <strong>{reactivateConfirm?.empresa || reactivateConfirm?.cliente_nome}</strong>?
              O lead voltará para a etapa inicial do Kanban.
            </AlertDialogDescription>
          </AlertDialogHeader>
          {isAdmin && (
            <div className="space-y-2">
              <p className="text-sm font-medium">Atribuir a:</p>
              <Select value={selectedVendorId} onValueChange={setSelectedVendorId}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Selecione o responsável" />
                </SelectTrigger>
                <SelectContent>
                  {vendors.map(v => (
                    <SelectItem key={v.id} value={v.id}>{v.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
          <AlertDialogFooter>
            <AlertDialogCancel disabled={reactivating}>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleReactivate} disabled={reactivating || (isAdmin && !selectedVendorId)}>
              {reactivating ? 'Iniciando...' : 'Confirmar'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={!!deleteTarget} onOpenChange={(v) => { if (!v) setDeleteTarget(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir lead permanentemente?</AlertDialogTitle>
            <AlertDialogDescription>
              O lead <strong>{deleteTarget?.empresa || deleteTarget?.cliente_nome}</strong> será removido permanentemente da base. Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={deleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleting ? 'Excluindo...' : 'Excluir'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
