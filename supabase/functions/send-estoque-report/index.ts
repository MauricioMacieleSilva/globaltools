import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const STORAGE_BASE = `${SUPABASE_URL}/storage/v1/object/public/assets`;

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

// Densidade do aço em kg/mm³
const DENSIDADE_ACO = 0.00000785;

interface EstoqueItem {
  id: string;
  categoria: string;
  descricao: string;
  quantidade: number;
  unidade: string | null;
  tipo_perfil: string | null;
  espessura: number | null;
  largura: number | null;
  comprimento: number | null;
  base: number | null;
  aba1: number | null;
  aba2: number | null;
  ativo: boolean | null;
  localizacao: string | null;
  observacoes: string | null;
}

interface CategoriaStats {
  label: string;
  itens: EstoqueItem[];
  totalItens: number;
  totalPecas: number;
  totalPeso: number;
  totalValor: number;
}

const CATEGORIAS_UNIDADE_KG = ['BOBINAS', 'TELHAS'];
const CATEGORIAS_PRECO_ESPESSURA = ['PERFIS', 'TIRAS', 'CHAPAS', 'BLANK'];

const CATEGORIA_LABELS: Record<string, string> = {
  'ARAMES': 'Arames',
  'BOBINAS': 'Bobinas',
  'PERFIS': 'Perfis',
  'CHAPAS': 'Chapas',
  'TELHAS': 'Telhas',
  'TUBOS': 'Tubos',
  'LAMINADOS': 'Laminados',
  'VERGALHAO': 'Vergalhão',
  'BLANK': 'Blank',
  'TIRAS': 'Tiras',
};

// Category image URLs from storage
const CATEGORIA_IMAGES: Record<string, string> = {
  'ARAMES': `${STORAGE_BASE}/categorias/slitter.png`,
  'BOBINAS': `${STORAGE_BASE}/categorias/bobina.png`,
  'PERFIS': `${STORAGE_BASE}/categorias/perfis.png`,
  'CHAPAS': `${STORAGE_BASE}/categorias/chapa.png`,
  'TELHAS': `${STORAGE_BASE}/categorias/chapa.png`,
  'TUBOS': `${STORAGE_BASE}/categorias/tubos.png`,
  'LAMINADOS': `${STORAGE_BASE}/categorias/chapa.png`,
  'VERGALHAO': `${STORAGE_BASE}/categorias/slitter.png`,
  'BLANK': `${STORAGE_BASE}/categorias/chapa.png`,
  'TIRAS': `${STORAGE_BASE}/categorias/tiras.webp`,
};

// Global Aço brand colors - NO RED
const CATEGORIA_COLORS: Record<string, { bg: string; border: string; headerBg: string; headerColor: string }> = {
  'ARAMES':    { bg: '#f0f4f8', border: '#475569', headerBg: '#475569', headerColor: '#ffffff' },
  'BOBINAS':   { bg: '#eff6ff', border: '#2563eb', headerBg: '#1e40af', headerColor: '#ffffff' },
  'PERFIS':    { bg: '#f0fdf4', border: '#16a34a', headerBg: '#15803d', headerColor: '#ffffff' },
  'CHAPAS':    { bg: '#fff7ed', border: '#ea580c', headerBg: '#c2410c', headerColor: '#ffffff' },
  'TELHAS':    { bg: '#f0f9ff', border: '#0284c7', headerBg: '#0369a1', headerColor: '#ffffff' },
  'TUBOS':     { bg: '#f5f3ff', border: '#7c3aed', headerBg: '#6d28d9', headerColor: '#ffffff' },
  'LAMINADOS': { bg: '#fefce8', border: '#ca8a04', headerBg: '#a16207', headerColor: '#ffffff' },
  'VERGALHAO': { bg: '#f5f5f4', border: '#57534e', headerBg: '#44403c', headerColor: '#ffffff' },
  'BLANK':     { bg: '#f8fafc', border: '#64748b', headerBg: '#475569', headerColor: '#ffffff' },
  'TIRAS':     { bg: '#ecfdf5', border: '#059669', headerBg: '#047857', headerColor: '#ffffff' },
};

