import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/context/AuthContext';
import { toast } from '@/hooks/use-toast';
import { Info } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

interface MetasDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (metas: { metaMensal: number; metaDiaria: number }) => void;
  metaAtual: { metaMensal: number; metaDiaria: number };
}

// Função para calcular dias úteis automáticos do mês atual (seg-sex)
function calcularDiasUteisPadrao(): number {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth();
  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);
  
  let diasUteis = 0;
  const current = new Date(firstDay);
  
  while (current <= lastDay) {
    const diaSemana = current.getDay();
    if (diaSemana !== 0 && diaSemana !== 6) {
      diasUteis++;
    }
    current.setDate(current.getDate() + 1);
  }
  
  return diasUteis;
}

export function MetasDialog({ isOpen, onClose, onSave, metaAtual }: MetasDialogProps) {
  const { userProfile } = useAuth();
  const [isAdmin, setIsAdmin] = useState(false);
  const [metaMensal, setMetaMensal] = useState(metaAtual.metaMensal.toString());
  const [metaDiaria, setMetaDiaria] = useState(metaAtual.metaDiaria.toString());
  const [diasUteis, setDiasUteis] = useState<string>('');
  const [loading, setLoading] = useState(false);

  // Verificar se o usuário é admin
  useEffect(() => {
    const checkAdminRole = async () => {
      if (!userProfile?.id) return;
      
      try {
        const { data, error } = await supabase
          .from('user_roles')
          .select('role')
          .eq('user_id', userProfile.id)
          .single();
        
        if (!error && data) {
          setIsAdmin(data.role === 'admin');
        }
      } catch (error) {
        console.error('Erro ao verificar role:', error);
      }
    };
    
    checkAdminRole();
  }, [userProfile]);

  // Carregar dados atuais incluindo dias úteis
  useEffect(() => {
    const loadCurrentGoals = async () => {
      const currentMonth = new Date().toISOString().slice(0, 7);
      const { data } = await supabase
        .from('admin_goals')
        .select('business_days')
        .eq('month_year', currentMonth)
        .maybeSingle();
      
      if (data?.business_days) {
        setDiasUteis(data.business_days.toString());
      } else {
        setDiasUteis(calcularDiasUteisPadrao().toString());
      }
    };
    
    if (isOpen) {
      loadCurrentGoals();
    }
  }, [isOpen]);

  useEffect(() => {
    setMetaMensal(metaAtual.metaMensal.toString());
    setMetaDiaria(metaAtual.metaDiaria.toString());
  }, [metaAtual]);

  const handleSave = async () => {
    const metaMensalNum = parseFloat(metaMensal) || 2000000;
    const metaDiariaNum = parseFloat(metaDiaria) || 100000;
    const diasUteisNum = parseInt(diasUteis) || null;
    
    // Validar dias úteis
    if (diasUteisNum !== null && (diasUteisNum < 1 || diasUteisNum > 31)) {
      toast({
        title: "Valor inválido",
        description: "Dias úteis deve estar entre 1 e 31.",
        variant: "destructive"
      });
      return;
    }
    
    if (!isAdmin) {
      toast({
        title: "Acesso negado",
        description: "Apenas administradores podem alterar as metas.",
        variant: "destructive"
      });
      return;
    }

    setLoading(true);
    try {
      const currentMonth = new Date().toISOString().slice(0, 7);
      
      // Buscar meta existente para o mês atual
      const { data: existingGoal } = await supabase
        .from('admin_goals')
        .select('id')
        .eq('month_year', currentMonth)
        .maybeSingle();

      if (existingGoal) {
        // Atualizar meta existente
        const { error } = await supabase
          .from('admin_goals')
          .update({
            monthly_revenue_goal: metaMensalNum,
            daily_revenue_goal: metaDiariaNum,
            business_days: diasUteisNum
          })
          .eq('id', existingGoal.id);

        if (error) throw error;
      } else {
        // Criar nova meta
        const { error } = await supabase
          .from('admin_goals')
          .insert({
            month_year: currentMonth,
            monthly_revenue_goal: metaMensalNum,
            daily_revenue_goal: metaDiariaNum,
            business_days: diasUteisNum
          });

        if (error) throw error;
      }

      onSave({
        metaMensal: metaMensalNum,
        metaDiaria: metaDiariaNum
      });

      toast({
        title: "Metas atualizadas",
        description: "As metas de faturamento foram salvas com sucesso."
      });

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

  const formatCurrency = (value: string) => {
    const num = parseFloat(value.replace(/[^\d]/g, ''));
    if (isNaN(num)) return '';
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(num);
  };

  const handleMetaMensalChange = (value: string) => {
    const numericValue = value.replace(/[^\d]/g, '');
    setMetaMensal(numericValue);
  };

  const handleMetaDiariaChange = (value: string) => {
    const numericValue = value.replace(/[^\d]/g, '');
    setMetaDiaria(numericValue);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Configurar Metas de Faturamento</DialogTitle>
          {!isAdmin && (
            <p className="text-sm text-muted-foreground mt-2">
              Apenas administradores podem alterar as metas de faturamento.
            </p>
          )}
        </DialogHeader>
        
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="meta-mensal">Meta Mensal</Label>
            <Input
              id="meta-mensal"
              placeholder="2.000.000"
              value={formatCurrency(metaMensal)}
              onChange={(e) => handleMetaMensalChange(e.target.value)}
              disabled={!isAdmin}
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="meta-diaria">Meta Diária</Label>
            <Input
              id="meta-diaria"
              placeholder="100.000"
              value={formatCurrency(metaDiaria)}
              onChange={(e) => handleMetaDiariaChange(e.target.value)}
              disabled={!isAdmin}
            />
          </div>

          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Label htmlFor="dias-uteis">
                Dias Úteis do Mês ({new Date().toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })})
              </Label>
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Info className="h-4 w-4 text-muted-foreground cursor-help" />
                  </TooltipTrigger>
                  <TooltipContent className="max-w-xs">
                    <p>Informe a quantidade de dias úteis do mês considerando feriados. Este valor é usado nos relatórios por email para calcular a média diária.</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>
            <Input
              id="dias-uteis"
              type="number"
              min="1"
              max="31"
              placeholder={calcularDiasUteisPadrao().toString()}
              value={diasUteis}
              onChange={(e) => setDiasUteis(e.target.value)}
              disabled={!isAdmin}
            />
            <p className="text-xs text-muted-foreground">
              Valor automático (seg-sex): {calcularDiasUteisPadrao()} dias
            </p>
          </div>
        </div>
        
        <div className="flex gap-2 justify-end">
          <Button variant="outline" onClick={onClose}>
            {isAdmin ? 'Cancelar' : 'Fechar'}
          </Button>
          {isAdmin && (
            <Button onClick={handleSave} disabled={loading}>
              {loading ? 'Salvando...' : 'Salvar'}
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}