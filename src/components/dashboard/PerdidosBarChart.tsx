import React from 'react';
import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Tooltip, Cell, CartesianGrid, LabelList } from 'recharts';

interface ChartDataItem {
  name: string;
  value: number;
  valor: number;
  pedidos: number;
  clientes: number;
  peso: number;
}

interface PerdidosBarChartProps {
  data: ChartDataItem[];
  height?: number;
}

export function PerdidosBarChart({ data, height = 176 }: PerdidosBarChartProps) {
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(value);
  };

  const formatWeight = (value: number) => {
    return `${Math.round(value / 1000)} t`;
  };

  const formatLabel = (value: number) => {
    if (value >= 1000000) {
      return `${(value / 1000000).toFixed(1)}M`;
    }
    if (value >= 1000) {
      return `${(value / 1000).toFixed(0)}K`;
    }
    return value.toString();
  };

  return (
    <div style={{ height }}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data}>
          <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
          <XAxis 
            dataKey="name" 
            tick={{ fontSize: 8 }}
            interval={0}
            angle={-45}
            textAnchor="end"
            height={80}
          />
          <YAxis 
            tick={{ fontSize: 10 }}
            tickFormatter={formatLabel}
            domain={[0, (dataMax) => dataMax * 1.1]}
          />
          <Tooltip 
            formatter={(value: number, name: string, props: any) => {
              if (name === 'valor') {
                return [formatCurrency(value), 'Valor Perdido'];
              }
              return [value, name];
            }}
            labelFormatter={(label: string) => label}
            content={({ active, payload, label }) => {
              if (active && payload && payload.length) {
                const data = payload[0].payload;
                return (
                  <div className="bg-background border border-border rounded-lg p-3 shadow-lg">
                    <p className="font-medium text-sm mb-2">{label}</p>
                    <div className="space-y-1 text-xs">
                      <p className="text-destructive font-medium">
                        Valor: {formatCurrency(data.valor)}
                      </p>
                      <p className="text-muted-foreground">
                        Nº Pedidos: {data.pedidos}
                      </p>
                      <p className="text-muted-foreground">
                        Nº Clientes: {data.clientes}
                      </p>
                      <p className="text-muted-foreground">
                        Peso: {formatWeight(data.peso)}
                      </p>
                    </div>
                  </div>
                );
              }
              return null;
            }}
          />
          <Bar 
            dataKey="valor" 
            fill="hsl(var(--destructive))"
            radius={[2, 2, 0, 0]}
          >
            <LabelList 
              dataKey="valor" 
              position="top" 
              formatter={formatLabel}
              fontSize={9}
              fill="hsl(var(--foreground))"
            />
            {data.map((entry, index) => (
              <Cell 
                key={`cell-${index}`} 
                fill="hsl(var(--destructive))" 
              />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}