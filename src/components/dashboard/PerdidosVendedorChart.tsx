import React, { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useComercial, ComercialData } from '@/context/ComercialContext';
import { useExcludedOrders } from '@/hooks/useExcludedOrders';
import { Skeleton } from '@/components/ui/skeleton';
import { 
  User, 
  TrendingDown, 
  ChevronDown, 
  ChevronUp,
  Trophy,
  Medal,
  Award,
  ArrowUpDown,
  Hash,
  DollarSign,
  Tag,
  Eye
} from 'lucide-react';
import { VendedorPerdidosDialog } from './VendedorPerdidosDialog';
import { cn } from '@/lib/utils';

interface VendedorPerdidos {
  vendedor: string;
  totalPedidos: number;
  valorTotal: number;
  ticketMedio: number;
  percentualTotal: number;
  motivos: { motivo: string; count: number; valor: number }[];
  pedidos: ComercialData[];
}

type SortBy = 'valor' | 'quantidade' | 'ticket';

const MOTIVO_COLORS: Record<string, string> = {
  'Preço': 'bg-red-100 text-red-700 border-red-200 dark:bg-red-900/30 dark:text-red-400 dark:border-red-800',
  'Prazo': 'bg-amber-100 text-amber-700 border-amber-200 dark:bg-amber-900/30 dark:text-amber-400 dark:border-amber-800',
  'Concorrência': 'bg-purple-100 text-purple-700 border-purple-200 dark:bg-purple-900/30 dark:text-purple-400 dark:border-purple-800',
  'Desistência': 'bg-gray-100 text-gray-700 border-gray-200 dark:bg-gray-800/50 dark:text-gray-400 dark:border-gray-700',
  'Qualidade': 'bg-blue-100 text-blue-700 border-blue-200 dark:bg-blue-900/30 dark:text-blue-400 dark:border-blue-800',
};

const getRankingIcon = (index: number) => {
  switch (index) {
    case 0:
      return <Trophy className="h-4 w-4 text-amber-500" />;
    case 1:
      return <Medal className="h-4 w-4 text-gray-400" />;
    case 2:
      return <Award className="h-4 w-4 text-amber-700" />;
    default:
      return null;
  }
};

const getRankingBg = (index: number) => {
  switch (index) {
    case 0:
      return 'bg-gradient-to-r from-amber-500/10 to-amber-500/5 border-amber-500/20';
    case 1:
      return 'bg-gradient-to-r from-gray-400/10 to-gray-400/5 border-gray-400/20';
    case 2:
      return 'bg-gradient-to-r from-amber-700/10 to-amber-700/5 border-amber-700/20';
    default:
      return 'bg-card border-border';
  }
};

const getInitials = (name: string) => {
  return name
    .split(' ')
    .slice(0, 2)
    .map(n => n[0])
    .join('')
    .toUpperCase();
};

