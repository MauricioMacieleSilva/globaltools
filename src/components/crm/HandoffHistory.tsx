import { useState, useEffect, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Search, ArrowRightLeft } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { CRM_STAGES, type CRMLead } from '@/pages/CRM';

interface HandoffRecord {
  id: string;
  lead_id: string;
  sdr_name: string | null;
  handoff_date: string;
  lead: {
    cliente_nome: string;
    empresa: string | null;
    client_name: string | null;
    status: string;
    valor_estimado: number | null;
    vendedor_id: string | null;
  } | null;
  vendedor_name: string | null;
}

interface HandoffHistoryProps {
  onLeadClick: (lead: CRMLead) => void;
  leads: CRMLead[];
}

export function HandoffHistory({ onLeadClick, leads }: HandoffHistoryProps) {
  const [records, setRecords] = useState<HandoffRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  useEffect(() => {
    loadHandoffs();
  }, []);

  const loadHandoffs = async () => {
    setLoading(true);
    try {
      // Get all activities where lead was moved TO "Passagem de Bastão"
      const { data: activities, error } = await supabase
        .from('lead_activities')
        .select('id, lead_id, sdr_name, created_at')
        .eq('activity_type', 'mudanca_status')
        .ilike('description', '%para "Passagem de Bastão"%')
        .order('created_at', { ascending: false });

      if (error) throw error;
      if (!activities?.length) {
        setRecords([]);
        setLoading(false);
        return;
      }

      // Get unique lead IDs
      const leadIds = [...new Set(activities.map(a => a.lead_id))];

      // Load lead data
      const { data: leadsData } = await (supabase as any)
        .from('leads')
        .select('id, cliente_nome, empresa, client_name, status, valor_estimado, vendedor_id')
        .in('id', leadIds);

      // Load vendor names for leads that have vendedor_id
      const vendorIds = [...new Set((leadsData || []).filter((l: any) => l.vendedor_id).map((l: any) => l.vendedor_id))] as string[];
      let vendorMap: Record<string, string> = {};
      if (vendorIds.length > 0) {
        const { data: vendors } = await supabase
          .from('user_profiles')
          .select('id, full_name')
          .in('id', vendorIds);
        vendorMap = (vendors || []).reduce((acc, v) => ({ ...acc, [v.id]: v.full_name }), {} as Record<string, string>);
      }

      const leadMap = (leadsData || []).reduce((acc: any, l: any) => ({ ...acc, [l.id]: l }), {});

      const mapped: HandoffRecord[] = activities.map(a => {
        const lead = leadMap[a.lead_id] || null;
        return {
          id: a.id,
          lead_id: a.lead_id,
          sdr_name: a.sdr_name,
          handoff_date: a.created_at,
          lead,
          vendedor_name: lead?.vendedor_id ? vendorMap[lead.vendedor_id] || null : null,
        };
      });

      setRecords(mapped);
    } catch (err) {
      console.error('Erro ao carregar histórico de bastão:', err);
    } finally {
      setLoading(false);
    }
  };

  const filtered = useMemo(() => {
    let result = records;
    if (search) {
      const q = search.toLowerCase();
      result = result.filter(r =>
        (r.lead?.empresa || '').toLowerCase().includes(q) ||
        (r.lead?.cliente_nome || '').toLowerCase().includes(q) ||
        (r.lead?.client_name || '').toLowerCase().includes(q) ||
        (r.sdr_name || '').toLowerCase().includes(q) ||
        (r.vendedor_name || '').toLowerCase().includes(q)
      );
    }
    if (dateFrom) {
      result = result.filter(r => r.handoff_date >= dateFrom);
    }
    if (dateTo) {
      const end = dateTo + 'T23:59:59';
      result = result.filter(r => r.handoff_date <= end);
    }
    return result;
  }, [records, search, dateFrom, dateTo]);

  const getStatusBadge = (status: string) => {
    const stage = CRM_STAGES.find(s => s.key === status);
    if (!stage) return <Badge variant="outline">{status}</Badge>;
    return (
      <Badge style={{ backgroundColor: stage.color, color: '#fff' }} className="text-[10px]">
        {stage.label}
      </Badge>
    );
  };

  const handleRowClick = (leadId: string) => {
    const lead = leads.find(l => l.id === leadId);
    if (lead) onLeadClick(lead);
  };

  if (loading) {
    return (
      <div className="space-y-3 p-4">
        {Array.from({ length: 5 }).map((_, i) => (
          <Skeleton key={i} className="h-12 w-full" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por empresa, SDR ou vendedor..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="pl-9 h-9"
          />
        </div>
        <div className="flex items-center gap-2">
          <input
            type="date"
            value={dateFrom}
            onChange={e => setDateFrom(e.target.value)}
            className="h-9 text-xs border rounded-md px-2 bg-background text-foreground"
            placeholder="De"
          />
          <span className="text-xs text-muted-foreground">até</span>
          <input
            type="date"
            value={dateTo}
            onChange={e => setDateTo(e.target.value)}
            className="h-9 text-xs border rounded-md px-2 bg-background text-foreground"
            placeholder="Até"
          />
        </div>
      </div>

      {filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
          <ArrowRightLeft className="h-10 w-10 mb-3 opacity-40" />
          <p className="text-sm">Nenhuma passagem de bastão encontrada</p>
        </div>
      ) : (
        <div className="border rounded-lg">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Empresa / Cliente</TableHead>
                <TableHead>SDR (passou)</TableHead>
                <TableHead>Vendedor (recebeu)</TableHead>
                <TableHead>Data</TableHead>
                <TableHead>Status Atual</TableHead>
                <TableHead className="text-right">Valor Estimado</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map(r => (
                <TableRow
                  key={r.id}
                  className="cursor-pointer hover:bg-muted/60"
                  onClick={() => handleRowClick(r.lead_id)}
                >
                  <TableCell className="font-medium">
                    {r.lead?.empresa || r.lead?.client_name || r.lead?.cliente_nome || '—'}
                  </TableCell>
                  <TableCell>{r.sdr_name || '—'}</TableCell>
                  <TableCell>{r.vendedor_name || '—'}</TableCell>
                  <TableCell className="text-xs">
                    {format(new Date(r.handoff_date), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                  </TableCell>
                  <TableCell>
                    {r.lead ? getStatusBadge(r.lead.status) : <Badge variant="outline">Removido</Badge>}
                  </TableCell>
                  <TableCell className="text-right">
                    {r.lead?.valor_estimado
                      ? new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(r.lead.valor_estimado)
                      : '—'}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      <p className="text-xs text-muted-foreground">
        {filtered.length} passagen{filtered.length !== 1 ? 's' : ''} de bastão encontrada{filtered.length !== 1 ? 's' : ''}
      </p>
    </div>
  );
}
