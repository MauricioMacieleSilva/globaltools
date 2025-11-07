/**
 * Função utilitária para determinar se uma situação representa um pedido faturado
 */
export function isFaturado(situacao: string): boolean {
  const situacoesFaturadas = [
    "Faturado",
    "Emitida",  // NF emitida = venda concretizada
  ];
  
  return situacoesFaturadas.includes(situacao);
}

/**
 * Formata valor monetário para o padrão brasileiro
 */
export function formatCurrency(value: number): string {
  return value.toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL'
  });
}

/**
 * Calcula a diferença em dias entre duas datas
 */
export function getDiasEntreDatas(dataInicial: Date, dataFinal: Date = new Date()): number {
  return Math.floor((dataFinal.getTime() - dataInicial.getTime()) / (1000 * 60 * 60 * 24));
}

/**
 * Função utilitária para parsear datas em múltiplos formatos com prioridade brasileira
 */
export function parseDate(dateString: string): Date | null {
  if (!dateString || dateString.trim() === '') return null;
  
  const cleanDateString = dateString.trim();
  
  // Função auxiliar para validar valores de data
  const isValidDate = (day: number, month: number, year: number): boolean => {
    return day >= 1 && day <= 31 && month >= 1 && month <= 12 && year >= 2020 && year <= 2030;
  };
  
  // 1. Formato brasileiro dd/MM/yyyy (prioridade máxima)
  let match = cleanDateString.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (match) {
    const firstNum = parseInt(match[1]);
    const secondNum = parseInt(match[2]);
    const year = parseInt(match[3]);
    
    let day: number, month: number;
    
    // Detecção inteligente: se primeiro número > 12, obrigatoriamente é dia
    if (firstNum > 12) {
      day = firstNum;
      month = secondNum;
    } else if (secondNum > 12) {
      // Se segundo número > 12, primeiro é mês
      day = secondNum;
      month = firstNum;
    } else {
      // Ambos ≤ 12: assumir formato brasileiro por padrão
      day = firstNum;
      month = secondNum;
    }
    
    if (isValidDate(day, month, year)) {
      return new Date(year, month - 1, day);
    }
  }
  
  // 2. Formato brasileiro dd-MM-yyyy
  match = cleanDateString.match(/^(\d{1,2})-(\d{1,2})-(\d{4})$/);
  if (match) {
    const firstNum = parseInt(match[1]);
    const secondNum = parseInt(match[2]);
    const year = parseInt(match[3]);
    
    let day: number, month: number;
    
    if (firstNum > 12) {
      day = firstNum;
      month = secondNum;
    } else if (secondNum > 12) {
      day = secondNum;
      month = firstNum;
    } else {
      day = firstNum;
      month = secondNum;
    }
    
    if (isValidDate(day, month, year)) {
      return new Date(year, month - 1, day);
    }
  }
  
  // 3. Formato internacional yyyy-MM-dd
  match = cleanDateString.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
  if (match) {
    const year = parseInt(match[1]);
    const month = parseInt(match[2]);
    const day = parseInt(match[3]);
    
    if (isValidDate(day, month, year)) {
      return new Date(year, month - 1, day);
    }
  }
  
  // 4. Fallback para Date constructor padrão
  try {
    const date = new Date(cleanDateString);
    if (!isNaN(date.getTime()) && date.getFullYear() >= 2020 && date.getFullYear() <= 2030) {
      return date;
    }
  } catch (error) {
    console.warn(`Failed to parse date: ${cleanDateString}`, error);
  }
  
  return null;
}

/**
 * Formata data de forma segura para exibição em português brasileiro
 */
export function formatDateSafe(dateString?: string): string {
  if (!dateString) return '-';
  
  const date = parseDate(dateString);
  return date ? date.toLocaleDateString('pt-BR') : '-';
}