const TIPO_PERFIL_LABELS: Record<string, string> = {
  'U': 'Perfil U',
  'Z': 'Perfil Z',
  'L': 'Perfil L',
  'CARTOLA': 'Cartola',
  'U_ENRIJECIDO': 'U Enrijecido',
  'U_SEMI_ENRIJECIDO': 'U Semi Enrijecido',
  'Z_ENRIJECIDO': 'Z Enrijecido',
  'CARTOLA_ENRIJECIDO': 'Cartola Enrijecido',
  'CARTOLA_SEMI_ENRIJECIDO': 'Cartola Semi Enrijecido',
};

const CATEGORIAS_ORDER = ['BOBINAS', 'PERFIS', 'CHAPAS', 'TIRAS', 'BLANK', 'ARAMES', 'TUBOS', 'LAMINADOS', 'VERGALHAO', 'TELHAS'];

function calcularPesoPeca(item: EstoqueItem): number | null {
  const { categoria, espessura, largura, comprimento, base, aba1, aba2, tipo_perfil } = item;
  if (!espessura) return null;

  if (categoria === 'PERFIS' && tipo_perfil) {
    let desenvolvimento = 0;
    switch (tipo_perfil) {
      case 'U': desenvolvimento = (base || 0) + 2 * (aba1 || 0); break;
      case 'L': desenvolvimento = (aba1 || 0) + (aba2 || 0); break;
      case 'CARTOLA': desenvolvimento = (base || 0) + 2 * (aba1 || 0); break;
      case 'U_ENRIJECIDO': case 'U_SEMI_ENRIJECIDO':
        desenvolvimento = (base || 0) + 2 * (aba1 || 0) + 2 * (aba2 || 0); break;
      case 'Z': desenvolvimento = (aba1 || 0) + (base || 0) + (aba2 || 0); break;
      case 'Z_ENRIJECIDO':
        desenvolvimento = (aba1 || 0) + (base || 0) + (aba2 || 0) + 2 * (aba2 || 0); break;
      case 'CARTOLA_ENRIJECIDO': case 'CARTOLA_SEMI_ENRIJECIDO':
        desenvolvimento = (base || 0) + 2 * (aba1 || 0) + 2 * (aba2 || 0); break;
      default: desenvolvimento = largura || 0;
    }
    if (desenvolvimento <= 0 || !comprimento) return null;
    return desenvolvimento * espessura * comprimento * DENSIDADE_ACO;
  }

  if (['CHAPAS', 'BLANK', 'TIRAS', 'LAMINADOS'].includes(categoria)) {
    if (!largura || !comprimento) return null;
    return largura * comprimento * espessura * DENSIDADE_ACO;
  }

  if (categoria === 'TUBOS') {
    if (!comprimento) return null;
    const tipoTubo = tipo_perfil || 'RD';
    switch (tipoTubo) {
      case 'QD': {
        if (!largura) return null;
        const area = 4 * (largura * espessura) - 4 * Math.pow(espessura, 2);
        return area * comprimento * DENSIDADE_ACO;
      }
      case 'RT': {
        if (!largura || !aba1) return null;
        const area = 2 * ((largura * espessura) + (aba1 * espessura)) - 4 * Math.pow(espessura, 2);
        return area * comprimento * DENSIDADE_ACO;
      }
      default: {
        if (!largura) return null;
        const di = largura - 2 * espessura;
        if (di <= 0) return null;
        const area = Math.PI * (Math.pow(largura / 2, 2) - Math.pow(di / 2, 2));
        return area * comprimento * DENSIDADE_ACO;
      }
    }
  }

  if (['ARAMES', 'VERGALHAO'].includes(categoria)) {
    if (!comprimento) return null;
    const raio = espessura / 2;
    return Math.PI * Math.pow(raio, 2) * comprimento * DENSIDADE_ACO;
  }

  return null;
}

