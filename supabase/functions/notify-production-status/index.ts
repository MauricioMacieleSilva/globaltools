import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

interface NotifyRequest {
  numero_pedido: string;
  tipo: 'op_concluida' | 'pedido_finalizado';
  numero_op?: string;
  // Order details passed from frontend
  cliente: string;
  prazo: string;
  novo_prazo?: string;
  situacao_producao?: string;
  peso_total: string;
  percentual_concluido: number;
  ops: Array<{
    numero_op: string;
    situacao_op: string;
    peso: string;
    materiais: Array<{
      descricaomat: string;
      observacao: string;
      quantidade: number;
      unidade: string;
    }>;
  }>;
}

function formatDate(dateStr: string): string {
  if (!dateStr) return 'Não informado';
  try {
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) return dateStr;
    return date.toLocaleDateString('pt-BR');
  } catch {
    return dateStr;
  }
}

function generateOpHTML(op: NotifyRequest['ops'][0], isHighlighted: boolean): string {
  const situacaoNorm = (op.situacao_op || '').toUpperCase();
  const isConcluido = situacaoNorm.includes('FINALIZADA') || situacaoNorm.includes('CONCLUIDO') || situacaoNorm.includes('CONCLUÍDO');
  
  const statusColor = isConcluido ? '#48bb78' : situacaoNorm.includes('PROGRAMACAO') ? '#4299e1' : '#ed8936';
  const statusLabel = isConcluido ? 'CONCLUÍDO' : situacaoNorm || 'A PROGRAMAR';
  const bgColor = isHighlighted ? '#f0fff4' : '#ffffff';
  const borderColor = isHighlighted ? '#48bb78' : '#e2e8f0';
  
  const materiaisHTML = op.materiais.map(mat => `
    <tr>
      <td style="padding: 8px 12px; border-bottom: 1px solid #edf2f7; font-size: 13px; color: #1e40af; font-weight: 500;">${mat.descricaomat}</td>
      <td style="padding: 8px 12px; border-bottom: 1px solid #edf2f7; font-size: 13px; color: #4a5568;">${mat.observacao || '-'}</td>
      <td style="padding: 8px 12px; border-bottom: 1px solid #edf2f7; font-size: 13px; color: #2d3748; text-align: right;">${mat.quantidade.toLocaleString('pt-BR')} ${mat.unidade}</td>
    </tr>
  `).join('');

  return `
    <div style="background: ${bgColor}; border: 2px solid ${borderColor}; border-radius: 8px; padding: 16px; margin-bottom: 12px;">
      <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px;">
        <div>
          <span style="font-weight: 600; font-size: 15px; color: #2d3748;">OP ${op.numero_op}</span>
          <span style="display: inline-block; margin-left: 12px; padding: 3px 10px; border-radius: 12px; font-size: 12px; font-weight: 600; color: white; background: ${statusColor};">${statusLabel}</span>
          
        </div>
        <span style="font-size: 13px; color: #718096;">Peso: ${op.peso}</span>
      </div>
      <table style="width: 100%; border-collapse: collapse; background: white; border-radius: 6px; overflow: hidden;">
        <thead>
          <tr style="background: #f7fafc;">
            <th style="padding: 8px 12px; text-align: left; font-size: 11px; text-transform: uppercase; color: #718096; font-weight: 600;">Material</th>
            <th style="padding: 8px 12px; text-align: left; font-size: 11px; text-transform: uppercase; color: #718096; font-weight: 600;">Descrição</th>
            <th style="padding: 8px 12px; text-align: right; font-size: 11px; text-transform: uppercase; color: #718096; font-weight: 600;">Quantidade</th>
          </tr>
        </thead>
        <tbody>
          ${materiaisHTML}
        </tbody>
      </table>
    </div>
  `;
}

