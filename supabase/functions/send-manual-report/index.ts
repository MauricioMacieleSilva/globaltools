import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const SHEET_ID = "13F5NcT8Z6quDcW4OmoG8MOhHCRT1W9nWXmNGX839MGo";
const GID = "2063157767";
const CSV_URL = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/export?format=csv&gid=${GID}`;

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface EmailKPIs {
  faturamento: number;
  orcamentos: number;
  pedidosNaoFaturados: number;
  perdidos: {
    valor: number;
    quantidade: number;
  };
}

function parseCSV(csvText: string): string[][] {
  const result: string[][] = [];
  let currentRow: string[] = [];
  let currentField = "";
  let inQuotes = false;
  let i = 0;

  while (i < csvText.length) {
    const char = csvText[i];
    const nextChar = csvText[i + 1];

    if (inQuotes) {
      if (char === '"') {
        if (nextChar === '"') {
          currentField += '"';
          i += 2;
          continue;
        } else {
          inQuotes = false;
        }
      } else {
        currentField += char;
      }
    } else {
      if (char === '"') {
        inQuotes = true;
      } else if (char === ",") {
        currentRow.push(currentField.trim());
        currentField = "";
      } else if (char === "\n" || (char === "\r" && nextChar === "\n")) {
        currentRow.push(currentField.trim());
        if (currentRow.length > 0 && currentRow.some((field) => field !== "")) {
          result.push(currentRow);
        }
        currentRow = [];
        currentField = "";
        if (char === "\r" && nextChar === "\n") {
          i++;
        }
      } else if (char === "\r") {
        currentRow.push(currentField.trim());
        if (currentRow.length > 0 && currentRow.some((field) => field !== "")) {
          result.push(currentRow);
        }
        currentRow = [];
        currentField = "";
      } else {
        currentField += char;
      }
    }
    i++;
  }

  if (currentField !== "" || currentRow.length > 0) {
    currentRow.push(currentField.trim());
    if (currentRow.length > 0 && currentRow.some((field) => field !== "")) {
      result.push(currentRow);
    }
  }

  return result;
}

function parseDate(dateStr: string): Date | null {
  if (!dateStr) return null;
  
  const parts = dateStr.split('/');
  if (parts.length === 3) {
    const day = parseInt(parts[0]);
    const month = parseInt(parts[1]) - 1;
    const year = parseInt(parts[2]);
    if (!isNaN(day) && !isNaN(month) && !isNaN(year)) {
      return new Date(year, month, day);
    }
  }
  
  return null;
}

function isDateInRange(dateStr: string, startDate: Date, endDate: Date): boolean {
  const date = parseDate(dateStr);
  if (!date) return false;
  return date >= startDate && date <= endDate;
}

async function fetchComercialKPIsFromSheet(startDate: Date, endDate: Date): Promise<EmailKPIs> {
  console.log(`📊 Buscando dados da planilha do período: ${startDate.toISOString()} a ${endDate.toISOString()}`);
  
  const kpis: EmailKPIs = {
    faturamento: 0,
    orcamentos: 0,
    pedidosNaoFaturados: 0,
    perdidos: {
      valor: 0,
      quantidade: 0
    }
  };

  try {
    const response = await fetch(CSV_URL);
    if (!response.ok) {
      console.error("Erro ao buscar CSV:", response.status);
      return kpis;
    }

    const csvText = await response.text();
    const rows = parseCSV(csvText);
    
    if (rows.length < 2) {
      console.log("CSV sem dados suficientes");
      return kpis;
    }

    for (let i = 1; i < rows.length; i++) {
      const row = rows[i];
      if (row.length < 31) continue;

      const situacao = (row[3] || "").trim();
      const data_emissao = row[4] || "";
      const data_perdido = row[35] || "";
      const valor = parseFloat((row[14] || "0").replace(",", ".")) || 0;
      const cli_nomefantasia = (row[29] || "").toUpperCase();

      if (cli_nomefantasia.includes("GLOBAL AÇO")) continue;
      if (valor <= 0) continue;

      if (situacao === "Emitida" && isDateInRange(data_emissao, startDate, endDate)) {
        kpis.faturamento += valor;
      }

      if (situacao === "Orçamento" && isDateInRange(data_emissao, startDate, endDate)) {
        kpis.orcamentos++;
      }

      if (situacao === "Pedido" || situacao === "Em produção") {
        kpis.pedidosNaoFaturados++;
      }

      if (situacao === "Perdido" && isDateInRange(data_perdido, startDate, endDate)) {
        kpis.perdidos.valor += valor;
        kpis.perdidos.quantidade++;
      }
    }

    console.log("✅ KPIs calculados:", JSON.stringify(kpis, null, 2));
    return kpis;

  } catch (error) {
    console.error("Erro ao processar planilha:", error);
    return kpis;
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

function generateEmptyStateHTML(periodo: string): string {
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <style>
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; margin: 0; padding: 20px; background-color: #f5f5f5; }
        .container { max-width: 700px; margin: 0 auto; background: white; border-radius: 12px; overflow: hidden; box-shadow: 0 2px 8px rgba(0,0,0,0.1); }
        .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; }
        .content { padding: 30px; }
        .empty-state { text-align: center; padding: 40px 20px; background: #f8f9fa; border-radius: 8px; margin: 20px 0; }
        .empty-state h2 { color: #495057; margin-bottom: 15px; }
        .empty-state p { color: #6c757d; line-height: 1.6; }
        .instructions { background: #e7f3ff; border-left: 4px solid #0066cc; padding: 20px; margin: 20px 0; border-radius: 4px; }
        .instructions h3 { margin-top: 0; color: #0066cc; }
        .instructions ul { padding-left: 20px; }
        .instructions li { margin: 8px 0; color: #495057; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1 style="margin: 0; font-size: 24px;">📊 Relatório Comercial Manual</h1>
          <p style="margin: 10px 0 0 0; opacity: 0.9;">${periodo}</p>
        </div>
        
        <div class="content">
          <div class="empty-state">
            <h2>📭 Sem Dados para o Período</h2>
            <p>Não há transações comerciais registradas para ${periodo}.</p>
          </div>

          <div class="instructions">
            <h3>📝 Para começar a receber relatórios com dados:</h3>
            <ul>
              <li>✅ Cadastre orçamentos no sistema</li>
              <li>✅ Registre pedidos de clientes</li>
              <li>✅ Acompanhe o funil de vendas no Dashboard Comercial</li>
            </ul>
            <p style="margin-top: 15px; color: #6c757d;">
              O sistema está pronto para gerar insights valiosos assim que houver dados comerciais no período selecionado.
            </p>
          </div>
        </div>
      </div>
    </body>
    </html>
  `;
}

