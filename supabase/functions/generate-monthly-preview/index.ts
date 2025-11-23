import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

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
      if (format.source.startsWith('^(\d{4})')) {
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
  
  console.log(`📊 Carregando dados para preview...`);
  console.log(`📅 Período: ${startDate.toLocaleDateString('pt-BR')} a ${endDate.toLocaleDateString('pt-BR')}`);
  
  // Adicionar timeout agressivo
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 15000); // 15 segundos
  
  try {
    const response = await fetch(url, { signal: controller.signal });
    
    if (!response.ok) {
      throw new Error(`Erro ao buscar planilha: ${response.status}`);
    }
    
    const csvText = await response.text();
    const lines = csvText.split('\n');
    
    if (lines.length < 2) {
      console.log("⚠️ Planilha vazia ou sem dados");
      return [];
    }
    
    // Parse header apenas
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
    const maxRows = 10000; // Limite muito mais baixo para preview
    
    // Processar apenas linhas necessárias
    for (let i = 1; i < Math.min(lines.length, maxRows) && validRows < 500; i++) {
      const line = lines[i];
      if (!line || line.trim().length === 0) continue;
      
      processedRows++;
      
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
      
      const item: any = {};
      headerValues.forEach((header, idx) => {
        item[header] = values[idx] || '';
      });
      
      const valorStr = item['VALOR TOTAL'] || '';
      const valorTotal = parseFloat(valorStr.replace(/[^\d,-]/g, '').replace(',', '.') || '0');
      
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
      if (!itemDate) continue;
      
      if (itemDate >= startDate && itemDate <= endDate) {
        data.push(comercialItem);
        validRows++;
      }
      
      // Early exit se encontramos dados suficientes
      if (validRows >= 500) {
        console.log(`✅ Preview: limite de 500 registros atingido (amostra)`);
        break;
      }
    }
    
    console.log(`✅ Preview: ${data.length} registros encontrados`);
    return data;
    
  } finally {
    clearTimeout(timeoutId);
  }
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

