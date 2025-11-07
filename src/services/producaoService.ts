interface MaterialData {
  descricaomat: string;
  qtd_pendente: number;
  un: string;
  peso_individual: number;
  numero_op: string;
}

interface OperacaoData {
  numero_op: string;
  situacao_op: string;
  materiais: MaterialData[];
  peso_op: number;
}

interface ProducaoData {
  numero_pedido: string;
  situacao: string;
  cli_nomef: string;
  prazo_pcp: string;
  status: string;
  dias_atraso?: number;
  ops: OperacaoData[];
  peso_total: number; // calculated field
  peso_finalizado: number; // weight of finalized OPs
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

// Densidade do aço em kg/m³ (mesma usada na política comercial)
const DENSIDADE_ACO = 7850;

// Função para converter unidades para kg
function convertToKg(quantidade: number, unidade: string, descricaoMaterial: string): number {
  const un = unidade.toUpperCase().trim();
  
  switch (un) {
    case 'T':
      // Toneladas para kg
      return quantidade * 1000;
    
    case 'M':
      // Metros para kg - calcular com base na descrição do material
      return calculateMetersToKg(quantidade, descricaoMaterial);
    
    case 'KG':
    default:
      // Já está em kg
      return quantidade;
  }
}

// Função para calcular peso de metros de material
function calculateMetersToKg(metros: number, descricao: string): number {
  // Tentar extrair dimensões da descrição
  const desc = descricao.toUpperCase();
  
  // Padrões para extrair dimensões
  const patterns = [
    // PERFIL U 50x180x50x6000mm - U50x180x50
    /U\s*(\d+(?:,\d+)?)\s*[Xx]\s*(\d+(?:,\d+)?)\s*[Xx]\s*(\d+(?:,\d+)?)/,
    // PERFIL CH #3,00MM - espessura 3mm
    /CH\s*#(\d+(?:,\d+)?)\s*MM/,
    // TELHA TP40 0,43mm - espessura 0.43mm
    /TP\d+\s+(\d+(?:,\d+)?)\s*MM/,
    // CHAPA dimensões (assumir espessura padrão)
    /CHAPA.*?(\d+(?:,\d+)?)\s*MM/
  ];
  
  // Pesos médios por metro para diferentes tipos (kg/m)
  const avgWeights: { [key: string]: number } = {
    'PERFIL U': 12.5,  // Perfil U médio
    'PERFIL CH': 8.0,  // Perfil cartola médio
    'PERFIL L': 6.5,   // Perfil L médio
    'TELHA': 4.5,      // Telha média por m²
    'CHAPA': 15.0,     // Chapa média
    'TUBO': 10.0,      // Tubo médio
    'BARRA': 8.0,      // Barra média
    'DEFAULT': 10.0    // Peso padrão
  };
  
  // Tentar calcular peso específico baseado na descrição
  for (const pattern of patterns) {
    const match = desc.match(pattern);
    if (match) {
      const espessura = parseFloat(match[1].replace(',', '.'));
      
      if (desc.includes('PERFIL U') && match.length >= 4) {
        // Para perfil U com dimensões completas: largura x altura x espessura
        const largura = parseFloat(match[1].replace(',', '.'));
        const altura = parseFloat(match[2].replace(',', '.'));
        const esp = parseFloat(match[3].replace(',', '.'));
        
        // Calcular área da seção transversal em mm²
        const area = (largura * esp * 2) + (altura * esp); // aproximação simples
        const areaM2 = area / 1000000; // converter mm² para m²
        const pesoM = areaM2 * DENSIDADE_ACO; // kg/m
        return metros * pesoM;
      }
      
      if (desc.includes('TELHA') && espessura > 0) {
        // Para telhas: espessura x largura padrão (assumir 1m de largura)
        const areaM2 = 1 * (espessura / 1000); // m² por metro linear
        const pesoM = areaM2 * DENSIDADE_ACO;
        return metros * pesoM;
      }
      
      if (desc.includes('CHAPA') && espessura > 0) {
        // Para chapas: espessura x largura padrão (assumir 1.2m de largura)
        const largura = 1.2; // metros
        const areaM2 = largura * (espessura / 1000);
        const pesoM = areaM2 * DENSIDADE_ACO;
        return metros * pesoM;
      }
    }
  }
  
  // Se não conseguiu calcular, usar peso médio baseado no tipo
  for (const [tipo, peso] of Object.entries(avgWeights)) {
    if (desc.includes(tipo)) {
      return metros * peso;
    }
  }
  
  // Peso padrão
  return metros * avgWeights.DEFAULT;
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
  
  // If some OPs are finalized
  if (finalizadas.length > 0) {
    return 'PARCIALMENTE_FINALIZADO';
  }
  
  // No OPs finalized - check deadline
  if (!prazo) return 'PROGRAMAR';
  
  const prazoDate = new Date(prazo);
  const today = new Date();
  
  if (isNaN(prazoDate.getTime())) return 'PROGRAMAR';
  
  return today > prazoDate ? 'ATRASO' : 'NO_PRAZO';
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
            qtd_pendente: 500,
            un: 'KG',
            peso_individual: 500,
            numero_op: '12345'
          }
        ],
        peso_op: 500
      }
    ],
    peso_total: 500,
    peso_finalizado: 0,
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
            qtd_pendente: 250,
            un: 'KG',
            peso_individual: 250,
            numero_op: '12346'
          }
        ],
        peso_op: 250
      }
    ],
    peso_total: 250,
    peso_finalizado: 250,
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
            qtd_pendente: 800,
            un: 'KG',
            peso_individual: 800,
            numero_op: '12347'
          }
        ],
        peso_op: 800
      }
    ],
    peso_total: 800,
    peso_finalizado: 0,
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
    
    console.log('Fetching from URL:', csvUrl);
    
    const response = await fetch(csvUrl);
    
    if (!response.ok) {
      console.error(`HTTP error! status: ${response.status}`);
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    const csvText = await response.text();
    console.log('CSV Response length:', csvText.length);
    console.log('First 200 characters:', csvText.substring(0, 200));
    
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
    
    // Column mappings based on user specifications:
    // PEDIDO (Column C) = index 2
    // SITUACAO (Column E) = index 4  
    // CLI_NOMEF (Column H) = index 7
    // DESCRICAOMAT (Column K) = index 10
    // QTD_VENDA (Column M) = index 12
    // UN (Column N) = index 13
    // QTD_PENDENTE (Column P) = index 15 (não usado mais)
    // SITUACAO_OP (Column U) = index 20
    // PRAZOCOMERCIAL (Column B) = index 1
    // CODOP (Column T) = index 19  - Número da OP
    
    const columnIndexes = {
      pedido: 2,           // Column C
      situacao: 4,         // Column E  
      cli_nomef: 7,        // Column H
      descricaomat: 10,    // Column K
      qtd_venda: 12,       // Column M (nova coluna a usar)
      un: 13,              // Column N
      situacao_op: 20,     // Column U
      prazocomercial: 1,   // Column B
      numero_op: 19,       // Column T - CODOP
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
      
      // Access columns defensively; some trailing columns may be missing
      // Do not skip rows solely due to length; we'll default missing fields to empty
      
      const pedido = normalizeField(row[columnIndexes.pedido] ?? '');
      const situacao = normalizeField(row[columnIndexes.situacao] ?? '');
      const situacaoOp = normalizeField(row[columnIndexes.situacao_op] ?? '');
      const cliNomef = normalizeField(row[columnIndexes.cli_nomef] ?? '');
      const descricaomat = normalizeField(row[columnIndexes.descricaomat] ?? '');
      const qtdVendaStr = normalizeField(row[columnIndexes.qtd_venda] ?? '');
      const un = normalizeField(row[columnIndexes.un] ?? '');
      const prazoPcpStr = normalizeField(row[columnIndexes.prazocomercial] ?? '');
      const numeroOp = normalizeField(row[columnIndexes.numero_op] ?? '');
      
      // Skip empty rows (require pedido, cliente e material)
      if (!pedido || !cliNomef || !descricaomat) continue;
      
      // Aplicar filtros: SITUACAO_OP = "Programação" OU vazio, e SITUACAO = "Emitida" ou "Pedido"
      const situacaoOpNorm = normalizeForCompare(situacaoOp);
      const situacaoNorm = normalizeForCompare(situacao);

      // Debug pedidos específicos antes de filtrar
      if (['10694', '10836', '10837', '10838', '10857', '10763'].includes(pedido)) {
        const debug = {
          pedido,
          numeroOp,
          situacaoRaw: situacao,
          situacaoNorm,
          situacaoOpRaw: situacaoOp,
          situacaoOpNorm,
          validSituacaoOp: situacaoOpNorm === 'PROGRAMACAO' || situacaoOpNorm === 'FINALIZADA' || situacaoOpNorm === '' || situacaoOpNorm === 'A PROGRAMAR',
          validSituacao: situacaoNorm === 'EMITIDA' || situacaoNorm === 'PEDIDO',
        };
        console.log(`DEBUG pedido ${pedido} OP ${numeroOp} before filter:`, debug);
      }

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
      
      // Parse quantity from QTD_VENDA column
      const qtdVenda = parseFloat(qtdVendaStr.replace(/\./g, '').replace(',', '.')) || 0;

      // Debug specific order after parsing
      if (pedido === '10694' || pedido === '10707') {
        console.log(`DEBUG ${pedido} OP ${numeroOp} after parse`, {
          situacaoRaw: situacao,
          situacaoNorm: normalizeStatus(situacao),
          situacaoOpRaw: situacaoOp,
          situacaoOpNorm: normalizeForCompare(situacaoOp),
          qtdVenda,
          un,
          prazoPcpStr
        });
      }
      
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
          qtdVenda,
          un,
          prazoPcp
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
      
      // Convert quantity to kg for standardization
      const qtdKg = convertToKg(qtdVenda, un, descricaomat);
      
      // Create material data
      const materialData: MaterialData = {
        descricaomat,
        qtd_pendente: qtdVenda, // Keep original quantity from QTD_VENDA
        un,
        peso_individual: qtdKg, // Always in kg
        numero_op: numeroOp || 'SEM OP'
      };
      
      // Group by OP within pedido (use placeholder for materials without OP)
      const opKey = numeroOp || 'SEM_OP';
      if (!pedidoData.ops.has(opKey)) {
        pedidoData.ops.set(opKey, {
          numero_op: numeroOp || 'SEM OP',
          situacao_op: situacaoOp,
          materiais: [],
          peso_op: 0
        });
      }
      
      // Add material to the OP
      const opData = pedidoData.ops.get(opKey)!;
      opData.materiais.push(materialData);
      opData.peso_op += qtdKg;
    }
    
    // Convert map to array and calculate totals
    for (const pedidoData of pedidosMap.values()) {
      // Convert ops map to array
      const ops = Array.from(pedidoData.ops.values());
      
      // Calculate totals
      const peso_total = ops.reduce((sum, op) => sum + op.peso_op, 0);
      
      // Calculate weight of finalized OPs
      const peso_finalizado = ops
        .filter(op => normalizeStatus(op.situacao_op).includes('FINALIZADA'))
        .reduce((sum, op) => sum + op.peso_op, 0);
      
      // Calculate percentage based on weight
      const percentual_concluido = peso_total > 0 ? Math.round((peso_finalizado / peso_total) * 100) : 0;
      
      // Calculate order status based on all OPs
      const status = calculateOrderStatus(pedidoData.prazo_pcp, ops);
      const diasAtraso = (status === 'ATRASO') ? calculateDiasAtraso(pedidoData.prazo_pcp) : 0;
      
      // Debug specific orders
      if (pedidoData.numero_pedido === '10694') {
        console.log(`DEBUG Pedido 10694 calculation:`, {
          ops: ops.map(op => ({ 
            numero_op: op.numero_op, 
            situacao_op: op.situacao_op, 
            peso_op: op.peso_op,
            is_finalizada: normalizeStatus(op.situacao_op).includes('FINALIZADA')
          })),
          peso_total,
          peso_finalizado,
          percentual_concluido,
          status
        });
      }
      
      producaoData.push({
        numero_pedido: pedidoData.numero_pedido,
        situacao: pedidoData.situacao,
        cli_nomef: pedidoData.cli_nomef,
        prazo_pcp: pedidoData.prazo_pcp,
        status,
        dias_atraso: diasAtraso,
        ops,
        peso_total,
        peso_finalizado,
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