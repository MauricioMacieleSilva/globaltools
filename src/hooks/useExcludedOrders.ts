import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface ExcludedOrder {
  id: string;
  numero_pedido: string;
  numero_nf?: string;
  motivo?: string;
  excluded_by: string;
  excluded_at: string;
}

export function useExcludedOrders() {
  const [excludedOrders, setExcludedOrders] = useState<Set<string>>(new Set());
  const [isLoading, setIsLoading] = useState(false);

  const loadExcludedOrders = async () => {
    try {
      setIsLoading(true);
      const { data, error } = await supabase
        .from('excluded_orders')
        .select('numero_pedido');

      if (error) throw error;

      const orderNumbers = new Set((data || []).map(o => o.numero_pedido));
      setExcludedOrders(orderNumbers);
    } catch (error) {
      console.error('Erro ao carregar pedidos excluídos:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadExcludedOrders();
  }, []);

  const isOrderExcluded = (numeroPedido: string) => {
    return excludedOrders.has(numeroPedido);
  };

  const refreshExcludedOrders = () => {
    loadExcludedOrders();
  };

  return {
    excludedOrders,
    isLoading,
    isOrderExcluded,
    refreshExcludedOrders
  };
}