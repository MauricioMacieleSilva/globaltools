
import { useEffect, useState } from 'react';
import { Card } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Users, TrendingUp } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import type { CRMLead } from '@/pages/CRM';

interface TeamPerformanceProps {
  leads: CRMLead[];
}

interface UserPerf {
  id: string;
  name: string;
  leadsCreated: number;
  contacts: number;
  conversions: number;
  totalLeads: number;
  conversionRate: number;
  totalValue: number;
}

export function TeamPerformance({ leads }: TeamPerformanceProps) {
  const [period, setPeriod] = useState('30d');
  const [vendors, setVendors] = useState<{ id: string; full_name: string }[]>([]);
  const [activities, setActivities] = useState<{ user_id: string; activity_type: string; lead_id: string; created_at: string }[]>([]);

  useEffect(() => {
    const load = async () => {
      const { data: v } = await supabase.from('user_profiles').select('id, full_name');
      if (v) setVendors(v);

      const days = period === '7d' ? 7 : period === '30d' ? 30 : 90;
      const cutoff = new Date(Date.now() - days * 86400000).toISOString();
      const { data: a } = await supabase.from('lead_activities').select('user_id, activity_type').gte('created_at', cutoff);
      if (a) setActivities(a);
    };
    load();
  }, [period]);

  const days = period === '7d' ? 7 : period === '30d' ? 30 : 90;
  const cutoff = new Date(Date.now() - days * 86400000);

  const perfData: UserPerf[] = vendors.map(v => {
    const userLeads = leads.filter(l => l.vendedor_id === v.id && new Date(l.created_at) >= cutoff);
    const userActivities = activities.filter(a => a.user_id === v.id);
    const contacts = userActivities.filter(a => a.activity_type === 'contato_inicial').length;
    const conversions = userLeads.filter(l => l.status === 'pedido_fechado').length;
    const totalValue = userLeads.filter(l => l.status === 'pedido_fechado').reduce((s, l) => s + (l.valor_estimado || 0), 0);
    return {
      id: v.id,
      name: v.full_name,
      leadsCreated: userLeads.length,
      contacts,
      conversions,
      totalLeads: userLeads.length,
      conversionRate: userLeads.length > 0 ? (conversions / userLeads.length) * 100 : 0,
      totalValue,
    };
  }).filter(p => p.leadsCreated > 0 || p.contacts > 0).sort((a, b) => b.conversions - a.conversions);

  return (
    <Card className="p-4 space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="p-2 rounded-lg bg-primary/10">
            <Users className="h-4 w-4 text-primary" />
          </div>
          <h3 className="text-sm font-semibold text-foreground">Performance do Time</h3>
        </div>
        <Select value={period} onValueChange={setPeriod}>
          <SelectTrigger className="w-[140px] h-8 text-xs"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="7d">Últimos 7 dias</SelectItem>
            <SelectItem value="30d">Últimos 30 dias</SelectItem>
            <SelectItem value="90d">Últimos 90 dias</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {perfData.length === 0 ? (
        <p className="text-sm text-muted-foreground text-center py-6">Sem dados no período</p>
      ) : (
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="text-xs">Vendedor</TableHead>
                <TableHead className="text-xs text-center">Leads</TableHead>
                <TableHead className="text-xs text-center">Contatos</TableHead>
                <TableHead className="text-xs text-center">Pedidos</TableHead>
                <TableHead className="text-xs text-center">Conversão</TableHead>
                <TableHead className="text-xs text-right">Valor</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {perfData.map(p => (
                <TableRow key={p.id}>
                  <TableCell className="text-sm font-medium">{p.name}</TableCell>
                  <TableCell className="text-center text-sm">{p.leadsCreated}</TableCell>
                  <TableCell className="text-center text-sm">{p.contacts}</TableCell>
                  <TableCell className="text-center text-sm">{p.conversions}</TableCell>
                  <TableCell className="text-center">
                    <Badge variant={p.conversionRate >= 20 ? 'default' : 'secondary'} className="text-[10px]">
                      {p.conversionRate.toFixed(1)}%
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right text-sm font-medium">
                    {p.totalValue > 0 ? `R$ ${p.totalValue.toLocaleString('pt-BR')}` : '—'}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </Card>
  );
}
