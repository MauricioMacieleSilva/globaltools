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
  perdido_motivo: string;
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

// Determinar qual campo de data usar
function getDateField(item: ComercialData): Date | null {
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
    if (diaSemana !== 0 && diaSemana !== 6) {
      diasUteis++;
    }
    current.setDate(current.getDate() + 1);
  }
  
  return diasUteis;
}

// Carregar dados da planilha
async function loadComercialDataFromSheet(): Promise<ComercialData[]> {
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
    
    if (rows.length < 2) {
      return [];
    }
    
    const comercialData: ComercialData[] = rows
      .slice(1)
      .filter((row: string[]) => row.length > 30 && row[3])
      .map((row: string[]): ComercialData => {
        return {
          numeropedido: row[1] || '',
          situacao: (row[3] || '').trim().replace(/\s+/g, ' '),
          data_emissao: row[4] || '',
          data_inicio: row[33] || '',
          data_perdido: row[35] || '',
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
      })
      .filter((item: ComercialData) => {
        if (!item.situacao || item.valor <= 0) return false;
        const nomeFantasia = item.cli_nomefantasia?.toUpperCase() || '';
        if (nomeFantasia.includes('GLOBAL AÇO')) {
          return false;
        }
        return true;
      });
    
    console.log(`✅ ${comercialData.length} registros carregados`);
    return comercialData;
    
  } catch (error) {
    console.error('❌ Erro ao buscar dados:', error);
    throw error;
  }
}

