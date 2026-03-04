import { supabase } from '@/integrations/supabase/client';

export interface Frete {
  id: string;
  numero_pedido: string;
  notas_fiscais: string[];
  data_embarque: string;
  transportadora_id: string | null;
  transportadora_nome: string;
  valor_frete: number;
  peso_kg: number;
  data_entrega: string | null;
  observacoes: string | null;
  status: string;
  cliente_id: string | null;
  cliente_nome: string | null;
  cidade_entrega: string | null;
  uf_entrega: string | null;
  approved_by: string | null;
  approved_at: string | null;
  motivo_aprovacao: string | null;
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
  peso_kg?: number;
  data_entrega?: string | null;
  observacoes?: string | null;
  cliente_id?: string | null;
  cliente_nome?: string | null;
  cidade_entrega?: string | null;
  uf_entrega?: string | null;
}

export interface Transportadora {
  id: string;
  nome: string;
  telefone: string | null;
  email: string | null;
  cidades_atendimento: string[];
  regioes_atendimento: string[];
  observacoes: string | null;
  ativo: boolean;
}

async function getUserName(): Promise<string> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return 'Desconhecido';
  const { data: profile } = await supabase
    .from('user_profiles')
    .select('full_name')
    .eq('id', user.id)
    .single();
  return profile?.full_name || user.email || 'Desconhecido';
}

async function addHistoryEntry(freteId: string, acao: string, statusAnterior?: string | null, statusNovo?: string | null, observacao?: string | null) {
  const { data: { user } } = await supabase.auth.getUser();
  const userName = await getUserName();
  await (supabase as any)
    .from('frete_historico')
    .insert({
      frete_id: freteId,
      acao,
      status_anterior: statusAnterior || null,
      status_novo: statusNovo || null,
      usuario_id: user?.id || null,
      usuario_nome: userName,
      observacao: observacao || null,
    });
}

export async function loadFretes(): Promise<Frete[]> {
  const { data, error } = await (supabase as any)
    .from('fretes')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) throw new Error(error.message);
  return data || [];
}

export async function insertFrete(frete: FreteInsert): Promise<Frete> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Usuário não autenticado');

  const { data, error } = await (supabase as any)
    .from('fretes')
    .insert({ ...frete, created_by: user.id, status: 'rascunho' })
    .select()
    .single();

  if (error) throw new Error(error.message);

  // Log history
  await addHistoryEntry(data.id, 'criacao', null, 'rascunho', `Frete criado para pedido ${frete.numero_pedido}`);

  return data;
}

export async function updateFrete(id: string, frete: Partial<FreteInsert>): Promise<Frete> {
  // Get current state for history - fetch all fields we track
  const { data: current } = await (supabase as any).from('fretes').select('*').eq('id', id).single();

  const { data, error } = await (supabase as any)
    .from('fretes')
    .update(frete)
    .eq('id', id)
    .select()
    .single();

  if (error) throw new Error(error.message);

  // Build detailed change description
  const changes: string[] = [];
  const fieldLabels: Record<string, string> = {
    numero_pedido: 'Nº Pedido',
    cliente_nome: 'Cliente',
    transportadora_nome: 'Transportadora',
    valor_frete: 'Valor do Frete',
    peso_kg: 'Peso (kg)',
    data_embarque: 'Data de Embarque',
    data_entrega: 'Data de Entrega',
    cidade_entrega: 'Cidade de Entrega',
    uf_entrega: 'UF',
    observacoes: 'Observações',
    notas_fiscais: 'Notas Fiscais',
  };

  if (current) {
    for (const [key, label] of Object.entries(fieldLabels)) {
      const oldVal = current[key];
      const newVal = (frete as any)[key];
      if (newVal !== undefined) {
        const oldStr = Array.isArray(oldVal) ? oldVal.join(', ') : String(oldVal ?? '-');
        const newStr = Array.isArray(newVal) ? newVal.join(', ') : String(newVal ?? '-');
        if (oldStr !== newStr) {
          changes.push(`${label}: "${oldStr}" → "${newStr}"`);
        }
      }
    }
  }

  const observacao = changes.length > 0 ? changes.join('; ') : 'Dados do frete editados (sem alterações detectadas)';
  await addHistoryEntry(id, 'edicao', current?.status, current?.status, observacao);

  return data;
}

