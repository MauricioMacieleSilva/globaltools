
import { AlertTriangle, Clock } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import type { CRMLead } from '@/pages/CRM';

interface PortfolioHealthProps {
  leads: CRMLead[];
  onLeadClick: (lead: CRMLead) => void;
}

export function PortfolioHealth({ leads, onLeadClick }: PortfolioHealthProps) {
  const now = new Date();
  const staleLeads = leads.filter(l => {
    if (l.status === 'perdido' || l.status === 'pedido_fechado') return false;
    const daysSince = Math.floor((now.getTime() - new Date(l.updated_at).getTime()) / 86400000);
    return daysSince >= 5;
  }).sort((a, b) => new Date(a.updated_at).getTime() - new Date(b.updated_at).getTime());

  const healthPercent = leads.length > 0
    ? Math.round(((leads.length - staleLeads.length) / leads.length) * 100)
    : 100;

  const healthColor = healthPercent >= 80 ? 'text-success' : healthPercent >= 50 ? 'text-warning' : 'text-destructive';

  return (
    <Card className="p-4 space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="p-2 rounded-lg bg-warning/10">
            <AlertTriangle className="h-4 w-4 text-warning" />
          </div>
          <h3 className="text-sm font-semibold text-foreground">Saúde da Carteira</h3>
        </div>
        <div className="flex items-center gap-2">
          <span className={`text-xl font-bold ${healthColor}`}>{healthPercent}%</span>
          <Badge variant="outline" className="text-[10px]">{staleLeads.length} parado(s)</Badge>
        </div>
      </div>

      {staleLeads.length > 0 && (
        <div className="space-y-1.5 max-h-[200px] overflow-y-auto">
          {staleLeads.slice(0, 10).map(lead => {
            const days = Math.floor((now.getTime() - new Date(lead.updated_at).getTime()) / 86400000);
            return (
              <div
                key={lead.id}
                className="flex items-center justify-between p-2 rounded-lg bg-accent/50 hover:bg-accent cursor-pointer transition-colors"
                onClick={() => onLeadClick(lead)}
              >
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-medium text-foreground truncate">{lead.client_name || lead.cliente_nome}</p>
                  <p className="text-[10px] text-muted-foreground">{lead.empresa || 'Sem empresa'}</p>
                </div>
                <div className="flex items-center gap-1 text-warning shrink-0">
                  <Clock className="h-3 w-3" />
                  <span className="text-xs font-medium">{days}d</span>
                </div>
              </div>
            );
          })}
          {staleLeads.length > 10 && (
            <p className="text-[10px] text-muted-foreground text-center">+{staleLeads.length - 10} mais</p>
          )}
        </div>
      )}

      {staleLeads.length === 0 && (
        <p className="text-xs text-muted-foreground text-center py-3">Todos os leads estão ativos 🎉</p>
      )}
    </Card>
  );
}
