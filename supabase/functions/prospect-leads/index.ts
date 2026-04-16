import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// Timeout helper for fetch calls
function fetchWithTimeout(url: string, options: RequestInit = {}, timeoutMs = 25000): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  return fetch(url, { ...options, signal: controller.signal }).finally(() => clearTimeout(timer));
}

// ====== SOURCE 1: Google Search via Firecrawl ======
async function searchGoogle(query: string, maxResults: number): Promise<any[]> {
  const FIRECRAWL_API_KEY = Deno.env.get("FIRECRAWL_API_KEY");
  if (!FIRECRAWL_API_KEY) {
    console.warn("FIRECRAWL_API_KEY not configured, skipping Google search");
    return [];
  }

  try {
    console.log(`🔍 [Firecrawl] Searching: "${query}"`);
    const response = await fetchWithTimeout("https://api.firecrawl.dev/v1/search", {
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
    }, 30000);

    if (!response.ok) {
      const errText = await response.text();
      console.error(`Firecrawl error ${response.status}: ${errText}`);
      return [];
    }

    const data = await response.json();
    return data?.data ?? [];
  } catch (e) {
    if (e instanceof DOMException && e.name === 'AbortError') {
      console.warn(`Firecrawl timeout for query: "${query}"`);
    } else {
      console.error("Firecrawl search error:", e);
    }
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

    // Only use one modality to reduce time
    const pageSize = Math.max(10, Math.min(maxResults, 20));
    const url = `https://pncp.gov.br/api/consulta/v1/contratacoes/publicacao?dataInicial=${dateFrom}&dataFinal=${dateTo}&codigoModalidadeContratacao=6&uf=${uf}&pagina=1&tamanhoPagina=${pageSize}`;

    console.log(`🏛️ [PNCP] Buscando em ${uf}...`);
    const response = await fetchWithTimeout(url, { headers: { "Accept": "application/json" } }, 15000);

    if (!response.ok) {
      const errText = await response.text();
      console.error(`PNCP error ${response.status}: ${errText}`);
      return [];
    }

    const data = await response.json();
    const items = data?.data ?? [];
    const filtered = items.filter((item: any) => {
      const objeto = (item.objetoCompra || '').toLowerCase();
      return PNCP_STEEL_KEYWORDS.some(kw => objeto.includes(kw));
    });

    console.log(`🏛️ [PNCP] ${uf}: ${items.length} total, ${filtered.length} relevantes`);
    return filtered;
  } catch (e) {
    if (e instanceof DOMException && e.name === 'AbortError') {
      console.warn(`PNCP timeout for UF: ${uf}`);
    } else {
      console.error("PNCP search error:", e);
    }
    return [];
  }
}

// ====== SOURCE 3: ObrasGov.br (Obras Públicas Federais) ======
const OBRASGOV_STEEL_KEYWORDS = [
  'construção', 'construcao', 'galpão', 'galpao', 'estrutura', 'cobertura',
  'ampliação', 'ampliacao', 'reforma', 'pavilhão', 'pavilhao', 'industrial',
  'ponte', 'viaduto', 'passarela', 'saneamento', 'infraestrutura',
];

async function searchObrasGov(uf: string, maxResults: number): Promise<any[]> {
  try {
    console.log(`🏗️ [ObrasGov] Buscando obras em ${uf}...`);
    const url = `https://api.obrasgov.gestao.gov.br/obrasgov/api/projeto-investimento?uf=${uf}&page=0&size=${Math.min(maxResults, 50)}`;
    const response = await fetchWithTimeout(url, {
      headers: { "Accept": "application/json" },
    }, 15000);

    if (!response.ok) {
      const errText = await response.text();
      console.error(`ObrasGov error ${response.status}: ${errText}`);
      return [];
    }

    const data = await response.json();
    const items = data?.content ?? [];

    // Filter for active construction obras and relevant keywords
    const filtered = items.filter((item: any) => {
      if (item.situacao === 'Cancelada') return false;
      const especie = (item.especie || '').toLowerCase();
      const nome = (item.nome || '').toLowerCase();
      const descricao = (item.descricao || '').toLowerCase();
      const combined = `${especie} ${nome} ${descricao}`;
      return OBRASGOV_STEEL_KEYWORDS.some(kw => combined.includes(kw));
    });

    console.log(`🏗️ [ObrasGov] ${uf}: ${items.length} total, ${filtered.length} relevantes`);
    return filtered;
  } catch (e) {
    if (e instanceof DOMException && e.name === 'AbortError') {
      console.warn(`ObrasGov timeout for UF: ${uf}`);
    } else {
      console.error("ObrasGov search error:", e);
    }
    return [];
  }
}

