
import { Phone, TrendingDown, Users, Calendar, Target } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';

interface FunnelStage {
  key: string;
  label: string;
  color: string;
  count: number;
  value: number;
}

interface CRMKPIsProps {
  todayContacts: number;
  dailyGoal: number;
  todayVisits: number;
  dailyVisitsGoal: number;
  funnelCounts: FunnelStage[];
  lostCount: number;
  lostValue: number;
  totalLeads: number;
  onLostClick: () => void;
}

export function CRMKPIs({ todayContacts, dailyGoal, todayVisits, dailyVisitsGoal, funnelCounts, lostCount, lostValue, totalLeads, onLostClick }: CRMKPIsProps) {
  const contactProgress = dailyGoal > 0 ? Math.min((todayContacts / dailyGoal) * 100, 100) : 0;
  const visitProgress = dailyVisitsGoal > 0 ? Math.min((todayVisits / dailyVisitsGoal) * 100, 100) : 0;
  const lostPercent = totalLeads > 0 ? ((lostCount / (totalLeads + lostCount)) * 100).toFixed(1) : '0';

  return (
    <div className="grid grid-cols-1 md:grid-cols-4 gap-3 sm:gap-4">
      {/* Progresso Diário */}
      <Card className="p-4 space-y-3 md:col-span-1">
        <div className="flex items-center gap-2 mb-1">
          <div className="p-2 rounded-lg bg-primary/10">
            <Target className="h-4 w-4 text-primary" />
          </div>
          <span className="text-sm font-medium text-muted-foreground">Progresso Diário</span>
        </div>
        <div className="space-y-2.5">
          <div>
            <div className="flex items-center justify-between mb-1">
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <Phone className="h-3 w-3" />
                <span>Contatos</span>
              </div>
              <span className="text-sm font-bold text-foreground">
                {todayContacts}{dailyGoal > 0 && <span className="text-xs font-normal text-muted-foreground">/{dailyGoal}</span>}
              </span>
            </div>
            {dailyGoal > 0 && <Progress value={contactProgress} className="h-1.5" />}
          </div>
          <div>
            <div className="flex items-center justify-between mb-1">
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <Calendar className="h-3 w-3" />
                <span>Visitas</span>
              </div>
              <span className="text-sm font-bold text-foreground">
                {todayVisits}{dailyVisitsGoal > 0 && <span className="text-xs font-normal text-muted-foreground">/{dailyVisitsGoal}</span>}
              </span>
            </div>
            {dailyVisitsGoal > 0 && <Progress value={visitProgress} className="h-1.5" />}
          </div>
        </div>
      </Card>

      {/* Mini Funil */}
      <Card className="p-4 md:col-span-2">
        <div className="flex items-center gap-2 mb-3">
          <div className="p-2 rounded-lg bg-primary/10">
            <Users className="h-4 w-4 text-primary" />
          </div>
          <span className="text-sm font-medium text-muted-foreground">Funil de Vendas</span>
          <Badge variant="secondary" className="text-[10px] ml-auto">{totalLeads} leads</Badge>
        </div>
        <div className="flex items-end gap-1 h-12">
          {funnelCounts.map((stage) => {
            const maxCount = Math.max(...funnelCounts.map(s => s.count), 1);
            const height = Math.max((stage.count / maxCount) * 100, 10);
            return (
              <div key={stage.key} className="flex-1 flex flex-col items-center gap-1">
                <span className="text-[10px] font-bold text-foreground">{stage.count}</span>
                <div
                  className="w-full rounded-t-sm transition-all"
                  style={{ height: `${height}%`, backgroundColor: stage.color, minHeight: '4px' }}
                />
              </div>
            );
          })}
        </div>
        <div className="flex gap-1 mt-1.5">
          {funnelCounts.map(stage => (
            <div key={stage.key} className="flex-1 text-center">
              <span className="text-[9px] text-muted-foreground truncate block">{stage.label.split('/')[0]}</span>
              {stage.value > 0 && (
                <span className="text-[8px] text-muted-foreground">R$ {(stage.value / 1000).toFixed(0)}k</span>
              )}
            </div>
          ))}
        </div>
      </Card>

      {/* Perdidos */}
      <Card className="p-4 cursor-pointer hover:shadow-md transition-shadow" onClick={onLostClick}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-lg bg-warning/10">
              <TrendingDown className="h-4 w-4 text-warning" />
            </div>
            <span className="text-sm font-medium text-muted-foreground">Perdidos</span>
          </div>
          <div className="text-right">
            <span className="text-2xl font-bold text-foreground">{lostCount}</span>
            <Badge variant="outline" className="ml-2 text-xs">{lostPercent}%</Badge>
          </div>
        </div>
        {lostValue > 0 && (
          <p className="text-xs text-muted-foreground mt-2">
            R$ {lostValue.toLocaleString('pt-BR', { minimumFractionDigits: 0 })} em valor estimado
          </p>
        )}
      </Card>
    </div>
  );
}
