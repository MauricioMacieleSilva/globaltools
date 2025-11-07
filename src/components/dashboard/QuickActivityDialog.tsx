import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';

interface QuickActivityDialogProps {
  open: boolean;
  onClose: () => void;
  lead?: any;
  onSave: (activityData: any) => Promise<void>;
}

export const QuickActivityDialog: React.FC<QuickActivityDialogProps> = ({ open, onClose, lead, onSave }) => {
  const [formData, setFormData] = useState({
    activity_type: 'contato_inicial',
    description: '',
    conversation_started: null as boolean | null
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!lead || isSubmitting) return;
    
    // Validar se conversation_started foi selecionado
    if (formData.conversation_started === null) {
      return; // O required do Select já vai mostrar o erro
    }
    
    setIsSubmitting(true);
    try {
      await onSave({
        ...formData,
        lead_id: lead.id
      });
      onClose();
      setFormData({
        activity_type: 'contato_inicial',
        description: '',
        conversation_started: null
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Registrar Atividade - {lead?.client_name}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="activity_type">Tipo de Atividade</Label>
            <Select 
              value={formData.activity_type} 
              onValueChange={(value) => setFormData({ ...formData, activity_type: value })}
              disabled={isSubmitting}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="contato_inicial">Contato Inicial</SelectItem>
                <SelectItem value="resposta_recebida">Resposta Recebida</SelectItem>
                <SelectItem value="qualificacao">Qualificação</SelectItem>
                <SelectItem value="encaminhamento">Encaminhamento</SelectItem>
                <SelectItem value="follow_up">Follow-up</SelectItem>
                <SelectItem value="nota">Nota</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label htmlFor="description">Descrição</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="Descreva a atividade realizada..."
              required
              rows={3}
              disabled={isSubmitting}
            />
          </div>
          <div>
            <Label htmlFor="conversation_started">A conversa foi iniciada? *</Label>
            <Select 
              value={formData.conversation_started === null ? "" : formData.conversation_started.toString()} 
              onValueChange={(value) => setFormData({ ...formData, conversation_started: value === "true" })}
              required
              disabled={isSubmitting}
            >
              <SelectTrigger>
                <SelectValue placeholder="Selecione uma opção" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="true">Sim</SelectItem>
                <SelectItem value="false">Não</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={onClose} disabled={isSubmitting}>
              Cancelar
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? "Salvando..." : "Registrar"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};