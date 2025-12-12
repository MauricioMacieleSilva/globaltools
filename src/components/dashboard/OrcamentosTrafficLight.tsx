import React, { useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ScrollArea } from '@/components/ui/scroll-area';
import { ChevronDown, ChevronRight } from 'lucide-react';
import { useComercial } from '@/context/ComercialContext';
import { parseDate } from '@/lib/utils-comercial';

export function OrcamentosTrafficLight() {
  const { data, isLoading } = useComercial();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedVendedor, setSelectedVendedor] = useState<string | null>(null);
  const [expandedPedidos, setExpandedPedidos] = useState<Set<string>>(new Set());

  // Função para agrupar orçamentos por vendedor
  const getGroupedOrcamentosPorVendedor = (vendedor: string) => {
    const orcamentosAbertos = data.filter(item => {
      // Excluir vendedor "VENDEDOR"
      if (item.vendedor === 'VENDEDOR') return false;
      
      // Filtrar cliente GLOBAL AÇO SC
      const normalizeText = (text: string) => text?.toUpperCase().replace(/\s+/g, ' ').trim();
      const nomeFantasia = normalizeText(item.cli_nomefantasia || '');
      const cliente = normalizeText(item.cliente || '');
      
      if (nomeFantasia.includes('GLOBAL') && nomeFantasia.includes('AÇO') && nomeFantasia.includes('SC')) {
        return false;
      }
      if (cliente.includes('GLOBAL') && cliente.includes('AÇO') && cliente.includes('SC')) {
        return false;
      }
      
      // Filtrar apenas orçamentos
      if (item.situacao !== "Orçamento") return false;
      
      // Filtrar por vendedor específico
      return item.vendedor === vendedor;
    });
    
    // Agrupar por pedido
    const groups: Record<string, any[]> = {};
    orcamentosAbertos.forEach(item => {
      const pedidoKey = item.numeropedido || 'Sem Pedido';
      if (!groups[pedidoKey]) {
        groups[pedidoKey] = [];
      }
      groups[pedidoKey].push(item);
    });

    // Ordenar os grupos por data do mais novo para o mais antigo
    const sortedGroups: Record<string, any[]> = {};
    Object.entries(groups)
      .sort(([, itemsA], [, itemsB]) => {
        const dataA = parseDate(itemsA[0]?.data_pedido_pronto || itemsA[0]?.data_emissao || '1900-01-01')?.getTime() || 0;
        const dataB = parseDate(itemsB[0]?.data_pedido_pronto || itemsB[0]?.data_emissao || '1900-01-01')?.getTime() || 0;
        return dataB - dataA;
      })
      .forEach(([key, items]) => {
        sortedGroups[key] = items;
      });

    return sortedGroups;
  };

  const vendedoresData = useMemo(() => {
    // Filtrar apenas orçamentos, excluindo VENDEDOR e GLOBAL AÇO SC
    const orcamentosAbertos = data.filter(item => {
      // Excluir vendedor "VENDEDOR"
      if (item.vendedor === 'VENDEDOR') return false;
      
      // Filtrar cliente GLOBAL AÇO SC
      const normalizeText = (text: string) => text?.toUpperCase().replace(/\s+/g, ' ').trim();
      const nomeFantasia = normalizeText(item.cli_nomefantasia || '');
      const cliente = normalizeText(item.cliente || '');
      
      if (nomeFantasia.includes('GLOBAL') && nomeFantasia.includes('AÇO') && nomeFantasia.includes('SC')) {
        return false;
      }
      if (cliente.includes('GLOBAL') && cliente.includes('AÇO') && cliente.includes('SC')) {
        return false;
      }
      
      // Filtrar apenas orçamentos
      if (item.situacao !== "Orçamento") return false;
      
      return true;
    });

    // Agrupar por vendedor contando pedidos únicos
    const vendedoresMap: Record<string, { pedidos: Set<string>; valor: number }> = {};
    
    orcamentosAbertos.forEach(item => {
      const vendedor = item.vendedor || 'Sem Vendedor';
      const numeroPedido = item.numeropedido || 'Sem Pedido';
      
      if (!vendedoresMap[vendedor]) {
        vendedoresMap[vendedor] = { pedidos: new Set(), valor: 0 };
      }
      
      vendedoresMap[vendedor].pedidos.add(numeroPedido);
      vendedoresMap[vendedor].valor += item.valor || 0;
    });

    // Calcular total para percentuais
    const totalValor = Object.values(vendedoresMap).reduce((sum, v) => sum + v.valor, 0);
    const totalPedidos = Object.values(vendedoresMap).reduce((sum, v) => sum + v.pedidos.size, 0);

    // Converter para array e adicionar percentuais, depois ordenar por valor
    const vendedoresArray = Object.entries(vendedoresMap)
      .map(([vendedor, data]) => ({
        vendedor,
        count: data.pedidos.size,
        valor: data.valor,
        percentual: totalPedidos > 0 ? (data.pedidos.size / totalPedidos) * 100 : 0
      }))
      .sort((a, b) => b.valor - a.valor); // Ordenar por valor decrescente

    return vendedoresArray;
  }, [data]);

  const togglePedido = (pedidoNumber: string) => {
    const newExpanded = new Set(expandedPedidos);
    if (newExpanded.has(pedidoNumber)) {
      newExpanded.delete(pedidoNumber);
    } else {
      newExpanded.add(pedidoNumber);
    }
    setExpandedPedidos(newExpanded);
  };

  const formatDate = (dateString: string) => {
    if (!dateString || dateString === 'Invalid Date') return '-';
    const date = parseDate(dateString);
    return !date ? '-' : date.toLocaleDateString('pt-BR');
  };

  const getDateForItem = (item: any) => {
    return item.situacao === 'Orçamento' ? item.data_pedido_pronto : item.data_inicio;
  };

  const formatCurrencyDetailed = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(value);
  };

  const handleVendedorClick = (vendedor: string) => {
    setSelectedVendedor(vendedor);
    setExpandedPedidos(new Set());
    setDialogOpen(true);
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(value);
  };

  if (isLoading) {
    return (
      <Card className="h-56">
        <CardHeader className="pb-2 px-3 pt-3">
          <div className="h-4 w-48 bg-muted animate-pulse rounded" />
        </CardHeader>
        <CardContent className="px-3 pb-3">
          <div className="h-44 bg-muted animate-pulse rounded" />
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card className="h-56 bg-gradient-to-br from-amber-50 to-orange-50 dark:from-amber-950/20 dark:to-orange-950/20 border-amber-200/50 dark:border-amber-800/30">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 px-4 pt-4">
          <CardTitle className="text-sm font-semibold flex items-center gap-2">
            <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-amber-500 to-orange-500 flex items-center justify-center shadow-md">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
            <span className="text-amber-700 dark:text-amber-400">Orçamentos em Aberto</span>
          </CardTitle>
          <div className="text-right">
            <p className="text-xs text-muted-foreground">Total</p>
            <p className="text-sm font-bold text-amber-600 dark:text-amber-400">
              {vendedoresData.reduce((acc, v) => acc + v.count, 0)} orç.
            </p>
          </div>
        </CardHeader>
        <CardContent className="px-4 pb-4 pt-0">
          <ScrollArea className="h-[140px]">
            <div className="flex flex-col gap-2 pr-2">
              {vendedoresData.length > 0 ? (
                vendedoresData.map((vendedor, index) => (
                  <div 
                    key={vendedor.vendedor}
                    className="flex items-center justify-between p-2.5 rounded-xl bg-white/70 dark:bg-background/50 border border-amber-200/50 dark:border-amber-700/30 cursor-pointer hover:bg-amber-100/50 dark:hover:bg-amber-900/20 hover:border-amber-300 dark:hover:border-amber-600 transition-all shadow-sm hover:shadow-md group"
                    onClick={() => handleVendedorClick(vendedor.vendedor)}
                  >
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      <div className="flex items-center justify-center h-7 w-7 rounded-full bg-gradient-to-br from-amber-400 to-orange-500 text-white text-xs font-bold shadow-sm">
                        {index + 1}
                      </div>
                      <span className="text-sm font-medium text-foreground truncate group-hover:text-amber-700 dark:group-hover:text-amber-400 transition-colors">
                        {vendedor.vendedor}
                      </span>
                    </div>
                    <div className="flex items-center gap-4 ml-2">
                      <div className="flex flex-col items-end">
                        <div className="flex items-center gap-1.5">
                          <span className="text-sm font-bold text-amber-600 dark:text-amber-400">{vendedor.count}</span>
                          <span className="text-xs text-muted-foreground">
                            ({vendedor.percentual.toFixed(1)}%)
                          </span>
                        </div>
                        <span className="text-xs text-muted-foreground font-medium">
                          {formatCurrency(vendedor.valor)}
                        </span>
                      </div>
                      <ChevronRight className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <p className="text-sm">Nenhum orçamento em aberto</p>
                </div>
              )}
            </div>
          </ScrollArea>
        </CardContent>
      </Card>

      {/* Dialog para exibir detalhes do vendedor selecionado */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              Orçamentos de {selectedVendedor}
            </DialogTitle>
          </DialogHeader>

          <ScrollArea className="max-h-[70vh]">
            {selectedVendedor && (() => {
              const groupedData = getGroupedOrcamentosPorVendedor(selectedVendedor);
              const totalValor = Object.values(groupedData).reduce((sum, items) => sum + items.reduce((itemSum, item) => itemSum + (item.valor || 0), 0), 0);
              const totalPedidos = Object.keys(groupedData).length;

              return (
                <div className="space-y-4">
                  {/* Resumo */}
                  <div className="flex justify-between items-center p-4 bg-muted rounded-lg">
                    <div>
                      <p className="text-sm font-medium">Total de Pedidos</p>
                      <p className="text-2xl font-bold">{totalPedidos}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-medium">Valor Total</p>
                      <p className="text-2xl font-bold text-primary">{formatCurrencyDetailed(totalValor)}</p>
                    </div>
                  </div>

                  {/* Tabela agrupada */}
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-[50px]"></TableHead>
                        <TableHead>Pedido</TableHead>
                        <TableHead>Cliente</TableHead>
                        <TableHead>Data</TableHead>
                        <TableHead>Situação</TableHead>
                        <TableHead className="text-right">Itens</TableHead>
                        <TableHead className="text-right">Valor Total</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {Object.entries(groupedData).map(([pedidoNumber, items]) => {
                        const isExpanded = expandedPedidos.has(pedidoNumber);
                        const totalItems = items.length;
                        const totalValorPedido = items.reduce((sum, item) => sum + (item.valor || 0), 0);
                        const firstItem = items[0];

                        return (
                          <React.Fragment key={pedidoNumber}>
                            {/* Linha do pedido */}
                            <TableRow 
                              className="cursor-pointer hover:bg-muted/50"
                              onClick={() => togglePedido(pedidoNumber)}
                            >
                              <TableCell>
                                {isExpanded ? (
                                  <ChevronDown className="h-4 w-4" />
                                ) : (
                                  <ChevronRight className="h-4 w-4" />
                                )}
                              </TableCell>
                              <TableCell className="font-medium">{pedidoNumber}</TableCell>
                              <TableCell>{firstItem.cli_nomefantasia || firstItem.cliente || '-'}</TableCell>
                              <TableCell>{formatDate(getDateForItem(firstItem) || firstItem.data_emissao)}</TableCell>
                              <TableCell>{firstItem.situacao}</TableCell>
                              <TableCell className="text-right">{totalItems}</TableCell>
                              <TableCell className="text-right font-medium">{formatCurrencyDetailed(totalValorPedido)}</TableCell>
                            </TableRow>

                            {/* Linhas expandidas dos itens */}
                            {isExpanded && items.map((item, idx) => (
                              <TableRow key={`${pedidoNumber}-${idx}`} className="bg-muted/30">
                                <TableCell></TableCell>
                                <TableCell className="pl-8 text-sm text-muted-foreground">{item.numeroorcamento}</TableCell>
                                <TableCell className="text-sm">{item.material || '-'}</TableCell>
                                <TableCell className="text-sm">{formatDate(getDateForItem(item) || item.data_emissao)}</TableCell>
                                <TableCell className="text-sm">{item.classe || '-'}</TableCell>
                                <TableCell className="text-right text-sm">{item.quantidade || '-'}</TableCell>
                                <TableCell className="text-right text-sm">{formatCurrencyDetailed(item.valor || 0)}</TableCell>
                              </TableRow>
                            ))}
                          </React.Fragment>
                        );
                      })}
                    </TableBody>
                  </Table>
                </div>
              );
            })()}
          </ScrollArea>
        </DialogContent>
      </Dialog>
    </>
  );
}
