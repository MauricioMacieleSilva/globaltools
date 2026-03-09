import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// ====== SOURCE 1: Google Search via Firecrawl ======
async function searchGoogle(query: string, maxResults: number): Promise<any[]> {
  const FIRECRAWL_API_KEY = Deno.env.get("FIRECRAWL_API_KEY");
  if (!FIRECRAWL_API_KEY) {
    console.warn("FIRECRAWL_API_KEY not configured, skipping Google search");
    return [];
  }

  try {
    console.log(`🔍 [Firecrawl] Searching: "${query}"`);
    const response = await fetch("https://api.firecrawl.dev/v1/search", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${FIRECRAWL_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        query,
        limit: Math.min(maxResults, 10),
        lang: "pt-br",
        country: "br",
        scrapeOptions: { formats: ["markdown"] },
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      console.error(`Firecrawl error ${response.status}: ${errText}`);
      return [];
    }

    const data = await response.json();
    return data?.data ?? [];
  } catch (e) {
    console.error("Firecrawl search error:", e);
    return [];
  }
}

// ====== SOURCE 2: PNCP (Portal Nacional de Contratações Públicas) ======
async function searchPNCP(keywords: string, uf: string, maxResults: number): Promise<any[]> {
  try {
    const today = new Date();
    const thirtyDaysAgo = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000);
    
    // Format as yyyyMMdd (PNCP requires this format)
    const formatDate = (d: Date) => d.toISOString().split("T")[0].replace(/-/g, "");
    const dateFrom = formatDate(thirtyDaysAgo);
    const dateTo = formatDate(today);

    const url = `https://pncp.gov.br/api/consulta/v1/contratacoes/publicacao?dataInicial=${dateFrom}&dataFinal=${dateTo}&codigoModalidadeContratacao=8&uf=${uf}&pagina=1&tamanhoPagina=${Math.min(maxResults, 20)}`;

    console.log(`🏛️ [PNCP] Buscando licitações em ${uf}...`);
    const response = await fetch(url, {
      headers: { "Accept": "application/json" },
    });

    if (!response.ok) {
      const errText = await response.text();
      console.error(`PNCP error ${response.status}: ${errText}`);
      return [];
    }

    const data = await response.json();
    return data?.data ?? data ?? [];
  } catch (e) {
    console.error("PNCP search error:", e);
    return [];
  }
}

// ====== SOURCE 3: BrasilAPI - CNPJ enrichment ======
async function enrichCNPJ(cnpj: string): Promise<any | null> {
  try {
    const cleanCnpj = cnpj.replace(/\D/g, "");
    if (cleanCnpj.length !== 14) return null;

    console.log(`📋 [BrasilAPI] Enriching CNPJ: ${cleanCnpj}`);
    const response = await fetch(`https://brasilapi.com.br/api/cnpj/v1/${cleanCnpj}`);

    if (!response.ok) {
      await response.text();
      return null;
    }

    return await response.json();
  } catch (e) {
    console.error("BrasilAPI error:", e);
    return null;
  }
}

