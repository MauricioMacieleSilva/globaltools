
import React, { createContext, useContext, useState, ReactNode, useEffect } from 'react';
import { toast } from 'sonner';

export interface CalculoItem {
  id: string;
  tipo: 'U' | 'L' | 'U_ENRIJECIDO' | 'CARTOLA' | 'CARTOLA_ENRIJECIDO' | 'U_SEMI_ENRIJECIDO' | 'CARTOLA_SEMI_ENRIJECIDO';
  orientacaoUZ?: 'U' | 'Z';
  espessura: number;
  aba1?: number;
  aba2?: number;
  base: number;
  enrij1?: number;
  enrij2?: number;
  enrij3?: number;
  enrij4?: number;
  comprimento: number;
  largura: number;
  quantidade: number;
  percentualPerda: number;
  tira: number;
  tirasAproveitadas: number;
  tiraPerda: number;
  pesoPorPeca: number;
  pesoTotal: number;
  pesoPerda: number;
  pesoPerdaPorPeca: number; // kg/perda - peso da tira perdida por peça
}

export interface LinhaPerfilU {
  id: string;
  orientacaoUZ: 'U' | 'Z';
  espessura: string;
  aba1: string;
  base: string;
  aba2: string;
  comprimento: string;
  largura: string;
  quantidade: string;
  percentualPerda: string;
  assimetrico: boolean;
}

export interface LinhaPerfilL {
  id: string;
  espessura: string;
  aba: string;
  base: string;
  comprimento: string;
  largura: string;
  quantidade: string;
  percentualPerda: string;
}

export interface LinhaPerfilUEnrijecido {
  id: string;
  orientacaoUZ: 'U' | 'Z';
  espessura: string;
  enrij1: string;
  aba1: string;
  base: string;
  aba2: string;
  enrij2: string;
  comprimento: string;
  largura: string;
  quantidade: string;
  percentualPerda: string;
  assimetrico: boolean;
}

export interface LinhaPerfilCartola {
  id: string;
  espessura: string;
  enrij1: string;
  aba1: string;
  base: string;
  aba2: string;
  enrij3: string;
  comprimento: string;
  largura: string;
  quantidade: string;
  percentualPerda: string;
  assimetrico: boolean;
}

export interface LinhaPerfilCartolaEnrijecido {
  id: string;
  espessura: string;
  enrij1: string;
  enrij2: string;
  aba1: string;
  base: string;
  aba2: string;
  enrij3: string;
  enrij4: string;
  comprimento: string;
  largura: string;
  quantidade: string;
  percentualPerda: string;
  assimetrico: boolean;
}

export interface LinhaPerfilUSemiEnrijecido {
  id: string;
  orientacaoUZ: 'U' | 'Z';
  espessura: string;
  enrij1: string;
  aba1: string;
  base: string;
  aba2: string;
  comprimento: string;
  largura: string;
  quantidade: string;
  percentualPerda: string;
  assimetrico: boolean;
}

export interface LinhaPerfilCartolaSemiEnrijecido {
  id: string;
  espessura: string;
  enrij1: string;
  enrij2: string;
  aba1: string;
  base: string;
  aba2: string;
  enrij3: string;
  comprimento: string;
  largura: string;
  quantidade: string;
  percentualPerda: string;
  assimetrico: boolean;
}

interface ResumoGeral {
  pesoTotal: number;
  pesoTotalPerda: number;
  quantidadeTotalPecas: number;
  perdaPorTipo: Record<string, number>;
}

