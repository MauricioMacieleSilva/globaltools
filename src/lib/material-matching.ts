/**
 * Material matching utilities: extrai espessura de descrições de material
 * e determina em qual(is) categoria(s) de estoque procurar.
 */

export type EstoqueCategoria =
  | 'ARAMES' | 'BOBINAS' | 'PERFIS' | 'CHAPAS' | 'TELHAS'
  | 'TUBOS' | 'LAMINADOS' | 'VERGALHAO' | 'BLANK' | 'TIRAS';

/**
 * Categorias de material do pedido que NÃO devem ser agrupadas por espessura
 * (matching é por descrição/categoria direta).
 */
const NON_THICKNESS_CATEGORIES = [
  'TUBO', 'CANTONEIRA', 'VIGA', 'BARRA', 'TELA', 'VERGALH', 'LAMINAD', 'TB '
];

export function shouldSummarizeByThickness(descricaomat: string): boolean {
  const upper = (descricaomat || '').toUpperCase();
  return !NON_THICKNESS_CATEGORIES.some(cat => upper.includes(cat)) && !upper.startsWith('TB ');
}

/**
 * Extrai a espessura (string normalizada, ex.: "1,95") da descrição do material.
 * Compatível com a lógica existente em ResumoMateriaisTable.
 */
export function extractThickness(descricaomat: string): string | null {
  const desc = (descricaomat || '').toUpperCase().trim();
  if (!desc) return null;

  const patterns: RegExp[] = [
    /BGL\s+(\d+[.,]\d+)/i,
    /CH\s*#\s*(\d+[.,]\d+)\s*MM/i,
    /SLITTER\s+(\d+[.,]\d+)\s*MM/i,
    /CHAPA\s+(\d+[.,]\d+)\s*X/i,
    /TP\d+\s+(\d+[.,]\d+)/i,
    /(\d+[.,]\d+)\s*MM/i,
    /\b(\d+[.,]\d+)\b/,
  ];

  for (const re of patterns) {
    const m = desc.match(re);
    if (m) return m[1].replace('.', ',');
  }
  return null;
}

export function parseThicknessNumber(thickness: string): number {
  return parseFloat((thickness || '').replace(',', '.')) || 0;
}

/**
 * Determina as categorias de estoque candidatas para suprir um material do pedido.
 * Retorna [] se o material não deve participar do controle de compras por espessura.
 */
export function categorizeForStock(descricaomat: string): EstoqueCategoria[] {
  const desc = (descricaomat || '').toUpperCase();
  if (!desc) return [];

  // PERFIL CH -> matéria-prima vem de CHAPAS ou BOBINAS
  if (/\bPERFIL\b.*\bCH\b/.test(desc) || /\bPERFIL\s+CH/.test(desc)) {
    return ['CHAPAS', 'BOBINAS'];
  }
  // BLANK CH -> CHAPAS
  if (/\bBLANK\b/.test(desc)) return ['CHAPAS'];
  // SLITTER / TIRAS -> BOBINAS / TIRAS
  if (/\bSLITTER\b/.test(desc)) return ['BOBINAS', 'TIRAS'];
  // BGL / BZN -> BOBINAS
  if (/^BGL\b/.test(desc) || /^BZN\b/.test(desc) || /\bBOBINA\b/.test(desc)) {
    return ['BOBINAS'];
  }
  // CHAPA literal -> CHAPAS
  if (/\bCHAPA\b/.test(desc)) return ['CHAPAS'];
  // TELHA TPxx -> TELHAS
  if (/\bTELHA\b/.test(desc) || /\bTP\d+/.test(desc) || /\bCUMEEIRA/.test(desc)) {
    return ['TELHAS'];
  }

  // Default: se tem espessura e usa CH/MM, tentar CHAPAS+BOBINAS
  if (/CH\b/.test(desc) && /\d+[.,]\d+/.test(desc)) return ['CHAPAS', 'BOBINAS'];

  return [];
}
