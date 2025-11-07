import React, { useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { TrendingUp, TrendingDown, Equal, BarChart3, ChevronDown, ChevronRight } from 'lucide-react';
import { useComercial } from '@/context/ComercialContext';

interface PrecoMedio {
  classe: string;
  mes: string;
  ano: number;
  precoMedio: number;
  pesoTotal: number;
  valorTotal: number;
}

interface MaterialPreco {
  descricaomat: string;
  classe: string;
  precosPorMes: Record<string, number>;
}

export function AnalisePrecos() {
  const { filteredData, isLoading } = useComercial();
  const [classeExpandida, setClasseExpandida] = useState<string | null>(null);

  // Processar dados para análise de preços
  const dadosAnalise = useMemo(() => {
    // Filtrar apenas dados faturados
    const dadosFaturados = filteredData.filter(
      item => item.situacao === 'Emitida' && 
              item.faturamento_tipo === 1 && 
              item.valor_un_bruto && 
              item.peso &&
              item.classe &&
              item.data_emissao
    );

    // Agrupar por classe, mês e ano
    const agrupamento = dadosFaturados.reduce((acc, item) => {
      const data = new Date(item.data_emissao);
      const mes = data.toLocaleDateString('pt-BR', { month: 'short' });
      const ano = data.getFullYear();
      const classe = item.classe;
      
      const chave = `${classe}-${mes}-${ano}`;
      
      if (!acc[chave]) {
        acc[chave] = {
          classe,
          mes,
          ano,
          valorTotal: 0,
          pesoTotal: 0,
          itens: []
        };
      }
      
      acc[chave].valorTotal += item.valor_un_bruto * item.peso;
      acc[chave].pesoTotal += item.peso;
      acc[chave].itens.push(item);
      
      return acc;
    }, {} as Record<string, any>);

    // Calcular preços médios ponderados
    const precosMedios: PrecoMedio[] = Object.values(agrupamento).map((grupo: any) => ({
      classe: grupo.classe,
      mes: grupo.mes,
      ano: grupo.ano,
      precoMedio: grupo.pesoTotal > 0 ? grupo.valorTotal / grupo.pesoTotal : 0,
      pesoTotal: grupo.pesoTotal,
      valorTotal: grupo.valorTotal
    }));

    return precosMedios;
  }, [filteredData]);

  // Processar dados para materiais individuais
  const dadosMateriais = useMemo(() => {
    if (!classeExpandida) return [];

    // Filtrar apenas dados faturados da classe expandida
    const dadosFaturados = filteredData.filter(
      item => item.situacao === 'Emitida' && 
              item.faturamento_tipo === 1 && 
              item.valor_un_bruto && 
              item.peso &&
              item.classe === classeExpandida &&
              item.descricaomat &&
              item.data_emissao
    );

    // Agrupar por material e mês/ano
    const agrupamentoMaterial = dadosFaturados.reduce((acc, item) => {
      const data = new Date(item.data_emissao);
      const mes = data.toLocaleDateString('pt-BR', { month: 'short' });
      const ano = data.getFullYear();
      const material = item.descricaomat;
      const chavemes = `${mes}-${ano}`;
      
      if (!acc[material]) {
        acc[material] = {
          descricaomat: material,
          classe: item.classe,
          precosPorMes: {}
        };
      }
      
      if (!acc[material].precosPorMes[chavemes]) {
        acc[material].precosPorMes[chavemes] = {
          valorTotal: 0,
          pesoTotal: 0
        };
      }
      
      acc[material].precosPorMes[chavemes].valorTotal += item.valor_un_bruto * item.peso;
      acc[material].precosPorMes[chavemes].pesoTotal += item.peso;
      
      return acc;
    }, {} as Record<string, any>);

    // Calcular preços médios ponderados por material e mês
    const materiaisComPrecos: MaterialPreco[] = Object.values(agrupamentoMaterial).map((material: any) => {
      const precosPorMes: Record<string, number> = {};
      
      Object.entries(material.precosPorMes).forEach(([chaveMs, dados]: [string, any]) => {
        precosPorMes[chaveMs] = dados.pesoTotal > 0 ? dados.valorTotal / dados.pesoTotal : 0;
      });
      
      return {
        descricaomat: material.descricaomat,
        classe: material.classe,
        precosPorMes
      };
    });

    // Ordenar por ordem alfabética da descrição do material
    return materiaisComPrecos.sort((a, b) => {
      return a.descricaomat.localeCompare(b.descricaomat, 'pt-BR');
    });
  }, [filteredData, classeExpandida]);

  // Obter meses únicos ordenados
  const mesesOrdenados = useMemo(() => {
    const mesesUnicos = [...new Set(dadosAnalise.map(item => `${item.mes}-${item.ano}`))];
    return mesesUnicos.sort((a, b) => {
      const [mesA, anoA] = a.split('-');
      const [mesB, anoB] = b.split('-');
      
      if (parseInt(anoA) !== parseInt(anoB)) {
        return parseInt(anoA) - parseInt(anoB);
      }
      
      const meses = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'];
      return meses.indexOf(mesA) - meses.indexOf(mesB);
    });
  }, [dadosAnalise]);

  // Obter classes únicas
  const classes = useMemo(() => {
    return [...new Set(dadosAnalise.map(item => item.classe))].sort();
  }, [dadosAnalise]);

  // Função para renderizar ícone de tendência baseado na comparação real de preços
  const renderIconeTendencia = (precoAtual: number, classe: string, mesAtual: string, anoAtual: number, indexMes: number) => {
    if (indexMes === 0) return null; // Primeiro mês não tem comparação
    
    // Encontrar o mês anterior
    const mesAnterior = mesesOrdenados[indexMes - 1];
    if (!mesAnterior) return null;
    
    const [mesAnt, anoAnt] = mesAnterior.split('-');
    const anoAntNum = parseInt(anoAnt);
    
    // Buscar o preço do mês anterior para a mesma classe
    const dadoAnterior = dadosAnalise.find(
      item => item.classe === classe && item.mes === mesAnt && item.ano === anoAntNum
    );
    
    if (!dadoAnterior || !dadoAnterior.precoMedio) return null;
    
    const diferenca = precoAtual - dadoAnterior.precoMedio;
    const percentualMudanca = Math.abs(diferenca / dadoAnterior.precoMedio);
    
    // Considerar variação significativa se for maior que 1%
    if (percentualMudanca < 0.01) {
      return <Equal className="h-3 w-3 text-yellow-600 ml-1" />;
    } else if (diferenca > 0) {
      return <TrendingUp className="h-3 w-3 text-green-600 ml-1" />;
    } else {
      return <TrendingDown className="h-3 w-3 text-red-600 ml-1" />;
    }
  };

  // Função para renderizar ícone de tendência para materiais
  const renderIconeTendenciaMaterial = (precoAtual: number, material: MaterialPreco, mesAtual: string, indexMes: number) => {
    if (indexMes === 0) return null; // Primeiro mês não tem comparação
    
    // Encontrar o mês anterior
    const mesAnterior = mesesOrdenados[indexMes - 1];
    if (!mesAnterior) return null;
    
    const precoAnterior = material.precosPorMes[mesAnterior];
    if (!precoAnterior) return null;
    
    const diferenca = precoAtual - precoAnterior;
    const percentualMudanca = Math.abs(diferenca / precoAnterior);
    
    // Considerar variação significativa se for maior que 1%
    if (percentualMudanca < 0.01) {
      return <Equal className="h-3 w-3 text-yellow-600 ml-1" />;
    } else if (diferenca > 0) {
      return <TrendingUp className="h-3 w-3 text-green-600 ml-1" />;
    } else {
      return <TrendingDown className="h-3 w-3 text-red-600 ml-1" />;
    }
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(value);
  };

  const toggleClasse = (classe: string) => {
    setClasseExpandida(classeExpandida === classe ? null : classe);
  };

  if (isLoading) {
    return (
      <Card className="p-4">
        <CardHeader className="px-0 pt-0">
          <div className="h-6 w-32 bg-muted animate-pulse rounded" />
        </CardHeader>
        <CardContent className="px-0">
          <div className="h-48 bg-muted animate-pulse rounded" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="p-4">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4 px-0 pt-0">
        <CardTitle className="text-sm font-medium text-purple-600 flex items-center gap-2">
          <BarChart3 className="h-4 w-4" />
          Análise de Preços
        </CardTitle>
      </CardHeader>
      <CardContent className="px-0 pb-0">
        <div className="overflow-x-auto">
          <div className="min-w-max">
            {/* Cabeçalho com meses */}
            <div className="flex mb-2">
              <div className="w-64 text-xs font-medium text-muted-foreground py-2">
                Classe / Material
              </div>
              {mesesOrdenados.map((mesAno) => {
                const [mes, ano] = mesAno.split('-');
                return (
                  <div key={mesAno} className="w-24 text-xs font-medium text-muted-foreground text-center py-2">
                    {mes} {ano}
                  </div>
                );
              })}
            </div>

            {/* Linhas de classes e materiais */}
            {classes.map((classe) => (
              <React.Fragment key={classe}>
                {/* Linha da classe */}
                <div className="flex border-b border-border/50 hover:bg-muted/50">
                  <div 
                    className="w-64 text-xs font-medium py-3 flex items-center gap-2 cursor-pointer"
                    onClick={() => toggleClasse(classe)}
                  >
                    {classeExpandida === classe ? (
                      <ChevronDown className="h-3 w-3" />
                    ) : (
                      <ChevronRight className="h-3 w-3" />
                    )}
                    <span className="font-semibold text-primary">{classe}</span>
                  </div>
                  {mesesOrdenados.map((mesAno, indexMes) => {
                    const [mes, ano] = mesAno.split('-');
                    const anoNum = parseInt(ano);
                    const dado = dadosAnalise.find(
                      item => item.classe === classe && item.mes === mes && item.ano === anoNum
                    );
                    const isFirstMonth = indexMes === 0;

                    return (
                      <div 
                        key={mesAno} 
                        className="w-24 text-xs py-3 px-2 text-center flex flex-col items-center gap-1"
                      >
                        {dado ? (
                          <>
                            <div className="flex items-center gap-1">
                              <span className="font-semibold">
                                {formatCurrency(dado.precoMedio)}
                              </span>
                               {renderIconeTendencia(dado.precoMedio, classe, mes, anoNum, indexMes)}
                            </div>
                          </>
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </div>
                    );
                  })}
                </div>

                {/* Linhas dos materiais expandidos */}
                {classeExpandida === classe && dadosMateriais.map((material) => (
                  <div key={material.descricaomat} className="flex border-b border-border/20 bg-muted/20">
                    <div className="w-64 text-xs py-2 px-4 flex items-center">
                      <span className="text-wrap break-words" title={material.descricaomat}>
                        {material.descricaomat}
                      </span>
                    </div>
                    {mesesOrdenados.map((mesAno, indexMes) => {
                      const [mes, ano] = mesAno.split('-');
                      const anoNum = parseInt(ano);
                      const preco = material.precosPorMes[mesAno];
                      const isFirstMonth = indexMes === 0;

                      return (
                        <div 
                          key={mesAno} 
                          className="w-24 text-xs py-2 px-2 text-center flex flex-col items-center gap-1"
                        >
                          {preco ? (
                            <>
                              <div className="flex items-center gap-1">
                                <span className="font-medium">
                                  {formatCurrency(preco)}
                                </span>
                                {renderIconeTendenciaMaterial(preco, material, mesAno, indexMes)}
                              </div>
                            </>
                          ) : (
                            <span className="text-muted-foreground">-</span>
                          )}
                        </div>
                      );
                    })}
                  </div>
                ))}
              </React.Fragment>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}