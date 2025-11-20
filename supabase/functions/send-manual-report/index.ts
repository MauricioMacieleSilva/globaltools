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
  perdidos: {
    valor: number;
    quantidade: number;
  };
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

function normalizeField(value: string): string {
  return value?.trim().replace(/\s+/g, ' ') || '';
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
    
    console.log('📥 Status da resposta:', response.status, response.statusText);
    console.log('📥 Headers da resposta:', Object.fromEntries(response.headers.entries()));
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ Resposta de erro:', errorText.substring(0, 500));
      throw new Error(`HTTP error! status: ${response.status} - ${response.statusText}`);
    }
    
    const csvText = await response.text();
    const rows = parseCSV(csvText);
    
    if (rows.length < 2) {
      console.log('⚠️ Planilha vazia ou com poucos dados');
      return [];
    }
    
    const headers = rows[0].map(h => normalizeField(h.toLowerCase()));
    console.log('📋 Headers encontrados (primeiros 10):', headers.slice(0, 10));
    
    // Mapear colunas - IGUAL ao googleSheetsService
    const columnMap: Record<string, number> = {};
    headers.forEach((header, index) => {
      const normalized = normalizeField(header);
      if (normalized === 'numeropedido') columnMap.numeropedido = index;
      if (normalized === 'situacao') columnMap.situacao = index;
      if (normalized === 'data emissao' || normalized === 'data_emissao') columnMap.data_emissao = index;
      if (normalized === 'data inicio' || normalized === 'data_inicio') columnMap.data_inicio = index;
      if (normalized === 'data perdido' || normalized === 'data_perdido') columnMap.data_perdido = index;
      if (normalized === 'data pedido pronto' || normalized === 'data_pedido_pronto') columnMap.data_pedido_pronto = index;
      if (normalized === 'valor') columnMap.valor = index;
      if (normalized === 'peso') columnMap.peso = index;
      if (normalized === 'classe') columnMap.classe = index;
      if (normalized === 'cli_nomefantasia') columnMap.cli_nomefantasia = index;
      if (normalized === 'cliente') columnMap.cliente = index;
      if (normalized === 'codigocliente') columnMap.codigocliente = index;
      if (normalized === 'uf') columnMap.uf = index;
      if (normalized === 'vendedor') columnMap.vendedor = index;
      if (normalized === 'faturamento_tipo') columnMap.faturamento_tipo = index;
      if (normalized === 'produto') columnMap.produto = index;
      if (normalized === 'obs') columnMap.obs = index;
    });
    
    console.log('🗺️ Colunas principais mapeadas:', {
      numeropedido: columnMap.numeropedido,
      situacao: columnMap.situacao,
      data_emissao: columnMap.data_emissao,
      data_inicio: columnMap.data_inicio,
      valor: columnMap.valor,
      faturamento_tipo: columnMap.faturamento_tipo
    });
    
    const data: ComercialData[] = [];
    
    for (let i = 1; i < rows.length; i++) {
      const row = rows[i];
      
      const situacao = normalizeField(row[columnMap.situacao] || '');
      const valorStr = (row[columnMap.valor] || '0').replace(/[^\d,-]/g, '').replace(',', '.');
      const valor = parseFloat(valorStr) || 0;
      const cli_nomefantasia = normalizeField(row[columnMap.cli_nomefantasia] || '');
      
      // Filtros - IGUAL ao googleSheetsService
      if (!situacao) continue;
      if (valor <= 0) continue;
      
      // Excluir cliente GLOBAL AÇO
      const normalizeText = (text: string) => text?.toUpperCase().replace(/\s+/g, ' ').trim();
      const nomeFantasia = normalizeText(cli_nomefantasia);
      if (nomeFantasia.includes('GLOBAL') && nomeFantasia.includes('AÇO')) {
        continue;
      }
      
      const item: ComercialData = {
        numeropedido: normalizeField(row[columnMap.numeropedido] || ''),
        situacao,
        data_emissao: normalizeField(row[columnMap.data_emissao] || ''),
        data_inicio: normalizeField(row[columnMap.data_inicio] || ''),
        data_perdido: normalizeField(row[columnMap.data_perdido] || ''),
        data_pedido_pronto: normalizeField(row[columnMap.data_pedido_pronto] || ''),
        valor,
        peso: parseFloat((row[columnMap.peso] || '0').replace(/[^\d,-]/g, '').replace(',', '.')) || 0,
        classe: normalizeField(row[columnMap.classe] || ''),
        cli_nomefantasia,
        cliente: normalizeField(row[columnMap.cliente] || ''),
        codigocliente: normalizeField(row[columnMap.codigocliente] || ''),
        uf: normalizeField(row[columnMap.uf] || ''),
        vendedor: normalizeField(row[columnMap.vendedor] || ''),
        faturamento_tipo: parseInt(row[columnMap.faturamento_tipo] || '0') || 0,
        produto: normalizeField(row[columnMap.produto] || ''),
        obs: normalizeField(row[columnMap.obs] || ''),
      };
      
      data.push(item);
    }
    
    console.log(`✅ ${data.length} registros carregados da planilha`);
    return data;
    
  } catch (error) {
    console.error('❌ Erro ao buscar dados da planilha:', error);
    throw error;
  }
}

