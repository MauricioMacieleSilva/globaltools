import React from 'react';
import { usePerfilContext } from '@/context/PerfilContext';
import { formatarNumero } from '@/lib/utils-perfil';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Copy, Eye } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { verificarPerfilUPadrao, verificarPerfilUEPadrao } from '@/lib/perfil-padrao-utils';
import { IndicadorPerfilPadrao } from '@/components/perfis/IndicadorPerfilPadrao';
import { VisualizacaoPerfilPopover } from '@/components/perfis/VisualizacaoPerfilPopover';

export function ResumoGeral() {
  const {
    calculos
  } = usePerfilContext();
  const { toast } = useToast();

  const calculosValidos = Object.values(calculos).filter(calc => calc.pesoTotal > 0 && calc.quantidade > 0);

  if (calculosValidos.length === 0) {
    return <div className="text-center py-12">
        <p className="text-muted-foreground text-lg">
          Nenhum cálculo disponível. Preencha os dados nos perfis para visualizar o resumo.
        </p>
      </div>;
  }

  const totalPesoGeral = calculosValidos.reduce((sum, calc) => sum + calc.pesoTotal, 0);
  const totalPerdaGeral = calculosValidos.reduce((sum, calc) => sum + ((calc.pesoPerdaPorPeca || 0) * calc.quantidade), 0);
  const totalQuantidade = calculosValidos.reduce((sum, calc) => sum + calc.quantidade, 0);
  const eficiencia = totalPesoGeral > 0 ? (totalPesoGeral - totalPerdaGeral) / totalPesoGeral * 100 : 0;

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
        return `${Math.round(calc.enrij1 || 0)}x${Math.round(calc.enrij2 || 0)}x${Math.round(calc.aba1 || 0)}x${base}x${Math.round(calc.aba2 || 0)}x${Math.round(calc.enrij3 || 0)}x${Math.round(calc.enrij4 || 0)}`;
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

  return <div className="space-y-6">
      {/* Resumo Executivo */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 sm:gap-4">
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
                      <th className="text-center p-1 sm:p-3 font-medium text-xs sm:text-sm hidden sm:table-cell">T.Perda</th>
                      <th className="text-center p-1 sm:p-3 font-medium text-xs sm:text-sm hidden sm:table-cell">kg/Pç</th>
                      <th className="text-center p-1 sm:p-3 font-medium text-xs sm:text-sm hidden md:table-cell">% Perda</th>
                      <th className="text-center p-1 sm:p-3 font-medium text-xs sm:text-sm">Peso Tira</th>
                      <th className="text-center p-1 sm:p-3 font-medium text-xs sm:text-sm hidden sm:table-cell">Peso Perda</th>
                      <th className="text-center p-1 sm:p-3 font-medium text-xs sm:text-sm">Ver</th>
                    </tr>
                  </thead>
                  <tbody>
                    {calculosValidos.map(calc => {
                    const pesoPorPeca = calc.quantidade > 0 ? calc.pesoTotal / calc.quantidade : 0;
                    const descricaoCompleta = gerarDescricaoCompleta(calc);
                    const pesoPerdaItem = (calc.pesoPerdaPorPeca || 0) * calc.quantidade;
                    
                    // Verificar se é perfil padrão
                    let isPadrao = false;
                    let temDadosParaVerificacao = false;
                    
                    if (calc.tipo === 'U' && calc.base && calc.aba1) {
                      temDadosParaVerificacao = true;
                      const verificacao = verificarPerfilUPadrao(calc.espessura, calc.base, calc.aba1);
                      isPadrao = verificacao.isPadrao;
                    } else if (calc.tipo === 'U_ENRIJECIDO' && calc.base && calc.aba1 && calc.enrij1) {
                      temDadosParaVerificacao = true;
                      const verificacao = verificarPerfilUEPadrao(calc.espessura, calc.base, calc.aba1, calc.enrij1);
                      isPadrao = verificacao.isPadrao;
                    }

                    return <tr key={calc.id} className="border-b hover:bg-muted/50">
                          <td className="p-1 sm:p-3">
                            <Badge variant="secondary" className="text-xs">{obterNomeTipo(calc.tipo, calc.orientacaoUZ)}</Badge>
                          </td>
                          <td className="p-1 sm:p-3 text-center">
                            {temDadosParaVerificacao && isPadrao ? (
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
                          <td className="text-center p-1 sm:p-3 text-xs sm:text-sm hidden sm:table-cell">{Math.ceil(calc.tiraPerda)}</td>
                          <td className="text-center p-1 sm:p-3 text-xs sm:text-sm hidden sm:table-cell">{pesoPorPeca.toFixed(2)}</td>
                          <td className="text-center p-1 sm:p-3 text-xs sm:text-sm hidden md:table-cell">{Math.round(calc.percentualPerda)}%</td>
                          <td className="text-center p-1 sm:p-3 font-medium text-primary text-xs sm:text-sm">{formatarNumero(calc.pesoTotal)}</td>
                          <td className="text-center p-1 sm:p-3 font-medium text-destructive text-xs sm:text-sm hidden sm:table-cell">{formatarNumero(pesoPerdaItem)}</td>
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
                </table>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>;
}
