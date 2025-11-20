import { ComercialData } from "@/context/ComercialContext";

const SHEET_ID = "13F5NcT8Z6quDcW4OmoG8MOhHCRT1W9nWXmNGX839MGo";
const GID = "2063157767"; // ID da aba BASE ANTIGA
const CSV_URL = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/export?format=csv&gid=${GID}`;

interface SheetRow {
  [key: string]: string;
}

function parseCSV(csvText: string): string[][] {
  const result: string[][] = [];
  let currentRow: string[] = [];
  let currentField = "";
  let inQuotes = false;
  let i = 0;

  while (i < csvText.length) {
    const char = csvText[i];
    const nextChar = csvText[i + 1];

    if (inQuotes) {
      if (char === '"') {
        if (nextChar === '"') {
          // Escaped quote inside quotes
          currentField += '"';
          i += 2;
          continue;
        } else {
          // End of quoted field
          inQuotes = false;
        }
      } else if (char === "\n" || char === "\r") {
        // Newline inside quotes - add to field
        currentField += char;
      } else {
        currentField += char;
      }
    } else {
      if (char === '"') {
        // Start of quoted field
        inQuotes = true;
      } else if (char === ",") {
        // Field separator
        currentRow.push(currentField.trim());
        currentField = "";
      } else if (char === "\n" || (char === "\r" && nextChar === "\n")) {
        // End of row
        currentRow.push(currentField.trim());
        if (currentRow.length > 0 && currentRow.some((field) => field !== "")) {
          result.push(currentRow);
        }
        currentRow = [];
        currentField = "";

        // Skip \r\n
        if (char === "\r" && nextChar === "\n") {
          i++;
        }
      } else if (char === "\r") {
        // End of row (Mac style)
        currentRow.push(currentField.trim());
        if (currentRow.length > 0 && currentRow.some((field) => field !== "")) {
          result.push(currentRow);
        }
        currentRow = [];
        currentField = "";
      } else {
        currentField += char;
      }
    }

    i++;
  }

  // Add final field and row if they exist
  if (currentField !== "" || currentRow.length > 0) {
    currentRow.push(currentField.trim());
    if (currentRow.length > 0 && currentRow.some((field) => field !== "")) {
      result.push(currentRow);
    }
  }

  return result;
}

// Função para normalizar campos sensíveis
function normalizeField(value: string): string {
  if (!value) return "";
  return value.trim().replace(/\s+/g, " ");
}

export async function fetchComercialData(): Promise<ComercialData[]> {
  try {
    console.log("Fetching data from Google Sheets CSV...");

    // Dados mock como fallback
    const mockData: ComercialData[] = [
      {
        numeropedido: "PED001",
        numeronf: "NF001",
        situacao: "Emitida",
        data_emissao: "2024-01-15",
        descricaomat: "Chapa de Aço 1020",
        observacao: "Material para estrutura",
        qtd: 100,
        un: "kg",
        valor_un_bruto: 5.5,
        valor: 550.0,
        peso: 100,
        classe: "A",
        cli_nomefantasia: "Antonio",
        cliente: "Antonio",
        codigocliente: "CLI001",
        uf: "SP",
        cli_cidade: "São Paulo",
        data_pedido_pronto: "2024-01-20",
        faturamento_tipo: 1,
        cliente_novo: "Sim",
        vendedor: "João Silva",
        data_inicio: "2024-01-20",
      },
      {
        numeropedido: "PED002",
        numeronf: "NF002",
        situacao: "Emitida",
        data_emissao: "2024-01-16",
        descricaomat: "Perfil U 100x50",
        observacao: "Para construção civil",
        qtd: 50,
        un: "pç",
        valor_un_bruto: 25.0,
        valor: 109889.0,
        peso: 75,
        classe: "B",
        cli_nomefantasia: "Antonio",
        cliente: "Antonio",
        codigocliente: "CLI001",
        uf: "SP",
        cli_cidade: "São Paulo",
        data_pedido_pronto: "2024-01-22",
        faturamento_tipo: 1,
        cliente_novo: "Não",
        vendedor: "Maria Santos",
        data_inicio: "2024-01-22",
      },
      {
        numeropedido: "PED003",
        numeronf: "NF003",
        situacao: "Emitida",
        data_emissao: "2024-01-17",
        descricaomat: "Chapa Galvanizada",
        observacao: "Material resistente",
        qtd: 200,
        un: "kg",
        valor_un_bruto: 8.0,
        valor: 149121.0,
        peso: 200,
        classe: "A",
        cli_nomefantasia: "Daniela",
        cliente: "Daniela",
        codigocliente: "CLI002",
        uf: "RJ",
        cli_cidade: "Rio de Janeiro",
        data_pedido_pronto: "2024-01-25",
        faturamento_tipo: 1,
        cliente_novo: "Sim",
        vendedor: "Carlos Pereira",
        data_inicio: "2024-01-25",
      },
      {
        numeropedido: "PED004",
        numeronf: "NF004",
        situacao: "Emitida",
        data_emissao: "2024-02-01",
        descricaomat: "Perfil L 50x50",
        observacao: "Para estrutura metálica",
        qtd: 80,
        un: "pç",
        valor_un_bruto: 15.0,
        valor: 1200.0,
        peso: 120,
        classe: "C",
        cli_nomefantasia: "Empresa XYZ",
        cliente: "Empresa XYZ",
        codigocliente: "CLI003",
        uf: "MG",
        cli_cidade: "Belo Horizonte",
        data_pedido_pronto: "2024-02-05",
        faturamento_tipo: 1,
        cliente_novo: "Não",
        vendedor: "Ana Oliveira",
        data_inicio: "2024-02-05",
      },
      {
        numeropedido: "PED005",
        numeronf: "",
        situacao: "Orçamento",
        data_emissao: "2024-02-10",
        descricaomat: "Chapa Inox 304",
        observacao: "Alta qualidade",
        qtd: 30,
        un: "kg",
        valor_un_bruto: 45.0,
        valor: 1350.0,
        peso: 30,
        classe: "A",
        cli_nomefantasia: "Indústria ABC",
        cliente: "Indústria ABC",
        codigocliente: "CLI004",
        uf: "RS",
        cli_cidade: "Porto Alegre",
        data_pedido_pronto: "2024-02-15",
        faturamento_tipo: 0,
        cliente_novo: "Sim",
        vendedor: "João Silva",
        data_inicio: "2024-02-15",
      },
      // Dados perdidos para teste
      {
        numeropedido: "PERDIDO_001",
        numeronf: "",
        situacao: "Perdido",
        data_emissao: "2024-02-05",
        descricaomat: "Chapa Inox - Perdido",
        observacao: "Preço muito alto",
        qtd: 25,
        un: "kg",
        valor_un_bruto: 60.0,
        valor: 1500.0,
        peso: 25,
        classe: "A",
        cli_nomefantasia: "Cliente Perdido",
        cliente: "Cliente Perdido",
        codigocliente: "CLI_PERDIDO",
        uf: "SP",
        cli_cidade: "São Paulo",
        data_pedido_pronto: "2024-02-05",
        faturamento_tipo: 0,
        cliente_novo: "Não",
        vendedor: "João Silva",
        perdido_motivo: "Preço alto",
        data_perdido: "05/08/2025", // Adicionada data_perdido
        data_inicio: "2024-02-05",
      },
    ];

    try {
      console.log("Attempting to fetch from CSV URL:", CSV_URL);

      // Tenta acessar via CSV primeiro
      const response = await fetch(CSV_URL, {
        method: "GET",
        headers: {
          Accept: "text/csv",
        },
      });

      if (!response.ok) {
        console.warn("CSV request failed with status:", response.status);
        return mockData;
      }

      const csvText = await response.text();
      console.log("CSV response received, length:", csvText.length);

      if (!csvText || csvText.length < 100) {
        console.warn("CSV response too short, using mock data");
        return mockData;
      }

      const rows = parseCSV(csvText);
      console.log("Parsed CSV rows:", rows.length);

      if (rows.length < 2) {
        console.warn("Not enough CSV rows, using mock data");
        return mockData;
      }

      // Mapear dados do CSV (índices baseados nas colunas conforme especificado)
      const comercialData: ComercialData[] = rows
        .slice(1) // Pular header
        .filter((row: string[]) => row.length > 30 && row[3]) // Filtrar linhas válidas
        .map((row: string[], index: number): ComercialData => {
          // Log das primeiras 3 linhas para verificar mapeamento
          if (index < 3) {
            console.log(
              `Linha ${index + 1} - UF (AE/30): "${row[30]}", Cidade (AF/31): "${row[31]}", Vendedor (AB/27): "${row[27]}"`,
            );
          }

          // Debug da data bruta vinda da planilha (apenas primeiras 5 linhas)
          if (index < 5) {
            console.log(
              `[CSV DEBUG] Row ${index + 1} - Raw data_emissao: "${row[4]}", data_perdido: "${row[47] || "N/A"}"`,
            );
          }

          return {
            numeropedido: row[1] || "", // Coluna B
            numeronf: row[2] || "", // Coluna C
            situacao: normalizeField(row[3] || ""), // Coluna D
            data_emissao: row[4] || "", // Coluna E
            descricaomat: row[9] || "", // Coluna J
            observacao: row[10] || "", // Coluna K
            qtd: parseFloat(row[11]?.replace(",", ".")) || 0, // Coluna L
            un: row[12] || "", // Coluna M
            valor_un_bruto: parseFloat(row[13]?.replace(",", ".")) || 0, // Coluna N
            valor: parseFloat(row[14]?.replace(",", ".")) || 0, // Coluna O
            peso: parseFloat(row[19]?.replace(",", ".")) || 0, // Coluna T
            classe: normalizeField(row[21] || ""), // Coluna V - NORMALIZADA
            cli_nomefantasia: row[29] || "", // Coluna AD
            cliente: row[29] || "", // Coluna AD (nome para exibição)
            codigocliente: row[28] || "", // Coluna AC
            uf: normalizeField(row[30] || ""), // Coluna AE - UF CORRETO
            cli_cidade: normalizeField(row[31] || ""), // Coluna AF - CIDADE CORRETO
            data_pedido_pronto: row[34] || "", // Coluna AI
            faturamento_tipo: parseInt(row[43]) || 0, // Coluna AR
            cliente_novo: row[45] || "", // Coluna AT
            vendedor: normalizeField(row[27] || "Não informado"), // Coluna AB - NORMALIZADA
            perdido_motivo: row[46] || "", // Coluna AU
            data_perdido: row[35] || "", // Coluna AJ
            data_inicio: row[33] || "", // Coluna AH
          };
        })
        .filter((item: ComercialData) => {
          // Filtrar registros válidos
          if (!item.situacao || item.valor <= 0) return false;

          // Excluir clientes que contenham "GLOBAL AÇO" no nome
          const nomeFantasia = item.cli_nomefantasia?.toUpperCase() || "";
          if (nomeFantasia.includes("GLOBAL AÇO")) {
            return false;
          }

          return true;
        });

      if (comercialData.length === 0) {
        console.warn("No valid data found in CSV, using mock data");
        return mockData;
      }

      console.log(`Successfully loaded ${comercialData.length} records from Google Sheets CSV`);
      return comercialData;
    } catch (fetchError) {
      console.warn("Error fetching from Google Sheets CSV:", fetchError);
      return mockData;
    }
  } catch (error) {
    console.error("Error in fetchComercialData:", error);
    return [
      {
        numeropedido: "ERR001",
        numeronf: "ERRO",
        situacao: "Emitida",
        data_emissao: "2024-01-15",
        descricaomat: "Fallback Data",
        observacao: "Erro ao carregar",
        qtd: 1,
        un: "un",
        valor_un_bruto: 1.0,
        valor: 1.0,
        peso: 1,
        classe: "A",
        cli_nomefantasia: "Erro de Conexão",
        cliente: "Erro de Conexão",
        codigocliente: "ERR001",
        uf: "SP",
        cli_cidade: "São Paulo",
        data_pedido_pronto: "2024-01-15",
        faturamento_tipo: 0,
        cliente_novo: "Não",
        vendedor: "Sistema",
        data_inicio: "2024-01-15",
      },
    ];
  }
}
