interface MaterialData {
  descricaomat: string;
  observacao: string; // Descrição detalhada (Column K)
  qtd_pendente: number;
  un: string;
  numero_op: string;
  classe: string; // Classe do material (Column V)
  peso_kg: number; // Peso em KG vindo da planilha comercial
}

interface OperacaoData {
  numero_op: string;
  situacao_op: string;
  materiais: MaterialData[];
  pesos_por_unidade: Record<string, number>; // Peso por unidade (ex: { "KG": 1000, "M": 500 })
  peso_total_kg: number; // Soma dos pesos KG dos materiais (da planilha comercial)
}

interface ProducaoData {
  numero_pedido: string;
  situacao: string;
  cli_nomef: string;
  prazo_pcp: string;
  status: string;
  dias_atraso?: number;
  ops: OperacaoData[];
  pesos_por_unidade: Record<string, number>; // Peso total por unidade
  pesos_finalizados_por_unidade: Record<string, number>; // Peso finalizado por unidade
  peso_total_kg: number; // Peso total em KG (da planilha comercial)
  percentual_concluido: number; // calculated field
}

// Parse CSV text into 2D array
function parseCSV(csvText: string): string[][] {
  const lines = csvText.split(/\r?\n/).filter(l => l.length > 0);
  if (lines.length === 0) return [];

  // Detect delimiter: choose the one that yields more columns on header
  const headerLine = lines[0];
  const commaCount = (headerLine.match(/,/g) || []).length;
  const semiCount = (headerLine.match(/;/g) || []).length;
  const delimiter = semiCount > commaCount ? ';' : ',';

  const result: string[][] = [];

  for (let line of lines) {
    const row: string[] = [];
    let current = '';
    let inQuotes = false;

    for (let i = 0; i < line.length; i++) {
      const char = line[i];

      if (char === '"') {
        if (inQuotes && line[i + 1] === '"') {
          current += '"';
          i++; // Skip next quote
        } else {
          inQuotes = !inQuotes;
        }
      } else if (char === delimiter && !inQuotes) {
        row.push(current.trim());
        current = '';
      } else {
        current += char;
      }
    }

    row.push(current.trim()); // Add last field
    result.push(row);
  }

  return result;
}

// Normalize field value
function normalizeField(value: string): string {
  return value?.trim().replace(/\s+/g, ' ') || '';
}

// Normalize for comparisons: uppercase, remove accents, collapse spaces
function normalizeForCompare(value: string): string {
  const v = (value || '')
    .toString()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // remove diacritics
    .replace(/\s+/g, ' ')
    .trim()
    .toUpperCase();
  return v;
}

// Normalize status for strict comparison: also remove all spaces
function normalizeStatus(value: string): string {
  return normalizeForCompare(value).replace(/\s/g, '');
}

// Check if SITUACAO represents a 'PEDIDO' (and not 'EXPEDIDO') in a tolerant way
function isSituacaoPedido(value: string): boolean {
  const s = normalizeForCompare(value);
  if (!s) return false;
  if (s.includes('EXPEDIDO')) return false; // avoid false positives
  return s.includes('PEDIDO');
}

// Função para normalizar unidades (remover espaços e colocar em maiúsculo)
function normalizeUnit(unit: string): string {
  const normalized = unit.trim().toUpperCase();
  // Padronizar variações comuns
  if (normalized === 'KG' || normalized === 'KILO' || normalized === 'QUILOS') return 'KG';
  if (normalized === 'T' || normalized === 'TON' || normalized === 'TONELADA') return 'T';
  if (normalized === 'M' || normalized === 'METRO' || normalized === 'METROS') return 'M';
  if (normalized === 'PC' || normalized === 'PÇ' || normalized === 'PCS' || normalized === 'PEÇA') return 'PC';
  return normalized;
}

// Calculate days delay
function calculateDiasAtraso(prazo: string): number {
  if (!prazo) return 0;
  
  const prazoDate = new Date(prazo);
  const today = new Date();
  
  if (isNaN(prazoDate.getTime())) return 0;
  
  const diffTime = today.getTime() - prazoDate.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  
  return diffDays > 0 ? diffDays : 0;
}

