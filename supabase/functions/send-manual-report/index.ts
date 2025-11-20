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

serve(async (req) => {
  console.log('🚀 [send-manual-report] Função iniciada');

  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    console.log('📋 [send-manual-report] Respondendo OPTIONS');
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Verificar se a chave API está configurada
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

    // Calcular KPIs (dados fictícios para demonstração)
    const kpis = {
      faturamento: 15000,
      orcamentos: 25,
      pedidos: 12,
      perdidos: 3
    };

    // Gerar HTML do relatório
    const reportDate = new Date().toLocaleDateString('pt-BR');
    const emailHtml = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Relatório Comercial - ${reportDate}</title>
        <style>
          body { font-family: Arial, sans-serif; margin: 0; padding: 20px; background-color: #f5f5f5; }
          .container { max-width: 800px; margin: 0 auto; background: white; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }
          .header { background: linear-gradient(135deg, #1e40af, #3b82f6); color: white; padding: 20px; text-align: center; }
          .content { padding: 20px; }
          .kpi-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); gap: 15px; margin: 20px 0; }
          .kpi-card { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 6px; padding: 15px; text-align: center; }
          .kpi-value { font-size: 24px; font-weight: bold; color: #1e40af; margin-bottom: 5px; }
          .kpi-label { font-size: 14px; color: #64748b; }
          .section { margin: 20px 0; padding: 15px; background: #fafafa; border-radius: 6px; }
          .footer { background: #f1f5f9; padding: 15px; text-align: center; color: #64748b; font-size: 12px; }
          .manual-badge { background: #fbbf24; color: #92400e; padding: 4px 8px; border-radius: 4px; font-size: 12px; font-weight: bold; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>📊 Relatório Comercial</h1>
            <p>${reportDate} - <span class="manual-badge">ENVIO MANUAL</span></p>
          </div>
          
          <div class="content">
            <p>Olá <strong>${config.full_name || config.email.split('@')[0]}</strong>,</p>
            <p>Aqui está seu relatório comercial solicitado manualmente:</p>
            
            <div class="kpi-grid">
              <div class="kpi-card">
                <div class="kpi-value">R$ ${kpis.faturamento.toLocaleString('pt-BR')}</div>
                <div class="kpi-label">Faturamento</div>
              </div>
              <div class="kpi-card">
                <div class="kpi-value">${kpis.orcamentos}</div>
                <div class="kpi-label">Orçamentos</div>
              </div>
              <div class="kpi-card">
                <div class="kpi-value">${kpis.pedidos}</div>
                <div class="kpi-label">Pedidos</div>
              </div>
              <div class="kpi-card">
                <div class="kpi-value">${kpis.perdidos}</div>
                <div class="kpi-label">Perdidos</div>
              </div>
            </div>

            ${config.include_vendas ? '<div class="section"><h3>📈 Análise de Vendas</h3><p>Dados de vendas do período com crescimento de 15% em relação ao mês anterior.</p></div>' : ''}
            ${config.include_funil ? '<div class="section"><h3>🔄 Funil de Conversão</h3><p>Taxa de conversão de 48% nos orçamentos enviados.</p></div>' : ''}
            ${config.include_perdidos ? '<div class="section"><h3>📉 Pedidos Perdidos</h3><p>Análise de 3 oportunidades perdidas, principalmente por preço.</p></div>' : ''}
            ${config.include_cancelamentos ? '<div class="section"><h3>❌ Cancelamentos</h3><p>Baixo índice de cancelamentos, mantendo qualidade do serviço.</p></div>' : ''}
          </div>
          
          <div class="footer">
            <p>Relatório gerado automaticamente pelo sistema Global Aço</p>
            <p>Este é um envio manual solicitado através do painel administrativo</p>
          </div>
        </div>
      </body>
      </html>
    `;

    // Enviar email via fetch diretamente para o Resend
    console.log('📧 Enviando email via Resend API...');
    
    // No modo de teste do Resend, só podemos enviar para o email autorizado
    // ou para emails de domínios verificados
    const isTestMode = true; // Temporário até configurar domínio próprio
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
      
      // Tratamento específico para erro 403 de domínio não verificado
      if (emailResponse.status === 403) {
        if (emailResult.error?.includes('verify a domain')) {
          throw new Error('Para enviar emails para outros destinatários, você precisa verificar um domínio no Resend. Acesse: https://resend.com/domains');
        } else if (emailResult.error?.includes('testing emails')) {
          throw new Error('No modo de teste, só é possível enviar para o email autorizado. Configure um domínio verificado no Resend.');
        }
      }
      
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