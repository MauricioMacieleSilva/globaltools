
import { useEffect, useState, useCallback, useRef, useMemo, lazy, Suspense } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useSearchParams } from 'react-router-dom';
import { OwnershipWarningDialog } from '@/components/crm/OwnershipWarningDialog';

import { KanbanBoard } from '@/components/crm/KanbanBoard';
import { CRMFilters } from '@/components/crm/CRMFilters';
import { useIsMobile } from '@/hooks/use-mobile';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Plus, LayoutGrid, List, CalendarDays, PieChart, Sparkles, Monitor, Users, X, Clock, Swords, ArrowRightLeft, ClipboardList } from 'lucide-react';
import { StaleLeadsAlert } from '@/components/crm/StaleLeadsAlert';
import { useCommercialVendors } from '@/hooks/useCommercialVendors';
import { Skeleton } from '@/components/ui/skeleton';
import { useDebounce } from '@/hooks/useDebounce';
import { useCRMData } from '@/context/CRMDataContext';

// Lazy-loaded heavy children — só baixam o JS quando o usuário abre a aba/diálogo
const CRMDashboard = lazy(() => import('@/components/crm/CRMDashboard').then(m => ({ default: m.CRMDashboard })));
const LeadDrawer = lazy(() => import('@/components/crm/LeadDrawer').then(m => ({ default: m.LeadDrawer })));
const LostDealsDialog = lazy(() => import('@/components/crm/LostDealsDialog').then(m => ({ default: m.LostDealsDialog })));
const NewLeadDialog = lazy(() => import('@/components/crm/NewLeadDialog').then(m => ({ default: m.NewLeadDialog })));
const LeadListView = lazy(() => import('@/components/crm/LeadListView').then(m => ({ default: m.LeadListView })));
const VisitScheduleDialog = lazy(() => import('@/components/crm/VisitScheduleDialog').then(m => ({ default: m.VisitScheduleDialog })));
const FollowUpScheduleDialog = lazy(() => import('@/components/crm/FollowUpScheduleDialog').then(m => ({ default: m.FollowUpScheduleDialog })));
const VisitCalendar = lazy(() => import('@/components/crm/VisitCalendar').then(m => ({ default: m.VisitCalendar })));
const LeadEnrichGateDialog = lazy(() => import('@/components/crm/LeadEnrichGateDialog').then(m => ({ default: m.LeadEnrichGateDialog })));
const ContactDescriptionDialog = lazy(() => import('@/components/crm/ContactDescriptionDialog').then(m => ({ default: m.ContactDescriptionDialog })));
const OrderLinkDialog = lazy(() => import('@/components/crm/OrderLinkDialog').then(m => ({ default: m.OrderLinkDialog })));
const AnaliseFinanceiraDialog = lazy(() => import('@/components/crm/AnaliseFinanceiraDialog').then(m => ({ default: m.AnaliseFinanceiraDialog })));
const PassagemBastaoDialog = lazy(() => import('@/components/crm/PassagemBastaoDialog').then(m => ({ default: m.PassagemBastaoDialog })));
const CRMReport = lazy(() => import('@/components/crm/CRMReport').then(m => ({ default: m.CRMReport })));
const ProspeccaoPanel = lazy(() => import('@/components/crm/ProspeccaoPanel').then(m => ({ default: m.ProspeccaoPanel })));
const MinhaCarteira = lazy(() => import('@/components/crm/MinhaCarteira').then(m => ({ default: m.MinhaCarteira })));
const CompetitorProposalsView = lazy(() => import('@/components/crm/CompetitorProposalsView').then(m => ({ default: m.CompetitorProposalsView })));
const HandoffHistory = lazy(() => import('@/components/crm/HandoffHistory').then(m => ({ default: m.HandoffHistory })));
const DashboardCarousel = lazy(() => import('@/components/dashboard/DashboardCarousel').then(m => ({ default: m.DashboardCarousel })));
const DashboardComercial = lazy(() => import('@/pages/DashboardComercial'));

const TabFallback = () => (
  <div className="space-y-3 p-2">
    <Skeleton className="h-8 w-64" />
    <Skeleton className="h-64 w-full" />
  </div>
);

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
  first_contact_user_id?: string | null;
  first_contact_name?: string | null;
  handoff_sdr_name?: string | null;
  apresentacao_enviada_at?: string | null;
  vendedor?: { full_name: string; avatar_url: string | null } | null;
}

// All stages (used for status tracking, drawer moves, dashboard funnel)
export const CRM_STAGES = [
  { key: 'lead', label: 'Lead', color: 'hsl(200, 98%, 39%)' },
  { key: 'contato_feito', label: 'Contato', color: 'hsl(38, 92%, 50%)' },
  { key: 'passagem_bastao', label: 'Bastão', color: 'hsl(330, 70%, 50%)' },
  { key: 'visita_reuniao', label: 'Oportunidade', color: 'hsl(262, 52%, 47%)' },
  { key: 'analise_financeira', label: 'Crédito', color: 'hsl(217, 91%, 50%)' },
  { key: 'proposta', label: 'Proposta', color: 'hsl(142, 76%, 36%)' },
  { key: 'pedido_fechado', label: 'Pedido', color: 'hsl(173, 80%, 36%)' },
] as const;

// Kanban-visible stages (excludes Análise Financeira from columns)
export const KANBAN_STAGES = CRM_STAGES.filter(s => s.key !== 'analise_financeira');

export type CRMStageKey = typeof CRM_STAGES[number]['key'];

// Full descriptive labels for activity logging (human-readable, not abbreviated)
const STAGE_FULL_LABELS: Record<string, string> = {
  lead: 'Lead',
  contato_feito: 'Contato Feito',
  passagem_bastao: 'Passagem de Bastão',
  visita_reuniao: 'Oportunidade',
  analise_financeira: 'Análise Financeira',
  proposta: 'Proposta',
  pedido_fechado: 'Pedido Fechado',
  perdido: 'Perdido',
};

