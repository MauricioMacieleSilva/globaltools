import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const SHEET_ID = "13F5NcT8Z6quDcW4OmoG8MOhHCRT1W9nWXmNGX839MGo";
const PROD_GID = "407047369";
const COMERCIAL_GID = "1086211541";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Allowed windows (Brasília time) - 6 min after each DB update
const ALLOWED_WINDOWS = [
  { hour: 8, minute: 16 },
  { hour: 9, minute: 36 },
  { hour: 10, minute: 36 },
  { hour: 11, minute: 36 },
  { hour: 13, minute: 36 },
  { hour: 14, minute: 36 },
  { hour: 15, minute: 36 },
  { hour: 16, minute: 36 },
  { hour: 17, minute: 36 },
];

const TOLERANCE_MINUTES = 5;

function isWithinAllowedWindow(brasiliaTime: Date): boolean {
  const currentHour = brasiliaTime.getHours();
  const currentMinute = brasiliaTime.getMinutes();
  const currentTotal = currentHour * 60 + currentMinute;

  return ALLOWED_WINDOWS.some(w => {
    const windowTotal = w.hour * 60 + w.minute;
    const diff = currentTotal - windowTotal;
    return diff >= 0 && diff <= TOLERANCE_MINUTES;
  });
}

// ---- CSV parsing (same as send-production-report) ----

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

interface MaterialData {
  descricaomat: string;
  observacao: string;
  qtd_pendente: number;
  un: string;
}

interface OperacaoData {
  numero_op: string;
  situacao_op: string;
  materiais: MaterialData[];
  pesos_por_unidade: Record<string, number>;
  _peso_total_kg?: number;
}

interface PedidoFinalizado {
  numero_pedido: string;
  cli_nomef: string;
  prazo_pcp: string;
  peso_total_kg: number;
  percentual_concluido: number;
  pesos_por_unidade: Record<string, number>;
  ops: OperacaoData[];
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

async function loadFinalizedOrders(excludedOrders: Set<string>, hiddenOrders: Set<string>): Promise<PedidoFinalizado[]> {
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

  // Build peso map from commercial sheet
  const pesoMap = new Map<string, number>();
  const pesoMapFallback = new Map<string, number[]>();
  if (comercialResponse.ok) {
    const comercialCsvText = await comercialResponse.text();
    const comercialRows = parseCSV(comercialCsvText);
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
  }

  const columnIndexes = {
    pedido: 2, situacao: 4, cli_nomef: 7, descricaomat: 10, observacao: 11,
    qtd_venda: 12, un: 13, numero_op: 19, situacao_op: 20, prazocomercial: 1,
  };

  const pedidosMap = new Map<string, { numero_pedido: string; cli_nomef: string; prazo_pcp: string; ops: Map<string, OperacaoData> }>();
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

    const pesoKeyGranular = `${pedido}_${normalizeForCompare(descricaomat)}_${normalizeForCompare(observacao)}`;
    const pesoKeyFallback = `${pedido}_${normalizeForCompare(descricaomat)}`;
    let pesoKg = pesoMap.get(pesoKeyGranular) || 0;
    if (pesoKg === 0) {
      const fallbackEntries = pesoMapFallback.get(pesoKeyFallback);
      if (fallbackEntries && fallbackEntries.length > 0) {
        const currentPos = fallbackPositionCounters.get(pesoKeyFallback) || 0;
        if (currentPos < fallbackEntries.length) pesoKg = fallbackEntries[currentPos];
        fallbackPositionCounters.set(pesoKeyFallback, currentPos + 1);
      }
    }
    if (pesoKg === 0 && unidadeNorm === 'KG') pesoKg = qtdVenda;

    let prazoPcp = '';
    if (prazoPcpStr) {
      try {
        const dateStr = prazoPcpStr.includes('/') ? prazoPcpStr.split('/').reverse().join('-') : prazoPcpStr;
        const date = new Date(dateStr);
        if (!isNaN(date.getTime())) prazoPcp = date.toISOString().split('T')[0];
      } catch { /* ignore */ }
    }

    if (!pedidosMap.has(pedido)) {
      pedidosMap.set(pedido, { numero_pedido: pedido, cli_nomef: cliNomef, prazo_pcp: prazoPcp, ops: new Map() });
    }

    const pedidoData = pedidosMap.get(pedido)!;
    const opKey = numeroOp || 'SEM_OP';
    if (!pedidoData.ops.has(opKey)) {
      pedidoData.ops.set(opKey, { numero_op: numeroOp || 'SEM OP', situacao_op: situacaoOp, materiais: [], pesos_por_unidade: {} });
    }

    const opData = pedidoData.ops.get(opKey)!;
    opData.materiais.push({ descricaomat, observacao, qtd_pendente: qtdVenda, un: unidadeNorm });
    opData.pesos_por_unidade[unidadeNorm] = (opData.pesos_por_unidade[unidadeNorm] || 0) + qtdVenda;
    opData._peso_total_kg = (opData._peso_total_kg || 0) + pesoKg;
  }

