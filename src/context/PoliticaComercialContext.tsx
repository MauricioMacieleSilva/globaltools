import React, { createContext, useContext, useState, ReactNode } from 'react';
import { PoliticaComercialData } from '@/services/politicaComercialService';

export interface SimuladorData {
  precoBase: number;
  icms: number;
  peso: number;
  condicaoPagamento: string;
  financeiro: number;
  frete: number;
  descontoManual?: number;
  espessura?: number;
}

export interface ResultadoSimulacao {
  precoComIcms: number;
  desconto: number;
  precoUnitario: number;
  precoTotal: number;
  precisaAprovacao: boolean;
  precoUnitarioKg?: number;
  precoUnitarioM2?: number;
}

interface PoliticaComercialContextData {
  dados: Record<string, PoliticaComercialData[]>;
  setDados: (dados: Record<string, PoliticaComercialData[]>) => void;
  loading: boolean;
  setLoading: (loading: boolean) => void;
  simulador: SimuladorData;
  setSimulador: (simulador: SimuladorData) => void;
  calcularSimulacao: (simulador: SimuladorData) => ResultadoSimulacao;
  calcularDesconto: (peso: number) => number;
  classeAtiva: string;
  setClasseAtiva: (classe: string) => void;
}

const PoliticaComercialContext = createContext<PoliticaComercialContextData | undefined>(undefined);

export function usePoliticaComercial() {
  const context = useContext(PoliticaComercialContext);
  if (!context) {
    throw new Error('usePoliticaComercial must be used within a PoliticaComercialProvider');
  }
  return context;
}

interface PoliticaComercialProviderProps {
  children: ReactNode;
}

export function PoliticaComercialProvider({ children }: PoliticaComercialProviderProps) {
  const [dados, setDados] = useState<Record<string, PoliticaComercialData[]>>({});
  const [loading, setLoading] = useState(false);
  const [classeAtiva, setClasseAtiva] = useState('ARAMES');
  const [simulador, setSimulador] = useState<SimuladorData>({
    precoBase: 0,
    icms: 17, // Referência: 17% ICMS
    peso: 1000,
    condicaoPagamento: 'À Vista',
    financeiro: 0,
    frete: 0,
    descontoManual: undefined,
    espessura: 0.5
  });

  const calcularDesconto = (peso: number): number => {
    if (peso <= 2000) return 2; // 2%
    if (peso <= 5000) return 3; // 3%  
    if (peso <= 10000) return 4; // 4%
    return 5; // 5%
  };

  const calcularSimulacao = (sim: SimuladorData): ResultadoSimulacao => {
    // O precoBase já inclui 17% de ICMS (referência padrão)
    // Se o ICMS for diferente de 17%, recalcular proporcionalmente
    let precoComIcms: number;
    if (sim.icms === 17) {
      precoComIcms = sim.precoBase; // Usar diretamente o preço da tabela
    } else {
      const precoSemIcms = sim.precoBase / 1.17; // Remove os 17% inclusos
      precoComIcms = precoSemIcms * (1 + sim.icms / 100); // Aplica o novo ICMS
    }
    
    const precoComFinanceiro = precoComIcms + (precoComIcms * sim.financeiro / 100);
    
    // Aplicar desconto apenas se descontoManual for definido
    const descontoPercentual = sim.descontoManual !== undefined ? sim.descontoManual : 0;
    const descontoPermitido = calcularDesconto(sim.peso);
    
    const valorDesconto = precoComFinanceiro * descontoPercentual / 100;
    const precoUnitario = precoComFinanceiro - valorDesconto;
    const precoTotal = (precoUnitario * sim.peso) + sim.frete;

    // Para telhas, calcular ambos os preços
    let precoUnitarioKg: number | undefined;
    let precoUnitarioM2: number | undefined;
    
    if (classeAtiva === 'TELHAS') {
      precoUnitarioKg = precoUnitario; // Preço por KG
      // Fórmula: espessura * 1.2 * 8 * 0.96 * Preço Unitário (R$/KG)
      precoUnitarioM2 = sim.espessura ? sim.espessura * 1.2 * 8 * 0.96 * precoUnitarioKg : 0;
    }

    return {
      precoComIcms,
      desconto: descontoPercentual,
      precoUnitario,
      precoTotal,
      precisaAprovacao: sim.descontoManual !== undefined && sim.descontoManual > descontoPermitido,
      precoUnitarioKg,
      precoUnitarioM2
    };
  };

  const value: PoliticaComercialContextData = {
    dados,
    setDados,
    loading,
    setLoading,
    simulador,
    setSimulador,
    calcularSimulacao,
    calcularDesconto,
    classeAtiva,
    setClasseAtiva
  };

  return (
    <PoliticaComercialContext.Provider value={value}>
      {children}
    </PoliticaComercialContext.Provider>
  );
}