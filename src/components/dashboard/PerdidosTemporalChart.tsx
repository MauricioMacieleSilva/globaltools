import React, { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Settings, ArrowLeft } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, LabelList } from 'recharts';
import { useComercial } from '@/context/ComercialContext';
import { format, startOfMonth, endOfMonth, eachDayOfInterval } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useExcludedOrders } from '@/hooks/useExcludedOrders';

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
  const { isOrderExcluded } = useExcludedOrders();

  const perdidosTemporalData = useMemo(() => {
    // Usar dados já filtrados pelo contexto, excluindo pedidos ocultos
    const dadosPerdidos = filteredData.filter(item => 
      item.situacao === 'Perdido' && 
      item.perdido_motivo && 
      item.perdido_motivo !== 'Não informado' &&
      !isOrderExcluded(item.numeropedido)
    );

    if (drillDown.isMonthView) {
      // Visualização mensal
      const agrupado = dadosPerdidos.reduce((acc, item) => {
        const data = parseDate(item.data_perdido || item.data_emissao);
        if (data) {
          const mesAno = format(data, 'MMM/yy', { locale: ptBR });
          if (!acc[mesAno]) {
            acc[mesAno] = { valor: 0, pedidos: new Set<string>(), clientes: new Set<string>(), peso: 0 };
          }
          acc[mesAno].valor += item.valor;
          acc[mesAno].pedidos.add(item.numeropedido);
          acc[mesAno].clientes.add(item.cliente);
          acc[mesAno].peso += item.peso || 0;
        }
        return acc;
      }, {} as Record<string, { valor: number; pedidos: Set<string>; clientes: Set<string>; peso: number }>);

      return Object.entries(agrupado)
        .map(([periodo, data]) => ({ 
          periodo, 
          valor: data.valor,
          pedidos: data.pedidos.size,
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
            acc[dia] = { valor: 0, pedidos: new Set<string>(), clientes: new Set<string>(), peso: 0 };
          }
          acc[dia].valor += item.valor;
          acc[dia].pedidos.add(item.numeropedido);
          acc[dia].clientes.add(item.cliente);
          acc[dia].peso += item.peso || 0;
        }
        return acc;
      }, {} as Record<string, { valor: number; pedidos: Set<string>; clientes: Set<string>; peso: number }>);

      return allDays.map(day => {
        const dia = format(day, 'dd');
        const data = agrupado[dia] || { valor: 0, pedidos: new Set<string>(), clientes: new Set<string>(), peso: 0 };
        return { 
          periodo: dia, 
          valor: data.valor,
          pedidos: data.pedidos.size,
          clientes: data.clientes.size,
          peso: data.peso,
          color: 'hsl(var(--destructive))'
        };
      });
    }
  }, [filteredData, drillDown, isOrderExcluded]);

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

  // Calcular largura mínima para visualização diária no mobile
  const chartMinWidth = !drillDown.isMonthView && perdidosTemporalData.length > 15 
    ? Math.max(500, perdidosTemporalData.length * 18) 
    : undefined;

  return (
    <Card className="w-full">
      <CardHeader className="flex flex-row items-center justify-between p-2 sm:p-4 pb-1 sm:pb-2">
        <div className="flex items-center gap-1 sm:gap-2">
          {!drillDown.isMonthView && (
            <Button
              variant="ghost"
              size="sm"
              onClick={handleBackToMonthView}
              className="flex items-center gap-1 h-6 sm:h-8 px-1 sm:px-2 text-xs"
            >
              <ArrowLeft className="h-3 w-3 sm:h-4 sm:w-4" />
              <span className="hidden sm:inline">Voltar</span>
            </Button>
          )}
          <CardTitle className="text-destructive text-xs sm:text-base">
            {getChartTitle()}
          </CardTitle>
        </div>
      </CardHeader>
      <CardContent className="p-1 sm:p-4 pt-0">
        <div className="overflow-x-auto">
          <div style={{ minWidth: chartMinWidth }}>
            <ResponsiveContainer width="100%" height={drillDown.isMonthView ? 120 : 140}>
              <BarChart data={perdidosTemporalData} margin={{ left: -15, right: 5, top: 15, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis 
                  dataKey="periodo" 
                  tick={{ fontSize: 8 }}
                  angle={drillDown.isMonthView ? -45 : 0}
                  textAnchor={drillDown.isMonthView ? 'end' : 'middle'}
                  height={drillDown.isMonthView ? 35 : 18}
                  interval={0}
                />
                <YAxis 
                  tickFormatter={formatLabel}
                  tick={{ fontSize: 7 }}
                  width={30}
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
                      style={{ fontSize: '7px', fill: 'hsl(var(--destructive))' }}
                    />
                  )}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}