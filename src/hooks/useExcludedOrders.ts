import { useState, useEffect } from 'react';

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
    // Sem banco de dados, não há pedidos excluídos
    setIsLoading(false);
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