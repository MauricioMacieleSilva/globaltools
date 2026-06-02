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
  ShoppingCart, AlertTriangle, Package, Users, Mail, Loader2, CheckCircle2,
} from 'lucide-react';
import { useNecessidadeCompras, NecessidadeCompra } from '@/hooks/useNecessidadeCompras';
import { useUserPermissions } from '@/hooks/useUserPermissions';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

function formatKg(kg: number): string {
  if (!kg) return '0 KG';
  if (kg >= 1000) return `${(kg / 1000).toLocaleString('pt-BR', { maximumFractionDigits: 2 })} t`;
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

export function ComprasTab() {
  const { faltantes, todos, totais } = useNecessidadeCompras();
  const { isAdmin } = useUserPermissions();
  const [filtro, setFiltro] = useState('');
  const [apenasFaltantes, setApenasFaltantes] = useState(true);
  const [selected, setSelected] = useState<NecessidadeCompra | null>(null);
  const [sending, setSending] = useState(false);

  const lista = useMemo(() => {
    const base = apenasFaltantes ? faltantes : todos;
    if (!filtro.trim()) return base;
    const f = filtro.trim().toUpperCase();
    return base.filter(item =>
      item.categorias.some(c => c.includes(f)) ||
      item.espessura.includes(f) ||
      item.clientes.some(c => c.toUpperCase().includes(f)) ||
      item.pedidos.some(p => p.numero_pedido.includes(f))
    );
  }, [filtro, apenasFaltantes, faltantes, todos]);

  const enviarEmailAgora = async () => {
    setSending(true);
    try {
      const { data, error } = await supabase.functions.invoke('send-compras-report', {
        body: { manual: true },
      });
      if (error) throw error;
      toast.success('Relatório de compras enviado com sucesso!', {
        description: `${data?.enviados ?? 0} destinatário(s) notificado(s).`,
      });
    } catch (e: any) {
      toast.error('Falha ao enviar relatório', { description: e?.message });
    } finally {
      setSending(false);
    }
  };

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
          <div className="flex flex-col sm:flex-row justify-between gap-2 items-start sm:items-center">
            <div>
              <CardTitle className="text-lg flex items-center gap-2">
                <ShoppingCart className="h-5 w-5" /> Necessidade de Compras
              </CardTitle>
              <CardDescription>
                Materiais demandados pelos pedidos em produção menos o estoque disponível.
                Reserva virtual — o estoque não é baixado automaticamente.
              </CardDescription>
            </div>
            {isAdmin && (
              <Button onClick={enviarEmailAgora} disabled={sending} className="gap-2">
                {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Mail className="h-4 w-4" />}
                Enviar e-mail agora
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex flex-col sm:flex-row gap-2">
            <Input
              placeholder="Buscar por categoria, espessura, cliente, pedido..."
              value={filtro}
              onChange={(e) => setFiltro(e.target.value)}
              className="flex-1"
            />
            <Button
              variant={apenasFaltantes ? 'default' : 'outline'}
              onClick={() => setApenasFaltantes(v => !v)}
              className="gap-2"
            >
              <AlertTriangle className="h-4 w-4" />
              {apenasFaltantes ? 'Apenas faltantes' : 'Mostrar todos'}
            </Button>
          </div>

          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Categoria</TableHead>
                  <TableHead>Espessura</TableHead>
                  <TableHead className="text-right">Necessário</TableHead>
                  <TableHead className="text-right">Em Estoque</TableHead>
                  <TableHead className="text-right">A Comprar</TableHead>
                  <TableHead>Clientes</TableHead>
                  <TableHead className="text-center">Pedidos</TableHead>
                  <TableHead className="text-center">Urgência</TableHead>
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
                      <TableCell>
                        <div className="flex flex-wrap gap-1">
                          {item.categorias.map(c => (
                            <Badge key={c} variant="outline" className="text-xs">{c}</Badge>
                          ))}
                        </div>
                      </TableCell>
                      <TableCell className="font-mono font-semibold">{item.espessura} mm</TableCell>
                      <TableCell className="text-right tabular-nums">{formatKg(item.necessarioKg)}</TableCell>
                      <TableCell className="text-right tabular-nums text-muted-foreground">{formatKg(item.estoqueKg)}</TableCell>
                      <TableCell className={`text-right tabular-nums font-bold ${atendido ? 'text-green-600' : 'text-destructive'}`}>
                        {atendido ? 'OK' : formatKg(item.faltaKg)}
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
                  {selected.categorias.join(' / ')} • {selected.espessura} mm
                </DialogTitle>
                <DialogDescription>
                  {selected.faltaKg > 0 ? (
                    <>Faltam <strong className="text-destructive">{formatKg(selected.faltaKg)}</strong> para atender {selected.pedidos.length} pedido(s).</>
                  ) : (
                    <>Estoque suficiente. Necessário: {formatKg(selected.necessarioKg)} • Disponível: {formatKg(selected.estoqueKg)}.</>
                  )}
                </DialogDescription>
              </DialogHeader>
              <div className="grid grid-cols-3 gap-3 my-4">
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