function calcularPesoTotal(item: EstoqueItem): number {
  if (CATEGORIAS_UNIDADE_KG.includes(item.categoria)) return item.quantidade;
  const pesoPeca = calcularPesoPeca(item);
  return pesoPeca ? pesoPeca * item.quantidade : 0;
}

function formatWeight(kg: number): string {
  if (kg >= 1000) return `${(kg / 1000).toFixed(2)} t`;
  return `${kg.toFixed(2)} kg`;
}

function formatCurrency(value: number): string {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
}

function getPrecoByEspessura(espessura: number | null, precosMap: Record<number, number>): number {
  if (!espessura || Object.keys(precosMap).length === 0) return 0;
  if (precosMap[espessura]) return precosMap[espessura];
  const espessuras = Object.keys(precosMap).map(Number);
  if (espessuras.length === 0) return 0;
  let closest = espessuras[0];
  let minDiff = Math.abs(closest - espessura);
  for (const esp of espessuras) {
    const diff = Math.abs(esp - espessura);
    if (diff < minDiff) { minDiff = diff; closest = esp; }
  }
  return precosMap[closest] || 0;
}

function generateCategorySection(cat: CategoriaStats, precosMap: Record<number, number>): string {
  const categoria = cat.itens[0]?.categoria || '';
  const colors = CATEGORIA_COLORS[categoria] || CATEGORIA_COLORS['BLANK'];
  const imageUrl = CATEGORIA_IMAGES[categoria] || '';
  const isPrecoCategoria = CATEGORIAS_PRECO_ESPESSURA.includes(categoria);

  const itemRows = cat.itens.map((item, idx) => {
    const peso = calcularPesoTotal(item);
    const isPreco = CATEGORIAS_PRECO_ESPESSURA.includes(item.categoria);
    const precoKg = isPreco ? getPrecoByEspessura(item.espessura, precosMap) : 0;
    const valor = peso * precoKg;
    const bgColor = idx % 2 === 0 ? '#ffffff' : '#f9fafb';
    const tipoPerfil = item.tipo_perfil ? (TIPO_PERFIL_LABELS[item.tipo_perfil] || item.tipo_perfil) : '';

    return `
      <tr style="background:${bgColor};">
        <td style="padding:8px 12px;border-bottom:1px solid #edf2f7;font-size:13px;color:#2d3748;font-weight:500;">${item.descricao}</td>
        ${categoria === 'PERFIS' ? `<td style="padding:8px 12px;border-bottom:1px solid #edf2f7;font-size:12px;color:#4a5568;">${tipoPerfil}</td>` : ''}
        <td style="padding:8px 12px;border-bottom:1px solid #edf2f7;font-size:13px;color:#2d3748;font-weight:600;text-align:center;">${item.quantidade}</td>
        <td style="padding:8px 12px;border-bottom:1px solid #edf2f7;font-size:12px;color:#4a5568;text-align:right;">${formatWeight(peso)}</td>
        ${isPreco ? `<td style="padding:8px 12px;border-bottom:1px solid #edf2f7;font-size:12px;color:#059669;font-weight:600;text-align:right;">${valor > 0 ? formatCurrency(valor) : '-'}</td>` : ''}
        <td style="padding:8px 12px;border-bottom:1px solid #edf2f7;font-size:11px;color:#718096;">${item.localizacao || '-'}</td>
      </tr>
    `;
  }).join('');

  return `
    <!-- ${cat.label} -->
    <div style="margin-bottom:28px;border-radius:10px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.08);border:1px solid ${colors.border}20;">
      <div style="background:${colors.headerBg};padding:14px 20px;">
        <table cellpadding="0" cellspacing="0" width="100%"><tr>
          <td width="48" style="vertical-align:middle;">
            <img src="${imageUrl}" alt="${cat.label}" width="42" height="42" style="border-radius:6px;object-fit:cover;display:block;" />
          </td>
          <td style="padding-left:12px;vertical-align:middle;">
            <h3 style="margin:0;font-size:17px;font-weight:700;color:${colors.headerColor};">${cat.label}</h3>
            <p style="margin:2px 0 0 0;font-size:12px;color:${colors.headerColor};opacity:0.9;">${cat.totalItens} ${cat.totalItens === 1 ? 'item' : 'itens'} • ${cat.totalPecas} ${cat.totalPecas === 1 ? 'peça' : 'peças'} • ${formatWeight(cat.totalPeso)}</p>
          </td>
        </tr></table>
      </div>
      
      <!-- Summary KPIs -->
      <table width="100%" cellpadding="0" cellspacing="0" style="border-bottom:1px solid #e2e8f0;">
        <tr>
          <td style="padding:12px 16px;text-align:center;background:${colors.bg};">
            <div style="font-size:10px;text-transform:uppercase;color:#718096;font-weight:600;letter-spacing:0.5px;">Itens</div>
            <div style="font-size:22px;font-weight:700;color:#2d3748;margin-top:2px;">${cat.totalItens}</div>
          </td>
          <td style="padding:12px 16px;text-align:center;background:${colors.bg};border-left:1px solid #e2e8f0;">
            <div style="font-size:10px;text-transform:uppercase;color:#718096;font-weight:600;letter-spacing:0.5px;">Peças</div>
            <div style="font-size:22px;font-weight:700;color:#2d3748;margin-top:2px;">${cat.totalPecas}</div>
          </td>
          <td style="padding:12px 16px;text-align:center;background:${colors.bg};border-left:1px solid #e2e8f0;">
            <div style="font-size:10px;text-transform:uppercase;color:#718096;font-weight:600;letter-spacing:0.5px;">Peso Total</div>
            <div style="font-size:22px;font-weight:700;color:#2d3748;margin-top:2px;">${formatWeight(cat.totalPeso)}</div>
          </td>
          ${isPrecoCategoria ? `
          <td style="padding:12px 16px;text-align:center;background:${colors.bg};border-left:1px solid #e2e8f0;">
            <div style="font-size:10px;text-transform:uppercase;color:#718096;font-weight:600;letter-spacing:0.5px;">Valor Est.</div>
            <div style="font-size:22px;font-weight:700;color:#059669;margin-top:2px;">${formatCurrency(cat.totalValor)}</div>
          </td>
          ` : ''}
        </tr>
      </table>

      <!-- Items Table -->
      <div style="overflow-x:auto;">
        <table style="width:100%;border-collapse:collapse;">
          <thead>
            <tr style="background:#f7fafc;">
              <th style="padding:10px 12px;text-align:left;font-size:10px;text-transform:uppercase;color:#718096;font-weight:600;letter-spacing:0.5px;">Descrição</th>
              ${categoria === 'PERFIS' ? `<th style="padding:10px 12px;text-align:left;font-size:10px;text-transform:uppercase;color:#718096;font-weight:600;letter-spacing:0.5px;">Tipo</th>` : ''}
              <th style="padding:10px 12px;text-align:center;font-size:10px;text-transform:uppercase;color:#718096;font-weight:600;letter-spacing:0.5px;">Qtd</th>
              <th style="padding:10px 12px;text-align:right;font-size:10px;text-transform:uppercase;color:#718096;font-weight:600;letter-spacing:0.5px;">Peso</th>
              ${isPrecoCategoria ? `<th style="padding:10px 12px;text-align:right;font-size:10px;text-transform:uppercase;color:#718096;font-weight:600;letter-spacing:0.5px;">Valor</th>` : ''}
              <th style="padding:10px 12px;text-align:left;font-size:10px;text-transform:uppercase;color:#718096;font-weight:600;letter-spacing:0.5px;">Local</th>
            </tr>
          </thead>
          <tbody>${itemRows}</tbody>
        </table>
      </div>
    </div>
  `;
}

