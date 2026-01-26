import { CalculoItem } from '@/context/PerfilContext';

export interface TiraItem {
  perfilId: string;
  tipo: string;
  larguraTira: number;
  quantidade: number;
  espessura: number;
  larguraChapa: number;
  comprimento: number;
  orientacaoUZ?: 'U' | 'Z';
  base: number;
  aba1?: number;
  aba2?: number;
}

export interface DistribuicaoChapa {
  chapaIndex: number;
  tiras: { perfilId: string; tipo: string; quantidade: number; larguraTira: number }[];
  larguraUtilizada: number;
  larguraPerda: number;
}

export interface OtimizacaoGrupo {
  espessura: number;
  larguraChapa: number;
  perfis: CalculoItem[];
  distribuicao: DistribuicaoChapa[];
  aproveitamentoTotal: number;
  chapasNecessarias: number;
  pesoTotalOtimizado: number;
  pesoPerdaOtimizado: number;
  comparativoIndividual: {
    chapasIndividuais: number;
    aproveitamentoIndividual: number;
    pesoTotalIndividual: number;
    pesoPerdaIndividual: number;
  };
}

/**
 * Agrupa cálculos por espessura e largura de chapa
 */
export function agruparPorEspessuraELargura(calculos: Record<string, CalculoItem>): Map<string, CalculoItem[]> {
  const grupos = new Map<string, CalculoItem[]>();
  
  Object.values(calculos).forEach(calc => {
    if (calc.quantidade > 0 && calc.pesoTotal > 0) {
      const key = `${calc.espessura}-${calc.largura}`;
      const grupo = grupos.get(key) || [];
      grupo.push(calc);
      grupos.set(key, grupo);
    }
  });
  
  return grupos;
}

/**
 * Expande os perfis em tiras individuais para o bin-packing
 */
function expandirTiras(perfis: CalculoItem[]): TiraItem[] {
  const tiras: TiraItem[] = [];
  
  perfis.forEach(perfil => {
    // Para cada peça do perfil, adiciona uma tira
    for (let i = 0; i < perfil.quantidade; i++) {
      tiras.push({
        perfilId: perfil.id,
        tipo: perfil.tipo,
        larguraTira: perfil.tira,
        quantidade: 1,
        espessura: perfil.espessura,
        larguraChapa: perfil.largura,
        comprimento: perfil.comprimento,
        orientacaoUZ: perfil.orientacaoUZ,
        base: perfil.base,
        aba1: perfil.aba1,
        aba2: perfil.aba2
      });
    }
  });
  
  return tiras;
}

/**
 * Algoritmo First-Fit Decreasing para bin-packing
 */
function binPackingFFD(tiras: TiraItem[], larguraChapa: number): DistribuicaoChapa[] {
  // Ordena tiras por largura decrescente
  const tirasOrdenadas = [...tiras].sort((a, b) => b.larguraTira - a.larguraTira);
  
  const chapas: DistribuicaoChapa[] = [];
  
  tirasOrdenadas.forEach(tira => {
    // Tenta encontrar uma chapa existente onde a tira cabe
    let chapaEncontrada = false;
    
    for (const chapa of chapas) {
      const espacoDisponivel = larguraChapa - chapa.larguraUtilizada;
      
      if (espacoDisponivel >= tira.larguraTira) {
        // Adiciona a tira nesta chapa
        const tiraExistente = chapa.tiras.find(t => t.perfilId === tira.perfilId);
        if (tiraExistente) {
          tiraExistente.quantidade++;
        } else {
          chapa.tiras.push({
            perfilId: tira.perfilId,
            tipo: tira.tipo,
            quantidade: 1,
            larguraTira: tira.larguraTira
          });
        }
        chapa.larguraUtilizada += tira.larguraTira;
        chapa.larguraPerda = larguraChapa - chapa.larguraUtilizada;
        chapaEncontrada = true;
        break;
      }
    }
    
    if (!chapaEncontrada) {
      // Cria uma nova chapa
      chapas.push({
        chapaIndex: chapas.length,
        tiras: [{
          perfilId: tira.perfilId,
          tipo: tira.tipo,
          quantidade: 1,
          larguraTira: tira.larguraTira
        }],
        larguraUtilizada: tira.larguraTira,
        larguraPerda: larguraChapa - tira.larguraTira
      });
    }
  });
  
  return chapas;
}

/**
 * Calcula o número de chapas necessárias para cada perfil individualmente
 */
function calcularChapasIndividuais(perfis: CalculoItem[]): number {
  let totalChapas = 0;
  
  perfis.forEach(perfil => {
    const tirasNaChapa = perfil.tirasAproveitadas;
    const chapasNecessarias = Math.ceil(perfil.quantidade / tirasNaChapa);
    totalChapas += chapasNecessarias;
  });
  
  return totalChapas;
}

/**
 * Calcula o aproveitamento percentual
 */
function calcularAproveitamento(larguraUtilizada: number, larguraTotal: number): number {
  return (larguraUtilizada / larguraTotal) * 100;
}

/**
 * Calcula a otimização para um grupo de perfis
 */
