import React, { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Target, Users, Phone, UserCheck, TrendingUp, Calendar, Plus, Filter, Search, Eye, Edit, Trash2, Send, MessageCircle, CheckCircle, Settings } from 'lucide-react';
import { format } from 'date-fns';
import { WhatsAppButton } from '@/components/ui/whatsapp-button';
import { usePreVendas } from '@/context/PreVendasContext';
import { useAuth } from '@/context/AuthContext';
import { LeadDialog } from './LeadDialog';
import { QuickActivityDialog } from './QuickActivityDialog';
import { LeadQualificationDialog } from './LeadQualificationDialog';
import { ForwardToSpecialistDialog } from './ForwardToSpecialistDialog';
import { FollowUpDialog } from './FollowUpDialog';
import { AdminGoalsDialog } from './AdminGoalsDialog';
import { LeadDispositionDialog } from './LeadDispositionDialog';
import { LeadHistoryDialog } from './LeadHistoryDialog';
import { ContatosDiariosChart } from './ContatosDiariosChart';
import { FollowUpSection } from './FollowUpSection';
import { LeadCountsIndicator } from './LeadCountsIndicator';
import { MonthlyContactsKPI } from './MonthlyContactsKPI';
import { LeadsTab } from './LeadsTab';
import { LeadOpenTimeIndicator } from './LeadOpenTimeIndicator';
import { LeadStatusCards } from './LeadStatusCards';
import { BusinessTypeChart } from './BusinessTypeChart';
import { ProductInterestChart } from './ProductInterestChart';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ComercialVendorFilter } from './ComercialVendorFilter';
import { supabase } from '@/integrations/supabase/client';
const statusColors = {
  novo: 'bg-blue-500',
  contatado: 'bg-yellow-500',
  respondeu: 'bg-green-500',
  qualificado: 'bg-purple-500',
  encaminhado: 'bg-emerald-500',
  perdido: 'bg-red-500'
};
const statusLabels = {
  novo: 'Novo',
  contatado: 'Contatado',
  respondeu: 'Respondeu',
  qualificado: 'Qualificado',
  encaminhado: 'Encaminhado',
  perdido: 'Perdido'
};
const getFollowUpTypeLabel = (type: string) => {
  const labels: Record<string, string> = {
    reforcar_proposta: 'Reforçar Proposta',
    visita_tecnica: 'Visita Técnica',
    enviar_nova_proposta: 'Enviar Nova Proposta',
    enviar_material_apoio: 'Enviar Material de Apoio',
    confirmar_recebimento: 'Confirmar Recebimento',
    reuniao_apresentacao: 'Reunião de Apresentação',
    solicitar_documentacao: 'Solicitar Documentação',
    agendar_visita_tecnica: 'Agendar Visita Técnica',
    negociar_condicoes: 'Negociar Condições',
    encaminhar_aprovacao: 'Encaminhar para Aprovação',
    follow_up_pos_venda: 'Follow-up Pós-Venda',
    reativar_negociacao: 'Reativar Negociação',
    acompanhar_instalacao: 'Acompanhar Instalação',
    pesquisa_satisfacao: 'Pesquisa de Satisfação',
    upsell_cross_sell: 'Upsell/Cross-sell',
    renovacao_contrato: 'Renovação de Contrato',
    suporte_tecnico: 'Suporte Técnico',
    treinamento_cliente: 'Treinamento Cliente',
    analise_performance: 'Análise de Performance',
    planejamento_futuro: 'Planejamento Futuro',
    outro: 'Outro',
    // Novos tipos para leads
    contato_inicial: 'Contato Inicial',
    agendar_demonstracao: 'Agendar Demonstração',
    enviar_proposta: 'Enviar Proposta',
    qualificar_lead: 'Qualificar Lead',
    acompanhar_interesse: 'Acompanhar Interesse'
  };
  return labels[type] || type;
};
const getActivityTypeLabel = (type: string) => {
  const labels: Record<string, string> = {
    contato_inicial: 'Contato Inicial',
    resposta_recebida: 'Resposta Recebida',
    qualificacao: 'Qualificação',
    encaminhamento: 'Encaminhamento',
    follow_up: 'Follow-up',
    nota: 'Nota'
  };
  return labels[type] || type;
};
export const PreVendasSection: React.FC = () => {
  // Early return if not properly wrapped in provider
  let context;
  try {
    context = usePreVendas();
  } catch (error) {
    console.error('PreVendas context error:', error);
    return <Card>
        <CardContent className="p-6 text-center">
          <p className="text-muted-foreground">
            Erro: Componente não está dentro do PreVendasProvider
          </p>
        </CardContent>
      </Card>;
  }
  const {
    leads,
    activities,
    followUps,
    goals,
    adminGoals,
    dailyStats,
    loading,
    selectedDate,
    setSelectedDate,
    loadLeads,
    createLead,
    updateLead,
    deleteLead,
    createActivity,
    markFollowUpAsCompleted,
    loadAdminGoals
  } = context;
  const {
    userProfile
  } = useAuth();
  const [activeTab, setActiveTab] = useState('dashboard');
  const [leadDialogOpen, setLeadDialogOpen] = useState(false);
  const [quickActivityDialogOpen, setQuickActivityDialogOpen] = useState(false);
  const [qualificationDialogOpen, setQualificationDialogOpen] = useState(false);
  const [forwardDialogOpen, setForwardDialogOpen] = useState(false);
  const [selectedLead, setSelectedLead] = useState<any>(null);
  const [selectedFollowUp, setSelectedFollowUp] = useState<any>(null);
  const [dispositionDialogOpen, setDispositionDialogOpen] = useState(false);
  const [leadToDispose, setLeadToDispose] = useState<any>(null);
  const [followUpDialogOpen, setFollowUpDialogOpen] = useState(false);
  const [leadForFollowUp, setLeadForFollowUp] = useState<any>(null);
  const [showAdminGoalsDialog, setShowAdminGoalsDialog] = useState(false);
  const [leadToQualify, setLeadToQualify] = useState<any>(null);
  const [historyLead, setHistoryLead] = useState<any>(null);

  // Filtros
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [selectedSDR, setSelectedSDR] = useState<string>(() => {
    // Para SDRs, iniciar com seu próprio nome por padrão
    if (userProfile?.role === 'sdr') {
      const savedFilter = localStorage.getItem('prevendas-sdr-filter');
      return savedFilter !== null ? savedFilter : userProfile.full_name;
    }
    return localStorage.getItem('prevendas-sdr-filter') || '';
  });
  const [availableSDRs, setAvailableSDRs] = useState<string[]>([]);

  // Filtrar leads
  const filteredLeads = useMemo(() => {
    return leads.filter(lead => {
      const matchesSearch = !searchTerm || lead.client_name.toLowerCase().includes(searchTerm.toLowerCase()) || lead.contact_name?.toLowerCase().includes(searchTerm.toLowerCase()) || lead.client_code.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesStatus = statusFilter === 'all' || lead.status === statusFilter;
      const matchesSDR = !selectedSDR || lead.sdr_name === selectedSDR;
      return matchesSearch && matchesStatus && matchesSDR;
    }).sort((a, b) => {
      // Priorizar leads não contatados (mais antigos primeiro)
      const aHasContact = !!a.last_contact_at;
      const bHasContact = !!b.last_contact_at;

      // Se um tem contato e outro não, priorizar o sem contato
      if (aHasContact && !bHasContact) return 1;
      if (!aHasContact && bHasContact) return -1;

      // Se ambos não têm contato, ordenar por data de criação (mais antigo primeiro)
      if (!aHasContact && !bHasContact) {
        return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
      }

      // Se ambos têm contato, ordenar por último contato (mais recente primeiro)
      return new Date(b.last_contact_at).getTime() - new Date(a.last_contact_at).getTime();
    });
  }, [leads, searchTerm, statusFilter, selectedSDR]);

  // Extrair SDRs únicos dos leads
  React.useEffect(() => {
    const sdrs = [...new Set(leads.map(lead => lead.sdr_name).filter(Boolean))].sort() as string[];
    setAvailableSDRs(sdrs);

    // Se for SDR e não tem filtro salvo, usar o nome do usuário
    if (userProfile?.role === 'sdr' && !localStorage.getItem('prevendas-sdr-filter')) {
      setSelectedSDR(userProfile.full_name);
    }
  }, [leads, userProfile]);

  // Filtrar follow-ups
  const filteredFollowUps = followUps?.filter(followUp => {
    if (!followUp.show_today) return false;
    const followUpDate = new Date(followUp.scheduled_date);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    followUpDate.setHours(0, 0, 0, 0);
    return followUpDate <= today;
  }) || [];

  // Get all completed follow-ups for history (not just today's)
  const completedFollowUps = followUps?.filter(followUp => followUp.is_completed) || [];

  // Estatísticas agregadas
  const stats = useMemo(() => {
    const total = leads.length;
    const novos = leads.filter(l => l.status === 'novo').length;
    const contatados = leads.filter(l => l.status === 'contatado').length;
    const responderam = leads.filter(l => l.status === 'respondeu').length;
    const qualificados = leads.filter(l => l.status === 'qualificado').length;
    const encaminhados = leads.filter(l => l.status === 'encaminhado').length;
    return {
      total,
      novos,
      contatados,
      responderam,
      qualificados,
      encaminhados,
      conversaoTotal: total > 0 ? responderam / contatados * 100 : 0
    };
  }, [leads]);

  // Estatísticas filtradas por SDR para os cards
  const filteredDailyStats = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const endOfDay = new Date();
    endOfDay.setHours(23, 59, 59, 999);
    let filteredActivities = activities.filter(activity => {
      const activityDate = new Date(activity.created_at);
      return activityDate >= today && activityDate <= endOfDay;
    });

    // Aplicar filtro de SDR se selecionado
    if (selectedSDR) {
      filteredActivities = filteredActivities.filter(activity => activity.sdr_name === selectedSDR);
    }

    // Contar contatos únicos por lead no dia
    const contactsMade = new Set(
      filteredActivities
        .filter(a => a.activity_type === 'contato_inicial')
        .map(a => a.lead_id)
    ).size;

    const responsesReceived = filteredActivities.filter(a => a.activity_type === 'resposta_recebida').length;
    const qualifiedLeads = filteredActivities.filter(a => a.activity_type === 'qualificacao').length;
    const forwardedLeads = filteredActivities.filter(a => a.activity_type === 'encaminhamento').length;
    const forwardedToday = filteredActivities.filter(a => a.activity_type === 'encaminhamento').length;

    return {
      contactsMade,
      responsesReceived,
      qualifiedLeads,
      forwardedLeads,
      forwardedToday,
      conversionRate: contactsMade > 0 ? forwardedLeads / contactsMade * 100 : 0
    };
  }, [activities, selectedSDR]);

  // Estatísticas mensais para os indicadores principais
  const filteredMonthlyStats = useMemo(() => {
    const currentMonth = selectedDate.getMonth();
    const currentYear = selectedDate.getFullYear();
    let filteredActivities = activities.filter(activity => {
      const activityDate = new Date(activity.created_at);
      return activityDate.getMonth() === currentMonth && activityDate.getFullYear() === currentYear;
    });

    // Aplicar filtro de SDR se selecionado
    if (selectedSDR) {
      filteredActivities = filteredActivities.filter(activity => activity.sdr_name === selectedSDR);
    }
    const contactsMade = filteredActivities.filter(a => a.activity_type === 'contato_inicial').length;
    const responsesReceived = filteredActivities.filter(a => a.activity_type === 'resposta_recebida').length;
    const qualifiedLeads = filteredActivities.filter(a => a.activity_type === 'qualificacao').length;
    const forwardedLeads = filteredActivities.filter(a => a.activity_type === 'encaminhamento').length;
    return {
      contactsMade,
      responsesReceived,
      qualifiedLeads,
      forwardedLeads,
      conversionRate: contactsMade > 0 ? forwardedLeads / contactsMade * 100 : 0
    };
  }, [activities, selectedSDR, selectedDate]);

  // Calcular metas ajustadas baseado no filtro de SDR
  const adjustedGoals = useMemo(() => {
    const totalSDRs = availableSDRs.length || 1; // Evitar divisão por zero
    const isFilteredBySDR = selectedSDR && availableSDRs.includes(selectedSDR);

    // Se não há filtro por SDR específico, usar metas completas
    if (!isFilteredBySDR) {
      return {
        dailyContacts: adminGoals?.daily_contacts_goal || goals?.daily_contacts_goal || 40,
        monthlyContacts: adminGoals?.monthly_contacts_goal || 1200,
        qualifiedLeads: adminGoals?.qualified_leads_goal || goals?.qualified_leads_goal || 2,
        forwardedLeads: adminGoals?.forwarded_leads_goal || 25
      };
    }

    // Se filtrado por SDR, dividir as metas pelo número de SDRs
    return {
      dailyContacts: Math.ceil((adminGoals?.daily_contacts_goal || goals?.daily_contacts_goal || 40) / totalSDRs),
      monthlyContacts: Math.ceil((adminGoals?.monthly_contacts_goal || 1200) / totalSDRs),
      qualifiedLeads: Math.ceil((adminGoals?.qualified_leads_goal || goals?.qualified_leads_goal || 2) / totalSDRs),
      forwardedLeads: Math.ceil((adminGoals?.forwarded_leads_goal || 25) / totalSDRs)
    };
  }, [adminGoals, goals, availableSDRs, selectedSDR]);
  const handleDisposeLead = (lead: any) => {
    setLeadToDispose(lead);
    setDispositionDialogOpen(true);
  };
  const handleLeadDisposed = () => {
    // Recarregar leads após disposição
    loadLeads();
  };
  const handleQuickActivity = (lead: any) => {
    setSelectedLead(lead);
    setQuickActivityDialogOpen(true);
  };
  const handleQualification = (lead: any) => {
    setLeadToQualify(lead);
    setQualificationDialogOpen(true);
  };
  const handleForwardToSpecialist = async (leadId: string, specialistId: string, briefing: string) => {
    try {
      // Buscar dados do especialista
      const {
        data: specialist,
        error: specialistError
      } = await supabase.from('user_profiles').select('id, full_name, email').eq('id', specialistId).single();
      if (specialistError) throw specialistError;

      // Buscar dados do lead
      const {
        data: leadData,
        error: leadError
      } = await supabase.from('leads').select('*').eq('id', leadId).single();
      if (leadError) throw leadError;

      // Atualizar o lead
      await updateLead(leadId, {
        forwarded_to_specialist: true,
        forwarded_at: new Date().toISOString(),
        status: 'encaminhado',
        pipeline_status: 'encaminhado',
        // Status separado para o pipeline
        assigned_specialist_id: specialistId,
        assigned_specialist_name: specialist.full_name
      });

      // Criar atividade de encaminhamento
      await createActivity({
        lead_id: leadId,
        activity_type: 'encaminhamento',
        description: `Lead encaminhado para ${specialist.full_name}`
      });

      // Notificar o vendedor
      const {
        error: notifyError
      } = await supabase.functions.invoke('notify-vendor-lead', {
        body: {
          lead_id: leadId,
          vendor_id: specialistId,
          vendor_name: specialist.full_name,
          vendor_email: specialist.email,
          lead_client_name: leadData.cliente_nome,
          sdr_name: userProfile?.full_name || 'SDR'
        }
      });
      if (notifyError) {
        console.error('Erro ao notificar vendedor:', notifyError);
      }
    } catch (error) {
      console.error('Erro ao encaminhar lead:', error);
      throw error;
    }
  };
  const handleFollowUpComplete = async (followUpId: string) => {
    await markFollowUpAsCompleted(followUpId, 'Follow-up concluído via sistema');
  };

  // Verificar se o usuário está logado
  if (!userProfile) {
    return <Card>
        <CardContent className="p-6 text-center">
          <p className="text-muted-foreground">
            Carregando...
          </p>
        </CardContent>
      </Card>;
  }
  return <div className="space-y-6">
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList data-tour="pre-vendas-tabs">
          <TabsTrigger value="dashboard">Dashboard</TabsTrigger>
          <TabsTrigger value="leads">Leads</TabsTrigger>
          <TabsTrigger value="gestao">Gestão de Leads</TabsTrigger>
          <TabsTrigger value="atividades">Atividades</TabsTrigger>
          <TabsTrigger value="followups">Follow-ups</TabsTrigger>
        </TabsList>

        {/* Dashboard Tab */}
        <TabsContent value="dashboard" className="space-y-6">
          {/* Filtros e Configurações */}
          <div className="flex justify-between items-center mb-6" data-tour="pre-vendas-filters">
            <div className="flex gap-4 items-center">
              <ComercialVendorFilter vendedores={availableSDRs} selectedVendedor={selectedSDR} onVendedorChange={sdr => {
              const newFilter = sdr || '';
              setSelectedSDR(newFilter);
              localStorage.setItem('prevendas-sdr-filter', newFilter);
            }} />
              <Select value={selectedDate.getMonth().toString()} onValueChange={month => {
              const newDate = new Date(selectedDate);
              newDate.setMonth(parseInt(month));
              setSelectedDate(newDate);
            }}>
                <SelectTrigger className="w-[140px]">
                  <SelectValue placeholder="Mês" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="0">Janeiro</SelectItem>
                  <SelectItem value="1">Fevereiro</SelectItem>
                  <SelectItem value="2">Março</SelectItem>
                  <SelectItem value="3">Abril</SelectItem>
                  <SelectItem value="4">Maio</SelectItem>
                  <SelectItem value="5">Junho</SelectItem>
                  <SelectItem value="6">Julho</SelectItem>
                  <SelectItem value="7">Agosto</SelectItem>
                  <SelectItem value="8">Setembro</SelectItem>
                  <SelectItem value="9">Outubro</SelectItem>
                  <SelectItem value="10">Novembro</SelectItem>
                  <SelectItem value="11">Dezembro</SelectItem>
                </SelectContent>
              </Select>
              <Select value={selectedDate.getFullYear().toString()} onValueChange={year => {
              const newDate = new Date(selectedDate);
              newDate.setFullYear(parseInt(year));
              setSelectedDate(newDate);
            }}>
                <SelectTrigger className="w-[100px]">
                  <SelectValue placeholder="Ano" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="2023">2023</SelectItem>
                  <SelectItem value="2024">2024</SelectItem>
                  <SelectItem value="2025">2025</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {userProfile?.role === 'admin' && <Button variant="outline" onClick={() => setShowAdminGoalsDialog(true)} className="gap-2">
                <Settings className="h-4 w-4" />
                Configurar Metas
              </Button>}
          </div>

          {/* KPIs Diários */}
          <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4" data-tour="pre-vendas-kpis">
            {/* KPI Mensal */}
            <MonthlyContactsKPI activities={activities.filter(activity => !selectedSDR || activity.sdr_name === selectedSDR)} monthlyGoal={adjustedGoals.monthlyContacts} baseDate={selectedDate} />
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center space-x-2">
                  <Phone className="h-4 w-4 text-blue-500" />
                  <div>
                    <p className="text-sm font-medium">Contatos Hoje</p>
                    <p className="text-2xl font-bold">{filteredDailyStats.contactsMade}</p>
                    <p className="text-xs text-muted-foreground">
                      Meta: {adjustedGoals.dailyContacts}
                    </p>
                  </div>
                </div>
                <Progress value={filteredDailyStats.contactsMade / adjustedGoals.dailyContacts * 100} className="mt-2" />
              </CardContent>
            </Card>


            <Card>
              <CardContent className="p-4">
                <div className="flex items-center space-x-2">
                  <Target className="h-4 w-4 text-green-500" />
                  <div>
                    <p className="text-sm font-medium">Encaminhados Hoje</p>
                    <p className="text-2xl font-bold">{filteredDailyStats.forwardedToday}</p>
                    <p className="text-xs text-muted-foreground">
                      Meta diária: {Math.ceil(adjustedGoals.forwardedLeads / 30)}
                    </p>
                  </div>
                </div>
                <Progress value={filteredDailyStats.forwardedToday / Math.ceil(adjustedGoals.forwardedLeads / 30) * 100} className="mt-2" />
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <div className="flex items-center space-x-2">
                  <Target className="h-4 w-4 text-emerald-500" />
                  <div>
                    <p className="text-sm font-medium">Encaminhados Mês</p>
                    <p className="text-2xl font-bold">{filteredMonthlyStats.forwardedLeads}</p>
                    <p className="text-xs text-muted-foreground">
                      Meta: {adjustedGoals.forwardedLeads}
                    </p>
                  </div>
                </div>
                <Progress value={filteredMonthlyStats.forwardedLeads / adjustedGoals.forwardedLeads * 100} className="mt-2" />
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <div className="flex items-center space-x-2">
                  <TrendingUp className="h-4 w-4 text-orange-500" />
                  <div>
                    <p className="text-sm font-medium">Conversão</p>
                    <p className="text-2xl font-bold">{filteredMonthlyStats.conversionRate.toFixed(1)}%</p>
                     <p className="text-xs text-muted-foreground">
                       Meta: {(() => {
                      const targetRate = adminGoals?.conversion_goal_percent || goals?.conversion_goal_percent || (adminGoals?.forwarded_leads_goal && adminGoals?.monthly_contacts_goal ? adminGoals.forwarded_leads_goal / adminGoals.monthly_contacts_goal * 100 : 25);
                      return targetRate.toFixed(1);
                    })()}%
                     </p>
                  </div>
                </div>
                <Progress value={(() => {
                const targetRate = adminGoals?.conversion_goal_percent || goals?.conversion_goal_percent || (adminGoals?.forwarded_leads_goal && adminGoals?.monthly_contacts_goal ? adminGoals.forwarded_leads_goal / adminGoals.monthly_contacts_goal * 100 : 25);
                return targetRate > 0 ? Math.min(filteredMonthlyStats.conversionRate / targetRate * 100, 100) : 0;
              })()} className="mt-2" />
              </CardContent>
            </Card>
          </div>

          {/* Gráfico de Evolução Diária */}
          <div className="mb-6">
            <ContatosDiariosChart activities={activities.filter(activity => !selectedSDR || activity.sdr_name === selectedSDR)} dailyGoal={adjustedGoals.dailyContacts} baseDate={selectedDate} />
          </div>

          {/* Cards de Status dos Leads */}
          <div className="mb-6">
            <LeadStatusCards leads={filteredLeads} />
          </div>

          {/* Gráficos de Análise de Leads */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
            <BusinessTypeChart leads={filteredLeads} />
            <ProductInterestChart leads={filteredLeads} />
          </div>

        </TabsContent>

        {/* Leads Tab */}
        <TabsContent value="leads" className="space-y-6">
          <LeadsTab leads={filteredLeads} searchTerm={searchTerm} setSearchTerm={setSearchTerm} statusFilter={statusFilter} setStatusFilter={setStatusFilter} selectedSDR={selectedSDR} setSelectedSDR={setSelectedSDR} availableSDRs={availableSDRs} onNewLead={() => setLeadDialogOpen(true)} onEditLead={lead => {
          setSelectedLead(lead);
          setLeadDialogOpen(true);
        }} onRefresh={loadLeads} />
        </TabsContent>

        {/* Gestão de Leads Tab */}
        <TabsContent value="gestao" className="space-y-6">
          {/* Filtros */}
          <Card>
            <CardContent className="p-4">
              <div className="flex flex-col md:flex-row gap-4">
                <div className="flex-1">
                  <Input placeholder="Buscar por cliente, contato ou código..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="w-full" />
                </div>
                <div className="flex gap-2">
                  <ComercialVendorFilter vendedores={availableSDRs} selectedVendedor={selectedSDR} onVendedorChange={sdr => setSelectedSDR(sdr || '')} />
                  <Select value={statusFilter} onValueChange={setStatusFilter}>
                    <SelectTrigger className="w-[180px]">
                      <SelectValue placeholder="Status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todos os status</SelectItem>
                      <SelectItem value="novo">Novo</SelectItem>
                      <SelectItem value="contatado">Contatado</SelectItem>
                      <SelectItem value="respondeu">Respondeu</SelectItem>
                      <SelectItem value="qualificado">Qualificado</SelectItem>
                      <SelectItem value="encaminhado">Encaminhado</SelectItem>
                      <SelectItem value="perdido">Perdido</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <Button onClick={() => setLeadDialogOpen(true)}>
                  <Plus className="h-4 w-4 mr-2" />
                  Novo Lead
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Tabela de Leads com Gestão Completa */}
          <Card>
            <CardHeader>
              <CardTitle>Gestão de Leads ({filteredLeads.length})</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Cliente</TableHead>
                    <TableHead>Localização</TableHead>
                    <TableHead>Contato</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Qualificação</TableHead>
                    <TableHead>Tempo em Aberto</TableHead>
                    <TableHead>SDR</TableHead>
                    <TableHead>Último Contato</TableHead>
                    <TableHead>Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredLeads.map(lead => <TableRow key={lead.id}>
                      <TableCell>
                        <div>
                          <div className="font-medium">{lead.client_name}</div>
                          <div className="text-sm text-muted-foreground">{lead.client_code}</div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="text-sm">
                          {lead.cidade && lead.uf ? `${lead.cidade}, ${lead.uf}` : 'Não informado'}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="text-sm">
                          <div>{lead.contact_name || 'Não informado'}</div>
                          {lead.contact_phone && <div className="text-muted-foreground">{lead.contact_phone}</div>}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="secondary" className={`text-white ${statusColors[lead.status as keyof typeof statusColors]}`}>
                          {statusLabels[lead.status as keyof typeof statusLabels]}
                        </Badge>
                      </TableCell>
                        <TableCell>
                          {lead.qualification_score > 0 || lead.is_qualified || lead.status === 'qualificado' || lead.status === 'encaminhado' ? <Badge variant="default" className="bg-green-500 cursor-pointer hover:bg-green-600 transition-colors" onClick={() => {
                      setLeadToQualify(lead);
                      setQualificationDialogOpen(true);
                    }} title="Clique para ver detalhes da qualificação">
                              ✅ Qualificado {lead.qualification_score > 0 ? `(${lead.qualification_score}/5)` : ''}
                            </Badge> : <Badge variant="secondary">
                              ⏳ Pendente
                            </Badge>}
                        </TableCell>
                      <TableCell>
                        <LeadOpenTimeIndicator lead={lead} />
                      </TableCell>
                      <TableCell>
                        <div className="text-sm">{lead.sdr_name}</div>
                      </TableCell>
                      <TableCell>
                        <div className="text-sm">
                          {lead.last_contact_at ? format(new Date(lead.last_contact_at), 'dd/MM/yyyy') : 'Nunca'}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-1 flex-wrap">
                          {!lead.conversation_started && <Button size="sm" variant="outline" onClick={() => handleQuickActivity(lead)} title="Registrar contato">
                              <Plus className="h-3 w-3" />
                              {lead.contact_attempts && lead.contact_attempts > 0 && <Badge variant="secondary" className="ml-1 text-xs">
                                  {lead.contact_attempts}
                                </Badge>}
                            </Button>}
                          
                          {lead.conversation_started && !lead.is_qualified && lead.status !== 'qualificado' && <Button size="sm" variant="default" onClick={() => handleQualification(lead)} title="Qualificar lead">
                              <CheckCircle className="h-3 w-3" />
                            </Button>}
                          
                          {lead.is_qualified && !lead.forwarded_to_specialist && <Button size="sm" variant="default" onClick={() => {
                        setSelectedLead(lead);
                        setForwardDialogOpen(true);
                      }} title="Encaminhar para especialista">
                              <Send className="h-3 w-3" />
                            </Button>}

                          <Button size="sm" variant="outline" onClick={() => {
                        setLeadForFollowUp(lead);
                        setFollowUpDialogOpen(true);
                      }} title="Agendar follow-up">
                            <Calendar className="h-3 w-3" />
                            <LeadCountsIndicator leadId={lead.id} type="followups" />
                          </Button>

                          <Button size="sm" variant="outline" onClick={() => setHistoryLead(lead)} title="Ver histórico completo">
                            <Eye className="h-3 w-3" />
                          </Button>

                          <Button size="sm" variant="outline" onClick={() => handleDisposeLead(lead)} className="text-red-600 hover:text-red-700" title="Descartar lead">
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>)}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Atividades Tab */}
        <TabsContent value="atividades" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Histórico de Atividades</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {activities.filter(activity => !selectedSDR || activity.sdr_name === selectedSDR).length === 0 ? <p className="text-muted-foreground text-center">Nenhuma atividade registrada.</p> : activities.filter(activity => !selectedSDR || activity.sdr_name === selectedSDR).map(activity => <div key={activity.id} className="border-l-4 border-blue-500 pl-4 py-2">
                      <div className="font-medium">{activity.description}</div>
                      <div className="text-sm text-muted-foreground mt-1">
                        {format(new Date(activity.created_at), 'dd/MM/yyyy HH:mm')}
                      </div>
                      <div className="text-sm text-muted-foreground mb-2">
                        <span className="font-medium">Tipo:</span> {getActivityTypeLabel(activity.activity_type)} • 
                        <span className="font-medium"> SDR:</span> {activity.sdr_name}
                      </div>
                      {activity.conversation_started !== null && <div className="text-sm mt-1">
                          <strong>Conversa iniciada:</strong> {activity.conversation_started ? 'Sim' : 'Não'}
                        </div>}
                    </div>)}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Follow-ups Tab */}
        <TabsContent value="followups" className="space-y-6">
          <FollowUpSection />
        </TabsContent>
      </Tabs>

      {/* Dialogs */}
      <AdminGoalsDialog open={showAdminGoalsDialog} onClose={() => setShowAdminGoalsDialog(false)} onSave={() => {
      loadAdminGoals();
      setShowAdminGoalsDialog(false);
    }} />

      <LeadDialog open={leadDialogOpen} onClose={() => {
      setLeadDialogOpen(false);
      setSelectedLead(null);
    }} lead={selectedLead} onSave={async leadData => {
      if (selectedLead) {
        await updateLead(selectedLead.id, leadData);
      } else {
        await createLead(leadData);
      }
    }} />

      <QuickActivityDialog open={quickActivityDialogOpen} onClose={() => {
      setQuickActivityDialogOpen(false);
      setSelectedLead(null);
    }} lead={selectedLead} onSave={createActivity} />

      <LeadQualificationDialog open={qualificationDialogOpen} onClose={() => {
      setQualificationDialogOpen(false);
      setLeadToQualify(null);
    }} lead={leadToQualify} onSave={async updates => {
      if (leadToQualify) {
        console.log('=== PREVENDA: INÍCIO DO SALVAMENTO ===');
        console.log('PreVendasSection: Lead ID:', leadToQualify.id);
        console.log('PreVendasSection: Updates received:', updates);
        try {
          console.log('PreVendasSection: Calling updateLead...');
          await updateLead(leadToQualify.id, updates);
          console.log('PreVendasSection: UpdateLead completed successfully');

          // Se o lead foi qualificado, criar atividade
          if (updates.is_qualified) {
            console.log('PreVendasSection: Lead qualified, creating activity');
            await createActivity({
              lead_id: leadToQualify.id,
              activity_type: 'qualificacao',
              description: `Lead qualificado com ${updates.qualification_score}/5 critérios`
            });
          }
          console.log('=== PREVENDA: FIM DO SALVAMENTO ===');
        } catch (error) {
          console.error('=== PREVENDA: ERRO NO SALVAMENTO ===');
          console.error('PreVendasSection error:', error);
          throw error;
        }
      }
      setQualificationDialogOpen(false);
      setLeadToQualify(null);
    }} />

      <ForwardToSpecialistDialog open={forwardDialogOpen} onClose={() => {
      setForwardDialogOpen(false);
      setSelectedLead(null);
    }} lead={selectedLead} onForward={handleForwardToSpecialist} />

      <FollowUpDialog open={followUpDialogOpen} onOpenChange={open => {
      setFollowUpDialogOpen(open);
      if (!open) setLeadForFollowUp(null);
    }} leadId={leadForFollowUp?.id} clientName={leadForFollowUp?.client_name || ''} budgetNumber="" searchBy="leads" />

      <LeadDispositionDialog open={dispositionDialogOpen} onOpenChange={setDispositionDialogOpen} lead={leadToDispose} onDisposed={handleLeadDisposed} />

      <LeadHistoryDialog open={!!historyLead} onClose={() => setHistoryLead(null)} lead={historyLead} />
    </div>;
};