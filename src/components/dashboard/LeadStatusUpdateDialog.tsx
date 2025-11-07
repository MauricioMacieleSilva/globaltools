import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Lead } from '@/context/PreVendasContext';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/context/AuthContext';
import { TrendingUp, MessageSquare, ShoppingCart } from 'lucide-react';
import { MultipleBudgetNumberSelect } from './MultipleBudgetNumberSelect';

interface LeadStatusUpdateDialogProps {
  open: boolean;
  onClose: () => void;
  lead: Lead | null;
  onUpdate: () => void;
}

const statusOptions = [
  { value: 'encaminhado', label: 'Encaminhado', color: 'bg-purple-500' },
  { value: 'contatado', label: 'Contatado', color: 'bg-blue-500' },
  { value: 'contato_sem_sucesso', label: 'Contato sem sucesso', color: 'bg-orange-500' },
  { value: 'em_atendimento', label: 'Em atendimento', color: 'bg-orange-500' },
  { value: 'respondeu', label: 'Respondeu', color: 'bg-yellow-500' },
  { value: 'qualificado', label: 'Qualificado', color: 'bg-green-500' },
  { value: 'negociando', label: 'Negociando', color: 'bg-indigo-500' },
  { value: 'orçando', label: 'Orçando', color: 'bg-cyan-500' },
  { value: 'pedido_fechado', label: 'Pedido Fechado', color: 'bg-emerald-600' },
  { value: 'perdido', label: 'Perdido', color: 'bg-red-500' }
];

export const LeadStatusUpdateDialog: React.FC<LeadStatusUpdateDialogProps> = ({
  open,
  onClose,
  lead,
  onUpdate
}) => {
  const { userProfile } = useAuth();
  const { toast } = useToast();
  const [selectedStatus, setSelectedStatus] = useState<string>('');
  const [comment, setComment] = useState<string>('');
  const [budgetNumber, setBudgetNumber] = useState<string>('');
  const [loading, setLoading] = useState(false);

  React.useEffect(() => {
    if (lead && open) {
      // Usar pipeline_status ou 'encaminhado' como padrão
      setSelectedStatus(lead.pipeline_status || 'encaminhado');
      setComment('');
      setBudgetNumber(lead.budget_number || '');
    }
  }, [lead, open]);

  const handleSave = async () => {
    console.log('=== INÍCIO SALVAMENTO STATUS ===');
    console.log('Lead ID:', lead?.id);
    console.log('Status atual:', lead?.status);
    console.log('Novo status:', selectedStatus);
    console.log('UserProfile completo:', userProfile);
    console.log('UserProfile ID:', userProfile?.id);
    console.log('UserProfile nome:', userProfile?.full_name);
    console.log('UserProfile email:', userProfile?.email);
    console.log('UserProfile role:', userProfile?.role);
    
    if (!lead || !selectedStatus || !userProfile) {
      console.log('ERRO: Dados faltando:', { 
        hasLead: !!lead, 
        hasSelectedStatus: !!selectedStatus, 
        hasUserProfile: !!userProfile 
      });
      toast({
        title: "Erro",
        description: "Dados incompletos para salvar o status",
        variant: "destructive"
      });
      return;
    }

    setLoading(true);
    try {
      console.log('Tentando atualizar lead:', { leadId: lead.id, newStatus: selectedStatus });
      
      // Preparar dados para atualização
      const updateData: any = { 
        pipeline_status: selectedStatus,
        updated_at: new Date().toISOString()
      };

      // Atualiza o número de orçamento se informado
      if (budgetNumber.trim()) {
        updateData.budget_number = budgetNumber.trim();
      }

      // Se o status for "contato_sem_sucesso", incrementar o contador
      if (selectedStatus === 'contato_sem_sucesso') {
        const currentCount = lead.unsuccessful_contacts_count || 0;
        updateData.unsuccessful_contacts_count = currentCount + 1;
        console.log('Incrementando contador de contatos sem sucesso:', { 
          currentCount, 
          newCount: updateData.unsuccessful_contacts_count 
        });
      }
      
      // Atualizar status do pipeline (não afeta a gestão de leads)
      const { error: leadError, data: updatedData } = await supabase
        .from('leads')
        .update(updateData)
        .eq('id', lead.id);

      console.log('Resultado da atualização:', { leadError, updatedData });

      if (leadError) throw leadError;

      // Registrar atividade se há comentário ou mudança de status
      const currentPipelineStatus = lead.pipeline_status || 'encaminhado';
      if (comment.trim() || selectedStatus !== currentPipelineStatus) {
        const activityDescription = selectedStatus !== currentPipelineStatus 
          ? `Status do pipeline alterado de "${currentPipelineStatus}" para "${selectedStatus}"`
          : "Comentário adicionado";

        const { error: activityError } = await supabase
          .from('lead_activities')
          .insert({
            lead_id: lead.id,
            sdr_id: userProfile.id,
            sdr_name: userProfile.full_name,
            activity_type: 'qualificacao',
            description: activityDescription,
            result: comment.trim() || undefined
          });

        if (activityError) throw activityError;
      }

      toast({
        title: "Sucesso",
        description: "Status do lead atualizado com sucesso"
      });

      onUpdate();
      onClose();
    } catch (error: any) {
      console.error('Erro ao atualizar status:', error);
      toast({
        title: "Erro",
        description: error.message || "Erro ao atualizar status do lead",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const getCurrentStatusOption = () => {
    return statusOptions.find(option => option.value === selectedStatus);
  };

  if (!lead) return null;

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            Atualizar Status
          </DialogTitle>
          <DialogDescription>
            Atualize o status do lead: <strong>{lead.client_name}</strong>
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Status Atual */}
          <div className="flex items-center gap-2 text-sm">
            <span className="text-muted-foreground">Status atual:</span>
            <Badge variant="secondary" className="gap-1">
              <div className={`w-2 h-2 rounded-full ${statusOptions.find(s => s.value === (lead.pipeline_status || 'encaminhado'))?.color}`} />
              {statusOptions.find(s => s.value === (lead.pipeline_status || 'encaminhado'))?.label}
            </Badge>
          </div>

          {/* Novo Status */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Novo Status</label>
            <Select value={selectedStatus} onValueChange={setSelectedStatus}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione um status">
                  {getCurrentStatusOption() && (
                    <div className="flex items-center gap-2">
                      <div className={`w-2 h-2 rounded-full ${getCurrentStatusOption()?.color}`} />
                      {getCurrentStatusOption()?.label}
                    </div>
                  )}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                {statusOptions.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    <div className="flex items-center gap-2">
                      <div className={`w-2 h-2 rounded-full ${option.color}`} />
                      {option.label}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Números de Orçamento */}
          <MultipleBudgetNumberSelect
            value={budgetNumber}
            onChange={setBudgetNumber}
            maxSelections={2}
          />

          {/* Comentário */}
          <div className="space-y-2">
            <label className="text-sm font-medium flex items-center gap-2">
              <MessageSquare className="h-4 w-4" />
              Comentário sobre a negociação
            </label>
            <Textarea
              placeholder="Adicione detalhes sobre o contato, negociação ou qualquer observação relevante..."
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              rows={4}
              className="resize-none"
            />
            <p className="text-xs text-muted-foreground">
              Este comentário será registrado no histórico de atividades do lead.
            </p>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={loading}>
            Cancelar
          </Button>
          <Button 
            onClick={handleSave} 
            disabled={loading || !selectedStatus}
          >
            {loading ? 'Salvando...' : 'Salvar'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};