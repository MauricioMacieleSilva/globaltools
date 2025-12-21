import { supabase } from '@/integrations/supabase/client';

export interface PerfilPreco {
  id: string;
  tipo: 'padrao' | 'especial';
  espessura: number;
  preco_kg: number;
  ativo: boolean;
  created_at: string;
  updated_at: string;
}

export interface PerfilPrecoInsert {
  tipo: 'padrao' | 'especial';
  espessura: number;
  preco_kg: number;
}

export interface PerfilPrecoUpdate {
  espessura?: number;
  preco_kg?: number;
}

export async function fetchPerfilPrecos(): Promise<{ data: PerfilPreco[] | null; error: Error | null }> {
  const { data, error } = await supabase
    .from('perfil_precos')
    .select('*')
    .eq('ativo', true)
    .order('tipo', { ascending: true })
    .order('espessura', { ascending: true });

  if (error) {
    console.error('Error fetching perfil_precos:', error);
    return { data: null, error };
  }

  return { 
    data: data as PerfilPreco[], 
    error: null 
  };
}

export async function fetchPerfilPrecoByTipoEspessura(
  tipo: 'padrao' | 'especial', 
  espessura: number
): Promise<{ data: PerfilPreco | null; error: Error | null }> {
  const { data, error } = await supabase
    .from('perfil_precos')
    .select('*')
    .eq('ativo', true)
    .eq('tipo', tipo)
    .eq('espessura', espessura)
    .maybeSingle();

  if (error) {
    console.error('Error fetching perfil_preco:', error);
    return { data: null, error };
  }

  return { 
    data: data as PerfilPreco | null, 
    error: null 
  };
}

export async function createPerfilPreco(item: PerfilPrecoInsert): Promise<{ data: PerfilPreco | null; error: Error | null }> {
  const { data: userData } = await supabase.auth.getUser();
  
  const { data, error } = await supabase
    .from('perfil_precos')
    .insert({
      tipo: item.tipo,
      espessura: item.espessura,
      preco_kg: item.preco_kg,
      created_by: userData?.user?.id
    })
    .select()
    .single();

  if (error) {
    console.error('Error creating perfil_preco:', error);
    return { data: null, error };
  }

  return { 
    data: data as PerfilPreco, 
    error: null 
  };
}

export async function updatePerfilPreco(
  id: string, 
  updates: PerfilPrecoUpdate
): Promise<{ error: Error | null }> {
  const { error } = await supabase
    .from('perfil_precos')
    .update(updates)
    .eq('id', id);

  if (error) {
    console.error('Error updating perfil_preco:', error);
  }

  return { error };
}

export async function deletePerfilPreco(id: string): Promise<{ error: Error | null }> {
  // Soft delete - just set ativo = false
  const { error } = await supabase
    .from('perfil_precos')
    .update({ ativo: false })
    .eq('id', id);

  if (error) {
    console.error('Error deleting perfil_preco:', error);
  }

  return { error };
}

// Utility function to get price for a profile based on tipo and espessura
// Returns the closest espessura if exact match not found
export async function getPrecoPerfilPorEspessura(
  isPadrao: boolean,
  espessura: number
): Promise<number | null> {
  const tipo = isPadrao ? 'padrao' : 'especial';
  
  // First try exact match
  const { data: exactMatch } = await fetchPerfilPrecoByTipoEspessura(tipo, espessura);
  if (exactMatch) {
    return exactMatch.preco_kg;
  }

  // If no exact match, get all prices for this tipo and find closest
  const { data: allPrecos } = await fetchPerfilPrecos();
  if (!allPrecos || allPrecos.length === 0) {
    return null;
  }

  const precosDoTipo = allPrecos.filter(p => p.tipo === tipo);
  if (precosDoTipo.length === 0) {
    return null;
  }

  // Find closest espessura
  let closest = precosDoTipo[0];
  let minDiff = Math.abs(closest.espessura - espessura);

  for (const preco of precosDoTipo) {
    const diff = Math.abs(preco.espessura - espessura);
    if (diff < minDiff) {
      minDiff = diff;
      closest = preco;
    }
  }

  return closest.preco_kg;
}
