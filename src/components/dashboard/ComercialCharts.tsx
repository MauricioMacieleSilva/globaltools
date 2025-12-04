import React, { useMemo, useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LabelList, ReferenceLine, Cell } from 'recharts';
import { useComercial } from '@/context/ComercialContext';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isValid, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { parseDate } from '@/lib/utils-comercial';
import { Settings, Trophy } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { MetasDialog } from './MetasDialog';

// Force rebuild - component positions swapped
export function ComercialCharts() {
  const { filteredData, isLoading, drillDown, setDrillDown, setFilters, metas, setMetas } = useComercial();
  const [isMetasDialogOpen, setIsMetasDialogOpen] = useState(false);

  const saveMetas = (newMetas: { metaMensal: number; metaDiaria: number }) => {
    setMetas(newMetas);
  };

  const faturamentoTemporalData = useMemo(() => {
    // Incluir pedidos "Pedido" junto com "Emitida" no faturamento
    const dadosFaturados = filteredData.filter(
      item => (item.situacao === 'Emitida' || item.situacao === 'Pedido') && item.faturamento_tipo === 1
    );

    const metaAtual = drillDown.isMonthView ? metas.metaMensal : metas.metaDiaria;

    if (drillDown.isMonthView) {
      // Visualização mensal
      const agrupado = dadosFaturados.reduce((acc, item) => {
        const data = parseDate(item.data_emissao);
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
          color: data.valor >= metaAtual ? '#10b981' : 'hsl(var(--primary))'
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

      const agrupado = dadosFaturados.reduce((acc, item) => {
        let data = parseDate(item.data_emissao);
        
        // Se é pedido sem data de emissão, usar último dia do mês atual
        if (item.situacao === 'Pedido' && !item.data_emissao) {
          const lastDay = endOfMonth(new Date(year, month));
          data = lastDay;
        }
        
        if (data && data.getMonth() === month && data.getFullYear() === year) {
          const dia = format(data, 'dd');
          if (!acc[dia]) {
            acc[dia] = { 
              valor: 0, 
              pedidos: new Set<string>(), 
              clientes: new Set<string>(), 
              peso: 0,
              detalhesMap: new Map<string, {numeropedido: string, cliente: string, valor: number}>()
            };
          }
          acc[dia].valor += item.valor;
          acc[dia].pedidos.add(item.numeropedido);
          acc[dia].clientes.add(item.cliente);
          acc[dia].peso += item.peso || 0;
          
          // Agregar por número do pedido para evitar duplicatas
          const existing = acc[dia].detalhesMap.get(item.numeropedido);
          if (existing) {
            existing.valor += item.valor;
          } else {
            acc[dia].detalhesMap.set(item.numeropedido, {
              numeropedido: item.numeropedido,
              cliente: item.cliente,
              valor: item.valor
            });
          }
        }
        return acc;
      }, {} as Record<string, { valor: number; pedidos: Set<string>; clientes: Set<string>; peso: number; detalhesMap: Map<string, {numeropedido: string, cliente: string, valor: number}> }>);

      return allDays.map(day => {
        const dia = format(day, 'dd');
        const data = agrupado[dia];
        if (!data) {
          return { 
            periodo: dia, 
            valor: 0,
            pedidos: 0,
            clientes: 0,
            peso: 0,
            detalhes: [],
            color: 'hsl(var(--primary))'
          };
        }
        return { 
          periodo: dia, 
          valor: data.valor,
          pedidos: data.pedidos.size,
          clientes: data.clientes.size,
          peso: data.peso,
          detalhes: Array.from(data.detalhesMap.values()),
          color: data.valor >= metaAtual ? '#10b981' : 'hsl(var(--primary))'
        };
      });
    }
  }, [filteredData, drillDown, metas]);

  const faturamentoUFData = useMemo(() => {
    const dadosFaturados = filteredData.filter(
      item => (item.situacao === 'Emitida' || item.situacao === 'Pedido') && item.faturamento_tipo === 1
    );

    const agrupado = dadosFaturados.reduce((acc, item) => {
      if (!acc[item.uf]) {
        acc[item.uf] = { valor: 0, pedidos: 0, clientes: new Set(), peso: 0 };
      }
      acc[item.uf].valor += item.valor;
      acc[item.uf].pedidos += 1;
      acc[item.uf].clientes.add(item.cliente);
      acc[item.uf].peso += item.peso || 0;
      return acc;
    }, {} as Record<string, { valor: number; pedidos: number; clientes: Set<string>; peso: number }>);

    return Object.entries(agrupado)
      .map(([uf, data]) => ({ 
        uf, 
        valor: data.valor, 
        pedidos: data.pedidos, 
        clientes: data.clientes.size, 
        peso: data.peso 
      }))
      .sort((a, b) => b.valor - a.valor);
  }, [filteredData]);

  const faturamentoClasseData = useMemo(() => {
    const dadosFaturados = filteredData.filter(
      item => (item.situacao === 'Emitida' || item.situacao === 'Pedido') && item.faturamento_tipo === 1
    );

    const agrupado = dadosFaturados.reduce((acc, item) => {
      if (!acc[item.classe]) {
        acc[item.classe] = { valor: 0, pedidos: 0, clientes: new Set(), peso: 0 };
      }
      acc[item.classe].valor += item.valor;
      acc[item.classe].pedidos += 1;
      acc[item.classe].clientes.add(item.cliente);
      acc[item.classe].peso += item.peso || 0;
      return acc;
    }, {} as Record<string, { valor: number; pedidos: number; clientes: Set<string>; peso: number }>);

    return Object.entries(agrupado)
      .map(([classe, data]) => ({ 
        classe, 
        valor: data.valor, 
        pedidos: data.pedidos, 
        clientes: data.clientes.size, 
        peso: data.peso 
      }))
      .sort((a, b) => b.valor - a.valor);
  }, [filteredData]);

  // Calcular ranking de vendedores
  const rankingVendedores = useMemo(() => {
    const dadosFaturados = filteredData.filter(
      item => (item.situacao === 'Emitida' || item.situacao === 'Pedido') && item.faturamento_tipo === 1 && item.vendedor !== 'VENDEDOR'
    );
    
    const vendedoresFaturamento = dadosFaturados.reduce((acc, item) => {
      // Normalizar nome do vendedor
      const nomeNormalizado = item.vendedor
        .toLowerCase()
        .split(' ')
        .map(palavra => palavra.charAt(0).toUpperCase() + palavra.slice(1))
        .join(' ');
      
      acc[nomeNormalizado] = (acc[nomeNormalizado] || 0) + item.valor;
      return acc;
    }, {} as Record<string, number>);

    return Object.entries(vendedoresFaturamento)
      .map(([vendedor, valor]) => ({ vendedor, valor }))
      .sort((a, b) => b.valor - a.valor)
      .slice(0, 5);
  }, [filteredData]);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(value);
  };

  const formatInteger = (value: number) => {
    return new Intl.NumberFormat('pt-BR').format(Math.round(value));
  };

  const handleBarClick = (data: any, index: number) => {
    if (drillDown.isMonthView && faturamentoTemporalData[index]) {
      const clickedData = faturamentoTemporalData[index];
      // Parse do período MMM/yy para extrair mês e ano
      const [mes, ano] = clickedData.periodo.split('/');
      const meses = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'];
      const mesIndex = meses.indexOf(mes.toLowerCase()) + 1;
      const anoCompleto = '20' + ano;
      
      setDrillDown({
        isMonthView: false,
        selectedMonth: mesIndex.toString().padStart(2, '0'),
        selectedYear: anoCompleto
      });
      setFilters({
        mes: mesIndex.toString().padStart(2, '0'),
        ano: anoCompleto
      });
    }
  };

  const formatLabel = (value: number) => {
    if (value >= 1000000) {
      return `${(value / 1000000).toFixed(1)}M`;
    } else if (value >= 1000) {
      return `${(value / 1000).toFixed(0)}K`;
    }
    return value.toString();
  };

  const formatLabelDaily = (value: number) => {
    if (value >= 1000000) {
      return `${(value / 1000000).toFixed(1)}M`;
    } else if (value >= 1000) {
      return `${(value / 1000).toFixed(0)}K`;
    } else if (value > 0) {
      return `${Math.round(value / 1000)}K`;
    }
    return '0';
  };

  const formatPeso = (peso: number) => {
    const toneladas = peso / 1000;
    return `${toneladas.toFixed(0)} t`;
  };

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-background border border-border rounded-lg p-3 shadow-lg">
          <p className="font-medium text-sm mb-2">{label}</p>
          <div className="space-y-1 text-xs">
            <p className="text-green-600">
              <span className="font-medium">Faturamento:</span> {formatCurrency(data.valor)}
            </p>
            <p className="text-blue-600">
              <span className="font-medium">Nº Pedidos:</span> {data.pedidos}
            </p>
            <p className="text-orange-600">
              <span className="font-medium">Nº Clientes:</span> {data.clientes}
            </p>
            <p className="text-purple-600">
              <span className="font-medium">Peso:</span> {formatPeso(data.peso)}
            </p>
          </div>
        </div>
      );
    }
    return null;
  };

  const CustomTooltipDaily = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      const detalhes = data.detalhes || [];
      
      // Agrupar por cliente com pedidos únicos
      const clientesAgrupados = detalhes.reduce((acc: Record<string, {pedidos: Set<string>, valor: number}>, item: {numeropedido: string, cliente: string, valor: number}) => {
        if (!acc[item.cliente]) {
          acc[item.cliente] = { pedidos: new Set(), valor: 0 };
        }
        acc[item.cliente].pedidos.add(item.numeropedido);
        acc[item.cliente].valor += item.valor;
        return acc;
      }, {});

      const clientesList = Object.entries(clientesAgrupados)
        .map(([cliente, info]) => ({ cliente, pedidos: Array.from((info as {pedidos: Set<string>, valor: number}).pedidos), valor: (info as {pedidos: Set<string>, valor: number}).valor }))
        .sort((a, b) => b.valor - a.valor)
        .slice(0, 5);

      const clientesRestantes = Object.keys(clientesAgrupados).length - 5;

      return (
        <div className="bg-background border border-border rounded-lg p-3 shadow-lg max-w-xs">
          <p className="font-medium text-sm mb-2">Dia {label}</p>
          <div className="space-y-1 text-xs border-b border-border pb-2 mb-2">
            <p className="text-green-600">
              <span className="font-medium">Faturamento:</span> {formatCurrency(data.valor)}
            </p>
            <p className="text-blue-600">
              <span className="font-medium">Nº Pedidos:</span> {data.pedidos}
            </p>
            <p className="text-orange-600">
              <span className="font-medium">Nº Clientes:</span> {data.clientes}
            </p>
            <p className="text-purple-600">
              <span className="font-medium">Peso:</span> {formatPeso(data.peso)}
            </p>
          </div>
          
          {clientesList.length > 0 && (
            <div className="space-y-2">
              <p className="font-medium text-xs text-muted-foreground">Detalhes por Cliente:</p>
              {clientesList.map((item, idx) => {
                const pedidosDisplay = item.pedidos.length > 3 
                  ? `${item.pedidos.slice(0, 3).join(', ')} +${item.pedidos.length - 3}`
                  : item.pedidos.join(', ');
                return (
                  <div key={idx} className="text-xs bg-muted/50 rounded p-1.5">
                    <p className="font-medium truncate text-foreground" title={item.cliente}>
                      {item.cliente.length > 25 ? item.cliente.substring(0, 25) + '...' : item.cliente}
                    </p>
                    <p className="text-muted-foreground">Pedidos: {pedidosDisplay}</p>
                    <p className="text-green-600 font-medium">{formatCurrency(item.valor)}</p>
                  </div>
                );
              })}
              {clientesRestantes > 0 && (
                <p className="text-xs text-muted-foreground italic">e mais {clientesRestantes} cliente(s)...</p>
              )}
            </div>
          )}
        </div>
      );
    }
    return null;
  };

  const handleBackToMonthView = () => {
    setDrillDown({ isMonthView: true });
  };

  if (isLoading) {
    return (
      <div className="space-y-2">
        <Card className="h-56">
          <CardHeader className="pb-2 px-3 pt-3">
            <div className="h-4 w-48 bg-muted animate-pulse rounded" />
          </CardHeader>
          <CardContent className="px-3 pb-3">
            <div className="h-44 bg-muted animate-pulse rounded" />
          </CardContent>
        </Card>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-2">
          <Card className="h-56">
            <CardHeader className="pb-2 px-3 pt-3">
              <div className="h-4 w-32 bg-muted animate-pulse rounded" />
            </CardHeader>
            <CardContent className="px-3 pb-3">
              <div className="h-44 bg-muted animate-pulse rounded" />
            </CardContent>
          </Card>
          <Card className="h-56">
            <CardHeader className="pb-2 px-3 pt-3">
              <div className="h-4 w-32 bg-muted animate-pulse rounded" />
            </CardHeader>
            <CardContent className="px-3 pb-3">
              <div className="h-44 bg-muted animate-pulse rounded" />
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {/* Gráfico de Faturamento Temporal */}
      <Card className="h-56">
        <CardHeader className="pb-2 px-3 pt-3">
          <CardTitle className="text-sm font-semibold flex items-center justify-between">
            <div className="flex items-center gap-2">
              {drillDown.isMonthView ? 'Faturamento por Período' : 'Faturamento Diário'}
              {!drillDown.isMonthView && (
                <button 
                  onClick={handleBackToMonthView}
                  className="text-xs text-primary hover:underline"
                >
                  ← Voltar
                </button>
              )}
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsMetasDialogOpen(true)}
              className="h-6 w-6 p-0"
            >
              <Settings className="h-3 w-3" />
            </Button>
          </CardTitle>
        </CardHeader>
        <CardContent className="px-3 pb-3">
          <div className="h-44">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={faturamentoTemporalData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis 
                  dataKey="periodo" 
                  tick={{ fontSize: 10 }} 
                  angle={-45}
                  textAnchor="end"
                  height={60}
                />
                <YAxis 
                  tickFormatter={formatCurrency} 
                  tick={{ fontSize: 10 }}
                  allowDecimals={false}
                  domain={[0, (dataMax: number) => {
                    const metaAtual = drillDown.isMonthView ? metas.metaMensal : metas.metaDiaria;
                    return Math.max(Math.ceil(dataMax * 1.15), Math.ceil(metaAtual * 1.1));
                  }]}
                />
                <Tooltip content={drillDown.isMonthView ? <CustomTooltip /> : <CustomTooltipDaily />} />
                <Bar 
                  dataKey="valor" 
                  fill="hsl(var(--primary))"
                  cursor={drillDown.isMonthView ? "pointer" : "default"}
                  onClick={handleBarClick}
                >
                  {faturamentoTemporalData.map((entry, index) => (
                    <Cell 
                      key={`cell-${index}`} 
                      fill={entry.color} 
                    />
                  ))}
                  <LabelList 
                    dataKey="valor" 
                    position="top" 
                    formatter={drillDown.isMonthView ? formatLabel : formatLabelDaily}
                    style={{ fontSize: '10px', fill: 'hsl(var(--foreground))' }}
                  />
                </Bar>
                <ReferenceLine 
                  y={drillDown.isMonthView ? metas.metaMensal : metas.metaDiaria} 
                  stroke="#ef4444" 
                  strokeDasharray="4 4" 
                  strokeWidth={1}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-2">
        {/* Card Ranking Vendedores */}
        <Card className="p-4 h-56">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3 px-0 pt-0">
            <CardTitle className="text-sm font-medium text-orange-600">Top 5 Vendedores</CardTitle>
            <Trophy className="h-4 w-4 text-orange-600" />
          </CardHeader>
          <CardContent className="px-0 pb-0">
            <div className="space-y-2">
              {rankingVendedores.map((item, index) => (
                <div key={item.vendedor} className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2">
                    <span className={`w-4 h-4 rounded-full flex items-center justify-center text-[10px] font-bold ${
                      index === 0 ? 'bg-yellow-500 text-white' :
                      index === 1 ? 'bg-gray-400 text-white' :
                      index === 2 ? 'bg-orange-600 text-white' :
                      'bg-muted text-muted-foreground'
                    }`}>
                      {index + 1}
                    </span>
                    <span className="font-medium truncate max-w-[100px]" title={item.vendedor}>
                      {item.vendedor}
                    </span>
                  </div>
                  <span className="font-medium">{formatCurrency(item.valor)}</span>
                </div>
              ))}
              {rankingVendedores.length === 0 && (
                <p className="text-xs text-muted-foreground">Nenhum dado disponível</p>
              )}
            </div>
          </CardContent>
        </Card>


        {/* Gráfico de Faturamento por Classe */}
        <Card className="h-56">
          <CardHeader className="pb-2 px-3 pt-3">
            <CardTitle className="text-sm font-semibold">Faturamento por Classe</CardTitle>
          </CardHeader>
          <CardContent className="px-3 pb-3">
            <div className="h-44">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={faturamentoClasseData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="classe" tick={{ fontSize: 10 }} />
                  <YAxis 
                    tickFormatter={formatCurrency} 
                    tick={{ fontSize: 10 }}
                    allowDecimals={false}
                    domain={[0, (dataMax: number) => Math.ceil(dataMax * 1.15)]}
                  />
                  <Tooltip content={<CustomTooltip />} />
                  <Bar dataKey="valor" fill="hsl(var(--primary))">
                    <LabelList 
                      dataKey="valor" 
                      position="top" 
                      formatter={formatInteger}
                      style={{ fontSize: '10px', fill: 'hsl(var(--foreground))' }}
                    />
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      <MetasDialog 
        isOpen={isMetasDialogOpen}
        onClose={() => setIsMetasDialogOpen(false)}
        onSave={saveMetas}
        metaAtual={metas}
      />
    </div>
  );
}