import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Lead } from '@/context/PreVendasContext';
import { supabase } from '@/integrations/supabase/client';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Clock, Phone, Mail, User, Target, TrendingUp, UserCheck } from 'lucide-react';

interface LeadHistoryDialogProps {
  open: boolean;
  onClose: () => void;
  lead: Lead | null;
}

interface HistoryItem {
  id: string;
  type: 'activity' | 'qualification' | 'status_change' | 'assignment';
  date: Date;
  title: string;
  description: string;
  details?: Record<string, any>;
  user_name?: string;
}

export const LeadHistoryDialog: React.FC<LeadHistoryDialogProps> = ({
  open,
  onClose,
  lead
}) => {
  const [historyItems, setHistoryItems] = useState<HistoryItem[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (open && lead) {
      loadLeadHistory();
    }
  }, [open, lead]);

  const loadLeadHistory = async () => {
    if (!lead) return;
    
    setLoading(true);
    try {
      const history: HistoryItem[] = [];

      // Buscar atividades
      const { data: activities } = await supabase
        .from('lead_activities')
        .select('*')
        .eq('lead_id', lead.id)
        .order('created_at', { ascending: false });

      if (activities) {
        activities.forEach(activity => {
          let description = activity.description;
          
          history.push({
            id: activity.id,
            type: 'activity',
            date: new Date(activity.created_at),
            title: `Atividade: ${activity.activity_type}`,
            description: description,
            details: {
              result: activity.result,
              next_action: activity.next_action
            }
          });
        });
      }

      // Adicionar eventos de qualificação baseados no lead atual
      if (lead.is_qualified) {
        history.push({
          id: `qualification-${lead.id}`,
          type: 'qualification',
          date: new Date(lead.updated_at),
          title: 'Lead Qualificado',
          description: `Lead qualificado com score ${lead.qualification_score}/5`,
          details: {
            criteria_met: lead.qualification_criteria_met,
            business_type: lead.business_type,
            product_interest: lead.product_interest,
            estimated_volume: lead.estimated_volume
          },
          user_name: lead.sdr_name
        });
      }

      // Adicionar evento de encaminhamento se aplicável
      if (lead.forwarded_to_specialist && lead.forwarded_at) {
        history.push({
          id: `forwarded-${lead.id}`,
          type: 'assignment',
          date: new Date(lead.forwarded_at),
          title: 'Encaminhado para Especialista',
          description: `Lead encaminhado para ${lead.assigned_specialist_name || 'Especialista'}`,
          details: {
            specialist_name: lead.assigned_specialist_name
          },
          user_name: lead.sdr_name
        });
      }

      // Adicionar evento de criação/atribuição
      history.push({
        id: `created-${lead.id}`,
        type: 'assignment',
        date: new Date(lead.assigned_at || lead.created_at),
        title: 'Lead Atribuído',
        description: `Lead atribuído para SDR ${lead.sdr_name}`,
        details: {
          source: lead.source,
          entry_channel: lead.entry_channel
        },
        user_name: 'Sistema'
      });

      // Ordenar por data (mais recente primeiro)
      history.sort((a, b) => b.date.getTime() - a.date.getTime());
      
      setHistoryItems(history);
    } catch (error) {
      console.error('Erro ao carregar histórico:', error);
    } finally {
      setLoading(false);
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'activity': return <Phone className="h-4 w-4" />;
      case 'qualification': return <UserCheck className="h-4 w-4" />;
      case 'status_change': return <TrendingUp className="h-4 w-4" />;
      case 'assignment': return <User className="h-4 w-4" />;
      default: return <Clock className="h-4 w-4" />;
    }
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'activity': return 'bg-blue-100 text-blue-700';
      case 'qualification': return 'bg-green-100 text-green-700';
      case 'status_change': return 'bg-yellow-100 text-yellow-700';
      case 'assignment': return 'bg-purple-100 text-purple-700';
      default: return 'bg-gray-100 text-gray-700';
    }
  };

  if (!lead) return null;

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Histórico de Ações - {lead.client_name}</DialogTitle>
          <DialogDescription>
            Todas as atividades, contatos e qualificações relacionadas a este lead
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Informações do Lead */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm">Informações do Lead</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                <div>
                  <span className="font-medium">Cliente:</span>
                  <div>{lead.client_name} ({lead.client_code})</div>
                </div>
                <div>
                  <span className="font-medium">Status:</span>
                  <div>
                    <Badge variant="secondary" className="text-xs">
                      {lead.status}
                    </Badge>
                  </div>
                </div>
                <div>
                  <span className="font-medium">SDR:</span>
                  <div>{lead.sdr_name}</div>
                </div>
                <div>
                  <span className="font-medium">Qualificação:</span>
                  <div>
                    <Badge variant={lead.is_qualified ? "default" : "secondary"} className="text-xs">
                      {lead.qualification_score || 0}/5
                    </Badge>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Timeline de Ações */}
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Timeline de Ações</CardTitle>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="text-center py-8 text-muted-foreground">
                  Carregando histórico...
                </div>
              ) : historyItems.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  Nenhuma atividade encontrada
                </div>
              ) : (
                <div className="space-y-4">
                  {historyItems.map((item, index) => (
                    <div key={item.id} className="relative">
                      {index < historyItems.length - 1 && (
                        <div className="absolute left-4 top-8 w-px h-16 bg-border" />
                      )}
                      <div className="flex gap-4">
                        <div className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center ${getTypeColor(item.type)}`}>
                          {getTypeIcon(item.type)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between">
                            <div>
                              <h4 className="font-medium text-sm">{item.title}</h4>
                              <p className="text-sm text-muted-foreground mt-1">
                                {item.description}
                              </p>
                              {item.details && (
                                <div className="mt-2 space-y-1">
                                  {item.details.result && (
                                    <div className="text-xs">
                                      <span className="font-medium">Resultado:</span> {item.details.result}
                                    </div>
                                  )}
                                  {item.details.next_action && (
                                    <div className="text-xs">
                                      <span className="font-medium">Próxima ação:</span> {item.details.next_action}
                                    </div>
                                  )}
                                  {item.details.criteria_met && item.details.criteria_met.length > 0 && (
                                    <div className="text-xs">
                                      <span className="font-medium">Critérios atendidos:</span> {item.details.criteria_met.join(', ')}
                                    </div>
                                  )}
                                  {item.details.specialist_name && (
                                    <div className="text-xs">
                                      <span className="font-medium">Especialista:</span> {item.details.specialist_name}
                                    </div>
                                  )}
                                </div>
                              )}
                            </div>
                            <div className="text-right text-xs text-muted-foreground flex-shrink-0 ml-4">
                              <div>{format(item.date, 'dd/MM/yyyy', { locale: ptBR })}</div>
                              <div>{format(item.date, 'HH:mm', { locale: ptBR })}</div>
                              {item.user_name && (
                                <div className="font-medium">{item.user_name}</div>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </DialogContent>
    </Dialog>
  );
};