import React, { createContext, useContext, useState, useEffect, useMemo, useCallback } from 'react';
import { fetchComercialData } from '@/services/googleSheetsService';
import { cacheService } from '@/services/cacheService';
import { useDebounce } from '@/hooks/useDebounce';
import { useExcludedOrders } from '@/hooks/useExcludedOrders';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';

type SessionType = 'dashboard' | 'perdidos' | 'cancelamentos' | 'precos' | 'orcamentos' | 'followup';

export interface ComercialData {
  numeropedido: string;       // Coluna B
  numeronf: string;          // Coluna C
  situacao: string;           // Coluna D
  data_emissao: string;       // Coluna E
  idtiponf?: number;         // Coluna F - ID Tipo NF
  descricaomat: string;       // Coluna J
  observacao: string;         // Coluna K
  qtd: number;               // Coluna L
  un: string;                // Coluna M
  valor_un_bruto: number;    // Coluna N
  valor: number;             // Coluna O
  peso: number;              // Coluna T
  classe: string;            // Coluna V
  cli_nomefantasia: string;  // Coluna AC
  cliente: string;           // Coluna AC (nome para exibição)
  codigocliente: string;     // Coluna AD
  uf: string;                // Coluna AE
  cli_cidade: string;        // Coluna AF
  data_inicio: string;       // Coluna AH - Data de início
  data_pedido_pronto: string; // Coluna AI
  faturamento_tipo: number;  // Coluna AR
  cliente_novo: string;      // Coluna AT
  vendedor: string;          // Adicionar campo vendedor
  perdido_motivo?: string;   // Coluna AU - Motivo da perda
  data_perdido?: string;     // Coluna AJ - Data Perdido
}

interface ComercialFilters {
  ano?: string;
  mes?: string;
  situacao?: string;
  uf?: string;
  classe?: string;
  cliente_novo?: string;
  vendedor?: string;
  perdido_motivo?: string;
}

export interface DrillDownState {
  isMonthView: boolean;
  selectedMonth?: string;
  selectedYear?: string;
}

export interface MetasState {
  metaMensal: number;
  metaDiaria: number;
}

interface ComercialContextType {
  data: ComercialData[];
  filteredData: ComercialData[];
  filters: ComercialFilters;
  setFilters: (filters: Partial<ComercialFilters>) => void;
  activeSession: SessionType;
  setActiveSession: (session: SessionType) => void;
  sessionFilters: Record<SessionType, ComercialFilters>;
  setSessionFilters: (session: SessionType, filters: ComercialFilters) => void;
  isLoading: boolean;
  error: string | null;
  refreshData: () => void;
  clearCache: () => void;
  cacheStatus: {
    isCached: boolean;
    lastUpdate: Date | null;
  };
  kpis: {
    faturamento: {
      valor: number;
      peso: number;
      numClientes: number;
      ticketMedio: number;
      reaisPorKg: number;
    };
    orcamento: {
      valor: number;
      peso: number;
      numClientes: number;
      ticketMedio: number;
      reaisPorKg: number;
    };
    clientesNovos: number;
    perdidos: {
      valor: number;
      peso: number;
      numClientes: number;
      numPedidos: number;
      motivosPrincipais: Array<{ motivo: string; quantidade: number; valor: number }>;
    };
    cancelamentos: {
      valor: number;
      peso: number;
      numClientes: number;
      numPedidos: number;
    };
    devolucoes: {
      valor: number;
      peso: number;
      numClientes: number;
      numPedidos: number;
    };
  };
  drillDown: DrillDownState;
  setDrillDown: (state: Partial<DrillDownState>) => void;
  metas: MetasState;
  setMetas: (metas: Partial<MetasState>) => void;
}

const ComercialContext = createContext<ComercialContextType | undefined>(undefined);

