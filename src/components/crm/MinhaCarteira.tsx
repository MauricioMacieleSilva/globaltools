import { useMemo, useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Search, Building2, Phone, Mail, MapPin, RotateCcw, Users, Trash2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import type { CRMLead } from '@/pages/CRM';

interface MinhaCarteiraProps {
  leads: CRMLead[];
  currentUserId: string;
  onLeadClick: (lead: CRMLead) => void;
  onLeadReactivated?: () => void;
}

const statusLabels: Record<string, { label: string; color: string }> = {
  lead: { label: 'Lead', color: 'bg-blue-100 text-blue-800' },
  contato_feito: { label: 'Contato', color: 'bg-amber-100 text-amber-800' },
  passagem_bastao: { label: 'Passagem', color: 'bg-pink-100 text-pink-800' },
  visita_reuniao: { label: 'Visita', color: 'bg-purple-100 text-purple-800' },
  analise_financeira: { label: 'Análise', color: 'bg-indigo-100 text-indigo-800' },
  proposta: { label: 'Proposta', color: 'bg-green-100 text-green-800' },
  pedido_fechado: { label: 'Fechado', color: 'bg-teal-100 text-teal-800' },
  perdido: { label: 'Perdido', color: 'bg-red-100 text-red-800' },
};

type StatusFilter = 'todos' | 'andamento' | 'fechados' | 'perdidos';

export function MinhaCarteira({ leads, currentUserId, onLeadClick, onLeadReactivated }: MinhaCarteiraProps) {
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

  // Admin sees ALL leads, regular user sees only their own
  const myLeads = useMemo(() => {
    if (isAdmin) return leads;
    return leads.filter(l => l.vendedor_id === currentUserId);
  }, [leads, currentUserId, isAdmin]);

  const filtered = useMemo(() => {
    let result = myLeads;
    if (statusFilter === 'andamento') {
      result = result.filter(l => l.status !== 'perdido' && l.status !== 'pedido_fechado');
    } else if (statusFilter === 'fechados') {
      result = result.filter(l => l.status === 'pedido_fechado');
    } else if (statusFilter === 'perdidos') {
      result = result.filter(l => l.status === 'perdido');
    }
    if (search) {
      const term = search.toLowerCase();
      result = result.filter(l =>
        (l.empresa || l.cliente_nome || '').toLowerCase().includes(term) ||
        (l.cliente_cnpj || '').includes(term) ||
        (l.contact_name || '').toLowerCase().includes(term) ||
        (l.cliente_telefone || '').includes(term)
      );
    }
    return result;
  }, [myLeads, search, statusFilter]);

  const counts = useMemo(() => ({
    total: myLeads.length,
    andamento: myLeads.filter(l => l.status !== 'perdido' && l.status !== 'pedido_fechado').length,
    fechados: myLeads.filter(l => l.status === 'pedido_fechado').length,
    perdidos: myLeads.filter(l => l.status === 'perdido').length,
  }), [myLeads]);

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

  const renderLeadCard = (lead: CRMLead) => {
    const status = statusLabels[lead.status] || { label: lead.status, color: 'bg-muted text-muted-foreground' };
    const isLost = lead.status === 'perdido';
    return (
      <Card
        key={lead.id}
        className="cursor-pointer hover:shadow-md transition-shadow"
        onClick={() => onLeadClick(lead)}
      >
        <CardContent className="p-3 space-y-1.5">
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
    { key: 'andamento', label: 'Em Andamento', value: counts.andamento, colorClass: 'text-primary' },
    { key: 'fechados', label: 'Fechados', value: counts.fechados, colorClass: 'text-green-600' },
    { key: 'perdidos', label: 'Perdidos', value: counts.perdidos, colorClass: 'text-red-600' },
  ];

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
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

      <div className="relative">
        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder={isAdmin ? "Buscar em todos os leads..." : "Buscar na minha carteira..."}
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="pl-8"
        />
      </div>

      <ScrollArea className="h-[calc(100vh-320px)]">
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
    </div>
  );
}
