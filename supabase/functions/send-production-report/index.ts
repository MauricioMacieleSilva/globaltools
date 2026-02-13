import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

// Production sheet
const SHEET_ID = "13F5NcT8Z6quDcW4OmoG8MOhHCRT1W9nWXmNGX839MGo";
const PROD_GID = "407047369";
const COMERCIAL_GID = "1086211541";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

interface MaterialData {
  descricaomat: string;
  observacao: string;
  qtd_pendente: number;
  un: string;
  classe: string;
}

interface OperacaoData {
  numero_op: string;
  situacao_op: string;
  materiais: MaterialData[];
  pesos_por_unidade: Record<string, number>;
}

interface ProducaoData {
  numero_pedido: string;
  situacao: string;
  cli_nomef: string;
  prazo_pcp: string;
  status: string;
  dias_atraso: number;
  ops: OperacaoData[];
  pesos_por_unidade: Record<string, number>;
  pesos_finalizados_por_unidade: Record<string, number>;
  peso_total_kg: number;
  percentual_concluido: number;
}

interface ProductionKPIs {
  totalPedidos: number;
  totalPesoKG: number;
  atrasados: { count: number; peso: number };
  noPrazo: { count: number; peso: number };
  finalizados: { count: number; peso: number };
  parciais: { count: number; peso: number };
  programar: { count: number; peso: number };
}

// Parse CSV
function parseCSV(csvText: string): string[][] {
  const lines = csvText.split(/\r?\n/).filter(l => l.length > 0);
  if (lines.length === 0) return [];
  const headerLine = lines[0];
  const commaCount = (headerLine.match(/,/g) || []).length;
  const semiCount = (headerLine.match(/;/g) || []).length;
  const delimiter = semiCount > commaCount ? ';' : ',';
  const result: string[][] = [];
  for (const line of lines) {
    const row: string[] = [];
    let current = '';
    let inQuotes = false;
    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      if (char === '"') {
        if (inQuotes && line[i + 1] === '"') { current += '"'; i++; }
        else { inQuotes = !inQuotes; }
      } else if (char === delimiter && !inQuotes) {
        row.push(current.trim()); current = '';
      } else { current += char; }
    }
    row.push(current.trim());
    result.push(row);
  }
  return result;
}

function normalizeField(value: string): string {
  return value?.trim().replace(/\s+/g, ' ') || '';
}

function normalizeForCompare(value: string): string {
  return (value || '').toString().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/\s+/g, ' ').trim().toUpperCase();
}

function normalizeStatus(value: string): string {
  return normalizeForCompare(value).replace(/\s/g, '');
}

function normalizeUnit(unit: string): string {
  const n = unit.trim().toUpperCase();
  if (n === 'KG' || n === 'KILO' || n === 'QUILOS') return 'KG';
  if (n === 'T' || n === 'TON') return 'T';
  if (n === 'M' || n === 'METRO' || n === 'METROS') return 'M';
  if (n === 'PC' || n === 'PÇ' || n === 'PCS') return 'PC';
  return n;
}

function calculateDiasAtraso(prazo: string): number {
  if (!prazo) return 0;
  const prazoDate = new Date(prazo);
  const today = new Date();
  if (isNaN(prazoDate.getTime())) return 0;
  const diff = Math.ceil((today.getTime() - prazoDate.getTime()) / (1000 * 60 * 60 * 24));
  return diff > 0 ? diff : 0;
}

function calculateOrderStatus(prazo: string, ops: OperacaoData[]): string {
  if (ops.length === 0) return 'PROGRAMAR';
  const allEmpty = ops.every(op => !normalizeForCompare(op.situacao_op));
  if (allEmpty) return 'PROGRAMAR';
  const finalizadas = ops.filter(op => normalizeStatus(op.situacao_op).includes('FINALIZADA'));
  if (finalizadas.length === ops.length) return 'FINALIZADO';
  const isDelayed = prazo && (() => { const d = new Date(prazo); return !isNaN(d.getTime()) && new Date() > d; })();
  if (finalizadas.length > 0) return isDelayed ? 'ATRASO' : 'PARCIALMENTE_FINALIZADO';
  if (!prazo) return 'PROGRAMAR';
  const prazoDate = new Date(prazo);
  if (isNaN(prazoDate.getTime())) return 'PROGRAMAR';
  return new Date() > prazoDate ? 'ATRASO' : 'NO_PRAZO';
}

