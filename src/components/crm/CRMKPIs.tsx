
import { Phone, TrendingDown, Users } from 'lucide-react';
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
  funnelCounts: FunnelStage[];
  lostCount: number;
  lostValue: number;
  totalLeads: number;
  onLostClick: () => void;
}

export function CRMKPIs({ todayContacts, dailyGoal, funnelCounts, lostCount, lostValue, totalLeads, onLostClick }: CRMKPIsProps) {
  const contactProgress = dailyGoal > 0 ? Math.min((todayContacts / dailyGoal) * 100, 100) : 0;
  const lostPercent = totalLeads > 0 ? ((lostCount / (totalLeads + lostCount)) * 100).toFixed(1) : '0';

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-3 sm:gap-4">
      {/* Contatos Diários */}
      <Card className="p-4 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-lg bg-primary/10">
              <Phone className="h-4 w-4 text-primary" />
            </div>
            <span className="text-sm font-medium text-muted-foreground">Contatos Hoje</span>
          </div>
          <span className="text-2xl font-bold text-foreground">
            {todayContacts}
            {dailyGoal > 0 && <span className="text-sm font-normal text-muted-foreground">/{dailyGoal}</span>}
          </span>
        </div>
        {dailyGoal > 0 && (
          <Progress value={contactProgress} className="h-2" />
        )}
      </Card>

      {/* Mini Funil */}
      <Card className="p-4">
        <div className="flex items-center gap-2 mb-3">
          <div className="p-2 rounded-lg bg-primary/10">
            <Users className="h-4 w-4 text-primary" />
          </div>
          <span className="text-sm font-medium text-muted-foreground">Funil de Vendas</span>
        </div>
        <div className="flex items-end gap-1 h-10">
          {funnelCounts.map((stage, i) => {
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
        <div className="flex gap-1 mt-1">
          {funnelCounts.map(stage => (
            <span key={stage.key} className="flex-1 text-[9px] text-muted-foreground text-center truncate">
              {stage.label.split('/')[0]}
            </span>
          ))}
        </div>
      </Card>

      {/* Perdidos */}
      <Card
        className="p-4 cursor-pointer hover:shadow-md transition-shadow"
        onClick={onLostClick}
      >
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
