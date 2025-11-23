import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface HiddenProductionOrder {
  id: string;
  numero_pedido: string;
  hidden_by: string | null;
  hidden_by_name: string | null;
  hidden_at: string;
  motivo: string | null;
}

export function useHiddenProductionOrders() {
  const [hiddenOrders, setHiddenOrders] = useState<HiddenProductionOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  const fetchHiddenOrders = async () => {
    try {
      const { data, error } = await supabase
        .from('hidden_production_orders')
        .select('*')
        .order('hidden_at', { ascending: false });

      if (error) throw error;
      setHiddenOrders(data || []);
    } catch (error) {
      console.error('Erro ao carregar pedidos ocultos:', error);
      toast({
        title: 'Erro',
        description: 'Não foi possível carregar os pedidos ocultos.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const hideOrder = async (numeroPedido: string, motivo?: string) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Usuário não autenticado');

      const { data: profile } = await supabase
        .from('user_profiles')
        .select('full_name')
        .eq('id', user.id)
        .single();

      const { error } = await supabase
        .from('hidden_production_orders')
        .insert({
          numero_pedido: numeroPedido,
          hidden_by: user.id,
          hidden_by_name: profile?.full_name || user.email,
          motivo: motivo || null,
        });

      if (error) throw error;

      toast({
        title: 'Pedido ocultado',
        description: `Pedido ${numeroPedido} foi ocultado com sucesso.`,
      });

      await fetchHiddenOrders();
    } catch (error: any) {
      console.error('Erro ao ocultar pedido:', error);
      toast({
        title: 'Erro',
        description: error.message || 'Não foi possível ocultar o pedido.',
        variant: 'destructive',
      });
    }
  };

  const unhideOrder = async (numeroPedido: string) => {
    try {
      const { error } = await supabase
        .from('hidden_production_orders')
        .delete()
        .eq('numero_pedido', numeroPedido);

      if (error) throw error;

      toast({
        title: 'Pedido reexibido',
        description: `Pedido ${numeroPedido} voltará a ser exibido.`,
      });

      await fetchHiddenOrders();
    } catch (error: any) {
      console.error('Erro ao reexibir pedido:', error);
      toast({
        title: 'Erro',
        description: error.message || 'Não foi possível reexibir o pedido.',
        variant: 'destructive',
      });
    }
  };

  useEffect(() => {
    fetchHiddenOrders();
  }, []);

  return {
    hiddenOrders,
    loading,
    hideOrder,
    unhideOrder,
    refresh: fetchHiddenOrders,
  };
}
