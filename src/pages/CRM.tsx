
import { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { CRMKPIs } from '@/components/crm/CRMKPIs';
import { KanbanBoard } from '@/components/crm/KanbanBoard';
import { CRMDashboard } from '@/components/crm/CRMDashboard';
import { LeadDrawer } from '@/components/crm/LeadDrawer';
import { LostDealsDialog } from '@/components/crm/LostDealsDialog';
import { CRMFilters } from '@/components/crm/CRMFilters';
import { NewLeadDialog } from '@/components/crm/NewLeadDialog';
import { LeadListView } from '@/components/crm/LeadListView';
import { TeamPerformance } from '@/components/crm/TeamPerformance';
import { PortfolioHealth } from '@/components/crm/PortfolioHealth';
import { VisitScheduleDialog } from '@/components/crm/VisitScheduleDialog';
import { VisitCalendar } from '@/components/crm/VisitCalendar';
import { LeadEnrichGateDialog } from '@/components/crm/LeadEnrichGateDialog';
import { useIsMobile } from '@/hooks/use-mobile';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Plus, LayoutGrid, List, BarChart3, CalendarDays, PieChart } from 'lucide-react';

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
  cliente_cnpj: string | null;
  ramo_atuacao: string | null;
  regime_tributario: string | null;
  estado: string | null;
  cidade: string | null;
  vendedor?: { full_name: string; avatar_url: string | null } | null;
}

