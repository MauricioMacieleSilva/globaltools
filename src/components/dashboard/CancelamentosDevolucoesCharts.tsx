import React, { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LabelList } from 'recharts';
import { useComercial } from '@/context/ComercialContext';

export function CancelamentosDevolucoesCharts() {
  const { filteredData } = useComercial();

  const cancelamentosClienteData = useMemo(() => {
    const cancelados = filteredData.filter(item => item.situacao === 'Cancelada');
    const clienteMap = new Map();
    
    cancelados.forEach(item => {
      const cliente = item.cliente || 'Não informado';
      if (clienteMap.has(cliente)) {
        const existing = clienteMap.get(cliente);
        clienteMap.set(cliente, {
          valor: existing.valor + item.valor,
          peso: existing.peso + (item.peso || 0),
          pedidos: existing.pedidos + 1,
          clientes: existing.clientes
        });
      } else {
        clienteMap.set(cliente, {
          valor: item.valor,
          peso: item.peso || 0,
          pedidos: 1,
          clientes: 1
        });
      }
    });

    return Array.from(clienteMap.entries())
      .map(([cliente, data]) => ({ 
        cliente, 
        valor: data.valor,
        peso: data.peso,
        pedidos: data.pedidos,
        clientes: data.clientes
      }))
      .sort((a, b) => b.valor - a.valor)
      .slice(0, 10); // Top 10 clientes
  }, [filteredData]);

  const devolucaoClienteData = useMemo(() => {
    const devolvidos = filteredData.filter(item => item.situacao === 'Devolução');
    const clienteMap = new Map();
    
    devolvidos.forEach(item => {
      const cliente = item.cliente || 'Não informado';
      if (clienteMap.has(cliente)) {
        const existing = clienteMap.get(cliente);
        clienteMap.set(cliente, {
          valor: existing.valor + item.valor,
          peso: existing.peso + (item.peso || 0),
          pedidos: existing.pedidos + 1,
          clientes: existing.clientes
        });
      } else {
        clienteMap.set(cliente, {
          valor: item.valor,
          peso: item.peso || 0,
          pedidos: 1,
          clientes: 1
        });
      }
    });

    return Array.from(clienteMap.entries())
      .map(([cliente, data]) => ({ 
        cliente, 
        valor: data.valor,
        peso: data.peso,
        pedidos: data.pedidos,
        clientes: data.clientes
      }))
      .sort((a, b) => b.valor - a.valor)
      .slice(0, 10); // Top 10 clientes
  }, [filteredData]);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
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
            <p className="text-red-600">
              <span className="font-medium">Valor:</span> {formatCurrency(data.valor)}
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

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-2">
      {/* Gráfico Cancelamentos por Cliente */}
      <Card className="h-60">
        <CardHeader className="pb-2 px-3 pt-3">
          <CardTitle className="text-sm font-semibold text-red-600">
            Cancelamentos por Cliente
          </CardTitle>
        </CardHeader>
        <CardContent className="px-3 pb-3">
          <div className="h-44">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={cancelamentosClienteData} margin={{ bottom: 20, left: 20 }}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis 
                  dataKey="cliente" 
                  tick={{ fontSize: 8 }}
                  angle={-45}
                  textAnchor="end"
                  height={60}
                />
                <YAxis 
                  tickFormatter={formatCurrency} 
                  tick={{ fontSize: 10 }}
                  domain={[0, (dataMax: number) => Math.ceil(dataMax * 1.15)]}
                />
                <Tooltip content={<CustomTooltip />} />
                <Bar dataKey="valor" fill="hsl(0 84% 60%)">
                  <LabelList 
                    dataKey="valor" 
                    position="top" 
                    formatter={formatLabel}
                    style={{ fontSize: '10px', fill: 'hsl(var(--foreground))' }}
                  />
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      {/* Gráfico Devoluções por Cliente */}
      <Card className="h-60">
        <CardHeader className="pb-2 px-3 pt-3">
          <CardTitle className="text-sm font-semibold text-orange-600">
            Devoluções por Cliente
          </CardTitle>
        </CardHeader>
        <CardContent className="px-3 pb-3">
          <div className="h-44">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={devolucaoClienteData} margin={{ bottom: 20, left: 20 }}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis 
                  dataKey="cliente" 
                  tick={{ fontSize: 8 }}
                  angle={-45}
                  textAnchor="end"
                  height={60}
                />
                <YAxis 
                  tickFormatter={formatCurrency} 
                  tick={{ fontSize: 10 }}
                  domain={[0, (dataMax: number) => Math.ceil(dataMax * 1.15)]}
                />
                <Tooltip content={<CustomTooltip />} />
                <Bar dataKey="valor" fill="hsl(25 95% 53%)">
                  <LabelList 
                    dataKey="valor" 
                    position="top" 
                    formatter={formatLabel}
                    style={{ fontSize: '10px', fill: 'hsl(var(--foreground))' }}
                  />
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}