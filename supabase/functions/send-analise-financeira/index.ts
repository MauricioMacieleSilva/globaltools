import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { leadId, leadName, empresa, cnpj, cidade, estado, ramoAtuacao, produtoInteresse, valorEstimado, budgetNumber, website, regimeTributario, telefone, emailContato, destinatarioEmail, remetenteNome, appUrl } = await req.json();

    const resendKey = Deno.env.get("RESEND_API_KEY");
    if (!resendKey) {
      return new Response(JSON.stringify({ error: "RESEND_API_KEY not configured" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const deepLink = `${appUrl}/crm?lead=${leadId}`;

    const localidade = [cidade, estado].filter(Boolean).join(" / ");
    const valor = valorEstimado ? `R$ ${Number(valorEstimado).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}` : "Não informado";

    const htmlBody = `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="font-family: Arial, sans-serif; background: #f4f4f7; padding: 20px;">
  <div style="max-width: 600px; margin: 0 auto; background: #fff; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 8px rgba(0,0,0,0.08);">
    <div style="background: #fff; padding: 15px 24px; text-align: center; border-bottom: 1px solid #eee;">
      <img src="https://globinho.vercel.app/logo-global-aco.png" alt="Global Aço" style="height:45px;" />
    </div>
     <div style="background: #2563eb; padding: 20px 24px;">
       <h1 style="color: #fff; margin: 0; font-size: 18px;">📋 Análise Financeira Solicitada</h1>
    </div>
    <div style="padding: 24px;">
      <p style="color: #333; font-size: 14px; margin-bottom: 16px;">
        <strong>${remetenteNome}</strong> solicitou uma análise financeira para o seguinte lead:
      </p>
      
      <table style="width: 100%; border-collapse: collapse; margin-bottom: 20px;">
        <tr style="border-bottom: 1px solid #eee;">
          <td style="padding: 8px 0; color: #666; font-size: 13px; width: 160px;">Empresa/Cliente</td>
          <td style="padding: 8px 0; color: #333; font-size: 13px; font-weight: 600;">${empresa || leadName}</td>
        </tr>
        ${leadName && empresa && leadName !== empresa ? `<tr style="border-bottom: 1px solid #eee;">
          <td style="padding: 8px 0; color: #666; font-size: 13px;">Contato</td>
          <td style="padding: 8px 0; color: #333; font-size: 13px;">${leadName}</td>
        </tr>` : ""}
        ${cnpj ? `<tr style="border-bottom: 1px solid #eee;">
          <td style="padding: 8px 0; color: #666; font-size: 13px;">CNPJ</td>
          <td style="padding: 8px 0; color: #333; font-size: 13px;">${cnpj}</td>
        </tr>` : ""}
        ${regimeTributario ? `<tr style="border-bottom: 1px solid #eee;">
          <td style="padding: 8px 0; color: #666; font-size: 13px;">Regime Tributário</td>
          <td style="padding: 8px 0; color: #333; font-size: 13px;">${regimeTributario}</td>
        </tr>` : ""}
        ${localidade ? `<tr style="border-bottom: 1px solid #eee;">
          <td style="padding: 8px 0; color: #666; font-size: 13px;">Localidade</td>
          <td style="padding: 8px 0; color: #333; font-size: 13px;">${localidade}</td>
        </tr>` : ""}
        ${telefone ? `<tr style="border-bottom: 1px solid #eee;">
          <td style="padding: 8px 0; color: #666; font-size: 13px;">Telefone</td>
          <td style="padding: 8px 0; color: #333; font-size: 13px;">${telefone}</td>
        </tr>` : ""}
        ${emailContato ? `<tr style="border-bottom: 1px solid #eee;">
          <td style="padding: 8px 0; color: #666; font-size: 13px;">E-mail</td>
          <td style="padding: 8px 0; color: #333; font-size: 13px;">${emailContato}</td>
        </tr>` : ""}
        ${ramoAtuacao ? `<tr style="border-bottom: 1px solid #eee;">
          <td style="padding: 8px 0; color: #666; font-size: 13px;">Ramo de Atuação</td>
          <td style="padding: 8px 0; color: #333; font-size: 13px;">${ramoAtuacao}</td>
        </tr>` : ""}
        ${produtoInteresse ? `<tr style="border-bottom: 1px solid #eee;">
          <td style="padding: 8px 0; color: #666; font-size: 13px;">Produto de Interesse</td>
          <td style="padding: 8px 0; color: #333; font-size: 13px;">${produtoInteresse}</td>
        </tr>` : ""}
        ${website ? `<tr style="border-bottom: 1px solid #eee;">
          <td style="padding: 8px 0; color: #666; font-size: 13px;">Site</td>
          <td style="padding: 8px 0; color: #333; font-size: 13px;"><a href="${website.startsWith('http') ? website : 'https://' + website}" target="_blank" style="color: #2563eb; text-decoration: underline;">${website}</a></td>
        </tr>` : ""}
        <tr style="border-bottom: 1px solid #eee;">
          <td style="padding: 8px 0; color: #666; font-size: 13px;">Valor Estimado</td>
          <td style="padding: 8px 0; color: #333; font-size: 13px; font-weight: 600;">${valor}</td>
        </tr>
        ${budgetNumber ? `<tr style="border-bottom: 1px solid #eee;">
          <td style="padding: 8px 0; color: #666; font-size: 13px;">Pedido(s)</td>
          <td style="padding: 8px 0; color: #333; font-size: 13px;">${budgetNumber}</td>
        </tr>` : ""}
      </table>

      <div style="text-align: center; margin-top: 24px;">
        <a href="${deepLink}" style="display: inline-block; background: #2563eb; color: #fff; text-decoration: none; padding: 12px 32px; border-radius: 6px; font-size: 14px; font-weight: 600;">
          Abrir no CRM e Responder
        </a>
      </div>
      
      <p style="color: #999; font-size: 11px; text-align: center; margin-top: 20px;">
        Este e-mail foi enviado automaticamente pelo sistema Comercial Global Aço.
      </p>
    </div>
  </div>
</body>
</html>`;

    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${resendKey}`,
      },
      body: JSON.stringify({
        from: "Comercial Global Aço <onboarding@resend.dev>",
        to: [destinatarioEmail],
        subject: `📋 Análise Financeira — ${empresa || leadName}${budgetNumber ? ` | Pedido ${budgetNumber}` : ''}`,
        html: htmlBody,
      }),
    });

    const result = await res.json();
    if (!res.ok) {
      console.error("Resend error:", result);
      return new Response(JSON.stringify({ error: "Failed to send email", details: result }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    return new Response(JSON.stringify({ success: true, id: result.id }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (err) {
    console.error("Error:", err);
    return new Response(JSON.stringify({ error: err.message }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
