import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Target, Plus, Pencil, Copy, Calendar, TrendingUp, HelpCircle, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { format, subMonths, addMonths } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface MonthGoal {
  monthYear: string;
  displayName: string;
  monthlyGoal: number | null;
  dailyGoal: number | null;
  businessDays: number | null;
  hasData: boolean;
}

// Calcular dias úteis padrão (seg-sex) de um mês
const calcularDiasUteisPadrao = (year: number, month: number): number => {
  const firstDay = new Date(year, month - 1, 1);
  const lastDay = new Date(year, month, 0);
  let diasUteis = 0;
  
  for (let d = new Date(firstDay); d <= lastDay; d.setDate(d.getDate() + 1)) {
    const dayOfWeek = d.getDay();
    if (dayOfWeek !== 0 && dayOfWeek !== 6) {
      diasUteis++;
    }
  }
  return diasUteis;
};

export const GoalsManagement: React.FC = () => {
  const [goals, setGoals] = useState<MonthGoal[]>([]);
  const [loading, setLoading] = useState(true);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [selectedMonth, setSelectedMonth] = useState<MonthGoal | null>(null);
  const [saving, setSaving] = useState(false);
  
  // Form state
  const [metaMensal, setMetaMensal] = useState('');
  const [diasUteis, setDiasUteis] = useState('');
  const [metaDiaria, setMetaDiaria] = useState('');
  
  const { toast } = useToast();

  // Gerar lista dos últimos 12 meses + próximos 3 meses
  const generateMonthsList = useCallback((): string[] => {
    const months: string[] = [];
    const now = new Date();
    
    // 3 meses futuros
    for (let i = 3; i > 0; i--) {
      const date = addMonths(now, i);
      months.push(format(date, 'yyyy-MM'));
    }
    
    // Mês atual
    months.push(format(now, 'yyyy-MM'));
    
    // 11 meses anteriores
    for (let i = 1; i <= 11; i++) {
      const date = subMonths(now, i);
      months.push(format(date, 'yyyy-MM'));
    }
    
    return months;
  }, []);

  const loadGoals = useCallback(async () => {
    setLoading(true);
    try {
      const monthsList = generateMonthsList();
      
      const { data, error } = await supabase
        .from('admin_goals')
        .select('month_year, monthly_revenue_goal, daily_revenue_goal, business_days')
        .in('month_year', monthsList);

      if (error) throw error;

      const goalsMap = new Map(data?.map(g => [g.month_year, g]) || []);

      const formattedGoals: MonthGoal[] = monthsList.map(monthYear => {
        const [year, month] = monthYear.split('-').map(Number);
        const date = new Date(year, month - 1, 1);
        const goalData = goalsMap.get(monthYear);
        
        return {
          monthYear,
          displayName: format(date, 'MMMM yyyy', { locale: ptBR }),
          monthlyGoal: goalData?.monthly_revenue_goal || null,
          dailyGoal: goalData?.daily_revenue_goal || null,
          businessDays: goalData?.business_days || null,
          hasData: !!goalData
        };
      });

      setGoals(formattedGoals);
    } catch (error) {
      console.error('Erro ao carregar metas:', error);
      toast({
        title: 'Erro',
        description: 'Não foi possível carregar as metas.',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  }, [generateMonthsList, toast]);

  useEffect(() => {
    loadGoals();
  }, [loadGoals]);

  // Calcular meta diária automaticamente
  useEffect(() => {
    const metaMensalNum = parseFloat(metaMensal.replace(/\./g, '').replace(',', '.')) || 0;
    const diasUteisNum = parseInt(diasUteis) || 0;
    
    if (metaMensalNum > 0 && diasUteisNum > 0) {
      const metaDiariaCalculada = Math.round(metaMensalNum / diasUteisNum);
      setMetaDiaria(metaDiariaCalculada.toString());
    } else {
      setMetaDiaria('');
    }
  }, [metaMensal, diasUteis]);

  const handleEdit = (goal: MonthGoal) => {
    setSelectedMonth(goal);
    
    // Preencher formulário
    if (goal.monthlyGoal) {
      setMetaMensal(goal.monthlyGoal.toString());
    } else {
      setMetaMensal('2000000');
    }
    
    if (goal.businessDays) {
      setDiasUteis(goal.businessDays.toString());
    } else {
      const [year, month] = goal.monthYear.split('-').map(Number);
      setDiasUteis(calcularDiasUteisPadrao(year, month).toString());
    }
    
    setEditDialogOpen(true);
  };

  const handleCopyFromPrevious = (goal: MonthGoal) => {
    const currentIndex = goals.findIndex(g => g.monthYear === goal.monthYear);
    const previousGoal = goals[currentIndex + 1]; // +1 porque a lista está ordenada do futuro para o passado
    
    if (previousGoal && previousGoal.hasData) {
      setSelectedMonth(goal);
      setMetaMensal(previousGoal.monthlyGoal?.toString() || '2000000');
      
      const [year, month] = goal.monthYear.split('-').map(Number);
      setDiasUteis(calcularDiasUteisPadrao(year, month).toString());
      
      setEditDialogOpen(true);
      
      toast({
        title: 'Meta copiada',
        description: `Meta de ${previousGoal.displayName} copiada. Ajuste os dias úteis se necessário.`
      });
    } else {
      toast({
        title: 'Sem meta anterior',
        description: 'O mês anterior não possui meta configurada.',
        variant: 'destructive'
      });
    }
  };

  const handleSave = async () => {
    if (!selectedMonth) return;
    
    setSaving(true);
    try {
      const metaMensalNum = parseFloat(metaMensal.replace(/\./g, '').replace(',', '.')) || 0;
      const diasUteisNum = parseInt(diasUteis) || 0;
      const metaDiariaNum = parseInt(metaDiaria) || 0;

      if (metaMensalNum <= 0) {
        toast({
          title: 'Erro',
          description: 'Informe uma meta mensal válida.',
          variant: 'destructive'
        });
        return;
      }

      if (diasUteisNum < 1 || diasUteisNum > 31) {
        toast({
          title: 'Erro',
          description: 'Dias úteis deve ser entre 1 e 31.',
          variant: 'destructive'
        });
        return;
      }

      const { data: existing } = await supabase
        .from('admin_goals')
        .select('id')
        .eq('month_year', selectedMonth.monthYear)
        .maybeSingle();

      if (existing) {
        const { error } = await supabase
          .from('admin_goals')
          .update({
            monthly_revenue_goal: metaMensalNum,
            daily_revenue_goal: metaDiariaNum,
            business_days: diasUteisNum,
            updated_at: new Date().toISOString()
          })
          .eq('month_year', selectedMonth.monthYear);

        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('admin_goals')
          .insert({
            month_year: selectedMonth.monthYear,
            monthly_revenue_goal: metaMensalNum,
            daily_revenue_goal: metaDiariaNum,
            business_days: diasUteisNum
          });

        if (error) throw error;
      }

      toast({
        title: 'Meta salva',
        description: `Meta de ${selectedMonth.displayName} atualizada com sucesso.`
      });

      setEditDialogOpen(false);
      loadGoals();
    } catch (error) {
      console.error('Erro ao salvar meta:', error);
      toast({
        title: 'Erro',
        description: 'Não foi possível salvar a meta.',
        variant: 'destructive'
      });
    } finally {
      setSaving(false);
    }
  };

  const formatCurrency = (value: number | null): string => {
    if (value === null) return '-';
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(value);
  };

  const formatInputCurrency = (value: string): string => {
    const numericValue = value.replace(/\D/g, '');
    if (!numericValue) return '';
    return new Intl.NumberFormat('pt-BR').format(parseInt(numericValue));
  };

  const handleMetaMensalChange = (value: string) => {
    const numericValue = value.replace(/\D/g, '');
    setMetaMensal(numericValue);
  };

  const isCurrentMonth = (monthYear: string): boolean => {
    return monthYear === format(new Date(), 'yyyy-MM');
  };

  const isFutureMonth = (monthYear: string): boolean => {
    const [year, month] = monthYear.split('-').map(Number);
    const monthDate = new Date(year, month - 1, 1);
    const now = new Date();
    return monthDate > new Date(now.getFullYear(), now.getMonth(), 1);
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Target className="h-5 w-5 text-primary" />
            <CardTitle>Metas de Faturamento por Mês</CardTitle>
          </div>
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="ghost" size="icon">
                  <HelpCircle className="h-4 w-4 text-muted-foreground" />
                </Button>
              </TooltipTrigger>
              <TooltipContent className="max-w-xs">
                <p>Configure as metas mensais de faturamento. A meta diária é calculada automaticamente dividindo a meta mensal pelos dias úteis.</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
        <CardDescription>
          Gerencie as metas de faturamento para cada mês. Clique em um mês para editar.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[200px]">Mês</TableHead>
                  <TableHead className="text-right">Meta Mensal</TableHead>
                  <TableHead className="text-center">Dias Úteis</TableHead>
                  <TableHead className="text-right">Meta Diária</TableHead>
                  <TableHead className="text-center w-[120px]">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {goals.map((goal) => (
                  <TableRow 
                    key={goal.monthYear}
                    className={isCurrentMonth(goal.monthYear) ? 'bg-primary/5' : ''}
                  >
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Calendar className="h-4 w-4 text-muted-foreground" />
                        <span className="font-medium capitalize">{goal.displayName}</span>
                        {isCurrentMonth(goal.monthYear) && (
                          <Badge variant="default" className="text-xs">Atual</Badge>
                        )}
                        {isFutureMonth(goal.monthYear) && (
                          <Badge variant="secondary" className="text-xs">Futuro</Badge>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="text-right font-mono">
                      {goal.hasData ? (
                        <span className="text-foreground">{formatCurrency(goal.monthlyGoal)}</span>
                      ) : (
                        <span className="text-muted-foreground italic">Não definida</span>
                      )}
                    </TableCell>
                    <TableCell className="text-center">
                      {goal.businessDays || '-'}
                    </TableCell>
                    <TableCell className="text-right font-mono">
                      {goal.hasData ? (
                        <span className="text-muted-foreground">{formatCurrency(goal.dailyGoal)}</span>
                      ) : (
                        '-'
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center justify-center gap-1">
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => handleEdit(goal)}
                              >
                                {goal.hasData ? (
                                  <Pencil className="h-4 w-4" />
                                ) : (
                                  <Plus className="h-4 w-4" />
                                )}
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>
                              {goal.hasData ? 'Editar meta' : 'Definir meta'}
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                        
                        {!goal.hasData && (
                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => handleCopyFromPrevious(goal)}
                                >
                                  <Copy className="h-4 w-4" />
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>
                                Copiar do mês anterior
                              </TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}

        {/* Dialog de edição */}
        <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5" />
                {selectedMonth?.hasData ? 'Editar Meta' : 'Definir Meta'} - {selectedMonth?.displayName}
              </DialogTitle>
            </DialogHeader>
            
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="meta-mensal">Meta Mensal (R$)</Label>
                <Input
                  id="meta-mensal"
                  placeholder="2.000.000"
                  value={formatInputCurrency(metaMensal)}
                  onChange={(e) => handleMetaMensalChange(e.target.value)}
                />
              </div>
              
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Label htmlFor="dias-uteis">Dias Úteis do Mês</Label>
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <HelpCircle className="h-3.5 w-3.5 text-muted-foreground cursor-help" />
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>Número de dias úteis para cálculo da meta diária</p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </div>
                <Input
                  id="dias-uteis"
                  type="number"
                  min="1"
                  max="31"
                  placeholder="22"
                  value={diasUteis}
                  onChange={(e) => setDiasUteis(e.target.value)}
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="meta-diaria">Meta Diária (calculada automaticamente)</Label>
                <Input
                  id="meta-diaria"
                  value={metaDiaria ? formatInputCurrency(metaDiaria) : '-'}
                  disabled
                  className="bg-muted"
                />
                <p className="text-xs text-muted-foreground">
                  Meta Mensal ÷ Dias Úteis = Meta Diária
                </p>
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setEditDialogOpen(false)}>
                Cancelar
              </Button>
              <Button onClick={handleSave} disabled={saving}>
                {saving ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Salvando...
                  </>
                ) : (
                  'Salvar'
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  );
};
