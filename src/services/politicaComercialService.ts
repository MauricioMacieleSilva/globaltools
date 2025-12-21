import { supabase } from "@/integrations/supabase/client";

export interface PoliticaComercialData {
  id?: string;
  codigo?: string;
  descricao: string;
  preco: number;
  unidade: string;
  classe: string;
  ipi: string;
  precoM2?: number;
  precoKg?: number;
  ativo?: boolean;
}

export interface PoliticaComercialItem {
  id: string;
  classe: string;
  descricao: string;
  preco: number;
  unidade: string;
  ipi: string;
  preco_m2: number | null;
  preco_kg: number | null;
  ativo: boolean;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

// Fetch all items grouped by class
export async function fetchAllPoliticaComercialData(): Promise<Record<string, PoliticaComercialData[]>> {
  const classes = ['ARAMES', 'BOBINAS', 'PERFIS', 'CHAPAS', 'TELHAS', 'TUBOS', 'LAMINADOS', 'VERGALHAO', 'BLANK'];
  
  const { data, error } = await supabase
    .from('politica_comercial_itens')
    .select('*')
    .eq('ativo', true)
    .order('descricao');

  if (error) {
    console.error('Error fetching all items:', error);
    return {};
  }

  const result: Record<string, PoliticaComercialData[]> = {};
  
  classes.forEach(classe => {
    result[classe] = (data || [])
      .filter(item => item.classe === classe)
      .map(item => ({
        id: item.id,
        descricao: item.descricao,
        preco: Number(item.preco),
        unidade: item.unidade,
        classe: item.classe,
        ipi: item.ipi || '-',
        precoM2: item.preco_m2 ? Number(item.preco_m2) : undefined,
        precoKg: item.preco_kg ? Number(item.preco_kg) : undefined,
        ativo: item.ativo
      }));
  });

  return result;
}

// Create new item
export async function createPoliticaComercialItem(item: {
  classe: string;
  descricao: string;
  preco: number;
  unidade: string;
  ipi?: string;
  preco_m2?: number;
  preco_kg?: number;
}): Promise<{ data: PoliticaComercialItem | null; error: Error | null }> {
  const { data: userData } = await supabase.auth.getUser();
  
  const { data, error } = await supabase
    .from('politica_comercial_itens')
    .insert({
      classe: item.classe,
      descricao: item.descricao,
      preco: item.preco,
      unidade: item.unidade,
      ipi: item.ipi || '-',
      preco_m2: item.preco_m2 || null,
      preco_kg: item.preco_kg || null,
      created_by: userData.user?.id || null
    })
    .select()
    .single();

  if (error) {
    return { data: null, error: new Error(error.message) };
  }

  return { data: data as PoliticaComercialItem, error: null };
}

// Update existing item
export async function updatePoliticaComercialItem(
  id: string,
  updates: {
    descricao?: string;
    preco?: number;
    unidade?: string;
    ipi?: string;
    preco_m2?: number | null;
    preco_kg?: number | null;
  }
): Promise<{ data: PoliticaComercialItem | null; error: Error | null }> {
  const { data, error } = await supabase
    .from('politica_comercial_itens')
    .update(updates)
    .eq('id', id)
    .select()
    .single();

  if (error) {
    return { data: null, error: new Error(error.message) };
  }

  return { data: data as PoliticaComercialItem, error: null };
}

// Soft delete item (set ativo = false)
export async function deletePoliticaComercialItem(id: string): Promise<{ error: Error | null }> {
  const { error } = await supabase
    .from('politica_comercial_itens')
    .update({ ativo: false })
    .eq('id', id);

  if (error) {
    return { error: new Error(error.message) };
  }

  return { error: null };
}
