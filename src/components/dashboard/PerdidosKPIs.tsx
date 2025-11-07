import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { TrendingDown, Users, Package, DollarSign } from 'lucide-react';
import { useComercial } from '@/context/ComercialContext';

export function PerdidosKPIs() {
  const { filteredData, isLoading } = useComercial();

  // Calcular KPIs baseado nos dados já filtrados pelo contexto
  const kpisPerdidos = React.useMemo(() => {
    const dadosFiltrados = filteredData.filter(item => item.situacao === 'Perdido');

    const valor = dadosFiltrados.reduce((acc, item) => acc + item.valor, 0);
    const peso = dadosFiltrados.reduce((acc, item) => acc + (item.peso || 0), 0);
    const numPedidos = dadosFiltrados.length;
    const numClientes = new Set(dadosFiltrados.map(item => item.cliente)).size;

    return {
      valor,
      peso,
      numPedidos,
      numClientes
    };
  }, [filteredData]);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value);
  };

  const formatNumber = (value: number) => {
    return new Intl.NumberFormat('pt-BR').format(value);
  };

  const formatWeight = (value: number) => {
    return `${Math.round(value)} t`;
  };

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, index) => (
          <Card key={index} className="animate-pulse">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <div className="h-4 bg-muted rounded w-24"></div>
              <div className="h-4 w-4 bg-muted rounded"></div>
            </CardHeader>
            <CardContent>
              <div className="h-8 bg-muted rounded w-32 mb-2"></div>
              <div className="h-3 bg-muted rounded w-20"></div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      <Card className="bg-destructive/5 border-destructive/20">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium text-destructive">
            Valor Total Perdido
          </CardTitle>
          <DollarSign className="h-4 w-4 text-destructive" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-destructive">
            {formatCurrency(kpisPerdidos.valor)}
          </div>
        </CardContent>
      </Card>

      <Card className="bg-destructive/5 border-destructive/20">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium text-destructive">
            Pedidos Perdidos
          </CardTitle>
          <Package className="h-4 w-4 text-destructive" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-destructive">
            {formatNumber(kpisPerdidos.numPedidos)}
          </div>
        </CardContent>
      </Card>

      <Card className="bg-destructive/5 border-destructive/20">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium text-destructive">
            Clientes Perdidos
          </CardTitle>
          <Users className="h-4 w-4 text-destructive" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-destructive">
            {formatNumber(kpisPerdidos.numClientes)}
          </div>
        </CardContent>
      </Card>

      <Card className="bg-destructive/5 border-destructive/20">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium text-destructive">
            Peso Perdido
          </CardTitle>
          <TrendingDown className="h-4 w-4 text-destructive" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-destructive">
            {formatWeight(kpisPerdidos.peso)}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}