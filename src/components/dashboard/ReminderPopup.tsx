import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Bell, Calendar, Clock, Check, X, EyeOff } from 'lucide-react';
import { useFollowUps, FollowUp, FollowUpType } from '@/hooks/useFollowUps';
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

export function ReminderPopup() {
  const { getTodayReminders, markAsCompleted, hideForToday } = useFollowUps();
  const [reminders, setReminders] = useState<any[]>([]);
  const [open, setOpen] = useState(false);
  const [hiddenReminders, setHiddenReminders] = useState<Set<string>>(new Set());
  const navigate = useNavigate();
  const { user } = useAuth();

  useEffect(() => {
    const loadReminders = async () => {
      if (!user) return;

      const todayReminders = await getTodayReminders();
      if (todayReminders.length > 0) {
        // Check if user has already seen reminders today in this session
        const sessionKey = `reminders_shown_${user.id}_${new Date().toDateString()}`;
        const hasSeenToday = sessionStorage.getItem(sessionKey);
        
        if (!hasSeenToday) {
          setReminders(todayReminders);
          setOpen(true);
          sessionStorage.setItem(sessionKey, 'true');
        }
      }
    };

    // Only load reminders if user is logged in
    if (user) {
      loadReminders();
    }
  }, [getTodayReminders, user]);

  const handleMarkAsCompleted = async (id: string) => {
    const success = await markAsCompleted(id);
    if (success) {
      setReminders(prev => prev.filter(r => r.id !== id));
      if (reminders.length <= 1) {
        setOpen(false);
      }
      // Navigate to follow-up section
      navigate('/?tab=followup');
    }
  };

  const handleHideForToday = async (id: string) => {
    const success = await hideForToday(id);
    if (success) {
      setHiddenReminders(prev => new Set([...prev, id]));
      setReminders(prev => prev.filter(r => r.id !== id));
      if (reminders.length <= 1) {
        setOpen(false);
      }
    }
  };

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
  };

  if (reminders.length === 0) return null;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Bell className="h-5 w-5 text-blue-600" />
            Lembretes de Hoje
          </DialogTitle>
          <DialogDescription>
            Você tem {reminders.length} lembrete{reminders.length > 1 ? 's' : ''} para hoje.
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
                    <Badge className={followUpTypeColors[reminder.type]}>
                      {followUpTypeLabels[reminder.type]}
                    </Badge>
                    <span className="text-xs text-muted-foreground">
                      {formatTime(reminder.scheduled_date)}
                    </span>
                  </div>
                </div>

                <div>
                  <p className="font-medium text-sm">
                    {reminder.client_name || 'Cliente não informado'}
                    {reminder.budget_number && ` - Pedido ${reminder.budget_number}`}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {reminder.subject}
                  </p>
                </div>

                <div className="flex items-center gap-2 pt-2">
                  <Button
                    size="sm"
                    onClick={() => handleMarkAsCompleted(reminder.id)}
                    className="flex-1 h-8"
                  >
                    <Check className="h-3 w-3 mr-1" />
                    Ir para a Atividade
                  </Button>
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          size="sm"
                          variant={hiddenReminders.has(reminder.id) ? "secondary" : "outline"}
                          onClick={() => handleHideForToday(reminder.id)}
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