async function loadProducaoData(excludedOrders: Set<string>, hiddenOrders: Set<string>): Promise<ProducaoData[]> {
  const csvUrl = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/export?format=csv&gid=${PROD_GID}&timestamp=${Date.now()}`;
  const comercialUrl = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/export?format=csv&gid=${COMERCIAL_GID}&timestamp=${Date.now()}`;
  
  const [response, comercialResponse] = await Promise.all([
    fetch(csvUrl, { headers: { 'Cache-Control': 'no-cache', 'Pragma': 'no-cache' } }),
    fetch(comercialUrl, { headers: { 'Cache-Control': 'no-cache', 'Pragma': 'no-cache' } }),
  ]);
  
  if (!response.ok) throw new Error(`HTTP error ${response.status}`);
  const csvText = await response.text();
  const rows = parseCSV(csvText);
  if (rows.length < 2) return [];

  // Build peso map from commercial sheet (pedido + descricaomat + observacao -> peso_kg)
  const pesoMap = new Map<string, number>();
  const pesoMapFallback = new Map<string, number[]>();
  if (comercialResponse.ok) {
    const comercialCsvText = await comercialResponse.text();
    const comercialRows = parseCSV(comercialCsvText);
    // Commercial columns: B(1)=numeropedido, J(9)=descricaomat, K(10)=observacao, T(19)=peso
    for (let i = 1; i < comercialRows.length; i++) {
      const row = comercialRows[i];
      if (row.length < 20) continue;
      const pedido = normalizeField(row[1] || '');
      const descMat = normalizeForCompare(row[9] || '');
      const obs = normalizeForCompare(row[10] || '');
      const pesoStr = normalizeField(row[19] || '');
      const peso = pesoStr.includes(',')
        ? parseFloat(pesoStr.replace(/\./g, '').replace(',', '.')) || 0
        : parseFloat(pesoStr) || 0;
      if (pedido && descMat && peso > 0) {
        const key = `${pedido}_${descMat}_${obs}`;
        pesoMap.set(key, (pesoMap.get(key) || 0) + peso);
        const fallbackKey = `${pedido}_${descMat}`;
        if (!pesoMapFallback.has(fallbackKey)) pesoMapFallback.set(fallbackKey, []);
        pesoMapFallback.get(fallbackKey)!.push(peso);
      }
    }
    console.log('Peso map entries:', pesoMap.size);
  }

  const columnIndexes = {
    pedido: 2, situacao: 4, cli_nomef: 7, descricaomat: 10, observacao: 11,
    qtd_venda: 12, un: 13, numero_op: 19, situacao_op: 20, classe: 21, prazocomercial: 1,
  };

  const pedidosMap = new Map<string, { numero_pedido: string; situacao: string; cli_nomef: string; prazo_pcp: string; ops: Map<string, OperacaoData> }>();
  const fallbackPositionCounters = new Map<string, number>();

  for (let i = 1; i < rows.length; i++) {
    const row = rows[i];
    const pedido = normalizeField(row[columnIndexes.pedido] ?? '');
    const situacao = normalizeField(row[columnIndexes.situacao] ?? '');
    const situacaoOp = normalizeField(row[columnIndexes.situacao_op] ?? '');
    const cliNomef = normalizeField(row[columnIndexes.cli_nomef] ?? '');
    const descricaomat = normalizeField(row[columnIndexes.descricaomat] ?? '');
    const observacao = normalizeField(row[columnIndexes.observacao] ?? '');
    const qtdVendaStr = normalizeField(row[columnIndexes.qtd_venda] ?? '');
    const un = normalizeField(row[columnIndexes.un] ?? '');
    const prazoPcpStr = normalizeField(row[columnIndexes.prazocomercial] ?? '');
    const numeroOp = normalizeField(row[columnIndexes.numero_op] ?? '');

    if (!pedido || !cliNomef || !descricaomat) continue;
    if (excludedOrders.has(pedido) || hiddenOrders.has(pedido)) continue;

    const sitOpNorm = normalizeForCompare(situacaoOp);
    const sitNorm = normalizeForCompare(situacao);
    if (sitOpNorm !== 'PROGRAMACAO' && sitOpNorm !== 'FINALIZADA' && sitOpNorm !== '' && sitOpNorm !== 'A PROGRAMAR') continue;
    if (!(sitNorm === 'EMITIDA' || sitNorm === 'PEDIDO')) continue;

    const qtdVenda = qtdVendaStr.includes(',') ? parseFloat(qtdVendaStr.replace(/\./g, '').replace(',', '.')) || 0 : parseFloat(qtdVendaStr) || 0;
    const unidadeNorm = normalizeUnit(un);

    // Lookup peso_kg from commercial sheet
    const pesoKeyGranular = `${pedido}_${normalizeForCompare(descricaomat)}_${normalizeForCompare(observacao)}`;
    const pesoKeyFallback = `${pedido}_${normalizeForCompare(descricaomat)}`;
    let pesoKg = pesoMap.get(pesoKeyGranular) || 0;
    if (pesoKg === 0) {
      const fallbackEntries = pesoMapFallback.get(pesoKeyFallback);
      if (fallbackEntries && fallbackEntries.length > 0) {
        const posKey = pesoKeyFallback;
        const currentPos = fallbackPositionCounters.get(posKey) || 0;
        if (currentPos < fallbackEntries.length) pesoKg = fallbackEntries[currentPos];
        fallbackPositionCounters.set(posKey, currentPos + 1);
      }
    }
    if (pesoKg === 0 && unidadeNorm === 'KG') pesoKg = qtdVenda;

    let prazoPcp = '';
    if (prazoPcpStr) {
      try {
        const dateStr = prazoPcpStr.includes('/') ? prazoPcpStr.split('/').reverse().join('-') : prazoPcpStr;
        const date = new Date(dateStr);
        if (!isNaN(date.getTime())) prazoPcp = date.toISOString().split('T')[0];
      } catch {}
    }

    if (!pedidosMap.has(pedido)) {
      pedidosMap.set(pedido, { numero_pedido: pedido, situacao, cli_nomef: cliNomef, prazo_pcp: prazoPcp, ops: new Map() });
    }

    const pedidoData = pedidosMap.get(pedido)!;
    const opKey = numeroOp || 'SEM_OP';
    if (!pedidoData.ops.has(opKey)) {
      pedidoData.ops.set(opKey, { numero_op: numeroOp || 'SEM OP', situacao_op: situacaoOp, materiais: [], pesos_por_unidade: {} });
    }

    const opData = pedidoData.ops.get(opKey)!;
    opData.materiais.push({ descricaomat, observacao, qtd_pendente: qtdVenda, un: unidadeNorm, classe: '' });
    opData.pesos_por_unidade[unidadeNorm] = (opData.pesos_por_unidade[unidadeNorm] || 0) + qtdVenda;
    // Store peso_kg on material for summing later
    (opData as any)._peso_total_kg = ((opData as any)._peso_total_kg || 0) + pesoKg;
  }

  const producaoData: ProducaoData[] = [];
  for (const pedidoData of pedidosMap.values()) {
    const ops = Array.from(pedidoData.ops.values());
    const pesos_por_unidade: Record<string, number> = {};
    const pesos_finalizados_por_unidade: Record<string, number> = {};
    let peso_total_kg = 0;
    for (const op of ops) {
      const isFin = normalizeStatus(op.situacao_op).includes('FINALIZADA');
      for (const [un, peso] of Object.entries(op.pesos_por_unidade)) {
        pesos_por_unidade[un] = (pesos_por_unidade[un] || 0) + peso;
        if (isFin) pesos_finalizados_por_unidade[un] = (pesos_finalizados_por_unidade[un] || 0) + peso;
      }
      peso_total_kg += (op as any)._peso_total_kg || 0;
    }
    const totalGeral = Object.values(pesos_por_unidade).reduce((s, p) => s + p, 0);
    const finGeral = Object.values(pesos_finalizados_por_unidade).reduce((s, p) => s + p, 0);
    const percentual = totalGeral > 0 ? Math.round((finGeral / totalGeral) * 100) : 0;
    const status = calculateOrderStatus(pedidoData.prazo_pcp, ops);
    const diasAtraso = status === 'ATRASO' ? calculateDiasAtraso(pedidoData.prazo_pcp) : 0;

    producaoData.push({
      numero_pedido: pedidoData.numero_pedido, situacao: pedidoData.situacao,
      cli_nomef: pedidoData.cli_nomef, prazo_pcp: pedidoData.prazo_pcp,
      status, dias_atraso: diasAtraso, ops, pesos_por_unidade,
      pesos_finalizados_por_unidade, peso_total_kg, percentual_concluido: percentual,
    });
  }

  producaoData.sort((a, b) => {
    const statusOrder: Record<string, number> = { 'ATRASO': 1, 'PARCIALMENTE_FINALIZADO': 2, 'NO_PRAZO': 3, 'PROGRAMAR': 4, 'FINALIZADO': 5 };
    const aO = statusOrder[a.status] || 5;
    const bO = statusOrder[b.status] || 5;
    if (aO !== bO) return aO - bO;
    return (b.dias_atraso || 0) - (a.dias_atraso || 0);
  });

  return producaoData;
}

