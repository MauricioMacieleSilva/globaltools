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
const PNCP_STEEL_KEYWORDS = [
  'aço', 'aco', 'metalic', 'metal', 'estrutura metálica', 'estrutura metalica',
  'chapa', 'perfil', 'bobina', 'tubo', 'viga', 'coluna', 'treliça', 'trelica',
  'cobertura metálica', 'cobertura metalica', 'galpão', 'galpao', 'serralheria',
  'grade', 'portão', 'portao', 'ferro', 'solda', 'calha', 'telha',
  'construção', 'construcao', 'obra', 'reforma', 'ampliação', 'ampliacao',
];

async function searchPNCP(keywords: string, uf: string, maxResults: number): Promise<any[]> {
  try {
    const today = new Date();
    const thirtyDaysAgo = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000);
    const formatDate = (d: Date) => d.toISOString().split("T")[0].replace(/-/g, "");
    const dateFrom = formatDate(thirtyDaysAgo);
    const dateTo = formatDate(today);

    const modalities = [6, 8, 5];
    const allResults: any[] = [];

    for (const modalidade of modalities) {
      const pageSize = Math.max(10, Math.min(maxResults, 20));
      const url = `https://pncp.gov.br/api/consulta/v1/contratacoes/publicacao?dataInicial=${dateFrom}&dataFinal=${dateTo}&codigoModalidadeContratacao=${modalidade}&uf=${uf}&pagina=1&tamanhoPagina=${pageSize}`;

      console.log(`🏛️ [PNCP] Buscando modalidade ${modalidade} em ${uf}...`);
      const response = await fetch(url, { headers: { "Accept": "application/json" } });

      if (!response.ok) {
        const errText = await response.text();
        console.error(`PNCP error ${response.status} (mod ${modalidade}): ${errText}`);
        continue;
      }

      const data = await response.json();
      const items = data?.data ?? [];
      const filtered = items.filter((item: any) => {
        const objeto = (item.objetoCompra || '').toLowerCase();
        return PNCP_STEEL_KEYWORDS.some(kw => objeto.includes(kw));
      });

      console.log(`🏛️ [PNCP] Modalidade ${modalidade}: ${items.length} total, ${filtered.length} relevantes`);
      allResults.push(...filtered);
    }

    console.log(`🏛️ [PNCP] Total relevantes em ${uf}: ${allResults.length}`);
    return allResults;
  } catch (e) {
    console.error("PNCP search error:", e);
    return [];
  }
}

// ====== SOURCE 3: BrasilAPI - CNPJ enrichment (enhanced) ======
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

// Infer regime tributário from BrasilAPI response
function inferRegimeTributario(enriched: any): string | null {
  if (enriched.opcao_pelo_mei) return "MEI";
  if (enriched.opcao_pelo_simples) return "Simples Nacional";
  // Large companies are typically Lucro Real/Presumido
  const porte = (enriched.porte || '').toLowerCase();
  if (porte.includes('grande')) return "Lucro Real";
  if (porte.includes('médio') || porte.includes('medio')) return "Lucro Presumido";
  return null;
}

// Format phone from BrasilAPI ddd_telefone fields
function formatBrasilAPIPhone(dddPhone: string | null): string | null {
  if (!dddPhone || dddPhone.trim().length < 8) return null;
  const clean = dddPhone.replace(/\D/g, "");
  if (clean.length >= 10) {
    const ddd = clean.substring(0, 2);
    const phone = clean.substring(2);
    return `(${ddd}) ${phone}`;
  }
  return dddPhone.trim();
}

