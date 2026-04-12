
import { useEffect, useState, useMemo, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Maximize2, Minimize2, Phone, MapPin, Package, Briefcase, Users, TrendingUp, Calendar, X, Target, DollarSign, BarChart3, AlertTriangle, ArrowUpRight, ArrowDownRight, Globe, CalendarDays, MessageCircle } from 'lucide-react';
import { LastUpdatedIndicator } from '@/components/ui/last-updated-indicator';
import { supabase } from '@/integrations/supabase/client';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LabelList, ReferenceLine, PieChart as RPieChart, Pie, Cell } from 'recharts';
import { cn } from '@/lib/utils';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, parseISO, subMonths } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Progress } from '@/components/ui/progress';
import type { CRMLead } from '@/pages/CRM';
import { CRM_STAGES, KANBAN_STAGES } from '@/pages/CRM';

interface CRMDashboardProps {
  leads: CRMLead[];
  lastUpdated?: Date | null;
  onRefresh?: () => void;
  isRefreshing?: boolean;
  tvMode?: boolean;
  origemFilter?: string;
  onOrigemChange?: (value: string) => void;
}

const CHART_COLOR = 'hsl(200, 98%, 39%)';

export function CRMDashboard({ leads, lastUpdated, onRefresh, isRefreshing, tvMode = false, origemFilter, onOrigemChange }: CRMDashboardProps) {
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [activities, setActivities] = useState<any[]>([]);
  const [allActivities, setAllActivities] = useState<any[]>([]);
  const [vendors, setVendors] = useState<{ id: string; name: string; avatar_url: string | null }[]>([]);
  const [lossReasons, setLossReasons] = useState<any[]>([]);
  const [vendorFilter, setVendorFilter] = useState('all');
  const [periodFilter, setPeriodFilter] = useState(() => format(new Date(), 'yyyy-MM'));
  const [dateFilter, setDateFilter] = useState('');
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

    // Load ALL activities — paginate to overcome 1000 row limit
    let allData: any[] = [];
    let from = 0;
    const pageSize = 1000;
    while (true) {
      const { data: batch } = await supabase
        .from('lead_activities')
        .select('*')
        .gte('created_at', start.toISOString())
        .lte('created_at', end.toISOString())
        .range(from, from + pageSize - 1);
      if (!batch || batch.length === 0) break;
      allData = allData.concat(batch);
      if (batch.length < pageSize) break;
      from += pageSize;
    }
    
    setAllActivities(allData);

    // Set filtered activities based on vendor
    if (vendorFilter !== 'all') {
      setActivities(allData.filter(a => a.user_id === vendorFilter));
    } else {
      setActivities(allData);
    }

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
    if (origemFilter && origemFilter !== 'all') {
      filtered = filtered.filter(l => {
        const leadOrigem = (l.source || l.origem || '').toLowerCase();
        return leadOrigem.includes(origemFilter.toLowerCase());
      });
    }
    return filtered;
  }, [leads, vendorFilter, origemFilter]);

  // Load historical stage counts from lead_activities (mudanca_status)
  const [historicalStageCounts, setHistoricalStageCounts] = useState<Record<string, { count: number; value: number }>>({});
  const loadHistoricalFunnel = useCallback(async () => {
    const [year, month] = periodFilter.split('-').map(Number);
    const start = startOfMonth(new Date(year, month - 1));
    const end = endOfMonth(new Date(year, month - 1));

    // Get all stage move activities in period
    let allMoves: any[] = [];
    let from = 0;
    const pageSize = 1000;
    while (true) {
      const { data: batch } = await supabase
        .from('lead_activities')
        .select('lead_id, description, user_id')
        .eq('activity_type', 'mudanca_status')
        .gte('created_at', start.toISOString())
        .lte('created_at', end.toISOString())
        .range(from, from + pageSize - 1);
      if (!batch || batch.length === 0) break;
      allMoves = allMoves.concat(batch);
      if (batch.length < pageSize) break;
      from += pageSize;
    }

    // Also count leads created in the period (they enter "Lead" stage)
    let leadsCreated: any[] = [];
    from = 0;
    while (true) {
      const { data: batch } = await supabase
        .from('leads')
        .select('id, valor_estimado, vendedor_id')
        .gte('created_at', start.toISOString())
        .lte('created_at', end.toISOString())
        .range(from, from + pageSize - 1);
      if (!batch || batch.length === 0) break;
      leadsCreated = leadsCreated.concat(batch);
      if (batch.length < pageSize) break;
      from += pageSize;
    }

    const counts: Record<string, { count: number; value: number }> = {};
    
    // Count leads entering "Lead" stage (created)
    const filteredCreated = vendorFilter !== 'all' 
      ? leadsCreated.filter((l: any) => l.vendedor_id === vendorFilter)
      : leadsCreated;
    counts['lead'] = { 
      count: filteredCreated.length, 
      value: filteredCreated.reduce((s: number, l: any) => s + (l.valor_estimado || 0), 0) 
    };

    // Parse activities to count entries into each stage
    const stageLabels: Record<string, string> = {};
    CRM_STAGES.forEach(s => { stageLabels[s.label.toLowerCase()] = s.key; });

    const filteredMoves = vendorFilter !== 'all'
      ? allMoves.filter(a => a.user_id === vendorFilter)
      : allMoves;

    filteredMoves.forEach((a: any) => {
      const desc = (a.description || '').toLowerCase();
      // Match "para "X"" pattern
      const match = desc.match(/para\s+"([^"]+)"/);
      if (match) {
        const targetLabel = match[1].toLowerCase();
        const stageKey = Object.entries(stageLabels).find(([label]) => label === targetLabel)?.[1];
        if (stageKey && stageKey !== 'lead') {
          if (!counts[stageKey]) counts[stageKey] = { count: 0, value: 0 };
          counts[stageKey].count++;
          // Find lead value
          const leadObj = leads.find(l => l.id === a.lead_id);
          if (leadObj) counts[stageKey].value += leadObj.valor_estimado || 0;
        }
      }
    });

    setHistoricalStageCounts(counts);
  }, [periodFilter, vendorFilter, leads]);

  useEffect(() => { loadHistoricalFunnel(); }, [loadHistoricalFunnel]);

  // All active leads (unfiltered) for funnel "Lead" stage
  const allActiveLeads = useMemo(() => leads.filter(l => l.status !== 'perdido'), [leads]);

  const lostLeads = useMemo(() => leads.filter(l => l.status !== 'perdido' ? false : true), [leads]);

  // For performance metrics: only count the FIRST contact per lead per day
  const contactActivities = useMemo(() => {
    const allContacts = activities.filter(a => a.activity_type === 'contato_inicial');
    const seen = new Set<string>();
    return allContacts.filter(a => {
      const day = format(new Date(a.created_at), 'yyyy-MM-dd');
      const key = `${a.lead_id}_${day}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }, [activities]);

  // ALL contact activities (unfiltered by vendor), deduplicated per lead per day
  const allContactActivities = useMemo(() => {
    const allContacts = allActivities.filter(a => a.activity_type === 'contato_inicial');
    const seen = new Set<string>();
    return allContacts.filter(a => {
      const day = format(new Date(a.created_at), 'yyyy-MM-dd');
      const key = `${a.lead_id}_${day}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }, [allActivities]);

  // KPIs
  const totalContacts = contactActivities.length;
  const totalVisits = activities.filter(a => a.activity_type === 'visita').length;
  const totalActivities = activities.length;
  const activeLeads = filteredLeads.length;
  const pipelineValue = filteredLeads.reduce((sum, l) => sum + (l.valor_estimado || 0), 0);
  const lostValue = lostLeads.reduce((sum, l) => sum + (l.valor_estimado || 0), 0);
  const lostPercent = activeLeads > 0 ? ((lostLeads.length / (activeLeads + lostLeads.length)) * 100).toFixed(1) : '0';

  // Today's contacts for progress — use dateFilter if set, else today
  const selectedDateStr = dateFilter || format(new Date(), 'yyyy-MM-dd');
  const todayContacts = useMemo(() => {
    const source = vendorFilter === 'all' ? allContactActivities : contactActivities;
    return source.filter(a => {
      const localDate = format(new Date(a.created_at), 'yyyy-MM-dd');
      return localDate === selectedDateStr;
    }).length;
  }, [allContactActivities, contactActivities, vendorFilter, selectedDateStr]);

  const todayVisitsCount = useMemo(() => {
    const source = vendorFilter === 'all' ? allActivities : activities;
    return source.filter(a => {
      if (a.activity_type !== 'visita') return false;
      const localDate = format(new Date(a.created_at), 'yyyy-MM-dd');
      return localDate === selectedDateStr;
    }).length;
  }, [allActivities, activities, vendorFilter, selectedDateStr]);

  // Daily contacts chart — use filtered activities, count ALL (no dedup)
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
        contatos: contactActivities.filter(a => format(new Date(a.created_at), 'yyyy-MM-dd') === dayStr).length,
        visitas: dayActivities.filter(a => a.activity_type === 'visita').length,
      };
    });
  }, [activities, contactActivities, periodFilter]);

  // Funnel data - historical totals per stage, exclude Análise Financeira
  const FUNNEL_STAGES = CRM_STAGES.filter(s => s.key !== 'analise_financeira');
  const funnelData = useMemo(() => {
    return FUNNEL_STAGES.map((s) => ({
      name: s.label,
      value: historicalStageCounts[s.key]?.count || 0,
      amount: historicalStageCounts[s.key]?.value || 0,
      fill: s.color,
    }));
  }, [historicalStageCounts]);

  // Contact channel distribution
  const CHANNEL_COLORS: Record<string, string> = {
    'ligacao': 'hsl(200, 98%, 39%)',
    'whatsapp': 'hsl(142, 76%, 36%)',
    'email': 'hsl(38, 92%, 50%)',
    'reuniao': 'hsl(262, 52%, 47%)',
  };
  const CHANNEL_LABELS: Record<string, string> = {
    'ligacao': 'Ligação',
    'whatsapp': 'WhatsApp',
    'email': 'E-mail',
    'reuniao': 'Reunião',
  };
  const channelData = useMemo(() => {
    const source = vendorFilter === 'all' ? allActivities : activities;
    const filtered = dateFilter
      ? source.filter(a => format(new Date(a.created_at), 'yyyy-MM-dd') === dateFilter)
      : source;
    const map: Record<string, number> = {};
    filtered.forEach(a => {
      if (a.contact_channel) {
        map[a.contact_channel] = (map[a.contact_channel] || 0) + 1;
      }
    });
    return Object.entries(map)
      .map(([key, value]) => ({ name: CHANNEL_LABELS[key] || key, value, fill: CHANNEL_COLORS[key] || 'hsl(200, 98%, 39%)' }))
      .sort((a, b) => b.value - a.value);
  }, [allActivities, activities, vendorFilter, dateFilter]);

  // Pending financial analyses count
  const pendingAnalyses = useMemo(() => {
    return leads.filter(l => l.status === 'analise_financeira');
  }, [leads]);

  // Helper to format name: first name only, proper case
  const formatFirstName = (name: string) => {
    const first = name.split(' ')[0];
    return first.charAt(0).toUpperCase() + first.slice(1).toLowerCase();
  };

  // Contacts per vendor for the contacts card — uses ALL activities, dedup by lead+day for performance
  const vendorContactsCardData = useMemo(() => {
    const map: Record<string, { todayContacts: number; monthContacts: number; avatar_url: string | null; vendorId: string }> = {};
    const seen = new Set<string>();

    allActivities.forEach(a => {
      if (a.activity_type !== 'contato_inicial') return;
      const day = format(new Date(a.created_at), 'yyyy-MM-dd');
      const dedupKey = `${a.lead_id}_${day}`;
      if (seen.has(dedupKey)) return;
      seen.add(dedupKey);

      const userId = a.user_id || 'unknown';
      if (!map[userId]) {
        const vendorInfo = vendors.find(v => v.id === userId);
        map[userId] = { todayContacts: 0, monthContacts: 0, avatar_url: vendorInfo?.avatar_url || null, vendorId: userId };
      }
      map[userId].monthContacts++;
      if (day === selectedDateStr) {
        map[userId].todayContacts++;
      }
    });

    return Object.entries(map)
      .sort((a, b) => b[1].todayContacts - a[1].todayContacts || b[1].monthContacts - a[1].monthContacts)
      .map(([id, data], idx) => {
        const vendorInfo = vendors.find(v => v.id === id);
        const fullName = vendorInfo?.name || 'Sem vendedor';
        return { name: formatFirstName(fullName), fullName, ...data, rank: idx + 1 };
      });
  }, [allActivities, vendors, selectedDateStr]);

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

  // Contacts per vendor chart — dedup by lead+day for performance
  const vendorContactsData = useMemo(() => {
    if (vendorFilter !== 'all') return [];
    const map: Record<string, { contatos: number; visitas: number }> = {};
    const seen = new Set<string>();
    
    // Filter by date if dateFilter is set
    const filteredAll = dateFilter
      ? allActivities.filter(a => format(new Date(a.created_at), 'yyyy-MM-dd') === dateFilter)
      : allActivities;

    filteredAll.forEach(a => {
      const fullName = a.sdr_name || vendors.find(v => v.id === a.user_id)?.name || 'Desconhecido';
      const firstName = fullName.split(' ')[0];

      if (a.activity_type === 'contato_inicial') {
        const day = format(new Date(a.created_at), 'yyyy-MM-dd');
        const dedupKey = `${a.lead_id}_${day}`;
        if (!seen.has(dedupKey)) {
          seen.add(dedupKey);
          if (!map[firstName]) map[firstName] = { contatos: 0, visitas: 0 };
          map[firstName].contatos++;
        }
      }
      if (a.activity_type === 'visita') {
        if (!map[firstName]) map[firstName] = { contatos: 0, visitas: 0 };
        map[firstName].visitas++;
      }
    });
    return Object.entries(map)
      .map(([name, data]) => ({ name, ...data }))
      .sort((a, b) => (b.contatos + b.visitas) - (a.contatos + a.visitas));
  }, [allActivities, vendors, vendorFilter, dateFilter]);

  const clearFilters = () => {
    setVendorFilter('all');
    setPeriodFilter(format(new Date(), 'yyyy-MM'));
    setDateFilter('');
  };
  const hasFilters = vendorFilter !== 'all' || periodFilter !== format(new Date(), 'yyyy-MM') || dateFilter !== '';

  const formatCurrency = (value: number) => {
    if (value >= 1_000_000) return `R$ ${(value / 1_000_000).toFixed(2).replace('.', ',')}mi`;
    if (value >= 1_000) return `R$ ${(value / 1_000).toFixed(0)}k`;
    return `R$ ${value.toLocaleString('pt-BR')}`;
  };

  const rankColors = ['text-amber-500', 'text-slate-400', 'text-amber-700'];

  return (
    <div className="overflow-auto">
      <div className="space-y-3 sm:space-y-4">
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

            <div className="flex items-center gap-1.5">
              <CalendarDays className="h-3 w-3 text-muted-foreground shrink-0" />
              <input
                type="date"
                value={dateFilter}
                onChange={(e) => setDateFilter(e.target.value)}
                className="h-8 text-xs border rounded-md px-2 bg-background text-foreground"
              />
            </div>

            {hasFilters && (
              <Button variant="ghost" size="sm" className="h-8 text-xs gap-1" onClick={clearFilters}>
                <X className="h-3 w-3" /> Limpar
              </Button>
            )}

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
                <span className="text-base font-semibold text-foreground">
                  {dateFilter ? `Progresso ${new Date(dateFilter + 'T12:00:00').toLocaleDateString('pt-BR')}` : 'Progresso Diário'}
                </span>
                <Phone className="h-4 w-4 text-muted-foreground" />
              </div>

              <div className="space-y-3">
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-sm text-muted-foreground">{dateFilter ? 'Contatos' : 'Contatos Hoje'}</span>
                    <span className="text-lg font-bold text-foreground">
                      {todayContacts}{currentGoals.dailyContacts > 0 && <span className="text-xs font-normal text-muted-foreground">/{currentGoals.dailyContacts}</span>}
                    </span>
                  </div>
                  {currentGoals.dailyContacts > 0 && <Progress value={Math.min((todayContacts / currentGoals.dailyContacts) * 100, 100)} className="h-2" />}
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-sm text-muted-foreground">{dateFilter ? 'Visitas' : 'Visitas Hoje'}</span>
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

          {/* Contatos Card - compact two-column layout */}
          <Card className="border-l-4 border-l-secondary overflow-hidden">
            <CardContent className="p-3 h-full flex flex-col">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-semibold text-foreground">Contatos</span>
                <Badge variant="outline" className="text-[10px]">
                  {dateFilter ? new Date(dateFilter + 'T12:00:00').toLocaleDateString('pt-BR') : 'Hoje'}
                </Badge>
              </div>

              <div className="grid grid-cols-2 gap-x-2 gap-y-1 flex-1 overflow-y-auto pr-0.5">
                {vendorContactsCardData.map((vendor, idx) => (
                  <div
                    key={vendor.vendorId || vendor.name}
                    className="flex items-center gap-1.5 rounded-md border bg-card p-1.5"
                  >
                    <Avatar className="h-5 w-5 shrink-0">
                      <AvatarImage src={vendor.avatar_url || ''} />
                      <AvatarFallback className="text-[7px] bg-muted">{vendor.name.slice(0, 2).toUpperCase()}</AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <p className="text-[10px] font-medium text-foreground truncate">{vendor.name}</p>
                      <div className="flex items-center gap-1">
                        <span className="text-[10px] font-bold text-primary">{vendor.todayContacts}</span>
                        <span className="text-[8px] text-muted-foreground">/ {vendor.monthContacts} mês</span>
                      </div>
                    </div>
                  </div>
                ))}

                {vendorContactsCardData.length === 0 && (
                  <p className="text-xs text-muted-foreground py-2 col-span-2">Sem dados</p>
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
                // Conversion % is always calculated from "Contato Feito" stage
                const contatoFeitoValue = funnelData.find(s => s.name === 'Contato Feito')?.value || 0;
                const conversionPct = idx === 0
                  ? '100.0'
                  : idx === 1
                  ? '100.0' // Contato Feito is the base
                  : contatoFeitoValue > 0
                  ? ((stage.value / contatoFeitoValue) * 100).toFixed(1)
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

        {/* Row 4.5: Channel distribution + Pending Analyses */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 sm:gap-4">
          <Card>
            <CardHeader className="pb-2 px-3 sm:px-6">
              <CardTitle className="text-xs sm:text-sm flex items-center gap-1.5">
                <MessageCircle className="h-3.5 w-3.5 sm:h-4 sm:w-4" /> Canal de Contato
              </CardTitle>
            </CardHeader>
            <CardContent className="h-[220px] sm:h-[260px] px-1 sm:px-6">
              {channelData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <RPieChart>
                    <Pie
                      data={channelData}
                      cx="50%"
                      cy="50%"
                      innerRadius={50}
                      outerRadius={80}
                      paddingAngle={3}
                      dataKey="value"
                      label={({ name, value, percent }) => `${name}: ${value} (${(percent * 100).toFixed(0)}%)`}
                    >
                      {channelData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.fill} />
                      ))}
                    </Pie>
                    <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8 }} />
                  </RPieChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex items-center justify-center h-full text-muted-foreground text-xs">Nenhum contato com canal registrado</div>
              )}
            </CardContent>
          </Card>

          {/* Pending Financial Analyses */}
          <Card>
            <CardHeader className="pb-2 px-3 sm:px-6">
              <CardTitle className="text-xs sm:text-sm flex items-center gap-1.5">
                <DollarSign className="h-3.5 w-3.5 sm:h-4 sm:w-4" /> Análises Financeiras Pendentes
                {pendingAnalyses.length > 0 && (
                  <Badge variant="destructive" className="text-[10px] ml-1">{pendingAnalyses.length}</Badge>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent className="px-3 sm:px-6 overflow-y-auto max-h-[220px] sm:max-h-[260px]">
              {pendingAnalyses.length === 0 ? (
                <div className="flex items-center justify-center h-[180px] text-muted-foreground text-xs">Nenhuma análise pendente</div>
              ) : (
                <div className="space-y-2">
                  {pendingAnalyses.map(lead => {
                    const daysSinceUpdate = Math.floor((Date.now() - new Date(lead.updated_at).getTime()) / 86400000);
                    const hours = Math.floor((Date.now() - new Date(lead.updated_at).getTime()) / 3600000);
                    const durationLabel = daysSinceUpdate >= 1 ? `${daysSinceUpdate}d` : `${hours}h`;
                    return (
                      <div
                        key={lead.id}
                        className="flex items-center justify-between rounded-lg border p-2.5 hover:bg-muted/50 cursor-pointer transition-colors"
                        onClick={() => {
                          // Navigate to CRM kanban and open this lead
                          const url = new URL(window.location.href);
                          url.searchParams.set('lead', lead.id);
                          window.history.pushState({}, '', url.toString());
                          window.dispatchEvent(new PopStateEvent('popstate'));
                        }}
                      >
                        <div className="min-w-0 flex-1">
                          <p className="text-xs font-medium text-foreground truncate">{lead.empresa || lead.client_name || lead.cliente_nome}</p>
                          <div className="flex items-center gap-2 mt-0.5">
                            {lead.cidade && lead.estado && (
                              <span className="text-[10px] text-muted-foreground">{lead.cidade}/{lead.estado}</span>
                            )}
                            {lead.budget_number && (
                              <Badge variant="outline" className="text-[9px]">Pedido {lead.budget_number}</Badge>
                            )}
                          </div>
                        </div>
                        <div className="flex flex-col items-end shrink-0 ml-2">
                          <span className="text-[10px] text-muted-foreground">
                            {format(new Date(lead.updated_at), 'dd/MM', { locale: ptBR })}
                          </span>
                          <Badge variant="outline" className={cn("text-[9px] px-1 py-0 mt-0.5", daysSinceUpdate >= 3 ? 'border-destructive/50 text-destructive' : daysSinceUpdate >= 1 ? 'border-amber-400 text-amber-600' : '')}>
                            {durationLabel}
                          </Badge>
                        </div>
                      </div>
                    );
                  })}
                </div>
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
