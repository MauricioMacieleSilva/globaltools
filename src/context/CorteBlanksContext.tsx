import React, { createContext, useContext, useState, ReactNode } from 'react';

export interface Peca {
  id: string;
  nome: string;
  largura: number;
  altura: number;
  quantidade: number;
}

export interface Chapa {
  largura: number;
  altura: number;
  espessura: number;
  margemSeguranca: number;
  perdaEstimada: number;
}

export interface PecaPosicionada {
  peca: Peca;
  x: number;
  y: number;
  chapaIndex: number;
}

export interface ResultadoOtimizacao {
  pecasPosicionadas: PecaPosicionada[];
  chapasUsadas: number;
  aproveitamento: number;
  areaDesperdicada: number;
  areaTotal: number;
  pesoUtilizado: number;
  pesoSobra: number;
  detalhamentoPecas: DetalhamentoPeca[];
  areaPerda: number;
  pesoPerda: number;
  aproveitamentoReal: number;
  pesoTotalComPerda: number;
}

export interface DetalhamentoPeca {
  nome: string;
  dimensoes: string;
  quantidade: number;
  pecasPorChapa: number;
  chapasNecessarias: number;
  areaTotal: number;
  aproveitamento: number;
  status: string;
}

interface CorteBlanksContextType {
  chapa: Chapa;
  pecas: Peca[];
  resultado: ResultadoOtimizacao | null;
  abaSelecionada: string;
  atualizarChapa: (chapa: Chapa) => void;
  adicionarPeca: (peca: Peca) => void;
  removerPeca: (id: string) => void;
  atualizarPeca: (id: string, peca: Peca) => void;
  executarOtimizacao: () => void;
  limparResultado: () => void;
  setAbaSelecionada: (aba: string) => void;
  calcularPesoChapa: () => number;
}

const CorteBlanksContext = createContext<CorteBlanksContextType | undefined>(undefined);

function gerarId(): string {
  return Math.random().toString(36).substr(2, 9);
}

// Densidade do aço em kg/m³
const DENSIDADE_ACO = 7850;

