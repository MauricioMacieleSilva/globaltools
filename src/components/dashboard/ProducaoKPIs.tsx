import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Package, Weight, CheckCircle, AlertTriangle, Calendar, Check } from 'lucide-react';
import { useProducao } from '@/context/ProducaoContext';

export function ProducaoKPIs() {
  const { totalPedidos, quantidadeTotal, noPrazo, atrasados, programar, finalizado, loading } = useProducao();

  if (loading) {
    return (
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-6">
        {[...Array(6)].map((_, i) => (
          <Card key={i}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Carregando...</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-8 bg-muted animate-pulse rounded"></div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  const formatWeight = (weight: number) => {
    if (weight >= 1000) {
      return `${(weight / 1000).toFixed(1)}t`;
    }
    return `${weight.toFixed(0)}kg`;
  };

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-6" data-tour="producao-kpis">
      {/* Total de Pedidos */}
      <Card data-tour="producao-kpi-total">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Total de Pedidos</CardTitle>
          <Package className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{totalPedidos}</div>
          <p className="text-xs text-muted-foreground">
            Pedidos em produção
          </p>
        </CardContent>
      </Card>

      {/* Quantidade Total */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Quantidade Total</CardTitle>
          <Weight className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{formatWeight(quantidadeTotal)}</div>
          <p className="text-xs text-muted-foreground">
            Peso total em produção
          </p>
        </CardContent>
      </Card>

      {/* No Prazo */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">No Prazo</CardTitle>
          <CheckCircle className="h-4 w-4 text-green-600" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-green-600">{noPrazo.count}</div>
          <p className="text-xs text-muted-foreground">
            {formatWeight(noPrazo.peso)} • {totalPedidos > 0 ? ((noPrazo.count / totalPedidos) * 100).toFixed(1) : 0}%
          </p>
        </CardContent>
      </Card>

      {/* Atrasados */}
      <Card data-tour="producao-kpi-atrasados">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Atrasados</CardTitle>
          <AlertTriangle className="h-4 w-4 text-red-600" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-red-600">{atrasados.count}</div>
          <p className="text-xs text-muted-foreground">
            {formatWeight(atrasados.peso)} • {totalPedidos > 0 ? ((atrasados.count / totalPedidos) * 100).toFixed(1) : 0}%
          </p>
        </CardContent>
      </Card>

      {/* A Programar */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">A Programar</CardTitle>
          <Calendar className="h-4 w-4 text-orange-600" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-orange-600">{programar.count}</div>
          <p className="text-xs text-muted-foreground">
            {formatWeight(programar.peso)} • {totalPedidos > 0 ? ((programar.count / totalPedidos) * 100).toFixed(1) : 0}%
          </p>
        </CardContent>
      </Card>

      {/* Finalizados */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Finalizados</CardTitle>
          <Check className="h-4 w-4 text-blue-600" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-blue-600">{finalizado.count}</div>
          <p className="text-xs text-muted-foreground">
            {formatWeight(finalizado.peso)} • {totalPedidos > 0 ? ((finalizado.count / totalPedidos) * 100).toFixed(1) : 0}%
          </p>
        </CardContent>
      </Card>
    </div>
  );
}