function calculateKPIs(data: ProducaoData[]): ProductionKPIs {
  const getWeight = (item: ProducaoData) => item.peso_total_kg || 0;

  const atrasados = data.filter(i => i.status === 'ATRASO');
  const noPrazo = data.filter(i => i.status === 'NO_PRAZO');
  const finalizados = data.filter(i => i.status === 'FINALIZADO');
  const parciais = data.filter(i => i.status === 'PARCIALMENTE_FINALIZADO');
  const programar = data.filter(i => i.status === 'PROGRAMAR');

  return {
    totalPedidos: data.length,
    totalPesoKG: data.reduce((s, i) => s + getWeight(i), 0),
    atrasados: { count: atrasados.length, peso: atrasados.reduce((s, i) => s + getWeight(i), 0) },
    noPrazo: { count: noPrazo.length, peso: noPrazo.reduce((s, i) => s + getWeight(i), 0) },
    finalizados: { count: finalizados.length, peso: finalizados.reduce((s, i) => s + getWeight(i), 0) },
    parciais: { count: parciais.length, peso: parciais.reduce((s, i) => s + getWeight(i), 0) },
    programar: { count: programar.length, peso: programar.reduce((s, i) => s + getWeight(i), 0) },
  };
}

function formatWeight(kg: number): string {
  return `${Math.round(kg).toLocaleString('pt-BR')}KG`;
}

