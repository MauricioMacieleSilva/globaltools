/**
 * Mapeia códigos de classe para nomes descritivos
 */
const classeMapping: Record<string, string> = {
  // Perfis
  '608': 'PERFIS',
  '614': 'PERFIS', 
  '618': 'PERFIS',
  '619': 'PERFIS',
  
  // Chapas
  '626': 'CHAPAS',
  '627': 'CHAPAS',
  '628': 'CHAPAS',
  
  // Telhas
  '166': 'TELHAS',
  '691': 'TELHAS',
  '692': 'TELHAS',
  
  // Vergalhões
  '633': 'VERGALHÕES',
  '634': 'VERGALHÕES',
  
  // Tubos
  '615': 'TUBOS',
  '616': 'TUBOS',
  '617': 'TUBOS',
  
  // Barras
  '620': 'BARRAS',
  '621': 'BARRAS',
  
  // Cantoneiras
  '610': 'CANTONEIRAS',
  '611': 'CANTONEIRAS',
  
  // Acessórios
  '690': 'ACESSÓRIOS',
  '693': 'ACESSÓRIOS',
};

/**
 * Converte código de classe em nome descritivo
 * Se não encontrar mapeamento, retorna o código original com prefixo "CLASSE"
 */
export function getClasseName(codigo: string): string {
  if (!codigo || codigo === 'SEM CLASSE') return 'SEM CLASSE';
  
  // Remove espaços em branco
  const codigoLimpo = codigo.trim();
  
  // Busca no mapeamento
  if (classeMapping[codigoLimpo]) {
    return classeMapping[codigoLimpo];
  }
  
  // Se não encontrar, retorna código com prefixo
  return `CLASSE ${codigoLimpo}`;
}

/**
 * Retorna lista de todas as classes únicas disponíveis (nomes descritivos)
 */
export function getAllClasseNames(): string[] {
  const uniqueNames = new Set(Object.values(classeMapping));
  return Array.from(uniqueNames).sort();
}
