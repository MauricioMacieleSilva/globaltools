
import { useEffect, useState, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useSearchParams } from 'react-router-dom';

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
import { OrderLinkDialog } from '@/components/crm/OrderLinkDialog';
import { useIsMobile } from '@/hooks/use-mobile';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Plus, LayoutGrid, List, BarChart3, CalendarDays, PieChart, Sparkles, Monitor } from 'lucide-react';
import { ProspeccaoPanel } from '@/components/crm/ProspeccaoPanel';
import { DashboardCarousel } from '@/components/dashboard/DashboardCarousel';
import DashboardComercial from '@/pages/DashboardComercial';

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
  website: string | null;
  vendedor?: { full_name: string; avatar_url: string | null } | null;
}

export const CRM_STAGES = [
  { key: 'lead', label: 'Lead', color: 'hsl(200, 98%, 39%)' },
  { key: 'contato_feito', label: 'Contato Feito', color: 'hsl(38, 92%, 50%)' },
  { key: 'visita_reuniao', label: 'Visita / Reunião', color: 'hsl(262, 52%, 47%)' },
  { key: 'proposta', label: 'Proposta', color: 'hsl(142, 76%, 36%)' },
  { key: 'pedido_fechado', label: 'Pedido Fechado', color: 'hsl(173, 80%, 36%)' },
] as const;

export type CRMStageKey = typeof CRM_STAGES[number]['key'];

