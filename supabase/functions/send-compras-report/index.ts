import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const SHEET_ID = "13F5NcT8Z6quDcW4OmoG8MOhHCRT1W9nWXmNGX839MGo";
const PROD_GID = "407047369";
const COMERCIAL_GID = "1086211541";
const DENSIDADE_ACO = 0.000008;

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

// ---------------- Matching helpers (mirror src/lib/material-matching.ts) ----------------
const NON_THICKNESS = ['TUBO', 'CANTONEIRA', 'VIGA', 'BARRA', 'TELA', 'VERGALH', 'LAMINAD', 'TB '];
function shouldSummarize(desc: string): boolean {
  const u = (desc || '').toUpperCase();
  return !NON_THICKNESS.some(c => u.includes(c)) && !u.startsWith('TB ');
}
function extractThickness(desc: string): string | null {
  const d = (desc || '').toUpperCase().trim();
  const patterns = [
    /BGL\s+(\d+[.,]\d+)/i,
    /CH\s*#\s*(\d+[.,]\d+)\s*MM/i,
    /SLITTER\s+(\d+[.,]\d+)\s*MM/i,
    /CHAPA\s+(\d+[.,]\d+)\s*X/i,
    /TP\d+\s+(\d+[.,]\d+)/i,
    /(\d+[.,]\d+)\s*MM/i,
    /\b(\d+[.,]\d+)\b/,
  ];
  for (const re of patterns) {
    const m = d.match(re);
    if (m) return m[1].replace('.', ',');
  }
  return null;
}
function categorizeForStock(desc: string): string[] {
  const d = (desc || '').toUpperCase();
  if (/\bPERFIL\b.*\bCH\b/.test(d) || /\bPERFIL\s+CH/.test(d)) return ['CHAPAS', 'BOBINAS'];
  if (/\bBLANK\b/.test(d)) return ['CHAPAS'];
  if (/\bSLITTER\b/.test(d)) return ['BOBINAS', 'TIRAS'];
  if (/^BGL\b/.test(d) || /^BZN\b/.test(d) || /\bBOBINA\b/.test(d)) return ['BOBINAS'];
  if (/\bCHAPA\b/.test(d)) return ['CHAPAS'];
  if (/\bTELHA\b/.test(d) || /\bTP\d+/.test(d) || /\bCUMEEIRA/.test(d)) return ['BOBINAS', 'TIRAS', 'CHAPAS'];
  if (/CH\b/.test(d) && /\d+[.,]\d+/.test(d)) return ['CHAPAS', 'BOBINAS'];
  return [];
}

// ---------------- Color / family / equivalent helpers (mirror lib) ----------------
const COLOR_KEYWORDS = ['BRANCA','BRANCO','PRETA','PRETO','CINZA','AZUL','VERMELHA','VERMELHO','AMARELA','AMARELO','VERDE','BEGE','MARROM','GALVALUME','GALVANIZADA','GALVANIZADO','GALV','ZINCADA','ZINCADO','NATURAL','ZAR'];
function extractColor(desc: string): string | null {
  if (!desc) return null;
  const u = desc.toUpperCase();
  let ralM = u.match(/RAL\s*(\d{3,4})/);
  if (!ralM) {
    const m2 = u.match(/\b(BRANC[AO]|PRET[AO]|CINZA|AZUL|VERMELH[AO]|AMAREL[AO]|VERDE|BEGE|MARROM)\s+(\d{4})\b/);
    if (m2) ralM = [m2[0], m2[2]] as RegExpMatchArray;
  }
  const colorWord = /\bPP\s+BR\b/.test(u)
    ? 'BRANCA'
    : COLOR_KEYWORDS.find(c => new RegExp(`\\b${c}\\b`).test(u)) || null;
  const hasPP = /\bPP\b/.test(u);
  const parts: string[] = [];
  if (hasPP) parts.push('PP');
  if (colorWord) parts.push(colorWord);
  if (ralM) parts.push(`RAL ${ralM[1]}`);
  return parts.length ? parts.join(' ') : null;
}
function normThickKey(v: any): string {
  if (v === null || v === undefined || v === '') return '';
  const n = typeof v === 'number' ? v : parseFloat(String(v).replace(',', '.'));
  if (!isFinite(n) || isNaN(n)) return '';
  return n.toFixed(2);
}
function displayThick(canonical: string): string { return canonical.replace('.', ','); }
const AUTO_EQ: Array<[string, string]> = [['0.50','0.47'], ['0.43','0.40']];
function autoEqThicknesses(canon: string): string[] {
  const out: string[] = [];
  for (const [a,b] of AUTO_EQ) {
    if (canon === a) out.push(b);
    else if (canon === b) out.push(a);
  }
  return out;
}
function isPPColor(cor: string | null): boolean {
  if (!cor) return false;
  return /\bPP\b/.test(cor.toUpperCase());
}
function colorMatchesForStock(needCor: string | null, stockCor: string | null): boolean {
  const needPP = isPPColor(needCor);
  const stockPP = isPPColor(stockCor);
  if (needPP || stockPP) return needPP && stockPP && needCor === stockCor;
  if (!needCor) return true;
  if (!stockCor) return true;
  return needCor === stockCor;
}