// Mock data for development
const mockData: ComercialData[] = [
  // DADOS REAIS DE JULHO/2025 - com UFs variados
  { numeropedido: '10347', numeronf: 'NF10347', situacao: 'Emitida', data_emissao: '02/07/2025', descricaomat: 'Material Industrial', observacao: 'Pedido padrão', qtd: 1, un: 'PC', valor_un_bruto: 4435.16, valor: 4435.16, peso: 1500, classe: 'ARAMES', cli_nomefantasia: 'Cliente 10347', cliente: 'Cliente 10347', codigocliente: 'CLI10347', uf: 'SP', cli_cidade: 'São Paulo', data_inicio: '01/07/2025', data_pedido_pronto: '01/07/2025', faturamento_tipo: 1, cliente_novo: 'Cliente existente', vendedor: 'João Silva' },
  { numeropedido: '10362', numeronf: 'NF10362', situacao: 'Emitida', data_emissao: '01/07/2025', descricaomat: 'Material Industrial', observacao: 'Pedido padrão', qtd: 1, un: 'PC', valor_un_bruto: 10381.45, valor: 10381.45, peso: 3200, classe: 'ARAMES', cli_nomefantasia: 'Cliente 10362', cliente: 'Cliente 10362', codigocliente: 'CLI10362', uf: 'RJ', cli_cidade: 'Rio de Janeiro', data_inicio: '30/06/2025', data_pedido_pronto: '30/06/2025', faturamento_tipo: 1, cliente_novo: 'Cliente existente', vendedor: 'Maria Santos' },
  { numeropedido: '10363', numeronf: 'NF10363', situacao: 'Emitida', data_emissao: '03/07/2025', descricaomat: 'Chapa Galvanizada', observacao: 'Pedido urgente', qtd: 2, un: 'PC', valor_un_bruto: 2500, valor: 5000, peso: 800, classe: 'CHAPAS', cli_nomefantasia: 'Cliente 10363', cliente: 'Cliente 10363', codigocliente: 'CLI10363', uf: 'MG', cli_cidade: 'Belo Horizonte', data_inicio: '02/07/2025', data_pedido_pronto: '02/07/2025', faturamento_tipo: 1, cliente_novo: 'Cliente novo', vendedor: 'Carlos Pereira' },
  { numeropedido: '10364', numeronf: '', situacao: 'Orçamento', data_emissao: '04/07/2025', descricaomat: 'Perfil L', observacao: 'Orçamento em análise', qtd: 5, un: 'PC', valor_un_bruto: 800, valor: 4000, peso: 600, classe: 'PERFIS', cli_nomefantasia: 'Cliente 10364', cliente: 'Cliente 10364', codigocliente: 'CLI10364', uf: 'PR', cli_cidade: 'Curitiba', data_inicio: '03/07/2025', data_pedido_pronto: '03/07/2025', faturamento_tipo: 0, cliente_novo: 'Cliente existente', vendedor: 'Ana Costa' },
  // Pedidos sem data de emissão (situação "Pedido")
  { numeropedido: '10365', numeronf: '', situacao: 'Pedido', data_emissao: '', descricaomat: 'Chapa de Aço', observacao: 'Pedido em produção', qtd: 3, un: 'PC', valor_un_bruto: 1200, valor: 3600, peso: 400, classe: 'CHAPAS', cli_nomefantasia: 'Cliente 10365', cliente: 'Cliente 10365', codigocliente: 'CLI10365', uf: 'SP', cli_cidade: 'São Paulo', data_inicio: '05/07/2025', data_pedido_pronto: '', faturamento_tipo: 1, cliente_novo: 'Cliente existente', vendedor: 'João Silva' },
  { numeropedido: '10366', numeronf: '', situacao: 'Pedido', data_emissao: '', descricaomat: 'Perfil U', observacao: 'Aguardando produção', qtd: 4, un: 'PC', valor_un_bruto: 900, valor: 3600, peso: 300, classe: 'PERFIS', cli_nomefantasia: 'Cliente 10366', cliente: 'Cliente 10366', codigocliente: 'CLI10366', uf: 'RJ', cli_cidade: 'Rio de Janeiro', data_inicio: '06/07/2025', data_pedido_pronto: '', faturamento_tipo: 1, cliente_novo: 'Cliente existente', vendedor: 'Maria Santos' },
  { numeropedido: 'P001', numeronf: '', situacao: 'Perdido', data_emissao: '15/07/2025', descricaomat: 'Material Industrial', observacao: 'Perdido por preço', qtd: 1, un: 'PC', valor_un_bruto: 5000, valor: 5000, peso: 1800, classe: 'CHAPAS', cli_nomefantasia: 'Cliente Perdido 1', cliente: 'Cliente Perdido 1', codigocliente: 'CLIPERD001', uf: 'RS', cli_cidade: 'Porto Alegre', data_inicio: '10/07/2025', data_pedido_pronto: '', faturamento_tipo: 1, cliente_novo: 'Cliente existente', vendedor: 'Roberto Silva', perdido_motivo: 'Preço', data_perdido: '15/08/2025' },
  { numeropedido: 'P002', numeronf: '', situacao: 'Perdido', data_emissao: '20/08/2025', descricaomat: 'Chapa Galvanizada', observacao: 'Perdido por concorrência', qtd: 2, un: 'PC', valor_un_bruto: 3500, valor: 7000, peso: 2500, classe: 'CHAPAS', cli_nomefantasia: 'Cliente Perdido 2', cliente: 'Cliente Perdido 2', codigocliente: 'CLIPERD002', uf: 'SC', cli_cidade: 'Florianópolis', data_inicio: '15/08/2025', data_pedido_pronto: '', faturamento_tipo: 1, cliente_novo: 'Cliente novo', vendedor: 'Fernanda Oliveira', perdido_motivo: 'Concorrência', data_perdido: '20/08/2025' },
  // Pedidos cancelados para testar os KPIs
  { numeropedido: 'C001', numeronf: 'NFC001', situacao: 'Cancelado', data_emissao: '10/07/2025', descricaomat: 'Material Cancelado', observacao: 'Cancelado pelo cliente', qtd: 1, un: 'PC', valor_un_bruto: 3000, valor: 3000, peso: 1200, classe: 'ARAMES', cli_nomefantasia: 'Cliente Cancelado 1', cliente: 'Cliente Cancelado 1', codigocliente: 'CLICANC001', uf: 'SP', cli_cidade: 'São Paulo', data_inicio: '09/07/2025', data_pedido_pronto: '', faturamento_tipo: 1, cliente_novo: 'Cliente existente', vendedor: 'João Silva' },
  { numeropedido: 'C002', numeronf: 'NFC002', situacao: 'Cancelado', data_emissao: '15/07/2025', descricaomat: 'Chapa Cancelada', observacao: 'Cancelado por falta de estoque', qtd: 3, un: 'PC', valor_un_bruto: 2000, valor: 6000, peso: 1800, classe: 'CHAPAS', cli_nomefantasia: 'Cliente Cancelado 2', cliente: 'Cliente Cancelado 2', codigocliente: 'CLICANC002', uf: 'RJ', cli_cidade: 'Rio de Janeiro', data_inicio: '14/07/2025', data_pedido_pronto: '', faturamento_tipo: 1, cliente_novo: 'Cliente novo', vendedor: 'Maria Santos' },
  // Pedidos com devolução para testar os KPIs
  { numeropedido: 'D001', numeronf: 'NFD001', situacao: 'Devolvido', data_emissao: '05/07/2025', descricaomat: 'Material Devolvido', observacao: 'Devolvido por defeito', qtd: 1, un: 'PC', valor_un_bruto: 2500, valor: 2500, peso: 900, classe: 'PERFIS', cli_nomefantasia: 'Cliente Devolução 1', cliente: 'Cliente Devolução 1', codigocliente: 'CLIDEV001', uf: 'MG', cli_cidade: 'Belo Horizonte', data_inicio: '04/07/2025', data_pedido_pronto: '', faturamento_tipo: 1, cliente_novo: 'Cliente existente', vendedor: 'Carlos Pereira' },
  { numeropedido: 'D002', numeronf: 'NFD002', situacao: 'Devolvido', data_emissao: '20/07/2025', descricaomat: 'Perfil Devolvido', observacao: 'Devolvido por especificação incorreta', qtd: 2, un: 'PC', valor_un_bruto: 1800, valor: 3600, peso: 1100, classe: 'PERFIS', cli_nomefantasia: 'Cliente Devolução 2', cliente: 'Cliente Devolução 2', codigocliente: 'CLIDEV002', uf: 'PR', cli_cidade: 'Curitiba', data_inicio: '19/07/2025', data_pedido_pronto: '', faturamento_tipo: 1, cliente_novo: 'Cliente existente', vendedor: 'Ana Costa' },
  
  // Orçamentos para testar o BudgetNumberSelect
  { numeropedido: '10844', numeronf: '', situacao: 'Orçamento', data_emissao: '19/09/2025', idtiponf: 1, descricaomat: 'Perfil U estrutural', observacao: 'Orçamento para estrutura metálica', qtd: 32, un: 'PC', valor_un_bruto: 2732.08, valor: 87462.56, peso: 13584, classe: 'PERFIS', cli_nomefantasia: 'VILE CONSTRUCOES E REFORMAS LTDA', cliente: 'VILE CONSTRUCOES E REFORMAS LTDA', codigocliente: 'VCE4247', uf: 'RJ', cli_cidade: 'Niterói', data_inicio: '19/09/2025', data_pedido_pronto: '', faturamento_tipo: 1, cliente_novo: 'Cliente existente', vendedor: 'Antonio Paz' },
  { numeropedido: '10832', numeronf: '', situacao: 'Orçamento', data_emissao: '18/09/2025', idtiponf: 1, descricaomat: 'Tubo galvanizado 40x40', observacao: 'Orçamento para galpão industrial', qtd: 20, un: 'PC', valor_un_bruto: 156.50, valor: 3130.00, peso: 800, classe: 'TUBOS', cli_nomefantasia: 'Figueiró Metalúrgica e Guindastes', cliente: 'Figueiró Metalúrgica e Guindastes', codigocliente: 'FME4214', uf: 'RS', cli_cidade: 'Montenegro', data_inicio: '18/09/2025', data_pedido_pronto: '', faturamento_tipo: 1, cliente_novo: 'Cliente existente', vendedor: 'Daniela pacheco dos santos' },
  { numeropedido: '10829', numeronf: '', situacao: 'Orçamento', data_emissao: '17/09/2025', idtiponf: 1, descricaomat: 'Chapa de aço 5mm', observacao: 'Orçamento para fabricação de portões', qtd: 5, un: 'PC', valor_un_bruto: 890.00, valor: 4450.00, peso: 2500, classe: 'CHAPAS', cli_nomefantasia: 'Serralheria e Funilaria Machado', cliente: 'Serralheria e Funilaria Machado', codigocliente: 'SEF3696', uf: 'RS', cli_cidade: 'Torres', data_inicio: '17/09/2025', data_pedido_pronto: '', faturamento_tipo: 1, cliente_novo: 'Cliente novo', vendedor: 'Daniela pacheco dos santos' },
  { numeropedido: '10827', numeronf: '', situacao: 'Orçamento', data_emissao: '16/09/2025', idtiponf: 1, descricaomat: 'Perfis diversos', observacao: 'Orçamento para estrutura pré-moldada', qtd: 15, un: 'PC', valor_un_bruto: 245.67, valor: 3685.05, peso: 1200, classe: 'PERFIS', cli_nomefantasia: 'Construnova Fabrica de estruturas metalicas', cliente: 'Construnova Fabrica de estruturas metalicas', codigocliente: 'CFD2413', uf: 'RS', cli_cidade: 'Nova Ramada', data_inicio: '16/09/2025', data_pedido_pronto: '', faturamento_tipo: 1, cliente_novo: 'Cliente existente', vendedor: 'Daniela pacheco dos santos' },
  { numeropedido: '10820', numeronf: '', situacao: 'Orçamento', data_emissao: '15/09/2025', idtiponf: 1, descricaomat: 'Tubos e telhas metálicas', observacao: 'Orçamento para cobertura', qtd: 25, un: 'PC', valor_un_bruto: 178.90, valor: 4472.50, peso: 1800, classe: 'TUBOS', cli_nomefantasia: 'Master pré moldados', cliente: 'Master pré moldados', codigocliente: 'MPM9224', uf: 'RS', cli_cidade: 'Sarandi', data_inicio: '15/09/2025', data_pedido_pronto: '', faturamento_tipo: 1, cliente_novo: 'Cliente existente', vendedor: 'Antonio Paz' },
  
  // Add more budget data matching the sales page
  { numeropedido: '10783', numeronf: '', situacao: 'Orçamento', data_emissao: '11/09/2025', idtiponf: 1, descricaomat: 'Material industrial especial', observacao: 'Orçamento para projeto especial', qtd: 15, un: 'PC', valor_un_bruto: 5777.45, valor: 86721.79, peso: 13730, classe: 'PERFIS', cli_nomefantasia: 'GRUPO MINUANO', cliente: 'GRUPO MINUANO', codigocliente: 'GMN783', uf: 'RS', cli_cidade: 'Lindolfo Collor', data_inicio: '11/09/2025', data_pedido_pronto: '', faturamento_tipo: 1, cliente_novo: 'Cliente existente', vendedor: 'DANIELA PACHECO' },
  { numeropedido: '10688', numeronf: '', situacao: 'Orçamento', data_emissao: '28/08/2025', idtiponf: 1, descricaomat: 'Estrutura metálica completa', observacao: 'Orçamento para galpão', qtd: 8, un: 'PC', valor_un_bruto: 451.57, valor: 3612.56, peso: 523, classe: 'ESTRUTURAS', cli_nomefantasia: 'ELSON FAGUNDE', cliente: 'ELSON FAGUNDE', codigocliente: 'ELF688', uf: 'RS', cli_cidade: 'Gravataí', data_inicio: '28/08/2025', data_pedido_pronto: '', faturamento_tipo: 1, cliente_novo: 'Cliente existente', vendedor: 'DANIELA PACHECO' },
  { numeropedido: '10792', numeronf: '', situacao: 'Orçamento', data_emissao: '11/09/2025', idtiponf: 1, descricaomat: 'Construção civil', observacao: 'Orçamento para edifício', qtd: 12, un: 'PC', valor_un_bruto: 8030.75, valor: 96369.00, peso: 8369, classe: 'CONSTRUCAO', cli_nomefantasia: 'COND EDIFICIO', cliente: 'COND EDIFICIO', codigocliente: 'CED792', uf: 'RS', cli_cidade: 'Porto Alegre', data_inicio: '11/09/2025', data_pedido_pronto: '', faturamento_tipo: 1, cliente_novo: 'Cliente existente', vendedor: 'Antonio' },
  { numeropedido: '10590', numeronf: '', situacao: 'Orçamento', data_emissao: '14/08/2025', idtiponf: 1, descricaomat: 'Estruturas metálicas diversas', observacao: 'Orçamento para construção', qtd: 20, un: 'PC', valor_un_bruto: 4521.17, valor: 90423.37, peso: 11345, classe: 'ESTRUTURAS', cli_nomefantasia: 'ECOVIX CONSTR', cliente: 'ECOVIX CONSTR', codigocliente: 'ECV590', uf: 'RJ', cli_cidade: 'Rio Grande', data_inicio: '14/08/2025', data_pedido_pronto: '', faturamento_tipo: 1, cliente_novo: 'Cliente existente', vendedor: 'Antonio' },
  { numeropedido: '10624', numeronf: '', situacao: 'Orçamento', data_emissao: '01/09/2025', idtiponf: 1, descricaomat: 'Base metálica especial', observacao: 'Orçamento para equipamento', qtd: 5, un: 'PC', valor_un_bruto: 2088.60, valor: 10443.00, peso: 1018, classe: 'BASES', cli_nomefantasia: 'METALBASE ESTR', cliente: 'METALBASE ESTR', codigocliente: 'MBE624', uf: 'RS', cli_cidade: 'Carlos Barbosa', data_inicio: '01/09/2025', data_pedido_pronto: '', faturamento_tipo: 1, cliente_novo: 'Cliente existente', vendedor: 'Antonio' },
  { numeropedido: '10759', numeronf: '', situacao: 'Orçamento', data_emissao: '08/09/2025', idtiponf: 1, descricaomat: 'Peças agropecuárias', observacao: 'Orçamento para equipamento rural', qtd: 18, un: 'PC', valor_un_bruto: 3414.16, valor: 61448.85, peso: 6361, classe: 'AGROPEC', cli_nomefantasia: 'TREVO AGROPEC', cliente: 'TREVO AGROPEC', codigocliente: 'TAG759', uf: 'RS', cli_cidade: 'Pelotas', data_inicio: '08/09/2025', data_pedido_pronto: '', faturamento_tipo: 1, cliente_novo: 'Cliente existente', vendedor: 'Antonio' },
  { numeropedido: '10790', numeronf: '', situacao: 'Orçamento', data_emissao: '11/09/2025', idtiponf: 1, descricaomat: 'Concreto armado', observacao: 'Orçamento para fundação', qtd: 10, un: 'PC', valor_un_bruto: 1550.99, valor: 15509.88, peso: 2073, classe: 'CONCRETO', cli_nomefantasia: 'CONCRE FORT', cliente: 'CONCRE FORT', codigocliente: 'CFT790', uf: 'SC', cli_cidade: 'São Lourenço do Oeste', data_inicio: '11/09/2025', data_pedido_pronto: '', faturamento_tipo: 1, cliente_novo: 'Cliente existente', vendedor: 'Antonio' },
  { numeropedido: '10791', numeronf: '', situacao: 'Orçamento', data_emissao: '11/09/2025', idtiponf: 1, descricaomat: 'Estrutura fortificada', observacao: 'Orçamento para reforço estrutural', qtd: 14, un: 'PC', valor_un_bruto: 4472.00, valor: 62518.05, peso: 5590, classe: 'REFORCO', cli_nomefantasia: 'CONCRE FORT', cliente: 'CONCRE FORT', codigocliente: 'CFT791', uf: 'SC', cli_cidade: 'São Lourenço do Oeste', data_inicio: '11/09/2025', data_pedido_pronto: '', faturamento_tipo: 1, cliente_novo: 'Cliente existente', vendedor: 'Antonio' },
  { numeropedido: '10793', numeronf: '', situacao: 'Orçamento', data_emissao: '12/09/2025', idtiponf: 1, descricaomat: 'Base estrutural', observacao: 'Orçamento para base de equipamento', qtd: 7, un: 'PC', valor_un_bruto: 2978.10, valor: 20846.76, peso: 2244, classe: 'BASES', cli_nomefantasia: 'METALBASE ESTR', cliente: 'METALBASE ESTR', codigocliente: 'MBE793', uf: 'RS', cli_cidade: 'Carlos Barbosa', data_inicio: '12/09/2025', data_pedido_pronto: '', faturamento_tipo: 1, cliente_novo: 'Cliente existente', vendedor: 'Antonio' },
];

