import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, ResponsiveContainer, Tooltip } from 'recharts';

interface BusinessTypeChartProps {
  leads: any[];
}

const COLORS = ['hsl(212 100% 47%)', 'hsl(142 76% 36%)', 'hsl(0 84% 60%)', 'hsl(45 93% 47%)', 'hsl(262 83% 58%)', 'hsl(346 84% 61%)'];

export function BusinessTypeChart({ leads }: BusinessTypeChartProps) {
  // Agregar dados por tipo de negócio
  const businessTypeData = leads.reduce((acc, lead) => {
    const businessType = lead.business_type || lead.business_type_custom;
    if (businessType && businessType !== 'Não especificado') {
      const existing = acc.find(item => item.name === businessType);
      if (existing) {
        existing.value += 1;
      } else {
        acc.push({ name: businessType, value: 1 });
      }
    }
    return acc;
  }, [] as Array<{ name: string; value: number }>);

  // Ordenar por quantidade e pegar os top 6
  const sortedData = businessTypeData
    .sort((a, b) => b.value - a.value)
    .slice(0, 6);

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0];
      return (
        <div className="bg-background border border-border rounded-lg p-2 shadow-lg">
          <p className="text-sm font-medium">{data.payload.name}</p>
          <p className="text-sm text-muted-foreground">
            {data.value} leads ({((data.value / leads.length) * 100).toFixed(1)}%)
          </p>
        </div>
      );
    }
    return null;
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg font-semibold">Tipos de Negócio</CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={sortedData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis 
              dataKey="name" 
              angle={-45}
              textAnchor="end"
              height={100}
              interval={0}
            />
            <YAxis />
            <Tooltip content={<CustomTooltip />} />
            <Bar dataKey="value" fill="hsl(var(--primary))" />
          </BarChart>
        </ResponsiveContainer>
        {sortedData.length === 0 && (
          <div className="text-center text-muted-foreground py-8">
            Nenhum dado de tipo de negócio disponível
          </div>
        )}
      </CardContent>
    </Card>
  );
}