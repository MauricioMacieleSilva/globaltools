import { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Search, FileText, Calendar, DollarSign, Building2, Package } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

interface CompetitorAttachment {
  id: string;
  lead_id: string;
  file_name: string;
  file_url: string;
  competitor_name: string | null;
  competitor_value: number | null;
  competitor_date: string | null;
  competitor_materials: string | null;
  created_at: string;
  uploaded_by_name: string | null;
  lead_empresa?: string;
  lead_cliente_nome?: string;
}

interface GroupedCompetitor {
  name: string;
  proposals: CompetitorAttachment[];
  totalValue: number;
}

export function CompetitorProposalsView() {
  const [attachments, setAttachments] = useState<CompetitorAttachment[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  useEffect(() => {
    loadCompetitorProposals();
  }, []);

  const loadCompetitorProposals = async () => {
    setLoading(true);
    try {
      const { data, error } = await (supabase as any)
        .from('lead_attachments')
        .select('id, lead_id, file_name, file_url, competitor_name, competitor_value, competitor_date, competitor_materials, created_at, uploaded_by_name')
        .eq('document_type', 'proposta_concorrencia')
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Fetch lead names for each attachment
      const leadIds = [...new Set((data || []).map((a: any) => a.lead_id as string))];
      let leadMap: Record<string, { empresa: string | null; cliente_nome: string }> = {};
      if (leadIds.length > 0) {
        const { data: leadsData } = await supabase
          .from('leads')
          .select('id, empresa, cliente_nome')
          .in('id', leadIds);
        if (leadsData) {
          leadsData.forEach((l: any) => { leadMap[l.id] = { empresa: l.empresa, cliente_nome: l.cliente_nome }; });
        }
      }

      const enriched = (data || []).map((a: any) => ({
        ...a,
        lead_empresa: leadMap[a.lead_id]?.empresa || null,
        lead_cliente_nome: leadMap[a.lead_id]?.cliente_nome || '',
      }));

      setAttachments(enriched);
    } catch (err) {
      console.error('Erro ao carregar propostas da concorrência:', err);
    } finally {
      setLoading(false);
    }
  };

  const grouped = useMemo(() => {
    const filtered = search
      ? attachments.filter(a => {
          const q = search.toLowerCase();
          return (a.competitor_name || '').toLowerCase().includes(q) ||
            (a.lead_empresa || a.lead_cliente_nome || '').toLowerCase().includes(q) ||
            (a.competitor_materials || '').toLowerCase().includes(q);
        })
      : attachments;

    const map = new Map<string, CompetitorAttachment[]>();
    filtered.forEach(a => {
      const key = (a.competitor_name || 'Não informado').trim();
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(a);
    });

    const result: GroupedCompetitor[] = Array.from(map.entries())
      .map(([name, proposals]) => ({
        name,
        proposals,
        totalValue: proposals.reduce((sum, p) => sum + (p.competitor_value || 0), 0),
      }))
      .sort((a, b) => b.proposals.length - a.proposals.length);

    return result;
  }, [attachments, search]);

  if (loading) {
    return <p className="text-sm text-muted-foreground text-center py-8">Carregando propostas da concorrência...</p>;
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-semibold">Propostas da Concorrência</h3>
          <p className="text-xs text-muted-foreground">{attachments.length} proposta{attachments.length !== 1 ? 's' : ''} registrada{attachments.length !== 1 ? 's' : ''}</p>
        </div>
      </div>

      <div className="relative">
        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Buscar por concorrente, cliente ou material..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="pl-8"
        />
      </div>

      <ScrollArea className="h-[calc(100vh-260px)]">
        <div className="space-y-4 pr-2">
          {grouped.length === 0 ? (
            <p className="text-center text-sm text-muted-foreground py-8">
              {search ? 'Nenhuma proposta encontrada' : 'Nenhuma proposta da concorrência registrada'}
            </p>
          ) : (
            grouped.map(group => (
              <Card key={group.name}>
                <CardHeader className="pb-2 pt-3 px-4">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-sm flex items-center gap-2">
                      <Building2 className="h-4 w-4 text-muted-foreground" />
                      {group.name}
                    </CardTitle>
                    <div className="flex items-center gap-2">
                      <Badge variant="secondary" className="text-xs">
                        {group.proposals.length} proposta{group.proposals.length > 1 ? 's' : ''}
                      </Badge>
                      {group.totalValue > 0 && (
                        <Badge variant="outline" className="text-xs gap-1">
                          <DollarSign className="h-3 w-3" />
                          R$ {group.totalValue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                        </Badge>
                      )}
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="px-4 pb-3 space-y-2">
                  {group.proposals.map(p => (
                    <div key={p.id} className="flex items-start justify-between p-2 rounded-md bg-muted/40 text-sm">
                      <div className="space-y-0.5 min-w-0 flex-1">
                        <p className="font-medium text-xs text-foreground truncate">
                          {p.lead_empresa || p.lead_cliente_nome}
                        </p>
                        {p.competitor_materials && (
                          <p className="text-xs text-muted-foreground flex items-center gap-1">
                            <Package className="h-3 w-3 shrink-0" />
                            <span className="truncate">{p.competitor_materials}</span>
                          </p>
                        )}
                        <div className="flex items-center gap-3 text-[11px] text-muted-foreground">
                          {p.competitor_date && (
                            <span className="flex items-center gap-0.5">
                              <Calendar className="h-3 w-3" />
                              {new Date(p.competitor_date).toLocaleDateString('pt-BR')}
                            </span>
                          )}
                          {p.competitor_value != null && p.competitor_value > 0 && (
                            <span className="font-medium text-foreground">
                              R$ {p.competitor_value.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                            </span>
                          )}
                        </div>
                      </div>
                      <a
                        href={p.file_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="shrink-0 p-1 rounded hover:bg-accent transition-colors"
                        title="Ver arquivo"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <FileText className="h-4 w-4 text-primary" />
                      </a>
                    </div>
                  ))}
                </CardContent>
              </Card>
            ))
          )}
        </div>
      </ScrollArea>
    </div>
  );
}
