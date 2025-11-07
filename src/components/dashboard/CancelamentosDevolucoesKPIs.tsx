import React, { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { DollarSign, BarChart3, UserPlus, XCircle, RotateCcw } from 'lucide-react';
import { useComercial } from '@/context/ComercialContext';
import { CancelamentosDialog } from './CancelamentosDialog';
import { DevolucaoDialog } from './DevolucaoDialog';

export function CancelamentosDevolucoesKPIs() {
  const { kpis, filteredData } = useComercial();
  const [isCancelamentosDialogOpen, setIsCancelamentosDialogOpen] = useState(false);
  const [isDevolucaoDialogOpen, setIsDevolucaoDialogOpen] = useState(false);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(value);
  };

  const cancelamentosData = useMemo(() => 
    filteredData.filter(item => item.situacao === 'Cancelado'), 
    [filteredData]
  );

  const devolucaoData = useMemo(() => 
    filteredData.filter(item => item.situacao === 'Devolvido'), 
    [filteredData]
  );

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {/* Cancelamentos */}
      <Card 
        className="p-4 cursor-pointer transition-colors hover:bg-accent/50" 
        onClick={() => setIsCancelamentosDialogOpen(true)}
      >
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 px-0 pt-0">
          <CardTitle className="text-sm font-medium text-red-600">Cancelamentos</CardTitle>
          <XCircle className="h-4 w-4 text-red-600" />
        </CardHeader>
        <CardContent className="px-0 pb-0">
          <div className="text-2xl font-bold">{formatCurrency(kpis.cancelamentos.valor)}</div>
          <p className="text-xs text-muted-foreground mt-1">
            {kpis.cancelamentos.peso.toFixed(0)}t • {kpis.cancelamentos.numPedidos} pedidos • {kpis.cancelamentos.numClientes} clientes
          </p>
        </CardContent>
      </Card>

      {/* Devoluções */}
      <Card 
        className="p-4 cursor-pointer transition-colors hover:bg-accent/50" 
        onClick={() => setIsDevolucaoDialogOpen(true)}
      >
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 px-0 pt-0">
          <CardTitle className="text-sm font-medium text-orange-600">Devoluções</CardTitle>
          <RotateCcw className="h-4 w-4 text-orange-600" />
        </CardHeader>
        <CardContent className="px-0 pb-0">
          <div className="text-2xl font-bold">{formatCurrency(kpis.devolucoes.valor)}</div>
          <p className="text-xs text-muted-foreground mt-1">
            {kpis.devolucoes.peso.toFixed(0)}t • {kpis.devolucoes.numPedidos} pedidos • {kpis.devolucoes.numClientes} clientes
          </p>
        </CardContent>
      </Card>

      {/* Dialogs */}
      <CancelamentosDialog 
        isOpen={isCancelamentosDialogOpen}
        onClose={() => setIsCancelamentosDialogOpen(false)}
        data={cancelamentosData}
      />
      <DevolucaoDialog 
        isOpen={isDevolucaoDialogOpen}
        onClose={() => setIsDevolucaoDialogOpen(false)}
        data={devolucaoData}
      />
    </div>
  );
}