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
function parseCSV(text: string): string[][] {
  const lines = text.split('\n');
  return lines.map(line => {
    const values: string[] = [];
    let current = '';
    let inQuotes = false;
    
    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      const nextChar = line[i + 1];
      
      if (char === '"') {
        if (inQuotes && nextChar === '"') {
          current += '"';
          i++;
        } else {
          inQuotes = !inQuotes;
        }
      } else if (char === ',' && !inQuotes) {
        values.push(current);
        current = '';
      } else {
        current += char;
      }
    }
    values.push(current);
    return values;
  });
}

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
  
  console.log(`📊 Carregando dados do mês completo (${startDate.toLocaleDateString('pt-BR')} a ${endDate.toLocaleDateString('pt-BR')})...`);
  
  const response = await fetch(url);
  const csvText = await response.text();
  const rows = parseCSV(csvText);
  
  if (rows.length < 2) return [];
  
  const headers = rows[0];
  const data: ComercialData[] = [];
  
  for (let i = 1; i < rows.length; i++) {
    const row = rows[i];
    if (!row || row.length < headers.length) continue;
    
    const item: any = {};
    headers.forEach((header, idx) => {
      item[header.trim()] = row[idx]?.trim() || '';
    });
    
    const valorTotal = parseFloat(item['VALOR TOTAL']?.replace(/[^\d,-]/g, '').replace(',', '.') || '0');
    if (valorTotal <= 0) continue;
    
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
    
    const itemDate = getDateField(comercialItem);
    if (itemDate && itemDate >= startDate && itemDate <= endDate) {
      data.push(comercialItem);
    }
  }
  
  console.log(`✅ ${data.length} registros carregados do período`);
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
  metaMensal: number | null
): string {
  const realizadoMes = kpis.valorAprovados;
  const percentualMeta = metaMensal ? (realizadoMes / metaMensal) * 100 : 0;
  const statusMeta = percentualMeta >= 100 ? '🎉' : percentualMeta >= 80 ? '📈' : '⚠️';

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Relatório de Fechamento - ${monthName}/${year}</title>
    </head>
    <body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f5f5f5;">
      <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f5f5f5;">
        <tr>
          <td align="center" style="padding: 40px 20px;">
            <table width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
              
              <!-- Header -->
              <tr>
                <td style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 40px 30px; border-radius: 8px 8px 0 0; text-align: center;">
                  <h1 style="margin: 0; color: #ffffff; font-size: 28px; font-weight: 700;">
                    📊 Relatório de Fechamento
                  </h1>
                  <p style="margin: 10px 0 0 0; color: #e0e7ff; font-size: 18px;">
                    ${monthName}/${year}
                  </p>
                </td>
              </tr>

              <!-- Resumo Meta -->
              ${metaMensal ? `
              <tr>
                <td style="padding: 30px;">
                  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f8f9fa; border-radius: 8px; padding: 20px;">
                    <tr>
                      <td style="text-align: center;">
                        <div style="font-size: 48px; margin-bottom: 10px;">${statusMeta}</div>
                        <h2 style="margin: 0 0 10px 0; color: #1f2937; font-size: 20px;">Meta do Mês</h2>
                        <p style="margin: 5px 0; color: #6b7280; font-size: 14px;">
                          <strong>Meta:</strong> ${formatCurrency(metaMensal)}
                        </p>
                        <p style="margin: 5px 0; color: #6b7280; font-size: 14px;">
                          <strong>Realizado:</strong> ${formatCurrency(realizadoMes)}
                        </p>
                        <div style="margin-top: 15px; padding: 12px; background-color: ${percentualMeta >= 100 ? '#dcfce7' : percentualMeta >= 80 ? '#fef3c7' : '#fee2e2'}; border-radius: 6px;">
                          <strong style="font-size: 24px; color: ${percentualMeta >= 100 ? '#166534' : percentualMeta >= 80 ? '#92400e' : '#991b1b'};">
                            ${percentualMeta.toFixed(1)}%
                          </strong>
                          <span style="color: #6b7280; font-size: 14px;"> da meta atingida</span>
                        </div>
                      </td>
                    </tr>
                  </table>
                </td>
              </tr>
              ` : ''}

              <!-- KPIs Grid -->
              <tr>
                <td style="padding: 0 30px 30px 30px;">
                  <table width="100%" cellpadding="0" cellspacing="0">
                    <tr>
                      <td width="50%" style="padding-right: 10px;">
                        <div style="background-color: #eff6ff; border-left: 4px solid #3b82f6; padding: 20px; border-radius: 6px;">
                          <div style="color: #1e40af; font-size: 14px; font-weight: 600; margin-bottom: 8px;">ORÇAMENTOS</div>
                          <div style="color: #1f2937; font-size: 28px; font-weight: 700;">${kpis.totalOrcamentos}</div>
                          <div style="color: #6b7280; font-size: 12px; margin-top: 5px;">${formatCurrency(kpis.valorTotalOrcamentos)}</div>
                        </div>
                      </td>
                      <td width="50%" style="padding-left: 10px;">
                        <div style="background-color: #f0fdf4; border-left: 4px solid #10b981; padding: 20px; border-radius: 6px;">
                          <div style="color: #065f46; font-size: 14px; font-weight: 600; margin-bottom: 8px;">APROVADOS</div>
                          <div style="color: #1f2937; font-size: 28px; font-weight: 700;">${kpis.aprovados}</div>
                          <div style="color: #6b7280; font-size: 12px; margin-top: 5px;">${formatCurrency(kpis.valorAprovados)}</div>
                        </div>
                      </td>
                    </tr>
                    <tr><td colspan="2" style="height: 20px;"></td></tr>
                    <tr>
                      <td width="50%" style="padding-right: 10px;">
                        <div style="background-color: #fef3c7; border-left: 4px solid #f59e0b; padding: 20px; border-radius: 6px;">
                          <div style="color: #92400e; font-size: 14px; font-weight: 600; margin-bottom: 8px;">TAXA CONVERSÃO</div>
                          <div style="color: #1f2937; font-size: 28px; font-weight: 700;">${kpis.taxaConversao.toFixed(1)}%</div>
                          <div style="color: #6b7280; font-size: 12px; margin-top: 5px;">Ticket: ${formatCurrency(kpis.ticketMedio)}</div>
                        </div>
                      </td>
                      <td width="50%" style="padding-left: 10px;">
                        <div style="background-color: #fee2e2; border-left: 4px solid #ef4444; padding: 20px; border-radius: 6px;">
                          <div style="color: #991b1b; font-size: 14px; font-weight: 600; margin-bottom: 8px;">PERDIDOS</div>
                          <div style="color: #1f2937; font-size: 28px; font-weight: 700;">${kpis.totalPerdidos}</div>
                          <div style="color: #6b7280; font-size: 12px; margin-top: 5px;">${formatCurrency(kpis.valorPerdidos)}</div>
                        </div>
                      </td>
                    </tr>
                  </table>
                </td>
              </tr>

              <!-- CTA -->
              <tr>
                <td style="padding: 0 30px 40px 30px; text-align: center;">
                  <a href="${supabaseUrl.replace('https://', 'https://').replace('.supabase.co', '')}" 
                     style="display: inline-block; padding: 14px 32px; background-color: #667eea; color: #2d3748 !important; text-decoration: none; border-radius: 6px; font-weight: 600; font-size: 16px;">
                    Acessar Dashboard Completo
                  </a>
                </td>
              </tr>

              <!-- Footer -->
              <tr>
                <td style="padding: 20px 30px; background-color: #f9fafb; border-radius: 0 0 8px 8px; text-align: center;">
                  <p style="margin: 0; color: #6b7280; font-size: 12px;">
                    Relatório gerado automaticamente • ${new Date().toLocaleDateString('pt-BR')}
                  </p>
                </td>
              </tr>

            </table>
          </td>
        </tr>
      </table>
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
    const html = generateReportHTML(kpis, monthName, year, metaMensal);

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