export default function CRM() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [leads, setLeads] = useState<CRMLead[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedLead, setSelectedLead] = useState<CRMLead | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [lostDialogOpen, setLostDialogOpen] = useState(false);
  const [pendingLostLead, setPendingLostLead] = useState<CRMLead | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [vendorFilter, setVendorFilter] = useState('all');
  const [newLeadOpen, setNewLeadOpen] = useState(false);
  const [activeTab, setActiveTab] = useState('kanban');
  // Visit schedule dialog
  const [visitDialogOpen, setVisitDialogOpen] = useState(false);
  const [pendingVisitLead, setPendingVisitLead] = useState<CRMLead | null>(null);
  // Enrich gate dialog
  const [enrichGateOpen, setEnrichGateOpen] = useState(false);
  const [pendingEnrichLead, setPendingEnrichLead] = useState<CRMLead | null>(null);
  // Order link dialog
  const [orderLinkOpen, setOrderLinkOpen] = useState(false);
  const [pendingOrderLead, setPendingOrderLead] = useState<CRMLead | null>(null);
  const [pendingOrderStage, setPendingOrderStage] = useState<string>('');
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [carouselOpen, setCarouselOpen] = useState(false);
  const refreshTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  
  const isMobile = useIsMobile();

  const loadLeads = useCallback(async () => {
    try {
      const { data, error } = await (supabase as any)
        .from('leads')
        .select('*, vendedor:user_profiles!leads_vendedor_id_fkey(full_name, avatar_url)')
        .order('updated_at', { ascending: false });
      if (error) throw error;

      // Fetch last activity per lead to determine "responsible" user shown on card
      const leadIds = (data || []).map((l: any) => l.id);
      let lastActivityMap: Record<string, { user_name: string; user_id: string }> = {};
      if (leadIds.length > 0) {
        const { data: activities } = await (supabase as any)
          .from('lead_activities')
          .select('lead_id, user_id, sdr_name, created_at')
          .in('lead_id', leadIds)
          .order('created_at', { ascending: false });
        
        if (activities) {
          // Get unique user_ids to fetch their profiles
          const seenLeads = new Set<string>();
          const userIds = new Set<string>();
          const latestPerLead: Record<string, any> = {};
          
          for (const act of activities) {
            if (!seenLeads.has(act.lead_id)) {
              seenLeads.add(act.lead_id);
              latestPerLead[act.lead_id] = act;
              if (act.user_id) userIds.add(act.user_id);
            }
          }

          // Fetch user profiles for avatars
          if (userIds.size > 0) {
            const { data: profiles } = await (supabase as any)
              .from('user_profiles')
              .select('id, full_name, avatar_url')
              .in('id', Array.from(userIds));
            
            const profileMap: Record<string, any> = {};
            (profiles || []).forEach((p: any) => { profileMap[p.id] = p; });

            for (const [leadId, act] of Object.entries(latestPerLead) as any) {
              const profile = profileMap[act.user_id];
              if (profile) {
                lastActivityMap[leadId] = {
                  user_name: profile.full_name,
                  user_id: act.user_id,
                };
                // Enrich lead's vendedor with last contact user
                const lead = (data as any[]).find((l: any) => l.id === leadId);
                if (lead) {
                  lead.vendedor = {
                    full_name: profile.full_name,
                    avatar_url: profile.avatar_url,
                  };
                }
              }
            }
          }
        }
      }

      setLeads(data || []);
      setLastUpdated(new Date());
    } catch (error) {
      console.error('Erro ao carregar leads:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  // Auto-open carousel from URL param (e.g. /crm?tv=1)
  useEffect(() => {
    if (searchParams.get('tv') === '1') {
      setCarouselOpen(true);
      searchParams.delete('tv');
      setSearchParams(searchParams, { replace: true });
    }
  }, [searchParams, setSearchParams]);


  useEffect(() => {
    loadLeads();
    // Auto-refresh every 15 minutes
    refreshTimerRef.current = setInterval(() => {
      loadLeads();
    }, 15 * 60 * 1000);
    return () => { if (refreshTimerRef.current) clearInterval(refreshTimerRef.current); };
  }, [loadLeads]);

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

  /** Registra contato_inicial se nunca foi registrado para este lead */
  const ensureContactRegistered = async (leadId: string, userId: string) => {
    const { data } = await supabase
      .from('lead_activities')
      .select('id')
      .eq('lead_id', leadId)
      .eq('activity_type', 'contato_inicial')
      .limit(1);
    if (!data || data.length === 0) {
      await supabase.from('lead_activities').insert({
        lead_id: leadId,
        activity_type: 'contato_inicial',
        description: 'Contato registrado automaticamente via movimentação CRM',
        user_id: userId,
      } as any);
    }
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

    // Intercept proposta/pedido -> require order link only if not already linked
    if (newStatus === 'proposta' || newStatus === 'pedido_fechado') {
      if (lead.budget_number) {
        // Already has a linked order — skip dialog, move directly
        // falls through to normal update below
      } else {
        setPendingOrderLead(lead);
        setPendingOrderStage(newStatus);
        setOrderLinkOpen(true);
        return;
      }
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

      // Register contact on every stage move
      await supabase.from('lead_activities').insert({
        lead_id: leadId,
        activity_type: 'contato_inicial',
        description: 'Contato registrado via movimentação CRM',
        user_id: user?.id || '',
      } as any);

      toast.success('Status atualizado', { description: `Lead movido para ${newLabel}` });
    } catch (error) {
      console.error('Erro ao atualizar status:', error);
      toast.error('Erro ao atualizar status do lead');
    }
  };

  const handleVisitConfirmed = async () => {
    if (!pendingVisitLead) return;
    try {
      const user = (await supabase.auth.getUser()).data.user;
      await (supabase as any)
        .from('leads')
        .update({ status: 'visita_reuniao', updated_at: new Date().toISOString() })
        .eq('id', pendingVisitLead.id);
      setLeads(prev => prev.map(l => l.id === pendingVisitLead.id ? { ...l, status: 'visita_reuniao', updated_at: new Date().toISOString() } : l));
      await ensureContactRegistered(pendingVisitLead.id, user?.id || '');
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
      await ensureContactRegistered(pendingEnrichLead.id, user?.id || '');

      loadLeads();
      toast.success('Status atualizado', { description: 'Lead movido para Contato Feito' });
    } catch {
      toast.error('Erro ao mover lead');
    }
    setPendingEnrichLead(null);
  };

  const handleOrderLinked = async (orderNumber: string, orderValue: number) => {
    if (!pendingOrderLead) return;
    try {
      const user = (await supabase.auth.getUser()).data.user;
      const oldStatus = pendingOrderLead.status;
      await (supabase as any)
        .from('leads')
        .update({ 
          status: pendingOrderStage, 
          budget_number: orderNumber,
          valor_estimado: orderValue,
          updated_at: new Date().toISOString() 
        })
        .eq('id', pendingOrderLead.id);

      setLeads(prev => prev.map(l => l.id === pendingOrderLead.id 
        ? { ...l, status: pendingOrderStage, budget_number: orderNumber, valor_estimado: orderValue, updated_at: new Date().toISOString() } 
        : l
      ));

      const oldLabel = CRM_STAGES.find(s => s.key === oldStatus)?.label || oldStatus;
      const newLabel = CRM_STAGES.find(s => s.key === pendingOrderStage)?.label || pendingOrderStage;
      await supabase.from('lead_activities').insert({
        lead_id: pendingOrderLead.id,
        activity_type: 'mudanca_status',
        description: `Movido de "${oldLabel}" para "${newLabel}" — Pedido ${orderNumber}`,
        user_id: user?.id || '',
      } as any);

      // Register contact on first movement
      await ensureContactRegistered(pendingOrderLead.id, user?.id || '');

      toast.success('Status atualizado', { description: `Lead vinculado ao Pedido ${orderNumber}` });
      loadLeads();
    } catch {
      toast.error('Erro ao vincular pedido');
    }
    setPendingOrderLead(null);
    setOrderLinkOpen(false);
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
    if (vendorFilter !== 'all' && l.vendedor_id !== vendorFilter) return false;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      const fields = [
        l.client_name,
        l.cliente_nome,
        l.contact_name,
        l.empresa,
        l.cliente_cnpj,
        l.budget_number,
        l.numero_lead,
        l.ramo_atuacao,
        l.produto_interesse,
        l.cidade,
        l.estado,
        l.contact_phone,
        l.cliente_telefone,
        l.contact_email,
        l.cliente_email,
      ];
      const matches = fields.some(f => f && f.toLowerCase().includes(q));
      if (!matches) return false;
    }
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
    <div className="flex flex-col h-[calc(100vh-56px)] p-3 sm:p-4 gap-0 overflow-hidden">
      <Tabs value={activeTab} onValueChange={setActiveTab} className="flex flex-col flex-1 min-h-0">
        <div className="flex items-center justify-between gap-2 pb-3 shrink-0">
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
            <TabsTrigger value="prospeccao" className="text-xs gap-1 h-7 px-3">
              <Sparkles className="h-3.5 w-3.5" /> Prospecção IA
            </TabsTrigger>
          </TabsList>
          <div className="flex items-center gap-2">
            {activeTab === 'kanban' && (
              <div data-tour="crm-filters">
                <CRMFilters
                  searchQuery={searchQuery}
                  onSearchChange={setSearchQuery}
                  vendorFilter={vendorFilter}
                  onVendorChange={setVendorFilter}
                />
              </div>
            )}
            <Button variant="outline" size="sm" onClick={() => setCarouselOpen(true)} className="gap-1.5 h-8 hidden sm:flex" title="Modo TV - Alternar dashboards">
              <Monitor className="h-3.5 w-3.5" />
              {!isMobile && 'Modo TV'}
            </Button>
            <Button data-tour="crm-new-lead" size="sm" onClick={() => setNewLeadOpen(true)} className="gap-1.5 h-8">
              <Plus className="h-3.5 w-3.5" />
              {!isMobile && 'Novo Lead'}
            </Button>
          </div>
        </div>

        <TabsContent value="kanban" className="flex-1 min-h-0 mt-0 overflow-hidden" data-tour="crm-kanban">
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
          <CRMDashboard leads={leads} lastUpdated={lastUpdated} onRefresh={loadLeads} isRefreshing={loading} />
        </TabsContent>

        <TabsContent value="prospeccao" className="mt-3 overflow-y-auto flex-1">
          <ProspeccaoPanel onLeadsApproved={loadLeads} />
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
        onLeadClick={openLeadDrawer}
        onLeadReactivated={loadLeads}
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

      <OrderLinkDialog
        open={orderLinkOpen}
        onOpenChange={setOrderLinkOpen}
        targetStage={pendingOrderStage}
        onConfirm={handleOrderLinked}
        onCancel={() => { setPendingOrderLead(null); setOrderLinkOpen(false); }}
      />

      {isMobile && (
        <button
          onClick={() => setNewLeadOpen(true)}
          className="fixed bottom-20 right-4 z-50 w-14 h-14 rounded-full bg-primary text-primary-foreground shadow-lg flex items-center justify-center hover:opacity-90 transition-opacity"
        >
          <Plus className="h-6 w-6" />
        </button>
      )}

      <DashboardCarousel
        open={carouselOpen}
        onClose={() => setCarouselOpen(false)}
        labels={['Dashboard CRM', 'Dashboard Comercial']}
      >
        <CRMDashboard leads={leads} lastUpdated={lastUpdated} onRefresh={loadLeads} isRefreshing={loading} tvMode />
        <DashboardComercial tvMode />
      </DashboardCarousel>
    </div>
  );
}
