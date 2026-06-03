import { useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from '@/components/ui/dialog';
import {
  ShoppingCart, AlertTriangle, Package, Users, CheckCircle2, ArrowUp, ArrowDown,
} from 'lucide-react';
import { useNecessidadeCompras, NecessidadeCompra } from '@/hooks/useNecessidadeCompras';

function formatKg(kg: number): string {
  if (!kg) return '0 KG';
  return `${Math.round(kg).toLocaleString('pt-BR')} KG`;
}

function formatDate(d: string): string {
  if (!d) return '—';
  try {
    const date = new Date(d);
    if (isNaN(date.getTime())) return d;
    return date.toLocaleDateString('pt-BR');
  } catch { return d; }
}

function urgenciaBadge(u: NecessidadeCompra['urgencia']) {
  if (u === 'atraso') return <Badge variant="destructive" className="gap-1"><AlertTriangle className="h-3 w-3" />ATRASO</Badge>;
  if (u === 'prazo') return <Badge className="bg-orange-500 hover:bg-orange-600 gap-1">PRAZO</Badge>;
  return <Badge variant="secondary">PROGRAMAR</Badge>;
}

type SortField = 'material' | 'necessario' | 'estoque' | 'comprar' | 'saldo' | 'urgencia';
type SortDir = 'asc' | 'desc';
const URG_ORDER: Record<NecessidadeCompra['urgencia'], number> = { atraso: 0, prazo: 1, programar: 2 };

export function ComprasTab() {
  const { todos, totais } = useNecessidadeCompras();
  const [filtro, setFiltro] = useState('');
  const [selected, setSelected] = useState<NecessidadeCompra | null>(null);
  const [sortField, setSortField] = useState<SortField>('material');
  const [sortDir, setSortDir] = useState<SortDir>('asc');

  const toggleSort = (field: SortField) => {
    if (sortField === field) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortField(field); setSortDir('asc'); }
  };

  const SortHeader = ({ field, children, className = '' }: { field: SortField; children: React.ReactNode; className?: string }) => (
    <TableHead className={`cursor-pointer select-none hover:text-foreground ${className}`} onClick={() => toggleSort(field)}>
      <span className="inline-flex items-center gap-1">
        {children}
        {sortField === field && (sortDir === 'asc' ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />)}
      </span>
    </TableHead>
  );

  const lista = useMemo(() => {
    const f = filtro.trim().toUpperCase();
    const filtered = !f ? [...todos] : todos.filter(item =>
      item.descricao.toUpperCase().includes(f) ||
      item.espessura.includes(f) ||
      (item.cor || '').toUpperCase().includes(f) ||
      item.clientes.some(c => c.toUpperCase().includes(f)) ||
      item.pedidos.some(p => p.numero_pedido.includes(f))
    );
    const mul = sortDir === 'asc' ? 1 : -1;
    filtered.sort((a, b) => {
      switch (sortField) {
        case 'material': {
          if (a.isOutro !== b.isOutro) return (a.isOutro ? 1 : -1) * mul;
          if (a.isOutro && b.isOutro) return a.descricao.localeCompare(b.descricao) * mul;
          const d = a.espessuraNum - b.espessuraNum;
          if (d !== 0) return d * mul;
          return (a.cor || '').localeCompare(b.cor || '') * mul;
        }
        case 'necessario': return (a.necessarioKg - b.necessarioKg) * mul;
        case 'estoque':    return (a.estoqueKg - b.estoqueKg) * mul;
        case 'comprar':    return (Math.max(0, a.faltaKg) - Math.max(0, b.faltaKg)) * mul;
        case 'saldo':      return (a.saldoKg - b.saldoKg) * mul;
        case 'urgencia':   return (URG_ORDER[a.urgencia] - URG_ORDER[b.urgencia]) * mul;
      }
    });
    return filtered;
  }, [filtro, todos, sortField, sortDir]);

  return (
    <div className="space-y-4">
      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground">Materiais a Comprar</p>
                <p className="text-2xl font-bold text-destructive">{totais.skusFaltantes}</p>
              </div>
              <ShoppingCart className="h-7 w-7 text-destructive" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground">Peso a Comprar</p>
                <p className="text-2xl font-bold">{formatKg(totais.pesoTotal)}</p>
              </div>
              <Package className="h-7 w-7 text-primary" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground">Clientes Impactados</p>
                <p className="text-2xl font-bold">{totais.clientesImpactados}</p>
              </div>
              <Users className="h-7 w-7 text-primary" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground">Pedidos Atrasados</p>
                <p className="text-2xl font-bold text-destructive">{totais.pedidosAtrasados}</p>
              </div>
              <AlertTriangle className="h-7 w-7 text-destructive" />
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center gap-2">
            <ShoppingCart className="h-5 w-5" /> Necessidade de Compras
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <Input
            placeholder="Buscar por material, espessura, cor, cliente, pedido..."
            value={filtro}
            onChange={(e) => setFiltro(e.target.value)}
            className="flex-1"
          />

          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <SortHeader field="material">Material</SortHeader>
                  <SortHeader field="necessario" className="text-right">Necessário</SortHeader>
                  <SortHeader field="estoque" className="text-right">Em Estoque</SortHeader>
                  <SortHeader field="comprar" className="text-right">A Comprar</SortHeader>
                  <SortHeader field="saldo" className="text-right">Saldo Estoque</SortHeader>
                  <TableHead>Clientes</TableHead>
                  <TableHead className="text-center">Pedidos</TableHead>
                  <SortHeader field="urgencia" className="text-center">Urgência</SortHeader>
                </TableRow>
              </TableHeader>
              <TableBody>
                {lista.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center text-muted-foreground py-8">
                      <CheckCircle2 className="h-8 w-8 mx-auto mb-2 text-green-600" />
                      Tudo certo! Nenhum material a comprar no momento.
                    </TableCell>
                  </TableRow>
                ) : lista.map(item => {
                  const atendido = item.faltaKg <= 0;
                  return (
                    <TableRow
                      key={item.key}
                      className={`cursor-pointer hover:bg-muted/50 ${item.urgencia === 'atraso' ? 'bg-destructive/5' : ''}`}
                      onClick={() => setSelected(item)}
                    >
                      <TableCell className="font-medium">
                        {item.isOutro
                          ? <span className="text-sm">{item.descricao}</span>
                          : (
                            <span className="font-mono">
                              {item.espessura} mm
                              {item.cor && <span className="ml-2 text-xs text-muted-foreground font-sans">• {item.cor}</span>}
                            </span>
                          )}
                      </TableCell>
                      <TableCell className="text-right tabular-nums">{formatKg(item.necessarioKg)}</TableCell>
                      <TableCell className="text-right tabular-nums text-muted-foreground">{formatKg(item.estoqueKg)}</TableCell>
                      <TableCell className={`text-right tabular-nums font-bold ${atendido ? 'text-green-600' : 'text-destructive'}`}>
                        {atendido ? 'OK' : formatKg(item.faltaKg)}
                      </TableCell>
                      <TableCell className="text-right tabular-nums text-muted-foreground">
                        {formatKg(item.saldoKg)}
                      </TableCell>
                      <TableCell className="max-w-[220px] truncate" title={item.clientes.join(', ')}>
                        {item.clientes.slice(0, 2).join(', ')}
                        {item.clientes.length > 2 && <span className="text-muted-foreground"> +{item.clientes.length - 2}</span>}
                      </TableCell>
                      <TableCell className="text-center">
                        <Badge variant="secondary">{item.pedidos.length}</Badge>
                      </TableCell>
                      <TableCell className="text-center">
                        {atendido ? <Badge className="bg-green-600 hover:bg-green-700">OK</Badge> : urgenciaBadge(item.urgencia)}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Detalhe */}
      <Dialog open={!!selected} onOpenChange={(o) => !o && setSelected(null)}>
        <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto">
          {selected && (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <ShoppingCart className="h-5 w-5" />
                  {selected.isOutro
                    ? selected.descricao
                    : `${selected.espessura} mm${selected.cor ? ` • ${selected.cor}` : ''}`}
                </DialogTitle>
                <DialogDescription>
                  {selected.faltaKg > 0 ? (
                    <>Faltam <strong className="text-destructive">{formatKg(selected.faltaKg)}</strong> para atender {selected.pedidos.length} pedido(s).</>
                  ) : (
                    <>Estoque suficiente. Necessário: {formatKg(selected.necessarioKg)} • Disponível: {formatKg(selected.estoqueKg)}.</>
                  )}
                </DialogDescription>
              </DialogHeader>
              <div className="grid grid-cols-4 gap-3 my-4">
                <div className="p-3 rounded bg-muted/40">
                  <p className="text-xs text-muted-foreground">Necessário</p>
                  <p className="text-lg font-bold">{formatKg(selected.necessarioKg)}</p>
                </div>
                <div className="p-3 rounded bg-muted/40">
                  <p className="text-xs text-muted-foreground">Em Estoque</p>
                  <p className="text-lg font-bold">{formatKg(selected.estoqueKg)}</p>
                </div>
                <div className="p-3 rounded bg-destructive/10">
                  <p className="text-xs text-muted-foreground">A Comprar</p>
                  <p className="text-lg font-bold text-destructive">
                    {selected.faltaKg > 0 ? formatKg(selected.faltaKg) : 'OK'}
                  </p>
                </div>
                <div className="p-3 rounded bg-muted/40">
                  <p className="text-xs text-muted-foreground">Saldo Estoque</p>
                  <p className="text-lg font-bold">{formatKg(selected.saldoKg)}</p>
                </div>
              </div>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Pedido</TableHead>
                    <TableHead>Cliente</TableHead>
                    <TableHead>Prazo</TableHead>
                    <TableHead className="text-right">Peso</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {selected.pedidos.map(p => (
                    <TableRow key={p.numero_pedido}>
                      <TableCell className="font-medium">{p.numero_pedido}</TableCell>
                      <TableCell>{p.cliente}</TableCell>
                      <TableCell>{formatDate(p.prazo)}</TableCell>
                      <TableCell className="text-right tabular-nums">{formatKg(p.pesoKg)}</TableCell>
                      <TableCell>
                        {p.status === 'ATRASO'
                          ? <Badge variant="destructive">ATRASO</Badge>
                          : <Badge variant="secondary">{p.status}</Badge>}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
