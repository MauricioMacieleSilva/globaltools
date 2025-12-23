import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { 
  EstoqueItem, 
  CategoriaEstoque,
  fetchEstoqueItems,
  calcularPesoTotal
} from '@/services/estoqueService';
import { fetchAllPoliticaComercialData, PoliticaComercialData } from '@/services/politicaComercialService';

interface EstoqueStats {
  totalItens: number;
  totalPecas: number;
  totalPeso: number;
  totalValor: number;
}

interface EstoqueContextType {
  items: EstoqueItem[];
  loading: boolean;
  error: string | null;
  categoriaAtiva: CategoriaEstoque;
  setCategoriaAtiva: (categoria: CategoriaEstoque) => void;
  refreshData: () => Promise<void>;
  getItemsByCategoria: (categoria: CategoriaEstoque) => EstoqueItem[];
  getItemCount: (categoria: CategoriaEstoque) => number;
  precosMap: Record<string, number>;
  stats: EstoqueStats;
}

const EstoqueContext = createContext<EstoqueContextType | undefined>(undefined);

export function EstoqueProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<EstoqueItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [categoriaAtiva, setCategoriaAtiva] = useState<CategoriaEstoque>('PERFIS');
  const [precosMap, setPrecosMap] = useState<Record<string, number>>({});

  // Buscar preços da política comercial
  const fetchPrecos = useCallback(async () => {
    try {
      const data = await fetchAllPoliticaComercialData();
      const precos: Record<string, number> = {};
      
      // Mapear preço médio por categoria
      Object.entries(data).forEach(([categoria, itens]) => {
        if (itens.length > 0) {
          // Usar o primeiro preço ou calcular média
          const precoMedio = itens.reduce((acc, item) => {
            // Priorizar preço por kg se disponível
            return acc + (item.precoKg || item.preco);
          }, 0) / itens.length;
          precos[categoria] = precoMedio;
        }
      });
      
      setPrecosMap(precos);
    } catch (err) {
      console.error('Error fetching precos:', err);
    }
  }, []);

  const refreshData = useCallback(async () => {
    setLoading(true);
    setError(null);
    
    try {
      const [estoqueResult] = await Promise.all([
        fetchEstoqueItems(),
        fetchPrecos()
      ]);
      
      if (estoqueResult.error) {
        throw estoqueResult.error;
      }
      
      setItems(estoqueResult.data || []);
    } catch (err) {
      console.error('Error fetching estoque items:', err);
      setError('Erro ao carregar dados do estoque');
    } finally {
      setLoading(false);
    }
  }, [fetchPrecos]);

  useEffect(() => {
    refreshData();
  }, [refreshData]);

  const getItemsByCategoria = useCallback((categoria: CategoriaEstoque) => {
    return items.filter(item => item.categoria === categoria);
  }, [items]);

  const getItemCount = useCallback((categoria: CategoriaEstoque) => {
    return items.filter(item => item.categoria === categoria).length;
  }, [items]);

  // Calcular estatísticas globais
  const stats = React.useMemo<EstoqueStats>(() => {
    let totalItens = 0;
    let totalPecas = 0;
    let totalPeso = 0;
    let totalValor = 0;

    items.forEach(item => {
      if (!item.ativo) return;
      
      totalItens += 1;
      totalPecas += item.quantidade;
      
      const peso = calcularPesoTotal(
        item.categoria,
        item.quantidade,
        item.espessura,
        item.largura,
        item.comprimento,
        item.base,
        item.aba1,
        item.aba2,
        item.tipo_perfil
      );
      
      const pesoItem = peso || 0;
      totalPeso += pesoItem;
      
      const precoKg = precosMap[item.categoria] || 0;
      const valorItem = pesoItem * precoKg;
      totalValor += valorItem;
    });

    return {
      totalItens,
      totalPecas,
      totalPeso,
      totalValor
    };
  }, [items, precosMap]);

  return (
    <EstoqueContext.Provider value={{
      items,
      loading,
      error,
      categoriaAtiva,
      setCategoriaAtiva,
      refreshData,
      getItemsByCategoria,
      getItemCount,
      precosMap,
      stats
    }}>
      {children}
    </EstoqueContext.Provider>
  );
}

export function useEstoque() {
  const context = useContext(EstoqueContext);
  if (context === undefined) {
    throw new Error('useEstoque must be used within an EstoqueProvider');
  }
  return context;
}
