import React, { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { 
  Target, 
  Users, 
  Clock, 
  CheckCircle,
  AlertCircle,
  Plus,
  Filter,
  Search,
  Eye,
  Edit,
  MessageSquare,
  Calendar,
  Bell,
  Phone,
  Mail,
  MapPin,
  Trash2
} from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { useIsMobile } from '@/hooks/use-mobile';
import { Lead } from '@/context/PreVendasContext';
import { LeadQualificationDialog } from '@/components/dashboard/LeadQualificationDialog';
import { LeadHistoryDialog } from '@/components/dashboard/LeadHistoryDialog';
import { LeadQualificationPreview } from '@/components/dashboard/LeadQualificationPreview';
import { LeadStatusUpdateDialog } from '@/components/dashboard/LeadStatusUpdateDialog';
import { SpecialistAssignmentDialog } from '@/components/dashboard/SpecialistAssignmentDialog';
import { PipelineLeadTimeIndicator } from '@/components/dashboard/PipelineLeadTimeIndicator';
import { PipelineStatusCards } from '@/components/dashboard/PipelineStatusCards';
import { PipelineTableMobile } from '@/components/dashboard/PipelineTableMobile';

interface VendorNotification {
  id: string;
  vendor_id: string;
  vendor_name: string;
  lead_id: string;
  lead_client_name: string;
  sdr_name: string;
  message: string;
  is_read: boolean;
  created_at: string;
  updated_at: string;
}

interface LeadActivity {
  id: string;
  lead_id: string;
  activity_type: string;
  description: string;
  result?: string;
  next_action?: string;
  sdr_name: string;
  created_at: string;
}

export const Pipeline: React.FC = () => {
  const { userProfile } = useAuth();
  const { toast } = useToast();
  const isMobile = useIsMobile();
  
  const [leads, setLeads] = useState<Lead[]>([]);
  const [notifications, setNotifications] = useState<VendorNotification[]>([]);
  const [activities, setActivities] = useState<LeadActivity[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [selectedSDR, setSelectedSDR] = useState<string>('all');
  const [selectedVendor, setSelectedVendor] = useState<string>('all');
  const [activeTab, setActiveTab] = useState('leads');
  const [qualificationDialogOpen, setQualificationDialogOpen] = useState(false);
  const [leadToQualify, setLeadToQualify] = useState<Lead | null>(null);
  const [qualificationPreviewOpen, setQualificationPreviewOpen] = useState(false);
  const [leadForQualificationPreview, setLeadForQualificationPreview] = useState<Lead | null>(null);
  const [historyDialogOpen, setHistoryDialogOpen] = useState(false);
  const [historyLead, setHistoryLead] = useState<Lead | null>(null);
  const [statusUpdateDialogOpen, setStatusUpdateDialogOpen] = useState(false);
  const [leadForStatusUpdate, setLeadForStatusUpdate] = useState<Lead | null>(null);
  const [assignmentDialogOpen, setAssignmentDialogOpen] = useState(false);
  const [leadForAssignment, setLeadForAssignment] = useState<Lead | null>(null);

  // Filtrar leads por tab ativa
  const getFilteredLeadsForTab = (tabValue: string) => {
    let tabLeads = leads.filter(lead => {
      // Se o usuário tem leads como SDR (sdr_id), mostrar apenas leads encaminhados por ele
      const isUserSdr = leads.some(l => l.sdr_id === userProfile?.id);
      if (isUserSdr && lead.sdr_id !== userProfile.id) {
        return false;
      }
      
      // Se o usuário for comercial e NÃO for SDR, mostrar apenas leads atribuídos a ele como specialist
      if (userProfile?.role === 'comercial' && !isUserSdr && lead.assigned_specialist_id !== userProfile.id) {
        return false;
      }

      const statusNorm = ((lead.status || '') + '').trim().toLowerCase();
      const pipelineNorm = ((lead.pipeline_status || '') + '').trim().toLowerCase();

      // Para a seção de perdidos, mostrar apenas leads ENCAMINHADOS com status/pipeline "perdido"
      if (tabValue === 'perdidos') {
        return lead.forwarded_to_specialist && (statusNorm.startsWith('perdido') || pipelineNorm === 'perdido');
      }
      
      // Pipeline mostra leads que foram encaminhados
      if (!lead.forwarded_to_specialist) return false;
      
      // Filtrar por tab
      if (tabValue === 'leads') {
        // Leads pipeline: todos exceto orçando, pedido_fechado e perdidos
        const pipelineStatus = lead.pipeline_status || 'encaminhado';
        return pipelineStatus !== 'orçando' && pipelineStatus !== 'pedido_fechado' && !(statusNorm.startsWith('perdido') || pipelineNorm === 'perdido');
      } else if (tabValue === 'orcando') {
        return (lead.pipeline_status || 'encaminhado') === 'orçando';
      } else if (tabValue === 'pedido_fechado') {
        return (lead.pipeline_status || 'encaminhado') === 'pedido_fechado';
      }
      
      return true;
    });

    // Aplicar filtros de busca e status
    return tabLeads.filter(lead => {
      const matchesSearch = !searchTerm || 
        lead.client_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        lead.contact_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        lead.client_code.toLowerCase().includes(searchTerm.toLowerCase());
        
      const matchesStatus = statusFilter === 'all' || (lead.pipeline_status || 'encaminhado') === statusFilter;
      
      const matchesSDR = selectedSDR === 'all' || lead.sdr_name === selectedSDR;
      
      const matchesVendor = selectedVendor === 'all' || lead.assigned_specialist_name === selectedVendor;
      
      return matchesSearch && matchesStatus && matchesSDR && matchesVendor;
    });
  };

  const filteredLeads = useMemo(() => {
    return getFilteredLeadsForTab(activeTab);
  }, [leads, searchTerm, statusFilter, selectedSDR, selectedVendor, userProfile, activeTab]);

  const orcandoLeads = useMemo(() => {
    return getFilteredLeadsForTab('orcando');
  }, [leads, searchTerm, statusFilter, selectedSDR, selectedVendor, userProfile]);

  const pedidoFechadoLeads = useMemo(() => {
    return getFilteredLeadsForTab('pedido_fechado');
  }, [leads, searchTerm, statusFilter, selectedSDR, selectedVendor, userProfile]);

  const perdidosLeads = useMemo(() => {
    return getFilteredLeadsForTab('perdidos');
  }, [leads, searchTerm, statusFilter, selectedSDR, selectedVendor, userProfile]);

  // Listas únicas para filtros
  const uniqueSDRs = useMemo(() => {
    const sdrs = [...new Set(leads.map(lead => lead.sdr_name).filter(Boolean))];
    return sdrs.sort();
  }, [leads]);

  const uniqueVendors = useMemo(() => {
    const vendors = [...new Set(leads.map(lead => lead.assigned_specialist_name).filter(Boolean))];
    return vendors.sort();
  }, [leads]);

  // Carregar dados
  useEffect(() => {
    if (userProfile) {
      loadPipelineData();
      loadNotifications();
    }
    
    // Subscription para atualizações em tempo real
    const notificationsChannel = supabase
      .channel('vendor-notifications')
      .on('postgres_changes', 
        { event: 'INSERT', schema: 'public', table: 'vendor_notifications' },
        (payload) => {
          if (payload.new.vendor_id === userProfile?.id) {
            setNotifications(prev => [payload.new as VendorNotification, ...prev]);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(notificationsChannel);
    };
  }, [userProfile]);

  const loadPipelineData = async () => {
    try {
      setLoading(true);
      
      // Construir query base
      let query = supabase
        .from('leads')
        .select('*')
        .eq('forwarded_to_specialist', true);
      
      // Verificar se o usuário é SDR (tem leads onde sdr_id = user.id)
      const { data: userSdrLeads } = await supabase
        .from('leads')
        .select('id')
        .eq('sdr_id', userProfile?.id)
        .limit(1);
      
      const isUserSdr = userSdrLeads && userSdrLeads.length > 0;
      
      // Se o usuário é SDR, filtrar apenas seus leads encaminhados
      if (isUserSdr) {
        query = query.eq('sdr_id', userProfile.id);
      }
      
      // Executar query
      const { data: leadsData, error: leadsError } = await query
        .order('forwarded_at', { ascending: false });

      if (leadsError) throw leadsError;
      
      // Processar qualificação dos leads (mesma lógica do PreVendasContext)
      const processedLeads = (leadsData || []).map(lead => {
        // Importar função de processamento de qualificação
        const getQualificationDetails = (lead: any) => {
          const criteriaMet = lead.qualification_criteria_met || [];
          const qualificationScore = criteriaMet.length;
          const isQualified = qualificationScore >= 3;
          
          return {
            qualificationScore,
            isQualified,
            qualifiedCriteria: criteriaMet
          };
        };
        
        const qualification = getQualificationDetails(lead);
        return {
          ...lead,
          qualification_score: qualification.qualificationScore,
          is_qualified: qualification.isQualified,
          qualification_criteria_met: qualification.qualifiedCriteria
        };
      });
      
      setLeads(processedLeads as Lead[]);

      // Carregar atividades dos leads
      if (leadsData && leadsData.length > 0) {
        const leadIds = leadsData.map(lead => lead.id);
        const { data: activitiesData, error: activitiesError } = await supabase
          .from('lead_activities')
          .select('*')
          .in('lead_id', leadIds)
          .order('created_at', { ascending: false });

        if (activitiesError) throw activitiesError;
        setActivities(activitiesData || []);
      }
    } catch (error) {
      console.error('Erro ao carregar dados do pipeline:', error);
      toast({
        title: "Erro",
        description: "Erro ao carregar dados do pipeline",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const loadNotifications = async () => {
    if (!userProfile?.id) return;

    try {
      const { data, error } = await supabase
        .from('vendor_notifications')
        .select('*')
        .eq('vendor_id', userProfile.id)
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) throw error;
      setNotifications(data || []);
    } catch (error) {
      console.error('Erro ao carregar notificações:', error);
    }
  };

  const markNotificationAsRead = async (notificationId: string) => {
    try {
      const { error } = await supabase
        .from('vendor_notifications')
        .update({ is_read: true })
        .eq('id', notificationId);

      if (error) throw error;

      setNotifications(prev => 
        prev.map(notif => 
          notif.id === notificationId 
            ? { ...notif, is_read: true }
            : notif
        )
      );
    } catch (error) {
      console.error('Erro ao marcar notificação como lida:', error);
    }
  };

  const markAllNotificationsAsRead = async () => {
    try {
      const { error } = await supabase
        .from('vendor_notifications')
        .update({ is_read: true })
        .eq('vendor_id', userProfile?.id)
        .eq('is_read', false);

      if (error) throw error;

      setNotifications(prev => 
        prev.map(notif => ({ ...notif, is_read: true }))
      );

      toast({
        title: "Sucesso",
        description: "Todas as notificações foram marcadas como lidas"
      });
    } catch (error) {
      console.error('Erro ao marcar notificações como lidas:', error);
    }
  };

  const updateLeadStatus = async (leadId: string, newStatus: string) => {
    try {
      const lead = leads.find(l => l.id === leadId);
      
      const { error } = await supabase
        .from('leads')
        .update({ status: newStatus })
        .eq('id', leadId);

      if (error) throw error;

      setLeads(prev => 
        prev.map(lead => 
          lead.id === leadId 
            ? { ...lead, status: newStatus as any }
            : lead
        )
      );

      // Se o status mudou de "encaminhado", marcar notificações como lidas
      if (lead?.status === 'encaminhado' && newStatus !== 'encaminhado' && userProfile) {
        await markLeadNotificationAsRead(leadId, userProfile.id);
      }

      toast({
        title: "Sucesso",
        description: "Status do lead atualizado com sucesso"
      });
    } catch (error) {
      console.error('Erro ao atualizar status:', error);
      toast({
        title: "Erro",
        description: "Erro ao atualizar status do lead",
        variant: "destructive"
      });
    }
  };

  const markLeadNotificationAsRead = async (leadId: string, vendorId: string) => {
    try {
      const { error } = await supabase
        .from('vendor_notifications')
        .update({ is_read: true, updated_at: new Date().toISOString() })
        .eq('lead_id', leadId)
        .eq('vendor_id', vendorId)
        .eq('is_read', false);
      
      if (error) throw error;
      
      // Recarregar notificações
      loadNotifications();
    } catch (error) {
      console.error('Erro ao marcar notificação como lida:', error);
    }
  };

  const getLeadActivities = (leadId: string) => {
    return activities.filter(activity => activity.lead_id === leadId);
  };

  const handleQualifyLead = (lead: Lead) => {
    setLeadToQualify(lead);
    setQualificationDialogOpen(true);
  };

  const handleSaveQualification = async (updates: Partial<Lead>) => {
    try {
      if (!leadToQualify) {
        console.error('Pipeline: No lead to qualify');
        return;
      }
      
      console.log('=== PIPELINE: INÍCIO DO SALVAMENTO ===');
      console.log('Pipeline: Lead ID:', leadToQualify.id);
      console.log('Pipeline: Updates received:', updates);
      
      // Sanitizar updates para remover campos inválidos
      const { sanitizeLeadUpdates } = await import('@/lib/utils');
      const sanitizedUpdates = sanitizeLeadUpdates(updates);
      
      console.log('Pipeline: Sanitized updates:', sanitizedUpdates);
      console.log('Pipeline: Calling Supabase update...');
      
      const { error } = await supabase
        .from('leads')
        .update(sanitizedUpdates)
        .eq('id', leadToQualify.id);

      console.log('Pipeline: Supabase response error:', error);

      if (error) {
        console.error('Pipeline: Supabase error details:', error);
        throw error;
      }

      console.log('Pipeline: Update successful, updating local state');
      
      // Atualizar estado local
      setLeads(prev => {
        const updatedLeads = prev.map(lead => 
          lead.id === leadToQualify.id ? { ...lead, ...updates } : lead
        );
        console.log('Pipeline: Local state updated');
        return updatedLeads;
      });

      // Se o status mudou de 'encaminhado', marcar notificações como lidas
      if (leadToQualify?.status === 'encaminhado' && updates.status !== 'encaminhado' && userProfile?.id) {
        console.log('Pipeline: Marking notification as read');
        await markLeadNotificationAsRead(leadToQualify.id, userProfile.id);
      }

      console.log('Pipeline: Closing dialogs');
      setQualificationDialogOpen(false);
      setLeadToQualify(null);
      
      console.log('=== PIPELINE: FIM DO SALVAMENTO ===');
      
      toast({
        title: "Sucesso",
        description: "Qualificação do lead atualizada com sucesso"
      });
    } catch (error: any) {
      console.error('=== PIPELINE: ERRO NO SALVAMENTO ===');
      console.error('Pipeline error:', error);
      console.error('Pipeline error message:', error?.message);
      console.error('Pipeline error details:', error?.details);
      console.error('Pipeline error hint:', error?.hint);
      toast({
        title: "Erro",
        description: `Erro ao salvar qualificação: ${error?.message || 'Erro desconhecido'}`,
        variant: "destructive"
      });
    }
  };

  const handleAssignSpecialist = async (leadId: string, specialistId: string, briefing: string) => {
    try {
      // Buscar nome do especialista
      const { data: specialist, error: specialistError } = await supabase
        .from('user_profiles')
        .select('full_name')
        .eq('id', specialistId)
        .single();

      if (specialistError) throw specialistError;

      // Atualizar lead com novo especialista
      const { error } = await supabase
        .from('leads')
        .update({ 
          assigned_specialist_id: specialistId,
          assigned_specialist_name: specialist.full_name
        })
        .eq('id', leadId);

      if (error) throw error;

      // Atualizar estado local
      setLeads(prev => 
        prev.map(lead => 
          lead.id === leadId 
            ? { 
                ...lead, 
                assigned_specialist_id: specialistId, 
                assigned_specialist_name: specialist.full_name 
              }
            : lead
        )
      );

      setAssignmentDialogOpen(false);
      setLeadForAssignment(null);

      toast({
        title: "Sucesso",
        description: "Vendedor atribuído com sucesso"
      });
    } catch (error) {
      console.error('Erro ao atribuir especialista:', error);
      toast({
        title: "Erro",
        description: "Erro ao atribuir vendedor",
        variant: "destructive"
      });
    }
  };

  const handleDeleteLead = async (lead: Lead) => {
    const confirmMessage = `Tem certeza que deseja remover o lead "${lead.client_name}" do pipeline?\n\nEsta ação não pode ser desfeita.`;
    
    if (!confirm(confirmMessage)) {
      return;
    }

    try {
      const { error } = await supabase
        .from('leads')
        .delete()
        .eq('id', lead.id);

      if (error) throw error;

      // Atualizar estado local
      setLeads(prev => prev.filter(l => l.id !== lead.id));

      toast({
        title: "Sucesso",
        description: "Lead removido do pipeline com sucesso"
      });
    } catch (error) {
      console.error('Erro ao remover lead:', error);
      toast({
        title: "Erro",
        description: "Erro ao remover lead do pipeline",
        variant: "destructive"
      });
    }
  };

  const unreadNotifications = notifications.filter(n => !n.is_read).length;

  const statusLabels = {
    encaminhado: 'Encaminhado',
    contatado: 'Contatado',
    contato_sem_sucesso: 'Contato sem sucesso',
    'em_atendimento': 'Em atendimento',
    respondeu: 'Respondeu',
    qualificado: 'Qualificado',
    negociando: 'Negociando',
    orçando: 'Orçando',
    pedido_fechado: 'Pedido Fechado',
    perdido: 'Perdido'
  };

  const statusColors = {
    encaminhado: 'bg-purple-500',
    contatado: 'bg-blue-500',
    contato_sem_sucesso: 'bg-orange-500',
    'em_atendimento': 'bg-orange-500',
    respondeu: 'bg-yellow-500',
    qualificado: 'bg-green-500',
    negociando: 'bg-indigo-500',
    orçando: 'bg-cyan-500',
    pedido_fechado: 'bg-emerald-600',
    perdido: 'bg-red-500'
  };

  if (loading) {
    return (
      <div className="p-6">
        <Card>
          <CardContent className="p-6 text-center">
            <p className="text-muted-foreground">Carregando pipeline...</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Pipeline de Vendas</h1>
          <p className="text-muted-foreground">
            Leads encaminhados pelos SDRs e em processo comercial
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant={unreadNotifications > 0 ? "destructive" : "secondary"}>
            <Bell className="h-4 w-4 mr-1" />
            {unreadNotifications} novas
          </Badge>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="leads">
            Leads Pipeline ({getFilteredLeadsForTab('leads').length})
          </TabsTrigger>
          <TabsTrigger value="orcando">
            Orçando ({orcandoLeads.length})
          </TabsTrigger>
          <TabsTrigger value="pedido_fechado">
            Pedido Fechado ({pedidoFechadoLeads.length})
          </TabsTrigger>
          <TabsTrigger value="perdidos">
            Perdidos ({perdidosLeads.length})
          </TabsTrigger>
          <TabsTrigger value="notifications">
            Notificações ({unreadNotifications})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="leads" className="space-y-6">
          {/* Banner de notificações não lidas */}
          {unreadNotifications > 0 && (
            <Card className="border-orange-200 bg-orange-50">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 bg-orange-500 rounded-full animate-pulse" />
                    <span className="font-medium text-orange-800">
                      {unreadNotifications === 1 
                        ? 'Você tem 1 novo lead encaminhado!' 
                        : `Você tem ${unreadNotifications} novos leads encaminhados!`
                      }
                    </span>
                  </div>
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => setActiveTab('notifications')}
                    className="border-orange-300 text-orange-700 hover:bg-orange-100"
                  >
                    Ver Notificações
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}


          {/* Filtros */}
          <Card>
            <CardContent className="p-4">
              <div className="flex flex-col md:flex-row gap-4">
                <div className="flex-1">
                  <Input
                    placeholder="Buscar por cliente, contato ou código..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full"
                  />
                </div>
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="w-[180px]">
                    <SelectValue placeholder="Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos os status</SelectItem> 
                    <SelectItem value="encaminhado">Encaminhado</SelectItem>
                    <SelectItem value="contatado">Contatado</SelectItem>
                    <SelectItem value="contato_sem_sucesso">Contato sem sucesso</SelectItem>
                    <SelectItem value="em_atendimento">Em atendimento</SelectItem>
                    <SelectItem value="respondeu">Respondeu</SelectItem>
                    <SelectItem value="qualificado">Qualificado</SelectItem>
                    <SelectItem value="negociando">Negociando</SelectItem>
                    <SelectItem value="perdido">Perdido</SelectItem>
                  </SelectContent>
                </Select>
                <Select value={selectedSDR} onValueChange={setSelectedSDR}>
                  <SelectTrigger className="w-[150px]">
                    <SelectValue placeholder="SDR" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos SDRs</SelectItem>
                    {uniqueSDRs.map(sdr => (
                      <SelectItem key={sdr} value={sdr}>{sdr}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Select value={selectedVendor} onValueChange={setSelectedVendor}>
                  <SelectTrigger className="w-[150px]">
                    <SelectValue placeholder="Vendedor" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos Vendedores</SelectItem>
                    {uniqueVendors.map(vendor => (
                      <SelectItem key={vendor} value={vendor}>{vendor}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          {/* Tabela de Leads */}
          <Card>
            <CardHeader>
              <CardTitle>Leads do Pipeline</CardTitle>
            </CardHeader>
            <CardContent>
              {isMobile ? (
                <PipelineTableMobile
                  leads={filteredLeads}
                  statusColors={statusColors}
                  statusLabels={statusLabels}
                  onQualify={handleQualifyLead}
                  onHistory={(lead) => {
                    setHistoryLead(lead);
                    setHistoryDialogOpen(true);
                  }}
                  onUpdateStatus={(lead) => {
                    setLeadForStatusUpdate(lead);
                    setStatusUpdateDialogOpen(true);
                  }}
                  onAssignSpecialist={(lead) => {
                    setLeadForAssignment(lead);
                    setAssignmentDialogOpen(true);
                  }}
                  onDeleteLead={userProfile?.role === 'admin' ? (leadId) => {
                    const lead = filteredLeads.find(l => l.id === leadId);
                    if (lead) handleDeleteLead(lead);
                  } : undefined}
                  isAdmin={userProfile?.role === 'admin'}
                />
              ) : (
                <>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Cliente</TableHead>
                        <TableHead>UF/Cidade</TableHead>
                        <TableHead>Contato</TableHead>
                        <TableHead>Vendedor</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Qualificação</TableHead>
                        <TableHead>Tempo de Atendimento</TableHead>
                        <TableHead>Encaminhado em</TableHead>
                        <TableHead>Ações</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredLeads.map((lead) => (
                        <TableRow key={lead.id}>
...
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                  {filteredLeads.length === 0 && (
                    <div className="text-center py-8">
                      <p className="text-muted-foreground">Nenhum lead encontrado no pipeline</p>
                    </div>
                  )}
                </>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="perdidos" className="space-y-6">
          {/* Filtros para Perdidos */}
          <Card>
            <CardContent className="p-4">
              <div className="flex flex-col md:flex-row gap-4">
                <div className="flex-1">
                  <Input
                    placeholder="Buscar por cliente, contato ou código..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full"
                  />
                </div>
                <Select value={selectedSDR} onValueChange={setSelectedSDR}>
                  <SelectTrigger className="w-[150px]">
                    <SelectValue placeholder="SDR" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos SDRs</SelectItem>
                    {uniqueSDRs.map(sdr => (
                      <SelectItem key={sdr} value={sdr}>{sdr}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Select value={selectedVendor} onValueChange={setSelectedVendor}>
                  <SelectTrigger className="w-[150px]">
                    <SelectValue placeholder="Vendedor" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos Vendedores</SelectItem>
                    {uniqueVendors.map(vendor => (
                      <SelectItem key={vendor} value={vendor}>{vendor}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          {/* Tabela de Leads Perdidos */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <AlertCircle className="h-5 w-5 text-red-500" />
                Leads Perdidos
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Cliente</TableHead>
                    <TableHead>UF/Cidade</TableHead>
                    <TableHead>Contato</TableHead>
                    <TableHead>Vendedor</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Qualificação</TableHead>
                    <TableHead>Tempo de Atendimento</TableHead>
                    <TableHead>Encaminhado em</TableHead>
                    <TableHead>Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {perdidosLeads.map((lead) => (
                    <TableRow key={lead.id}>
                      <TableCell>
                        <div>
                          <p className="font-medium">{lead.client_name}</p>
                          <p className="text-sm text-muted-foreground">{lead.client_code}</p>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="text-sm">
                          {lead.cidade && lead.uf ? `${lead.cidade}/${lead.uf}` : '—'}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div>
                          <p className="font-medium">{lead.contact_name || '—'}</p>
                          <p className="text-sm text-muted-foreground">{lead.contact_phone || '—'}</p>
                          <p className="text-sm text-muted-foreground">{lead.contact_email || '—'}</p>
                        </div>
                      </TableCell>
                      <TableCell>
                        <p className="font-medium">{lead.assigned_specialist_name || '—'}</p>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <div className="w-2 h-2 rounded-full bg-red-500" />
                          Perdido
                        </div>
                      </TableCell>
                      <TableCell>
                        <div 
                          className="flex flex-col gap-1 cursor-pointer hover:bg-muted/50 p-2 rounded transition-colors"
                          onClick={() => {
                            setLeadForQualificationPreview(lead);
                            setQualificationPreviewOpen(true);
                          }}
                          title="Clique para ver detalhes da qualificação"
                        >
                          <Badge variant="default" className="bg-green-500">
                            ✅ Qualificado {lead.qualification_score && lead.qualification_score > 0 ? `(${lead.qualification_score}/5)` : ''}
                          </Badge>
                        </div>
                      </TableCell>
                      <TableCell>
                        <PipelineLeadTimeIndicator lead={lead} />
                      </TableCell>
                      <TableCell>
                        {lead.forwarded_at && format(new Date(lead.forwarded_at), 'dd/MM/yyyy HH:mm', { locale: ptBR })}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              setHistoryLead(lead);
                              setHistoryDialogOpen(true);
                            }}
                            title="Ver histórico completo"
                          >
                            <Clock className="h-3 w-3" />
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              setLeadForStatusUpdate(lead);
                              setStatusUpdateDialogOpen(true);
                            }}
                            title="Atualizar status e adicionar comentário"
                            className="gap-1"
                          >
                            <MessageSquare className="h-3 w-3" />
                            Status
                          </Button>
                          {userProfile?.role === 'admin' && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => {
                                setLeadForAssignment(lead);
                                setAssignmentDialogOpen(true);
                              }}
                              title="Alterar vendedor"
                              className="gap-1"
                            >
                              <Users className="h-3 w-3" />
                              Vendedor
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              {perdidosLeads.length === 0 && (
                <div className="text-center py-8">
                  <p className="text-muted-foreground">Nenhum lead perdido encontrado</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="notifications" className="space-y-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Notificações</CardTitle>
              {unreadNotifications > 0 && (
                <Button onClick={markAllNotificationsAsRead} variant="outline" size="sm">
                  Marcar todas como lidas
                </Button>
              )}
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {notifications.map((notification) => (
                  <div
                    key={notification.id}
                    className={`p-4 rounded-lg border ${
                      notification.is_read ? 'bg-muted/50' : 'bg-primary/5 border-primary/20'
                    }`}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <Bell className="h-4 w-4 text-primary" />
                          <span className="font-medium">{notification.message}</span>
                          {!notification.is_read && (
                            <Badge variant="default" className="text-xs">Nova</Badge>
                          )}
                        </div>
                        <p className="text-sm text-muted-foreground">
                          {format(new Date(notification.created_at), 'dd/MM/yyyy HH:mm', { locale: ptBR })}
                        </p>
                      </div>
                      {!notification.is_read && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => markNotificationAsRead(notification.id)}
                        >
                          Marcar como lida
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
                {notifications.length === 0 && (
                  <div className="text-center py-8">
                    <p className="text-muted-foreground">Nenhuma notificação encontrada</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="orcando" className="space-y-6">

          {/* Filtros para Orçando */}
          <Card>
            <CardContent className="p-4">
              <div className="flex flex-col md:flex-row gap-4">
                <div className="flex-1">
                  <Input
                    placeholder="Buscar por cliente, contato ou código..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full"
                  />
                </div>
                <Select value={selectedSDR} onValueChange={setSelectedSDR}>
                  <SelectTrigger className="w-[150px]">
                    <SelectValue placeholder="SDR" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos SDRs</SelectItem>
                    {uniqueSDRs.map(sdr => (
                      <SelectItem key={sdr} value={sdr}>{sdr}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Select value={selectedVendor} onValueChange={setSelectedVendor}>
                  <SelectTrigger className="w-[150px]">
                    <SelectValue placeholder="Vendedor" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos Vendedores</SelectItem>
                    {uniqueVendors.map(vendor => (
                      <SelectItem key={vendor} value={vendor}>{vendor}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          {/* Tabela de Leads Orçando */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Target className="h-5 w-5 text-cyan-500" />
                Leads em Orçamento
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Cliente</TableHead>
                    <TableHead>UF/Cidade</TableHead>
                    <TableHead>Contato</TableHead>
                    <TableHead>Vendedor</TableHead>
                    <TableHead>Nº Orçamento</TableHead>
                    <TableHead>Qualificação</TableHead>
                    <TableHead>Tempo de Atendimento</TableHead>
                    <TableHead>Encaminhado em</TableHead>
                    <TableHead>Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {orcandoLeads.map((lead) => (
                    <TableRow key={lead.id}>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <div>
                            <p className="font-medium">{lead.client_name}</p>
                            <p className="text-sm text-muted-foreground">{lead.client_code}</p>
                          </div>
                          {lead.budget_number && (
                            <Target className="h-4 w-4 text-cyan-500" />
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="text-sm">
                          {lead.cidade && lead.uf ? `${lead.cidade}/${lead.uf}` : '—'}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div>
                          <p className="font-medium">{lead.contact_name || '—'}</p>
                          <p className="text-sm text-muted-foreground">{lead.contact_phone || '—'}</p>
                          <p className="text-sm text-muted-foreground">{lead.contact_email || '—'}</p>
                        </div>
                      </TableCell>
                      <TableCell>
                        <p className="font-medium">{lead.assigned_specialist_name || '—'}</p>
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-wrap gap-1">
                          {lead.budget_number ? (
                            (() => {
                              try {
                                let numbers: string[] = [];
                                if (lead.budget_number.startsWith('[')) {
                                  numbers = JSON.parse(lead.budget_number);
                                } else {
                                  numbers = lead.budget_number.split(',').filter(Boolean);
                                }
                                return numbers.map((num, index) => (
                                  <Badge key={index} variant="outline" className="bg-cyan-50 text-cyan-700 border-cyan-200">
                                    {num.trim()}
                                  </Badge>
                                ));
                              } catch {
                                return (
                                  <Badge variant="outline" className="bg-cyan-50 text-cyan-700 border-cyan-200">
                                    {lead.budget_number}
                                  </Badge>
                                );
                              }
                            })()
                          ) : (
                            <span className="text-muted-foreground">—</span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div 
                          className="flex flex-col gap-1 cursor-pointer hover:bg-muted/50 p-2 rounded transition-colors"
                          onClick={() => {
                            setLeadForQualificationPreview(lead);
                            setQualificationPreviewOpen(true);
                          }}
                          title="Clique para ver detalhes da qualificação"
                        >
                          <Badge variant="default" className="bg-green-500">
                            ✅ Qualificado {lead.qualification_score && lead.qualification_score > 0 ? `(${lead.qualification_score}/5)` : ''}
                          </Badge>
                        </div>
                      </TableCell>
                      <TableCell>
                        <PipelineLeadTimeIndicator lead={lead} />
                      </TableCell>
                      <TableCell>
                        {lead.forwarded_at && format(new Date(lead.forwarded_at), 'dd/MM/yyyy HH:mm', { locale: ptBR })}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              setHistoryLead(lead);
                              setHistoryDialogOpen(true);
                            }}
                            title="Ver histórico completo"
                          >
                            <Clock className="h-3 w-3" />
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              setLeadForStatusUpdate(lead);
                              setStatusUpdateDialogOpen(true);
                            }}
                            title="Atualizar status e adicionar comentário"
                            className="gap-1"
                          >
                            <MessageSquare className="h-3 w-3" />
                            Status
                          </Button>
                          {userProfile?.role === 'admin' && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => {
                                setLeadForAssignment(lead);
                                setAssignmentDialogOpen(true);
                              }}
                              title="Alterar vendedor"
                              className="gap-1"
                            >
                              <Users className="h-3 w-3" />
                              Vendedor
                            </Button>
                          )}
                          {userProfile?.role === 'admin' && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleDeleteLead(lead)}
                              title="Remover do pipeline"
                              className="gap-1 text-red-600 hover:text-red-800 hover:bg-red-50 border-red-200"
                            >
                              <Trash2 className="h-3 w-3" />
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              {orcandoLeads.length === 0 && (
                <div className="text-center py-8">
                  <p className="text-muted-foreground">Nenhum lead em orçamento encontrado</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="pedido_fechado" className="space-y-6">

          {/* Filtros para Pedido Fechado */}
          <Card>
            <CardContent className="p-4">
              <div className="flex flex-col md:flex-row gap-4">
                <div className="flex-1">
                  <Input
                    placeholder="Buscar por cliente, contato ou código..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full"
                  />
                </div>
                <Select value={selectedSDR} onValueChange={setSelectedSDR}>
                  <SelectTrigger className="w-[150px]">
                    <SelectValue placeholder="SDR" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos SDRs</SelectItem>
                    {uniqueSDRs.map(sdr => (
                      <SelectItem key={sdr} value={sdr}>{sdr}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Select value={selectedVendor} onValueChange={setSelectedVendor}>
                  <SelectTrigger className="w-[150px]">
                    <SelectValue placeholder="Vendedor" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos Vendedores</SelectItem>
                    {uniqueVendors.map(vendor => (
                      <SelectItem key={vendor} value={vendor}>{vendor}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          {/* Tabela de Pedidos Fechados */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CheckCircle className="h-5 w-5 text-emerald-600" />
                Pedidos Fechados
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Cliente</TableHead>
                    <TableHead>UF/Cidade</TableHead>
                    <TableHead>Contato</TableHead>
                    <TableHead>Vendedor</TableHead>
                    <TableHead>Nº Orçamento</TableHead>
                    <TableHead>Qualificação</TableHead>
                    <TableHead>Tempo de Atendimento</TableHead>
                    <TableHead>Encaminhado em</TableHead>
                    <TableHead>Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {pedidoFechadoLeads.map((lead) => (
                    <TableRow key={lead.id}>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <div>
                            <p className="font-medium">{lead.client_name}</p>
                            <p className="text-sm text-muted-foreground">{lead.client_code}</p>
                          </div>
                          {lead.budget_number && (
                            <Target className="h-4 w-4 text-emerald-600" />
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="text-sm">
                          {lead.cidade && lead.uf ? `${lead.cidade}/${lead.uf}` : '—'}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div>
                          <p className="font-medium">{lead.contact_name || '—'}</p>
                          <p className="text-sm text-muted-foreground">{lead.contact_phone || '—'}</p>
                          <p className="text-sm text-muted-foreground">{lead.contact_email || '—'}</p>
                        </div>
                      </TableCell>
                      <TableCell>
                        <p className="font-medium">{lead.assigned_specialist_name || '—'}</p>
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-wrap gap-1">
                          {lead.budget_number ? (
                            (() => {
                              try {
                                let numbers: string[] = [];
                                if (lead.budget_number.startsWith('[')) {
                                  numbers = JSON.parse(lead.budget_number);
                                } else {
                                  numbers = lead.budget_number.split(',').filter(Boolean);
                                }
                                return numbers.map((num, index) => (
                                  <Badge key={index} variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200">
                                    {num.trim()}
                                  </Badge>
                                ));
                              } catch {
                                return (
                                  <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200">
                                    {lead.budget_number}
                                  </Badge>
                                );
                              }
                            })()
                          ) : (
                            <span className="text-muted-foreground">—</span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div 
                          className="flex flex-col gap-1 cursor-pointer hover:bg-muted/50 p-2 rounded transition-colors"
                          onClick={() => {
                            setLeadForQualificationPreview(lead);
                            setQualificationPreviewOpen(true);
                          }}
                          title="Clique para ver detalhes da qualificação"
                        >
                          <Badge variant="default" className="bg-green-500">
                            ✅ Qualificado {lead.qualification_score && lead.qualification_score > 0 ? `(${lead.qualification_score}/5)` : ''}
                          </Badge>
                        </div>
                      </TableCell>
                      <TableCell>
                        <PipelineLeadTimeIndicator lead={lead} />
                      </TableCell>
                      <TableCell>
                        {lead.forwarded_at && format(new Date(lead.forwarded_at), 'dd/MM/yyyy HH:mm', { locale: ptBR })}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              setHistoryLead(lead);
                              setHistoryDialogOpen(true);
                            }}
                            title="Ver histórico completo"
                          >
                            <Clock className="h-3 w-3" />
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              setLeadForStatusUpdate(lead);
                              setStatusUpdateDialogOpen(true);
                            }}
                            title="Atualizar status e adicionar comentário"
                            className="gap-1"
                          >
                            <MessageSquare className="h-3 w-3" />
                            Status
                          </Button>
                          {userProfile?.role === 'admin' && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => {
                                setLeadForAssignment(lead);
                                setAssignmentDialogOpen(true);
                              }}
                              title="Alterar vendedor"
                              className="gap-1"
                            >
                              <Users className="h-3 w-3" />
                              Vendedor
                            </Button>
                          )}
                          {userProfile?.role === 'admin' && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleDeleteLead(lead)}
                              title="Remover do pipeline"
                              className="gap-1 text-red-600 hover:text-red-800 hover:bg-red-50 border-red-200"
                            >
                              <Trash2 className="h-3 w-3" />
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              {pedidoFechadoLeads.length === 0 && (
                <div className="text-center py-8">
                  <p className="text-muted-foreground">Nenhum pedido fechado encontrado</p>
                </div>
              )}
            </CardContent>
           </Card>
        </TabsContent>

        </Tabs>

      {/* Dialog de Detalhes do Lead */}
      {selectedLead && (
        <AlertDialog open={!!selectedLead} onOpenChange={() => setSelectedLead(null)}>
          <AlertDialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <AlertDialogHeader>
              <AlertDialogTitle>Detalhes do Lead: {selectedLead.client_name}</AlertDialogTitle>
              <AlertDialogDescription>
                Informações completas do lead encaminhado
              </AlertDialogDescription>
            </AlertDialogHeader>
            
            <div className="space-y-6">
              {/* Informações Básicas */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <h3 className="font-medium mb-2">Informações do Cliente</h3>
                  <div className="space-y-2 text-sm">
                    <p><strong>Nome:</strong> {selectedLead.client_name}</p>
                    <p><strong>Código:</strong> {selectedLead.client_code}</p>
                    {selectedLead.contact_name && <p><strong>Contato:</strong> {selectedLead.contact_name}</p>}
                    {selectedLead.contact_phone && <p><strong>Telefone:</strong> {selectedLead.contact_phone}</p>}
                    {selectedLead.contact_email && <p><strong>Email:</strong> {selectedLead.contact_email}</p>}
                    {selectedLead.uf && selectedLead.cidade && (
                      <p><strong>Localização:</strong> {selectedLead.cidade}/{selectedLead.uf}</p>
                    )}
                  </div>
                </div>
                
                <div>
                  <h3 className="font-medium mb-2">Qualificação</h3>
                  <div className="space-y-2 text-sm">
                    <p><strong>Status:</strong> {statusLabels[selectedLead.status as keyof typeof statusLabels]}</p>
                    <p><strong>Qualificado:</strong> {selectedLead.is_qualified ? 'Sim' : 'Não'}</p>
                    {selectedLead.qualification_score && (
                      <p><strong>Score:</strong> {selectedLead.qualification_score}/5</p>
                    )}
                    <p><strong>SDR:</strong> {selectedLead.sdr_name}</p>
                    {selectedLead.business_type && <p><strong>Tipo de Negócio:</strong> {selectedLead.business_type}</p>}
                    {selectedLead.product_interest && <p><strong>Produto de Interesse:</strong> {selectedLead.product_interest}</p>}
                  </div>
                </div>
              </div>

              {/* Histórico de Atividades */}
              <div>
                <h3 className="font-medium mb-2">Histórico de Atividades</h3>
                <div className="space-y-2">
                  {getLeadActivities(selectedLead.id).map((activity) => (
                    <div key={activity.id} className="p-3 bg-muted/50 rounded-lg">
                      <div className="flex justify-between items-start">
                        <div>
                          <p className="font-medium">{activity.description}</p>
                          {activity.result && <p className="text-sm text-muted-foreground mt-1">{activity.result}</p>}
                        </div>
                        <p className="text-xs text-muted-foreground">
                          {format(new Date(activity.created_at), 'dd/MM/yyyy HH:mm', { locale: ptBR })}
                        </p>
                      </div>
                    </div>
                  ))}
                  {getLeadActivities(selectedLead.id).length === 0 && (
                    <p className="text-muted-foreground text-sm">Nenhuma atividade registrada</p>
                  )}
                </div>
              </div>
            </div>

            <AlertDialogFooter>
              <AlertDialogCancel>Fechar</AlertDialogCancel>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      )}
      <LeadQualificationDialog
        open={qualificationDialogOpen}
        onClose={() => {
          setQualificationDialogOpen(false);
          setLeadToQualify(null);
        }}
        lead={leadToQualify}
        onSave={handleSaveQualification}
      />

      {/* Dialog de preview de qualificação */}
      <LeadQualificationPreview
        open={qualificationPreviewOpen}
        onClose={() => {
          setQualificationPreviewOpen(false);
          setLeadForQualificationPreview(null);
        }}
        lead={leadForQualificationPreview}
      />

      {/* Dialog de histórico */}
      <LeadHistoryDialog
        open={historyDialogOpen}
        onClose={() => {
          setHistoryDialogOpen(false);
          setHistoryLead(null);
        }}
        lead={historyLead}
      />

      {/* Dialog de atualização de status */}
      <LeadStatusUpdateDialog
        open={statusUpdateDialogOpen}
        onClose={() => {
          setStatusUpdateDialogOpen(false);
          setLeadForStatusUpdate(null);
        }}
        lead={leadForStatusUpdate}
        onUpdate={() => {
          loadPipelineData();
          loadNotifications();
        }}
      />

      {/* Dialog de atribuição de especialista */}
      <SpecialistAssignmentDialog
        open={assignmentDialogOpen}
        onClose={() => {
          setAssignmentDialogOpen(false);
          setLeadForAssignment(null);
        }}
        lead={leadForAssignment}
        onAssign={handleAssignSpecialist}
      />
    </div>
  );
};