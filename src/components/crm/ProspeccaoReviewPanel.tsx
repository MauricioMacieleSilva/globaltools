import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Separator } from '@/components/ui/separator';
import {
  Loader2, CheckCircle2, XCircle, Building2, Phone, Mail,
  MapPin, FileText, Sparkles, CheckCheck, Trash2, ExternalLink
} from 'lucide-react';

interface StagedLead {
  id: string;
  log_id: string | null;
  status: string;
  cliente_nome: string;
  empresa: string | null;
  contact_name: string | null;
  cliente_telefone: string | null;
  cliente_email: string | null;
  cliente_cnpj: string | null;
  cidade: string | null;
  estado: string | null;
  ramo_atuacao: string | null;
  produto_interesse: string | null;
  valor_estimado: number | null;
  notes: string | null;
  fonte_dados: string | null;
  source: string | null;
  source_url: string | null;
  created_at: string;
}

interface Props {
  onLeadsApproved?: () => void;
}

export function ProspeccaoReviewPanel({ onLeadsApproved }: Props) {
  const [leads, setLeads] = useState<StagedLead[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [approving, setApproving] = useState(false);
  const [discarding, setDiscarding] = useState(false);

  const loadPending = useCallback(async () => {
    setLoading(true);
    const { data, error } = await (supabase as any)
      .from('lead_prospecting_results')
      .select('*')
      .eq('status', 'pending')
      .order('created_at', { ascending: false });

    if (!error) setLeads(data || []);
    setLoading(false);
  }, []);

  useEffect(() => { loadPending(); }, [loadPending]);

  const toggleSelect = (id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const toggleAll = () => {
    if (selectedIds.size === leads.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(leads.map(l => l.id)));
    }
  };

  const approveSelected = async () => {
    if (selectedIds.size === 0) return;
    setApproving(true);

    try {
      const user = (await supabase.auth.getUser()).data.user;
      const toApprove = leads.filter(l => selectedIds.has(l.id));
      let approved = 0;

      for (const lead of toApprove) {
        const empresaNome = lead.empresa || lead.cliente_nome || '';
        const contactName = lead.contact_name || '';

          const { error: insertError } = await (supabase as any).from('leads').insert({
            cliente_nome: contactName || empresaNome,
            client_name: contactName || empresaNome,
            empresa: empresaNome || null,
            cliente_cnpj: lead.cliente_cnpj || null,
            contact_name: lead.contact_name || null,
            contact_phone: lead.cliente_telefone || null,
            cliente_telefone: lead.cliente_telefone || null,
            contact_email: lead.cliente_email || null,
            cliente_email: lead.cliente_email || null,
            cidade: lead.cidade || null,
            estado: lead.estado || null,
            ramo_atuacao: lead.ramo_atuacao || null,
            produto_interesse: lead.produto_interesse || null,
            valor_estimado: lead.valor_estimado || null,
            notes: lead.notes || null,
            source: 'Auto Prospecção',
            website: lead.source_url || null,
            regime_tributario: (lead as any).regime_tributario || null,
            status: 'lead',
            vendedor_id: user?.id,
          });

        if (!insertError) {
          await (supabase as any).from('lead_prospecting_results')
            .update({ status: 'approved', reviewed_by: user?.id, reviewed_at: new Date().toISOString() })
            .eq('id', lead.id);
          approved++;
        } else {
          console.error('Approve lead error:', insertError);
        }
      }

      toast.success(`${approved} lead${approved > 1 ? 's' : ''} aprovado${approved > 1 ? 's' : ''} e adicionado${approved > 1 ? 's' : ''} ao CRM`);
      setSelectedIds(new Set());
      await loadPending();
      onLeadsApproved?.();
    } catch (err: any) {
      toast.error('Erro ao aprovar leads', { description: err.message });
    } finally {
      setApproving(false);
    }
  };

  const discardSelected = async () => {
    if (selectedIds.size === 0) return;
    setDiscarding(true);

    try {
      const user = (await supabase.auth.getUser()).data.user;
      const { error } = await (supabase as any)
        .from('lead_prospecting_results')
        .update({ status: 'discarded', reviewed_by: user?.id, reviewed_at: new Date().toISOString() })
        .in('id', Array.from(selectedIds));

      if (error) throw error;

      toast.success(`${selectedIds.size} lead${selectedIds.size > 1 ? 's' : ''} descartado${selectedIds.size > 1 ? 's' : ''}`);
      setSelectedIds(new Set());
      await loadPending();
    } catch (err: any) {
      toast.error('Erro ao descartar leads', { description: err.message });
    } finally {
      setDiscarding(false);
    }
  };

  const getSourceBadge = (fonte: string | null) => {
    if (!fonte) return null;
    const colors: Record<string, string> = {
      'Google': 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
      'PNCP': 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400',
      'ObrasGov': 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
      'IA': 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400',
    };
    return (
      <Badge variant="outline" className={`text-[10px] h-4 px-1.5 ${colors[fonte] || ''}`}>
        {fonte}
      </Badge>
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (leads.length === 0) {
    return (
      <Card>
        <CardContent className="py-8 text-center">
          <Sparkles className="h-8 w-8 mx-auto mb-2 text-muted-foreground/30" />
          <p className="text-sm text-muted-foreground">Nenhum lead pendente de revisão</p>
          <p className="text-xs text-muted-foreground mt-1">
            Execute uma prospecção para gerar leads para análise
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-2 pt-4 px-4">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <FileText className="h-4 w-4 text-primary" />
            Leads Pendentes de Revisão
            <Badge variant="secondary" className="text-[10px] h-5">{leads.length}</Badge>
          </CardTitle>
          <div className="flex items-center gap-2">
            {selectedIds.size > 0 && (
              <span className="text-xs text-muted-foreground">
                {selectedIds.size} selecionado{selectedIds.size > 1 ? 's' : ''}
              </span>
            )}
            <Button
              size="sm"
              variant="destructive"
              className="h-7 text-xs gap-1"
              disabled={selectedIds.size === 0 || discarding}
              onClick={discardSelected}
            >
              {discarding ? <Loader2 className="h-3 w-3 animate-spin" /> : <Trash2 className="h-3 w-3" />}
              Descartar
            </Button>
            <Button
              size="sm"
              className="h-7 text-xs gap-1"
              disabled={selectedIds.size === 0 || approving}
              onClick={approveSelected}
            >
              {approving ? <Loader2 className="h-3 w-3 animate-spin" /> : <CheckCheck className="h-3 w-3" />}
              Aprovar
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="px-4 pb-4">
        {/* Select all */}
        <div className="flex items-center gap-2 pb-2 border-b mb-2">
          <Checkbox
            checked={selectedIds.size === leads.length && leads.length > 0}
            onCheckedChange={toggleAll}
            className="h-3.5 w-3.5"
          />
          <span className="text-xs text-muted-foreground">Selecionar todos</span>
        </div>

        <div className="divide-y divide-border/60 max-h-[500px] overflow-y-auto">
          {leads.map(lead => (
            <div
              key={lead.id}
              className={`flex items-start gap-3 py-2.5 px-1 rounded transition-colors ${
                selectedIds.has(lead.id) ? 'bg-primary/5' : ''
              }`}
            >
              <Checkbox
                checked={selectedIds.has(lead.id)}
                onCheckedChange={() => toggleSelect(lead.id)}
                className="h-3.5 w-3.5 mt-1"
              />
              <div className="flex-1 min-w-0 space-y-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-xs font-semibold truncate">
                    {lead.empresa || lead.cliente_nome}
                  </span>
                  {getSourceBadge(lead.fonte_dados)}
                   {lead.source_url && (
                    <a
                      href={
                        // Fix broken PNCP portal links - redirect to Google search instead
                        lead.source_url.includes('pncp.gov.br/app/editais/')
                          ? `https://www.google.com/search?q=pncp+${encodeURIComponent(lead.cliente_cnpj?.replace(/\D/g, '') || '')}+${encodeURIComponent((lead.empresa || lead.cliente_nome || '').slice(0, 60))}`
                          : lead.source_url
                      }
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-0.5 text-[10px] text-primary hover:underline"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <ExternalLink className="h-2.5 w-2.5" />
                      Ver fonte
                    </a>
                  )}
                </div>

                {lead.contact_name && (
                  <div className="text-[11px] text-muted-foreground">
                    Contato: {lead.contact_name}
                  </div>
                )}

                <div className="flex flex-wrap gap-x-3 gap-y-0.5 text-[10px] text-muted-foreground">
                  {lead.cliente_telefone && (
                    <span className="flex items-center gap-0.5">
                      <Phone className="h-2.5 w-2.5" /> {lead.cliente_telefone}
                    </span>
                  )}
                  {lead.cliente_email && (
                    <span className="flex items-center gap-0.5">
                      <Mail className="h-2.5 w-2.5" /> {lead.cliente_email}
                    </span>
                  )}
                  {(lead.cidade || lead.estado) && (
                    <span className="flex items-center gap-0.5">
                      <MapPin className="h-2.5 w-2.5" /> {[lead.cidade, lead.estado].filter(Boolean).join(' - ')}
                    </span>
                  )}
                  {lead.ramo_atuacao && (
                    <span className="flex items-center gap-0.5">
                      <Building2 className="h-2.5 w-2.5" /> {lead.ramo_atuacao}
                    </span>
                  )}
                </div>

                {lead.notes && (
                  <p className="text-[10px] text-muted-foreground/70 line-clamp-2">{lead.notes}</p>
                )}

                {lead.valor_estimado && (
                  <span className="text-[10px] font-medium text-primary">
                    Valor est.: R$ {lead.valor_estimado.toLocaleString('pt-BR')}
                  </span>
                )}
              </div>

              <div className="flex gap-1 shrink-0">
                <Button
                  size="icon"
                  variant="ghost"
                  className="h-6 w-6 text-destructive hover:text-destructive"
                  onClick={async () => {
                    const user = (await supabase.auth.getUser()).data.user;
                    await (supabase as any).from('lead_prospecting_results')
                      .update({ status: 'discarded', reviewed_by: user?.id, reviewed_at: new Date().toISOString() })
                      .eq('id', lead.id);
                    toast.success('Lead descartado');
                    loadPending();
                  }}
                  title="Descartar"
                >
                  <XCircle className="h-3.5 w-3.5" />
                </Button>
                <Button
                  size="icon"
                  variant="ghost"
                  className="h-6 w-6 text-primary hover:text-primary"
                  onClick={async () => {
                    const user = (await supabase.auth.getUser()).data.user;
                    const empresaNome = lead.empresa || lead.cliente_nome || '';
                    const contactName = lead.contact_name || '';
                     const { error } = await (supabase as any).from('leads').insert({
                       cliente_nome: contactName || empresaNome,
                       client_name: contactName || empresaNome,
                       empresa: empresaNome || null,
                       cliente_cnpj: lead.cliente_cnpj || null,
                       contact_name: lead.contact_name || null,
                       contact_phone: lead.cliente_telefone || null,
                       cliente_telefone: lead.cliente_telefone || null,
                       contact_email: lead.cliente_email || null,
                       cliente_email: lead.cliente_email || null,
                       cidade: lead.cidade || null,
                       estado: lead.estado || null,
                       ramo_atuacao: lead.ramo_atuacao || null,
                       produto_interesse: lead.produto_interesse || null,
                       valor_estimado: lead.valor_estimado || null,
                       notes: lead.notes || null,
                       source: 'Auto Prospecção',
                       
                       website: lead.source_url || null,
                       status: 'lead',
                       vendedor_id: user?.id,
                     });
                    if (!error) {
                      await (supabase as any).from('lead_prospecting_results')
                        .update({ status: 'approved', reviewed_by: user?.id, reviewed_at: new Date().toISOString() })
                        .eq('id', lead.id);
                      toast.success('Lead aprovado e adicionado ao CRM');
                      loadPending();
                      onLeadsApproved?.();
                    } else {
                      toast.error('Erro ao aprovar lead', { description: error.message });
                    }
                  }}
                  title="Aprovar"
                >
                  <CheckCircle2 className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
