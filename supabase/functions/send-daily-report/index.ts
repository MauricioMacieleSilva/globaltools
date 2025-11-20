import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { Resend } from "https://esm.sh/resend@2.0.0";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));
const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface KPIData {
  faturamento: number;
  orcamentos: number;
  pedidos: number;
  perdidos: number;
  cancelamentos: number;
  devolucoes: number;
  taxaConversao: number;
  topClientes: Array<{ nome: string; valor: number }>;
  topProdutos: Array<{ nome: string; valor: number; quantidade: number }>;
  motivosPerdidos: Array<{ motivo: string; quantidade: number; valor: number }>;
  statusOrcamentos: Record<string, number>;
}

// Função para buscar KPIs reais do banco de dados
async function fetchRealKPIs(startDate: string, endDate: string): Promise<KPIData> {
  console.log(`📊 Buscando KPIs do período: ${startDate} a ${endDate}`);

  // 1. Faturamento (pedidos não cancelados)
  const { data: pedidosData, error: pedidosError } = await supabase
    .from('pedidos')
    .select('valor_total, cliente_id, data_pedido, clientes(nome)')
    .neq('status', 'cancelado')
    .gte('data_pedido', startDate)
    .lt('data_pedido', endDate);

  if (pedidosError) {
    console.error('Erro ao buscar pedidos:', pedidosError);
  }

  const faturamento = pedidosData?.reduce((sum, p) => sum + (p.valor_total || 0), 0) || 0;
  const numeroPedidos = pedidosData?.length || 0;

  // 2. Orçamentos do período
  const { data: orcamentosData, error: orcamentosError } = await supabase
    .from('orcamentos')
    .select('status, valor_final, cliente_id, clientes(nome), observacoes')
    .gte('data_emissao', startDate)
    .lt('data_emissao', endDate);

  if (orcamentosError) {
    console.error('Erro ao buscar orçamentos:', orcamentosError);
  }

  const numeroOrcamentos = orcamentosData?.length || 0;

  // Status de orçamentos
  const statusOrcamentos: Record<string, number> = {};
  orcamentosData?.forEach(orc => {
    statusOrcamentos[orc.status] = (statusOrcamentos[orc.status] || 0) + 1;
  });

  // 3. Orçamentos perdidos
  const orcamentosPerdidos = orcamentosData?.filter(o => o.status === 'perdido') || [];
  const valorPerdido = orcamentosPerdidos.reduce((sum, o) => sum + (o.valor_final || 0), 0);

  // 4. Cancelamentos
  const { data: cancelamentosData, error: cancelamentosError } = await supabase
    .from('cancelamentos')
    .select('valor, motivo')
    .gte('data_cancelamento', startDate)
    .lt('data_cancelamento', endDate);

  if (cancelamentosError) {
    console.error('Erro ao buscar cancelamentos:', cancelamentosError);
  }

  const valorCancelamentos = cancelamentosData?.reduce((sum, c) => sum + (c.valor || 0), 0) || 0;

  // 5. Devoluções
  const { data: devolucoesData, error: devolucoesError } = await supabase
    .from('devolucoes')
    .select('valor, motivo')
    .gte('data_devolucao', startDate)
    .lt('data_devolucao', endDate);

  if (devolucoesError) {
    console.error('Erro ao buscar devoluções:', devolucoesError);
  }

  const valorDevolucoes = devolucoesData?.reduce((sum, d) => sum + (d.valor || 0), 0) || 0;

  // 6. Top Clientes (baseado em pedidos faturados)
  const clienteMap = new Map<string, number>();
  pedidosData?.forEach(p => {
    const clienteNome = (p.clientes as any)?.nome || 'Cliente Desconhecido';
    clienteMap.set(clienteNome, (clienteMap.get(clienteNome) || 0) + (p.valor_total || 0));
  });

  const topClientes = Array.from(clienteMap.entries())
    .map(([nome, valor]) => ({ nome, valor }))
    .sort((a, b) => b.valor - a.valor)
    .slice(0, 5);

  // 7. Top Produtos (baseado em itens de pedidos)
  const { data: pedidoItensData } = await supabase
    .from('pedido_itens')
    .select('produto_nome, quantidade, preco_total, pedido_id, pedidos!inner(data_pedido, status)')
    .gte('pedidos.data_pedido', startDate)
    .lt('pedidos.data_pedido', endDate)
    .neq('pedidos.status', 'cancelado');

  const produtoMap = new Map<string, { valor: number; quantidade: number }>();
  pedidoItensData?.forEach(item => {
    const current = produtoMap.get(item.produto_nome) || { valor: 0, quantidade: 0 };
    produtoMap.set(item.produto_nome, {
      valor: current.valor + (item.preco_total || 0),
      quantidade: current.quantidade + (item.quantidade || 0)
    });
  });

  const topProdutos = Array.from(produtoMap.entries())
    .map(([nome, dados]) => ({ nome, valor: dados.valor, quantidade: dados.quantidade }))
    .sort((a, b) => b.valor - a.valor)
    .slice(0, 5);

  // 8. Motivos de Perdidos (baseado em observações de orçamentos perdidos)
  const motivosMap = new Map<string, { quantidade: number; valor: number }>();
  orcamentosPerdidos.forEach(orc => {
    const motivo = orc.observacoes || 'Não especificado';
    const current = motivosMap.get(motivo) || { quantidade: 0, valor: 0 };
    motivosMap.set(motivo, {
      quantidade: current.quantidade + 1,
      valor: current.valor + (orc.valor_final || 0)
    });
  });

  const motivosPerdidos = Array.from(motivosMap.entries())
    .map(([motivo, dados]) => ({ motivo, quantidade: dados.quantidade, valor: dados.valor }))
    .sort((a, b) => b.valor - a.valor)
    .slice(0, 5);

  // 9. Taxa de conversão
  const taxaConversao = numeroOrcamentos > 0 ? (numeroPedidos / numeroOrcamentos) * 100 : 0;

  console.log('✅ KPIs calculados:', {
    faturamento,
    numeroOrcamentos,
    numeroPedidos,
    valorPerdido,
    valorCancelamentos,
    valorDevolucoes,
    taxaConversao: taxaConversao.toFixed(2) + '%'
  });

  return {
    faturamento,
    orcamentos: numeroOrcamentos,
    pedidos: numeroPedidos,
    perdidos: valorPerdido,
    cancelamentos: valorCancelamentos,
    devolucoes: valorDevolucoes,
    taxaConversao,
    topClientes,
    topProdutos,
    motivosPerdidos,
    statusOrcamentos
  };
}

