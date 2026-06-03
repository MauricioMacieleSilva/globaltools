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
  // RAL pode vir com prefixo "RAL 5010" ou apenas como número 4 dígitos após a cor (ex.: "PP AZUL 5010")
  let ralM = u.match(/RAL\s*(\d{3,4})/);
  if (!ralM) {
    const m2 = u.match(/\b(BRANC[AO]|PRET[AO]|CINZA|AZUL|VERMELH[AO]|AMAREL[AO]|VERDE|BEGE|MARROM)\s+(\d{4})\b/);
    if (m2) ralM = [m2[0], m2[2]] as RegExpMatchArray;
  }
  const colorWord = COLOR_KEYWORDS.find(c => new RegExp(`\\b${c}\\b`).test(u)) || null;
  const hasPP = /\bPP\b/.test(u);
  const parts: string[] = [];
  if (hasPP) parts.push('PP');
  if (colorWord) parts.push(colorWord);
  if (ralM) parts.push(`RAL ${ralM[1]}`);
  return parts.length ? parts.join(' ') : null;
}

/**
 * Pares de espessuras automaticamente equivalentes (bidirecional).
 * Ex.: estoque 0,50 supre necessidade 0,47 e vice-versa.
 * Vale para qualquer cor/acabamento (inclusive PP).
 */
const AUTO_EQUIVALENT_PAIRS: Array<[string, string]> = [
  ['0.50', '0.47'],
  ['0.43', '0.40'],
];

/**
 * Retorna a lista de espessuras canônicas equivalentes (não inclui a própria).
 */
export function getAutoEquivalentThicknesses(canonical: string): string[] {
  if (!canonical) return [];
  const out: string[] = [];
  for (const [a, b] of AUTO_EQUIVALENT_PAIRS) {
    if (canonical === a) out.push(b);
    else if (canonical === b) out.push(a);
  }
  return out;
}

/**
 * Indica se a cor/acabamento extraído corresponde a material Pré-Pintado (PP).
 * Pré-pintados NÃO podem ser substituídos por (nem substituir) material normal,
 * mesmo com mesma espessura.
 */
export function isPPColor(cor: string | null | undefined): boolean {
  if (!cor) return false;
  return /\bPP\b/.test(cor.toUpperCase());
}

/**
 * Verifica se o estoque (stockCor) pode atender uma necessidade (needCor).
 * Regras:
 * - Necessidade PP: só pode ser atendida por estoque PP de cor exatamente igual.
 * - Necessidade não-PP (com ou sem cor): só pode ser atendida por estoque não-PP.
 *   - Sem cor na necessidade: aceita qualquer estoque não-PP (com ou sem cor).
 *   - Com cor na necessidade: estoque sem cor é universal; com cor precisa bater.
 */
export function colorMatchesForStock(needCor: string | null, stockCor: string | null): boolean {
  const needIsPP = isPPColor(needCor);
  const stockIsPP = isPPColor(stockCor);
  if (needIsPP || stockIsPP) {
    // Famílias PP e normal nunca se misturam.
    return needIsPP && stockIsPP && needCor === stockCor;
  }
  // Ambos não-PP
  if (!needCor) return true;
  if (!stockCor) return true;
  return needCor === stockCor;
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