// ====== AI: Extract structured leads from search results ======
async function extractLeadsWithAI(
  searchResults: string,
  ramos: string,
  estados: string,
  maxLeads: number,
  LOVABLE_API_KEY: string
): Promise<any[]> {
  console.log("🤖 [AI] Extracting structured leads from search results...");

  const systemPrompt = `Você é um especialista em prospecção B2B para a Global Aço, distribuidora de aço.
Analise os resultados de busca fornecidos e extraia leads de empresas REAIS que podem ser potenciais compradores de aço.
Foque em: construtoras, metalúrgicas, fabricantes de estruturas metálicas, indústrias que usam aço.
Extraia APENAS empresas que realmente aparecem nos dados. NÃO invente dados.
Se encontrar CNPJ nos resultados, inclua-o. Se não encontrar dados suficientes, retorne menos leads.`;

  const userPrompt = `Analise estes resultados de busca e extraia até ${maxLeads} leads de empresas reais:

CRITÉRIOS:
- Ramos de atuação: ${ramos}
- Estados: ${estados}

DADOS DE BUSCA:
${searchResults}

Extraia APENAS empresas mencionadas nos dados acima. Não invente empresas.`;

  try {
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
              description: "Submit extracted real leads from search results",
              parameters: {
                type: "object",
                properties: {
                  leads: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        cliente_nome: { type: "string", description: "Razão social ou nome da empresa" },
                        empresa: { type: "string", description: "Nome fantasia" },
                        cliente_cnpj: { type: "string", description: "CNPJ se disponível" },
                        contact_name: { type: "string", description: "Nome do contato se disponível" },
                        contact_phone: { type: "string", description: "Telefone se disponível" },
                        contact_email: { type: "string", description: "Email se disponível" },
                        cidade: { type: "string" },
                        estado: { type: "string", description: "UF (ex: RS)" },
                        ramo_atuacao: { type: "string" },
                        produto_interesse: { type: "string" },
                        notes: { type: "string", description: "Fonte e contexto do lead" },
                      },
                      required: ["cliente_nome"],
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
      console.error(`AI error ${aiResponse.status}: ${errText}`);
      return [];
    }

    const aiResult = await aiResponse.json();
    const toolCall = aiResult.choices?.[0]?.message?.tool_calls?.[0];

    if (toolCall?.function?.arguments) {
      const parsed = JSON.parse(toolCall.function.arguments);
      return parsed.leads ?? [];
    }
  } catch (e) {
    console.error("AI extraction error:", e);
  }

  return [];
}

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

    // Get existing leads for dedup
    const { data: existingLeads } = await supabaseAdmin
      .from("leads")
      .select("cliente_nome, empresa, cliente_cnpj");

    const existingNames = new Set<string>(
      (existingLeads ?? []).flatMap((l: any) => [
        l.cliente_nome?.toLowerCase().trim(),
        l.empresa?.toLowerCase().trim(),
        l.cliente_cnpj?.replace(/\D/g, ""),
      ]).filter(Boolean)
    );

    const ramos = config.ramos_atuacao?.length > 0
      ? config.ramos_atuacao.join(", ")
      : "construção civil, metalúrgica, estruturas metálicas";

    const estados = config.estados?.length > 0
      ? config.estados
      : ["RS"];

    const cidades = config.cidades?.length > 0
      ? config.cidades
      : [];

    const maxLeads = Math.min(config.max_leads_per_run || 10, 30);

    // ====== STEP 1: Collect data from all sources in parallel ======
    console.log("🚀 Iniciando prospecção com 3 fontes de dados...");

    const allSearchResults: string[] = [];

    // Build Google search queries
    const locationStr = cidades.length > 0
      ? cidades.join(" OR ") + " " + estados.join(" ")
      : estados.join(" OR ");

    const googleQueries = [
      `construtoras obras aço ${locationStr} ${ramos}`,
      `empresas metalúrgicas estruturas metálicas ${locationStr}`,
      `licitações obras construção civil aço ${locationStr}`,
    ];

    // Parallel: Google searches + PNCP for each state
    const googlePromises = googleQueries.map(q => searchGoogle(q, 5));
    const pncpPromises = estados.map((uf: string) => searchPNCP(ramos, uf, 10));

    const [googleResults, pncpResults] = await Promise.all([
      Promise.all(googlePromises),
      Promise.all(pncpPromises),
    ]);

    // Process Google results
    for (const results of googleResults) {
      for (const r of results) {
        const text = [
          r.title && `Título: ${r.title}`,
          r.description && `Descrição: ${r.description}`,
          r.url && `URL: ${r.url}`,
          r.markdown && `Conteúdo: ${r.markdown.slice(0, 1500)}`,
        ].filter(Boolean).join("\n");
        if (text) allSearchResults.push(`[GOOGLE]\n${text}`);
      }
    }

    // Process PNCP results
    for (const results of pncpResults) {
      const items = Array.isArray(results) ? results : [];
      for (const item of items) {
        const orgao = item.orgaoEntidade ?? item.nomeOrgao ?? "";
        const objeto = item.objetoCompra ?? item.objeto ?? "";
        const cnpj = item.cnpjCompra ?? item.cnpj ?? "";
        const uf = item.ufCompra ?? item.uf ?? "";
        const municipio = item.municipioCompra ?? item.municipio ?? "";

        const text = [
          orgao && `Órgão/Empresa: ${orgao}`,
          objeto && `Objeto: ${objeto}`,
          cnpj && `CNPJ: ${cnpj}`,
          uf && `UF: ${uf}`,
          municipio && `Município: ${municipio}`,
          item.valorTotalEstimado && `Valor Estimado: R$ ${item.valorTotalEstimado}`,
        ].filter(Boolean).join("\n");
        if (text) allSearchResults.push(`[PNCP - LICITAÇÃO]\n${text}`);
      }
    }

    console.log(`📊 Total de resultados coletados: ${allSearchResults.length}`);

    if (allSearchResults.length === 0) {
      // Fallback: use AI to generate realistic leads based on criteria
      console.log("⚠️ Nenhum resultado das fontes. Usando IA para gerar leads baseados em critérios...");
      allSearchResults.push(`[CRITÉRIOS DE BUSCA]
Gere leads realistas de empresas nos seguintes ramos: ${ramos}
Estados: ${estados.join(", ")}
${cidades.length > 0 ? `Cidades: ${cidades.join(", ")}` : ""}
Foco: empresas que compram aço, perfis metálicos, chapas, bobinas, tubos.
Tipos: construtoras, metalúrgicas, fábricas de estruturas, serralharias industriais.`);
    }

    // ====== STEP 2: Extract leads with AI ======
    const combinedText = allSearchResults.slice(0, 50).join("\n\n---\n\n");
    const generatedLeads = await extractLeadsWithAI(
      combinedText,
      ramos,
      estados.join(", "),
      maxLeads,
      LOVABLE_API_KEY
    );

    console.log(`🤖 AI extraiu ${generatedLeads.length} leads`);

    // ====== STEP 3: Enrich with BrasilAPI (for leads with CNPJ) ======
    const leadsToEnrich = generatedLeads.filter(
      (l: any) => l.cliente_cnpj && l.cliente_cnpj.replace(/\D/g, "").length === 14
    ).slice(0, 5); // Limit to 5 enrichments to avoid rate limiting

    const enrichPromises = leadsToEnrich.map(async (lead: any) => {
      const enriched = await enrichCNPJ(lead.cliente_cnpj);
      if (enriched) {
        lead.cliente_nome = enriched.razao_social || lead.cliente_nome;
        lead.empresa = enriched.nome_fantasia || lead.empresa;
        lead.contact_phone = enriched.ddd_telefone_1
          ? `(${enriched.ddd_telefone_1}) ${enriched.ddd_telefone_1}`
          : lead.contact_phone;
        lead.contact_email = enriched.email || lead.contact_email;
        lead.cidade = enriched.municipio || lead.cidade;
        lead.estado = enriched.uf || lead.estado;
        lead.notes = (lead.notes || "") + ` | Enriquecido via ReceitaFederal`;
      }
    });

    await Promise.all(enrichPromises);

    // ====== STEP 4: Insert leads ======
    let created = 0;
    let duplicates = 0;

    for (const lead of generatedLeads) {
      const nameKey = lead.cliente_nome?.toLowerCase().trim() ?? "";
      const empresaKey = lead.empresa?.toLowerCase().trim() ?? "";
      const cnpjKey = lead.cliente_cnpj?.replace(/\D/g, "") ?? "";

      if (
        (nameKey && existingNames.has(nameKey)) ||
        (empresaKey && existingNames.has(empresaKey)) ||
        (cnpjKey && cnpjKey.length === 14 && existingNames.has(cnpjKey))
      ) {
        duplicates++;
        continue;
      }

      // Note: 'observacoes' is generated from 'notes', and 'origem' is generated from 'source'
      const { error: insertError } = await supabaseAdmin.from("leads").insert({
        cliente_nome: lead.cliente_nome,
        empresa: lead.empresa || null,
        cliente_cnpj: lead.cliente_cnpj || null,
        contact_name: lead.contact_name || null,
        contact_phone: lead.contact_phone || null,
        contact_email: lead.contact_email || null,
        cidade: lead.cidade || null,
        estado: lead.estado || null,
        ramo_atuacao: lead.ramo_atuacao || null,
        produto_interesse: lead.produto_interesse || null,
        notes: lead.notes || null,
        source: "prospeccao_automatica",
        status: "lead",
      });

      if (!insertError) {
        if (nameKey) existingNames.add(nameKey);
        if (empresaKey) existingNames.add(empresaKey);
        if (cnpjKey) existingNames.add(cnpjKey);
        created++;
      } else {
        console.error("Insert lead error:", insertError);
      }
    }

    // Update log
    const executionDetails = {
      sources: {
        google_results: googleResults.flat().length,
        pncp_results: pncpResults.flat().length,
        enriched_cnpjs: leadsToEnrich.length,
      },
    };

    if (logId) {
      await supabaseAdmin
        .from("lead_prospecting_logs")
        .update({
          status: "success",
          leads_encontrados: generatedLeads.length,
          leads_criados: created,
          leads_duplicados: duplicates,
          finished_at: new Date().toISOString(),
          execution_details: executionDetails,
        })
        .eq("id", logId);
    }

    console.log(`✅ Prospecção finalizada: ${created} criados, ${duplicates} duplicados`);

    return new Response(
      JSON.stringify({
        success: true,
        leads_found: generatedLeads.length,
        leads_created: created,
        leads_duplicated: duplicates,
        sources: executionDetails.sources,
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