export const PerdidosVendedorChart = () => {
  const { filteredData, isLoading } = useComercial();
  const { isOrderExcluded } = useExcludedOrders();
  
  const [sortBy, setSortBy] = useState<SortBy>('valor');
  const [showAll, setShowAll] = useState(false);
  const [expandedVendedor, setExpandedVendedor] = useState<string | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedVendedor, setSelectedVendedor] = useState<VendedorPerdidos | null>(null);

  const INITIAL_LIMIT = 5;

  const { vendedoresData, totalGeral } = useMemo(() => {
    if (!filteredData) return { vendedoresData: [], totalGeral: 0 };

    // Filtrar apenas perdidos não excluídos
    const perdidos = filteredData.filter(item => 
      item.situacao === 'Perdido' && 
      item.perdido_motivo && 
      !isOrderExcluded(item.numeropedido)
    );

    const totalGeral = perdidos.reduce((sum, p) => sum + (p.valor || 0), 0);

    // Agrupar por vendedor
    const porVendedor: Record<string, { pedidos: ComercialData[]; motivos: Record<string, { count: number; valor: number }> }> = {};

    perdidos.forEach(item => {
      const vendedor = item.vendedor || 'Não informado';
      if (!porVendedor[vendedor]) {
        porVendedor[vendedor] = { pedidos: [], motivos: {} };
      }
      porVendedor[vendedor].pedidos.push(item);
      
      const motivo = item.perdido_motivo || 'Não informado';
      if (!porVendedor[vendedor].motivos[motivo]) {
        porVendedor[vendedor].motivos[motivo] = { count: 0, valor: 0 };
      }
      porVendedor[vendedor].motivos[motivo].count++;
      porVendedor[vendedor].motivos[motivo].valor += item.valor || 0;
    });

    // Converter para array e calcular totais
    const result: VendedorPerdidos[] = Object.entries(porVendedor).map(([vendedor, data]) => {
      const valorTotal = data.pedidos.reduce((sum, p) => sum + (p.valor || 0), 0);
      const ticketMedio = data.pedidos.length > 0 ? valorTotal / data.pedidos.length : 0;
      const percentualTotal = totalGeral > 0 ? (valorTotal / totalGeral) * 100 : 0;
      
      // Todos os motivos ordenados
      const motivosOrdenados = Object.entries(data.motivos)
        .map(([motivo, stats]) => ({ motivo, count: stats.count, valor: stats.valor }))
        .sort((a, b) => b.valor - a.valor);

      return {
        vendedor,
        totalPedidos: data.pedidos.length,
        valorTotal,
        ticketMedio,
        percentualTotal,
        motivos: motivosOrdenados,
        pedidos: data.pedidos
      };
    });

    return { vendedoresData: result, totalGeral };
  }, [filteredData, isOrderExcluded]);

  // Ordenar dados
  const sortedData = useMemo(() => {
    const sorted = [...vendedoresData];
    switch (sortBy) {
      case 'valor':
        return sorted.sort((a, b) => b.valorTotal - a.valorTotal);
      case 'quantidade':
        return sorted.sort((a, b) => b.totalPedidos - a.totalPedidos);
      case 'ticket':
        return sorted.sort((a, b) => b.ticketMedio - a.ticketMedio);
      default:
        return sorted;
    }
  }, [vendedoresData, sortBy]);

  const displayData = showAll ? sortedData : sortedData.slice(0, INITIAL_LIMIT);
  const hasMore = sortedData.length > INITIAL_LIMIT;

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(value);
  };

  const maxValor = sortedData.length > 0 ? sortedData[0].valorTotal : 1;

  const handleVendedorClick = (vendedor: VendedorPerdidos) => {
    setSelectedVendedor(vendedor);
    setDialogOpen(true);
  };

  const toggleExpand = (vendedorName: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setExpandedVendedor(prev => prev === vendedorName ? null : vendedorName);
  };

  const getMotivoColor = (motivo: string) => {
    // Tenta encontrar match parcial
    for (const [key, color] of Object.entries(MOTIVO_COLORS)) {
      if (motivo.toLowerCase().includes(key.toLowerCase())) {
        return color;
      }
    }
    return 'bg-muted/50 text-muted-foreground border-border';
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader className="pb-2">
          <Skeleton className="h-6 w-48" />
        </CardHeader>
        <CardContent className="space-y-4">
          {[1, 2, 3, 4, 5].map(i => (
            <Skeleton key={i} className="h-24 w-full" />
          ))}
        </CardContent>
      </Card>
    );
  }

  if (vendedoresData.length === 0) {
    return (
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base sm:text-lg flex items-center gap-2">
            <User className="h-4 w-4 sm:h-5 sm:w-5" />
            Perdidos por Vendedor
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground text-sm">Nenhum pedido perdido no período.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card>
        <CardHeader className="pb-2">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
            <CardTitle className="text-base sm:text-lg flex items-center gap-2">
              <User className="h-4 w-4 sm:h-5 sm:w-5" />
              Perdidos por Vendedor
            </CardTitle>
            
            {/* Botões de ordenação */}
            <div className="flex items-center gap-1">
              <Button
                variant={sortBy === 'valor' ? 'secondary' : 'ghost'}
                size="sm"
                className="h-7 px-2 text-xs"
                onClick={() => setSortBy('valor')}
              >
                <DollarSign className="h-3 w-3 mr-1" />
                Valor
              </Button>
              <Button
                variant={sortBy === 'quantidade' ? 'secondary' : 'ghost'}
                size="sm"
                className="h-7 px-2 text-xs"
                onClick={() => setSortBy('quantidade')}
              >
                <Hash className="h-3 w-3 mr-1" />
                Qtd
              </Button>
              <Button
                variant={sortBy === 'ticket' ? 'secondary' : 'ghost'}
                size="sm"
                className="h-7 px-2 text-xs"
                onClick={() => setSortBy('ticket')}
              >
                <ArrowUpDown className="h-3 w-3 mr-1" />
                Ticket
              </Button>
            </div>
          </div>
          
          {/* Total geral */}
          <p className="text-xs text-muted-foreground mt-1">
            Total perdido: <span className="font-semibold text-destructive">{formatCurrency(totalGeral)}</span>
            {' '}em {sortedData.reduce((sum, v) => sum + v.totalPedidos, 0)} pedidos
          </p>
        </CardHeader>
        
        <CardContent className="space-y-3 min-w-0">
          {displayData.map((vendedor, index) => {
            const isExpanded = expandedVendedor === vendedor.vendedor;
            const visibleMotivos = isExpanded ? vendedor.motivos : vendedor.motivos.slice(0, 3);
            const hasMoreMotivos = vendedor.motivos.length > 3;
            
            return (
              <div 
                key={vendedor.vendedor} 
                className={cn(
                  "p-3 rounded-lg border transition-all cursor-pointer hover:shadow-md min-w-0",
                  getRankingBg(index)
                )}
                onClick={() => handleVendedorClick(vendedor)}
              >
                {/* Header do vendedor */}
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-2 min-w-0">
                  <div className="flex items-center gap-2 min-w-0">
                    {/* Avatar com iniciais */}
                    <div className={cn(
                      "flex-shrink-0 flex items-center justify-center w-9 h-9 rounded-full font-medium text-sm",
                      index === 0 ? "bg-amber-500 text-white" :
                      index === 1 ? "bg-gray-400 text-white" :
                      index === 2 ? "bg-amber-700 text-white" :
                      "bg-destructive/10 text-destructive"
                    )}>
                      {index < 3 ? getRankingIcon(index) : getInitials(vendedor.vendedor)}
                    </div>
                    
                    <div className="min-w-0">
                      <span className="font-medium text-sm sm:text-base truncate block">
                        {vendedor.vendedor}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        Ticket médio: {formatCurrency(vendedor.ticketMedio)}
                      </span>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-3 text-sm flex-shrink-0">
                    <Badge variant="outline" className="bg-amber-500/10 text-amber-600 border-amber-500/20">
                      {vendedor.percentualTotal.toFixed(1)}%
                    </Badge>
                    <span className="text-muted-foreground whitespace-nowrap">
                      <TrendingDown className="h-3.5 w-3.5 inline mr-1 text-destructive" />
                      {vendedor.totalPedidos} {vendedor.totalPedidos === 1 ? 'pedido' : 'pedidos'}
                    </span>
                    <span className="font-semibold text-destructive whitespace-nowrap">
                      {formatCurrency(vendedor.valorTotal)}
                    </span>
                  </div>
                </div>

                {/* Barra de progresso com gradiente */}
                <div className="h-2 bg-muted rounded-full overflow-hidden mb-2">
                  <div 
                    className={cn(
                      "h-full rounded-full transition-all",
                      index === 0 ? "bg-gradient-to-r from-amber-500 to-amber-400" :
                      index === 1 ? "bg-gradient-to-r from-gray-400 to-gray-300" :
                      index === 2 ? "bg-gradient-to-r from-amber-700 to-amber-600" :
                      "bg-gradient-to-r from-destructive/60 to-destructive/40"
                    )}
                    style={{ width: `${(vendedor.valorTotal / maxValor) * 100}%` }}
                  />
                </div>

                {/* Motivos */}
                <div className="flex flex-wrap gap-1.5 items-center min-w-0">
                  {visibleMotivos.map(({ motivo, count, valor }) => (
                    <Badge 
                      key={motivo} 
                      variant="outline" 
                      className={cn("text-xs font-normal max-w-full", getMotivoColor(motivo))}
                      title={`${motivo}: ${count} pedidos • ${formatCurrency(valor)}`}
                    >
                      <Tag className="h-2.5 w-2.5 mr-1 flex-shrink-0" />
                      <span className="truncate">{motivo}</span>
                      <span className="ml-1 opacity-70">({count})</span>
                    </Badge>
                  ))}
                  
                  {hasMoreMotivos && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-5 px-1.5 text-xs text-muted-foreground hover:text-foreground"
                      onClick={(e) => toggleExpand(vendedor.vendedor, e)}
                    >
                      {isExpanded ? (
                        <>
                          <ChevronUp className="h-3 w-3 mr-0.5" />
                          Menos
                        </>
                      ) : (
                        <>
                          <ChevronDown className="h-3 w-3 mr-0.5" />
                          +{vendedor.motivos.length - 3}
                        </>
                      )}
                    </Button>
                  )}
                  
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-5 px-1.5 text-xs text-primary hover:text-primary/80 ml-auto"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleVendedorClick(vendedor);
                    }}
                  >
                    <Eye className="h-3 w-3 mr-0.5" />
                    Detalhes
                  </Button>
                </div>
              </div>
            );
          })}
          
          {/* Botão ver mais/menos */}
          {hasMore && (
            <Button
              variant="outline"
              size="sm"
              className="w-full mt-2"
              onClick={() => setShowAll(!showAll)}
            >
              {showAll ? (
                <>
                  <ChevronUp className="h-4 w-4 mr-1" />
                  Ver menos
                </>
              ) : (
                <>
                  <ChevronDown className="h-4 w-4 mr-1" />
                  Ver todos os {sortedData.length} vendedores
                </>
              )}
            </Button>
          )}
        </CardContent>
      </Card>

      {/* Dialog de detalhes */}
      {selectedVendedor && (
        <VendedorPerdidosDialog
          open={dialogOpen}
          onOpenChange={setDialogOpen}
          vendedor={selectedVendedor.vendedor}
          pedidos={selectedVendedor.pedidos}
          valorTotal={selectedVendedor.valorTotal}
          percentualTotal={selectedVendedor.percentualTotal}
        />
      )}
    </>
  );
};
