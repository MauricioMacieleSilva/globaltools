import React, { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { TrendingUp, TrendingDown, AlertTriangle, DollarSign, BarChart3 } from 'lucide-react';
import { useComercial } from '@/context/ComercialContext';

export function AnalisprecosInsights() {
  const { filteredData, isLoading } = useComercial();

  const insights = useMemo(() => {
    if (isLoading || !filteredData.length) return [];

    const dadosEmitidos = filteredData.filter(item => item.situacao === 'Emitida' && item.valor > 0 && item.peso > 0);
    
    if (dadosEmitidos.length === 0) return [];

    // Calcular preços por classe
    const precosPorClasse = dadosEmitidos.reduce((acc, item) => {
      const precoKg = item.valor / item.peso;
      if (!acc[item.classe]) {
        acc[item.classe] = [];
      }
      acc[item.classe].push(precoKg);
      return acc;
    }, {} as Record<string, number[]>);

    // Calcular estatísticas por classe
    const estatisticasClasses = Object.entries(precosPorClasse).map(([classe, precos]) => {
      const precoMedio = precos.reduce((a, b) => a + b, 0) / precos.length;
      const precoMin = Math.min(...precos);
      const precoMax = Math.max(...precos);
      const variacao = ((precoMax - precoMin) / precoMedio) * 100;
      
      return {
        classe,
        precoMedio,
        precoMin,
        precoMax,
        variacao,
        qtdVendas: precos.length
      };
    }).sort((a, b) => b.variacao - a.variacao);

    const resultInsights = [];

    // Classe com maior variação de preço
    if (estatisticasClasses.length > 0) {
      const maiorVariacao = estatisticasClasses[0];
      resultInsights.push({
        icon: AlertTriangle,
        title: "Maior Variação de Preços",
        description: `Classe ${maiorVariacao.classe}: ${maiorVariacao.variacao.toFixed(1)}% de variação`,
        type: maiorVariacao.variacao > 50 ? "warning" : "info" as const
      });
    }

    // Classe com maior preço médio
    const classesMaiorPreco = estatisticasClasses.sort((a, b) => b.precoMedio - a.precoMedio);
    if (classesMaiorPreco.length > 0) {
      const maiorPreco = classesMaiorPreco[0];
      resultInsights.push({
        icon: TrendingUp,
        title: "Maior Preço Médio",
        description: `${maiorPreco.classe}: R$ ${maiorPreco.precoMedio.toFixed(2)}/kg`,
        type: "success" as const
      });
    }

    // Classe com menor preço médio
    if (classesMaiorPreco.length > 0) {
      const menorPreco = classesMaiorPreco[classesMaiorPreco.length - 1];
      resultInsights.push({
        icon: TrendingDown,
        title: "Menor Preço Médio",
        description: `${menorPreco.classe}: R$ ${menorPreco.precoMedio.toFixed(2)}/kg`,
        type: "info" as const
      });
    }

    // Oportunidade de ajuste
    const classesComVariacao = estatisticasClasses.filter(c => c.variacao > 30);
    if (classesComVariacao.length > 0) {
      resultInsights.push({
        icon: BarChart3,
        title: "Oportunidades de Padronização",
        description: `${classesComVariacao.length} classe(s) com alta variação de preços`,
        type: "warning" as const
      });
    }

    // Análise de volume vs preço
    const classesMaiorVolume = estatisticasClasses
      .filter(c => c.qtdVendas >= 3)
      .sort((a, b) => b.qtdVendas - a.qtdVendas);
    
    if (classesMaiorVolume.length > 0) {
      const maiorVolume = classesMaiorVolume[0];
      resultInsights.push({
        icon: DollarSign,
        title: "Classe Mais Vendida",
        description: `${maiorVolume.classe}: ${maiorVolume.qtdVendas} vendas com preço médio R$ ${maiorVolume.precoMedio.toFixed(2)}/kg`,
        type: "info" as const
      });
    }

    return resultInsights;
  }, [filteredData, isLoading]);

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Insights de Preços</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-muted-foreground">Carregando insights...</div>
        </CardContent>
      </Card>
    );
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
        <CardTitle>Insights de Preços</CardTitle>
      </CardHeader>
      <CardContent>
        {insights.length === 0 ? (
          <div className="text-muted-foreground">
            Dados insuficientes para gerar insights de preços
          </div>
        ) : (
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
        )}
      </CardContent>
    </Card>
  );
}