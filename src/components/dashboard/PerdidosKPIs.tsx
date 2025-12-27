import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { TrendingDown, Users, Package, DollarSign } from 'lucide-react';
import { useComercial } from '@/context/ComercialContext';
import { useExcludedOrders } from '@/hooks/useExcludedOrders';

export function PerdidosKPIs() {
  const { filteredData, isLoading } = useComercial();
  const { isOrderExcluded } = useExcludedOrders();

  // Calcular KPIs baseado nos dados já filtrados pelo contexto, excluindo pedidos ocultos
  const kpisPerdidos = React.useMemo(() => {
    const dadosFiltrados = filteredData.filter(item => 
      item.situacao === 'Perdido' && 
      item.perdido_motivo && 
      item.perdido_motivo !== 'Não informado' &&
      !isOrderExcluded(item.numeropedido)
    );

    const valor = dadosFiltrados.reduce((acc, item) => acc + item.valor, 0);
    const peso = dadosFiltrados.reduce((acc, item) => acc + (item.peso || 0), 0);
    const numPedidos = new Set(
      dadosFiltrados
        .map(item => item.numeropedido)
        .filter(Boolean)
    ).size;
    const numClientes = new Set(dadosFiltrados.map(item => item.cliente)).size;

    return {
      valor,
      peso,
      numPedidos,
      numClientes
    };
  }, [filteredData, isOrderExcluded]);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  const formatNumber = (value: number) => {
    return new Intl.NumberFormat('pt-BR').format(value);
  };

  const formatWeight = (value: number) => {
    return `${Math.round(value / 1000)} t`;
  };

  if (isLoading) {
    return (
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-4">
        {Array.from({ length: 4 }).map((_, index) => (
          <Card key={index} className="animate-pulse p-2 sm:p-4">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-1 sm:pb-2 p-0">
              <div className="h-3 sm:h-4 bg-muted rounded w-16 sm:w-24"></div>
              <div className="h-3 w-3 sm:h-4 sm:w-4 bg-muted rounded"></div>
            </CardHeader>
            <CardContent className="p-0 pt-1 sm:pt-2">
              <div className="h-5 sm:h-8 bg-muted rounded w-20 sm:w-32"></div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-4">
      <Card className="bg-destructive/5 border-destructive/20 p-2 sm:p-4">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-1 sm:pb-2 p-0">
          <CardTitle className="text-[10px] sm:text-sm font-medium text-destructive">
            Valor Perdido
          </CardTitle>
          <DollarSign className="h-3 w-3 sm:h-4 sm:w-4 text-destructive" />
        </CardHeader>
        <CardContent className="p-0 pt-1 sm:pt-2">
          <div className="text-sm sm:text-2xl font-bold text-destructive">
            {formatCurrency(kpisPerdidos.valor)}
          </div>
        </CardContent>
      </Card>

      <Card className="bg-destructive/5 border-destructive/20 p-2 sm:p-4">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-1 sm:pb-2 p-0">
          <CardTitle className="text-[10px] sm:text-sm font-medium text-destructive">
            Pedidos
          </CardTitle>
          <Package className="h-3 w-3 sm:h-4 sm:w-4 text-destructive" />
        </CardHeader>
        <CardContent className="p-0 pt-1 sm:pt-2">
          <div className="text-sm sm:text-2xl font-bold text-destructive">
            {formatNumber(kpisPerdidos.numPedidos)}
          </div>
        </CardContent>
      </Card>

      <Card className="bg-destructive/5 border-destructive/20 p-2 sm:p-4">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-1 sm:pb-2 p-0">
          <CardTitle className="text-[10px] sm:text-sm font-medium text-destructive">
            Clientes
          </CardTitle>
          <Users className="h-3 w-3 sm:h-4 sm:w-4 text-destructive" />
        </CardHeader>
        <CardContent className="p-0 pt-1 sm:pt-2">
          <div className="text-sm sm:text-2xl font-bold text-destructive">
            {formatNumber(kpisPerdidos.numClientes)}
          </div>
        </CardContent>
      </Card>

      <Card className="bg-destructive/5 border-destructive/20 p-2 sm:p-4">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-1 sm:pb-2 p-0">
          <CardTitle className="text-[10px] sm:text-sm font-medium text-destructive">
            Peso
          </CardTitle>
          <TrendingDown className="h-3 w-3 sm:h-4 sm:w-4 text-destructive" />
        </CardHeader>
        <CardContent className="p-0 pt-1 sm:pt-2">
          <div className="text-sm sm:text-2xl font-bold text-destructive">
            {formatWeight(kpisPerdidos.peso)}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}