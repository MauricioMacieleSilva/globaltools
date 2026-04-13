import { useState, useEffect, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { ArrowRightLeft } from 'lucide-react';
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
    handoff_sdr_name: string | null;
  } | null;
  vendedor_name: string | null;
}

interface HandoffHistoryProps {
  onLeadClick: (lead: CRMLead) => void;
  leads: CRMLead[];
  searchQuery?: string;
  vendorFilter?: string;
  origemFilter?: string;
  kanbanDateFilter?: string;
}

export function HandoffHistory({ onLeadClick, leads, searchQuery = '', vendorFilter = 'all', origemFilter = 'all', kanbanDateFilter = '' }: HandoffHistoryProps) {
  const [records, setRecords] = useState<HandoffRecord[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadHandoffs();
  }, []);

  const loadHandoffs = async () => {
    setLoading(true);
    try {
      // Get all activities where lead was moved TO "Passagem de Bastão" (old or new label)
      const { data: activitiesOld } = await supabase
        .from('lead_activities')
        .select('id, lead_id, sdr_name, created_at')
        .eq('activity_type', 'mudanca_status')
        .ilike('description', '%para "Passagem de Bastão"%')
        .order('created_at', { ascending: false });

      const { data: activitiesNew } = await supabase
        .from('lead_activities')
        .select('id, lead_id, sdr_name, created_at')
        .eq('activity_type', 'mudanca_status')
        .ilike('description', '%para "Bastão"%')
        .order('created_at', { ascending: false });

      // Merge and deduplicate by id
      const allActivitiesMap = new Map<string, any>();
      for (const a of [...(activitiesOld || []), ...(activitiesNew || [])]) {
        if (!allActivitiesMap.has(a.id)) allActivitiesMap.set(a.id, a);
      }
      const activities = Array.from(allActivitiesMap.values())
        .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

      if (!activities.length) {
        setRecords([]);
        setLoading(false);
        return;
      }

      // Get unique lead IDs
      const leadIds = [...new Set(activities.map(a => a.lead_id))];

      // Load lead data including persisted handoff_sdr_name
      const { data: leadsData } = await (supabase as any)
        .from('leads')
        .select('id, cliente_nome, empresa, client_name, status, valor_estimado, vendedor_id, handoff_sdr_name')
        .in('id', leadIds);

      // Load vendor names
      const vendorIds = [...new Set((leadsData || []).filter((l: any) => l.vendedor_id).map((l: any) => l.vendedor_id))] as string[];
      let profileMap: Record<string, string> = {};
      if (vendorIds.length > 0) {
        const { data: profiles } = await supabase
          .from('user_profiles')
          .select('id, full_name')
          .in('id', vendorIds);
        profileMap = (profiles || []).reduce((acc, v) => ({ ...acc, [v.id]: v.full_name }), {} as Record<string, string>);
      }

      const leadMap = (leadsData || []).reduce((acc: any, l: any) => ({ ...acc, [l.id]: l }), {});

      const mapped: HandoffRecord[] = activities.map(a => {
        const lead = leadMap[a.lead_id] || null;
        // Use persisted handoff_sdr_name from the lead (instant, reliable)
        const sdrName = lead?.handoff_sdr_name || a.sdr_name || null;
        return {
          id: a.id,
          lead_id: a.lead_id,
          sdr_name: sdrName,
          handoff_date: a.created_at,
          lead,
          vendedor_name: lead?.vendedor_id ? profileMap[lead.vendedor_id] || null : null,
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
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      result = result.filter(r =>
        (r.lead?.empresa || '').toLowerCase().includes(q) ||
        (r.lead?.cliente_nome || '').toLowerCase().includes(q) ||
        (r.lead?.client_name || '').toLowerCase().includes(q) ||
        (r.sdr_name || '').toLowerCase().includes(q) ||
        (r.vendedor_name || '').toLowerCase().includes(q)
      );
    }
    if (kanbanDateFilter) {
      result = result.filter(r => r.handoff_date >= kanbanDateFilter);
    }
    return result;
  }, [records, searchQuery, kanbanDateFilter]);

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
