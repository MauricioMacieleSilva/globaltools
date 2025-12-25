import React, { useMemo, useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LabelList, ReferenceLine, Cell } from 'recharts';
import { useComercial } from '@/context/ComercialContext';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isValid, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { parseDate } from '@/lib/utils-comercial';
import { Settings, Trophy, Camera, Package, Users, TrendingUp, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { MetasDialog } from './MetasDialog';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { supabase } from '@/integrations/supabase/client';
import { VendorAvatarDialog } from './VendorAvatarDialog';
import { HoverCard, HoverCardContent, HoverCardTrigger } from '@/components/ui/hover-card';
import { ScrollArea } from '@/components/ui/scroll-area';

// Force rebuild - component positions swapped
export function ComercialCharts() {
  const { filteredData, isLoading, drillDown, setDrillDown, setFilters, metas, setMetas } = useComercial();
  const [isMetasDialogOpen, setIsMetasDialogOpen] = useState(false);
  const [vendedorAvatars, setVendedorAvatars] = useState<Record<string, string>>({});
  const [selectedVendor, setSelectedVendor] = useState<{ name: string; avatarUrl?: string } | null>(null);
  const [pinnedTooltip, setPinnedTooltip] = useState<{ data: any; position: { x: number; y: number } } | null>(null);
  

  // Carregar avatares dos vendedores (user_profiles + vendor_avatars)
  const loadVendorAvatars = useCallback(async () => {
    const avatarMap: Record<string, string> = {};

    // Buscar da tabela vendor_avatars (prioridade)
    const { data: vendorAvatars } = await supabase
      .from('vendor_avatars')
      .select('vendor_name, avatar_url')
      .not('avatar_url', 'is', null);
    
    if (vendorAvatars) {
      vendorAvatars.forEach(vendor => {
        if (vendor.avatar_url) {
          avatarMap[vendor.vendor_name] = vendor.avatar_url;
        }
      });
    }

    // Buscar da tabela user_profiles (fallback)
    const { data: profiles } = await supabase
      .from('user_profiles')
      .select('full_name, avatar_url')
      .not('avatar_url', 'is', null);
    
    if (profiles) {
      profiles.forEach(profile => {
        const nomeNormalizado = profile.full_name
          .toLowerCase()
          .split(' ')
          .map((palavra: string) => palavra.charAt(0).toUpperCase() + palavra.slice(1))
          .join(' ');
        // Só adiciona se não existir já (vendor_avatars tem prioridade)
        if (profile.avatar_url && !avatarMap[nomeNormalizado]) {
          avatarMap[nomeNormalizado] = profile.avatar_url;
        }
      });
    }

    setVendedorAvatars(avatarMap);
  }, []);

  useEffect(() => {
    loadVendorAvatars();
  }, [loadVendorAvatars]);


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

  // Calcular ranking de vendedores com detalhes completos
  const rankingVendedores = useMemo(() => {
    const dadosFaturados = filteredData.filter(
      item => (item.situacao === 'Emitida' || item.situacao === 'Pedido') && item.faturamento_tipo === 1 && item.vendedor !== 'VENDEDOR'
    );
    
    const vendedoresData = dadosFaturados.reduce((acc, item) => {
      // Normalizar nome do vendedor
      const nomeNormalizado = item.vendedor
        .toLowerCase()
        .split(' ')
        .map(palavra => palavra.charAt(0).toUpperCase() + palavra.slice(1))
        .join(' ');
      
      if (!acc[nomeNormalizado]) {
        acc[nomeNormalizado] = {
          valor: 0,
          pedidos: new Set<string>(),
          clientes: new Set<string>(),
          vendas: [] as Array<{ cliente: string; numeroPedido: string; valor: number; data: string }>
        };
      }
      
      acc[nomeNormalizado].valor += item.valor;
      acc[nomeNormalizado].pedidos.add(item.numeropedido);
      acc[nomeNormalizado].clientes.add(item.cliente);
      acc[nomeNormalizado].vendas.push({
        cliente: item.cliente,
        numeroPedido: item.numeropedido,
        valor: item.valor,
        data: item.data_emissao
      });
      
      return acc;
    }, {} as Record<string, { valor: number; pedidos: Set<string>; clientes: Set<string>; vendas: Array<{ cliente: string; numeroPedido: string; valor: number; data: string }> }>);

    return Object.entries(vendedoresData)
      .map(([vendedor, data]) => {
        // Agrupar vendas por número do pedido para evitar duplicatas e contar clientes únicos
        const vendasAgrupadas = data.vendas.reduce((acc, venda) => {
          if (!acc[venda.numeroPedido]) {
            acc[venda.numeroPedido] = {
              cliente: venda.cliente,
              numeroPedido: venda.numeroPedido,
              valor: 0,
              data: venda.data
            };
          }
          acc[venda.numeroPedido].valor += venda.valor;
          // Manter a data mais recente
          if (new Date(venda.data).getTime() > new Date(acc[venda.numeroPedido].data).getTime()) {
            acc[venda.numeroPedido].data = venda.data;
          }
          return acc;
        }, {} as Record<string, { cliente: string; numeroPedido: string; valor: number; data: string }>);

        const vendasLista = Object.values(vendasAgrupadas);
        const ultimasVendas = vendasLista
          .sort((a, b) => new Date(b.data).getTime() - new Date(a.data).getTime())
          .slice(0, 5);

        // Contar clientes únicos nas vendas agrupadas (para consistência com tooltip)
        const clientesUnicos = new Set(vendasLista.map(v => v.cliente));

        return { 
          vendedor, 
          valor: data.valor,
          totalPedidos: vendasLista.length, // Total de pedidos únicos
          totalClientes: clientesUnicos.size, // Total de clientes únicos
          ultimasVendas
        };
      })
      .sort((a, b) => b.valor - a.valor)
      .slice(0, 5);
  }, [filteredData]);

  // Função para obter estilos do avatar baseado na posição
  const getAvatarRingStyle = (index: number) => {
    switch (index) {
      case 0: // Ouro
        return 'ring-4 ring-yellow-400 shadow-lg shadow-yellow-400/40';
      case 1: // Prata
        return 'ring-3 ring-gray-300 shadow-md shadow-gray-300/30';
      case 2: // Bronze
        return 'ring-3 ring-orange-400 shadow-md shadow-orange-400/30';
      default:
        return 'ring-2 ring-muted';
    }
  };

  // Função para obter cor do badge de posição
  const getPositionBadgeStyle = (index: number) => {
    switch (index) {
      case 0:
        return 'bg-yellow-500 text-white';
      case 1:
        return 'bg-gray-400 text-white';
      case 2:
        return 'bg-orange-500 text-white';
      default:
        return 'bg-muted text-muted-foreground';
    }
  };

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(part => part[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

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

  const handleBarClick = (data: any, index: number, event?: any) => {
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
    } else if (!drillDown.isMonthView && data) {
      // Na visão diária, fixar o tooltip
      const rect = event?.target?.getBoundingClientRect?.();
      setPinnedTooltip({
        data: data,
        position: {
          x: rect ? rect.left + rect.width / 2 : 0,
          y: rect ? rect.top : 0
        }
      });
    }
  };

  const closePinnedTooltip = () => {
    setPinnedTooltip(null);
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
        <div 
          className="bg-background border border-border rounded-lg shadow-xl w-72 max-h-80 flex flex-col pointer-events-auto"
          style={{ zIndex: 9999 }}
        >
          <div className="p-3 border-b border-border flex-shrink-0">
            <p className="font-medium text-sm mb-2">Dia {label}</p>
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
          
          {clientesList.length > 0 && (
            <div className="flex-1 overflow-y-auto p-3">
              <p className="font-medium text-xs text-muted-foreground mb-2">Detalhes por Cliente:</p>
              <div className="space-y-2">
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
              </div>
              {clientesRestantes > 0 && (
                <p className="text-xs text-muted-foreground italic mt-2">e mais {clientesRestantes} cliente(s)...</p>
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
        <Card className="h-48 sm:h-56">
          <CardHeader className="pb-2 px-2 sm:px-3 pt-2 sm:pt-3">
            <div className="h-4 w-32 sm:w-48 bg-muted animate-pulse rounded" />
          </CardHeader>
          <CardContent className="px-2 sm:px-3 pb-2 sm:pb-3">
            <div className="h-36 sm:h-44 bg-muted animate-pulse rounded" />
          </CardContent>
        </Card>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          <Card className="h-48 sm:h-56">
            <CardHeader className="pb-2 px-2 sm:px-3 pt-2 sm:pt-3">
              <div className="h-4 w-24 sm:w-32 bg-muted animate-pulse rounded" />
            </CardHeader>
            <CardContent className="px-2 sm:px-3 pb-2 sm:pb-3">
              <div className="h-36 sm:h-44 bg-muted animate-pulse rounded" />
            </CardContent>
          </Card>
          <Card className="h-48 sm:h-56">
            <CardHeader className="pb-2 px-2 sm:px-3 pt-2 sm:pt-3">
              <div className="h-4 w-24 sm:w-32 bg-muted animate-pulse rounded" />
            </CardHeader>
            <CardContent className="px-2 sm:px-3 pb-2 sm:pb-3">
              <div className="h-36 sm:h-44 bg-muted animate-pulse rounded" />
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {/* Gráfico de Faturamento Temporal */}
      <Card className="h-48 sm:h-56">
        <CardHeader className="pb-1 sm:pb-2 px-2 sm:px-3 pt-2 sm:pt-3">
          <CardTitle className="text-xs sm:text-sm font-semibold flex items-center justify-between">
            <div className="flex items-center gap-1 sm:gap-2">
              <span className="truncate">{drillDown.isMonthView ? 'Faturamento/Período' : 'Fat. Diário'}</span>
              {!drillDown.isMonthView && (
                <button 
                  onClick={handleBackToMonthView}
                  className="text-[10px] sm:text-xs text-primary hover:underline flex-shrink-0"
                >
                  ← Voltar
                </button>
              )}
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsMetasDialogOpen(true)}
              className="h-5 w-5 sm:h-6 sm:w-6 p-0"
            >
              <Settings className="h-2.5 w-2.5 sm:h-3 sm:w-3" />
            </Button>
          </CardTitle>
        </CardHeader>
        <CardContent className="px-1 sm:px-3 pb-2 sm:pb-3">
          <div className="h-36 sm:h-44">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={faturamentoTemporalData} margin={{ left: -10, right: 5, top: 5, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis 
                  dataKey="periodo" 
                  tick={{ fontSize: 8 }} 
                  angle={-45}
                  textAnchor="end"
                  height={40}
                  interval={0}
                />
                <YAxis 
                  tickFormatter={formatLabel} 
                  tick={{ fontSize: 8 }}
                  allowDecimals={false}
                  width={35}
                  domain={[0, (dataMax: number) => {
                    const metaAtual = drillDown.isMonthView ? metas.metaMensal : metas.metaDiaria;
                    return Math.max(Math.ceil(dataMax * 1.15), Math.ceil(metaAtual * 1.1));
                  }]}
                />
                {/* Tooltip só no hover para visão mensal - na visão diária usa apenas o clique */}
                {drillDown.isMonthView && (
                  <Tooltip 
                    content={<CustomTooltip />}
                    wrapperStyle={{ zIndex: 9999 }}
                  />
                )}
                <Bar 
                  dataKey="valor" 
                  fill="hsl(var(--primary))"
                  cursor="pointer"
                  onClick={(data, index, event) => handleBarClick(data, index, event)}
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
                    style={{ fontSize: '8px', fill: 'hsl(var(--foreground))' }}
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
          
          {/* Tooltip Fixo */}
          {pinnedTooltip && !drillDown.isMonthView && (
            <div 
              className="fixed bg-background border border-border rounded-lg shadow-2xl w-80 flex flex-col"
              style={{ 
                zIndex: 10000,
                left: Math.min(pinnedTooltip.position.x, window.innerWidth - 340),
                top: Math.max(pinnedTooltip.position.y - 200, 10),
                maxHeight: 'calc(100vh - 40px)'
              }}
            >
              <div className="p-3 border-b border-border flex-shrink-0 flex items-center justify-between">
                <div>
                  <p className="font-medium text-sm mb-2">Dia {pinnedTooltip.data.periodo}</p>
                  <div className="space-y-1 text-xs">
                    <p className="text-green-600">
                      <span className="font-medium">Faturamento:</span> {formatCurrency(pinnedTooltip.data.valor)}
                    </p>
                    <p className="text-blue-600">
                      <span className="font-medium">Nº Pedidos:</span> {pinnedTooltip.data.pedidos}
                    </p>
                    <p className="text-orange-600">
                      <span className="font-medium">Nº Clientes:</span> {pinnedTooltip.data.clientes}
                    </p>
                    <p className="text-purple-600">
                      <span className="font-medium">Peso:</span> {formatPeso(pinnedTooltip.data.peso)}
                    </p>
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={closePinnedTooltip}
                  className="h-6 w-6 p-0 flex-shrink-0"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
              
              {pinnedTooltip.data.detalhes && pinnedTooltip.data.detalhes.length > 0 && (
                <ScrollArea className="flex-1" style={{ maxHeight: '300px' }}>
                  <div className="p-3">
                    <p className="font-medium text-xs text-muted-foreground mb-2">Detalhes por Cliente:</p>
                    <div className="space-y-2">
                      {(() => {
                        const clientesAgrupados = pinnedTooltip.data.detalhes.reduce((acc: Record<string, {pedidos: Set<string>, valor: number}>, item: {numeropedido: string, cliente: string, valor: number}) => {
                          if (!acc[item.cliente]) {
                            acc[item.cliente] = { pedidos: new Set(), valor: 0 };
                          }
                          acc[item.cliente].pedidos.add(item.numeropedido);
                          acc[item.cliente].valor += item.valor;
                          return acc;
                        }, {});

                        const clientesList = Object.entries(clientesAgrupados)
                          .map(([cliente, info]) => ({ cliente, pedidos: Array.from((info as {pedidos: Set<string>, valor: number}).pedidos), valor: (info as {pedidos: Set<string>, valor: number}).valor }))
                          .sort((a, b) => b.valor - a.valor);

                        return clientesList.map((item, idx) => {
                          const pedidosDisplay = item.pedidos.length > 3 
                            ? `${item.pedidos.slice(0, 3).join(', ')} +${item.pedidos.length - 3}`
                            : item.pedidos.join(', ');
                          return (
                            <div key={idx} className="text-xs bg-muted/50 rounded p-1.5">
                              <p className="font-medium truncate text-foreground" title={item.cliente}>
                                {item.cliente.length > 30 ? item.cliente.substring(0, 30) + '...' : item.cliente}
                              </p>
                              <p className="text-muted-foreground">Pedidos: {pedidosDisplay}</p>
                              <p className="text-green-600 font-medium">{formatCurrency(item.valor)}</p>
                            </div>
                          );
                        });
                      })()}
                    </div>
                  </div>
                </ScrollArea>
              )}
            </div>
          )}
        </CardContent>
      </Card>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {/* Card Ranking Vendedores - Redesenhado */}
          <Card className="p-2 sm:p-4 h-48 sm:h-56 flex flex-col">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-1 sm:pb-2 px-0 pt-0 flex-shrink-0">
              <CardTitle className="text-xs sm:text-sm font-medium text-orange-600 flex items-center gap-1 sm:gap-2">
                <Trophy className="h-3 w-3 sm:h-4 sm:w-4" />
                Top 5 Vendedores
              </CardTitle>
            </CardHeader>
            <CardContent className="px-0 pb-0 overflow-hidden flex-1 min-h-0">
              <ScrollArea className="h-full min-h-0">
              <div className="space-y-1 sm:space-y-1.5 pr-1 sm:pr-2">
                {rankingVendedores.map((item, index) => (
                  <HoverCard key={item.vendedor} openDelay={200} closeDelay={300}>
                    <HoverCardTrigger asChild>
                      <div 
                        className="flex items-center justify-between p-1 sm:p-1.5 rounded-lg hover:bg-muted/50 transition-all cursor-pointer group"
                      >
                        <div className="flex items-center gap-1.5 sm:gap-3">
                          {/* Avatar com borda colorida e badge de posição */}
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedVendor({ 
                                name: item.vendedor, 
                                avatarUrl: vendedorAvatars[item.vendedor] 
                              });
                            }}
                            className="relative"
                            title="Clique para adicionar/alterar foto"
                          >
                            <Avatar className={`h-7 w-7 sm:h-10 sm:w-10 flex-shrink-0 transition-all ${getAvatarRingStyle(index)} group-hover:scale-105`}>
                              <AvatarImage src={vendedorAvatars[item.vendedor]} alt={item.vendedor} className="object-cover" />
                              <AvatarFallback className="text-[9px] sm:text-xs bg-primary/10 text-primary font-semibold">
                                {getInitials(item.vendedor)}
                              </AvatarFallback>
                            </Avatar>
                            {/* Badge de posição no canto */}
                            <span className={`absolute -bottom-0.5 -right-0.5 w-3 h-3 sm:w-4 sm:h-4 rounded-full flex items-center justify-center text-[7px] sm:text-[9px] font-bold ${getPositionBadgeStyle(index)} shadow-sm`}>
                              {index + 1}
                            </span>
                            {/* Ícone de câmera no hover - hidden on mobile */}
                            <div className="absolute inset-0 hidden sm:flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity bg-black/30 rounded-full">
                              <Camera className="h-4 w-4 text-white" />
                            </div>
                          </button>
                          
                          {/* Nome do vendedor */}
                          <div className="flex flex-col min-w-0">
                            <span className="font-medium text-[10px] sm:text-sm truncate max-w-[60px] sm:max-w-[100px]" title={item.vendedor}>
                              {item.vendedor}
                            </span>
                            <span className="text-[8px] sm:text-[10px] text-muted-foreground">
                              {item.totalPedidos} ped. • {item.totalClientes} cli.
                            </span>
                          </div>
                        </div>
                        
                        {/* Valor total */}
                        <span className="font-semibold text-[10px] sm:text-sm text-green-600">
                          {formatCurrency(item.valor)}
                        </span>
                      </div>
                    </HoverCardTrigger>
                    
                    {/* HoverCard com detalhes das vendas - permite interação */}
                    <HoverCardContent side="right" align="start" className="w-80 p-0 overflow-hidden z-50">
                      <div className="bg-background border-0">
                        {/* Cabeçalho do tooltip */}
                        <div className="bg-gradient-to-r from-blue-600 to-blue-700 px-4 py-3 text-white">
                          <div className="flex items-center gap-3">
                            <Avatar className="h-12 w-12 ring-2 ring-white/30">
                              <AvatarImage src={vendedorAvatars[item.vendedor]} alt={item.vendedor} />
                              <AvatarFallback className="text-sm bg-white/20 text-white">
                                {getInitials(item.vendedor)}
                              </AvatarFallback>
                            </Avatar>
                            <div>
                              <p className="font-semibold text-base">{item.vendedor}</p>
                              <p className="text-white/80 text-xs">
                                {index === 0 ? '🥇 1º lugar' : index === 1 ? '🥈 2º lugar' : index === 2 ? '🥉 3º lugar' : `${index + 1}º lugar`}
                              </p>
                            </div>
                          </div>
                        </div>
                        
                        {/* Estatísticas */}
                        <div className="grid grid-cols-3 gap-2 p-3 border-b bg-muted/30">
                          <div className="text-center">
                            <TrendingUp className="h-4 w-4 mx-auto text-green-600 mb-1" />
                            <p className="text-xs text-muted-foreground">Total</p>
                            <p className="font-semibold text-sm text-green-600">{formatCurrency(item.valor)}</p>
                          </div>
                          <div className="text-center">
                            <Package className="h-4 w-4 mx-auto text-blue-600 mb-1" />
                            <p className="text-xs text-muted-foreground">Pedidos</p>
                            <p className="font-semibold text-sm">{item.totalPedidos}</p>
                          </div>
                          <div className="text-center">
                            <Users className="h-4 w-4 mx-auto text-purple-600 mb-1" />
                            <p className="text-xs text-muted-foreground">Clientes</p>
                            <p className="font-semibold text-sm">{item.totalClientes}</p>
                          </div>
                        </div>
                        
                        {/* Últimas vendas */}
                        <div className="p-3">
                          <p className="text-xs font-medium text-muted-foreground mb-2">Últimas vendas</p>
                          <div className="space-y-1.5 max-h-32 overflow-y-auto">
                            {item.ultimasVendas.map((venda, idx) => (
                              <div key={idx} className="flex items-center justify-between text-xs bg-muted/50 rounded px-2 py-1.5">
                                <div className="min-w-0 flex-1 mr-2">
                                  <p className="font-medium truncate" title={venda.cliente}>
                                    {venda.cliente.length > 20 ? venda.cliente.substring(0, 20) + '...' : venda.cliente}
                                  </p>
                                  <p className="text-muted-foreground text-[10px]">
                                    Pedido: {venda.numeroPedido}
                                  </p>
                                </div>
                                <span className="text-green-600 font-medium whitespace-nowrap">
                                  {formatCurrency(venda.valor)}
                                </span>
                              </div>
                            ))}
                            {item.ultimasVendas.length === 0 && (
                              <p className="text-xs text-muted-foreground italic">Sem vendas registradas</p>
                            )}
                          </div>
                        </div>
                      </div>
                    </HoverCardContent>
                  </HoverCard>
                ))}
                {rankingVendedores.length === 0 && (
                  <p className="text-xs text-muted-foreground text-center py-4">Nenhum dado disponível</p>
                )}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>


        {/* Gráfico de Faturamento por Classe */}
        <Card className="h-48 sm:h-56">
          <CardHeader className="pb-1 sm:pb-2 px-2 sm:px-3 pt-2 sm:pt-3">
            <CardTitle className="text-xs sm:text-sm font-semibold">Fat. por Classe</CardTitle>
          </CardHeader>
          <CardContent className="px-1 sm:px-3 pb-2 sm:pb-3">
            <div className="h-36 sm:h-44">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={faturamentoClasseData} margin={{ left: -10, right: 5, top: 5, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="classe" tick={{ fontSize: 8 }} />
                  <YAxis 
                    tickFormatter={formatLabel} 
                    tick={{ fontSize: 8 }}
                    allowDecimals={false}
                    width={35}
                    domain={[0, (dataMax: number) => Math.ceil(dataMax * 1.15)]}
                  />
                  <Tooltip content={<CustomTooltip />} />
                  <Bar dataKey="valor" fill="hsl(var(--primary))">
                    <LabelList 
                      dataKey="valor" 
                      position="top" 
                      formatter={formatLabel}
                      style={{ fontSize: '8px', fill: 'hsl(var(--foreground))' }}
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

      {selectedVendor && (
        <VendorAvatarDialog
          isOpen={!!selectedVendor}
          onClose={() => setSelectedVendor(null)}
          vendorName={selectedVendor.name}
          currentAvatarUrl={selectedVendor.avatarUrl}
          onAvatarUpdated={loadVendorAvatars}
        />
      )}
    </div>
  );
}