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

// Item da política comercial para matching por descrição
interface PoliticaComercialPriceItem {
  descricao: string;
  preco_kg: number;
  classe: string;
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
  precosEspessuraMap: PrecosEspessuraMap;
  precosCategoriaMap: PrecosCategoriaMap;
  politicaComercialItems: PoliticaComercialPriceItem[];
  getPrecoByDescricao: (descricao: string, categoria: string) => number;
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
  const [precosCategoriaMap, setPrecosCategoriaMap] = useState<PrecosCategoriaMap>({});
  const [politicaComercialItems, setPoliticaComercialItems] = useState<PoliticaComercialPriceItem[]>([]);

  // Buscar preços de perfil por espessura
  const fetchPrecos = useCallback(async () => {
    try {
      const { data } = await fetchPerfilPrecos();
      
      if (data) {
        const precos: PrecosEspessuraMap = {};
        data.forEach((preco: PerfilPreco) => {
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

  // Buscar preços médios por categoria da política comercial
  const fetchPrecosPolitica = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('politica_comercial_itens')
        .select('classe, descricao, preco_kg')
        .eq('ativo', true)
        .not('preco_kg', 'is', null);

      if (data && !error) {
        // Store full items for description matching (TUBOS/LAMINADOS)
        const allItems: PoliticaComercialPriceItem[] = data.map((item: any) => ({
          descricao: (item.descricao as string).toUpperCase().trim(),
          preco_kg: Number(item.preco_kg),
          classe: item.classe as string,
        }));
        setPoliticaComercialItems(allItems);

        // Also compute category averages for fallback
        const precosCategoria: PrecosCategoriaMap = {};
        const somasPorCategoria: Record<string, { soma: number; count: number }> = {};

        data.forEach((item: any) => {
          const classe = item.classe as string;
          if (!somasPorCategoria[classe]) {
            somasPorCategoria[classe] = { soma: 0, count: 0 };
          }
          somasPorCategoria[classe].soma += Number(item.preco_kg);
          somasPorCategoria[classe].count += 1;
        });

        Object.entries(somasPorCategoria).forEach(([classe, { soma, count }]) => {
          precosCategoria[classe] = soma / count;
        });

        setPrecosCategoriaMap(precosCategoria);
      }
    } catch (err) {
      console.error('Error fetching precos politica comercial:', err);
    }
  }, []);

  const refreshData = useCallback(async () => {
    setLoading(true);
    setError(null);
    
    try {
      const [estoqueResult] = await Promise.all([
        fetchEstoqueItems(),
        fetchPrecos(),
        fetchPrecosPolitica()
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
  }, [fetchPrecos, fetchPrecosPolitica]);

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

  // Função para buscar preço por descrição (matching inteligente para TUBOS/LAMINADOS)
  const getPrecoByDescricao = useCallback((descricao: string, categoria: string): number => {
    if (!descricao || politicaComercialItems.length === 0) return 0;
    
    const descNorm = descricao.toUpperCase().trim();
    const categoriaItems = politicaComercialItems.filter(i => i.classe === categoria);
    
    // 1. Exact match
    const exact = categoriaItems.find(i => i.descricao === descNorm);
    if (exact) return exact.preco_kg;
    
    // 2. Contains match (description from politica contains stock description or vice versa)
    const contains = categoriaItems.find(i => 
      i.descricao.includes(descNorm) || descNorm.includes(i.descricao)
    );
    if (contains) return contains.preco_kg;
    
    // 3. Word-based similarity: find best match by common words
    const descWords = descNorm.split(/[\s\-\/×x]+/).filter(w => w.length > 1);
    let bestMatch: PoliticaComercialPriceItem | null = null;
    let bestScore = 0;
    
    for (const item of categoriaItems) {
      const itemWords = item.descricao.split(/[\s\-\/×x]+/).filter(w => w.length > 1);
      const commonWords = descWords.filter(w => itemWords.some(iw => iw.includes(w) || w.includes(iw)));
      const score = commonWords.length / Math.max(descWords.length, 1);
      if (score > bestScore && score >= 0.5) {
        bestScore = score;
        bestMatch = item;
      }
    }
    
    if (bestMatch) return bestMatch.preco_kg;
    
    // 4. Fallback to category average
    return precosCategoriaMap[categoria] || 0;
  }, [politicaComercialItems, precosCategoriaMap]);

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
      
      // Para PERFIS, TIRAS, CHAPAS, BLANK, BOBINAS: usar preço por espessura
      if (CATEGORIAS_PRECO_ESPESSURA.includes(item.categoria)) {
        const precoKg = getPrecoByEspessura(item.espessura);
        totalValor += pesoItem * precoKg;
      }
      // Para TUBOS e LAMINADOS: usar matching por descrição
      else if (item.categoria === 'TUBOS' || item.categoria === 'LAMINADOS') {
        const precoKg = getPrecoByDescricao(item.descricao, item.categoria);
        totalValor += pesoItem * precoKg;
      }
      // Para ARAMES, TELHAS, VERGALHAO: usar preço médio da categoria
      else if (CATEGORIAS_PRECO_POLITICA.includes(item.categoria)) {
        const precoKg = precosCategoriaMap[item.categoria] || 0;
        totalValor += pesoItem * precoKg;
      }
    });

    return {
      totalItens,
      totalPecas,
      totalPeso,
      totalValor
    };
  }, [items, getPrecoByEspessura, getPrecoByDescricao, precosCategoriaMap]);

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
      precosCategoriaMap,
      politicaComercialItems,
      getPrecoByDescricao,
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
