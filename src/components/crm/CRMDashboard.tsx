
import { useEffect, useState, useMemo, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Maximize2, Minimize2, Phone, MapPin, Package, Briefcase, Users, TrendingUp, Calendar, X, Target, DollarSign, BarChart3, AlertTriangle, ArrowUpRight, ArrowDownRight, Globe } from 'lucide-react';
import { LastUpdatedIndicator } from '@/components/ui/last-updated-indicator';
import { supabase } from '@/integrations/supabase/client';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LabelList, ReferenceLine } from 'recharts';
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

const CHART_COLOR = 'hsl(200, 98%, 39%)';

export function CRMDashboard({ leads, lastUpdated, onRefresh, isRefreshing, tvMode = false }: CRMDashboardProps) {
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [activities, setActivities] = useState<any[]>([]);
  const [vendors, setVendors] = useState<{ id: string; name: string; avatar_url: string | null }[]>([]);
  const [lossReasons, setLossReasons] = useState<any[]>([]);
  const [vendorFilter, setVendorFilter] = useState('all');
  const [periodFilter, setPeriodFilter] = useState(() => format(new Date(), 'yyyy-MM'));
  const [loading, setLoading] = useState(true);
  const [vendorGoals, setVendorGoals] = useState<any[]>([]);

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

  const loadVendorGoals = useCallback(async () => {
    const { data } = await (supabase as any)
      .from('crm_vendor_goals')
      .select('*')
      .eq('month_year', periodFilter);
    setVendorGoals(data || []);
  }, [periodFilter]);

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

  useEffect(() => { loadVendors(); }, [loadVendors]);
  useEffect(() => { loadActivities(); loadVendorGoals(); }, [loadActivities, loadVendorGoals]);

  // Computed goals based on filter
  const currentGoals = useMemo(() => {
    if (vendorFilter !== 'all') {
      const goal = vendorGoals.find((g: any) => g.vendor_id === vendorFilter);
      return {
        dailyContacts: goal?.daily_contacts_goal || 0,
        dailyVisits: goal?.daily_visits_goal || 0,
        dailyProposals: goal?.daily_proposals_goal || 0,
        dailyOrders: goal?.daily_orders_goal || 0,
      };
    }
    // Sum all vendor goals
    return {
      dailyContacts: vendorGoals.reduce((s: number, g: any) => s + (g.daily_contacts_goal || 0), 0),
      dailyVisits: vendorGoals.reduce((s: number, g: any) => s + (g.daily_visits_goal || 0), 0),
      dailyProposals: vendorGoals.reduce((s: number, g: any) => s + (g.daily_proposals_goal || 0), 0),
      dailyOrders: vendorGoals.reduce((s: number, g: any) => s + (g.daily_orders_goal || 0), 0),
    };
  }, [vendorGoals, vendorFilter]);

  // Filter leads by vendor
  const filteredLeads = useMemo(() => {
    let filtered = leads.filter(l => l.status !== 'perdido');
    if (vendorFilter !== 'all') {
      filtered = filtered.filter(l => l.vendedor_id === vendorFilter);
    }
    return filtered;
  }, [leads, vendorFilter]);

  // All active leads (unfiltered) for funnel "Lead" stage
  const allActiveLeads = useMemo(() => leads.filter(l => l.status !== 'perdido'), [leads]);

  const lostLeads = useMemo(() => leads.filter(l => l.status === 'perdido'), [leads]);

  // Helper: deduplicate contato_inicial — count only the first per lead per day per user (local tz)
  const uniqueDailyContacts = useMemo(() => {
    const seen = new Set<string>();
    return activities.filter(a => {
      if (a.activity_type !== 'contato_inicial') return false;
      const day = format(new Date(a.created_at), 'yyyy-MM-dd');
      const key = `${a.lead_id}_${a.user_id}_${day}`;
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

  // Today's contacts for progress — compare in local timezone
  const todayStr = format(new Date(), 'yyyy-MM-dd');
  const todayContacts = uniqueDailyContacts.filter(a => {
    const localDate = format(new Date(a.created_at), 'yyyy-MM-dd');
    return localDate === todayStr;
  }).length;
  const todayVisitsCount = useMemo(() => {
    return activities.filter(a => {
      if (a.activity_type !== 'visita') return false;
      const localDate = format(new Date(a.created_at), 'yyyy-MM-dd');
      return localDate === todayStr;
    }).length;
  }, [activities, todayStr]);

  // Daily contacts chart
  const dailyContactsData = useMemo(() => {
    const [year, month] = periodFilter.split('-').map(Number);
    const start = startOfMonth(new Date(year, month - 1));
    const end = endOfMonth(new Date(year, month - 1));
    const days = eachDayOfInterval({ start, end });
    return days.map(day => {
      const dayStr = format(day, 'yyyy-MM-dd');
      const dayActivities = activities.filter(a => format(new Date(a.created_at), 'yyyy-MM-dd') === dayStr);
      return {
        dia: format(day, 'dd', { locale: ptBR }),
        contatos: uniqueDailyContacts.filter(a => format(new Date(a.created_at), 'yyyy-MM-dd') === dayStr).length,
        visitas: dayActivities.filter(a => a.activity_type === 'visita').length,
      };
    });
  }, [activities, uniqueDailyContacts, periodFilter]);

  // Funnel data - Lead stage shows ALL active leads
  const funnelData = useMemo(() => {
    return CRM_STAGES.map((s, i) => ({
      name: s.label,
      value: i === 0 ? allActiveLeads.length : filteredLeads.filter(l => l.status === s.key).length,
      amount: i === 0 ? allActiveLeads.reduce((sum, l) => sum + (l.valor_estimado || 0), 0) : filteredLeads.filter(l => l.status === s.key).reduce((sum, l) => sum + (l.valor_estimado || 0), 0),
      fill: s.color,
    }));
  }, [filteredLeads, allActiveLeads]);

  // Helper to format name: first name only, proper case
  const formatFirstName = (name: string) => {
    const first = name.split(' ')[0];
    return first.charAt(0).toUpperCase() + first.slice(1).toLowerCase();
  };

  // Leads per vendor (ordered by value)
  const vendorLeadsData = useMemo(() => {
    const map: Record<string, { count: number; value: number; contacts: number; avatar_url: string | null; vendorId: string | null }> = {};

    filteredLeads.forEach(l => {
      const vendorId = l.vendedor_id || 'unknown';
      const vendorInfo = vendors.find(v => v.id === vendorId);
      const vendorName = vendorInfo?.name || l.vendedor?.full_name || 'Sem vendedor';

      if (!map[vendorId]) {
        map[vendorId] = {
          count: 0,
          value: 0,
          contacts: 0,
          avatar_url: vendorInfo?.avatar_url || null,
          vendorId,
        };
      }

      map[vendorId].count++;
      map[vendorId].value += l.valor_estimado || 0;
    });

    uniqueDailyContacts.forEach(a => {
      const userId = a.user_id || 'unknown';
      if (map[userId]) map[userId].contacts++;
    });

    return Object.entries(map)
      .sort((a, b) => b[1].value - a[1].value)
      .map(([id, data], idx) => {
        const vendorInfo = vendors.find(v => v.id === id);
        const fullName = vendorInfo?.name || 'Sem vendedor';
        return { name: formatFirstName(fullName), fullName, ...data, rank: idx + 1 };
      });
  }, [filteredLeads, vendors, uniqueDailyContacts]);

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
    const nameNormalization: Record<string, string> = {
      'Base Arcelor': 'Base Mercado',
    };
    filteredLeads.forEach(l => {
      let origem = l.origem || l.source || 'Não informado';
      origem = nameNormalization[origem] || origem;
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
      const fullName = a.sdr_name || vendors.find(v => v.id === a.user_id)?.name || 'Desconhecido';
      const firstName = fullName.split(' ')[0];
      if (!map[firstName]) map[firstName] = { contatos: 0, visitas: 0 };
      if (a.activity_type === 'contato_inicial') map[firstName].contatos++;
      if (a.activity_type === 'visita') map[firstName].visitas++;
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

        {/* Row 1: KPI Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {/* Pipeline Card */}
          <Card className="border-l-4 border-l-primary h-[188px]">
            <CardContent className="p-5 h-full flex flex-col justify-between">
              <div className="flex items-center justify-between">
                <span className="text-base font-semibold text-primary">Pipeline</span>
                <div className="flex items-center gap-1.5">
                  <DollarSign className="h-4 w-4 text-muted-foreground" />
                  <Target className="h-4 w-4 text-muted-foreground" />
                </div>
              </div>

              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Valor Total:</span>
                  <span className="text-xl font-bold text-foreground">
                    R$ {pipelineValue.toLocaleString('pt-BR', { minimumFractionDigits: 0 })}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Leads Ativos:</span>
                  <span className="text-xl font-bold text-foreground">{activeLeads}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Ticket Médio:</span>
                  <span className="text-xl font-bold text-foreground">
                    R$ {activeLeads > 0 ? (pipelineValue / activeLeads).toLocaleString('pt-BR', { minimumFractionDigits: 0, maximumFractionDigits: 0 }) : '0'}
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Progresso Diário Card */}
          <Card className="border-l-4 border-l-accent h-[188px]">
            <CardContent className="p-5 h-full flex flex-col justify-between">
              <div className="flex items-center justify-between">
                <span className="text-base font-semibold text-foreground">Progresso Diário</span>
                <Phone className="h-4 w-4 text-muted-foreground" />
              </div>

              <div className="space-y-3">
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-sm text-muted-foreground">Contatos Hoje</span>
                    <span className="text-lg font-bold text-foreground">
                      {todayContacts}{currentGoals.dailyContacts > 0 && <span className="text-xs font-normal text-muted-foreground">/{currentGoals.dailyContacts}</span>}
                    </span>
                  </div>
                  {currentGoals.dailyContacts > 0 && <Progress value={Math.min((todayContacts / currentGoals.dailyContacts) * 100, 100)} className="h-2" />}
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-sm text-muted-foreground">Visitas Hoje</span>
                    <span className="text-lg font-bold text-foreground">
                      {todayVisitsCount}{currentGoals.dailyVisits > 0 && <span className="text-xs font-normal text-muted-foreground">/{currentGoals.dailyVisits}</span>}
                    </span>
                  </div>
                  {currentGoals.dailyVisits > 0 && <Progress value={Math.min((todayVisitsCount / currentGoals.dailyVisits) * 100, 100)} className="h-2" />}
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Total no Mês</span>
                  <div className="flex items-center gap-2">
                    <Badge variant="secondary" className="text-xs">{totalContacts} contatos</Badge>
                    <Badge variant="secondary" className="text-xs">{totalVisits} visitas</Badge>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Contatos Card - vertical scroll */}
          <Card className="border-l-4 border-l-secondary h-[188px] overflow-hidden">
            <CardContent className="p-4 h-full flex flex-col">
              <div className="flex items-center justify-between mb-2">
                <span className="text-base font-semibold text-foreground">Contatos</span>
                <Badge variant="outline" className="text-xs">{activeLeads} leads</Badge>
              </div>

              <div className="flex-1 overflow-y-auto overflow-x-hidden space-y-1.5 pr-1">
                {vendorLeadsData.map((vendor, idx) => (
                  <div
                    key={vendor.vendorId || vendor.name}
                    className="flex items-center gap-2 rounded-md border bg-card p-2"
                  >
                    <div className="relative flex-shrink-0">
                      <Avatar className="h-7 w-7">
                        <AvatarImage src={vendor.avatar_url || ''} />
                        <AvatarFallback className="text-[9px] bg-muted">{vendor.name.slice(0, 2).toUpperCase()}</AvatarFallback>
                      </Avatar>
                      <span
                        className={cn(
                          'absolute -bottom-0.5 -right-0.5 flex h-3.5 w-3.5 items-center justify-center rounded-full text-[7px] font-bold',
                          idx === 0
                            ? 'bg-primary text-primary-foreground'
                            : idx === 1
                            ? 'bg-muted text-foreground'
                            : idx === 2
                            ? 'bg-secondary text-secondary-foreground'
                            : 'bg-accent text-accent-foreground'
                        )}
                      >
                        {vendor.rank}
                      </span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium text-foreground truncate">{vendor.name}</p>
                      <p className="text-[10px] text-muted-foreground">{vendor.count} leads • {vendor.contacts} cont.</p>
                    </div>
                    <span className="text-xs font-bold text-foreground whitespace-nowrap">{formatCurrency(vendor.value)}</span>
                  </div>
                ))}

                {vendorLeadsData.length === 0 && (
                  <p className="text-xs text-muted-foreground py-2">Sem dados</p>
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
                <BarChart data={dailyContactsData} barGap={1} barSize={12} margin={{ top: 20, right: 5, bottom: 5, left: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                  <XAxis dataKey="dia" tick={{ fontSize: 10 }} className="fill-muted-foreground" interval={0} />
                  <YAxis tick={{ fontSize: 10 }} className="fill-muted-foreground" allowDecimals={false} width={30} domain={[0, (dataMax: number) => Math.max(dataMax + 2, currentGoals.dailyContacts + 2, 5)]} />
                  <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8 }} />
                  {currentGoals.dailyContacts > 0 && (
                    <ReferenceLine y={currentGoals.dailyContacts} stroke="hsl(340, 75%, 55%)" strokeDasharray="6 3" strokeWidth={1.5} label={{ value: `Meta: ${currentGoals.dailyContacts}`, position: 'right', fontSize: 9, fill: 'hsl(340, 75%, 55%)' }} />
                  )}
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

          {/* Funnel - vertical card */}
          <Card>
            <CardHeader className="pb-2 px-3 sm:px-6">
              <CardTitle className="text-xs sm:text-sm">Funil de Vendas</CardTitle>
            </CardHeader>
            <CardContent className="px-3 sm:px-6 space-y-2">
              {funnelData.map((stage, idx) => {
                const maxCount = Math.max(...funnelData.map(s => s.value), 1);
                const pct = (stage.value / maxCount) * 100;
                const previousStageValue = idx === 0
                  ? stage.value
                  : [...funnelData.slice(0, idx)].reverse().find((s) => s.value > 0)?.value ?? 0;
                const conversionPct = idx === 0
                  ? '100.0'
                  : previousStageValue > 0
                  ? ((stage.value / previousStageValue) * 100).toFixed(1)
                  : '0.0';
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
                        <Badge variant="outline" className="text-[9px] px-1 py-0">{conversionPct}%</Badge>
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

        {/* Row 3: Vendor contacts + Products */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 sm:gap-4">
          {vendorFilter === 'all' && vendorContactsData.length > 0 ? (
            <Card>
              <CardHeader className="pb-2 px-3 sm:px-6">
                <CardTitle className="text-xs sm:text-sm flex items-center gap-1.5">
                  <Users className="h-3.5 w-3.5 sm:h-4 sm:w-4" /> Contatos por Vendedor
                </CardTitle>
              </CardHeader>
              <CardContent className="h-[220px] sm:h-[280px] px-1 sm:px-6">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={vendorContactsData} barSize={16} barGap={2} margin={{ top: 20, right: 5, bottom: 5, left: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                    <XAxis dataKey="name" tick={{ fontSize: 10 }} className="fill-muted-foreground" angle={-20} textAnchor="end" height={45} />
                    <YAxis tick={{ fontSize: 10 }} className="fill-muted-foreground" allowDecimals={false} width={30} domain={[0, (dataMax: number) => Math.max(dataMax + 3, 5)]} />
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
                  <BarChart data={productData} barSize={20} margin={{ top: 20, right: 5, bottom: 5, left: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                    <XAxis dataKey="name" tick={{ fontSize: 8 }} className="fill-muted-foreground" angle={-35} textAnchor="end" height={55} interval={0} />
                    <YAxis tick={{ fontSize: 10 }} className="fill-muted-foreground" allowDecimals={false} width={30} domain={[0, (dataMax: number) => Math.max(dataMax + 2, 5)]} />
                    <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8 }} />
                    <Bar dataKey="value" name="Leads" fill={CHART_COLOR} radius={[4, 4, 0, 0]}>
                      <LabelList dataKey="value" position="top" fontSize={10} className="fill-foreground" />
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
                    <Bar dataKey="value" name="Leads" fill={CHART_COLOR} radius={[0, 4, 4, 0]}>
                      <LabelList dataKey="value" position="right" fontSize={10} className="fill-foreground" />
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
