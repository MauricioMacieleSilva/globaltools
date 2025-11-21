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
  
  // Filtrar dados por período usando getDateField
  const filteredData = allData.filter(item => {
    const date = getDateField(item);
    return date && date >= startDate && date <= endDate;
  });
  
  console.log(`📋 Registros no período: ${filteredData.length} de ${allData.length} totais`);
  
  // 1. FATURAMENTO
  const faturados = filteredData.filter(item =>
    (item.situacao === 'Emitida' || item.situacao === 'Pedido') &&
    item.faturamento_tipo === 1
  );
  const faturado = faturados.reduce((acc, item) => acc + item.valor, 0);
  console.log(`💰 Faturamento: R$ ${faturado.toFixed(2)} (${faturados.length} registros)`);
  
  // 2. ORÇAMENTOS
  const orcamentos = allData.filter(item => item.situacao === 'Orçamento');
  const orcamentosValor = orcamentos.reduce((acc, item) => acc + item.valor, 0);
  console.log(`📋 Orçamentos: R$ ${orcamentosValor.toFixed(2)} (${orcamentos.length} registros)`);
  
  // 3. PEDIDOS NÃO FATURADOS
  const pedidosNaoFaturadosData = filteredData.filter(item =>
    item.situacao === 'Pedido' && item.faturamento_tipo === 1
  );
  const pedidosNaoFaturados = pedidosNaoFaturadosData.length;
  console.log(`📦 Pedidos não faturados: ${pedidosNaoFaturados}`);
  
  // 4. PERDIDOS
  const perdidosData = filteredData.filter(item => item.situacao === 'Perdido');
  const perdidosValor = perdidosData.reduce((acc, item) => acc + item.valor, 0);
  const perdidosQtd = perdidosData.length;
  console.log(`❌ Perdidos: R$ ${perdidosValor.toFixed(2)} (${perdidosQtd} oportunidades)`);

  // Calcular dias úteis e média diária
  const diasUteis = calcularDias ? calcularDiasUteis(startDate, endDate) : 1;
  const mediaDiaria = diasUteis > 0 ? faturado / diasUteis : 0;
  
  console.log(`📊 Dias úteis no período: ${diasUteis}`);
  console.log(`📊 Média diária: R$ ${mediaDiaria.toFixed(2)}`);

  return {
    faturamento: faturado,
    orcamentosValor,
    pedidosNaoFaturados,
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
  periodo: string,
  meta: number,
  mesAnterior: ComparativoMes | null,
  melhorMes: ComparativoMes | null
): string {
  // Calcular percentual da meta
  const percentualMeta = meta > 0 ? (kpis.faturamento / meta) * 100 : 0;
  const faltaMeta = meta - kpis.faturamento;
  
  // Definir status da meta
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
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; margin: 0; padding: 20px; background-color: #f5f5f5; }
        .container { max-width: 700px; margin: 0 auto; background: white; border-radius: 12px; overflow: hidden; box-shadow: 0 2px 8px rgba(0,0,0,0.1); }
        .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; }
        .header h1 { margin: 0; font-size: 24px; }
        .header p { margin: 10px 0 0 0; opacity: 0.9; font-size: 14px; }
        .content { padding: 30px; }
        .section-title { font-size: 18px; font-weight: 600; color: #2d3748; margin: 25px 0 15px 0; border-bottom: 2px solid #e2e8f0; padding-bottom: 8px; }
        .kpi-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 15px; margin: 20px 0; }
        .kpi-card { background: #f8f9fa; border-radius: 8px; padding: 20px; border-left: 4px solid #667eea; }
        .kpi-card.success { border-left-color: #48bb78; }
        .kpi-card.warning { border-left-color: #ed8936; }
        .kpi-card.danger { border-left-color: #f56565; }
        .kpi-card.info { border-left-color: #4299e1; }
        .kpi-card.purple { border-left-color: #667eea; }
        .kpi-label { font-size: 12px; text-transform: uppercase; color: #718096; font-weight: 600; margin-bottom: 8px; }
        .kpi-value { font-size: 24px; font-weight: 700; color: #2d3748; }
        .kpi-subtitle { font-size: 13px; color: #718096; margin-top: 5px; }
        .meta-section { background: white; padding: 20px; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); margin-top: 20px; }
        .meta-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 15px; }
        .meta-item { padding: 15px; background: #f7fafc; border-radius: 6px; }
        .meta-label { color: #718096; font-size: 13px; margin-bottom: 5px; }
        .meta-value { color: #2d3748; font-size: 20px; font-weight: bold; }
        .comp-section { background: white; padding: 20px; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); margin-top: 20px; }
        .comp-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 15px; }
        .comp-card { background: #f7fafc; padding: 15px; border-radius: 6px; border-left: 4px solid #4299e1; }
        .comp-card.gold { background: #fffaf0; border-left-color: #f6ad55; }
        .comp-title { color: #2d3748; font-size: 14px; font-weight: bold; margin-bottom: 10px; }
        .comp-value { color: #4a5568; font-size: 16px; margin-bottom: 5px; }
        .comp-var { font-size: 14px; font-weight: bold; }
        .comp-var.pos { color: #48bb78; }
        .comp-var.neg { color: #f56565; }
        .analysis { background: white; padding: 20px; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); margin-top: 20px; }
        .analysis p { margin: 8px 0; color: #4a5568; line-height: 1.8; }
        .footer { background: #f7fafc; padding: 20px; text-align: center; font-size: 13px; color: #718096; }
        @media (max-width: 600px) {
          .kpi-grid, .meta-grid, .comp-grid { grid-template-columns: 1fr; }
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

          <div class="meta-section">
            <h3 class="section-title">🎯 Meta do Mês</h3>
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
                <div class="meta-value" style="color: ${faltaMeta > 0 ? '#ed8936' : '#48bb78'};">
                  ${faltaMeta > 0 ? formatCurrency(faltaMeta) : 'Meta Atingida!'}
                </div>
              </div>
            </div>
          </div>

          ${mesAnterior || melhorMes ? `
          <div class="comp-section">
            <h3 class="section-title">📈 Comparativos</h3>
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
            <h3 class="section-title">💡 Análise Rápida</h3>
            <p>• Faturamento no período representa <strong>${percentualMeta.toFixed(1)}%</strong> da meta mensal</p>
            ${mesAnterior ? `<p>• ${mesAnterior.variacao >= 0 ? 'Aumento' : 'Redução'} de <strong>${Math.abs(mesAnterior.variacao).toFixed(1)}%</strong> em relação ao mês anterior</p>` : ''}
            ${faltaMeta > 0 ? `<p>• Ainda há <strong>${formatCurrency(faltaMeta)}</strong> para atingir a meta</p>` : `<p>• <strong>Meta atingida!</strong> Superou em ${formatCurrency(Math.abs(faltaMeta))}</p>`}
            <p>• Média de <strong>${formatCurrency(kpis.mediaDiaria)}</strong> por dia útil (${kpis.diasUteis} dias)</p>
            ${kpis.pedidosNaoFaturados > 0 ? `<p>• <strong>${kpis.pedidosNaoFaturados}</strong> pedidos aguardando faturamento</p>` : ''}
            ${kpis.perdidosQtd > 0 ? `<p>• <strong>${kpis.perdidosQtd}</strong> oportunidades perdidas no valor de ${formatCurrency(kpis.perdidosValor)}</p>` : ''}
          </div>
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

    // 1. Definir período: mês atual até hoje
    const now = new Date();
    const startDate = new Date(now.getFullYear(), now.getMonth(), 1);
    startDate.setHours(0, 0, 0, 0);
    const endDate = new Date(now);
    endDate.setHours(23, 59, 59, 999);

    const reportDate = formatDate(now);
    const periodo = `${formatDate(startDate)} a ${formatDate(endDate)}`;

    console.log(`📅 Período: ${periodo}`);

    // 2. Carregar dados da planilha
    const allData = await loadComercialDataFromSheet();
    
    // 3. Buscar meta mensal do banco de dados
    console.log('🎯 Buscando meta mensal...');
    const ano = startDate.getFullYear();
    const mes = startDate.getMonth() + 1;
    
    let metaMensal = 2000000; // Valor padrão: R$ 2.000.000,00
    
    try {
      const { data: metaData, error: metaError } = await supabaseAdmin
        .from('metas_vendas')
        .select('meta_mensal')
        .eq('ano', ano)
        .eq('mes', mes)
        .limit(1)
        .single();
      
      if (metaError) {
        console.log('⚠️ Meta não encontrada no banco, usando valor padrão:', metaError.message);
      } else if (metaData?.meta_mensal) {
        metaMensal = Number(metaData.meta_mensal);
        console.log('✅ Meta mensal encontrada:', metaMensal);
      }
    } catch (error) {
      console.log('⚠️ Erro ao buscar meta, usando valor padrão:', error);
    }

    // 4. Calcular KPIs do período solicitado
    console.log(`📊 Calculando KPIs para período: ${startDate.toISOString()} a ${endDate.toISOString()}`);
    const kpis = calculateKPIs(allData, startDate, endDate);
    
    // 5. Calcular KPIs do mês anterior
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
    
    // 6. Identificar o melhor mês (últimos 12 meses)
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

    // 7. Gerar HTML do relatório
    console.log('📧 Gerando HTML do relatório...');
    const reportHTML = generateReportHTML(kpis, reportDate, periodo, metaMensal, mesAnterior, melhorMes);

    // 8. Enviar email via Resend
    const isTestMode = true;
    const authorizedTestEmail = "mauricio.maciel@globalaco.com.br";
    
    const emailPayload = {
      from: "Lovable <onboarding@resend.dev>",
      to: isTestMode ? [authorizedTestEmail] : [config.email],
      subject: isTestMode 
        ? `📊 Relatório Comercial Manual - ${reportDate} [TESTE]`
        : `📊 Relatório Comercial Manual - ${reportDate}`,
      html: reportHTML,
      ...(isTestMode && { test: true })
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
      email: isTestMode ? authorizedTestEmail : config.email,
      status: 'success',
      report_date: startDate.toISOString().split('T')[0],
    });

    console.log(`✅ Relatório manual enviado com sucesso para ${isTestMode ? authorizedTestEmail : config.email} ${isTestMode ? '(modo teste)' : ''}`);

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: `Relatório enviado para ${isTestMode ? authorizedTestEmail : config.email}` 
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
