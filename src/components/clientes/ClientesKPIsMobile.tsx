import React from 'react';
import { Card, CardContent } from '@/components/ui/card';

interface ClientesKPIsMobileProps {
  total: number;
  ativos: number;
  inativos: number;
  faturamentoTotal: number;
  ticketMedioGeral: number;
}

// Formatar moeda de forma compacta para mobile
function formatCurrencyCompact(value: number): string {
  if (value >= 1_000_000_000) {
    return `R$ ${(value / 1_000_000_000).toFixed(1)}B`;
  }
  if (value >= 1_000_000) {
    return `R$ ${(value / 1_000_000).toFixed(1)}M`;
  }
  if (value >= 1_000) {
    return `R$ ${(value / 1_000).toFixed(1)}K`;
  }
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL'
  }).format(value);
}

export function ClientesKPIsMobile({
  total,
  ativos,
  inativos,
  faturamentoTotal,
  ticketMedioGeral
}: ClientesKPIsMobileProps) {
  return (
    <div className="grid grid-cols-2 gap-2">
      {/* Total Clientes */}
      <Card className="p-3">
        <p className="text-[10px] text-muted-foreground">Total Clientes</p>
        <p className="text-xl font-bold">{total}</p>
      </Card>

      {/* Ativos */}
      <Card className="p-3">
        <p className="text-[10px] text-muted-foreground">Ativos</p>
        <p className="text-xl font-bold text-green-600">{ativos}</p>
      </Card>

      {/* Inativos */}
      <Card className="p-3">
        <p className="text-[10px] text-muted-foreground">Inativos</p>
        <p className="text-xl font-bold text-red-600">{inativos}</p>
      </Card>

      {/* Faturamento */}
      <Card className="p-3">
        <p className="text-[10px] text-muted-foreground">Faturamento</p>
        <p className="text-base font-bold">{formatCurrencyCompact(faturamentoTotal)}</p>
      </Card>

      {/* Ticket Médio - ocupa largura total */}
      <Card className="p-3 col-span-2">
        <p className="text-[10px] text-muted-foreground">Ticket Médio</p>
        <p className="text-base font-bold">{formatCurrencyCompact(ticketMedioGeral)}</p>
      </Card>
    </div>
  );
}
