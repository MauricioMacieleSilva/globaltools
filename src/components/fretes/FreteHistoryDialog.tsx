import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { supabase } from '@/integrations/supabase/client';
import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useIsMobile } from '@/hooks/use-mobile';
import { MobileTableCard } from '@/components/ui/mobile-table-card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Clock, UserCircle, ArrowRight } from 'lucide-react';

interface HistoryEntry {
  id: string;
  frete_id: string;
  acao: string;
  status_anterior: string | null;
  status_novo: string | null;
  usuario_nome: string | null;
  observacao: string | null;
  created_at: string;
}

interface FreteGroup {
  frete_id: string;
  numero_pedido: string;
  cliente_nome: string | null;
  valor_frete: number;
  current_status: string;
  entries: HistoryEntry[];
}

interface FreteHistoryDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const statusLabels: Record<string, string> = {
  rascunho: 'Rascunho',
  pendente: 'Aguardando Aprovação',
  aprovado: 'Aprovado',
  rejeitado: 'Rejeitado',
};

const statusVariant: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = {
  rascunho: 'outline',
  pendente: 'secondary',
  aprovado: 'default',
  rejeitado: 'destructive',
};

const acaoLabels: Record<string, string> = {
  criacao: 'Frete criado',
  edicao: 'Frete editado',
  envio_aprovacao: 'Enviado para aprovação',
  aprovacao: 'Aprovado',
  rejeicao: 'Rejeitado',
};

export function FreteHistoryDialog({ open, onOpenChange }: FreteHistoryDialogProps) {
  const [groups, setGroups] = useState<FreteGroup[]>([]);
  const [loading, setLoading] = useState(false);
  const isMobile = useIsMobile();

  useEffect(() => {
    if (!open) return;
    loadHistory();
  }, [open]);

  const loadHistory = async () => {
    setLoading(true);
    try {
      // Load all history entries
      const { data: historyData, error: historyError } = await (supabase as any)
        .from('frete_historico')
        .select('*')
        .order('created_at', { ascending: false });

      if (historyError) throw historyError;

      // Load fretes info
      const freteIds = [...new Set((historyData || []).map((h: any) => h.frete_id))];
      
      if (freteIds.length === 0) {
        setGroups([]);
        setLoading(false);
        return;
      }

      const { data: fretesData } = await (supabase as any)
        .from('fretes')
        .select('id, numero_pedido, cliente_nome, valor_frete, status')
        .in('id', freteIds);

      const fretesMap = new Map<string, any>();
      (fretesData || []).forEach((f: any) => fretesMap.set(f.id, f));

      // Group entries by frete
      const groupMap = new Map<string, FreteGroup>();
      (historyData || []).forEach((entry: HistoryEntry) => {
        if (!groupMap.has(entry.frete_id)) {
          const frete = fretesMap.get(entry.frete_id);
          groupMap.set(entry.frete_id, {
            frete_id: entry.frete_id,
            numero_pedido: frete?.numero_pedido || '?',
            cliente_nome: frete?.cliente_nome || null,
            valor_frete: frete?.valor_frete || 0,
            current_status: frete?.status || 'rascunho',
            entries: [],
          });
        }
        groupMap.get(entry.frete_id)!.entries.push(entry);
      });

      setGroups(Array.from(groupMap.values()));
    } catch (err) {
      console.error('Erro ao carregar histórico:', err);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (d: string | null) => {
    if (!d) return '-';
    try { return format(parseISO(d), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR }); } catch { return d; }
  };

  const formatCurrency = (v: number) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-4xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Histórico Completo de Fretes</DialogTitle>
          <DialogDescription>Registro de todas as ações: criação, edições, envio para aprovação e decisões.</DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className="text-center py-8 text-muted-foreground">Carregando...</div>
        ) : groups.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">Nenhum registro encontrado.</div>
        ) : (
          <div className="space-y-6">
            {groups.map(group => (
              <div key={group.frete_id} className="rounded-lg border">
                {/* Header do frete */}
                <div className="p-4 bg-muted/50 border-b flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <span className="font-semibold text-sm">Pedido {group.numero_pedido}</span>
                    {group.cliente_nome && (
                      <span className="text-sm text-muted-foreground ml-2">• {group.cliente_nome}</span>
                    )}
                    <span className="text-sm text-muted-foreground ml-2">• {formatCurrency(Number(group.valor_frete))}</span>
                  </div>
                  <Badge variant={statusVariant[group.current_status] || 'outline'}>
                    {statusLabels[group.current_status] || group.current_status}
                  </Badge>
                </div>

                {/* Timeline */}
                <div className="p-4">
                  <div className="space-y-3">
                    {group.entries.map((entry, idx) => (
                      <div key={entry.id} className="flex gap-3 items-start">
                        <div className="flex flex-col items-center">
                          <div className={`w-3 h-3 rounded-full mt-1.5 ${
                            entry.acao === 'aprovacao' ? 'bg-green-500' :
                            entry.acao === 'rejeicao' ? 'bg-destructive' :
                            entry.acao === 'envio_aprovacao' ? 'bg-amber-500' :
                            'bg-muted-foreground/40'
                          }`} />
                          {idx < group.entries.length - 1 && (
                            <div className="w-px h-full min-h-[20px] bg-border" />
                          )}
                        </div>
                        <div className="flex-1 pb-2">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="text-sm font-medium">
                              {acaoLabels[entry.acao] || entry.acao}
                            </span>
                            {entry.status_anterior && entry.status_novo && (
                              <span className="flex items-center gap-1 text-xs text-muted-foreground">
                                <Badge variant={statusVariant[entry.status_anterior] || 'outline'} className="text-[10px] px-1.5 py-0">
                                  {statusLabels[entry.status_anterior] || entry.status_anterior}
                                </Badge>
                                <ArrowRight className="h-3 w-3" />
                                <Badge variant={statusVariant[entry.status_novo] || 'outline'} className="text-[10px] px-1.5 py-0">
                                  {statusLabels[entry.status_novo] || entry.status_novo}
                                </Badge>
                              </span>
                            )}
                          </div>
                          <div className="flex flex-wrap items-center gap-3 mt-1 text-xs text-muted-foreground">
                            {entry.usuario_nome && (
                              <span className="flex items-center gap-1">
                                <UserCircle className="h-3 w-3" />
                                {entry.usuario_nome}
                              </span>
                            )}
                            <span className="flex items-center gap-1">
                              <Clock className="h-3 w-3" />
                              {formatDate(entry.created_at)}
                            </span>
                          </div>
                          {entry.observacao && (
                            <p className="text-xs text-muted-foreground mt-1 italic">"{entry.observacao}"</p>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
