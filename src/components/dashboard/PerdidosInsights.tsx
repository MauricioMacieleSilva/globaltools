import React, { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { TrendingDown, AlertTriangle, Target, Lightbulb } from 'lucide-react';
import { useComercial } from '@/context/ComercialContext';

export function PerdidosInsights() {
  const { filteredData, kpis } = useComercial();

  const insights = useMemo(() => {
    const perdidos = filteredData.filter(item => 
      item.situacao === 'Perdido' && 
      item.perdido_motivo && 
      item.perdido_motivo !== 'Não informado'
    );
    
    if (perdidos.length === 0) {
      return {
        principalMotivo: null,
        classeComMaisPerda: null,
        impactoFinanceiro: 0,
        recomendacoes: []
      };
    }

    // Principal motivo de perda
    const motivoCounts = perdidos.reduce((acc, item) => {
      const motivo = item.perdido_motivo || 'Não informado';
      acc[motivo] = (acc[motivo] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const principalMotivo = Object.entries(motivoCounts)
      .sort(([,a], [,b]) => b - a)[0];

    // Classe com mais perda (em valor)
    const classeValues = perdidos.reduce((acc, item) => {
      const classe = item.classe || 'Não informado';
      acc[classe] = (acc[classe] || 0) + item.valor;
      return acc;
    }, {} as Record<string, number>);

    const classeComMaisPerda = Object.entries(classeValues)
      .sort(([,a], [,b]) => b - a)[0];

    // Impacto financeiro em %
    const totalVendas = kpis.faturamento.valor + kpis.orcamento.valor;
    const impactoFinanceiro = totalVendas > 0 ? (kpis.perdidos.valor / (totalVendas + kpis.perdidos.valor)) * 100 : 0;

    // Recomendações baseadas nos dados
    const recomendacoes = [];
    
    if (principalMotivo && principalMotivo[1] > perdidos.length * 0.3) {
      recomendacoes.push(`Foque em resolver o motivo "${principalMotivo[0]}" que representa ${Math.round((principalMotivo[1] / perdidos.length) * 100)}% das perdas`);
    }

    if (classeComMaisPerda && classeComMaisPerda[1] > kpis.perdidos.valor * 0.4) {
      recomendacoes.push(`Analise a estratégia para Classe ${classeComMaisPerda[0]} - maior impacto financeiro nas perdas`);
    }

    if (impactoFinanceiro > 20) {
      recomendacoes.push('Alto impacto das perdas no faturamento total - revisar processo comercial');
    }

    if (kpis.perdidos.numClientes > 10) {
      recomendacoes.push('Muitos clientes perdidos - considere programa de retenção');
    }

    return {
      principalMotivo,
      classeComMaisPerda,
      impactoFinanceiro,
      recomendacoes
    };
  }, [filteredData, kpis]);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value);
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-destructive">
            <Lightbulb className="h-5 w-5" />
            Insights Automáticos
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {insights.principalMotivo ? (
            <Alert className="border-destructive/20 bg-destructive/5">
              <AlertTriangle className="h-4 w-4 text-destructive" />
              <AlertTitle className="text-destructive">Principal Motivo de Perda</AlertTitle>
              <AlertDescription>
                <strong>{insights.principalMotivo[0]}</strong> é responsável por{' '}
                <strong>{insights.principalMotivo[1]} perdas</strong> no período analisado.
              </AlertDescription>
            </Alert>
          ) : null}

          {insights.classeComMaisPerda ? (
            <Alert className="border-orange-200 bg-orange-50">
              <TrendingDown className="h-4 w-4 text-orange-600" />
              <AlertTitle className="text-orange-800">Classe Mais Impactada</AlertTitle>
              <AlertDescription>
                Classe <strong>{insights.classeComMaisPerda[0]}</strong> teve{' '}
                <strong>{formatCurrency(insights.classeComMaisPerda[1])}</strong> em perdas.
              </AlertDescription>
            </Alert>
          ) : null}

          <Alert className="border-blue-200 bg-blue-50">
            <Target className="h-4 w-4 text-blue-600" />
            <AlertTitle className="text-blue-800">Impacto Financeiro</AlertTitle>
            <AlertDescription>
              As perdas representam <strong>{insights.impactoFinanceiro.toFixed(1)}%</strong> do potencial de faturamento total.
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>

      {insights.recomendacoes.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-primary">
              <Target className="h-5 w-5" />
              Recomendações
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2">
              {insights.recomendacoes.map((recomendacao, index) => (
                <li key={index} className="flex items-start gap-2">
                  <div className="w-2 h-2 bg-primary rounded-full mt-2 flex-shrink-0"></div>
                  <span className="text-sm">{recomendacao}</span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}
    </div>
  );
}