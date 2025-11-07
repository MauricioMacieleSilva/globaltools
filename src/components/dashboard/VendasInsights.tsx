import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { TrendingUp, TrendingDown, Users, DollarSign, Target, AlertCircle } from 'lucide-react';
import { useComercial } from '@/context/ComercialContext';

export function VendasInsights() {
  const { filteredData, kpis, isLoading } = useComercial();

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Insights de Vendas</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-muted-foreground">Carregando insights...</div>
        </CardContent>
      </Card>
    );
  }

  // Calcular insights automáticos
  const dadosEmitidos = filteredData.filter(item => item.situacao === 'Emitida');
  const dadosOrcamento = filteredData.filter(item => item.situacao === 'Orçamento');

  // Análise por classe
  const classesFaturamento = dadosEmitidos.reduce((acc, item) => {
    acc[item.classe] = (acc[item.classe] || 0) + item.valor;
    return acc;
  }, {} as Record<string, number>);

  const melhorClasse = Object.entries(classesFaturamento)
    .sort(([,a], [,b]) => b - a)[0];

  // Ticket médio
  const ticketMedio = dadosEmitidos.length > 0 
    ? dadosEmitidos.reduce((acc, item) => acc + item.valor, 0) / dadosEmitidos.length
    : 0;

  // Taxa de conversão (orçamentos → vendas)
  const totalOrcamentos = dadosOrcamento.length;
  const totalVendas = dadosEmitidos.length;
  const taxaConversao = totalOrcamentos > 0 ? (totalVendas / (totalVendas + totalOrcamentos)) * 100 : 0;

  // Análise de clientes
  const clientesUnicos = new Set(dadosEmitidos.map(item => item.cliente)).size;

  const insights = [
    {
      icon: TrendingUp,
      title: "Melhor Classe em Faturamento",
      description: melhorClasse ? `Classe ${melhorClasse[0]} lidera em vendas faturadas com ${(melhorClasse[1] / 1000000).toFixed(1)}M` : "Sem dados de vendas faturadas",
      type: "success" as const
    },
    {
      icon: DollarSign,
      title: "Ticket Médio de Vendas",
      description: `R$ ${(ticketMedio / 1000).toFixed(0)}k por pedido faturado`,
      type: "info" as const
    },
    {
      icon: Target,
      title: "Taxa de Conversão Orçamento→Venda",
      description: `${taxaConversao.toFixed(1)}% dos orçamentos foram convertidos em vendas`,
      type: taxaConversao >= 50 ? "success" : taxaConversao >= 30 ? "warning" : "error" as const
    },
    {
      icon: Users,
      title: "Clientes com Vendas Ativas",
      description: `${clientesUnicos} clientes fizeram compras no período`,
      type: "info" as const
    }
  ];

  // Insight adicional baseado na performance
  const metaFaturamento = 10000000; // Meta padrão de 10M
  const atingimentoMeta = ((kpis.faturamento.valor / metaFaturamento) * 100);

  if (atingimentoMeta < 80) {
    insights.push({
      icon: AlertCircle,
      title: "Atenção à Meta de Faturamento",
      description: `${atingimentoMeta.toFixed(1)}% da meta de vendas faturadas atingida`,
      type: "warning" as const
    });
  }

  const getInsightColor = (type: string) => {
    switch (type) {
      case 'success': return 'text-green-600 bg-green-50 border-green-200';
      case 'warning': return 'text-yellow-600 bg-yellow-50 border-yellow-200';
      case 'error': return 'text-red-600 bg-red-50 border-red-200';
      default: return 'text-blue-600 bg-blue-50 border-blue-200';
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Insights de Vendas</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid gap-4">
          {insights.map((insight, index) => {
            const Icon = insight.icon;
            return (
              <div 
                key={index}
                className={`p-4 rounded-lg border ${getInsightColor(insight.type)}`}
              >
                <div className="flex items-start gap-3">
                  <Icon className="h-5 w-5 mt-0.5" />
                  <div className="flex-1">
                    <h4 className="font-medium">{insight.title}</h4>
                    <p className="text-sm opacity-80">{insight.description}</p>
                  </div>
                  <Badge variant={insight.type === 'success' ? 'default' : 'secondary'}>
                    {insight.type === 'success' ? 'Positivo' : 
                     insight.type === 'warning' ? 'Atenção' : 
                     insight.type === 'error' ? 'Crítico' : 'Info'}
                  </Badge>
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}