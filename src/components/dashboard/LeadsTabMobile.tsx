import React from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Edit, History, UserPlus, Trash2 } from 'lucide-react';
import { MobileTableCard } from '@/components/ui/mobile-table-card';
import { Lead } from '@/context/PreVendasContext';
import { format } from 'date-fns';

interface LeadsTabMobileProps {
  leads: Lead[];
  onEditLead: (lead: Lead) => void;
  onHistoryLead: (lead: Lead) => void;
  onForwardLead: (lead: Lead) => void;
  onDeleteLead: (lead: Lead) => void;
  isAdmin: boolean;
  statusColors: Record<string, string>;
  statusLabels: Record<string, string>;
}

export function LeadsTabMobile({
  leads,
  onEditLead,
  onHistoryLead,
  onForwardLead,
  onDeleteLead,
  isAdmin,
  statusColors,
  statusLabels
}: LeadsTabMobileProps) {
  return (
    <div className="space-y-3">
      {leads.length === 0 ? (
        <div className="text-center py-8 text-muted-foreground">
          Nenhum lead encontrado.
        </div>
      ) : (
        leads.map((lead) => (
          <MobileTableCard
            key={lead.id}
            title={lead.client_name}
            subtitle={lead.client_code}
            badge={
              <Badge 
                variant="secondary" 
                className={`text-white ${statusColors[lead.status as keyof typeof statusColors]}`}
              >
                {statusLabels[lead.status as keyof typeof statusLabels]}
              </Badge>
            }
            fields={[
              {
                label: 'Localização',
                value: lead.cidade && lead.uf ? `${lead.cidade}, ${lead.uf}` : 'Não informado'
              },
              {
                label: 'Contato',
                value: (
                  <div className="text-right">
                    <div>{lead.contact_name || 'Não informado'}</div>
                    {lead.contact_phone && (
                      <div className="text-xs text-muted-foreground">{lead.contact_phone}</div>
                    )}
                  </div>
                )
              },
              {
                label: 'Qualificação',
                value: (lead.qualification_score && lead.qualification_score > 0) || lead.is_qualified || lead.forwarded_to_specialist ? (
                  <Badge variant="default" className="bg-green-500 text-xs">
                    ✅ Qualificado {lead.qualification_score && lead.qualification_score > 0 ? `(${lead.qualification_score}/5)` : ''}
                  </Badge>
                ) : (
                  <Badge variant="secondary" className="text-xs">
                    ⏳ Não Qualificado
                  </Badge>
                )
              },
              {
                label: 'SDR',
                value: (
                  <div className="text-right text-sm">
                    <div>{lead.sdr_name}</div>
                    {lead.assigned_at && (
                      <div className="text-xs text-muted-foreground">
                        {format(new Date(lead.assigned_at), 'dd/MM/yyyy')}
                      </div>
                    )}
                  </div>
                )
              },
              {
                label: 'Último Contato',
                value: lead.last_contact_at ? (
                  <div className="text-right text-sm">
                    <div>{format(new Date(lead.last_contact_at), 'dd/MM/yyyy')}</div>
                    <div className="text-xs text-muted-foreground">
                      {format(new Date(lead.last_contact_at), 'HH:mm')}
                    </div>
                  </div>
                ) : (
                  <span className="text-muted-foreground text-sm">Sem contato</span>
                )
              }
            ]}
            actions={
              <>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => onHistoryLead(lead)}
                  title="Ver histórico"
                  className="flex-1"
                >
                  <History className="h-4 w-4 mr-1" />
                  Histórico
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => onEditLead(lead)}
                  title="Editar"
                  className="flex-1"
                >
                  <Edit className="h-4 w-4 mr-1" />
                  Editar
                </Button>
                {isAdmin && (
                  <>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => onForwardLead(lead)}
                      title="Encaminhar"
                      className="flex-1 text-blue-600 hover:text-blue-800 hover:bg-blue-50"
                    >
                      <UserPlus className="h-4 w-4 mr-1" />
                      Encaminhar
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => onDeleteLead(lead)}
                      title="Remover"
                      className="flex-1 text-red-600 hover:text-red-800 hover:bg-red-50"
                    >
                      <Trash2 className="h-4 w-4 mr-1" />
                      Remover
                    </Button>
                  </>
                )}
              </>
            }
          />
        ))
      )}
    </div>
  );
}
