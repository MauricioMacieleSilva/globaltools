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
      ticketId,
      ticketNumber,
      title,
      parecer,
      parecerLabel,
      consideracoes,
      analystName,
      requesterName,
      clientName,
      clientCnpj,
      numeroPedido,
      appUrl,
      leadData,
    } = await req.json();

    const resendKey = Deno.env.get("RESEND_API_KEY");
    if (!resendKey) {
      return new Response(JSON.stringify({ error: "RESEND_API_KEY not configured" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    // Sandbox Resend: enviar somente para o email do dono da conta
    const recipients = ["mauricio.maciel@globalaco.com.br"];

    const deepLink = `${appUrl || "https://globaltools.lovable.app"}/chamados?ticket=${ticketId}`;

    const parecerColors: Record<string, { bg: string; border: string; text: string; emoji: string }> = {
      aprovado: { bg: "#ecfdf5", border: "#10b981", text: "#065f46", emoji: "✅" },
      precisa_info: { bg: "#fffbeb", border: "#f59e0b", text: "#92400e", emoji: "ℹ️" },
      pagamento_antecipado: { bg: "#eff6ff", border: "#2563eb", text: "#1e40af", emoji: "💳" },
      pre_analise: { bg: "#f3e8ff", border: "#9333ea", text: "#6b21a8", emoji: "🔎" },
      consulta_serasa: { bg: "#f3e8ff", border: "#9333ea", text: "#6b21a8", emoji: "🔎" },
    };
    const pc = parecerColors[parecer] || { bg: "#f3f4f6", border: "#6b7280", text: "#374151", emoji: "📋" };

    const ld = leadData || {};

    const row = (label: string, value: any) => {
      if (value === null || value === undefined || value === "") return "";
      return `<tr style="border-bottom:1px solid #eee;">
        <td style="padding:8px 0; color:#666; font-size:13px; width:170px;">${label}</td>
        <td style="padding:8px 0; color:#333; font-size:13px; font-weight:500;">${value}</td>
      </tr>`;
    };

    const sectionTitle = (text: string) => `
      <h2 style="margin:24px 0 8px; font-size:13px; color:#2563eb; text-transform:uppercase; letter-spacing:0.5px; border-bottom:2px solid #2563eb; padding-bottom:4px;">${text}</h2>`;

    const htmlBody = `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="font-family: Arial, sans-serif; background: #f4f4f7; padding: 20px; margin: 0;">
  <div style="max-width: 600px; margin: 0 auto; background: #fff; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 8px rgba(0,0,0,0.08);">
    <div style="background: #fff; padding: 15px 24px; text-align: center; border-bottom: 1px solid #eee;">
      <img src="https://globinho.vercel.app/logo-global-aco.png" alt="Global Aço" style="height:45px;" />
    </div>
    <div style="background: ${pc.border}; padding: 20px 24px;">
      <h1 style="color: #fff; margin: 0; font-size: 18px;">${pc.emoji} Chamado Respondido — ${parecerLabel || parecer}</h1>
      <p style="color: #fff; opacity: 0.9; margin: 4px 0 0; font-size: 12px;">${ticketNumber || ""}</p>
    </div>
    <div style="padding: 24px;">
      <p style="color: #333; font-size: 14px; margin: 0 0 16px;">
        <strong>${analystName || "O analista financeiro"}</strong> registrou o parecer do chamado:
      </p>

      <div style="background:#f9fafb; border-left:3px solid ${pc.border}; padding:12px 16px; margin-bottom:20px; border-radius:4px;">
        <p style="margin:0; color:#111; font-size:15px; font-weight:600;">${title || ""}</p>
      </div>

      <div style="background:${pc.bg}; border:1px solid ${pc.border}; padding:16px; border-radius:6px; margin-bottom:20px;">
        <p style="margin:0 0 6px; color:${pc.text}; font-size:12px; text-transform:uppercase; letter-spacing:0.5px; font-weight:600;">Parecer Financeiro</p>
        <p style="margin:0; color:${pc.text}; font-size:18px; font-weight:700;">${pc.emoji} ${parecerLabel || parecer}</p>
        ${consideracoes ? `
        <div style="margin-top:12px; padding-top:12px; border-top:1px solid ${pc.border}33;">
          <p style="margin:0 0 4px; color:${pc.text}; font-size:12px; text-transform:uppercase; letter-spacing:0.5px; font-weight:600;">Considerações do Analista</p>
          <p style="margin:0; color:#333; font-size:14px; white-space:pre-wrap; line-height:1.5;">${consideracoes}</p>
        </div>` : ""}
      </div>

      ${sectionTitle("Dados do Chamado")}
      <table style="width: 100%; border-collapse: collapse;">
        ${row("Nº do Chamado", ticketNumber)}
        ${row("Solicitante", requesterName)}
        ${row("Analista", analystName)}
        ${row("Nº Pedido/Orçamento", numeroPedido)}
      </table>

      ${sectionTitle("Dados do Cliente")}
      <table style="width: 100%; border-collapse: collapse;">
        ${row("Empresa", ld.empresa || clientName)}
        ${row("CNPJ", clientCnpj)}
        ${row("Contato", ld.contact_name)}
        ${row("Telefone", ld.contact_phone)}
        ${row("Cidade", ld.cidade)}
        ${row("UF", ld.estado)}
      </table>

      <div style="text-align: center; margin: 24px 0;">
        <a href="${deepLink}" style="display:inline-block; background:#2563eb; color:#fff; padding:12px 28px; border-radius:6px; text-decoration:none; font-size:14px; font-weight:600;">
          Visualizar Chamado
        </a>
      </div>

      <p style="color:#999; font-size:11px; margin: 24px 0 0; text-align:center;">
        Plataforma Global Aço — Central de Chamados
      </p>
    </div>
  </div>
</body>
</html>`;

    const emailRes = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${resendKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: "Chamados Global Aço <onboarding@resend.dev>",
        to: recipients,
        subject: `[${ticketNumber || "Chamado"}] Resposta: ${parecerLabel || parecer} — ${title || ""}`.trim(),
        html: htmlBody,
      }),
    });

    const emailData = await emailRes.json();
    if (!emailRes.ok) {
      console.error("Resend error:", emailData);
      return new Response(JSON.stringify({ error: emailData }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ success: true, recipients: recipients.length }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err: any) {
    console.error("notify-ticket-resposta error:", err);
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});