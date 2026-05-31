import React, { useState, useMemo, useCallback, useEffect, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Progress } from '@/components/ui/progress';
import { Search, ArrowUpDown, ChevronDown, ChevronRight, Calendar, Save, Check, EyeOff, Mail } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useProducao } from '@/context/ProducaoContext';
import { MaterialData, OperacaoData } from '@/services/producaoService';
import { saveProductionOrder } from '@/services/productionOrdersService';
import { format, parseISO, isValid } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useToast } from '@/hooks/use-toast';
import { useDebounceCallback } from '@/hooks/useDebounceCallback';
import { useUserPermissions } from '@/hooks/useUserPermissions';
import { useIsMobile } from '@/hooks/use-mobile';
import { ProducaoTableMobile } from './ProducaoTableMobile';
import { HideOrderDialog } from './HideOrderDialog';
import { ProductionNotifyButton } from './ProductionNotifyButton';

type SortField = 'numero_pedido' | 'cli_nomef' | 'prazo_pcp' | 'status' | 'dias_atraso' | 'percentual_concluido';
type SortOrder = 'asc' | 'desc';

export function ProducaoTable() {
  const { filteredData, loading, selectedCliente, setSelectedCliente, selectedStatus, setSelectedStatus, productionOrders, refreshProductionOrders, hideOrder } = useProducao();
  const { checkPageAccess, isAdmin } = useUserPermissions();
  const [searchTerm, setSearchTerm] = useState('');
  const [sortField, setSortField] = useState<SortField>('dias_atraso');
  const [sortOrder, setSortOrder] = useState<SortOrder>('desc');
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());
  const [novosPrazos, setNovosPrazos] = useState<Record<string, string>>({});
  const [situacoes, setSituacoes] = useState<Record<string, string>>({});
  const [situacaoDescricoes, setSituacaoDescricoes] = useState<Record<string, string>>({});
  const [savingStates, setSavingStates] = useState<Record<string, boolean>>({});
  const [savedStates, setSavedStates] = useState<Record<string, boolean>>({});
  const [hideDialogOpen, setHideDialogOpen] = useState(false);
  const [orderToHide, setOrderToHide] = useState<string | null>(null);
  const { toast } = useToast();
  const isMobile = useIsMobile();
  const tableScrollRef = useRef<HTMLDivElement>(null);
  const fixedScrollRef = useRef<HTMLDivElement>(null);
  const fixedScrollContentRef = useRef<HTMLDivElement>(null);
  const [horizontalScroll, setHorizontalScroll] = useState({ left: 264, width: 900, contentWidth: 1280 });

  // Check if user can edit production data
  const { canEdit } = checkPageAccess('producao');

  // Load saved data when productionOrders change
  useEffect(() => {
    const newNovosPrazos: Record<string, string> = {};
    const newSituacoes: Record<string, string> = {};
    const newDescricoes: Record<string, string> = {};

    Object.entries(productionOrders).forEach(([numeroPedido, order]) => {
      if (order.novo_prazo) {
        newNovosPrazos[numeroPedido] = order.novo_prazo;
      }
      if (order.situacao) {
        newSituacoes[numeroPedido] = order.situacao;
      }
      if (order.situacao_descricao) {
        newDescricoes[numeroPedido] = order.situacao_descricao;
      }
    });

    setNovosPrazos(newNovosPrazos);
    setSituacoes(newSituacoes);
    setSituacaoDescricoes(newDescricoes);
  }, [productionOrders]);

  // Save production order data with debounce
  const saveOrderData = useCallback(async (numeroPedido: string, novoPrazo?: string, situacao?: string, descricao?: string) => {
    try {
      setSavingStates(prev => ({ ...prev, [numeroPedido]: true }));

      await saveProductionOrder({
        numero_pedido: numeroPedido,
        novo_prazo: novoPrazo || null,
        situacao: (situacao as 'aguardando_mp' | 'em_producao' | 'material_em_estoque' | 'outra') || null,
        situacao_descricao: situacao === 'outra' ? (descricao || null) : null,
      });

      // Show saved indicator
      setSavedStates(prev => ({ ...prev, [numeroPedido]: true }));
      setTimeout(() => {
        setSavedStates(prev => ({ ...prev, [numeroPedido]: false }));
      }, 2000);

      // Refresh production orders data
      await refreshProductionOrders();

    } catch (error) {
      console.error('Erro ao salvar:', error);
      toast({
        title: "Erro ao salvar",
        description: "Não foi possível salvar os dados. Tente novamente.",
        variant: "destructive",
      });
    } finally {
      setSavingStates(prev => ({ ...prev, [numeroPedido]: false }));
    }
  }, [refreshProductionOrders, toast]);

  const debouncedSave = useDebounceCallback(saveOrderData, 1000);

  const handleNovoPrazoChange = useCallback((numeroPedido: string, value: string) => {
    setNovosPrazos(prev => ({
      ...prev,
      [numeroPedido]: value
    }));
    
    const situacao = situacoes[numeroPedido];
    debouncedSave(numeroPedido, value, situacao);
  }, [situacoes, debouncedSave]);

  const handleSituacaoChange = useCallback((numeroPedido: string, value: string) => {
    setSituacoes(prev => ({
      ...prev,
      [numeroPedido]: value
    }));
    
    const novoPrazo = novosPrazos[numeroPedido];
    const descricao = situacaoDescricoes[numeroPedido];
    if (value !== 'outra') {
      // Clear description if not "outra"
      setSituacaoDescricoes(prev => ({ ...prev, [numeroPedido]: '' }));
      debouncedSave(numeroPedido, novoPrazo, value, '');
    } else {
      debouncedSave(numeroPedido, novoPrazo, value, descricao);
    }
  }, [novosPrazos, situacaoDescricoes, debouncedSave]);

  const handleSituacaoDescricaoChange = useCallback((numeroPedido: string, value: string) => {
    setSituacaoDescricoes(prev => ({
      ...prev,
      [numeroPedido]: value
    }));
    
    const novoPrazo = novosPrazos[numeroPedido];
    debouncedSave(numeroPedido, novoPrazo, 'outra', value);
  }, [novosPrazos, debouncedSave]);

  // Get unique clients for filter
  const uniqueClientes = useMemo(() => {
    const clientes = Array.from(new Set(filteredData.map(item => item.cli_nomef))).sort();
    return clientes;
  }, [filteredData]);

  // Apply search and sort
  const processedData = useMemo(() => {
    let data = filteredData.filter(item => {
      const searchLower = searchTerm.toLowerCase();
      return (
        item.numero_pedido.toLowerCase().includes(searchLower) ||
        item.cli_nomef.toLowerCase().includes(searchLower) ||
        item.ops.some(op => 
          op.materiais.some(mat => mat.descricaomat.toLowerCase().includes(searchLower))
        )
      );
    });

    // Sort data
    data.sort((a, b) => {
      let aValue: any;
      let bValue: any;

      switch (sortField) {
        case 'numero_pedido':
          aValue = a.numero_pedido;
          bValue = b.numero_pedido;
          break;
        case 'cli_nomef':
          aValue = a.cli_nomef;
          bValue = b.cli_nomef;
          break;
        case 'prazo_pcp':
          aValue = new Date(a.prazo_pcp);
          bValue = new Date(b.prazo_pcp);
          break;
        case 'status':
          aValue = a.status;
          bValue = b.status;
          break;
        case 'dias_atraso':
          aValue = a.dias_atraso || 0;
          bValue = b.dias_atraso || 0;
          break;
        case 'percentual_concluido':
          aValue = a.percentual_concluido;
          bValue = b.percentual_concluido;
          break;
        default:
          return 0;
      }

      if (aValue < bValue) return sortOrder === 'asc' ? -1 : 1;
      if (aValue > bValue) return sortOrder === 'asc' ? 1 : -1;
      return 0;
    });

    return data;
  }, [filteredData, searchTerm, sortField, sortOrder]);

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortOrder('asc');
    }
  };

  const updateHorizontalScrollBar = useCallback(() => {
    const tableScroll = tableScrollRef.current;
    if (!tableScroll || isMobile) return;

    const rect = tableScroll.getBoundingClientRect();
    const contentWidth = tableScroll.scrollWidth;

    setHorizontalScroll({
      left: Math.max(rect.left, 0),
      width: Math.max(Math.min(rect.width, window.innerWidth - Math.max(rect.left, 0)), 240),
      contentWidth,
    });

    if (fixedScrollRef.current && fixedScrollRef.current.scrollLeft !== tableScroll.scrollLeft) {
      fixedScrollRef.current.scrollLeft = tableScroll.scrollLeft;
    }
  }, [isMobile]);

  useEffect(() => {
    const tableScroll = tableScrollRef.current;
    if (!tableScroll || isMobile) return;

    const handleTableScroll = () => updateHorizontalScrollBar();

    updateHorizontalScrollBar();
    tableScroll.addEventListener('scroll', handleTableScroll);
    window.addEventListener('resize', updateHorizontalScrollBar);
    window.addEventListener('scroll', updateHorizontalScrollBar, true);

    const resizeObserver = new ResizeObserver(updateHorizontalScrollBar);
    resizeObserver.observe(tableScroll);
    const tableElement = tableScroll.querySelector('table');
    if (tableElement) resizeObserver.observe(tableElement);

    return () => {
      tableScroll.removeEventListener('scroll', handleTableScroll);
      window.removeEventListener('resize', updateHorizontalScrollBar);
      window.removeEventListener('scroll', updateHorizontalScrollBar, true);
      resizeObserver.disconnect();
    };
  }, [processedData.length, expandedRows, updateHorizontalScrollBar, isMobile]);

  const handleFixedHorizontalScroll = () => {
    if (tableScrollRef.current && fixedScrollRef.current) {
      tableScrollRef.current.scrollLeft = fixedScrollRef.current.scrollLeft;
    }
  };


  const handleHideOrder = (numeroPedido: string) => {
    setOrderToHide(numeroPedido);
    setHideDialogOpen(true);
  };

  const confirmHideOrder = async (motivo?: string) => {
    if (orderToHide) {
      await hideOrder(orderToHide, motivo);
      setOrderToHide(null);
    }
  };

  const toggleRowExpansion = (pedidoId: string) => {
    const newExpanded = new Set(expandedRows);
    if (newExpanded.has(pedidoId)) {
      newExpanded.delete(pedidoId);
    } else {
      newExpanded.add(pedidoId);
    }
    setExpandedRows(newExpanded);
  };

  const formatDate = (dateString: string) => {
    if (!dateString) return 'Sem prazo';
    
    try {
      const date = parseISO(dateString);
      if (!isValid(date)) return 'Data inválida';
      
      return format(date, 'dd/MM/yyyy', { locale: ptBR });
    } catch {
      return 'Data inválida';
    }
  };

  const formatWeight = (weight: number) => {
    return `${Math.round(weight).toLocaleString('pt-BR')}kg`;
  };

  const getStatusBadge = (status: string) => {
    if (status === 'ATRASO') {
      return (
        <Badge variant="destructive" className="bg-red-100 text-red-800 border-red-200">
          ATRASO
        </Badge>
      );
    }
    if (status === 'PROGRAMAR') {
      return (
        <Badge className="bg-orange-100 text-orange-800 border-orange-200">
          PROGRAMAR
        </Badge>
      );
    }
    if (status === 'FINALIZADO') {
      return (
        <Badge className="bg-green-600 text-white border-green-700">
          FINALIZADO
        </Badge>
      );
    }
    if (status === 'PARCIALMENTE_FINALIZADO') {
      return (
        <Badge className="bg-blue-100 text-blue-800 border-blue-200">
          PARCIAL
        </Badge>
      );
    }
    return (
      <Badge variant="secondary" className="bg-green-100 text-green-800 border-green-200">
        NO PRAZO
      </Badge>
    );
  };

  const getMaterialStatusBadge = (status: string) => {
    // Handle empty/null/undefined values as "A PROGRAMAR"
    if (!status || status.trim() === '') {
      return (
        <Badge className="bg-orange-100 text-orange-800 border-orange-200 text-xs">
          A PROGRAMAR
        </Badge>
      );
    }

    const normalizedStatus = status.toUpperCase().trim();
    
    // Explicitly handle "A PROGRAMAR"
    if (normalizedStatus === 'A PROGRAMAR') {
      return (
        <Badge className="bg-orange-100 text-orange-800 border-orange-200 text-xs">
          A PROGRAMAR
        </Badge>
      );
    }
    
    if (normalizedStatus.includes('CONCLUIDO') || normalizedStatus.includes('FINALIZADO') || normalizedStatus.includes('PRONTO') || normalizedStatus.includes('FINALIZADA')) {
      return (
        <Badge variant="secondary" className="bg-green-100 text-green-800 border-green-200 text-xs">
          CONCLUÍDO
        </Badge>
      );
    }
    if (normalizedStatus.includes('PRODUCAO') || normalizedStatus.includes('PROGRAMACAO')) {
      return (
        <Badge className="bg-blue-100 text-blue-800 border-blue-200 text-xs">
          EM PRODUÇÃO
        </Badge>
      );
    }
    if (normalizedStatus.includes('AGUARDANDO')) {
      return (
        <Badge className="bg-orange-100 text-orange-800 border-orange-200 text-xs">
          AGUARDANDO
        </Badge>
      );
    }
    return (
      <Badge variant="outline" className="text-xs">
        {normalizedStatus}
      </Badge>
    );
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Pedidos em Produção</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center h-32">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
    <Card>
      <CardHeader>
        <CardTitle>Pedidos em Produção</CardTitle>
        
        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-4" data-tour="producao-filters">
          <div className="relative flex-1">
            <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar por pedido, cliente ou material..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-8"
            />
          </div>
          
          <Select value={selectedCliente} onValueChange={setSelectedCliente}>
            <SelectTrigger className="w-full sm:w-[200px]">
              <SelectValue placeholder="Filtrar por cliente" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Todos os clientes</SelectItem>
              {uniqueClientes.map(cliente => (
                <SelectItem key={cliente} value={cliente}>{cliente}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={selectedStatus} onValueChange={setSelectedStatus}>
            <SelectTrigger className="w-full sm:w-[150px]">
              <SelectValue placeholder="Filtrar por status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Todos os status</SelectItem>
              <SelectItem value="NO_PRAZO">No Prazo</SelectItem>
              <SelectItem value="ATRASO">Atraso</SelectItem>
              <SelectItem value="PROGRAMAR">A Programar</SelectItem>
              <SelectItem value="PARCIALMENTE_FINALIZADO">Parcial</SelectItem>
              <SelectItem value="FINALIZADO">Finalizados</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </CardHeader>
      
      <CardContent>
        {isMobile ? (
          <ProducaoTableMobile
            data={processedData}
            expandedRows={expandedRows}
            toggleRowExpansion={toggleRowExpansion}
            novosPrazos={novosPrazos}
            situacoes={situacoes}
            savingStates={savingStates}
            savedStates={savedStates}
            handleNovoPrazoChange={handleNovoPrazoChange}
            handleSituacaoChange={handleSituacaoChange}
            canEdit={canEdit}
            formatDate={formatDate}
            formatWeight={formatWeight}
      getStatusBadge={getStatusBadge}
      getMaterialStatusBadge={getMaterialStatusBadge}
      isAdmin={isAdmin}
      onHideOrder={handleHideOrder}
    />
        ) : (
          <div ref={tableScrollRef} className="rounded-md border overflow-x-auto overflow-y-visible producao-table-scroll bg-card" data-tour="producao-table">
            <Table className="min-w-[1280px]">
            <TableHeader>
              <TableRow>
                <TableHead className="w-8 min-w-8"></TableHead>
                <TableHead className="min-w-[110px]">
                  <Button variant="ghost" onClick={() => handleSort('numero_pedido')} className="h-auto p-0 font-semibold">
                    Pedido
                    <ArrowUpDown className="ml-2 h-4 w-4" />
                  </Button>
                </TableHead>
                <TableHead className="min-w-[160px]">
                  <Button variant="ghost" onClick={() => handleSort('cli_nomef')} className="h-auto p-0 font-semibold">
                    Cliente
                    <ArrowUpDown className="ml-2 h-4 w-4" />
                  </Button>
                </TableHead>
                <TableHead className="min-w-[110px]">
                  Peso
                </TableHead>
                <TableHead className="min-w-[150px]">
                  <Button variant="ghost" onClick={() => handleSort('percentual_concluido')} className="h-auto p-0 font-semibold">
                    % Concluído
                    <ArrowUpDown className="ml-2 h-4 w-4" />
                  </Button>
                </TableHead>
                <TableHead className="min-w-[120px]">
                  <Button variant="ghost" onClick={() => handleSort('prazo_pcp')} className="h-auto p-0 font-semibold">
                    Prazo
                    <ArrowUpDown className="ml-2 h-4 w-4" />
                  </Button>
                </TableHead>
                <TableHead className="min-w-[170px]">
                  Novo Prazo
                </TableHead>
                <TableHead className="min-w-[130px]">
                  <Button variant="ghost" onClick={() => handleSort('status')} className="h-auto p-0 font-semibold">
                    Status
                    <ArrowUpDown className="ml-2 h-4 w-4" />
                  </Button>
                </TableHead>
                <TableHead className="min-w-[150px]">
                  <Button variant="ghost" onClick={() => handleSort('dias_atraso')} className="h-auto p-0 font-semibold">
                    Dias Atraso
                    <ArrowUpDown className="ml-2 h-4 w-4" />
                  </Button>
                </TableHead>
                <TableHead className="min-w-[210px]">
                  Situação
                </TableHead>
                {isAdmin && <TableHead className="w-[50px]"></TableHead>}
              </TableRow>
            </TableHeader>
            <TableBody>
              {processedData.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={10} className="text-center py-8 text-muted-foreground">
                    Nenhum pedido encontrado
                  </TableCell>
                </TableRow>
              ) : (
                processedData.map((item, index) => (
                  <React.Fragment key={`${item.numero_pedido}-${index}`}>
                    <TableRow 
                      className="hover:bg-muted/50 cursor-pointer"
                      onClick={() => toggleRowExpansion(item.numero_pedido)}
                      data-tour={index === 0 ? "producao-row-expand" : undefined}
                    >
                      <TableCell>
                        {expandedRows.has(item.numero_pedido) ? (
                          <ChevronDown className="h-4 w-4" />
                        ) : (
                          <ChevronRight className="h-4 w-4" />
                        )}
                      </TableCell>
                      <TableCell className="font-medium">
                        {item.numero_pedido}
                      </TableCell>
                      <TableCell className="font-medium">
                        {item.cli_nomef}
                      </TableCell>
                      <TableCell>
                        {(() => {
                          const pesoKg = Math.round(item.peso_total_kg || 0);
                          return `${pesoKg.toLocaleString('pt-BR')}KG`;
                        })()}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Progress value={item.percentual_concluido} className="w-16 h-2" />
                          <span className="text-sm font-medium min-w-[35px]">
                            {item.percentual_concluido}%
                          </span>
                        </div>
                      </TableCell>
                      <TableCell>{formatDate(item.prazo_pcp)}</TableCell>
                      <TableCell data-tour={index === 0 ? "producao-novo-prazo" : undefined}>
                        {canEdit ? (
                          <div className="relative">
                            <Input
                              type="date"
                              className="w-36 pr-10"
                              value={novosPrazos[item.numero_pedido] || ''}
                              onChange={(e) => handleNovoPrazoChange(item.numero_pedido, e.target.value)}
                            />
                            {savingStates[item.numero_pedido] && (
                              <Save className="absolute right-8 top-2.5 h-3 w-3 text-blue-500 animate-spin" />
                            )}
                            {savedStates[item.numero_pedido] && (
                              <Check className="absolute right-8 top-2.5 h-3 w-3 text-green-500" />
                            )}
                          </div>
                        ) : (
                          <span className="text-muted-foreground text-sm">
                            {novosPrazos[item.numero_pedido] ? formatDate(novosPrazos[item.numero_pedido]) : 'Não definido'}
                          </span>
                        )}
                      </TableCell>
                      <TableCell>{getStatusBadge(item.status)}</TableCell>
                      <TableCell>
                        {item.status === 'ATRASO' && item.dias_atraso && item.dias_atraso > 0 ? (
                          <span className="text-red-600 font-medium">{item.dias_atraso} dias</span>
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </TableCell>
                      <TableCell data-tour={index === 0 ? "producao-situacao" : undefined}>
                        {canEdit ? (
                          <div className="relative space-y-1">
                            <Select
                              value={situacoes[item.numero_pedido] || ''}
                              onValueChange={(value) => handleSituacaoChange(item.numero_pedido, value)}
                            >
                              <SelectTrigger className="w-44 pr-8">
                                <SelectValue placeholder="Selecionar situação" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="aguardando_mp">Aguardando MP</SelectItem>
                                <SelectItem value="em_producao">Em Produção</SelectItem>
                                <SelectItem value="material_em_estoque">Material em Estoque</SelectItem>
                                <SelectItem value="outra">Outra</SelectItem>
                              </SelectContent>
                            </Select>
                            {situacoes[item.numero_pedido] === 'outra' && (
                              <Input
                                placeholder="Descreva..."
                                className="w-44 text-xs"
                                value={situacaoDescricoes[item.numero_pedido] || ''}
                                onChange={(e) => handleSituacaoDescricaoChange(item.numero_pedido, e.target.value)}
                                onClick={(e) => e.stopPropagation()}
                                maxLength={100}
                              />
                            )}
                            {savingStates[item.numero_pedido] && (
                              <Save className="absolute right-2 top-2.5 h-3 w-3 text-blue-500 animate-spin" />
                            )}
                            {savedStates[item.numero_pedido] && (
                              <Check className="absolute right-2 top-2.5 h-3 w-3 text-green-500" />
                            )}
                          </div>
                        ) : (
                          <span className="text-muted-foreground text-sm">
                            {situacoes[item.numero_pedido] === 'aguardando_mp' ? 'Aguardando MP' :
                             situacoes[item.numero_pedido] === 'em_producao' ? 'Em Produção' :
                             situacoes[item.numero_pedido] === 'material_em_estoque' ? 'Material em Estoque' :
                             situacoes[item.numero_pedido] === 'outra' ? (situacaoDescricoes[item.numero_pedido] || 'Outra') :
                             'Não definido'}
                          </span>
                        )}
                      </TableCell>
                      {isAdmin && (
                        <TableCell onClick={(e) => e.stopPropagation()}>
                          <div className="flex items-center gap-1">
                            {item.status === 'FINALIZADO' && (
                              <ProductionNotifyButton
                                pedido={item}
                                tipo="pedido_finalizado"
                              />
                            )}
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleHideOrder(item.numero_pedido)}
                              title="Ocultar pedido"
                            >
                              <EyeOff className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      )}
                    </TableRow>

                    {/* Expanded content - show OPs details */}
                    {expandedRows.has(item.numero_pedido) && (
                      <TableRow>
                        <TableCell colSpan={isAdmin ? 11 : 10}>
                          <div className="p-4 bg-muted/50 rounded-lg space-y-4">
                            <h4 className="font-semibold text-sm">Ordens de Produção:</h4>
                            
                            {item.ops.map((op, opIndex) => (
                              <div key={op.numero_op} className="border rounded-lg p-3 bg-background">
                                <div className="flex items-center justify-between mb-2">
                                  <div className="flex items-center gap-4">
                                    <span className="font-medium">OP {op.numero_op}</span>
                                    {getMaterialStatusBadge(op.situacao_op)}
                                    <span className="text-sm text-muted-foreground">
                                      Peso: {(() => {
                                        // Show non-KG units first, then KG weight separated by pipe
                                        const nonKgUnits = Object.entries(op.pesos_por_unidade)
                                          .filter(([unidade]) => unidade !== 'KG' && unidade !== 'T')
                                          .map(([unidade, peso]) => 
                                            `${peso.toLocaleString('pt-BR', { minimumFractionDigits: 0, maximumFractionDigits: 1 })} ${unidade}`
                                          );
                                        const pesoKg = Math.round(op.peso_total_kg || 0);
                                        const kgStr = `${pesoKg.toLocaleString('pt-BR')}KG`;
                                        
                                        if (nonKgUnits.length > 0) {
                                          return `${nonKgUnits.join(' / ')} | ${kgStr}`;
                                        }
                                        return kgStr;
                                      })()}
                                    </span>
                                  </div>
                                  {isAdmin && (op.situacao_op || '').toUpperCase().includes('FINALIZADA') && (
                                    <ProductionNotifyButton
                                      pedido={item}
                                      tipo="op_concluida"
                                      numeroOp={op.numero_op}
                                      showLabel
                                    />
                                  )}
                                </div>
                                
                                <div className="space-y-2">
                                  <h5 className="text-sm font-medium">Materiais:</h5>
                                  {op.materiais.map((material, matIndex) => (
                                    <div key={matIndex} className="py-1 px-2 bg-muted/30 rounded text-sm">
                                      <span className="text-primary font-medium">
                                        {material.descricaomat}
                                      </span>
                                      {material.observacao && (
                                        <span className="text-muted-foreground">
                                          <span className="mx-2">-</span>
                                          {material.observacao}
                                        </span>
                                      )}
                                    </div>
                                  ))}
                                </div>
                              </div>
                            ))}
                          </div>
                        </TableCell>
                      </TableRow>
                    )}
                  </React.Fragment>
                ))
              )}
            </TableBody>
            </Table>
        </div>
        )}
      </CardContent>
    </Card>
    
    {orderToHide && (
      <HideOrderDialog
        open={hideDialogOpen}
        onOpenChange={setHideDialogOpen}
        numeroPedido={orderToHide}
        onConfirm={confirmHideOrder}
      />
    )}
    {!isMobile && (
      <div
        ref={fixedScrollRef}
        className="fixed bottom-0 z-[9999] h-6 overflow-x-scroll overflow-y-hidden kanban-scroll border-t bg-card px-3 shadow-lg"
        style={{
          left: horizontalScroll.left,
          width: horizontalScroll.width,
        }}
        onScroll={handleFixedHorizontalScroll}
      >
        <div ref={fixedScrollContentRef} className="h-1" style={{ width: Math.max(horizontalScroll.contentWidth, 1280) }} />
      </div>
    )}
    </>
  );
}