export const CRM_STAGES = [
  { key: 'lead', label: 'Lead', color: 'hsl(200, 98%, 39%)' },
  { key: 'contato_feito', label: 'Contato Feito', color: 'hsl(38, 92%, 50%)' },
  { key: 'visita_reuniao', label: 'Visita / Reunião', color: 'hsl(262, 52%, 47%)' },
  { key: 'proposta', label: 'Proposta', color: 'hsl(142, 76%, 36%)' },
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
  const [todayVisits, setTodayVisits] = useState(0);
  const [dailyGoal, setDailyGoal] = useState(0);
  const [dailyVisitsGoal, setDailyVisitsGoal] = useState(0);
  const [newLeadOpen, setNewLeadOpen] = useState(false);
  const [activeTab, setActiveTab] = useState('kanban');
  // Visit schedule dialog
  const [visitDialogOpen, setVisitDialogOpen] = useState(false);
  const [pendingVisitLead, setPendingVisitLead] = useState<CRMLead | null>(null);
  // Enrich gate dialog
  const [enrichGateOpen, setEnrichGateOpen] = useState(false);
  const [pendingEnrichLead, setPendingEnrichLead] = useState<CRMLead | null>(null);
  
  const isMobile = useIsMobile();

  const loadLeads = useCallback(async () => {
    try {
      const { data, error } = await (supabase as any)
        .from('leads')
        .select('*, vendedor:user_profiles!leads_vendedor_id_fkey(full_name, avatar_url)')
        .order('updated_at', { ascending: false });
      if (error) throw error;
      setLeads(data || []);
    } catch (error) {
      console.error('Erro ao carregar leads:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  const loadTodayStats = useCallback(async () => {
    try {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const { data } = await supabase
        .from('lead_activities')
        .select('id, activity_type')
        .gte('created_at', today.toISOString());
      if (data) {
        setTodayContacts(data.filter(a => a.activity_type === 'contato_inicial').length);
        setTodayVisits(data.filter(a => a.activity_type === 'visita').length);
      }
    } catch {}
  }, []);

  const loadGoals = useCallback(async () => {
    try {
      const currentMonth = new Date().toISOString().slice(0, 7);
      const { data } = await supabase
        .from('admin_goals')
        .select('daily_contacts_goal, qualified_leads_goal')
        .eq('month_year', currentMonth)
        .maybeSingle();
      if (data?.daily_contacts_goal) setDailyGoal(data.daily_contacts_goal);
      if (data?.qualified_leads_goal) setDailyVisitsGoal(data.qualified_leads_goal);
    } catch {}
  }, []);

  useEffect(() => {
    loadLeads();
    loadTodayStats();
    loadGoals();
  }, [loadLeads, loadTodayStats, loadGoals]);

  const checkContactAlreadyToday = async (leadId: string): Promise<boolean> => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const { data } = await supabase
      .from('lead_activities')
      .select('id')
      .eq('lead_id', leadId)
      .eq('activity_type', 'contato_inicial')
      .gte('created_at', today.toISOString())
      .limit(1);
    return (data?.length || 0) > 0;
  };

  const updateLeadStatus = async (leadId: string, newStatus: string) => {
    const lead = leads.find(l => l.id === leadId);
    if (!lead) return;

    if (newStatus === 'perdido') {
      setPendingLostLead(lead);
      setLostDialogOpen(true);
      return;
    }

    // Intercept visita_reuniao -> open schedule dialog
    if (newStatus === 'visita_reuniao') {
      setPendingVisitLead(lead);
      setVisitDialogOpen(true);
      return;
    }

    // Intercept lead -> contato_feito: require enrichment
    if (newStatus === 'contato_feito' && lead.status === 'lead') {
      setPendingEnrichLead(lead);
      setEnrichGateOpen(true);
      return;
    }

    try {
      const user = (await supabase.auth.getUser()).data.user;
      const oldStatus = lead.status;
      const { error } = await (supabase as any)
        .from('leads')
        .update({ status: newStatus, updated_at: new Date().toISOString() })
        .eq('id', leadId);
      if (error) throw error;

      setLeads(prev => prev.map(l => l.id === leadId ? { ...l, status: newStatus, updated_at: new Date().toISOString() } : l));

      // Log stage move in activity history
      const oldLabel = CRM_STAGES.find(s => s.key === oldStatus)?.label || oldStatus;
      const newLabel = CRM_STAGES.find(s => s.key === newStatus)?.label || newStatus;
      await supabase.from('lead_activities').insert({
        lead_id: leadId,
        activity_type: 'mudanca_status',
        description: `Movido de "${oldLabel}" para "${newLabel}"`,
        user_id: user?.id || '',
      } as any);

      if (newStatus === 'contato_feito') {
        const alreadyToday = await checkContactAlreadyToday(leadId);
        if (!alreadyToday) {
          await supabase.from('lead_activities').insert({
            lead_id: leadId,
            activity_type: 'contato_inicial',
            description: 'Contato registrado via CRM',
            user_id: user?.id || '',
          } as any);
        }
        loadTodayStats();
      }

      toast.success('Status atualizado', { description: `Lead movido para ${newLabel}` });
    } catch (error) {
      console.error('Erro ao atualizar status:', error);
      toast.error('Erro ao atualizar status do lead');
    }
  };

  const handleVisitConfirmed = async () => {
    if (!pendingVisitLead) return;
    // Update lead status after visit is scheduled
    try {
      await (supabase as any)
        .from('leads')
        .update({ status: 'visita_reuniao', updated_at: new Date().toISOString() })
        .eq('id', pendingVisitLead.id);
      setLeads(prev => prev.map(l => l.id === pendingVisitLead.id ? { ...l, status: 'visita_reuniao', updated_at: new Date().toISOString() } : l));
      loadTodayStats();
    } catch {}
    setPendingVisitLead(null);
  };

  const handleEnrichConfirmed = async () => {
    if (!pendingEnrichLead) return;
    try {
      const user = (await supabase.auth.getUser()).data.user;
      const oldStatus = pendingEnrichLead.status;
      await (supabase as any)
        .from('leads')
        .update({ status: 'contato_feito', updated_at: new Date().toISOString() })
        .eq('id', pendingEnrichLead.id);

      setLeads(prev => prev.map(l => l.id === pendingEnrichLead.id ? { ...l, status: 'contato_feito', updated_at: new Date().toISOString() } : l));

      const oldLabel = CRM_STAGES.find(s => s.key === oldStatus)?.label || oldStatus;
      await supabase.from('lead_activities').insert({
        lead_id: pendingEnrichLead.id,
        activity_type: 'mudanca_status',
        description: `Movido de "${oldLabel}" para "Contato Feito"`,
        user_id: user?.id || '',
      } as any);
      const alreadyToday = await checkContactAlreadyToday(pendingEnrichLead.id);
      if (!alreadyToday) {
        await supabase.from('lead_activities').insert({
          lead_id: pendingEnrichLead.id,
          activity_type: 'contato_inicial',
          description: 'Contato registrado via CRM',
          user_id: user?.id || '',
        } as any);
      }

      loadTodayStats();
      loadLeads();
      toast.success('Status atualizado', { description: 'Lead movido para Contato Feito' });
    } catch {
      toast.error('Erro ao mover lead');
    }
    setPendingEnrichLead(null);
  };

  const confirmLostDeal = async (reason: string) => {
    if (!pendingLostLead) return;
    try {
      const user = (await supabase.auth.getUser()).data.user;
      const { error } = await (supabase as any)
        .from('leads')
        .update({ status: 'perdido', updated_at: new Date().toISOString(), notes: reason })
        .eq('id', pendingLostLead.id);
      if (error) throw error;

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
      toast.success('Lead marcado como perdido');
    } catch {
      toast.error('Erro ao marcar lead como perdido');
    }
  };

  const openLeadDrawer = (lead: CRMLead) => {
    setSelectedLead(lead);
    setDrawerOpen(true);
  };

  const filteredLeads = leads.filter(l => {
    if (l.status === 'perdido') return false;
    const name = (l.client_name || l.cliente_nome || '').toLowerCase();
    if (searchQuery && !name.includes(searchQuery.toLowerCase())) return false;
    if (vendorFilter !== 'all' && l.vendedor_id !== vendorFilter) return false;
    return true;
  });

  const lostLeads = leads.filter(l => l.status === 'perdido');
  const lostValue = lostLeads.reduce((sum, l) => sum + (l.valor_estimado || 0), 0);

  const funnelCounts = CRM_STAGES.map(stage => ({
    ...stage,
    count: filteredLeads.filter(l => l.status === stage.key).length,
    value: filteredLeads.filter(l => l.status === stage.key).reduce((s, l) => s + (l.valor_estimado || 0), 0),
  }));

  return (
    <div className="p-3 sm:p-6 space-y-4 sm:space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg sm:text-xl font-bold text-foreground">CRM</h1>
          <p className="text-xs text-muted-foreground">Gestão de Leads e Pipeline de Vendas</p>
        </div>
        <Button data-tour="crm-new-lead" onClick={() => setNewLeadOpen(true)} className="gap-1.5">
          <Plus className="h-4 w-4" />
          {!isMobile && 'Novo Lead'}
        </Button>
      </div>

      <div data-tour="crm-kpis">
      <CRMKPIs
        todayContacts={todayContacts}
        dailyGoal={dailyGoal}
        todayVisits={todayVisits}
        dailyVisitsGoal={dailyVisitsGoal}
        funnelCounts={funnelCounts}
        lostCount={lostLeads.length}
        lostValue={lostValue}
        totalLeads={filteredLeads.length}
        onLostClick={() => setLostDialogOpen(true)}
      />
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <div className="flex items-center justify-between gap-2">
          <TabsList data-tour="crm-tabs" className="h-8">
            <TabsTrigger value="kanban" className="text-xs gap-1 h-7 px-3">
              <LayoutGrid className="h-3.5 w-3.5" /> Kanban
            </TabsTrigger>
            <TabsTrigger value="lista" className="text-xs gap-1 h-7 px-3">
              <List className="h-3.5 w-3.5" /> Lista
            </TabsTrigger>
            <TabsTrigger value="agenda" className="text-xs gap-1 h-7 px-3">
              <CalendarDays className="h-3.5 w-3.5" /> Agenda
            </TabsTrigger>
            <TabsTrigger value="performance" className="text-xs gap-1 h-7 px-3">
              <BarChart3 className="h-3.5 w-3.5" /> Performance
            </TabsTrigger>
            <TabsTrigger value="dashboard" className="text-xs gap-1 h-7 px-3">
              <PieChart className="h-3.5 w-3.5" /> Dashboard
            </TabsTrigger>
          </TabsList>
          {activeTab === 'kanban' && (
            <div data-tour="crm-filters">
            <CRMFilters
              searchQuery={searchQuery}
              onSearchChange={setSearchQuery}
              vendorFilter={vendorFilter}
              onVendorChange={setVendorFilter}
            />
          )}
        </div>

        <TabsContent value="kanban" className="mt-3">
          <KanbanBoard
            leads={filteredLeads}
            stages={CRM_STAGES}
            loading={loading}
            onStatusChange={updateLeadStatus}
            onCardClick={openLeadDrawer}
          />
        </TabsContent>

        <TabsContent value="lista" className="mt-3">
          <LeadListView
            leads={leads}
            onLeadClick={openLeadDrawer}
            onLeadUpdated={loadLeads}
          />
        </TabsContent>

        <TabsContent value="agenda" className="mt-3">
          <VisitCalendar leads={leads} onLeadClick={openLeadDrawer} />
        </TabsContent>

        <TabsContent value="performance" className="mt-3 space-y-4">
          <TeamPerformance leads={leads} />
          <PortfolioHealth leads={filteredLeads} onLeadClick={openLeadDrawer} />
        </TabsContent>

        <TabsContent value="dashboard" className="mt-3">
          <CRMDashboard leads={leads} />
        </TabsContent>
      </Tabs>

      <NewLeadDialog open={newLeadOpen} onOpenChange={setNewLeadOpen} onLeadCreated={loadLeads} />

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

      {pendingVisitLead && (
        <VisitScheduleDialog
          open={visitDialogOpen}
          onOpenChange={(v) => { setVisitDialogOpen(v); if (!v) setPendingVisitLead(null); }}
          leadId={pendingVisitLead.id}
          leadName={pendingVisitLead.client_name || pendingVisitLead.cliente_nome}
          onConfirm={handleVisitConfirmed}
      />
      )}

      {pendingEnrichLead && (
        <LeadEnrichGateDialog
          open={enrichGateOpen}
          onOpenChange={(v) => { setEnrichGateOpen(v); if (!v) setPendingEnrichLead(null); }}
          lead={pendingEnrichLead}
          onConfirm={handleEnrichConfirmed}
        />
      )}

      {isMobile && (
        <button
          onClick={() => setNewLeadOpen(true)}
          className="fixed bottom-20 right-4 z-50 w-14 h-14 rounded-full bg-primary text-primary-foreground shadow-lg flex items-center justify-center hover:opacity-90 transition-opacity"
        >
          <Plus className="h-6 w-6" />
        </button>
      )}
    </div>
  );
}
