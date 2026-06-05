import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

// Mesmos IDs da planilha usados nas outras funções
const SHEET_ID = "13F5NcT8Z6quDcW4OmoG8MOhHCRT1W9nWXmNGX839MGo";
const GID = "1086211541";
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
  perdido_motivo: string;
}

interface EmailKPIs {
  faturamento: number;
  orcamentosValor: number;
  orcamentosQtd: number;
  perdidosValor: number;
  perdidosQtd: number;
  pedidosNaoFaturados: number;
  pedidosNaoFaturadosValor: number;
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
  dataEmissao?: string;
}

function parseCSV(text: string): string[][] {
  const rows: string[][] = [];
  let currentRow: string[] = [];
  let currentField = '';
  let insideQuotes = false;

  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    const nextChar = text[i + 1];

    if (char === '"') {
      if (insideQuotes && nextChar === '"') {
        currentField += '"';
        i++;
      } else {
        insideQuotes = !insideQuotes;
      }
    } else if (char === ',' && !insideQuotes) {
      currentRow.push(currentField);
      currentField = '';
    } else if (char === '\n' && !insideQuotes) {
      currentRow.push(currentField);
      if (currentRow.some(f => f.trim() !== '')) {
        rows.push(currentRow);
      }
      currentRow = [];
      currentField = '';
    } else {
      currentField += char;
    }
  }

  if (currentField || currentRow.length > 0) {
    currentRow.push(currentField);
    if (currentRow.some(f => f.trim() !== '')) {
      rows.push(currentRow);
    }
  }

  return rows;
}

function parseDate(dateStr: string): Date | null {
  if (!dateStr || dateStr.trim() === '') return null;
  
  const formats = [
    /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/,
    /^(\d{4})-(\d{2})-(\d{2})/,
    /^(\d{1,2})-(\d{1,2})-(\d{4})$/
  ];

  for (const format of formats) {
    const match = dateStr.match(format);
    if (match) {
      let year: number, month: number, day: number;
      
      if (format === formats[1]) {
        [, year, month, day] = match.map(Number);
      } else {
        [, day, month, year] = match.map(Number);
      }
      
      const date = new Date(year, month - 1, day);
      if (!isNaN(date.getTime())) {
        return date;
      }
    }
  }
  
  return null;
}

function getDateField(row: ComercialData): Date | null {
  if (row.data_inicio) {
    const d = parseDate(row.data_inicio);
    if (d) return d;
  }
  if (row.data_emissao) {
    const d = parseDate(row.data_emissao);
    if (d) return d;
  }
  if (row.data_perdido) {
    return parseDate(row.data_perdido);
  }
  return null;
}

function calcularDiasUteis(inicio: Date, fim: Date): number {
  let count = 0;
  const current = new Date(inicio);
  while (current <= fim) {
    const dayOfWeek = current.getDay();
    if (dayOfWeek !== 0 && dayOfWeek !== 6) {
      count++;
    }
    current.setDate(current.getDate() + 1);
  }
  return count;
}

// Buscar dias úteis configurados do banco
async function buscarDiasUteisConfigurados(supabaseClient: any, monthYear: string): Promise<number | null> {
  try {
    const { data, error } = await supabaseClient
      .from('admin_goals')
      .select('business_days')
      .eq('month_year', monthYear)
      .maybeSingle();
    
    if (error) {
      console.error('❌ Erro ao buscar dias úteis configurados:', error);
      return null;
    }
    
    return data?.business_days || null;
  } catch (error) {
    console.error('❌ Erro ao buscar dias úteis:', error);
    return null;
  }
}

