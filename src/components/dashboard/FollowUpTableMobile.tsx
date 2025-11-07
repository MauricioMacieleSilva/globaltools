import React from 'react';
import { MobileTableCard } from '@/components/ui/mobile-table-card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Check, X, Eye, Clock, AlertCircle } from 'lucide-react';
import { FollowUpType } from '@/hooks/useFollowUps';

interface FollowUp {
  id: string;
  subject: string;
  scheduled_date: string;
  client_name?: string;
  budget_number?: string;
  type: FollowUpType;
  description?: string;
  is_completed: boolean;
  created_at: string;
}

interface FollowUpTableMobileProps {
  followUps: FollowUp[];
  onMarkComplete: (id: string) => void;
  onDelete: (id: string) => void;
  onViewDetails: (followUp: FollowUp) => void;
  followUpTypeLabels: Record<FollowUpType, string>;
  followUpTypeColors: Record<FollowUpType, string>;
}

export function FollowUpTableMobile({
  followUps,
  onMarkComplete,
  onDelete,
  onViewDetails,
  followUpTypeLabels,
  followUpTypeColors
}: FollowUpTableMobileProps) {
  const formatDateTime = (dateString: string) => {
    const date = new Date(dateString);
    return {
      date: date.toLocaleDateString('pt-BR'),
      time: date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
    };
  };

  const isOverdue = (dateString: string, isCompleted: boolean) => {
    if (isCompleted) return false;
    return new Date(dateString) < new Date();
  };

  if (followUps.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        Nenhum follow-up encontrado
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {followUps.map((followUp) => {
        const dateTime = formatDateTime(followUp.scheduled_date);
        const overdue = isOverdue(followUp.scheduled_date, followUp.is_completed);
        
        return (
          <MobileTableCard
            key={followUp.id}
            title={followUp.subject}
            subtitle={followUp.client_name || 'Cliente não informado'}
            badge={
              <div className="flex flex-col gap-1 items-end">
                <Badge className={followUpTypeColors[followUp.type]} variant="secondary">
                  {followUpTypeLabels[followUp.type]}
                </Badge>
                {followUp.is_completed && (
                  <Badge variant="default" className="bg-green-100 text-green-800">
                    Concluído
                  </Badge>
                )}
                {overdue && (
                  <Badge variant="destructive" className="flex items-center gap-1">
                    <AlertCircle className="h-3 w-3" />
                    Atrasado
                  </Badge>
                )}
              </div>
            }
            fields={[
              { 
                label: 'Data', 
                value: (
                  <div className="flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    {dateTime.date} às {dateTime.time}
                  </div>
                )
              },
              ...(followUp.budget_number ? [{ 
                label: 'Orçamento', 
                value: followUp.budget_number 
              }] : []),
              ...(followUp.description ? [{ 
                label: 'Descrição', 
                value: followUp.description,
                fullWidth: true 
              }] : [])
            ]}
            actions={
              <>
                {!followUp.is_completed && (
                  <Button
                    size="sm"
                    variant="default"
                    onClick={() => onMarkComplete(followUp.id)}
                  >
                    <Check className="h-4 w-4 mr-1" />
                    Concluir
                  </Button>
                )}
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => onViewDetails(followUp)}
                >
                  <Eye className="h-4 w-4 mr-1" />
                  Detalhes
                </Button>
                <Button
                  size="sm"
                  variant="destructive"
                  onClick={() => onDelete(followUp.id)}
                >
                  <X className="h-4 w-4 mr-1" />
                  Excluir
                </Button>
              </>
            }
          />
        );
      })}
    </div>
  );
}