function formatCurrency(value: number): string {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL'
  }).format(value);
}

function generateReportHTML(kpis: KPIData, kpisPrevious: KPIData | null, config: any, reportDate: string): string {
  const hasData = kpis.faturamento > 0 || kpis.orcamentos > 0 || kpis.pedidos > 0;
  
  // Calcular variações
  const variacaoFaturamento = kpisPrevious && kpisPrevious.faturamento > 0
    ? ((kpis.faturamento - kpisPrevious.faturamento) / kpisPrevious.faturamento) * 100
    : 0;
  
  const variacaoOrcamentos = kpisPrevious && kpisPrevious.orcamentos > 0
    ? ((kpis.orcamentos - kpisPrevious.orcamentos) / kpisPrevious.orcamentos) * 100
    : 0;

  return `
    <!DOCTYPE html>
    <html lang="pt-BR">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Relatório Comercial Diário - ${reportDate}</title>
      <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f5f7fa; color: #333; line-height: 1.6; }
        .container { max-width: 800px; margin: 20px auto; background: white; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 20px rgba(0,0,0,0.1); }
        .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 40px 30px; text-align: center; }
        .header h1 { font-size: 28px; font-weight: 700; margin-bottom: 8px; }
        .header p { font-size: 16px; opacity: 0.9; }
        .content { padding: 30px; }
        .greeting { margin-bottom: 24px; font-size: 16px; }
        .section { margin-bottom: 30px; }
        .section h2 { color: #2d3748; font-size: 20px; margin-bottom: 16px; padding-bottom: 8px; border-bottom: 2px solid #e2e8f0; display: flex; align-items: center; gap: 8px; }
        .kpi-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); gap: 16px; margin-bottom: 24px; }
        .kpi-card { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 20px; text-align: center; transition: transform 0.2s; position: relative; }
        .kpi-card:hover { transform: translateY(-2px); box-shadow: 0 4px 12px rgba(0,0,0,0.1); }
        .kpi-card.positive { border-left: 4px solid #38a169; }
        .kpi-card.negative { border-left: 4px solid #e53e3e; }
        .kpi-card.neutral { border-left: 4px solid #3182ce; }
        .kpi-card.warning { border-left: 4px solid #ed8936; }
        .kpi-value { font-size: 24px; font-weight: bold; margin-bottom: 4px; color: #2d3748; }
        .kpi-label { font-size: 13px; color: #718096; text-transform: uppercase; letter-spacing: 0.5px; }
        .variation { position: absolute; top: 8px; right: 8px; font-size: 11px; font-weight: bold; padding: 2px 6px; border-radius: 4px; }
        .variation.up { background: #c6f6d5; color: #22543d; }
        .variation.down { background: #fed7d7; color: #c53030; }
        .table { width: 100%; border-collapse: collapse; margin-top: 16px; }
        .table th, .table td { padding: 12px; text-align: left; border-bottom: 1px solid #e2e8f0; }
        .table th { background-color: #f7fafc; font-weight: 600; color: #2d3748; font-size: 14px; }
        .table td { font-size: 14px; color: #4a5568; }
        .table tr:hover { background-color: #f7fafc; }
        .funnel-section { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 24px; border-radius: 8px; margin: 16px 0; }
        .funnel-item { display: flex; justify-content: space-between; align-items: center; padding: 10px 0; border-bottom: 1px solid rgba(255,255,255,0.2); }
        .funnel-item:last-child { border-bottom: none; }
        .funnel-item span { font-size: 15px; }
        .funnel-item strong { font-size: 18px; font-weight: 700; }
        .alert { background-color: #fed7d7; border-left: 4px solid #e53e3e; color: #c53030; padding: 16px; border-radius: 6px; margin: 16px 0; display: flex; align-items: center; gap: 12px; }
        .alert.info { background-color: #bee3f8; border-left-color: #3182ce; color: #2c5282; }
        .alert.success { background-color: #c6f6d5; border-left-color: #38a169; color: #22543d; }
        .alert.warning { background-color: #feebc8; border-left-color: #ed8936; color: #7c2d12; }
        .empty-state { text-align: center; padding: 40px 20px; color: #718096; }
        .footer { background-color: #2d3748; color: white; text-align: center; padding: 24px; font-size: 13px; }
        .footer p { margin: 4px 0; opacity: 0.9; }
        .progress-bar { width: 100%; height: 8px; background: #e2e8f0; border-radius: 4px; overflow: hidden; margin: 8px 0; }
        .progress-fill { height: 100%; background: linear-gradient(90deg, #38a169, #48bb78); transition: width 0.3s; }
        .comparison { background: #edf2f7; padding: 12px; border-radius: 6px; margin: 12px 0; font-size: 14px; }
        @media (max-width: 600px) {
          .container { margin: 10px; border-radius: 0; }
          .content { padding: 20px; }
          .kpi-grid { grid-template-columns: 1fr; }
          .header h1 { font-size: 22px; }
          .table { font-size: 12px; }
          .table th, .table td { padding: 8px; }
        }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>📊 Relatório Comercial Diário</h1>
          <p>Global Aço - ${reportDate}</p>
        </div>
        
        <div class="content">
          <div class="greeting">
            <p>Olá <strong>${config.full_name || config.email.split('@')[0]}</strong>,</p>
            <p>Aqui está o resumo comercial do dia anterior (D-1).</p>
          </div>

          ${!hasData ? `
            <div class="empty-state">
              <p style="font-size: 18px; margin-bottom: 8px;">📭</p>
              <p style="font-size: 16px; font-weight: 600; margin-bottom: 8px;">Nenhuma transação registrada</p>
              <p>Não há dados comerciais para o período selecionado.</p>
            </div>
          ` : `
            <!-- Resumo Executivo -->
            <div class="section">
              <h2>📊 Resumo Executivo</h2>
              ${kpisPrevious ? `
                <div class="comparison">
                  📈 Comparação com dia anterior: 
                  ${variacaoFaturamento > 0 ? `<strong style="color: #38a169;">+${variacaoFaturamento.toFixed(1)}%</strong>` : variacaoFaturamento < 0 ? `<strong style="color: #e53e3e;">${variacaoFaturamento.toFixed(1)}%</strong>` : '<strong>Sem variação</strong>'} no faturamento
                </div>
              ` : ''}
              <div class="kpi-grid">
                <div class="kpi-card positive">
                  ${kpisPrevious && variacaoFaturamento !== 0 ? `<span class="variation ${variacaoFaturamento > 0 ? 'up' : 'down'}">${variacaoFaturamento > 0 ? '↑' : '↓'} ${Math.abs(variacaoFaturamento).toFixed(1)}%</span>` : ''}
                  <div class="kpi-value">${formatCurrency(kpis.faturamento)}</div>
                  <div class="kpi-label">💰 Faturamento</div>
                </div>
                <div class="kpi-card neutral">
                  ${kpisPrevious && variacaoOrcamentos !== 0 ? `<span class="variation ${variacaoOrcamentos > 0 ? 'up' : 'down'}">${variacaoOrcamentos > 0 ? '↑' : '↓'} ${Math.abs(variacaoOrcamentos).toFixed(1)}%</span>` : ''}
                  <div class="kpi-value">${kpis.orcamentos}</div>
                  <div class="kpi-label">📋 Orçamentos</div>
                </div>
                <div class="kpi-card neutral">
                  <div class="kpi-value">${kpis.pedidos}</div>
                  <div class="kpi-label">📦 Pedidos</div>
                </div>
                <div class="kpi-card ${kpis.perdidos > 0 ? 'negative' : 'success'}">
                  <div class="kpi-value">${formatCurrency(kpis.perdidos)}</div>
                  <div class="kpi-label">❌ Perdidos</div>
                </div>
              </div>

              ${kpis.taxaConversao > 0 ? `
                <div class="alert info">
                  <span style="font-size: 24px;">📈</span>
                  <div>
                    <strong>Taxa de Conversão: ${kpis.taxaConversao.toFixed(1)}%</strong>
                    <div class="progress-bar">
                      <div class="progress-fill" style="width: ${Math.min(kpis.taxaConversao, 100)}%"></div>
                    </div>
                  </div>
                </div>
              ` : ''}
            </div>

            ${config.include_funil ? `
              <!-- Funil de Vendas -->
              <div class="section">
                <h2>🎯 Funil de Vendas</h2>
                <div class="funnel-section">
                  <div class="funnel-item">
                    <span>💼 Orçamentos Criados</span>
                    <strong>${kpis.orcamentos}</strong>
                  </div>
                  ${Object.entries(kpis.statusOrcamentos).map(([status, count]) => `
                    <div class="funnel-item">
                      <span>• ${status.charAt(0).toUpperCase() + status.slice(1)}</span>
                      <strong>${count}</strong>
                    </div>
                  `).join('')}
                  <div class="funnel-item">
                    <span>✅ Pedidos Confirmados</span>
                    <strong>${kpis.pedidos}</strong>
                  </div>
                  <div class="funnel-item">
                    <span>💰 Faturamento Total</span>
                    <strong>${formatCurrency(kpis.faturamento)}</strong>
                  </div>
                </div>
              </div>
            ` : ''}

            ${config.include_vendas && kpis.topClientes.length > 0 ? `
              <!-- Top Clientes -->
              <div class="section">
                <h2>🏆 Top 5 Clientes do Dia</h2>
                <table class="table">
                  <thead>
                    <tr>
                      <th>#</th>
                      <th>Cliente</th>
                      <th style="text-align: right;">Faturamento</th>
                    </tr>
                  </thead>
                  <tbody>
                    ${kpis.topClientes.map((cliente, idx) => `
                      <tr>
                        <td><strong>${idx + 1}</strong></td>
                        <td>${cliente.nome}</td>
                        <td style="text-align: right;"><strong>${formatCurrency(cliente.valor)}</strong></td>
                      </tr>
                    `).join('')}
                  </tbody>
                </table>
              </div>
            ` : ''}

            ${config.include_vendas && kpis.topProdutos.length > 0 ? `
              <!-- Top Produtos -->
              <div class="section">
                <h2>🔥 Top 5 Produtos do Dia</h2>
                <table class="table">
                  <thead>
                    <tr>
                      <th>#</th>
                      <th>Produto</th>
                      <th style="text-align: center;">Quantidade</th>
                      <th style="text-align: right;">Faturamento</th>
                    </tr>
                  </thead>
                  <tbody>
                    ${kpis.topProdutos.map((produto, idx) => `
                      <tr>
                        <td><strong>${idx + 1}</strong></td>
                        <td>${produto.nome}</td>
                        <td style="text-align: center;">${produto.quantidade.toFixed(0)}</td>
                        <td style="text-align: right;"><strong>${formatCurrency(produto.valor)}</strong></td>
                      </tr>
                    `).join('')}
                  </tbody>
                </table>
              </div>
            ` : ''}

            ${config.include_perdidos && kpis.perdidos > 0 ? `
              <!-- Análise de Perdidos -->
              <div class="section">
                <h2>📉 Análise de Perdidos</h2>
                <div class="alert warning">
                  <span style="font-size: 24px;">⚠️</span>
                  <div>
                    <strong>Total Perdido: ${formatCurrency(kpis.perdidos)}</strong>
                    <p style="margin: 4px 0 0 0; font-size: 13px;">Atenção aos principais motivos de perda abaixo</p>
                  </div>
                </div>
                ${kpis.motivosPerdidos.length > 0 ? `
                  <table class="table">
                    <thead>
                      <tr>
                        <th>Motivo</th>
                        <th style="text-align: center;">Quantidade</th>
                        <th style="text-align: right;">Valor</th>
                      </tr>
                    </thead>
                    <tbody>
                      ${kpis.motivosPerdidos.map(motivo => `
                        <tr>
                          <td>${motivo.motivo}</td>
                          <td style="text-align: center;">${motivo.quantidade}</td>
                          <td style="text-align: right;"><strong>${formatCurrency(motivo.valor)}</strong></td>
                        </tr>
                      `).join('')}
                    </tbody>
                  </table>
                ` : ''}
              </div>
            ` : ''}

            ${config.include_cancelamentos && (kpis.cancelamentos > 0 || kpis.devolucoes > 0) ? `
              <!-- Cancelamentos e Devoluções -->
              <div class="section">
                <h2>🚫 Cancelamentos e Devoluções</h2>
                <div class="kpi-grid">
                  <div class="kpi-card negative">
                    <div class="kpi-value">${formatCurrency(kpis.cancelamentos)}</div>
                    <div class="kpi-label">Cancelamentos</div>
                  </div>
                  <div class="kpi-card negative">
                    <div class="kpi-value">${formatCurrency(kpis.devolucoes)}</div>
                    <div class="kpi-label">Devoluções</div>
                  </div>
                </div>
                ${(kpis.cancelamentos + kpis.devolucoes) > 0 ? `
                  <div class="alert">
                    <span style="font-size: 24px;">⚠️</span>
                    <div>
                      <strong>Impacto Total: ${formatCurrency(kpis.cancelamentos + kpis.devolucoes)}</strong>
                      <p style="margin: 4px 0 0 0; font-size: 13px;">Acompanhe os motivos e tome ações preventivas</p>
                    </div>
                  </div>
                ` : ''}
              </div>
            ` : ''}

            ${kpis.perdidos === 0 && kpis.cancelamentos === 0 && kpis.devolucoes === 0 ? `
              <div class="alert success">
                <span style="font-size: 24px;">🎉</span>
                <div>
                  <strong>Excelente desempenho!</strong>
                  <p style="margin: 4px 0 0 0; font-size: 13px;">Sem perdas, cancelamentos ou devoluções no período</p>
                </div>
              </div>
            ` : ''}
          `}
        </div>
        
        <div class="footer">
          <p><strong>📧 Relatório gerado automaticamente</strong></p>
          <p>Sistema de Gestão Comercial - Global Aço</p>
          <p style="margin-top: 8px; font-size: 12px; opacity: 0.8;">
            Relatório diário automatizado - Dados referentes ao dia anterior (D-1)
          </p>
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

    // Buscar KPIs do dia anterior (D-1)
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const startDate = new Date(yesterday.getFullYear(), yesterday.getMonth(), yesterday.getDate()).toISOString();
    const endDate = new Date(yesterday.getFullYear(), yesterday.getMonth(), yesterday.getDate() + 1).toISOString();

    const kpis = await fetchRealKPIs(startDate, endDate);

    // Buscar KPIs do dia anterior ao anterior (D-2) para comparação
    const dayBeforeYesterday = new Date(yesterday);
    dayBeforeYesterday.setDate(dayBeforeYesterday.getDate() - 1);
    const startDatePrevious = new Date(dayBeforeYesterday.getFullYear(), dayBeforeYesterday.getMonth(), dayBeforeYesterday.getDate()).toISOString();
    const endDatePrevious = new Date(dayBeforeYesterday.getFullYear(), dayBeforeYesterday.getMonth(), dayBeforeYesterday.getDate() + 1).toISOString();

    let kpisPrevious: KPIData | null = null;
    try {
      kpisPrevious = await fetchRealKPIs(startDatePrevious, endDatePrevious);
    } catch (error) {
      console.log('Não foi possível buscar dados do dia anterior para comparação');
    }

    console.log('📊 KPIs do dia calculados:', {
      faturamento: kpis.faturamento,
      orcamentos: kpis.orcamentos,
      pedidos: kpis.pedidos,
      perdidos: kpis.perdidos
    });

    // Formatar data do relatório
    const reportDate = yesterday.toLocaleDateString('pt-BR', { 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    });

    // Enviar para cada destinatário
    const results = [];
    for (const config of configs) {
      try {
        console.log(`📧 Enviando relatório para ${config.email}...`);

        // Gerar HTML do relatório
        const reportHTML = generateReportHTML(kpis, kpisPrevious, config, reportDate);

        const isTestMode = true;
        const authorizedEmail = 'mauricio.maciel@globalaco.com.br';
        
        const emailResponse = await resend.emails.send({
          from: 'Lovable <onboarding@resend.dev>',
          to: isTestMode ? [authorizedEmail] : [config.email],
          subject: `📊 Relatório Comercial Diário - ${reportDate}${isTestMode ? ' [TESTE]' : ''}`,
          html: reportHTML,
        });

        // Registrar log de sucesso
        const actualRecipient = isTestMode ? authorizedEmail : config.email;
        await supabase.from('email_reports_log').insert({
          config_id: config.id,
          email: actualRecipient,
          report_date: yesterday.toISOString().split('T')[0],
          status: 'success',
          sent_at: new Date().toISOString()
        });

        results.push({ 
          email: config.email, 
          status: 'success', 
          id: emailResponse.data?.id, 
          test_mode: isTestMode, 
          sent_to: actualRecipient 
        });
        
        console.log(`✅ Relatório enviado com sucesso para ${actualRecipient}${isTestMode ? ' (modo teste - original: ' + config.email + ')' : ''}`);

      } catch (error: any) {
        console.error(`❌ Erro ao enviar para ${config.email}:`, error);

        // Registrar log de erro
        await supabase.from('email_reports_log').insert({
          config_id: config.id,
          email: config.email,
          report_date: yesterday.toISOString().split('T')[0],
          status: 'error',
          error_message: error.message,
          sent_at: new Date().toISOString()
        });

        results.push({ email: config.email, status: 'failed', error: error.message });
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: `Relatórios enviados: ${results.filter(r => r.status === 'success').length}/${configs.length}`,
        results
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );

  } catch (error: any) {
    console.error('❌ Erro na geração de relatório diário:', error);
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