// ---------------- Estoque peso ----------------
const CATEGORIAS_KG = ['BOBINAS'];
function calcularPesoPeca(item: any): number | null {
  const { categoria, espessura, largura, comprimento, base, aba1, aba2, tipo_perfil } = item;
  if (!espessura) return null;
  if (categoria === 'PERFIS' && tipo_perfil) {
    let dev = 0;
    switch (tipo_perfil) {
      case 'U': case 'Z': dev = (aba1 || 0) + (base || 0) + (aba2 || 0) - 4 * espessura; break;
      case 'L': dev = (aba1 || 0) + ((aba2 || 0) || (base || 0)) - 2 * espessura; break;
      case 'CARTOLA': dev = (base || 0) + 2 * (aba1 || 0) - 4 * espessura; break;
      case 'U_ENRIJECIDO': case 'U_SEMI_ENRIJECIDO': case 'Z_ENRIJECIDO':
      case 'CARTOLA_ENRIJECIDO': case 'CARTOLA_SEMI_ENRIJECIDO':
        dev = (base || 0) + 2 * (aba1 || 0) + 2 * (aba2 || 0) - 8 * espessura; break;
      default: dev = largura || 0;
    }
    if (dev <= 0 || !comprimento) return null;
    return dev * espessura * comprimento * DENSIDADE_ACO;
  }
  if (categoria === 'TELHAS') {
    if (!comprimento) return null;
    return 1000 * comprimento * espessura * DENSIDADE_ACO;
  }
  if (['CHAPAS', 'BLANK', 'TIRAS', 'LAMINADOS'].includes(categoria)) {
    if (!largura || !comprimento) return null;
    return largura * comprimento * espessura * DENSIDADE_ACO;
  }
  return null;
}
function calcularPesoTotal(item: any): number {
  if (CATEGORIAS_KG.includes(item.categoria)) return item.quantidade;
  const p = calcularPesoPeca(item);
  return p ? p * item.quantidade : 0;
}

// ---------------- CSV parser ----------------
function parseCSV(text: string): string[][] {
  const lines = text.split(/\r?\n/).filter(l => l.length > 0);
  if (!lines.length) return [];
  const headerLine = lines[0];
  const delimiter = (headerLine.match(/;/g) || []).length > (headerLine.match(/,/g) || []).length ? ';' : ',';
  const result: string[][] = [];
  for (const line of lines) {
    const row: string[] = [];
    let cur = '', inQ = false;
    for (let i = 0; i < line.length; i++) {
      const c = line[i];
      if (c === '"') {
        if (inQ && line[i + 1] === '"') { cur += '"'; i++; }
        else inQ = !inQ;
      } else if (c === delimiter && !inQ) { row.push(cur.trim()); cur = ''; }
      else cur += c;
    }
    row.push(cur.trim());
    result.push(row);
  }
  return result;
}
const norm = (v: string) => (v || '').trim().replace(/\s+/g, ' ');
const normCmp = (v: string) => (v || '').toString().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/\s+/g, ' ').trim().toUpperCase();
const normStatus = (v: string) => normCmp(v).replace(/\s/g, '');
const normUnit = (u: string) => { const n = (u || '').trim().toUpperCase(); if (n === 'KG' || n === 'KILO') return 'KG'; if (n === 'T' || n === 'TON') return 'T'; return n; };

