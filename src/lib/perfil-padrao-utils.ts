// Dados do Perfil Padrão U
export const perfilPadraoU = [
  { h: 50, B: 25, espessuras: [2.00, 2.25, 2.65, 3.00] },
  { h: 68, B: 30, espessuras: [2.00, 2.25, 2.65, 3.00, 4.75] },
  { h: 75, B: 38, espessuras: [2.00, 2.25, 2.65, 3.00, 4.75] },
  { h: 75, B: 40, espessuras: [2.00, 2.25, 2.65, 3.00, 4.75] },
  { h: 92, B: 30, espessuras: [2.00, 2.25, 2.65, 3.00, 4.75] },
  { h: 100, B: 40, espessuras: [2.00, 2.25, 2.65, 3.00, 4.75] },
  { h: 100, B: 50, espessuras: [2.00, 2.25, 2.65, 3.00, 4.75] },
  { h: 127, B: 50, espessuras: [2.00, 2.25, 2.65, 3.00, 4.75] },
  { h: 150, B: 50, espessuras: [2.00, 2.25, 2.65, 3.00, 4.75] },
  { h: 200, B: 50, espessuras: [2.00, 2.25, 2.65, 3.00, 4.75] },
];

// Dados do Perfil Padrão UE (Enrijecido)
export const perfilPadraoUE = [
  { h: 50, B: 25, d: 10, espessuras: [2.00, 2.25, 2.65, 3.00] },
  { h: 75, B: 40, d: 15, espessuras: [2.00, 2.25, 2.65, 3.00] },
  { h: 100, B: 40, d: 17, espessuras: [2.00, 2.25, 2.65, 3.00] },
  { h: 100, B: 50, d: 17, espessuras: [2.00, 2.25, 2.65, 3.00] },
  { h: 127, B: 50, d: 17, espessuras: [2.00, 2.25, 2.65, 3.00] },
  { h: 150, B: 60, d: 20, espessuras: [2.00, 2.25, 2.65, 3.00] },
  { h: 200, B: 60, d: 20, espessuras: [2.00, 2.25, 2.65, 3.00] },
];

export interface VerificacaoPerfilU {
  isPadrao: boolean;
  perfilEncontrado?: typeof perfilPadraoU[0];
}

export interface VerificacaoPerfilUE {
  isPadrao: boolean;
  perfilEncontrado?: typeof perfilPadraoUE[0];
}

// Tolerância para comparação de valores (em mm)
const TOLERANCIA = 0.5;

function aproximadamenteIgual(a: number, b: number): boolean {
  return Math.abs(a - b) <= TOLERANCIA;
}

/**
 * Verifica se um perfil U é padrão
 * Para Perfil U: h = Base, B = Aba
 */
export function verificarPerfilUPadrao(
  espessura: number,
  base: number, // h
  aba: number   // B
): VerificacaoPerfilU {
  if (!espessura || !base || !aba) {
    return { isPadrao: false };
  }

  const perfilEncontrado = perfilPadraoU.find(p => 
    aproximadamenteIgual(p.h, base) && 
    aproximadamenteIgual(p.B, aba) &&
    p.espessuras.some(e => aproximadamenteIgual(e, espessura))
  );

  return {
    isPadrao: !!perfilEncontrado,
    perfilEncontrado
  };
}

/**
 * Verifica se um perfil UE (Enrijecido) é padrão
 * Para Perfil UE: h = Base, B = Aba, d = Enrijecedor
 */
export function verificarPerfilUEPadrao(
  espessura: number,
  base: number,     // h
  aba: number,      // B
  enrijecedor: number // d
): VerificacaoPerfilUE {
  if (!espessura || !base || !aba || !enrijecedor) {
    return { isPadrao: false };
  }

  const perfilEncontrado = perfilPadraoUE.find(p => 
    aproximadamenteIgual(p.h, base) && 
    aproximadamenteIgual(p.B, aba) &&
    aproximadamenteIgual(p.d, enrijecedor) &&
    p.espessuras.some(e => aproximadamenteIgual(e, espessura))
  );

  return {
    isPadrao: !!perfilEncontrado,
    perfilEncontrado
  };
}
