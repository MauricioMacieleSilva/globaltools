import { useMemo } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Package, Weight, DollarSign, Layers } from 'lucide-react';
import { EstoqueItem, calcularPesoTotal, CATEGORIAS_UNIDADE_KG } from '@/services/estoqueService';
import { formatCurrency } from '@/lib/utils-comercial';

interface EstoqueKPIsProps {
  items: EstoqueItem[];
  precosMap: Record<string, number>; // categoria -> preço por kg
}

export function EstoqueKPIs({ items, precosMap }: EstoqueKPIsProps) {
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

    items.forEach(item => {
      if (!item.ativo) return;
      
      totalItens += 1;
      totalPecas += item.quantidade;
      
      // Calcular peso
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
      
      // Calcular valor baseado no preço por kg da política comercial
      const precoKg = precosMap[item.categoria] || 0;
      const valorItem = pesoItem * precoKg;
      totalValor += valorItem;
      
      // Agrupar por categoria
      if (!porCategoria[item.categoria]) {
        porCategoria[item.categoria] = { itens: 0, pecas: 0, peso: 0, valor: 0 };
      }
      porCategoria[item.categoria].itens += 1;
      porCategoria[item.categoria].pecas += item.quantidade;
      porCategoria[item.categoria].peso += pesoItem;
      porCategoria[item.categoria].valor += valorItem;
    });

    return {
      totalItens,
      totalPecas,
      totalPeso,
      totalValor,
      porCategoria
    };
  }, [items, precosMap]);

  const formatWeight = (peso: number) => {
    if (peso >= 1000) {
      return `${(peso / 1000).toFixed(2)} t`;
    }
    return `${peso.toFixed(2)} kg`;
  };

  return (
    <div className="grid gap-4 md:grid-cols-4">
      <Card className="bg-gradient-to-br from-blue-500/10 to-blue-600/5 border-blue-500/20">
        <CardContent className="pt-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-muted-foreground">Total de Itens</p>
              <h3 className="text-2xl font-bold text-foreground">{stats.totalItens}</h3>
              <p className="text-xs text-muted-foreground mt-1">
                Tipos de produtos cadastrados
              </p>
            </div>
            <div className="h-12 w-12 rounded-full bg-blue-500/20 flex items-center justify-center">
              <Layers className="h-6 w-6 text-blue-500" />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="bg-gradient-to-br from-green-500/10 to-green-600/5 border-green-500/20">
        <CardContent className="pt-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-muted-foreground">Total de Peças</p>
              <h3 className="text-2xl font-bold text-foreground">
                {stats.totalPecas.toLocaleString('pt-BR')}
              </h3>
              <p className="text-xs text-muted-foreground mt-1">
                Unidades em estoque
              </p>
            </div>
            <div className="h-12 w-12 rounded-full bg-green-500/20 flex items-center justify-center">
              <Package className="h-6 w-6 text-green-500" />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="bg-gradient-to-br from-orange-500/10 to-orange-600/5 border-orange-500/20">
        <CardContent className="pt-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-muted-foreground">Peso Total</p>
              <h3 className="text-2xl font-bold text-foreground">
                {formatWeight(stats.totalPeso)}
              </h3>
              <p className="text-xs text-muted-foreground mt-1">
                {(stats.totalPeso / 1000).toFixed(2)} toneladas
              </p>
            </div>
            <div className="h-12 w-12 rounded-full bg-orange-500/20 flex items-center justify-center">
              <Weight className="h-6 w-6 text-orange-500" />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="bg-gradient-to-br from-emerald-500/10 to-emerald-600/5 border-emerald-500/20">
        <CardContent className="pt-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-muted-foreground">Valor em Estoque</p>
              <h3 className="text-2xl font-bold text-foreground">
                {formatCurrency(stats.totalValor)}
              </h3>
              <p className="text-xs text-muted-foreground mt-1">
                Baseado na política comercial
              </p>
            </div>
            <div className="h-12 w-12 rounded-full bg-emerald-500/20 flex items-center justify-center">
              <DollarSign className="h-6 w-6 text-emerald-500" />
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
