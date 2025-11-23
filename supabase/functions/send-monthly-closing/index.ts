import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";
import { Resend } from "https://esm.sh/resend@4.0.0";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));
const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Mesmos IDs da planilha usados no googleSheetsService.ts
const SHEET_ID = "13F5NcT8Z6quDcW4OmoG8MOhHCRT1W9nWXmNGX839MGo";
const GID = "2063157767";

// Interface IGUAL ao ComercialData do frontend e do send-manual-report
interface ComercialData {
  numeropedido: string;
  situacao: string;
  data_emissao: string;
  data_inicio: string;
  data_perdido: string;
  data_pedido_pronto: string;
  valor: number;
  peso: number;
  classe: string;
  cli_nomefantasia: string;
  cliente: string;
  codigocliente: string;
  uf: string;
  vendedor: string;
  faturamento_tipo: number;
  produto: string;
  obs: string;
  perdido_motivo: string;
}

interface EmailKPIs {
  faturamento: number;
  peso: number;
  numClientes: number;
  ticketMedio: number;
  valorPorKg: number;
  perdidosValor: number;
  perdidosQtd: number;
  diasUteis: number;
  mediaDiaria: number;
}

interface HistoricoFaturamento {
  mes: string;
  anoAtual: number;
  anoAnterior: number;
}

interface VendedorPerformance {
  nome: string;
  faturamento: number;
  numPedidos: number;
  ticketMedio: number;
  percentualTotal: number;
}

// Parse CSV - IGUAL ao googleSheetsService.ts
function parseCSV(csvText: string): string[][] {
  const lines = csvText.split('\n');
  const result: string[][] = [];
  
  for (const line of lines) {
    const values: string[] = [];
    let currentValue = '';
    let insideQuotes = false;
    
    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      
      if (char === '"') {
        insideQuotes = !insideQuotes;
      } else if (char === ',' && !insideQuotes) {
        values.push(currentValue.trim());
        currentValue = '';
      } else {
        currentValue += char;
      }
    }
    
    values.push(currentValue.trim());
    result.push(values);
  }
  
  return result;
}

// Parse de data - IGUAL ao utils-comercial.ts
function parseDate(dateString: string): Date | null {
  if (!dateString || dateString === 'Invalid Date' || dateString === '') {
    return null;
  }

  // Formato brasileiro dd/MM/yyyy (prioridade)
  const brFormatMatch = dateString.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  if (brFormatMatch) {
    const [, day, month, year] = brFormatMatch;
    const date = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
    if (date.getFullYear() >= 2020 && date.getFullYear() <= 2030) {
      return date;
    }
  }

  // Formato brasileiro com traço dd-MM-yyyy
  const brDashMatch = dateString.match(/^(\d{2})-(\d{2})-(\d{4})$/);
  if (brDashMatch) {
    const [, day, month, year] = brDashMatch;
    const date = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
    if (date.getFullYear() >= 2020 && date.getFullYear() <= 2030) {
      return date;
    }
  }

  // Formato ISO yyyy-MM-dd
  const isoFormatMatch = dateString.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (isoFormatMatch) {
    const [, year, month, day] = isoFormatMatch;
    const date = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
    if (date.getFullYear() >= 2020 && date.getFullYear() <= 2030) {
      return date;
    }
  }

  // Fallback: tentar Date nativo
  try {
    const date = new Date(dateString);
    if (!isNaN(date.getTime()) && date.getFullYear() >= 2020 && date.getFullYear() <= 2030) {
      return date;
    }
  } catch {
    return null;
  }

  return null;
}

// Determinar qual campo de data usar - IGUAL ao ComercialContext (sessão 'dashboard')
function getDateField(item: ComercialData): Date | null {
  // Emitida/Faturado usa data_emissao
  if (item.situacao === 'Emitida' || item.situacao === 'Faturado') {
    return parseDate(item.data_emissao || '');
  }
  // Demais situações usam data_inicio
  return parseDate(item.data_inicio || '');
}