// ====== SOURCE 4: CNAE Search via Firecrawl ======
async function searchByCNAE(cnaes: string[], uf: string, maxResults: number): Promise<any[]> {
  const FIRECRAWL_API_KEY = Deno.env.get("FIRECRAWL_API_KEY");
  if (!FIRECRAWL_API_KEY) {
    console.warn("FIRECRAWL_API_KEY not configured, skipping CNAE search");
    return [];
  }

  const allResults: any[] = [];

  // Build search queries for each CNAE code
  for (const cnae of cnaes.slice(0, 5)) {
    const cnaeShort = cnae.replace(/[.\-]/g, '').slice(0, 4);
    const query = `site:cnpja.com CNAE "${cnaeShort}" "${uf}" ativa`;
    
    console.log(`🏭 [CNAE] Searching: "${query}"`);
    try {
      const response = await fetchWithTimeout("https://api.firecrawl.dev/v2/search", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${FIRECRAWL_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          query,
          limit: Math.min(maxResults, 5),
          lang: "pt-br",
          country: "br",
        }),
      }, 20000);

      if (!response.ok) {
        const errText = await response.text();
        console.error(`Firecrawl CNAE error ${response.status}: ${errText}`);
        continue;
      }

      const data = await response.json();
      const results = data?.data ?? [];
      
      // Extract CNPJs from cnpja.com URLs (supports plain or formatted CNPJ in path)
      for (const r of results) {
        const url = r.url || '';
        const cnpjMatch = url.match(/cnpja\.com\/(?:office\/)?([\d.\-\/]{14,18})/);
        if (cnpjMatch) cnpjMatch[1] = cnpjMatch[1].replace(/\D/g, '');
        if (cnpjMatch) {
          allResults.push({
            cnpj: cnpjMatch[1],
            url,
            title: r.title || '',
            description: r.description || '',
            cnae_searched: cnae,
          });
        }
      }
    } catch (e) {
      console.warn(`CNAE search failed for ${cnae}:`, e);
    }
  }

  console.log(`🏭 [CNAE] Found ${allResults.length} companies total`);
  return allResults;
}

// ====== SOURCE 5: Deep scraping via cnpja.com + AI extraction ======
function formatCnpjMask(cnpj: string): string {
  const c = cnpj.replace(/\D/g, '').padStart(14, '0');
  return `${c.slice(0,2)}.${c.slice(2,5)}.${c.slice(5,8)}/${c.slice(8,12)}-${c.slice(12,14)}`;
}

async function scrapeCompanyDetails(cnpj: string): Promise<any | null> {
  const FIRECRAWL_API_KEY = Deno.env.get("FIRECRAWL_API_KEY");
  if (!FIRECRAWL_API_KEY) return null;

  try {
    const cleanCnpj = cnpj.replace(/\D/g, "");
    const maskedCnpj = formatCnpjMask(cleanCnpj);
    console.log(`🔬 [Scrape] Scraping cnpja.com for: ${maskedCnpj}`);
    
    const response = await fetchWithTimeout("https://api.firecrawl.dev/v2/scrape", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${FIRECRAWL_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        url: `https://cnpja.com/office/${maskedCnpj}`,
        formats: ["markdown"],
        onlyMainContent: true,
        waitFor: 2500,
      }),
    }, 25000);

    if (!response.ok) {
      await response.text();
      return null;
    }

    const data = await response.json();
    const markdown = data?.data?.markdown || data?.markdown || '';
    if (!markdown || markdown.length < 100) return null;

    // Use AI to extract structured data from the markdown
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) return null;

    const aiResponse = await fetchWithTimeout("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: "Extraia dados empresariais estruturados do conteúdo da página cnpja.com (CNPJá). A página mostra no topo: Razão Social, situação cadastral (Ativa/Baixada/Suspensa), data de abertura, natureza jurídica, endereço completo, e à direita o Regime Tributário (Lucro Real/Presumido/Simples Nacional/MEI) e Sócios e Administradores. Mais abaixo aparecem as Atividades Econômicas (CNAE Principal e Secundárias). Retorne APENAS dados presentes na página." },
          { role: "user", content: `Extraia os dados da empresa:\n\n${markdown.slice(0, 5000)}` },
        ],
        tools: [{
          type: "function",
          function: {
            name: "extract_company",
            description: "Extract structured company data from cnpja.com page",
            parameters: {
              type: "object",
              properties: {
                razao_social: { type: "string" },
                nome_fantasia: { type: "string" },
                cnpj: { type: "string" },
                situacao_cadastral: { type: "string", description: "Ex: Ativa, Baixada, Suspensa, Inapta" },
                situacao_especial: { type: "string" },
                data_abertura: { type: "string", description: "Data de início da atividade no formato DD/MM/AAAA" },
                capital_social: { type: "string" },
                porte: { type: "string" },
                natureza_juridica: { type: "string" },
                regime_tributario: { type: "string", description: "Regime tributário exibido no painel direito: 'Lucro Real ou Presumido', 'Simples Nacional', 'MEI', etc." },
                mei: { type: "boolean" },
                simples_nacional: { type: "boolean" },
                cnae_principal_codigo: { type: "string" },
                cnae_principal_descricao: { type: "string" },
                cnaes_secundarios: { type: "string", description: "Lista separada por vírgula dos CNAEs secundários (código + descrição)" },
                logradouro: { type: "string", description: "Rua, avenida, número e complemento" },
                bairro: { type: "string" },
                municipio: { type: "string" },
                uf: { type: "string" },
                cep: { type: "string" },
                telefone1: { type: "string" },
                telefone2: { type: "string" },
                email: { type: "string" },
                socios: { type: "string", description: "Nomes dos sócios e administradores listados, separados por vírgula" },
              },
              required: ["razao_social"],
              additionalProperties: false,
            },
          },
        }],
        tool_choice: { type: "function", function: { name: "extract_company" } },
      }),
    }, 30000);

    if (!aiResponse.ok) {
      await aiResponse.text();
      return null;
    }

    const aiResult = await aiResponse.json();
    const toolCall = aiResult.choices?.[0]?.message?.tool_calls?.[0];
    if (toolCall?.function?.arguments) {
      const parsed = JSON.parse(toolCall.function.arguments);
      console.log(`✅ [Scrape] Extracted: ${parsed.razao_social} (${parsed.situacao_cadastral || 'N/A'})`);
      return parsed;
    }
  } catch (e) {
    console.warn(`Scrape failed for ${cnpj}:`, e);
  }
  return null;
}

