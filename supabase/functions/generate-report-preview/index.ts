import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const GOOGLE_SHEETS_API_KEY = Deno.env.get("GOOGLE_SHEETS_API_KEY")!;
const SPREADSHEET_ID = "1meFHGnpxg5t2wJe-B82i-FDDcNPLHHl1sL2ImpFxWLM";
const RANGE = "comercial!A:Z";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Importar as mesmas interfaces e funções do send-manual-report
interface ComercialData {
  vendedor: string;
  dataFaturamento?: string;
  dataEmissao?: string;
  dataPerdido?: string;
  numeroPedido: string;
  cliente: string;
  valor: number;
  status: string;
  peso?: number;
}

interface EmailKPIs {
  faturamento: number;
  orcamentosValor: number;
  orcamentosQtd: number;
  perdidosValor: number;
  perdidosQtd: number;
  pedidosNaoFaturados: number;
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
  if (row.dataFaturamento) {
    const d = parseDate(row.dataFaturamento);
    if (d) return d;
  }
  if (row.dataEmissao) {
    const d = parseDate(row.dataEmissao);
    if (d) return d;
  }
  if (row.dataPerdido) {
    const d = parseDate(row.dataPerdido);
    if (d) return d;
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

async function loadComercialDataFromSheet(): Promise<ComercialData[]> {
  const url = `https://sheets.googleapis.com/v4/spreadsheets/${SPREADSHEET_ID}/values/${RANGE}?key=${GOOGLE_SHEETS_API_KEY}`;
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Erro ao buscar dados da planilha: ${response.statusText}`);
  }
  const json = await response.json();
  const rows = json.values || [];
  
  if (rows.length < 2) return [];
  
  const headers = rows[0];
  const dataRows = rows.slice(1);
  
  return dataRows.map((row: string[]) => {
    const obj: any = {};
    headers.forEach((h: string, i: number) => {
      obj[h] = row[i] || '';
    });
    return {
      vendedor: obj.Vendedor || '',
      dataFaturamento: obj['Data Faturamento'] || obj['Data de Faturamento'] || '',
      dataEmissao: obj['Data de Emissão'] || obj['Data Emissão'] || '',
      dataPerdido: obj['Data Perdido'] || '',
      numeroPedido: obj['Nº Pedido'] || obj['Numero Pedido'] || '',
      cliente: obj.Cliente || '',
      valor: parseFloat((obj.Valor || '0').replace(',', '.')) || 0,
      status: obj.Status || '',
      peso: parseFloat((obj.Peso || '0').replace(',', '.')) || 0,
    };
  });
}

function calculateKPIs(data: ComercialData[], inicio: Date, fim: Date): EmailKPIs {
  const registrosPeriodo = data.filter(row => {
    const d = getDateField(row);
    return d && d >= inicio && d <= fim;
  });

  console.log(`📋 Registros no período: ${registrosPeriodo.length} de ${data.length} totais`);

  const faturamento = registrosPeriodo
    .filter(r => r.status === 'Faturado')
    .reduce((sum, r) => sum + r.valor, 0);
  console.log(`💰 Faturamento: R$ ${faturamento.toFixed(2)} (${registrosPeriodo.filter(r => r.status === 'Faturado').length} registros)`);

  const orcamentosValor = registrosPeriodo
    .filter(r => r.status === 'Orçamento')
    .reduce((sum, r) => sum + r.valor, 0);
  const orcamentosQtd = registrosPeriodo.filter(r => r.status === 'Orçamento').length;
  console.log(`📋 Orçamentos: R$ ${orcamentosValor.toFixed(2)} (${orcamentosQtd} registros)`);

  const perdidosRaw = registrosPeriodo.filter(r => r.status === 'Perdido');
  const perdidosUnicos = new Map<string, ComercialData>();
  perdidosRaw.forEach(p => {
    if (!perdidosUnicos.has(p.numeroPedido)) {
      perdidosUnicos.set(p.numeroPedido, p);
    }
  });
  const perdidosValor = Array.from(perdidosUnicos.values()).reduce((sum, r) => sum + r.valor, 0);
  const perdidosQtd = perdidosUnicos.size;
  console.log(`❌ Perdidos: R$ ${perdidosValor.toFixed(2)} (${perdidosQtd} pedidos distintos)`);

  const pedidosNaoFaturados = registrosPeriodo.filter(r => r.status === 'Pedido').length;
  console.log(`📦 Pedidos não faturados: ${pedidosNaoFaturados}`);

  const diasUteis = calcularDiasUteis(inicio, fim);
  console.log(`📊 Dias úteis no período: ${diasUteis}`);
  
  const mediaDiaria = diasUteis > 0 ? faturamento / diasUteis : 0;
  console.log(`📊 Média diária: R$ ${mediaDiaria.toFixed(2)}`);

  return {
    faturamento,
    orcamentosValor,
    orcamentosQtd,
    perdidosValor,
    perdidosQtd,
    pedidosNaoFaturados,
    diasUteis,
    mediaDiaria
  };
}

function calcularRankingVendedores(data: ComercialData[], inicio: Date, fim: Date): VendedorPerformance[] {
  const faturados = data.filter(r => {
    if (r.status !== 'Faturado') return false;
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

async function buscarOrcamentosQuentes(supabaseAdmin: any): Promise<OrcamentoQuente[]> {
  const { data, error } = await supabaseAdmin
    .from('client_budget_ratings')
    .select('budget_number, rating, user_name')
    .gte('rating', 3)
    .order('rating', { ascending: false });

  if (error || !data || data.length === 0) return [];

  const allData = await loadComercialDataFromSheet();
  
  const orcamentos: OrcamentoQuente[] = [];
  for (const rating of data) {
    const found = allData.find(r => r.numeroPedido === rating.budget_number && r.status === 'Orçamento');
    if (found) {
      orcamentos.push({
        numeroPedido: found.numeroPedido,
        cliente: found.cliente,
        vendedor: found.vendedor,
        valor: found.valor,
        peso: found.peso || 0,
        rating: rating.rating,
        dataEmissao: found.dataEmissao
      });
    }
  }

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
        .ranking-table, .hot-table { width: 100%; border-collapse: collapse; margin-top: 8px; }
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
          <h1>📊 Relatório Comercial Manual</h1>
          <p>Gerado em ${reportDate}</p>
          <p><strong>Período:</strong> ${periodo}</p>
        </div>
        
        <div class="content">
          <!-- Seção 1: KPIs Comerciais -->
          <h2 class="section-title">📈 KPIs Comerciais</h2>
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
              <div class="kpi-value">${kpis.pedidosNaoFaturados}</div>
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
          <h2 class="section-title spaced">🏆 Ranking de Vendedores</h2>
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

          <!-- Seção 5: Orçamentos Quentes -->
          <h2 class="section-title spaced">🔥 Orçamentos Quentes</h2>
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
            <h3 class="section-title">💡 Análise Rápida</h3>
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

    // Carregar os dados
    const allData = await loadComercialDataFromSheet();

    // Definir período: mês atual até hoje
    const agora = new Date();
    const anoAtual = agora.getFullYear();
    const mesAtual = agora.getMonth();
    const inicioMes = new Date(anoAtual, mesAtual, 1);
    const fimPeriodo = agora;

    const periodo = `${formatDate(inicioMes)} a ${formatDate(fimPeriodo)}`;
    const reportDate = formatDate(agora);

    // Meta mensal
    let meta = 2000000;
    try {
      const mesStr = String(mesAtual + 1).padStart(2, '0');
      const anoStr = String(anoAtual);
      const { data: metaData } = await supabaseAdmin
        .from('metas_vendas')
        .select('meta_mensal')
        .is('vendedor_id', null)
        .eq('mes', parseInt(mesStr))
        .eq('ano', parseInt(anoStr))
        .maybeSingle();
      
      if (metaData?.meta_mensal) {
        meta = metaData.meta_mensal;
      }
    } catch (err) {
      console.log("⚠️ Usando meta padrão");
    }

    // Calcular KPIs
    const kpis = calculateKPIs(allData, inicioMes, fimPeriodo);

    // Ranking de vendedores
    const ranking = calcularRankingVendedores(allData, inicioMes, fimPeriodo);

    // Orçamentos quentes
    const orcamentosQuentes = await buscarOrcamentosQuentes(supabaseAdmin);

    // Calcular mês anterior
    let mesAnterior: ComparativoMes | null = null;
    if (mesAtual > 0 || anoAtual > inicioMes.getFullYear()) {
      const mesAnt = mesAtual === 0 ? 11 : mesAtual - 1;
      const anoAnt = mesAtual === 0 ? anoAtual - 1 : anoAtual;
      const inicioAnt = new Date(anoAnt, mesAnt, 1);
      const fimAnt = new Date(anoAnt, mesAnt + 1, 0);
      const kpisAnt = calculateKPIs(allData, inicioAnt, fimAnt);
      mesAnterior = {
        mes: String(mesAnt + 1),
        ano: anoAnt,
        faturamento: kpisAnt.faturamento,
        variacao: kpisAnt.faturamento > 0 
          ? ((kpis.faturamento - kpisAnt.faturamento) / kpisAnt.faturamento) * 100 
          : 0
      };
    }

    // Melhor mês (simplificado para o exemplo)
    const melhorMes: ComparativoMes | null = null;

    // Gerar HTML
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
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
      }
    );
  } catch (error: any) {
    console.error('Erro ao gerar pré-visualização:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
      }
    );
  }
};

serve(handler);
