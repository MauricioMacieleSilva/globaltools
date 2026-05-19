import React, { useState } from 'react';
import { usePerfilContext } from '@/context/PerfilContext';
import { formatarNumero } from '@/lib/utils-perfil';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Copy, Eye, DollarSign, AlertCircle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { verificarPerfilUPadrao, verificarPerfilUEPadrao } from '@/lib/perfil-padrao-utils';
import { IndicadorPerfilPadrao } from '@/components/perfis/IndicadorPerfilPadrao';
import { VisualizacaoPerfilPopover } from '@/components/perfis/VisualizacaoPerfilPopover';
import { usePerfilPreco } from '@/hooks/usePerfilPreco';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

export function ResumoGeral() {
  const {
    calculos
  } = usePerfilContext();
  const { toast } = useToast();
  const { getPreco, loading: loadingPrecos } = usePerfilPreco();
  const [descontosIndividuais, setDescontosIndividuais] = useState<Record<string, string>>({});

  const handleDescontoIndividual = (id: string, valor: string) => {
    setDescontosIndividuais(prev => ({ ...prev, [id]: valor }));
  };

  const calculosValidos = Object.values(calculos).filter(calc => calc.pesoTotal > 0 && calc.quantidade > 0);

  if (calculosValidos.length === 0) {
    return <div className="text-center py-12">
        <p className="text-muted-foreground text-lg">
          Nenhum cálculo disponível. Preencha os dados nos perfis para visualizar o resumo.
        </p>
      </div>;
  }

  const totalPesoGeral = calculosValidos.reduce((sum, calc) => sum + calc.pesoTotal * (calc.percentualPerda || 100) / 100, 0);
  const totalPerdaGeral = calculosValidos.reduce((sum, calc) => sum + (calc.pesoPerda || 0), 0);
  const totalQuantidade = calculosValidos.reduce((sum, calc) => sum + calc.quantidade, 0);

  // Função para verificar se é perfil padrão
  const verificarPadrao = (calc: any) => {
    if (calc.tipo === 'U' && calc.base && calc.aba1) {
      const verificacao = verificarPerfilUPadrao(calc.espessura, calc.base, calc.aba1);
      return { isPadrao: verificacao.isPadrao, temDados: true };
    } else if (calc.tipo === 'U_ENRIJECIDO' && calc.base && calc.aba1 && calc.enrij1) {
      const verificacao = verificarPerfilUEPadrao(calc.espessura, calc.base, calc.aba1, calc.enrij1);
      return { isPadrao: verificacao.isPadrao, temDados: true };
    }
    return { isPadrao: false, temDados: false };
  };

  // Calcular valores com preços e descontos individuais
  // R$/kg efetivo embute o custo da perda: (peso_util + peso_perda) * preco_tabela / peso_util
  const calculosComPreco = calculosValidos.map(calc => {
    const { isPadrao } = verificarPadrao(calc);
    const precoKgBase = getPreco(calc.espessura, isPadrao);
    const descontoItem = parseFloat(descontosIndividuais[calc.id] || '0') || 0;
    const precoTabelaComDesc = precoKgBase ? precoKgBase * (1 - descontoItem / 100) : null;
    const pesoUtil = calc.pesoTotal * (calc.percentualPerda || 100) / 100;
    const pesoPerda = calc.pesoPerda || 0;
    const pesoBruto = pesoUtil + pesoPerda;
    const aproveitamento = calc.largura > 0 && calc.tira > 0
      ? ((calc.tirasAproveitadas * calc.tira) / calc.largura) * 100
      : 0;
    // Aproveitamento >= 95% usa preço de tabela direto (sem embutir perda)
    // < 95% embute o custo da perda no R$/kg
    const usarTabelaDireto = aproveitamento >= 95;
    const pesoFaturado = usarTabelaDireto ? pesoUtil : pesoBruto;
    const valorTotal = precoTabelaComDesc ? pesoFaturado * precoTabelaComDesc : null;
    const precoKg = precoTabelaComDesc && pesoUtil > 0 ? (valorTotal as number) / pesoUtil : null;
    const perdaEmbutidaPercent = usarTabelaDireto || pesoUtil <= 0 ? 0 : (pesoPerda / pesoUtil) * 100;
    return { ...calc, precoKgBase, precoTabelaComDesc, precoKg, valorTotal, isPadrao, descontoItem, perdaEmbutidaPercent, aproveitamento, usarTabelaDireto };
  });

  const valorTotalGeral = calculosComPreco.reduce((sum, calc) => {
    return sum + (calc.valorTotal || 0);
  }, 0);

  const temPrecosCadastrados = calculosComPreco.some(calc => calc.precoKg !== null);

  const obterNomeTipo = (tipo: string, orientacaoUZ?: 'U' | 'Z') => {
    const nomes: {
      [key: string]: string;
    } = {
      'U': `PERFIL ${orientacaoUZ || 'U'}`,
      'L': 'PERFIL L',
      'U_ENRIJECIDO': `PERFIL ${orientacaoUZ || 'U'} E`,
      'U_SEMI_ENRIJECIDO': `PERFIL ${orientacaoUZ || 'U'} SE`,
      'CARTOLA': 'PERFIL C',
      'CARTOLA_ENRIJECIDO': 'PERFIL CE',
      'CARTOLA_SEMI_ENRIJECIDO': 'PERFIL CSE'
    };
    return nomes[tipo] || tipo;
  };

  const obterDescricaoDobras = (calc: any) => {
    const base = Math.round(calc.base || 0);
    switch (calc.tipo) {
      case 'U':
        return `${Math.round(calc.aba1 || 0)}x${base}x${Math.round(calc.aba2 || 0)}`;
      case 'L':
        return `${Math.round(calc.aba1 || 0)}x${base}`;
      case 'U_ENRIJECIDO':
        return `${Math.round(calc.enrij1 || 0)}x${Math.round(calc.aba1 || 0)}x${base}x${Math.round(calc.aba2 || 0)}x${Math.round(calc.enrij2 || 0)}`;
      case 'U_SEMI_ENRIJECIDO':
        return `${Math.round(calc.enrij1 || 0)}x${Math.round(calc.aba1 || 0)}x${base}x${Math.round(calc.aba2 || 0)}`;
      case 'CARTOLA':
        return `${Math.round(calc.enrij1 || 0)}x${Math.round(calc.aba1 || 0)}x${base}x${Math.round(calc.aba2 || 0)}x${Math.round(calc.enrij3 || 0)}`;
      case 'CARTOLA_ENRIJECIDO':
        return `${Math.round(calc.enrij1 || 0)}x${Math.round(calc.enrij2 || 0)}x${Math.round(calc.aba1 || 0)}x${base}x${Math.round(calc.aba2 || 0)}x${Math.round(calc.enrij4 || 0)}x${Math.round(calc.enrij3 || 0)}`;
      case 'CARTOLA_SEMI_ENRIJECIDO':
        return `${Math.round(calc.enrij1 || 0)}x${Math.round(calc.enrij2 || 0)}x${Math.round(calc.aba1 || 0)}x${base}x${Math.round(calc.aba2 || 0)}x${Math.round(calc.enrij3 || 0)}`;
      default:
        return '-';
    }
  };

  const gerarDescricaoCompleta = (calc: any) => {
    const quantidade = Math.round(calc.quantidade);
    const tipo = obterNomeTipo(calc.tipo, calc.orientacaoUZ);
    const dimensoes = obterDescricaoDobras(calc);
    const comprimento = Math.round(calc.comprimento);
    
    return `${quantidade}pçs ${tipo} ${dimensoes} ${comprimento}mm`;
  };

  const copiarDescricao = async (descricao: string) => {
    try {
      await navigator.clipboard.writeText(descricao);
      toast({
        title: "Copiado!",
        description: "Descrição copiada para a área de transferência.",
      });
    } catch (error) {
      toast({
        title: "Erro",
        description: "Não foi possível copiar a descrição.",
        variant: "destructive",
      });
    }
  };

  const formatarMoeda = (valor: number) => {
    return valor.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  };

  return <div className="space-y-6">
      {/* Resumo Executivo */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-4">
        <Card className="border border-primary/20 bg-primary/5">
          <CardContent className="p-2 sm:p-4 text-center">
            <div className="text-xs sm:text-sm text-muted-foreground">Peso Total</div>
            <div className="text-lg sm:text-2xl font-bold text-primary">{formatarNumero(totalPesoGeral)} kg</div>
          </CardContent>
        </Card>
        
        <Card className="border border-destructive/20 bg-destructive/5">
          <CardContent className="p-2 sm:p-4 text-center">
            <div className="text-xs sm:text-sm text-muted-foreground">Peso de Perda</div>
            <div className="text-lg sm:text-2xl font-bold text-destructive">{formatarNumero(totalPerdaGeral)} kg</div>
          </CardContent>
        </Card>
        
        <Card className="border border-blue-500/20 bg-blue-500/5">
          <CardContent className="p-2 sm:p-4 text-center">
            <div className="text-xs sm:text-sm text-muted-foreground">Quantidade Total</div>
            <div className="text-lg sm:text-2xl font-bold text-blue-600">{Math.round(totalQuantidade)}</div>
          </CardContent>
        </Card>

        <Card className="border border-green-500/20 bg-green-500/5">
          <CardContent className="p-2 sm:p-4 text-center">
            <div className="text-xs sm:text-sm text-muted-foreground flex items-center justify-center gap-1">
              <DollarSign className="h-3 w-3" />
              Valor Total
            </div>
            {loadingPrecos ? (
              <div className="text-lg sm:text-2xl font-bold text-green-600">...</div>
            ) : temPrecosCadastrados ? (
              <div className="text-lg sm:text-2xl font-bold text-green-600">{formatarMoeda(valorTotalGeral)}</div>
            ) : (
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger>
                    <div className="text-sm text-muted-foreground flex items-center justify-center gap-1">
                      <AlertCircle className="h-4 w-4" />
                      Sem preços
                    </div>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Cadastre preços na Política Comercial → Perfis</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Detalhamento Completo */}
      <Card>
        <CardHeader>
          <CardTitle>Detalhamento Completo</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto -mx-3 sm:mx-0">
            <div className="min-w-full inline-block align-middle">
              <div className="overflow-hidden">
                <table className="min-w-full border-collapse">
                  <thead>
                    <tr className="border-b">
                       <th className="text-left p-1 sm:p-3 font-medium text-xs sm:text-sm">Tipo</th>
                       <th className="text-center p-1 sm:p-3 font-medium text-xs sm:text-sm">Padrão</th>
                       <th className="text-center p-1 sm:p-3 font-medium text-xs sm:text-sm">Esp.</th>
                       <th className="text-left p-1 sm:p-3 font-medium text-xs sm:text-sm">Descrição</th>
                       <th className="text-center p-1 sm:p-3 font-medium text-xs sm:text-sm">Tira</th>
                       <th className="text-center p-1 sm:p-3 font-medium text-xs sm:text-sm">Peso Total</th>
                       <th className="text-center p-1 sm:p-3 font-medium text-xs sm:text-sm hidden sm:table-cell">Peso Perda</th>
                       <th className="text-center p-1 sm:p-3 font-medium text-xs sm:text-sm text-amber-600">Desc%</th>
                       <th className="text-center p-1 sm:p-3 font-medium text-xs sm:text-sm text-green-600">R$/kg</th>
                       <th className="text-center p-1 sm:p-3 font-medium text-xs sm:text-sm text-green-600 hidden sm:table-cell">Valor</th>
                       <th className="text-center p-1 sm:p-3 font-medium text-xs sm:text-sm">Ver</th>
                     </tr>
                  </thead>
                  <tbody>
                    {calculosComPreco.map(calc => {
                    const pesoPorPeca = calc.quantidade > 0 ? calc.pesoTotal / calc.quantidade : 0;
                    const descricaoCompleta = gerarDescricaoCompleta(calc);
                    const pesoPerdaItem = (calc.pesoPerdaPorPeca || 0) * calc.quantidade;
                    
                    const { temDados } = verificarPadrao(calc);

                    return <tr key={calc.id} className="border-b hover:bg-muted/50">
                          <td className="p-1 sm:p-3">
                            <Badge variant="secondary" className="text-xs">{obterNomeTipo(calc.tipo, calc.orientacaoUZ)}</Badge>
                          </td>
                          <td className="p-1 sm:p-3 text-center">
                            {temDados && calc.isPadrao ? (
                              <IndicadorPerfilPadrao isPadrao={true} temDados={true} />
                            ) : (
                              <Badge variant="outline" className="text-xs bg-amber-500/10 text-amber-600 border-amber-500/30">
                                Especial
                              </Badge>
                            )}
                          </td>
                          <td className="text-center p-1 sm:p-3 text-xs sm:text-sm">{calc.espessura.toFixed(2)}</td>
                          <td className="p-1 sm:p-3 text-xs sm:text-sm">
                            <div className="flex items-center justify-between gap-2">
                              <span className="flex-1">{descricaoCompleta}</span>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-6 w-6 p-0 hover:bg-muted"
                                onClick={() => copiarDescricao(descricaoCompleta)}
                                title="Copiar descrição"
                              >
                                <Copy className="h-3 w-3" />
                              </Button>
                            </div>
                          </td>
                          <td className="text-center p-1 sm:p-3 text-xs sm:text-sm">{Math.ceil(calc.tira)}</td>
                          <td className="text-center p-1 sm:p-3 font-medium text-primary text-xs sm:text-sm">{formatarNumero(calc.pesoTotal * (calc.percentualPerda || 100) / 100)}</td>
                          <td className="text-center p-1 sm:p-3 font-medium text-destructive text-xs sm:text-sm hidden sm:table-cell">{formatarNumero(calc.pesoPerda || 0)}</td>
                          <td className="text-center p-1 sm:p-3 text-xs sm:text-sm">
                            <TooltipProvider>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Input
                                    type="number"
                                    step="0.5"
                                    min="0"
                                    max="20"
                                    placeholder="0"
                                    value={descontosIndividuais[calc.id] || ''}
                                    onChange={(e) => handleDescontoIndividual(calc.id, e.target.value)}
                                    className={`w-14 h-6 text-center text-xs p-1 ${calc.descontoItem > 5 ? 'border-destructive border-2 text-destructive font-medium' : ''}`}
                                  />
                                </TooltipTrigger>
                                {calc.descontoItem > 5 && (
                                  <TooltipContent>
                                    <p className="text-xs">Requer aprovação da gestão</p>
                                  </TooltipContent>
                                )}
                              </Tooltip>
                            </TooltipProvider>
                          </td>
                          <td className="text-center p-1 sm:p-3 text-xs sm:text-sm text-green-600">
                            {calc.precoKg ? (
                              <TooltipProvider>
                                <Tooltip>
                                  <TooltipTrigger>
                                    <span className="font-medium">{formatarNumero(calc.precoKg)}</span>
                                  </TooltipTrigger>
                                  <TooltipContent>
                                    <p>
                                      Base: {formatarNumero(calc.precoKgBase || 0)} | Desc: {calc.descontoItem}% | Aprov.: {formatarNumero(calc.aproveitamento)}%
                                      {calc.usarTabelaDireto
                                        ? ' | Preço de tabela (aprov. ≥95%)'
                                        : ` | Perda embutida: +${formatarNumero(calc.perdaEmbutidaPercent)}%`}
                                    </p>
                                  </TooltipContent>
                                </Tooltip>
                              </TooltipProvider>
                            ) : (
                              <span className="text-muted-foreground">-</span>
                            )}
                          </td>
                          <td className="text-center p-1 sm:p-3 font-medium text-green-600 text-xs sm:text-sm hidden sm:table-cell">
                            {calc.valorTotal ? formatarMoeda(calc.valorTotal) : '-'}
                          </td>
                          <td className="text-center p-1 sm:p-3 text-xs sm:text-sm">
                            <VisualizacaoPerfilPopover calculo={calc} tipoPerfil={obterNomeTipo(calc.tipo, calc.orientacaoUZ)}>
                              <button className="flex items-center justify-center w-full h-full cursor-pointer hover:bg-primary/5 rounded transition-colors p-1">
                                <Eye className="h-3 w-3 text-primary" />
                              </button>
                            </VisualizacaoPerfilPopover>
                          </td>
                        </tr>;
                  })}
                  </tbody>
                  {temPrecosCadastrados && (
                    <tfoot>
                      <tr className="border-t-2 bg-muted/30">
                        <td colSpan={8} className="p-2 sm:p-3 text-right font-bold text-sm hidden sm:table-cell">
                           Valor Total:
                         </td>
                         <td colSpan={6} className="p-2 sm:p-3 text-right font-bold text-sm sm:hidden">
                           Valor Total:
                         </td>
                        <td className="text-center p-2 sm:p-3 font-bold text-green-600 text-sm sm:hidden" colSpan={2}>
                          {formatarMoeda(valorTotalGeral)}
                        </td>
                        <td className="text-center p-2 sm:p-3 font-bold text-green-600 text-sm hidden sm:table-cell">-</td>
                        <td className="text-center p-2 sm:p-3 font-bold text-green-600 text-sm hidden sm:table-cell">
                          {formatarMoeda(valorTotalGeral)}
                        </td>
                        <td className="hidden sm:table-cell"></td>
                      </tr>
                    </tfoot>
                  )}
                </table>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

    </div>;
}