function formatPesoUnidades(pesos: Record<string, number>): string {
  // Match UI format: non-KG units first, then KG weight via pipe
  const nonKgUnits = Object.entries(pesos)
    .filter(([un]) => un !== 'KG' && un !== 'T')
    .map(([un, peso]) => `${peso.toLocaleString('pt-BR', { maximumFractionDigits: 1 })}${un}`);
  
  // Calculate total KG (KG direct + T*1000)
  const totalKg = Object.entries(pesos).reduce((sum, [un, peso]) => {
    if (un === 'KG') return sum + peso;
    if (un === 'T') return sum + peso * 1000;
    return sum;
  }, 0);
  const kgStr = `${Math.round(totalKg).toLocaleString('pt-BR')}KG`;
  
  if (nonKgUnits.length > 0) {
    return `${nonKgUnits.join(' / ')} | ${kgStr}`;
  }
  return kgStr;
}

function formatDate(dateStr: string): string {
  if (!dateStr) return '-';
  try {
    const d = new Date(dateStr);
    return isNaN(d.getTime()) ? dateStr : d.toLocaleDateString('pt-BR');
  } catch { return dateStr; }
}

function getStatusBadge(status: string): string {
  const map: Record<string, { color: string; bg: string; label: string }> = {
    'ATRASO': { color: '#991b1b', bg: '#fee2e2', label: '🔴 ATRASO' },
    'NO_PRAZO': { color: '#166534', bg: '#dcfce7', label: '🟢 NO PRAZO' },
    'FINALIZADO': { color: '#ffffff', bg: '#059669', label: '✅ FINALIZADO' },
    'PARCIALMENTE_FINALIZADO': { color: '#1e40af', bg: '#dbeafe', label: '🔵 PARCIAL' },
    'PROGRAMAR': { color: '#92400e', bg: '#fef3c7', label: '🟡 PROGRAMAR' },
  };
  const s = map[status] || { color: '#4a5568', bg: '#edf2f7', label: status };
  return `<span style="display:inline-block;padding:3px 10px;border-radius:12px;font-size:11px;font-weight:600;color:${s.color};background:${s.bg};">${s.label}</span>`;
}

