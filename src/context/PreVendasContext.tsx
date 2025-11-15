import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { getQualificationDetails } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';

export interface Lead {
  id: string;
  client_code: string;
  client_name: string;
  contact_name?: string;
  contact_phone?: string;
  contact_email?: string;
  uf?: string;
  cidade?: string;
  status: string;
  source?: string;
  notes?: string;
  sdr_id: string;
  sdr_name: string;
  assigned_at: string;
  last_contact_at?: string;
  next_contact_at?: string;
  converted_at?: string;
  created_at: string;
  updated_at: string;
  business_type?: string;
  product_interest?: string;
  estimated_volume?: string;
  purchase_frequency?: string;
  current_pain?: string;
  opportunity_identified?: string;
  entry_channel?: string;
  qualification_criteria_met?: string[];
  qualification_score?: number;
  is_qualified?: boolean;
  forwarded_to_specialist?: boolean;
  forwarded_at?: string;
  assigned_specialist_id?: string;
  assigned_specialist_name?: string;
  pipeline_status?: string; // Status separado para o pipeline de vendas
  business_type_custom?: string;
  product_interest_custom?: string;
  purchase_frequency_custom?: string;
  custom_entry_channel?: string;
  conversation_started?: boolean;
  contact_attempts?: number;
  contacted_count?: number;
  unsuccessful_contacts_count?: number;
  budget_number?: string;
}

export interface FollowUp {
  id: string;
  lead_id?: string;
  budget_number?: string;
  client_code?: string;
  client_name?: string;
  type: 'reforcar_proposta' | 'visita_tecnica' | 'enviar_nova_proposta' | 'enviar_material_apoio' | 'confirmar_recebimento' | 'reuniao_apresentacao' | 'solicitar_documentacao' | 'agendar_visita_tecnica' | 'negociar_condicoes' | 'encaminhar_aprovacao' | 'follow_up_pos_venda' | 'reativar_negociacao' | 'acompanhar_instalacao' | 'pesquisa_satisfacao' | 'upsell_cross_sell' | 'renovacao_contrato' | 'suporte_tecnico' | 'treinamento_cliente' | 'analise_performance' | 'planejamento_futuro' | 'outro';
  custom_type_text?: string;
  subject: string;
  scheduled_date: string;
  user_name: string;
  user_id: string;
  sdr_name?: string;
  sdr_id?: string;
  is_completed: boolean;
  show_today: boolean;
  created_at: string;
  updated_at: string;
  completed_at?: string;
  completion_notes?: string;
}

export interface LeadActivity {
  id: string;
  lead_id: string;
  activity_type: 'contato_inicial' | 'resposta_recebida' | 'qualificacao' | 'encaminhamento' | 'follow_up' | 'nota';
  description: string;
  result?: string;
  next_action?: string;
  next_contact_date?: string;
  conversation_started?: boolean | null;
  sdr_id: string;
  sdr_name: string;
  created_at: string;
}

export interface SDRGoals {
  id: string;
  sdr_id: string;
  month_year: string;
  daily_contacts_goal: number;
  conversion_goal_percent: number;
  qualified_leads_goal: number;
  created_at: string;
  updated_at: string;
}

export interface AdminGoals {
  id?: string;
  month_year: string;
  daily_contacts_goal: number;
  monthly_contacts_goal: number;
  qualified_leads_goal: number;
  forwarded_leads_goal: number;
  conversion_goal_percent: number;
}

export interface DailyStats {
  contactsMade: number;
  responsesReceived: number;
  qualifiedLeads: number;
  forwardedLeads: number;
  conversionRate: number;
}

interface PreVendasContextType {
  // Estado
  leads: Lead[];
  activities: LeadActivity[];
  followUps: FollowUp[];
  goals: SDRGoals | null;
  adminGoals: AdminGoals | null;
  dailyStats: DailyStats;
  loading: boolean;
  selectedDate: Date;
  
