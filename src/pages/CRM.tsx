
import { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { CRMKPIs } from '@/components/crm/CRMKPIs';
import { KanbanBoard } from '@/components/crm/KanbanBoard';
import { LeadDrawer } from '@/components/crm/LeadDrawer';
import { LostDealsDialog } from '@/components/crm/LostDealsDialog';
import { CRMFilters } from '@/components/crm/CRMFilters';
import { useIsMobile } from '@/hooks/use-mobile';

export interface CRMLead {
  id: string;
  cliente_nome: string;
  client_name: string | null;
  contact_name: string | null;
  contact_phone: string | null;
  contact_email: string | null;
  status: string;
  valor_estimado: number | null;
  origem: string | null;
  source: string | null;
  observacoes: string | null;
  notes: string | null;
  vendedor_id: string | null;
  especialista_id: string | null;
  empresa: string | null;
  produto_interesse: string | null;
  temperatura: number | null;
  created_at: string;
  updated_at: string;
  data_abertura: string;
  budget_number: string | null;
  numero_lead: string | null;
  cliente_telefone: string | null;
  cliente_email: string | null;
}

export const CRM_STAGES = [
  { key: 'lead', label: 'Lead', color: 'hsl(var(--primary))' },
  { key: 'contato_feito', label: 'Contato Feito', color: 'hsl(38, 92%, 50%)' },
  { key: 'visita_reuniao', label: 'Visita / Reunião', color: 'hsl(262, 52%, 47%)' },
  { key: 'proposta', label: 'Proposta', color: 'hsl(var(--success))' },
  { key: 'pedido', label: 'Pedido', color: 'hsl(173, 80%, 36%)' },
] as const;

export type CRMStageKey = typeof CRM_STAGES[number]['key'];

export default function CRM() {
  const [leads, setLeads] = useState<CRMLead[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedLead, setSelectedLead] = useState<CRMLead | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [lostDialogOpen, setLostDialogOpen] = useState(false);
  const [pendingLostLead, setPendingLostLead] = useState<CRMLead | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [vendorFilter, setVendorFilter] = useState('all');
  const [todayContacts, setTodayContacts] = useState(0);
  const [dailyGoal, setDailyGoal] = useState(0);
  const { toast } = useToast();
  const isMobile = useIsMobile();

  const loadLeads = useCallback(async () => {
    try {
      const { data, error } = await (supabase as any)
        .from('leads')
        .select('*')
        .order('updated_at', { ascending: false });

      if (error) throw error;
      setLeads(data || []);
    } catch (error) {
      console.error('Erro ao carregar leads:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  const loadTodayContacts = useCallback(async () => {
    try {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const { data, error } = await supabase
        .from('lead_activities')
        .select('id')
        .gte('created_at', today.toISOString())
        .eq('activity_type', 'contato_inicial');
      if (!error) setTodayContacts(data?.length || 0);
    } catch {}
  }, []);

  const loadDailyGoal = useCallback(async () => {
    try {
      const currentMonth = new Date().toISOString().slice(0, 7);
      const { data } = await supabase
        .from('admin_goals')
        .select('daily_contacts_goal')
        .eq('month_year', currentMonth)
        .maybeSingle();
      if (data?.daily_contacts_goal) setDailyGoal(data.daily_contacts_goal);
    } catch {}
  }, []);

  useEffect(() => {
    loadLeads();
    loadTodayContacts();
    loadDailyGoal();
  }, [loadLeads, loadTodayContacts, loadDailyGoal]);

  const updateLeadStatus = async (leadId: string, newStatus: string) => {
    const lead = leads.find(l => l.id === leadId);
    if (!lead) return;

    if (newStatus === 'perdido') {
      setPendingLostLead(lead);
      setLostDialogOpen(true);
      return;
    }

    try {
      const { error } = await (supabase as any)
        .from('leads')
        .update({ status: newStatus, updated_at: new Date().toISOString() })
        .eq('id', leadId);

      if (error) throw error;

      setLeads(prev => prev.map(l => l.id === leadId ? { ...l, status: newStatus, updated_at: new Date().toISOString() } : l));

      // If moved to contato_feito, register activity
      if (newStatus === 'contato_feito') {
        await supabase.from('lead_activities').insert({
          lead_id: leadId,
          activity_type: 'contato_inicial',
          description: 'Contato registrado via CRM',
          user_id: (await supabase.auth.getUser()).data.user?.id,
        } as any);
        loadTodayContacts();
      }

      toast({ title: 'Status atualizado', description: `Lead movido para ${CRM_STAGES.find(s => s.key === newStatus)?.label || newStatus}` });
    } catch (error) {
      console.error('Erro ao atualizar status:', error);
      toast({ title: 'Erro', description: 'Erro ao atualizar status do lead', variant: 'destructive' });
    }
  };

  const confirmLostDeal = async (reason: string) => {
    if (!pendingLostLead) return;
    try {
      const user = (await supabase.auth.getUser()).data.user;
      const { error } = await (supabase as any)
        .from('leads')
        .update({ status: 'perdido', updated_at: new Date().toISOString(), observacoes: reason })
        .eq('id', pendingLostLead.id);

      if (error) throw error;

      // Register in lead_dispositions
      await supabase.from('lead_dispositions').insert({
        lead_id: pendingLostLead.id,
        user_id: user?.id || '',
        disposition_type: 'lost',
        reason: reason,
        lead_client_name: pendingLostLead.cliente_nome,
      } as any);

      setLeads(prev => prev.map(l => l.id === pendingLostLead.id ? { ...l, status: 'perdido' } : l));
      setPendingLostLead(null);
      setLostDialogOpen(false);
      toast({ title: 'Lead perdido', description: 'Lead marcado como perdido.' });
    } catch (error) {
      toast({ title: 'Erro', description: 'Erro ao marcar lead como perdido', variant: 'destructive' });
    }
  };

  const openLeadDrawer = (lead: CRMLead) => {
    setSelectedLead(lead);
    setDrawerOpen(true);
  };

  // Filter leads
  const filteredLeads = leads.filter(l => {
    if (l.status === 'perdido') return false;
    const name = (l.client_name || l.cliente_nome || '').toLowerCase();
    if (searchQuery && !name.includes(searchQuery.toLowerCase())) return false;
    if (vendorFilter !== 'all' && l.vendedor_id !== vendorFilter) return false;
    return true;
  });

  const lostLeads = leads.filter(l => l.status === 'perdido');
  const lostValue = lostLeads.reduce((sum, l) => sum + (l.valor_estimado || 0), 0);

  // Funnel counts
  const funnelCounts = CRM_STAGES.map(stage => ({
    ...stage,
    count: filteredLeads.filter(l => l.status === stage.key).length,
    value: filteredLeads.filter(l => l.status === stage.key).reduce((s, l) => s + (l.valor_estimado || 0), 0),
  }));

  return (
    <div className="p-3 sm:p-6 space-y-4 sm:space-y-6">
      <CRMKPIs
        todayContacts={todayContacts}
        dailyGoal={dailyGoal}
        funnelCounts={funnelCounts}
        lostCount={lostLeads.length}
        lostValue={lostValue}
        totalLeads={filteredLeads.length}
        onLostClick={() => setLostDialogOpen(true)}
      />

      <CRMFilters
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        vendorFilter={vendorFilter}
        onVendorChange={setVendorFilter}
      />

      <KanbanBoard
        leads={filteredLeads}
        stages={CRM_STAGES}
        loading={loading}
        onStatusChange={updateLeadStatus}
        onCardClick={openLeadDrawer}
      />

      <LeadDrawer
        lead={selectedLead}
        open={drawerOpen}
        onClose={() => { setDrawerOpen(false); setSelectedLead(null); }}
        onStatusChange={updateLeadStatus}
        onLeadUpdated={loadLeads}
      />

      <LostDealsDialog
        open={lostDialogOpen}
        onOpenChange={setLostDialogOpen}
        pendingLead={pendingLostLead}
        lostLeads={lostLeads}
        onConfirmLost={confirmLostDeal}
        onCancel={() => { setPendingLostLead(null); setLostDialogOpen(false); }}
      />
    </div>
  );
}
