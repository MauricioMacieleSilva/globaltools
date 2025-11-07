import React from 'react';
import { MobileTableCard } from '@/components/ui/mobile-table-card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Edit, History, UserPlus, Trash2 } from 'lucide-react';
import { Lead } from '@/context/PreVendasContext';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface PipelineTableMobileProps {
  leads: Lead[];
  statusColors: Record<string, string>;
  statusLabels: Record<string, string>;
  onQualify: (lead: Lead) => void;
  onHistory: (lead: Lead) => void;
  onUpdateStatus: (lead: Lead) => void;
  onAssignSpecialist: (lead: Lead) => void;
  onDeleteLead?: (leadId: string) => void;
  isAdmin?: boolean;
}

export function PipelineTableMobile({
  leads,
  statusColors,
  statusLabels,
  onQualify,
  onHistory,
  onUpdateStatus,
  onAssignSpecialist,
  onDeleteLead,
  isAdmin = false
}: PipelineTableMobileProps) {
  if (leads.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        Nenhum lead encontrado
      </div>
    );
  }

  const formatDate = (dateString: string | null) => {
    if (!dateString) return 'Não informado';
    try {
      return format(new Date(dateString), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR });
    } catch {
      return 'Data inválida';
    }
  };

  return (
    <div className="space-y-3">
      {leads.map((lead) => (
        <MobileTableCard
          key={lead.id}
          title={lead.client_name}
          subtitle={lead.contact_name}
          badge={
            <Badge className={statusColors[lead.pipeline_status || 'encaminhado']}>
              {statusLabels[lead.pipeline_status || 'encaminhado']}
            </Badge>
          }
          fields={[
            { label: 'Telefone', value: lead.contact_phone || 'N/A' },
            { label: 'Email', value: lead.contact_email || 'N/A' },
            { 
              label: 'Qualificado', 
              value: lead.is_qualified ? (
                <Badge variant="default">Sim ({lead.qualification_score}/5)</Badge>
              ) : (
                <Badge variant="secondary">Não ({lead.qualification_score || 0}/5)</Badge>
              )
            },
            { label: 'SDR', value: lead.sdr_name || 'N/A' },
            { label: 'Especialista', value: lead.assigned_specialist_name || 'Não atribuído' },
            { label: 'Último Contato', value: formatDate(lead.last_contact_at), fullWidth: true }
          ]}
          actions={
            <>
              <Button size="sm" variant="outline" onClick={() => onHistory(lead)}>
                <History className="h-4 w-4 mr-1" />
                Histórico
              </Button>
              <Button size="sm" variant="outline" onClick={() => onQualify(lead)}>
                <Edit className="h-4 w-4 mr-1" />
                Qualificar
              </Button>
              <Button size="sm" variant="outline" onClick={() => onUpdateStatus(lead)}>
                <Edit className="h-4 w-4 mr-1" />
                Status
              </Button>
              <Button size="sm" variant="outline" onClick={() => onAssignSpecialist(lead)}>
                <UserPlus className="h-4 w-4 mr-1" />
                Atribuir
              </Button>
              {isAdmin && onDeleteLead && (
                <Button 
                  size="sm" 
                  variant="destructive" 
                  onClick={() => onDeleteLead(lead.id)}
                >
                  <Trash2 className="h-4 w-4 mr-1" />
                  Excluir
                </Button>
              )}
            </>
          }
        />
      ))}
    </div>
  );
}