  // Filter only FINALIZADO orders
  const finalizados: PedidoFinalizado[] = [];
  for (const pedidoData of pedidosMap.values()) {
    const ops = Array.from(pedidoData.ops.values());
    const status = calculateOrderStatus(pedidoData.prazo_pcp, ops);
    if (status !== 'FINALIZADO') continue;

    const pesos_por_unidade: Record<string, number> = {};
    let peso_total_kg = 0;
    for (const op of ops) {
      for (const [un, peso] of Object.entries(op.pesos_por_unidade)) {
        pesos_por_unidade[un] = (pesos_por_unidade[un] || 0) + peso;
      }
      peso_total_kg += op._peso_total_kg || 0;
    }
    const totalGeral = Object.values(pesos_por_unidade).reduce((s, p) => s + p, 0);
    const finGeral = totalGeral; // all ops are finalized
    const percentual = totalGeral > 0 ? Math.round((finGeral / totalGeral) * 100) : 100;

    finalizados.push({
      numero_pedido: pedidoData.numero_pedido,
      cli_nomef: pedidoData.cli_nomef,
      prazo_pcp: pedidoData.prazo_pcp,
      peso_total_kg,
      percentual_concluido: percentual,
      pesos_por_unidade,
      ops,
    });
  }

  return finalizados;
}

function formatDate(dateStr: string): string {
  if (!dateStr) return 'Não informado';
  try {
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) return dateStr;
    return date.toLocaleDateString('pt-BR');
  } catch { return dateStr; }
}

