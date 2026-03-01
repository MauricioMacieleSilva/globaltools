import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY');

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    const { frete_id } = await req.json();
    if (!frete_id) {
      return new Response(JSON.stringify({ error: 'frete_id required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Load frete data
    const { data: frete, error: freteError } = await supabase
      .from('fretes')
      .select('*')
      .eq('id', frete_id)
      .single();

    if (freteError || !frete) {
      return new Response(JSON.stringify({ error: 'Frete not found' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Load admin and comercial users to send approval emails
    const { data: approverRoles } = await supabase
      .from('user_roles')
      .select('user_id')
      .in('role', ['admin', 'comercial']);

    const approverIds = (approverRoles || []).map(r => r.user_id);

    if (approverIds.length === 0) {
      return new Response(JSON.stringify({ success: true, message: 'No approvers found' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Load approver emails
    const { data: approverProfiles } = await supabase
      .from('user_profiles')
      .select('email, full_name')
      .in('id', approverIds);

    const approverEmails = (approverProfiles || []).map(p => p.email).filter(Boolean);

    if (!RESEND_API_KEY || approverEmails.length === 0) {
      console.log('No RESEND_API_KEY or no approver emails, skipping email send');
      return new Response(JSON.stringify({ success: true, message: 'Email skipped' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const valorFrete = Number(frete.valor_frete).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
    const pesoKg = Number(frete.peso_kg || 0);
    const reaisPorTon = pesoKg > 0 ? ((Number(frete.valor_frete) / pesoKg) * 1000).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }) + '/ton' : '-';
    const dataEmbarque = frete.data_embarque || '-';
    const nfs = (frete.notas_fiscais || []).join(', ') || '-';

    // Build the approval link - points to the fretes page
    const appUrl = 'https://globaltools.lovable.app/fretes';

    const htmlBody = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <h2 style="color: #1a1a2e;">🚚 Solicitação de Aprovação de Frete</h2>
        <p>Um novo frete foi enviado para sua aprovação:</p>
        
        <table style="width: 100%; border-collapse: collapse; margin: 20px 0;">
          <tr style="background: #f5f5f5;">
            <td style="padding: 10px; border: 1px solid #ddd; font-weight: bold;">Cliente</td>
            <td style="padding: 10px; border: 1px solid #ddd;">${frete.cliente_nome || '-'}</td>
          </tr>
          <tr>
            <td style="padding: 10px; border: 1px solid #ddd; font-weight: bold;">Nº Pedido</td>
            <td style="padding: 10px; border: 1px solid #ddd;">${frete.numero_pedido}</td>
          </tr>
          <tr style="background: #f5f5f5;">
            <td style="padding: 10px; border: 1px solid #ddd; font-weight: bold;">Notas Fiscais</td>
            <td style="padding: 10px; border: 1px solid #ddd;">${nfs}</td>
          </tr>
          <tr>
            <td style="padding: 10px; border: 1px solid #ddd; font-weight: bold;">Transportadora</td>
            <td style="padding: 10px; border: 1px solid #ddd;">${frete.transportadora_nome}</td>
          </tr>
          <tr style="background: #f5f5f5;">
            <td style="padding: 10px; border: 1px solid #ddd; font-weight: bold;">Data Embarque</td>
            <td style="padding: 10px; border: 1px solid #ddd;">${dataEmbarque}</td>
          </tr>
          <tr>
            <td style="padding: 10px; border: 1px solid #ddd; font-weight: bold;">Valor Frete</td>
            <td style="padding: 10px; border: 1px solid #ddd; font-weight: bold; color: #1a73e8;">${valorFrete}</td>
          </tr>
          <tr style="background: #f5f5f5;">
            <td style="padding: 10px; border: 1px solid #ddd; font-weight: bold;">Peso</td>
            <td style="padding: 10px; border: 1px solid #ddd;">${pesoKg.toLocaleString('pt-BR')} kg</td>
          </tr>
          <tr>
            <td style="padding: 10px; border: 1px solid #ddd; font-weight: bold;">R$/ton</td>
            <td style="padding: 10px; border: 1px solid #ddd; font-weight: bold;">${reaisPorTon}</td>
          </tr>
          ${frete.observacoes ? `<tr style="background: #f5f5f5;">
            <td style="padding: 10px; border: 1px solid #ddd; font-weight: bold;">Observações</td>
            <td style="padding: 10px; border: 1px solid #ddd;">${frete.observacoes}</td>
          </tr>` : ''}
        </table>

        <div style="text-align: center; margin: 30px 0;">
          <a href="${appUrl}" style="display: inline-block; padding: 14px 32px; background-color: #1a73e8; color: white; text-decoration: none; border-radius: 8px; font-weight: bold; font-size: 16px;">
            Aprovar / Rejeitar no Sistema
          </a>
        </div>

        <p style="color: #666; font-size: 12px; margin-top: 20px;">
          Este e-mail foi enviado automaticamente pelo sistema Global Aço.
        </p>
      </div>
    `;

    // Send email via Resend
    const emailResponse = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: 'Global Aço <onboarding@resend.dev>',
        to: approverEmails,
        subject: `🚚 Aprovação de Frete - Pedido ${frete.numero_pedido} - ${frete.cliente_nome || ''}`,
        html: htmlBody,
      }),
    });

    const emailResult = await emailResponse.json();

    if (!emailResponse.ok) {
      console.error('Resend error:', emailResult);
      return new Response(JSON.stringify({ success: false, error: emailResult }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    return new Response(JSON.stringify({ success: true, emailId: emailResult.id }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Error:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
