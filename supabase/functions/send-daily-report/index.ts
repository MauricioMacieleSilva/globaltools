import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { Resend } from "npm:resend@2.0.0";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));
const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface ComercialData {
  codigo: string;
  descricao: string;
  preco: number;
  unidade: string;
  classe: string;
  ipi: number;
  estado: string;
  vendedor: string;
  cliente: string;
  dataVenda: string;
  status: string;
  motivoPerdido?: string;
  valor: number;
  quantidade: number;
}

// Function to fetch commercial data from Google Sheets
async function fetchComercialData(): Promise<ComercialData[]> {
  const SHEET_URL = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vSj3eImBSaKk0Nzm7COvwJdKnLKKWz7HKWJKa7TKkJy3VJjQyU8HgCK6IhwOhFG8XzQrGFKK8k0Nzm7/pub?output=csv';
  
  try {
    const response = await fetch(SHEET_URL);
    const csvText = await response.text();
    
    if (!csvText || csvText.trim() === '') {
      return getMockData();
    }

    const lines = csvText.split('\n');
    if (lines.length < 2) {
      return getMockData();
    }

    const data: ComercialData[] = [];
    for (let i = 1; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line) continue;

      const columns = line.split(',');
      if (columns.length >= 12) {
        data.push({
          codigo: columns[0] || '',
          descricao: columns[1] || '',
          preco: parseFloat(columns[2]) || 0,
          unidade: columns[3] || '',
          classe: columns[4] || '',
          ipi: parseFloat(columns[5]) || 0,
          estado: columns[6] || '',
          vendedor: columns[7] || '',
          cliente: columns[8] || '',
          dataVenda: columns[9] || '',
          status: columns[10] || '',
          motivoPerdido: columns[11] || undefined,
          valor: parseFloat(columns[12]) || 0,
          quantidade: parseFloat(columns[13]) || 1
        });
      }
    }
    
    return data.length > 0 ? data : getMockData();
  } catch (error) {
    console.error('Error fetching Google Sheets data:', error);
    return getMockData();
  }
}

function getMockData(): ComercialData[] {
  return [
    { codigo: "001", descricao: "Perfil U 100x50x3", preco: 25.50, unidade: "MT", classe: "PERFIS", ipi: 5, estado: "SP", vendedor: "João Silva", cliente: "Construtora ABC", dataVenda: "2024-01-15", status: "faturado", valor: 1275, quantidade: 50 },
    { codigo: "002", descricao: "Chapa Lisa 3mm", preco: 45.80, unidade: "M²", classe: "CHAPAS", ipi: 5, estado: "RJ", vendedor: "Maria Santos", cliente: "Metalúrgica XYZ", dataVenda: "2024-01-16", status: "pedido", valor: 4580, quantidade: 100 },
    { codigo: "003", descricao: "Tubo Quadrado 40x40x2", preco: 18.90, unidade: "MT", classe: "TUBOS", ipi: 5, estado: "MG", vendedor: "Pedro Costa", cliente: "Serralheria 123", dataVenda: "2024-01-17", status: "orcamento", valor: 945, quantidade: 50 }
  ];
}

