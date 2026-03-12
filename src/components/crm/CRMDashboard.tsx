
import { useEffect, useState, useMemo, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Maximize2, Minimize2, Phone, MapPin, Package, Briefcase, Users, TrendingUp, Calendar, X, Target, DollarSign, BarChart3, AlertTriangle, ArrowUpRight, ArrowDownRight, Globe } from 'lucide-react';
import { LastUpdatedIndicator } from '@/components/ui/last-updated-indicator';
import { supabase } from '@/integrations/supabase/client';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, LabelList } from 'recharts';
import { cn } from '@/lib/utils';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, parseISO, subMonths } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Progress } from '@/components/ui/progress';
import type { CRMLead } from '@/pages/CRM';
import { CRM_STAGES } from '@/pages/CRM';

interface CRMDashboardProps {
  leads: CRMLead[];
  lastUpdated?: Date | null;
  onRefresh?: () => void;
  isRefreshing?: boolean;
  tvMode?: boolean;
}

const CHART_COLORS = [
  'hsl(200, 98%, 39%)',
  'hsl(38, 92%, 50%)',
  'hsl(262, 52%, 47%)',
  'hsl(142, 76%, 36%)',
  'hsl(173, 80%, 36%)',
  'hsl(340, 75%, 55%)',
  'hsl(25, 95%, 53%)',
  'hsl(210, 40%, 60%)',
];

