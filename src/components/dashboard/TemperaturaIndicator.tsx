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
  };
}

interface TemperaturaIndicatorProps {
  stats: TemperaturaStats;
}

export function TemperaturaIndicator({ stats }: TemperaturaIndicatorProps) {
  const getPercentage = (value: number) => {
    return stats.total > 0 ? (value / stats.total) * 100 : 0;
  };

  const formatValue = (value: number) => {
    if (value >= 1000000) {
      return (value / 1000000).toLocaleString('pt-BR', { 
        minimumFractionDigits: 2, 
        maximumFractionDigits: 2 
      }) + 'mi';
    } else if (value >= 1000) {
      return Math.round(value / 1000) + 'k';
    } else {
      return value.toLocaleString('pt-BR');
    }
  };

  const temperatureItems = [
    {
      stars: 5,
      label: "Muito Forte",
      count: stats.estrelas5,
      value: stats.valores.estrelas5,
      color: "bg-green-500",
      textColor: "text-green-600"
    },
    {
      stars: 4,
      label: "Forte",
      count: stats.estrelas4,
      value: stats.valores.estrelas4,
      color: "bg-yellow-500",
      textColor: "text-yellow-600"
    },
    {
      stars: 3,
      label: "Mediana",
      count: stats.estrelas3,
      value: stats.valores.estrelas3,
      color: "bg-orange-500",
      textColor: "text-orange-600"
    },
    {
      stars: 2,
      label: "Fraca",
      count: stats.estrelas2,
      value: stats.valores.estrelas2,
      color: "bg-red-500",
      textColor: "text-red-600"
    },
    {
      stars: 1,
      label: "Muito Fraca",
      count: stats.estrelas1,
      value: stats.valores.estrelas1,
      color: "bg-gray-800",
      textColor: "text-gray-800"
    }
  ];

  return (
    <div className="bg-card rounded-lg border p-2 sm:p-4 space-y-2 sm:space-y-3">
      <div className="flex items-center gap-1 sm:gap-2">
        <h4 className="text-xs sm:text-sm font-medium text-muted-foreground">Temperatura Orçamentos</h4>
        <TemperaturaExplanation />
      </div>
      <div className="space-y-1 sm:space-y-2">
        {temperatureItems.map((item) => (
          <div key={item.stars} className="flex items-center gap-2 sm:gap-3">
            <div className="flex items-center gap-1 sm:gap-2 min-w-[80px] sm:min-w-[120px]">
              <div className={`w-2 h-2 sm:w-3 sm:h-3 rounded-full ${item.color}`} />
              <span className="text-[9px] sm:text-xs font-medium truncate">
                {item.stars > 0 ? `${item.stars}★` : '0★'} {item.label}
              </span>
            </div>
            <div className="flex-1">
              <Progress 
                value={getPercentage(item.count)} 
                className="h-1.5 sm:h-2"
              />
            </div>
            <span className={`text-[9px] sm:text-xs font-semibold min-w-[3rem] sm:min-w-[4rem] text-right ${item.textColor}`}>
              {item.count} | {formatValue(item.value)}
            </span>
          </div>
        ))}
      </div>
      <div className="pt-1 sm:pt-2 border-t">
        <div className="flex justify-between text-[10px] sm:text-xs text-muted-foreground">
          <span>Total:</span>
          <span className="font-semibold">{stats.total}</span>
        </div>
      </div>
    </div>
  );
}