function calculateKPIs(data: ComercialData[]) {
  const now = new Date();
  const currentMonth = now.getMonth();
  const currentYear = now.getFullYear();
  
  const currentMonthData = data.filter(item => {
    const itemDate = new Date(item.dataVenda);
    return itemDate.getMonth() === currentMonth && itemDate.getFullYear() === currentYear;
  });

  const faturamento = currentMonthData
    .filter(item => item.status === 'faturado')
    .reduce((acc, item) => acc + item.valor, 0);

  const orcamentos = currentMonthData
    .filter(item => item.status === 'orcamento')
    .reduce((acc, item) => acc + item.valor, 0);

  const pedidos = currentMonthData
    .filter(item => item.status === 'pedido')
    .reduce((acc, item) => acc + item.valor, 0);

  const perdidos = currentMonthData
    .filter(item => item.status === 'perdido')
    .reduce((acc, item) => acc + item.valor, 0);

  const cancelamentos = currentMonthData
    .filter(item => item.status === 'cancelado')
    .reduce((acc, item) => acc + item.valor, 0);

  // Top clientes
  const clienteMap = new Map<string, number>();
  currentMonthData.forEach(item => {
    if (item.status === 'faturado') {
      clienteMap.set(item.cliente, (clienteMap.get(item.cliente) || 0) + item.valor);
    }
  });
  
  const topClientes = Array.from(clienteMap.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5);

  // Top produtos
  const produtoMap = new Map<string, number>();
  currentMonthData.forEach(item => {
    if (item.status === 'faturado') {
      produtoMap.set(item.descricao, (produtoMap.get(item.descricao) || 0) + item.valor);
    }
  });
  
  const topProdutos = Array.from(produtoMap.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5);

  // Motivos de perdidos
  const motivoMap = new Map<string, { count: number, valor: number }>();
  currentMonthData.forEach(item => {
    if (item.status === 'perdido' && item.motivoPerdido) {
      const current = motivoMap.get(item.motivoPerdido) || { count: 0, valor: 0 };
      motivoMap.set(item.motivoPerdido, {
        count: current.count + 1,
        valor: current.valor + item.valor
      });
    }
  });

  const motivosPerdidos = Array.from(motivoMap.entries())
    .sort((a, b) => b[1].valor - a[1].valor)
    .slice(0, 5);

  return {
    faturamento,
    orcamentos,
    pedidos,
    perdidos,
    cancelamentos,
    topClientes,
    topProdutos,
    motivosPerdidos,
    totalItens: currentMonthData.length
  };
}

function formatCurrency(value: number): string {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL'
  }).format(value);
}