// Calcular KPIs - IGUAL ao ComercialContext e ComercialKPIs
function calculateKPIs(allData: ComercialData[], startDate: Date, endDate: Date): EmailKPIs {
  console.log(`📊 Calculando KPIs para período: ${startDate.toISOString()} a ${endDate.toISOString()}`);
  
  // Filtrar dados por período usando getDateField
  const filteredData = allData.filter(item => {
    const date = getDateField(item);
    return date && date >= startDate && date <= endDate;
  });
  
  console.log(`📋 Registros no período: ${filteredData.length} de ${allData.length} totais`);
  
  // 1. FATURAMENTO - IGUAL ao ComercialKPIs
  // Filtrar: situacao 'Emitida' ou 'Pedido' + faturamento_tipo === 1
  const faturados = filteredData.filter(item =>
    (item.situacao === 'Emitida' || item.situacao === 'Pedido') &&
    item.faturamento_tipo === 1
  );
  const faturamento = faturados.reduce((acc, item) => acc + item.valor, 0);
  console.log(`💰 Faturamento: R$ ${faturamento.toFixed(2)} (${faturados.length} registros)`);
  
  // 2. ORÇAMENTOS - IGUAL ao ComercialContext
  // Usar TODOS os dados (não filtrar por período), situacao 'Orçamento'
  const orcamentos = allData.filter(item => item.situacao === 'Orçamento');
  const orcamentosValor = orcamentos.reduce((acc, item) => acc + item.valor, 0);
  console.log(`📋 Orçamentos: R$ ${orcamentosValor.toFixed(2)} (${orcamentos.length} registros)`);
  
  // 3. PEDIDOS NÃO FATURADOS - IGUAL ao ComercialKPIs
  // Filtrar: situacao 'Pedido' + faturamento_tipo === 1 no período
  const pedidosNaoFaturadosData = filteredData.filter(item =>
    item.situacao === 'Pedido' && item.faturamento_tipo === 1
  );
  const pedidosNaoFaturados = pedidosNaoFaturadosData.length;
  console.log(`📦 Pedidos não faturados: ${pedidosNaoFaturados}`);
  
  // 4. PERDIDOS - IGUAL ao ComercialContext
  // Filtrar: situacao 'Perdido' no período
  const perdidosData = filteredData.filter(item => item.situacao === 'Perdido');
  const perdidosValor = perdidosData.reduce((acc, item) => acc + item.valor, 0);
  const perdidosQuantidade = perdidosData.length;
  console.log(`❌ Perdidos: R$ ${perdidosValor.toFixed(2)} (${perdidosQuantidade} oportunidades)`);
  
  return {
    faturamento,
    orcamentosValor,
    pedidosNaoFaturados,
    perdidos: {
      valor: perdidosValor,
      quantidade: perdidosQuantidade,
    },
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

function generateReportHTML(kpis: EmailKPIs, reportDate: string, periodo: string): string {
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
        .kpi-label { font-size: 12px; text-transform: uppercase; color: #718096; font-weight: 600; margin-bottom: 8px; }
        .kpi-value { font-size: 24px; font-weight: 700; color: #2d3748; }
        .kpi-subtitle { font-size: 13px; color: #718096; margin-top: 5px; }
        .summary { background: #e6fffa; border-radius: 8px; padding: 20px; margin: 20px 0; border-left: 4px solid #38b2ac; }
        .summary p { margin: 0; color: #234e52; line-height: 1.6; }
        .footer { background: #f7fafc; padding: 20px; text-align: center; font-size: 13px; color: #718096; }
        @media (max-width: 600px) {
          .kpi-grid { grid-template-columns: 1fr; }
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
              <div class="kpi-value">${formatCurrency(kpis.perdidos.valor)}</div>
              <div class="kpi-subtitle">${kpis.perdidos.quantidade} oportunidade(s)</div>
            </div>
          </div>

          <div class="summary">
            <p>
              <strong>Resumo:</strong> 
              No período foram registrados ${formatCurrency(kpis.faturamento)} em faturamento, 
              ${formatCurrency(kpis.orcamentosValor)} em orçamentos, 
              ${kpis.pedidosNaoFaturados} pedido(s) em aberto 
              e ${formatCurrency(kpis.perdidos.valor)} em oportunidades perdidas.
            </p>
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

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    const { data: config, error: configError } = await supabase
      .from('email_reports_config')
      .select('*')
      .eq('id', configId)
      .single();

    if (configError || !config) {
      throw new Error('Configuração não encontrada');
    }

    // Período: mês atual até hoje
    const now = new Date();
    const startDate = new Date(now.getFullYear(), now.getMonth(), 1);
    startDate.setHours(0, 0, 0, 0);
    const endDate = new Date(now);
    endDate.setHours(23, 59, 59, 999);

    const reportDate = formatDate(now);
    const periodo = `${formatDate(startDate)} a ${formatDate(endDate)}`;

    console.log(`📅 Período: ${periodo}`);

    // Carregar dados da planilha
    const allData = await loadComercialDataFromSheet();
    
    // Calcular KPIs
    const kpis = calculateKPIs(allData, startDate, endDate);
    
    console.log('✅ KPIs finais:', {
      faturamento: kpis.faturamento,
      orcamentosValor: kpis.orcamentosValor,
      pedidosNaoFaturados: kpis.pedidosNaoFaturados,
      perdidosValor: kpis.perdidos.valor,
      perdidosQtd: kpis.perdidos.quantidade
    });

    const htmlContent = generateReportHTML(kpis, reportDate, periodo);

    const isTestMode = true;
    const authorizedTestEmail = "mauricio.maciel@globalaco.com.br";
    
    const emailPayload = {
      from: "Lovable <onboarding@resend.dev>",
      to: isTestMode ? [authorizedTestEmail] : [config.email],
      subject: isTestMode 
        ? `📊 Relatório Comercial Manual - ${reportDate} [TESTE]`
        : `📊 Relatório Comercial Manual - ${reportDate}`,
      html: htmlContent,
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

    await supabase.from('email_reports_log').insert({
      config_id: configId,
      email: isTestMode ? authorizedTestEmail : config.email,
      status: 'success',
      report_date: now.toISOString().split('T')[0]
    });

    console.log(`✅ Relatório manual enviado com sucesso para ${isTestMode ? authorizedTestEmail + ' (modo teste)' : config.email}`);

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'Relatório enviado com sucesso',
        testMode: isTestMode,
        recipient: isTestMode ? authorizedTestEmail : config.email
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: any) {
    console.error("❌ [send-manual-report] Erro:", error);
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
};

serve(handler);
