import React, { useState, useEffect, useCallback } from 'react';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useToast } from '@/hooks/use-toast';
import { Plus, Pencil, Trash2, Truck, Search, X } from 'lucide-react';
import { useUserPermissions } from '@/hooks/useUserPermissions';
import { loadFretes, insertFrete, updateFrete, deleteFrete, loadTransportadoras, type Frete, type FreteInsert } from '@/services/fretesService';
import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useIsMobile } from '@/hooks/use-mobile';
import { MobileTableCard } from '@/components/ui/mobile-table-card';

export default function Fretes() {
  const { toast } = useToast();
  const { isAdmin, checkPageAccess } = useUserPermissions();
  const isMobile = useIsMobile();
  const [fretes, setFretes] = useState<Frete[]>([]);
  const [transportadoras, setTransportadoras] = useState<Array<{ id: string; nome: string }>>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingFrete, setEditingFrete] = useState<Frete | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [saving, setSaving] = useState(false);

  // Form state
  const [form, setForm] = useState<FreteInsert>({
    numero_pedido: '',
    notas_fiscais: [],
    data_embarque: '',
    transportadora_id: null,
    transportadora_nome: '',
    valor_frete: 0,
    data_entrega: null,
    observacoes: '',
  });
  const [nfInput, setNfInput] = useState('');

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

  const resetForm = () => {
    setForm({ numero_pedido: '', notas_fiscais: [], data_embarque: '', transportadora_id: null, transportadora_nome: '', valor_frete: 0, data_entrega: null, observacoes: '' });
    setNfInput('');
    setEditingFrete(null);
  };

  const openNew = () => { resetForm(); setDialogOpen(true); };

  const openEdit = (frete: Frete) => {
    setEditingFrete(frete);
    setForm({
      numero_pedido: frete.numero_pedido,
      notas_fiscais: frete.notas_fiscais || [],
      data_embarque: frete.data_embarque,
      transportadora_id: frete.transportadora_id,
      transportadora_nome: frete.transportadora_nome,
      valor_frete: frete.valor_frete,
      data_entrega: frete.data_entrega,
      observacoes: frete.observacoes || '',
    });
    setNfInput('');
    setDialogOpen(true);
  };

  const addNf = () => {
    const nf = nfInput.trim();
    if (nf && !form.notas_fiscais.includes(nf)) {
      setForm(prev => ({ ...prev, notas_fiscais: [...prev.notas_fiscais, nf] }));
      setNfInput('');
    }
  };

  const removeNf = (nf: string) => {
    setForm(prev => ({ ...prev, notas_fiscais: prev.notas_fiscais.filter(n => n !== nf) }));
  };

  const handleTransportadoraChange = (transportadoraId: string) => {
    const t = transportadoras.find(t => t.id === transportadoraId);
    setForm(prev => ({ ...prev, transportadora_id: transportadoraId, transportadora_nome: t?.nome || '' }));
  };

  const handleSave = async () => {
    if (!form.numero_pedido || !form.data_embarque || !form.transportadora_nome) {
      toast({ title: 'Campos obrigatórios', description: 'Preencha pedido, data de embarque e transportadora.', variant: 'destructive' });
      return;
    }
    try {
      setSaving(true);
      if (editingFrete) {
        await updateFrete(editingFrete.id, form);
        toast({ title: 'Frete atualizado com sucesso!' });
      } else {
        await insertFrete(form);
        toast({ title: 'Frete cadastrado com sucesso!' });
      }
      setDialogOpen(false);
      resetForm();
      fetchData();
    } catch (err: any) {
      toast({ title: 'Erro ao salvar', description: err.message, variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Tem certeza que deseja excluir este frete?')) return;
    try {
      await deleteFrete(id);
      toast({ title: 'Frete excluído com sucesso!' });
      fetchData();
    } catch (err: any) {
      toast({ title: 'Erro ao excluir', description: err.message, variant: 'destructive' });
    }
  };

  const formatDate = (d: string | null) => {
    if (!d) return '-';
    try { return format(parseISO(d), 'dd/MM/yyyy', { locale: ptBR }); } catch { return d; }
  };

  const formatCurrency = (v: number) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

  const filtered = fretes.filter(f =>
    f.numero_pedido.toLowerCase().includes(searchTerm.toLowerCase()) ||
    f.transportadora_nome.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (f.notas_fiscais || []).some(nf => nf.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  // KPIs
  const totalFretes = filtered.length;
  const totalValor = filtered.reduce((s, f) => s + Number(f.valor_frete), 0);
  const embarquesPendentes = filtered.filter(f => !f.data_entrega).length;

  const userCanEdit = checkPageAccess('producao').canEdit;

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
            {userCanEdit && (
              <Button onClick={openNew} className="gap-2">
                <Plus className="h-4 w-4" />
                Novo Frete
              </Button>
            )}
          </div>

          {/* KPIs */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm text-muted-foreground">Total de Fretes</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold">{totalFretes}</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm text-muted-foreground">Valor Total</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold text-primary">{formatCurrency(totalValor)}</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm text-muted-foreground">Entregas Pendentes</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold text-destructive">{embarquesPendentes}</p>
              </CardContent>
            </Card>
          </div>

          {/* Search */}
          <div className="relative max-w-md">
            <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar por pedido, NF ou transportadora..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="pl-9"
            />
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
                  subtitle={f.transportadora_nome}
                  badge={f.data_entrega ? <Badge variant="default">Entregue</Badge> : <Badge variant="secondary">Pendente</Badge>}
                  fields={[
                    { label: 'NFs', value: (f.notas_fiscais || []).join(', ') || '-' },
                    { label: 'Embarque', value: formatDate(f.data_embarque) },
                    { label: 'Entrega', value: formatDate(f.data_entrega) },
                    { label: 'Valor', value: formatCurrency(Number(f.valor_frete)) },
                  ]}
                  actions={
                    <div className="flex gap-2">
                      {userCanEdit && (
                        <Button variant="outline" size="sm" onClick={() => openEdit(f)}>
                          <Pencil className="h-4 w-4" />
                        </Button>
                      )}
                      {isAdmin && (
                        <Button variant="destructive" size="sm" onClick={() => handleDelete(f.id)}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      )}
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
                    <TableHead>Pedido</TableHead>
                    <TableHead>Notas Fiscais</TableHead>
                    <TableHead>Embarque</TableHead>
                    <TableHead>Transportadora</TableHead>
                    <TableHead className="text-right">Valor Frete</TableHead>
                    <TableHead>Entrega</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Obs.</TableHead>
                    {(userCanEdit || isAdmin) && <TableHead className="w-20">Ações</TableHead>}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map(f => (
                    <TableRow key={f.id}>
                      <TableCell className="font-medium">{f.numero_pedido}</TableCell>
                      <TableCell>
                        <div className="flex flex-wrap gap-1">
                          {(f.notas_fiscais || []).map(nf => (
                            <Badge key={nf} variant="outline" className="text-xs">{nf}</Badge>
                          ))}
                        </div>
                      </TableCell>
                      <TableCell>{formatDate(f.data_embarque)}</TableCell>
                      <TableCell>{f.transportadora_nome}</TableCell>
                      <TableCell className="text-right font-medium">{formatCurrency(Number(f.valor_frete))}</TableCell>
                      <TableCell>{formatDate(f.data_entrega)}</TableCell>
                      <TableCell>
                        {f.data_entrega ? (
                          <Badge variant="default">Entregue</Badge>
                        ) : (
                          <Badge variant="secondary">Pendente</Badge>
                        )}
                      </TableCell>
                      <TableCell className="max-w-32 truncate text-xs text-muted-foreground">{f.observacoes || '-'}</TableCell>
                      {(userCanEdit || isAdmin) && (
                        <TableCell>
                          <div className="flex gap-1">
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
                      )}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </div>

        {/* Dialog */}
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{editingFrete ? 'Editar Frete' : 'Novo Frete'}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium">Nº Pedido *</label>
                <Input value={form.numero_pedido} onChange={e => setForm(p => ({ ...p, numero_pedido: e.target.value }))} placeholder="Ex: 12345" />
              </div>

              <div>
                <label className="text-sm font-medium">Notas Fiscais</label>
                <div className="flex gap-2 mt-1">
                  <Input value={nfInput} onChange={e => setNfInput(e.target.value)} placeholder="Nº da NF" onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), addNf())} />
                  <Button type="button" variant="outline" onClick={addNf}>Adicionar</Button>
                </div>
                {form.notas_fiscais.length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-2">
                    {form.notas_fiscais.map(nf => (
                      <Badge key={nf} variant="secondary" className="gap-1">
                        {nf}
                        <X className="h-3 w-3 cursor-pointer" onClick={() => removeNf(nf)} />
                      </Badge>
                    ))}
                  </div>
                )}
              </div>

              <div>
                <label className="text-sm font-medium">Data de Embarque *</label>
                <Input type="date" value={form.data_embarque} onChange={e => setForm(p => ({ ...p, data_embarque: e.target.value }))} />
              </div>

              <div>
                <label className="text-sm font-medium">Transportadora *</label>
                <Select value={form.transportadora_id || ''} onValueChange={handleTransportadoraChange}>
                  <SelectTrigger><SelectValue placeholder="Selecione a transportadora" /></SelectTrigger>
                  <SelectContent>
                    {transportadoras.map(t => (
                      <SelectItem key={t.id} value={t.id}>{t.nome}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="text-sm font-medium">Valor do Frete (R$)</label>
                <Input type="number" min={0} step={0.01} value={form.valor_frete} onChange={e => setForm(p => ({ ...p, valor_frete: parseFloat(e.target.value) || 0 }))} />
              </div>

              <div>
                <label className="text-sm font-medium">Data da Entrega</label>
                <Input type="date" value={form.data_entrega || ''} onChange={e => setForm(p => ({ ...p, data_entrega: e.target.value || null }))} />
              </div>

              <div>
                <label className="text-sm font-medium">Observações</label>
                <Textarea value={form.observacoes || ''} onChange={e => setForm(p => ({ ...p, observacoes: e.target.value }))} rows={2} />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancelar</Button>
              <Button onClick={handleSave} disabled={saving}>{saving ? 'Salvando...' : editingFrete ? 'Salvar' : 'Cadastrar'}</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </ErrorBoundary>
  );
}
