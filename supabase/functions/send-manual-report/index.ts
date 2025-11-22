import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

// Mesmos IDs da planilha usados no googleSheetsService.ts
const SHEET_ID = "13F5NcT8Z6quDcW4OmoG8MOhHCRT1W9nWXmNGX839MGo";
const GID = "2063157767";
const CSV_URL = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/export?format=csv&gid=${GID}`;

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Interface IGUAL ao ComercialData do frontend
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
}

interface EmailKPIs {
  faturamento: number;
  orcamentosValor: number;
  pedidosNaoFaturados: number;
  pedidosNaoFaturadosValor: number;
  perdidosValor: number;
  perdidosQtd: number;
  diasUteis: number;
  mediaDiaria: number;
}

interface ComparativoMes {
  mes: string;
  ano: number;
  faturamento: number;
  variacao: number;
}

interface VendedorPerformance {
  nome: string;
  faturamento: number;
  numPedidos: number;
  ticketMedio: number;
  percentualTotal: number;
}

interface OrcamentoQuente {
  numeroPedido: string;
  cliente: string;
  vendedor: string;
  valor: number;
  peso: number;
  rating: number;
  dataEmissao: string;
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
  // Sessão 'dashboard': Emitida/Faturado usa data_emissao, outros usam data_inicio
  if (item.situacao === 'Emitida' || item.situacao === 'Faturado') {
    return parseDate(item.data_emissao || '');
  }
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
  console.log('📊 Buscando dados da planilha...');
  console.log('📋 URL:', CSV_URL);
  
  try {
    const response = await fetch(CSV_URL, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; SupabaseEdgeFunction/1.0)',
      },
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ Resposta de erro:', errorText.substring(0, 500));
      throw new Error(`HTTP error! status: ${response.status} - ${response.statusText}`);
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
          produto: row[9] || '', // Coluna J (descricaomat)
          obs: row[10] || '', // Coluna K (observacao)
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

// Calcular KPIs - IGUAL ao ComercialContext e ComercialKPIs
function calculateKPIs(
  allData: ComercialData[],
  startDate: Date,
  endDate: Date,
  calcularDias: boolean = true
): EmailKPIs {
  console.log(`📊 Calculando KPIs para período: ${startDate.toISOString()} a ${endDate.toISOString()}`);
  
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
  console.log(`💰 Faturamento: R$ ${faturado.toFixed(2)} (${faturados.length} registros)`);
  
  const orcamentos = allData.filter(item => item.situacao === 'Orçamento');
  const orcamentosValor = orcamentos.reduce((acc, item) => acc + item.valor, 0);
  console.log(`📋 Orçamentos: R$ ${orcamentosValor.toFixed(2)} (${orcamentos.length} registros)`);
  
  const pedidosNaoFaturadosData = filteredData.filter(item =>
    item.situacao === 'Pedido' && item.faturamento_tipo === 1
  );
  // Contar pedidos únicos, não linhas, e somar valor total
  const pedidosNaoFaturadosMap = new Map<string, ComercialData[]>();
  pedidosNaoFaturadosData.forEach(p => {
    if (!pedidosNaoFaturadosMap.has(p.numeropedido)) {
      pedidosNaoFaturadosMap.set(p.numeropedido, []);
    }
    pedidosNaoFaturadosMap.get(p.numeropedido)!.push(p);
  });
  const pedidosNaoFaturados = pedidosNaoFaturadosMap.size;
  const pedidosNaoFaturadosValor = Array.from(pedidosNaoFaturadosMap.values()).reduce(
    (sum, items) => sum + items.reduce((s, item) => s + item.valor, 0),
    0
  );
  console.log(`📦 Pedidos não faturados: ${pedidosNaoFaturados} pedidos distintos = R$ ${pedidosNaoFaturadosValor.toFixed(2)} (${pedidosNaoFaturadosData.length} linhas)`);
  
  const perdidosData = filteredData.filter(item => item.situacao === 'Perdido');
  const perdidosValor = perdidosData.reduce((acc, item) => acc + item.valor, 0);
  const perdidosQtd = new Set(
    perdidosData.map(item => item.numeropedido).filter(Boolean)
  ).size;
  console.log(`❌ Perdidos: R$ ${perdidosValor.toFixed(2)} (${perdidosQtd} pedidos distintos)`);

  const diasUteis = calcularDias ? calcularDiasUteis(startDate, endDate) : 1;
  const mediaDiaria = diasUteis > 0 ? faturado / diasUteis : 0;
  
  console.log(`📊 Dias úteis no período: ${diasUteis}`);
  console.log(`📊 Média diária: R$ ${mediaDiaria.toFixed(2)}`);

  return {
    faturamento: faturado,
    orcamentosValor,
    pedidosNaoFaturados,
    pedidosNaoFaturadosValor,
    perdidosValor,
    perdidosQtd,
    diasUteis,
    mediaDiaria,
  };
}

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

  console.log('🏆 Ranking de vendedores (top 5):', ranking.slice(0, 5));
  return ranking;
}

async function buscarOrcamentosQuentes(
  allData: ComercialData[],
  supabaseAdmin: any
): Promise<OrcamentoQuente[]> {
  try {
    const { data, error } = await supabaseAdmin
      .from('client_budget_ratings')
      .select('budget_number, rating')
      .gte('rating', 3)
      .order('rating', { ascending: false });

    if (error) {
      console.error('❌ Erro ao buscar ratings de orçamentos:', error);
      return [];
    }

    if (!data || data.length === 0) {
      console.log('ℹ️ Nenhum orçamento com rating >= 3 encontrado.');
      return [];
    }

    const ratingsMap = new Map<string, number>();
    (data as { budget_number: string; rating: number }[]).forEach(r => {
      ratingsMap.set(r.budget_number, r.rating);
    });

    const orcamentosEmAberto = allData.filter(item =>
      item.situacao === 'Orçamento' && ratingsMap.has(item.numeropedido)
    );

    const orcamentosMap: Record<string, { items: ComercialData[]; rating: number }> = {};

    orcamentosEmAberto.forEach(item => {
      const numeroPedido = item.numeropedido;
      const rating = ratingsMap.get(numeroPedido) ?? 0;

      if (!orcamentosMap[numeroPedido]) {
        orcamentosMap[numeroPedido] = {
          items: [],
          rating,
        };
      }

      orcamentosMap[numeroPedido].items.push(item);
    });

    const orcamentosQuentes: OrcamentoQuente[] = Object.entries(orcamentosMap)
      .map(([numeroPedido, dados]) => {
        const firstItem = dados.items[0];
        const valor = dados.items.reduce((sum, item) => sum + item.valor, 0);
        const peso = dados.items.reduce((sum, item) => sum + item.peso, 0);

        return {
          numeroPedido,
          cliente: firstItem.cli_nomefantasia || firstItem.cliente,
          vendedor: firstItem.vendedor,
          valor,
          peso,
          rating: dados.rating,
          dataEmissao: firstItem.data_pedido_pronto || firstItem.data_emissao,
        } as OrcamentoQuente;
      })
      .sort((a, b) => {
        if (b.rating !== a.rating) return b.rating - a.rating;
        return b.valor - a.valor;
      });

    console.log(`🔥 ${orcamentosQuentes.length} orçamentos quentes encontrados`);
    return orcamentosQuentes;
  } catch (error) {
    console.error('❌ Erro ao montar orçamentos quentes:', error);
    return [];
  }
}

function formatCurrency(value: number): string {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL'
  }).format(value);
}

function formatDate(date: Date): string {
  return date.toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: 'long',
    year: 'numeric'
  });
}

function generateReportHTML(
  kpis: EmailKPIs,
  reportDate: string,
  periodo: string,
  meta: number,
  mesAnterior: ComparativoMes | null,
  melhorMes: ComparativoMes | null,
  ranking: VendedorPerformance[],
  orcamentosQuentes: OrcamentoQuente[]
): string {
  const percentualMeta = meta > 0 ? (kpis.faturamento / meta) * 100 : 0;
  const faltaMeta = meta - kpis.faturamento;
  
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

  const totalOrcamentosQuentes = orcamentosQuentes.reduce(
    (sum, o) => sum + o.valor,
    0
  );

  const orcamentosRows = orcamentosQuentes
    .map(orc => {
      let bgColor = '#ffffff';
      let estrelas = '';
      if (orc.rating >= 5) {
        bgColor = '#fff5f5';
        estrelas = '⭐⭐⭐⭐⭐';
      } else if (orc.rating === 4) {
        bgColor = '#fffaf0';
        estrelas = '⭐⭐⭐⭐';
      } else {
        bgColor = '#fffff0';
        estrelas = '⭐⭐⭐';
      }

      return `
        <tr style="background: ${bgColor};">
          <td style="padding: 8px 10px; text-align: center; font-size: 14px;">${estrelas}</td>
          <td style="padding: 8px 10px; font-weight: bold;">${orc.numeroPedido}</td>
          <td style="padding: 8px 10px;">${orc.cliente}</td>
          <td style="padding: 8px 10px;">${orc.vendedor}</td>
          <td style="padding: 8px 10px; text-align: right; font-weight: bold;">${formatCurrency(orc.valor)}</td>
          <td style="padding: 8px 10px; text-align: right;">${Math.round(orc.peso).toLocaleString('pt-BR')}</td>
          <td style="padding: 8px 10px; text-align: center; font-size: 12px;">${
            orc.dataEmissao && parseDate(orc.dataEmissao)
              ? parseDate(orc.dataEmissao)!.toLocaleDateString('pt-BR')
              : '-'
          }</td>
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
        .kpi-card.purple { border-left-color: #667eea; }
        .kpi-label { font-size: 11px; text-transform: uppercase; color: #718096 !important; font-weight: 600; margin-bottom: 6px; }
        .kpi-value { font-size: 20px; font-weight: 700; color: #2d3748 !important; }
        .kpi-subtitle { font-size: 12px; color: #718096 !important; margin-top: 3px; }
        .meta-section { background: #f7fafc; padding: 18px 20px; border-radius: 8px; box-shadow: 0 1px 3px rgba(0,0,0,0.05); margin-bottom: 16px; }
        .meta-grid { display: grid; grid-template-columns: 1fr; gap: 10px; }
        .meta-item { padding: 6px 0; }
        .meta-label { color: #718096 !important; font-size: 12px; margin-bottom: 2px; }
        .meta-value { color: #2d3748 !important; font-size: 18px; font-weight: bold; }
        .comp-section { background: #f7fafc; padding: 18px 20px; border-radius: 8px; box-shadow: 0 1px 3px rgba(0,0,0,0.05); margin-bottom: 16px; }
        .comp-grid { display: grid; grid-template-columns: 1fr; gap: 10px; }
        .comp-card { background: #ffffff; padding: 10px 12px; border-radius: 6px; border-left: 3px solid #4299e1; }
        .comp-card.gold { background: #fffaf0; border-left-color: #f6ad55; }
        .comp-title { color: #2d3748 !important; font-size: 13px; font-weight: bold; margin-bottom: 6px; }
        .comp-value { color: #4a5568 !important; font-size: 14px; margin-bottom: 4px; }
        .comp-var { font-size: 13px; font-weight: bold; }
        .comp-var.pos { color: #48bb78 !important; }
        .comp-var.neg { color: #f56565 !important; }
        .ranking-table, .hot-table { width: 100%; border-collapse: collapse; margin-top: 8px; margin-bottom: 16px; background: #ffffff; }
        .ranking-table th, .ranking-table td, .hot-table th, .hot-table td { border-bottom: 1px solid #e2e8f0; font-size: 13px; color: #2d3748 !important; }
        .ranking-table th, .hot-table th { background: #f7fafc; padding: 8px 10px; text-align: left; color: #4a5568 !important; font-weight: 600; }
        .ranking-table td, .hot-table td { padding: 8px 10px; color: #2d3748 !important; }
        .analysis { background: #ffffff; padding: 16px 18px; border-radius: 8px; box-shadow: 0 1px 3px rgba(0,0,0,0.05); margin-top: 18px; }
        .analysis p { margin: 6px 0; color: #4a5568 !important; line-height: 1.6; font-size: 13px; }
        .cta-section { text-align: center; margin: 24px 0 8px 0; padding: 20px 16px; background: #ffffff; }
        .cta-button { display: inline-block; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: #ffffff !important; padding: 14px 32px; border-radius: 8px; text-decoration: none; font-weight: 600; font-size: 14px; box-shadow: 0 4px 12px rgba(102, 126, 234, 0.4); transition: transform 0.2s; }
        .cta-button:hover { transform: translateY(-2px); }
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
          <h1>Relatório Comercial</h1>
          <p class="header-subtitle">Gerado em ${reportDate}</p>
          <p class="header-subtitle"><strong>Período:</strong> ${periodo}</p>
        </div>
        
        <div class="content">
          <!-- Seção 1: KPIs Comerciais -->
          <h2 class="section-title no-border">📈 KPIs Comerciais</h2>
          <div class="kpi-grid">
            <div class="kpi-card success">
              <div class="kpi-label">💰 Faturamento</div>
              <div class="kpi-value">${formatCurrency(kpis.faturamento)}</div>
            </div>
            <div class="kpi-card info">
              <div class="kpi-label">📋 Orçamentos (R$)</div>
              <div class="kpi-value">${formatCurrency(kpis.orcamentosValor)}</div>
            </div>
            <div class="kpi-card warning">
              <div class="kpi-label">📦 Pedidos Não Faturados</div>
              <div class="kpi-value">${formatCurrency(kpis.pedidosNaoFaturadosValor)}</div>
              <div class="kpi-subtitle">${kpis.pedidosNaoFaturados} pedido(s)</div>
            </div>
            <div class="kpi-card danger">
              <div class="kpi-label">❌ Valor Perdido</div>
              <div class="kpi-value">${formatCurrency(kpis.perdidosValor)}</div>
              <div class="kpi-subtitle">${kpis.perdidosQtd} oportunidade(s)</div>
            </div>
            <div class="kpi-card purple">
              <div class="kpi-label">📊 Média Diária (Dias Úteis)</div>
              <div class="kpi-value">${formatCurrency(kpis.mediaDiaria)}</div>
              <div class="kpi-subtitle">${kpis.diasUteis} dias úteis</div>
            </div>
          </div>

          <!-- Seção 2: Meta do Mês -->
          <h2 class="section-title spaced">🎯 Meta do Mês</h2>
          <div class="meta-section">
            <div class="meta-grid">
              <div class="meta-item">
                <div class="meta-label">Meta Mensal</div>
                <div class="meta-value">${formatCurrency(meta)}</div>
              </div>
              <div class="meta-item">
                <div class="meta-label">Realizado</div>
                <div class="meta-value">${formatCurrency(kpis.faturamento)}</div>
              </div>
              <div class="meta-item">
                <div class="meta-label">Atingimento</div>
                <div class="meta-value" style="color: ${corMeta};">${percentualMeta.toFixed(
                  1
                )}% ${statusMeta}</div>
              </div>
              <div class="meta-item">
                <div class="meta-label">Faltam</div>
                <div class="meta-value" style="color: ${
                  faltaMeta > 0 ? '#ed8936' : '#48bb78'
                };"><span>${
    faltaMeta > 0 ? formatCurrency(faltaMeta) : 'Meta Atingida!'
  }</span></div>
              </div>
            </div>
          </div>

          <!-- Seção 3: Comparativos -->
          <h2 class="section-title spaced">📊 Comparativos</h2>
          ${mesAnterior || melhorMes
            ? `
            <div class="comp-section">
              <div class="comp-grid">
                ${
                  mesAnterior
                    ? `
                <div class="comp-card">
                  <div class="comp-title">Mês Anterior (${mesAnterior.mes}/${mesAnterior.ano})</div>
                  <div class="comp-value">${formatCurrency(
                    mesAnterior.faturamento
                  )}</div>
                  <div class="comp-var ${
                    mesAnterior.variacao >= 0 ? 'pos' : 'neg'
                  }">
                    ${
                      mesAnterior.variacao >= 0 ? '+' : ''
                    }${mesAnterior.variacao.toFixed(1)}% ${
    mesAnterior.variacao >= 0 ? '↗️' : '↘️'
  }
                  </div>
                </div>
                `
                    : ''
                }
                ${
                  melhorMes
                    ? `
                <div class="comp-card gold">
                  <div class="comp-title">🏆 Melhor Mês (${melhorMes.mes}/${melhorMes.ano})</div>
                  <div class="comp-value">${formatCurrency(
                    melhorMes.faturamento
                  )}</div>
                  <div class="comp-var ${
                    melhorMes.variacao >= 0 ? 'pos' : 'neg'
                  }">
                    ${
                      melhorMes.variacao >= 0 ? '+' : ''
                    }${melhorMes.variacao.toFixed(1)}% vs melhor
                  </div>
                </div>
                `
                    : ''
                }
              </div>
            </div>
          `
            : `<p style="color:#718096; font-size: 13px; margin-top: 8px;">Sem dados suficientes para comparativos.</p>`}

          <!-- Seção 4: Ranking de Vendedores -->
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

          <div style="margin-bottom: 16px;"></div>

          <!-- Seção 5: Orçamentos Quentes -->
          <h2 class="section-title spaced no-border">🔥 Orçamentos Quentes</h2>
          ${
            orcamentosQuentes.length > 0
              ? `
          <p style="color:#4a5568; font-size: 13px; margin: 6px 0 10px 0;">
            ${orcamentosQuentes.length} orçamento(s) classificado(s) como quente(s).
            Valor total: <strong>${formatCurrency(totalOrcamentosQuentes)}</strong>
          </p>
          <table class="hot-table">
            <thead>
              <tr>
                <th style="width: 80px; text-align:center;">Rating</th>
                <th>Pedido</th>
                <th>Cliente</th>
                <th>Vendedor</th>
                <th style="text-align:right;">Valor</th>
                <th style="text-align:right;">Peso (kg)</th>
                <th style="text-align:center;">Data</th>
              </tr>
            </thead>
            <tbody>
              ${orcamentosRows}
            </tbody>
          </table>
          `
              : `<p style="color:#718096; font-size: 13px;">Nenhum orçamento com 3 ou mais estrelas no momento.</p>`
          }

          <!-- Seção 6: Análise Rápida -->
          <div class="analysis" style="margin-top: 16px;">
            <h3 class="section-title no-border" style="color: #2d3748 !important;">💡 Análise Rápida</h3>
            <p style="color: #4a5568 !important;">• Faturamento no período representa <strong style="color: #2d3748 !important;">${percentualMeta.toFixed(
              1
            )}%</strong> da meta mensal</p>
            ${
              mesAnterior
                ? `<p style="color: #4a5568 !important;">• ${
                    mesAnterior.variacao >= 0 ? 'Aumento' : 'Redução'
                  } de <strong style="color: #2d3748 !important;">${Math.abs(
                    mesAnterior.variacao
                  ).toFixed(1)}%</strong> em relação ao mês anterior</p>`
                : ''
            }
            ${
              faltaMeta > 0
                ? `<p style="color: #4a5568 !important;">• Ainda há <strong style="color: #2d3748 !important;">${formatCurrency(
                    faltaMeta
                  )}</strong> para atingir a meta</p>`
                : `<p style="color: #4a5568 !important;">• <strong style="color: #2d3748 !important;">Meta atingida!</strong> Superou em ${formatCurrency(
                    Math.abs(faltaMeta)
                  )}</p>`
            }
            <p style="color: #4a5568 !important;">• Média de <strong style="color: #2d3748 !important;">${formatCurrency(
              kpis.mediaDiaria
            )}</strong> por dia útil (${kpis.diasUteis} dias)</p>
            ${
              kpis.pedidosNaoFaturados > 0
                ? `<p style="color: #4a5568 !important;">• <strong style="color: #2d3748 !important;">${kpis.pedidosNaoFaturados}</strong> pedidos aguardando faturamento</p>`
                : ''
            }
            ${
              kpis.perdidosQtd > 0
                ? `<p style="color: #4a5568 !important;">• <strong style="color: #2d3748 !important;">${kpis.perdidosQtd}</strong> oportunidades perdidas no valor de ${formatCurrency(
                    kpis.perdidosValor
                  )}</p>`
                : ''
            }
            ${
              ranking.length > 0
                ? `<p style="color: #4a5568 !important;">• <strong style="color: #2d3748 !important;">${ranking[0].nome}</strong> lidera o ranking com ${formatCurrency(
                    ranking[0].faturamento
                  )} (${ranking[0].percentualTotal.toFixed(
                    1
                  )}% do total)</p>`
                : ''
            }
            ${
              orcamentosQuentes.length > 0
                ? `<p style="color: #4a5568 !important;">• Existem <strong style="color: #2d3748 !important;">${orcamentosQuentes.length}</strong> orçamentos quentes em aberto somando ${formatCurrency(
                    totalOrcamentosQuentes
                  )}</p>`
                : '<p style="color: #4a5568 !important;">• Atenção: nenhum orçamento classificado como quente (3+ estrelas) no momento.</p>'
            }
          </div>
        </div>

        <div class="cta-section">
          <a href="https://globaltools.lovable.app" class="cta-button" style="color: #ffffff !important;">
            🚀 Acessar Dashboard Completo
          </a>
        </div>

        <div class="footer">
          <p style="color: #718096 !important;">Este relatório usa a mesma fonte de dados do Dashboard Comercial.</p>
          <p style="color: #718096 !important;">Acesse o Dashboard para visualizar análises detalhadas.</p>
        </div>
      </div>
    </body>
    </html>
  `;
}

const handler = async (req: Request): Promise<Response> => {
  console.log("🚀 [send-manual-report] Função iniciada");

  if (req.method === 'OPTIONS') {
    console.log("📋 [send-manual-report] Respondendo OPTIONS");
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { configId } = await req.json();
    console.log(`📧 [send-manual-report] Processando envio para config: ${configId}`);

    const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    const { data: config, error: configError } = await supabaseAdmin
      .from('email_reports_config')
      .select('*')
      .eq('id', configId)
      .single();

    if (configError || !config) {
      throw new Error('Configuração não encontrada');
    }

    // 1. Definir período: mês atual até hoje (timezone Brasil)
    const nowBrasil = new Date(new Date().toLocaleString('en-US', { timeZone: 'America/Sao_Paulo' }));
    const startDate = new Date(nowBrasil.getFullYear(), nowBrasil.getMonth(), 1);
    startDate.setHours(0, 0, 0, 0);
    const endDate = new Date(nowBrasil);
    endDate.setHours(23, 59, 59, 999);

    const reportDate = formatDate(nowBrasil);
    const periodo = `${formatDate(startDate)} a ${formatDate(endDate)}`;

    console.log(`📅 Período: ${periodo}`);

    // 2. Carregar dados da planilha
    const allData = await loadComercialDataFromSheet();
    
    // 3. Buscar meta mensal do banco de dados (admin_goals)
    console.log('🎯 Buscando meta mensal...');
    const ano = startDate.getFullYear();
    const mes = startDate.getMonth() + 1;
    const monthYear = `${ano}-${String(mes).padStart(2, '0')}`;
    
    let metaMensal = 2000000; // Valor padrão: R$ 2.000.000,00
    
    try {
      const { data: metaData, error: metaError } = await supabaseAdmin
        .from('admin_goals')
        .select('monthly_revenue_goal')
        .eq('month_year', monthYear)
        .maybeSingle();
      
      if (metaError) {
        console.log('⚠️ Meta não encontrada no banco, usando valor padrão:', metaError.message);
      } else if (metaData?.monthly_revenue_goal) {
        metaMensal = Number(metaData.monthly_revenue_goal);
        console.log('✅ Meta mensal encontrada:', metaMensal);
      } else {
        console.log('⚠️ Meta não encontrada para o período, usando valor padrão');
      }
    } catch (error) {
      console.log('⚠️ Erro ao buscar meta, usando valor padrão:', error);
    }

    // 4. Calcular KPIs do período solicitado
    console.log(`📊 Calculando KPIs para período: ${startDate.toISOString()} a ${endDate.toISOString()}`);
    const kpis = calculateKPIs(allData, startDate, endDate);

    // 5. Calcular ranking de vendedores no período
    const ranking = calcularRankingVendedores(allData, startDate, endDate);

    // 6. Buscar orçamentos quentes (3+ estrelas)
    const orcamentosQuentes = await buscarOrcamentosQuentes(allData, supabaseAdmin);
    
    // 7. Calcular KPIs do mês anterior
    let mesAnterior: ComparativoMes | null = null;
    try {
      const mesAnteriorDate = new Date(ano, mes - 2, 1); // Mês anterior
      const ultimoDiaMesAnterior = new Date(ano, mes - 1, 0);
      
      console.log(`📊 Calculando KPIs do mês anterior: ${mesAnteriorDate.toISOString()} a ${ultimoDiaMesAnterior.toISOString()}`);
      const kpisMesAnterior = calculateKPIs(allData, mesAnteriorDate, ultimoDiaMesAnterior, false);
      
      if (kpisMesAnterior.faturamento > 0) {
        const variacao = kpisMesAnterior.faturamento > 0 
          ? ((kpis.faturamento - kpisMesAnterior.faturamento) / kpisMesAnterior.faturamento) * 100 
          : 0;
        
        mesAnterior = {
          mes: String(mes - 1 === 0 ? 12 : mes - 1).padStart(2, '0'),
          ano: mes - 1 === 0 ? ano - 1 : ano,
          faturamento: kpisMesAnterior.faturamento,
          variacao,
        };
        console.log('📊 Mês anterior:', mesAnterior);
      }
    } catch (error) {
      console.log('⚠️ Erro ao calcular mês anterior:', error);
    }
    
    // 8. Identificar o melhor mês (últimos 12 meses)
    let melhorMes: ComparativoMes | null = null;
    try {
      console.log('🏆 Identificando melhor mês...');
      const mesesParaAnalise = 12;
      let maiorFaturamento = 0;
      let melhorMesData: { mes: number; ano: number } | null = null;
      
      for (let i = 1; i <= mesesParaAnalise; i++) {
        const mesAnalise = new Date(ano, mes - i, 1);
        const ultimoDiaMesAnalise = new Date(ano, mes - i + 1, 0);
        
        const kpisMes = calculateKPIs(allData, mesAnalise, ultimoDiaMesAnalise, false);
        
        if (kpisMes.faturamento > maiorFaturamento) {
          maiorFaturamento = kpisMes.faturamento;
          melhorMesData = {
            mes: mesAnalise.getMonth() + 1,
            ano: mesAnalise.getFullYear(),
          };
        }
      }
      
      if (melhorMesData && maiorFaturamento > 0) {
        const variacao = maiorFaturamento > 0 
          ? ((kpis.faturamento - maiorFaturamento) / maiorFaturamento) * 100 
          : 0;
        
        melhorMes = {
          mes: String(melhorMesData.mes).padStart(2, '0'),
          ano: melhorMesData.ano,
          faturamento: maiorFaturamento,
          variacao,
        };
        console.log('🏆 Melhor mês:', melhorMes);
      }
    } catch (error) {
      console.log('⚠️ Erro ao identificar melhor mês:', error);
    }

    console.log('✅ KPIs finais:', kpis);

    // 9. Gerar HTML do relatório
    console.log('📧 Gerando HTML do relatório...');
    const reportHTML = generateReportHTML(
      kpis,
      reportDate,
      periodo,
      metaMensal,
      mesAnterior,
      melhorMes,
      ranking,
      orcamentosQuentes
    );

    // 8. Enviar email via Resend
    // Em modo teste, Resend só permite enviar para email verificado
    const verifiedEmail = "mauricio.maciel@globalaco.com.br";
    const isTestMode = config.email !== verifiedEmail;
    const targetEmail = isTestMode ? verifiedEmail : config.email;
    
    const emailPayload = {
      from: "Lovable <onboarding@resend.dev>",
      to: [targetEmail],
      subject: `📊 Relatório Comercial - ${reportDate}`,
      html: reportHTML,
    };

    console.log("📧 Enviando email via Resend...");

    const resendResponse = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${RESEND_API_KEY}`,
      },
      body: JSON.stringify(emailPayload),
    });

    const resendData = await resendResponse.json();
    console.log("📧 Resposta Resend:", resendData);

    if (!resendResponse.ok) {
      throw new Error(`Erro no Resend: ${JSON.stringify(resendData)}`);
    }

    // 9. Registrar envio no banco de dados
    await supabaseAdmin.from('email_reports_log').insert({
      config_id: configId,
      email: targetEmail,
      status: 'success',
      report_date: startDate.toISOString().split('T')[0],
    });

    const logMessage = isTestMode 
      ? `✅ Relatório manual enviado em MODO TESTE para ${targetEmail} (destinatário configurado: ${config.email})`
      : `✅ Relatório manual enviado com sucesso para ${config.email}`;
    
    console.log(logMessage);

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: isTestMode 
          ? `Relatório enviado em modo teste para ${targetEmail} (Para enviar para ${config.email}, verifique um domínio em resend.com/domains)`
          : `Relatório enviado para ${config.email}` 
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: any) {
    console.error("❌ Erro ao processar relatório:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
};

serve(handler);
