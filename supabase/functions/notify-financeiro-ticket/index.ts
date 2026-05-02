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
    const { ticketId, ticketNumber, title, description, priority, valor, categoria, requesterName, clientName, clientCnpj, leadId, appUrl } = await req.json();

    const resendKey = Deno.env.get("RESEND_API_KEY");
    if (!resendKey) {
      return new Response(JSON.stringify({ error: "RESEND_API_KEY not configured" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    // Buscar emails de admins e financeiros
    const { data: roles } = await supabase
      .from("user_roles")
      .select("user_id, role")
      .in("role", ["admin", "financeiro"]);

    const userIds = (roles || []).map((r: any) => r.user_id);
    const { data: profiles } = await supabase
      .from("user_profiles")
      .select("email")
      .in("id", userIds);

    const recipients = Array.from(new Set((profiles || []).map((p: any) => p.email).filter(Boolean)));

    if (recipients.length === 0) {
      return new Response(JSON.stringify({ warning: "Nenhum destinatário encontrado" }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const deepLink = `${appUrl || "https://globaltools.lovable.app"}/chamados?ticket=${ticketId}`;
    const valorFmt = valor ? `R$ ${Number(valor).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}` : "Não informado";
    const prioridadeMap: Record<string, string> = { baixa: "Baixa", media: "Média", alta: "Alta", urgente: "Urgente" };
    const prioridadeLabel = prioridadeMap[priority] || priority || "Média";

    const htmlBody = `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="font-family: Arial, sans-serif; background: #f4f4f7; padding: 20px; margin: 0;">
  <div style="max-width: 600px; margin: 0 auto; background: #fff; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 8px rgba(0,0,0,0.08);">
    <div style="background: #2563eb; padding: 20px 24px;">
      <h1 style="color: #fff; margin: 0; font-size: 18px;">🎫 Novo Chamado para o Financeiro</h1>
      <p style="color: #dbeafe; margin: 4px 0 0; font-size: 12px;">${ticketNumber || ""}</p>
    </div>
    <div style="padding: 24px;">
      <p style="color: #333; font-size: 14px; margin: 0 0 16px;">
        <strong>${requesterName || "Um usuário"}</strong> abriu um novo chamado:
      </p>

      <div style="background:#f9fafb; border-left:3px solid #2563eb; padding:12px 16px; margin-bottom:20px; border-radius:4px;">
        <p style="margin:0; color:#111; font-size:15px; font-weight:600;">${title}</p>
        ${description ? `<p style="margin:8px 0 0; color:#555; font-size:13px; white-space:pre-wrap;">${description}</p>` : ""}
      </div>

      <table style="width: 100%; border-collapse: collapse; margin-bottom: 24px;">
        ${categoria ? `<tr style="border-bottom: 1px solid #eee;">
          <td style="padding: 8px 0; color: #666; font-size: 13px; width: 160px;">Categoria</td>
          <td style="padding: 8px 0; color: #333; font-size: 13px; font-weight: 600;">${categoria}</td>
        </tr>` : ""}
        <tr style="border-bottom: 1px solid #eee;">
          <td style="padding: 8px 0; color: #666; font-size: 13px;">Prioridade</td>
          <td style="padding: 8px 0; color: #333; font-size: 13px;">${prioridadeLabel}</td>
        </tr>
        <tr style="border-bottom: 1px solid #eee;">
          <td style="padding: 8px 0; color: #666; font-size: 13px;">Valor</td>
          <td style="padding: 8px 0; color: #333; font-size: 13px;">${valorFmt}</td>
        </tr>
        ${clientName ? `<tr style="border-bottom: 1px solid #eee;">
          <td style="padding: 8px 0; color: #666; font-size: 13px;">Cliente</td>
          <td style="padding: 8px 0; color: #333; font-size: 13px;">${clientName}</td>
        </tr>` : ""}
        ${clientCnpj ? `<tr style="border-bottom: 1px solid #eee;">
          <td style="padding: 8px 0; color: #666; font-size: 13px;">CNPJ</td>
          <td style="padding: 8px 0; color: #333; font-size: 13px;">${clientCnpj}</td>
        </tr>` : ""}
      </table>

      <div style="text-align: center; margin: 24px 0;">
        <a href="${deepLink}" style="display:inline-block; background:#2563eb; color:#fff; padding:12px 28px; border-radius:6px; text-decoration:none; font-size:14px; font-weight:600;">
          Visualizar e Atuar no Chamado
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
        subject: `🎫 Novo Chamado ${ticketNumber || ""}: ${title}`,
        html: htmlBody,
      }),
    });

    const emailData = await emailRes.json();
    if (!emailRes.ok) {
      console.error("Resend error:", emailData);
      return new Response(JSON.stringify({ error: emailData }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    return new Response(JSON.stringify({ success: true, recipients: recipients.length }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err: any) {
    console.error("notify-financeiro-ticket error:", err);
    return new Response(JSON.stringify({ error: err.message }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});