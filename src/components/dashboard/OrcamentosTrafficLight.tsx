import React, { useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ScrollArea } from '@/components/ui/scroll-area';
import { ChevronDown, ChevronRight } from 'lucide-react';
import { useComercial } from '@/context/ComercialContext';
import { differenceInDays } from 'date-fns';
import { parseDate } from '@/lib/utils-comercial';

export function OrcamentosTrafficLight() {
  const { data, isLoading } = useComercial();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<'verde' | 'amarelo' | 'vermelho' | 'indefinido' | null>(null);
  const [expandedPedidos, setExpandedPedidos] = useState<Set<string>>(new Set());

  // Função para agrupar orçamentos por categoria - definir antes do useMemo
  const getGroupedOrcamentosPorCategoria = (categoria: 'verde' | 'amarelo' | 'vermelho' | 'indefinido') => {
    console.log(`Filtrando orçamentos para categoria: ${categoria}`);
    
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
      
      return ['Orçamento', 'Pedido'].includes(item.situacao);
    });
    console.log(`Total orçamentos abertos: ${orcamentosAbertos.length}`);
    
    // Processar TODOS os orçamentos e pedidos e filtrar por categoria
    const orcamentosFiltrados = orcamentosAbertos.filter(item => {
      // Lógica condicional: Orçamento usa data_pedido_pronto, Pedido usa data_inicio
      const dataParaTentar = item.situacao === 'Orçamento' ? item.data_pedido_pronto : item.data_inicio;
      const dataFallback = dataParaTentar || item.data_emissao;
      
      if (!dataFallback || dataFallback === 'Invalid Date' || dataFallback === '') {
        return categoria === 'verde'; // Sem data vai para "Até 3 dias"
      }

      const dataOrçamento = parseDate(dataFallback);

      if (!dataOrçamento) {
        return categoria === 'verde'; // Sem data vai para "Até 3 dias"
      }

      const hoje = new Date();
      const diasDesdeOrcamento = differenceInDays(hoje, dataOrçamento);

      switch (categoria) {
        case 'verde':
          return diasDesdeOrcamento >= 0 && diasDesdeOrcamento <= 3;
        case 'amarelo':
          return diasDesdeOrcamento >= 4 && diasDesdeOrcamento <= 6;
        case 'vermelho':
          return diasDesdeOrcamento >= 7;
        case 'indefinido':
          return false; // Categoria removida
        default:
          return false;
      }
    });

    // Agrupar por pedido para a estrutura igual ao OrcamentoDialog
    const groups: Record<string, any[]> = {};
    orcamentosFiltrados.forEach(item => {
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
        return dataB - dataA; // Mais novo primeiro
      })
      .forEach(([key, items]) => {
        sortedGroups[key] = items;
      });

    return sortedGroups;
  };

  const trafficLightData = useMemo(() => {
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
      
      return ['Orçamento', 'Pedido'].includes(item.situacao);
    });
    const hoje = new Date();

    // Primeiro, categorizar todos os orçamentos por cliente
    const clientesCategorias: Record<string, Array<{categoria: string, valor: number, dias: number}>> = {};
    
    orcamentosAbertos.forEach(item => {
      let categoria = 'indefinido';
      let dias = -1;
      
      // Lógica condicional: Orçamento usa data_pedido_pronto, Pedido usa data_inicio
      const dataParaUsar = item.situacao === 'Orçamento' ? item.data_pedido_pronto : item.data_inicio;
      
      if (dataParaUsar && dataParaUsar !== 'Invalid Date' && dataParaUsar !== '') {
        const dataOrçamento = parseDate(dataParaUsar);
        
        if (dataOrçamento) {
          dias = differenceInDays(hoje, dataOrçamento);
          
          if (dias >= 0 && dias <= 3) {
            categoria = 'verde';
          } else if (dias >= 4 && dias <= 6) {
            categoria = 'amarelo';
          } else if (dias >= 7) {
            categoria = 'vermelho';
          }
        } else {
          categoria = 'verde'; // Sem data vai para "Até 3 dias"
        }
      } else {
        categoria = 'verde'; // Sem data vai para "Até 3 dias"
      }
      
      if (!clientesCategorias[item.codigocliente]) {
        clientesCategorias[item.codigocliente] = [];
      }
      
      clientesCategorias[item.codigocliente].push({
        categoria,
        valor: item.valor || 0,
        dias
      });
    });

    // Debug: log clientes por categoria antes da priorização
    console.log('DEBUG - Clientes por categoria antes da priorização:');
    const clientesPorCategoriaOriginal = {
      verde: new Set<string>(),
      amarelo: new Set<string>(),
      vermelho: new Set<string>(),
      indefinido: new Set<string>()
    };
    
    Object.entries(clientesCategorias).forEach(([cliente, categorias]) => {
      categorias.forEach(cat => {
        if (cat.categoria === 'verde') clientesPorCategoriaOriginal.verde.add(cliente);
        if (cat.categoria === 'amarelo') clientesPorCategoriaOriginal.amarelo.add(cliente);
        if (cat.categoria === 'vermelho') clientesPorCategoriaOriginal.vermelho.add(cliente);
        if (cat.categoria === 'indefinido') clientesPorCategoriaOriginal.indefinido.add(cliente);
      });
    });
    
    console.log('Verde:', clientesPorCategoriaOriginal.verde.size);
    console.log('Amarelo:', clientesPorCategoriaOriginal.amarelo.size);
    console.log('Vermelho:', clientesPorCategoriaOriginal.vermelho.size);
    console.log('Indefinido:', clientesPorCategoriaOriginal.indefinido.size);
    console.log('Soma original:', clientesPorCategoriaOriginal.verde.size + clientesPorCategoriaOriginal.amarelo.size + clientesPorCategoriaOriginal.vermelho.size + clientesPorCategoriaOriginal.indefinido.size);

    // Agora aplicar lógica de priorização: vermelho > amarelo > verde > indefinido
    const clientesPorCategoria = {
      verde: new Set<string>(),
      amarelo: new Set<string>(),
      vermelho: new Set<string>(),
      indefinido: new Set<string>()
    };

    const categorizados = {
      verde: { count: 0, valor: 0 },
      amarelo: { count: 0, valor: 0 },
      vermelho: { count: 0, valor: 0 },
      indefinido: { count: 0, valor: 0 }
    };

    // Para cada cliente, determinar sua categoria prioritária
    Object.entries(clientesCategorias).forEach(([cliente, categorias]) => {
      // Verificar se tem vermelho (maior prioridade)
      const temVermelho = categorias.some(cat => cat.categoria === 'vermelho');
      const temAmarelo = categorias.some(cat => cat.categoria === 'amarelo');
      const temVerde = categorias.some(cat => cat.categoria === 'verde');
      const temIndefinido = categorias.some(cat => cat.categoria === 'indefinido');
      
      let categoriaPrioritaria = 'indefinido';
      
      if (temVermelho) {
        categoriaPrioritaria = 'vermelho';
      } else if (temAmarelo) {
        categoriaPrioritaria = 'amarelo';
      } else if (temVerde) {
        categoriaPrioritaria = 'verde';
      }
      
      // Adicionar cliente apenas à categoria prioritária
      clientesPorCategoria[categoriaPrioritaria as keyof typeof clientesPorCategoria].add(cliente);
      
      // Somar todos os valores do cliente na categoria prioritária
      const valorTotal = categorias
        .filter(cat => cat.categoria === categoriaPrioritaria)
        .reduce((sum, cat) => sum + cat.valor, 0);
      
      categorizados[categoriaPrioritaria as keyof typeof categorizados].valor += valorTotal;
    });

    // Contar pedidos por categoria (não clientes únicos)
    const pedidosPorCategoria = {
      verde: Object.keys(getGroupedOrcamentosPorCategoria('verde')).length,
      amarelo: Object.keys(getGroupedOrcamentosPorCategoria('amarelo')).length,
      vermelho: Object.keys(getGroupedOrcamentosPorCategoria('vermelho')).length,
      indefinido: 0 // Categoria removida
    };
    
    categorizados.verde.count = pedidosPorCategoria.verde;
    categorizados.amarelo.count = pedidosPorCategoria.amarelo;
    categorizados.vermelho.count = pedidosPorCategoria.vermelho;
    categorizados.indefinido.count = 0;

    // Debug: log resultado final
    console.log('DEBUG - Resultado após priorização:');
    console.log('Verde:', categorizados.verde.count);
    console.log('Amarelo:', categorizados.amarelo.count);
    console.log('Vermelho:', categorizados.vermelho.count);
    console.log('Indefinido:', categorizados.indefinido.count);
    console.log('Soma final:', categorizados.verde.count + categorizados.amarelo.count + categorizados.vermelho.count + categorizados.indefinido.count);

    return categorizados;
  }, [data]);

  // Calcular total simples: usar os mesmos dados filtrados
  const orcamentosSimples = data.filter(item => {
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
    
    return ['Orçamento', 'Pedido'].includes(item.situacao);
  });
  const totalOrcamentos = orcamentosSimples.length;

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
    // Aplicar a mesma lógica condicional: Orçamento usa data_pedido_pronto, Pedido usa data_inicio
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

  const handleCategoryClick = (categoria: 'verde' | 'amarelo' | 'vermelho' | 'indefinido') => {
    setSelectedCategory(categoria);
    setExpandedPedidos(new Set()); // Reset expanded state
    setDialogOpen(true);
  };

  const getCategoryTitle = (categoria: 'verde' | 'amarelo' | 'vermelho' | 'indefinido' | null, groupedData: Record<string, any[]>) => {
    switch (categoria) {
      case 'verde':
        return `Orçamentos e Pedidos - Até 3 dias`;
      case 'amarelo':
        return `Orçamentos e Pedidos - 4-6 dias`;
      case 'vermelho':
        return `Orçamentos e Pedidos - Acima de 6 dias`;
      case 'indefinido':
        return `Orçamentos e Pedidos - Sem data`;
      default:
        return `Orçamentos e Pedidos`;
    }
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
    <Card className="p-4 h-56">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 px-0 pt-0">
        <CardTitle className="text-sm font-medium text-blue-600">Orçamentos e Pedidos em Aberto</CardTitle>
      </CardHeader>
      <CardContent className="px-0 pb-0">
        <div className="flex flex-col space-y-1">
          {totalOrcamentos > 0 ? (
            <div className="space-y-1.5">
              {/* Farol Verde */}
              <div 
                className="flex items-center justify-between p-1.5 rounded-lg bg-green-50 border border-green-200 cursor-pointer hover:bg-green-100 transition-colors"
                onClick={() => handleCategoryClick('verde')}
              >
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-green-500"></div>
                  <span className="text-xs font-medium text-green-700">Até 3 dias</span>
                </div>
                <div className="flex flex-col items-end">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-green-700">{trafficLightData.verde.count}</span>
                    <span className="text-xs text-green-600">
                      ({totalOrcamentos > 0 ? ((trafficLightData.verde.count / totalOrcamentos) * 100).toFixed(1) : 0}%)
                    </span>
                  </div>
                  <span className="text-xs text-green-600 font-medium">
                    {formatCurrency(trafficLightData.verde.valor)}
                  </span>
                </div>
              </div>

              {/* Farol Amarelo */}
              <div 
                className="flex items-center justify-between p-1.5 rounded-lg bg-yellow-50 border border-yellow-200 cursor-pointer hover:bg-yellow-100 transition-colors"
                onClick={() => handleCategoryClick('amarelo')}
              >
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-yellow-500"></div>
                  <span className="text-xs font-medium text-yellow-700">4-6 dias</span>
                </div>
                <div className="flex flex-col items-end">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-yellow-700">{trafficLightData.amarelo.count}</span>
                    <span className="text-xs text-yellow-600">
                      ({totalOrcamentos > 0 ? ((trafficLightData.amarelo.count / totalOrcamentos) * 100).toFixed(1) : 0}%)
                    </span>
                  </div>
                  <span className="text-xs text-yellow-600 font-medium">
                    {formatCurrency(trafficLightData.amarelo.valor)}
                  </span>
                </div>
              </div>

              {/* Farol Vermelho */}
              <div 
                className="flex items-center justify-between p-1.5 rounded-lg bg-red-50 border border-red-200 cursor-pointer hover:bg-red-100 transition-colors"
                onClick={() => handleCategoryClick('vermelho')}
              >
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-red-500"></div>
                  <span className="text-xs font-medium text-red-700">Acima de 6 dias</span>
                </div>
                <div className="flex flex-col items-end">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-red-700">{trafficLightData.vermelho.count}</span>
                    <span className="text-xs text-red-600">
                      ({totalOrcamentos > 0 ? ((trafficLightData.vermelho.count / totalOrcamentos) * 100).toFixed(1) : 0}%)
                    </span>
                  </div>
                  <span className="text-xs text-red-600 font-medium">
                    {formatCurrency(trafficLightData.vermelho.valor)}
                  </span>
                </div>
              </div>

              {/* Farol Indefinido - só mostra se houver dados */}
              {trafficLightData.indefinido.count > 0 && (
                <div 
                  className="flex items-center justify-between p-1.5 rounded-lg bg-gray-50 border border-gray-200 cursor-pointer hover:bg-gray-100 transition-colors"
                  onClick={() => handleCategoryClick('indefinido')}
                >
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-gray-500"></div>
                    <span className="text-xs font-medium text-gray-700">Sem data</span>
                  </div>
                  <div className="flex flex-col items-end">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-gray-700">{trafficLightData.indefinido.count}</span>
                      <span className="text-xs text-gray-600">
                        ({totalOrcamentos > 0 ? ((trafficLightData.indefinido.count / totalOrcamentos) * 100).toFixed(1) : 0}%)
                      </span>
                    </div>
                    <span className="text-xs text-gray-600 font-medium">
                      {formatCurrency(trafficLightData.indefinido.valor)}
                    </span>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="flex items-center justify-center h-full">
              <p className="text-xs text-muted-foreground">Nenhum orçamento em aberto</p>
            </div>
          )}
        </div>
      </CardContent>

      {/* Dialog para mostrar detalhes com estrutura igual ao OrcamentoDialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-6xl max-h-[85vh]"> {/* Aumentado de max-w-4xl para max-w-6xl e altura de 80vh para 85vh */}
          <DialogHeader>
            <DialogTitle>{getCategoryTitle(selectedCategory, selectedCategory ? getGroupedOrcamentosPorCategoria(selectedCategory) : {})}</DialogTitle>
          </DialogHeader>
          <ScrollArea className="h-[70vh]"> {/* Aumentado de 60vh para 70vh para aproveitar o espaço extra */}
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                <TableRow>
                  <TableHead></TableHead>
                  <TableHead>Pedido</TableHead>
                  <TableHead>NF</TableHead>
                  <TableHead>Data</TableHead>
                  <TableHead>Cliente</TableHead>
                  <TableHead>UF/Cidade</TableHead>
                  <TableHead>Vendedor</TableHead>
                  <TableHead className="text-right">Valor Total</TableHead>
                  <TableHead className="text-right">Peso (kg)</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {selectedCategory && Object.entries(getGroupedOrcamentosPorCategoria(selectedCategory)).map(([pedidoNumber, items]) => {
                  const isExpanded = expandedPedidos.has(pedidoNumber);
                  const totalPedido = items.reduce((sum, item) => sum + item.valor, 0);
                  const totalPeso = items.reduce((sum, item) => sum + item.peso, 0);
                  const firstItem = items[0];
                  
                  return (
                    <React.Fragment key={pedidoNumber}>
                      <TableRow 
                        className="cursor-pointer hover:bg-muted/50" 
                        onClick={() => togglePedido(pedidoNumber)}
                      >
                        <TableCell className="w-8">
                          {isExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                        </TableCell>
                        <TableCell className="font-medium">{firstItem.numeropedido || pedidoNumber}</TableCell>
                        <TableCell>{firstItem.numeronf || '-'}</TableCell>
                        <TableCell>{formatDate(getDateForItem(firstItem))}</TableCell>
                        <TableCell className="max-w-[150px] truncate" title={firstItem.cli_nomefantasia}>
                          {firstItem.cli_nomefantasia}
                        </TableCell>
                        <TableCell>{firstItem.uf}/{firstItem.cli_cidade}</TableCell>
                        <TableCell>{firstItem.vendedor}</TableCell>
                        <TableCell className="text-right font-medium">{formatCurrencyDetailed(totalPedido)}</TableCell>
                        <TableCell className="text-right">{totalPeso.toLocaleString('pt-BR')}</TableCell>
                      </TableRow>
                      {isExpanded && items.map((item, itemIndex) => (
                        <TableRow key={`${pedidoNumber}-${itemIndex}`} className="bg-muted/20">
                          <TableCell></TableCell>
                          <TableCell colSpan={2} className="text-sm text-muted-foreground">
                            {item.descricaomat}
                          </TableCell>
                          <TableCell className="text-sm">{item.observacao || '-'}</TableCell>
                            <TableCell className="text-sm">{item.qtd} {item.un}</TableCell>
                            <TableCell className="text-sm">{formatCurrencyDetailed(item.valor_un_bruto)}</TableCell>
                            <TableCell></TableCell>
                            <TableCell className="text-right text-sm">{formatCurrencyDetailed(item.valor)}</TableCell>
                          <TableCell className="text-right text-sm">{item.peso.toLocaleString('pt-BR')}</TableCell>
                        </TableRow>
                      ))}
                    </React.Fragment>
                  );
                })}
                {selectedCategory && Object.keys(getGroupedOrcamentosPorCategoria(selectedCategory)).length === 0 && (
                  <TableRow>
                    <TableCell colSpan={9} className="text-center text-muted-foreground">
                      Nenhum orçamento nesta categoria
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
              </Table>
            </div>
          </ScrollArea>
        </DialogContent>
      </Dialog>
    </Card>
  );
}