export function CorteBlanksProvider({ children }: { children: ReactNode }) {
  const [chapa, setChapa] = useState<Chapa>({
    largura: 1200,
    altura: 6000,
    espessura: 1,
    margemSeguranca: 0,
    perdaEstimada: 0
  });

  const [pecas, setPecas] = useState<Peca[]>([]);
  const [resultado, setResultado] = useState<ResultadoOtimizacao | null>(null);
  const [abaSelecionada, setAbaSelecionada] = useState('configuracao');

  // Função para calcular o peso da chapa automaticamente
  const calcularPesoChapa = (): number => {
    // Peso = Espessura(mm) × Largura(mm) × Altura(mm) × Densidade(kg/m³) / 1000000000
    // Dividir por 1.000.000.000 para converter mm³ para m³
    return (chapa.espessura * chapa.largura * chapa.altura * DENSIDADE_ACO) / 1000000000;
  };

  const atualizarChapa = (novaChapa: Chapa) => {
    setChapa(novaChapa);
  };

  const adicionarPeca = (peca: Peca) => {
    // Gerar nome automático se não fornecido
    let nomePeca = peca.nome;
    if (!nomePeca || nomePeca.trim() === '') {
      const proximoNumero = pecas.length + 1;
      nomePeca = `Peça ${proximoNumero}`;
    }
    
    setPecas(prev => [...prev, { ...peca, nome: nomePeca, id: gerarId() }]);
  };

  const removerPeca = (id: string) => {
    setPecas(prev => prev.filter(peca => peca.id !== id));
  };

  const atualizarPeca = (id: string, pecaAtualizada: Peca) => {
    setPecas(prev => prev.map(peca => 
      peca.id === id ? { ...pecaAtualizada, id } : peca
    ));
  };

  // Algoritmo simplificado de posicionamento Bottom-Left-Fill
  const executarOtimizacao = () => {
    if (pecas.length === 0) {
      setResultado(null);
      return;
    }

    const pecasExpandidas: Peca[] = [];
    pecas.forEach(peca => {
      for (let i = 0; i < peca.quantidade; i++) {
        pecasExpandidas.push({
          ...peca,
          id: `${peca.id}-${i}`
        });
      }
    });

    pecasExpandidas.sort((a, b) => {
      const areaA = a.largura * a.altura;
      const areaB = b.largura * b.altura;
      return areaB - areaA;
    });

    const pecasPosicionadas: PecaPosicionada[] = [];
    let chapaAtual = 0;

    const larguraUtil = chapa.largura - 2 * chapa.margemSeguranca;
    const alturaUtil = chapa.altura - 2 * chapa.margemSeguranca;

    const espacosOcupados: Array<Array<{x: number, y: number, largura: number, altura: number}>> = [[]];

    const verificarColisao = (x: number, y: number, largura: number, altura: number, chapaIndex: number): boolean => {
      const espacosChapa = espacosOcupados[chapaIndex] || [];
      
      for (const espaco of espacosChapa) {
        if (!(x >= espaco.x + espaco.largura || 
              x + largura <= espaco.x || 
              y >= espaco.y + espaco.altura || 
              y + altura <= espaco.y)) {
          return true;
        }
      }
      return false;
    };

    const encontrarPosicao = (peca: Peca, chapaIndex: number): {x: number, y: number} | null => {
      for (let y = chapa.margemSeguranca; y <= alturaUtil - peca.altura + chapa.margemSeguranca; y += 10) {
        for (let x = chapa.margemSeguranca; x <= larguraUtil - peca.largura + chapa.margemSeguranca; x += 10) {
          if (!verificarColisao(x, y, peca.largura, peca.altura, chapaIndex)) {
            return { x, y };
          }
        }
      }
      return null;
    };

    for (const peca of pecasExpandidas) {
      let posicionada = false;

      for (let tentativaChapa = chapaAtual; tentativaChapa >= 0 && !posicionada; tentativaChapa--) {
        const posicao = encontrarPosicao(peca, tentativaChapa);
        
        if (posicao) {
          pecasPosicionadas.push({
            peca,
            x: posicao.x,
            y: posicao.y,
            chapaIndex: tentativaChapa
          });

          if (!espacosOcupados[tentativaChapa]) {
            espacosOcupados[tentativaChapa] = [];
          }
          espacosOcupados[tentativaChapa].push({
            x: posicao.x,
            y: posicao.y,
            largura: peca.largura,
            altura: peca.altura
          });

          posicionada = true;
        }
      }

      if (!posicionada) {
        chapaAtual++;
        espacosOcupados[chapaAtual] = [];

        const posicao = encontrarPosicao(peca, chapaAtual);
        if (posicao) {
          pecasPosicionadas.push({
            peca,
            x: posicao.x,
            y: posicao.y,
            chapaIndex: chapaAtual
          });

          espacosOcupados[chapaAtual].push({
            x: posicao.x,
            y: posicao.y,
            largura: peca.largura,
            altura: peca.altura
          });
        }
      }
    }

    const chapasUsadas = chapaAtual + 1;
    const areaChapa = chapa.largura * chapa.altura;
    const areaTotal = chapasUsadas * areaChapa;
    const areaUtilizada = pecasPosicionadas.reduce((sum, item) => 
      sum + (item.peca.largura * item.peca.altura), 0
    );
    
    const areaPerda = areaTotal * (chapa.perdaEstimada / 100);
    const areaDesperdicada = areaTotal - areaUtilizada;
    
    const aproveitamento = areaTotal > 0 ? (areaUtilizada / areaTotal) * 100 : 0;
    
    const aproveitamentoReal = (areaTotal + areaPerda) > 0 ? (areaUtilizada / (areaTotal + areaPerda)) * 100 : 0;
    
    const pesoChapa = calcularPesoChapa();
    const densidadeMaterial = pesoChapa / areaChapa; // kg/mm²
    const pesoUtilizado = areaUtilizada * densidadeMaterial;
    const pesoSobra = areaDesperdicada * densidadeMaterial;
    const pesoPerda = areaPerda * densidadeMaterial;
    const pesoTotalComPerda = (chapasUsadas * pesoChapa) + pesoPerda;

    const detalhamentoPecas: DetalhamentoPeca[] = pecas.map(peca => {
      const areaPeca = peca.largura * peca.altura;
      
      const pecasPorLinhaLargura = Math.floor(larguraUtil / peca.largura);
      const pecasPorLinhaAltura = Math.floor(alturaUtil / peca.altura);
      const pecasPorChapa = Math.max(1, pecasPorLinhaLargura * pecasPorLinhaAltura);
      
      const chapasNecessarias = Math.ceil(peca.quantidade / pecasPorChapa);
      const areaTotal = areaPeca * peca.quantidade;
      const areaOcupadaTotal = chapasNecessarias * areaChapa;
      const aproveitamentoPeca = (areaTotal / areaOcupadaTotal) * 100;
      
      return {
        nome: peca.nome,
        dimensoes: `${peca.largura} x ${peca.altura}`,
        quantidade: peca.quantidade,
        pecasPorChapa,
        chapasNecessarias,
        areaTotal,
        aproveitamento: aproveitamentoPeca,
        status: aproveitamentoPeca > 80 ? 'Ótimo' : aproveitamentoPeca > 60 ? 'Bom' : 'Regular'
      };
    });

    setResultado({
      pecasPosicionadas,
      chapasUsadas,
      aproveitamento,
      areaDesperdicada,
      areaTotal,
      pesoUtilizado,
      pesoSobra,
      detalhamentoPecas,
      areaPerda,
      pesoPerda,
      aproveitamentoReal,
      pesoTotalComPerda
    });

    setAbaSelecionada('visualizacao');
  };

  const limparResultado = () => {
    setResultado(null);
  };

  return (
    <CorteBlanksContext.Provider
      value={{
        chapa,
        pecas,
        resultado,
        abaSelecionada,
        atualizarChapa,
        adicionarPeca,
        removerPeca,
        atualizarPeca,
        executarOtimizacao,
        limparResultado,
        setAbaSelecionada,
        calcularPesoChapa
      }}
    >
      {children}
    </CorteBlanksContext.Provider>
  );
}

export function useCorteBlanks() {
  const context = useContext(CorteBlanksContext);
  if (context === undefined) {
    throw new Error('useCorteBlanks deve ser usado dentro de um CorteBlanksProvider');
  }
  return context;
}