export async function approveFrete(id: string, motivo?: string): Promise<Frete> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Usuário não autenticado');

  const { data, error } = await (supabase as any)
    .from('fretes')
    .update({ status: 'aprovado', approved_by: user.id, approved_at: new Date().toISOString(), motivo_aprovacao: motivo || null })
    .eq('id', id)
    .select()
    .single();

  if (error) throw new Error(error.message);

  await addHistoryEntry(id, 'aprovacao', 'pendente', 'aprovado', motivo || null);

  return data;
}

export async function rejectFrete(id: string, motivo?: string): Promise<Frete> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Usuário não autenticado');

  const { data, error } = await (supabase as any)
    .from('fretes')
    .update({ status: 'rejeitado', approved_by: user.id, approved_at: new Date().toISOString(), motivo_aprovacao: motivo || null })
    .eq('id', id)
    .select()
    .single();

  if (error) throw new Error(error.message);

  await addHistoryEntry(id, 'rejeicao', 'pendente', 'rejeitado', motivo || null);

  return data;
}

export async function deleteFrete(id: string): Promise<void> {
  const { error } = await (supabase as any)
    .from('fretes')
    .delete()
    .eq('id', id);

  if (error) throw new Error(error.message);
}

export async function loadTransportadoras(): Promise<Transportadora[]> {
  const { data, error } = await supabase
    .from('transportadoras')
    .select('*')
    .eq('ativo', true)
    .order('nome');

  if (error) throw new Error(error.message);
  return data || [];
}

export async function insertTransportadora(t: { nome: string; telefone?: string; email?: string; observacoes?: string }): Promise<Transportadora> {
  const { data: { user } } = await supabase.auth.getUser();
  const { data, error } = await supabase
    .from('transportadoras')
    .insert({ ...t, cidades_atendimento: [], regioes_atendimento: [], created_by: user?.id } as any)
    .select()
    .single();

  if (error) throw new Error(error.message);
  return data as any;
}

export async function updateTransportadora(id: string, t: Partial<{ nome: string; telefone: string; email: string; observacoes: string; ativo: boolean }>): Promise<Transportadora> {
  const { data, error } = await supabase
    .from('transportadoras')
    .update(t)
    .eq('id', id)
    .select()
    .single();

  if (error) throw new Error(error.message);
  return data as any;
}

export async function sendFreteForApproval(id: string): Promise<Frete> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Usuário não autenticado');

  const { data, error } = await (supabase as any)
    .from('fretes')
    .update({ status: 'pendente' })
    .eq('id', id)
    .select()
    .single();

  if (error) throw new Error(error.message);

  await addHistoryEntry(id, 'envio_aprovacao', 'rascunho', 'pendente', 'Frete enviado para aprovação');

  // Send approval email via edge function
  try {
    await supabase.functions.invoke('notify-frete-approval', {
      body: { frete_id: id },
    });
  } catch (emailErr) {
    console.error('Erro ao enviar email de aprovação:', emailErr);
  }

  return data;
}

export async function loadClientes(): Promise<Array<{ id: string; nome: string }>> {
  const { data, error } = await supabase
    .from('clientes')
    .select('id, nome')
    .order('nome');

  if (error) throw new Error(error.message);
  return data || [];
}

export async function loadPedidosByCliente(clienteId: string): Promise<Array<{ id: string; numero_pedido: string }>> {
  const { data, error } = await supabase
    .from('pedidos')
    .select('id, numero_pedido')
    .eq('cliente_id', clienteId)
    .order('data_pedido', { ascending: false });

  if (error) throw new Error(error.message);
  return data || [];
}
