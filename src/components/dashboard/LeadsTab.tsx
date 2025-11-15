import React, { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Lead } from '@/context/PreVendasContext';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Edit, Plus, History, Trash2, UserPlus } from 'lucide-react';
import { format } from 'date-fns';
import { LeadHistoryDialog } from './LeadHistoryDialog';
import { StatusSelector } from './StatusSelector';
import { ForwardToSpecialistDialog } from './ForwardToSpecialistDialog';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useIsMobile } from '@/hooks/use-mobile';
import { LeadsTabMobile } from './LeadsTabMobile';

import { ComercialVendorFilter } from './ComercialVendorFilter';

interface LeadsTabProps {
  leads: Lead[];
  searchTerm: string;
  setSearchTerm: (term: string) => void;
  statusFilter: string;
  setStatusFilter: (status: string) => void;
  selectedSDR?: string;
  setSelectedSDR?: (sdr: string) => void;
  availableSDRs?: string[];
  onNewLead: () => void;
  onEditLead: (lead: Lead) => void;
  onRefresh?: () => void;
}

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

export const LeadsTab: React.FC<LeadsTabProps> = ({
  leads,
  searchTerm,
  setSearchTerm,
  statusFilter,
  setStatusFilter,
  selectedSDR,
  setSelectedSDR,
  availableSDRs,
  onNewLead,
  onEditLead,
  onRefresh
}) => {
  const [historyLead, setHistoryLead] = React.useState<Lead | null>(null);
  const [forwardLead, setForwardLead] = React.useState<Lead | null>(null);
  const { userProfile } = useAuth();
  const { toast } = useToast();
  const isMobile = useIsMobile();

  const handleStatusChange = async (leadId: string, newStatus: string) => {
    try {
      const { error } = await supabase
        .from('leads')
        .update({ status: newStatus as any })
        .eq('id', leadId);

      if (error) throw error;

      toast({
        title: "Sucesso",
        description: "Status do lead atualizado com sucesso"
      });

      // Refresh the leads list if callback is provided
      if (onRefresh) {
        onRefresh();
      }
    } catch (error) {
      console.error('Erro ao atualizar status do lead:', error);
      toast({
        title: "Erro",
        description: "Erro ao atualizar status do lead",
        variant: "destructive"
      });
      throw error;
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

      toast({
        title: "Sucesso",
        description: "Lead removido do pipeline com sucesso"
      });

      // Refresh the leads list if callback is provided
      if (onRefresh) {
        onRefresh();
      }
    } catch (error) {
      console.error('Erro ao remover lead:', error);
      toast({
        title: "Erro",
        description: "Erro ao remover lead do pipeline",
        variant: "destructive"
      });
    }
  };

  const handleForwardLead = async (leadId: string, specialistId: string, briefing: string) => {
    try {
      const { error } = await supabase
        .from('leads')
        .update({ 
          especialista_id: specialistId,
          status: 'qualificado' as any
        })
        .eq('id', leadId);

      if (error) throw error;

      toast({
        title: "Sucesso",
        description: "Lead encaminhado para o especialista com sucesso"
      });

      setForwardLead(null);
      
      // Refresh the leads list if callback is provided
      if (onRefresh) {
        onRefresh();
      }
    } catch (error) {
      console.error('Erro ao encaminhar lead:', error);
      toast({
        title: "Erro",
        description: "Erro ao encaminhar lead para o especialista",
        variant: "destructive"
      });
    }
  };

  // Filtrar leads
  const filteredLeads = useMemo(() => {
    return leads.filter(lead => {
      const matchesSearch = !searchTerm || 
        lead.client_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        lead.contact_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        lead.client_code.toLowerCase().includes(searchTerm.toLowerCase());
        
      const matchesStatus = statusFilter === 'all' || lead.status === statusFilter;
      
      const matchesSDR = !selectedSDR || lead.sdr_name === selectedSDR;
      
      return matchesSearch && matchesStatus && matchesSDR;
    }).sort((a, b) => {
      // Ordenar pelo último contato (mais recente primeiro)
      if (!a.last_contact_at && !b.last_contact_at) return 0;
      if (!a.last_contact_at) return 1; // Leads sem contato vão para o final
      if (!b.last_contact_at) return -1;
      return new Date(b.last_contact_at).getTime() - new Date(a.last_contact_at).getTime();
    });
  }, [leads, searchTerm, statusFilter, selectedSDR]);

  return (
    <div className="space-y-6">
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
            <div className="flex gap-2">
              {availableSDRs && setSelectedSDR && (
                <ComercialVendorFilter
                  vendedores={availableSDRs}
                  selectedVendedor={selectedSDR || ''}
                  onVendedorChange={(sdr) => setSelectedSDR(sdr || '')}
                />
              )}
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
            <Button onClick={onNewLead}>
              <Plus className="h-4 w-4 mr-2" />
              Novo Lead
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Tabela de Leads */}
      <Card>
        <CardHeader>
          <CardTitle>Leads ({filteredLeads.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {isMobile ? (
            <LeadsTabMobile
              leads={filteredLeads}
              onEditLead={onEditLead}
              onHistoryLead={setHistoryLead}
              onForwardLead={setForwardLead}
              onDeleteLead={handleDeleteLead}
              isAdmin={userProfile?.role === 'admin'}
              statusColors={statusColors}
              statusLabels={statusLabels}
            />
          ) : (
            <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Cliente</TableHead>
                <TableHead>Localização</TableHead>
                <TableHead>Contato</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Qualificação</TableHead>
                <TableHead>SDR</TableHead>
                <TableHead>Último Contato</TableHead>
                <TableHead>Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredLeads.map((lead) => (
                <TableRow key={lead.id}>
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
                      {lead.contact_phone && (
                        <div className="text-muted-foreground">{lead.contact_phone}</div>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    {userProfile?.role === 'admin' ? (
                      <StatusSelector
                        currentStatus={lead.status}
                        onStatusChange={(newStatus) => handleStatusChange(lead.id, newStatus)}
                      />
                    ) : (
                      <Badge variant="secondary" className={`text-white ${statusColors[lead.status as keyof typeof statusColors]}`}>
                        {statusLabels[lead.status as keyof typeof statusLabels]}
                      </Badge>
                    )}
                  </TableCell>
                  <TableCell>
                    {/* Qualificação sempre visível para leads qualificados */}
                    {(lead.qualification_score && lead.qualification_score > 0) || lead.is_qualified || lead.forwarded_to_specialist ? (
                      <Badge variant="default" className="bg-green-500">
                        ✅ Qualificado {lead.qualification_score && lead.qualification_score > 0 ? `(${lead.qualification_score}/5)` : ''}
                      </Badge>
                    ) : (
                      <Badge variant="secondary">
                        ⏳ Não Qualificado
                      </Badge>
                    )}
                  </TableCell>
                  <TableCell>
                    <div className="text-sm">
                      <div>{lead.sdr_name}</div>
                      <div className="text-xs text-muted-foreground">
                        {lead.assigned_at ? format(new Date(lead.assigned_at), 'dd/MM/yyyy') : ''}
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="text-sm">
                      {lead.last_contact_at ? (
                        <div>
                          <div>{format(new Date(lead.last_contact_at), 'dd/MM/yyyy')}</div>
                          <div className="text-xs text-muted-foreground">
                            {format(new Date(lead.last_contact_at), 'HH:mm')}
                          </div>
                        </div>
                      ) : (
                        <span className="text-muted-foreground">Sem contato</span>
                      )}
                    </div>
                  </TableCell>
                    <TableCell>
                     <div className="flex items-center gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setHistoryLead(lead)}
                          title="Ver histórico de ações"
                        >
                          <History className="h-4 w-4" />
                        </Button>
                         <Button
                           variant="ghost"
                           size="sm"
                           onClick={() => onEditLead(lead)}
                           title="Editar lead"
                         >
                           <Edit className="h-4 w-4" />
                         </Button>
                         {userProfile?.role === 'admin' && (
                           <>
                             <Button
                               variant="ghost"
                               size="sm"
                               onClick={() => setForwardLead(lead)}
                               title="Encaminhar para especialista"
                               className="text-blue-600 hover:text-blue-800 hover:bg-blue-50"
                             >
                               <UserPlus className="h-4 w-4" />
                             </Button>
                             <Button
                               variant="ghost"
                               size="sm"
                               onClick={() => handleDeleteLead(lead)}
                               title="Remover do pipeline"
                               className="text-red-600 hover:text-red-800 hover:bg-red-50"
                             >
                               <Trash2 className="h-4 w-4" />
                             </Button>
                           </>
                         )}
                     </div>
                   </TableCell>
                </TableRow>
              ))}
              {filteredLeads.length === 0 && (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                    Nenhum lead encontrado.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
          )}
        </CardContent>
      </Card>

      <LeadHistoryDialog
        open={!!historyLead}
        onClose={() => setHistoryLead(null)}
        lead={historyLead}
      />

      <ForwardToSpecialistDialog
        open={!!forwardLead}
        onClose={() => setForwardLead(null)}
        lead={forwardLead}
        onForward={handleForwardLead}
      />
    </div>
  );
};