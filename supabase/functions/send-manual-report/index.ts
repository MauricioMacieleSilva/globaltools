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

async function fetchRealKPIs(startDate: string, endDate: string): Promise<KPIData> {
  console.log(`📊 Buscando KPIs do período: ${startDate} a ${endDate}`);

  const { data: pedidosData } = await supabase
    .from('pedidos')
    .select('valor_total, cliente_id, data_pedido, clientes(nome)')
    .neq('status', 'cancelado')
    .gte('data_pedido', startDate)
    .lt('data_pedido', endDate);

  const faturamento = pedidosData?.reduce((sum, p) => sum + (p.valor_total || 0), 0) || 0;
  const numeroPedidos = pedidosData?.length || 0;

  const { data: orcamentosData } = await supabase
    .from('orcamentos')
    .select('status, valor_final, cliente_id, observacoes, clientes(nome)')
    .gte('data_emissao', startDate)
    .lt('data_emissao', endDate);

  const numeroOrcamentos = orcamentosData?.length || 0;

  const statusOrcamentos: Record<string, number> = {};
  orcamentosData?.forEach(orc => {
    statusOrcamentos[orc.status] = (statusOrcamentos[orc.status] || 0) + 1;
  });

  const orcamentosPerdidos = orcamentosData?.filter(o => o.status === 'perdido') || [];
  const valorPerdido = orcamentosPerdidos.reduce((sum, o) => sum + (o.valor_final || 0), 0);

  const { data: cancelamentosData } = await supabase
    .from('cancelamentos')
    .select('valor, motivo')
    .gte('data_cancelamento', startDate)
    .lt('data_cancelamento', endDate);

  const valorCancelamentos = cancelamentosData?.reduce((sum, c) => sum + (c.valor || 0), 0) || 0;

  const { data: devolucoesData } = await supabase
    .from('devolucoes')
    .select('valor, motivo')
    .gte('data_devolucao', startDate)
    .lt('data_devolucao', endDate);

  const valorDevolucoes = devolucoesData?.reduce((sum, d) => sum + (d.valor || 0), 0) || 0;

  const clienteMap = new Map<string, number>();
  pedidosData?.forEach(p => {
    const clienteNome = (p.clientes as any)?.nome || 'Cliente Desconhecido';
    clienteMap.set(clienteNome, (clienteMap.get(clienteNome) || 0) + (p.valor_total || 0));
  });

  const topClientes = Array.from(clienteMap.entries())
    .map(([nome, valor]) => ({ nome, valor }))
    .sort((a, b) => b.valor - a.valor)
    .slice(0, 5);

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

  const taxaConversao = numeroOrcamentos > 0 ? (numeroPedidos / numeroOrcamentos) * 100 : 0;

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

function generateEmptyStateHTML(periodo: string): string {
  return `
    <div style="padding: 40px 20px; text-align: center; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; border-radius: 12px; margin: 20px 0;">
      <div style="font-size: 48px; margin-bottom: 16px;">📊</div>
      <h2 style="margin: 0 0 16px 0; font-size: 24px; font-weight: 600;">Nenhum Dado Registrado</h2>
      <p style="margin: 0 0 24px 0; font-size: 16px; opacity: 0.9;">
        Não há transações comerciais registradas para ${periodo}.
      </p>
      
      <div style="background: rgba(255,255,255,0.1); padding: 24px; border-radius: 8px; text-align: left; max-width: 500px; margin: 0 auto;">
        <h3 style="margin: 0 0 16px 0; font-size: 18px; font-weight: 600;">🚀 Para começar a receber relatórios:</h3>
        <ul style="margin: 0; padding-left: 20px; line-height: 1.8;">
          <li>✅ Cadastre orçamentos no sistema</li>
          <li>✅ Registre pedidos de clientes</li>
          <li>✅ Acompanhe o funil de vendas</li>
          <li>✅ Monitore cancelamentos e devoluções</li>
        </ul>
      </div>
      
      <p style="margin: 24px 0 0 0; font-size: 14px; opacity: 0.8;">
        O sistema está pronto para gerar insights valiosos assim que houver dados.
      </p>
    </div>
  `;
}

function generateReportHTML(kpis: KPIData, config: any, reportDate: string, isManual: boolean): string {
  const hasData = kpis.faturamento > 0 || kpis.orcamentos > 0 || kpis.pedidos > 0;
  const periodo = isManual ? 'hoje' : 'ontem';

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Relatório Comercial</title>
    </head>
    <body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f5f5f5;">
      <div style="max-width: 650px; margin: 0 auto; background-color: white; box-shadow: 0 0 20px rgba(0,0,0,0.1);">
        <!-- Header -->
        <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 40px 30px; text-align: center;">
          <div style="background: white; width: 60px; height: 60px; border-radius: 50%; margin: 0 auto 20px; display: flex; align-items: center; justify-content: center; font-size: 32px;">
            📊
          </div>
          <h1 style="margin: 0; color: white; font-size: 32px; font-weight: 700; letter-spacing: -0.5px;">
            Relatório Comercial
          </h1>
          <p style="margin: 12px 0 0 0; color: rgba(255,255,255,0.95); font-size: 16px;">
            ${reportDate}
          </p>
          <p style="margin: 4px 0 0 0; color: rgba(255,255,255,0.8); font-size: 13px;">
            ${isManual ? '📤 Enviado manualmente' : '⏰ Relatório automático'} • Período: ${periodo}
          </p>
        </div>

        <!-- Content -->
        <div style="padding: 40px 30px;">
          ${!hasData ? generateEmptyStateHTML(periodo) : `
          <!-- Executive Summary -->
          <div style="margin-bottom: 40px;">
            <h2 style="margin: 0 0 24px 0; font-size: 22px; font-weight: 600; color: #1a1a1a; border-bottom: 3px solid #667eea; padding-bottom: 12px;">
              💼 Resumo Executivo
            </h2>
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 16px; margin-bottom: 24px;">
              <!-- Faturamento Card -->
              <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 24px; border-radius: 12px; color: white; box-shadow: 0 4px 6px rgba(102, 126, 234, 0.3);">
                <div style="font-size: 13px; opacity: 0.9; margin-bottom: 8px; font-weight: 500;">💰 Faturamento</div>
                <div style="font-size: 28px; font-weight: 700; margin-bottom: 4px;">${formatCurrency(kpis.faturamento)}</div>
                <div style="font-size: 11px; opacity: 0.8;">Total do período</div>
              </div>
              
              <!-- Orçamentos Card -->
              <div style="background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%); padding: 24px; border-radius: 12px; color: white; box-shadow: 0 4px 6px rgba(240, 147, 251, 0.3);">
                <div style="font-size: 13px; opacity: 0.9; margin-bottom: 8px; font-weight: 500;">📋 Orçamentos</div>
                <div style="font-size: 28px; font-weight: 700; margin-bottom: 4px;">${kpis.orcamentos}</div>
                <div style="font-size: 11px; opacity: 0.8;">Emitidos ${periodo}</div>
              </div>
              
              <!-- Pedidos Card -->
              <div style="background: linear-gradient(135deg, #4facfe 0%, #00f2fe 100%); padding: 24px; border-radius: 12px; color: white; box-shadow: 0 4px 6px rgba(79, 172, 254, 0.3);">
                <div style="font-size: 13px; opacity: 0.9; margin-bottom: 8px; font-weight: 500;">📦 Pedidos</div>
                <div style="font-size: 28px; font-weight: 700; margin-bottom: 4px;">${kpis.pedidos}</div>
                <div style="font-size: 11px; opacity: 0.8;">Não faturados</div>
              </div>
              
              <!-- Perdidos Card -->
              <div style="background: linear-gradient(135deg, #fa709a 0%, #fee140 100%); padding: 24px; border-radius: 12px; color: white; box-shadow: 0 4px 6px rgba(250, 112, 154, 0.3);">
                <div style="font-size: 13px; opacity: 0.9; margin-bottom: 8px; font-weight: 500;">❌ Perdidos</div>
                <div style="font-size: 28px; font-weight: 700; margin-bottom: 4px;">${formatCurrency(kpis.perdidos)}</div>
                <div style="font-size: 11px; opacity: 0.8;">Valor perdido</div>
              </div>
            </div>
            
            <!-- Insights -->
            ${kpis.faturamento > 50000 ? `
            <div style="background: #d4edda; border-left: 4px solid #28a745; padding: 16px; border-radius: 6px; margin-bottom: 16px;">
              <strong style="color: #155724;">🎉 Excelente performance!</strong>
              <p style="margin: 4px 0 0 0; color: #155724; font-size: 14px;">Faturamento acima de R$ 50.000 no período.</p>
            </div>
            ` : ''}
            
            ${kpis.orcamentos > 0 && kpis.taxaConversao < 20 ? `
            <div style="background: #fff3cd; border-left: 4px solid #ffc107; padding: 16px; border-radius: 6px; margin-bottom: 16px;">
              <strong style="color: #856404;">⚠️ Atenção à conversão</strong>
              <p style="margin: 4px 0 0 0; color: #856404; font-size: 14px;">Taxa de conversão abaixo de 20%. Considere revisar follow-up dos orçamentos.</p>
            </div>
            ` : ''}
            
            ${kpis.taxaConversao > 0 ? `
            <div style="background: #f8f9fa; padding: 16px; border-radius: 8px; border: 1px solid #e9ecef;">
              <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
                <span style="font-size: 14px; font-weight: 600; color: #495057;">🎯 Taxa de Conversão</span>
                <span style="font-size: 18px; font-weight: 700; color: #667eea;">${kpis.taxaConversao.toFixed(1)}%</span>
              </div>
              <div style="width: 100%; height: 8px; background: #e9ecef; border-radius: 4px; overflow: hidden;">
                <div style="height: 100%; width: ${Math.min(kpis.taxaConversao, 100)}%; background: linear-gradient(90deg, #667eea, #764ba2);"></div>
              </div>
            </div>
            ` : ''}
          </div>

          ${config.include_vendas && kpis.topClientes.length > 0 ? `
          <!-- Top Clientes -->
          <div style="margin-bottom: 40px;">
            <h2 style="margin: 0 0 20px 0; font-size: 20px; font-weight: 600; color: #1a1a1a; border-bottom: 3px solid #667eea; padding-bottom: 12px;">
              🏆 Top 5 Clientes
            </h2>
            <table style="width: 100%; border-collapse: collapse;">
              <thead>
                <tr style="background: #f8f9fa;">
                  <th style="padding: 12px; text-align: left; font-size: 13px; color: #6c757d; font-weight: 600;">#</th>
                  <th style="padding: 12px; text-align: left; font-size: 13px; color: #6c757d; font-weight: 600;">Cliente</th>
                  <th style="padding: 12px; text-align: right; font-size: 13px; color: #6c757d; font-weight: 600;">Faturamento</th>
                </tr>
              </thead>
              <tbody>
                ${kpis.topClientes.map((cliente, idx) => `
                  <tr style="border-bottom: 1px solid #e9ecef;">
                    <td style="padding: 12px; font-weight: 700; color: #667eea;">${idx + 1}</td>
                    <td style="padding: 12px; color: #495057;">${cliente.nome}</td>
                    <td style="padding: 12px; text-align: right; font-weight: 600; color: #28a745;">${formatCurrency(cliente.valor)}</td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
          </div>
          ` : ''}

          ${config.include_vendas && kpis.topProdutos.length > 0 ? `
          <!-- Top Produtos -->
          <div style="margin-bottom: 40px;">
            <h2 style="margin: 0 0 20px 0; font-size: 20px; font-weight: 600; color: #1a1a1a; border-bottom: 3px solid #667eea; padding-bottom: 12px;">
              🔥 Top 5 Produtos
            </h2>
            <table style="width: 100%; border-collapse: collapse;">
              <thead>
                <tr style="background: #f8f9fa;">
                  <th style="padding: 12px; text-align: left; font-size: 13px; color: #6c757d; font-weight: 600;">#</th>
                  <th style="padding: 12px; text-align: left; font-size: 13px; color: #6c757d; font-weight: 600;">Produto</th>
                  <th style="padding: 12px; text-align: center; font-size: 13px; color: #6c757d; font-weight: 600;">Qtd</th>
                  <th style="padding: 12px; text-align: right; font-size: 13px; color: #6c757d; font-weight: 600;">Valor</th>
                </tr>
              </thead>
              <tbody>
                ${kpis.topProdutos.map((produto, idx) => `
                  <tr style="border-bottom: 1px solid #e9ecef;">
                    <td style="padding: 12px; font-weight: 700; color: #667eea;">${idx + 1}</td>
                    <td style="padding: 12px; color: #495057;">${produto.nome}</td>
                    <td style="padding: 12px; text-align: center; color: #6c757d;">${produto.quantidade.toFixed(0)}</td>
                    <td style="padding: 12px; text-align: right; font-weight: 600; color: #28a745;">${formatCurrency(produto.valor)}</td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
          </div>
          ` : ''}

          ${config.include_perdidos && kpis.motivosPerdidos.length > 0 ? `
          <!-- Análise de Perdidos -->
          <div style="margin-bottom: 40px;">
            <h2 style="margin: 0 0 20px 0; font-size: 20px; font-weight: 600; color: #1a1a1a; border-bottom: 3px solid #dc3545; padding-bottom: 12px;">
              ❌ Análise de Perdidos
            </h2>
            <div style="background: #fff3cd; border-left: 4px solid #ffc107; padding: 16px; border-radius: 6px; margin-bottom: 16px;">
              <strong style="color: #856404;">Total Perdido: ${formatCurrency(kpis.perdidos)}</strong>
            </div>
            <table style="width: 100%; border-collapse: collapse;">
              <thead>
                <tr style="background: #f8f9fa;">
                  <th style="padding: 12px; text-align: left; font-size: 13px; color: #6c757d; font-weight: 600;">Motivo</th>
                  <th style="padding: 12px; text-align: center; font-size: 13px; color: #6c757d; font-weight: 600;">Qtd</th>
                  <th style="padding: 12px; text-align: right; font-size: 13px; color: #6c757d; font-weight: 600;">Valor</th>
                </tr>
              </thead>
              <tbody>
                ${kpis.motivosPerdidos.map((motivo) => `
                  <tr style="border-bottom: 1px solid #e9ecef;">
                    <td style="padding: 12px; color: #495057;">${motivo.motivo}</td>
                    <td style="padding: 12px; text-align: center; color: #6c757d;">${motivo.quantidade}</td>
                    <td style="padding: 12px; text-align: right; font-weight: 600; color: #dc3545;">${formatCurrency(motivo.valor)}</td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
          </div>
          ` : ''}

          ${config.include_cancelamentos && (kpis.cancelamentos > 0 || kpis.devolucoes > 0) ? `
          <!-- Cancelamentos e Devoluções -->
          <div style="margin-bottom: 40px;">
            <h2 style="margin: 0 0 20px 0; font-size: 20px; font-weight: 600; color: #1a1a1a; border-bottom: 3px solid #ffc107; padding-bottom: 12px;">
              🔄 Cancelamentos e Devoluções
            </h2>
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 16px;">
              <div style="background: #fff3cd; padding: 20px; border-radius: 8px; border-left: 4px solid #ffc107;">
                <div style="font-size: 12px; color: #856404; margin-bottom: 8px; font-weight: 500;">Cancelamentos</div>
                <div style="font-size: 24px; font-weight: 700; color: #856404;">${formatCurrency(kpis.cancelamentos)}</div>
              </div>
              <div style="background: #f8d7da; padding: 20px; border-radius: 8px; border-left: 4px solid #dc3545;">
                <div style="font-size: 12px; color: #721c24; margin-bottom: 8px; font-weight: 500;">Devoluções</div>
                <div style="font-size: 24px; font-weight: 700; color: #721c24;">${formatCurrency(kpis.devolucoes)}</div>
              </div>
            </div>
          </div>
          ` : ''}
          `}
        </div>

        <!-- Footer -->
        <div style="background: #f8f9fa; padding: 24px 30px; text-align: center; border-top: 1px solid #e9ecef;">
          <p style="margin: 0 0 8px 0; color: #6c757d; font-size: 13px;">
            Este relatório foi gerado automaticamente pelo sistema Global Aço
          </p>
          <p style="margin: 0; color: #adb5bd; font-size: 12px;">
            © ${new Date().getFullYear()} Global Aço. Todos os direitos reservados.
          </p>
        </div>
      </div>
    </body>
    </html>
  `;
}

const handler = async (req: Request): Promise<Response> => {
  console.log('🚀 [send-manual-report] Função iniciada');

  if (req.method === 'OPTIONS') {
    console.log('📋 [send-manual-report] Respondendo OPTIONS');
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { configId } = await req.json();
    console.log(`📧 [send-manual-report] Processando envio para config: ${configId}`);

    if (!resendApiKey) {
      throw new Error('RESEND_API_KEY não configurada');
    }

    const { data: config, error: configError } = await supabase
      .from('email_reports_config')
      .select('*')
      .eq('id', configId)
      .single();

    if (configError || !config) {
      throw new Error('Configuração não encontrada');
    }

    // Período do dia atual (hoje)
    const now = new Date();
    const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const startDate = startOfDay.toISOString();
    const endDate = now.toISOString();

    console.log(`📊 Buscando KPIs do período: ${startDate} a ${endDate}`);

    const kpis = await fetchRealKPIs(startDate, endDate);

    console.log('✅ KPIs calculados:', {
      faturamento: kpis.faturamento,
      numeroOrcamentos: kpis.orcamentos,
      numeroPedidos: kpis.pedidos,
      valorPerdido: kpis.perdidos,
      valorCancelamentos: kpis.cancelamentos,
      valorDevolucoes: kpis.devolucoes,
      taxaConversao: kpis.taxaConversao.toFixed(2) + '%'
    });

    const reportDate = now.toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: 'long',
      year: 'numeric'
    });

    const htmlContent = generateReportHTML(kpis, config, reportDate, true);

    // Modo de teste: enviar para email autorizado
    const isTestMode = true;
    const authorizedTestEmail = 'mauricio.maciel@globalaco.com.br';
    const recipientEmail = isTestMode ? authorizedTestEmail : config.email;

    console.log('📧 Enviando email via Resend API...');

    const emailPayload = {
      from: "Lovable <onboarding@resend.dev>",
      to: [recipientEmail],
      subject: `📊 Relatório Comercial Manual - ${reportDate}${isTestMode ? ' [TESTE]' : ''}`,
      html: htmlContent,
      ...(isTestMode && { test: true })
    };

    console.log('📧 Payload do email:', { ...emailPayload, html: '[HTML Content]' });

    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${resendApiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(emailPayload)
    });

    const result = await response.json();

    if (!response.ok) {
      console.error('❌ Erro ao enviar email:', result);
      throw new Error(result.message || 'Erro ao enviar email');
    }

    console.log('📧 Resposta do Resend:', result);

    // Log de sucesso
    await supabase.from('email_reports_log').insert({
      config_id: configId,
      email: recipientEmail,
      status: 'success',
      report_date: startOfDay.toISOString().split('T')[0]
    });

    console.log(`✅ Relatório manual enviado com sucesso para ${recipientEmail}${isTestMode ? ' (modo teste)' : ''}`);

    return new Response(
      JSON.stringify({ success: true, message: 'Relatório enviado com sucesso', testMode: isTestMode }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: any) {
    console.error('❌ Erro ao enviar relatório:', error);
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
};

serve(handler);