function buildDeepEnrichmentNotes(scraped: any): string {
  const parts: string[] = [];
  if (scraped.situacao_cadastral) parts.push(`Situação: ${scraped.situacao_cadastral}`);
  if (scraped.situacao_especial) parts.push(`⚠️ Situação Especial: ${scraped.situacao_especial}`);
  if (scraped.capital_social) parts.push(`Capital Social: ${scraped.capital_social}`);
  if (scraped.porte) parts.push(`Porte: ${scraped.porte}`);
  if (scraped.natureza_juridica) parts.push(`Natureza Jurídica: ${scraped.natureza_juridica}`);
  if (scraped.mei !== undefined) parts.push(`MEI: ${scraped.mei ? 'Sim' : 'Não'}`);
  if (scraped.simples_nacional !== undefined) parts.push(`Simples: ${scraped.simples_nacional ? 'Sim' : 'Não'}`);
  if (scraped.cnae_principal_codigo) parts.push(`CNAE Principal: ${scraped.cnae_principal_codigo} - ${scraped.cnae_principal_descricao || ''}`);
  if (scraped.cnaes_secundarios) parts.push(`CNAEs Sec.: ${scraped.cnaes_secundarios}`);
  if (scraped.logradouro) {
    const addr = [scraped.logradouro, scraped.bairro, scraped.municipio, scraped.uf, scraped.cep].filter(Boolean).join(', ');
    parts.push(`Endereço: ${addr}`);
  }
  parts.push('Enriquecido via CNPJ.biz (Firecrawl)');
  return parts.join(' | ');
}

