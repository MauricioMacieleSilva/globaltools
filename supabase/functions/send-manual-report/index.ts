import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.52.1';

const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const resendApiKey = Deno.env.get('RESEND_API_KEY')!;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
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
    .select('status, valor_final, cliente_id, observacoes, clientes(nome)')
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

function generateReportHTML(kpis: KPIData, config: any, reportDate: string, isManual: boolean): string {
  const hasData = kpis.faturamento > 0 || kpis.orcamentos > 0 || kpis.pedidos > 0;

  return `
    <!DOCTYPE html>
    <html lang="pt-BR">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Relatório Comercial - ${reportDate}</title>
      <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f5f7fa; color: #333; line-height: 1.6; }
        .container { max-width: 800px; margin: 20px auto; background: white; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 20px rgba(0,0,0,0.1); }
        .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 40px 30px; text-align: center; }
        .header h1 { font-size: 28px; font-weight: 700; margin-bottom: 8px; }
        .header p { font-size: 16px; opacity: 0.9; }
        .manual-badge { background: #fbbf24; color: #92400e; padding: 4px 12px; border-radius: 20px; font-size: 12px; font-weight: bold; display: inline-block; margin-top: 8px; }
        .content { padding: 30px; }
        .greeting { margin-bottom: 24px; font-size: 16px; }
        .section { margin-bottom: 30px; }
        .section h2 { color: #2d3748; font-size: 20px; margin-bottom: 16px; padding-bottom: 8px; border-bottom: 2px solid #e2e8f0; display: flex; align-items: center; gap: 8px; }
        .kpi-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); gap: 16px; margin-bottom: 24px; }
        .kpi-card { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 20px; text-align: center; transition: transform 0.2s; }
        .kpi-card:hover { transform: translateY(-2px); box-shadow: 0 4px 12px rgba(0,0,0,0.1); }
        .kpi-card.positive { border-left: 4px solid #38a169; }
        .kpi-card.negative { border-left: 4px solid #e53e3e; }
        .kpi-card.neutral { border-left: 4px solid #3182ce; }
        .kpi-card.warning { border-left: 4px solid #ed8936; }
        .kpi-value { font-size: 24px; font-weight: bold; margin-bottom: 4px; color: #2d3748; }
        .kpi-label { font-size: 13px; color: #718096; text-transform: uppercase; letter-spacing: 0.5px; }
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
        .empty-state svg { width: 64px; height: 64px; margin-bottom: 16px; opacity: 0.5; }
        .footer { background-color: #2d3748; color: white; text-align: center; padding: 24px; font-size: 13px; }
        .footer p { margin: 4px 0; opacity: 0.9; }
        .progress-bar { width: 100%; height: 8px; background: #e2e8f0; border-radius: 4px; overflow: hidden; margin: 8px 0; }
        .progress-fill { height: 100%; background: linear-gradient(90deg, #38a169, #48bb78); transition: width 0.3s; }
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
          <h1>📊 Relatório Comercial ${isManual ? 'Manual' : 'Diário'}</h1>
          <p>Global Aço - ${reportDate}</p>
          ${isManual ? '<span class="manual-badge">ENVIO MANUAL</span>' : ''}
        </div>
        
        <div class="content">
          <div class="greeting">
            <p>Olá <strong>${config.full_name || config.email.split('@')[0]}</strong>,</p>
            <p>${isManual ? 'Aqui está o relatório comercial solicitado.' : 'Aqui está seu resumo comercial do período.'}</p>
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
              <div class="kpi-grid">
                <div class="kpi-card positive">
                  <div class="kpi-value">${formatCurrency(kpis.faturamento)}</div>
                  <div class="kpi-label">💰 Faturamento</div>
                </div>
                <div class="kpi-card neutral">
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
                <h2>🏆 Top 5 Clientes</h2>
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
                <h2>🔥 Top 5 Produtos</h2>
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
            ${isManual ? 'Envio manual solicitado através do painel administrativo' : 'Relatório diário automatizado'}
          </p>
        </div>
      </div>
    </body>
    </html>
  `;
}

serve(async (req) => {
  console.log('🚀 [send-manual-report] Função iniciada');

  if (req.method === 'OPTIONS') {
    console.log('📋 [send-manual-report] Respondendo OPTIONS');
    return new Response(null, { headers: corsHeaders });
  }

  try {
    if (!resendApiKey) {
      console.error('❌ RESEND_API_KEY não configurada');
      return new Response(
        JSON.stringify({ error: 'Serviço de email não configurado' }),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    const { configId } = await req.json();
    console.log(`📧 [send-manual-report] Processando envio para config: ${configId}`);

    if (!configId) {
      console.error('❌ ID da configuração não fornecido');
      return new Response(
        JSON.stringify({ error: 'ID da configuração é obrigatório' }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    // Buscar a configuração específica
    const { data: config, error: configError } = await supabase
      .from('email_reports_config')
      .select('*')
      .eq('id', configId)
      .eq('is_active', true)
      .single();

    if (configError || !config) {
      console.error('❌ Configuração não encontrada:', configError);
      return new Response(
        JSON.stringify({ error: 'Configuração não encontrada ou inativa' }),
        { 
          status: 404, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    console.log(`📧 Enviando relatório manual para ${config.email}`);

    // Buscar KPIs reais do dia atual (00:00 até agora)
    const today = new Date();
    const startDate = new Date(today.getFullYear(), today.getMonth(), today.getDate()).toISOString();
    const endDate = new Date().toISOString();

    const kpis = await fetchRealKPIs(startDate, endDate);

    // Gerar HTML do relatório
    const reportDate = today.toLocaleDateString('pt-BR', { 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    });
    const emailHtml = generateReportHTML(kpis, config, reportDate, true);

    // Enviar email
    console.log('📧 Enviando email via Resend API...');
    
    const isTestMode = true;
    const authorizedTestEmail = 'mauricio.maciel@globalaco.com.br';
    
    const emailPayload = {
      from: isTestMode ? 'Lovable <onboarding@resend.dev>' : 'Global Aço <relatorios@globalaco.com.br>',
      to: isTestMode ? [authorizedTestEmail] : [config.email],
      subject: `📊 Relatório Comercial Manual - ${reportDate}${isTestMode ? ' [TESTE]' : ''}`,
      html: emailHtml,
    };

    console.log('📧 Payload do email:', {
      from: emailPayload.from,
      to: emailPayload.to,
      subject: emailPayload.subject,
      isTestMode
    });

    const emailResponse = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${resendApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(emailPayload),
    });

    const emailResult = await emailResponse.json();
    console.log('📧 Resposta do Resend:', JSON.stringify(emailResult));

    if (!emailResponse.ok) {
      console.error('❌ Erro do Resend:', emailResult);
      throw new Error(`Falha no envio: ${emailResult.error || emailResult.message || 'Erro desconhecido'}`);
    }

    const actualRecipient = isTestMode ? authorizedTestEmail : config.email;
    console.log(`✅ Relatório manual enviado com sucesso para ${actualRecipient}${isTestMode ? ' (modo teste)' : ''}`);

    // Registrar log de sucesso
    await supabase.from('email_reports_log').insert({
      config_id: config.id,
      email: actualRecipient,
      report_date: new Date().toISOString().split('T')[0],
      status: 'success',
      sent_at: new Date().toISOString()
    });

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'Relatório enviado com sucesso',
        emailId: emailResult.id 
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );

  } catch (error: any) {
    console.error('❌ Erro no envio manual do relatório:', error);

    return new Response(
      JSON.stringify({ 
        error: 'Erro interno do servidor',
        details: error.message 
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});