// Calcula dias úteis (segunda a sexta) entre duas datas
function calcularDiasUteis(startDate: Date, endDate: Date): number {
  let diasUteis = 0;
  const current = new Date(startDate);
  
  while (current <= endDate) {
    const diaSemana = current.getDay();
    // 0 = domingo, 6 = sábado
    if (diaSemana !== 0 && diaSemana !== 6) {
      diasUteis++;
    }
    current.setDate(current.getDate() + 1);
  }
  
  return diasUteis;
}

// Carregar dados da planilha - IGUAL ao googleSheetsService.ts
async function loadComercialDataFromSheet(): Promise<ComercialData[]> {
  const CSV_URL = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/export?format=csv&gid=${GID}`;
  console.log('📊 Buscando dados da planilha...');
  
  try {
    const response = await fetch(CSV_URL, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; SupabaseEdgeFunction/1.0)',
      },
    });
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    const csvText = await response.text();
    const rows = parseCSV(csvText);
    
    console.log(`✅ ${rows.length} linhas parseadas`);
    
    if (rows.length < 2) {
      console.warn('⚠️ Planilha vazia ou só com header');
      return [];
    }
    
    // Processar linhas de dados (pular header) - ÍNDICES FIXOS como no Dashboard
    const comercialData: ComercialData[] = rows
      .slice(1)
      .filter((row: string[]) => row.length > 30 && row[3]) // Filtrar linhas válidas
      .map((row: string[]): ComercialData => {
        return {
          numeropedido: row[1] || '', // Coluna B
          situacao: (row[3] || '').trim().replace(/\s+/g, ' '), // Coluna D
          data_emissao: row[4] || '', // Coluna E
          data_inicio: row[33] || '', // Coluna AH
          data_perdido: row[35] || '', // Coluna AJ
          data_pedido_pronto: row[34] || '', // Coluna AI
          valor: parseFloat(row[14]?.replace(',', '.')) || 0, // Coluna O
          peso: parseFloat(row[19]?.replace(',', '.')) || 0, // Coluna T
          classe: (row[21] || '').trim().replace(/\s+/g, ' '), // Coluna V
          cli_nomefantasia: row[29] || '', // Coluna AD
          cliente: row[29] || '', // Coluna AD
          codigocliente: row[28] || '', // Coluna AC
          uf: (row[30] || '').trim().replace(/\s+/g, ' '), // Coluna AE
          vendedor: (row[27] || 'Não informado').trim().replace(/\s+/g, ' '), // Coluna AB
          faturamento_tipo: parseInt(row[43]) || 0, // Coluna AR
          produto: row[9] || '', // Coluna J
          obs: row[10] || '', // Coluna K
          perdido_motivo: (row[46] || '').trim().replace(/\s+/g, ' '), // Coluna AU
        };
      })
      .filter((item: ComercialData) => {
        // Filtrar registros válidos
        if (!item.situacao || item.valor <= 0) return false;
        
        // Excluir clientes que contenham "GLOBAL AÇO" no nome
        const nomeFantasia = item.cli_nomefantasia?.toUpperCase() || '';
        if (nomeFantasia.includes('GLOBAL AÇO')) {
          return false;
        }
        
        return true;
      });
    
    console.log(`✅ ${comercialData.length} registros carregados da planilha`);
    return comercialData;
    
  } catch (error) {
    console.error('❌ Erro ao buscar dados da planilha:', error);
    throw error;
  }
}

// Calcular KPIs - IGUAL ao send-manual-report
function calculateKPIs(
  allData: ComercialData[],
  startDate: Date,
  endDate: Date
): EmailKPIs {
  console.log(`📊 Calculando KPIs para período: ${startDate.toLocaleDateString('pt-BR')} a ${endDate.toLocaleDateString('pt-BR')}`);
  
  const filteredData = allData.filter(item => {
    const date = getDateField(item);
    return date && date >= startDate && date <= endDate;
  });
  
  console.log(`📋 Registros no período: ${filteredData.length} de ${allData.length} totais`);
  
  const faturados = filteredData.filter(item =>
    (item.situacao === 'Emitida' || item.situacao === 'Pedido') &&
    item.faturamento_tipo === 1
  );
  const faturado = faturados.reduce((acc, item) => acc + item.valor, 0);
  const peso = faturados.reduce((acc, item) => acc + item.peso, 0);
  const clientesUnicos = new Set(faturados.map(item => item.codigocliente).filter(Boolean));
  const numClientes = clientesUnicos.size;
  const ticketMedio = numClientes > 0 ? faturado / numClientes : 0;
  const valorPorKg = peso > 0 ? faturado / peso : 0;
  
  console.log(`💰 Faturamento: R$ ${faturado.toFixed(2)} (${faturados.length} registros)`);
  console.log(`⚖️ Peso: ${peso.toFixed(2)} kg`);
  console.log(`👥 Clientes: ${numClientes}`);
  console.log(`🎫 Ticket Médio: R$ ${ticketMedio.toFixed(2)}`);
  console.log(`💵 R$/kg: R$ ${valorPorKg.toFixed(2)}`);

  
  // Calcular perdidos usando data_perdido
  const perdidosData = allData.filter(item => {
    if (item.situacao !== 'Perdido') return false;
    if (!item.perdido_motivo || item.perdido_motivo === 'Não informado') return false;

    const datePerdido = parseDate(item.data_perdido || '');
    const fallbackDate =
      datePerdido ||
      parseDate(item.data_inicio || '') ||
      parseDate(item.data_emissao || '');

    return fallbackDate && fallbackDate >= startDate && fallbackDate <= endDate;
  });

  const perdidosValor = perdidosData.reduce((acc, item) => acc + item.valor, 0);
  const perdidosQtd = new Set(
    perdidosData.map(item => item.numeropedido).filter(Boolean)
  ).size;

  const diasUteis = calcularDiasUteis(startDate, endDate);
  const mediaDiaria = diasUteis > 0 ? faturado / diasUteis : 0;

  return {
    faturamento: faturado,
    peso,
    numClientes,
    ticketMedio,
    valorPorKg,
    perdidosValor,
    perdidosQtd,
    diasUteis,
    mediaDiaria,
  };
}

// Calcular histórico de faturamento (últimos 12 meses + ano anterior)
function calcularHistoricoFaturamento(
  allData: ComercialData[],
  targetMonth: number,
  targetYear: number
): HistoricoFaturamento[] {
  const historico: HistoricoFaturamento[] = [];
  const mesesNomes = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
  
  // Calcular para os últimos 12 meses
  for (let i = 11; i >= 0; i--) {
    const mes = targetMonth - i;
    let ano = targetYear;
    let mesIndex = mes - 1;
    
    if (mes <= 0) {
      ano = targetYear - 1;
      mesIndex = 12 + mes - 1;
    }
    
    const startDate = new Date(ano, mesIndex, 1);
    const endDate = new Date(ano, mesIndex + 1, 0);
    const anoAnterior = ano - 1;
    const startDateAnterior = new Date(anoAnterior, mesIndex, 1);
    const endDateAnterior = new Date(anoAnterior, mesIndex + 1, 0);
    
    // Calcular faturamento do ano atual
    const faturadosAnoAtual = allData.filter(item => {
      const date = getDateField(item);
      return (
        date &&
        date >= startDate &&
        date <= endDate &&
        (item.situacao === 'Emitida' || item.situacao === 'Pedido') &&
        item.faturamento_tipo === 1
      );
    });
    const faturamentoAnoAtual = faturadosAnoAtual.reduce((acc, item) => acc + item.valor, 0);
    
    // Calcular faturamento do ano anterior
    const faturadosAnoAnterior = allData.filter(item => {
      const date = getDateField(item);
      return (
        date &&
        date >= startDateAnterior &&
        date <= endDateAnterior &&
        (item.situacao === 'Emitida' || item.situacao === 'Pedido') &&
        item.faturamento_tipo === 1
      );
    });
    const faturamentoAnoAnterior = faturadosAnoAnterior.reduce((acc, item) => acc + item.valor, 0);
    
    historico.push({
      mes: `${mesesNomes[mesIndex]}/${ano.toString().substring(2)}`,
      anoAtual: faturamentoAnoAtual,
      anoAnterior: faturamentoAnoAnterior,
    });
  }
  
  return historico;
}

// Calcular Ranking de Vendedores - IGUAL ao send-manual-report
function calcularRankingVendedores(
  allData: ComercialData[],
  startDate: Date,
  endDate: Date
): VendedorPerformance[] {
  const faturadosNoPeriodo = allData.filter(item => {
    const date = getDateField(item);
    return (
      date &&
      date >= startDate &&
      date <= endDate &&
      (item.situacao === 'Emitida' || item.situacao === 'Pedido') &&
      item.faturamento_tipo === 1 &&
      item.vendedor &&
      item.vendedor !== 'VENDEDOR' &&
      item.vendedor !== 'Não informado'
    );
  });

  const vendedoresMap: Record<string, { faturamento: number; pedidos: Set<string> }> = {};

  faturadosNoPeriodo.forEach(item => {
    const vendedor = item.vendedor || 'Não informado';
    if (!vendedoresMap[vendedor]) {
      vendedoresMap[vendedor] = { faturamento: 0, pedidos: new Set() };
    }
    vendedoresMap[vendedor].faturamento += item.valor;
    vendedoresMap[vendedor].pedidos.add(item.numeropedido);
  });

  const totalFaturamento = Object.values(vendedoresMap).reduce(
    (sum, v) => sum + v.faturamento,
    0
  );

  const ranking = Object.entries(vendedoresMap)
    .map(([nome, dados]) => {
      const numPedidos = dados.pedidos.size || 1;
      return {
        nome,
        faturamento: dados.faturamento,
        numPedidos,
        ticketMedio: dados.faturamento / numPedidos,
        percentualTotal:
          totalFaturamento > 0
            ? (dados.faturamento / totalFaturamento) * 100
            : 0,
      } as VendedorPerformance;
    })
    .sort((a, b) => b.faturamento - a.faturamento);

  console.log('🏆 Ranking de vendedores:', ranking);
  return ranking;
}

function formatCurrency(value: number): string {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL'
  }).format(value);
}

// Gerar gráfico de histórico de faturamento em HTML
function generateHistoricoChart(historico: HistoricoFaturamento[], mesAtual: string, anoAtual: number): string {
  const maxValue = Math.max(...historico.map(h => Math.max(h.anoAtual, h.anoAnterior)));
  
  const rows = historico.map((h) => {
    const widthAtual = maxValue > 0 ? (h.anoAtual / maxValue) * 100 : 0;
    const widthAnterior = maxValue > 0 ? (h.anoAnterior / maxValue) * 100 : 0;
    const isMesDestaque = h.mes.includes(`/${anoAtual.toString().substring(2)}`);
    
    return `
      <tr style="border-bottom: 1px solid #e2e8f0;">
        <td style="padding: 8px 10px; font-size: 11px; color: #4a5568; white-space: nowrap; font-weight: ${isMesDestaque ? 'bold' : 'normal'};">
          ${isMesDestaque ? '▶ ' : ''}${h.mes}
        </td>
        <td style="padding: 8px 10px; width: 100%;">
          <div style="position: relative; height: 32px;">
            <!-- Barra Ano Atual -->
            <div style="position: absolute; top: 0; left: 0; height: 14px; width: ${widthAtual}%; background: ${isMesDestaque ? '#48bb78' : '#4299e1'}; border-radius: 3px;"></div>
            <!-- Barra Ano Anterior -->
            <div style="position: absolute; top: 18px; left: 0; height: 14px; width: ${widthAnterior}%; background: #cbd5e0; border-radius: 3px;"></div>
          </div>
        </td>
        <td style="padding: 8px 10px; text-align: right; font-size: 10px; color: #718096; white-space: nowrap;">
          <div style="margin-bottom: 2px;">${formatCurrency(h.anoAtual)}</div>
          <div style="color: #a0aec0;">${formatCurrency(h.anoAnterior)}</div>
        </td>
      </tr>
    `;
  }).join('');
  
  return `
    <div style="background: #f7fafc; padding: 16px; border-radius: 8px; margin-bottom: 16px; overflow-x: auto;">
      <!-- Legenda -->
      <div style="display: flex; justify-content: center; gap: 20px; margin-bottom: 12px; font-size: 11px;">
        <div style="display: flex; align-items: center; gap: 6px;">
          <div style="width: 20px; height: 12px; background: #4299e1; border-radius: 2px;"></div>
          <span style="color: #2d3748;">Ano Atual</span>
        </div>
        <div style="display: flex; align-items: center; gap: 6px;">
          <div style="width: 20px; height: 12px; background: #cbd5e0; border-radius: 2px;"></div>
          <span style="color: #2d3748;">Ano Anterior</span>
        </div>
      </div>
      
      <!-- Tabela com barras -->
      <table style="width: 100%; border-collapse: collapse; background: white; border-radius: 6px; overflow: hidden;">
        ${rows}
      </table>
      
      <p style="text-align: center; color: #718096; font-size: 10px; margin: 12px 0 0 0;">
        Comparativo de faturamento mensal • Mês em destaque: ▶ ${mesAtual}/${anoAtual}
      </p>
    </div>
  `;
}

function generateReportHTML(
  kpis: EmailKPIs,
  monthName: string,
  year: number,
  metaMensal: number | null,
  periodo: string,
  ranking: VendedorPerformance[],
  historico: HistoricoFaturamento[]
): string {
  const realizadoMes = kpis.faturamento;
  const percentualMeta = metaMensal ? (realizadoMes / metaMensal) * 100 : 0;
  const faltaMeta = metaMensal ? metaMensal - realizadoMes : 0;
  
  let statusMeta = '✗';
  let corMeta = '#f56565';
  if (percentualMeta >= 100) {
    statusMeta = '✓';
    corMeta = '#48bb78';
  } else if (percentualMeta >= 80) {
    statusMeta = '⚠';
    corMeta = '#ed8936';
  }

  const rankingRows = ranking
    .map((vendedor, index) => {
      const posicao =
        index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : index + 1;
      const isTop3 = index < 3;
      return `
        <tr>
          <td style="padding: 8px 10px; font-weight: ${isTop3 ? 'bold' : 'normal'};">${posicao}</td>
          <td style="padding: 8px 10px; font-weight: ${isTop3 ? 'bold' : 'normal'};">${vendedor.nome}</td>
          <td style="padding: 8px 10px; text-align: right; font-weight: ${isTop3 ? 'bold' : 'normal'};">${formatCurrency(vendedor.faturamento)}</td>
          <td style="padding: 8px 10px; text-align: center;">${vendedor.numPedidos}</td>
          <td style="padding: 8px 10px; text-align: right;">${formatCurrency(vendedor.ticketMedio)}</td>
          <td style="padding: 8px 10px; text-align: right;">${vendedor.percentualTotal.toFixed(1)}%</td>
        </tr>
      `;
    })
    .join('');

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <style>
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; margin: 0; padding: 20px; background-color: #f5f5f5; color: #2d3748; }
        .container { max-width: 900px; margin: 0 auto; background: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 2px 8px rgba(0,0,0,0.1); }
        .header { background: #1e40af !important; background-color: #1e40af !important; color: #ffffff !important; padding: 24px 30px; text-align: center; }
        .header h1 { margin: 0 !important; font-size: 22px !important; color: #ffffff !important; }
        .header p { margin: 6px 0 0 0 !important; opacity: 0.95 !important; font-size: 13px !important; color: #ffffff !important; }
        .header-icon { font-size: 32px !important; margin-bottom: 8px !important; }
        .header-subtitle { margin: 4px 0 !important; font-size: 14px !important; opacity: 0.95 !important; color: #ffffff !important; }
        .content { padding: 24px 30px 30px 30px; background: #ffffff; }
        .section-title { font-size: 16px; font-weight: 600; color: #2d3748 !important; margin: 0 0 12px 0; border-bottom: 2px solid #e2e8f0; padding-bottom: 6px; }
        .section-title.no-border { border-bottom: none; }
        .section-title.spaced { margin-top: 16px; }
        .kpi-grid { display: grid; grid-template-columns: 1fr; gap: 10px; margin-bottom: 16px; }
        .kpi-card { background: #f8f9fa; border-radius: 8px; padding: 16px 18px; border-left: 3px solid #667eea; }
        .kpi-card.success { border-left-color: #48bb78; }
        .kpi-card.warning { border-left-color: #ed8936; }
        .kpi-card.danger { border-left-color: #f56565; }
        .kpi-card.info { border-left-color: #4299e1; }
        .kpi-label { font-size: 11px; text-transform: uppercase; color: #718096 !important; font-weight: 600; margin-bottom: 6px; }
        .kpi-value { font-size: 20px; font-weight: 700; color: #2d3748 !important; }
        .kpi-subtitle { font-size: 12px; color: #718096 !important; margin-top: 3px; }
        .meta-section { background: #f7fafc; padding: 18px 20px; border-radius: 8px; box-shadow: 0 1px 3px rgba(0,0,0,0.05); margin-bottom: 16px; }
        .meta-grid { display: grid; grid-template-columns: 1fr; gap: 10px; }
        .meta-item { padding: 6px 0; }
        .meta-label { color: #718096 !important; font-size: 12px; margin-bottom: 2px; }
        .meta-value { color: #2d3748 !important; font-size: 18px; font-weight: bold; }
        .ranking-table { width: 100%; border-collapse: collapse; margin-top: 8px; margin-bottom: 16px; background: #ffffff; }
        .ranking-table th, .ranking-table td { border-bottom: 1px solid #e2e8f0; font-size: 13px; color: #2d3748 !important; }
        .ranking-table th { background: #f7fafc; padding: 8px 10px; text-align: left; color: #4a5568 !important; font-weight: 600; }
        .ranking-table td { padding: 8px 10px; color: #2d3748 !important; }
        .analysis { background: #ffffff; padding: 16px 18px; border-radius: 8px; box-shadow: 0 1px 3px rgba(0,0,0,0.05); margin-top: 18px; }
        .analysis p { margin: 6px 0; color: #4a5568 !important; line-height: 1.6; font-size: 13px; }
        .cta-section { text-align: center; margin: 24px 0 8px 0; padding: 20px 16px; background: #ffffff; }
        .cta-button { display: inline-block; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: #ffffff !important; padding: 14px 32px; border-radius: 8px; text-decoration: none; font-weight: 600; font-size: 14px; box-shadow: 0 4px 12px rgba(102, 126, 234, 0.4); transition: transform 0.2s; }
        .cta-button:hover { transform: translateY(-2px); }
        @media (prefers-color-scheme: light) {
          .cta-button { color: #2d3748 !important; background: #e2e8f0; }
        }
        .footer { background: #f7fafc; padding: 16px 20px; text-align: center; font-size: 12px; color: #718096 !important; }
        @media (max-width: 600px) {
          .content { padding: 18px 16px 20px 16px; }
        }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <div class="header-icon">📊</div>
          <h1>Relatório de Fechamento</h1>
          <p class="header-subtitle"><strong>${monthName}/${year}</strong></p>
          <p class="header-subtitle">Período: ${periodo}</p>
        </div>
        
        <div class="content">
          <!-- KPIs do Mês -->
          <h2 class="section-title no-border">📈 Faturamento</h2>
          <div class="kpi-grid">
            <div class="kpi-card success">
              <div class="kpi-label">💰 FATURADO</div>
              <div class="kpi-value">${formatCurrency(kpis.faturamento)}</div>
              <div class="kpi-subtitle">${kpis.peso > 0 ? `${kpis.peso.toLocaleString('pt-BR', { maximumFractionDigits: 1 })} t` : '0 t'}</div>
            </div>
            <div class="kpi-card info">
              <div class="kpi-label">⚖️ PESO</div>
              <div class="kpi-value">${kpis.peso.toLocaleString('pt-BR', { maximumFractionDigits: 1 })} t</div>
            </div>
            <div class="kpi-card info">
              <div class="kpi-label">👥 Nº CLIENTES</div>
              <div class="kpi-value">${kpis.numClientes}</div>
            </div>
            <div class="kpi-card success">
              <div class="kpi-label">🎫 TICKET MÉDIO</div>
              <div class="kpi-value">${formatCurrency(kpis.ticketMedio)}</div>
            </div>
            <div class="kpi-card success">
              <div class="kpi-label">💵 R$/KG</div>
              <div class="kpi-value">${formatCurrency(kpis.valorPorKg)}</div>
            </div>
            <div class="kpi-card danger">
              <div class="kpi-label">❌ PERDIDOS</div>
              <div class="kpi-value">${kpis.perdidosQtd}</div>
              <div class="kpi-subtitle">${formatCurrency(kpis.perdidosValor)}</div>
            </div>
          </div>
          
          <!-- Gráfico de Histórico -->
          <h2 class="section-title spaced">📊 Histórico de Faturamento (12 meses)</h2>
          ${generateHistoricoChart(historico, monthName, year)}

          ${metaMensal ? `
          <!-- Meta do Mês -->
          <h2 class="section-title spaced">🎯 Meta do Mês</h2>
          <div class="meta-section" style="border-left: 4px solid ${corMeta};">
            <div class="meta-grid">
              <div class="meta-item">
                <div class="meta-label">Meta Mensal</div>
                <div class="meta-value">${formatCurrency(metaMensal)}</div>
              </div>
              <div class="meta-item">
                <div class="meta-label">Realizado</div>
                <div class="meta-value" style="color: ${corMeta};">${formatCurrency(realizadoMes)}</div>
              </div>
              <div class="meta-item">
                <div class="meta-label">Atingimento</div>
                <div class="meta-value" style="color: ${corMeta}; font-size: 22px;">${percentualMeta.toFixed(1)}% ${statusMeta}</div>
              </div>
              <div class="meta-item">
                <div class="meta-label">Faltam</div>
                <div class="meta-value" style="color: ${faltaMeta > 0 ? '#ed8936' : '#48bb78'};">
                  ${faltaMeta > 0 ? formatCurrency(faltaMeta) : 'Meta Atingida!'}
                </div>
              </div>
            </div>
            <!-- Barra de progresso visual -->
            <div style="margin-top: 12px; background: #e2e8f0; border-radius: 6px; height: 10px; overflow: hidden;">
              <div style="width: ${Math.min(percentualMeta, 100)}%; height: 100%; background: ${corMeta}; transition: width 0.3s;"></div>
            </div>
          </div>
          ` : ''}

          <!-- Ranking de Vendedores -->
          <h2 class="section-title spaced no-border">🏆 Ranking de Vendedores</h2>
          ${
            ranking.length > 0
              ? `
          <table class="ranking-table">
            <thead>
              <tr>
                <th style="width: 40px;">#</th>
                <th>Vendedor</th>
                <th style="text-align:right;">Faturamento</th>
                <th style="text-align:center;">Pedidos</th>
                <th style="text-align:right;">Ticket Médio</th>
                <th style="text-align:right;">% do Total</th>
              </tr>
            </thead>
            <tbody>
              ${rankingRows}
            </tbody>
          </table>
          `
              : `<p style="color:#718096; font-size: 13px;">Sem dados de faturamento para montar o ranking neste período.</p>`
          }

          <!-- Análise Rápida -->
          <div class="analysis" style="margin-top: 16px;">
            <h3 class="section-title no-border" style="color: #2d3748 !important;">💡 Análise do Período</h3>
            <p style="color: #4a5568 !important;">• Faturamento total do mês: <strong style="color: #2d3748 !important;">${formatCurrency(kpis.faturamento)}</strong> (${kpis.peso.toLocaleString('pt-BR', { maximumFractionDigits: 1 })} toneladas)</p>
            <p style="color: #4a5568 !important;">• Ticket médio por cliente: <strong style="color: #2d3748 !important;">${formatCurrency(kpis.ticketMedio)}</strong></p>
            ${metaMensal ? `
            <p style="color: #4a5568 !important;">• Atingimento da meta: <strong style="color: #2d3748 !important;">${percentualMeta.toFixed(1)}%</strong></p>
            ${faltaMeta > 0 ? `
            <p style="color: #4a5568 !important;">• Faltam <strong style="color: #2d3748 !important;">${formatCurrency(faltaMeta)}</strong> para atingir a meta</p>
            ` : `
            <p style="color: #4a5568 !important;">• <strong style="color: #2d3748 !important;">Meta atingida!</strong> Superou em ${formatCurrency(Math.abs(faltaMeta))}</p>
            `}
            ` : ''}
            ${kpis.perdidosQtd > 0 ? `
            <p style="color: #4a5568 !important;">• <strong style="color: #2d3748 !important;">${kpis.perdidosQtd}</strong> oportunidades perdidas no valor de ${formatCurrency(kpis.perdidosValor)}</p>
            ` : ''}
            ${ranking.length > 0 ? `
            <p style="color: #4a5568 !important;">• <strong style="color: #2d3748 !important;">${ranking[0].nome}</strong> lidera o ranking com ${formatCurrency(ranking[0].faturamento)} (${ranking[0].percentualTotal.toFixed(1)}% do total)</p>
            ` : ''}
          </div>
        </div>

        <div class="cta-section">
          <a href="https://globaltools.lovable.app" class="cta-button" style="color: #2d3748 !important; background-color: #e2e8f0;">
            🚀 Acessar Dashboard Completo
          </a>
        </div>

        <div class="footer">
          <p style="color: #718096 !important;">Relatório de fechamento gerado automaticamente • ${new Date().toLocaleDateString('pt-BR')}</p>
          <p style="color: #718096 !important;">Acesse o Dashboard para visualizar análises detalhadas.</p>
        </div>
      </div>
    </body>
    </html>
  `;
}

