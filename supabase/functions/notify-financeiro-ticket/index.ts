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
    const { ticketId, ticketNumber, title, description, priority, valor, categoria, requesterName, clientName, clientCnpj, leadId, appUrl, numeroPedido, leadData } = await req.json();

    const resendKey = Deno.env.get("RESEND_API_KEY");
    if (!resendKey) {
      return new Response(JSON.stringify({ error: "RESEND_API_KEY not configured" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    // Sandbox Resend: enviar somente para o email do dono da conta
    const recipients = ["mauricio.maciel@globalaco.com.br"];

    const deepLink = `${appUrl || "https://globaltools.lovable.app"}/chamados?ticket=${ticketId}`;
    const valorFmt = valor ? `R$ ${Number(valor).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}` : "Não informado";
    const prioridadeMap: Record<string, string> = { baixa: "Baixa", media: "Média", alta: "Alta", urgente: "Urgente" };
    const prioridadeLabel = prioridadeMap[priority] || priority || "Média";

    const ld = leadData || {};
    const valorEstFmt = ld.valor_estimado
      ? `R$ ${Number(ld.valor_estimado).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`
      : null;

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

      ${sectionTitle("Detalhes do Chamado")}
      <table style="width: 100%; border-collapse: collapse;">
        ${row("Categoria", categoria)}
        ${row("Prioridade", prioridadeLabel)}
        ${row("Valor", valorFmt)}
        ${row("Nº Pedido/Orçamento", numeroPedido)}
        ${row("Solicitante", requesterName)}
      </table>

      ${sectionTitle("Dados do Cliente")}
      <table style="width: 100%; border-collapse: collapse;">
        ${row("Empresa", ld.empresa || clientName)}
        ${row("CNPJ", clientCnpj)}
        ${row("Contato", ld.contact_name)}
        ${row("Telefone", ld.contact_phone)}
        ${row("E-mail", ld.contact_email)}
        ${row("Cidade", ld.cidade)}
        ${row("UF", ld.estado)}
        ${row("Ramo de Atuação", ld.ramo_atuacao)}
        ${row("Regime Tributário", ld.regime_tributario)}
        ${row("Website", ld.website)}
      </table>

      ${(ld.produto_interesse || ld.origem || ld.status || valorEstFmt || ld.numero_lead || ld.budget_number || ld.vendedor) ? sectionTitle("Informações Comerciais") : ""}
      <table style="width: 100%; border-collapse: collapse;">
        ${row("Vendedor Responsável", ld.vendedor)}
        ${row("Status do Lead", ld.status)}
        ${row("Origem", ld.origem)}
        ${row("Produto de Interesse", ld.produto_interesse)}
        ${row("Valor Estimado", valorEstFmt)}
        ${row("Nº do Lead", ld.numero_lead)}
        ${row("Nº do Orçamento", ld.budget_number)}
      </table>

      ${ld.observacoes ? `${sectionTitle("Observações")}
      <div style="background:#fafafa; border:1px solid #eee; padding:12px; border-radius:4px; color:#555; font-size:13px; white-space:pre-wrap;">${ld.observacoes}</div>` : ""}

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
        subject: ticketNumber ? `[${ticketNumber}] ${title}` : title,
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