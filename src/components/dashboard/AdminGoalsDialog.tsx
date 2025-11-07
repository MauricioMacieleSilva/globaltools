import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface AdminGoal {
  id?: string;
  month_year: string;
  daily_contacts_goal: number;
  monthly_contacts_goal: number;
  qualified_leads_goal: number;
  forwarded_leads_goal: number;
  conversion_goal_percent: number;
}

interface AdminGoalsDialogProps {
  open: boolean;
  onClose: () => void;
  onSave: () => void;
}

export const AdminGoalsDialog: React.FC<AdminGoalsDialogProps> = ({ open, onClose, onSave }) => {
  const [formData, setFormData] = useState<AdminGoal>({
    month_year: new Date().toISOString().slice(0, 7),
    daily_contacts_goal: 40,
    monthly_contacts_goal: 1200,
    qualified_leads_goal: 30,
    forwarded_leads_goal: 25,
    conversion_goal_percent: 25
  });
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    if (open) {
      loadCurrentGoals();
    }
  }, [open]);

  const loadCurrentGoals = async () => {
    try {
      const currentMonth = new Date().toISOString().slice(0, 7);
      const { data, error } = await supabase
        .from('admin_goals')
        .select('*')
        .eq('month_year', currentMonth)
        .maybeSingle();

      if (error) throw error;

      if (data) {
        setFormData(data);
      }
    } catch (error) {
      console.error('Erro ao carregar metas:', error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const { error } = formData.id
        ? await supabase
            .from('admin_goals')
            .update({
              daily_contacts_goal: formData.daily_contacts_goal,
              monthly_contacts_goal: formData.monthly_contacts_goal,
              qualified_leads_goal: formData.qualified_leads_goal,
              forwarded_leads_goal: formData.forwarded_leads_goal,
              conversion_goal_percent: formData.conversion_goal_percent
            })
            .eq('id', formData.id)
        : await supabase
            .from('admin_goals')
            .insert([formData]);

      if (error) throw error;

      toast({
        title: "Metas salvas com sucesso!",
        description: "As metas administrativas foram atualizadas."
      });

      onSave();
      onClose();
    } catch (error) {
      console.error('Erro ao salvar metas:', error);
      toast({
        title: "Erro ao salvar metas",
        description: "Não foi possível salvar as metas. Tente novamente.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Configurar Metas Administrativas</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="month_year">Mês/Ano</Label>
            <Input
              id="month_year"
              type="month"
              value={formData.month_year}
              onChange={(e) => setFormData({ ...formData, month_year: e.target.value })}
              required
            />
          </div>
          <div>
            <Label htmlFor="daily_contacts_goal">Meta de Contatos Diários</Label>
            <Input
              id="daily_contacts_goal"
              type="number"
              value={formData.daily_contacts_goal}
              onChange={(e) => setFormData({ ...formData, daily_contacts_goal: parseInt(e.target.value) })}
              required
              min="1"
            />
          </div>
          <div>
            <Label htmlFor="monthly_contacts_goal">Meta de Contatos Mensais</Label>
            <Input
              id="monthly_contacts_goal"
              type="number"
              value={formData.monthly_contacts_goal}
              onChange={(e) => setFormData({ ...formData, monthly_contacts_goal: parseInt(e.target.value) })}
              required
              min="1"
            />
          </div>
          <div>
            <Label htmlFor="qualified_leads_goal">Meta de Leads Qualificados</Label>
            <Input
              id="qualified_leads_goal"
              type="number"
              value={formData.qualified_leads_goal}
              onChange={(e) => setFormData({ ...formData, qualified_leads_goal: parseInt(e.target.value) })}
              required
              min="1"
            />
          </div>
          <div>
            <Label htmlFor="forwarded_leads_goal">Meta de Leads Encaminhados</Label>
            <Input
              id="forwarded_leads_goal"
              type="number"
              value={formData.forwarded_leads_goal}
              onChange={(e) => setFormData({ ...formData, forwarded_leads_goal: parseInt(e.target.value) })}
              required
              min="1"
            />
          </div>
          <div>
            <Label htmlFor="conversion_goal_percent">Meta de Conversão (%)</Label>
            <Input
              id="conversion_goal_percent"
              type="number"
              step="0.1"
              value={formData.conversion_goal_percent}
              onChange={(e) => setFormData({ ...formData, conversion_goal_percent: parseFloat(e.target.value) })}
              required
              min="0"
              max="100"
            />
          </div>
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancelar
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? 'Salvando...' : 'Salvar Metas'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};