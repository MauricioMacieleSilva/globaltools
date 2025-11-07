import React, { useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { DollarSign, Calculator, Trophy, Settings2 } from 'lucide-react';
import { useComercial } from '@/context/ComercialContext';
import { FaturamentoDialog } from './FaturamentoDialog';
import { OrcamentosTrafficLight } from './OrcamentosTrafficLight';
import { ErrorBoundary } from '../ErrorBoundary';
import { ExcludedOrdersDialog } from '@/components/admin/ExcludedOrdersDialog';
import { Button } from '@/components/ui/button';
import { useExcludedOrders } from '@/hooks/useExcludedOrders';

export function ComercialKPIs() {
  const { kpis, isLoading, filteredData, metas, data } = useComercial();
  const { refreshExcludedOrders } = useExcludedOrders();
  const [showFaturamentoDialog, setShowFaturamentoDialog] = useState(false);
  const [isExcludedOrdersDialogOpen, setIsExcludedOrdersDialogOpen] = useState(false);

  // Debug temporário
  console.log('🎯 KPIs - Meta atual:', metas.metaMensal);
  console.log('💰 KPIs - Faturamento:', kpis.faturamento.valor);
  console.log('📊 KPIs - % calculado:', ((kpis.faturamento.valor / metas.metaMensal) * 100).toFixed(1));


  // Dados para os popups - incluir pedidos "Pedido" junto com "Emitida"
  const dadosFaturamento = useMemo(() => {
    return filteredData.filter(
      item => (item.situacao === 'Emitida' || item.situacao === 'Pedido') && item.faturamento_tipo === 1
    );
  }, [filteredData]);

  const dadosOrcamento = useMemo(() => {
    // Use raw data directly without year/month filters for budget cards
    return data.filter(
      item => item.situacao === 'Orçamento'
    );
  }, [data]);


  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(value);
  };

  const formatNumber = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(value);
  };

  const formatWeight = (value: number) => {
    return `${formatNumber(value)} t`;
  };

  const formatReaisPorKg = (value: number) => {
    return `R$ ${value.toFixed(2)}/kg`;
  };

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {Array.from({ length: 3 }).map((_, i) => (
          <Card key={i} className="p-4">
            <div className="flex items-center justify-between mb-3">
              <div className="h-4 w-24 bg-muted animate-pulse rounded" />
              <div className="h-4 w-4 bg-muted animate-pulse rounded" />
            </div>
            <div className="space-y-2">
              {Array.from({ length: 5 }).map((_, j) => (
                <div key={j} className="flex justify-between">
                  <div className="h-3 w-16 bg-muted animate-pulse rounded" />
                  <div className="h-3 w-20 bg-muted animate-pulse rounded" />
                </div>
              ))}
            </div>
          </Card>
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
      {/* Card Faturamento */}
      <Card className="p-3 sm:p-4 relative">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 sm:pb-3 px-0 pt-0">
          <CardTitle className="text-sm font-medium text-green-600">Faturamento</CardTitle>
          <div className="flex items-center gap-1">
            <DollarSign className="h-4 w-4 text-green-600" />
            <Button
              variant="ghost"
              size="sm"
              onClick={(e) => {
                e.stopPropagation();
                setIsExcludedOrdersDialogOpen(true);
              }}
              className="h-6 w-6 p-0 text-muted-foreground hover:text-foreground opacity-60 hover:opacity-100"
              title="Gerenciar pedidos excluídos dos indicadores"
            >
              <Settings2 className="h-3 w-3" />
            </Button>
          </div>
        </CardHeader>
        <div className="cursor-pointer" onClick={() => setShowFaturamentoDialog(true)}>
          <CardContent className="px-0 pb-0">
            <div className="space-y-3 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Faturado:</span>
                <span className="font-medium">
                  {formatCurrency(kpis.faturamento.valor)} 
                  <span className={`ml-1 ${((kpis.faturamento.valor / metas.metaMensal) * 100) >= 100 ? 'text-green-600' : 'text-orange-600'}`}>
                    ({((kpis.faturamento.valor / metas.metaMensal) * 100).toFixed(1)}%)
                  </span>
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Peso:</span>
                <span className="font-medium">{formatWeight(kpis.faturamento.peso)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Nº Clientes:</span>
                <span className="font-medium">{formatNumber(kpis.faturamento.numClientes)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Ticket Médio:</span>
                <span className="font-medium">{formatCurrency(kpis.faturamento.ticketMedio)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">R$/kg:</span>
                <span className="font-medium">{formatReaisPorKg(kpis.faturamento.reaisPorKg)}</span>
              </div>
            </div>
          </CardContent>
        </div>
      </Card>

      {/* Card Orçamento */}
      <Card className="p-3 sm:p-4 cursor-pointer hover:shadow-md transition-shadow">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 sm:pb-3 px-0 pt-0">
          <CardTitle className="text-sm font-medium text-blue-600">Orçamento</CardTitle>
          <Calculator className="h-4 w-4 text-blue-600" />
        </CardHeader>
        <CardContent className="px-0 pb-0">
          <div className="space-y-3 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Orçado:</span>
              <span className="font-medium">{formatCurrency(kpis.orcamento.valor)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Peso:</span>
              <span className="font-medium">{formatWeight(kpis.orcamento.peso)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Nº Clientes:</span>
              <span className="font-medium">{formatNumber(kpis.orcamento.numClientes)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Ticket Médio:</span>
              <span className="font-medium">{formatCurrency(kpis.orcamento.ticketMedio)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">R$/kg:</span>
              <span className="font-medium">{formatReaisPorKg(kpis.orcamento.reaisPorKg)}</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Orçamentos em Aberto - Farol */}
      <OrcamentosTrafficLight />

      {/* Dialogs */}
      <ErrorBoundary>
        <FaturamentoDialog 
          isOpen={showFaturamentoDialog}
          onClose={() => setShowFaturamentoDialog(false)}
          data={dadosFaturamento}
        />
      </ErrorBoundary>

      <ExcludedOrdersDialog
        isOpen={isExcludedOrdersDialogOpen}
        onClose={() => {
          setIsExcludedOrdersDialogOpen(false);
          refreshExcludedOrders(); // Atualizar a lista quando fechar o dialog
        }}
      />
    </div>
  );
}