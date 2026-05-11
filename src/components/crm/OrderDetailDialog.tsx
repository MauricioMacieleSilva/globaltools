import { useEffect, useState, useMemo } from 'react';
import { parseDate } from '@/lib/utils-comercial';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';
import { Loader2, Package } from 'lucide-react';
import { fetchComercialData } from '@/services/googleSheetsService';
import type { ComercialData } from '@/context/ComercialContext';

interface OrderDetailDialogProps {
  open: boolean;
  onClose: () => void;
  budgetNumber: string;
  clientName?: string;
  linkedClientName?: string;
}

export function OrderDetailDialog({ open, onClose, budgetNumber, clientName, linkedClientName }: OrderDetailDialogProps) {
  const [loading, setLoading] = useState(false);
  const [items, setItems] = useState<ComercialData[]>([]);

  useEffect(() => {
    if (!open || !budgetNumber) return;
    setLoading(true);
    fetchComercialData()
      .then((data) => {
        const target = String(budgetNumber).trim();
        let matches = data.filter(d => String(d.numeropedido).trim() === target);
        
        if (matches.length === 0) {
          setItems([]);
          return;
        }

        // Strict matching: prefer linkedClientName (saved at linking time), exact equality
        const norm = (s: string) => (s || '').trim().toLowerCase();
        const nameToMatch = linkedClientName || clientName;
        if (nameToMatch) {
          const target = norm(nameToMatch);
          const exact = matches.filter(d => norm(d.cli_nomefantasia || d.cliente) === target);
          if (exact.length > 0) {
            matches = exact;
          }
        }

        // Ordenar por data mais recente e pegar apenas itens dessa data
        const sorted = [...matches].sort((a, b) => {
          const da = parseDate(a.data_emissao)?.getTime() || 0;
          const db = parseDate(b.data_emissao)?.getTime() || 0;
          return db - da;
        });

        const mostRecentDate = sorted[0]?.data_emissao;
        if (mostRecentDate) {
          setItems(matches.filter(d => d.data_emissao === mostRecentDate));
        } else {
          setItems(matches);
        }
      })
      .catch(() => setItems([]))
      .finally(() => setLoading(false));
  }, [open, budgetNumber]);

  const totals = useMemo(() => {
    let valor = 0;
    let peso = 0;
    items.forEach(item => {
      valor += item.valor || 0;
      peso += item.peso || 0;
    });
    return { valor, peso };
  }, [items]);

  const header = items[0];

  const formatCurrency = (v: number) =>
    v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

  const formatDate = (d: string) => {
    if (!d) return '—';
    const parsed = parseDate(d);
    if (parsed) return parsed.toLocaleDateString('pt-BR');
    try {
      return new Date(d).toLocaleDateString('pt-BR');
    } catch {
      return d;
    }
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-2xl max-h-[85vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Package className="h-5 w-5" />
            Pedido {budgetNumber}
          </DialogTitle>
        </DialogHeader>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : items.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            Nenhum dado encontrado para este pedido.
          </div>
        ) : (
          <div className="space-y-4">
            {/* Header info */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-sm">
              <div>
                <span className="text-muted-foreground">Status</span>
                <div className="mt-0.5">
                  <Badge variant={header.situacao === 'Orçamento' ? 'secondary' : 'default'}>
                    {header.situacao}
                  </Badge>
                </div>
              </div>
              <div>
                <span className="text-muted-foreground">Data</span>
                <p className="font-medium">{formatDate(header.data_emissao)}</p>
              </div>
              <div>
                <span className="text-muted-foreground">Cliente</span>
                <p className="font-medium truncate">{header.cliente || header.cli_nomefantasia}</p>
              </div>
              <div>
                <span className="text-muted-foreground">UF</span>
                <p className="font-medium">{header.uf || '—'}</p>
              </div>
              <div>
                <span className="text-muted-foreground">Vendedor</span>
                <p className="font-medium">{header.vendedor || '—'}</p>
              </div>
              <div>
                <span className="text-muted-foreground">Valor Total</span>
                <p className="font-semibold text-primary">{formatCurrency(totals.valor)}</p>
              </div>
            </div>

            {/* Items table */}
            <ScrollArea className="h-[40vh] w-full">
              <div className="min-w-[500px]">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Material</TableHead>
                    <TableHead className="text-center">Qtd</TableHead>
                    <TableHead className="text-right">Valor Unit.</TableHead>
                    <TableHead className="text-right">Valor</TableHead>
                    <TableHead className="text-right">Peso</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {items.map((item, idx) => (
                    <TableRow key={idx}>
                      <TableCell className="max-w-[200px]">
                        <p className="font-medium text-xs truncate">{item.descricaomat}</p>
                      </TableCell>
                      <TableCell className="text-center text-xs">
                        {item.qtd} {item.un}
                      </TableCell>
                      <TableCell className="text-right text-xs">
                        {formatCurrency(item.valor_un_bruto || 0)}
                      </TableCell>
                      <TableCell className="text-right text-xs font-medium">
                        {formatCurrency(item.valor || 0)}
                      </TableCell>
                      <TableCell className="text-right text-xs">
                        {(item.peso || 0).toLocaleString('pt-BR', { maximumFractionDigits: 0 })} kg
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              </div>
              <ScrollBar orientation="horizontal" />
            </ScrollArea>

            {/* Totals */}
            <div className="flex justify-end gap-6 pt-2 border-t text-sm">
              <div>
                <span className="text-muted-foreground">Peso Total: </span>
                <span className="font-semibold">{totals.peso.toLocaleString('pt-BR', { maximumFractionDigits: 0 })} kg</span>
              </div>
              <div>
                <span className="text-muted-foreground">Valor Total: </span>
                <span className="font-semibold text-primary">{formatCurrency(totals.valor)}</span>
              </div>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
