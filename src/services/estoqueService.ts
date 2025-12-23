import { supabase } from "@/integrations/supabase/client";

export type CategoriaEstoque = 
  | 'ARAMES' 
  | 'BOBINAS' 
  | 'PERFIS' 
  | 'CHAPAS' 
  | 'TELHAS' 
  | 'TUBOS' 
  | 'LAMINADOS' 
  | 'VERGALHAO' 
  | 'BLANK' 
  | 'TIRAS';

export interface EstoqueItem {
  id: string;
  categoria: CategoriaEstoque;
  descricao: string;
  quantidade: number;
  unidade: string;
  tipo_perfil: string | null;
  espessura: number | null;
  largura: number | null;
  comprimento: number | null;
  base: number | null;
  aba1: number | null;
  aba2: number | null;
  imagem_url: string | null;
  localizacao: string | null;
  observacoes: string | null;
  ativo: boolean;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export type EstoqueItemInsert = Omit<EstoqueItem, 'id' | 'created_at' | 'updated_at'>;
export type EstoqueItemUpdate = Partial<EstoqueItemInsert>;

export const CATEGORIAS_ESTOQUE: { value: CategoriaEstoque; label: string }[] = [
  { value: 'ARAMES', label: 'Arames' },
  { value: 'BOBINAS', label: 'Bobinas' },
  { value: 'PERFIS', label: 'Perfis' },
  { value: 'CHAPAS', label: 'Chapas' },
  { value: 'TELHAS', label: 'Telhas' },
  { value: 'TUBOS', label: 'Tubos' },
  { value: 'LAMINADOS', label: 'Laminados' },
  { value: 'VERGALHAO', label: 'Vergalhão' },
  { value: 'BLANK', label: 'Blank' },
  { value: 'TIRAS', label: 'Tiras' },
];

export const TIPOS_PERFIL = [
  { value: 'U', label: 'Perfil U' },
  { value: 'Z', label: 'Perfil Z' },
  { value: 'L', label: 'Perfil L' },
  { value: 'CARTOLA', label: 'Cartola' },
  { value: 'U_ENRIJECIDO', label: 'U Enrijecido' },
  { value: 'U_SEMI_ENRIJECIDO', label: 'U Semi Enrijecido' },
  { value: 'CARTOLA_ENRIJECIDO', label: 'Cartola Enrijecido' },
  { value: 'CARTOLA_SEMI_ENRIJECIDO', label: 'Cartola Semi Enrijecido' },
];

// Fetch all items
export async function fetchEstoqueItems(categoria?: CategoriaEstoque) {
  let query = supabase
    .from('estoque_itens')
    .select('*')
    .eq('ativo', true)
    .order('categoria')
    .order('descricao');

  if (categoria) {
    query = query.eq('categoria', categoria);
  }

  const { data, error } = await query;
  return { data: data as EstoqueItem[] | null, error };
}

// Create new item
export async function createEstoqueItem(item: EstoqueItemInsert) {
  const { data, error } = await supabase
    .from('estoque_itens')
    .insert(item)
    .select()
    .single();
  
  return { data: data as EstoqueItem | null, error };
}

// Update item
export async function updateEstoqueItem(id: string, updates: EstoqueItemUpdate) {
  const { data, error } = await supabase
    .from('estoque_itens')
    .update(updates)
    .eq('id', id)
    .select()
    .single();
  
  return { data: data as EstoqueItem | null, error };
}

// Delete item (soft delete)
export async function deleteEstoqueItem(id: string) {
  const { error } = await supabase
    .from('estoque_itens')
    .update({ ativo: false })
    .eq('id', id);
  
  return { error };
}

// Upload image
export async function uploadEstoqueImage(file: File): Promise<{ url: string | null; error: Error | null }> {
  try {
    const fileExt = file.name.split('.').pop();
    const fileName = `${crypto.randomUUID()}.${fileExt}`;
    const filePath = `${fileName}`;

    const { error: uploadError } = await supabase.storage
      .from('estoque-imagens')
      .upload(filePath, file);

    if (uploadError) throw uploadError;

    const { data } = supabase.storage
      .from('estoque-imagens')
      .getPublicUrl(filePath);

    return { url: data.publicUrl, error: null };
  } catch (error) {
    console.error('Error uploading image:', error);
    return { url: null, error: error as Error };
  }
}

// Delete image
export async function deleteEstoqueImage(imageUrl: string): Promise<{ error: Error | null }> {
  try {
    const fileName = imageUrl.split('/').pop();
    if (!fileName) throw new Error('Invalid image URL');

    const { error } = await supabase.storage
      .from('estoque-imagens')
      .remove([fileName]);

    if (error) throw error;
    return { error: null };
  } catch (error) {
    console.error('Error deleting image:', error);
    return { error: error as Error };
  }
}

// Search for compatible materials for Corte Perfil integration
export interface SearchResult {
  exactMatch: EstoqueItem[];
  compatibleMaterials: EstoqueItem[];
  approximateMatches: EstoqueItem[];
}

export async function searchCompatibleMaterials(
  tipoPerfil: string,
  espessura: number,
  base?: number,
  aba1?: number,
  aba2?: number,
  tolerancia: number = 0.05 // 5% tolerance
): Promise<SearchResult> {
  const result: SearchResult = {
    exactMatch: [],
    compatibleMaterials: [],
    approximateMatches: []
  };

  try {
    // Fetch all active items
    const { data: items, error } = await supabase
      .from('estoque_itens')
      .select('*')
      .eq('ativo', true)
      .in('categoria', ['PERFIS', 'BOBINAS', 'CHAPAS', 'TIRAS']);

    if (error) throw error;
    if (!items) return result;

    const allItems = items as EstoqueItem[];

    // Find exact matches (same profile type and dimensions)
    result.exactMatch = allItems.filter(item => {
      if (item.categoria !== 'PERFIS') return false;
      if (item.tipo_perfil !== tipoPerfil) return false;
      if (item.espessura !== espessura) return false;
      if (base && item.base !== base) return false;
      if (aba1 && item.aba1 !== aba1) return false;
      if (aba2 && item.aba2 !== aba2) return false;
      return item.quantidade > 0;
    });

    // Find compatible raw materials (bobinas, chapas, tiras with matching thickness)
    result.compatibleMaterials = allItems.filter(item => {
      if (!['BOBINAS', 'CHAPAS', 'TIRAS'].includes(item.categoria)) return false;
      if (item.espessura !== espessura) return false;
      return item.quantidade > 0;
    });

    // Find approximate matches (similar dimensions within tolerance)
    const minEspessura = espessura * (1 - tolerancia);
    const maxEspessura = espessura * (1 + tolerancia);

    result.approximateMatches = allItems.filter(item => {
      if (item.categoria !== 'PERFIS') return false;
      if (item.tipo_perfil !== tipoPerfil) return false;
      if (!item.espessura) return false;
      
      // Already in exact match
      if (result.exactMatch.some(e => e.id === item.id)) return false;
      
      // Check if within tolerance
      if (item.espessura < minEspessura || item.espessura > maxEspessura) return false;
      
      return item.quantidade > 0;
    });

  } catch (error) {
    console.error('Error searching compatible materials:', error);
  }

  return result;
}