// Build CNAE description string
function buildCNAEDescription(enriched: any): string {
  const parts: string[] = [];
  if (enriched.cnae_fiscal_descricao) {
    parts.push(`CNAE Principal: ${enriched.cnae_fiscal_descricao}`);
  }
  if (enriched.cnaes_secundarios?.length > 0) {
    const secondary = enriched.cnaes_secundarios
      .slice(0, 3)
      .map((c: any) => c.descricao)
      .filter(Boolean)
      .join('; ');
    if (secondary) parts.push(`CNAEs Secundários: ${secondary}`);
  }
  return parts.join(' | ');
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
Se encontrar CNPJ nos resultados, inclua-o. Se não encontrar dados suficientes, retorne menos leads.

REGRAS IMPORTANTES DE MAPEAMENTO:
- O campo "empresa" deve conter o NOME DA EMPRESA (razão social ou nome fantasia).
- O campo "contact_name" deve conter o nome de uma PESSOA de contato (comprador, engenheiro, gerente, etc). Se não encontrar o nome de uma pessoa, deixe em BRANCO.
- PRIORIZE sempre encontrar TELEFONE de contato. Telefone é a informação mais importante depois do nome da empresa.
- Tente também encontrar EMAIL e SITE da empresa.`;

  const userPrompt = `Analise estes resultados de busca e extraia até ${maxLeads} leads de empresas reais:

CRITÉRIOS:
- Ramos de atuação: ${ramos}
- Estados: ${estados}

DADOS DE BUSCA:
${searchResults}

Extraia APENAS empresas mencionadas nos dados acima. Não invente empresas.
IMPORTANTE: Para cada lead, identifique a fonte de dados original:
- Resultados marcados [GOOGLE] → fonte_dados: "Google"  
- Resultados marcados [PNCP - LICITAÇÃO] → fonte_dados: "PNCP"
- Resultados marcados [DIÁRIO OFICIAL] → fonte_dados: "Google"
- Resultados marcados [OBRAS PRIVADAS] → fonte_dados: "Google"

PRIORIDADES DE EXTRAÇÃO (em ordem):
1. TELEFONE - busque números de telefone em todos os resultados. Esta é a informação MAIS importante.
2. SOURCE_URL - SEMPRE extraia a URL/link da fonte original. OBRIGATÓRIO quando disponível.
3. EMAIL - extraia emails de contato.
4. SITE - extraia URLs de sites das empresas.
5. CNPJ, cidade, estado, ramo de atuação, produto de interesse, valor estimado.

CAMPO "empresa": Nome da empresa/razão social.
CAMPO "contact_name": Nome de uma PESSOA (comprador, engenheiro, gerente). Se não encontrar, deixe VAZIO.
CAMPO "source_url": URL da fonte original. SEMPRE preencha quando houver URL nos dados.
No campo 'notes', inclua contexto detalhado: tipo de obra/projeto, potencial de compra, se veio de alvará/diário oficial, etc.`;

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
                        notes: { type: "string", description: "Observações detalhadas" },
                        fonte_dados: { type: "string", enum: ["Google", "PNCP", "BrasilAPI"] },
                        valor_estimado: { type: "number" },
                        cliente_telefone: { type: "string" },
                        cliente_email: { type: "string" },
                        source_url: { type: "string", description: "URL da fonte original" },
                      },
                      required: ["cliente_nome", "fonte_dados"],
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

// ====== Build Google search queries (commercial + private construction + official gazettes) ======
function buildGoogleQueries(locationStr: string, ramos: string, cidades: string[], estados: string[]): string[] {
  const queries: string[] = [];

  // Original commercial queries
  queries.push(`construtoras obras aço ${locationStr} ${ramos}`);
  queries.push(`empresas metalúrgicas estruturas metálicas ${locationStr}`);
  queries.push(`licitações obras construção civil aço ${locationStr}`);

  // Private construction: building permits (alvarás)
  const cidadesAlvo = cidades.length > 0 ? cidades : estados;
  for (const local of cidadesAlvo.slice(0, 2)) {
    queries.push(`alvará construção obras privadas ${local} construtora galpão estrutura metálica`);
  }

  // Private construction: industrial/commercial projects
  queries.push(`obras industriais galpão barracão construção ${locationStr} estrutura metálica`);
  queries.push(`empreendimentos construção civil ${locationStr} construtora incorporadora`);

  // Diários Oficiais: building permits published in official gazettes
  for (const local of cidadesAlvo.slice(0, 2)) {
    queries.push(`diário oficial alvará construção demolição ${local} obra`);
  }

  // Municipal portals: specific city hall portals publishing permits
  for (const local of cidadesAlvo.slice(0, 2)) {
    queries.push(`site:prefeitura OR site:pmpa OR site:portoalegre alvará licença construção ${local}`);
  }

  return queries;
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
    let enabledSources: string[] = ['google', 'pncp'];
    try {
      const body = await req.json();
      bodyConfigId = body?.config_id ?? null;
      if (Array.isArray(body?.sources) && body.sources.length > 0) {
        enabledSources = body.sources;
      }
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

    const estados = config.estados?.length > 0 ? config.estados : ["RS"];
    const cidades = config.cidades?.length > 0 ? config.cidades : [];
    const maxLeads = Math.min(config.max_leads_per_run || 10, 30);

    // ====== STEP 1: Collect data from all sources in parallel ======
    console.log("🚀 Iniciando prospecção com fontes de dados...");

    const allSearchResults: string[] = [];

    const locationStr = cidades.length > 0
      ? cidades.join(" OR ") + " " + estados.join(" ")
      : estados.join(" OR ");

    // Build expanded queries (including private construction + diários oficiais + portais)
    const googleQueries = enabledSources.includes('google')
      ? buildGoogleQueries(locationStr, ramos, cidades, estados)
      : [];

    const pncpPromises = enabledSources.includes('pncp')
      ? estados.map((uf: string) => searchPNCP(ramos, uf, 10))
      : [];

    // Execute Google queries in batches (limit concurrent to avoid rate limits)
    const googlePromises = googleQueries.map(q => searchGoogle(q, 5));

    const [googleResults, pncpResults] = await Promise.all([
      Promise.all(googlePromises),
      Promise.all(pncpPromises),
    ]);

    // Process Google results with category tags
    for (let i = 0; i < googleResults.length; i++) {
      const results = googleResults[i];
      const query = googleQueries[i] || '';
      
      // Determine sub-category tag
      let tag = "[GOOGLE]";
      if (query.includes('alvará') || query.includes('obras privadas')) {
        tag = "[OBRAS PRIVADAS - ALVARÁ]";
      } else if (query.includes('diário oficial')) {
        tag = "[DIÁRIO OFICIAL]";
      } else if (query.includes('site:prefeitura') || query.includes('site:pmpa')) {
        tag = "[PORTAL MUNICIPAL]";
      } else if (query.includes('galpão') || query.includes('empreendimentos')) {
        tag = "[OBRAS PRIVADAS]";
      }

      for (const r of results) {
        const text = [
          r.title && `Título: ${r.title}`,
          r.description && `Descrição: ${r.description}`,
          r.url && `URL: ${r.url}`,
          r.markdown && `Conteúdo: ${r.markdown.slice(0, 1500)}`,
        ].filter(Boolean).join("\n");
        if (text) allSearchResults.push(`${tag}\n${text}`);
      }
    }

    // Process PNCP results
    for (const results of pncpResults) {
      const items = Array.isArray(results) ? results : [];
      for (const item of items) {
        const orgao = item.orgaoEntidade?.razaoSocial || "";
        const cnpj = item.orgaoEntidade?.cnpj || "";
        const objeto = item.objetoCompra || "";
        const unidade = item.unidadeOrgao || {};
        const uf = unidade.ufSigla || "";
        const municipio = unidade.municipioNome || "";
        const modalidade = item.modalidadeNome || "";
        const valor = item.valorTotalEstimado || item.valorTotalHomologado || "";
        const numControle = item.numeroControlePNCP || "";
        const linkOrigem = item.linkSistemaOrigem || "";

        // Build a PNCP portal link as fallback when linkSistemaOrigem is empty
        const cnpjOrgao = item.orgaoEntidade?.cnpj?.replace(/\D/g, '') || '';
        const anoCompra = item.anoCompra || '';
        const seqCompra = item.sequencialCompra || '';
        const pncpPortalLink = (cnpjOrgao && anoCompra && seqCompra)
          ? `https://pncp.gov.br/app/editais/${cnpjOrgao}/${anoCompra}/${seqCompra}`
          : `https://pncp.gov.br/app/editais?q=${encodeURIComponent(objeto.slice(0, 80))}`;
        const finalLink = linkOrigem || pncpPortalLink;

        const text = [
          orgao && `Órgão/Empresa: ${orgao}`,
          objeto && `Objeto da Contratação: ${objeto}`,
          cnpj && `CNPJ: ${cnpj}`,
          uf && `UF: ${uf}`,
          municipio && `Município: ${municipio}`,
          modalidade && `Modalidade: ${modalidade}`,
          valor && `Valor Estimado: R$ ${valor}`,
          numControle && `Nº Controle PNCP: ${numControle}`,
          `URL_FONTE: ${finalLink}`,
          item.informacaoComplementar && `Info Complementar: ${item.informacaoComplementar}`,
          item.justificativaPresencial && `Justificativa: ${item.justificativaPresencial}`,
        ].filter(Boolean).join("\n");
        if (text) allSearchResults.push(`[PNCP - LICITAÇÃO]\n${text}`);
      }
    }

    console.log(`📊 Total de resultados coletados: ${allSearchResults.length}`);

    if (allSearchResults.length === 0) {
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
      combinedText, ramos, estados.join(", "), maxLeads, LOVABLE_API_KEY
    );

    console.log(`🤖 AI extraiu ${generatedLeads.length} leads`);

    // ====== STEP 3: Enrich with BrasilAPI (enhanced) ======
    const leadsToEnrich = generatedLeads.filter(
      (l: any) => l.cliente_cnpj && l.cliente_cnpj.replace(/\D/g, "").length === 14
    ).slice(0, 5);

    const enrichPromises = leadsToEnrich.map(async (lead: any) => {
      const enriched = await enrichCNPJ(lead.cliente_cnpj);
      if (!enriched) return;

      // Company name
      lead.cliente_nome = enriched.razao_social || lead.cliente_nome;
      lead.empresa = enriched.nome_fantasia || lead.empresa;

      // Phone (fixed formatting)
      const phone = formatBrasilAPIPhone(enriched.ddd_telefone_1);
      if (phone) lead.cliente_telefone = phone;
      // Try secondary phone if primary missing
      if (!phone) {
        const phone2 = formatBrasilAPIPhone(enriched.ddd_telefone_2);
        if (phone2) lead.cliente_telefone = phone2;
      }

      // Email
      if (enriched.email && enriched.email !== 'null') {
        lead.cliente_email = enriched.email;
      }

      // Location
      lead.cidade = enriched.municipio || lead.cidade;
      lead.estado = enriched.uf || lead.estado;

      // Regime tributário (inferred)
      const regime = inferRegimeTributario(enriched);
      if (regime) lead.regime_tributario = regime;

      // CNAE and business sector
      const cnaeInfo = buildCNAEDescription(enriched);
      if (cnaeInfo) {
        lead.ramo_atuacao = enriched.cnae_fiscal_descricao || lead.ramo_atuacao;
      }

      // Porte (company size)
      const porte = enriched.porte || '';
      const situacao = enriched.descricao_situacao_cadastral || '';
      const natureza = enriched.natureza_juridica || '';

      // Enrich notes with additional data
      const enrichNotes: string[] = [];
      if (porte) enrichNotes.push(`Porte: ${porte}`);
      if (situacao) enrichNotes.push(`Situação: ${situacao}`);
      if (natureza) enrichNotes.push(`Natureza Jurídica: ${natureza}`);
      if (cnaeInfo) enrichNotes.push(cnaeInfo);
      if (regime) enrichNotes.push(`Regime: ${regime}`);
      enrichNotes.push('Enriquecido via ReceitaFederal/BrasilAPI');

      lead.notes = (lead.notes || "") + " | " + enrichNotes.join(' | ');
    });

    await Promise.all(enrichPromises);

    // ====== STEP 4: Insert into staging table for review ======
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

      const fonteLabel = lead.fonte_dados || "IA";
      const sourceValue = "Auto Prospecção";
      const empresaNome = lead.empresa || lead.cliente_nome || '';
      const contactName = lead.contact_name || '';

      const { error: insertError } = await supabaseAdmin.from("lead_prospecting_results").insert({
        log_id: logId || null,
        cliente_nome: contactName || empresaNome,
        empresa: empresaNome || null,
        contact_name: lead.contact_name || null,
        cliente_telefone: lead.cliente_telefone || lead.contact_phone || null,
        cliente_email: lead.cliente_email || lead.contact_email || null,
        cliente_cnpj: lead.cliente_cnpj || null,
        cidade: lead.cidade || null,
        estado: lead.estado || null,
        ramo_atuacao: lead.ramo_atuacao || null,
        produto_interesse: lead.produto_interesse || null,
        valor_estimado: lead.valor_estimado || null,
        notes: lead.notes || null,
        fonte_dados: fonteLabel,
        source: sourceValue,
        source_url: lead.source_url || null,
        regime_tributario: lead.regime_tributario || null,
        status: "pending",
      });

      if (!insertError) {
        if (nameKey) existingNames.add(nameKey);
        if (empresaKey) existingNames.add(empresaKey);
        if (cnpjKey) existingNames.add(cnpjKey);
        created++;
      } else {
        console.error("Insert staging lead error:", insertError);
      }
    }

    // Update log
    const executionDetails = {
      sources: {
        google_queries: googleQueries.length,
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