interface Material { descricaomat: string; peso_kg: number; qtd: number; un: string; }
interface Op { situacao_op: string; materiais: Material[]; }
interface Pedido { numero_pedido: string; cli_nomef: string; prazo_pcp: string; status: string; ops: Op[]; }

function calcStatus(prazo: string, ops: Op[]): string {
  if (!ops.length) return 'PROGRAMAR';
  const finalizadas = ops.filter(o => normStatus(o.situacao_op).includes('FINALIZADA')).length;
  if (finalizadas === ops.length) return 'FINALIZADO';
  const isDelayed = prazo && (() => { const d = new Date(prazo); return !isNaN(d.getTime()) && new Date() > d; })();
  if (finalizadas > 0) return isDelayed ? 'ATRASO' : 'PARCIALMENTE_FINALIZADO';
  if (!prazo) return 'PROGRAMAR';
  const d = new Date(prazo); if (isNaN(d.getTime())) return 'PROGRAMAR';
  return new Date() > d ? 'ATRASO' : 'NO_PRAZO';
}

async function loadProducao(excluded: Set<string>, hidden: Set<string>): Promise<Pedido[]> {
  const ts = Date.now();
  const prodUrl = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/export?format=csv&gid=${PROD_GID}&timestamp=${ts}`;
  const comUrl = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/export?format=csv&gid=${COMERCIAL_GID}&timestamp=${ts}`;
  const [res, cres] = await Promise.all([
    fetch(prodUrl, { headers: { 'Cache-Control': 'no-cache' } }),
    fetch(comUrl, { headers: { 'Cache-Control': 'no-cache' } }),
  ]);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const rows = parseCSV(await res.text());
  if (rows.length < 2) return [];

  // Commercial peso map (granular and fallback)
  const pesoMap = new Map<string, number>();
  const pesoFb = new Map<string, number[]>();
  if (cres.ok) {
    const crows = parseCSV(await cres.text());
    for (let i = 1; i < crows.length; i++) {
      const r = crows[i];
      if (r.length < 20) continue;
      const pedido = norm(r[1]);
      const dm = normCmp(r[9]);
      const obs = normCmp(r[10]);
      const ps = norm(r[19]);
      const peso = ps.includes(',') ? parseFloat(ps.replace(/\./g, '').replace(',', '.')) || 0 : parseFloat(ps) || 0;
      if (pedido && dm && peso > 0) {
        const k = `${pedido}_${dm}_${obs}`;
        pesoMap.set(k, (pesoMap.get(k) || 0) + peso);
        const fk = `${pedido}_${dm}`;
        if (!pesoFb.has(fk)) pesoFb.set(fk, []);
        pesoFb.get(fk)!.push(peso);
      }
    }
  }

  const idx = { pedido: 2, situacao: 4, cli_nomef: 7, descricaomat: 10, observacao: 11, qtd_venda: 12, un: 13, numero_op: 19, situacao_op: 20, prazo: 1 };
  const pedidosMap = new Map<string, { p: Pedido; ops: Map<string, Op> }>();
  const fbPos = new Map<string, number>();

  for (let i = 1; i < rows.length; i++) {
    const r = rows[i];
    const pedido = norm(r[idx.pedido] ?? '');
    const situacao = norm(r[idx.situacao] ?? '');
    const situacao_op = norm(r[idx.situacao_op] ?? '');
    const cli = norm(r[idx.cli_nomef] ?? '');
    const desc = norm(r[idx.descricaomat] ?? '');
    const obs = norm(r[idx.observacao] ?? '');
    const qtdStr = norm(r[idx.qtd_venda] ?? '');
    const un = norm(r[idx.un] ?? '');
    const prazoStr = norm(r[idx.prazo] ?? '');
    const numeroOp = norm(r[idx.numero_op] ?? '');

    if (!pedido || !cli || !desc) continue;
    if (excluded.has(pedido) || hidden.has(pedido)) continue;
    const sopN = normCmp(situacao_op);
    const sN = normCmp(situacao);
    if (sopN !== 'PROGRAMACAO' && sopN !== 'FINALIZADA' && sopN !== '' && sopN !== 'A PROGRAMAR') continue;
    if (!(sN === 'EMITIDA' || sN === 'PEDIDO')) continue;

    const qtd = qtdStr.includes(',') ? parseFloat(qtdStr.replace(/\./g, '').replace(',', '.')) || 0 : parseFloat(qtdStr) || 0;
    const u = normUnit(un);

    const kG = `${pedido}_${normCmp(desc)}_${normCmp(obs)}`;
    const kF = `${pedido}_${normCmp(desc)}`;
    let pesoKg = pesoMap.get(kG) || 0;
    if (pesoKg === 0) {
      const fe = pesoFb.get(kF);
      if (fe && fe.length) {
        const pos = fbPos.get(kF) || 0;
        if (pos < fe.length) pesoKg = fe[pos];
        fbPos.set(kF, pos + 1);
      }
    }
    if (pesoKg === 0 && u === 'KG') pesoKg = qtd;

    let prazo = '';
    if (prazoStr) {
      try {
        const s = prazoStr.includes('/') ? prazoStr.split('/').reverse().join('-') : prazoStr;
        const d = new Date(s);
        if (!isNaN(d.getTime())) prazo = d.toISOString().split('T')[0];
      } catch {}
    }

    if (!pedidosMap.has(pedido)) {
      pedidosMap.set(pedido, {
        p: { numero_pedido: pedido, cli_nomef: cli, prazo_pcp: prazo, status: '', ops: [] },
        ops: new Map(),
      });
    }
    const pd = pedidosMap.get(pedido)!;
    const okey = numeroOp || 'SEM_OP';
    if (!pd.ops.has(okey)) pd.ops.set(okey, { situacao_op, materiais: [] });
    pd.ops.get(okey)!.materiais.push({ descricaomat: desc, peso_kg: pesoKg, qtd, un: u });
  }

  const out: Pedido[] = [];
  for (const { p, ops } of pedidosMap.values()) {
    p.ops = Array.from(ops.values());
    p.status = calcStatus(p.prazo_pcp, p.ops);
    out.push(p);
  }
  return out;
}