// ====== SOURCE 6: BrasilAPI - CNPJ enrichment ======
async function enrichCNPJ(cnpj: string): Promise<any | null> {
  try {
    const cleanCnpj = cnpj.replace(/\D/g, "");
    if (cleanCnpj.length !== 14) return null;

    console.log(`📋 [BrasilAPI] Enriching CNPJ: ${cleanCnpj}`);
    const response = await fetchWithTimeout(`https://brasilapi.com.br/api/cnpj/v1/${cleanCnpj}`, {}, 10000);

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

function inferRegimeTributario(enriched: any): string | null {
  if (enriched.opcao_pelo_mei) return "MEI";
  if (enriched.opcao_pelo_simples) return "Simples Nacional";
  const porte = (enriched.porte || '').toLowerCase();
  if (porte.includes('grande')) return "Lucro Real";
  if (porte.includes('médio') || porte.includes('medio')) return "Lucro Presumido";
  return null;
}

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

// ====== AI: Extract structured leads ======
async function extractLeadsWithAI(
  searchResults: string,
  ramos: string,
  estados: string,
  maxLeads: number,
  LOVABLE_API_KEY: string
): Promise<any[]> {
  console.log("🤖 [AI] Extracting structured leads...");

  const systemPrompt = `Você é um especialista em prospecção B2B para a Global Aço, distribuidora de aço.
Analise os resultados de busca e extraia leads de empresas REAIS que podem ser potenciais compradores de aço.
Foque em: construtoras, metalúrgicas, fabricantes de estruturas metálicas, indústrias que usam aço.
Extraia APENAS empresas que realmente aparecem nos dados. NÃO invente dados.

REGRAS:
- "empresa" = NOME DA EMPRESA (razão social ou nome fantasia)
- "contact_name" = nome de PESSOA de contato. Se não encontrar, deixe VAZIO.
- PRIORIZE encontrar TELEFONE, EMAIL e SITE.
- "source_url" é OBRIGATÓRIO. Copie de "URL_FONTE:" nos dados.
- "fonte_dados" DEVE corresponder EXATAMENTE à tag da seção de onde o lead foi extraído:
  - Se o bloco começa com [GOOGLE], use fonte_dados = "Google"
  - Se o bloco começa com [PNCP - LICITAÇÃO], use fonte_dados = "PNCP"
  - Se o bloco começa com [OBRASGOV - OBRA PÚBLICA], use fonte_dados = "ObrasGov"
  - Se o bloco começa com [CNAE - CNPJ.BIZ], use fonte_dados = "CNAE"
  - NÃO misture as fontes. Cada lead deve ter a fonte correta de onde foi extraído.`;

  const userPrompt = `Extraia até ${maxLeads} leads reais dos dados abaixo.
Ramos: ${ramos} | Estados: ${estados}

IMPORTANTE: O campo "fonte_dados" de cada lead DEVE corresponder à tag [GOOGLE], [PNCP - LICITAÇÃO] ou [OBRASGOV - OBRA PÚBLICA] do bloco de onde a informação foi extraída.

DADOS:
${searchResults}

Cada lead DEVE ter source_url (copie de "URL_FONTE:") e fonte_dados correto.`;

  try {
    const aiResponse = await fetchWithTimeout("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
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
                        cliente_nome: { type: "string" },
                        empresa: { type: "string" },
                        cliente_cnpj: { type: "string" },
                        contact_name: { type: "string" },
                        contact_phone: { type: "string" },
                        contact_email: { type: "string" },
                        cidade: { type: "string" },
                        estado: { type: "string" },
                        ramo_atuacao: { type: "string" },
                        produto_interesse: { type: "string" },
                        notes: { type: "string" },
                        fonte_dados: { type: "string", enum: ["Google", "PNCP", "ObrasGov", "BrasilAPI", "CNAE"] },
                        valor_estimado: { type: "number" },
                        cliente_telefone: { type: "string" },
                        cliente_email: { type: "string" },
                        source_url: { type: "string" },
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
    }, 60000); // 60s timeout for AI

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
    if (e instanceof DOMException && e.name === 'AbortError') {
      console.error("AI extraction timeout");
    } else {
      console.error("AI extraction error:", e);
    }
  }

  return [];
}

// ====== Build Google search queries (reduced to 3 max) ======
function buildGoogleQueries(locationStr: string, ramos: string): string[] {
  return [
    `construtoras metalúrgicas obras aço estruturas metálicas ${locationStr}`,
    `licitações obras construção civil aço galpão ${locationStr}`,
    `empresas serralheria industrial estrutura metálica ${locationStr} ${ramos}`,
  ];
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const supabaseAdmin = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );

  let logId: string | null = null;

  try {
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

    let bodyConfigId: string | null = null;
    let enabledSources: string[] = ['google', 'pncp', 'obrasgov'];
    let companySearch: string | null = null;
    let selectedCnaes: string[] = [];
    try {
      const body = await req.json();
      bodyConfigId = body?.config_id ?? null;
      companySearch = body?.company_search?.trim() || null;
      if (Array.isArray(body?.sources) && body.sources.length > 0) {
        enabledSources = body.sources;
      }
      if (Array.isArray(body?.cnaes) && body.cnaes.length > 0) {
        selectedCnaes = body.cnaes;
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

    logId = logData?.id;

    // Get existing CRM leads for dedup (ONLY what is already registered in `leads`)
    const { data: existingLeads } = await supabaseAdmin
      .from("leads")
      .select("cliente_nome, empresa, cliente_cnpj");

    const existingNames = new Set<string>(
      (existingLeads ?? [])
        .flatMap((l: any) => [
          l.cliente_nome?.toLowerCase().trim(),
          l.empresa?.toLowerCase().trim(),
          l.cliente_cnpj?.replace(/\D/g, ""),
        ])
        .filter(Boolean)
    );

    const ramos = config.ramos_atuacao?.length > 0
      ? config.ramos_atuacao.join(", ")
      : "construção civil, metalúrgica, estruturas metálicas";

    const estados = config.estados?.length > 0 ? config.estados : ["RS"];
    const cidades = config.cidades?.length > 0 ? config.cidades : [];
    const maxLeads = Math.min(config.max_leads_per_run || 10, 30);

    console.log("🚀 Iniciando prospecção...");

    const allSearchResults: string[] = [];

    // ====== COMPANY-SPECIFIC SEARCH (CNPJ, razão social, nome fantasia) ======
    if (companySearch) {
      console.log(`🔎 Busca específica por empresa: "${companySearch}"`);
      const cleanInput = companySearch.replace(/\D/g, '');
      const isCNPJ = cleanInput.length === 14;

      if (isCNPJ) {
        // Direct CNPJ lookup via BrasilAPI
        const enriched = await enrichCNPJ(cleanInput);
        if (enriched) {
          const phone = formatBrasilAPIPhone(enriched.ddd_telefone_1) || formatBrasilAPIPhone(enriched.ddd_telefone_2) || '';
          const cnaeInfo = buildCNAEDescription(enriched);
          const regime = inferRegimeTributario(enriched);
          const text = [
            enriched.razao_social && `Razão Social: ${enriched.razao_social}`,
            enriched.nome_fantasia && `Nome Fantasia: ${enriched.nome_fantasia}`,
            `CNPJ: ${cleanInput}`,
            enriched.municipio && `Município: ${enriched.municipio}`,
            enriched.uf && `UF: ${enriched.uf}`,
            phone && `Telefone: ${phone}`,
            enriched.email && enriched.email !== 'null' && `Email: ${enriched.email}`,
            cnaeInfo && `${cnaeInfo}`,
            enriched.porte && `Porte: ${enriched.porte}`,
            regime && `Regime: ${regime}`,
            enriched.descricao_situacao_cadastral && `Situação: ${enriched.descricao_situacao_cadastral}`,
            `URL_FONTE: https://www.google.com/search?q=${encodeURIComponent(enriched.razao_social || companySearch)}`,
          ].filter(Boolean).join("\n");
          allSearchResults.push(`[GOOGLE]\n${text}`);
        }
      }

      // Also do a Google/Firecrawl search for the company name/CNPJ
      if (enabledSources.includes('google')) {
        const companyResults = await searchGoogle(
          `"${companySearch}" empresa aço construção metalúrgica ${estados.join(' ')}`,
          5
        );
        for (const r of companyResults) {
          const text = [
            r.title && `Título: ${r.title}`,
            r.description && `Descrição: ${r.description}`,
            r.url && `URL_FONTE: ${r.url}`,
            r.markdown && `Conteúdo: ${r.markdown.slice(0, 1000)}`,
          ].filter(Boolean).join("\n");
          if (text) allSearchResults.push(`[GOOGLE]\n${text}`);
        }
      }
    }

    const locationStr = cidades.length > 0
      ? cidades.join(" OR ") + " " + estados.join(" ")
      : estados.join(" OR ");

    // Build queries (max 3 Google queries to stay within timeout)
    const googleQueries = enabledSources.includes('google') && !companySearch
      ? buildGoogleQueries(locationStr, ramos)
      : [];

    const pncpPromises = enabledSources.includes('pncp') && !companySearch
      ? estados.slice(0, 2).map((uf: string) => searchPNCP(ramos, uf, 10))
      : [];

    const obrasgovPromises = enabledSources.includes('obrasgov') && !companySearch
      ? estados.slice(0, 2).map((uf: string) => searchObrasGov(uf, 20))
      : [];

    const googlePromises = googleQueries.map(q => searchGoogle(q, 5));

    const [googleResults, pncpResults, obrasgovResults] = await Promise.all([
      Promise.all(googlePromises),
      Promise.all(pncpPromises),
      Promise.all(obrasgovPromises),
    ]);

    // Process Google results
    for (let i = 0; i < googleResults.length; i++) {
      const results = googleResults[i];
      for (const r of results) {
        const text = [
          r.title && `Título: ${r.title}`,
          r.description && `Descrição: ${r.description}`,
          r.url && `URL_FONTE: ${r.url}`,
          r.markdown && `Conteúdo: ${r.markdown.slice(0, 1000)}`,
        ].filter(Boolean).join("\n");
        if (text) allSearchResults.push(`[GOOGLE]\n${text}`);
      }
    }

    // Process PNCP results
    const pncpItemsForFirecrawl: { cnpj: string; objeto: string; index: number }[] = [];
    for (const results of pncpResults) {
      const items = Array.isArray(results) ? results : [];
      for (const item of items) {
        const orgao = item.orgaoEntidade?.razaoSocial || "";
        const cnpj = item.orgaoEntidade?.cnpj || "";
        const objeto = item.objetoCompra || "";
        const unidade = item.unidadeOrgao || {};
        const uf = unidade.ufSigla || "";
        const municipio = unidade.municipioNome || "";
        const valor = item.valorTotalEstimado || item.valorTotalHomologado || "";
        const linkOrigem = item.linkSistemaOrigem || "";
        // Store PNCP data for Firecrawl lookup later
        const pncpCnpj = cnpj?.replace(/\D/g, '') || '';
        const objetoResumo = objeto.slice(0, 60);
        // Use linkSistemaOrigem if available, otherwise mark for Firecrawl search
        // We'll use a Google fallback URL as placeholder and try Firecrawl below
        let finalLink = linkOrigem;
        if (!finalLink) {
          // Placeholder: will be replaced by Firecrawl search result if possible
          finalLink = `https://www.google.com/search?q=pncp+${encodeURIComponent(pncpCnpj)}+${encodeURIComponent(objetoResumo)}`;
        }
        // Track items needing Firecrawl lookup
        if (!linkOrigem && pncpCnpj) {
          pncpItemsForFirecrawl.push({ cnpj: pncpCnpj, objeto: objetoResumo, index: allSearchResults.length });
        }

        const text = [
          orgao && `Órgão/Empresa: ${orgao}`,
          objeto && `Objeto: ${objeto}`,
          cnpj && `CNPJ: ${cnpj}`,
          uf && `UF: ${uf}`,
          municipio && `Município: ${municipio}`,
          valor && `Valor Estimado: R$ ${valor}`,
          `URL_FONTE: ${finalLink}`,
        ].filter(Boolean).join("\n");
        if (text) allSearchResults.push(`[PNCP - LICITAÇÃO]\n${text}`);
      }
    }

    // ====== Firecrawl Search: find real PNCP URLs (max 5 to save credits) ======
    const FIRECRAWL_API_KEY = Deno.env.get("FIRECRAWL_API_KEY");
    if (FIRECRAWL_API_KEY && pncpItemsForFirecrawl.length > 0) {
      const itemsToSearch = pncpItemsForFirecrawl.slice(0, 5);
      console.log(`🔎 [Firecrawl] Buscando ${itemsToSearch.length} URLs reais do PNCP...`);
      
      for (const item of itemsToSearch) {
        try {
          const searchQuery = `site:pncp.gov.br "${item.cnpj}" "${item.objeto}"`;
          const fcResponse = await fetchWithTimeout("https://api.firecrawl.dev/v1/search", {
            method: "POST",
            headers: {
              "Authorization": `Bearer ${FIRECRAWL_API_KEY}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              query: searchQuery,
              limit: 1,
              lang: "pt-br",
              country: "br",
            }),
          }, 10000);

          if (fcResponse.ok) {
            const fcData = await fcResponse.json();
            const foundUrl = fcData?.data?.[0]?.url;
            if (foundUrl && foundUrl.includes('pncp.gov.br')) {
              console.log(`✅ [Firecrawl] Found real URL for CNPJ ${item.cnpj}: ${foundUrl}`);
              // Replace the Google fallback URL in the corresponding search result
              const resultText = allSearchResults[item.index];
              if (resultText) {
                allSearchResults[item.index] = resultText.replace(
                  /URL_FONTE:\s*https?:\/\/[^\s\n]+/i,
                  `URL_FONTE: ${foundUrl}`
                );
              }
            } else {
              await fcResponse.text(); // consume body
            }
          } else {
            await fcResponse.text(); // consume body
          }
        } catch (e) {
          console.warn(`Firecrawl PNCP search failed for ${item.cnpj}:`, e);
        }
      }
    }

    for (const results of obrasgovResults) {
      const items = Array.isArray(results) ? results : [];
      for (const item of items) {
        const nome = item.nome || '';
        const descricao = item.descricao || '';
        const especie = item.especie || '';
        const situacao = item.situacao || '';
        const uf = item.uf || '';
        const endereco = item.endereco || '';
        const cep = item.cep || '';
        const executor = item.executores?.[0] || {};
        const executorNome = executor.nome || '';
        const executorCodigo = executor.codigo ? String(executor.codigo) : '';
        const valor = item.fontesDeRecurso?.[0]?.valorInvestimentoPrevisto || '';
        const tipo = item.tipos?.[0]?.descricao || '';
        const subTipo = item.subTipos?.[0]?.descricao || '';
        const idUnico = item.idUnico || '';
        const portalLink = `https://obrasgov.sistema.gov.br/obrasgov/painel/projeto-investimento/${encodeURIComponent(idUnico)}`;

        const text = [
          executorNome && `Empresa/Executor: ${executorNome}`,
          executorCodigo && `CNPJ: ${executorCodigo}`,
          nome && `Obra: ${nome}`,
          descricao && descricao !== nome && `Descrição: ${descricao}`,
          especie && `Espécie: ${especie}`,
          situacao && `Situação: ${situacao}`,
          tipo && `Tipo: ${tipo}`,
          subTipo && `SubTipo: ${subTipo}`,
          uf && `UF: ${uf}`,
          endereco && `Endereço: ${endereco}`,
          cep && `CEP: ${cep}`,
          valor && `Valor Investimento: R$ ${valor}`,
          `URL_FONTE: ${portalLink}`,
        ].filter(Boolean).join("\n");
        if (text) allSearchResults.push(`[OBRASGOV - OBRA PÚBLICA]\n${text}`);
      }
    }

    // ====== SOURCE: CNAE Search via Firecrawl ======
    let cnaeResults: any[] = [];
    if (enabledSources.includes('cnae') && selectedCnaes.length > 0 && !companySearch) {
      for (const uf of estados.slice(0, 2)) {
        const results = await searchByCNAE(selectedCnaes, uf, 5);
        cnaeResults.push(...results);
      }

      // Deep scrape up to 10 companies from CNAE results
      const uniqueCnpjs = [...new Set(cnaeResults.map(r => r.cnpj))].slice(0, 10);
      console.log(`🔬 [CNAE] Deep scraping ${uniqueCnpjs.length} companies...`);
      
      const scrapePromises = uniqueCnpjs.map(async (cnpj) => {
        const scraped = await scrapeCompanyDetails(cnpj);
        if (!scraped) return;

        const notes = buildDeepEnrichmentNotes(scraped);
        const phone = scraped.telefone1 || scraped.telefone2 || '';
        const text = [
          scraped.razao_social && `Razão Social: ${scraped.razao_social}`,
          scraped.nome_fantasia && `Nome Fantasia: ${scraped.nome_fantasia}`,
          `CNPJ: ${cnpj}`,
          scraped.municipio && `Município: ${scraped.municipio}`,
          scraped.uf && `UF: ${scraped.uf}`,
          phone && `Telefone: ${phone}`,
          scraped.email && `Email: ${scraped.email}`,
          scraped.cnae_principal_descricao && `CNAE Principal: ${scraped.cnae_principal_codigo} - ${scraped.cnae_principal_descricao}`,
          scraped.porte && `Porte: ${scraped.porte}`,
          scraped.capital_social && `Capital Social: ${scraped.capital_social}`,
          scraped.situacao_cadastral && `Situação: ${scraped.situacao_cadastral}`,
          scraped.situacao_especial && `⚠️ Situação Especial: ${scraped.situacao_especial}`,
          scraped.simples_nacional !== undefined && `Simples Nacional: ${scraped.simples_nacional ? 'Sim' : 'Não'}`,
          scraped.cnaes_secundarios && `CNAEs Secundários: ${scraped.cnaes_secundarios}`,
          notes && `Detalhes: ${notes}`,
          `URL_FONTE: https://cnpj.biz/${cnpj}`,
        ].filter(Boolean).join("\n");
        allSearchResults.push(`[CNAE - CNPJ.BIZ]\n${text}`);
      });

      await Promise.all(scrapePromises);
    }

    console.log(`📊 Total de resultados coletados: ${allSearchResults.length}`);

    if (allSearchResults.length === 0) {
      console.log("⚠️ Nenhum resultado. Usando critérios base...");
      allSearchResults.push(`[CRITÉRIOS DE BUSCA]
Gere leads realistas nos ramos: ${ramos}
Estados: ${estados.join(", ")}
${cidades.length > 0 ? `Cidades: ${cidades.join(", ")}` : ""}
Tipos: construtoras, metalúrgicas, fábricas de estruturas, serralharias industriais.`);
    }

    // Extract leads with AI (limit input to avoid token overflow)
    const combinedText = allSearchResults.slice(0, 30).join("\n\n---\n\n");
    const generatedLeads = await extractLeadsWithAI(
      combinedText, ramos, estados.join(", "), maxLeads, LOVABLE_API_KEY
    );

    console.log(`🤖 AI extraiu ${generatedLeads.length} leads`);

    // Ensure every lead has source_url
    for (const lead of generatedLeads) {
      if (!lead.source_url) {
        const nameToMatch = (lead.empresa || lead.cliente_nome || '').toLowerCase();
        if (nameToMatch) {
          for (const resultText of allSearchResults) {
            const urlMatch = resultText.match(/URL_FONTE:\s*(https?:\/\/[^\s\n]+)/i);
            if (urlMatch && resultText.toLowerCase().includes(nameToMatch.slice(0, 15))) {
              lead.source_url = urlMatch[1];
              break;
            }
          }
        }
        if (!lead.source_url) {
          if (lead.fonte_dados === 'PNCP') {
            const cnpjSearch = lead.cliente_cnpj?.replace(/\D/g, '') || '';
            lead.source_url = `https://www.google.com/search?q=pncp+${encodeURIComponent(cnpjSearch)}+${encodeURIComponent((lead.empresa || lead.cliente_nome || '').slice(0, 60))}`;
          } else if (lead.fonte_dados === 'ObrasGov') {
            lead.source_url = `https://obrasgov.sistema.gov.br/obrasgov/painel/projeto-investimento?search=${encodeURIComponent((lead.empresa || lead.cliente_nome || '').slice(0, 80))}`;
          } else if (lead.fonte_dados === 'CNAE') {
            const cnpjVal = lead.cliente_cnpj?.replace(/\D/g, '') || '';
            lead.source_url = cnpjVal ? `https://cnpj.biz/${cnpjVal}` : `https://www.google.com/search?q=${encodeURIComponent((lead.empresa || lead.cliente_nome || ''))}`;
          } else {
            lead.source_url = `https://www.google.com/search?q=${encodeURIComponent((lead.empresa || lead.cliente_nome || '') + ' ' + (lead.cidade || '') + ' ' + (lead.estado || ''))}`;
          }
        }
      }
    }

    // Enrich with BrasilAPI + Deep scrape via cnpj.biz (ALL leads with valid CNPJ, limit 10)
    const leadsToEnrich = generatedLeads.filter(
      (l: any) => l.cliente_cnpj && l.cliente_cnpj.replace(/\D/g, "").length === 14
    ).slice(0, 10);

    const enrichPromises = leadsToEnrich.map(async (lead: any) => {
      // 1. BrasilAPI enrichment
      const enriched = await enrichCNPJ(lead.cliente_cnpj);
      if (enriched) {
        lead.cliente_nome = enriched.razao_social || lead.cliente_nome;
        lead.empresa = enriched.nome_fantasia || lead.empresa;

        const phone = formatBrasilAPIPhone(enriched.ddd_telefone_1);
        if (phone) lead.cliente_telefone = phone;
        if (!phone) {
          const phone2 = formatBrasilAPIPhone(enriched.ddd_telefone_2);
          if (phone2) lead.cliente_telefone = phone2;
        }

        if (enriched.email && enriched.email !== 'null') {
          lead.cliente_email = enriched.email;
        }

        lead.cidade = enriched.municipio || lead.cidade;
        lead.estado = enriched.uf || lead.estado;

        const regime = inferRegimeTributario(enriched);
        if (regime) lead.regime_tributario = regime;

        const cnaeInfo = buildCNAEDescription(enriched);
        if (cnaeInfo) {
          lead.ramo_atuacao = enriched.cnae_fiscal_descricao || lead.ramo_atuacao;
        }

        const porte = enriched.porte || '';
        const situacao = enriched.descricao_situacao_cadastral || '';
        const enrichNotes: string[] = [];
        if (porte) enrichNotes.push(`Porte: ${porte}`);
        if (situacao) enrichNotes.push(`Situação: ${situacao}`);
        if (regime) enrichNotes.push(`Regime: ${regime}`);
        enrichNotes.push('Enriquecido via BrasilAPI');

        lead.notes = (lead.notes || "") + " | " + enrichNotes.join(' | ');
      }

      // 2. Deep scrape via cnpj.biz for ALL leads (not just CNAE source)
      const cleanCnpj = lead.cliente_cnpj.replace(/\D/g, "");
      const scraped = await scrapeCompanyDetails(cleanCnpj);
      if (scraped) {
        // Fill missing fields from deep scrape
        if (!lead.cliente_telefone && (scraped.telefone1 || scraped.telefone2)) {
          lead.cliente_telefone = scraped.telefone1 || scraped.telefone2;
        }
        if (!lead.cliente_email && scraped.email) {
          lead.cliente_email = scraped.email;
        }
        if (!lead.empresa && scraped.nome_fantasia) {
          lead.empresa = scraped.nome_fantasia;
        }
        if (!lead.cidade && scraped.municipio) {
          lead.cidade = scraped.municipio;
        }
        if (!lead.estado && scraped.uf) {
          lead.estado = scraped.uf;
        }
        if (!lead.regime_tributario) {
          if (scraped.mei) lead.regime_tributario = 'MEI';
          else if (scraped.simples_nacional) lead.regime_tributario = 'Simples Nacional';
        }

        // Append deep enrichment notes
        const deepNotes = buildDeepEnrichmentNotes(scraped);
        if (deepNotes) {
          lead.notes = (lead.notes || "") + " | " + deepNotes;
        }

        // Always set cnpj.biz link as source_url for easy access
        lead.source_url = `https://cnpj.biz/${cleanCnpj}`;
      }
    });

    await Promise.all(enrichPromises);

    // Insert into staging table
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
        fonte_dados: lead.fonte_dados || "IA",
        source: "Auto Prospecção",
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

    // Update log as success
    const executionDetails = {
      sources: {
        google_queries: googleQueries.length,
        google_results: googleResults.flat().length,
        pncp_results: pncpResults.flat().length,
        obrasgov_results: obrasgovResults.flat().length,
        cnae_results: cnaeResults.length,
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

    // Mark log as failed so it doesn't stay stuck as "running"
    if (logId) {
      try {
        await supabaseAdmin
          .from("lead_prospecting_logs")
          .update({
            status: "error",
            error_message: message,
            finished_at: new Date().toISOString(),
          })
          .eq("id", logId);
      } catch (e) {
        console.error("Failed to update log status:", e);
      }
    }

    return new Response(
      JSON.stringify({ success: false, error: message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
