/**
 * Motivos de "Perdido" que bloqueiam novo contato com o lead.
 * Quando um lead é marcado como perdido por um destes motivos,
 * ele deve ser sinalizado de forma destacada em toda a plataforma
 * para evitar que vendedores entrem em contato novamente.
 */
import { supabase } from '@/integrations/supabase/client';

// Fallback estático caso o carregamento dinâmico ainda não tenha acontecido.
export const BLOCKED_LOSS_REASONS = [
  'Empresa Fechada/Inativa',
  'Lead já é cliente',
  'Lead é Concorrente da Global',
  'Cliente Sem Interesse em Aço',
  'Produto de interesse não disponível',
  'Telefone não é do cliente',
] as const;

const norm = (s: string) => s.toLowerCase().trim();

const dynamicBlocked = new Set<string>(BLOCKED_LOSS_REASONS.map(norm));

let loadPromise: Promise<void> | null = null;
export function loadBlockedLossReasons(): Promise<void> {
  if (loadPromise) return loadPromise;
  loadPromise = (async () => {
    try {
      const { data, error } = await supabase
        .from('crm_loss_reasons')
        .select('name, is_definitive')
        .eq('is_definitive', true);
      if (error) throw error;
      (data || []).forEach((r: any) => {
        if (r?.name) dynamicBlocked.add(norm(r.name));
      });
    } catch (e) {
      console.warn('[lead-blocked-reasons] failed to load dynamic list', e);
      loadPromise = null; // permite retry
    }
  })();
  return loadPromise;
}

// Dispara o carregamento na importação do módulo.
loadBlockedLossReasons();

export function isBlockedLossReason(reason?: string | null): boolean {
  if (!reason) return false;
  return dynamicBlocked.has(norm(reason));
}

export function getBlockedReasonLabel(reason?: string | null): string {
  if (!reason) return '';
  if (reason.toLowerCase().includes('fechada') || reason.toLowerCase().includes('inativa')) {
    return 'Empresa Fechada/Inativa';
  }
  if (reason.toLowerCase().includes('já é cliente') || reason.toLowerCase().includes('ja e cliente')) {
    return 'Já é Cliente';
  }
  if (reason.toLowerCase().includes('concorrente')) {
    return 'É Concorrente';
  }
  return reason;
}
