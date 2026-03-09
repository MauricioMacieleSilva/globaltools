import { useEffect, useState, useMemo } from 'react';
import { parseDate } from '@/lib/utils-comercial';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';
import { Loader2, Package } from 'lucide-react';
import { fetchComercialData } from '@/services/googleSheetsService';
import type { ComercialData } from '@/context/ComercialContext';

const SHEET_ID = '13F5NcT8Z6quDcW4OmoG8MOhHCRT1W9nWXmNGX839MGo';
const PROD_GID = '407047369';

function parseCSVSimple(csvText: string): string[][] {
  const result: string[][] = [];
  let currentRow: string[] = [];
  let currentField = '';
  let inQuotes = false;
  let i = 0;
  while (i < csvText.length) {
    const char = csvText[i];
    const nextChar = csvText[i + 1];
    if (inQuotes) {
      if (char === '"') {
        if (nextChar === '"') { currentField += '"'; i += 2; continue; }
        else { inQuotes = false; }
      } else { currentField += char; }
    } else {
      if (char === '"') { inQuotes = true; }
      else if (char === ',') { currentRow.push(currentField.trim()); currentField = ''; }
      else if (char === '\n' || (char === '\r' && nextChar === '\n')) {
        currentRow.push(currentField.trim());
        if (currentRow.some(f => f !== '')) result.push(currentRow);
        currentRow = []; currentField = '';
        if (char === '\r' && nextChar === '\n') i++;
      } else if (char === '\r') {
        currentRow.push(currentField.trim());
        if (currentRow.some(f => f !== '')) result.push(currentRow);
        currentRow = []; currentField = '';
      } else { currentField += char; }
    }
    i++;
  }
  if (currentField !== '' || currentRow.length > 0) {
    currentRow.push(currentField.trim());
    if (currentRow.some(f => f !== '')) result.push(currentRow);
  }
  return result;
}

