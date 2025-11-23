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

interface ComercialData {
  situacao: string;
  valor_total: number;
  data_emissao?: string;
  data_aprovacao?: string;
  data_pedido?: string;
  data_perdido?: string;
  vendedor?: string;
  numero_orcamento?: string;
  cliente?: string;
  temperatura?: string;
}

interface EmailKPIs {
  totalOrcamentos: number;
  valorTotalOrcamentos: number;
  ticketMedio: number;
  aprovados: number;
  valorAprovados: number;
  taxaConversao: number;
  totalPerdidos: number;
  valorPerdidos: number;
  taxaPerda: number;
}

// Funções auxiliares reutilizadas
function parseDate(dateStr: string): Date | null {
  if (!dateStr) return null;
  
  const formats = [
    /^(\d{2})\/(\d{2})\/(\d{4})$/,
    /^(\d{4})-(\d{2})-(\d{2})/,
    /^(\d{2})-(\d{2})-(\d{4})$/
  ];
  
  for (const format of formats) {
    const match = dateStr.match(format);
    if (match) {
      if (format.source.startsWith('^(\\d{4})')) {
        return new Date(`${match[1]}-${match[2]}-${match[3]}`);
      } else {
        return new Date(`${match[3]}-${match[2]}-${match[1]}`);
      }
    }
  }
  
  const parsed = new Date(dateStr);
  return isNaN(parsed.getTime()) ? null : parsed;
}

function getDateField(item: ComercialData): Date | null {
  const situacao = item.situacao?.toLowerCase() || '';
  
  if (situacao.includes('aprovado') && item.data_aprovacao) {
    return parseDate(item.data_aprovacao);
  }
  if (situacao.includes('perdido') && item.data_perdido) {
    return parseDate(item.data_perdido);
  }
  if (item.data_emissao) {
    return parseDate(item.data_emissao);
  }
  
  return null;
}