async function loadComercialDataFromSheet(): Promise<ComercialData[]> {
  console.log('📊 Buscando dados da planilha para preview (últimos 60 dias)...');
  console.log('📋 URL:', CSV_URL);

  // Adicionar timeout agressivo
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 15000); // 15 segundos

  try {
    const response = await fetch(CSV_URL, {
      signal: controller.signal,
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
    const lines = csvText.split('\n');

    console.log(`✅ ${lines.length} linhas recebidas`);

    if (lines.length < 2) {
      console.warn('⚠️ Planilha vazia ou só com header');
      return [];
    }

    // Para preview, filtrar apenas últimos 60 dias
    const sessentaDiasAtras = new Date();
    sessentaDiasAtras.setDate(sessentaDiasAtras.getDate() - 60);

    const comercialData: ComercialData[] = [];
    let processados = 0;
    let validos = 0;
    const maxRows = 5000; // Limite menor para preview
    const maxValid = 300; // Parar quando tiver dados suficientes

    // Processar linha por linha sem parseCSV completo
    for (let i = 1; i < Math.min(lines.length, maxRows) && validos < maxValid; i++) {
      const line = lines[i];
      if (!line || line.trim().length === 0) continue;
      
      processados++;

      // Parse simples da linha
      const row: string[] = [];
      let currentField = '';
      let insideQuotes = false;

      for (let j = 0; j < line.length; j++) {
        const char = line[j];
        const nextChar = line[j + 1];

        if (char === '"') {
          if (insideQuotes && nextChar === '"') {
            currentField += '"';
            j++;
          } else {
            insideQuotes = !insideQuotes;
          }
        } else if (char === ',' && !insideQuotes) {
          row.push(currentField);
          currentField = '';
        } else {
          currentField += char;
        }
      }
      row.push(currentField);

      if (row.length <= 30 || !row[3]) continue;

      // Parse e filtra por data logo no início
      const dataEmissao = row[4] || '';
      const dataInicio = row[33] || '';
      const dataPerdido = row[35] || '';
      
      let dataRelevante: Date | null = null;
      if (dataInicio) dataRelevante = parseDate(dataInicio);
      if (!dataRelevante && dataEmissao) dataRelevante = parseDate(dataEmissao);
      if (!dataRelevante && dataPerdido) dataRelevante = parseDate(dataPerdido);
      
      // Pula se a data for muito antiga
      if (!dataRelevante || dataRelevante < sessentaDiasAtras) continue;

      const item: ComercialData = {
        numeropedido: row[1] || '',
        situacao: (row[3] || '').trim().replace(/\s+/g, ' '),
        data_emissao: dataEmissao,
        data_inicio: dataInicio,
        data_perdido: dataPerdido,
        data_pedido_pronto: row[34] || '',
        valor: parseFloat(row[14]?.replace(',', '.')) || 0,
        peso: parseFloat(row[19]?.replace(',', '.')) || 0,
        classe: (row[21] || '').trim().replace(/\s+/g, ' '),
        cli_nomefantasia: row[29] || '',
        cliente: row[29] || '',
        codigocliente: row[28] || '',
        uf: (row[30] || '').trim().replace(/\s+/g, ' '),
        vendedor: (row[27] || 'Não informado').trim().replace(/\s+/g, ' '),
        faturamento_tipo: parseInt(row[43]) || 0,
        produto: row[9] || '',
        obs: row[10] || '',
        perdido_motivo: (row[36] || '').trim().replace(/\s+/g, ' '),
      };

      // Filtrar registros válidos
      if (!item.situacao || item.valor <= 0) continue;

      // Excluir clientes que contenham "GLOBAL AÇO" no nome
      const nomeFantasia = item.cli_nomefantasia?.toUpperCase() || '';
      if (nomeFantasia.includes('GLOBAL AÇO')) continue;

      comercialData.push(item);
      validos++;
      
      // Log de progresso
      if (processados % 1000 === 0) {
        console.log(`📊 Processadas ${processados} linhas, ${validos} válidas`);
      }
    }

    console.log(`✅ ${comercialData.length} registros carregados (últimos 60 dias, máx ${maxRows} linhas)`);
    return comercialData;
  } catch (error) {
    console.error('❌ Erro ao buscar dados da planilha:', error);
    throw error;
  } finally {
    clearTimeout(timeoutId);
  }
}

function calculateKPIs(
  allData: ComercialData[],
  startDate: Date,
  endDate: Date,
  calcularDias: boolean = true,
  diasUteisConfigurados: number | null = null
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
  const faturamento = faturados.reduce((acc, item) => acc + item.valor, 0);
  console.log(`💰 Faturamento: R$ ${faturamento.toFixed(2)} (${faturados.length} registros)`);

  const orcamentos = allData.filter(item => item.situacao === 'Orçamento');
  const orcamentosValor = orcamentos.reduce((acc, item) => acc + item.valor, 0);
  const orcamentosQtd = new Set(
    orcamentos.map(item => item.numeropedido).filter(Boolean)
  ).size;
  console.log(`📋 Orçamentos: R$ ${orcamentosValor.toFixed(2)} (${orcamentosQtd} pedidos distintos)`);

  const pedidosNaoFaturadosData = filteredData.filter(item =>
    item.situacao === 'Pedido' && item.faturamento_tipo === 1
  );
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

  const perdidosData = filteredData.filter(item => 
    item.situacao === 'Perdido' && 
    item.perdido_motivo && 
    item.perdido_motivo !== 'Não informado'
  );
  const perdidosValor = perdidosData.reduce((acc, item) => acc + item.valor, 0);
  const perdidosQtd = new Set(
    perdidosData.map(item => item.numeropedido).filter(Boolean)
  ).size;
  console.log(`❌ Perdidos: R$ ${perdidosValor.toFixed(2)} (${perdidosQtd} pedidos distintos)`);

  // Usar dias úteis configurados se disponível, senão calcular automaticamente
  const diasUteis = calcularDias 
    ? (diasUteisConfigurados || calcularDiasUteis(startDate, endDate))
    : 1;
  const mediaDiaria = diasUteis > 0 ? faturamento / diasUteis : 0;
  console.log(`📊 Dias úteis no período: ${diasUteis} (${diasUteisConfigurados ? 'configurado' : 'calculado automaticamente'})`);
  console.log(`📊 Média diária: R$ ${mediaDiaria.toFixed(2)}`);

  return {
    faturamento,
    orcamentosValor,
    orcamentosQtd,
    perdidosValor,
    perdidosQtd,
    pedidosNaoFaturados,
    pedidosNaoFaturadosValor,
    diasUteis,
    mediaDiaria,
  };
}

function calcularRankingVendedores(data: ComercialData[], inicio: Date, fim: Date): VendedorPerformance[] {
  const faturados = data.filter(r => {
    if (r.situacao !== 'Faturado') return false;
    const d = getDateField(r);
    return d && d >= inicio && d <= fim;
  });

  const vendedoresMap = new Map<string, { faturamento: number; numPedidos: number }>();
  faturados.forEach(r => {
    const nome = r.vendedor || 'Sem vendedor';
    const current = vendedoresMap.get(nome) || { faturamento: 0, numPedidos: 0 };
    current.faturamento += r.valor;
    current.numPedidos += 1;
    vendedoresMap.set(nome, current);
  });

  const totalFaturamento = Array.from(vendedoresMap.values()).reduce((sum, v) => sum + v.faturamento, 0);

  const ranking = Array.from(vendedoresMap.entries()).map(([nome, dados]) => ({
    nome,
    faturamento: dados.faturamento,
    numPedidos: dados.numPedidos,
    ticketMedio: dados.numPedidos > 0 ? dados.faturamento / dados.numPedidos : 0,
    percentualTotal: totalFaturamento > 0 ? (dados.faturamento / totalFaturamento) * 100 : 0
  }));

  ranking.sort((a, b) => b.faturamento - a.faturamento);
  return ranking.slice(0, 5);
}

async function buscarOrcamentosQuentes(supabaseAdmin: any, allData: ComercialData[]): Promise<OrcamentoQuente[]> {
  const { data, error } = await supabaseAdmin
    .from('client_budget_ratings')
    .select('budget_number, rating')
    .gte('rating', 3)
    .order('rating', { ascending: false })
    .limit(10);

  if (error || !data || data.length === 0) return [];
  
  const orcamentos: OrcamentoQuente[] = [];
  for (const rating of data) {
    const found = allData.find(r => r.numeropedido === rating.budget_number && r.situacao === 'Orçamento');
    if (found) {
      orcamentos.push({
        numeroPedido: found.numeropedido,
        cliente: found.cliente,
        vendedor: found.vendedor,
        valor: found.valor,
        peso: found.peso || 0,
        rating: rating.rating,
        dataEmissao: found.data_emissao
      });
    }
  }

  console.log(`🔥 ${orcamentos.length} orçamentos quentes encontrados`);
  return orcamentos.sort((a, b) => b.rating - a.rating).slice(0, 10);
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
    month: '2-digit',
    year: 'numeric'
  });
}

