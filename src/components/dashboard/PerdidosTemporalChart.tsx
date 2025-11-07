import React, { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Settings, ArrowLeft } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, LabelList } from 'recharts';
import { useComercial } from '@/context/ComercialContext';
import { format, startOfMonth, endOfMonth, eachDayOfInterval } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface ChartDataItem {
  periodo: string;
  valor: number;
  pedidos: number;
  clientes: number;
  peso: number;
  color: string;
}

function parseDate(dateString: string): Date | null {
  if (!dateString) return null;
  
  try {
    if (dateString.includes('/')) {
      const [day, month, year] = dateString.split('/');
      return new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
    } else if (dateString.includes('-')) {
      return new Date(dateString);
    } else {
      const date = new Date(dateString);
      return isNaN(date.getTime()) ? null : date;
    }
  } catch {
    return null;
  }
}

export function PerdidosTemporalChart() {
  const { filteredData, drillDown, setDrillDown } = useComercial();

  const perdidosTemporalData = useMemo(() => {
    // Usar dados já filtrados pelo contexto
    const dadosPerdidos = filteredData.filter(item => item.situacao === 'Perdido');

    if (drillDown.isMonthView) {
      // Visualização mensal
      const agrupado = dadosPerdidos.reduce((acc, item) => {
        const data = parseDate(item.data_perdido || item.data_emissao);
        if (data) {
          const mesAno = format(data, 'MMM/yy', { locale: ptBR });
          if (!acc[mesAno]) {
            acc[mesAno] = { valor: 0, pedidos: 0, clientes: new Set(), peso: 0 };
          }
          acc[mesAno].valor += item.valor;
          acc[mesAno].pedidos += 1;
          acc[mesAno].clientes.add(item.cliente);
          acc[mesAno].peso += item.peso || 0;
        }
        return acc;
      }, {} as Record<string, { valor: number; pedidos: number; clientes: Set<string>; peso: number }>);

      return Object.entries(agrupado)
        .map(([periodo, data]) => ({ 
          periodo, 
          valor: data.valor,
          pedidos: data.pedidos,
          clientes: data.clientes.size,
          peso: data.peso,
          color: 'hsl(var(--destructive))'
        }))
        .sort((a, b) => {
          const dateA = new Date(a.periodo.split('/').reverse().join('-'));
          const dateB = new Date(b.periodo.split('/').reverse().join('-'));
          return dateA.getTime() - dateB.getTime();
        });
    } else {
      // Visualização diária para o mês selecionado
      if (!drillDown.selectedMonth || !drillDown.selectedYear) return [];
      
      const year = parseInt(drillDown.selectedYear);
      const month = parseInt(drillDown.selectedMonth) - 1;
      const startDate = startOfMonth(new Date(year, month));
      const endDate = endOfMonth(new Date(year, month));
      const allDays = eachDayOfInterval({ start: startDate, end: endDate });

      const agrupado = dadosPerdidos.reduce((acc, item) => {
        const data = parseDate(item.data_perdido || item.data_emissao);
        if (data && data.getMonth() === month && data.getFullYear() === year) {
          const dia = format(data, 'dd');
          if (!acc[dia]) {
            acc[dia] = { valor: 0, pedidos: 0, clientes: new Set(), peso: 0 };
          }
          acc[dia].valor += item.valor;
          acc[dia].pedidos += 1;
          acc[dia].clientes.add(item.cliente);
          acc[dia].peso += item.peso || 0;
        }
        return acc;
      }, {} as Record<string, { valor: number; pedidos: number; clientes: Set<string>; peso: number }>);

      return allDays.map(day => {
        const dia = format(day, 'dd');
        const data = agrupado[dia] || { valor: 0, pedidos: 0, clientes: new Set(), peso: 0 };
        return { 
          periodo: dia, 
          valor: data.valor,
          pedidos: data.pedidos,
          clientes: data.clientes.size,
          peso: data.peso,
          color: 'hsl(var(--destructive))'
        };
      });
    }
  }, [filteredData, drillDown]);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  const formatLabel = (value: number) => {
    if (value >= 1000000) {
      return `${(value / 1000000).toFixed(1)}M`;
    } else if (value >= 1000) {
      return `${(value / 1000).toFixed(0)}K`;
    }
    return value.toString();
  };

  const formatPeso = (peso: number) => {
    return `${(peso / 1000).toFixed(1)}t`;
  };

  const handleBarClick = (data: any) => {
    if (!drillDown.isMonthView) return;
    
    const chartData = data.payload;
    if (!chartData || !chartData.periodo) return;
    
    const [monthStr, yearStr] = chartData.periodo.split('/');
    const monthNames = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'];
    const monthIndex = monthNames.indexOf(monthStr.toLowerCase());
    
    if (monthIndex !== -1) {
      const month = (monthIndex + 1).toString().padStart(2, '0');
      const year = `20${yearStr}`;
      
      setDrillDown({
        isMonthView: false,
        selectedMonth: month,
        selectedYear: year
      });
    }
  };

  const handleBackToMonthView = () => {
    setDrillDown({
      isMonthView: true,
      selectedMonth: null,
      selectedYear: null
    });
  };

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-background border border-border rounded-lg p-3 shadow-lg">
          <p className="font-medium">{`Período: ${label}`}</p>
          <p className="text-destructive">{`Valor Perdido: ${formatCurrency(data.valor)}`}</p>
          <p className="text-muted-foreground">{`Pedidos: ${data.pedidos}`}</p>
          <p className="text-muted-foreground">{`Clientes: ${data.clientes}`}</p>
          <p className="text-muted-foreground">{`Peso: ${formatPeso(data.peso)}`}</p>
        </div>
      );
    }
    return null;
  };

  // Inicializar com visão diária do mês atual na primeira renderização
  React.useEffect(() => {
    if (drillDown.isMonthView && !drillDown.selectedMonth && !drillDown.selectedYear) {
      const now = new Date();
      const currentMonth = (now.getMonth() + 1).toString().padStart(2, '0');
      const currentYear = now.getFullYear().toString();
      
      setDrillDown({
        isMonthView: false,
        selectedMonth: currentMonth,
        selectedYear: currentYear
      });
    }
  }, []);

  const getChartTitle = () => {
    if (drillDown.isMonthView) {
      return "Perdidos por Período";
    } else {
      const monthNames = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
      const monthName = drillDown.selectedMonth ? monthNames[parseInt(drillDown.selectedMonth) - 1] : '';
      return `Perdidos Diários - ${monthName}/${drillDown.selectedYear}`;
    }
  };

  return (
    <Card className="w-full h-80">
      <CardHeader className="flex flex-row items-center justify-between">
        <div className="flex items-center gap-2">
          {!drillDown.isMonthView && (
            <Button
              variant="ghost"
              size="sm"
              onClick={handleBackToMonthView}
              className="flex items-center gap-1"
            >
              <ArrowLeft className="h-4 w-4" />
              Voltar
            </Button>
          )}
          <CardTitle className="text-destructive">
            {getChartTitle()}
          </CardTitle>
        </div>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={250}>
          <BarChart data={perdidosTemporalData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis 
              dataKey="periodo" 
              tick={{ fontSize: 12 }}
              angle={drillDown.isMonthView ? -45 : 0}
              textAnchor={drillDown.isMonthView ? 'end' : 'middle'}
              height={drillDown.isMonthView ? 60 : 30}
            />
            <YAxis 
              tickFormatter={formatLabel}
              tick={{ fontSize: 12 }}
            />
            <Tooltip content={<CustomTooltip />} />
            <Bar 
              dataKey="valor" 
              radius={[4, 4, 0, 0]}
              cursor={drillDown.isMonthView ? "pointer" : "default"}
              onClick={handleBarClick}
            >
              {perdidosTemporalData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.color} />
              ))}
              {!drillDown.isMonthView && (
                <LabelList 
                  dataKey="pedidos" 
                  position="top" 
                  style={{ fontSize: '12px', fill: 'hsl(var(--destructive))' }}
                />
              )}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}