  // Ações
  setSelectedDate: (date: Date) => void;
  loadLeads: (filters?: any) => Promise<void>;
  loadActivities: (leadId?: string, forDate?: Date) => Promise<void>;
  loadFollowUps: () => Promise<void>;
  loadGoals: () => Promise<void>;
  loadAdminGoals: () => Promise<void>;
  calculateDailyStats: (date: Date) => Promise<DailyStats>;
  
  // CRUD Leads
  createLead: (lead: Partial<Lead>) => Promise<Lead | null>;
  updateLead: (id: string, updates: Partial<Lead>) => Promise<void>;
  deleteLead: (id: string) => Promise<void>;
  
  // CRUD Atividades
  createActivity: (activity: Partial<LeadActivity>) => Promise<void>;
  
  // CRUD Follow-ups
  createFollowUp: (followUp: Partial<FollowUp>) => Promise<void>;
  markFollowUpAsCompleted: (id: string, notes?: string) => Promise<void>;
  
  // CRUD Metas
  updateGoals: (goals: Partial<SDRGoals>) => Promise<void>;
}

const PreVendasContext = createContext<PreVendasContextType | undefined>(undefined);

export const PreVendasProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [activities, setActivities] = useState<LeadActivity[]>([]);
  const [followUps, setFollowUps] = useState<FollowUp[]>([]);
  const [goals, setGoals] = useState<SDRGoals | null>(null);
  const [adminGoals, setAdminGoals] = useState<AdminGoals | null>(null);
  const [dailyStats, setDailyStats] = useState<DailyStats>({
    contactsMade: 0,
    responsesReceived: 0,
    qualifiedLeads: 0,
    forwardedLeads: 0,
    conversionRate: 0
  });
  const [loading, setLoading] = useState(false);
  const [selectedDate, setSelectedDate] = useState(new Date());
  
  const { toast } = useToast();

  const loadLeads = async (filters?: any) => {
    setLoading(true);
    try {
      let query = (supabase as any)
        .from('leads')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (filters?.status) {
        query = query.eq('status', filters.status);
      }
      
      if (filters?.sdr_id) {
        query = query.eq('sdr_id', filters.sdr_id);
      }
      
      const { data, error } = await query;

      if (error) {
        console.error('Error loading leads:', error);
        toast({
          title: "Erro",
          description: "Erro ao carregar leads",
          variant: "destructive"
        });
        return;
      }

      console.log('Leads loaded from database:', data);
      
      // Correct qualification data for existing leads
      const correctedLeads = (data || []).map(lead => {
        const qualification = getQualificationDetails(lead);
        return {
          ...lead,
          qualification_score: qualification.qualificationScore,
          is_qualified: qualification.isQualified,
          qualification_criteria_met: qualification.qualifiedCriteria
        };
      });
      
      setLeads(correctedLeads as any);
    } catch (error) {
      console.error('Erro ao carregar leads:', error);
      toast({
        title: "Erro",
        description: "Erro ao carregar leads",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const loadActivities = async (leadId?: string, forDate?: Date) => {
    try {
      const targetDate = forDate || selectedDate;
      const startOfMonth = new Date(targetDate.getFullYear(), targetDate.getMonth(), 1);
      const endOfMonth = new Date(targetDate.getFullYear(), targetDate.getMonth() + 1, 0, 23, 59, 59, 999);
      
      let query = supabase
        .from('lead_activities')
        .select('*')
        .gte('created_at', startOfMonth.toISOString())
        .lte('created_at', endOfMonth.toISOString())
        .order('created_at', { ascending: false });
      
      if (leadId) {
        query = query.eq('lead_id', leadId);
      }
      
      // Buscar todas as atividades do mês usando paginação
      let allActivities: LeadActivity[] = [];
      let from = 0;
      const pageSize = 1000;
      
      while (true) {
        const paginatedQuery = query.range(from, from + pageSize - 1);
        const { data, error } = await paginatedQuery;
        
        if (error) throw error;
        
        if (!data || data.length === 0) break;
        
        allActivities = [...allActivities, ...data as LeadActivity[]];
        
        // Se recebemos menos que o tamanho da página, não há mais dados
        if (data.length < pageSize) break;
        
        from += pageSize;
      }
      
      console.log(`Loaded ${allActivities.length} activities for ${targetDate.getMonth() + 1}/${targetDate.getFullYear()}`);
      setActivities(allActivities);
    } catch (error) {
      console.error('Erro ao carregar atividades:', error);
    }
  };

  const loadFollowUps = async () => {
    try {
      let query = supabase
        .from('budget_followups')
        .select('*')
        .order('created_at', { ascending: false });
      
      const { data, error } = await query;
      
      if (error) throw error;
      setFollowUps(data as any || []);
    } catch (error) {
      console.error('Erro ao carregar follow-ups:', error);
    }
  };

  const loadGoals = async () => {
    try {
      const currentMonthYear = new Date().toISOString().slice(0, 7); // YYYY-MM
      
      const { data, error } = await (supabase as any)
        .from('sdr_goals')
        .select('*')
        .eq('month_year', currentMonthYear)
        .maybeSingle();
      
      if (error && error.code !== 'PGRST116') throw error;
      
      setGoals(data as any);
    } catch (error) {
      console.error('Erro ao carregar metas:', error);
    }
  };

  const loadAdminGoals = async () => {
    try {
      const currentMonth = new Date().toISOString().slice(0, 7);
      const { data, error } = await supabase
        .from('admin_goals')
        .select('*')
        .eq('month_year', currentMonth)
        .maybeSingle();

      if (error && error.code !== 'PGRST116') throw error;
      setAdminGoals(data);
    } catch (error) {
      console.error('Erro ao carregar metas administrativas:', error);
    }
  };

  const calculateDailyStats = async (date: Date): Promise<DailyStats> => {
    try {
      const startOfDay = new Date(date);
      startOfDay.setHours(0, 0, 0, 0);
      
      const endOfDay = new Date(date);
      endOfDay.setHours(23, 59, 59, 999);
      
      // Buscar atividades do dia
      let query = supabase
        .from('lead_activities')
        .select('*')
        .gte('created_at', startOfDay.toISOString())
        .lte('created_at', endOfDay.toISOString());
      
      const { data: activities, error } = await query;
      
      if (error) throw error;
      
      const stats = {
        contactsMade: new Set(activities?.filter(a => a.activity_type === 'contato_inicial').map(a => a.lead_id)).size || 0,
        responsesReceived: activities?.filter(a => a.activity_type === 'resposta_recebida').length || 0,
        qualifiedLeads: activities?.filter(a => a.activity_type === 'qualificacao').length || 0,
        forwardedLeads: activities?.filter(a => a.activity_type === 'encaminhamento').length || 0,
        conversionRate: 0
      };
      
      // Calcular taxa de conversão (encaminhados / contatos)
      if (stats.contactsMade > 0) {
        stats.conversionRate = (stats.forwardedLeads / stats.contactsMade) * 100;
      }
      
      setDailyStats(stats);
      return stats;
    } catch (error) {
      console.error('Erro ao calcular estatísticas:', error);
      return dailyStats;
    }
  };

  const createLead = async (leadData: Partial<Lead>): Promise<Lead | null> => {
    console.log('CreateLead: Iniciando criação de lead', { leadData });
    
    try {
      // Mapear entry_channel UI para valores aceitos pelo banco
      const mapEntryChannelToDatabase = (uiValue: string): string => {
        const mapping: Record<string, string> = {
          'Google': 'site',
          'LinkedIn': 'redes_sociais',
          'Instagram': 'redes_sociais',
          'Facebook': 'redes_sociais',
          'E-mail': 'prospeccao',
          'Telefone': 'prospeccao',
          'WhatsApp': 'prospeccao',
          'Feira/Evento': 'marketing',
          'Indicação': 'indicacao',
          'Outro': 'outros'
        };
        
        return mapping[uiValue] || uiValue; // Retorna o valor original se não encontrar mapeamento
      };

      // Gerar client_code melhorado
      const clientName = leadData.client_name || '';
      const timestamp = Date.now().toString().slice(-6);
      const namePrefix = clientName.trim().replace(/\s+/g, '').substring(0, 4).toUpperCase();
      const clientCode = leadData.client_code || `${namePrefix}${timestamp}`;

      console.log('Entry channel original:', leadData.entry_channel);
      const mappedEntryChannel = mapEntryChannelToDatabase(leadData.entry_channel || '');
      console.log('Entry channel mapeado:', mappedEntryChannel);

      const leadToInsert = {
        client_code: clientCode,
        client_name: leadData.client_name || '',
        contact_name: leadData.contact_name || '',
        contact_phone: leadData.contact_phone || '',
        contact_email: leadData.contact_email || '',
        uf: leadData.uf || '',
        cidade: leadData.cidade || '',
        source: leadData.source || '',
        entry_channel: mappedEntryChannel,
        notes: leadData.notes || '',
        sdr_id: leadData.sdr_id || '',
        sdr_name: leadData.sdr_name || 'Sistema',
        status: leadData.status || 'novo'
      };
      
      console.log('CreateLead: Dados a serem inseridos', leadToInsert);
      
      const { data, error } = await supabase
        .from('leads')
        .insert([{...leadToInsert, cliente_nome: leadToInsert.client_name} as any])
        .select()
        .single();
      
      if (error) {
        console.error('CreateLead: Erro do Supabase', error);
        let errorMessage = "Erro ao criar lead";
        
        if (error.message?.includes('check constraint')) {
          errorMessage = "Dados inválidos. Verifique os campos preenchidos.";
        } else if (error.message?.includes('duplicate')) {
          errorMessage = "Cliente já existe no sistema.";
        } else if (error.message?.includes('violates')) {
          errorMessage = "Erro de validação nos dados inseridos.";
        }
        
        toast({
          title: "Erro",
          description: errorMessage,
          variant: "destructive"
        });
        
        throw new Error(errorMessage);
      }
      
      console.log('CreateLead: Lead criado com sucesso', data);
      
      // Recarregar leads e recalcular estatísticas
      await Promise.all([
        loadLeads(),
        calculateDailyStats(selectedDate)
      ]);
      
      toast({
        title: "Sucesso",
        description: "Lead criado com sucesso"
      });
      
      return data as any;
    } catch (error) {
      console.error('Erro ao criar lead:', error);
      
      // Se já é um erro customizado, não mudar a mensagem
      if (error instanceof Error && error.message !== 'Erro ao criar lead') {
        throw error;
      }
      
      toast({
        title: "Erro",
        description: "Erro ao criar lead. Tente novamente.",
        variant: "destructive"
      });
      return null;
    }
  };

  const updateLead = async (id: string, updates: Partial<Lead>) => {
    try {
      console.log('=== CONTEXT: INÍCIO DO UPDATE LEAD ===');
      console.log('Lead ID:', id);
      console.log('Updates originais:', updates);

      // Mapear entry_channel UI para valores aceitos pelo banco
      const mapEntryChannelToDatabase = (uiValue: string): string => {
        const mapping: Record<string, string> = {
          'Google': 'site',
          'LinkedIn': 'redes_sociais',
          'Instagram': 'redes_sociais',
          'Facebook': 'redes_sociais',
          'E-mail': 'prospeccao',
          'Telefone': 'prospeccao',
          'WhatsApp': 'prospeccao',
          'Feira/Evento': 'marketing',
          'Indicação': 'indicacao',
          'Outro': 'outros'
        };
        
        return mapping[uiValue] || uiValue;
      };

      const normalizedUpdates = { ...updates };
      if (normalizedUpdates.entry_channel) {
        console.log('Entry channel original (update):', normalizedUpdates.entry_channel);
        normalizedUpdates.entry_channel = mapEntryChannelToDatabase(normalizedUpdates.entry_channel);
        console.log('Entry channel mapeado (update):', normalizedUpdates.entry_channel);
      }

      // Sanitizar updates para remover campos inválidos
      const { sanitizeLeadUpdates } = await import('@/lib/utils');
      
      // Se a atualização contém dados de qualificação, recomputar o score
      const hasQualificationData = (
        (normalizedUpdates.business_type && (Array.isArray(normalizedUpdates.business_type) ? normalizedUpdates.business_type.length > 0 : normalizedUpdates.business_type.trim())) ||
        (normalizedUpdates.product_interest && (Array.isArray(normalizedUpdates.product_interest) ? normalizedUpdates.product_interest.length > 0 : normalizedUpdates.product_interest.trim())) ||
        (normalizedUpdates.estimated_volume && normalizedUpdates.estimated_volume.trim()) ||
        (normalizedUpdates.purchase_frequency && normalizedUpdates.purchase_frequency.trim()) ||
        (normalizedUpdates.current_pain && normalizedUpdates.current_pain.trim()) ||
        (normalizedUpdates.opportunity_identified && normalizedUpdates.opportunity_identified.trim()) ||
        // Include custom fields that exist
        (normalizedUpdates.business_type_custom && normalizedUpdates.business_type_custom.trim()) ||
        (normalizedUpdates.product_interest_custom && normalizedUpdates.product_interest_custom.trim()) ||
        (normalizedUpdates.purchase_frequency_custom && normalizedUpdates.purchase_frequency_custom.trim()) ||
        // Or if qualification fields are explicitly being set
        normalizedUpdates.qualification_score !== undefined ||
        normalizedUpdates.is_qualified !== undefined ||
        normalizedUpdates.qualification_criteria_met !== undefined
      );

      console.log('Has qualification data:', hasQualificationData);
      console.log('Qualification fields check:', {
        business_type: normalizedUpdates.business_type,
        product_interest: normalizedUpdates.product_interest,
        estimated_volume: normalizedUpdates.estimated_volume,
        purchase_frequency: normalizedUpdates.purchase_frequency,
        current_pain: normalizedUpdates.current_pain,
        opportunity_identified: normalizedUpdates.opportunity_identified
      });
      
      if (hasQualificationData) {
        const { computeQualification } = await import('@/lib/utils');
        const qualification = computeQualification(normalizedUpdates);
        normalizedUpdates.qualification_score = qualification.qualificationScore;
        normalizedUpdates.is_qualified = qualification.isQualified;
        normalizedUpdates.qualification_criteria_met = qualification.qualifiedCriteria;
        
        console.log('Qualification recomputed:', qualification);
      }
      
      const sanitizedUpdates = sanitizeLeadUpdates(normalizedUpdates);
      
      console.log('Updates sanitizados:', sanitizedUpdates);
      
      const { error } = await supabase
        .from('leads')
        .update(sanitizedUpdates)
        .eq('id', id);
      
      console.log('Resposta do Supabase - error:', error);
      
      if (error) {
        console.error('=== CONTEXT: ERRO DO SUPABASE ===');
        console.error('Error details:', error);
        throw error;
      }
      
      // Atualizar o estado local otimisticamente
      setLeads(currentLeads => 
        currentLeads.map(lead => 
          lead.id === id ? { ...lead, ...updates } : lead
        )
      );
      
      await loadLeads();
      
      console.log('=== CONTEXT: UPDATE LEAD SUCESSO ===');
      
      toast({
        title: "Sucesso",
        description: "Lead atualizado com sucesso"
      });
    } catch (error: any) {
      console.error('=== CONTEXT: ERRO NO UPDATE LEAD ===');
      console.error('Erro completo:', error);
      console.error('Mensagem:', error?.message);
      console.error('Detalhes:', error?.details);
      
      toast({
        title: "Erro",
        description: `Erro ao atualizar lead: ${error?.message || 'Erro desconhecido'}`,
        variant: "destructive"
      });
      
      // Re-throw para que o componente que chama possa lidar com o erro
      throw error;
    }
  };

  const deleteLead = async (id: string) => {
    try {
      const { error } = await supabase
        .from('leads')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
      
      await loadLeads();
      toast({
        title: "Sucesso",
        description: "Lead removido com sucesso"
      });
    } catch (error) {
      console.error('Erro ao deletar lead:', error);
      toast({
        title: "Erro",
        description: "Erro ao remover lead",
        variant: "destructive"
      });
    }
  };

  const createActivity = async (activityData: Partial<LeadActivity>) => {
    try {
      // Check for duplicate activities in the last 15 seconds
      const since = new Date(Date.now() - 15000).toISOString();
      const { data: existing } = await supabase
        .from('lead_activities')
        .select('id, created_at')
        .eq('lead_id', activityData.lead_id || '')
        .eq('activity_type', activityData.activity_type || 'contato_inicial')
        .eq('description', activityData.description || '')
        .gte('created_at', since)
        .limit(1);

      if (existing && existing.length > 0) {
        toast({
          title: "Atividade já registrada",
          description: "Esta atividade já foi registrada recentemente",
          variant: "destructive"
        });
        return;
      }

      const { data, error } = await supabase
        .from('lead_activities')
        .insert([{
          lead_id: activityData.lead_id || '',
          activity_type: activityData.activity_type || 'contato_inicial',
          description: activityData.description || '',
          conversation_started: activityData.conversation_started,
          sdr_id: activityData.sdr_id || '',
          sdr_name: activityData.sdr_name || 'Sistema',
          user_id: activityData.sdr_id || ''
        } as any])
        .select()
        .single();
      
      if (error) throw error;

      // Atualizar lead baseado na atividade
      if (activityData.lead_id) {
        const currentLead = leads.find(l => l.id === activityData.lead_id);
        if (currentLead) {
          const leadUpdate: any = {
            last_contact_at: new Date().toISOString()
          };
          
          // Verificar se já existe contato inicial para este lead hoje antes de incrementar
          if (activityData.activity_type === 'contato_inicial') {
            const today = new Date().toISOString().split('T')[0];
            
            // Buscar atividades de contato inicial para este lead hoje
            const { data: todayActivities } = await supabase
              .from('lead_activities')
              .select('id')
              .eq('lead_id', activityData.lead_id)
              .eq('activity_type', 'contato_inicial')
              .gte('created_at', `${today}T00:00:00.000Z`)
              .lt('created_at', `${today}T23:59:59.999Z`);

            // Só incrementar contacted_count se for o PRIMEIRO contato do dia
            if (!todayActivities || todayActivities.length === 0) {
              leadUpdate.contacted_count = (currentLead.contacted_count || 0) + 1;
            }
          }
          
          // Lógica baseada em conversation_started
          if (activityData.conversation_started === false) {
            leadUpdate.contact_attempts = (currentLead.contact_attempts || 0) + 1;
            leadUpdate.status = 'contatado';
          } else if (activityData.conversation_started === true) {
            leadUpdate.conversation_started = true;
            leadUpdate.status = 'respondeu';
          }

          // Se foi uma qualificação, marcar o lead como qualificado
          if (activityData.activity_type === 'qualificacao') {
            leadUpdate.is_qualified = true;
            leadUpdate.status = 'qualificado';
          }

          await updateLead(activityData.lead_id, leadUpdate);
        }
      }
      
      await loadActivities(undefined, selectedDate);
      // Recalcular estatísticas após criar atividade
      await calculateDailyStats(selectedDate);
      
      toast({
        title: "Sucesso",
        description: "Atividade registrada com sucesso"
      });
    } catch (error) {
      console.error('Erro ao criar atividade:', error);
      toast({
        title: "Erro",
        description: "Erro ao registrar atividade",
        variant: "destructive"
      });
    }
  };

  const createFollowUp = async (followUpData: Partial<FollowUp>) => {
    try {
      const followUpToInsert: any = {
        budget_number: followUpData.budget_number || null,
        client_code: followUpData.client_code || null,
        client_name: followUpData.client_name || null,
        type: followUpData.type || 'reforcar_proposta',
        custom_type_text: followUpData.custom_type_text || null,
        subject: followUpData.subject || '',
        scheduled_date: followUpData.scheduled_date || new Date().toISOString(),
        user_id: followUpData.user_id || '',
        user_name: followUpData.user_name || 'Sistema',
        sdr_id: followUpData.sdr_id || null,
        sdr_name: followUpData.sdr_name || null,
        lead_id: followUpData.lead_id || null,
        is_completed: followUpData.is_completed || false,
        show_today: followUpData.show_today !== undefined ? followUpData.show_today : true
      };

      const { error } = await supabase
        .from('budget_followups')
        .insert(followUpToInsert);
      
      if (error) throw error;
      
      await loadFollowUps();
      toast({
        title: "Sucesso",
        description: "Follow-up criado com sucesso"
      });
    } catch (error) {
      console.error('Erro ao criar follow-up:', error);
      toast({
        title: "Erro",
        description: "Erro ao criar follow-up",
        variant: "destructive"
      });
    }
  };

  const markFollowUpAsCompleted = async (id: string, notes?: string) => {
    try {
      const { error } = await supabase
        .from('budget_followups')
        .update({ 
          is_completed: true,
          show_today: false,
          completed_at: new Date().toISOString(),
          completion_notes: notes,
          updated_at: new Date().toISOString()
        })
        .eq('id', id);

      if (error) throw error;

      await loadFollowUps();
      toast({
        title: "Sucesso",
        description: "Follow-up marcado como concluído e salvo no histórico"
      });
    } catch (error) {
      console.error('Erro ao marcar follow-up como concluído:', error);
      toast({
        title: "Erro",
        description: "Erro ao marcar como concluído",
        variant: "destructive"
      });
    }
  };

  const updateGoals = async (goalsData: Partial<SDRGoals>) => {
    try {
      const currentMonthYear = new Date().toISOString().slice(0, 7);
      
      if (goals) {
        // Atualizar metas existentes
        const { error } = await (supabase as any)
          .from('sdr_goals')
          .update(goalsData)
          .eq('id', goals.id);
        
        if (error) throw error;
      } else {
        // Criar novas metas
        const { error } = await (supabase as any)
          .from('sdr_goals')
          .insert([{
            ...goalsData,
            sdr_id: goalsData.sdr_id || '',
            month_year: currentMonthYear
          }]);
        
        if (error) throw error;
      }
      
      await loadGoals();
      toast({
        title: "Sucesso",
        description: "Metas atualizadas com sucesso"
      });
    } catch (error) {
      console.error('Erro ao atualizar metas:', error);
      toast({
        title: "Erro",
        description: "Erro ao atualizar metas",
        variant: "destructive"
      });
    }
  };

  // Efeitos
  useEffect(() => {
    loadLeads();
    loadActivities(undefined, selectedDate);
    loadFollowUps();
    loadGoals();
    loadAdminGoals();
    calculateDailyStats(selectedDate);
  }, []);

  useEffect(() => {
    loadActivities(undefined, selectedDate);
    calculateDailyStats(selectedDate);
  }, [selectedDate]);

  const value: PreVendasContextType = {
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
    loadActivities,
    loadFollowUps,
    loadGoals,
    loadAdminGoals,
    calculateDailyStats,
    createLead,
    updateLead,
    deleteLead,
    createActivity,
    createFollowUp,
    markFollowUpAsCompleted,
    updateGoals
  };

  return (
    <PreVendasContext.Provider value={value}>
      {children}
    </PreVendasContext.Provider>
  );
};

export function usePreVendas() {
  const context = useContext(PreVendasContext);
  if (context === undefined) {
    throw new Error('usePreVendas must be used within a PreVendasProvider');
  }
  return context;
};