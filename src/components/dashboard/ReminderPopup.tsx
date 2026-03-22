import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Bell, Calendar, Check, EyeOff, MapPin, ClipboardList } from 'lucide-react';
import { useFollowUps, FollowUpType } from '@/hooks/useFollowUps';
import { supabase } from '@/integrations/supabase/client';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';

const followUpTypeLabels: Record<FollowUpType, string> = {
  reativar_cliente: "Reativar cliente",
  ligar_followup: "Ligar para follow-up",
  enviar_material: "Enviar material",
  reforcar_proposta: "Reforçar proposta",
  ajustar_proposta: "Ajustar proposta",
  agendar_reuniao: "Agendar reunião",
  agendar_visita: "Agendar visita",
  cobrar_retorno: "Cobrar retorno",
  enviar_novo_orcamento: "Enviar novo orçamento",
  checar_status_decisao: "Checar status da decisão",
  agendar_nova_tentativa: "Agendar nova tentativa",
  solicitar_documentos: "Solicitar documentos",
  reabrir_negociacao_futura: "Reabrir negociação futura",
  outro: "Outro",
};

const followUpTypeColors: Record<FollowUpType, string> = {
  reativar_cliente: "bg-red-100 text-red-800",
  ligar_followup: "bg-blue-100 text-blue-800",
  enviar_material: "bg-purple-100 text-purple-800",
  reforcar_proposta: "bg-green-100 text-green-800",
  ajustar_proposta: "bg-orange-100 text-orange-800",
  agendar_reuniao: "bg-indigo-100 text-indigo-800",
  agendar_visita: "bg-pink-100 text-pink-800",
  cobrar_retorno: "bg-yellow-100 text-yellow-800",
  enviar_novo_orcamento: "bg-teal-100 text-teal-800",
  checar_status_decisao: "bg-cyan-100 text-cyan-800",
  agendar_nova_tentativa: "bg-amber-100 text-amber-800",
  solicitar_documentos: "bg-lime-100 text-lime-800",
  reabrir_negociacao_futura: "bg-gray-100 text-gray-800",
  outro: "bg-slate-100 text-slate-800",
};

interface UnifiedReminder {
  id: string;
  type: 'budget_followup' | 'crm_visit' | 'crm_followup';
  title: string;
  subtitle?: string;
  time: string;
  badge: string;
  badgeClass: string;
  raw: any;
}

