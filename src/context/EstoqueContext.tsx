import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { 
  EstoqueItem, 
  CategoriaEstoque,
  fetchEstoqueItems,
  calcularPesoTotal
} from '@/services/estoqueService';
import { fetchPerfilPrecos, PerfilPreco } from '@/services/perfilPrecosService';
import { supabase } from '@/integrations/supabase/client';

interface EstoqueStats {
  totalItens: number;
  totalPecas: number;
  totalPeso: number;
  totalValor: number;
}

// Mapa de espessura -> preço por kg
type PrecosEspessuraMap = Record<number, number>;

// Mapa de categoria -> preço médio por kg (da política comercial)
type PrecosCategoriaMap = Record<string, number>;

interface EstoqueContextType {
  items: EstoqueItem[];
  loading: boolean;
  error: string | null;
  categoriaAtiva: CategoriaEstoque;
  setCategoriaAtiva: (categoria: CategoriaEstoque) => void;
  refreshData: () => Promise<void>;
  getItemsByCategoria: (categoria: CategoriaEstoque) => EstoqueItem[];
  getItemCount: (categoria: CategoriaEstoque) => number;
  precosEspessuraMap: PrecosEspessuraMap;
  precosCategoriaMap: PrecosCategoriaMap;
  stats: EstoqueStats;
}

const EstoqueContext = createContext<EstoqueContextType | undefined>(undefined);

// Categorias que usam preço por espessura (baseado em perfil_precos)
const CATEGORIAS_PRECO_ESPESSURA: CategoriaEstoque[] = ['PERFIS', 'TIRAS', 'CHAPAS', 'BLANK', 'BOBINAS'];

// Categorias que usam preço da política comercial
const CATEGORIAS_PRECO_POLITICA: CategoriaEstoque[] = ['ARAMES', 'TELHAS', 'TUBOS', 'LAMINADOS', 'VERGALHAO'];

export function EstoqueProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<EstoqueItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [categoriaAtiva, setCategoriaAtiva] = useState<CategoriaEstoque>('PERFIS');
  const [precosEspessuraMap, setPrecosEspessuraMap] = useState<PrecosEspessuraMap>({});

  // Buscar preços de perfil por espessura
  const fetchPrecos = useCallback(async () => {
    try {
      const { data } = await fetchPerfilPrecos();
      
      if (data) {
        const precos: PrecosEspessuraMap = {};
        
        // Agrupar por espessura, usando preço padrão preferencialmente
        data.forEach((preco: PerfilPreco) => {
          // Se já existe um preço para essa espessura, prioriza 'padrao'
          if (!precos[preco.espessura] || preco.tipo === 'padrao') {
            precos[preco.espessura] = preco.preco_kg;
          }
        });
        
        setPrecosEspessuraMap(precos);
      }
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

  // Função para encontrar o preço mais próximo por espessura
  const getPrecoByEspessura = useCallback((espessura: number | null): number => {
    if (!espessura || Object.keys(precosEspessuraMap).length === 0) return 0;
    
    // Busca exata primeiro
    if (precosEspessuraMap[espessura]) {
      return precosEspessuraMap[espessura];
    }
    
    // Se não encontrar, busca o mais próximo
    const espessuras = Object.keys(precosEspessuraMap).map(Number);
    if (espessuras.length === 0) return 0;
    
    let closest = espessuras[0];
    let minDiff = Math.abs(closest - espessura);
    
    for (const esp of espessuras) {
      const diff = Math.abs(esp - espessura);
      if (diff < minDiff) {
        minDiff = diff;
        closest = esp;
      }
    }
    
    return precosEspessuraMap[closest] || 0;
  }, [precosEspessuraMap]);

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
      
      // Para PERFIS, TIRAS, CHAPAS, BLANK: usar preço por espessura
      if (CATEGORIAS_PRECO_ESPESSURA.includes(item.categoria)) {
        const precoKg = getPrecoByEspessura(item.espessura);
        totalValor += pesoItem * precoKg;
      }
      // Outras categorias: valor zero por enquanto (sem preço definido)
    });

    return {
      totalItens,
      totalPecas,
      totalPeso,
      totalValor
    };
  }, [items, getPrecoByEspessura]);

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
      precosEspessuraMap,
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
