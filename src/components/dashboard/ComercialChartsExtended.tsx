import React, { useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Tooltip, ReferenceLine, Cell } from 'recharts';
import { Settings, ArrowLeft, TrendingUp, Calendar, BarChart3 } from 'lucide-react';
import { useComercial } from '@/context/ComercialContext';
import { MetasDialog } from './MetasDialog';
import { OrcamentosTrafficLight } from './OrcamentosTrafficLight';
import { format, parseISO, isValid, addDays, startOfMonth, endOfMonth, eachDayOfInterval, getYear, getMonth, addMonths, startOfQuarter, endOfQuarter, eachMonthOfInterval } from 'date-fns';
import { ptBR } from 'date-fns/locale';

type VisualizationMode = 'daily' | 'accumulated' | 'quarterly';

export function ComercialChartsExtended() {
  const { filteredData, isLoading, drillDown, setDrillDown, setFilters, metas, setMetas } = useComercial();
  const [showMetasDialog, setShowMetasDialog] = useState(false);
  const [visualizationMode, setVisualizationMode] = useState<VisualizationMode>('daily');

  // Generate temporal data based on visualization mode
  const faturamentoTemporalData = useMemo(() => {
    const dadosFaturados = filteredData.filter(
      item => item.situacao === 'Emitida' && item.faturamento_tipo === 1
    );
    const dadosPedidos = filteredData.filter(
      item => item.situacao === 'Pedido' && item.faturamento_tipo === 1
    );

    const aggregateByKey = (data: typeof filteredData, keyFn: (item: typeof filteredData[0]) => string | null) => {
      return data.reduce((acc, item) => {
        const key = keyFn(item);
        if (!key) return acc;
        acc[key] = (acc[key] || 0) + item.valor;
        return acc;
      }, {} as Record<string, number>);
    };

    if (visualizationMode === 'quarterly') {
      const fatData = aggregateByKey(dadosFaturados, item => {
        const date = parseISO(item.data_emissao);
        if (!isValid(date)) return null;
        return `Q${Math.floor(getMonth(date) / 3) + 1}/${getYear(date)}`;
      });
      const pedData = aggregateByKey(dadosPedidos, item => {
        const date = parseISO(item.data_inicio);
        if (!isValid(date)) return null;
        return `Q${Math.floor(getMonth(date) / 3) + 1}/${getYear(date)}`;
      });

      const allKeys = new Set([...Object.keys(fatData), ...Object.keys(pedData)]);
      return Array.from(allKeys)
        .map(periodo => ({
          periodo,
          faturado: fatData[periodo] || 0,
          pedido: pedData[periodo] || 0,
          meta: metas.metaMensal * 3,
        }))
        .sort((a, b) => a.periodo.localeCompare(b.periodo));
    }

    if (drillDown.isMonthView) {
      const fatData = aggregateByKey(dadosFaturados, item => {
        const date = parseISO(item.data_emissao);
        return isValid(date) ? format(date, 'yyyy-MM') : null;
      });
      const pedData = aggregateByKey(dadosPedidos, item => {
        const date = parseISO(item.data_inicio);
        return isValid(date) ? format(date, 'yyyy-MM') : null;
      });

      const allKeys = new Set([...Object.keys(fatData), ...Object.keys(pedData)]);
      return Array.from(allKeys)
        .map(mes => ({
          periodo: format(parseISO(mes + '-01'), 'MMM/yy', { locale: ptBR }),
          faturado: fatData[mes] || 0,
          pedido: pedData[mes] || 0,
          meta: metas.metaMensal,
        }))
        .sort((a, b) => a.periodo.localeCompare(b.periodo));
    } else {
      const year = parseInt(drillDown.selectedYear || '2024');
      const month = parseInt(drillDown.selectedMonth || '01') - 1;
      const startDate = startOfMonth(new Date(year, month));
      const endDate = endOfMonth(new Date(year, month));
      const daysInMonth = eachDayOfInterval({ start: startDate, end: endDate });

      const dailyFat = aggregateByKey(dadosFaturados, item => {
        const date = parseISO(item.data_emissao);
        return isValid(date) ? format(date, 'yyyy-MM-dd') : null;
      });
      const dailyPed = aggregateByKey(dadosPedidos, item => {
        const date = parseISO(item.data_inicio);
        return isValid(date) ? format(date, 'yyyy-MM-dd') : null;
      });

      let accFat = 0;
      let accPed = 0;
      return daysInMonth.map(day => {
        const dayKey = format(day, 'yyyy-MM-dd');
        const fatValue = dailyFat[dayKey] || 0;
        const pedValue = dailyPed[dayKey] || 0;
        
        if (visualizationMode === 'accumulated') {
          accFat += fatValue;
          accPed += pedValue;
          return {
            periodo: format(day, 'dd', { locale: ptBR }),
            faturado: accFat,
            pedido: accPed,
            meta: metas.metaDiaria * parseInt(format(day, 'dd')),
          };
        }
        
        return {
          periodo: format(day, 'dd', { locale: ptBR }),
          faturado: fatValue,
          pedido: pedValue,
          meta: metas.metaDiaria,
        };
      });
    }
  }, [filteredData, drillDown, metas.metaMensal, metas.metaDiaria, visualizationMode]);

  const handleBarClick = (data: any) => {
    if (drillDown.isMonthView && data.periodo) {
      const [mes, ano] = data.periodo.split('/');
      const mesNum = new Date(`${mes} 1, 2000`).getMonth() + 1;
      const anoCompleto = `20${ano}`;
      
      setFilters({ mes: mesNum.toString().padStart(2, '0'), ano: anoCompleto });
      setDrillDown({
        isMonthView: false,
        selectedMonth: mesNum.toString().padStart(2, '0'),
        selectedYear: anoCompleto
      });
    }
  };

  const formatLabel = (value: number): string => {
    if (value >= 1000000) {
      return `${(value / 1000000).toFixed(1)}M`;
    } else if (value >= 1000) {
      return `${(value / 1000).toFixed(0)}K`;
    }
    return value.toString();
  };

  const handleBackToMonthView = () => {
    setDrillDown({ isMonthView: true });
  };

  const handleSaveMetas = (novaMetaMensal: number, novaMetaDiaria: number) => {
    setMetas({
      metaMensal: novaMetaMensal,
      metaDiaria: novaMetaDiaria
    });
  };

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {Array.from({ length: 3 }).map((_, i) => (
          <Card key={i} className="h-80">
            <CardHeader className="pb-2 px-3 pt-3">
              <div className="h-4 w-48 bg-muted animate-pulse rounded" />
            </CardHeader>
            <CardContent className="px-3 pb-3">
              <div className="h-72 bg-muted animate-pulse rounded" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Faturamento Temporal */}
        <Card className="lg:col-span-2 h-80">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 px-3 pt-3">
            <div className="flex items-center gap-2">
              <CardTitle className="text-sm font-semibold">
                {visualizationMode === 'quarterly' ? 'Faturamento Trimestral' :
                 drillDown.isMonthView ? 'Faturamento por Período' : 
                 `Faturamento ${visualizationMode === 'accumulated' ? 'Acumulado' : 'Diário'} - ${format(new Date(parseInt(drillDown.selectedYear || '2024'), parseInt(drillDown.selectedMonth || '01') - 1), 'MMMM/yyyy', { locale: ptBR })}`}
              </CardTitle>
              {!drillDown.isMonthView && (
                <Button variant="ghost" size="sm" onClick={handleBackToMonthView} className="h-6 px-2">
                  <ArrowLeft className="h-3 w-3" />
                </Button>
              )}
            </div>
            <div className="flex items-center gap-2">
              {!drillDown.isMonthView && (
                <div className="flex items-center gap-1">
                  <Button
                    variant={visualizationMode === 'daily' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setVisualizationMode('daily')}
                    className="h-6 px-2 text-xs"
                  >
                    <Calendar className="h-3 w-3 mr-1" />
                    Diário
                  </Button>
                  <Button
                    variant={visualizationMode === 'accumulated' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setVisualizationMode('accumulated')}
                    className="h-6 px-2 text-xs"
                  >
                    <TrendingUp className="h-3 w-3 mr-1" />
                    Acumulado
                  </Button>
                </div>
              )}
              {drillDown.isMonthView && (
                <Button
                  variant={visualizationMode === 'quarterly' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setVisualizationMode('quarterly')}
                  className="h-6 px-2 text-xs"
                >
                  <BarChart3 className="h-3 w-3 mr-1" />
                  Trimestral
                </Button>
              )}
              <Button variant="ghost" size="sm" onClick={() => setShowMetasDialog(true)} className="h-6 w-6 p-0">
                <Settings className="h-3 w-3" />
              </Button>
            </div>
          </CardHeader>
          <CardContent className="px-3 pb-3">
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={faturamentoTemporalData} onClick={handleBarClick}>
                  <XAxis 
                    dataKey="periodo" 
                    tick={{ fontSize: 10 }}
                    interval={0}
                    angle={-45}
                    textAnchor="end"
                    height={60}
                  />
                  <YAxis 
                    tick={{ fontSize: 10 }}
                    tickFormatter={formatLabel}
                  />
                  <Tooltip 
                    formatter={(value: number) => [
                      new Intl.NumberFormat('pt-BR', {
                        style: 'currency',
                        currency: 'BRL'
                      }).format(value),
                      'Valor'
                    ]}
                    labelStyle={{ fontSize: '12px' }}
                    contentStyle={{ fontSize: '12px' }}
                  />
                  <ReferenceLine 
                    y={drillDown.isMonthView ? metas.metaMensal : visualizationMode === 'quarterly' ? metas.metaMensal * 3 : metas.metaDiaria} 
                    stroke="#8b5cf6" 
                    strokeDasharray="5 5" 
                    strokeWidth={2}
                  />
                  <Bar 
                    dataKey="valor" 
                    fill="#3b82f6"
                    radius={[2, 2, 0, 0]}
                  >
                    {faturamentoTemporalData.map((entry, index) => (
                      <Cell 
                        key={`cell-${index}`} 
                        fill={entry.atingiuMeta ? '#10b981' : '#3b82f6'} 
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Orçamentos Traffic Light */}
        <OrcamentosTrafficLight />
      </div>

      <MetasDialog
        isOpen={showMetasDialog}
        onClose={() => setShowMetasDialog(false)}
        onSave={(metasData) => handleSaveMetas(metasData.metaMensal, metasData.metaDiaria)}
        metaAtual={{ metaMensal: metas.metaMensal, metaDiaria: metas.metaDiaria }}
      />
    </div>
  );
}