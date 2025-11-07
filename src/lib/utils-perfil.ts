export function formatarNumero(valor: number): string {
  return valor.toLocaleString('pt-BR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  });
}

export function gerarId(): string {
  return Math.random().toString(36).substr(2, 9);
}

export function formatarMilhar(valor: number): string {
  return valor.toLocaleString('pt-BR');
}

// Tabela de espessura x aba mínima
const TABELA_ABA_MINIMA: Record<string, number> = {
  '2.00': 15,
  '2.25': 15,
  '2.65': 17,
  '3.00': 20,
  '3.35': 25,
  '3.75': 25,
  '4.25': 25,
  '4.75': 25,
  '6.35': 35,
  '8.00': 47,
  '9.52': 60
};

export function obterAbaMinimaPermitida(espessura: number): number | null {
  // Arredondar para 2 casas decimais para comparação
  const espessuraStr = espessura.toFixed(2);
  return TABELA_ABA_MINIMA[espessuraStr] || null;
}

export function validarAbaMinima(espessura: number, aba: number): { 
  valida: boolean; 
  abaMinimaPermitida: number | null; 
  mensagem: string 
} {
  const abaMinimaPermitida = obterAbaMinimaPermitida(espessura);
  
  if (!abaMinimaPermitida) {
    // Sem regra específica para esta espessura
    return {
      valida: true,
      abaMinimaPermitida: null,
      mensagem: ''
    };
  }
  
  if (aba < abaMinimaPermitida) {
    return {
      valida: false,
      abaMinimaPermitida,
      mensagem: `Para espessura ${espessura.toFixed(2)}, a aba mínima permitida é ${abaMinimaPermitida}mm`
    };
  }
  
  return {
    valida: true,
    abaMinimaPermitida,
    mensagem: ''
  };
}