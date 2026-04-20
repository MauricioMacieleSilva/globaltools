import { useMemo, useState } from "react";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Pagination, PaginationContent, PaginationItem, PaginationLink, PaginationNext, PaginationPrevious } from "@/components/ui/pagination";
import { Search, Download, FileSpreadsheet } from "lucide-react";
import { useComercial } from "@/context/ComercialContext";
import { isFaturado, formatCurrency, parseDate } from "@/lib/utils-comercial";
import { useDebounce } from "@/hooks/useDebounce";
import * as XLSX from "xlsx";

type PeriodoMedia = "3" | "6" | "12" | "24" | "all";

interface ClienteRelatorio {
  nome: string;
  faturadoTotal: number;
  mediaFaturamento: number;
  orcadoMesAtual: number;
  realizadoMesAtual: number;
}

const PERIODO_LABEL: Record<PeriodoMedia, string> = {
  "3": "Últimos 3 meses",
  "6": "Últimos 6 meses",
  "12": "Últimos 12 meses",
  "24": "Últimos 24 meses",
  all: "Todo o histórico",
};

const ITEMS_PER_PAGE = 50;

export function RelatorioClientes() {
  const { data } = useComercial();
  const [searchTerm, setSearchTerm] = useState("");
  const [periodo, setPeriodo] = useState<PeriodoMedia>("12");
  const [currentPage, setCurrentPage] = useState(1);
  const debouncedSearch = useDebounce(searchTerm, 300);

  const clientes = useMemo<ClienteRelatorio[]>(() => {
    if (!data || data.length === 0) return [];

    const hoje = new Date();
    const mesAtual = hoje.getMonth();
    const anoAtual = hoje.getFullYear();

    // Calcular janela de tempo para média
    let dataLimite: Date | null = null;
    if (periodo !== "all") {
      const meses = parseInt(periodo, 10);
      dataLimite = new Date(hoje.getFullYear(), hoje.getMonth() - meses + 1, 1);
    }

    const map = new Map<string, {
      faturadoTotal: number;
      faturadoPeriodo: number;
      mesesComFaturamento: Set<string>;
      orcadoMesAtual: number;
      realizadoMesAtual: number;
    }>();

    data.forEach(item => {
      const nome = item.cliente;
      if (!nome) return;

      if (!map.has(nome)) {
        map.set(nome, {
          faturadoTotal: 0,
          faturadoPeriodo: 0,
          mesesComFaturamento: new Set(),
          orcadoMesAtual: 0,
          realizadoMesAtual: 0,
        });
      }
      const c = map.get(nome)!;

      const dataEmissao = parseDate(item.data_emissao);
      const dataPedidoPronto = parseDate(item.data_pedido_pronto);

      // Faturado total + período
      if (isFaturado(item.situacao) && dataEmissao) {
        c.faturadoTotal += item.valor || 0;

        const dentroPeriodo = !dataLimite || dataEmissao >= dataLimite;
        if (dentroPeriodo) {
          c.faturadoPeriodo += item.valor || 0;
          c.mesesComFaturamento.add(`${dataEmissao.getFullYear()}-${dataEmissao.getMonth()}`);
        }

        // Realizado mês atual
        if (dataEmissao.getMonth() === mesAtual && dataEmissao.getFullYear() === anoAtual) {
          c.realizadoMesAtual += item.valor || 0;
        }
      }

      // Orçado no mês atual (situação Orçamento)
      if (item.situacao === "Orçamento") {
        const dataRef = dataPedidoPronto || dataEmissao;
        if (dataRef && dataRef.getMonth() === mesAtual && dataRef.getFullYear() === anoAtual) {
          c.orcadoMesAtual += item.valor || 0;
        }
      }
    });

    // Calcular média (valor / nº de meses no período, ou nº de meses do período selecionado)
    const result: ClienteRelatorio[] = [];
    map.forEach((c, nome) => {
      let divisor: number;
      if (periodo === "all") {
        divisor = c.mesesComFaturamento.size || 1;
      } else {
        divisor = parseInt(periodo, 10);
      }
      const media = divisor > 0 ? c.faturadoPeriodo / divisor : 0;

      result.push({
        nome,
        faturadoTotal: c.faturadoTotal,
        mediaFaturamento: media,
        orcadoMesAtual: c.orcadoMesAtual,
        realizadoMesAtual: c.realizadoMesAtual,
      });
    });

    return result.sort((a, b) => b.faturadoTotal - a.faturadoTotal);
  }, [data, periodo]);

  const filteredClientes = useMemo(() => {
    if (!debouncedSearch.trim()) return clientes;
    const term = debouncedSearch.toLowerCase();
    return clientes.filter(c => c.nome.toLowerCase().includes(term));
  }, [clientes, debouncedSearch]);

  const totalPages = Math.ceil(filteredClientes.length / ITEMS_PER_PAGE);
  const paginatedClientes = useMemo(() => {
    const start = (currentPage - 1) * ITEMS_PER_PAGE;
    return filteredClientes.slice(start, start + ITEMS_PER_PAGE);
  }, [filteredClientes, currentPage]);

  // Reset página ao mudar filtros
  useMemo(() => {
    setCurrentPage(1);
  }, [debouncedSearch, periodo]);

  const handleExport = () => {
    const exportData = filteredClientes.map(c => ({
      "Cliente": c.nome,
      "Faturado (Total)": c.faturadoTotal,
      [`Média Faturamento (${PERIODO_LABEL[periodo]})`]: c.mediaFaturamento,
      "Orçado (Mês Atual)": c.orcadoMesAtual,
      "Realizado (Mês Atual)": c.realizadoMesAtual,
    }));

    const ws = XLSX.utils.json_to_sheet(exportData);

    // Formatar colunas numéricas como moeda BRL
    const range = XLSX.utils.decode_range(ws["!ref"] || "A1");
    for (let R = 1; R <= range.e.r; R++) {
      for (let C = 1; C <= 4; C++) {
        const cellRef = XLSX.utils.encode_cell({ r: R, c: C });
        if (ws[cellRef]) {
          ws[cellRef].z = '"R$" #,##0.00';
        }
      }
    }

    // Larguras
    ws["!cols"] = [
      { wch: 50 },
      { wch: 22 },
      { wch: 32 },
      { wch: 22 },
      { wch: 22 },
    ];

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Relatório Clientes");

    const hoje = new Date();
    const fileName = `relatorio-clientes-${hoje.toISOString().split("T")[0]}.xlsx`;
    XLSX.writeFile(wb, fileName);
  };

  const totais = useMemo(() => {
    return filteredClientes.reduce(
      (acc, c) => ({
        faturadoTotal: acc.faturadoTotal + c.faturadoTotal,
        mediaFaturamento: acc.mediaFaturamento + c.mediaFaturamento,
        orcadoMesAtual: acc.orcadoMesAtual + c.orcadoMesAtual,
        realizadoMesAtual: acc.realizadoMesAtual + c.realizadoMesAtual,
      }),
      { faturadoTotal: 0, mediaFaturamento: 0, orcadoMesAtual: 0, realizadoMesAtual: 0 }
    );
  }, [filteredClientes]);

  return (
    <div className="space-y-4">
      {/* Filtros e ações */}
      <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-end justify-between">
        <div className="flex flex-col sm:flex-row gap-3 flex-1">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Pesquisar cliente..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9"
            />
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-xs text-muted-foreground">Período da média</label>
            <Select value={periodo} onValueChange={(v) => setPeriodo(v as PeriodoMedia)}>
              <SelectTrigger className="w-full sm:w-[200px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="3">Últimos 3 meses</SelectItem>
                <SelectItem value="6">Últimos 6 meses</SelectItem>
                <SelectItem value="12">Últimos 12 meses</SelectItem>
                <SelectItem value="24">Últimos 24 meses</SelectItem>
                <SelectItem value="all">Todo o histórico</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <Button onClick={handleExport} disabled={filteredClientes.length === 0} className="gap-2">
          <FileSpreadsheet className="h-4 w-4" />
          Exportar Excel
        </Button>
      </div>

      {/* Resumo */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <Card className="p-3">
          <div className="text-xs text-muted-foreground">Total Faturado</div>
          <div className="text-base sm:text-lg font-bold">{formatCurrency(totais.faturadoTotal)}</div>
        </Card>
        <Card className="p-3">
          <div className="text-xs text-muted-foreground">Média ({PERIODO_LABEL[periodo]})</div>
          <div className="text-base sm:text-lg font-bold">{formatCurrency(totais.mediaFaturamento)}</div>
        </Card>
        <Card className="p-3">
          <div className="text-xs text-muted-foreground">Orçado (Mês Atual)</div>
          <div className="text-base sm:text-lg font-bold text-blue-600 dark:text-blue-400">{formatCurrency(totais.orcadoMesAtual)}</div>
        </Card>
        <Card className="p-3">
          <div className="text-xs text-muted-foreground">Realizado (Mês Atual)</div>
          <div className="text-base sm:text-lg font-bold text-green-600 dark:text-green-400">{formatCurrency(totais.realizadoMesAtual)}</div>
        </Card>
      </div>

      {/* Tabela */}
      <Card>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Cliente</TableHead>
                <TableHead className="text-right">Faturado</TableHead>
                <TableHead className="text-right">Média Faturamento ({PERIODO_LABEL[periodo]})</TableHead>
                <TableHead className="text-right">Orçado (Mês Atual)</TableHead>
                <TableHead className="text-right">Realizado (Mês Atual)</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {paginatedClientes.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                    Nenhum cliente encontrado
                  </TableCell>
                </TableRow>
              ) : (
                paginatedClientes.map((c) => (
                  <TableRow key={c.nome}>
                    <TableCell className="font-medium max-w-xs truncate" title={c.nome}>{c.nome}</TableCell>
                    <TableCell className="text-right">{formatCurrency(c.faturadoTotal)}</TableCell>
                    <TableCell className="text-right">{formatCurrency(c.mediaFaturamento)}</TableCell>
                    <TableCell className="text-right text-blue-600 dark:text-blue-400">
                      {c.orcadoMesAtual > 0 ? formatCurrency(c.orcadoMesAtual) : "-"}
                    </TableCell>
                    <TableCell className="text-right text-green-600 dark:text-green-400">
                      {c.realizadoMesAtual > 0 ? formatCurrency(c.realizadoMesAtual) : "-"}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>

        {totalPages > 1 && (
          <div className="p-3 border-t">
            <Pagination>
              <PaginationContent>
                <PaginationItem>
                  <PaginationPrevious
                    onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                    className={currentPage === 1 ? "pointer-events-none opacity-50" : "cursor-pointer"}
                  />
                </PaginationItem>
                <PaginationItem>
                  <PaginationLink isActive>
                    {currentPage} / {totalPages}
                  </PaginationLink>
                </PaginationItem>
                <PaginationItem>
                  <PaginationNext
                    onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                    className={currentPage === totalPages ? "pointer-events-none opacity-50" : "cursor-pointer"}
                  />
                </PaginationItem>
              </PaginationContent>
            </Pagination>
          </div>
        )}
      </Card>

      <div className="text-xs text-muted-foreground text-right">
        {filteredClientes.length} cliente(s) encontrado(s)
      </div>
    </div>
  );
}
