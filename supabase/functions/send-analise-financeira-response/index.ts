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
    const {
      leadId, leadName, empresa, cnpj, cidade, estado,
      budgetNumber, valorEstimado, parecer, parecerTipo,
      consideracoes, analistaNome, destinatarioEmail, appUrl,
      ramoAtuacao, produtoInteresse, website, regimeTributario,
      telefone, emailContato,
    } = await req.json();

    const resendKey = Deno.env.get("RESEND_API_KEY");
    if (!resendKey) {
      return new Response(JSON.stringify({ error: "RESEND_API_KEY not configured" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const deepLink = `${appUrl}/crm?lead=${leadId}`;
    const localidade = [cidade, estado].filter(Boolean).join(" / ");
    const valor = valorEstimado ? `R$ ${Number(valorEstimado).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}` : "Não informado";

    let parecerColor = "#2563eb";
    let parecerIcon = "📋";
    if (parecerTipo === "aprovado") {
      parecerColor = "#059669";
      parecerIcon = "✅";
    } else if (parecerTipo === "precisa_info") {
      parecerColor = "#d97706";
      parecerIcon = "⚠️";
    } else if (parecerTipo === "pagamento_antecipado") {
      parecerColor = "#2563eb";
      parecerIcon = "💳";
    }

    // Build optional data rows
    const dataRows: string[] = [];

    const addRow = (label: string, value: string | null | undefined) => {
      if (value) {
        dataRows.push(`
        <tr style="border-bottom: 1px solid #eee;">
          <td style="padding: 8px 0; color: #666; font-size: 13px; width: 160px;">${label}</td>
          <td style="padding: 8px 0; color: #333; font-size: 13px; font-weight: 600;">${value}</td>
        </tr>`);
      }
    };

    addRow("Empresa/Cliente", empresa || leadName);
    addRow("CNPJ", cnpj);
    addRow("Localidade", localidade);
    addRow("Ramo de Atuação", ramoAtuacao);
    addRow("Regime Tributário", regimeTributario);
    addRow("Produto de Interesse", produtoInteresse);
    addRow("Valor do Pedido", valor);
    addRow("Pedido(s)", budgetNumber);
    addRow("Telefone", telefone);
    addRow("E-mail", emailContato);
    if (website) {
      const siteUrl = website.startsWith("http") ? website : `https://${website}`;
      addRow("Website", `<a href="${siteUrl}" style="color: #2563eb; text-decoration: none;">${website}</a>`);
    }

    const htmlBody = `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="font-family: Arial, sans-serif; background: #f4f4f7; padding: 20px;">
  <div style="max-width: 600px; margin: 0 auto; background: #fff; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 8px rgba(0,0,0,0.08);">
    <div style="background: ${parecerColor}; padding: 20px 24px;">
      <h1 style="color: #fff; margin: 0; font-size: 18px;">${parecerIcon} Análise Financeira Concluída</h1>
    </div>
    <div style="padding: 24px;">
      <p style="color: #333; font-size: 14px; margin-bottom: 16px;">
        <strong>${analistaNome}</strong> concluiu a análise financeira com o seguinte parecer:
      </p>
      
      <div style="background: ${parecerColor}10; border-left: 4px solid ${parecerColor}; padding: 12px 16px; border-radius: 0 6px 6px 0; margin-bottom: 20px;">
        <p style="margin: 0; font-size: 16px; font-weight: 700; color: ${parecerColor};">${parecerIcon} ${parecer}</p>
      </div>

      ${consideracoes ? `
      <div style="background: #f8f9fa; border-radius: 6px; padding: 12px 16px; margin-bottom: 20px;">
        <p style="margin: 0 0 4px 0; font-size: 12px; color: #666; font-weight: 600; text-transform: uppercase;">Considerações do Financeiro</p>
        <p style="margin: 0; font-size: 14px; color: #333; line-height: 1.5;">${consideracoes}</p>
      </div>
      ` : ""}

      <table style="width: 100%; border-collapse: collapse; margin-bottom: 20px;">
        ${dataRows.join("")}
      </table>

      <div style="text-align: center; margin-top: 24px;">
        <a href="${deepLink}" style="display: inline-block; background: ${parecerColor}; color: #fff; text-decoration: none; padding: 12px 32px; border-radius: 6px; font-size: 14px; font-weight: 600;">
          Ver no CRM
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
        from: "Financeiro Global Aço <onboarding@resend.dev>",
        to: [destinatarioEmail],
        subject: `${parecerIcon} Análise Financeira Concluída — ${empresa || leadName}${budgetNumber ? ` | Pedido ${budgetNumber}` : ''} [${parecer}]`,
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