// ---------------- Compute necessidade ----------------
type Urgencia = 'atraso' | 'prazo' | 'programar';
interface PedImp { numero_pedido: string; cliente: string; prazo: string; pesoKg: number; status: string; }
interface Falta {
  categorias: string[];
  espessura: string;       // display "0,50"
  espessuraNum: number;
  cor: string | null;
  descricao: string;
  isOutro: boolean;
  necessario: number;
  estoque: number;
  falta: number;
  clientes: string[];
  pedidos: PedImp[];
  urgencia: Urgencia;
}

function computeFaltas(pedidos: Pedido[], estoque: any[]): Falta[] {
  // Estoque indexado por (categoria|espKey) com lista de pacotes {peso, cor}.
  type StockEntry = { peso: number; cor: string | null };
  const stockIndex = new Map<string, StockEntry[]>();
  const addStock = (cat: string, espKey: string, peso: number, cor: string | null) => {
    const k = `${cat}|${espKey}`;
    const arr = stockIndex.get(k) || [];
    arr.push({ peso, cor });
    stockIndex.set(k, arr);
  };
  estoque.forEach((it: any) => {
    if (!it.ativo || !it.espessura) return;
    if (it.segregado) return;
    const p = calcularPesoTotal(it);
    if (!p || p <= 0) return;
    const cor = extractColor(it.descricao || '');
    const espKey = normThickKey(it.espessura);
    if (!espKey) return;
    addStock(it.categoria, espKey, p, cor);
    // Auto-equivalentes
    autoEqThicknesses(espKey).forEach(ek => addStock(it.categoria, ek, p, cor));
    // Equivalentes manuais
    (it.espessuras_equivalentes || []).forEach((eq: any) => {
      const ek = normThickKey(eq);
      if (ek && ek !== espKey) addStock(it.categoria, ek, p, cor);
    });
  });

  const urg = (s: string): Urgencia => s === 'ATRASO' ? 'atraso' : s === 'PROGRAMAR' ? 'programar' : 'prazo';
  const maxU = (a: Urgencia, b: Urgencia): Urgencia => {
    const o: Record<Urgencia, number> = { atraso: 3, prazo: 2, programar: 1 };
    return o[a] >= o[b] ? a : b;
  };

  type Bucket = {
    categorias: string[];
    espessura: string;
    espessuraKey: string;
    cor: string | null;
    descricao: string;
    isOutro: boolean;
    necessario: number;
    pedidos: Map<string, PedImp>;
    urgencia: Urgencia;
  };
  const buckets = new Map<string, Bucket>();
  const ativos = pedidos.filter(p => p.status !== 'FINALIZADO');

  ativos.forEach(pedido => {
    const pu = urg(pedido.status);
    pedido.ops.forEach(op => {
      const s = (op.situacao_op || '').toUpperCase();
      if (s === 'FINALIZADA' || s === 'CONCLUÍDO' || s === 'CONCLUIDO') return;
      op.materiais.forEach(m => {
        const peso = m.peso_kg || m.qtd || 0;
        if (peso <= 0) return;

        let bk: string;
        let categorias: string[] = [];
        let espDisp = '';
        let espKey = '';
        let cor: string | null = null;
        let descricao = '';
        let isOutro = false;

        const espThick = shouldSummarize(m.descricaomat) ? extractThickness(m.descricaomat) : null;
        const cats = espThick ? categorizeForStock(m.descricaomat) : [];
        if (espThick && cats.length > 0) {
          categorias = cats;
          espDisp = espThick;
          espKey = normThickKey(espThick);
          cor = extractColor(m.descricaomat);
          descricao = cor ? `${espDisp} mm • ${cor}` : `${espDisp} mm`;
          bk = `T|${espKey}|${cor || ''}`;
        } else {
          isOutro = true;
          descricao = m.descricaomat;
          bk = `O|${m.descricaomat}`;
        }

        let b = buckets.get(bk);
        if (!b) {
          b = { categorias, espessura: espDisp, espessuraKey: espKey, cor, descricao, isOutro, necessario: 0, pedidos: new Map(), urgencia: pu };
          buckets.set(bk, b);
        } else if (!isOutro) {
          const merged = new Set<string>([...b.categorias, ...categorias]);
          b.categorias = Array.from(merged);
        }
        b.necessario += peso;
        b.urgencia = maxU(b.urgencia, pu);
        const pk = pedido.numero_pedido;
        const ex = b.pedidos.get(pk);
        if (ex) ex.pesoKg += peso;
        else b.pedidos.set(pk, { numero_pedido: pedido.numero_pedido, cliente: pedido.cli_nomef, prazo: pedido.prazo_pcp, pesoKg: peso, status: pedido.status });
      });
    });
  });

  const out: Falta[] = [];
  buckets.forEach(b => {
    let est = 0;
    if (!b.isOutro && b.espessuraKey) {
      b.categorias.forEach(cat => {
        const entries = stockIndex.get(`${cat}|${b.espessuraKey}`) || [];
        entries.forEach(e => {
          if (colorMatchesForStock(b.cor, e.cor)) est += e.peso;
        });
      });
    }
    const f = b.necessario - est;
    if (f <= 0) return;
    const peds = Array.from(b.pedidos.values()).sort((a, c) => (a.prazo || '9999').localeCompare(c.prazo || '9999'));
    out.push({
      categorias: b.categorias,
      espessura: b.espessura,
      espessuraNum: parseFloat((b.espessura || '0').replace(',', '.')) || 0,
      cor: b.cor,
      descricao: b.descricao,
      isOutro: b.isOutro,
      necessario: b.necessario,
      estoque: est,
      falta: f,
      clientes: Array.from(new Set(peds.map(p => p.cliente))),
      pedidos: peds,
      urgencia: b.urgencia,
    });
  });

  // Ordenação: por espessura crescente, "Outros" no final
  out.sort((a, b) => {
    if (a.isOutro !== b.isOutro) return a.isOutro ? 1 : -1;
    if (a.isOutro && b.isOutro) return a.descricao.localeCompare(b.descricao);
    const d = a.espessuraNum - b.espessuraNum;
    if (d !== 0) return d;
    return (a.cor || '').localeCompare(b.cor || '');
  });
  return out;
}

