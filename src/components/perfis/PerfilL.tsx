import React, { useState, useEffect } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Plus, Trash2 } from 'lucide-react';
import { usePerfilContext, CalculoItem, LinhaPerfilL } from '@/context/PerfilContext';
import { formatarNumero, gerarId, validarAbaMinima } from '@/lib/utils-perfil';
import { VisualizacaoPerfilPopover } from './VisualizacaoPerfilPopover';
import { useToast } from '@/hooks/use-toast';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { IndicadorEstoqueDisponibilidade } from '@/components/estoque';

export function PerfilL() {
  const {
    atualizarCalculo,
    removerCalculo,
    linhasL,
    atualizarLinhaL,
    calculos
  } = usePerfilContext();
  
  const { toast } = useToast();
  const [errosValidacao, setErrosValidacao] = useState<Record<string, string>>({});

  React.useEffect(() => {
    if (linhasL.length === 0) {
      const linhasIniciais = Array.from({
        length: 3
      }, () => ({
        id: gerarId(),
        espessura: '',
        aba: '',
        base: '',
        comprimento: '6000',
        largura: '1200',
        quantidade: '',
        percentualPerda: '103'
      }));
      atualizarLinhaL(linhasIniciais);
    }
  }, [linhasL.length, atualizarLinhaL]);

  const calcularPerfil = (linha: LinhaPerfilL): CalculoItem | null => {
    const temErro = Object.keys(errosValidacao).some(key => key.startsWith(linha.id));
    if (temErro) {
      return null;
    }

    const espessura = parseFloat(linha.espessura) || 0;
    const aba = parseFloat(linha.aba) || 0;
    const base = parseFloat(linha.base) || 0;
    const comprimento = parseFloat(linha.comprimento) || 0;
    const largura = parseFloat(linha.largura) || 0;
    const quantidade = parseInt(linha.quantidade) || 0;
    const percentualPerda = parseFloat(linha.percentualPerda) || 0;

    if (espessura <= 0 || aba <= 0 || base <= 0 || comprimento <= 0 || largura <= 0 || quantidade <= 0) {
      return null;
    }

    const tira = aba + base - (2 * espessura);
    const tirasAproveitadas = Math.floor(largura / tira);
    const tiraPerda = largura - (tirasAproveitadas * tira);
    const pesoPorPeca = (espessura * comprimento / 1000) * (tira / 1000) * 8;
    const pesoTotal = quantidade * pesoPorPeca;
    const pesoPerda = pesoTotal * (percentualPerda / 100);
    const pesoPerdaPorPeca = (espessura * comprimento / 1000) * (tiraPerda / 1000) * 8;

    return {
      id: linha.id,
      tipo: 'L',
      espessura,
      aba1: aba,
      base,
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

  const validarCampo = (id: string, campo: 'aba' | 'base', valor: string) => {
    const linha = linhasL.find(l => l.id === id);
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
          title: `${campo === 'aba' ? 'Aba' : 'Base'} inválida`,
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

  const atualizarLinha = (id: string, campo: keyof LinhaPerfilL, valor: string) => {
    const updatedLinhas = linhasL.map(l => l.id === id ? {
      ...l,
      [campo]: valor
    } : l);
    atualizarLinhaL(updatedLinhas);
  };

  const adicionarLinha = () => {
    const novaLinha: LinhaPerfilL = {
      id: gerarId(),
      espessura: '',
      aba: '',
      base: '',
      comprimento: '6000',
      largura: '1200',
      quantidade: '',
      percentualPerda: '101'
    };
    atualizarLinhaL([...linhasL, novaLinha]);
  };

  const limparLinha = (id: string) => {
    const updatedLinhas = linhasL.map(l => {
      if (l.id === id) {
        return {
          ...l,
          espessura: '',
          aba: '',
          base: '',
          comprimento: '6000',
          largura: '1200',
          quantidade: '',
          percentualPerda: '101'
        };
      }
      return l;
    });
    atualizarLinhaL(updatedLinhas);
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
    linhasL.forEach(linha => {
      const calculo = calcularPerfil(linha);
      if (calculo) {
        atualizarCalculo(linha.id, calculo);
      }
    });
  }, [linhasL]);

  const totalPeso = linhasL.reduce((sum, linha) => {
    const calculo = calcularPerfil(linha);
    return sum + (calculo?.pesoTotal || 0);
  }, 0);

  const totalPerda = linhasL.reduce((sum, linha) => {
    const calculo = calcularPerfil(linha);
    return sum + ((calculo?.pesoPerdaPorPeca || 0) * (calculo?.quantidade || 0));
  }, 0);

  const headers = ['Esp.', 'Aba', 'Base', 'Comp.', 'Larg.', 'Qt.', '%P', 'Tira', 'T.Prd', 'kg/Pç', 'kg/Prd', 'P.T', 'P.+', 'Est', 'Ver', 'Ação'];

  return (
    <div className="space-y-4">
      <div className="grid gap-1 text-[10px] font-medium text-muted-foreground border-b pb-2" style={{ gridTemplateColumns: 'repeat(16, minmax(0, 1fr))' }}>
        {headers.map((h, i) => (
          <div key={i} className="text-center">
            {h}
          </div>
        ))}
      </div>

      <div className="space-y-2">
        {linhasL.map(linha => {
          const calculo = calcularPerfil(linha);
          const espessura = parseFloat(linha.espessura) || 0;
          const base = parseFloat(linha.base) || 0;
          const aba = parseFloat(linha.aba) || 0;
          
          return (
            <div key={linha.id} className="grid gap-1 items-center p-1.5 bg-background rounded border" style={{ gridTemplateColumns: 'repeat(16, minmax(0, 1fr))' }}>
              <Input type="number" step="0.01" placeholder="0" value={linha.espessura} onChange={e => atualizarLinha(linha.id, 'espessura', e.target.value)} className="text-center text-[10px] h-7 px-1" />
              
              <TooltipProvider>
                <Tooltip open={!!errosValidacao[`${linha.id}-aba`]} delayDuration={0}>
                  <TooltipTrigger asChild>
                    <Input 
                      type="number" 
                      placeholder="0" 
                      value={linha.aba} 
                      onChange={e => atualizarLinha(linha.id, 'aba', e.target.value)} 
                      onBlur={e => validarCampo(linha.id, 'aba', e.target.value)}
                      className={`text-center text-[10px] h-7 px-1 ${errosValidacao[`${linha.id}-aba`] ? 'border-destructive' : ''}`}
                    />
                  </TooltipTrigger>
                  {errosValidacao[`${linha.id}-aba`] && (
                    <TooltipContent side="top" className="bg-destructive text-destructive-foreground max-w-[200px]">
                      <p className="text-[10px]">{errosValidacao[`${linha.id}-aba`]}</p>
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
              
              <Input type="number" placeholder="6000" value={linha.comprimento} onChange={e => atualizarLinha(linha.id, 'comprimento', e.target.value)} className="text-center text-[10px] h-7 px-1" />
              <Input type="number" placeholder="1200" value={linha.largura} onChange={e => atualizarLinha(linha.id, 'largura', e.target.value)} className="text-center text-[10px] h-7 px-1" />
              <Input type="number" placeholder="0" value={linha.quantidade} onChange={e => atualizarLinha(linha.id, 'quantidade', e.target.value)} className="text-center text-[10px] h-7 px-1" />
              <Input type="number" value={linha.percentualPerda} onChange={e => atualizarLinha(linha.id, 'percentualPerda', e.target.value)} className="text-center text-[10px] h-7 px-1" />
              
              <div className="text-center text-[10px] text-muted-foreground">{calculo ? Math.ceil(calculo.tira) : '-'}</div>
              <div className="text-center text-[10px] text-muted-foreground">{calculo ? Math.ceil(calculo.tiraPerda) : '-'}</div>
              <div className="text-center text-[10px] text-muted-foreground">{calculo ? formatarNumero(calculo.pesoPorPeca) : '-'}</div>
              <div className="text-center text-[10px] text-muted-foreground">{calculo ? formatarNumero(calculo.pesoPerdaPorPeca) : '-'}</div>
              <div className="text-center text-[10px] font-medium text-primary">{calculo ? formatarNumero(calculo.pesoTotal) : '-'}</div>
              <div className="text-center text-[10px] font-medium text-destructive">{calculo ? formatarNumero(calculo.pesoPerda) : '-'}</div>
              
              <IndicadorEstoqueDisponibilidade
                tipoPerfil="L"
                espessura={espessura}
                base={base}
                aba1={aba}
              />
              
              <div className="flex justify-center">
                {calculo ? (
                  <VisualizacaoPerfilPopover calculo={calculo} tipoPerfil="Perfil L" />
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

      <Button onClick={adicionarLinha} className="w-full" variant="outline" size="sm">
        <Plus className="h-3 w-3 mr-1" />
        Adicionar Linha
      </Button>

      <div className="bg-primary/5 p-3 rounded-lg border border-primary/20">
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
