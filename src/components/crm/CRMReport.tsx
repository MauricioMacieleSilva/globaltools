
import { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { 
  DollarSign, FileText, Eye, Clock, AlertTriangle, 
  TrendingUp, Users, CheckCircle, PhoneOff, CalendarClock,
  BarChart3
} from 'lucide-react';
import { cn } from '@/lib/utils';
import type { CRMLead } from '@/pages/CRM';
import { CRM_STAGES } from '@/pages/CRM';
import { differenceInHours, differenceInDays, format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface CRMReportProps {
  leads: CRMLead[];
  onLeadClick: (lead: CRMLead) => void;
  followUps: { lead_id: string; data_agendada: string; titulo: string; user_id: string }[];
}

export function CRMReport({ leads, onLeadClick, followUps }: CRMReportProps) {
  const now = new Date();

  // Active leads (not lost)
  const activeLeads = useMemo(() => leads.filter(l => l.status !== 'perdido'), [leads]);

  // Proposals
  const propostas = useMemo(() => activeLeads.filter(l => l.status === 'proposta'), [activeLeads]);
  const propostasValue = useMemo(() => propostas.reduce((s, l) => s + (l.valor_estimado || 0), 0), [propostas]);

  // Opportunities (visita_reuniao)
  const oportunidades = useMemo(() => activeLeads.filter(l => l.status === 'visita_reuniao'), [activeLeads]);
  const oportunidadesValue = useMemo(() => oportunidades.reduce((s, l) => s + (l.valor_estimado || 0), 0), [oportunidades]);

  // Closed deals
  const pedidosFechados = useMemo(() => activeLeads.filter(l => l.status === 'pedido_fechado'), [activeLeads]);
  const pedidosFechadosValue = useMemo(() => pedidosFechados.reduce((s, l) => s + (l.valor_estimado || 0), 0), [pedidosFechados]);

  // Leads in follow-up
  const leadIdsWithFollowUp = useMemo(() => {
    const activeFollowUps = followUps.filter(fu => !fu.data_agendada || new Date(fu.data_agendada) >= new Date(now.toDateString()));
    return new Set(activeFollowUps.map(fu => fu.lead_id));
  }, [followUps, now]);
  const leadsInFollowUp = useMemo(() => activeLeads.filter(l => leadIdsWithFollowUp.has(l.id)), [activeLeads, leadIdsWithFollowUp]);

  // Unattended leads (no update in more than 24h, excluding pedido_fechado)
  const unattendedLeads = useMemo(() => {
    return activeLeads.filter(l => {
      if (l.status === 'pedido_fechado') return false;
      const lastUpdate = new Date(l.updated_at);
      return differenceInHours(now, lastUpdate) > 24;
    }).sort((a, b) => new Date(a.updated_at).getTime() - new Date(b.updated_at).getTime());
  }, [activeLeads, now]);

  // Leads without any contact (still in 'lead' status)
  const newLeadsNoContact = useMemo(() => activeLeads.filter(l => l.status === 'lead'), [activeLeads]);

  // Pipeline total value
  const pipelineTotal = useMemo(() => activeLeads.reduce((s, l) => s + (l.valor_estimado || 0), 0), [activeLeads]);

  // Lost leads
  const lostLeads = useMemo(() => leads.filter(l => l.status === 'perdido'), [leads]);

  // Funnel breakdown
  const funnelData = useMemo(() => {
    return CRM_STAGES.filter(s => s.key !== 'analise_financeira').map(stage => {
      const stageLeads = activeLeads.filter(l => l.status === stage.key);
      return {
        ...stage,
        count: stageLeads.length,
        value: stageLeads.reduce((s, l) => s + (l.valor_estimado || 0), 0),
        leads: stageLeads,
      };
    });
  }, [activeLeads]);

  // Group by vendor
  const vendorBreakdown = useMemo(() => {
    const map: Record<string, { name: string; avatar: string | null; proposals: number; opportunities: number; totalValue: number; unattended: number }> = {};
    activeLeads.forEach(l => {
      const vid = l.vendedor_id || 'sem_vendedor';
      const vname = l.vendedor?.full_name || 'Sem vendedor';
      if (!map[vid]) map[vid] = { name: vname, avatar: l.vendedor?.avatar_url || null, proposals: 0, opportunities: 0, totalValue: 0, unattended: 0 };
      map[vid].totalValue += l.valor_estimado || 0;
      if (l.status === 'proposta') map[vid].proposals++;
      if (l.status === 'visita_reuniao') map[vid].opportunities++;
      if (l.status !== 'pedido_fechado' && differenceInHours(now, new Date(l.updated_at)) > 24) map[vid].unattended++;
    });
    return Object.entries(map).sort((a, b) => b[1].totalValue - a[1].totalValue);
  }, [activeLeads, now]);

  const formatCurrency = (v: number) => `R$ ${v.toLocaleString('pt-BR', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
  const formatCurrencyK = (v: number) => v >= 1000 ? `R$ ${(v / 1000).toFixed(0)}k` : `R$ ${v.toFixed(0)}`;

  return (
    <div className="space-y-4 pb-6">
      {/* Top KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        <Card className="border-l-4 border-l-primary">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-1">
              <BarChart3 className="h-4 w-4 text-primary" />
              <span className="text-xs text-muted-foreground">Pipeline Total</span>
            </div>
            <p className="text-xl font-bold">{formatCurrency(pipelineTotal)}</p>
            <p className="text-xs text-muted-foreground">{activeLeads.length} leads ativos</p>
          </CardContent>
        </Card>

        <Card className="border-l-4" style={{ borderLeftColor: 'hsl(142, 76%, 36%)' }}>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-1">
              <FileText className="h-4 w-4" style={{ color: 'hsl(142, 76%, 36%)' }} />
              <span className="text-xs text-muted-foreground">Propostas</span>
            </div>
            <p className="text-xl font-bold">{propostas.length}</p>
            <p className="text-xs text-muted-foreground">{formatCurrency(propostasValue)}</p>
          </CardContent>
        </Card>

        <Card className="border-l-4" style={{ borderLeftColor: 'hsl(262, 52%, 47%)' }}>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-1">
              <Eye className="h-4 w-4" style={{ color: 'hsl(262, 52%, 47%)' }} />
              <span className="text-xs text-muted-foreground">Oportunidades</span>
            </div>
            <p className="text-xl font-bold">{oportunidades.length}</p>
            <p className="text-xs text-muted-foreground">{formatCurrency(oportunidadesValue)}</p>
          </CardContent>
        </Card>

        <Card className="border-l-4" style={{ borderLeftColor: 'hsl(173, 80%, 36%)' }}>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-1">
              <CheckCircle className="h-4 w-4" style={{ color: 'hsl(173, 80%, 36%)' }} />
              <span className="text-xs text-muted-foreground">Pedidos Fechados</span>
            </div>
            <p className="text-xl font-bold">{pedidosFechados.length}</p>
            <p className="text-xs text-muted-foreground">{formatCurrency(pedidosFechadosValue)}</p>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-amber-500">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-1">
              <CalendarClock className="h-4 w-4 text-amber-500" />
              <span className="text-xs text-muted-foreground">Em Follow-up</span>
            </div>
            <p className="text-xl font-bold">{leadsInFollowUp.length}</p>
            <p className="text-xs text-muted-foreground">com acompanhamento</p>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-orange-500">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-1">
              <AlertTriangle className="h-4 w-4 text-orange-500" />
              <span className="text-xs text-muted-foreground">Sem Atendimento</span>
            </div>
            <p className="text-xl font-bold text-orange-600">{unattendedLeads.length}</p>
            <p className="text-xs text-muted-foreground">&gt; 24h sem atualização</p>
          </CardContent>
        </Card>
      </div>

      {/* Funnel + Vendor breakdown side by side */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Funnel visual */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-primary" />
              Funil de Vendas - Visão Atual
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {funnelData.map((stage, i) => {
              const maxCount = Math.max(...funnelData.map(s => s.count), 1);
              const pct = (stage.count / maxCount) * 100;
              return (
                <div key={stage.key} className="flex items-center gap-3">
                  <div className="w-24 text-xs font-medium truncate" style={{ color: stage.color }}>{stage.label}</div>
                  <div className="flex-1">
                    <div className="h-6 bg-muted rounded-sm overflow-hidden relative">
                      <div 
                        className="h-full rounded-sm transition-all flex items-center px-2"
                        style={{ width: `${Math.max(pct, 5)}%`, backgroundColor: stage.color }}
                      >
                        <span className="text-[10px] font-bold text-white whitespace-nowrap">{stage.count}</span>
                      </div>
                    </div>
                  </div>
                  <div className="w-20 text-right text-xs text-muted-foreground">{formatCurrencyK(stage.value)}</div>
                </div>
              );
            })}
            <div className="flex items-center gap-3 pt-1 border-t">
              <div className="w-24 text-xs font-medium text-muted-foreground">Perdidos</div>
              <div className="flex-1">
                <Badge variant="outline" className="text-xs">{lostLeads.length} leads</Badge>
              </div>
              <div className="w-20 text-right text-xs text-muted-foreground">{formatCurrencyK(lostLeads.reduce((s, l) => s + (l.valor_estimado || 0), 0))}</div>
            </div>
          </CardContent>
        </Card>

        {/* Vendor breakdown */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Users className="h-4 w-4 text-primary" />
              Desempenho por Vendedor
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3 max-h-[320px] overflow-y-auto">
              {vendorBreakdown.map(([id, data]) => (
                <div key={id} className="flex items-center gap-3 p-2 rounded-lg hover:bg-muted/50 transition-colors">
                  <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-xs font-bold text-primary">
                    {data.name.charAt(0)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{data.name}</p>
                    <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
                      <span>{data.proposals} prop.</span>
                      <span>·</span>
                      <span>{data.opportunities} oport.</span>
                      {data.unattended > 0 && (
                        <>
                          <span>·</span>
                          <span className="text-orange-500 font-medium">{data.unattended} parados</span>
                        </>
                      )}
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-bold">{formatCurrencyK(data.totalValue)}</p>
                  </div>
                </div>
              ))}
              {vendorBreakdown.length === 0 && (
                <p className="text-sm text-muted-foreground text-center py-4">Nenhum dado disponível</p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Unattended leads table */}
      {unattendedLeads.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-orange-500" />
              Leads Sem Atendimento (&gt; 24h)
              <Badge variant="outline" className="text-orange-600 border-orange-300 ml-auto">{unattendedLeads.length}</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b text-muted-foreground">
                    <th className="text-left py-2 px-2 font-medium">Empresa/Lead</th>
                    <th className="text-left py-2 px-2 font-medium">Vendedor</th>
                    <th className="text-left py-2 px-2 font-medium">Status</th>
                    <th className="text-right py-2 px-2 font-medium">Valor</th>
                    <th className="text-right py-2 px-2 font-medium">Parado há</th>
                  </tr>
                </thead>
                <tbody>
                  {unattendedLeads.slice(0, 20).map(lead => {
                    const days = differenceInDays(now, new Date(lead.updated_at));
                    const hours = differenceInHours(now, new Date(lead.updated_at));
                    const stageInfo = CRM_STAGES.find(s => s.key === lead.status);
                    return (
                      <tr 
                        key={lead.id} 
                        className="border-b last:border-0 hover:bg-muted/50 cursor-pointer transition-colors"
                        onClick={() => onLeadClick(lead)}
                      >
                        <td className="py-2 px-2 font-medium">{lead.empresa || lead.cliente_nome}</td>
                        <td className="py-2 px-2 text-muted-foreground">{lead.vendedor?.full_name || '—'}</td>
                        <td className="py-2 px-2">
                          <Badge 
                            variant="outline" 
                            className="text-[10px]"
                            style={{ borderColor: stageInfo?.color, color: stageInfo?.color }}
                          >
                            {stageInfo?.label || lead.status}
                          </Badge>
                        </td>
                        <td className="py-2 px-2 text-right">{lead.valor_estimado ? formatCurrencyK(lead.valor_estimado) : '—'}</td>
                        <td className="py-2 px-2 text-right">
                          <span className={cn(
                            "font-medium",
                            days >= 7 ? "text-destructive" : days >= 3 ? "text-orange-500" : "text-amber-500"
                          )}>
                            {days > 0 ? `${days}d` : `${hours}h`}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
              {unattendedLeads.length > 20 && (
                <p className="text-xs text-muted-foreground text-center pt-2">
                  + {unattendedLeads.length - 20} leads adicionais sem atendimento
                </p>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Proposals detail table */}
      {propostas.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <FileText className="h-4 w-4" style={{ color: 'hsl(142, 76%, 36%)' }} />
              Propostas em Aberto
              <Badge variant="outline" className="ml-auto">{propostas.length}</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b text-muted-foreground">
                    <th className="text-left py-2 px-2 font-medium">Empresa</th>
                    <th className="text-left py-2 px-2 font-medium">Vendedor</th>
                    <th className="text-left py-2 px-2 font-medium">Origem</th>
                    <th className="text-right py-2 px-2 font-medium">Valor</th>
                    <th className="text-right py-2 px-2 font-medium">Dias em aberto</th>
                  </tr>
                </thead>
                <tbody>
                  {propostas.sort((a, b) => (b.valor_estimado || 0) - (a.valor_estimado || 0)).map(lead => {
                    const days = differenceInDays(now, new Date(lead.updated_at));
                    return (
                      <tr 
                        key={lead.id}
                        className="border-b last:border-0 hover:bg-muted/50 cursor-pointer transition-colors"
                        onClick={() => onLeadClick(lead)}
                      >
                        <td className="py-2 px-2 font-medium">{lead.empresa || lead.cliente_nome}</td>
                        <td className="py-2 px-2 text-muted-foreground">{lead.vendedor?.full_name || '—'}</td>
                        <td className="py-2 px-2 text-muted-foreground">{lead.source || lead.origem || '—'}</td>
                        <td className="py-2 px-2 text-right font-medium">{lead.valor_estimado ? formatCurrency(lead.valor_estimado) : '—'}</td>
                        <td className="py-2 px-2 text-right">
                          <span className={cn("font-medium", days > 7 ? "text-orange-500" : "text-muted-foreground")}>{days}d</span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