interface PerfilContextType {
  calculos: Record<string, CalculoItem>;
  linhasU: LinhaPerfilU[];
  linhasL: LinhaPerfilL[];
  linhasUEnrijecido: LinhaPerfilUEnrijecido[];
  linhasCartola: LinhaPerfilCartola[];
  linhasCartolaEnrijecido: LinhaPerfilCartolaEnrijecido[];
  linhasUSemiEnrijecido: LinhaPerfilUSemiEnrijecido[];
  linhasCartolaSemiEnrijecido: LinhaPerfilCartolaSemiEnrijecido[];
  adicionarCalculo: (calculo: CalculoItem) => void;
  removerCalculo: (id: string) => void;
  atualizarCalculo: (id: string, calculo: CalculoItem) => void;
  atualizarLinhaU: (linhas: LinhaPerfilU[]) => void;
  atualizarLinhaL: (linhas: LinhaPerfilL[]) => void;
  atualizarLinhaUEnrijecido: (linhas: LinhaPerfilUEnrijecido[]) => void;
  atualizarLinhaCartola: (linhas: LinhaPerfilCartola[]) => void;
  atualizarLinhaCartolaEnrijecido: (linhas: LinhaPerfilCartolaEnrijecido[]) => void;
  atualizarLinhaUSemiEnrijecido: (linhas: LinhaPerfilUSemiEnrijecido[]) => void;
  atualizarLinhaCartolaSemiEnrijecido: (linhas: LinhaPerfilCartolaSemiEnrijecido[]) => void;
  obterResumoGeral: () => ResumoGeral;
  limparCalculos: () => void;
  obterSnapshot: () => PerfilSnapshot;
  restaurarSnapshot: (snapshot: PerfilSnapshot) => void;
}

export interface PerfilSnapshot {
  calculos: Record<string, CalculoItem>;
  linhasU: LinhaPerfilU[];
  linhasL: LinhaPerfilL[];
  linhasUEnrijecido: LinhaPerfilUEnrijecido[];
  linhasCartola: LinhaPerfilCartola[];
  linhasCartolaEnrijecido: LinhaPerfilCartolaEnrijecido[];
  linhasUSemiEnrijecido: LinhaPerfilUSemiEnrijecido[];
  linhasCartolaSemiEnrijecido: LinhaPerfilCartolaSemiEnrijecido[];
}

const PerfilContext = createContext<PerfilContextType | undefined>(undefined);

function gerarId(): string {
  return Math.random().toString(36).substr(2, 9);
}