export function ComercialProvider({ children }: { children: React.ReactNode }) {
  const [data, setData] = useState<ComercialData[]>(mockData);
  const { isOrderExcluded } = useExcludedOrders();
  const currentDate = new Date();
  const currentMonth = (currentDate.getMonth() + 1).toString().padStart(2, '0');
  const currentYear = currentDate.getFullYear().toString();
  
  // Session management
  const [activeSession, setActiveSession] = useState<SessionType>('dashboard');
  const [sessionFilters, setSessionFiltersState] = useState<Record<SessionType, ComercialFilters>>({
    dashboard: { mes: currentMonth, ano: currentYear },
    perdidos: { mes: currentMonth, ano: currentYear },
    cancelamentos: { mes: currentMonth, ano: currentYear },
    precos: { mes: currentMonth, ano: currentYear },
    orcamentos: { mes: currentMonth, ano: currentYear },
    followup: { mes: currentMonth, ano: currentYear }
  });
  
  const [drillDown, setDrillDownState] = useState<DrillDownState>({
    isMonthView: false,
    selectedMonth: currentMonth,
    selectedYear: currentYear
  });
  const [metas, setMetasState] = useState<MetasState>({
    metaMensal: 2000000,
    metaDiaria: 100000
  });

  // Carregar metas do banco de dados
  useEffect(() => {
    const loadMetas = async () => {
      try {
        const currentMonth = new Date().toISOString().slice(0, 7);
        const { data, error } = await supabase
          .from('admin_goals')
          .select('monthly_revenue_goal, daily_revenue_goal')
          .eq('month_year', currentMonth)
          .maybeSingle();

        if (!error && data) {
          setMetasState({
            metaMensal: data.monthly_revenue_goal || 2000000,
            metaDiaria: data.daily_revenue_goal || 100000
          });
        }
      } catch (error) {
        console.error('Erro ao carregar metas:', error);
      }
    };

    loadMetas();
  }, []);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);

  // Legacy single filter state for compatibility
  const filters = sessionFilters[activeSession];
  const debouncedFilters = useDebounce(filters, 300);

  const setFilters = (newFilters: Partial<ComercialFilters>) => {
    setSessionFiltersState(prev => ({
      ...prev,
      [activeSession]: { ...prev[activeSession], ...newFilters }
    }));
    
    // Auto drill-down quando mês específico é selecionado
    if (newFilters.mes && newFilters.ano && drillDown.isMonthView) {
      setDrillDownState(prev => ({
        ...prev,
        isMonthView: false,
        selectedMonth: newFilters.mes,
        selectedYear: newFilters.ano
      }));
    }
  };
  
  const setSessionFilters = (session: SessionType, newFilters: ComercialFilters) => {
    setSessionFiltersState(prev => ({
      ...prev,
      [session]: newFilters
    }));
  };

  const setDrillDown = (newState: Partial<DrillDownState>) => {
    setDrillDownState(prev => ({ ...prev, ...newState }));
  };

  // Função para carregar metas do banco de dados
  const loadRevenueMetas = useCallback(async (year: number, month: string) => {
    try {
      const monthYear = `${year}-${month.padStart(2, '0')}`;
      
      const { data, error } = await supabase
        .from('metas_vendas')
        .select('*')
        .eq('ano', parseInt(year.toString()))
        .eq('mes', parseInt(month))
        .maybeSingle();

      if (error && error.code !== 'PGRST116') {
        console.error('Erro ao carregar metas:', error);
        return;
      }

      if (data) {
        setMetasState({
          metaMensal: data.meta_mensal,
          metaDiaria: data.meta_diaria || 0
        });
      } else {
        // Se não existir, usar valores padrão
        setMetasState({
          metaMensal: 2000000,
          metaDiaria: 100000
        });
      }
    } catch (e) {
      console.error('Erro ao carregar metas de faturamento:', e);
    }
  }, []);

  // Carregar metas quando mudar mês/ano
  useEffect(() => {
    const year = sessionFilters[activeSession]?.ano || currentYear;
    const month = sessionFilters[activeSession]?.mes || currentMonth;
    loadRevenueMetas(parseInt(year), month);
  }, [activeSession, sessionFilters, currentMonth, currentYear, loadRevenueMetas]);

  const setMetas = async (newMetas: Partial<MetasState>) => {
    const updated = { ...metas, ...newMetas };
    setMetasState(updated);
    
    try {
      const year = drillDown.selectedYear || sessionFilters[activeSession]?.ano || currentYear;
      const month = drillDown.selectedMonth || sessionFilters[activeSession]?.mes || currentMonth;
      const monthYear = `${year}-${month.padStart(2, '0')}`;

      // Verificar se já existe registro para este mês
      const { data: existing } = await supabase
        .from('metas_vendas')
        .select('id')
        .eq('ano', parseInt(year))
        .eq('mes', parseInt(month))
        .maybeSingle();

      if (existing) {
        // Atualizar registro existente
        const { error } = await supabase
          .from('metas_vendas')
          .update({
            meta_mensal: updated.metaMensal,
            meta_diaria: updated.metaDiaria,
            updated_at: new Date().toISOString()
          })
          .eq('ano', parseInt(year))
          .eq('mes', parseInt(month));

        if (error) throw error;
      } else {
        // Criar novo registro
        const { data: { user } } = await supabase.auth.getUser();
        const { error } = await supabase
          .from('metas_vendas')
          .insert({
            ano: parseInt(year),
            mes: parseInt(month),
            meta_mensal: updated.metaMensal,
            meta_diaria: updated.metaDiaria,
            created_by: user?.id
          });

        if (error) throw error;
      }

      toast({
        title: "Metas salvas com sucesso!",
        description: "As metas de faturamento foram atualizadas para todos os usuários.",
      });
    } catch (e) {
      console.error('Erro ao salvar metas:', e);
      toast({
        title: "Erro ao salvar metas",
        description: "Não foi possível salvar as metas. Tente novamente.",
        variant: "destructive"
      });
    }
  };

  // Helper function to parse dates
  const parseDate = (dateStr: string) => {
    if (!dateStr) return null;
    
    const [day, month, year] = dateStr.split('/');
    if (!day || !month || !year) return null;
    
    return new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
  };

  const filteredData = useMemo(() => {
    console.log('🔍 Aplicando filtros:', debouncedFilters);
    console.log('📊 Total de registros antes do filtro:', data.length);
    
    let filtered = [...data];
    const currentFilters = sessionFilters[activeSession];

    // Filtrar pedidos excluídos pelos admins
    filtered = filtered.filter(item => !isOrderExcluded(item.numeropedido));

    // Determine which date field to use based on session and item type
    const getDateField = (item: ComercialData) => {
      switch (activeSession) {
        case 'perdidos':
          return parseDate(item.data_perdido || '');
        default:
          // For faturamento (billed items), use emission date
          if (item.situacao === 'Emitida' || item.situacao === 'Faturado') {
            return parseDate(item.data_emissao);
          }
          // For budgets and other situations, use start date
          return parseDate(item.data_inicio);
      }
    };

    // Apply filters
    if (currentFilters.ano) {
      filtered = filtered.filter(item => {
        const date = getDateField(item);
        return date && date.getFullYear().toString() === currentFilters.ano;
      });
    }

    if (currentFilters.mes) {
      filtered = filtered.filter(item => {
        const date = getDateField(item);
        return date && (date.getMonth() + 1).toString().padStart(2, '0') === currentFilters.mes;
      });
    }

    if (currentFilters.uf) {
      filtered = filtered.filter(item => item.uf === currentFilters.uf);
    }

    if (currentFilters.classe) {
      filtered = filtered.filter(item => item.classe === currentFilters.classe);
    }

    if (currentFilters.cliente_novo) {
      filtered = filtered.filter(item => item.cliente_novo === currentFilters.cliente_novo);
    }

    if (currentFilters.vendedor) {
      filtered = filtered.filter(item => item.vendedor === currentFilters.vendedor);
    }

    // Apply drill-down filters if they exist
    // Note: DrillDown doesn't have situacao/vendedor properties currently

    console.log('📊 Total de registros após filtro:', filtered.length);
    return filtered;
  }, [data, sessionFilters, activeSession, drillDown, debouncedFilters, isOrderExcluded]);

  const kpis = useMemo(() => {
    console.log('🔄 Calculando KPIs com dados filtrados:', filteredData.length, 'registros');
    
    // Incluir pedidos "Pedido" junto com "Emitida" no faturamento
    const faturados = filteredData.filter(item => 
      (item.situacao === 'Emitida' || item.situacao === 'Pedido') && item.faturamento_tipo === 1
    );
    
    // For budgets, use raw data without year/month filters
    const orcamentos = data.filter(item => 
      item.situacao === 'Orçamento'
    );
    
    const perdidos = filteredData.filter(item => 
      item.situacao === 'Perdido' && 
      item.perdido_motivo && 
      item.perdido_motivo !== 'Não informado'
    );
    
    const cancelados = filteredData.filter(item => 
      item.situacao === 'Cancelado'
    );
    
    const devolvidos = filteredData.filter(item => 
      item.situacao === 'Devolvido'
    );

    const faturamentoValor = faturados.reduce((acc, item) => acc + item.valor, 0);
    const faturamentoPeso = faturados.reduce((acc, item) => acc + item.peso, 0);
    const faturamentoClientes = new Set(faturados.map(item => item.codigocliente)).size;
    
    const orcamentoValor = orcamentos.reduce((acc, item) => acc + item.valor, 0);
    const orcamentoPeso = orcamentos.reduce((acc, item) => acc + item.peso, 0);
    const orcamentoClientes = new Set(orcamentos.map(item => item.codigocliente)).size;
    
    const perdidosValor = perdidos.reduce((acc, item) => acc + item.valor, 0);
    const perdidosPeso = perdidos.reduce((acc, item) => acc + item.peso, 0);
    const perdidosClientes = new Set(perdidos.map(item => item.codigocliente)).size;
    const perdidosPedidos = new Set(
      perdidos
        .map(item => item.numeropedido)
        .filter(Boolean)
    ).size;
    
    const cancelamentosValor = cancelados.reduce((acc, item) => acc + item.valor, 0);
    const cancelamentosPeso = cancelados.reduce((acc, item) => acc + item.peso, 0);
    const cancelamentosClientes = new Set(cancelados.map(item => item.codigocliente)).size;
    
    const devolucoesValor = devolvidos.reduce((acc, item) => acc + item.valor, 0);
    const devolucoesPeso = devolvidos.reduce((acc, item) => acc + item.peso, 0);
    const devolucoesClientes = new Set(devolvidos.map(item => item.codigocliente)).size;

    // Calcular motivos principais de perdas
    const motivosPerdas = perdidos.reduce((acc, item) => {
      const motivo = item.perdido_motivo || 'Não informado';
      if (!acc[motivo]) {
        acc[motivo] = { motivo, quantidade: 0, valor: 0 };
      }
      acc[motivo].quantidade += 1;
      acc[motivo].valor += item.valor;
      return acc;
    }, {} as Record<string, { motivo: string; quantidade: number; valor: number }>);

    const motivosPrincipais = Object.values(motivosPerdas)
      .sort((a, b) => b.valor - a.valor)
      .slice(0, 5);

    // Calcular clientes novos
    const clientesNovos = filteredData.filter(item => 
      item.cliente_novo === 'Cliente novo' && 
      (item.situacao === 'Emitida' || item.situacao === 'Faturado')
    ).length;

    const result = {
      faturamento: {
        valor: faturamentoValor,
        peso: faturamentoPeso,
        numClientes: faturamentoClientes,
        ticketMedio: faturamentoClientes > 0 ? faturamentoValor / faturamentoClientes : 0,
        reaisPorKg: faturamentoPeso > 0 ? faturamentoValor / faturamentoPeso : 0
      },
      orcamento: {
        valor: orcamentoValor,
        peso: orcamentoPeso,
        numClientes: orcamentoClientes,
        ticketMedio: orcamentoClientes > 0 ? orcamentoValor / orcamentoClientes : 0,
        reaisPorKg: orcamentoPeso > 0 ? orcamentoValor / orcamentoPeso : 0
      },
      clientesNovos,
      perdidos: {
        valor: perdidosValor,
        peso: perdidosPeso,
        numClientes: perdidosClientes,
        numPedidos: perdidosPedidos,
        motivosPrincipais
      },
      cancelamentos: {
        valor: cancelamentosValor,
        peso: cancelamentosPeso,
        numClientes: cancelamentosClientes,
        numPedidos: cancelados.length
      },
      devolucoes: {
        valor: devolucoesValor,
        peso: devolucoesPeso,
        numClientes: devolucoesClientes,
        numPedidos: devolvidos.length
      }
    };
    
    console.log('🔄 KPIs calculados:', result);
    return result;
  }, [filteredData, data]);

  const refreshData = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      
      const cachedData = cacheService.get('comercial-data-v2');
      
      if (cachedData) {
        console.log('📋 Carregando dados do cache');
        setData(cachedData);
        setLastUpdate(new Date());
        setIsLoading(false);
        return;
      }
      
      console.log('🌐 Buscando dados da API');
      const newData = await fetchComercialData();
      setData(newData);
      
      cacheService.set('comercial-data-v2', newData);
      setLastUpdate(new Date());
      setError(null);
    } catch (err) {
      console.error('❌ Erro ao carregar dados:', err);
      setError(err instanceof Error ? err.message : 'Erro desconhecido');
    } finally {
      setIsLoading(false);
    }
  }, []);

  const clearCache = useCallback(() => {
    cacheService.clear();
    setLastUpdate(null);
  }, []);

  const cacheStatus = useMemo(() => ({
    isCached: cacheService.get('comercial-data-v2') !== null,
    lastUpdate
  }), [lastUpdate]);

  useEffect(() => {
    refreshData();
  }, [refreshData]);

  const value: ComercialContextType = {
    data,
    filteredData,
    filters,
    setFilters,
    activeSession,
    setActiveSession,
    sessionFilters,
    setSessionFilters,
    isLoading,
    error,
    refreshData,
    clearCache,
    cacheStatus,
    kpis,
    drillDown,
    setDrillDown,
    metas,
    setMetas
  };

  return (
    <ComercialContext.Provider value={value}>
      {children}
    </ComercialContext.Provider>
  );
}

export function useComercial() {
  const context = useContext(ComercialContext);
  if (context === undefined) {
    console.error('useComercial called outside ComercialProvider');
    throw new Error('useComercial must be used within a ComercialProvider');
  }
  return context;
}