function generateReportHTML(
  kpis: EmailKPIs,
  meta: number,
  ranking: VendedorPerformance[],
  orcamentosQuentes: OrcamentoQuente[],
  mesAnterior: ComparativoMes | null,
  melhorMes: ComparativoMes | null,
  periodo: string,
  reportDate: string
): string {
  const percentualMeta = meta > 0 ? (kpis.faturamento / meta) * 100 : 0;
  const faltaMeta = meta - kpis.faturamento;
  const corMeta = percentualMeta >= 100 ? '#48bb78' : percentualMeta >= 80 ? '#ed8936' : '#f56565';
  const statusMeta = percentualMeta >= 100 ? '✓' : percentualMeta >= 80 ? '⚠' : '✗';

  const rankingRows = ranking
    .map((v, idx) => {
      const medalha = idx === 0 ? '🥇' : idx === 1 ? '🥈' : idx === 2 ? '🥉' : `${idx + 1}°`;
      return `
        <tr>
          <td style="padding: 8px 10px; font-weight: bold; text-align: center;">${medalha}</td>
          <td style="padding: 8px 10px; font-weight: bold;">${v.nome}</td>
          <td style="padding: 8px 10px; text-align: right; font-weight: bold;">${formatCurrency(v.faturamento)}</td>
          <td style="padding: 8px 10px; text-align: center;">${v.numPedidos}</td>
          <td style="padding: 8px 10px; text-align: right;">${formatCurrency(v.ticketMedio)}</td>
          <td style="padding: 8px 10px; text-align: right; color: #667eea; font-weight: 600;">${v.percentualTotal.toFixed(1)}%</td>
        </tr>
      `;
    })
    .join('');

  const totalOrcamentosQuentes = orcamentosQuentes.reduce((sum, orc) => sum + orc.valor, 0);

  const orcamentosRows = orcamentosQuentes
    .map(orc => {
      const estrelas = '⭐'.repeat(orc.rating);
      return `
        <tr>
          <td style="padding: 8px 10px; text-align: center; font-size: 12px;">${estrelas}</td>
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
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; margin: 0; padding: 20px; background-color: #f5f5f5; }
        .container { max-width: 900px; margin: 0 auto; background: white; border-radius: 12px; overflow: hidden; box-shadow: 0 2px 8px rgba(0,0,0,0.1); }
        .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 24px 30px; text-align: center; }
        .header h1 { margin: 0; font-size: 22px; }
        .header p { margin: 6px 0 0 0; opacity: 0.9; font-size: 13px; }
        .content { padding: 24px 30px 30px 30px; }
        .section-title { font-size: 16px; font-weight: 600; color: #2d3748; margin: 0 0 12px 0; border-bottom: 2px solid #e2e8f0; padding-bottom: 6px; }
        .section-title.no-border { border-bottom: none; }
        .section-title.spaced { margin-top: 16px; }
        .kpi-grid { display: grid; grid-template-columns: 1fr; gap: 10px; margin-bottom: 16px; }
        .kpi-card { background: #f8f9fa; border-radius: 8px; padding: 16px 18px; border-left: 3px solid #667eea; }
        .kpi-card.success { border-left-color: #48bb78; }
        .kpi-card.warning { border-left-color: #ed8936; }
        .kpi-card.danger { border-left-color: #f56565; }
        .kpi-card.info { border-left-color: #4299e1; }
        .kpi-card.purple { border-left-color: #667eea; }
        .kpi-label { font-size: 11px; text-transform: uppercase; color: #718096; font-weight: 600; margin-bottom: 6px; }
        .kpi-value { font-size: 20px; font-weight: 700; color: #2d3748; }
        .kpi-subtitle { font-size: 12px; color: #718096; margin-top: 3px; }
        .meta-section { background: #f7fafc; padding: 18px 20px; border-radius: 8px; box-shadow: 0 1px 3px rgba(0,0,0,0.05); margin-bottom: 16px; }
        .meta-grid { display: grid; grid-template-columns: 1fr; gap: 10px; }
        .meta-item { padding: 6px 0; }
        .meta-label { color: #718096; font-size: 12px; margin-bottom: 2px; }
        .meta-value { color: #2d3748; font-size: 18px; font-weight: bold; }
        .comp-section { background: #f7fafc; padding: 18px 20px; border-radius: 8px; box-shadow: 0 1px 3px rgba(0,0,0,0.05); margin-bottom: 16px; }
        .comp-grid { display: grid; grid-template-columns: 1fr; gap: 10px; }
        .comp-card { background: #f7fafc; padding: 10px 12px; border-radius: 6px; border-left: 3px solid #4299e1; }
        .comp-card.gold { background: #fffaf0; border-left-color: #f6ad55; }
        .comp-title { color: #2d3748; font-size: 13px; font-weight: bold; margin-bottom: 6px; }
        .comp-value { color: #4a5568; font-size: 14px; margin-bottom: 4px; }
        .comp-var { font-size: 13px; font-weight: bold; }
        .comp-var.pos { color: #48bb78; }
        .comp-var.neg { color: #f56565; }
        .ranking-table, .hot-table { width: 100%; border-collapse: collapse; margin-top: 8px; margin-bottom: 16px; }
        .ranking-table th, .ranking-table td, .hot-table th, .hot-table td { border-bottom: 1px solid #e2e8f0; font-size: 13px; }
        .ranking-table th, .hot-table th { background: #f7fafc; padding: 8px 10px; text-align: left; color: #4a5568; font-weight: 600; }
        .ranking-table td, .hot-table td { padding: 8px 10px; color: #2d3748; }
        .analysis { background: white; padding: 16px 18px; border-radius: 8px; box-shadow: 0 1px 3px rgba(0,0,0,0.05); margin-top: 18px; }
        .analysis p { margin: 6px 0; color: #4a5568; line-height: 1.6; font-size: 13px; }
        .cta-section { text-align: center; margin: 24px 0 8px 0; padding: 20px 16px; }
        .cta-button { display: inline-block; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 14px 32px; border-radius: 8px; text-decoration: none; font-weight: 600; font-size: 14px; box-shadow: 0 4px 12px rgba(102, 126, 234, 0.4); transition: transform 0.2s; }
        .cta-button:hover { transform: translateY(-2px); }
        .footer { background: #f7fafc; padding: 16px 20px; text-align: center; font-size: 12px; color: #718096; }
        @media (max-width: 600px) {
          .content { padding: 18px 16px 20px 16px; }
        }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <img src="https://globinho.vercel.app/logo-global-aco.png" alt="Global Aço" style="height:45px;margin-bottom:10px;" />
          <h1>📊 Relatório Comercial</h1>
          <p>Gerado em ${reportDate}</p>
          <p><strong>Período:</strong> ${periodo}</p>
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
            <h3 class="section-title no-border">💡 Análise Rápida</h3>
            <p>• Faturamento no período representa <strong>${percentualMeta.toFixed(
              1
            )}%</strong> da meta mensal</p>
            ${
              mesAnterior
                ? `<p>• ${
                    mesAnterior.variacao >= 0 ? 'Aumento' : 'Redução'
                  } de <strong>${Math.abs(
                    mesAnterior.variacao
                  ).toFixed(1)}%</strong> em relação ao mês anterior</p>`
                : ''
            }
            ${
              faltaMeta > 0
                ? `<p>• Ainda há <strong>${formatCurrency(
                    faltaMeta
                  )}</strong> para atingir a meta</p>`
                : `<p>• <strong>Meta atingida!</strong> Superou em ${formatCurrency(
                    Math.abs(faltaMeta)
                  )}</p>`
            }
            <p>• Média de <strong>${formatCurrency(
              kpis.mediaDiaria
            )}</strong> por dia útil (${kpis.diasUteis} dias)</p>
            ${
              kpis.pedidosNaoFaturados > 0
                ? `<p>• <strong>${kpis.pedidosNaoFaturados}</strong> pedidos aguardando faturamento</p>`
                : ''
            }
            ${
              kpis.perdidosQtd > 0
                ? `<p>• <strong>${kpis.perdidosQtd}</strong> oportunidades perdidas no valor de ${formatCurrency(
                    kpis.perdidosValor
                  )}</p>`
                : ''
            }
            ${
              ranking.length > 0
                ? `<p>• <strong>${ranking[0].nome}</strong> lidera o ranking com ${formatCurrency(
                    ranking[0].faturamento
                  )} (${ranking[0].percentualTotal.toFixed(
                    1
                  )}% do total)</p>`
                : ''
            }
            ${
              orcamentosQuentes.length > 0
                ? `<p>• Existem <strong>${orcamentosQuentes.length}</strong> orçamentos quentes em aberto somando ${formatCurrency(
                    totalOrcamentosQuentes
                  )}</p>`
                : '<p>• Atenção: nenhum orçamento classificado como quente (3+ estrelas) no momento.</p>'
            }
          </div>
        </div>

        <div class="cta-section">
          <a href="https://globaltools.lovable.app" class="cta-button">
            🚀 Acessar Dashboard Completo
          </a>
        </div>

        <div class="footer">
          <p>Este relatório usa a mesma fonte de dados do Dashboard Comercial.</p>
          <p>Acesse o Dashboard para visualizar análises detalhadas.</p>
        </div>
      </div>
    </body>
    </html>
  `;
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { configId } = await req.json();
    const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    console.log('📊 Carregando dados da planilha (últimos 6 meses)...');
    // Carregar os dados UMA VEZ (já filtrados por período)
    const allData = await loadComercialDataFromSheet();
    console.log(`📋 ${allData.length} registros carregados`);

    // Definir período: mês atual até hoje
    const agora = new Date();
    const anoAtual = agora.getFullYear();
    const mesAtual = agora.getMonth();
    const inicioMes = new Date(anoAtual, mesAtual, 1);
    const fimPeriodo = agora;

    const periodo = `${formatDate(inicioMes)} a ${formatDate(fimPeriodo)}`;
    const reportDate = formatDate(agora);

    // Meta mensal do admin_goals
    let meta = 2000000;
    try {
      const mesStr = String(mesAtual + 1).padStart(2, '0');
      const anoStr = String(anoAtual);
      const monthYear = `${anoStr}-${mesStr}`;
      const { data: metaData } = await supabaseAdmin
        .from('admin_goals')
        .select('monthly_revenue_goal')
        .eq('month_year', monthYear)
        .maybeSingle();
      
      if (metaData?.monthly_revenue_goal) {
        meta = Number(metaData.monthly_revenue_goal);
      }
    } catch (err) {
      console.log("⚠️ Usando meta padrão");
    }

    // Calcular KPIs do mês atual
    console.log('📊 Calculando KPIs...');
    const kpis = calculateKPIs(allData, inicioMes, fimPeriodo);

    // Ranking de vendedores (reusar dados já carregados)
    console.log('🏆 Calculando ranking de vendedores...');
    const ranking = calcularRankingVendedores(allData, inicioMes, fimPeriodo);

    // Orçamentos quentes (reusar dados já carregados)
    console.log('🔥 Buscando orçamentos quentes...');
    const orcamentosQuentes = await buscarOrcamentosQuentes(supabaseAdmin, allData);

    // Calcular mês anterior (reusar dados já carregados)
    let mesAnterior: ComparativoMes | null = null;
    if (mesAtual > 0 || anoAtual > inicioMes.getFullYear()) {
      const mesAnt = mesAtual === 0 ? 11 : mesAtual - 1;
      const anoAnt = mesAtual === 0 ? anoAtual - 1 : anoAtual;
      const inicioAnt = new Date(anoAnt, mesAnt, 1);
      const fimAnt = new Date(anoAnt, mesAnt + 1, 0);
      const kpisAnt = calculateKPIs(allData, inicioAnt, fimAnt);
      mesAnterior = {
        mes: String(mesAnt + 1).padStart(2, '0'),
        ano: anoAnt,
        faturamento: kpisAnt.faturamento,
        variacao: kpisAnt.faturamento > 0 
          ? ((kpis.faturamento - kpisAnt.faturamento) / kpisAnt.faturamento) * 100 
          : 0
      };
    }

    // Remover cálculo do melhor mês para economizar recursos
    const melhorMes: ComparativoMes | null = null;

    // Gerar HTML
    console.log('📄 Gerando HTML do relatório...');
    const html = generateReportHTML(
      kpis,
      meta,
      ranking,
      orcamentosQuentes,
      mesAnterior,
      melhorMes,
      periodo,
      reportDate
    );

    return new Response(
      JSON.stringify({ html }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  } catch (error: any) {
    console.error('❌ Erro ao gerar pré-visualização:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
};

serve(handler);