async function fetchOrderFromProduction(budgetNumber: string): Promise<ComercialData[]> {
  try {
    const cacheBuster = `&_t=${Date.now()}`;
    const url = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/export?format=csv&gid=${PROD_GID}${cacheBuster}`;
    const response = await fetch(url, { cache: 'no-store', headers: { 'Cache-Control': 'no-cache' } });
    if (!response.ok) return [];
    const csvText = await response.text();
    if (!csvText || csvText.length < 100) return [];
    const rows = parseCSVSimple(csvText);
    if (rows.length < 2) return [];

    // Production columns:
    // A(0)=prazo, B(1)=prazocomercial, C(2)=pedido, D(3)=nf, E(4)=situacao
    // F(5)=?, G(6)=?, H(7)=cli_nomef
    // K(10)=descricaomat, L(11)=observacao, M(12)=qtd_venda, N(13)=un
    // V(21)=classe
    const target = String(budgetNumber).trim();
    const items: ComercialData[] = [];

    for (let i = 1; i < rows.length; i++) {
      const row = rows[i];
      const pedido = (row[2] || '').trim();
      if (pedido !== target) continue;

      const qtdStr = (row[12] || '').replace(',', '.');
      const qtd = parseFloat(qtdStr) || 0;

      items.push({
        numeropedido: pedido,
        numeronf: (row[3] || '').trim(),
        situacao: (row[4] || '').trim(),
        data_emissao: (row[0] || '').trim(), // prazo as date reference
        descricaomat: (row[11] || row[10] || '').trim(), // observacao (detailed) or descricaomat
        observacao: (row[11] || '').trim(),
        qtd,
        un: (row[13] || '').trim(),
        valor_un_bruto: 0,
        valor: 0,
        peso: 0,
        classe: (row[21] || '').trim(),
        cli_nomefantasia: (row[7] || '').trim(),
        cliente: (row[7] || '').trim(),
        codigocliente: '',
        uf: '',
        cli_cidade: '',
        data_pedido_pronto: '',
        faturamento_tipo: 0,
        cliente_novo: '',
        vendedor: '',
        data_inicio: '',
      });
    }

    return items;
  } catch (err) {
    console.warn('Error fetching from production sheet:', err);
    return [];
  }
}

interface OrderDetailDialogProps {
  open: boolean;
  onClose: () => void;
  budgetNumber: string;
}

export function OrderDetailDialog({ open, onClose, budgetNumber }: OrderDetailDialogProps) {
  const [loading, setLoading] = useState(false);
  const [items, setItems] = useState<ComercialData[]>([]);

  useEffect(() => {
    if (!open || !budgetNumber) return;
    setLoading(true);

    // Try production sheet first, then fallback to commercial sheet
    fetchOrderFromProduction(budgetNumber)
      .then((prodItems) => {
        if (prodItems.length > 0) {
          console.log(`[OrderDetail] Found ${prodItems.length} items in production sheet for ${budgetNumber}`);
          setItems(prodItems);
          setLoading(false);
          return;
        }

        // Fallback to commercial sheet (BASE ANTIGA)
        console.log(`[OrderDetail] Not found in production, trying commercial sheet for ${budgetNumber}`);
        return fetchComercialData().then((data) => {
          const allMatches = data.filter(d => String(d.numeropedido).trim() === String(budgetNumber).trim());
          if (allMatches.length > 0) {
            const tenMonthsAgo = new Date();
            tenMonthsAgo.setMonth(tenMonthsAgo.getMonth() - 10);

            const recentMatches = allMatches.filter(d => {
              const dt = parseDate(d.data_emissao);
              return dt && dt.getTime() >= tenMonthsAgo.getTime();
            });

            const candidates = recentMatches.length > 0 ? recentMatches : allMatches;

            const sorted = [...candidates].sort((a, b) => {
              const da = parseDate(a.data_emissao)?.getTime() || 0;
              const db = parseDate(b.data_emissao)?.getTime() || 0;
              return db - da;
            });
            const mostRecentDate = sorted[0]?.data_emissao;
            const filtered = candidates.filter(d => d.data_emissao === mostRecentDate);
            setItems(filtered.length > 0 ? filtered : candidates);
          } else {
            setItems([]);
          }
          setLoading(false);
        });
      })
      .catch(() => { setItems([]); setLoading(false); });
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
  const hasFinancialData = totals.valor > 0;

  const formatCurrency = (v: number) =>
    v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

  const formatDate = (d: string) => {
    if (!d) return '—';
    const parsed = parseDate(d);
    if (parsed) return parsed.toLocaleDateString('pt-BR');
    try { return new Date(d).toLocaleDateString('pt-BR'); } catch { return d; }
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
              {header.uf && (
                <div>
                  <span className="text-muted-foreground">UF</span>
                  <p className="font-medium">{header.uf}</p>
                </div>
              )}
              {header.vendedor && (
                <div>
                  <span className="text-muted-foreground">Vendedor</span>
                  <p className="font-medium">{header.vendedor}</p>
                </div>
              )}
              {hasFinancialData && (
                <div>
                  <span className="text-muted-foreground">Valor Total</span>
                  <p className="font-semibold text-primary">{formatCurrency(totals.valor)}</p>
                </div>
              )}
            </div>

            {/* Items table */}
            <ScrollArea className="h-[40vh] w-full">
              <div className="min-w-[500px]">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Material</TableHead>
                    <TableHead className="text-center">Qtd</TableHead>
                    {hasFinancialData && (
                      <>
                        <TableHead className="text-right">Valor Unit.</TableHead>
                        <TableHead className="text-right">Valor</TableHead>
                      </>
                    )}
                    {totals.peso > 0 && <TableHead className="text-right">Peso</TableHead>}
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
                      {hasFinancialData && (
                        <>
                          <TableCell className="text-right text-xs">
                            {formatCurrency(item.valor_un_bruto || 0)}
                          </TableCell>
                          <TableCell className="text-right text-xs font-medium">
                            {formatCurrency(item.valor || 0)}
                          </TableCell>
                        </>
                      )}
                      {totals.peso > 0 && (
                        <TableCell className="text-right text-xs">
                          {(item.peso || 0).toLocaleString('pt-BR', { maximumFractionDigits: 0 })} kg
                        </TableCell>
                      )}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              </div>
              <ScrollBar orientation="horizontal" />
            </ScrollArea>

            {/* Totals */}
            <div className="flex justify-end gap-6 pt-2 border-t text-sm">
              {totals.peso > 0 && (
                <div>
                  <span className="text-muted-foreground">Peso Total: </span>
                  <span className="font-semibold">{totals.peso.toLocaleString('pt-BR', { maximumFractionDigits: 0 })} kg</span>
                </div>
              )}
              {hasFinancialData && (
                <div>
                  <span className="text-muted-foreground">Valor Total: </span>
                  <span className="font-semibold text-primary">{formatCurrency(totals.valor)}</span>
                </div>
              )}
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
