import { supabase } from '@/integrations/supabase/client';

export type TipoMovimentacao = 'ENTRADA' | 'SAIDA' | 'AJUSTE' | 'CRIACAO' | 'EDICAO';

export interface MovimentacaoEstoque {
  id: string;
  item_id: string | null;
  tipo_movimentacao: TipoMovimentacao;
  quantidade_anterior: number | null;
  quantidade_nova: number | null;
  quantidade_movimentada: number | null;
  motivo: string | null;
  observacao: string | null;
  usuario_id: string | null;
  usuario_nome: string | null;
  item_descricao: string | null;
  item_categoria: string | null;
  created_at: string;
}

export interface FiltrosMovimentacao {
  itemId?: string;
  tipo?: TipoMovimentacao;
  dataInicio?: string;
  dataFim?: string;
  limit?: number;
}

export async function fetchMovimentacoes(filtros?: FiltrosMovimentacao): Promise<{
  data: MovimentacaoEstoque[] | null;
  error: Error | null;
}> {
  try {
    let query = supabase
      .from('estoque_movimentacoes')
      .select('*')
      .order('created_at', { ascending: false });

    if (filtros?.itemId) {
      query = query.eq('item_id', filtros.itemId);
    }

    if (filtros?.tipo) {
      query = query.eq('tipo_movimentacao', filtros.tipo);
    }

    if (filtros?.dataInicio) {
      query = query.gte('created_at', filtros.dataInicio);
    }

    if (filtros?.dataFim) {
      query = query.lte('created_at', filtros.dataFim);
    }

    if (filtros?.limit) {
      query = query.limit(filtros.limit);
    } else {
      query = query.limit(100);
    }

    const { data, error } = await query;

    if (error) throw error;

    return { data: data as MovimentacaoEstoque[], error: null };
  } catch (error) {
    console.error('Error fetching movimentacoes:', error);
    return { data: null, error: error as Error };
  }
}

export function getTipoMovimentacaoConfig(tipo: TipoMovimentacao) {
  const configs: Record<TipoMovimentacao, { label: string; color: string; icon: string }> = {
    ENTRADA: { label: 'Entrada', color: 'text-emerald-600 bg-emerald-50', icon: '↑' },
    SAIDA: { label: 'Saída', color: 'text-red-600 bg-red-50', icon: '↓' },
    AJUSTE: { label: 'Ajuste', color: 'text-amber-600 bg-amber-50', icon: '⟳' },
    CRIACAO: { label: 'Criação', color: 'text-blue-600 bg-blue-50', icon: '+' },
    EDICAO: { label: 'Edição', color: 'text-purple-600 bg-purple-50', icon: '✎' },
  };
  return configs[tipo] || configs.AJUSTE;
}