function generateReportHTML(kpis: any): string {
  const today = new Date().toLocaleDateString('pt-BR', { 
    year: 'numeric', 
    month: 'long', 
    day: 'numeric' 
  });

  return `
<!DOCTYPE html>
<html lang="pt-BR">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Relatório Comercial Diário</title>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f5f7fa; color: #333; line-height: 1.6; }
        .container { max-width: 800px; margin: 0 auto; background: white; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 20px rgba(0,0,0,0.1); }
        .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 40px 30px; text-align: center; }
        .header h1 { font-size: 28px; font-weight: 700; margin-bottom: 8px; }
        .header p { font-size: 16px; opacity: 0.9; }
        .content { padding: 30px; }
        .section { margin-bottom: 30px; }
        .section h2 { color: #2d3748; font-size: 20px; margin-bottom: 16px; padding-bottom: 8px; border-bottom: 2px solid #e2e8f0; }
        .kpi-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 16px; margin-bottom: 24px; }
        .kpi-card { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 20px; text-align: center; }
        .kpi-card.positive { border-left: 4px solid #38a169; }
        .kpi-card.negative { border-left: 4px solid #e53e3e; }
        .kpi-card.neutral { border-left: 4px solid #3182ce; }
        .kpi-value { font-size: 24px; font-weight: bold; margin-bottom: 4px; }
        .kpi-label { font-size: 14px; color: #718096; text-transform: uppercase; letter-spacing: 0.5px; }
        .table { width: 100%; border-collapse: collapse; margin-top: 16px; }
        .table th, .table td { padding: 12px; text-align: left; border-bottom: 1px solid #e2e8f0; }
        .table th { background-color: #f7fafc; font-weight: 600; color: #2d3748; }
        .table tr:hover { background-color: #f7fafc; }
        .funnel-section { background: linear-gradient(45deg, #f093fb 0%, #f5576c 100%); color: white; padding: 20px; border-radius: 8px; margin: 16px 0; }
        .funnel-item { display: flex; justify-content: space-between; align-items: center; padding: 8px 0; }
        .footer { background-color: #2d3748; color: white; text-align: center; padding: 20px; font-size: 14px; }
        .alert { background-color: #fed7d7; border: 1px solid #feb2b2; color: #c53030; padding: 12px; border-radius: 6px; margin: 12px 0; }
        @media (max-width: 600px) {
            .container { margin: 10px; }
            .content { padding: 20px; }
            .kpi-grid { grid-template-columns: 1fr; }
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>🏢 Relatório Comercial Diário</h1>
            <p>Global Aço - ${today}</p>
        </div>
        
        <div class="content">
            <!-- Resumo Executivo -->
            <div class="section">
                <h2>📊 Resumo Executivo</h2>
                <div class="kpi-grid">
                    <div class="kpi-card positive">
                        <div class="kpi-value">${formatCurrency(kpis.faturamento)}</div>
                        <div class="kpi-label">Faturamento</div>
                    </div>
                    <div class="kpi-card neutral">
                        <div class="kpi-value">${formatCurrency(kpis.pedidos)}</div>
                        <div class="kpi-label">Em Produção</div>
                    </div>
                    <div class="kpi-card neutral">
                        <div class="kpi-value">${formatCurrency(kpis.orcamentos)}</div>
                        <div class="kpi-label">Pipeline</div>
                    </div>
                    <div class="kpi-card negative">
                        <div class="kpi-value">${formatCurrency(kpis.perdidos)}</div>
                        <div class="kpi-label">Perdidos</div>
                    </div>
                </div>
            </div>

            <!-- Funil de Vendas -->
            <div class="section">
                <h2>🎯 Funil de Vendas</h2>
                <div class="funnel-section">
                    <div class="funnel-item">
                        <span>💼 Orçamentos:</span>
                        <strong>${formatCurrency(kpis.orcamentos)}</strong>
                    </div>
                    <div class="funnel-item">
                        <span>🔄 Pedidos:</span>
                        <strong>${formatCurrency(kpis.pedidos)}</strong>
                    </div>
                    <div class="funnel-item">
                        <span>✅ Faturados:</span>
                        <strong>${formatCurrency(kpis.faturamento)}</strong>
                    </div>
                    <div class="funnel-item">
                        <span>📈 Taxa de Conversão:</span>
                        <strong>${kpis.orcamentos > 0 ? ((kpis.faturamento / kpis.orcamentos) * 100).toFixed(1) : 0}%</strong>
                    </div>
                </div>
            </div>

            <!-- Top Clientes -->
            <div class="section">
                <h2>🏆 Top 5 Clientes</h2>
                <table class="table">
                    <thead>
                        <tr>
                            <th>Cliente</th>
                            <th>Faturamento</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${kpis.topClientes.map(([cliente, valor]: [string, number]) => `
                            <tr>
                                <td>${cliente}</td>
                                <td>${formatCurrency(valor)}</td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
            </div>

            <!-- Top Produtos -->
            <div class="section">
                <h2>🔥 Top 5 Produtos</h2>
                <table class="table">
                    <thead>
                        <tr>
                            <th>Produto</th>
                            <th>Faturamento</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${kpis.topProdutos.map(([produto, valor]: [string, number]) => `
                            <tr>
                                <td>${produto}</td>
                                <td>${formatCurrency(valor)}</td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
            </div>

            <!-- Análise de Perdidos -->
            <div class="section">
                <h2>❌ Análise de Perdidos</h2>
                ${kpis.perdidos > 0 ? `
                    <div class="alert">
                        ⚠️ Atenção: ${formatCurrency(kpis.perdidos)} em negócios perdidos este mês
                    </div>
                    <table class="table">
                        <thead>
                            <tr>
                                <th>Motivo</th>
                                <th>Quantidade</th>
                                <th>Valor</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${kpis.motivosPerdidos.map(([motivo, dados]: [string, any]) => `
                                <tr>
                                    <td>${motivo}</td>
                                    <td>${dados.count}</td>
                                    <td>${formatCurrency(dados.valor)}</td>
                                </tr>
                            `).join('')}
                        </tbody>
                    </table>
                ` : '<p style="color: #38a169; font-weight: bold;">🎉 Excelente! Nenhum negócio perdido este mês.</p>'}
            </div>

            <!-- Cancelamentos -->
            ${kpis.cancelamentos > 0 ? `
                <div class="section">
                    <h2>🚫 Cancelamentos e Devoluções</h2>
                    <div class="alert">
                        ⚠️ ${formatCurrency(kpis.cancelamentos)} em cancelamentos/devoluções este mês
                    </div>
                </div>
            ` : ''}
        </div>

        <div class="footer">
            <p>📧 Relatório gerado automaticamente pelo Sistema Global Aço</p>
            <p>Para dúvidas ou sugestões, contate o administrador do sistema</p>
        </div>
    </div>
</body>
</html>`;
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('🚀 Iniciando geração de relatório diário...');

    // Buscar configurações ativas
    const { data: configs, error: configError } = await supabase
      .from('email_reports_config')
      .select('*')
      .eq('is_active', true)
      .eq('frequency', 'daily');

    if (configError) {
      console.error('Erro ao buscar configurações:', configError);
      throw configError;
    }

    if (!configs || configs.length === 0) {
      console.log('ℹ️ Nenhuma configuração ativa encontrada');
      return new Response(JSON.stringify({ message: 'Nenhuma configuração ativa' }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    console.log(`📋 Encontradas ${configs.length} configurações ativas`);

    // Buscar dados comerciais
    const comercialData = await fetchComercialData();
    const kpis = calculateKPIs(comercialData);

    console.log('📊 KPIs calculados:', {
      faturamento: kpis.faturamento,
      orcamentos: kpis.orcamentos,
      pedidos: kpis.pedidos,
      perdidos: kpis.perdidos
    });

    // Gerar HTML do relatório
    const reportHTML = generateReportHTML(kpis);

    // Enviar para cada destinatário
    const results = [];
    for (const config of configs) {
      try {
        console.log(`📧 Enviando relatório para ${config.email}...`);

        const emailResponse = await resend.emails.send({
          from: 'Global Aço <relatorios@globalaco.com.br>',
          to: [config.email],
          subject: `📊 Relatório Comercial Diário - ${new Date().toLocaleDateString('pt-BR')}`,
          html: reportHTML,
        });

        // Registrar log de sucesso
        await supabase.from('email_reports_log').insert({
          config_id: config.id,
          recipient_email: config.email,
          email_subject: `📊 Relatório Comercial Diário - ${new Date().toLocaleDateString('pt-BR')}`,
          status: 'success',
          report_data: { kpis, total_configs: configs.length }
        });

        results.push({ email: config.email, status: 'success', id: emailResponse.data?.id });
        console.log(`✅ Relatório enviado com sucesso para ${config.email}`);

      } catch (error) {
        console.error(`❌ Erro ao enviar para ${config.email}:`, error);

        // Registrar log de erro
        await supabase.from('email_reports_log').insert({
          config_id: config.id,
          recipient_email: config.email,
          email_subject: `📊 Relatório Comercial Diário - ${new Date().toLocaleDateString('pt-BR')}`,
          status: 'error',
          error_message: error.message
        });

        results.push({ email: config.email, status: 'failed', error: error.message });
      }
    }

    console.log('🎉 Processo de envio concluído');

    return new Response(JSON.stringify({ 
      message: 'Relatório processado com sucesso',
      results,
      totalConfigs: configs.length,
      kpis
    }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('💥 Erro geral na edge function:', error);
    return new Response(JSON.stringify({ 
      error: 'Erro interno do servidor',
      details: error.message 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
};

serve(handler);