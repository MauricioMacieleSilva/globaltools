import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { 
  EstoqueItem, 
  CategoriaEstoque,
  fetchEstoqueItems 
} from '@/services/estoqueService';

interface EstoqueContextType {
  items: EstoqueItem[];
  loading: boolean;
  error: string | null;
  categoriaAtiva: CategoriaEstoque;
  setCategoriaAtiva: (categoria: CategoriaEstoque) => void;
  refreshData: () => Promise<void>;
  getItemsByCategoria: (categoria: CategoriaEstoque) => EstoqueItem[];
  getItemCount: (categoria: CategoriaEstoque) => number;
}

const EstoqueContext = createContext<EstoqueContextType | undefined>(undefined);

export function EstoqueProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<EstoqueItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [categoriaAtiva, setCategoriaAtiva] = useState<CategoriaEstoque>('PERFIS');

  const refreshData = useCallback(async () => {
    setLoading(true);
    setError(null);
    
    try {
      const { data, error: fetchError } = await fetchEstoqueItems();
      
      if (fetchError) {
        throw fetchError;
      }
      
      setItems(data || []);
    } catch (err) {
      console.error('Error fetching estoque items:', err);
      setError('Erro ao carregar dados do estoque');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refreshData();
  }, [refreshData]);

  const getItemsByCategoria = useCallback((categoria: CategoriaEstoque) => {
    return items.filter(item => item.categoria === categoria);
  }, [items]);

  const getItemCount = useCallback((categoria: CategoriaEstoque) => {
    return items.filter(item => item.categoria === categoria).length;
  }, [items]);

  return (
    <EstoqueContext.Provider value={{
      items,
      loading,
      error,
      categoriaAtiva,
      setCategoriaAtiva,
      refreshData,
      getItemsByCategoria,
      getItemCount
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