async function loadComercialDataFromSheet(startDate: Date, endDate: Date): Promise<ComercialData[]> {
  const SHEET_ID = "13F5NcT8Z6quDcW4OmoG8MOhHCRT1W9nWXmNGX839MGo";
  const GID = "2063157767";
  const url = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/export?format=csv&gid=${GID}`;
  
  console.log(`📊 Carregando dados do fechamento mensal...`);
  console.log(`📅 Período: ${startDate.toLocaleDateString('pt-BR')} a ${endDate.toLocaleDateString('pt-BR')}`);
  
  const response = await fetch(url);
  
  if (!response.ok) {
    throw new Error(`Erro ao buscar planilha: ${response.status}`);
  }
  
  const csvText = await response.text();
  const lines = csvText.split('\n');
  
  if (lines.length < 2) {
    console.log("⚠️ Planilha vazia ou sem dados");
    return [];
  }
  
  // Parse header
  const headerLine = lines[0];
  const headerValues: string[] = [];
  let current = '';
  let inQuotes = false;
  
  for (let i = 0; i < headerLine.length; i++) {
    const char = headerLine[i];
    const nextChar = headerLine[i + 1];
    
    if (char === '"') {
      if (inQuotes && nextChar === '"') {
        current += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === ',' && !inQuotes) {
      headerValues.push(current.trim());
      current = '';
    } else {
      current += char;
    }
  }
  headerValues.push(current.trim());
  
  const data: ComercialData[] = [];
  let processedRows = 0;
  let validRows = 0;
  const maxRows = 50000; // Limite de segurança
  
  // Processar linhas com filtro imediato
  for (let i = 1; i < lines.length && processedRows < maxRows; i++) {
    const line = lines[i];
    if (!line || line.trim().length === 0) continue;
    
    processedRows++;
    
    // Parse linha
    const values: string[] = [];
    current = '';
    inQuotes = false;
    
    for (let j = 0; j < line.length; j++) {
      const char = line[j];
      const nextChar = line[j + 1];
      
      if (char === '"') {
        if (inQuotes && nextChar === '"') {
          current += '"';
          j++;
        } else {
          inQuotes = !inQuotes;
        }
      } else if (char === ',' && !inQuotes) {
        values.push(current.trim());
        current = '';
      } else {
        current += char;
      }
    }
    values.push(current.trim());
    
    if (values.length < headerValues.length) continue;
    
    // Criar objeto
    const item: any = {};
    headerValues.forEach((header, idx) => {
      item[header] = values[idx] || '';
    });
    
    // Validar valor
    const valorStr = item['VALOR TOTAL'] || '';
    const valorTotal = parseFloat(valorStr.replace(/[^\d,-]/g, '').replace(',', '.') || '0');
    
    if (valorTotal <= 0) continue;
    
    // Criar item comercial
    const comercialItem: ComercialData = {
      situacao: item['SITUAÇÃO'] || '',
      valor_total: valorTotal,
      data_emissao: item['DATA EMISSÃO'],
      data_aprovacao: item['DATA APROVAÇÃO'],
      data_pedido: item['DATA PEDIDO'],
      data_perdido: item['DATA PERDIDO'],
      vendedor: item['VENDEDOR'],
      numero_orcamento: item['NÚMERO ORÇAMENTO'],
      cliente: item['CLIENTE'],
      temperatura: item['TEMPERATURA']
    };
    
    // FILTRAR IMEDIATAMENTE POR DATA
    const itemDate = getDateField(comercialItem);
    if (!itemDate) continue;
    
    if (itemDate >= startDate && itemDate <= endDate) {
      data.push(comercialItem);
      validRows++;
    }
    
    // Log de progresso a cada 5000 linhas
    if (processedRows % 5000 === 0) {
      console.log(`📊 Processadas ${processedRows} linhas, ${validRows} válidas no período`);
    }
  }
  
  console.log(`✅ Total processado: ${processedRows} linhas`);
  console.log(`✅ Dados do período: ${data.length} registros`);
  
  return data;
}

function calculateKPIs(data: ComercialData[]): EmailKPIs {
  const totalOrcamentos = data.length;
  const valorTotalOrcamentos = data.reduce((sum, item) => sum + item.valor_total, 0);
  const ticketMedio = totalOrcamentos > 0 ? valorTotalOrcamentos / totalOrcamentos : 0;
  
  const aprovados = data.filter(item => 
    item.situacao?.toLowerCase().includes('aprovado')
  );
  const valorAprovados = aprovados.reduce((sum, item) => sum + item.valor_total, 0);
  const taxaConversao = totalOrcamentos > 0 ? (aprovados.length / totalOrcamentos) * 100 : 0;
  
  const perdidos = data.filter(item => 
    item.situacao?.toLowerCase().includes('perdido')
  );
  const valorPerdidos = perdidos.reduce((sum, item) => sum + item.valor_total, 0);
  const taxaPerda = totalOrcamentos > 0 ? (perdidos.length / totalOrcamentos) * 100 : 0;
  
  return {
    totalOrcamentos,
    valorTotalOrcamentos,
    ticketMedio,
    aprovados: aprovados.length,
    valorAprovados,
    taxaConversao,
    totalPerdidos: perdidos.length,
    valorPerdidos,
    taxaPerda
  };
}

function formatCurrency(value: number): string {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL'
  }).format(value);
}

function generateReportHTML(
  kpis: EmailKPIs,
  monthName: string,
  year: number,
  metaMensal: number | null,
  periodo: string
): string {
  const realizadoMes = kpis.valorAprovados;
  const percentualMeta = metaMensal ? (realizadoMes / metaMensal) * 100 : 0;
  
  let statusMeta = '✗';
  let corMeta = '#f56565';
  if (percentualMeta >= 100) {
    statusMeta = '✓';
    corMeta = '#48bb78';
  } else if (percentualMeta >= 80) {
    statusMeta = '⚠';
    corMeta = '#ed8936';
  }
  
  const faltaMeta = metaMensal ? metaMensal - realizadoMes : 0;

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
          <h2 class="section-title no-border">📈 Resumo do Mês</h2>
          <div class="kpi-grid">
            <div class="kpi-card info">
              <div class="kpi-label">📋 ORÇAMENTOS</div>
              <div class="kpi-value">${kpis.totalOrcamentos}</div>
              <div class="kpi-subtitle">${formatCurrency(kpis.valorTotalOrcamentos)}</div>
            </div>
            <div class="kpi-card success">
              <div class="kpi-label">✅ APROVADOS</div>
              <div class="kpi-value">${kpis.aprovados}</div>
              <div class="kpi-subtitle">${formatCurrency(kpis.valorAprovados)}</div>
            </div>
            <div class="kpi-card warning">
              <div class="kpi-label">💰 TAXA CONVERSÃO</div>
              <div class="kpi-value">${kpis.taxaConversao.toFixed(1)}%</div>
              <div class="kpi-subtitle">Ticket: ${formatCurrency(kpis.ticketMedio)}</div>
            </div>
            <div class="kpi-card danger">
              <div class="kpi-label">❌ PERDIDOS</div>
              <div class="kpi-value">${kpis.totalPerdidos}</div>
              <div class="kpi-subtitle">${formatCurrency(kpis.valorPerdidos)}</div>
            </div>
          </div>

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

          <!-- Análise Rápida -->
          <div class="analysis" style="margin-top: 16px;">
            <h3 class="section-title no-border" style="color: #2d3748 !important;">💡 Análise do Período</h3>
            <p style="color: #4a5568 !important;">• Foram gerados <strong style="color: #2d3748 !important;">${kpis.totalOrcamentos}</strong> orçamentos no valor de ${formatCurrency(kpis.valorTotalOrcamentos)}</p>
            <p style="color: #4a5568 !important;">• <strong style="color: #2d3748 !important;">${kpis.aprovados}</strong> orçamentos foram aprovados (${kpis.taxaConversao.toFixed(1)}% de conversão)</p>
            <p style="color: #4a5568 !important;">• Valor total aprovado: <strong style="color: #2d3748 !important;">${formatCurrency(kpis.valorAprovados)}</strong></p>
            <p style="color: #4a5568 !important;">• Ticket médio dos orçamentos: <strong style="color: #2d3748 !important;">${formatCurrency(kpis.ticketMedio)}</strong></p>
            ${kpis.totalPerdidos > 0 ? `
            <p style="color: #4a5568 !important;">• <strong style="color: #2d3748 !important;">${kpis.totalPerdidos}</strong> oportunidades perdidas no valor de ${formatCurrency(kpis.valorPerdidos)}</p>
            ` : ''}
            ${metaMensal ? `
            <p style="color: #4a5568 !important;">• Atingimento da meta: <strong style="color: #2d3748 !important;">${percentualMeta.toFixed(1)}%</strong></p>
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

    // Validar entrada
    if (!month || !year || !recipients || recipients.length === 0) {
      throw new Error("Parâmetros inválidos");
    }

    // Calcular período completo do mês
    const startDate = new Date(year, month - 1, 1, 0, 0, 0);
    const endDate = new Date(year, month, 0, 23, 59, 59);

    console.log(`📊 Período: ${startDate.toLocaleDateString('pt-BR')} a ${endDate.toLocaleDateString('pt-BR')}`);

    // Carregar dados da planilha
    const data = await loadComercialDataFromSheet(startDate, endDate);

    if (data.length === 0) {
      console.log("⚠️ Nenhum dado encontrado para o período");
    }

    // Calcular KPIs
    const kpis = calculateKPIs(data);

    // Buscar meta mensal
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    const monthYear = `${year}-${month.toString().padStart(2, '0')}`;
    
    const { data: metaData } = await supabase
      .from('admin_goals')
      .select('monthly_revenue_goal')
      .eq('month_year', monthYear)
      .single();

    const metaMensal = metaData?.monthly_revenue_goal || null;

    // Gerar HTML
    const monthName = MONTH_NAMES[month - 1];
    const periodo = `${startDate.toLocaleDateString('pt-BR')} a ${endDate.toLocaleDateString('pt-BR')}`;
    const html = generateReportHTML(kpis, monthName, year, metaMensal, periodo);

    // Enviar para cada destinatário
    const results = [];
    for (const email of recipients) {
      try {
        const { data: emailData, error: emailError } = await resend.emails.send({
          from: "Global Aço <onboarding@resend.dev>",
          to: [email],
          subject: `📊 Relatório de Fechamento - ${monthName}/${year}`,
          html: html,
        });

        if (emailError) {
          console.error(`❌ Erro ao enviar para ${email}:`, emailError);
          results.push({ email, status: 'failed', error: emailError.message });
          
          // Log no banco
          await supabase.from('email_reports_log').insert({
            config_id: '00000000-0000-0000-0000-000000000000',
            email: email,
            report_date: endDate.toISOString().split('T')[0],
            report_type: 'monthly_closing',
            reference_month: monthYear,
            status: 'failed',
            error_message: emailError.message,
            is_scheduled: false
          });
        } else {
          console.log(`✅ Email enviado para ${email}`);
          results.push({ email, status: 'success' });
          
          // Log no banco
          await supabase.from('email_reports_log').insert({
            config_id: '00000000-0000-0000-0000-000000000000',
            email: email,
            report_date: endDate.toISOString().split('T')[0],
            report_type: 'monthly_closing',
            reference_month: monthYear,
            status: 'success',
            is_scheduled: false
          });
        }
      } catch (error: any) {
        console.error(`❌ Exceção ao enviar para ${email}:`, error);
        results.push({ email, status: 'failed', error: error.message });
      }
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        results,
        kpis,
        period: {
          month: monthName,
          year,
          startDate: startDate.toLocaleDateString('pt-BR'),
          endDate: endDate.toLocaleDateString('pt-BR')
        }
      }),
      { 
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200 
      }
    );

  } catch (error: any) {
    console.error("❌ Erro ao gerar relatório:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500 
      }
    );
  }
};

serve(handler);
