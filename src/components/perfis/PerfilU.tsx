import React, { useState, useEffect } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, Trash2 } from 'lucide-react';
import { usePerfilContext, CalculoItem, LinhaPerfilU } from '@/context/PerfilContext';
import { formatarNumero, gerarId, validarAbaMinima } from '@/lib/utils-perfil';
import { verificarPerfilUPadrao } from '@/lib/perfil-padrao-utils';
import { IndicadorPerfilPadrao } from './IndicadorPerfilPadrao';
import { VisualizacaoPerfilPopover } from './VisualizacaoPerfilPopover';
import { useToast } from '@/hooks/use-toast';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { useIsMobile } from '@/hooks/use-mobile';
import { PerfilUMobile } from './PerfilUMobile';
import { IndicadorEstoqueDisponibilidade } from '@/components/estoque';

export function PerfilU() {
  const isMobile = useIsMobile();
  
  if (isMobile) {
    return <PerfilUMobile />;
  }
  
  return <PerfilUDesktop />;
}

function PerfilUDesktop() {
  const {
    atualizarCalculo,
    removerCalculo,
    linhasU,
    atualizarLinhaU,
    calculos
  } = usePerfilContext();
  
  const { toast } = useToast();
  const [errosValidacao, setErrosValidacao] = useState<Record<string, string>>({});

  React.useEffect(() => {
    if (linhasU.length === 0) {
      const linhasIniciais = Array.from({
        length: 3
      }, () => ({
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
    const pesoPerda = pesoTotal * (percentualPerda / 100);
    const pesoPerdaPorPeca = (espessura * comprimento / 1000) * (tiraPerda / 1000) * 8;

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
      percentualPerda: '101',
      assimetrico: false
    };
    atualizarLinhaU([...linhasU, novaLinha]);
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
        if (key.startsWith(id)) {
          delete newErrors[key];
        }
      });
      return newErrors;
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
    return sum + (calculo?.pesoTotal || 0);
  }, 0);

  const totalPerda = linhasU.reduce((sum, linha) => {
    const calculo = calcularPerfil(linha);
    return sum + ((calculo?.pesoPerdaPorPeca || 0) * (calculo?.quantidade || 0));
  }, 0);

  const headers = ['U/Z', 'Sim', 'Esp.', 'Aba1', 'Base', 'Aba2', 'Comp.', 'Larg.', 'Qt.', '%P', 'Tira', 'T.Prd', 'kg/Pç', 'kg/Prd', 'P.T', 'P.+', 'Tipo', 'Est', 'Ver', 'Ação'];

  return (
    <div className="space-y-4">
      <div className="grid gap-1 text-[10px] font-medium text-muted-foreground border-b pb-2" style={{ gridTemplateColumns: 'repeat(20, minmax(0, 1fr))' }} data-tour="perfil-headers">
        {headers.map((h, i) => (
          <div key={i} className="text-center">
            {h}
          </div>
        ))}
      </div>

      <div className="space-y-2">
        {linhasU.map(linha => {
          const calculo = calcularPerfil(linha);
          const espessura = parseFloat(linha.espessura) || 0;
          const base = parseFloat(linha.base) || 0;
          const aba1 = parseFloat(linha.aba1) || 0;
          const temDadosPerfil = espessura > 0 && base > 0 && aba1 > 0;
          const verificacao = verificarPerfilUPadrao(espessura, base, aba1);
          
          const isFirstLine = linhasU.indexOf(linha) === 0;
          return (
            <div key={linha.id} className="grid gap-1 items-center p-1.5 bg-background rounded border" style={{ gridTemplateColumns: 'repeat(20, minmax(0, 1fr))' }} data-tour={isFirstLine ? "perfil-linha" : undefined}>
              <Select value={linha.orientacaoUZ} onValueChange={(value: 'U' | 'Z') => atualizarLinha(linha.id, 'orientacaoUZ', value)}>
                <SelectTrigger className="h-7 text-[10px] px-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="z-50">
                  <SelectItem value="U">U</SelectItem>
                  <SelectItem value="Z">Z</SelectItem>
                </SelectContent>
              </Select>
              
              <div className="flex justify-center" data-tour={isFirstLine ? "perfil-simetrico" : undefined}>
                <Checkbox 
                  checked={!linha.assimetrico} 
                  onCheckedChange={(checked) => atualizarLinha(linha.id, 'assimetrico', !checked)}
                  className="h-4 w-4"
                />
              </div>
              
              <Input type="number" step="0.01" placeholder="0" value={linha.espessura} onChange={e => atualizarLinha(linha.id, 'espessura', e.target.value)} className="text-center text-[10px] h-7 px-1" />
              
              <TooltipProvider>
                <Tooltip open={!!errosValidacao[`${linha.id}-aba1`]} delayDuration={0}>
                  <TooltipTrigger asChild>
                    <Input 
                      type="number" 
                      placeholder="0" 
                      value={linha.aba1} 
                      onChange={e => atualizarLinha(linha.id, 'aba1', e.target.value)}
                      onBlur={e => validarCampo(linha.id, 'aba1', e.target.value)}
                      className={`text-center text-[10px] h-7 px-1 ${errosValidacao[`${linha.id}-aba1`] ? 'border-destructive' : ''}`}
                    />
                  </TooltipTrigger>
                  {errosValidacao[`${linha.id}-aba1`] && (
                    <TooltipContent side="top" className="bg-destructive text-destructive-foreground max-w-[200px]">
                      <p className="text-[10px]">{errosValidacao[`${linha.id}-aba1`]}</p>
                    </TooltipContent>
                  )}
                </Tooltip>
              </TooltipProvider>
              
              <TooltipProvider>
                <Tooltip open={!!errosValidacao[`${linha.id}-base`]} delayDuration={0}>
                  <TooltipTrigger asChild>
                    <Input 
                      type="number" 
                      placeholder="0" 
                      value={linha.base} 
                      onChange={e => atualizarLinha(linha.id, 'base', e.target.value)}
                      onBlur={e => validarCampo(linha.id, 'base', e.target.value)}
                      className={`text-center text-[10px] h-7 px-1 ${errosValidacao[`${linha.id}-base`] ? 'border-destructive' : ''}`}
                    />
                  </TooltipTrigger>
                  {errosValidacao[`${linha.id}-base`] && (
                    <TooltipContent side="top" className="bg-destructive text-destructive-foreground max-w-[200px]">
                      <p className="text-[10px]">{errosValidacao[`${linha.id}-base`]}</p>
                    </TooltipContent>
                  )}
                </Tooltip>
              </TooltipProvider>
              
              <TooltipProvider>
                <Tooltip open={!!errosValidacao[`${linha.id}-aba2`]} delayDuration={0}>
                  <TooltipTrigger asChild>
                    <Input 
                      type="number" 
                      placeholder="0" 
                      value={linha.aba2} 
                      onChange={e => atualizarLinha(linha.id, 'aba2', e.target.value)}
                      onBlur={e => validarCampo(linha.id, 'aba2', e.target.value)} 
                      className={`text-center text-[10px] h-7 px-1 ${!linha.assimetrico ? 'bg-muted text-muted-foreground' : ''} ${errosValidacao[`${linha.id}-aba2`] ? 'border-destructive' : ''}`}
                      disabled={!linha.assimetrico}
                    />
                  </TooltipTrigger>
                  {errosValidacao[`${linha.id}-aba2`] && (
                    <TooltipContent side="top" className="bg-destructive text-destructive-foreground max-w-[200px]">
                      <p className="text-[10px]">{errosValidacao[`${linha.id}-aba2`]}</p>
                    </TooltipContent>
                  )}
                </Tooltip>
              </TooltipProvider>
              
              <Input type="number" placeholder="6000" value={linha.comprimento} onChange={e => atualizarLinha(linha.id, 'comprimento', e.target.value)} className="text-center text-[10px] h-7 px-1" />
              <Input type="number" placeholder="1200" value={linha.largura} onChange={e => atualizarLinha(linha.id, 'largura', e.target.value)} className="text-center text-[10px] h-7 px-1" />
              <Input type="number" placeholder="0" value={linha.quantidade} onChange={e => atualizarLinha(linha.id, 'quantidade', e.target.value)} className="text-center text-[10px] h-7 px-1" />
              <Input type="number" value={linha.percentualPerda} onChange={e => atualizarLinha(linha.id, 'percentualPerda', e.target.value)} className="text-center text-[10px] h-7 px-1" />
              
              <div className="text-center text-[10px] text-muted-foreground" data-tour={isFirstLine ? "perfil-resultados" : undefined}>{calculo ? Math.ceil(calculo.tira) : '-'}</div>
              <div className="text-center text-[10px] text-muted-foreground">{calculo ? Math.ceil(calculo.tiraPerda) : '-'}</div>
              <div className="text-center text-[10px] text-muted-foreground">{calculo ? formatarNumero(calculo.pesoPorPeca) : '-'}</div>
              <div className="text-center text-[10px] text-muted-foreground">{calculo ? formatarNumero(calculo.pesoPerdaPorPeca) : '-'}</div>
              <div className="text-center text-[10px] font-medium text-primary">{calculo ? formatarNumero(calculo.pesoTotal) : '-'}</div>
              <div className="text-center text-[10px] font-medium text-destructive">{calculo ? formatarNumero(calculo.pesoPerda) : '-'}</div>
              
              <div data-tour={isFirstLine ? "perfil-tipo-indicador" : undefined}>
                <IndicadorPerfilPadrao isPadrao={verificacao.isPadrao} temDados={temDadosPerfil} />
              </div>
              
              <div data-tour={isFirstLine ? "perfil-estoque" : undefined}>
                <IndicadorEstoqueDisponibilidade
                  tipoPerfil={linha.orientacaoUZ}
                  espessura={espessura}
                  base={base}
                  aba1={aba1}
                  aba2={parseFloat(linha.aba2) || undefined}
                />
              </div>
              
              <div className="flex justify-center" data-tour={isFirstLine ? "perfil-visualizacao" : undefined}>
                {calculo ? (
                  <VisualizacaoPerfilPopover calculo={calculo} tipoPerfil="Perfil U" />
                ) : (
                  <span className="text-muted-foreground text-[10px]">-</span>
                )}
              </div>
              
              <div className="flex justify-center">
                <Button variant="ghost" size="sm" onClick={() => limparLinha(linha.id)} className="h-6 w-6 p-0 hover:bg-destructive/10 hover:text-destructive">
                  <Trash2 className="h-3 w-3" />
                </Button>
              </div>
            </div>
          );
        })}
      </div>

      <Button onClick={adicionarLinha} className="w-full" variant="outline" size="sm" data-tour="perfil-adicionar">
        <Plus className="h-3 w-3 mr-1" />
        Adicionar Linha
      </Button>

      <div className="bg-primary/5 p-3 rounded-lg border border-primary/20" data-tour="perfil-totais">
        <div className="grid grid-cols-2 gap-4">
          <div className="text-center">
            <div className="text-xs text-muted-foreground">Peso Total</div>
            <div className="text-lg font-bold text-primary">{formatarNumero(totalPeso)} kg</div>
          </div>
          <div className="text-center">
            <div className="text-xs text-muted-foreground">Peso de Perda</div>
            <div className="text-lg font-bold text-destructive">{formatarNumero(totalPerda)} kg</div>
          </div>
        </div>
      </div>
    </div>
  );
}