// ---------------- HTML ----------------
const fmtKg = (kg: number) => kg >= 1000 ? `${(kg / 1000).toLocaleString('pt-BR', { maximumFractionDigits: 2 })} t` : `${Math.round(kg).toLocaleString('pt-BR')} KG`;
const fmtDate = (d: string) => { if (!d) return '—'; try { const x = new Date(d); return isNaN(x.getTime()) ? d : x.toLocaleDateString('pt-BR'); } catch { return d; } };
function urgBadge(u: Urgencia): string {
  if (u === 'atraso') return `<span style="display:inline-block;padding:3px 10px;border-radius:12px;font-size:11px;font-weight:700;color:#991b1b;background:#fee2e2;">🔴 ATRASO</span>`;
  if (u === 'prazo') return `<span style="display:inline-block;padding:3px 10px;border-radius:12px;font-size:11px;font-weight:700;color:#9a3412;background:#fed7aa;">🟠 PRAZO</span>`;
  return `<span style="display:inline-block;padding:3px 10px;border-radius:12px;font-size:11px;font-weight:700;color:#92400e;background:#fef3c7;">🟡 PROGRAMAR</span>`;
}

function buildHTML(faltas: Falta[]): string {
  const today = new Date().toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' });
  const now = new Date().toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' });

  const totalPeso = faltas.reduce((s, f) => s + f.falta, 0);
  const clientesSet = new Set<string>(); const atrSet = new Set<string>();
  faltas.forEach(f => { f.clientes.forEach(c => clientesSet.add(c)); f.pedidos.forEach(p => { if (p.status === 'ATRASO') atrSet.add(p.numero_pedido); }); });

  const rowsHtml = faltas.map((f, i) => {
    const bg = i % 2 === 0 ? '#ffffff' : '#f9fafb';
    const material = f.isOutro
      ? `<span style="font-size:12px;color:#2d3748;">${f.descricao}</span>`
      : `<span style="font-family:ui-monospace,SFMono-Regular,Menlo,monospace;font-size:13px;font-weight:700;color:#2d3748;">${f.espessura} mm</span>${f.cor ? `<span style="margin-left:6px;font-size:11px;color:#718096;">• ${f.cor}</span>` : ''}`;
    const clientesPedidos = f.pedidos.slice(0, 4)
      .map(p => `${p.cliente} <span style="color:#718096;">(${p.numero_pedido})</span>`)
      .join(', ') + (f.pedidos.length > 4 ? ` <span style="color:#718096;">+${f.pedidos.length - 4}</span>` : '');
    return `<tr style="background:${bg};">
      <td style="padding:10px 12px;border-bottom:1px solid #edf2f7;">${material}</td>
      <td style="padding:10px 12px;border-bottom:1px solid #edf2f7;font-size:12px;text-align:right;color:#4a5568;">${fmtKg(f.necessario)}</td>
      <td style="padding:10px 12px;border-bottom:1px solid #edf2f7;font-size:12px;text-align:right;color:#718096;">${fmtKg(f.estoque)}</td>
      <td style="padding:10px 12px;border-bottom:1px solid #edf2f7;font-size:13px;text-align:right;font-weight:700;color:#b91c1c;">${fmtKg(f.falta)}</td>
      <td style="padding:10px 12px;border-bottom:1px solid #edf2f7;font-size:11px;color:#2d3748;">${clientesPedidos}</td>
      <td style="padding:10px 12px;border-bottom:1px solid #edf2f7;text-align:center;">${urgBadge(f.urgencia)}</td>
    </tr>`;
  }).join('');

  const mainTable = faltas.length === 0 ? '' : `
    <div style="margin-bottom:24px;border-radius:10px;overflow:hidden;border:1px solid #e2e8f0;box-shadow:0 2px 8px rgba(0,0,0,0.06);">
      <table style="width:100%;border-collapse:collapse;">
        <thead><tr style="background:#f7fafc;">
          <th style="padding:10px 12px;text-align:left;font-size:10px;text-transform:uppercase;color:#718096;font-weight:600;">Material</th>
          <th style="padding:10px 12px;text-align:right;font-size:10px;text-transform:uppercase;color:#718096;font-weight:600;">Necessário</th>
          <th style="padding:10px 12px;text-align:right;font-size:10px;text-transform:uppercase;color:#718096;font-weight:600;">Em Estoque</th>
          <th style="padding:10px 12px;text-align:right;font-size:10px;text-transform:uppercase;color:#718096;font-weight:600;">A Comprar</th>
          <th style="padding:10px 12px;text-align:left;font-size:10px;text-transform:uppercase;color:#718096;font-weight:600;">Clientes (Pedido)</th>
          <th style="padding:10px 12px;text-align:center;font-size:10px;text-transform:uppercase;color:#718096;font-weight:600;">Urgência</th>
        </tr></thead>
        <tbody>${rowsHtml}</tbody>
      </table>
    </div>`;

  const emptyState = faltas.length === 0 ? `
    <div style="padding:40px;text-align:center;background:#f0fdf4;border-radius:10px;border:1px solid #16a34a;">
      <div style="font-size:48px;">✅</div>
      <h2 style="margin:12px 0 6px;color:#15803d;">Tudo certo!</h2>
      <p style="color:#4a5568;margin:0;">Nenhuma necessidade de compra identificada — o estoque atende os pedidos em produção.</p>
    </div>` : '';

  return `<!DOCTYPE html><html><head><meta charset="UTF-8"></head>
  <body style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;margin:0;padding:20px;background:#f5f5f5;color:#2d3748;">
    <div style="max-width:900px;margin:0 auto;background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 4px 12px rgba(0,0,0,0.1);">
      <div style="background:linear-gradient(135deg,#1e3a5f 0%,#2563eb 100%);color:#ffffff;padding:30px;text-align:center;">
        <img src="${SUPABASE_URL}/storage/v1/object/public/assets/logo-global-aco.png" alt="Global Aço" style="height:50px;margin-bottom:12px;" />
        <h1 style="margin:0;font-size:24px;color:#ffffff;font-weight:700;">🛒 Necessidade de Compras</h1>
        <p style="margin:8px 0 0 0;opacity:0.95;font-size:14px;color:#ffffff;">${today}</p>
      </div>
      <div style="padding:30px;">
        <h2 style="font-size:18px;font-weight:600;color:#2d3748;margin:0 0 15px 0;border-bottom:2px solid #e2e8f0;padding-bottom:8px;">📊 Cenário Diário</h2>
        <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:24px;"><tr>
          <td width="25%" style="padding:6px;"><div style="background:#fef2f2;border-radius:8px;padding:16px;border-left:4px solid #dc2626;text-align:center;">
            <div style="font-size:11px;text-transform:uppercase;color:#718096;font-weight:600;margin-bottom:4px;">🛒 Materiais a Comprar</div>
            <div style="font-size:28px;font-weight:700;color:#b91c1c;">${faltas.length}</div>
          </div></td>
          <td width="25%" style="padding:6px;"><div style="background:#f8f9fa;border-radius:8px;padding:16px;border-left:4px solid #2563eb;text-align:center;">
            <div style="font-size:11px;text-transform:uppercase;color:#718096;font-weight:600;margin-bottom:4px;">⚖️ Peso Total</div>
            <div style="font-size:28px;font-weight:700;color:#2d3748;">${fmtKg(totalPeso)}</div>
          </div></td>
          <td width="25%" style="padding:6px;"><div style="background:#f8f9fa;border-radius:8px;padding:16px;border-left:4px solid #f59e0b;text-align:center;">
            <div style="font-size:11px;text-transform:uppercase;color:#718096;font-weight:600;margin-bottom:4px;">👥 Clientes Impactados</div>
            <div style="font-size:28px;font-weight:700;color:#2d3748;">${clientesSet.size}</div>
          </div></td>
          <td width="25%" style="padding:6px;"><div style="background:#fef2f2;border-radius:8px;padding:16px;border-left:4px solid #dc2626;text-align:center;">
            <div style="font-size:11px;text-transform:uppercase;color:#718096;font-weight:600;margin-bottom:4px;">🔴 Pedidos Atrasados</div>
            <div style="font-size:28px;font-weight:700;color:#b91c1c;">${atrSet.size}</div>
          </div></td>
        </tr></table>
        ${emptyState}
        ${mainTable}
        <div style="background:#eff6ff;padding:20px;border-radius:8px;margin-top:24px;border-left:4px solid #2563eb;">
          <h3 style="margin:0 0 8px 0;font-size:16px;color:#2d3748;">💡 Como funciona</h3>
          <p style="margin:0;color:#4a5568;font-size:13px;line-height:1.5;">O sistema cruza os materiais demandados pelos pedidos em produção (agrupados por espessura) com o estoque disponível. A reserva é virtual — o estoque não é baixado automaticamente. Para conferir e ajustar acesse Fábrica → Compras.</p>
        </div>
      </div>
      <div style="background:#f7fafc;padding:20px;text-align:center;font-size:13px;color:#718096;border-top:1px solid #e2e8f0;">
        <p style="margin:5px 0;">📅 Gerado em ${now}</p>
        <p style="margin:5px 0;">Sistema Global Aço — Controle de Compras</p>
      </div>
    </div>
  </body></html>`;
}