function criarLinhasIniciaisU(): LinhaPerfilU[] {
  return Array(3).fill(null).map(() => ({
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
}

function criarLinhasIniciaisL(): LinhaPerfilL[] {
  return Array(3).fill(null).map(() => ({
    id: gerarId(),
    espessura: '',
    aba: '',
    base: '',
    comprimento: '6000',
    largura: '1200',
    quantidade: '',
    percentualPerda: '103'
  }));
}

function criarLinhasIniciaisUEnrijecido(): LinhaPerfilUEnrijecido[] {
  return Array(3).fill(null).map(() => ({
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
    percentualPerda: '103',
    assimetrico: false
  }));
}

function criarLinhasIniciaisCartola(): LinhaPerfilCartola[] {
  return Array(3).fill(null).map(() => ({
    id: gerarId(),
    espessura: '',
    enrij1: '',
    aba1: '',
    base: '',
    aba2: '',
    enrij3: '',
    comprimento: '6000',
    largura: '1200',
    quantidade: '',
    percentualPerda: '103',
    assimetrico: false
  }));
}

function criarLinhasIniciaisCartolaEnrijecido(): LinhaPerfilCartolaEnrijecido[] {
  return Array(3).fill(null).map(() => ({
    id: gerarId(),
    espessura: '',
    enrij1: '',
    enrij2: '',
    aba1: '',
    base: '',
    aba2: '',
    enrij3: '',
    enrij4: '',
    comprimento: '6000',
    largura: '1200',
    quantidade: '',
    percentualPerda: '103',
    assimetrico: false
  }));
}

function criarLinhasIniciaisUSemiEnrijecido(): LinhaPerfilUSemiEnrijecido[] {
  return Array(3).fill(null).map(() => ({
    id: gerarId(),
    orientacaoUZ: 'U' as const,
    espessura: '',
    enrij1: '',
    aba1: '',
    base: '',
    aba2: '',
    comprimento: '6000',
    largura: '1200',
    quantidade: '',
    percentualPerda: '103',
    assimetrico: false
  }));
}

function criarLinhasIniciaisCartolaSemiEnrijecido(): LinhaPerfilCartolaSemiEnrijecido[] {
  return Array(3).fill(null).map(() => ({
    id: gerarId(),
    espessura: '',
    enrij1: '',
    enrij2: '',
    aba1: '',
    base: '',
    aba2: '',
    enrij3: '',
    comprimento: '6000',
    largura: '1200',
    quantidade: '',
    percentualPerda: '103',
    assimetrico: false
  }));
}

const STORAGE_KEY = 'corte-perfil-data';

export function PerfilProvider({ children }: { children: ReactNode }) {
  const carregarDados = () => {
    try {
      const dadosSalvos = localStorage.getItem(STORAGE_KEY);
      if (dadosSalvos) {
        const dadosParseados = JSON.parse(dadosSalvos);

        // Migrar dados antigos com percentualPerda '101' para o novo padrão '103'
        const normalizarPercentualPerda = <T extends { percentualPerda?: string }>(linhas?: T[]): T[] | undefined => {
          if (!linhas) return linhas;
          return linhas.map(linha =>
            linha.percentualPerda === '101'
              ? { ...linha, percentualPerda: '103' }
              : linha
          );
        };

        return {
          ...dadosParseados,
          linhasU: normalizarPercentualPerda(dadosParseados.linhasU),
          linhasL: normalizarPercentualPerda(dadosParseados.linhasL),
          linhasUEnrijecido: normalizarPercentualPerda(dadosParseados.linhasUEnrijecido),
          linhasCartola: normalizarPercentualPerda(dadosParseados.linhasCartola),
          linhasCartolaEnrijecido: normalizarPercentualPerda(dadosParseados.linhasCartolaEnrijecido),
          linhasUSemiEnrijecido: normalizarPercentualPerda(dadosParseados.linhasUSemiEnrijecido),
          linhasCartolaSemiEnrijecido: normalizarPercentualPerda(dadosParseados.linhasCartolaSemiEnrijecido),
        };
      }
    } catch (error) {
      console.error('Erro ao carregar dados:', error);
    }
    return null;
  };

  const dadosIniciais = carregarDados();

  const [calculos, setCalculos] = useState<Record<string, CalculoItem>>(dadosIniciais?.calculos || {});
  const [linhasU, setLinhasU] = useState<LinhaPerfilU[]>(dadosIniciais?.linhasU || criarLinhasIniciaisU());
  const [linhasL, setLinhasL] = useState<LinhaPerfilL[]>(dadosIniciais?.linhasL || criarLinhasIniciaisL());
  const [linhasUEnrijecido, setLinhasUEnrijecido] = useState<LinhaPerfilUEnrijecido[]>(dadosIniciais?.linhasUEnrijecido || criarLinhasIniciaisUEnrijecido());
  const [linhasCartola, setLinhasCartola] = useState<LinhaPerfilCartola[]>(dadosIniciais?.linhasCartola || criarLinhasIniciaisCartola());
  const [linhasCartolaEnrijecido, setLinhasCartolaEnrijecido] = useState<LinhaPerfilCartolaEnrijecido[]>(dadosIniciais?.linhasCartolaEnrijecido || criarLinhasIniciaisCartolaEnrijecido());
  const [linhasUSemiEnrijecido, setLinhasUSemiEnrijecido] = useState<LinhaPerfilUSemiEnrijecido[]>(dadosIniciais?.linhasUSemiEnrijecido || criarLinhasIniciaisUSemiEnrijecido());
  const [linhasCartolaSemiEnrijecido, setLinhasCartolaSemiEnrijecido] = useState<LinhaPerfilCartolaSemiEnrijecido[]>(dadosIniciais?.linhasCartolaSemiEnrijecido || criarLinhasIniciaisCartolaSemiEnrijecido());

  // Salvar dados automaticamente com debounce
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      try {
        const dados = {
          calculos,
          linhasU,
          linhasL,
          linhasUEnrijecido,
          linhasCartola,
          linhasCartolaEnrijecido,
          linhasUSemiEnrijecido,
          linhasCartolaSemiEnrijecido,
          timestamp: new Date().toISOString()
        };
        localStorage.setItem(STORAGE_KEY, JSON.stringify(dados));
      } catch (error) {
        console.error('Erro ao salvar dados:', error);
      }
    }, 500);

    return () => clearTimeout(timeoutId);
  }, [calculos, linhasU, linhasL, linhasUEnrijecido, linhasCartola, linhasCartolaEnrijecido, linhasUSemiEnrijecido, linhasCartolaSemiEnrijecido]);

  const adicionarCalculo = (calculo: CalculoItem) => {
    setCalculos(prev => ({
      ...prev,
      [calculo.id]: calculo
    }));
  };

  const removerCalculo = (id: string) => {
    setCalculos(prev => {
      const newCalculos = { ...prev };
      delete newCalculos[id];
      return newCalculos;
    });
  };

  const atualizarCalculo = (id: string, calculo: CalculoItem) => {
    setCalculos(prev => ({
      ...prev,
      [id]: calculo
    }));
  };

  const atualizarLinhaU = (linhas: LinhaPerfilU[]) => {
    setLinhasU(linhas);
  };

  const atualizarLinhaL = (linhas: LinhaPerfilL[]) => {
    setLinhasL(linhas);
  };

  const atualizarLinhaUEnrijecido = (linhas: LinhaPerfilUEnrijecido[]) => {
    setLinhasUEnrijecido(linhas);
  };

  const atualizarLinhaCartola = (linhas: LinhaPerfilCartola[]) => {
    setLinhasCartola(linhas);
  };

  const atualizarLinhaCartolaEnrijecido = (linhas: LinhaPerfilCartolaEnrijecido[]) => {
    setLinhasCartolaEnrijecido(linhas);
  };

  const atualizarLinhaUSemiEnrijecido = (linhas: LinhaPerfilUSemiEnrijecido[]) => {
    setLinhasUSemiEnrijecido(linhas);
  };

  const atualizarLinhaCartolaSemiEnrijecido = (linhas: LinhaPerfilCartolaSemiEnrijecido[]) => {
    setLinhasCartolaSemiEnrijecido(linhas);
  };


  const obterResumoGeral = (): ResumoGeral => {
    const calculosArray = Object.values(calculos);
    const pesoTotal = calculosArray.reduce((sum, calc) => sum + calc.pesoTotal, 0);
    const pesoTotalPerda = calculosArray.reduce((sum, calc) => sum + calc.pesoPerda, 0);
    const quantidadeTotalPecas = calculosArray.reduce((sum, calc) => sum + calc.quantidade, 0);
    
    const perdaPorTipo = calculosArray.reduce((acc, calc) => {
      acc[calc.tipo] = (acc[calc.tipo] || 0) + calc.pesoPerda;
      return acc;
    }, {} as Record<string, number>);

    return {
      pesoTotal,
      pesoTotalPerda,
      quantidadeTotalPecas,
      perdaPorTipo
    };
  };

  const limparCalculos = () => {
    setCalculos({});
    setLinhasU(criarLinhasIniciaisU());
    setLinhasL(criarLinhasIniciaisL());
    setLinhasUEnrijecido(criarLinhasIniciaisUEnrijecido());
    setLinhasCartola(criarLinhasIniciaisCartola());
    setLinhasCartolaEnrijecido(criarLinhasIniciaisCartolaEnrijecido());
    setLinhasUSemiEnrijecido(criarLinhasIniciaisUSemiEnrijecido());
    setLinhasCartolaSemiEnrijecido(criarLinhasIniciaisCartolaSemiEnrijecido());
    localStorage.removeItem(STORAGE_KEY);
    toast.success('Todos os dados foram limpos');
  };

  return (
    <PerfilContext.Provider
      value={{
        calculos,
        linhasU,
        linhasL,
        linhasUEnrijecido,
        linhasCartola,
        linhasCartolaEnrijecido,
        linhasUSemiEnrijecido,
        linhasCartolaSemiEnrijecido,
        adicionarCalculo,
        removerCalculo,
        atualizarCalculo,
        atualizarLinhaU,
        atualizarLinhaL,
        atualizarLinhaUEnrijecido,
        atualizarLinhaCartola,
        atualizarLinhaCartolaEnrijecido,
        atualizarLinhaUSemiEnrijecido,
        atualizarLinhaCartolaSemiEnrijecido,
        obterResumoGeral,
        limparCalculos
      }}
    >
      {children}
    </PerfilContext.Provider>
  );
}

export function usePerfilContext() {
  const context = useContext(PerfilContext);
  if (context === undefined) {
    throw new Error('usePerfilContext deve ser usado dentro de um PerfilProvider');
  }
  return context;
}