export function ReminderPopup() {
  const { getTodayReminders, markAsCompleted, hideForToday } = useFollowUps();
  const [reminders, setReminders] = useState<UnifiedReminder[]>([]);
  const [open, setOpen] = useState(false);
  const [hiddenReminders, setHiddenReminders] = useState<Set<string>>(new Set());
  const navigate = useNavigate();
  const { user } = useAuth();

  useEffect(() => {
    const loadAllReminders = async () => {
      if (!user) return;

      const sessionKey = `reminders_shown_${user.id}_${new Date().toDateString()}`;
      const hasSeenToday = sessionStorage.getItem(sessionKey);
      if (hasSeenToday) return;

      const unified: UnifiedReminder[] = [];

      // 1. Budget follow-ups (existing)
      const budgetReminders = await getTodayReminders();
      for (const r of budgetReminders) {
        unified.push({
          id: `bf_${r.id}`,
          type: 'budget_followup',
          title: r.client_name || 'Cliente não informado',
          subtitle: r.subject || r.budget_number ? `Pedido ${r.budget_number}` : undefined,
          time: formatTime(r.scheduled_date),
          badge: followUpTypeLabels[r.type as FollowUpType] || r.type,
          badgeClass: followUpTypeColors[r.type as FollowUpType] || 'bg-muted text-muted-foreground',
          raw: r,
        });
      }

      // 2. CRM Visits for today
      const today = new Date();
      const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate()).toISOString();
      const endOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1).toISOString();

      const { data: visits } = await (supabase as any)
        .from('crm_visits')
        .select('id, visit_date, location, lead_id')
        .eq('user_id', user.id)
        .gte('visit_date', startOfDay)
        .lt('visit_date', endOfDay)
        .order('visit_date', { ascending: true });

      if (visits?.length) {
        // Fetch lead names
        const leadIds = visits.map((v: any) => v.lead_id);
        const { data: leads } = await supabase
          .from('leads')
          .select('id, cliente_nome, client_name, empresa')
          .in('id', leadIds);
        const leadMap: Record<string, string> = {};
        leads?.forEach((l: any) => { leadMap[l.id] = l.empresa || l.client_name || l.cliente_nome || 'Lead'; });

        for (const v of visits) {
          unified.push({
            id: `visit_${v.id}`,
            type: 'crm_visit',
            title: leadMap[v.lead_id] || 'Lead',
            subtitle: v.location || undefined,
            time: formatTime(v.visit_date),
            badge: 'Visita/Reunião',
            badgeClass: 'bg-primary/10 text-primary',
            raw: v,
          });
        }
      }

      // 3. CRM Follow-ups for today
      const { data: followUps } = await supabase
        .from('follow_ups')
        .select('id, data_agendada, titulo, tipo, descricao, lead_id')
        .eq('user_id', user.id)
        .eq('concluido', false)
        .gte('data_agendada', startOfDay)
        .lt('data_agendada', endOfDay)
        .order('data_agendada', { ascending: true });

      if (followUps?.length) {
        const leadIds = followUps.map(f => f.lead_id).filter(Boolean) as string[];
        let leadMap: Record<string, string> = {};
        if (leadIds.length) {
          const { data: leads } = await supabase
            .from('leads')
            .select('id, cliente_nome, client_name, empresa')
            .in('id', leadIds);
          leads?.forEach((l: any) => { leadMap[l.id] = l.empresa || l.client_name || l.cliente_nome || 'Lead'; });
        }

        for (const f of followUps) {
          unified.push({
            id: `fu_${f.id}`,
            type: 'crm_followup',
            title: f.lead_id ? (leadMap[f.lead_id] || f.titulo) : f.titulo,
            subtitle: f.descricao || undefined,
            time: formatTime(f.data_agendada),
            badge: 'Follow-up',
            badgeClass: 'bg-accent text-accent-foreground',
            raw: f,
          });
        }
      }

      // Sort by time
      unified.sort((a, b) => a.time.localeCompare(b.time));

      if (unified.length > 0) {
        setReminders(unified);
        setOpen(true);
        sessionStorage.setItem(sessionKey, 'true');
      }
    };

    if (user) {
      loadAllReminders();
    }
  }, [user]);

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
  };

  const handleAction = async (reminder: UnifiedReminder) => {
    if (reminder.type === 'budget_followup') {
      await markAsCompleted(reminder.raw.id);
      navigate('/?tab=followup');
    } else if (reminder.type === 'crm_visit' || reminder.type === 'crm_followup') {
      navigate('/crm');
    }
    setReminders(prev => prev.filter(r => r.id !== reminder.id));
    if (reminders.length <= 1) setOpen(false);
  };

  const handleHide = async (reminder: UnifiedReminder) => {
    if (reminder.type === 'budget_followup') {
      await hideForToday(reminder.raw.id);
    }
    setHiddenReminders(prev => new Set([...prev, reminder.id]));
    setReminders(prev => prev.filter(r => r.id !== reminder.id));
    if (reminders.length <= 1) setOpen(false);
  };

  const getIcon = (type: UnifiedReminder['type']) => {
    switch (type) {
      case 'crm_visit': return <MapPin className="h-3.5 w-3.5 text-primary" />;
      case 'crm_followup': return <ClipboardList className="h-3.5 w-3.5 text-accent-foreground" />;
      default: return <Calendar className="h-3.5 w-3.5 text-muted-foreground" />;
    }
  };

  if (reminders.length === 0) return null;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Bell className="h-5 w-5 text-primary" />
            Compromissos de Hoje
          </DialogTitle>
          <DialogDescription>
            Você tem {reminders.length} compromisso{reminders.length > 1 ? 's' : ''} para hoje.
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="max-h-96">
          <div className="space-y-3">
            {reminders.map((reminder) => (
              <div
                key={reminder.id}
                className="border rounded-lg p-3 space-y-2 bg-background"
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-2">
                    {getIcon(reminder.type)}
                    <Badge className={reminder.badgeClass}>
                      {reminder.badge}
                    </Badge>
                    <span className="text-xs text-muted-foreground">
                      {reminder.time}
                    </span>
                  </div>
                </div>

                <div>
                  <p className="font-medium text-sm">{reminder.title}</p>
                  {reminder.subtitle && (
                    <p className="text-sm text-muted-foreground">{reminder.subtitle}</p>
                  )}
                </div>

                <div className="flex items-center gap-2 pt-2">
                  <Button
                    size="sm"
                    onClick={() => handleAction(reminder)}
                    className="flex-1 h-8"
                  >
                    <Check className="h-3 w-3 mr-1" />
                    {reminder.type === 'budget_followup' ? 'Ir para a Atividade' : 'Ir para o CRM'}
                  </Button>
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          size="sm"
                          variant={hiddenReminders.has(reminder.id) ? "secondary" : "outline"}
                          onClick={() => handleHide(reminder)}
                          className={`h-8 ${hiddenReminders.has(reminder.id) ? 'bg-muted text-muted-foreground' : ''}`}
                        >
                          <EyeOff className="h-3 w-3" />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>Ocultar lembrete apenas para esta sessão</p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </div>
              </div>
            ))}
          </div>
        </ScrollArea>

        <div className="flex justify-end pt-2">
          <Button variant="ghost" onClick={() => setOpen(false)}>
            Fechar
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
