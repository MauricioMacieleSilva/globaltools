import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { UserCheck, Send } from 'lucide-react';
import { Lead } from '@/context/PreVendasContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface SpecialistAssignmentDialogProps {
  open: boolean;
  onClose: () => void;
  lead: Lead | null;
  onAssign: (leadId: string, specialistId: string, briefing: string) => Promise<void>;
}

interface Specialist {
  id: string;
  full_name: string;
  department?: string;
  role: string;
}

export const SpecialistAssignmentDialog: React.FC<SpecialistAssignmentDialogProps> = ({
  open,
  onClose,
  lead,
  onAssign
}) => {
  const [specialists, setSpecialists] = useState<Specialist[]>([]);
  const [selectedSpecialist, setSelectedSpecialist] = useState('');
  const [briefing, setBriefing] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoadingSpecialists, setIsLoadingSpecialists] = useState(false);

  useEffect(() => {
    if (open) {
      loadSpecialists();
      if (lead) {
        generateBriefing(lead);
      }
    }
  }, [open, lead]);

  const loadSpecialists = async () => {
    setIsLoadingSpecialists(true);
    try {
      console.log('Loading specialists from Comercial department...');
      
      // Buscar usuários do departamento Comercial (incluindo variações case-insensitive)
      const { data: comercialDeptUsers, error: deptError } = await supabase
        .from('user_profiles')
        .select('id, full_name, department, role')
        .ilike('department', 'comercial%')
        .order('full_name');

      console.log('Comercial dept users query result:', { data: comercialDeptUsers, error: deptError });

      // Fallback: buscar usuários com role 'comercial' que não tenham departamento definido
      const { data: comercialRoleUsers, error: roleError } = await supabase
        .from('user_profiles')
        .select('id, full_name, department, role')
        .eq('role', 'comercial')
        .is('department', null)
        .order('full_name');

      console.log('Comercial role users query result:', { data: comercialRoleUsers, error: roleError });

      // Buscar admins (sempre incluir)
      const { data: adminUsers, error: adminError } = await supabase
        .from('user_profiles')
        .select('id, full_name, department, role')
        .eq('role', 'admin')
        .order('full_name');

      console.log('Admin users query result:', { data: adminUsers, error: adminError });

      if (deptError || roleError || adminError) {
        throw deptError || roleError || adminError;
      }

      // Combinar todos os resultados e remover duplicatas
      const allSpecialists = [
        ...(comercialDeptUsers || []),
        ...(comercialRoleUsers || []),
        ...(adminUsers || [])
      ];

      // Remover duplicatas baseado no ID
      const uniqueSpecialists = allSpecialists.filter((specialist, index, array) => 
        array.findIndex(s => s.id === specialist.id) === index
      );

      console.log('Combined unique specialists:', uniqueSpecialists);
      setSpecialists(uniqueSpecialists);
    } catch (error) {
      console.error('Erro ao carregar especialistas:', error);
      toast.error('Erro ao carregar lista de especialistas');
    } finally {
      setIsLoadingSpecialists(false);
    }
  };

  const generateBriefing = (lead: Lead) => {
    let briefing = `📋 LEAD QUALIFICADO PARA ATENDIMENTO\n\n`;
    
    briefing += `👤 IDENTIFICAÇÃO DO CLIENTE:\n`;
    briefing += `• Nome: ${lead.client_name}\n`;
    briefing += `• Código: ${lead.client_code}\n`;
    if (lead.contact_name) briefing += `• Contato: ${lead.contact_name}\n`;
    if (lead.contact_phone) briefing += `• Telefone: ${lead.contact_phone}\n`;
    if (lead.contact_email) briefing += `• Email: ${lead.contact_email}\n\n`;

    if (lead.business_type) {
      const businessType = lead.business_type === 'outros' && lead.business_type_custom 
        ? lead.business_type_custom 
        : lead.business_type;
      briefing += `🏢 TIPO DE NEGÓCIO:\n• ${businessType}\n\n`;
    }

    if (lead.product_interest) {
      const productInterest = lead.product_interest === 'outros' && lead.product_interest_custom
        ? lead.product_interest_custom
        : lead.product_interest.replace(/_/g, ' ');
      briefing += `📦 PRODUTO DE INTERESSE:\n• ${productInterest}\n\n`;
    }

    if (lead.estimated_volume || lead.purchase_frequency) {
      briefing += `📊 VOLUME E FREQUÊNCIA:\n`;
      if (lead.estimated_volume) briefing += `• Volume: ${lead.estimated_volume}\n`;
      if (lead.purchase_frequency) {
        const frequency = lead.purchase_frequency === 'outros' && lead.purchase_frequency_custom
          ? lead.purchase_frequency_custom
          : lead.purchase_frequency;
        briefing += `• Frequência: ${frequency}\n`;
      }
      briefing += '\n';
    }

    if (lead.current_pain) {
      briefing += `⚠️ DOR ATUAL:\n• ${lead.current_pain}\n\n`;
    }

    if (lead.opportunity_identified) {
      briefing += `🎯 OPORTUNIDADE IDENTIFICADA:\n• ${lead.opportunity_identified}\n\n`;
    }

    if (lead.entry_channel) {
      const entryChannel = lead.entry_channel === 'Outro' 
        ? 'Outro (não especificado)'
        : lead.entry_channel;
      briefing += `📍 CANAL DE ENTRADA:\n• ${entryChannel}\n\n`;
    }

    briefing += `✅ QUALIFICAÇÃO: ${lead.qualification_score || 0}/5 critérios atendidos\n`;
    briefing += `📅 Data de Qualificação: ${new Date().toLocaleDateString('pt-BR')}\n`;
    briefing += `👤 SDR Responsável: ${lead.sdr_name}\n\n`;

    if (lead.notes) {
      briefing += `📝 OBSERVAÇÕES ADICIONAIS:\n${lead.notes}\n\n`;
    }

    briefing += `🎯 PRÓXIMOS PASSOS SUGERIDOS:\n`;
    briefing += `• Entrar em contato em até 24h\n`;
    briefing += `• Agendar apresentação/visita técnica\n`;
    briefing += `• Elaborar proposta personalizada\n`;
    briefing += `• Definir cronograma de atendimento\n`;

    setBriefing(briefing);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!lead || !selectedSpecialist) return;

    setIsSubmitting(true);
    try {
      await onAssign(lead.id, selectedSpecialist, briefing);
      toast.success('Lead encaminhado ao especialista com sucesso!');
      onClose();
    } catch (error) {
      console.error('Erro ao encaminhar lead:', error);
      toast.error('Erro ao encaminhar lead');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!lead) return null;

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <UserCheck className="h-5 w-5" />
            Encaminhar Lead: {lead.client_name}
            <Badge variant="default" className="bg-green-500">
              {lead.qualification_score || 0}/5 critérios
            </Badge>
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Seleção do Especialista */}
          <div>
            <Label htmlFor="specialist">Especialista Responsável *</Label>
            <Select 
              value={selectedSpecialist} 
              onValueChange={setSelectedSpecialist}
              disabled={isLoadingSpecialists}
            >
              <SelectTrigger>
                <SelectValue placeholder={isLoadingSpecialists ? "Carregando especialistas..." : "Selecione um especialista"} />
              </SelectTrigger>
              <SelectContent>
                {specialists.length === 0 && !isLoadingSpecialists ? (
                  <div className="p-2 text-sm text-muted-foreground text-center">
                    Nenhum especialista encontrado no departamento Comercial
                  </div>
                ) : (
                  specialists.map((specialist) => (
                    <SelectItem key={specialist.id} value={specialist.id}>
                      <div className="flex items-center gap-2">
                        <span>{specialist.full_name}</span>
                        {specialist.department && (
                          <Badge variant="secondary" className="text-xs">
                            {specialist.department}
                          </Badge>
                        )}
                        <Badge variant="outline" className="text-xs">
                          {specialist.role === 'comercial' ? 'Comercial' : 'Admin'}
                        </Badge>
                      </div>
                    </SelectItem>
                  ))
                )}
              </SelectContent>
            </Select>
          </div>

          {/* Status de Qualificação */}
          <div className="bg-green-50 p-4 rounded-lg border border-green-200">
            <h3 className="font-medium text-green-800 mb-2">
              Lead Qualificado - Pronto para Atendimento Especializado
            </h3>
            <div className="text-sm text-green-700">
              • Score de qualificação: {lead.qualification_score || 0}/5
              • Status: {lead.status}
              • SDR: {lead.sdr_name}
            </div>
          </div>

          {/* Briefing */}
          <div>
            <Label htmlFor="briefing">Briefing para o Especialista</Label>
            <Textarea
              id="briefing"
              value={briefing}
              onChange={(e) => setBriefing(e.target.value)}
              rows={15}
              className="font-mono text-sm"
              placeholder="Briefing será gerado automaticamente..."
            />
          </div>

          <div className="flex justify-end gap-2 pt-4 border-t">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancelar
            </Button>
            <Button 
              type="submit" 
              disabled={isSubmitting || !selectedSpecialist}
            >
              <Send className="h-4 w-4 mr-2" />
              {isSubmitting ? 'Encaminhando...' : 'Encaminhar Lead'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};
