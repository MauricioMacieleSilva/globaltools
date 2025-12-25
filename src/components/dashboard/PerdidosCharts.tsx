import React, { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { PerdidosBarChart } from './PerdidosBarChart';
import { useComercial } from '@/context/ComercialContext';
import { useExcludedOrders } from '@/hooks/useExcludedOrders';

export function PerdidosCharts() {
  const { filteredData, isLoading } = useComercial();
  const { isOrderExcluded } = useExcludedOrders();

  const chartData = useMemo(() => {
    const perdidos = filteredData.filter(item => 
      item.situacao === 'Perdido' && 
      item.perdido_motivo && 
      item.perdido_motivo !== 'Não informado' &&
      !isOrderExcluded(item.numeropedido)
    );

    // Dados por motivo
    const motivoData = perdidos.reduce((acc, item) => {
      const motivo = item.perdido_motivo || 'Não informado';
      if (!acc[motivo]) {
        acc[motivo] = { 
          quantidade: 0, 
          valor: 0, 
          pedidos: new Set<string>(), 
          clientes: new Set<string>(),
          peso: 0
        };
      }
      acc[motivo].quantidade += 1;
      acc[motivo].valor += item.valor;
      acc[motivo].pedidos.add(item.numeropedido);
      acc[motivo].clientes.add(item.cliente);
      acc[motivo].peso += item.peso;
      return acc;
    }, {} as Record<string, { quantidade: number; valor: number; pedidos: Set<string>; clientes: Set<string>; peso: number }>);

    const motivoChartData = Object.entries(motivoData)
      .map(([motivo, data]) => ({
        name: motivo,
        value: data.quantidade,
        valor: data.valor,
        pedidos: data.pedidos.size,
        clientes: data.clientes.size,
        peso: data.peso
      }))
      .sort((a, b) => b.valor - a.valor)
      .slice(0, 10);

    // Dados por classe
    const classeData = perdidos.reduce((acc, item) => {
      const classe = item.classe || 'Não informado';
      if (!acc[classe]) {
        acc[classe] = { 
          quantidade: 0, 
          valor: 0, 
          pedidos: new Set<string>(), 
          clientes: new Set<string>(),
          peso: 0
        };
      }
      acc[classe].quantidade += 1;
      acc[classe].valor += item.valor;
      acc[classe].pedidos.add(item.numeropedido);
      acc[classe].clientes.add(item.cliente);
      acc[classe].peso += item.peso;
      return acc;
    }, {} as Record<string, { quantidade: number; valor: number; pedidos: Set<string>; clientes: Set<string>; peso: number }>);

    const classeChartData = Object.entries(classeData)
      .map(([classe, data]) => ({
        name: classe,
        value: data.quantidade,
        valor: data.valor,
        pedidos: data.pedidos.size,
        clientes: data.clientes.size,
        peso: data.peso
      }))
      .sort((a, b) => b.valor - a.valor);

    return {
      motivos: motivoChartData,
      classes: classeChartData
    };
  }, [filteredData, isOrderExcluded]);

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 sm:gap-4">
        {Array.from({ length: 2 }).map((_, index) => (
          <Card key={index} className="animate-pulse h-48 sm:h-72">
            <CardHeader className="p-2 sm:p-4">
              <div className="h-4 sm:h-6 bg-muted rounded w-32 sm:w-48"></div>
            </CardHeader>
            <CardContent className="p-2 sm:p-4">
              <div className="h-32 sm:h-52 bg-muted rounded"></div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 sm:gap-4">
      <Card className="h-48 sm:h-72">
        <CardHeader className="p-2 sm:p-4 pb-1 sm:pb-2">
          <CardTitle className="text-destructive text-xs sm:text-base">
            Motivos de Perda
          </CardTitle>
        </CardHeader>
        <CardContent className="p-2 sm:p-4 pt-0 overflow-hidden">
          {chartData.motivos.length > 0 ? (
            <PerdidosBarChart 
              data={chartData.motivos} 
              height={140}
            />
          ) : (
            <div className="h-32 sm:h-52 flex items-center justify-center text-muted-foreground text-xs sm:text-sm">
              Nenhum dado disponível
            </div>
          )}
        </CardContent>
      </Card>

      <Card className="h-48 sm:h-72">
        <CardHeader className="p-2 sm:p-4 pb-1 sm:pb-2">
          <CardTitle className="text-destructive text-xs sm:text-base">
            Perdidos por Classe
          </CardTitle>
        </CardHeader>
        <CardContent className="p-2 sm:p-4 pt-0 overflow-hidden">
          {chartData.classes.length > 0 ? (
            <PerdidosBarChart 
              data={chartData.classes} 
              height={140}
            />
          ) : (
            <div className="h-32 sm:h-52 flex items-center justify-center text-muted-foreground text-xs sm:text-sm">
              Nenhum dado disponível
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}