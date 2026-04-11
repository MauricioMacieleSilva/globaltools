import React, { useState, useEffect } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Badge } from '@/components/ui/badge';
import { Plus, Trash2, ChevronDown, ChevronUp, DollarSign } from 'lucide-react';
import { usePerfilContext, CalculoItem, LinhaPerfilU } from '@/context/PerfilContext';
import { formatarNumero, gerarId, validarAbaMinima } from '@/lib/utils-perfil';
import { verificarPerfilUPadrao } from '@/lib/perfil-padrao-utils';
import { VisualizacaoChapaTiras } from './VisualizacaoChapaTiras';
import { useToast } from '@/hooks/use-toast';
import { usePerfilPreco } from '@/hooks/usePerfilPreco';

export function PerfilUMobile() {
  const {
    atualizarCalculo,
    removerCalculo,
    linhasU,
    atualizarLinhaU,
    calculos
  } = usePerfilContext();
  
  const { toast } = useToast();
  const [errosValidacao, setErrosValidacao] = useState<Record<string, string>>({});
  const [openCards, setOpenCards] = useState<Set<string>>(new Set());
  const { getPreco } = usePerfilPreco();

  useEffect(() => {
    if (linhasU.length === 0) {
      const linhasIniciais = Array.from({ length: 3 }, () => ({
        id: gerarId(),
        orientacaoUZ: 'U' as const,
        espessura: '',
        aba1: '',
        base: '',
        aba2: '',
        comprimento: '6000',
        largura: '1200',
        quantidade: '',
        percentualPerda: '103',
        assimetrico: false
      }));
      atualizarLinhaU(linhasIniciais);
    }
  }, [linhasU.length, atualizarLinhaU]);

  const calcularPerfil = (linha: LinhaPerfilU): CalculoItem | null => {
    const temErro = Object.keys(errosValidacao).some(key => key.startsWith(linha.id));
    if (temErro) return null;

    const espessura = parseFloat(linha.espessura) || 0;
    const aba1 = parseFloat(linha.aba1) || 0;
    const base = parseFloat(linha.base) || 0;
    const aba2 = parseFloat(linha.aba2) || 0;
    const comprimento = parseFloat(linha.comprimento) || 0;
    const largura = parseFloat(linha.largura) || 0;
    const quantidade = parseInt(linha.quantidade) || 0;
    const percentualPerda = parseFloat(linha.percentualPerda) || 0;

    if (espessura <= 0 || aba1 <= 0 || base <= 0 || aba2 <= 0 || comprimento <= 0 || largura <= 0 || quantidade <= 0) {
      return null;
    }

    const tira = aba1 + base + aba2 - (2 * espessura * 2);
    const tirasAproveitadas = Math.floor(largura / tira);
    const tiraPerda = largura - (tirasAproveitadas * tira);
    const pesoPorPeca = (espessura * comprimento / 1000) * (tira / 1000) * 8;
    const pesoTotal = quantidade * pesoPorPeca;
    const pesoPerdaPorPeca = (espessura * comprimento / 1000) * (tiraPerda / 1000) * 8;
    const chapas = Math.ceil(quantidade / tirasAproveitadas);
    const pesoPerda = pesoPerdaPorPeca * chapas;

    return {
      id: linha.id,
      tipo: 'U',
      orientacaoUZ: linha.orientacaoUZ,
      espessura,
      aba1,
      base,
      aba2,
      comprimento,
      largura,
      quantidade,
      percentualPerda,
      tira,
      tirasAproveitadas,
      tiraPerda,
      pesoPorPeca,
      pesoTotal,
      pesoPerda,
      pesoPerdaPorPeca
    };
  };

  const validarCampo = (id: string, campo: 'aba1' | 'aba2' | 'base', valor: string) => {
    const linha = linhasU.find(l => l.id === id);
    if (!linha) return;
    
    const espessura = parseFloat(linha.espessura);
    const valorNum = parseFloat(valor);
    
    if (!valor || isNaN(valorNum)) {
      setErrosValidacao(prev => {
        const newErrors = {...prev};
        delete newErrors[`${id}-${campo}`];
        return newErrors;
      });
      return;
    }
    
    if (!isNaN(espessura) && !isNaN(valorNum)) {
      const validacao = validarAbaMinima(espessura, valorNum);
      if (!validacao.valida && validacao.abaMinimaPermitida) {
        setErrosValidacao(prev => ({
          ...prev,
          [`${id}-${campo}`]: validacao.mensagem
        }));
        toast({
          title: `${campo === 'base' ? 'Base' : 'Aba'} inválida`,
          description: validacao.mensagem,
          variant: "destructive",
        });
      } else {
        setErrosValidacao(prev => {
          const newErrors = {...prev};
          delete newErrors[`${id}-${campo}`];
          return newErrors;
        });
      }
    }
  };

  const atualizarLinha = (id: string, campo: keyof LinhaPerfilU, valor: string | boolean) => {
    const updatedLinhas = linhasU.map(l => {
      if (l.id === id) {
        const novaLinha = { ...l, [campo]: valor };
        if (!novaLinha.assimetrico && campo === 'aba1') {
          novaLinha.aba2 = valor as string;
        }
        return novaLinha;
      }
      return l;
    });
    atualizarLinhaU(updatedLinhas);
  };

  const adicionarLinha = () => {
    const novaLinha: LinhaPerfilU = {
      id: gerarId(),
      orientacaoUZ: 'U',
      espessura: '',
      aba1: '',
      base: '',
      aba2: '',
      comprimento: '6000',
      largura: '1200',
      quantidade: '',
      percentualPerda: '103',
      assimetrico: false
    };
    atualizarLinhaU([...linhasU, novaLinha]);
    setOpenCards(prev => new Set(prev).add(novaLinha.id));
  };

  const limparLinha = (id: string) => {
    const updatedLinhas = linhasU.map(l => {
      if (l.id === id) {
        return {
          ...l,
          espessura: '',
          aba1: '',
          base: '',
          aba2: '',
          comprimento: '6000',
          largura: '1200',
          quantidade: '',
          percentualPerda: '103',
          assimetrico: false,
          orientacaoUZ: 'U' as const
        };
      }
      return l;
    });
    atualizarLinhaU(updatedLinhas);
    removerCalculo(id);
    setErrosValidacao(prev => {
      const newErrors = {...prev};
      Object.keys(newErrors).forEach(key => {
        if (key.startsWith(id)) delete newErrors[key];
      });
      return newErrors;
    });
  };

  const toggleCard = (id: string) => {
    setOpenCards(prev => {
      const newSet = new Set(prev);
      if (newSet.has(id)) {
        newSet.delete(id);
      } else {
        newSet.add(id);
      }
      return newSet;
    });
  };

  useEffect(() => {
    linhasU.forEach(linha => {
      const calculo = calcularPerfil(linha);
      if (calculo) {
        atualizarCalculo(linha.id, calculo);
      }
    });
  }, [linhasU]);

  const totalPeso = linhasU.reduce((sum, linha) => {
    const calculo = calcularPerfil(linha);
    if (!calculo) return sum;
    const pPerda = parseFloat(linha.percentualPerda) || 100;
    return sum + (calculo.pesoTotal * pPerda / 100);
  }, 0);

  const totalPerda = linhasU.reduce((sum, linha) => {
    const calculo = calcularPerfil(linha);
    return sum + (calculo?.pesoPerda || 0);
  }, 0);

  const percPerda = totalPeso > 0 ? (totalPerda / totalPeso * 100) : 0;

  const calculosPerfilU = Object.values(calculos).filter(calc => calc.tipo === 'U');

  return (
    <div className="space-y-4">
      {linhasU.map((linha, index) => {
        const calculo = calcularPerfil(linha);
        const isOpen = openCards.has(linha.id);
        const espessura = parseFloat(linha.espessura) || 0;
        const base = parseFloat(linha.base) || 0;
        const aba1 = parseFloat(linha.aba1) || 0;
        const temDadosPerfil = espessura > 0 && base > 0 && aba1 > 0;
        const verificacao = verificarPerfilUPadrao(espessura, base, aba1);
        const precoKg = temDadosPerfil ? getPreco(espessura, verificacao.isPadrao) : null;
        
        return (
          <Card key={linha.id} className="overflow-hidden">
            <Collapsible open={isOpen} onOpenChange={() => toggleCard(linha.id)}>
              <CollapsibleTrigger asChild>
                <CardHeader className="p-3 cursor-pointer hover:bg-muted/50">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-sm font-medium flex items-center gap-2">
                      Linha {index + 1}
                      {temDadosPerfil && (
                        <Badge variant={verificacao.isPadrao ? "default" : "secondary"} className="text-[10px]">
                          {verificacao.isPadrao ? 'Padrão' : 'Especial'}
                        </Badge>
                      )}
                      {calculo && (
                        <span className="text-xs font-normal text-muted-foreground">
                          ({formatarNumero(calculo.pesoTotal)} kg)
                        </span>
                      )}
                    </CardTitle>
                    <div className="flex items-center gap-2">
                      {precoKg && (
                        <span className="text-xs font-medium text-green-600">
                          {precoKg.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}/kg
                        </span>
                      )}
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          limparLinha(linha.id);
                        }}
                        className="h-7 w-7 p-0 text-destructive hover:text-destructive"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                      {isOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                    </div>
                  </div>
                </CardHeader>
              </CollapsibleTrigger>
              
              <CollapsibleContent>
                <CardContent className="p-3 pt-0 space-y-4">
                  {/* Configurações básicas */}
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <Label className="text-xs">U/Z</Label>
                      <Select 
                        value={linha.orientacaoUZ} 
                        onValueChange={(value: 'U' | 'Z') => atualizarLinha(linha.id, 'orientacaoUZ', value)}
                      >
                        <SelectTrigger className="h-9">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="U">U</SelectItem>
                          <SelectItem value="Z">Z</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="flex items-center gap-2 pt-5">
                      <Checkbox 
                        id={`sim-${linha.id}`}
                        checked={!linha.assimetrico} 
                        onCheckedChange={(checked) => atualizarLinha(linha.id, 'assimetrico', !checked)}
                      />
                      <Label htmlFor={`sim-${linha.id}`} className="text-xs">Simétrico</Label>
                    </div>
                  </div>

                  {/* Dimensões principais */}
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <Label className="text-xs">Espessura</Label>
                      <Input 
                        type="number" 
                        step="0.01" 
                        placeholder="0.00" 
                        value={linha.espessura} 
                        onChange={e => atualizarLinha(linha.id, 'espessura', e.target.value)} 
                        className="h-9"
                      />
                    </div>
                    <div>
                      <Label className="text-xs">Aba1</Label>
                      <Input 
                        type="number" 
                        placeholder="0.0" 
                        value={linha.aba1} 
                        onChange={e => atualizarLinha(linha.id, 'aba1', e.target.value)}
                        onBlur={e => validarCampo(linha.id, 'aba1', e.target.value)}
                        className={`h-9 ${errosValidacao[`${linha.id}-aba1`] ? 'border-destructive' : ''}`}
                      />
                    </div>
                    <div>
                      <Label className="text-xs">Base</Label>
                      <Input 
                        type="number" 
                        placeholder="0.0" 
                        value={linha.base} 
                        onChange={e => atualizarLinha(linha.id, 'base', e.target.value)}
                        onBlur={e => validarCampo(linha.id, 'base', e.target.value)}
                        className={`h-9 ${errosValidacao[`${linha.id}-base`] ? 'border-destructive' : ''}`}
                      />
                    </div>
                    <div>
                      <Label className="text-xs">Aba2</Label>
                      <Input 
                        type="number" 
                        placeholder="0.0" 
                        value={linha.aba2} 
                        onChange={e => atualizarLinha(linha.id, 'aba2', e.target.value)}
                        onBlur={e => validarCampo(linha.id, 'aba2', e.target.value)} 
                        className={`h-9 ${!linha.assimetrico ? 'bg-muted text-muted-foreground' : ''} ${errosValidacao[`${linha.id}-aba2`] ? 'border-destructive' : ''}`}
                        disabled={!linha.assimetrico}
                      />
                    </div>
                  </div>

                  {/* Dimensões secundárias */}
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <Label className="text-xs">Comprimento</Label>
                      <Input 
                        type="number" 
                        placeholder="6000" 
                        value={linha.comprimento} 
                        onChange={e => atualizarLinha(linha.id, 'comprimento', e.target.value)} 
                        className="h-9"
                      />
                    </div>
                    <div>
                      <Label className="text-xs">Largura</Label>
                      <Input 
                        type="number" 
                        placeholder="1200" 
                        value={linha.largura} 
                        onChange={e => atualizarLinha(linha.id, 'largura', e.target.value)} 
                        className="h-9"
                      />
                    </div>
                    <div>
                      <Label className="text-xs">Quantidade</Label>
                      <Input 
                        type="number" 
                        placeholder="0" 
                        value={linha.quantidade} 
                        onChange={e => atualizarLinha(linha.id, 'quantidade', e.target.value)} 
                        className="h-9"
                      />
                    </div>
                    <div>
                      <Label className="text-xs">% Perda</Label>
                      <Input 
                        type="number" 
                        value={linha.percentualPerda} 
                        onChange={e => atualizarLinha(linha.id, 'percentualPerda', e.target.value)} 
                        className="h-9"
                      />
                    </div>
                  </div>

                  {/* Resultados */}
                  {calculo && (
                    <div className="bg-muted/50 p-3 rounded-lg">
                      <div className="grid grid-cols-3 gap-2 text-xs">
                        <div className="text-center">
                          <div className="text-muted-foreground">Tira</div>
                          <div className="font-medium">{formatarNumero(calculo.tira)}</div>
                        </div>
                        <div className="text-center">
                          <div className="text-muted-foreground">T.Perda</div>
                          <div className="font-medium">{formatarNumero(calculo.tiraPerda)}</div>
                        </div>
                        <div className="text-center">
                          <div className="text-muted-foreground">kg/Pç</div>
                          <div className="font-medium">{formatarNumero(calculo.pesoPorPeca)}</div>
                        </div>
                        {precoKg && (
                          <div className="text-center col-span-3 pt-2 border-t mt-2">
                            <div className="text-muted-foreground">Valor Estimado</div>
                            <div className="font-medium text-green-600">
                              {(calculo.pesoTotal * precoKg).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                            </div>
                          </div>
                        )}
                        <div className="text-center col-span-3 pt-2 border-t mt-2">
                          <div className="flex justify-around">
                            <div>
                              <div className="text-muted-foreground">Peso Total</div>
                              <div className="font-medium text-primary">{formatarNumero(calculo.pesoTotal)} kg</div>
                            </div>
                            <div>
                              <div className="text-muted-foreground">Peso Perda</div>
                              <div className="font-medium text-destructive">{formatarNumero(calculo.pesoPerda)} kg</div>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </CardContent>
              </CollapsibleContent>
            </Collapsible>
          </Card>
        );
      })}

      <Button onClick={adicionarLinha} className="w-full" variant="outline">
        <Plus className="h-4 w-4 mr-2" />
        Adicionar Linha
      </Button>

      <div className="bg-primary/5 p-4 rounded-lg border border-primary/20">
        <div className="grid grid-cols-2 gap-4">
          <div className="text-center">
            <div className="text-sm text-muted-foreground">Peso Total</div>
            <div className="text-xl font-bold text-primary">{formatarNumero(totalPeso)} kg</div>
          </div>
          <div className="text-center">
            <div className="text-sm text-muted-foreground">Peso de Perda</div>
            <div className="text-xl font-bold text-destructive">{formatarNumero(totalPerda)} kg <span className="text-sm font-normal">({formatarNumero(percPerda)}%)</span></div>
          </div>
        </div>
      </div>

      <VisualizacaoChapaTiras 
        calculos={calculosPerfilU}
        tipoPerfil="Perfil U"
      />
    </div>
  );
}