// Determine status based on deadline and all OPs
function calculateOrderStatus(prazo: string, ops: OperacaoData[]): string {
  if (ops.length === 0) return 'PROGRAMAR';

  // If all OPs have empty SITUACAO_OP (no OP created yet), treat as "PROGRAMAR"
  const allOpsWithoutStatus = ops.every(op => !normalizeForCompare(op.situacao_op));
  if (allOpsWithoutStatus) return 'PROGRAMAR';
  
  const finalizadas = ops.filter(op => 
    normalizeStatus(op.situacao_op).includes('FINALIZADA')
  );
  
  // If all OPs are finalized
  if (finalizadas.length === ops.length) {
    return 'FINALIZADO';
  }
  
  // Check if order is delayed (past deadline)
  const isDelayed = prazo && (() => {
    const prazoDate = new Date(prazo);
    const today = new Date();
    return !isNaN(prazoDate.getTime()) && today > prazoDate;
  })();
  
  // If some OPs are finalized but order is delayed, mark as ATRASO
  if (finalizadas.length > 0) {
    return isDelayed ? 'ATRASO' : 'PARCIALMENTE_FINALIZADO';
  }
  
  // No OPs finalized - check deadline
  if (!prazo) return 'PROGRAMAR';
  
  const prazoDate = new Date(prazo);
  const today = new Date();
  
  if (isNaN(prazoDate.getTime())) return 'PROGRAMAR';
  
  return today > prazoDate ? 'ATRASO' : 'NO_PRAZO';
}

// Derivar classe do material baseado no nome (descricaomat)
function deriveClasseFromMaterial(descricaomat: string): string {
  const desc = descricaomat.toUpperCase();
  
  // PERFIS - perfis, chapas, telhas
  if (desc.includes('PERFIL') || desc.includes('CHAPA') || desc.includes('CH #') || desc.includes('CH#')) {
    return 'PERFIS';
  }
  
  // TELHAS
  if (desc.includes('TELHA')) {
    return 'TELHAS';
  }
  
  // VERGALHÕES
  if (desc.includes('VERGALH')) {
    return 'VERGALHÕES';
  }
  
  // ARAMES
  if (desc.includes('ARAME') || desc.includes('FIO')) {
    return 'ARAMES';
  }
  
  // TUBOS
  if (desc.includes('TUBO')) {
    return 'TUBOS';
  }
  
  // ACESSÓRIOS - parafusos, pregos, etc
  if (desc.includes('PARAFUSO') || desc.includes('PREGO') || desc.includes('ARRUELAS') || 
      desc.includes('PORCA') || desc.includes('REBITE') || desc.includes('ACESSORIO')) {
    return 'ACESSÓRIOS';
  }
  
  // Default
  return 'OUTROS';
}

// Mock data for development/fallback
const mockProducaoData: ProducaoData[] = [
  {
    numero_pedido: '001234',
    situacao: 'EMITIDA',
    cli_nomef: 'CLIENTE TESTE A',
    prazo_pcp: '2024-01-15',
    status: 'ATRASO',
    dias_atraso: 5,
    ops: [
      {
        numero_op: '12345',
        situacao_op: 'PROGRAMAÇÃO',
        materiais: [
          {
            descricaomat: 'CHAPA AÇO 1020 - 3MM',
            observacao: '500kg 1000x2000mm',
            qtd_pendente: 500,
            un: 'KG',
            numero_op: '12345',
            classe: 'CHAPA',
            peso_kg: 500
          }
        ],
        pesos_por_unidade: { 'KG': 500 },
        peso_total_kg: 500
      }
    ],
    pesos_por_unidade: { 'KG': 500 },
    pesos_finalizados_por_unidade: {},
    peso_total_kg: 500,
    percentual_concluido: 0
  },
  {
    numero_pedido: '001235',
    situacao: 'PEDIDO',
    cli_nomef: 'CLIENTE TESTE B',
    prazo_pcp: '2024-02-20',
    status: 'FINALIZADO',
    dias_atraso: 0,
    ops: [
      {
        numero_op: '12346',
        situacao_op: 'FINALIZADA',
        materiais: [
          {
            descricaomat: 'PERFIL U 100MM',
            observacao: '250pçs PERFIL U 100x50x100 6000mm',
            qtd_pendente: 250,
            un: 'KG',
            numero_op: '12346',
            classe: 'PERFIL',
            peso_kg: 250
          }
        ],
        pesos_por_unidade: { 'KG': 250 },
        peso_total_kg: 250
      }
    ],
    pesos_por_unidade: { 'KG': 250 },
    pesos_finalizados_por_unidade: { 'KG': 250 },
    peso_total_kg: 250,
    percentual_concluido: 100
  },
  {
    numero_pedido: '001236',
    situacao: 'EMITIDA',
    cli_nomef: 'CLIENTE TESTE C',
    prazo_pcp: '2024-01-10',
    status: 'ATRASO',
    dias_atraso: 12,
    ops: [
      {
        numero_op: '12347',
        situacao_op: 'PROGRAMAÇÃO',
        materiais: [
          {
            descricaomat: 'TUBO QUADRADO 50X50',
            observacao: '800pçs TUBO QUADRADO 50x50x2 6000mm',
            qtd_pendente: 800,
            un: 'KG',
            numero_op: '12347',
            classe: 'TUBO',
            peso_kg: 800
          }
        ],
        pesos_por_unidade: { 'KG': 800 },
        peso_total_kg: 800
      }
    ],
    pesos_por_unidade: { 'KG': 800 },
    pesos_finalizados_por_unidade: {},
    peso_total_kg: 800,
    percentual_concluido: 0
  }
];