const MONTH_NAMES = [
  "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
  "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"
];

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { month, year, recipients } = await req.json();

    console.log(`📅 Gerando relatório de fechamento para ${month}/${year}`);
    console.log(`📧 Destinatários: ${recipients.length}`);

    if (!month || !year || !recipients || recipients.length === 0) {
      throw new Error("Parâmetros inválidos");
    }

    // Calcular período completo do mês
    const startDate = new Date(year, month - 1, 1, 0, 0, 0);
    const endDate = new Date(year, month, 0, 23, 59, 59);

    console.log(`📊 Período: ${startDate.toLocaleDateString('pt-BR')} a ${endDate.toLocaleDateString('pt-BR')}`);

    // Carregar TODOS os dados da planilha
    const allData = await loadComercialDataFromSheet();

    if (allData.length === 0) {
      throw new Error("Nenhum dado encontrado na planilha");
    }

    // Calcular KPIs do mês
    const kpis = calculateKPIs(allData, startDate, endDate);
    console.log('📊 KPIs calculados:', kpis);

    // Calcular ranking de vendedores
    const ranking = calcularRankingVendedores(allData, startDate, endDate);

    // Buscar meta mensal
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    const monthYear = `${String(month).padStart(2, '0')}/${year}`;
    
    const { data: metaData } = await supabase
      .from('admin_goals')
      .select('monthly_revenue_goal')
      .eq('month_year', monthYear)
      .maybeSingle();

    const metaMensal = metaData?.monthly_revenue_goal || null;
    console.log('🎯 Meta mensal:', metaMensal);

    // Calcular histórico de faturamento
    const historico = calcularHistoricoFaturamento(allData, month, year);

    // Gerar HTML do relatório
    const monthName = MONTH_NAMES[month - 1];
    const periodo = `${startDate.toLocaleDateString('pt-BR')} a ${endDate.toLocaleDateString('pt-BR')}`;
    const reportHTML = generateReportHTML(kpis, monthName, year, metaMensal, periodo, ranking, historico);

    // Enviar emails
    let successCount = 0;
    let errorCount = 0;

    for (const recipient of recipients) {
      try {
        await resend.emails.send({
          from: "Lovable <onboarding@resend.dev>",
          to: [recipient],
          subject: `📊 Relatório de Fechamento - ${monthName}/${year}`,
          html: reportHTML,
        });

        // Log no banco
        await supabase.from('email_reports_log').insert({
          config_id: '00000000-0000-0000-0000-000000000000',
          email: recipient,
          status: 'sent',
          report_type: 'monthly_closing',
          reference_month: monthYear,
          is_scheduled: false,
        });

        successCount++;
        console.log(`✅ Email enviado para ${recipient}`);
      } catch (error) {
        errorCount++;
        console.error(`❌ Erro ao enviar para ${recipient}:`, error);

        await supabase.from('email_reports_log').insert({
          config_id: '00000000-0000-0000-0000-000000000000',
          email: recipient,
          status: 'failed',
          error_message: error instanceof Error ? error.message : String(error),
          report_type: 'monthly_closing',
          reference_month: monthYear,
          is_scheduled: false,
        });
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: `Emails enviados: ${successCount} de ${recipients.length}`,
        successCount,
        errorCount,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error: any) {
    console.error("❌ Erro no handler:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
};

serve(handler);
