import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useComercial } from '@/context/ComercialContext';
import { useExcludedOrders } from '@/hooks/useExcludedOrders';
import { Skeleton } from '@/components/ui/skeleton';
import { User, TrendingDown } from 'lucide-react';

interface VendedorPerdidos {
  vendedor: string;
  totalPedidos: number;
  valorTotal: number;
  motivos: { motivo: string; count: number }[];
}

export const PerdidosVendedorChart = () => {
  const { filteredData, isLoading } = useComercial();
  const { isOrderExcluded } = useExcludedOrders();

  const vendedoresData = React.useMemo(() => {
    if (!filteredData) return [];

    // Filtrar apenas perdidos não excluídos
    const perdidos = filteredData.filter(item => 
      item.situacao === 'Perdido' && 
      item.perdido_motivo && 
      !isOrderExcluded(item.numeropedido)
    );

    // Agrupar por vendedor
    const porVendedor: Record<string, { pedidos: typeof perdidos; motivos: Record<string, number> }> = {};

    perdidos.forEach(item => {
      const vendedor = item.vendedor || 'Não informado';
      if (!porVendedor[vendedor]) {
        porVendedor[vendedor] = { pedidos: [], motivos: {} };
      }
      porVendedor[vendedor].pedidos.push(item);
      
      const motivo = item.perdido_motivo || 'Não informado';
      porVendedor[vendedor].motivos[motivo] = (porVendedor[vendedor].motivos[motivo] || 0) + 1;
    });

    // Converter para array e calcular totais
    const result: VendedorPerdidos[] = Object.entries(porVendedor).map(([vendedor, data]) => {
      const valorTotal = data.pedidos.reduce((sum, p) => sum + (p.valor || 0), 0);
      
      // Top 3 motivos
      const motivosOrdenados = Object.entries(data.motivos)
        .map(([motivo, count]) => ({ motivo, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 3);

      return {
        vendedor,
        totalPedidos: data.pedidos.length,
        valorTotal,
        motivos: motivosOrdenados
      };
    });

    // Ordenar por valor total (maior para menor)
    return result.sort((a, b) => b.valorTotal - a.valorTotal);
  }, [filteredData, isOrderExcluded]);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(value);
  };

  const maxValor = vendedoresData.length > 0 ? vendedoresData[0].valorTotal : 1;

  if (isLoading) {
    return (
      <Card>
        <CardHeader className="pb-2">
          <Skeleton className="h-6 w-48" />
        </CardHeader>
        <CardContent className="space-y-4">
          {[1, 2, 3].map(i => (
            <Skeleton key={i} className="h-20 w-full" />
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
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base sm:text-lg flex items-center gap-2">
          <User className="h-4 w-4 sm:h-5 sm:w-5" />
          Perdidos por Vendedor
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {vendedoresData.map((vendedor, index) => (
          <div 
            key={vendedor.vendedor} 
            className="p-3 rounded-lg border bg-card hover:bg-accent/5 transition-colors"
          >
            {/* Header do vendedor */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-2">
              <div className="flex items-center gap-2">
                <div className="flex items-center justify-center w-6 h-6 rounded-full bg-destructive/10 text-destructive text-xs font-medium">
                  {index + 1}
                </div>
                <span className="font-medium text-sm sm:text-base truncate max-w-[180px] sm:max-w-none">
                  {vendedor.vendedor}
                </span>
              </div>
              <div className="flex items-center gap-3 text-sm">
                <span className="text-muted-foreground">
                  <TrendingDown className="h-3.5 w-3.5 inline mr-1 text-destructive" />
                  {vendedor.totalPedidos} {vendedor.totalPedidos === 1 ? 'pedido' : 'pedidos'}
                </span>
                <span className="font-semibold text-destructive">
                  {formatCurrency(vendedor.valorTotal)}
                </span>
              </div>
            </div>

            {/* Barra de progresso relativa */}
            <div className="h-1.5 bg-muted rounded-full overflow-hidden mb-2">
              <div 
                className="h-full bg-destructive/60 rounded-full transition-all"
                style={{ width: `${(vendedor.valorTotal / maxValor) * 100}%` }}
              />
            </div>

            {/* Motivos */}
            <div className="flex flex-wrap gap-1.5">
              {vendedor.motivos.map(({ motivo, count }) => (
                <Badge 
                  key={motivo} 
                  variant="outline" 
                  className="text-xs font-normal bg-muted/50"
                >
                  {motivo} ({count})
                </Badge>
              ))}
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
};
