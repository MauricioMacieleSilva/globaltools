import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { RotateCcw } from 'lucide-react';

interface DevolucaoCardProps {
  valor: number;
  peso: number;
  numClientes: number;
  onClick?: () => void;
}

export function DevolucaoCard({ valor, peso, numClientes, onClick }: DevolucaoCardProps) {
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(value);
  };

  return (
    <Card 
      className="p-4 cursor-pointer transition-colors hover:bg-accent/50" 
      onClick={onClick}
    >
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 px-0 pt-0">
        <CardTitle className="text-sm font-medium text-orange-600">Devoluções</CardTitle>
        <RotateCcw className="h-4 w-4 text-orange-600" />
      </CardHeader>
      <CardContent className="px-0 pb-0">
        <div className="text-2xl font-bold">{formatCurrency(valor)}</div>
        <p className="text-xs text-muted-foreground mt-1">
          Clique para ver detalhes
        </p>
      </CardContent>
    </Card>
  );
}