function generateReportHTML(kpis: EmailKPIs, monthName: string, year: number, periodo: string, metaMensal?: number): string {
  const percentualMeta = metaMensal ? (kpis.valorAprovados / metaMensal) * 100 : 0;
  
  return `
    <!DOCTYPE html>
    <html lang="pt-BR">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Relatório de Fechamento - ${monthName}/${year}</title>
      <style>
        body {
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
          line-height: 1.6;
          color: #2d3748;
          background-color: #f7fafc;
          margin: 0;
          padding: 0;
        }
        .container {
          max-width: 700px;
          margin: 40px auto;
          background: white;
          border-radius: 16px;
          overflow: hidden;
          box-shadow: 0 10px 30px rgba(0, 0, 0, 0.1);
        }
        .header {
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          color: white;
          padding: 48px 32px;
          text-align: center;
        }
        .header-icon {
          font-size: 64px;
          margin-bottom: 16px;
        }
        .header h1 {
          margin: 0;
          font-size: 32px;
          font-weight: 700;
        }
        .header-subtitle {
          margin: 8px 0 0 0;
          font-size: 18px;
          opacity: 0.95;
        }
        .header-period {
          margin: 4px 0 0 0;
          font-size: 14px;
          opacity: 0.85;
        }
        .content {
          padding: 40px 32px;
        }
        .section-title {
          font-size: 20px;
          font-weight: 700;
          color: #2d3748;
          margin: 0 0 24px 0;
          padding-bottom: 12px;
          border-bottom: 3px solid #e2e8f0;
          display: flex;
          align-items: center;
          gap: 8px;
        }
        .section-title.no-border {
          border-bottom: none;
          padding-bottom: 0;
        }
        .kpis-grid {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 16px;
          margin-bottom: 32px;
        }
        .kpi-card {
          background: #f7fafc;
          border-radius: 12px;
          padding: 20px;
          border-left: 4px solid #667eea;
        }
        .kpi-card.success {
          border-left-color: #48bb78;
        }
        .kpi-card.warning {
          border-left-color: #ed8936;
        }
        .kpi-card.danger {
          border-left-color: #f56565;
        }
        .kpi-label {
          font-size: 13px;
          color: #718096;
          margin-bottom: 8px;
          text-transform: uppercase;
          letter-spacing: 0.5px;
          font-weight: 600;
        }
        .kpi-value {
          font-size: 28px;
          font-weight: 700;
          color: #2d3748;
          margin: 0;
        }
        .kpi-subvalue {
          font-size: 14px;
          color: #718096;
          margin-top: 4px;
        }
        .analysis {
          background: #f7fafc;
          border-radius: 12px;
          padding: 24px;
          margin-top: 24px;
        }
        .analysis p {
          margin: 12px 0;
          font-size: 15px;
          color: #4a5568;
        }
        .cta-section {
          padding: 32px;
          background: #f7fafc;
          text-align: center;
          margin-top: 32px;
        }
        .cta-button {
          display: inline-block;
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          color: white;
          padding: 16px 32px;
          text-decoration: none;
          border-radius: 8px;
          font-weight: 600;
          font-size: 16px;
          transition: transform 0.2s;
        }
        .cta-button:hover {
          transform: translateY(-2px);
        }
        .footer {
          padding: 24px 32px;
          text-align: center;
          color: #718096;
          font-size: 13px;
          border-top: 1px solid #e2e8f0;
        }
        .footer p {
          margin: 4px 0;
        }
        @media (max-width: 600px) {
          .kpis-grid {
            grid-template-columns: 1fr;
          }
          .container {
            margin: 20px;
          }
          .header {
            padding: 32px 20px;
          }
          .content {
            padding: 24px 20px;
          }
        }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <div class="header-icon">📊</div>
          <h1>Relatório de Fechamento</h1>
          <p class="header-subtitle">${monthName}/${year}</p>
          <p class="header-period">Período: ${periodo}</p>
        </div>

        <div class="content">
          <!-- Resumo do Mês -->
          <h2 class="section-title">📈 Resumo do Mês</h2>
          
          <div class="kpis-grid">
            <div class="kpi-card">
              <div class="kpi-label">📋 ORÇAMENTOS</div>
              <div class="kpi-value">${kpis.totalOrcamentos}</div>
              <div class="kpi-subvalue">${formatCurrency(kpis.valorTotalOrcamentos)}</div>
            </div>

            <div class="kpi-card success">
              <div class="kpi-label">✅ APROVADOS</div>
              <div class="kpi-value">${kpis.aprovados}</div>
              <div class="kpi-subvalue">${formatCurrency(kpis.valorAprovados)}</div>
            </div>

            <div class="kpi-card warning">
              <div class="kpi-label">🎯 TAXA CONVERSÃO</div>
              <div class="kpi-value">${kpis.taxaConversao.toFixed(1)}%</div>
              <div class="kpi-subvalue">Ticket: ${formatCurrency(kpis.ticketMedio)}</div>
            </div>

            ${kpis.totalPerdidos > 0 ? `
            <div class="kpi-card danger">
              <div class="kpi-label">❌ PERDIDOS</div>
              <div class="kpi-value">${kpis.totalPerdidos}</div>
              <div class="kpi-subvalue">${formatCurrency(kpis.valorPerdidos)}</div>
            </div>
            ` : ''}
          </div>

          ${metaMensal ? `
          <div class="kpis-grid">
            <div class="kpi-card ${percentualMeta >= 100 ? 'success' : percentualMeta >= 70 ? 'warning' : 'danger'}">
              <div class="kpi-label">🎯 META MENSAL</div>
              <div class="kpi-value">${percentualMeta.toFixed(1)}%</div>
              <div class="kpi-subvalue">Meta: ${formatCurrency(metaMensal)}</div>
            </div>
          </div>
          ` : ''}

          <!-- Análise Rápida -->
          <div class="analysis">
            <h3 class="section-title no-border">💡 Análise do Período</h3>
            <p>• Foram gerados <strong>${kpis.totalOrcamentos}</strong> orçamentos no valor de ${formatCurrency(kpis.valorTotalOrcamentos)}</p>
            <p>• <strong>${kpis.aprovados}</strong> orçamentos foram aprovados (${kpis.taxaConversao.toFixed(1)}% de conversão)</p>
            <p>• Valor total aprovado: <strong>${formatCurrency(kpis.valorAprovados)}</strong></p>
            <p>• Ticket médio dos orçamentos: <strong>${formatCurrency(kpis.ticketMedio)}</strong></p>
            ${kpis.totalPerdidos > 0 ? `
            <p>• <strong>${kpis.totalPerdidos}</strong> oportunidades perdidas no valor de ${formatCurrency(kpis.valorPerdidos)}</p>
            ` : ''}
            ${metaMensal ? `
            <p>• Atingimento da meta: <strong>${percentualMeta.toFixed(1)}%</strong> (${formatCurrency(kpis.valorAprovados)} de ${formatCurrency(metaMensal)})</p>
            ` : ''}
          </div>
        </div>

        <div class="cta-section">
          <a href="https://globaltools.lovable.app" class="cta-button">
            🚀 Acessar Dashboard Completo
          </a>
        </div>

        <div class="footer">
          <p>Relatório de fechamento gerado automaticamente • ${new Date().toLocaleDateString('pt-BR')}</p>
          <p>Acesse o Dashboard para visualizar análises detalhadas.</p>
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
    const { month, year } = await req.json();

    console.log(`📊 Gerando preview para ${month}/${year}`);

    if (!month || !year) {
      throw new Error("Parâmetros inválidos");
    }

    // Calcular período completo do mês
    const startDate = new Date(year, month - 1, 1, 0, 0, 0);
    const endDate = new Date(year, month, 0, 23, 59, 59);
    const periodo = `${startDate.toLocaleDateString('pt-BR')} a ${endDate.toLocaleDateString('pt-BR')}`;

    console.log(`📅 Período: ${periodo}`);

    // Carregar dados da planilha
    const data = await loadComercialDataFromSheet(startDate, endDate);

    // Calcular KPIs
    const kpis = calculateKPIs(data);

    // Buscar meta mensal do Supabase
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    const monthYear = `${year}-${String(month).padStart(2, '0')}`;
    
    const { data: metaData } = await supabase
      .from('admin_goals')
      .select('monthly_revenue_goal')
      .eq('month_year', monthYear)
      .single();

    const metaMensal = metaData?.monthly_revenue_goal || undefined;

    // Gerar HTML
    const monthName = MONTH_NAMES[month - 1];
    const html = generateReportHTML(kpis, monthName, year, periodo, metaMensal);

    return new Response(
      JSON.stringify({ 
        success: true,
        html,
        kpis,
        metaMensal,
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
    console.error("❌ Erro ao gerar preview:", error);
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