export async function fetchProducaoData(): Promise<ProducaoData[]> {
  try {
    console.log('Fetching produção data from Google Sheets...');
    
    // Google Sheets CSV export URL using stable gid for the "PRODUÇÃO" sheet
    const sheetId = '13F5NcT8Z6quDcW4OmoG8MOhHCRT1W9nWXmNGX839MGo';
    const gid = '407047369';
    const csvUrl = `https://docs.google.com/spreadsheets/d/${sheetId}/export?format=csv&gid=${gid}`;
    
    // Also fetch commercial sheet to get peso_kg
    const comercialGid = '1086211541';
    const comercialCsvUrl = `https://docs.google.com/spreadsheets/d/${sheetId}/export?format=csv&gid=${comercialGid}`;
    
    console.log('Fetching production and commercial data...');
    
    const [response, comercialResponse] = await Promise.all([
      fetch(csvUrl),
      fetch(comercialCsvUrl)
    ]);
    
    if (!response.ok) {
      console.error(`HTTP error! status: ${response.status}`);
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    const csvText = await response.text();
    console.log('CSV Response length:', csvText.length);
    console.log('First 200 characters:', csvText.substring(0, 200));
    
    // Build peso map from commercial sheet
    // Use pedido + descricaomat + observacao as key for granular per-item matching
    const pesoMap = new Map<string, number>(); // key: "pedido_descricaomat_observacao" -> peso_kg
    const pesoMapFallback = new Map<string, number[]>(); // fallback: "pedido_descricaomat" -> [peso1, peso2, ...]
    if (comercialResponse.ok) {
      const comercialCsvText = await comercialResponse.text();
      const comercialRows = parseCSV(comercialCsvText);
      console.log('Commercial sheet rows:', comercialRows.length);
      
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
          // Granular key with observacao for exact item matching
          const key = `${pedido}_${descMat}_${obs}`;
          pesoMap.set(key, (pesoMap.get(key) || 0) + peso);
          
          // Also build fallback map by pedido+descricaomat (individual entries, not summed)
          const fallbackKey = `${pedido}_${descMat}`;
          if (!pesoMapFallback.has(fallbackKey)) {
            pesoMapFallback.set(fallbackKey, []);
          }
          pesoMapFallback.get(fallbackKey)!.push(peso);
        }
      }
      console.log('Peso map entries:', pesoMap.size);
    } else {
      console.warn('Failed to fetch commercial sheet for peso data');
    }
    
    if (!csvText || csvText.length < 100) {
      console.error('CSV response too short or empty');
      throw new Error('Empty or invalid CSV response');
    }
    
    const rows = parseCSV(csvText);
    console.log('Parsed rows count:', rows.length);
    
    if (rows.length < 2) {
      console.error('Not enough data rows');
      throw new Error('Insufficient data in spreadsheet');
    }
    
    const header = rows[0];
    console.log('Header row:', header);
    console.log('Total columns in header:', header.length);
    
    // Log column headers to find the correct columns
    header.forEach((col, idx) => {
      const colLower = (col || '').toLowerCase();
      if (colLower.includes('classe') || colLower.includes('class') || 
          colLower.includes('descricao') || colLower.includes('observa')) {
        console.log(`Found relevant column at index ${idx}: "${col}"`);
      }
    });
    
    // Debug: Log columns 8-12 specifically
    console.log('=== COLUMNS 8-12 ===');
    console.log('Col 8:', header[8]);
    console.log('Col 9:', header[9]);
    console.log('Col 10:', header[10]);
    console.log('Col 11:', header[11]);
    console.log('Col 12:', header[12]);
    
    // Column mappings based on user specifications:
    // PEDIDO (Column C) = index 2
    // SITUACAO (Column E) = index 4  
    // CLI_NOMEF (Column H) = index 7
    // DESCRICAOMAT (Column K) = index 10 - Nome do material (ex: PERFIL CH #2,25MM)
    // OBSERVACAO (Column L) = index 11 - Descrição detalhada (ex: 65pçs PERFIL U 40x75x40x6000mm)
    // QTD_VENDA (Column M) = index 12
    // UN (Column N) = index 13
    // QTD_PENDENTE (Column P) = index 15 (não usado mais)
    // CODOP (Column T) = index 19 - Número da OP
    // SITUACAO_OP (Column U) = index 20
    // CLASSE (Column V) = index 21 - Classe do material
    // PRAZOCOMERCIAL (Column B) = index 1
    
    const columnIndexes = {
      pedido: 2,           // Column C
      situacao: 4,         // Column E  
      cli_nomef: 7,        // Column H
      descricaomat: 10,    // Column K - Nome do material
      observacao: 11,      // Column L - Descrição detalhada
      qtd_venda: 12,       // Column M (nova coluna a usar)
      un: 13,              // Column N
      numero_op: 19,       // Column T - CODOP
      situacao_op: 20,     // Column U
      classe: 21,          // Column V - Classe do material
      prazocomercial: 1,   // Column B
    };
    
    console.log('Using column indexes:', columnIndexes);
    
    const producaoData: ProducaoData[] = [];
    const pedidosMap = new Map<string, {
      numero_pedido: string;
      situacao: string;
      cli_nomef: string;
      prazo_pcp: string;
      ops: Map<string, OperacaoData>;
    }>();
    
    for (let i = 1; i < rows.length; i++) {
      const row = rows[i];
      
      // Debug first 5 rows to see raw column data
      if (i <= 5) {
        console.log(`=== RAW ROW ${i} COLUMNS 8-12 ===`);
        console.log('Col 8 (I):', row[8]);
        console.log('Col 9 (J - descricaomat):', row[9]);
        console.log('Col 10 (K - observacao):', row[10]);
        console.log('Col 11 (L):', row[11]);
      }
      
      // Access columns defensively; some trailing columns may be missing
      // Do not skip rows solely due to length; we'll default missing fields to empty
      
      const pedido = normalizeField(row[columnIndexes.pedido] ?? '');
      const situacao = normalizeField(row[columnIndexes.situacao] ?? '');
      const situacaoOp = normalizeField(row[columnIndexes.situacao_op] ?? '');
      const cliNomef = normalizeField(row[columnIndexes.cli_nomef] ?? '');
      const classe = normalizeField(row[columnIndexes.classe] ?? '');
      const descricaomat = normalizeField(row[columnIndexes.descricaomat] ?? '');
      const observacao = normalizeField(row[columnIndexes.observacao] ?? '');
      const qtdVendaStr = normalizeField(row[columnIndexes.qtd_venda] ?? '');
      const un = normalizeField(row[columnIndexes.un] ?? '');
      const prazoPcpStr = normalizeField(row[columnIndexes.prazocomercial] ?? '');
      const numeroOpRaw = normalizeField(row[columnIndexes.numero_op] ?? '');
      // Remove trailing .0 from OP numbers (e.g. "6166.0" -> "6166")
      const numeroOp = numeroOpRaw.replace(/\.0$/, '');
      
      // Skip empty rows (require pedido, cliente e material)
      if (!pedido || !cliNomef || !descricaomat) continue;
      
      // Aplicar filtros: SITUACAO_OP = "Programação" OU vazio, e SITUACAO = "Emitida" ou "Pedido"
      const situacaoOpNorm = normalizeForCompare(situacaoOp);
      const situacaoNorm = normalizeForCompare(situacao);

      // Aceitar SITUACAO_OP = "PROGRAMACAO", "FINALIZADA", "A PROGRAMAR" ou vazio
      if (
        situacaoOpNorm !== 'PROGRAMACAO' &&
        situacaoOpNorm !== 'FINALIZADA' &&
        situacaoOpNorm !== '' &&
        situacaoOpNorm !== 'A PROGRAMAR'
      ) {
        if (['10694', '10836', '10837', '10838', '10857', '10763'].includes(pedido)) {
          console.log(`DEBUG pedido ${pedido} OP ${numeroOp} filtrado - SITUACAO_OP não é PROGRAMACAO, FINALIZADA, A PROGRAMAR nem vazio:`, situacaoOpNorm);
        }
        continue;
      }
      if (!(situacaoNorm === 'EMITIDA' || situacaoNorm === 'PEDIDO')) {
        if (['10694', '10836', '10837', '10838', '10857', '10763'].includes(pedido)) {
          console.log(`DEBUG pedido ${pedido} OP ${numeroOp} filtrado - SITUACAO não é EMITIDA nem PEDIDO:`, situacaoNorm);
        }
        continue;
      }
      
      // Parse quantity - detect format and handle correctly
      // If contains comma, it's Brazilian format (1.234,56) - remove dots, replace comma with dot
      // If no comma, it's American format (1234.56) - use as is
      const qtdVenda = qtdVendaStr.includes(',') 
        ? parseFloat(qtdVendaStr.replace(/\./g, '').replace(',', '.')) || 0
        : parseFloat(qtdVendaStr) || 0;
      
      // Normalize unit
      const unidadeNormalizada = normalizeUnit(un);
      
      // Parse deadline date
      let prazoPcp = '';
      if (prazoPcpStr) {
        try {
          // Handle different date formats
          const dateStr = prazoPcpStr.includes('/') 
            ? prazoPcpStr.split('/').reverse().join('-') // Convert DD/MM/YYYY to YYYY-MM-DD
            : prazoPcpStr;
          
          const date = new Date(dateStr);
          if (!isNaN(date.getTime())) {
            prazoPcp = date.toISOString().split('T')[0];
          }
        } catch (e) {
          console.warn(`Invalid date format: ${prazoPcpStr}`);
        }
      }
      
      // Log first few rows for debugging
      if (i <= 3) {
        console.log(`Row ${i} data:`, {
          pedido,
          numeroOp,
          situacao,
          situacaoOp,
          cliNomef,
          descricaomat,
          observacao,
          classe,
          qtdVenda,
          un,
          prazoPcp
        });
        console.log(`Row ${i} raw columns 9-11 (descricaomat/observacao):`, {
          col9: row[9],
          col10: row[10],
          col11: row[11]
        });
      }
      
      // Group by pedido
      if (!pedidosMap.has(pedido)) {
        pedidosMap.set(pedido, {
          numero_pedido: pedido,
          situacao,
          cli_nomef: cliNomef,
          prazo_pcp: prazoPcp,
          ops: new Map<string, OperacaoData>()
        });
      }
      
      // Get pedido data
      const pedidoData = pedidosMap.get(pedido)!;
      
      // Lookup peso_kg from commercial sheet using granular key (pedido + descricaomat + observacao)
      const pesoKeyGranular = `${pedido}_${normalizeForCompare(descricaomat)}_${normalizeForCompare(observacao)}`;
      const pesoKeyFallback = `${pedido}_${normalizeForCompare(descricaomat)}`;
      let pesoKg = pesoMap.get(pesoKeyGranular) || 0;
      
      // Fallback: if granular key didn't match, try matching by pedido+descricaomat
      // But only if there's exactly one entry (to avoid summing all items)
      if (pesoKg === 0) {
        const fallbackEntries = pesoMapFallback.get(pesoKeyFallback);
        if (fallbackEntries && fallbackEntries.length === 1) {
          pesoKg = fallbackEntries[0];
        }
      }
      
      // Last fallback: if unit is KG, use qtdVenda as peso
      if (pesoKg === 0 && unidadeNormalizada === 'KG') {
        pesoKg = qtdVenda;
      }
      
      // Create material data - mantém unidade original
      const materialData: MaterialData = {
        descricaomat,
        observacao, // Descrição detalhada (ex: 385pçs PERFIL U 40x207x40 6000mm)
        qtd_pendente: qtdVenda, // Quantidade na unidade original
        un: unidadeNormalizada, // Unidade normalizada
        numero_op: numeroOp || 'SEM OP',
        classe: deriveClasseFromMaterial(descricaomat), // Derivar classe do nome do material
        peso_kg: pesoKg
      };
      
      // Group by OP within pedido (use placeholder for materials without OP)
      const opKey = numeroOp || 'SEM_OP';
      if (!pedidoData.ops.has(opKey)) {
        pedidoData.ops.set(opKey, {
          numero_op: numeroOp || 'SEM OP',
          situacao_op: situacaoOp,
          materiais: [],
          pesos_por_unidade: {},
          peso_total_kg: 0
        });
      }
      
      // Add material to the OP
      const opData = pedidoData.ops.get(opKey)!;
      opData.materiais.push(materialData);
      
      // Acumular peso por unidade
      if (!opData.pesos_por_unidade[unidadeNormalizada]) {
        opData.pesos_por_unidade[unidadeNormalizada] = 0;
      }
      opData.pesos_por_unidade[unidadeNormalizada] += qtdVenda;
      
      // Acumular peso_kg na OP
      opData.peso_total_kg += pesoKg;
    }
    
    // Convert map to array and calculate totals
    for (const pedidoData of pedidosMap.values()) {
      // Convert ops map to array
      const ops = Array.from(pedidoData.ops.values());
      
      // Calcular pesos totais por unidade
      const pesos_por_unidade: Record<string, number> = {};
      const pesos_finalizados_por_unidade: Record<string, number> = {};
      
      for (const op of ops) {
        const isFinalized = normalizeStatus(op.situacao_op).includes('FINALIZADA');
        
        for (const [unidade, peso] of Object.entries(op.pesos_por_unidade)) {
          if (!pesos_por_unidade[unidade]) {
            pesos_por_unidade[unidade] = 0;
          }
          pesos_por_unidade[unidade] += peso;
          
          if (isFinalized) {
            if (!pesos_finalizados_por_unidade[unidade]) {
              pesos_finalizados_por_unidade[unidade] = 0;
            }
            pesos_finalizados_por_unidade[unidade] += peso;
          }
        }
      }
      
      // Calcular percentual baseado na primeira unidade (ou média ponderada)
      const pesoTotalGeral = Object.values(pesos_por_unidade).reduce((sum, p) => sum + p, 0);
      const pesoFinalizadoGeral = Object.values(pesos_finalizados_por_unidade).reduce((sum, p) => sum + p, 0);
      const percentual_concluido = pesoTotalGeral > 0 ? Math.round((pesoFinalizadoGeral / pesoTotalGeral) * 100) : 0;
      
      // Calculate order status based on all OPs
      const status = calculateOrderStatus(pedidoData.prazo_pcp, ops);
      const diasAtraso = (status === 'ATRASO') ? calculateDiasAtraso(pedidoData.prazo_pcp) : 0;
      
      // Calcular peso total KG do pedido
      const peso_total_kg = ops.reduce((sum, op) => sum + op.peso_total_kg, 0);
      
      producaoData.push({
        numero_pedido: pedidoData.numero_pedido,
        situacao: pedidoData.situacao,
        cli_nomef: pedidoData.cli_nomef,
        prazo_pcp: pedidoData.prazo_pcp,
        status,
        dias_atraso: diasAtraso,
        ops,
        pesos_por_unidade,
        pesos_finalizados_por_unidade,
        peso_total_kg,
        percentual_concluido
      });
    }
    
    // Log unique SITUACAO values found for debugging
    const uniqueSituacoes = [...new Set(producaoData.map(p => p.situacao))];
    console.log('=== FOUND SITUACAO VALUES ===', uniqueSituacoes);
    
    console.log('Processed produção data count:', producaoData.length);
    console.log('Sample processed data:', producaoData.slice(0, 2));
    
    if (producaoData.length === 0) {
      throw new Error('No valid production data found after filtering');
    }
    
    return producaoData;
    
  } catch (error) {
    console.error('Error fetching produção data:', error);
    // Don't fall back to mock data - let the error propagate so we know there's an issue
    throw error;
  }
}

export type { ProducaoData, MaterialData, OperacaoData };