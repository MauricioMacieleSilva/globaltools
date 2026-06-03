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
 * Chave canônica de espessura (sempre 2 casas decimais com ponto: "0.50", "1.95").
 * Use para comparar/agrupar estoque e necessidade sem ambiguidade.
 */
export function normalizeThicknessKey(value: string | number | null | undefined): string {
  if (value === null || value === undefined || value === '') return '';
  const n = typeof value === 'number' ? value : parseFloat(String(value).replace(',', '.'));
  if (!isFinite(n) || isNaN(n)) return '';
  return n.toFixed(2);
}

/** Formata espessura canônica para exibição em pt-BR ("0.50" -> "0,50"). */
export function displayThickness(canonical: string): string {
  if (!canonical) return '';
  return canonical.replace('.', ',');
}

/**
 * Lista de palavras-chave de cor/acabamento que diferenciam materiais
 * com mesma espessura (ex.: "PP BRANCA" vs "GALV").
 */
const COLOR_KEYWORDS = [
  'BRANCA', 'BRANCO', 'PRETA', 'PRETO', 'CINZA',
  'AZUL', 'VERMELHA', 'VERMELHO', 'AMARELA', 'AMARELO',
  'VERDE', 'BEGE', 'MARROM',
  'GALVALUME', 'GALVANIZADA', 'GALVANIZADO', 'GALV',
  'ZINCADA', 'ZINCADO', 'NATURAL', 'ZAR',
];

/**
 * Extrai um identificador de cor/acabamento da descrição. Retorna null se
 * não houver indicação de cor específica.
 */
export function extractColor(desc: string): string | null {
  if (!desc) return null;
  const u = desc.toUpperCase();
  const ralM = u.match(/RAL\s*(\d{3,4})/);
  const colorWord = COLOR_KEYWORDS.find(c => new RegExp(`\\b${c}\\b`).test(u)) || null;
  const hasPP = /\bPP\b/.test(u);
  const parts: string[] = [];
  if (hasPP) parts.push('PP');
  if (colorWord) parts.push(colorWord);
  if (ralM) parts.push(`RAL ${ralM[1]}`);
  return parts.length ? parts.join(' ') : null;
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
