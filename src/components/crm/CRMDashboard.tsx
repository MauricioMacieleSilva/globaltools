
import { useEffect, useState, useMemo, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Maximize2, Minimize2, Phone, MapPin, Package, Briefcase, Users, TrendingUp, Calendar, X, Target } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, LabelList } from 'recharts';
import { cn } from '@/lib/utils';
import { AlertTriangle } from 'lucide-react';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, parseISO, subMonths } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import type { CRMLead } from '@/pages/CRM';

interface CRMDashboardProps {
  leads: CRMLead[];
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

export function CRMDashboard({ leads }: CRMDashboardProps) {
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [activities, setActivities] = useState<any[]>([]);
  const [vendors, setVendors] = useState<{ id: string; name: string }[]>([]);
  const [lossReasons, setLossReasons] = useState<any[]>([]);
  const [vendorFilter, setVendorFilter] = useState('all');
  const [periodFilter, setPeriodFilter] = useState(() => format(new Date(), 'yyyy-MM'));
  const [loading, setLoading] = useState(true);

  // Generate months for the last 12 months
  const monthOptions = useMemo(() => {
    const months = [];
    for (let i = 0; i < 12; i++) {
      const d = subMonths(new Date(), i);
      months.push({ value: format(d, 'yyyy-MM'), label: format(d, 'MMMM yyyy', { locale: ptBR }) });
    }
    return months;
  }, []);

  const loadVendors = useCallback(async () => {
    const { data } = await supabase.from('user_profiles').select('id, full_name');
    if (data) setVendors(data.map(v => ({ id: v.id, name: v.full_name })));
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

    // Load loss reasons from lead_dispositions for the period
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

  useEffect(() => { loadVendors(); }, [loadVendors]);
  useEffect(() => { loadActivities(); }, [loadActivities]);

  // Filter leads by vendor
  const filteredLeads = useMemo(() => {
    let filtered = leads.filter(l => l.status !== 'perdido');
    if (vendorFilter !== 'all') {
      filtered = filtered.filter(l => l.vendedor_id === vendorFilter);
    }
    return filtered;
  }, [leads, vendorFilter]);

  // KPIs
  const totalContacts = activities.filter(a => a.activity_type === 'contato_inicial').length;
  const totalVisits = activities.filter(a => a.activity_type === 'visita').length;
  const totalActivities = activities.length;
  const activeLeads = filteredLeads.length;

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
        contatos: dayActivities.filter(a => a.activity_type === 'contato_inicial').length,
        visitas: dayActivities.filter(a => a.activity_type === 'visita').length,
      };
    });
  }, [activities, periodFilter]);

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

  // Funnel data
  const funnelData = useMemo(() => {
    const stages = [
      { key: 'lead', label: 'Lead' },
      { key: 'contato_feito', label: 'Contato Feito' },
      { key: 'visita_reuniao', label: 'Visita/Reunião' },
      { key: 'proposta', label: 'Proposta' },
      { key: 'pedido', label: 'Pedido' },
    ];
    return stages.map((s, i) => ({
      name: s.label,
      value: filteredLeads.filter(l => l.status === s.key).length,
      fill: CHART_COLORS[i],
    }));
  }, [filteredLeads]);

  const clearFilters = () => {
    setVendorFilter('all');
    setPeriodFilter(format(new Date(), 'yyyy-MM'));
  };

  const hasFilters = vendorFilter !== 'all' || periodFilter !== format(new Date(), 'yyyy-MM');

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

      <div className={cn("space-y-4", isFullscreen && "p-6")}>
        {/* Filters bar */}
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

        {/* KPIs */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <Card>
            <CardContent className="p-3 sm:p-4">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-lg bg-primary/10">
                  <Phone className="h-4 w-4 text-primary" />
                </div>
                <div>
                  <p className="text-[10px] sm:text-xs text-muted-foreground">Contatos no Mês</p>
                  <p className="text-lg sm:text-2xl font-bold text-foreground">{totalContacts}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-3 sm:p-4">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-lg bg-accent">
                  <MapPin className="h-4 w-4 text-accent-foreground" />
                </div>
                <div>
                  <p className="text-[10px] sm:text-xs text-muted-foreground">Visitas no Mês</p>
                  <p className="text-lg sm:text-2xl font-bold text-foreground">{totalVisits}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-3 sm:p-4">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-lg bg-primary/10">
                  <TrendingUp className="h-4 w-4 text-primary" />
                </div>
                <div>
                  <p className="text-[10px] sm:text-xs text-muted-foreground">Atividades Total</p>
                  <p className="text-lg sm:text-2xl font-bold text-foreground">{totalActivities}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-3 sm:p-4">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-lg bg-accent">
                  <Target className="h-4 w-4 text-accent-foreground" />
                </div>
                <div>
                  <p className="text-[10px] sm:text-xs text-muted-foreground">Leads Ativos</p>
                  <p className="text-lg sm:text-2xl font-bold text-foreground">{activeLeads}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Row 1: Daily contacts + Funnel */}
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-3 sm:gap-4">
          <Card>
            <CardHeader className="pb-2 px-3 sm:px-6">
              <CardTitle className="text-xs sm:text-sm">Contatos e Visitas Diárias</CardTitle>
            </CardHeader>
            <CardContent className="h-[200px] sm:h-[260px] px-2 sm:px-6">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={dailyContactsData} barGap={2}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                  <XAxis dataKey="dia" tick={{ fontSize: 9 }} className="fill-muted-foreground" interval="preserveStartEnd" />
                  <YAxis tick={{ fontSize: 10 }} className="fill-muted-foreground" allowDecimals={false} width={30} />
                  <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8 }} />
                  <Bar dataKey="contatos" name="Contatos" fill="hsl(200, 98%, 39%)" radius={[3, 3, 0, 0]}>
                    <LabelList dataKey="contatos" position="top" fontSize={9} className="fill-foreground" formatter={(v: number) => v > 0 ? v : ''} />
                  </Bar>
                  <Bar dataKey="visitas" name="Visitas" fill="hsl(262, 52%, 47%)" radius={[3, 3, 0, 0]}>
                    <LabelList dataKey="visitas" position="top" fontSize={9} className="fill-foreground" formatter={(v: number) => v > 0 ? v : ''} />
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2 px-3 sm:px-6">
              <CardTitle className="text-xs sm:text-sm">Funil de Vendas</CardTitle>
            </CardHeader>
            <CardContent className="h-[200px] sm:h-[260px] px-2 sm:px-6">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={funnelData} layout="vertical" barSize={20}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                  <XAxis type="number" tick={{ fontSize: 10 }} className="fill-muted-foreground" allowDecimals={false} />
                  <YAxis dataKey="name" type="category" tick={{ fontSize: 9 }} className="fill-muted-foreground" width={75} />
                  <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8 }} />
                  <Bar dataKey="value" name="Leads" radius={[0, 4, 4, 0]}>
                    <LabelList dataKey="value" position="right" fontSize={10} className="fill-foreground" formatter={(v: number) => v > 0 ? v : ''} />
                    {funnelData.map((entry, i) => (
                      <Cell key={i} fill={entry.fill} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>

        {/* Row 2: Locations + Products */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 sm:gap-4">
          <Card>
            <CardHeader className="pb-2 px-3 sm:px-6">
              <CardTitle className="text-xs sm:text-sm flex items-center gap-1.5">
                <MapPin className="h-3.5 w-3.5 sm:h-4 sm:w-4" /> Cidades / Estados com mais Leads
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
                <div className="flex items-center justify-center h-full text-muted-foreground text-xs sm:text-sm">
                  Nenhum dado de localização disponível
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2 px-3 sm:px-6">
              <CardTitle className="text-xs sm:text-sm flex items-center gap-1.5">
                <Package className="h-3.5 w-3.5 sm:h-4 sm:w-4" /> Produtos de Interesse
              </CardTitle>
            </CardHeader>
            <CardContent className="h-[220px] sm:h-[280px] px-1 sm:px-6">
              {productData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={productData} layout="vertical" barSize={14}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                    <XAxis type="number" tick={{ fontSize: 10 }} className="fill-muted-foreground" allowDecimals={false} />
                    <YAxis dataKey="name" type="category" tick={{ fontSize: 9 }} className="fill-muted-foreground" width={90} />
                    <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8 }} />
                    <Bar dataKey="value" name="Leads" radius={[0, 4, 4, 0]}>
                      <LabelList dataKey="value" position="right" fontSize={10} className="fill-foreground" />
                      {productData.map((_, i) => (
                        <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex items-center justify-center h-full text-muted-foreground text-xs sm:text-sm">
                  Nenhum dado de produto disponível
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Row 3: Sectors + Loss Reasons */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 sm:gap-4">
          <Card>
            <CardHeader className="pb-2 px-3 sm:px-6">
              <CardTitle className="text-xs sm:text-sm flex items-center gap-1.5">
                <Briefcase className="h-3.5 w-3.5 sm:h-4 sm:w-4" /> Ramo de Atuação
              </CardTitle>
            </CardHeader>
            <CardContent className="h-[220px] sm:h-[280px] px-1 sm:px-6">
              {sectorData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={sectorData} barSize={20}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                    <XAxis dataKey="name" tick={{ fontSize: 8 }} className="fill-muted-foreground" angle={-35} textAnchor="end" height={55} interval={0} />
                    <YAxis tick={{ fontSize: 10 }} className="fill-muted-foreground" allowDecimals={false} width={30} />
                    <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8 }} />
                    <Bar dataKey="value" name="Leads" fill="hsl(38, 92%, 50%)" radius={[4, 4, 0, 0]}>
                      <LabelList dataKey="value" position="top" fontSize={10} className="fill-foreground" />
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex items-center justify-center h-full text-muted-foreground text-xs sm:text-sm">
                  Nenhum dado de ramo disponível
                </div>
              )}
            </CardContent>
          </Card>

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
                <div className="flex items-center justify-center h-full text-muted-foreground text-xs sm:text-sm">
                  Nenhum motivo de perda no período
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Row 4: Vendor performance */}
        {vendorFilter === 'all' && vendorContactsData.length > 0 && (
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
        )}
      </div>
    </div>
  );
}
