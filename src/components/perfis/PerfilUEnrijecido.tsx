import React, { useState, useEffect } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, Trash2 } from 'lucide-react';
import { usePerfilContext, CalculoItem, LinhaPerfilUEnrijecido } from '@/context/PerfilContext';
import { formatarNumero, gerarId, validarAbaMinima } from '@/lib/utils-perfil';
import { verificarPerfilUEPadrao } from '@/lib/perfil-padrao-utils';
import { IndicadorPerfilPadrao } from './IndicadorPerfilPadrao';
import { VisualizacaoPerfilPopover } from './VisualizacaoPerfilPopover';
import { useToast } from '@/hooks/use-toast';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { usePerfilPreco } from '@/hooks/usePerfilPreco';

export function PerfilUEnrijecido() {
  const {
    atualizarCalculo,
    removerCalculo,
    linhasUEnrijecido,
    atualizarLinhaUEnrijecido,
    calculos
  } = usePerfilContext();
  
  const { toast } = useToast();
  const [errosValidacao, setErrosValidacao] = useState<Record<string, string>>({});
  const { getPreco, loading: loadingPrecos } = usePerfilPreco();

  React.useEffect(() => {
    if (linhasUEnrijecido.length === 0) {
      const linhasIniciais = Array.from({
        length: 3
      }, () => ({
        id: gerarId(),
        orientacaoUZ: 'U' as const,
        espessura: '',
        enrij1: '',
        aba1: '',
        base: '',
        aba2: '',
        enrij2: '',
        comprimento: '6000',
        largura: '1200',
        quantidade: '',
        percentualPerda: '101',
        assimetrico: false
      }));
      atualizarLinhaUEnrijecido(linhasIniciais);
    }
  }, [linhasUEnrijecido.length, atualizarLinhaUEnrijecido]);

  const calcularPerfil = (linha: LinhaPerfilUEnrijecido): CalculoItem | null => {
    const temErro = Object.keys(errosValidacao).some(key => key.startsWith(linha.id));
    if (temErro) return null;

    const espessura = parseFloat(linha.espessura) || 0;
    const enrij1 = parseFloat(linha.enrij1) || 0;
    const aba1 = parseFloat(linha.aba1) || 0;
    const base = parseFloat(linha.base) || 0;
    const aba2 = parseFloat(linha.aba2) || 0;
    const enrij2 = parseFloat(linha.enrij2) || 0;
    const comprimento = parseFloat(linha.comprimento) || 0;
    const largura = parseFloat(linha.largura) || 0;
    const quantidade = parseInt(linha.quantidade) || 0;
    const percentualPerda = parseFloat(linha.percentualPerda) || 0;

    if (espessura <= 0 || enrij1 <= 0 || aba1 <= 0 || base <= 0 || aba2 <= 0 || enrij2 <= 0 || comprimento <= 0 || largura <= 0 || quantidade <= 0) {
      return null;
    }

    // Tira = Enrij1 + Aba1 + Base + Aba2 + Enrij2 – (2 × Espessura × 4)
    const tira = enrij1 + aba1 + base + aba2 + enrij2 - (2 * espessura * 4);
    const tirasAproveitadas = Math.floor(largura / tira);
    const tiraPerda = largura - (tirasAproveitadas * tira);
    const pesoPorPeca = (espessura * comprimento / 1000) * (tira / 1000) * 8;
    const pesoTotal = quantidade * pesoPorPeca;
    const pesoPerda = pesoTotal * (percentualPerda / 100);
    const pesoPerdaPorPeca = (espessura * comprimento / 1000) * (tiraPerda / 1000) * 8;

    return {
      id: linha.id,
      tipo: 'U_ENRIJECIDO',
      orientacaoUZ: linha.orientacaoUZ,
      espessura,
      aba1,
      base,
      aba2,
      enrij1,
      enrij2,
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

  const validarCampo = (id: string, campo: 'aba1' | 'aba2' | 'base' | 'enrij1' | 'enrij2', valor: string) => {
    const linha = linhasUEnrijecido.find(l => l.id === id);
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
          title: `${campo.includes('aba') ? 'Aba' : campo === 'base' ? 'Base' : 'Enrijecedor'} inválido`,
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

  const atualizarLinha = (id: string, campo: keyof LinhaPerfilUEnrijecido, valor: string | boolean) => {
    const updatedLinhas = linhasUEnrijecido.map(l => {
      if (l.id === id) {
        const novaLinha = { ...l, [campo]: valor };
        
        // Se não é assimétrico, espelhar Enrij1 -> Enrij2, Aba1 -> Aba2
        if (!novaLinha.assimetrico) {
          if (campo === 'enrij1') {
            novaLinha.enrij2 = valor as string;
          } else if (campo === 'aba1') {
            novaLinha.aba2 = valor as string;
          }
          // Se mudou para simétrico, espelhar os valores existentes
          else if (campo === 'assimetrico' && valor === false) {
            novaLinha.enrij2 = novaLinha.enrij1;
            novaLinha.aba2 = novaLinha.aba1;
          }
        }
        
        return novaLinha;
      }
      return l;
    });
    atualizarLinhaUEnrijecido(updatedLinhas);
  };

  const adicionarLinha = () => {
    const novaLinha: LinhaPerfilUEnrijecido = {
      id: gerarId(),
      orientacaoUZ: 'U',
      espessura: '',
      enrij1: '',
      aba1: '',
      base: '',
      aba2: '',
      enrij2: '',
      comprimento: '6000',
      largura: '1200',
      quantidade: '',
      percentualPerda: '101',
      assimetrico: false
    };
    atualizarLinhaUEnrijecido([...linhasUEnrijecido, novaLinha]);
  };

  const limparLinha = (id: string) => {
    const updatedLinhas = linhasUEnrijecido.map(l => {
      if (l.id === id) {
        return {
          ...l,
          espessura: '',
          enrij1: '',
          aba1: '',
          base: '',
          aba2: '',
          enrij2: '',
          comprimento: '6000',
          largura: '1200',
          quantidade: '',
          percentualPerda: '101',
          assimetrico: false,
          orientacaoUZ: 'U' as const
        };
      }
      return l;
    });
    atualizarLinhaUEnrijecido(updatedLinhas);
    removerCalculo(id);
    
    // Limpar erros de validação da linha
    setErrosValidacao(prev => {
      const newErrors = {...prev};
      Object.keys(newErrors).forEach(key => {
        if (key.startsWith(id)) {
          delete newErrors[key];
        }
      });
      return newErrors;
    });
  };

  const removerLinha = (id: string) => {
    if (linhasUEnrijecido.length > 3) {
      if (confirm('Tem certeza que deseja remover esta linha?')) {
        atualizarLinhaUEnrijecido(linhasUEnrijecido.filter(linha => linha.id !== id));
        removerCalculo(id);
      }
    }
  };

  useEffect(() => {
    linhasUEnrijecido.forEach(linha => {
      const calculo = calcularPerfil(linha);
      if (calculo) {
        atualizarCalculo(linha.id, calculo);
      }
    });
  }, [linhasUEnrijecido]);

  const totalPeso = linhasUEnrijecido.reduce((sum, linha) => {
    const calculo = calcularPerfil(linha);
    return sum + (calculo?.pesoTotal || 0);
  }, 0);

  const totalPerda = linhasUEnrijecido.reduce((sum, linha) => {
    const calculo = calcularPerfil(linha);
    return sum + ((calculo?.pesoPerdaPorPeca || 0) * (calculo?.quantidade || 0));
  }, 0);

  // Obter cálculos do tipo U_ENRIJECIDO para visualização
  const calculosPerfilUEnrijecido = Object.values(calculos).filter(calc => calc.tipo === 'U_ENRIJECIDO');

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-22 gap-1 text-xs font-medium text-muted-foreground border-b pb-2 overflow-x-auto">
        <div className="text-center">U/Z</div>
        <div className="text-center">Simétrico</div>
        <div className="text-center">Esp.</div>
        <div className="text-center">Enrij1</div>
        <div className="text-center">Aba1</div>
        <div className="text-center">Base</div>
        <div className="text-center">Aba2</div>
        <div className="text-center">Enrij2</div>
        <div className="text-center">Comp.</div>
        <div className="text-center">Larg.</div>
        <div className="text-center">Qt.</div>
        <div className="text-center">%P</div>
        <div className="text-center">Tira</div>
        <div className="text-center">T.Perda</div>
        <div className="text-center">kg/Pç</div>
        <div className="text-center">kg/Perda</div>
        <div className="text-center">P.T</div>
        <div className="text-center">P.+</div>
        <div className="text-center">Tipo</div>
        <div className="text-center text-green-600">R$/kg</div>
        <div className="text-center">Ver</div>
        <div className="text-center">Ações</div>
      </div>

      <div className="space-y-4">
        {linhasUEnrijecido.map(linha => {
        const calculo = calcularPerfil(linha);
        const espessura = parseFloat(linha.espessura) || 0;
        const base = parseFloat(linha.base) || 0;
        const aba1 = parseFloat(linha.aba1) || 0;
        const enrij1 = parseFloat(linha.enrij1) || 0;
        const temDadosPerfil = espessura > 0 && base > 0 && aba1 > 0 && enrij1 > 0;
        const verificacao = verificarPerfilUEPadrao(espessura, base, aba1, enrij1);
        const precoKg = temDadosPerfil ? getPreco(espessura, verificacao.isPadrao) : null;
        
        return <div key={linha.id} className="grid grid-cols-22 gap-1 items-center p-2 bg-background rounded-lg border">
              <div className="flex justify-center">
                <Select value={linha.orientacaoUZ} onValueChange={(value: 'U' | 'Z') => atualizarLinha(linha.id, 'orientacaoUZ', value)}>
                  <SelectTrigger className="w-12 h-8 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="z-50">
                    <SelectItem value="U">U</SelectItem>
                    <SelectItem value="Z">Z</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div className="flex justify-center">
                <Checkbox 
                  checked={!linha.assimetrico} 
                  onCheckedChange={(checked) => atualizarLinha(linha.id, 'assimetrico', !checked)}
                />
              </div>
              
              <Input type="number" step="0.01" placeholder="0.00" value={linha.espessura} onChange={e => atualizarLinha(linha.id, 'espessura', e.target.value)} className="text-center text-xs" />
              
              <TooltipProvider>
                <Tooltip open={!!errosValidacao[`${linha.id}-enrij1`]} delayDuration={0}>
                  <TooltipTrigger asChild>
                    <div className="w-full">
                      <Input 
                        type="number" 
                        placeholder="0.0" 
                        value={linha.enrij1} 
                        onChange={e => atualizarLinha(linha.id, 'enrij1', e.target.value)}
                        onBlur={e => validarCampo(linha.id, 'enrij1', e.target.value)}
                        className={`text-center text-xs ${errosValidacao[`${linha.id}-enrij1`] ? 'border-destructive' : ''}`}
                      />
                    </div>
                  </TooltipTrigger>
                  <TooltipContent side="top" className="bg-destructive text-destructive-foreground max-w-[250px]">
                    <p className="text-xs font-medium">{errosValidacao[`${linha.id}-enrij1`]}</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
              
              <TooltipProvider>
                <Tooltip open={!!errosValidacao[`${linha.id}-aba1`]} delayDuration={0}>
                  <TooltipTrigger asChild>
                    <div className="w-full">
                      <Input 
                        type="number" 
                        placeholder="0.0" 
                        value={linha.aba1} 
                        onChange={e => atualizarLinha(linha.id, 'aba1', e.target.value)}
                        onBlur={e => validarCampo(linha.id, 'aba1', e.target.value)}
                        className={`text-center text-xs ${errosValidacao[`${linha.id}-aba1`] ? 'border-destructive' : ''}`}
                      />
                    </div>
                  </TooltipTrigger>
                  <TooltipContent side="top" className="bg-destructive text-destructive-foreground max-w-[250px]">
                    <p className="text-xs font-medium">{errosValidacao[`${linha.id}-aba1`]}</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
              
              <TooltipProvider>
                <Tooltip open={!!errosValidacao[`${linha.id}-base`]} delayDuration={0}>
                  <TooltipTrigger asChild>
                    <div className="w-full">
                      <Input 
                        type="number" 
                        placeholder="0.0" 
                        value={linha.base} 
                        onChange={e => atualizarLinha(linha.id, 'base', e.target.value)}
                        onBlur={e => validarCampo(linha.id, 'base', e.target.value)}
                        className={`text-center text-xs ${errosValidacao[`${linha.id}-base`] ? 'border-destructive' : ''}`}
                      />
                    </div>
                  </TooltipTrigger>
                  <TooltipContent side="top" className="bg-destructive text-destructive-foreground max-w-[250px]">
                    <p className="text-xs font-medium">{errosValidacao[`${linha.id}-base`]}</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
              
              <TooltipProvider>
                <Tooltip open={!!errosValidacao[`${linha.id}-aba2`]} delayDuration={0}>
                  <TooltipTrigger asChild>
                    <div className="w-full">
                      <Input 
                        type="number" 
                        placeholder="0.0" 
                        value={linha.aba2} 
                        onChange={e => atualizarLinha(linha.id, 'aba2', e.target.value)}
                        onBlur={e => validarCampo(linha.id, 'aba2', e.target.value)} 
                        className={`text-center text-xs ${!linha.assimetrico ? 'bg-muted text-muted-foreground' : ''} ${errosValidacao[`${linha.id}-aba2`] ? 'border-destructive' : ''}`}
                        disabled={!linha.assimetrico}
                      />
                    </div>
                  </TooltipTrigger>
                  <TooltipContent side="top" className="bg-destructive text-destructive-foreground max-w-[250px]">
                    <p className="text-xs font-medium">{errosValidacao[`${linha.id}-aba2`]}</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
              
              <TooltipProvider>
                <Tooltip open={!!errosValidacao[`${linha.id}-enrij2`]} delayDuration={0}>
                  <TooltipTrigger asChild>
                    <div className="w-full">
                      <Input 
                        type="number" 
                        placeholder="0.0" 
                        value={linha.enrij2} 
                        onChange={e => atualizarLinha(linha.id, 'enrij2', e.target.value)}
                        onBlur={e => validarCampo(linha.id, 'enrij2', e.target.value)} 
                        className={`text-center text-xs ${!linha.assimetrico ? 'bg-muted text-muted-foreground' : ''} ${errosValidacao[`${linha.id}-enrij2`] ? 'border-destructive' : ''}`}
                        disabled={!linha.assimetrico}
                      />
                    </div>
                  </TooltipTrigger>
                  <TooltipContent side="top" className="bg-destructive text-destructive-foreground max-w-[250px]">
                    <p className="text-xs font-medium">{errosValidacao[`${linha.id}-enrij2`]}</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
              
              <Input type="number" placeholder="6000" value={linha.comprimento} onChange={e => atualizarLinha(linha.id, 'comprimento', e.target.value)} className="text-center text-xs" />
              
              <Input type="number" placeholder="1200" value={linha.largura} onChange={e => atualizarLinha(linha.id, 'largura', e.target.value)} className="text-center text-xs" />
              
              <Input type="number" placeholder="0" value={linha.quantidade} onChange={e => atualizarLinha(linha.id, 'quantidade', e.target.value)} className="text-center text-xs" />
              
              <Input type="number" value={linha.percentualPerda} onChange={e => atualizarLinha(linha.id, 'percentualPerda', e.target.value)} className="text-center text-xs" />
              
              <div className="text-center font-medium text-muted-foreground text-xs">
                {calculo ? Math.ceil(calculo.tira) : 0}
              </div>
              
              <div className="text-center font-medium text-muted-foreground text-xs">
                {calculo ? Math.ceil(calculo.tiraPerda) : 0}
              </div>
              
              <div className="text-center font-medium text-muted-foreground text-xs">
                {calculo ? formatarNumero(calculo.pesoPorPeca) : '0.00'}
              </div>
              
              <div className="text-center font-medium text-muted-foreground text-xs">
                {calculo ? formatarNumero(calculo.pesoPerdaPorPeca) : '0.00'}
              </div>
              
              <div className="text-center font-medium text-primary text-xs">
                {calculo ? formatarNumero(calculo.pesoTotal) : '0.00'}
              </div>
              
              <div className="text-center font-medium text-destructive text-xs">
                {calculo ? formatarNumero(calculo.pesoPerda) : '0.00'}
              </div>
              
              <IndicadorPerfilPadrao isPadrao={verificacao.isPadrao} temDados={temDadosPerfil} />
              
              <div className="text-center">
                {temDadosPerfil && precoKg ? (
                  <TooltipProvider>
                    <Tooltip delayDuration={100}>
                      <TooltipTrigger asChild>
                        <span className="text-xs font-medium text-green-600 cursor-help">
                          {precoKg.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                        </span>
                      </TooltipTrigger>
                      <TooltipContent side="top">
                        <p className="text-xs">Preço/kg para perfil {verificacao.isPadrao ? 'padrão' : 'especial'} - Esp. {espessura}mm</p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                ) : temDadosPerfil ? (
                  <span className="text-xs text-muted-foreground">-</span>
                ) : null}
              </div>
              
              <div className="flex justify-center">
                {calculo ? (
                  <VisualizacaoPerfilPopover calculo={calculo} tipoPerfil="Perfil U Enrijecido" />
                ) : (
                  <span className="text-muted-foreground">-</span>
                )}
              </div>
              
              <div className="flex justify-center">
                <Button variant="ghost" size="sm" onClick={() => limparLinha(linha.id)} className="h-6 w-6 p-0 hover:bg-destructive/10 hover:text-destructive">
                  <Trash2 className="h-3 w-3" />
                </Button>
              </div>
            </div>;
      })}
      </div>

      <Button onClick={adicionarLinha} className="w-full" variant="outline">
        <Plus className="h-4 w-4 mr-2" />
        Adicionar Linha
      </Button>

      <div className="bg-primary/5 p-4 rounded-lg border border-primary/20">
        <div className="grid grid-cols-2 gap-4">
          <div className="text-center">
            <div className="text-sm text-muted-foreground">Peso Total</div>
            <div className="text-2xl font-bold text-primary">{formatarNumero(totalPeso)} kg</div>
          </div>
          <div className="text-center">
            <div className="text-sm text-muted-foreground">Peso de Perda</div>
            <div className="text-2xl font-bold text-destructive">{formatarNumero(totalPerda)} kg</div>
          </div>
        </div>
      </div>
    </div>
  );
}