// Calcular KPIs
function calculateKPIs(
  allData: ComercialData[],
  startDate: Date,
  endDate: Date,
  calcularDias: boolean = true
): EmailKPIs {
  const filteredData = allData.filter(item => {
    const date = getDateField(item);
    return date && date >= startDate && date <= endDate;
  });
  
  const faturados = filteredData.filter(item =>
    (item.situacao === 'Emitida' || item.situacao === 'Pedido') &&
    item.faturamento_tipo === 1
  );
  const faturado = faturados.reduce((acc, item) => acc + item.valor, 0);
  
  const orcamentos = allData.filter(item => item.situacao === 'Orçamento');
  const orcamentosValor = orcamentos.reduce((acc, item) => acc + item.valor, 0);
  
  // Contar pedidos únicos, não linhas, e somar valor total
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
  
  const perdidosData = filteredData.filter(item => 
    item.situacao === 'Perdido' && 
    item.perdido_motivo && 
    item.perdido_motivo !== 'Não informado'
  );
  const perdidosValor = perdidosData.reduce((acc, item) => acc + item.valor, 0);
  const perdidosQtd = perdidosData.length;

  const diasUteis = calcularDias ? calcularDiasUteis(startDate, endDate) : 1;
  const mediaDiaria = diasUteis > 0 ? faturado / diasUteis : 0;

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
  meta: number,
  mesAnterior: ComparativoMes | null,
  melhorMes: ComparativoMes | null
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

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <style>
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; margin: 0; padding: 20px; background-color: #f5f5f5; color: #2d3748; }
        .container { max-width: 700px; margin: 0 auto; background: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 2px 8px rgba(0,0,0,0.1); }
        .header { background: #1e40af !important; background-color: #1e40af !important; color: #ffffff !important; padding: 30px; text-align: center; }
        .header h1 { margin: 0 !important; font-size: 24px !important; color: #ffffff !important; }
        .header p { margin: 10px 0 0 0 !important; opacity: 0.95 !important; font-size: 14px !important; color: #ffffff !important; }
        .header-icon { font-size: 32px !important; margin-bottom: 8px !important; }
        .header-subtitle { margin: 4px 0 !important; font-size: 14px !important; opacity: 0.95 !important; color: #ffffff !important; }
        .content { padding: 30px; background: #ffffff; }
        .section-title { font-size: 18px; font-weight: 600; color: #2d3748 !important; margin: 25px 0 15px 0; border-bottom: 2px solid #e2e8f0; padding-bottom: 8px; }
        .kpi-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 15px; margin: 20px 0; }
        .kpi-card { background: #f8f9fa; border-radius: 8px; padding: 20px; border-left: 4px solid #667eea; }
        .kpi-card.success { border-left-color: #48bb78; }
        .kpi-card.warning { border-left-color: #ed8936; }
        .kpi-card.danger { border-left-color: #f56565; }
        .kpi-card.info { border-left-color: #4299e1; }
        .kpi-card.purple { border-left-color: #667eea; }
        .kpi-label { font-size: 12px; text-transform: uppercase; color: #718096 !important; font-weight: 600; margin-bottom: 8px; }
        .kpi-value { font-size: 24px; font-weight: 700; color: #2d3748 !important; }
        .kpi-subtitle { font-size: 13px; color: #718096 !important; margin-top: 5px; }
        .meta-section { background: #ffffff; padding: 20px; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); margin-top: 20px; }
        .meta-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 15px; }
        .meta-item { padding: 15px; background: #f7fafc; border-radius: 6px; }
        .meta-label { color: #718096 !important; font-size: 13px; margin-bottom: 5px; }
        .meta-value { color: #2d3748 !important; font-size: 20px; font-weight: bold; }
        .comp-section { background: #ffffff; padding: 20px; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); margin-top: 20px; }
        .comp-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 15px; }
        .comp-card { background: #f7fafc; padding: 15px; border-radius: 6px; border-left: 4px solid #4299e1; }
        .comp-card.gold { background: #fffaf0; border-left-color: #f6ad55; }
        .comp-title { color: #2d3748 !important; font-size: 14px; font-weight: bold; margin-bottom: 10px; }
        .comp-value { color: #4a5568 !important; font-size: 16px; margin-bottom: 5px; }
        .comp-var { font-size: 14px; font-weight: bold; }
        .comp-var.pos { color: #48bb78 !important; }
        .comp-var.neg { color: #f56565 !important; }
        .analysis { background: #ffffff; padding: 20px; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); margin-top: 20px; }
        .analysis p { margin: 8px 0; color: #4a5568 !important; line-height: 1.8; }
        .footer { background: #f7fafc; padding: 20px; text-align: center; font-size: 13px; color: #718096 !important; }
        @media (max-width: 600px) {
          .kpi-grid, .meta-grid, .comp-grid { grid-template-columns: 1fr; }
        }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <div class="header-icon">📊</div>
          <h1>Relatório Comercial</h1>
          <p class="header-subtitle"><strong>Ontem:</strong> ${reportDate}</p>
        </div>
        
        <div class="content">
          <h2 class="section-title">📈 KPIs do Dia</h2>
          
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
          </div>

          <div class="meta-section">
            <h3 class="section-title">🎯 Meta do Mês (Progresso)</h3>
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
                <div class="meta-value" style="color: ${corMeta};">${percentualMeta.toFixed(1)}% ${statusMeta}</div>
              </div>
              <div class="meta-item">
                <div class="meta-label">Faltam</div>
                <div class="meta-value" style="color: #ed8936;">${faltaMeta > 0 ? formatCurrency(faltaMeta) : 'Meta atingida! 🎉'}</div>
              </div>
            </div>
          </div>

          ${mesAnterior || melhorMes ? `
          <div class="comp-section">
            <h3 class="section-title">📈 Comparativos (Mês Atual)</h3>
            <div class="comp-grid">
              ${mesAnterior ? `
              <div class="comp-card">
                <div class="comp-title">Mês Anterior (${mesAnterior.mes}/${mesAnterior.ano})</div>
                <div class="comp-value">${formatCurrency(mesAnterior.faturamento)}</div>
                <div class="comp-var ${mesAnterior.variacao >= 0 ? 'pos' : 'neg'}">
                  ${mesAnterior.variacao >= 0 ? '+' : ''}${mesAnterior.variacao.toFixed(1)}% ${mesAnterior.variacao >= 0 ? '↗️' : '↘️'}
                </div>
              </div>
              ` : ''}
              ${melhorMes ? `
              <div class="comp-card gold">
                <div class="comp-title">🏆 Melhor Mês (${melhorMes.mes}/${melhorMes.ano})</div>
                <div class="comp-value">${formatCurrency(melhorMes.faturamento)}</div>
                <div class="comp-var ${melhorMes.variacao >= 0 ? 'pos' : 'neg'}">
                  ${melhorMes.variacao >= 0 ? '+' : ''}${melhorMes.variacao.toFixed(1)}% vs melhor
                </div>
              </div>
              ` : ''}
            </div>
          </div>
          ` : ''}

          <div class="analysis">
            <h3 class="section-title" style="color: #2d3748 !important;">💡 Análise Rápida</h3>
            <p style="color: #4a5568 !important;">• Faturamento de ontem: <strong style="color: #2d3748 !important;">${formatCurrency(kpis.faturamento)}</strong></p>
            ${mesAnterior ? `<p style="color: #4a5568 !important;">• Mês atual com ${mesAnterior.variacao >= 0 ? 'aumento' : 'redução'} de <strong style="color: #2d3748 !important;">${Math.abs(mesAnterior.variacao).toFixed(1)}%</strong> vs mês anterior</p>` : ''}
            ${faltaMeta > 0 ? `<p style="color: #4a5568 !important;">• Ainda faltam <strong style="color: #2d3748 !important;">${formatCurrency(faltaMeta)}</strong> para atingir a meta mensal</p>` : `<p style="color: #4a5568 !important;">• <strong style="color: #2d3748 !important;">Meta atingida!</strong> Superou em ${formatCurrency(Math.abs(faltaMeta))}</p>`}
            ${kpis.pedidosNaoFaturados > 0 ? `<p style="color: #4a5568 !important;">• <strong style="color: #2d3748 !important;">${kpis.pedidosNaoFaturados}</strong> pedidos aguardando faturamento</p>` : ''}
            ${kpis.perdidosQtd > 0 ? `<p style="color: #4a5568 !important;">• <strong style="color: #2d3748 !important;">${kpis.perdidosQtd}</strong> oportunidades perdidas ontem (${formatCurrency(kpis.perdidosValor)})</p>` : ''}
          </div>
        </div>

        <div class="footer">
          <p style="color: #718096 !important;">Este relatório usa a mesma fonte de dados do Dashboard Comercial.</p>
        </div>
      </div>
    </body>
    </html>
  `;
}

const handler = async (req: Request): Promise<Response> => {
  console.log("🚀 [send-daily-report] Função iniciada");

  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    const { data: configs, error: configError } = await supabaseAdmin
      .from('email_reports_config')
      .select('*')
      .eq('is_active', true)
      .eq('frequency', 'daily');

    if (configError) {
      throw configError;
    }

    if (!configs || configs.length === 0) {
      console.log("Nenhuma configuração ativa encontrada");
      return new Response(
        JSON.stringify({ success: true, message: 'Nenhuma configuração ativa' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Ontem completo
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    yesterday.setHours(0, 0, 0, 0);
    
    const endOfYesterday = new Date(yesterday);
    endOfYesterday.setHours(23, 59, 59, 999);

    const reportDate = formatDate(yesterday);

    // Carregar dados
    const allData = await loadComercialDataFromSheet();

    // Buscar meta mensal do admin_goals
    const ano = yesterday.getFullYear();
    const mes = yesterday.getMonth() + 1;
    const monthYear = `${ano}-${String(mes).padStart(2, '0')}`;
    
    let metaMensal = 2000000;
    
    try {
      const { data: metaData } = await supabaseAdmin
        .from('admin_goals')
        .select('monthly_revenue_goal')
        .eq('month_year', monthYear)
        .maybeSingle();
      
      if (metaData?.monthly_revenue_goal) {
        metaMensal = Number(metaData.monthly_revenue_goal);
      }
    } catch (error) {
      console.log('⚠️ Meta não encontrada, usando padrão');
    }

    // Calcular KPIs de ontem
    const kpis = calculateKPIs(allData, yesterday, endOfYesterday, false);
    
    // Calcular KPIs do mês atual até ontem
    const primeiroDiaMes = new Date(ano, mes - 1, 1);
    const kpisMesAtual = calculateKPIs(allData, primeiroDiaMes, endOfYesterday);
    
    // Calcular mês anterior
    let mesAnterior: ComparativoMes | null = null;
    try {
      const mesAnteriorDate = new Date(ano, mes - 2, 1);
      const ultimoDiaMesAnterior = new Date(ano, mes - 1, 0);
      
      const kpisMesAnterior = calculateKPIs(allData, mesAnteriorDate, ultimoDiaMesAnterior, false);
      
      if (kpisMesAnterior.faturamento > 0) {
        const variacao = kpisMesAnterior.faturamento > 0 
          ? ((kpisMesAtual.faturamento - kpisMesAnterior.faturamento) / kpisMesAnterior.faturamento) * 100 
          : 0;
        
        mesAnterior = {
          mes: String(mes - 1 === 0 ? 12 : mes - 1).padStart(2, '0'),
          ano: mes - 1 === 0 ? ano - 1 : ano,
          faturamento: kpisMesAnterior.faturamento,
          variacao,
        };
      }
    } catch (error) {
      console.log('⚠️ Erro ao calcular mês anterior');
    }
    
    // Identificar melhor mês
    let melhorMes: ComparativoMes | null = null;
    try {
      let maiorFaturamento = 0;
      let melhorMesData: { mes: number; ano: number } | null = null;
      
      for (let i = 1; i <= 12; i++) {
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
          ? ((kpisMesAtual.faturamento - maiorFaturamento) / maiorFaturamento) * 100 
          : 0;
        
        melhorMes = {
          mes: String(melhorMesData.mes).padStart(2, '0'),
          ano: melhorMesData.ano,
          faturamento: maiorFaturamento,
          variacao,
        };
      }
    } catch (error) {
      console.log('⚠️ Erro ao identificar melhor mês');
    }

    const htmlContent = generateReportHTML(kpis, reportDate, metaMensal, mesAnterior, melhorMes);

    const results = [];
    for (const config of configs) {
      try {
        const isTestMode = true;
        const authorizedTestEmail = "mauricio.maciel@globalaco.com.br";

        const emailPayload = {
          from: "Lovable <onboarding@resend.dev>",
          to: isTestMode ? [authorizedTestEmail] : [config.email],
          subject: isTestMode 
            ? `📊 Relatório Comercial Diário - ${reportDate} [TESTE]`
            : `📊 Relatório Comercial Diário - ${reportDate}`,
          html: htmlContent,
          ...(isTestMode && { test: true })
        };

        const resendResponse = await fetch("https://api.resend.com/emails", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${RESEND_API_KEY}`,
          },
          body: JSON.stringify(emailPayload),
        });

        const resendData = await resendResponse.json();

        if (resendResponse.ok) {
          await supabaseAdmin.from('email_reports_log').insert({
            config_id: config.id,
            email: isTestMode ? authorizedTestEmail : config.email,
            status: 'success',
            report_date: yesterday.toISOString().split('T')[0],
          });

          results.push({
            email: isTestMode ? authorizedTestEmail : config.email,
            success: true
          });
        }
      } catch (error: any) {
        console.error(`Erro ao enviar para ${config.email}:`, error);
        results.push({
          email: config.email,
          success: false,
          error: error.message
        });
      }
    }

    return new Response(
      JSON.stringify({ success: true, results }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: any) {
    console.error("❌ Erro:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
};

serve(handler);