function generateProductionReportHTML(data: ProducaoData[], kpis: ProductionKPIs): string {
  const now = new Date().toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' });
  const today = new Date().toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' });

  // Top delayed orders
  const atrasados = data.filter(i => i.status === 'ATRASO').slice(0, 10);
  const recentFinished = data.filter(i => i.status === 'FINALIZADO').slice(0, 5);

  const atrasadosRows = atrasados.map(item => `
    <tr>
      <td style="padding:8px 12px;border-bottom:1px solid #edf2f7;font-weight:600;color:#2d3748;font-size:13px;">${item.numero_pedido}</td>
      <td style="padding:8px 12px;border-bottom:1px solid #edf2f7;font-size:13px;color:#4a5568;">${item.cli_nomef}</td>
      <td style="padding:8px 12px;border-bottom:1px solid #edf2f7;font-size:13px;color:#4a5568;">${formatWeight(item.peso_total_kg)}</td>
      <td style="padding:8px 12px;border-bottom:1px solid #edf2f7;font-size:13px;color:#4a5568;">${formatDate(item.prazo_pcp)}</td>
      <td style="padding:8px 12px;border-bottom:1px solid #edf2f7;font-size:13px;color:#dc2626;font-weight:600;">${item.dias_atraso} dias</td>
      <td style="padding:8px 12px;border-bottom:1px solid #edf2f7;font-size:13px;">${item.percentual_concluido}%</td>
    </tr>
  `).join('');

  const finalizadosRows = recentFinished.map(item => `
    <tr>
      <td style="padding:8px 12px;border-bottom:1px solid #edf2f7;font-weight:600;color:#2d3748;font-size:13px;">${item.numero_pedido}</td>
      <td style="padding:8px 12px;border-bottom:1px solid #edf2f7;font-size:13px;color:#4a5568;">${item.cli_nomef}</td>
      <td style="padding:8px 12px;border-bottom:1px solid #edf2f7;font-size:13px;color:#4a5568;">${formatWeight(item.peso_total_kg)}</td>
      <td style="padding:8px 12px;border-bottom:1px solid #edf2f7;font-size:13px;color:#4a5568;">${formatDate(item.prazo_pcp)}</td>
    </tr>
  `).join('');

  // All orders table (limited to 30)
  const allOrdersRows = data.slice(0, 30).map(item => `
    <tr>
      <td style="padding:6px 10px;border-bottom:1px solid #edf2f7;font-weight:500;color:#2d3748;font-size:12px;">${item.numero_pedido}</td>
      <td style="padding:6px 10px;border-bottom:1px solid #edf2f7;font-size:12px;color:#4a5568;">${item.cli_nomef}</td>
      <td style="padding:6px 10px;border-bottom:1px solid #edf2f7;font-size:12px;color:#4a5568;">${formatWeight(item.peso_total_kg)}</td>
      <td style="padding:6px 10px;border-bottom:1px solid #edf2f7;font-size:12px;">${getStatusBadge(item.status)}</td>
      <td style="padding:6px 10px;border-bottom:1px solid #edf2f7;font-size:12px;color:#4a5568;">${item.percentual_concluido}%</td>
      <td style="padding:6px 10px;border-bottom:1px solid #edf2f7;font-size:12px;color:#4a5568;">${formatDate(item.prazo_pcp)}</td>
      <td style="padding:6px 10px;border-bottom:1px solid #edf2f7;font-size:12px;color:${item.dias_atraso > 0 ? '#dc2626' : '#4a5568'};">${item.dias_atraso > 0 ? `${item.dias_atraso}d` : '-'}</td>
    </tr>
  `).join('');

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <style>
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; margin: 0; padding: 20px; background-color: #f5f5f5; color: #2d3748; }
        .container { max-width: 750px; margin: 0 auto; background: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 2px 8px rgba(0,0,0,0.1); }
        @media (max-width: 600px) { .kpi-grid { grid-template-columns: 1fr !important; } }
      </style>
    </head>
    <body>
      <div class="container">
        <!-- Header -->
        <div style="background: #1e40af; color: #ffffff; padding: 30px; text-align: center;">
          <img src="https://xhkdwfpnmjvmfbmokvct.supabase.co/storage/v1/object/public/assets/logo-global-aco.png" alt="Global Aço" style="height: 50px; margin-bottom: 12px;" />
          <h1 style="margin: 0; font-size: 22px; color: #ffffff;">Relatório de Produção</h1>
          <p style="margin: 8px 0 0 0; opacity: 0.95; font-size: 14px; color: #ffffff;">${today}</p>
        </div>

        <div style="padding: 30px;">
          <!-- KPIs -->
          <h2 style="font-size: 18px; font-weight: 600; color: #2d3748; margin: 0 0 15px 0; border-bottom: 2px solid #e2e8f0; padding-bottom: 8px;">🏭 Resumo Geral</h2>
          
          <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom: 24px;">
            <tr>
              <td width="33%" style="padding: 6px;">
                <div style="background: #f8f9fa; border-radius: 8px; padding: 14px; border-left: 4px solid #1e40af;">
                  <div style="font-size: 11px; text-transform: uppercase; color: #718096; font-weight: 600; margin-bottom: 4px;">📦 Total Pedidos</div>
                  <div style="font-size: 26px; font-weight: 700; color: #2d3748;">${kpis.totalPedidos}</div>
                  <div style="font-size: 12px; color: #718096;">${formatWeight(kpis.totalPesoKG)}</div>
                </div>
              </td>
              <td width="33%" style="padding: 6px;">
                <div style="background: #fef2f2; border-radius: 8px; padding: 14px; border-left: 4px solid #dc2626;">
                  <div style="font-size: 11px; text-transform: uppercase; color: #718096; font-weight: 600; margin-bottom: 4px;">🔴 Atrasados</div>
                  <div style="font-size: 26px; font-weight: 700; color: #dc2626;">${kpis.atrasados.count}</div>
                  <div style="font-size: 12px; color: #718096;">${formatWeight(kpis.atrasados.peso)}</div>
                </div>
              </td>
              <td width="33%" style="padding: 6px;">
                <div style="background: #f0fdf4; border-radius: 8px; padding: 14px; border-left: 4px solid #16a34a;">
                  <div style="font-size: 11px; text-transform: uppercase; color: #718096; font-weight: 600; margin-bottom: 4px;">🟢 No Prazo</div>
                  <div style="font-size: 26px; font-weight: 700; color: #16a34a;">${kpis.noPrazo.count}</div>
                  <div style="font-size: 12px; color: #718096;">${formatWeight(kpis.noPrazo.peso)}</div>
                </div>
              </td>
            </tr>
            <tr>
              <td width="33%" style="padding: 6px;">
                <div style="background: #f0fdf4; border-radius: 8px; padding: 14px; border-left: 4px solid #059669;">
                  <div style="font-size: 11px; text-transform: uppercase; color: #718096; font-weight: 600; margin-bottom: 4px;">✅ Finalizados</div>
                  <div style="font-size: 26px; font-weight: 700; color: #059669;">${kpis.finalizados.count}</div>
                  <div style="font-size: 12px; color: #718096;">${formatWeight(kpis.finalizados.peso)}</div>
                </div>
              </td>
              <td width="33%" style="padding: 6px;">
                <div style="background: #eff6ff; border-radius: 8px; padding: 14px; border-left: 4px solid #2563eb;">
                  <div style="font-size: 11px; text-transform: uppercase; color: #718096; font-weight: 600; margin-bottom: 4px;">🔵 Parciais</div>
                  <div style="font-size: 26px; font-weight: 700; color: #2563eb;">${kpis.parciais.count}</div>
                  <div style="font-size: 12px; color: #718096;">${formatWeight(kpis.parciais.peso)}</div>
                </div>
              </td>
              <td width="33%" style="padding: 6px;">
                <div style="background: #fffbeb; border-radius: 8px; padding: 14px; border-left: 4px solid #d97706;">
                  <div style="font-size: 11px; text-transform: uppercase; color: #718096; font-weight: 600; margin-bottom: 4px;">🟡 A Programar</div>
                  <div style="font-size: 26px; font-weight: 700; color: #d97706;">${kpis.programar.count}</div>
                  <div style="font-size: 12px; color: #718096;">${formatWeight(kpis.programar.peso)}</div>
                </div>
              </td>
            </tr>
          </table>

          ${atrasados.length > 0 ? `
          <!-- Atrasados -->
          <h2 style="font-size: 18px; font-weight: 600; color: #dc2626; margin: 25px 0 15px 0; border-bottom: 2px solid #fecaca; padding-bottom: 8px;">🚨 Pedidos em Atraso (Top ${atrasados.length})</h2>
          <div style="overflow-x: auto;">
            <table style="width: 100%; border-collapse: collapse; background: white; border-radius: 8px; overflow: hidden; box-shadow: 0 1px 3px rgba(0,0,0,0.1);">
              <thead>
                <tr style="background: #fef2f2;">
                  <th style="padding:10px 12px;text-align:left;font-size:11px;text-transform:uppercase;color:#991b1b;font-weight:600;">Pedido</th>
                  <th style="padding:10px 12px;text-align:left;font-size:11px;text-transform:uppercase;color:#991b1b;font-weight:600;">Cliente</th>
                  <th style="padding:10px 12px;text-align:left;font-size:11px;text-transform:uppercase;color:#991b1b;font-weight:600;">Peso</th>
                  <th style="padding:10px 12px;text-align:left;font-size:11px;text-transform:uppercase;color:#991b1b;font-weight:600;">Prazo</th>
                  <th style="padding:10px 12px;text-align:left;font-size:11px;text-transform:uppercase;color:#991b1b;font-weight:600;">Atraso</th>
                  <th style="padding:10px 12px;text-align:left;font-size:11px;text-transform:uppercase;color:#991b1b;font-weight:600;">Conclusão</th>
                </tr>
              </thead>
              <tbody>${atrasadosRows}</tbody>
            </table>
          </div>
          ` : ''}

          ${recentFinished.length > 0 ? `
          <!-- Finalizados -->
          <h2 style="font-size: 18px; font-weight: 600; color: #059669; margin: 25px 0 15px 0; border-bottom: 2px solid #bbf7d0; padding-bottom: 8px;">🎉 Pedidos Finalizados</h2>
          <div style="overflow-x: auto;">
            <table style="width: 100%; border-collapse: collapse; background: white; border-radius: 8px; overflow: hidden; box-shadow: 0 1px 3px rgba(0,0,0,0.1);">
              <thead>
                <tr style="background: #f0fdf4;">
                  <th style="padding:10px 12px;text-align:left;font-size:11px;text-transform:uppercase;color:#166534;font-weight:600;">Pedido</th>
                  <th style="padding:10px 12px;text-align:left;font-size:11px;text-transform:uppercase;color:#166534;font-weight:600;">Cliente</th>
                  <th style="padding:10px 12px;text-align:left;font-size:11px;text-transform:uppercase;color:#166534;font-weight:600;">Peso</th>
                  <th style="padding:10px 12px;text-align:left;font-size:11px;text-transform:uppercase;color:#166534;font-weight:600;">Prazo</th>
                </tr>
              </thead>
              <tbody>${finalizadosRows}</tbody>
            </table>
          </div>
          ` : ''}

          <!-- All Orders -->
          <h2 style="font-size: 18px; font-weight: 600; color: #2d3748; margin: 25px 0 15px 0; border-bottom: 2px solid #e2e8f0; padding-bottom: 8px;">📋 Todos os Pedidos${data.length > 30 ? ` (${data.length} total, mostrando 30)` : ''}</h2>
          <div style="overflow-x: auto;">
            <table style="width: 100%; border-collapse: collapse; background: white; border-radius: 8px; overflow: hidden; box-shadow: 0 1px 3px rgba(0,0,0,0.1);">
              <thead>
                <tr style="background: #f7fafc;">
                  <th style="padding:8px 10px;text-align:left;font-size:10px;text-transform:uppercase;color:#718096;font-weight:600;">Pedido</th>
                  <th style="padding:8px 10px;text-align:left;font-size:10px;text-transform:uppercase;color:#718096;font-weight:600;">Cliente</th>
                  <th style="padding:8px 10px;text-align:left;font-size:10px;text-transform:uppercase;color:#718096;font-weight:600;">Peso</th>
                  <th style="padding:8px 10px;text-align:left;font-size:10px;text-transform:uppercase;color:#718096;font-weight:600;">Status</th>
                  <th style="padding:8px 10px;text-align:left;font-size:10px;text-transform:uppercase;color:#718096;font-weight:600;">%</th>
                  <th style="padding:8px 10px;text-align:left;font-size:10px;text-transform:uppercase;color:#718096;font-weight:600;">Prazo</th>
                  <th style="padding:8px 10px;text-align:left;font-size:10px;text-transform:uppercase;color:#718096;font-weight:600;">Atraso</th>
                </tr>
              </thead>
              <tbody>${allOrdersRows}</tbody>
            </table>
          </div>

          <!-- Analysis -->
          <div style="background: #f8f9fa; padding: 20px; border-radius: 8px; margin-top: 24px;">
            <h3 style="margin: 0 0 12px 0; font-size: 16px; color: #2d3748;">💡 Análise Rápida</h3>
            <p style="margin: 6px 0; color: #4a5568; font-size: 14px; line-height: 1.6;">• <strong>${kpis.atrasados.count}</strong> pedido(s) em atraso totalizando <strong>${formatWeight(kpis.atrasados.peso)}</strong></p>
            <p style="margin: 6px 0; color: #4a5568; font-size: 14px; line-height: 1.6;">• <strong>${kpis.finalizados.count}</strong> pedido(s) finalizado(s) (${formatWeight(kpis.finalizados.peso)})</p>
            <p style="margin: 6px 0; color: #4a5568; font-size: 14px; line-height: 1.6;">• <strong>${kpis.parciais.count}</strong> pedido(s) parcialmente concluído(s)</p>
            ${kpis.programar.count > 0 ? `<p style="margin: 6px 0; color: #4a5568; font-size: 14px; line-height: 1.6;">• <strong>${kpis.programar.count}</strong> pedido(s) aguardando programação</p>` : ''}
            <p style="margin: 6px 0; color: #4a5568; font-size: 14px; line-height: 1.6;">• Peso total em produção: <strong>${formatWeight(kpis.totalPesoKG)}</strong></p>
          </div>
        </div>

        <!-- Footer -->
        <div style="background: #f7fafc; padding: 20px; text-align: center; font-size: 13px; color: #718096;">
          <p style="margin: 5px 0;">📅 Dados extraídos em: ${now}</p>
          <p style="margin: 5px 0;">Fonte de dados: Sistema de Produção - Global Aço</p>
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

    // Check if manual trigger (has auth header) or scheduled
    const authHeader = req.headers.get('Authorization');
    if (authHeader) {
      const token = authHeader.replace('Bearer ', '');
      const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token);
      if (authError || !user) {
        return new Response(JSON.stringify({ error: 'Não autorizado' }), {
          status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }
      const { data: roleData } = await supabaseAdmin.from('user_roles').select('role').eq('user_id', user.id).maybeSingle();
      if (!roleData || roleData.role !== 'admin') {
        return new Response(JSON.stringify({ error: 'Apenas administradores' }), {
          status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }
    }

    console.log('🏭 [send-production-report] Iniciando...');

    // Fetch excluded and hidden orders
    const { data: excludedData } = await supabaseAdmin.from('excluded_orders').select('numero_pedido');
    const excludedOrders = new Set((excludedData || []).map((o: any) => o.numero_pedido));

    const { data: hiddenData } = await supabaseAdmin.from('hidden_production_orders').select('numero_pedido');
    const hiddenOrders = new Set((hiddenData || []).map((o: any) => o.numero_pedido));

    // Get recipients
    const { data: configs } = await supabaseAdmin.from('email_reports_config').select('email, full_name').eq('is_active', true);
    if (!configs || configs.length === 0) {
      return new Response(JSON.stringify({ success: true, message: 'Nenhum destinatário configurado' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const uniqueEmails = [...new Set(configs.map(c => c.email))];

    // Load data
    const producaoData = await loadProducaoData(excludedOrders, hiddenOrders);
    const kpis = calculateKPIs(producaoData);
    const htmlContent = generateProductionReportHTML(producaoData, kpis);

    const today = new Date().toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' });
    const subject = `🏭 Relatório de Produção - ${today}`;

    const results = [];
    for (const email of uniqueEmails) {
      try {
        const res = await fetch("https://api.resend.com/emails", {
          method: "POST",
          headers: { "Content-Type": "application/json", "Authorization": `Bearer ${RESEND_API_KEY}` },
          body: JSON.stringify({
            from: "Produção Global Aço <onboarding@resend.dev>",
            to: [email],
            subject,
            html: htmlContent,
          }),
        });
        const data = await res.json();
        results.push({ email, success: res.ok, data });
        console.log(`📧 ${res.ok ? '✅' : '❌'} ${email}`);
      } catch (error: any) {
        results.push({ email, success: false, error: error.message });
      }
    }

    return new Response(
      JSON.stringify({ success: true, results, totalPedidos: producaoData.length }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: any) {
    console.error("❌ Erro:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
};

serve(handler);