function generateEstoqueReportHTML(categorias: CategoriaStats[], globalStats: { totalItens: number; totalPeso: number; totalValor: number }): string {
  const now = new Date().toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' });
  const today = new Date().toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' });

  const categoriaSections = categorias.map(cat => generateCategorySection(cat, (cat as any)._precosMap || {})).join('');

  // Category summary cards - rows of 5
  const summaryRows: string[] = [];
  for (let i = 0; i < categorias.length; i += 5) {
    const slice = categorias.slice(i, i + 5);
    const rowCells = slice.map(cat => {
      const catKey = cat.itens[0]?.categoria || '';
      const colors = CATEGORIA_COLORS[catKey] || CATEGORIA_COLORS['BLANK'];
      const imageUrl = CATEGORIA_IMAGES[catKey] || '';
      return `
        <td width="${100 / Math.min(5, categorias.length)}%" style="padding:4px;">
          <div style="background:${colors.bg};border-radius:8px;padding:10px 8px;border-left:3px solid ${colors.border};text-align:center;">
            <img src="${imageUrl}" alt="${cat.label}" width="32" height="32" style="border-radius:4px;object-fit:cover;display:inline-block;" />
            <div style="font-size:11px;font-weight:600;color:#2d3748;margin-top:4px;">${cat.label}</div>
            <div style="font-size:16px;font-weight:700;color:${colors.border};margin-top:2px;">${cat.totalItens}</div>
            <div style="font-size:10px;color:#718096;">${formatWeight(cat.totalPeso)}</div>
          </div>
        </td>
      `;
    }).join('');
    summaryRows.push(`<tr>${rowCells}</tr>`);
  }

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
    </head>
    <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; margin: 0; padding: 20px; background-color: #f5f5f5; color: #2d3748;">
      <div style="max-width: 800px; margin: 0 auto; background: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 12px rgba(0,0,0,0.1);">
        
        <!-- Header - Global Aço brand blue -->
        <div style="background: linear-gradient(135deg, #1e3a5f 0%, #2563eb 100%); color: #ffffff; padding: 30px; text-align: center;">
          <img src="${SUPABASE_URL}/storage/v1/object/public/assets/logo-global-aco.png" alt="Global Aço" style="height: 50px; margin-bottom: 12px;" />
          <h1 style="margin: 0; font-size: 24px; color: #ffffff; font-weight: 700;">📦 Relatório de Estoque</h1>
          <p style="margin: 8px 0 0 0; opacity: 0.95; font-size: 14px; color: #ffffff;">${today}</p>
        </div>

        <div style="padding: 30px;">
          
          <!-- Global KPIs: 3 cards (no Total de Peças) -->
          <h2 style="font-size: 18px; font-weight: 600; color: #2d3748; margin: 0 0 15px 0; border-bottom: 2px solid #e2e8f0; padding-bottom: 8px;">📊 Resumo Geral</h2>
          
          <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom: 24px;">
            <tr>
              <td width="33%" style="padding: 6px;">
                <div style="background: #f8f9fa; border-radius: 8px; padding: 16px; border-left: 4px solid #2563eb; text-align: center;">
                  <div style="font-size: 11px; text-transform: uppercase; color: #718096; font-weight: 600; margin-bottom: 4px;">📦 Total de Itens</div>
                  <div style="font-size: 28px; font-weight: 700; color: #2d3748;">${globalStats.totalItens}</div>
                </div>
              </td>
              <td width="33%" style="padding: 6px;">
                <div style="background: #f8f9fa; border-radius: 8px; padding: 16px; border-left: 4px solid #f59e0b; text-align: center;">
                  <div style="font-size: 11px; text-transform: uppercase; color: #718096; font-weight: 600; margin-bottom: 4px;">⚖️ Peso Total</div>
                  <div style="font-size: 28px; font-weight: 700; color: #2d3748;">${formatWeight(globalStats.totalPeso)}</div>
                </div>
              </td>
              <td width="33%" style="padding: 6px;">
                <div style="background: #f8f9fa; border-radius: 8px; padding: 16px; border-left: 4px solid #10b981; text-align: center;">
                  <div style="font-size: 11px; text-transform: uppercase; color: #718096; font-weight: 600; margin-bottom: 4px;">💰 Valor Estimado</div>
                  <div style="font-size: 22px; font-weight: 700; color: #059669;">${formatCurrency(globalStats.totalValor)}</div>
                </div>
              </td>
            </tr>
          </table>

          <!-- Category Summary -->
          <h2 style="font-size: 18px; font-weight: 600; color: #2d3748; margin: 25px 0 15px 0; border-bottom: 2px solid #e2e8f0; padding-bottom: 8px;">🗂️ Categorias em Estoque</h2>
          <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom: 30px;">
            ${summaryRows.join('')}
          </table>

          <!-- Category Detail Sections -->
          ${categoriaSections}

          <!-- Analysis -->
          <div style="background: #eff6ff; padding: 20px; border-radius: 8px; margin-top: 24px; border-left: 4px solid #2563eb;">
            <h3 style="margin: 0 0 12px 0; font-size: 16px; color: #2d3748;">💡 Resumo Rápido</h3>
            <p style="margin: 6px 0; color: #4a5568; font-size: 14px; line-height: 1.6;">
              • Estoque com <strong>${globalStats.totalItens}</strong> itens em <strong>${categorias.length}</strong> categorias
            </p>
            <p style="margin: 6px 0; color: #4a5568; font-size: 14px; line-height: 1.6;">
              • Peso total armazenado: <strong>${formatWeight(globalStats.totalPeso)}</strong>
            </p>
            ${globalStats.totalValor > 0 ? `
            <p style="margin: 6px 0; color: #4a5568; font-size: 14px; line-height: 1.6;">
              • Valor estimado em estoque: <strong>${formatCurrency(globalStats.totalValor)}</strong>
            </p>
            ` : ''}
            ${categorias.map(c => `<p style="margin: 4px 0; color: #4a5568; font-size: 13px; line-height: 1.5;">
              ▸ <strong>${c.label}</strong>: ${c.totalItens} itens, ${c.totalPecas} peças, ${formatWeight(c.totalPeso)}
            </p>`).join('')}
          </div>
        </div>

        <!-- Footer -->
        <div style="background: #f7fafc; padding: 20px; text-align: center; font-size: 13px; color: #718096; border-top: 1px solid #e2e8f0;">
          <p style="margin: 5px 0;">📅 Dados extraídos em: ${now}</p>
          <p style="margin: 5px 0;">Fonte de dados: Sistema de Estoque - Global Aço</p>
        </div>
      </div>
    </body>
    </html>
  `;
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // Auth check
    const authHeader = req.headers.get('Authorization');
    if (authHeader) {
      const token = authHeader.replace('Bearer ', '');
      const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token);
      if (authError || !user) {
        return new Response(JSON.stringify({ error: 'Não autorizado' }), {
          status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }
    }

    console.log('📦 [send-estoque-report] Iniciando...');

    // Fetch estoque items
    const { data: estoqueItems, error: estoqueError } = await supabaseAdmin
      .from('estoque_itens')
      .select('*')
      .eq('ativo', true)
      .order('categoria')
      .order('descricao');

    if (estoqueError) throw new Error(estoqueError.message);

    // Fetch perfil precos for value calculation
    const { data: perfilPrecos } = await supabaseAdmin
      .from('perfil_precos')
      .select('espessura, preco_kg, tipo');

    const precosMap: Record<number, number> = {};
    (perfilPrecos || []).forEach((p: any) => {
      if (!precosMap[p.espessura] || p.tipo === 'padrao') {
        precosMap[p.espessura] = p.preco_kg;
      }
    });

    // Group by category and filter empty ones
    const categoriasMap = new Map<string, EstoqueItem[]>();
    (estoqueItems || []).forEach((item: any) => {
      if (!categoriasMap.has(item.categoria)) {
        categoriasMap.set(item.categoria, []);
      }
      categoriasMap.get(item.categoria)!.push(item);
    });

    // Build category stats, only non-empty, in order
    const categorias: (CategoriaStats & { _precosMap?: Record<number, number> })[] = [];
    let globalTotalItens = 0;
    let globalTotalPeso = 0;
    let globalTotalValor = 0;

    for (const catKey of CATEGORIAS_ORDER) {
      const items = categoriasMap.get(catKey);
      if (!items || items.length === 0) continue;

      let totalPeso = 0;
      let totalPecas = 0;
      let totalValor = 0;

      items.forEach(item => {
        totalPecas += item.quantidade;
        const peso = calcularPesoTotal(item);
        totalPeso += peso;

        if (CATEGORIAS_PRECO_ESPESSURA.includes(item.categoria)) {
          const precoKg = getPrecoByEspessura(item.espessura, precosMap);
          totalValor += peso * precoKg;
        }
      });

      const cat: CategoriaStats & { _precosMap?: Record<number, number> } = {
        label: CATEGORIA_LABELS[catKey] || catKey,
        itens: items,
        totalItens: items.length,
        totalPecas,
        totalPeso,
        totalValor,
        _precosMap: precosMap,
      };

      categorias.push(cat);
      globalTotalItens += items.length;
      globalTotalPeso += totalPeso;
      globalTotalValor += totalValor;
    }

    if (categorias.length === 0) {
      return new Response(JSON.stringify({ success: false, message: 'Nenhum item em estoque para gerar relatório' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const htmlContent = generateEstoqueReportHTML(categorias, {
      totalItens: globalTotalItens,
      totalPeso: globalTotalPeso,
      totalValor: globalTotalValor,
    });

    // Get recipients
    const { data: configs } = await supabaseAdmin.from('email_reports_config').select('email, full_name').eq('is_active', true);
    if (!configs || configs.length === 0) {
      return new Response(JSON.stringify({ success: true, message: 'Nenhum destinatário configurado' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const uniqueEmails = [...new Set(configs.map(c => c.email))];
    const todayFmt = new Date().toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' });
    const subject = `📦 Relatório de Estoque - ${todayFmt}`;
    const todayDate = new Date().toISOString().split('T')[0];

    const results = [];
    for (const email of uniqueEmails) {
      try {
        const res = await fetch("https://api.resend.com/emails", {
          method: "POST",
          headers: { "Content-Type": "application/json", "Authorization": `Bearer ${RESEND_API_KEY}` },
          body: JSON.stringify({
            from: "Estoque Global Aço <onboarding@resend.dev>",
            to: [email],
            subject,
            html: htmlContent,
          }),
        });
        const data = await res.json();
        const success = res.ok;
        results.push({ email, success, data });
        console.log(`📧 ${success ? '✅' : '❌'} ${email}`);

        try {
          await supabaseAdmin.from('email_reports_log').insert({
            config_id: '00000000-0000-0000-0000-000000000002',
            email,
            report_date: todayDate,
            report_type: 'estoque',
            status: success ? 'success' : 'failed',
            error_message: success ? null : JSON.stringify(data),
            is_scheduled: false,
          });
        } catch (logErr) {
          console.error('⚠️ Erro ao registrar log:', logErr);
        }
      } catch (error: any) {
        results.push({ email, success: false, error: error.message });
        try {
          await supabaseAdmin.from('email_reports_log').insert({
            config_id: '00000000-0000-0000-0000-000000000002',
            email,
            report_date: todayDate,
            report_type: 'estoque',
            status: 'failed',
            error_message: error.message,
            is_scheduled: false,
          });
        } catch (logErr) {
          console.error('⚠️ Erro ao registrar log:', logErr);
        }
      }
    }

    const successCount = results.filter(r => r.success).length;
    console.log(`📦 [send-estoque-report] Concluído: ${successCount}/${uniqueEmails.length} enviados`);

    return new Response(JSON.stringify({
      success: true,
      totalItens: globalTotalItens,
      categorias: categorias.length,
      enviados: successCount,
      total: uniqueEmails.length,
      results,
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error: any) {
    console.error('❌ [send-estoque-report] Erro:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
};

serve(handler);