function generateNotificationHTML(data: {
  numero_pedido: string;
  cliente: string;
  prazo: string;
  novo_prazo?: string;
  situacao_producao?: string;
  peso_total: string;
  percentual_concluido: number;
  ops: Array<{
    numero_op: string;
    situacao_op: string;
    peso: string;
    materiais: Array<{ descricaomat: string; observacao: string; quantidade: number; unidade: string }>;
  }>;
}): string {
  const opsHTML = data.ops.map(op => {
    const materiaisHTML = op.materiais.map(mat => `
      <tr>
        <td style="padding: 8px 12px; border-bottom: 1px solid #edf2f7; font-size: 13px; color: #1e40af; font-weight: 500;">${mat.descricaomat}</td>
        <td style="padding: 8px 12px; border-bottom: 1px solid #edf2f7; font-size: 13px; color: #4a5568;">${mat.observacao || '-'}</td>
        <td style="padding: 8px 12px; border-bottom: 1px solid #edf2f7; font-size: 13px; color: #2d3748; text-align: right;">${mat.quantidade.toLocaleString('pt-BR')} ${mat.unidade}</td>
      </tr>
    `).join('');

    return `
      <div style="background: #f0fff4; border: 2px solid #48bb78; border-radius: 8px; padding: 16px; margin-bottom: 12px;">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px;">
          <div>
            <span style="font-weight: 600; font-size: 15px; color: #2d3748;">OP ${op.numero_op}</span>
            <span style="display: inline-block; margin-left: 12px; padding: 3px 10px; border-radius: 12px; font-size: 12px; font-weight: 600; color: white; background: #48bb78;">CONCLUÍDO</span>
          </div>
          <span style="font-size: 13px; color: #718096;">Peso: ${op.peso}</span>
        </div>
        <table style="width: 100%; border-collapse: collapse; background: white; border-radius: 6px; overflow: hidden;">
          <thead>
            <tr style="background: #f7fafc;">
              <th style="padding: 8px 12px; text-align: left; font-size: 11px; text-transform: uppercase; color: #718096; font-weight: 600;">Material</th>
              <th style="padding: 8px 12px; text-align: left; font-size: 11px; text-transform: uppercase; color: #718096; font-weight: 600;">Descrição</th>
              <th style="padding: 8px 12px; text-align: right; font-size: 11px; text-transform: uppercase; color: #718096; font-weight: 600;">Quantidade</th>
            </tr>
          </thead>
          <tbody>${materiaisHTML}</tbody>
        </table>
      </div>
    `;
  }).join('');

  return `
    <!DOCTYPE html>
    <html>
    <head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
    <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; margin: 0; padding: 20px; background-color: #f5f5f5; color: #2d3748;">
      <div style="max-width: 700px; margin: 0 auto; background: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 2px 8px rgba(0,0,0,0.1);">
        <div style="background: #059669; color: #ffffff; padding: 30px; text-align: center;">
          <img src="https://xhkdwfpnmjvmfbmokvct.supabase.co/storage/v1/object/public/assets/logo-global-aco.png" alt="Global Aço" style="height: 50px; margin-bottom: 12px;" />
          <h1 style="margin: 0; font-size: 22px; color: #ffffff;">🎉 Pedido ${data.numero_pedido} Finalizado!</h1>
          <p style="margin: 8px 0 0 0; opacity: 0.95; font-size: 14px; color: #ffffff;">Todas as ordens de produção foram finalizadas</p>
        </div>
        <div style="padding: 30px;">
          <div style="background: #f8f9fa; border-radius: 8px; padding: 20px; margin-bottom: 24px;">
            <h3 style="margin: 0 0 16px 0; font-size: 16px; color: #2d3748; border-bottom: 2px solid #e2e8f0; padding-bottom: 8px;">📋 Resumo do Pedido</h3>
            <table style="width: 100%; border-collapse: collapse;">
              <tr><td style="padding: 6px 0; font-size: 13px; color: #718096; width: 140px;">Nº Pedido:</td><td style="padding: 6px 0; font-size: 15px; font-weight: 700; color: #2d3748;">${data.numero_pedido}</td></tr>
              <tr><td style="padding: 6px 0; font-size: 13px; color: #718096;">Cliente:</td><td style="padding: 6px 0; font-size: 14px; font-weight: 600; color: #2d3748;">${data.cliente}</td></tr>
              <tr><td style="padding: 6px 0; font-size: 13px; color: #718096;">Prazo Comercial:</td><td style="padding: 6px 0; font-size: 14px; color: #2d3748;">${formatDate(data.prazo)}</td></tr>
              ${data.novo_prazo ? `<tr><td style="padding: 6px 0; font-size: 13px; color: #718096;">Novo Prazo:</td><td style="padding: 6px 0; font-size: 14px; color: #2d3748;">${formatDate(data.novo_prazo)}</td></tr>` : ''}
              ${data.situacao_producao ? `<tr><td style="padding: 6px 0; font-size: 13px; color: #718096;">Situação:</td><td style="padding: 6px 0; font-size: 14px; color: #2d3748;">${data.situacao_producao}</td></tr>` : ''}
              <tr><td style="padding: 6px 0; font-size: 13px; color: #718096;">Peso Total:</td><td style="padding: 6px 0; font-size: 14px; color: #2d3748;">${data.peso_total}</td></tr>
              <tr><td style="padding: 6px 0; font-size: 13px; color: #718096;">Progresso:</td><td style="padding: 6px 0;"><span style="font-size: 14px; font-weight: 700; color: #48bb78;">100%</span></td></tr>
            </table>
          </div>
          <h3 style="margin: 0 0 16px 0; font-size: 16px; color: #2d3748; border-bottom: 2px solid #e2e8f0; padding-bottom: 8px;">🏭 Ordens de Produção</h3>
          ${opsHTML}
        </div>
        <div style="background: #f7fafc; padding: 20px; text-align: center; font-size: 13px; color: #718096;">
          <p style="margin: 5px 0;">📅 Notificação automática enviada em: ${new Date().toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' })}</p>
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
    console.log('🔍 [check-finalized-orders] Iniciando verificação...');

    const now = new Date();
    const brasiliaTime = new Date(now.toLocaleString('en-US', { timeZone: 'America/Sao_Paulo' }));

    if (!isWithinAllowedWindow(brasiliaTime)) {
      const timeStr = `${brasiliaTime.getHours()}:${String(brasiliaTime.getMinutes()).padStart(2, '0')}`;
      console.log(`⏰ Fora da janela de verificação. Horário atual (Brasília): ${timeStr}`);
      return new Response(
        JSON.stringify({ message: 'Fora da janela de verificação', time: timeStr }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('✅ Dentro da janela de verificação');

    const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // Load excluded and hidden orders
    const [excludedRes, hiddenRes] = await Promise.all([
      supabaseAdmin.from('excluded_orders').select('numero_pedido'),
      supabaseAdmin.from('hidden_production_orders').select('numero_pedido'),
    ]);

    const excludedOrders = new Set((excludedRes.data || []).map((r: any) => r.numero_pedido));
    const hiddenOrders = new Set((hiddenRes.data || []).map((r: any) => r.numero_pedido));

    // Load finalized orders from Google Sheets
    const finalizados = await loadFinalizedOrders(excludedOrders, hiddenOrders);
    console.log(`📊 Pedidos finalizados encontrados: ${finalizados.length}`);

    if (finalizados.length === 0) {
      return new Response(
        JSON.stringify({ message: 'Nenhum pedido finalizado encontrado', checked: 0 }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check which ones were already notified
    const orderNumbers = finalizados.map(f => f.numero_pedido);
    const { data: alreadyNotified } = await supabaseAdmin
      .from('notified_finalized_orders')
      .select('numero_pedido')
      .in('numero_pedido', orderNumbers);

    const notifiedSet = new Set((alreadyNotified || []).map((r: any) => r.numero_pedido));
    const newFinalizados = finalizados.filter(f => !notifiedSet.has(f.numero_pedido));

    console.log(`📧 Novos pedidos finalizados para notificar: ${newFinalizados.length}`);

    if (newFinalizados.length === 0) {
      return new Response(
        JSON.stringify({ message: 'Todos já foram notificados', checked: finalizados.length, new: 0 }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Load production_orders for novo_prazo/situacao
    const { data: productionOrdersData } = await supabaseAdmin
      .from('production_orders')
      .select('numero_pedido, novo_prazo, situacao, situacao_descricao')
      .in('numero_pedido', newFinalizados.map(f => f.numero_pedido));

    const productionOrdersMap = new Map<string, any>();
    (productionOrdersData || []).forEach((po: any) => {
      productionOrdersMap.set(po.numero_pedido, po);
    });

    // Get email recipients
    const { data: configs } = await supabaseAdmin
      .from('email_reports_config')
      .select('email, full_name')
      .eq('is_active', true);

    if (!configs || configs.length === 0) {
      console.log('⚠️ Nenhum destinatário configurado');
      return new Response(
        JSON.stringify({ message: 'Nenhum destinatário configurado', new: newFinalizados.length }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const uniqueEmails = [...new Set(configs.map((c: any) => c.email))];
    const results: any[] = [];

    const situacaoMap: Record<string, string> = {
      'aguardando_mp': 'Aguardando MP',
      'em_producao': 'Em Produção',
      'material_em_estoque': 'Material em Estoque',
      'outra': 'Outra',
    };

    for (const pedido of newFinalizados) {
      const orderData = productionOrdersMap.get(pedido.numero_pedido);
      const pesoKg = Math.round(pedido.peso_total_kg || 0);

      const situacaoLabel = orderData?.situacao
        ? (orderData.situacao === 'outra' && orderData.situacao_descricao
          ? orderData.situacao_descricao
          : situacaoMap[orderData.situacao] || orderData.situacao)
        : undefined;

      const opsPayload = pedido.ops.map(op => {
        const nonKgUnits = Object.entries(op.pesos_por_unidade)
          .filter(([un]) => un !== 'KG' && un !== 'T')
          .map(([un, peso]) => `${peso.toLocaleString('pt-BR', { maximumFractionDigits: 1 })}${un}`);
        const opPesoKg = Math.round(op._peso_total_kg || 0);
        const kgStr = `${opPesoKg.toLocaleString('pt-BR')}KG`;
        const pesoStr = nonKgUnits.length > 0 ? `${nonKgUnits.join(' / ')} | ${kgStr}` : kgStr;

        return {
          numero_op: op.numero_op,
          situacao_op: op.situacao_op,
          peso: pesoStr,
          materiais: op.materiais.map(mat => ({
            descricaomat: mat.descricaomat,
            observacao: mat.observacao,
            quantidade: mat.qtd_pendente,
            unidade: mat.un,
          })),
        };
      });

      const emailData = {
        numero_pedido: pedido.numero_pedido,
        cliente: pedido.cli_nomef,
        prazo: pedido.prazo_pcp,
        novo_prazo: orderData?.novo_prazo || undefined,
        situacao_producao: situacaoLabel,
        peso_total: `${pesoKg.toLocaleString('pt-BR')}KG`,
        percentual_concluido: 100,
        ops: opsPayload,
      };

      const htmlContent = generateNotificationHTML(emailData);
      const subject = `🎉 Pedido ${pedido.numero_pedido} Finalizado - ${pedido.cli_nomef}`;

      let emailSuccess = true;
      for (const email of uniqueEmails) {
        try {
          const resendResponse = await fetch("https://api.resend.com/emails", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "Authorization": `Bearer ${RESEND_API_KEY}`,
            },
            body: JSON.stringify({
              from: "Produção Global Aço <onboarding@resend.dev>",
              to: [email],
              subject,
              html: htmlContent,
            }),
          });

          const resendData = await resendResponse.json();
          console.log(`📧 Email ${resendResponse.ok ? 'enviado' : 'falhou'} para ${email} (Pedido ${pedido.numero_pedido})`);
          if (!resendResponse.ok) emailSuccess = false;
        } catch (error: any) {
          console.error(`❌ Erro ao enviar para ${email}:`, error);
          emailSuccess = false;
        }
      }

      // Register in notified_finalized_orders (even if some emails fail, to avoid spam)
      const { error: insertError } = await supabaseAdmin
        .from('notified_finalized_orders')
        .insert({ numero_pedido: pedido.numero_pedido });

      if (insertError) {
        console.error(`❌ Erro ao registrar notificação para ${pedido.numero_pedido}:`, insertError);
      }

      results.push({ numero_pedido: pedido.numero_pedido, emailSuccess });
    }

    console.log(`✅ Verificação concluída. ${results.length} pedidos notificados.`);

    return new Response(
      JSON.stringify({ success: true, checked: finalizados.length, notified: results.length, results }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: any) {
    console.error('❌ Erro:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
};

serve(handler);
