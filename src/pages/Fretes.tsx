import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useToast } from '@/hooks/use-toast';
import { Plus, Pencil, Trash2, Truck, Search, CheckCircle, XCircle, Settings2, Filter, Send, History } from 'lucide-react';
import { useUserPermissions } from '@/hooks/useUserPermissions';
import { useAuth } from '@/context/AuthContext';
import { useComercial } from '@/context/ComercialContext';
import { loadFretes, deleteFrete, loadTransportadoras, approveFrete, rejectFrete, sendFreteForApproval, type Frete, type Transportadora } from '@/services/fretesService';
import { FreteFormDialog } from '@/components/fretes/FreteFormDialog';
import { FreteApprovalDialog } from '@/components/fretes/FreteApprovalDialog';
import { FreteHistoryDialog } from '@/components/fretes/FreteHistoryDialog';
import { TransportadoraDialog } from '@/components/fretes/TransportadoraDialog';
import { format, parseISO, isAfter, isBefore, startOfDay, endOfDay } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useIsMobile } from '@/hooks/use-mobile';
import { MobileTableCard } from '@/components/ui/mobile-table-card';

const statusConfig: Record<string, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' }> = {
  rascunho: { label: 'Rascunho', variant: 'outline' },
  pendente: { label: 'Aguardando Aprovação', variant: 'secondary' },
  aprovado: { label: 'Aprovado', variant: 'default' },
  rejeitado: { label: 'Rejeitado', variant: 'destructive' },
};

