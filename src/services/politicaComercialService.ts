export interface PoliticaComercialData {
  codigo: string;
  descricao: string;
  preco: number;
  unidade: string;
  classe: string;
  ipi: string;
  precoM2?: number; // Para telhas - R$/M
  precoKg?: number; // Para telhas - R$/KG
}

const SHEET_ID = '13F5NcT8Z6quDcW4OmoG8MOhHCRT1W9nWXmNGX839MGo';

// GIDs das abas da planilha - GIDs reais fornecidos pelo usuário
const GIDS = {
  ARAMES: '1745824997',
  BOBINAS: '796866051',
  PERFIS: '1315931665',
  CHAPAS: '1553737227',
  TELHAS: '1237601365',
  TUBOS: '506851790',
  LAMINADOS: '1501138800',
  VERGALHAO: '281063877',
  BLANK: '574910623'
};

function parseCSV(csvText: string): string[][] {
  const lines = csvText.split('\n');
  const result: string[][] = [];
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;
    
    const row: string[] = [];
    let current = '';
    let inQuotes = false;
    
    for (let j = 0; j < line.length; j++) {
      const char = line[j];
      
      if (char === '"') {
        inQuotes = !inQuotes;
      } else if (char === ',' && !inQuotes) {
        row.push(current.trim());
        current = '';
      } else {
        current += char;
      }
    }
    
    row.push(current.trim());
    result.push(row);
  }
  
  return result;
}

async function fetchClasseData(classe: string): Promise<PoliticaComercialData[]> {
  const gid = GIDS[classe as keyof typeof GIDS];
  const csvUrl = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/export?format=csv&gid=${gid}`;
  
  try {
    console.log(`Fetching data for ${classe} from GID: ${gid}`);
    
    const response = await fetch(csvUrl, {
      method: 'GET',
      headers: {
        'Accept': 'text/csv',
      },
    });

    if (!response.ok) {
      throw new Error(`CSV request failed for ${classe} with status: ${response.status}`);
    }

    const csvText = await response.text();
    console.log(`CSV response for ${classe}:`, csvText.substring(0, 200) + '...');
    
    if (!csvText || csvText.length < 10) {
      throw new Error(`CSV response too short for ${classe}`);
    }

    const rows = parseCSV(csvText);
    console.log(`Parsed ${rows.length} rows for ${classe}`);
    
    if (rows.length < 2) {
      throw new Error(`Not enough CSV rows for ${classe}`);
    }

    // Mapear dados do CSV conforme estrutura de cada classe
    const data: PoliticaComercialData[] = rows
      .slice(1) // Pular header
      .filter((row: string[]) => row.length > 1 && row[1]?.trim()) // Filtrar por descrição válida
      .map((row: string[], index: number): PoliticaComercialData => {
        // Gerar código único baseado no índice para manter interface, mas não exibir
        const codigo = `${classe}_${index + 1}`;
        
        if (classe === 'TELHAS') {
          // Estrutura TELHAS: CÓDIGO (A), MATERIAL (B), R$/M (C), R$/KG (D), IPI (E)
          const precoM2 = parseFloat(row[2]?.replace(',', '.')) || 0;
          const precoKg = parseFloat(row[3]?.replace(',', '.')) || 0;
          return {
            codigo: codigo,
            descricao: row[1]?.trim() || '',
            preco: precoM2, // Preço principal em M²
            unidade: 'M²',
            classe: classe,
            ipi: row[4]?.trim() || '-',
            precoM2: precoM2,
            precoKg: precoKg
          };
        } else {
          // Estrutura padrão: CÓDIGO (A), MATERIAL (B), R$/KG (C), IPI (D)
          return {
            codigo: codigo,
            descricao: row[1]?.trim() || '',
            preco: parseFloat(row[2]?.replace(',', '.')) || 0,
            unidade: 'KG',
            classe: classe,
            ipi: row[3]?.trim() || '-'
          };
        }
      })
      .filter((item: PoliticaComercialData) => item.descricao.trim().length > 0);

    console.log(`Successfully loaded ${data.length} valid records for ${classe}`);
    return data;

  } catch (error) {
    console.error(`Error fetching data for ${classe}:`, error);
    // Retornar array vazio em caso de erro para não quebrar a interface
    return [];
  }
}

export async function fetchAllPoliticaComercialData(): Promise<Record<string, PoliticaComercialData[]>> {
  const classes = Object.keys(GIDS);
  const results: Record<string, PoliticaComercialData[]> = {};

  try {
    // Buscar dados de todas as classes em paralelo
    const promises = classes.map(async (classe) => {
      const data = await fetchClasseData(classe);
      return { classe, data };
    });

    const classesData = await Promise.all(promises);
    
    classesData.forEach(({ classe, data }) => {
      results[classe] = data.sort((a, b) => a.descricao.localeCompare(b.descricao, 'pt-BR'));
    });

    return results;
  } catch (error) {
    console.error('Error fetching política comercial data:', error);
    return {};
  }
}