export default function CRM() {
  const [searchParams, setSearchParams] = useSearchParams();
  // Pre-warm vendor cache so PassagemBastaoDialog opens instantly
  useCommercialVendors();
  // Dados do CRM vivem no provider — não recarregam ao navegar entre telas
  const {
    leads,
    setLeads,
    pendingFollowUps,
    loading,
    lastUpdated,
    currentUserId,
    currentUserRole,
    cardMeta,
    loadLeads,
    loadFollowUps,
  } = useCRMData();
  const [selectedLead, setSelectedLead] = useState<CRMLead | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [lostDialogOpen, setLostDialogOpen] = useState(false);
  const [pendingLostLead, setPendingLostLead] = useState<CRMLead | null>(null);
  const [pendingLostReason, setPendingLostReason] = useState<string | null>(null);
  const [lostFollowUpOpen, setLostFollowUpOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const debouncedSearchQuery = useDebounce(searchQuery, 150);
  const [vendorFilter, setVendorFilter] = useState('');
  const [origemFilter, setOrigemFilter] = useState('all');

  

  // Initialize vendor filter: admins/gestors see all, others see own leads
  useEffect(() => {
    const initFilter = async () => {
      const { data: authData } = await supabase.auth.getUser();
      if (!authData.user) { setVendorFilter('all'); return; }
      const { data: roleData } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', authData.user.id)
        .maybeSingle();
      const role = roleData?.role;
      if (role === 'admin') {
        setVendorFilter('all');
      } else {
        setVendorFilter(authData.user.id);
      }
    };
    initFilter();
  }, []);
  const [newLeadOpen, setNewLeadOpen] = useState(false);
  const [activeTab, setActiveTab] = useState('kanban');
  // Keep-alive: abas já visitadas continuam montadas (display:none quando inativas)
  // — evita refetch dos filhos ao alternar abas.
  const [mountedTabs, setMountedTabs] = useState<Set<string>>(() => new Set(['kanban']));
  const handleTabChange = useCallback((v: string) => {
    setActiveTab(v);
    setMountedTabs(prev => prev.has(v) ? prev : new Set(prev).add(v));
  }, []);
  const [kanbanDateFilter, setKanbanDateFilter] = useState('');
  // Visit schedule dialog
  const [visitDialogOpen, setVisitDialogOpen] = useState(false);
  const [pendingVisitLead, setPendingVisitLead] = useState<CRMLead | null>(null);
  // Enrich gate dialog
  const [enrichGateOpen, setEnrichGateOpen] = useState(false);
  const [pendingEnrichLead, setPendingEnrichLead] = useState<CRMLead | null>(null);
  // Contact description dialog (before enrich)
  const [contactDescOpen, setContactDescOpen] = useState(false);
  const [pendingContactLead, setPendingContactLead] = useState<CRMLead | null>(null);
  // Order link dialog
  const [orderLinkOpen, setOrderLinkOpen] = useState(false);
  const [pendingOrderLead, setPendingOrderLead] = useState<CRMLead | null>(null);
  const [pendingOrderStage, setPendingOrderStage] = useState<string>('');
  const [carouselOpen, setCarouselOpen] = useState(false);
  // Analise Financeira dialog
  const [analiseFinOpen, setAnaliseFinOpen] = useState(false);
  const [pendingAnaliseLead, setPendingAnaliseLead] = useState<CRMLead | null>(null);
  // Passagem de bastão dialog
  const [passagemBastaoOpen, setPassagemBastaoOpen] = useState(false);
  const [pendingPassagemLead, setPendingPassagemLead] = useState<CRMLead | null>(null);
  const [ownershipWarning, setOwnershipWarning] = useState<{
    open: boolean;
    ownerName: string;
    ownerAvatarUrl: string | null;
    entityName: string;
    leadId: string;
  }>({ open: false, ownerName: '', ownerAvatarUrl: null, entityName: '', leadId: '' });
  
  const isMobile = useIsMobile();

  // Auto-open carousel from URL param (e.g. /crm?tv=1)
  useEffect(() => {
    if (searchParams.get('tv') === '1') {
      setCarouselOpen(true);
      searchParams.delete('tv');
      setSearchParams(searchParams, { replace: true });
    }
  }, [searchParams, setSearchParams]);

  // Deep link: auto-open lead card from URL param (e.g. /crm?lead=<uuid>)
  useEffect(() => {
    const leadId = searchParams.get('lead');
    if (leadId && leads.length > 0 && !loading) {
      const found = leads.find(l => l.id === leadId);
      if (found) {
        setSelectedLead(found);
        setDrawerOpen(true);
        searchParams.delete('lead');
        setSearchParams(searchParams, { replace: true });
      }
    }
  }, [searchParams, leads, loading, setSearchParams]);


  // Carga inicial e auto-refresh agora são gerenciados pelo CRMDataProvider
  // (sobrevivem à navegação entre páginas).

  // Notify user about leads returning today from follow-up
  const notifiedFollowUpsRef = useRef<Set<string>>(new Set());
  useEffect(() => {
    if (!currentUserId || pendingFollowUps.length === 0 || leads.length === 0) return;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    pendingFollowUps.forEach(fu => {
      if (fu.user_id !== currentUserId) return;
      const fuDate = new Date(fu.data_agendada);
      if (fuDate >= today && fuDate < tomorrow && !notifiedFollowUpsRef.current.has(fu.lead_id)) {
        notifiedFollowUpsRef.current.add(fu.lead_id);
        const lead = leads.find(l => l.id === fu.lead_id);
        if (lead) {
          toast.info(`Follow-up hoje: ${lead.empresa || lead.cliente_nome}`, {
            description: fu.titulo,
            duration: 10000,
            action: {
              label: 'Ver Lead',
              onClick: () => {
                openLeadDrawer(lead);
              },
            },
          });
        }
      }
    });
  }, [pendingFollowUps, currentUserId, leads]);

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

    // Ownership check
    if (!isOwnerOrManager(lead)) {
      setOwnershipWarning({
        open: true,
        ownerName: lead.vendedor?.full_name || 'Outro usuário',
        ownerAvatarUrl: lead.vendedor?.avatar_url || null,
        entityName: lead.empresa || lead.client_name || lead.cliente_nome,
        leadId: lead.id,
      });
      return;
    }

    // Block non-admin/comercial from moving leads OUT of passagem_bastao — ONLY admin/comercial can assign
    if (lead.status === 'passagem_bastao' && currentUserRole !== 'admin' && currentUserRole !== 'comercial') {
      toast.error('Apenas o administrador pode mover leads da etapa Passagem de Bastão');
      return;
    }

    // Block non-admin/comercial from moving leads BACKWARD after Oportunidade
    const stageOrder = ['lead', 'contato_feito', 'passagem_bastao', 'visita_reuniao', 'proposta', 'pedido_fechado'];
    const currentStageIdx = stageOrder.indexOf(lead.status);
    const newStageIdx = stageOrder.indexOf(newStatus);
    const oportunidadeIdx = stageOrder.indexOf('visita_reuniao'); // Oportunidade stage
    if (currentStageIdx >= oportunidadeIdx && newStageIdx < oportunidadeIdx && newStatus !== 'perdido' && currentUserRole !== 'admin' && currentUserRole !== 'comercial') {
      toast.error('Apenas gestores podem mover leads para etapas anteriores após Oportunidade');
      return;
    }

    // When admin/comercial moves a lead FROM passagem_bastao, open vendor assignment dialog
    if (lead.status === 'passagem_bastao' && (currentUserRole === 'admin' || currentUserRole === 'comercial') && newStatus !== 'perdido') {
      setPendingPassagemLead(lead);
      setPassagemBastaoOpen(true);
      return;
    }

    if (newStatus === 'perdido') {
      setPendingLostLead(lead);
      setLostDialogOpen(true);
      return;
    }

    // Intercept move to passagem_bastao — confirm first (irreversible)
    if (newStatus === 'passagem_bastao') {
      const requiredFields: { key: keyof CRMLead; label: string }[] = [
        { key: 'empresa', label: 'Empresa' },
        { key: 'cliente_cnpj', label: 'CNPJ' },
        { key: 'contact_name', label: 'Nome do Contato' },
        { key: 'cliente_telefone', label: 'Telefone' },
        { key: 'origem', label: 'Origem' },
        { key: 'ramo_atuacao', label: 'Ramo de Atuação' },
        { key: 'estado', label: 'UF' },
        { key: 'cidade', label: 'Cidade' },
        { key: 'produto_interesse', label: 'Produto de Interesse' },
      ];
      const missing = requiredFields.filter(f => {
        const v = (lead as any)[f.key];
        return v === null || v === undefined || String(v).trim() === '';
      });
      if (missing.length > 0) {
        toast.error(
          `Para passar o bastão é necessário preencher: ${missing.map(m => m.label).join(', ')}`,
          { duration: 6000 }
        );
        openLeadDrawer(lead);
        return;
      }
      const confirmed = window.confirm(
        `Atenção: Ao mover "${lead.cliente_nome}" para Passagem de Bastão, o lead ficará travado até que um gestor atribua um vendedor.\n\nEssa ação não pode ser desfeita. Deseja continuar?`
      );
      if (!confirmed) return;
    }

    // visita_reuniao (Oportunidade) — move directly, no dialog needed
    // (passagem_bastao -> oportunidade is handled above via PassagemBastaoDialog)

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

    // Intercept lead -> contato_feito: require contact description first
    if (newStatus === 'contato_feito' && lead.status === 'lead') {
      setPendingContactLead(lead);
      setContactDescOpen(true);
      return;
    }

    // Intercept analise_financeira: require document attachment
    if (newStatus === 'analise_financeira') {
      setPendingAnaliseLead(lead);
      setAnaliseFinOpen(true);
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

      // Get current user name for sdr_name
      const { data: currentProfile } = await supabase
        .from('user_profiles')
        .select('full_name')
        .eq('id', user?.id || '')
        .maybeSingle();

      // Log stage move in activity history
      const oldLabel = STAGE_FULL_LABELS[oldStatus] || oldStatus;
      const newLabel = STAGE_FULL_LABELS[newStatus] || newStatus;
      await supabase.from('lead_activities').insert({
        lead_id: leadId,
        activity_type: 'mudanca_status',
        description: `Movido de "${oldLabel}" para "${newLabel}"`,
        user_id: user?.id || '',
        sdr_name: currentProfile?.full_name || null,
      } as any);

      // Do NOT create fake contato_inicial on every stage move — only real contacts count

      toast.success('Status atualizado', { description: `Lead movido para ${newLabel}` });
    } catch (error) {
      console.error('Erro ao atualizar status:', error);
      toast.error('Erro ao atualizar status do lead');
    }
  };

  const handleAnaliseFinConfirmed = async () => {
    if (!pendingAnaliseLead) return;
    try {
      const user = (await supabase.auth.getUser()).data.user;
      const oldStatus = pendingAnaliseLead.status;
      await (supabase as any)
        .from('leads')
        .update({ status: 'analise_financeira', updated_at: new Date().toISOString() })
        .eq('id', pendingAnaliseLead.id);

      setLeads(prev => prev.map(l => l.id === pendingAnaliseLead.id ? { ...l, status: 'analise_financeira' as any, updated_at: new Date().toISOString() } : l));

      const oldLabel = STAGE_FULL_LABELS[oldStatus] || oldStatus;
      await supabase.from('lead_activities').insert({
        lead_id: pendingAnaliseLead.id,
        activity_type: 'mudanca_status',
        description: `Movido de "${oldLabel}" para "Análise Financeira"`,
        user_id: user?.id || '',
      } as any);

      toast.success('Lead enviado para Análise Financeira');
    } catch (err) {
      console.error(err);
      toast.error('Erro ao mover lead');
    } finally {
      setPendingAnaliseLead(null);
      setAnaliseFinOpen(false);
    }
  };

  const handlePassagemBastaoConfirmed = async (vendorId: string) => {
    if (!pendingPassagemLead) return;
    try {
      const user = (await supabase.auth.getUser()).data.user;
      // Assign vendor and move to next stage (visita_reuniao by default)
      const newStatus = 'visita_reuniao';
      await (supabase as any)
        .from('leads')
        .update({ 
          status: newStatus, 
          vendedor_id: vendorId,
          updated_at: new Date().toISOString() 
        })
        .eq('id', pendingPassagemLead.id);

      // Get vendor name for activity log
      const { data: vendorProfile } = await supabase
        .from('user_profiles')
        .select('full_name')
        .eq('id', vendorId)
        .maybeSingle();

      // Get current user name (who passed the lead)
      const { data: currentProfile } = await supabase
        .from('user_profiles')
        .select('full_name')
        .eq('id', user?.id || '')
        .maybeSingle();

      await supabase.from('lead_activities').insert({
        lead_id: pendingPassagemLead.id,
        activity_type: 'mudanca_status',
        description: `Passagem de Bastão: lead atribuído a ${vendorProfile?.full_name || 'vendedor'} e movido para "Oportunidade"`,
        user_id: user?.id || '',
        sdr_name: currentProfile?.full_name || null,
      } as any);

      loadLeads();
      toast.success('Lead atribuído com sucesso', { 
        description: `Responsável: ${vendorProfile?.full_name || 'vendedor'}` 
      });
    } catch (err) {
      console.error(err);
      toast.error('Erro ao atribuir lead');
    } finally {
      setPendingPassagemLead(null);
      setPassagemBastaoOpen(false);
    }
  };

  // Legacy visit confirmed handler — no longer used but kept for safety
  const handleVisitConfirmed = async () => {
    if (!pendingVisitLead) return;
    setPendingVisitLead(null);
  };

  const handleContactDescConfirmed = async (description: string) => {
    if (!pendingContactLead) return;
    try {
      const user = (await supabase.auth.getUser()).data.user;
      const userId = user?.id || '';

      // Get user profile and role
      const [{ data: profile }, { data: roleData }] = await Promise.all([
        supabase.from('user_profiles').select('full_name').eq('id', userId).maybeSingle(),
        supabase.from('user_roles').select('role').eq('user_id', userId).maybeSingle(),
      ]);
      const userName = profile?.full_name || '';
      const userRole = roleData?.role || '';

      // Register the contact activity with the user's description
      await supabase.from('lead_activities').insert({
        lead_id: pendingContactLead.id,
        activity_type: 'contato_inicial',
        description: description,
        user_id: userId,
        sdr_name: userName,
      } as any);

      // Persist first contact info on the lead (only if not yet set)
      const updateFields: Record<string, any> = {};
      if (!pendingContactLead.first_contact_user_id) {
        updateFields.first_contact_user_id = userId;
        updateFields.first_contact_name = userName;
        // Only set handoff_sdr_name if user is SDR
        if (userRole === 'sdr') {
          updateFields.handoff_sdr_name = userName;
        }
      }
      if (Object.keys(updateFields).length > 0) {
        await (supabase as any).from('leads').update(updateFields).eq('id', pendingContactLead.id);
      }
    } catch (e) {
      console.error('Erro ao registrar contato:', e);
    }
    // Now open enrich dialog
    setContactDescOpen(false);
    setPendingEnrichLead(pendingContactLead);
    setEnrichGateOpen(true);
    setPendingContactLead(null);
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

      const oldLabel = STAGE_FULL_LABELS[oldStatus] || oldStatus;
      await supabase.from('lead_activities').insert({
        lead_id: pendingEnrichLead.id,
        activity_type: 'mudanca_status',
        description: `Movido de "${oldLabel}" para "Contato Feito"`,
        user_id: user?.id || '',
      } as any);

      loadLeads();
      toast.success('Status atualizado', { description: 'Lead movido para Contato Feito' });
    } catch {
      toast.error('Erro ao mover lead');
    }
    setPendingEnrichLead(null);
  };

  const handleOrderLinked = async (orderNumber: string, orderValue: number, orderClientName: string) => {
    if (!pendingOrderLead) return;
    try {
      const user = (await supabase.auth.getUser()).data.user;
      const oldStatus = pendingOrderLead.status;

      // Append order number to existing list
      const existingOrders = pendingOrderLead.budget_number
        ? pendingOrderLead.budget_number.split(',').map(s => s.trim()).filter(Boolean)
        : [];
      if (!existingOrders.includes(orderNumber)) {
        existingOrders.push(orderNumber);
      }
      const newBudgetNumber = existingOrders.join(', ');
      const newValue = (pendingOrderLead.valor_estimado || 0) + orderValue;

      // Merge linked_orders_meta
      const existingMeta = (pendingOrderLead as any).linked_orders_meta || {};
      const newMeta = { ...existingMeta, [orderNumber]: orderClientName };

      await (supabase as any)
        .from('leads')
        .update({ 
          status: pendingOrderStage, 
          budget_number: newBudgetNumber,
          valor_estimado: newValue,
          linked_orders_meta: newMeta,
          updated_at: new Date().toISOString() 
        })
        .eq('id', pendingOrderLead.id);

      setLeads(prev => prev.map(l => l.id === pendingOrderLead.id 
        ? { ...l, status: pendingOrderStage, budget_number: newBudgetNumber, valor_estimado: newValue, updated_at: new Date().toISOString() } 
        : l
      ));

      const oldLabel = STAGE_FULL_LABELS[oldStatus] || oldStatus;
      const newLabel = STAGE_FULL_LABELS[pendingOrderStage] || pendingOrderStage;
      await supabase.from('lead_activities').insert({
        lead_id: pendingOrderLead.id,
        activity_type: 'mudanca_status',
        description: `Movido de "${oldLabel}" para "${newLabel}" — Pedido ${orderNumber}`,
        user_id: user?.id || '',
      } as any);

      // Register contact on move
      await supabase.from('lead_activities').insert({
        lead_id: pendingOrderLead.id,
        activity_type: 'contato_inicial',
        description: 'Contato registrado via movimentação CRM',
        user_id: user?.id || '',
      } as any);

      toast.success('Status atualizado', { description: `Lead vinculado ao Pedido ${orderNumber}` });
      loadLeads();
    } catch {
      toast.error('Erro ao vincular pedido');
    }
    setPendingOrderLead(null);
    setOrderLinkOpen(false);
  };


  const finalizeLostDeal = async (lead: CRMLead, reason: string) => {
    const user = (await supabase.auth.getUser()).data.user;
    const { error } = await (supabase as any)
      .from('leads')
      .update({ status: 'perdido', updated_at: new Date().toISOString(), notes: reason })
      .eq('id', lead.id);
    if (error) throw error;

    await supabase.from('lead_dispositions').insert({
      lead_id: lead.id,
      user_id: user?.id || '',
      disposition_type: 'lost',
      reason: reason,
      lead_client_name: lead.cliente_nome,
    } as any);

    setLeads(prev => prev.map(l => l.id === lead.id ? { ...l, status: 'perdido' } : l));
  };

  const confirmLostDeal = async (reason: string, isDefinitive: boolean) => {
    if (!pendingLostLead) return;

    // Motivo NÃO definitivo → exige agendamento de follow-up antes de descartar
    if (!isDefinitive) {
      setPendingLostReason(reason);
      setLostDialogOpen(false);
      setLostFollowUpOpen(true);
      return;
    }

    // Motivo definitivo → descarta direto
    try {
      await finalizeLostDeal(pendingLostLead, reason);
      setPendingLostLead(null);
      setLostDialogOpen(false);
      toast.success('Lead marcado como perdido');
    } catch {
      toast.error('Erro ao marcar lead como perdido');
    }
  };

  const handleLostFollowUpConfirmed = async () => {
    if (!pendingLostLead || !pendingLostReason) return;
    try {
      await finalizeLostDeal(pendingLostLead, pendingLostReason);
      toast.success('Lead marcado como perdido', {
        description: 'Follow-up agendado com sucesso.',
      });
    } catch {
      toast.error('Erro ao marcar lead como perdido');
    } finally {
      setPendingLostLead(null);
      setPendingLostReason(null);
      setLostFollowUpOpen(false);
    }
  };

  const handleLostFollowUpCancelled = () => {
    setLostFollowUpOpen(false);
    setPendingLostReason(null);
    setPendingLostLead(null);
    toast.info('Descarte cancelado', {
      description: 'O agendamento de follow-up é obrigatório para este motivo.',
    });
  };

  const isOwnerOrManager = (lead: CRMLead) => {
    if (!currentUserId) return true;
    if (currentUserRole === 'admin' || currentUserRole === 'comercial') return true;
    if (!lead.vendedor_id) return true;
    return lead.vendedor_id === currentUserId;
  };

  const handleRequestTransfer = async () => {
    if (!ownershipWarning.leadId || !currentUserId) return;
    try {
      // Log transfer request as activity
      await supabase.from('lead_activities').insert({
        lead_id: ownershipWarning.leadId,
        activity_type: 'nota',
        description: `Solicitação de transferência de lead pelo usuário. Aguardando aprovação do gestor.`,
        user_id: currentUserId,
      } as any);
      toast.success('Solicitação de transferência enviada', { description: 'O gestor será notificado.' });
    } catch {
      toast.error('Erro ao solicitar transferência');
    }
    setOwnershipWarning(prev => ({ ...prev, open: false }));
  };

  const openLeadDrawer = (lead: CRMLead) => {
    if (!isOwnerOrManager(lead)) {
      setOwnershipWarning({
        open: true,
        ownerName: lead.vendedor?.full_name || 'Outro usuário',
        ownerAvatarUrl: lead.vendedor?.avatar_url || null,
        entityName: lead.empresa || lead.client_name || lead.cliente_nome,
        leadId: lead.id,
      });
      return;
    }
    setSelectedLead(lead);
    setDrawerOpen(true);
  };

  const filteredLeads = useMemo(() => {
    const q = debouncedSearchQuery.toLowerCase();
    const qDigits = debouncedSearchQuery.replace(/\D/g, '');
    const now = new Date();
    const curMonth = now.getMonth();
    const curYear = now.getFullYear();
    return leads.filter(l => {
      if (l.status === 'perdido') return false;
      if (l.status === 'pedido_fechado') {
        const closedAt = new Date(l.updated_at);
        if (closedAt.getMonth() !== curMonth || closedAt.getFullYear() !== curYear) return false;
      }
      if (vendorFilter && vendorFilter !== 'all' && l.vendedor_id !== vendorFilter) return false;
      if (origemFilter && origemFilter !== 'all') {
        const leadOrigem = (l.source || l.origem || '').toLowerCase().trim();
        if (leadOrigem !== origemFilter.toLowerCase().trim()) return false;
      }
      if (debouncedSearchQuery) {
        const fields = [
          l.client_name, l.cliente_nome, l.contact_name, l.empresa, l.cliente_cnpj,
          l.budget_number, l.numero_lead, l.ramo_atuacao, l.produto_interesse,
          l.cidade, l.estado, l.contact_phone, l.cliente_telefone, l.contact_email,
          l.cliente_email, l.source, l.origem,
        ];
        const matches = fields.some(f => f && f.toLowerCase().includes(q));
        const phoneMatch = qDigits.length >= 3 && [l.contact_phone, l.cliente_telefone, l.cliente_cnpj]
          .some(p => p && p.replace(/\D/g, '').includes(qDigits));
        if (!matches && !phoneMatch) return false;
      }
      return true;
    });
  }, [leads, vendorFilter, origemFilter, debouncedSearchQuery]);

  const { kanbanLeads, scheduledLeadsCount } = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    const leadsWithFutureFollowUp = new Set(
      pendingFollowUps.filter(fu => new Date(fu.data_agendada) >= tomorrow).map(fu => fu.lead_id)
    );
    const ALWAYS_VISIBLE_STAGES = new Set(['passagem_bastao', 'analise_financeira']);
    const kLeads = filteredLeads.filter(
      l => ALWAYS_VISIBLE_STAGES.has(l.status) || !leadsWithFutureFollowUp.has(l.id)
    );
    const sCount = filteredLeads.filter(
      l => !ALWAYS_VISIBLE_STAGES.has(l.status) && leadsWithFutureFollowUp.has(l.id)
    ).length;
    return { kanbanLeads: kLeads, scheduledLeadsCount: sCount };
  }, [filteredLeads, pendingFollowUps]);

  const lostLeads = useMemo(() => leads.filter(l => l.status === 'perdido'), [leads]);

  const kanbanLeadsByDate = useMemo(() => {
    if (!kanbanDateFilter) return kanbanLeads;
    return kanbanLeads.filter(l => {
      const leadDate = l.updated_at ? l.updated_at.slice(0, 10) : '';
      const createdDate = l.created_at ? l.created_at.slice(0, 10) : '';
      return leadDate === kanbanDateFilter || createdDate === kanbanDateFilter;
    });
  }, [kanbanLeads, kanbanDateFilter]);

  const isKanban = activeTab === 'kanban';
    return (
    <div className={isKanban ? "flex flex-col h-[calc(100vh-56px)] p-3 sm:p-4 gap-0 overflow-hidden" : "flex flex-col min-h-[calc(100vh-56px)] p-3 sm:p-4 gap-0"}>
      <Tabs value={activeTab} onValueChange={handleTabChange} className={isKanban ? "flex flex-col flex-1 min-h-0" : "flex flex-col"}>
        {/* Row 1: Tabs */}
        <div className="flex items-center justify-between gap-2 pb-2 shrink-0">
          <div className="flex items-center gap-2 overflow-x-auto">
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
              <TabsTrigger value="dashboard" className="text-xs gap-1 h-7 px-3">
                <PieChart className="h-3.5 w-3.5" /> Dashboard
              </TabsTrigger>
              <TabsTrigger value="prospeccao" className="text-xs gap-1 h-7 px-3">
                <Sparkles className="h-3.5 w-3.5" /> Prospecção
              </TabsTrigger>
              <TabsTrigger value="carteira" className="text-xs gap-1 h-7 px-3">
                <Users className="h-3.5 w-3.5" /> Minha Carteira
              </TabsTrigger>
              <TabsTrigger value="bastao" className="text-xs gap-1 h-7 px-3">
                <ArrowRightLeft className="h-3.5 w-3.5" /> Bastão
              </TabsTrigger>
              <TabsTrigger value="concorrencia" className="text-xs gap-1 h-7 px-3">
                <Swords className="h-3.5 w-3.5" /> Concorrência
              </TabsTrigger>
              <TabsTrigger value="relatorio" className="text-xs gap-1 h-7 px-3">
                <ClipboardList className="h-3.5 w-3.5" /> Relatório
              </TabsTrigger>
            </TabsList>
            <StaleLeadsAlert leads={leads} onLeadClick={openLeadDrawer} />
          </div>
        </div>

        {/* Row 2: Filters + Actions (unified across all tabs) */}
        <div className="flex items-center justify-between gap-2 pb-2 shrink-0 flex-wrap">
          <div data-tour="crm-filters" className="flex items-center gap-2 flex-wrap">
            <CRMFilters
              searchQuery={searchQuery}
              onSearchChange={setSearchQuery}
              vendorFilter={vendorFilter}
              onVendorChange={setVendorFilter}
              origemFilter={origemFilter}
              onOrigemChange={setOrigemFilter}
            />
            <div className="flex items-center gap-1">
              <input
                type="date"
                value={kanbanDateFilter}
                onChange={(e) => setKanbanDateFilter(e.target.value)}
                className="h-8 text-xs border rounded-md px-2 bg-background text-foreground"
              />
              {kanbanDateFilter && (
                <Button variant="ghost" size="sm" className="h-8 px-1" onClick={() => setKanbanDateFilter('')}>
                  <X className="h-3 w-3" />
                </Button>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
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

        <TabsContent forceMount value="kanban" hidden={activeTab !== 'kanban'} className="flex-1 min-h-0 mt-0 overflow-hidden flex flex-col data-[state=inactive]:hidden" data-tour="crm-kanban">
          {scheduledLeadsCount > 0 && (
            <div className="mb-2 flex items-center gap-2 text-xs text-muted-foreground bg-muted/50 rounded-md px-3 py-1.5">
              <Clock className="h-3.5 w-3.5 text-amber-500" />
              <span><strong>{scheduledLeadsCount}</strong> lead{scheduledLeadsCount > 1 ? 's' : ''} oculto{scheduledLeadsCount > 1 ? 's' : ''} com follow-up agendado (retornam na data agendada)</span>
            </div>
          )}
          <KanbanBoard
            leads={kanbanLeadsByDate}
            stages={KANBAN_STAGES}
            loading={loading}
            onStatusChange={updateLeadStatus}
            onCardClick={openLeadDrawer}
            cardMeta={cardMeta}
          />
        </TabsContent>

        {mountedTabs.has('lista') && (
          <TabsContent forceMount value="lista" hidden={activeTab !== 'lista'} className="mt-3 data-[state=inactive]:hidden">
            <Suspense fallback={<TabFallback />}>
              <LeadListView leads={filteredLeads} onLeadClick={openLeadDrawer} onLeadUpdated={loadLeads} userRole={currentUserRole} />
            </Suspense>
          </TabsContent>
        )}
        {mountedTabs.has('agenda') && (
          <TabsContent forceMount value="agenda" hidden={activeTab !== 'agenda'} className="mt-3 data-[state=inactive]:hidden">
            <Suspense fallback={<TabFallback />}>
              <VisitCalendar leads={leads} onLeadClick={openLeadDrawer} searchQuery={debouncedSearchQuery} vendorFilter={vendorFilter} />
            </Suspense>
          </TabsContent>
        )}
        {mountedTabs.has('dashboard') && (
          <TabsContent forceMount value="dashboard" hidden={activeTab !== 'dashboard'} className="mt-3 data-[state=inactive]:hidden">
            <Suspense fallback={<TabFallback />}>
              <CRMDashboard leads={leads} lastUpdated={lastUpdated} onRefresh={loadLeads} isRefreshing={loading} origemFilter={origemFilter} vendorFilter={vendorFilter} />
            </Suspense>
          </TabsContent>
        )}
        {mountedTabs.has('prospeccao') && (
          <TabsContent forceMount value="prospeccao" hidden={activeTab !== 'prospeccao'} className="mt-3 data-[state=inactive]:hidden">
            <Suspense fallback={<TabFallback />}>
              <ProspeccaoPanel onLeadsApproved={loadLeads} />
            </Suspense>
          </TabsContent>
        )}
        {mountedTabs.has('carteira') && (
          <TabsContent forceMount value="carteira" hidden={activeTab !== 'carteira'} className="mt-3 data-[state=inactive]:hidden">
            <Suspense fallback={<TabFallback />}>
              <MinhaCarteira leads={leads} currentUserId={currentUserId || ''} onLeadClick={openLeadDrawer} onLeadReactivated={loadLeads} origemFilter={origemFilter} vendorFilter={vendorFilter} searchQuery={debouncedSearchQuery} kanbanDateFilter={kanbanDateFilter} />
            </Suspense>
          </TabsContent>
        )}
        {mountedTabs.has('bastao') && (
          <TabsContent forceMount value="bastao" hidden={activeTab !== 'bastao'} className="mt-3 data-[state=inactive]:hidden">
            <Suspense fallback={<TabFallback />}>
              <HandoffHistory leads={leads} onLeadClick={openLeadDrawer} searchQuery={debouncedSearchQuery} vendorFilter={vendorFilter} origemFilter={origemFilter} kanbanDateFilter={kanbanDateFilter} />
            </Suspense>
          </TabsContent>
        )}
        {mountedTabs.has('concorrencia') && (
          <TabsContent forceMount value="concorrencia" hidden={activeTab !== 'concorrencia'} className="mt-3 data-[state=inactive]:hidden">
            <Suspense fallback={<TabFallback />}>
              <CompetitorProposalsView />
            </Suspense>
          </TabsContent>
        )}
        {mountedTabs.has('relatorio') && (
          <TabsContent forceMount value="relatorio" hidden={activeTab !== 'relatorio'} className="mt-3 data-[state=inactive]:hidden">
            <Suspense fallback={<TabFallback />}>
              <CRMReport leads={leads} onLeadClick={openLeadDrawer} followUps={pendingFollowUps} />
            </Suspense>
          </TabsContent>
        )}
      </Tabs>

      {newLeadOpen && (
        <Suspense fallback={null}>
          <NewLeadDialog open={newLeadOpen} onOpenChange={setNewLeadOpen} onLeadCreated={loadLeads} />
        </Suspense>
      )}

      {(drawerOpen || selectedLead) && (
        <Suspense fallback={null}>
          <LeadDrawer
            lead={selectedLead}
            open={drawerOpen}
            onClose={() => { setDrawerOpen(false); setSelectedLead(null); }}
            onStatusChange={updateLeadStatus}
            onLeadUpdated={loadLeads}
          />
        </Suspense>
      )}

      {(lostDialogOpen || pendingLostLead) && (
        <Suspense fallback={null}>
          <LostDealsDialog
            open={lostDialogOpen}
            onOpenChange={setLostDialogOpen}
            pendingLead={pendingLostLead}
            lostLeads={lostLeads}
            onConfirmLost={confirmLostDeal}
            onCancel={() => { setPendingLostLead(null); setLostDialogOpen(false); }}
            onLeadClick={openLeadDrawer}
            onLeadReactivated={loadLeads}
            userRole={currentUserRole}
          />
        </Suspense>
      )}

      {pendingLostLead && (
        <Suspense fallback={null}><FollowUpScheduleDialog
          open={lostFollowUpOpen}
          onOpenChange={(v) => { if (!v) handleLostFollowUpCancelled(); }}
          leadId={pendingLostLead.id}
          leadName={pendingLostLead.client_name || pendingLostLead.cliente_nome}
          onConfirm={handleLostFollowUpConfirmed}
        /></Suspense>
      )}

      {pendingVisitLead && (
        <Suspense fallback={null}><VisitScheduleDialog
          open={visitDialogOpen}
          onOpenChange={(v) => { setVisitDialogOpen(v); if (!v) setPendingVisitLead(null); }}
          leadId={pendingVisitLead.id}
          leadName={pendingVisitLead.client_name || pendingVisitLead.cliente_nome}
          onConfirm={handleVisitConfirmed}
      /></Suspense>
      )}

      {pendingContactLead && (
        <Suspense fallback={null}><ContactDescriptionDialog
          open={contactDescOpen}
          onOpenChange={(v) => { setContactDescOpen(v); if (!v) setPendingContactLead(null); }}
          leadName={pendingContactLead.client_name || pendingContactLead.cliente_nome}
          onConfirm={handleContactDescConfirmed}
        /></Suspense>
      )}

      {pendingEnrichLead && (
        <Suspense fallback={null}><LeadEnrichGateDialog
          open={enrichGateOpen}
          onOpenChange={(v) => { setEnrichGateOpen(v); if (!v) setPendingEnrichLead(null); }}
          lead={pendingEnrichLead}
          onConfirm={handleEnrichConfirmed}
        /></Suspense>
      )}

      {orderLinkOpen && (
      <Suspense fallback={null}><OrderLinkDialog
        open={orderLinkOpen}
        onOpenChange={setOrderLinkOpen}
        targetStage={pendingOrderStage}
        onConfirm={handleOrderLinked}
        onCancel={() => { setPendingOrderLead(null); setOrderLinkOpen(false); }}
        onSkip={async () => {
          if (!pendingOrderLead) return;
          try {
            const user = (await supabase.auth.getUser()).data.user;
            const oldStatus = pendingOrderLead.status;
            await (supabase as any)
              .from('leads')
              .update({ status: pendingOrderStage, updated_at: new Date().toISOString() })
              .eq('id', pendingOrderLead.id);
            setLeads(prev => prev.map(l => l.id === pendingOrderLead.id
              ? { ...l, status: pendingOrderStage, updated_at: new Date().toISOString() }
              : l
            ));
            const oldLabel = STAGE_FULL_LABELS[oldStatus] || oldStatus;
            const newLabel = STAGE_FULL_LABELS[pendingOrderStage] || pendingOrderStage;
            await supabase.from('lead_activities').insert({
              lead_id: pendingOrderLead.id,
              activity_type: 'mudanca_status',
              description: `Movido de "${oldLabel}" para "${newLabel}"`,
              user_id: user?.id || '',
            } as any);
            toast.success('Status atualizado', { description: `Lead movido para ${newLabel}` });
            loadLeads();
          } catch {
            toast.error('Erro ao atualizar status');
          }
          setPendingOrderLead(null);
          setOrderLinkOpen(false);
        }}
      /></Suspense>
      )}

      {pendingAnaliseLead && (
        <Suspense fallback={null}><AnaliseFinanceiraDialog
          open={analiseFinOpen}
          onOpenChange={(v) => { setAnaliseFinOpen(v); if (!v) setPendingAnaliseLead(null); }}
          leadId={pendingAnaliseLead.id}
          leadName={pendingAnaliseLead.client_name || pendingAnaliseLead.cliente_nome}
          leadEmpresa={pendingAnaliseLead.empresa}
          leadCnpj={pendingAnaliseLead.cliente_cnpj}
          leadCidade={pendingAnaliseLead.cidade}
          leadEstado={pendingAnaliseLead.estado}
          leadRamoAtuacao={pendingAnaliseLead.ramo_atuacao}
          leadProdutoInteresse={pendingAnaliseLead.produto_interesse}
          leadBudgetNumber={pendingAnaliseLead.budget_number}
          leadWebsite={pendingAnaliseLead.website}
          leadRegimeTributario={pendingAnaliseLead.regime_tributario}
          leadTelefone={pendingAnaliseLead.cliente_telefone}
          leadEmail={pendingAnaliseLead.cliente_email}
          onConfirm={handleAnaliseFinConfirmed}
        /></Suspense>
      )}

      {pendingPassagemLead && (
        <Suspense fallback={null}><PassagemBastaoDialog
          open={passagemBastaoOpen}
          onOpenChange={(v) => { setPassagemBastaoOpen(v); if (!v) setPendingPassagemLead(null); }}
          leadName={pendingPassagemLead.empresa || pendingPassagemLead.client_name || pendingPassagemLead.cliente_nome}
          onConfirm={handlePassagemBastaoConfirmed}
          onCancel={() => { setPendingPassagemLead(null); setPassagemBastaoOpen(false); }}
        /></Suspense>
      )}

      <OwnershipWarningDialog
        open={ownershipWarning.open}
        onOpenChange={(v) => setOwnershipWarning(prev => ({ ...prev, open: v }))}
        ownerName={ownershipWarning.ownerName}
        ownerAvatarUrl={ownershipWarning.ownerAvatarUrl}
        entityType="lead"
        entityName={ownershipWarning.entityName}
        onRequestTransfer={handleRequestTransfer}
      />

      {isMobile && (
        <button
          onClick={() => setNewLeadOpen(true)}
          className="fixed bottom-20 right-4 z-50 w-14 h-14 rounded-full bg-primary text-primary-foreground shadow-lg flex items-center justify-center hover:opacity-90 transition-opacity"
        >
          <Plus className="h-6 w-6" />
        </button>
      )}

      {carouselOpen && (
        <Suspense fallback={null}>
          <DashboardCarousel
            open={carouselOpen}
            onClose={() => setCarouselOpen(false)}
            labels={['Dashboard CRM', 'Dashboard Comercial']}
          >
            <CRMDashboard leads={leads} lastUpdated={lastUpdated} onRefresh={loadLeads} isRefreshing={loading} tvMode vendorFilter={vendorFilter} origemFilter={origemFilter} />
            <DashboardComercial tvMode />
          </DashboardCarousel>
        </Suspense>
      )}
    </div>
  );
}
