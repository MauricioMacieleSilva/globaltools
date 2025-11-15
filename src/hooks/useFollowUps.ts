import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/context/AuthContext';
import { toast } from '@/hooks/use-toast';
import { hasPermission } from '@/lib/supabase';

export type FollowUpType = 'reativar_cliente' | 'ligar_followup' | 'enviar_material' | 'reforcar_proposta' | 'ajustar_proposta' | 'agendar_reuniao' | 'agendar_visita' | 'cobrar_retorno' | 'enviar_novo_orcamento' | 'checar_status_decisao' | 'agendar_nova_tentativa' | 'solicitar_documentos' | 'reabrir_negociacao_futura' | 'outro';

export interface FollowUp {
  id: string;
  budget_number?: string;
  user_id: string;
  user_name: string;
  type: FollowUpType;
  subject: string;
  scheduled_date: string;
  is_completed: boolean;
  show_today: boolean;
  created_at: string;
  updated_at: string;
  client_name?: string;
  client_code?: string;
  custom_type_text?: string;
  lead_id?: string;
  sdr_id?: string;
  sdr_name?: string;
}

export function useFollowUps() {
  const [followUps, setFollowUps] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const { user, userProfile } = useAuth();

  const loadFollowUps = async (budgetNumber?: string) => {
    if (!user) return;
    
    setLoading(true);
    try {
      let query = supabase
        .from('budget_followups')
        .select('*');

      // Only filter by user_id if not admin
      if (!userProfile || !hasPermission(userProfile.role, 'admin')) {
        query = query.eq('user_id', user.id);
      }

      query = query.order('scheduled_date', { ascending: true });

      if (budgetNumber) {
        query = query.eq('budget_number', budgetNumber);
      }

      const { data, error } = await query;

      if (error) throw error;
      setFollowUps(data || []);
    } catch (error) {
      console.error('Erro ao carregar follow-ups:', error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar os follow-ups.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const loadFollowUpsByClient = async (clientName: string) => {
    if (!user) return [];
    
    try {
      let query = supabase
        .from('budget_followups')
        .select('*');

      // Only filter by user_id if not admin
      if (!userProfile || !hasPermission(userProfile.role, 'admin')) {
        query = query.eq('user_id', user.id);
      }

      const { data, error } = await query
        .eq('client_name', clientName)
        .order('scheduled_date', { ascending: false });

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Erro ao carregar follow-ups do cliente:', error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar os follow-ups do cliente.",
        variant: "destructive",
      });
      return [];
    }
  };

  const createFollowUp = async (followUp: Omit<FollowUp, 'id' | 'user_id' | 'user_name' | 'created_at' | 'updated_at'>) => {
    if (!user) return false;

    setLoading(true);
    try {
      // If lead_id is provided, fetch lead data to populate sdr fields
      let leadData = null;
      if (followUp.lead_id) {
        const { data } = await supabase
          .from('leads')
          .select('sdr_id, sdr_name')
          .eq('id', followUp.lead_id)
          .single();
        leadData = data;
      }

      const { error } = await (supabase as any)
        .from('budget_followups')
        .insert({
          ...followUp,
          user_id: user.id
        } as any);

      if (error) throw error;

      toast({
        title: "Sucesso",
        description: "Follow-up criado com sucesso!",
      });

      await loadFollowUps();
      return true;
    } catch (error) {
      console.error('Erro ao criar follow-up:', error);
      toast({
        title: "Erro",
        description: "Não foi possível criar o follow-up.",
        variant: "destructive",
      });
      return false;
    } finally {
      setLoading(false);
    }
  };

  const updateFollowUp = async (id: string, updates: Partial<FollowUp>) => {
    setLoading(true);
    try {
      const { error } = await supabase
        .from('budget_followups')
        .update(updates)
        .eq('id', id);

      if (error) throw error;

      toast({
        title: "Sucesso",
        description: "Follow-up atualizado com sucesso!",
      });

      await loadFollowUps();
      return true;
    } catch (error) {
      console.error('Erro ao atualizar follow-up:', error);
      toast({
        title: "Erro",
        description: "Não foi possível atualizar o follow-up.",
        variant: "destructive",
      });
      return false;
    } finally {
      setLoading(false);
    }
  };

  const deleteFollowUp = async (id: string) => {
    setLoading(true);
    try {
      const { error } = await supabase
        .from('budget_followups')
        .delete()
        .eq('id', id);

      if (error) throw error;

      toast({
        title: "Sucesso",
        description: "Follow-up excluído com sucesso!",
      });

      await loadFollowUps();
      return true;
    } catch (error) {
      console.error('Erro ao excluir follow-up:', error);
      toast({
        title: "Erro",
        description: "Não foi possível excluir o follow-up.",
        variant: "destructive",
      });
      return false;
    } finally {
      setLoading(false);
    }
  };

  const getTodayReminders = async () => {
    if (!user) return [];

    try {
      const today = new Date();
      const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate());
      const endOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1);

      // Check if reminders were already shown for this login session
      const sessionId = sessionStorage.getItem('reminder_session_id');
      const currentSessionId = Date.now().toString();
      
      if (!sessionId) {
        // New session, generate session ID
        sessionStorage.setItem('reminder_session_id', currentSessionId);
      }

      let query = supabase
        .from('budget_followups')
        .select('*');

      // Only filter by user_id if not admin
      if (!userProfile || !hasPermission(userProfile.role, 'admin')) {
        query = query.eq('user_id', user.id);
      }

      const { data, error } = await (query as any)
        .eq('show_today', true)
        .eq('is_completed', false)
        .gte('scheduled_date', startOfDay.toISOString())
        .lt('scheduled_date', endOfDay.toISOString())
        .order('scheduled_date', { ascending: true });

      if (error) throw error;

      // Filter out reminders hidden for this session using localStorage
      const hiddenRemindersKey = `hidden_reminders_${sessionId || currentSessionId}`;
      const hiddenReminders = JSON.parse(localStorage.getItem(hiddenRemindersKey) || '[]');
      
      const sessionData = data?.filter(reminder => 
        !hiddenReminders.includes(reminder.id)
      ) || [];

      return sessionData;
    } catch (error) {
      console.error('Erro ao carregar lembretes de hoje:', error);
      return [];
    }
  };

  const markAsCompleted = async (id: string) => {
    return updateFollowUp(id, { is_completed: true });
  };

  const hideForToday = async (id: string) => {
    const sessionId = sessionStorage.getItem('reminder_session_id') || Date.now().toString();
    
    try {
      // Store hidden reminders in localStorage for this session
      const hiddenRemindersKey = `hidden_reminders_${sessionId}`;
      const hiddenReminders = JSON.parse(localStorage.getItem(hiddenRemindersKey) || '[]');
      
      if (!hiddenReminders.includes(id)) {
        hiddenReminders.push(id);
        localStorage.setItem(hiddenRemindersKey, JSON.stringify(hiddenReminders));
      }
      
      return true;
    } catch (error) {
      console.error('Error hiding reminder for session:', error);
      return false;
    }
  };

  useEffect(() => {
    if (user) {
      loadFollowUps();
      
      // Configure realtime subscription
      const channel = supabase
        .channel('followups-changes')
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'budget_followups',
            // Admin sees all changes, others see only their own
            filter: userProfile && hasPermission(userProfile.role, 'admin') 
              ? undefined 
              : `user_id=eq.${user.id}`
          },
          (payload) => {
            console.log('Follow-up change detected:', payload);
            // Reload follow-ups when any change occurs
            loadFollowUps();
          }
        )
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    }
  }, [user, userProfile]);

  return {
    followUps,
    loading,
    loadFollowUps,
    loadFollowUpsByClient,
    createFollowUp,
    updateFollowUp,
    deleteFollowUp,
    getTodayReminders,
    markAsCompleted,
    hideForToday
  };
}