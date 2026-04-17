/**
 * Motivos de "Perdido" que bloqueiam novo contato com o lead.
 * Quando um lead é marcado como perdido por um destes motivos,
 * ele deve ser sinalizado de forma destacada em toda a plataforma
 * para evitar que vendedores entrem em contato novamente.
 */
export const BLOCKED_LOSS_REASONS = [
  'Empresa Fechada/Inativa',
  'Lead já é cliente',
  'Lead é Concorrente da Global',
] as const;

const NORMALIZED_BLOCKED = BLOCKED_LOSS_REASONS.map((r) => r.toLowerCase().trim());

export function isBlockedLossReason(reason?: string | null): boolean {
  if (!reason) return false;
  return NORMALIZED_BLOCKED.includes(reason.toLowerCase().trim());
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