function generateNotificationHTML(data: NotifyRequest): string {
  const isPedidoFinalizado = data.tipo === 'pedido_finalizado';
  const titulo = isPedidoFinalizado 
    ? `🎉 Pedido ${data.numero_pedido} Finalizado!`
    : `✅ OP ${data.numero_op} Concluída - Pedido ${data.numero_pedido}`;
  
  const subtitulo = isPedidoFinalizado
    ? 'Todas as ordens de produção foram finalizadas'
    : `Uma ordem de produção foi concluída`;

  const headerColor = isPedidoFinalizado ? '#059669' : '#1e40af';

  const opsHTML = data.ops.map(op => {
    const isHighlighted = isPedidoFinalizado || op.numero_op === data.numero_op;
    return generateOpHTML(op, isHighlighted);
  }).join('');

  // Progress bar
  const progressColor = data.percentual_concluido >= 100 ? '#48bb78' : data.percentual_concluido >= 50 ? '#4299e1' : '#ed8936';

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
    </head>
    <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; margin: 0; padding: 20px; background-color: #f5f5f5; color: #2d3748;">
      <div style="max-width: 700px; margin: 0 auto; background: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 2px 8px rgba(0,0,0,0.1);">
        
        <!-- Header -->
        <div style="background: ${headerColor}; color: #ffffff; padding: 30px; text-align: center;">
          <img src="https://globinho.vercel.app/logo-global-aco.png" alt="Global Aço" style="height: 50px; margin-bottom: 12px;" />
          <h1 style="margin: 0; font-size: 22px; color: #ffffff;">${titulo}</h1>
          <p style="margin: 8px 0 0 0; opacity: 0.95; font-size: 14px; color: #ffffff;">${subtitulo}</p>
        </div>

        <!-- Content -->
        <div style="padding: 30px;">
          
          <!-- Order Summary -->
          <div style="background: #f8f9fa; border-radius: 8px; padding: 20px; margin-bottom: 24px;">
            <h3 style="margin: 0 0 16px 0; font-size: 16px; color: #2d3748; border-bottom: 2px solid #e2e8f0; padding-bottom: 8px;">📋 Resumo do Pedido</h3>
            <table style="width: 100%; border-collapse: collapse;">
              <tr>
                <td style="padding: 6px 0; font-size: 13px; color: #718096; width: 140px;">Nº Pedido:</td>
                <td style="padding: 6px 0; font-size: 15px; font-weight: 700; color: #2d3748;">${data.numero_pedido}</td>
              </tr>
              <tr>
                <td style="padding: 6px 0; font-size: 13px; color: #718096;">Cliente:</td>
                <td style="padding: 6px 0; font-size: 14px; font-weight: 600; color: #2d3748;">${data.cliente}</td>
              </tr>
              <tr>
                <td style="padding: 6px 0; font-size: 13px; color: #718096;">Prazo Comercial:</td>
                <td style="padding: 6px 0; font-size: 14px; color: #2d3748;">${formatDate(data.prazo)}</td>
              </tr>
              ${data.novo_prazo ? `<tr>
                <td style="padding: 6px 0; font-size: 13px; color: #718096;">Novo Prazo:</td>
                <td style="padding: 6px 0; font-size: 14px; color: #2d3748;">${formatDate(data.novo_prazo)}</td>
              </tr>` : ''}
              ${data.situacao_producao ? `<tr>
                <td style="padding: 6px 0; font-size: 13px; color: #718096;">Situação:</td>
                <td style="padding: 6px 0; font-size: 14px; color: #2d3748;">${data.situacao_producao}</td>
              </tr>` : ''}
              <tr>
                <td style="padding: 6px 0; font-size: 13px; color: #718096;">Peso Total:</td>
                <td style="padding: 6px 0; font-size: 14px; color: #2d3748;">${data.peso_total}</td>
              </tr>
              <tr>
                <td style="padding: 6px 0; font-size: 13px; color: #718096;">Progresso:</td>
                <td style="padding: 6px 0;">
                  <div style="display: flex; align-items: center; gap: 8px;">
                    <div style="flex: 1; background: #e2e8f0; border-radius: 4px; height: 8px; max-width: 200px;">
                      <div style="background: ${progressColor}; border-radius: 4px; height: 8px; width: ${data.percentual_concluido}%;"></div>
                    </div>
                    <span style="font-size: 14px; font-weight: 700; color: ${progressColor};">${data.percentual_concluido}%</span>
                  </div>
                </td>
              </tr>
            </table>
          </div>

          <!-- OPs Detail -->
          <h3 style="margin: 0 0 16px 0; font-size: 16px; color: #2d3748; border-bottom: 2px solid #e2e8f0; padding-bottom: 8px;">🏭 Ordens de Produção</h3>
          ${opsHTML}
        </div>

        <!-- Footer -->
        <div style="background: #f7fafc; padding: 20px; text-align: center; font-size: 13px; color: #718096;">
          <p style="margin: 5px 0;">📅 Notificação enviada em: ${new Date().toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' })}</p>
          <p style="margin: 5px 0;">Fonte de dados: Sistema de Produção - Global Aço</p>
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
    const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // Verify user is admin
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Não autorizado' }), { 
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      });
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token);
    if (authError || !user) {
      return new Response(JSON.stringify({ error: 'Não autorizado' }), { 
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      });
    }

    // Check admin role
    const { data: roleData } = await supabaseAdmin
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id)
      .maybeSingle();
    
    if (!roleData || roleData.role !== 'admin') {
      return new Response(JSON.stringify({ error: 'Apenas administradores podem enviar notificações' }), { 
        status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      });
    }

    const body: NotifyRequest = await req.json();
    console.log('📧 Notificação de produção:', body.tipo, 'Pedido:', body.numero_pedido);

    // Get email recipients from daily report configs
    const { data: configs } = await supabaseAdmin
      .from('email_reports_config')
      .select('email, full_name')
      .eq('is_active', true);

    if (!configs || configs.length === 0) {
      return new Response(JSON.stringify({ error: 'Nenhum destinatário configurado nos relatórios' }), { 
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      });
    }

    const uniqueEmails = [...new Set(configs.map(c => c.email))];
    const htmlContent = generateNotificationHTML(body);

    const isPedidoFinalizado = body.tipo === 'pedido_finalizado';
    const subject = isPedidoFinalizado
      ? `🎉 Pedido ${body.numero_pedido} Finalizado - ${body.cliente}`
      : `✅ OP ${body.numero_op} Concluída - Pedido ${body.numero_pedido} - ${body.cliente}`;

    const results = [];

    for (const email of uniqueEmails) {
      try {
        const resendResponse = await fetch("https://api.resend.com/emails", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${RESEND_API_KEY}`,
          },
          body: JSON.stringify({
            from: "Produção Global Aço <onboarding@resend.dev>",
            to: [email],
            subject,
            html: htmlContent,
          }),
        });

        const resendData = await resendResponse.json();
        results.push({ email, success: resendResponse.ok, data: resendData });
        console.log(`📧 Email ${resendResponse.ok ? 'enviado' : 'falhou'} para ${email}`);
      } catch (error: any) {
        console.error(`❌ Erro ao enviar para ${email}:`, error);
        results.push({ email, success: false, error: error.message });
      }
    }

    return new Response(
      JSON.stringify({ success: true, results, recipients: uniqueEmails.length }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: any) {
    console.error("❌ Erro:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
};

serve(handler);
