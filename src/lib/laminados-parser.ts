/**
 * Parser inteligente para descrições de Laminados e Tubos
 * Converte medidas em polegadas fracionárias para milímetros
 * 
 * Exemplos:
 * "BARRA CHATA 2.1/2×3/8" → espessura=9.53, largura=63.50
 * "BARRA CHATA 3/8×2" → espessura=9.53, largura=50.80
 * "BARRA REDONDA 1/4" → largura=6.35 (diâmetro)
 * "TUBO REDONDO 1.1/2×2.00" → largura=38.10, espessura em mm
 * "TUBO QUADRADO 30×30×1.20" → largura=30, espessura=1.20
 */

// Converte uma fração imperial (ex: "2.1/2", "3/8", "1/4") para mm
function parseImperialToMM(value: string): number | null {
  const trimmed = value.trim();
  
  // Check if it's a pure decimal mm value (like 1.20, 3.20, etc)
  // Values <= 12.7 (0.5") without fractions could be mm thickness
  const pureDecimal = parseFloat(trimmed);
  if (!isNaN(pureDecimal) && !trimmed.includes('/') && !trimmed.includes('.') && pureDecimal > 0) {
    // Pure integer - could be inches
    return pureDecimal * 25.4;
  }
  
  // Mixed number: "2.1/2" means 2 + 1/2 inches
  const mixedMatch = trimmed.match(/^(\d+)\.(\d+)\/(\d+)$/);
  if (mixedMatch) {
    const whole = parseInt(mixedMatch[1]);
    const num = parseInt(mixedMatch[2]);
    const den = parseInt(mixedMatch[3]);
    if (den === 0) return null;
    return (whole + num / den) * 25.4;
  }
  
  // Simple fraction: "3/8", "1/4", "7/32"
  const fracMatch = trimmed.match(/^(\d+)\/(\d+)$/);
  if (fracMatch) {
    const num = parseInt(fracMatch[1]);
    const den = parseInt(fracMatch[2]);
    if (den === 0) return null;
    return (num / den) * 25.4;
  }
  
  // Pure integer inch: "2", "3"
  if (!isNaN(pureDecimal) && !trimmed.includes('.') && pureDecimal > 0) {
    return pureDecimal * 25.4;
  }
  
  // Decimal inch with dot: "1.5" - ambiguous, but in context of laminados it's usually inches
  const decMatch = trimmed.match(/^(\d+\.\d+)$/);
  if (decMatch) {
    // If it looks like a small mm value (e.g. thickness in mm like 1.20), skip
    return null;
  }
  
  return null;
}