export function calcularOtimizacaoGrupo(perfis: CalculoItem[]): OtimizacaoGrupo {
  if (perfis.length === 0) {
    throw new Error('Nenhum perfil para otimizar');
  }
  
  const espessura = perfis[0].espessura;
  const larguraChapa = perfis[0].largura;
  
  // Expande as tiras e executa bin-packing
  const tiras = expandirTiras(perfis);
  const distribuicao = binPackingFFD(tiras, larguraChapa);
  
  // Calcula métricas otimizadas
  const chapasNecessarias = distribuicao.length;
  const larguraTotalUtilizada = distribuicao.reduce((sum, c) => sum + c.larguraUtilizada, 0);
  const larguraTotalDisponivel = chapasNecessarias * larguraChapa;
  const aproveitamentoTotal = calcularAproveitamento(larguraTotalUtilizada, larguraTotalDisponivel);
  
  // Calcula peso otimizado (chapas utilizadas * comprimento médio * espessura * densidade)
  // Usamos o comprimento do primeiro perfil como referência (assumindo mesmo comprimento)
  const comprimentoRef = perfis[0].comprimento;
  const densidade = 8; // kg por mm³ * 10^6 (simplificado para 8 kg/m² por mm de espessura)
  
  const pesoTotalOtimizado = chapasNecessarias * larguraChapa * comprimentoRef * espessura / 1000000 * densidade;
  const pesoPerdaOtimizado = distribuicao.reduce((sum, c) => {
    return sum + (c.larguraPerda * comprimentoRef * espessura / 1000000 * densidade);
  }, 0);
  
  // Calcula métricas individuais para comparação
  const chapasIndividuais = calcularChapasIndividuais(perfis);
  const pesoTotalIndividual = perfis.reduce((sum, p) => sum + p.pesoTotal, 0);
  const pesoPerdaIndividual = perfis.reduce((sum, p) => sum + p.pesoPerda, 0);
  
  // Aproveitamento individual médio
  const larguraUtilizadaIndividual = perfis.reduce((sum, p) => {
    const chapas = Math.ceil(p.quantidade / p.tirasAproveitadas);
    return sum + (p.tirasAproveitadas * p.tira * chapas);
  }, 0);
  const larguraTotalIndividual = chapasIndividuais * larguraChapa;
  const aproveitamentoIndividual = calcularAproveitamento(larguraUtilizadaIndividual, larguraTotalIndividual);
  
  return {
    espessura,
    larguraChapa,
    perfis,
    distribuicao,
    aproveitamentoTotal,
    chapasNecessarias,
    pesoTotalOtimizado,
    pesoPerdaOtimizado,
    comparativoIndividual: {
      chapasIndividuais,
      aproveitamentoIndividual,
      pesoTotalIndividual,
      pesoPerdaIndividual
    }
  };
}

/**
 * Calcula a otimização para todos os grupos de perfis
 */
export function calcularOtimizacaoCompleta(calculos: Record<string, CalculoItem>): OtimizacaoGrupo[] {
  const grupos = agruparPorEspessuraELargura(calculos);
  const resultados: OtimizacaoGrupo[] = [];
  
  grupos.forEach((perfis, key) => {
    // Só otimiza grupos com mais de 1 perfil
    if (perfis.length > 1) {
      try {
        const resultado = calcularOtimizacaoGrupo(perfis);
        resultados.push(resultado);
      } catch (error) {
        console.error(`Erro ao otimizar grupo ${key}:`, error);
      }
    }
  });
  
  // Ordena por espessura
  return resultados.sort((a, b) => a.espessura - b.espessura);
}

/**
 * Gera uma cor única para cada tipo de perfil
 */
export function getCorPerfil(tipo: string): string {
  const cores: Record<string, string> = {
    'U': 'hsl(210, 70%, 50%)',
    'L': 'hsl(120, 60%, 45%)',
    'U_ENRIJECIDO': 'hsl(280, 60%, 50%)',
    'CARTOLA': 'hsl(30, 80%, 50%)',
    'CARTOLA_ENRIJECIDO': 'hsl(350, 70%, 50%)',
    'U_SEMI_ENRIJECIDO': 'hsl(180, 60%, 45%)',
    'CARTOLA_SEMI_ENRIJECIDO': 'hsl(45, 80%, 50%)'
  };
  
  return cores[tipo] || 'hsl(0, 0%, 50%)';
}

/**
 * Formata o nome do tipo de perfil para exibição
 */
export function formatarTipoPerfil(tipo: string): string {
  const nomes: Record<string, string> = {
    'U': 'U/Z',
    'L': 'L',
    'U_ENRIJECIDO': 'U/Z Enrijecido',
    'CARTOLA': 'Cartola',
    'CARTOLA_ENRIJECIDO': 'Cartola Enrijecido',
    'U_SEMI_ENRIJECIDO': 'U/Z Semi-Enrijecido',
    'CARTOLA_SEMI_ENRIJECIDO': 'Cartola Semi-Enrijecido'
  };
  
  return nomes[tipo] || tipo;
}
