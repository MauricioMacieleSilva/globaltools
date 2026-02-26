import { supabase } from '@/integrations/supabase/client';

export interface Frete {
  id: string;
  numero_pedido: string;
  notas_fiscais: string[];
  data_embarque: string;
  transportadora_id: string | null;
  transportadora_nome: string;
  valor_frete: number;
  data_entrega: string | null;
  observacoes: string | null;
  created_by: string;
  created_at: string;
  updated_at: string;
}

export interface FreteInsert {
  numero_pedido: string;
  notas_fiscais: string[];
  data_embarque: string;
  transportadora_id?: string | null;
  transportadora_nome: string;
  valor_frete: number;
  data_entrega?: string | null;
  observacoes?: string | null;
}

export async function loadFretes(): Promise<Frete[]> {
  const { data, error } = await (supabase as any)
    .from('fretes')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) throw new Error(error.message);
  return data || [];
}

export async function loadFretesByPedido(numeroPedido: string): Promise<Frete[]> {
  const { data, error } = await (supabase as any)
    .from('fretes')
    .select('*')
    .eq('numero_pedido', numeroPedido)
    .order('data_embarque', { ascending: false });

  if (error) throw new Error(error.message);
  return data || [];
}

export async function insertFrete(frete: FreteInsert): Promise<Frete> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Usuário não autenticado');

  const { data, error } = await (supabase as any)
    .from('fretes')
    .insert({ ...frete, created_by: user.id })
    .select()
    .single();

  if (error) throw new Error(error.message);
  return data;
}

export async function updateFrete(id: string, frete: Partial<FreteInsert>): Promise<Frete> {
  const { data, error } = await (supabase as any)
    .from('fretes')
    .update(frete)
    .eq('id', id)
    .select()
    .single();

  if (error) throw new Error(error.message);
  return data;
}

export async function deleteFrete(id: string): Promise<void> {
  const { error } = await (supabase as any)
    .from('fretes')
    .delete()
    .eq('id', id);

  if (error) throw new Error(error.message);
}

export async function loadTransportadoras(): Promise<Array<{ id: string; nome: string }>> {
  const { data, error } = await supabase
    .from('transportadoras')
    .select('id, nome')
    .eq('ativo', true)
    .order('nome');

  if (error) throw new Error(error.message);
  return data || [];
}
