import React from 'react';
import { Progress } from '@/components/ui/progress';
import { TemperaturaExplanation } from './TemperaturaExplanation';

interface TemperaturaStats {
  total: number;
  estrelas5: number;
  estrelas4: number;
  estrelas3: number;
  estrelas2: number;
  estrelas1: number;
  semClassificacao: number;
  valores: {
    estrelas5: number;
    estrelas4: number;
    estrelas3: number;
    estrelas2: number;
    estrelas1: number;
    semClassificacao: number;
  };
}

interface ClienteCincoEstrelas {
  cliente: string;
  valor: number;
  peso: number;
}

interface TemperaturaIndicatorVendasProps {
  stats: TemperaturaStats;
  data: any[];
  ratings: Record<string, any>;
}

export function TemperaturaIndicatorVendas({ stats, data, ratings }: TemperaturaIndicatorVendasProps) {
  const formatValue = (value: number) => {
    if (value >= 1000000) {
      return `${(value / 1000000).toLocaleString('pt-BR', { 
        minimumFractionDigits: 1, 
        maximumFractionDigits: 2 
      })}mi`;
    } else if (value >= 1000) {
      return `${Math.round(value / 1000)}k`;
    }
    return value.toString();
  };

  const temperatureItems = [
    { 
      label: "5★ Muito Forte", 
      value: stats.estrelas5, 
      valorMonetario: stats.valores?.estrelas5 || 0,
      color: "bg-green-500", 
      stars: 5 
    },
    { 
      label: "4★ Forte", 
      value: stats.estrelas4, 
      valorMonetario: stats.valores?.estrelas4 || 0,
      color: "bg-yellow-500", 
      stars: 4 
    },
    { 
      label: "3★ Mediana", 
      value: stats.estrelas3, 
      valorMonetario: stats.valores?.estrelas3 || 0,
      color: "bg-orange-500", 
      stars: 3 
    },
    { 
      label: "2★ Fraca", 
      value: stats.estrelas2, 
      valorMonetario: stats.valores?.estrelas2 || 0,
      color: "bg-red-500", 
      stars: 2 
    },
    { 
      label: "1★ Muito Fraca", 
      value: stats.estrelas1, 
      valorMonetario: stats.valores?.estrelas1 || 0,
      color: "bg-slate-500", 
      stars: 1 
    }
  ];

  // Filtrar dados apenas orçamentos antes de agrupar
  const filteredData = data.filter(item => {
    // Excluir vendedor "VENDEDOR"
    if (item.vendedor === 'VENDEDOR') return false;
    
    // Excluir cliente GLOBAL AÇO SC
    const nomeFantasia = item.cli_nomefantasia?.toUpperCase() || '';
    if (nomeFantasia.includes('GLOBAL') && nomeFantasia.includes('AÇO') && nomeFantasia.includes('SC')) {
      return false;
    }
    
    return item.situacao === "Orçamento";
  });
  
  // Agrupar dados por pedido
  const groupedByPedido: Record<string, any[]> = {};
  filteredData.forEach(item => {
    const pedidoKey = item.numeropedido || 'Sem Pedido';
    if (!groupedByPedido[pedidoKey]) {
      groupedByPedido[pedidoKey] = [];
    }
    groupedByPedido[pedidoKey].push(item);
  });

  // Filtrar pedidos com 4 e 5 estrelas e agrupar por cliente
  const clientesAltaTemperatura: Record<string, ClienteCincoEstrelas & { rating: number }> = {};
  
  Object.entries(groupedByPedido).forEach(([pedidoKey, items]) => {
    const rating = ratings[pedidoKey]?.rating;
    if (rating === 5 || rating === 4) {
      items.forEach(item => {
        const cliente = item.cliente;
        if (!clientesAltaTemperatura[cliente]) {
          clientesAltaTemperatura[cliente] = {
            cliente,
            valor: 0,
            peso: 0,
            rating
          };
        }
        clientesAltaTemperatura[cliente].valor += item.valor || 0;
        clientesAltaTemperatura[cliente].peso += item.peso || 0;
      });
    }
  });

  // Converter para array e ordenar por valor (maior primeiro)
  const listaClientesAltaTemperatura = Object.values(clientesAltaTemperatura)
    .sort((a, b) => b.valor - a.valor);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(value);
  };

  const formatPeso = (peso: number) => {
    const toneladas = peso / 1000;
    return `${toneladas.toFixed(1)}t`;
  };

  return (
    <div className="bg-card rounded-lg border p-4 space-y-3">
      <div className="flex items-center gap-2">
        <h4 className="text-sm font-medium text-muted-foreground">Temperatura dos Orçamentos e Pedidos</h4>
        <TemperaturaExplanation />
      </div>
      
      <div className="space-y-2">
        {temperatureItems.map((item) => (
          <div key={item.stars} className="flex items-center gap-3">
            <div className="flex items-center gap-2 min-w-[100px]">
              <div className={`w-3 h-3 rounded-full ${item.color}`} />
              <span className="text-xs font-medium">{item.label}</span>
            </div>
            <div className="flex-1">
              <Progress 
                value={stats.total > 0 ? (item.value / stats.total) * 100 : 0} 
                className="h-2"
              />
            </div>
            <div className="min-w-[60px] text-right">
              <span className="text-xs font-medium">
                {item.value} | {formatValue(item.valorMonetario)}
              </span>
            </div>
          </div>
        ))}
      </div>
      
      <div className="text-xs text-muted-foreground pt-1">
        Total de Orçamentos e Pedidos: {stats.total}
      </div>

      {/* Lista de Clientes com Alta Temperatura (4 e 5 Estrelas) */}
      {listaClientesAltaTemperatura.length > 0 && (
        <div className="mt-4 pt-3 border-t">
          <h5 className="text-sm font-medium text-muted-foreground mb-2">Aguardando Fechamento</h5>
          <div className="space-y-1 max-h-32 overflow-y-auto">
            {listaClientesAltaTemperatura.map((cliente, index) => (
              <div key={cliente.cliente} className="flex items-center justify-between text-xs py-1">
                <div className="flex items-center gap-2">
                  <div className={`w-2 h-2 rounded-full ${cliente.rating === 5 ? 'bg-green-500' : 'bg-yellow-500'}`} />
                  <span className="font-medium truncate max-w-[140px]" title={cliente.cliente}>
                    {index + 1}. {cliente.cliente}
                  </span>
                </div>
                <div className="flex items-center gap-2 text-right">
                  <span className="font-medium text-green-600">
                    {formatCurrency(cliente.valor)}
                  </span>
                  <span className="text-muted-foreground">•</span>
                  <span className="text-muted-foreground">
                    {formatPeso(cliente.peso)}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}