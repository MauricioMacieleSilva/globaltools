import { useMemo } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Package, Weight, DollarSign, Layers } from 'lucide-react';
import { EstoqueItem, calcularPesoTotal, CategoriaEstoque, CATEGORIAS_ESTOQUE } from '@/services/estoqueService';
import { formatCurrency } from '@/lib/utils-comercial';

// Categorias que usam preço por espessura (baseado em perfil_precos)
const CATEGORIAS_PRECO_ESPESSURA: CategoriaEstoque[] = ['PERFIS', 'TIRAS', 'CHAPAS', 'BLANK', 'BOBINAS'];

interface EstoqueKPIsProps {
  items: EstoqueItem[];
  precosEspessuraMap: Record<number, number>; // espessura -> preço por kg
}

export function EstoqueKPIs({ items, precosEspessuraMap }: EstoqueKPIsProps) {
  // Função para encontrar o preço mais próximo por espessura
  const getPrecoByEspessura = (espessura: number | null): number => {
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
  };

  const stats = useMemo(() => {
    let totalItens = 0;
    let totalPecas = 0;
    let totalPeso = 0;
    let totalValor = 0;
    
    const porCategoria: Record<string, { 
      itens: number; 
      pecas: number; 
      peso: number; 
      valor: number 
    }> = {};

    // Inicializar todas as categorias
    CATEGORIAS_ESTOQUE.forEach(cat => {
      porCategoria[cat.value] = { itens: 0, pecas: 0, peso: 0, valor: 0 };
    });

    items.forEach(item => {
      if (!item.ativo) return;
      
      totalItens += 1;
      totalPecas += item.quantidade;
      
      // Calcular peso para todos os itens
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
      
      // Calcular valor baseado na espessura para PERFIS, TIRAS, CHAPAS, BLANK
      let valorItem = 0;
      if (CATEGORIAS_PRECO_ESPESSURA.includes(item.categoria as CategoriaEstoque)) {
        const precoKg = getPrecoByEspessura(item.espessura);
        valorItem = pesoItem * precoKg;
      }
      totalValor += valorItem;
      
      // Agrupar por categoria
      if (porCategoria[item.categoria]) {
        porCategoria[item.categoria].itens += 1;
        porCategoria[item.categoria].pecas += item.quantidade;
        porCategoria[item.categoria].peso += pesoItem;
        porCategoria[item.categoria].valor += valorItem;
      }
    });

    // Gerar lista de categorias com itens
    const categoriasComItens = CATEGORIAS_ESTOQUE
      .filter(cat => porCategoria[cat.value]?.itens > 0)
      .map(cat => cat.label);

    return {
      totalItens,
      totalPecas,
      totalPeso,
      totalValor,
      porCategoria,
      categoriasComItens
    };
  }, [items, precosEspessuraMap]);

  const formatWeight = (peso: number) => {
    if (peso >= 1000) {
      return `${(peso / 1000).toFixed(2)} t`;
    }
    return `${peso.toFixed(2)} kg`;
  };

  return (
    <div className="grid gap-3 grid-cols-1 sm:grid-cols-3">
      <Card className="bg-gradient-to-br from-blue-500/10 to-blue-600/5 border-blue-500/20">
        <CardContent className="py-4 sm:py-6">
          <div className="flex items-center justify-between gap-3">
            <div className="flex-1 min-w-0">
              <p className="text-xs sm:text-sm font-medium text-muted-foreground mb-0.5 sm:mb-1">Total de Itens</p>
              <h3 className="text-2xl sm:text-3xl font-bold text-foreground">{stats.totalItens}</h3>
              <p className="text-xs text-muted-foreground mt-1 sm:mt-2 truncate">
                {stats.categoriasComItens.length > 0 
                  ? `Em ${stats.categoriasComItens.length} categorias` 
                  : 'Nenhum item cadastrado'}
              </p>
            </div>
            <div className="h-10 w-10 sm:h-14 sm:w-14 rounded-full bg-blue-500/20 flex items-center justify-center shrink-0">
              <Layers className="h-5 w-5 sm:h-7 sm:w-7 text-blue-500" />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="bg-gradient-to-br from-orange-500/10 to-orange-600/5 border-orange-500/20">
        <CardContent className="py-4 sm:py-6">
          <div className="flex items-center justify-between gap-3">
            <div className="flex-1 min-w-0">
              <p className="text-xs sm:text-sm font-medium text-muted-foreground mb-0.5 sm:mb-1">Peso Total</p>
              <h3 className="text-2xl sm:text-3xl font-bold text-foreground">
                {formatWeight(stats.totalPeso)}
              </h3>
            </div>
            <div className="h-10 w-10 sm:h-14 sm:w-14 rounded-full bg-orange-500/20 flex items-center justify-center shrink-0">
              <Weight className="h-5 w-5 sm:h-7 sm:w-7 text-orange-500" />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="bg-gradient-to-br from-emerald-500/10 to-emerald-600/5 border-emerald-500/20">
        <CardContent className="py-4 sm:py-6">
          <div className="flex items-center justify-between gap-3">
            <div className="flex-1 min-w-0">
              <p className="text-xs sm:text-sm font-medium text-muted-foreground mb-0.5 sm:mb-1">Valor em Estoque</p>
              <h3 className="text-2xl sm:text-3xl font-bold text-foreground">
                {formatCurrency(stats.totalValor)}
              </h3>
            </div>
            <div className="h-10 w-10 sm:h-14 sm:w-14 rounded-full bg-emerald-500/20 flex items-center justify-center shrink-0">
              <DollarSign className="h-5 w-5 sm:h-7 sm:w-7 text-emerald-500" />
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