// Known dimension table for common laminados (lookup for accuracy)
const KNOWN_DIMENSIONS: Record<string, { espessura: number; largura: number }> = {
  // BARRA CHATA - espessura × largura (in inches → mm)
  '1/8×1': { espessura: 3.18, largura: 25.40 },
  '1/8×3/4': { espessura: 3.18, largura: 19.05 },
  '3/16×1': { espessura: 4.76, largura: 25.40 },
  '3/16×1.1/4': { espessura: 4.76, largura: 31.75 },
  '3/16×1.1/2': { espessura: 4.76, largura: 38.10 },
  '3/16×2': { espessura: 4.76, largura: 50.80 },
  '1/4×1': { espessura: 6.35, largura: 25.40 },
  '1/4×1.1/2': { espessura: 6.35, largura: 38.10 },
  '1/4×2': { espessura: 6.35, largura: 50.80 },
  '1/4×2.1/2': { espessura: 6.35, largura: 63.50 },
  '1/4×3': { espessura: 6.35, largura: 76.20 },
  '1/4×4': { espessura: 6.35, largura: 101.60 },
  '5/16×1': { espessura: 7.94, largura: 25.40 },
  '5/16×1.1/4': { espessura: 7.94, largura: 31.75 },
  '5/16×1.1/2': { espessura: 7.94, largura: 38.10 },
  '5/16×2': { espessura: 7.94, largura: 50.80 },
  '5/16×2.1/2': { espessura: 7.94, largura: 63.50 },
  '5/16×3': { espessura: 7.94, largura: 76.20 },
  '3/8×1': { espessura: 9.53, largura: 25.40 },
  '3/8×1.1/4': { espessura: 9.53, largura: 31.75 },
  '3/8×1.1/2': { espessura: 9.53, largura: 38.10 },
  '3/8×2': { espessura: 9.53, largura: 50.80 },
  '3/8×2.1/2': { espessura: 9.53, largura: 63.50 },
  '3/8×3': { espessura: 9.53, largura: 76.20 },
  '3/8×4': { espessura: 9.53, largura: 101.60 },
  '1/2×1': { espessura: 12.70, largura: 25.40 },
  '1/2×1.1/2': { espessura: 12.70, largura: 38.10 },
  '1/2×2': { espessura: 12.70, largura: 50.80 },
  '1/2×2.1/2': { espessura: 12.70, largura: 63.50 },
  '1/2×3': { espessura: 12.70, largura: 76.20 },
  '1/2×4': { espessura: 12.70, largura: 101.60 },
  '5/8×2': { espessura: 15.88, largura: 50.80 },
  '5/8×2.1/2': { espessura: 15.88, largura: 63.50 },
  '5/8×3': { espessura: 15.88, largura: 76.20 },
  '3/4×2': { espessura: 19.05, largura: 50.80 },
  '3/4×3': { espessura: 19.05, largura: 76.20 },
  '3/4×4': { espessura: 19.05, largura: 101.60 },
  '1×2': { espessura: 25.40, largura: 50.80 },
  '1×3': { espessura: 25.40, largura: 76.20 },
  '1×4': { espessura: 25.40, largura: 101.60 },
  // Also support "largura×espessura" format (e.g. "2.1/2×3/8")
  '1×1/8': { espessura: 3.18, largura: 25.40 },
  '1×3/16': { espessura: 4.76, largura: 25.40 },
  '1×1/4': { espessura: 6.35, largura: 25.40 },
  '1×5/16': { espessura: 7.94, largura: 25.40 },
  '1×3/8': { espessura: 9.53, largura: 25.40 },
  '1×1/2': { espessura: 12.70, largura: 25.40 },
  '1"×1/8': { espessura: 3.18, largura: 25.40 },
  '2"×7/32': { espessura: 5.56, largura: 50.80 },
  '3×3/8': { espessura: 9.53, largura: 76.20 },
  '2×3/8': { espessura: 9.53, largura: 50.80 },
  '2×1/4': { espessura: 6.35, largura: 50.80 },
  '2.1/2×3/8': { espessura: 9.53, largura: 63.50 },
  '2.1/2×1/4': { espessura: 6.35, largura: 63.50 },
  '2.1/2×1/2': { espessura: 12.70, largura: 63.50 },
  '3×1/4': { espessura: 6.35, largura: 76.20 },
  '3×1/2': { espessura: 12.70, largura: 76.20 },
  '4×3/8': { espessura: 9.53, largura: 101.60 },
  '4×1/2': { espessura: 12.70, largura: 101.60 },
};

// BARRA REDONDA - diâmetro
const KNOWN_ROUND: Record<string, number> = {
  '1/4': 6.35,
  '5/16': 7.94,
  '3/8': 9.53,
  '7/16': 11.11,
  '1/2': 12.70,
  '5/8': 15.88,
  '3/4': 19.05,
  '7/8': 22.23,
  '1': 25.40,
  '1.1/4': 31.75,
  '1.1/2': 38.10,
  '2': 50.80,
};

export interface ParsedDimensions {
  espessura: number | null;
  largura: number | null;
  comprimento: number | null;
}

