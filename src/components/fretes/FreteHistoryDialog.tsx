import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { supabase } from '@/integrations/supabase/client';
import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useIsMobile } from '@/hooks/use-mobile';
import { MobileTableCard } from '@/components/ui/mobile-table-card';

interface FreteHistoryEntry {
  id: string;
  numero_pedido: string;
  cliente_nome: string | null;
  transportadora_nome: string;
  valor_frete: number;
  status: string;
  motivo_aprovacao: string | null;
  approved_by: string | null;
  approved_at: string | null;
  approver_name?: string;
}

interface FreteHistoryDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const statusConfig: Record<string, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' }> = {
  aprovado: { label: 'Aprovado', variant: 'default' },
  rejeitado: { label: 'Rejeitado', variant: 'destructive' },
};

export function FreteHistoryDialog({ open, onOpenChange }: FreteHistoryDialogProps) {
  const [entries, setEntries] = useState<FreteHistoryEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const isMobile = useIsMobile();

  useEffect(() => {
    if (!open) return;
    loadHistory();
  }, [open]);

  const loadHistory = async () => {
    setLoading(true);
    try {
      const { data, error } = await (supabase as any)
        .from('fretes')
        .select('id, numero_pedido, cliente_nome, transportadora_nome, valor_frete, status, motivo_aprovacao, approved_by, approved_at')
        .in('status', ['aprovado', 'rejeitado'])
        .order('approved_at', { ascending: false });

      if (error) throw error;

      // Load approver names
      const approverIds: string[] = [...new Set((data || []).map((d: any) => d.approved_by).filter(Boolean) as string[])];
      let approverMap: Record<string, string> = {};
      if (approverIds.length > 0) {
        const { data: profiles } = await supabase
          .from('user_profiles')
          .select('id, full_name')
          .in('id', approverIds);
        (profiles || []).forEach(p => { approverMap[p.id] = p.full_name; });
      }

      setEntries((data || []).map((d: any) => ({
        ...d,
        approver_name: d.approved_by ? approverMap[d.approved_by] || 'Desconhecido' : '-',
      })));
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
      <DialogContent className="sm:max-w-3xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Histórico de Aprovações</DialogTitle>
          <DialogDescription>Registro de todos os fretes aprovados e rejeitados.</DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className="text-center py-8 text-muted-foreground">Carregando...</div>
        ) : entries.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">Nenhum registro encontrado.</div>
        ) : isMobile ? (
          <div className="space-y-3">
            {entries.map(e => {
              const cfg = statusConfig[e.status] || statusConfig.aprovado;
              return (
                <MobileTableCard
                  key={e.id}
                  title={`Pedido ${e.numero_pedido}`}
                  subtitle={e.cliente_nome || e.transportadora_nome}
                  badge={<Badge variant={cfg.variant}>{cfg.label}</Badge>}
                  fields={[
                    { label: 'Valor', value: formatCurrency(Number(e.valor_frete)) },
                    { label: 'Aprovador', value: e.approver_name || '-' },
                    { label: 'Data', value: formatDate(e.approved_at) },
                    { label: 'Motivo', value: e.motivo_aprovacao || '-' },
                  ]}
                />
              );
            })}
          </div>
        ) : (
          <div className="rounded-md border overflow-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Pedido</TableHead>
                  <TableHead>Cliente</TableHead>
                  <TableHead className="text-right">Valor</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Aprovador</TableHead>
                  <TableHead>Data</TableHead>
                  <TableHead>Motivo</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {entries.map(e => {
                  const cfg = statusConfig[e.status] || statusConfig.aprovado;
                  return (
                    <TableRow key={e.id}>
                      <TableCell className="font-medium">{e.numero_pedido}</TableCell>
                      <TableCell>{e.cliente_nome || '-'}</TableCell>
                      <TableCell className="text-right">{formatCurrency(Number(e.valor_frete))}</TableCell>
                      <TableCell><Badge variant={cfg.variant}>{cfg.label}</Badge></TableCell>
                      <TableCell>{e.approver_name || '-'}</TableCell>
                      <TableCell className="text-sm">{formatDate(e.approved_at)}</TableCell>
                      <TableCell className="max-w-48 text-sm text-muted-foreground">{e.motivo_aprovacao || '-'}</TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
