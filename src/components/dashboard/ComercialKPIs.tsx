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
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 sm:gap-3">
      {/* Card Faturamento */}
      <Card className="p-2 sm:p-3 relative">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-1.5 sm:pb-2 px-0 pt-0">
          <CardTitle className="text-xs sm:text-sm font-medium text-green-600">Faturamento</CardTitle>
          <div className="flex items-center gap-0.5">
            <DollarSign className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-green-600" />
            <Button
              variant="ghost"
              size="sm"
              onClick={(e) => {
                e.stopPropagation();
                setIsExcludedOrdersDialogOpen(true);
              }}
              className="h-5 w-5 sm:h-6 sm:w-6 p-0 text-muted-foreground hover:text-foreground opacity-60 hover:opacity-100"
              title="Gerenciar pedidos excluídos dos indicadores"
            >
              <Settings2 className="h-2.5 w-2.5 sm:h-3 sm:w-3" />
            </Button>
          </div>
        </CardHeader>
        <div className="cursor-pointer" onClick={() => setShowFaturamentoDialog(true)}>
          <CardContent className="px-0 pb-0">
            <div className="space-y-1.5 sm:space-y-2 text-xs sm:text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground text-[10px] sm:text-xs">Faturado:</span>
                <span className="font-medium text-[11px] sm:text-sm">
                  {formatCurrency(kpis.faturamento.valor)} 
                  <span className={`ml-0.5 sm:ml-1 ${((kpis.faturamento.valor / metas.metaMensal) * 100) >= 100 ? 'text-green-600' : 'text-orange-600'}`}>
                    ({((kpis.faturamento.valor / metas.metaMensal) * 100).toFixed(0)}%)
                  </span>
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground text-[10px] sm:text-xs">Peso:</span>
                <span className="font-medium text-[11px] sm:text-sm">{formatWeight(kpis.faturamento.peso)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground text-[10px] sm:text-xs">Nº Clientes:</span>
                <span className="font-medium text-[11px] sm:text-sm">{formatNumber(kpis.faturamento.numClientes)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground text-[10px] sm:text-xs">Ticket Médio:</span>
                <span className="font-medium text-[11px] sm:text-sm">{formatCurrency(kpis.faturamento.ticketMedio)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground text-[10px] sm:text-xs">R$/kg:</span>
                <span className="font-medium text-[11px] sm:text-sm">{formatReaisPorKg(kpis.faturamento.reaisPorKg)}</span>
              </div>
            </div>
          </CardContent>
        </div>
      </Card>

      {/* Card Orçamento */}
      <Card className="p-2 sm:p-3 cursor-pointer hover:shadow-md transition-shadow">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-1.5 sm:pb-2 px-0 pt-0">
          <CardTitle className="text-xs sm:text-sm font-medium text-blue-600">Orçamento</CardTitle>
          <Calculator className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-blue-600" />
        </CardHeader>
        <CardContent className="px-0 pb-0">
          <div className="space-y-1.5 sm:space-y-2 text-xs sm:text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground text-[10px] sm:text-xs">Orçado:</span>
              <span className="font-medium text-[11px] sm:text-sm">{formatCurrency(kpis.orcamento.valor)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground text-[10px] sm:text-xs">Peso:</span>
              <span className="font-medium text-[11px] sm:text-sm">{formatWeight(kpis.orcamento.peso)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground text-[10px] sm:text-xs">Nº Clientes:</span>
              <span className="font-medium text-[11px] sm:text-sm">{formatNumber(kpis.orcamento.numClientes)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground text-[10px] sm:text-xs">Ticket Médio:</span>
              <span className="font-medium text-[11px] sm:text-sm">{formatCurrency(kpis.orcamento.ticketMedio)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground text-[10px] sm:text-xs">R$/kg:</span>
              <span className="font-medium text-[11px] sm:text-sm">{formatReaisPorKg(kpis.orcamento.reaisPorKg)}</span>
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