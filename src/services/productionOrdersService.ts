import { supabase } from '@/integrations/supabase/client';

export interface ProductionOrderData {
  id: string;
  numero_pedido: string;
  novo_prazo: string | null;
  situacao: string | null;  // Allowing string to handle database values
  updated_by: string;
  updated_by_name: string;
  created_at: string;
  updated_at: string;
}

export interface ProductionOrderUpdate {
  numero_pedido: string;
  novo_prazo?: string | null;
  situacao?: 'aguardando_mp' | 'em_producao' | null;
}

// Carregar todos os dados de pedidos de produção
export async function loadProductionOrders(): Promise<Record<string, ProductionOrderData>> {
  try {
    const { data, error } = await (supabase as any)
      .from('production_orders')
      .select('*')
      .order('updated_at', { ascending: false });

    if (error) {
      console.error('Erro ao carregar dados de produção:', error);
      throw new Error(`Erro ao carregar dados de produção: ${error.message}`);
    }

    // Converter array em objeto indexado por numero_pedido para facilitar acesso
    const orders: Record<string, ProductionOrderData> = {};
    (data || []).forEach((order: any) => {
      orders[order.numero_pedido] = order as ProductionOrderData;
    });

    console.log('Dados de produção carregados:', Object.keys(orders).length, 'pedidos');
    return orders;
  } catch (error) {
    console.error('Erro ao carregar dados de produção:', error);
    return {};
  }
}

// Salvar ou atualizar um pedido de produção
export async function saveProductionOrder(orderData: ProductionOrderUpdate): Promise<void> {
  try {
    // Buscar dados do usuário atual
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      throw new Error('Usuário não autenticado');
    }

    // Buscar nome do usuário no perfil
    const { data: profile } = await supabase
      .from('user_profiles')
      .select('full_name')
      .eq('id', user.id)
      .single();

    const userName = profile?.full_name || user.email || 'Usuário desconhecido';

    // Usar upsert para inserir ou atualizar automaticamente
    const { error } = await (supabase as any)
      .from('production_orders')
      .upsert({
        numero_pedido: orderData.numero_pedido,
        novo_prazo: orderData.novo_prazo,
        situacao: orderData.situacao,
        updated_by: user.id,
        updated_by_name: userName,
        updated_at: new Date().toISOString()
      }, {
        onConflict: 'numero_pedido'
      });

    if (error) {
      console.error('Erro ao salvar dados de produção:', error);
      throw new Error(`Erro ao salvar dados: ${error.message}`);
    }

    console.log('Dados de produção salvos com sucesso para pedido:', orderData.numero_pedido);
  } catch (error) {
    console.error('Erro ao salvar dados de produção:', error);
    throw error;
  }
}

// Buscar dados de um pedido específico
export async function getProductionOrder(numeroPedido: string): Promise<ProductionOrderData | null> {
  try {
    const { data, error } = await (supabase as any)
      .from('production_orders')
      .select('*')
      .eq('numero_pedido', numeroPedido)
      .maybeSingle();

    if (error) {
      console.error('Erro ao buscar dados do pedido:', error);
      return null;
    }

    return data as ProductionOrderData;
  } catch (error) {
    console.error('Erro ao buscar dados do pedido:', error);
    return null;
  }
}