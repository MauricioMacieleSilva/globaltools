import { supabase } from '@/integrations/supabase/client';
import type { PerfilSnapshot } from '@/context/PerfilContext';

export interface ResumoSalvo {
  id: string;
  user_id: string;
  user_name: string | null;
  nome: string;
  observacao: string | null;
  snapshot: PerfilSnapshot;
  peso_total: number;
  quantidade_pecas: number;
  created_at: string;
  updated_at: string;
}

export async function salvarResumoPerfil(params: {
  nome: string;
  observacao?: string;
  snapshot: PerfilSnapshot;
  pesoTotal: number;
  quantidadePecas: number;
}): Promise<{ data: ResumoSalvo | null; error: any }> {
  const { data: userData } = await supabase.auth.getUser();
  const user = userData?.user;
  if (!user) return { data: null, error: new Error('Usuário não autenticado') };

  const { data: profile } = await supabase
    .from('user_profiles')
    .select('full_name')
    .eq('id', user.id)
    .maybeSingle();

  const { data, error } = await supabase
    .from('perfil_resumos_salvos' as any)
    .insert({
      user_id: user.id,
      user_name: profile?.full_name || user.email || null,
      nome: params.nome,
      observacao: params.observacao || null,
      snapshot: params.snapshot as any,
      peso_total: params.pesoTotal,
      quantidade_pecas: params.quantidadePecas,
    })
    .select()
    .single();

  return { data: data as unknown as ResumoSalvo, error };
}

export async function listarResumosPerfil(): Promise<{ data: ResumoSalvo[]; error: any }> {
  const { data, error } = await supabase
    .from('perfil_resumos_salvos' as any)
    .select('*')
    .order('created_at', { ascending: false });
  return { data: (data as unknown as ResumoSalvo[]) || [], error };
}

export async function excluirResumoPerfil(id: string): Promise<{ error: any }> {
  const { error } = await supabase
    .from('perfil_resumos_salvos' as any)
    .delete()
    .eq('id', id);
  return { error };
}