export function CRMDashboard({ leads, lastUpdated, onRefresh, isRefreshing, tvMode = false }: CRMDashboardProps) {
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [activities, setActivities] = useState<any[]>([]);
  const [vendors, setVendors] = useState<{ id: string; name: string; avatar_url: string | null }[]>([]);
  const [lossReasons, setLossReasons] = useState<any[]>([]);
  const [vendorFilter, setVendorFilter] = useState('all');
  const [periodFilter, setPeriodFilter] = useState(() => format(new Date(), 'yyyy-MM'));
  const [loading, setLoading] = useState(true);
  const [dailyGoal, setDailyGoal] = useState(0);
  const [dailyVisitsGoal, setDailyVisitsGoal] = useState(0);

  const monthOptions = useMemo(() => {
    const months = [];
    for (let i = 0; i < 12; i++) {
      const d = subMonths(new Date(), i);
      months.push({ value: format(d, 'yyyy-MM'), label: format(d, 'MMMM yyyy', { locale: ptBR }) });
    }
    return months;
  }, []);

  const loadVendors = useCallback(async () => {
    const { data } = await supabase.from('user_profiles').select('id, full_name, avatar_url');
    if (data) setVendors(data.map(v => ({ id: v.id, name: v.full_name, avatar_url: v.avatar_url })));
  }, []);

  const loadGoals = useCallback(async () => {
    const currentMonth = new Date().toISOString().slice(0, 7);
    const { data } = await supabase
      .from('admin_goals')
      .select('daily_contacts_goal, qualified_leads_goal')
      .eq('month_year', currentMonth)
      .maybeSingle();
    if (data?.daily_contacts_goal) setDailyGoal(data.daily_contacts_goal);
    if (data?.qualified_leads_goal) setDailyVisitsGoal(data.qualified_leads_goal);
  }, []);

  const loadActivities = useCallback(async () => {
    setLoading(true);
    const [year, month] = periodFilter.split('-').map(Number);
    const start = startOfMonth(new Date(year, month - 1));
    const end = endOfMonth(new Date(year, month - 1));

    let query = supabase
      .from('lead_activities')
      .select('*')
      .gte('created_at', start.toISOString())
      .lte('created_at', end.toISOString());

    if (vendorFilter !== 'all') {
      query = query.eq('user_id', vendorFilter);
    }

    const { data } = await query;
    setActivities(data || []);

    let lossQuery = (supabase as any)
      .from('lead_dispositions')
      .select('reason, custom_reason, disposition_type')
      .eq('disposition_type', 'lost')
      .gte('created_at', start.toISOString())
      .lte('created_at', end.toISOString());

    const { data: lossData } = await lossQuery;
    setLossReasons(lossData || []);

    setLoading(false);
  }, [periodFilter, vendorFilter]);

  // Auto-filter by logged-in user (non-admin/comercial)
  useEffect(() => {
    const initVendorFilter = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data: roleData } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', user.id)
        .maybeSingle();
      const role = (roleData as any)?.role;
      if (role !== 'admin' && role !== 'comercial') {
        setVendorFilter(user.id);
      }
    };
    initVendorFilter();
  }, []);

  useEffect(() => { loadVendors(); loadGoals(); }, [loadVendors, loadGoals]);
  useEffect(() => { loadActivities(); }, [loadActivities]);

  // Filter leads by vendor
  const filteredLeads = useMemo(() => {
    let filtered = leads.filter(l => l.status !== 'perdido');
    if (vendorFilter !== 'all') {
      filtered = filtered.filter(l => l.vendedor_id === vendorFilter);
    }
    return filtered;
  }, [leads, vendorFilter]);

  const lostLeads = useMemo(() => leads.filter(l => l.status === 'perdido'), [leads]);

  // Helper: deduplicate contato_inicial — count only the first per lead per day
  const uniqueDailyContacts = useMemo(() => {
    const seen = new Set<string>();
    return activities.filter(a => {
      if (a.activity_type !== 'contato_inicial') return false;
      const day = a.created_at?.slice(0, 10);
      const key = `${a.lead_id}_${day}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }, [activities]);

  // KPIs
  const totalContacts = uniqueDailyContacts.length;
  const totalVisits = activities.filter(a => a.activity_type === 'visita').length;
  const totalActivities = activities.length;
  const activeLeads = filteredLeads.length;
  const pipelineValue = filteredLeads.reduce((sum, l) => sum + (l.valor_estimado || 0), 0);
  const lostValue = lostLeads.reduce((sum, l) => sum + (l.valor_estimado || 0), 0);
  const lostPercent = activeLeads > 0 ? ((lostLeads.length / (activeLeads + lostLeads.length)) * 100).toFixed(1) : '0';

  // Today's contacts for progress
  const todayStr = format(new Date(), 'yyyy-MM-dd');
  const todayContacts = uniqueDailyContacts.filter(a => a.created_at?.startsWith(todayStr)).length;
  const todayVisitsCount = useMemo(() => {
    return activities.filter(a => a.activity_type === 'visita' && a.created_at?.startsWith(todayStr)).length;
  }, [activities, todayStr]);

  // Daily contacts chart
  const dailyContactsData = useMemo(() => {
    const [year, month] = periodFilter.split('-').map(Number);
    const start = startOfMonth(new Date(year, month - 1));
    const end = endOfMonth(new Date(year, month - 1));
    const days = eachDayOfInterval({ start, end });
    return days.map(day => {
      const dayStr = format(day, 'yyyy-MM-dd');
      const dayActivities = activities.filter(a => a.created_at.startsWith(dayStr));
      return {
        dia: format(day, 'dd', { locale: ptBR }),
        contatos: uniqueDailyContacts.filter(a => a.created_at?.startsWith(dayStr)).length,
        visitas: dayActivities.filter(a => a.activity_type === 'visita').length,
      };
    });
  }, [activities, uniqueDailyContacts, periodFilter]);

  // Funnel data
  const funnelData = useMemo(() => {
    return CRM_STAGES.map((s, i) => ({
      name: s.label,
      value: filteredLeads.filter(l => l.status === s.key).length,
      amount: filteredLeads.filter(l => l.status === s.key).reduce((sum, l) => sum + (l.valor_estimado || 0), 0),
      fill: s.color,
    }));
  }, [filteredLeads]);

  // Leads per vendor (top 5 with value)
  const vendorLeadsData = useMemo(() => {
    const map: Record<string, { count: number; value: number; contacts: number; avatar_url: string | null }> = {};
    filteredLeads.forEach(l => {
      const vendorName = l.vendedor?.full_name || 'Sem vendedor';
      const vendorInfo = vendors.find(v => v.id === l.vendedor_id);
      if (!map[vendorName]) map[vendorName] = { count: 0, value: 0, contacts: 0, avatar_url: vendorInfo?.avatar_url || null };
      map[vendorName].count++;
      map[vendorName].value += l.valor_estimado || 0;
    });
    // Add contacts
    uniqueDailyContacts.forEach(a => {
      const vendorName = a.sdr_name || vendors.find(v => v.id === a.user_id)?.name || 'Desconhecido';
      if (map[vendorName]) map[vendorName].contacts++;
    });
    return Object.entries(map)
      .sort((a, b) => b[1].value - a[1].value)
      .slice(0, 5)
      .map(([name, data], idx) => ({ name, ...data, rank: idx + 1 }));
  }, [filteredLeads, vendors, activities]);

  // Cities/States chart
  const locationData = useMemo(() => {
    const map: Record<string, number> = {};
    filteredLeads.forEach(l => {
      if (l.estado) {
        const key = l.cidade ? `${l.cidade}/${l.estado}` : l.estado;
        map[key] = (map[key] || 0) + 1;
      }
    });
    return Object.entries(map)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([name, value]) => ({ name, value }));
  }, [filteredLeads]);

  // Product interests chart
  const productData = useMemo(() => {
    const map: Record<string, number> = {};
    filteredLeads.forEach(l => {
      if (l.produto_interesse) {
        l.produto_interesse.split(',').map(p => p.trim()).filter(Boolean).forEach(p => {
          map[p] = (map[p] || 0) + 1;
        });
      }
    });
    return Object.entries(map)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 8)
      .map(([name, value]) => ({ name, value }));
  }, [filteredLeads]);

  // Business sectors chart
  const sectorData = useMemo(() => {
    const map: Record<string, number> = {};
    filteredLeads.forEach(l => {
      if (l.ramo_atuacao) {
        map[l.ramo_atuacao] = (map[l.ramo_atuacao] || 0) + 1;
      }
    });
    return Object.entries(map)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 8)
      .map(([name, value]) => ({ name, value }));
  }, [filteredLeads]);

  // Lead sources/origin chart
  const sourceData = useMemo(() => {
    const map: Record<string, number> = {};
    filteredLeads.forEach(l => {
      const origem = l.origem || l.source || 'Não informado';
      map[origem] = (map[origem] || 0) + 1;
    });
    return Object.entries(map)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([name, value]) => ({ name, value }));
  }, [filteredLeads]);

  // Loss reasons chart
  const lossReasonsData = useMemo(() => {
    const map: Record<string, number> = {};
    lossReasons.forEach(lr => {
      const reason = lr.reason || lr.custom_reason || 'Não informado';
      map[reason] = (map[reason] || 0) + 1;
    });
    return Object.entries(map)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([name, value]) => ({ name, value }));
  }, [lossReasons]);

  // Contacts per vendor
  const vendorContactsData = useMemo(() => {
    if (vendorFilter !== 'all') return [];
    const map: Record<string, { contatos: number; visitas: number }> = {};
    activities.forEach(a => {
      const vendorName = a.sdr_name || vendors.find(v => v.id === a.user_id)?.name || 'Desconhecido';
      if (!map[vendorName]) map[vendorName] = { contatos: 0, visitas: 0 };
      if (a.activity_type === 'contato_inicial') map[vendorName].contatos++;
      if (a.activity_type === 'visita') map[vendorName].visitas++;
    });
    return Object.entries(map)
      .map(([name, data]) => ({ name, ...data }))
      .sort((a, b) => (b.contatos + b.visitas) - (a.contatos + a.visitas));
  }, [activities, vendors, vendorFilter]);

  const clearFilters = () => {
    setVendorFilter('all');
    setPeriodFilter(format(new Date(), 'yyyy-MM'));
  };
  const hasFilters = vendorFilter !== 'all' || periodFilter !== format(new Date(), 'yyyy-MM');

  const formatCurrency = (value: number) => {
    if (value >= 1_000_000) return `R$ ${(value / 1_000_000).toFixed(2).replace('.', ',')}mi`;
    if (value >= 1_000) return `R$ ${(value / 1_000).toFixed(0)}k`;
    return `R$ ${value.toLocaleString('pt-BR')}`;
  };

  const rankColors = ['text-amber-500', 'text-slate-400', 'text-amber-700'];

  return (
    <div className={cn(
      isFullscreen && "fixed inset-0 z-50 bg-background overflow-auto"
    )}>
      {isFullscreen && (
        <Button
          variant="secondary"
          size="icon"
          className="fixed top-4 right-4 z-[60] shadow-lg"
          onClick={() => setIsFullscreen(false)}
          title="Sair do modo tela cheia"
        >
          <Minimize2 className="h-4 w-4" />
        </Button>
      )}

      <div className={cn("space-y-3 sm:space-y-4", isFullscreen && "p-4 sm:p-6")}>
        {/* Last updated indicator */}
        {lastUpdated && !tvMode && (
          <div className="flex justify-end">
            <LastUpdatedIndicator 
              lastUpdated={lastUpdated} 
              onRefresh={onRefresh} 
              loading={isRefreshing} 
            />
          </div>
        )}
        {/* Filters bar */}
        {!tvMode && (
          <div className="flex flex-wrap items-center gap-2">
            <Select value={periodFilter} onValueChange={setPeriodFilter}>
              <SelectTrigger className="w-[140px] sm:w-[180px] h-8 text-xs">
                <Calendar className="h-3 w-3 mr-1.5 shrink-0" />
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {monthOptions.map(m => (
                  <SelectItem key={m.value} value={m.value} className="text-xs capitalize">{m.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={vendorFilter} onValueChange={setVendorFilter}>
              <SelectTrigger className="w-[130px] sm:w-[160px] h-8 text-xs">
                <Users className="h-3 w-3 mr-1.5 shrink-0" />
                <SelectValue placeholder="Todos" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os Vendedores</SelectItem>
                {vendors.map(v => (
                  <SelectItem key={v.id} value={v.id}>{v.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            {hasFilters && (
              <Button variant="ghost" size="sm" className="h-8 text-xs gap-1" onClick={clearFilters}>
                <X className="h-3 w-3" /> Limpar
              </Button>
            )}

            <div className="ml-auto">
              {!isFullscreen && (
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => setIsFullscreen(true)}
                  title="Modo tela cheia"
                  className="h-8 w-8 hidden sm:flex"
                >
                  <Maximize2 className="h-4 w-4" />
                </Button>
              )}
            </div>
          </div>
        )}

        {/* Row 1: KPI Cards - styled like commercial dashboard */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {/* Pipeline Card */}
          <Card className="border-l-4 border-l-primary">
            <CardContent className="p-4 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm font-semibold text-primary">Pipeline</span>
                <div className="flex items-center gap-1">
                  <DollarSign className="h-4 w-4 text-muted-foreground" />
                  <Target className="h-4 w-4 text-muted-foreground" />
                </div>
              </div>
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-muted-foreground">Valor Total:</span>
                  <span className="text-sm font-bold text-foreground">
                    R$ {pipelineValue.toLocaleString('pt-BR', { minimumFractionDigits: 0 })}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-xs text-muted-foreground">Leads Ativos:</span>
                  <span className="text-sm font-bold text-foreground">{activeLeads}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-xs text-muted-foreground">Ticket Médio:</span>
                  <span className="text-sm font-bold text-foreground">
                    R$ {activeLeads > 0 ? (pipelineValue / activeLeads).toLocaleString('pt-BR', { minimumFractionDigits: 0, maximumFractionDigits: 0 }) : '0'}
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Progresso Diário Card */}
          <Card className="border-l-4 border-l-[hsl(142,76%,36%)]">
            <CardContent className="p-4 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm font-semibold text-[hsl(142,76%,36%)]">Progresso Diário</span>
                <Phone className="h-4 w-4 text-muted-foreground" />
              </div>
              <div className="space-y-2.5">
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs text-muted-foreground">Contatos Hoje</span>
                    <span className="text-sm font-bold text-foreground">
                      {todayContacts}{dailyGoal > 0 && <span className="text-xs font-normal text-muted-foreground">/{dailyGoal}</span>}
                    </span>
                  </div>
                  {dailyGoal > 0 && <Progress value={Math.min((todayContacts / dailyGoal) * 100, 100)} className="h-1.5" />}
                </div>
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs text-muted-foreground">Visitas Hoje</span>
                    <span className="text-sm font-bold text-foreground">
                      {todayVisitsCount}{dailyVisitsGoal > 0 && <span className="text-xs font-normal text-muted-foreground">/{dailyVisitsGoal}</span>}
                    </span>
                  </div>
                  {dailyVisitsGoal > 0 && <Progress value={Math.min((todayVisitsCount / dailyVisitsGoal) * 100, 100)} className="h-1.5" />}
                </div>
                <div className="flex items-center justify-between pt-0.5">
                  <span className="text-xs text-muted-foreground">Total no Mês</span>
                  <div className="flex items-center gap-2">
                    <Badge variant="secondary" className="text-[10px]">{totalContacts} contatos</Badge>
                    <Badge variant="secondary" className="text-[10px]">{totalVisits} visitas</Badge>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Top Vendedores Card - like "Orçamentos em Aberto" */}
          <Card className="border-l-4 border-l-[hsl(38,92%,50%)]">
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-3">
                <span className="text-sm font-semibold text-[hsl(38,92%,50%)]">Top Vendedores</span>
                <Badge variant="outline" className="text-xs">{activeLeads} leads</Badge>
              </div>
              <div className="space-y-2">
                {vendorLeadsData.slice(0, 3).map((vendor, idx) => (
                  <div key={vendor.name} className="flex items-center gap-2">
                    <div className="relative">
                      <Avatar className="h-8 w-8">
                        <AvatarImage src={vendor.avatar_url || ''} />
                        <AvatarFallback className="text-[10px] bg-muted">{vendor.name.split(' ').map(n => n[0]).join('').slice(0, 2)}</AvatarFallback>
                      </Avatar>
                      <span className={cn("absolute -bottom-0.5 -right-0.5 flex h-4 w-4 items-center justify-center rounded-full text-[8px] font-bold text-white", 
                        idx === 0 ? 'bg-amber-500' : idx === 1 ? 'bg-slate-400' : 'bg-amber-700'
                      )}>
                        {vendor.rank}
                      </span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium text-foreground truncate">{vendor.name}</p>
                      <p className="text-[10px] text-muted-foreground">{vendor.count} leads • {vendor.contacts} cont.</p>
                    </div>
                    <span className="text-xs font-bold text-foreground whitespace-nowrap">
                      {formatCurrency(vendor.value)}
                    </span>
                  </div>
                ))}
                {vendorLeadsData.length === 0 && (
                  <p className="text-xs text-muted-foreground text-center py-2">Sem dados</p>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Row 2: Daily Chart + Funnel side card */}
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-3 sm:gap-4">
          <Card>
            <CardHeader className="pb-2 px-3 sm:px-6">
              <CardTitle className="text-xs sm:text-sm">Contatos e Visitas Diárias</CardTitle>
            </CardHeader>
            <CardContent className="h-[200px] sm:h-[260px] px-2 sm:px-6">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={dailyContactsData} barGap={1} barSize={12}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                  <XAxis dataKey="dia" tick={{ fontSize: 10 }} className="fill-muted-foreground" interval={0} />
                  <YAxis tick={{ fontSize: 10 }} className="fill-muted-foreground" allowDecimals={false} width={30} />
                  <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8 }} />
                  <Bar dataKey="contatos" name="Contatos" fill="hsl(200, 98%, 39%)" radius={[3, 3, 0, 0]}>
                    <LabelList dataKey="contatos" position="top" fontSize={10} fontWeight={600} className="fill-foreground" formatter={(v: number) => v > 0 ? v : ''} />
                  </Bar>
                  <Bar dataKey="visitas" name="Visitas" fill="hsl(262, 52%, 47%)" radius={[3, 3, 0, 0]}>
                    <LabelList dataKey="visitas" position="top" fontSize={10} fontWeight={600} className="fill-foreground" formatter={(v: number) => v > 0 ? v : ''} />
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Funnel - vertical card like Temperature */}
          <Card>
            <CardHeader className="pb-2 px-3 sm:px-6">
              <CardTitle className="text-xs sm:text-sm">Funil de Vendas</CardTitle>
            </CardHeader>
            <CardContent className="px-3 sm:px-6 space-y-2">
              {funnelData.map((stage) => {
                const maxCount = Math.max(...funnelData.map(s => s.value), 1);
                const pct = (stage.value / maxCount) * 100;
                return (
                  <div key={stage.name} className="space-y-1">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: stage.fill }} />
                        <span className="text-xs text-foreground font-medium">{stage.name}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-foreground">{stage.value}</span>
                        {stage.amount > 0 && (
                          <span className="text-[10px] text-muted-foreground">{formatCurrency(stage.amount)}</span>
                        )}
                      </div>
                    </div>
                    <div className="w-full h-2 rounded-full bg-muted overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all"
                        style={{ width: `${Math.max(pct, 3)}%`, backgroundColor: stage.fill }}
                      />
                    </div>
                  </div>
                );
              })}
              
              {/* Perdidos summary */}
              <div className="pt-2 mt-2 border-t border-border">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <AlertTriangle className="h-3.5 w-3.5 text-destructive" />
                    <span className="text-xs font-medium text-destructive">Perdidos</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-foreground">{lostLeads.length}</span>
                    <Badge variant="outline" className="text-[10px]">{lostPercent}%</Badge>
                  </div>
                </div>
                {lostValue > 0 && (
                  <p className="text-[10px] text-muted-foreground mt-1 ml-5">
                    {formatCurrency(lostValue)} em valor estimado
                  </p>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Row 3: Vendor contacts + Products (2 cols like Bottom row of commercial) */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 sm:gap-4">
          {/* Vendor contacts chart */}
          {vendorFilter === 'all' && vendorContactsData.length > 0 ? (
            <Card>
              <CardHeader className="pb-2 px-3 sm:px-6">
                <CardTitle className="text-xs sm:text-sm flex items-center gap-1.5">
                  <Users className="h-3.5 w-3.5 sm:h-4 sm:w-4" /> Contatos por Vendedor
                </CardTitle>
              </CardHeader>
              <CardContent className="h-[220px] sm:h-[280px] px-1 sm:px-6">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={vendorContactsData} barSize={16} barGap={2}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                    <XAxis dataKey="name" tick={{ fontSize: 8 }} className="fill-muted-foreground" angle={-20} textAnchor="end" height={45} />
                    <YAxis tick={{ fontSize: 10 }} className="fill-muted-foreground" allowDecimals={false} width={30} />
                    <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8 }} />
                    <Bar dataKey="contatos" name="Contatos" fill="hsl(200, 98%, 39%)" radius={[3, 3, 0, 0]}>
                      <LabelList dataKey="contatos" position="top" fontSize={9} className="fill-foreground" formatter={(v: number) => v > 0 ? v : ''} />
                    </Bar>
                    <Bar dataKey="visitas" name="Visitas" fill="hsl(142, 76%, 36%)" radius={[3, 3, 0, 0]}>
                      <LabelList dataKey="visitas" position="top" fontSize={9} className="fill-foreground" formatter={(v: number) => v > 0 ? v : ''} />
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardHeader className="pb-2 px-3 sm:px-6">
                <CardTitle className="text-xs sm:text-sm flex items-center gap-1.5">
                  <MapPin className="h-3.5 w-3.5 sm:h-4 sm:w-4" /> Cidades / Estados
                </CardTitle>
              </CardHeader>
              <CardContent className="h-[220px] sm:h-[280px] px-1 sm:px-6">
                {locationData.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={locationData} layout="vertical" barSize={14}>
                      <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                      <XAxis type="number" tick={{ fontSize: 10 }} className="fill-muted-foreground" allowDecimals={false} />
                      <YAxis dataKey="name" type="category" tick={{ fontSize: 9 }} className="fill-muted-foreground" width={90} />
                      <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8 }} />
                      <Bar dataKey="value" name="Leads" fill="hsl(200, 98%, 39%)" radius={[0, 4, 4, 0]}>
                        <LabelList dataKey="value" position="right" fontSize={10} className="fill-foreground" />
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="flex items-center justify-center h-full text-muted-foreground text-xs">Nenhum dado</div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Products chart */}
          <Card>
            <CardHeader className="pb-2 px-3 sm:px-6">
              <CardTitle className="text-xs sm:text-sm flex items-center gap-1.5">
                <Package className="h-3.5 w-3.5 sm:h-4 sm:w-4" /> Produtos de Interesse
              </CardTitle>
            </CardHeader>
            <CardContent className="h-[220px] sm:h-[280px] px-1 sm:px-6">
              {productData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={productData} barSize={20}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                    <XAxis dataKey="name" tick={{ fontSize: 8 }} className="fill-muted-foreground" angle={-35} textAnchor="end" height={55} interval={0} />
                    <YAxis tick={{ fontSize: 10 }} className="fill-muted-foreground" allowDecimals={false} width={30} />
                    <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8 }} />
                    <Bar dataKey="value" name="Leads" radius={[4, 4, 0, 0]}>
                      <LabelList dataKey="value" position="top" fontSize={10} className="fill-foreground" />
                      {productData.map((_, i) => (
                        <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex items-center justify-center h-full text-muted-foreground text-xs">Nenhum dado</div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Row 4: Source/Origin + Sectors */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 sm:gap-4">
          {/* Origem dos Leads */}
          <Card>
            <CardHeader className="pb-2 px-3 sm:px-6">
              <CardTitle className="text-xs sm:text-sm flex items-center gap-1.5">
                <Globe className="h-3.5 w-3.5 sm:h-4 sm:w-4" /> Origem dos Leads
              </CardTitle>
            </CardHeader>
            <CardContent className="h-[220px] sm:h-[280px] px-1 sm:px-6">
              {sourceData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={sourceData} layout="vertical" barSize={14}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                    <XAxis type="number" tick={{ fontSize: 10 }} className="fill-muted-foreground" allowDecimals={false} />
                    <YAxis dataKey="name" type="category" tick={{ fontSize: 9 }} className="fill-muted-foreground" width={110} />
                    <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8 }} />
                    <Bar dataKey="value" name="Leads" radius={[0, 4, 4, 0]}>
                      <LabelList dataKey="value" position="right" fontSize={10} className="fill-foreground" />
                      {sourceData.map((_, i) => (
                        <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex items-center justify-center h-full text-muted-foreground text-xs">Nenhum dado de origem</div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2 px-3 sm:px-6">
              <CardTitle className="text-xs sm:text-sm flex items-center gap-1.5">
                <Briefcase className="h-3.5 w-3.5 sm:h-4 sm:w-4" /> Ramo de Atuação
              </CardTitle>
            </CardHeader>
            <CardContent className="h-[220px] sm:h-[280px] px-1 sm:px-6">
              {sectorData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={sectorData} layout="vertical" barSize={14}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                    <XAxis type="number" tick={{ fontSize: 10 }} className="fill-muted-foreground" allowDecimals={false} />
                    <YAxis dataKey="name" type="category" tick={{ fontSize: 9 }} className="fill-muted-foreground" width={100} />
                    <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8 }} />
                    <Bar dataKey="value" name="Leads" fill="hsl(38, 92%, 50%)" radius={[0, 4, 4, 0]}>
                      <LabelList dataKey="value" position="right" fontSize={10} className="fill-foreground" />
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex items-center justify-center h-full text-muted-foreground text-xs">Nenhum dado</div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Row 5: Loss Reasons */}
        <Card>
          <CardHeader className="pb-2 px-3 sm:px-6">
            <CardTitle className="text-xs sm:text-sm flex items-center gap-1.5">
              <AlertTriangle className="h-3.5 w-3.5 sm:h-4 sm:w-4" /> Motivos de Perda
            </CardTitle>
          </CardHeader>
          <CardContent className="h-[220px] sm:h-[280px] px-1 sm:px-6">
            {lossReasonsData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={lossReasonsData} layout="vertical" barSize={14}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                  <XAxis type="number" tick={{ fontSize: 10 }} className="fill-muted-foreground" allowDecimals={false} />
                  <YAxis dataKey="name" type="category" tick={{ fontSize: 8 }} className="fill-muted-foreground" width={100} />
                  <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8 }} />
                  <Bar dataKey="value" name="Perdas" fill="hsl(340, 75%, 55%)" radius={[0, 4, 4, 0]}>
                    <LabelList dataKey="value" position="right" fontSize={10} className="fill-foreground" />
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-full text-muted-foreground text-xs">Nenhum motivo no período</div>
            )}
          </CardContent>
        </Card>

        {/* Row 5: Locations (if vendor contacts shown above) */}
        {vendorFilter === 'all' && vendorContactsData.length > 0 && locationData.length > 0 && (
          <Card>
            <CardHeader className="pb-2 px-3 sm:px-6">
              <CardTitle className="text-xs sm:text-sm flex items-center gap-1.5">
                <MapPin className="h-3.5 w-3.5 sm:h-4 sm:w-4" /> Cidades / Estados com mais Leads
              </CardTitle>
            </CardHeader>
            <CardContent className="h-[220px] sm:h-[280px] px-1 sm:px-6">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={locationData} layout="vertical" barSize={14}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                  <XAxis type="number" tick={{ fontSize: 10 }} className="fill-muted-foreground" allowDecimals={false} />
                  <YAxis dataKey="name" type="category" tick={{ fontSize: 9 }} className="fill-muted-foreground" width={90} />
                  <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8 }} />
                  <Bar dataKey="value" name="Leads" fill="hsl(200, 98%, 39%)" radius={[0, 4, 4, 0]}>
                    <LabelList dataKey="value" position="right" fontSize={10} className="fill-foreground" />
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
