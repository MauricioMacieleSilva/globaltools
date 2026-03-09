import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

    let bodyConfigId: string | null = null;
    try {
      const body = await req.json();
      bodyConfigId = body?.config_id ?? null;
    } catch { /* no body */ }

    // Load config
    let configQuery = supabaseAdmin.from("lead_prospecting_configs").select("*");
    if (bodyConfigId) {
      configQuery = configQuery.eq("id", bodyConfigId);
    } else {
      configQuery = configQuery.eq("is_active", true);
    }
    const { data: configs } = await configQuery.limit(1);
    const config = configs?.[0];

    if (!config) {
      return new Response(
        JSON.stringify({ success: false, message: "Nenhuma configuração ativa encontrada" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Create log entry
    const { data: logData } = await supabaseAdmin
      .from("lead_prospecting_logs")
      .insert({
        config_id: config.id,
        status: "running",
        leads_encontrados: 0,
        leads_criados: 0,
        leads_duplicados: 0,
        triggered_by: bodyConfigId ? "manual" : "automatic",
      })
      .select("id")
      .single();

    const logId = logData?.id;

    // Get existing leads for deduplication
    const { data: existingLeads } = await supabaseAdmin
      .from("leads")
      .select("cliente_nome, empresa");

    const existingNames = new Set<string>(
      (existingLeads ?? []).flatMap((l: any) => [
        l.cliente_nome?.toLowerCase().trim(),
        l.empresa?.toLowerCase().trim(),
      ]).filter(Boolean)
    );

    const ramos = config.ramos_atuacao?.length > 0
      ? config.ramos_atuacao.join(", ")
      : "construção civil, metalúrgica, estruturas metálicas, fabricação industrial";

    const estados = config.estados?.length > 0
      ? config.estados.join(", ")
      : "SP, MG, RJ, PR, SC, RS";

    const produtos = config.produtos_interesse?.length > 0
      ? config.produtos_interesse.join(", ")
      : "bobinas de aço, chapas, perfis metálicos, tubos de aço";

    const maxLeads = Math.min(config.max_leads_per_run || 10, 30);

    const systemPrompt = `Você é um especialista em prospecção B2B no Brasil para a Global Aço, uma distribuidora de aço.
Sua tarefa é gerar leads de empresas brasileiras fictícias mas extremamente realistas que seriam potenciais clientes compradores de aço.
Use nomes empresariais típicos do Brasil, contatos e endereços plausíveis para as regiões solicitadas.`;

    const userPrompt = `Gere exatamente ${maxLeads} leads B2B de empresas potencialmente interessadas em comprar aço no Brasil.

CRITÉRIOS:
- Ramos de atuação alvo: ${ramos}
- Estados/regiões alvo: ${estados}
- Produtos de interesse: ${produtos}

Gere empresas variadas e realistas. Para cada empresa, inclua um contato responsável por compras ou suprimentos.`;

    const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        tools: [
          {
            type: "function",
            function: {
              name: "submit_leads",
              description: "Submit a list of B2B prospected leads",
              parameters: {
                type: "object",
                properties: {
                  leads: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        cliente_nome: { type: "string", description: "Razão social da empresa" },
                        empresa: { type: "string", description: "Nome fantasia" },
                        contact_name: { type: "string", description: "Nome do responsável de compras" },
                        contact_phone: { type: "string", description: "Telefone comercial" },
                        contact_email: { type: "string", description: "Email profissional" },
                        cidade: { type: "string" },
                        estado: { type: "string", description: "UF, ex: SP" },
                        ramo_atuacao: { type: "string" },
                        produto_interesse: { type: "string", description: "Tipo de produto de aço" },
                        observacoes: { type: "string", description: "Perfil da empresa e potencial de compra" },
                      },
                      required: ["cliente_nome", "empresa", "estado", "ramo_atuacao", "produto_interesse"],
                      additionalProperties: false,
                    },
                  },
                },
                required: ["leads"],
                additionalProperties: false,
              },
            },
          },
        ],
        tool_choice: { type: "function", function: { name: "submit_leads" } },
      }),
    });

    if (!aiResponse.ok) {
      const errText = await aiResponse.text();
      throw new Error(`AI Gateway error ${aiResponse.status}: ${errText}`);
    }

    const aiResult = await aiResponse.json();
    const toolCall = aiResult.choices?.[0]?.message?.tool_calls?.[0];
    let generatedLeads: any[] = [];

    if (toolCall?.function?.arguments) {
      try {
        const parsed = JSON.parse(toolCall.function.arguments);
        generatedLeads = parsed.leads ?? [];
      } catch (e) {
        console.error("Parse AI response error:", e);
      }
    }

    let created = 0;
    let duplicates = 0;

    for (const lead of generatedLeads) {
      const nameKey = lead.cliente_nome?.toLowerCase().trim() ?? "";
      const empresaKey = lead.empresa?.toLowerCase().trim() ?? "";

      if (existingNames.has(nameKey) || (empresaKey && existingNames.has(empresaKey))) {
        duplicates++;
        continue;
      }

      const { error: insertError } = await supabaseAdmin.from("leads").insert({
        cliente_nome: lead.cliente_nome,
        empresa: lead.empresa,
        contact_name: lead.contact_name ?? null,
        contact_phone: lead.contact_phone ?? null,
        contact_email: lead.contact_email ?? null,
        cidade: lead.cidade ?? null,
        estado: lead.estado ?? null,
        ramo_atuacao: lead.ramo_atuacao ?? null,
        produto_interesse: lead.produto_interesse ?? null,
        observacoes: lead.observacoes ?? null,
        origem: "prospeccao_automatica",
        status: "lead",
      });

      if (!insertError) {
        existingNames.add(nameKey);
        if (empresaKey) existingNames.add(empresaKey);
        created++;
      } else {
        console.error("Insert lead error:", insertError);
      }
    }

    if (logId) {
      await supabaseAdmin
        .from("lead_prospecting_logs")
        .update({
          status: "success",
          leads_encontrados: generatedLeads.length,
          leads_criados: created,
          leads_duplicados: duplicates,
          finished_at: new Date().toISOString(),
        })
        .eq("id", logId);
    }

    return new Response(
      JSON.stringify({
        success: true,
        leads_found: generatedLeads.length,
        leads_created: created,
        leads_duplicated: duplicates,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: unknown) {
    console.error("Prospect leads error:", error);
    const message = error instanceof Error ? error.message : String(error);
    return new Response(
      JSON.stringify({ success: false, error: message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