function generateReportHTML(kpis: EmailKPIs, reportDate: string, periodo: string): string {
  const hasData = kpis.faturamento > 0 || kpis.orcamentos > 0 || kpis.pedidosNaoFaturados > 0 || kpis.perdidos.quantidade > 0;

  if (!hasData) {
    return generateEmptyStateHTML(periodo);
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
          <h2 class="section-title">📈 Resumo Executivo</h2>
          
          <div class="kpi-grid">
            <div class="kpi-card success">
              <div class="kpi-label">💰 Faturamento</div>
              <div class="kpi-value">${formatCurrency(kpis.faturamento)}</div>
            </div>
            
            <div class="kpi-card info">
              <div class="kpi-label">📋 Orçamentos Emitidos</div>
              <div class="kpi-value">${kpis.orcamentos}</div>
            </div>
            
            <div class="kpi-card warning">
              <div class="kpi-label">📦 Pedidos Não Faturados</div>
              <div class="kpi-value">${kpis.pedidosNaoFaturados}</div>
            </div>
            
            <div class="kpi-card danger">
              <div class="kpi-label">❌ Valor Perdido</div>
              <div class="kpi-value">${formatCurrency(kpis.perdidos.valor)}</div>
              <div class="kpi-subtitle">${kpis.perdidos.quantidade} oportunidade(s) perdida(s)</div>
            </div>
          </div>

          <div class="summary">
            <p>
              <strong>Resumo do Período:</strong> 
              Neste período, foram registrados ${formatCurrency(kpis.faturamento)} em faturamento, 
              com ${kpis.orcamentos} orçamento(s) emitido(s), 
              ${kpis.pedidosNaoFaturados} pedido(s) em aberto 
              e ${formatCurrency(kpis.perdidos.valor)} em oportunidades perdidas.
            </p>
          </div>
        </div>

        <div class="footer">
          <p>Este relatório é gerado automaticamente com base nos dados comerciais da planilha.</p>
          <p>Acesse o Dashboard Comercial para visualizar análises detalhadas.</p>
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

    const now = new Date();
    const startDate = new Date(now.getFullYear(), now.getMonth(), 1);
    const endDate = now;

    const reportDate = formatDate(now);
    const periodo = `${formatDate(startDate)} a ${formatDate(endDate)}`;

    const kpis = await fetchComercialKPIsFromSheet(startDate, endDate);

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

    console.log("📧 Payload do email:", JSON.stringify({ ...emailPayload, html: "[HTML Content]" }, null, 2));
    console.log("📧 Enviando email via Resend API...");

    const resendResponse = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${RESEND_API_KEY}`,
      },
      body: JSON.stringify(emailPayload),
    });

    const resendData = await resendResponse.json();
    console.log("📧 Resposta do Resend:", resendData);

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
