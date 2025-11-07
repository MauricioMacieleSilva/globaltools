import React, { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/context/AuthContext';

interface LeadDispositionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  lead: {
    id: string;
    client_name: string;
    client_code: string;
  } | null;
  onDisposed: () => void;
}

const DISPOSITION_REASONS = [
  { value: 'nao_atende', label: 'Não atende' },
  { value: 'sem_retorno', label: 'Sem retorno' },
  { value: 'sem_interesse', label: 'Sem interesse' },
  { value: 'outro', label: 'Outro' }
];

export const LeadDispositionDialog: React.FC<LeadDispositionDialogProps> = ({
  open,
  onOpenChange,
  lead,
  onDisposed
}) => {
  const [selectedReason, setSelectedReason] = useState('');
  const [customReason, setCustomReason] = useState('');
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();
  const { userProfile } = useAuth();

  const handleDispose = async () => {
    if (!lead || !selectedReason || !userProfile) return;

    if (selectedReason === 'outro' && !customReason.trim()) {
      toast({
        title: "Erro",
        description: "Por favor, especifique o motivo quando selecionar 'Outro'",
        variant: "destructive"
      });
      return;
    }

    setLoading(true);

    try {
      // Criar registro de disposição
      const { error: dispositionError } = await supabase
        .from('lead_dispositions')
        .insert({
          lead_id: lead.id,
          lead_client_name: lead.client_name,
          lead_client_code: lead.client_code,
          reason: selectedReason,
          custom_reason: selectedReason === 'outro' ? customReason : null,
          disposed_by: userProfile.id,
          disposed_by_name: userProfile.full_name
        });

      if (dispositionError) throw dispositionError;

      // Atualizar status do lead para 'perdido'
      const { error: updateError } = await supabase
        .from('leads')
        .update({
          status: 'perdido',
          updated_at: new Date().toISOString()
        })
        .eq('id', lead.id);

      if (updateError) throw updateError;

      toast({
        title: "Sucesso",
        description: "Lead foi descartado com sucesso"
      });

      // Reset form
      setSelectedReason('');
      setCustomReason('');
      onOpenChange(false);
      onDisposed();

    } catch (error) {
      console.error('Erro ao descartar lead:', error);
      toast({
        title: "Erro",
        description: "Ocorreu um erro ao descartar o lead",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setSelectedReason('');
    setCustomReason('');
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Descartar Lead</DialogTitle>
          <DialogDescription>
            {lead && (
              <>
                Descartar o lead <strong>{lead.client_name}</strong> ({lead.client_code}).
                <br />
                Por favor, selecione o motivo:
              </>
            )}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <Label className="text-base font-medium">Motivo do descarte</Label>
            <RadioGroup
              value={selectedReason}
              onValueChange={setSelectedReason}
              className="mt-2"
            >
              {DISPOSITION_REASONS.map((reason) => (
                <div key={reason.value} className="flex items-center space-x-2">
                  <RadioGroupItem value={reason.value} id={reason.value} />
                  <Label htmlFor={reason.value} className="font-normal">
                    {reason.label}
                  </Label>
                </div>
              ))}
            </RadioGroup>
          </div>

          {selectedReason === 'outro' && (
            <div>
              <Label htmlFor="custom-reason">Especifique o motivo</Label>
              <Textarea
                id="custom-reason"
                placeholder="Descreva o motivo específico..."
                value={customReason}
                onChange={(e) => setCustomReason(e.target.value)}
                className="mt-1"
                rows={3}
              />
            </div>
          )}
        </div>

        <DialogFooter className="gap-2">
          <Button
            variant="outline"
            onClick={handleClose}
            disabled={loading}
          >
            Cancelar
          </Button>
          <Button
            onClick={handleDispose}
            disabled={!selectedReason || loading}
            variant="destructive"
            className="bg-red-600 hover:bg-red-700"
          >
            {loading ? "Descartando..." : "Descartar Lead"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};