// ---------------- Handler ----------------
const handler = async (req: Request): Promise<Response> => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

  try {
    const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    let body: any = {};
    try { body = await req.json(); } catch {}

    const authHeader = req.headers.get('Authorization');
    const token = authHeader?.replace('Bearer ', '') || '';
    const isService = token === SUPABASE_SERVICE_ROLE_KEY;
    const isScheduled = isService && body?.scheduled === true;

    if (!isService && authHeader) {
      const { data: { user }, error } = await supabaseAdmin.auth.getUser(token);
      if (error || !user) return new Response(JSON.stringify({ error: 'Não autorizado' }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      console.log(`🛒 [send-compras-report] Chamada manual: ${user.email}`);
    } else if (isService) {
      console.log(`🛒 [send-compras-report] Chamada service-role (scheduled=${isScheduled})`);
    } else {
      return new Response(JSON.stringify({ error: 'Não autorizado' }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    // Load excluded and hidden orders
    const [{ data: excl }, { data: hid }, { data: estoque }] = await Promise.all([
      supabaseAdmin.from('excluded_orders').select('numero_pedido'),
      supabaseAdmin.from('hidden_production_orders').select('numero_pedido'),
      supabaseAdmin.from('estoque_itens').select('*').eq('ativo', true),
    ]);
    const excluded = new Set((excl || []).map((r: any) => r.numero_pedido));
    const hidden = new Set((hid || []).map((r: any) => r.numero_pedido));

    const pedidos = await loadProducao(excluded, hidden);
    const faltas = computeFaltas(pedidos, estoque || []);

    console.log(`🛒 [send-compras-report] Pedidos ativos: ${pedidos.length}, Faltas: ${faltas.length}`);

    const html = buildHTML(faltas);

    // Destinatários — mesmo da config de e-mail de relatórios
    const { data: configs } = await supabaseAdmin
      .from('email_reports_config')
      .select('id, email')
      .eq('is_active', true);

    if (!configs || configs.length === 0) {
      return new Response(JSON.stringify({ success: true, message: 'Nenhum destinatário configurado', faltas: faltas.length }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const emails = [...new Set(configs.map((c: any) => c.email))];
    const todayFmt = new Date().toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' });
    const subject = `🛒 Necessidade de Compras - ${todayFmt}`;
    const todayISO = new Date().toISOString().split('T')[0];

    const results: any[] = [];
    for (const email of emails) {
      try {
        const res = await fetch('https://api.resend.com/emails', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${RESEND_API_KEY}` },
          body: JSON.stringify({
            from: 'Compras Global Aço <onboarding@resend.dev>',
            to: [email], subject, html,
          }),
        });
        const data = await res.json();
        results.push({ email, success: res.ok, data });
        try {
          await supabaseAdmin.from('email_reports_log').insert({
            config_id: (configs as any[]).find((c: any) => c.email === email)?.id || '00000000-0000-0000-0000-000000000000',
            email, report_date: todayISO, report_type: 'compras',
            status: res.ok ? 'success' : 'failed',
            error_message: res.ok ? null : JSON.stringify(data),
            is_scheduled: isScheduled,
          });
        } catch (logError: any) {
          console.warn('⚠️ [send-compras-report] Falha ao registrar log:', logError?.message);
        }
      } catch (e: any) {
        results.push({ email, success: false, error: e.message });
      }
    }

    const ok = results.filter(r => r.success).length;
    return new Response(JSON.stringify({ success: true, faltas: faltas.length, enviados: ok, total: emails.length, results }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (e: any) {
    console.error('❌ [send-compras-report]', e);
    return new Response(JSON.stringify({ error: e.message }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }
};

serve(handler);