export default function Fretes() {
  const { toast } = useToast();
  const { isAdmin, checkPageAccess } = useUserPermissions();
  const { userProfile } = useAuth();
  const { data: comercialData } = useComercial();
  const isMobile = useIsMobile();
  const [fretes, setFretes] = useState<Frete[]>([]);
  const [transportadoras, setTransportadoras] = useState<Transportadora[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [transportadoraDialogOpen, setTransportadoraDialogOpen] = useState(false);
  const [editingFrete, setEditingFrete] = useState<Frete | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [approvalDialogOpen, setApprovalDialogOpen] = useState(false);
  const [approvalAction, setApprovalAction] = useState<'aprovar' | 'rejeitar'>('aprovar');
  const [approvalFrete, setApprovalFrete] = useState<Frete | null>(null);
  const [historyDialogOpen, setHistoryDialogOpen] = useState(false);

  const canApprove = isAdmin || userProfile?.role === 'comercial';
  const userCanEdit = checkPageAccess('producao').canEdit;

  // Extract unique clients from Google Sheets data
  const clientesFromSheets = useMemo(() => {
    if (!comercialData || comercialData.length === 0) return [];
    const clienteMap = new Map<string, string>();
    comercialData.forEach(item => {
      if (item.codigocliente && item.cliente) {
        clienteMap.set(item.codigocliente, item.cliente);
      }
    });
    return Array.from(clienteMap.entries()).map(([codigo, nome]) => ({
      codigo,
      nome,
    })).sort((a, b) => a.nome.localeCompare(b.nome));
  }, [comercialData]);

  // Extract orders grouped by client code
  const pedidosByCliente = useMemo(() => {
    if (!comercialData || comercialData.length === 0) return new Map<string, string[]>();
    const map = new Map<string, Set<string>>();
    comercialData.forEach(item => {
      if (item.codigocliente && item.numeropedido) {
        if (!map.has(item.codigocliente)) map.set(item.codigocliente, new Set());
        map.get(item.codigocliente)!.add(item.numeropedido);
      }
    });
    const result = new Map<string, string[]>();
    map.forEach((pedidos, codigo) => {
      result.set(codigo, Array.from(pedidos).sort());
    });
    return result;
  }, [comercialData]);

  // Extract NFs grouped by order number
  const nfsByPedido = useMemo(() => {
    if (!comercialData || comercialData.length === 0) return new Map<string, string[]>();
    const map = new Map<string, Set<string>>();
    comercialData.forEach(item => {
      if (item.numeropedido && item.numeronf) {
        if (!map.has(item.numeropedido)) map.set(item.numeropedido, new Set());
        map.get(item.numeropedido)!.add(item.numeronf);
      }
    });
    const result = new Map<string, string[]>();
    map.forEach((nfs, pedido) => {
      result.set(pedido, Array.from(nfs).sort());
    });
    return result;
  }, [comercialData]);

  // Extract peso (weight) grouped by NF number
  const pesoByNf = useMemo(() => {
    if (!comercialData || comercialData.length === 0) return new Map<string, number>();
    const map = new Map<string, number>();
    comercialData.forEach(item => {
      if (item.numeronf && item.peso) {
        map.set(item.numeronf, (map.get(item.numeronf) || 0) + Number(item.peso));
      }
    });
    return map;
  }, [comercialData]);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const [fretesData, transportadorasData] = await Promise.all([
        loadFretes(),
        loadTransportadoras(),
      ]);
      setFretes(fretesData);
      setTransportadoras(transportadorasData);
    } catch (err: any) {
      toast({ title: 'Erro ao carregar dados', description: err.message, variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const openNew = () => { setEditingFrete(null); setDialogOpen(true); };
  const openEdit = (f: Frete) => { setEditingFrete(f); setDialogOpen(true); };

  const handleDelete = async (id: string) => {
    if (!confirm('Tem certeza que deseja excluir este frete?')) return;
    try {
      await deleteFrete(id);
      toast({ title: 'Frete excluído!' });
      fetchData();
    } catch (err: any) {
      toast({ title: 'Erro', description: err.message, variant: 'destructive' });
    }
  };

  const openApprovalDialog = (f: Frete, action: 'aprovar' | 'rejeitar') => {
    setApprovalFrete(f);
    setApprovalAction(action);
    setApprovalDialogOpen(true);
  };

  const handleApprovalConfirm = async (motivo: string) => {
    if (!approvalFrete) return;
    try {
      if (approvalAction === 'aprovar') {
        await approveFrete(approvalFrete.id, motivo);
        toast({ title: 'Frete aprovado!' });
      } else {
        await rejectFrete(approvalFrete.id, motivo);
        toast({ title: 'Frete rejeitado!' });
      }
      fetchData();
    } catch (err: any) {
      toast({ title: 'Erro', description: err.message, variant: 'destructive' });
    }
  };

  const handleSendForApproval = async (id: string) => {
    try {
      await sendFreteForApproval(id);
      toast({ title: 'Frete enviado para aprovação!', description: 'E-mail de aprovação enviado.' });
      fetchData();
    } catch (err: any) {
      toast({ title: 'Erro', description: err.message, variant: 'destructive' });
    }
  };

  const formatDate = (d: string | null) => {
    if (!d) return '-';
    try { return format(parseISO(d), 'dd/MM/yyyy', { locale: ptBR }); } catch { return d; }
  };

  const formatCurrency = (v: number) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  const formatWeight = (v: number) => v ? `${v.toLocaleString('pt-BR')} kg` : '-';
  const calcReaisPorTon = (valor: number, pesoKg: number) => {
    if (!pesoKg || pesoKg === 0) return '-';
    const reaisPorTon = (valor / pesoKg) * 1000;
    return formatCurrency(reaisPorTon) + '/ton';
  };

  const filtered = fretes.filter(f => {
    const matchesSearch = !searchTerm ||
      f.numero_pedido.toLowerCase().includes(searchTerm.toLowerCase()) ||
      f.transportadora_nome.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (f.cliente_nome || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (f.notas_fiscais || []).some(nf => nf.toLowerCase().includes(searchTerm.toLowerCase()));

    let matchesDate = true;
    if (dateFrom) {
      try { matchesDate = matchesDate && !isBefore(parseISO(f.data_embarque), startOfDay(parseISO(dateFrom))); } catch {}
    }
    if (dateTo) {
      try { matchesDate = matchesDate && !isAfter(parseISO(f.data_embarque), endOfDay(parseISO(dateTo))); } catch {}
    }

    return matchesSearch && matchesDate;
  });

  const totalFretes = filtered.length;
  const totalValor = filtered.reduce((s, f) => s + Number(f.valor_frete), 0);
  const pendentes = filtered.filter(f => f.status === 'pendente').length;
  const embarquesPendentes = filtered.filter(f => !f.data_entrega).length;

  const renderStatusBadge = (f: Frete) => {
    const cfg = statusConfig[f.status] || statusConfig.rascunho;
    return <Badge variant={cfg.variant}>{cfg.label}</Badge>;
  };

  return (
    <ErrorBoundary>
      <div className="min-h-screen w-full bg-background">
        <div className="container mx-auto p-2 space-y-4">
          {/* Header */}
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
            <h1 className="text-xl sm:text-2xl font-bold text-foreground flex items-center gap-2">
              <Truck className="h-6 w-6" />
              Controle de Fretes
            </h1>
            <div className="flex gap-2 flex-wrap">
              {canApprove && (
                <Button onClick={() => setHistoryDialogOpen(true)} variant="outline" className="gap-1">
                  <History className="h-4 w-4" />
                  Histórico
                </Button>
              )}
              {userCanEdit && (
                <Button onClick={() => setTransportadoraDialogOpen(true)} variant="outline" className="gap-1">
                  <Settings2 className="h-4 w-4" />
                  Transportadoras
                </Button>
              )}
              {userCanEdit && (
                <Button onClick={openNew} className="gap-2">
                  <Plus className="h-4 w-4" />
                  Novo Frete
                </Button>
              )}
            </div>
          </div>

          {/* KPIs */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">Total de Fretes</CardTitle></CardHeader>
              <CardContent><p className="text-2xl font-bold">{totalFretes}</p></CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">Valor Total</CardTitle></CardHeader>
              <CardContent><p className="text-2xl font-bold text-primary">{formatCurrency(totalValor)}</p></CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">Aguardando Aprovação</CardTitle></CardHeader>
              <CardContent><p className="text-2xl font-bold text-amber-500">{pendentes}</p></CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">Entregas Pendentes</CardTitle></CardHeader>
              <CardContent><p className="text-2xl font-bold text-destructive">{embarquesPendentes}</p></CardContent>
            </Card>
          </div>

          {/* Filters */}
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por pedido, NF, cliente ou transportadora..."
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                className="pl-9"
              />
            </div>
            <div className="flex gap-2 items-center">
              <Filter className="h-4 w-4 text-muted-foreground" />
              <Input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} className="w-40" placeholder="De" />
              <span className="text-muted-foreground text-sm">até</span>
              <Input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)} className="w-40" placeholder="Até" />
              {(dateFrom || dateTo) && (
                <Button variant="ghost" size="sm" onClick={() => { setDateFrom(''); setDateTo(''); }}>Limpar</Button>
              )}
            </div>
          </div>

          {/* Table */}
          {loading ? (
            <div className="text-center py-8 text-muted-foreground">Carregando...</div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">Nenhum frete encontrado.</div>
          ) : isMobile ? (
            <div className="space-y-3">
              {filtered.map(f => (
                <MobileTableCard
                  key={f.id}
                  title={`Pedido ${f.numero_pedido}`}
                  subtitle={f.cliente_nome || f.transportadora_nome}
                  badge={renderStatusBadge(f)}
                  fields={[
                    { label: 'Cliente', value: f.cliente_nome || '-' },
                    { label: 'NFs', value: (f.notas_fiscais || []).join(', ') || '-' },
                    { label: 'Cidade/UF', value: f.cidade_entrega ? `${f.cidade_entrega}${f.uf_entrega ? '/' + f.uf_entrega : ''}` : '-' },
                    { label: 'Embarque', value: formatDate(f.data_embarque) },
                    { label: 'Transportadora', value: f.transportadora_nome },
                    { label: 'Entrega', value: formatDate(f.data_entrega) },
                    { label: 'Valor', value: formatCurrency(Number(f.valor_frete)) },
                    { label: 'Peso', value: formatWeight(Number(f.peso_kg)) },
                    { label: 'R$/ton', value: calcReaisPorTon(Number(f.valor_frete), Number(f.peso_kg)) },
                  ]}
                  actions={
                    <div className="flex gap-2 flex-wrap">
                      {userCanEdit && f.status === 'rascunho' && (
                        <Button variant="outline" size="sm" onClick={() => handleSendForApproval(f.id)} className="gap-1"><Send className="h-4 w-4" />Enviar p/ Aprovação</Button>
                      )}
                      {canApprove && f.status === 'pendente' && (
                        <>
                          <Button variant="outline" size="sm" onClick={() => openApprovalDialog(f, 'aprovar')} className="gap-1 text-green-600"><CheckCircle className="h-4 w-4" />Aprovar</Button>
                          <Button variant="outline" size="sm" onClick={() => openApprovalDialog(f, 'rejeitar')} className="gap-1 text-destructive"><XCircle className="h-4 w-4" />Rejeitar</Button>
                        </>
                      )}
                      {userCanEdit && <Button variant="outline" size="sm" onClick={() => openEdit(f)}><Pencil className="h-4 w-4" /></Button>}
                      {isAdmin && <Button variant="destructive" size="sm" onClick={() => handleDelete(f.id)}><Trash2 className="h-4 w-4" /></Button>}
                    </div>
                  }
                />
              ))}
            </div>
          ) : (
            <div className="rounded-md border overflow-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Cliente</TableHead>
                    <TableHead>Pedido</TableHead>
                    <TableHead>Notas Fiscais</TableHead>
                    <TableHead>Cidade/UF</TableHead>
                    <TableHead>Embarque</TableHead>
                    <TableHead>Transportadora</TableHead>
                    <TableHead className="text-right">Valor Frete</TableHead>
                    <TableHead className="text-right">Peso (kg)</TableHead>
                    <TableHead className="text-right">R$/ton</TableHead>
                    <TableHead>Entrega</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Obs.</TableHead>
                    <TableHead className="w-40">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map(f => (
                    <TableRow key={f.id}>
                      <TableCell className="font-medium">{f.cliente_nome || '-'}</TableCell>
                      <TableCell>{f.numero_pedido}</TableCell>
                      <TableCell>
                        <div className="flex flex-wrap gap-1">
                          {(f.notas_fiscais || []).map(nf => (
                            <Badge key={nf} variant="outline" className="text-xs">{nf}</Badge>
                          ))}
                        </div>
                      </TableCell>
                      <TableCell>{f.cidade_entrega ? `${f.cidade_entrega}${f.uf_entrega ? '/' + f.uf_entrega : ''}` : '-'}</TableCell>
                      <TableCell>{formatDate(f.data_embarque)}</TableCell>
                      <TableCell>{f.transportadora_nome}</TableCell>
                      <TableCell className="text-right font-medium">{formatCurrency(Number(f.valor_frete))}</TableCell>
                      <TableCell className="text-right">{formatWeight(Number(f.peso_kg))}</TableCell>
                      <TableCell className="text-right text-xs font-medium">{calcReaisPorTon(Number(f.valor_frete), Number(f.peso_kg))}</TableCell>
                      <TableCell>{formatDate(f.data_entrega)}</TableCell>
                      <TableCell>{renderStatusBadge(f)}</TableCell>
                      <TableCell className="max-w-32 truncate text-xs text-muted-foreground">{f.observacoes || '-'}</TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          {userCanEdit && f.status === 'rascunho' && (
                            <Button variant="ghost" size="icon" onClick={() => handleSendForApproval(f.id)} title="Enviar para Aprovação">
                              <Send className="h-4 w-4 text-primary" />
                            </Button>
                          )}
                          {canApprove && f.status === 'pendente' && (
                            <>
                              <Button variant="ghost" size="icon" onClick={() => openApprovalDialog(f, 'aprovar')} title="Aprovar">
                                <CheckCircle className="h-4 w-4 text-green-600" />
                              </Button>
                              <Button variant="ghost" size="icon" onClick={() => openApprovalDialog(f, 'rejeitar')} title="Rejeitar">
                                <XCircle className="h-4 w-4 text-destructive" />
                              </Button>
                            </>
                          )}
                          {userCanEdit && (
                            <Button variant="ghost" size="icon" onClick={() => openEdit(f)}>
                              <Pencil className="h-4 w-4" />
                            </Button>
                          )}
                          {isAdmin && (
                            <Button variant="ghost" size="icon" onClick={() => handleDelete(f.id)}>
                              <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </div>

        <FreteFormDialog
          open={dialogOpen}
          onOpenChange={setDialogOpen}
          editingFrete={editingFrete}
          clientes={clientesFromSheets}
          pedidosByCliente={pedidosByCliente}
          nfsByPedido={nfsByPedido}
          pesoByNf={pesoByNf}
          transportadoras={transportadoras}
          onSaved={fetchData}
        />

        <TransportadoraDialog
          open={transportadoraDialogOpen}
          onOpenChange={setTransportadoraDialogOpen}
          transportadoras={transportadoras}
          onSaved={fetchData}
        />
        {approvalFrete && (
          <FreteApprovalDialog
            open={approvalDialogOpen}
            onOpenChange={setApprovalDialogOpen}
            action={approvalAction}
            numeroPedido={approvalFrete.numero_pedido}
            onConfirm={handleApprovalConfirm}
          />
        )}

        <FreteHistoryDialog
          open={historyDialogOpen}
          onOpenChange={setHistoryDialogOpen}
        />
      </div>
    </ErrorBoundary>
  );
}