export function parseLaminadosDescription(descricao: string): ParsedDimensions {
  if (!descricao) return { espessura: null, largura: null, comprimento: null };
  
  const desc = descricao.trim().toUpperCase();
  
  // BARRA REDONDA - only has diameter
  if (desc.includes('REDONDA') || desc.includes('REDONDO')) {
    // Extract dimension part after "REDONDA" or at end
    const match = desc.match(/(?:REDOND[AO])\s+(.+?)$/i);
    if (match) {
      const dimStr = match[1].replace(/"/g, '').trim();
      // Check known table
      if (KNOWN_ROUND[dimStr]) {
        return { espessura: null, largura: KNOWN_ROUND[dimStr], comprimento: 6000 };
      }
      const mm = parseImperialToMM(dimStr);
      if (mm) {
        return { espessura: null, largura: Math.round(mm * 100) / 100, comprimento: 6000 };
      }
    }
  }
  
  // BARRA CHATA, CANTONEIRA, etc - have two dimensions (espessura × largura)
  // Extract dimension part: everything after the type name
  const dimMatch = desc.match(/(?:CHATA|CANTONEIRA|QUADRADA|SEXTAVADA|BARRA)\s+(.+?)$/i) 
    || desc.match(/([\d\/.]+\s*[×xX]\s*[\d\/.]+)/);
  
  if (dimMatch) {
    const dimStr = dimMatch[1].replace(/"/g, '').trim();
    
    // Split by × or x
    const parts = dimStr.split(/[×xX]/);
    if (parts.length >= 2) {
      const dim1Str = parts[0].trim();
      const dim2Str = parts[1].trim();
      
      // Try known dimension table first (both orientations)
      const key1 = `${dim1Str}×${dim2Str}`;
      const key2 = `${dim2Str}×${dim1Str}`;
      
      if (KNOWN_DIMENSIONS[key1]) {
        return { ...KNOWN_DIMENSIONS[key1], comprimento: 6000 };
      }
      if (KNOWN_DIMENSIONS[key2]) {
        return { ...KNOWN_DIMENSIONS[key2], comprimento: 6000 };
      }
      
      // Try to parse both as imperial
      const mm1 = parseImperialToMM(dim1Str);
      const mm2 = parseImperialToMM(dim2Str);
      
      if (mm1 !== null && mm2 !== null) {
        // Smaller dimension = espessura, larger = largura
        const espessura = Math.min(mm1, mm2);
        const largura = Math.max(mm1, mm2);
        return {
          espessura: Math.round(espessura * 100) / 100,
          largura: Math.round(largura * 100) / 100,
          comprimento: 6000
        };
      }
    }
  }
  
  return { espessura: null, largura: null, comprimento: null };
}

/**
 * Parse tube descriptions
 * "TUBO GALV. NBR 5580 2.1/2\"×3.35" → largura=63.50 (diâmetro), espessura=3.35
 * "TUBO QUAD. GALV. 20×20×1.20" → largura=20, espessura=1.20
 * "TUBO QUADRADO 30×30×1.20" → largura=30, espessura=1.20
 * "TUBO REDONDO 1.1/2×2.00" → largura=38.10, espessura=2.00
 */
export function parseTuboDescription(descricao: string): ParsedDimensions {
  if (!descricao) return { espessura: null, largura: null, comprimento: null };
  
  const desc = descricao.trim().toUpperCase();
  
  // TUBO QUADRADO / QUAD - 3 parts: lado×lado×espessura
  if (desc.includes('QUAD')) {
    const match = desc.match(/([\d.]+)\s*[×xX]\s*([\d.]+)\s*[×xX]\s*([\d.]+)/);
    if (match) {
      const lado = parseFloat(match[1]);
      const espessura = parseFloat(match[3]);
      if (!isNaN(lado) && !isNaN(espessura)) {
        return { espessura, largura: lado, comprimento: 6000 };
      }
    }
  }
  
  // TUBO REDONDO - polegada imperial × espessura em mm
  if (desc.includes('REDONDO') || desc.includes('RD')) {
    const match = desc.match(/([\d./]+)\s*[×xX]\s*([\d.]+)/);
    if (match) {
      const dimStr = match[1].trim();
      const espessura = parseFloat(match[2]);
      const diamMM = parseImperialToMM(dimStr);
      if (diamMM && !isNaN(espessura)) {
        return { espessura, largura: Math.round(diamMM * 100) / 100, comprimento: 6000 };
      }
    }
    // Single dimension (just diameter)
    const singleMatch = desc.match(/([\d./]+)"?\s*$/);
    if (singleMatch) {
      const diamMM = parseImperialToMM(singleMatch[1].trim());
      if (diamMM) {
        return { espessura: null, largura: Math.round(diamMM * 100) / 100, comprimento: 6000 };
      }
    }
  }
  
  // TUBO GALV NBR 5580 - imperial diameter × mm thickness
  if (desc.includes('GALV') || desc.includes('NBR')) {
    // Pattern: "2.1/2"×3.35 or 2.1/2×3.35
    const match = desc.match(/([\d./]+)"?\s*[×xX]\s*([\d.]+)/);
    if (match) {
      const dimStr = match[1].trim();
      const espessura = parseFloat(match[2]);
      const diamMM = parseImperialToMM(dimStr);
      if (diamMM && !isNaN(espessura)) {
        return { espessura, largura: Math.round(diamMM * 100) / 100, comprimento: 6000 };
      }
    }
    // Just diameter, like "TUBO GALV. NBR 5580 8" "
    const singleMatch = desc.match(/(\d+(?:\.\d+\/\d+|\d*\/\d+)?)"?\s*$/);
    if (singleMatch) {
      const diamMM = parseImperialToMM(singleMatch[1].trim());
      if (diamMM) {
        return { espessura: null, largura: Math.round(diamMM * 100) / 100, comprimento: 6000 };
      }
    }
  }
  
  return { espessura: null, largura: null, comprimento: null };
}
