import React, { useMemo } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { useComercial } from '@/context/ComercialContext';
import { 
  Target, Receipt, Scale, UserPlus, 
  BarChart3, CalendarDays 
} from 'lucide-react';

function formatCurrency(v: number) {
  if (v >= 1_000_000) return `R$ ${(v / 1_000_000).toFixed(1)}M`;
  if (v >= 1_000) return `R$ ${(v / 1_000).toFixed(0)}K`;
  return `R$ ${v.toFixed(0)}`;
}

function formatWeight(v: number) {
  if (v >= 1_000_000) return `${(v / 1_000_000).toFixed(1)}M kg`;
  if (v >= 1_000) return `${(v / 1_000).toFixed(1)}t`;
  return `${v.toFixed(0)} kg`;
}

export function DashboardSideIndicators() {
  const { filteredData, kpis, metas } = useComercial();

  // Days remaining in month
  const daysInfo = useMemo(() => {
    const now = new Date();
    const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
    const remaining = lastDay - now.getDate();
    const elapsed = now.getDate();
    return { remaining, elapsed, total: lastDay };
  }, []);

  // Meta progress
  const metaProgress = useMemo(() => {
    const faturado = kpis.faturamento.valor;
    const meta = metas.metaMensal;
    if (!meta || meta === 0) return { percent: 0, faturado, meta };
    return { percent: Math.min((faturado / meta) * 100, 100), faturado, meta };
  }, [kpis.faturamento.valor, metas.metaMensal]);

  // Top classes by revenue
  const topClasses = useMemo(() => {
    const faturados = filteredData.filter(
      item => (item.situacao === 'Emitida' || item.situacao === 'Pedido') && item.faturamento_tipo === 1
    );
    const map: Record<string, number> = {};
    faturados.forEach(item => {
      const classe = item.classe || 'Outros';
      map[classe] = (map[classe] || 0) + (item.valor || 0);
    });
    const sorted = Object.entries(map)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 5);
    const max = sorted[0]?.[1] || 1;
    return sorted.map(([name, value]) => ({ name, value, percent: (value / max) * 100 }));
  }, [filteredData]);


  return (
    <div className="space-y-2">
      {/* Meta do Mês */}
      <Card>
        <CardContent className="p-3">
          <div className="flex items-center gap-1.5 mb-2">
            <Target className="h-4 w-4 text-primary" />
            <span className="text-xs font-semibold text-foreground">Meta do Mês</span>
            <span className="ml-auto text-[10px] text-muted-foreground flex items-center gap-0.5">
              <CalendarDays className="h-3 w-3" />
              {daysInfo.remaining}d restantes
            </span>
          </div>
          <div className="space-y-1.5">
            <Progress value={metaProgress.percent} className="h-2.5" />
            <div className="flex justify-between items-baseline">
              <span className="text-lg font-bold text-foreground">
                {metaProgress.percent.toFixed(0)}%
              </span>
              <span className="text-[10px] text-muted-foreground">
                {formatCurrency(metaProgress.faturado)} / {formatCurrency(metaProgress.meta)}
              </span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Ticket Médio + R$/kg side by side */}
      <div className="grid grid-cols-2 gap-2">
        <Card>
          <CardContent className="p-3">
            <div className="flex items-center gap-1 mb-1">
              <Receipt className="h-3.5 w-3.5 text-primary" />
              <span className="text-[10px] font-medium text-muted-foreground">Ticket Médio</span>
            </div>
            <span className="text-base font-bold text-foreground">
              {formatCurrency(kpis.faturamento.ticketMedio)}
            </span>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-3">
            <div className="flex items-center gap-1 mb-1">
              <Scale className="h-3.5 w-3.5 text-primary" />
              <span className="text-[10px] font-medium text-muted-foreground">R$/kg</span>
            </div>
            <span className="text-base font-bold text-foreground">
              R$ {kpis.faturamento.reaisPorKg.toFixed(2)}
            </span>
          </CardContent>
        </Card>
      </div>

      {/* Clientes Novos */}
      <Card>
        <CardContent className="p-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <UserPlus className="h-4 w-4 text-green-600 dark:text-green-400" />
              <span className="text-xs font-semibold text-foreground">Clientes Novos</span>
            </div>
            <span className="text-xl font-bold text-green-600 dark:text-green-400">
              {kpis.clientesNovos}
            </span>
          </div>
        </CardContent>
      </Card>

      {/* Top Classes */}
      <Card>
        <CardContent className="p-3">
          <div className="flex items-center gap-1.5 mb-2">
            <BarChart3 className="h-4 w-4 text-primary" />
            <span className="text-xs font-semibold text-foreground">Top Classes</span>
          </div>
          <div className="space-y-1.5">
            {topClasses.map(item => (
              <div key={item.name} className="space-y-0.5">
                <div className="flex justify-between items-baseline">
                  <span className="text-[10px] font-medium text-foreground truncate max-w-[60%]">
                    {item.name}
                  </span>
                  <span className="text-[10px] text-muted-foreground">
                    {formatCurrency(item.value)}
                  </span>
                </div>
                <div className="h-1.5 w-full bg-secondary rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-primary rounded-full transition-all" 
                    style={{ width: `${item.percent}%` }}
                  />
                </div>
              </div>
            ))}
            {topClasses.length === 0 && (
              <span className="text-[10px] text-muted-foreground">Sem dados</span>
            )}
          </div>
        </CardContent>
      </Card>

    </div>
  );
}
