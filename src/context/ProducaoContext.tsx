import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { fetchProducaoData, ProducaoData, MaterialData } from '@/services/producaoService';
import { loadProductionOrders, ProductionOrderData } from '@/services/productionOrdersService';

interface ProducaoContextType {
  data: ProducaoData[];
  loading: boolean;
  error: string | null;
  refetchData: () => Promise<void>;
  
  // Filters
  selectedCliente: string;
  setSelectedCliente: (cliente: string) => void;
  selectedStatus: string;
  setSelectedStatus: (status: string) => void;
  
  // Filtered data
  filteredData: ProducaoData[];
  
  // Production Orders data
  productionOrders: Record<string, ProductionOrderData>;
  refreshProductionOrders: () => Promise<void>;
  
  // KPIs
  totalPedidos: number;
  quantidadeTotal: number;
  noPrazo: { count: number; peso: number };
  atrasados: { count: number; peso: number };
  programar: { count: number; peso: number };
  finalizado: { count: number; peso: number };
  parcialmenteFinalizado: { count: number; peso: number };
}

const ProducaoContext = createContext<ProducaoContextType | undefined>(undefined);

interface ProducaoProviderProps {
  children: ReactNode;
}

export function ProducaoProvider({ children }: ProducaoProviderProps) {
  const [data, setData] = useState<ProducaoData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedCliente, setSelectedCliente] = useState<string>('todos');
  const [selectedStatus, setSelectedStatus] = useState<string>('todos');
  const [productionOrders, setProductionOrders] = useState<Record<string, ProductionOrderData>>({});

  const fetchData = async () => {
    try {
      setLoading(true);
      setError(null);
      console.log('ProducaoContext: Iniciando fetch de dados de produção - força refresh sem cache');
      const producaoData = await fetchProducaoData();
      console.log('ProducaoContext: Dados recebidos:', producaoData.length, 'pedidos');
      setData(producaoData);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao carregar dados de produção');
      console.error('Erro no ProducaoContext:', err);
    } finally {
      setLoading(false);
    }
  };

  const refreshProductionOrders = async () => {
    try {
      const orders = await loadProductionOrders();
      setProductionOrders(orders);
    } catch (err) {
      console.error('Erro ao carregar dados salvos de produção:', err);
    }
  };

  useEffect(() => {
    fetchData();
    refreshProductionOrders();
  }, []);

  // Apply filters and sort
  const filteredData = data.filter(item => {
    if (selectedCliente !== 'todos' && item.cli_nomef !== selectedCliente) {
      return false;
    }
    if (selectedStatus !== 'todos' && item.status !== selectedStatus) {
      return false;
    }
    return true;
  }).sort((a, b) => {
    // First criteria: days delayed (higher first)
    const aDias = a.dias_atraso || 0;
    const bDias = b.dias_atraso || 0;
    
    if (aDias !== bDias) {
      return bDias - aDias; // Higher delay first
    }
    
    // Second criteria: status ordering (ATRASO > PARCIALMENTE_FINALIZADO > NO_PRAZO > PROGRAMAR > FINALIZADO)
    const statusOrder = { 
      'ATRASO': 1, 
      'PARCIALMENTE_FINALIZADO': 2, 
      'NO_PRAZO': 3, 
      'PROGRAMAR': 4, 
      'FINALIZADO': 5 
    };
    const aOrder = statusOrder[a.status as keyof typeof statusOrder] || 5;
    const bOrder = statusOrder[b.status as keyof typeof statusOrder] || 5;
    
    if (aOrder !== bOrder) {
      return aOrder - bOrder;
    }
    
    // Third criteria: order number
    return a.numero_pedido.localeCompare(b.numero_pedido);
  });

  // Calculate KPIs - usando apenas KG para somas
  const getTotalWeight = (item: ProducaoData) => {
    return Object.entries(item.pesos_por_unidade).reduce((sum, [unidade, peso]) => {
      // Converter tudo para KG para cálculos de KPI
      if (unidade === 'T') return sum + (peso * 1000);
      if (unidade === 'KG') return sum + peso;
      // M não entra no cálculo de peso total
      return sum;
    }, 0);
  };
  
  const totalPedidos = filteredData.length;
  const quantidadeTotal = filteredData.reduce((sum, item) => sum + getTotalWeight(item), 0);
  
  const finalizadoItems = filteredData.filter(item => item.status === 'FINALIZADO');
  const finalizado = {
    count: finalizadoItems.length,
    peso: finalizadoItems.reduce((sum, item) => sum + getTotalWeight(item), 0)
  };

  const parcialmenteFinalizadoItems = filteredData.filter(item => item.status === 'PARCIALMENTE_FINALIZADO');
  const parcialmenteFinalizado = {
    count: parcialmenteFinalizadoItems.length,
    peso: parcialmenteFinalizadoItems.reduce((sum, item) => sum + getTotalWeight(item), 0)
  };
  
  const noPrazoItems = filteredData.filter(item => item.status === 'NO_PRAZO');
  const noPrazo = {
    count: noPrazoItems.length,
    peso: noPrazoItems.reduce((sum, item) => sum + getTotalWeight(item), 0)
  };

  const atrasadosItems = filteredData.filter(item => item.status === 'ATRASO');
  const atrasados = {
    count: atrasadosItems.length,
    peso: atrasadosItems.reduce((sum, item) => sum + getTotalWeight(item), 0)
  };
  
  const programarItems = filteredData.filter(item => item.status === 'PROGRAMAR');
  const programar = {
    count: programarItems.length,
    peso: programarItems.reduce((sum, item) => sum + getTotalWeight(item), 0)
  };

  const value: ProducaoContextType = {
    data,
    loading,
    error,
    refetchData: fetchData,
    selectedCliente,
    setSelectedCliente,
    selectedStatus,
    setSelectedStatus,
    filteredData,
    productionOrders,
    refreshProductionOrders,
    totalPedidos,
    quantidadeTotal,
    noPrazo,
    atrasados,
    programar,
    finalizado,
    parcialmenteFinalizado
  };

  return <ProducaoContext.Provider value={value}>{children}</ProducaoContext.Provider>;
}

export function useProducao(): ProducaoContextType {
  const context = useContext(ProducaoContext);
  if (context === undefined) {
    throw new Error('useProducao must be used within a ProducaoProvider');
  }
  return context;
}