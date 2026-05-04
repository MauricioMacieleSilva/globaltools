import { useMemo, useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";
import {
  Search,
  FileSpreadsheet,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  Check,
  X,
} from "lucide-react";
import { useComercial } from "@/context/ComercialContext";
import { isFaturado, formatCurrency, parseDate } from "@/lib/utils-comercial";
import { useDebounce } from "@/hooks/useDebounce";
import { useClientReportData } from "@/hooks/useClientReportData";
import { toast } from "sonner";
import * as XLSX from "xlsx";
import { cn } from "@/lib/utils";

type PeriodoMedia = "3" | "6" | "12" | "24" | "all";
type SortField =
  | "nome"
  | "vendedor"
  | "faturadoTotal"
  | "mediaFaturamento"
  | "orcadoMes"
  | "realizadoMes";
type SortDir = "asc" | "desc";

interface ClienteRelatorio {
  nome: string;
  faturadoTotal: number;
  mediaFaturamento: number;
  realizadoMes: number;
}

const PERIODO_LABEL: Record<PeriodoMedia, string> = {
  "3": "Últimos 3 meses",
  "6": "Últimos 6 meses",
  "12": "Últimos 12 meses",
  "24": "Últimos 24 meses",
  all: "Todo o histórico",
};

const MESES = [
  { value: 1, label: "Janeiro" },
  { value: 2, label: "Fevereiro" },
  { value: 3, label: "Março" },
  { value: 4, label: "Abril" },
  { value: 5, label: "Maio" },
  { value: 6, label: "Junho" },
  { value: 7, label: "Julho" },
  { value: 8, label: "Agosto" },
  { value: 9, label: "Setembro" },
  { value: 10, label: "Outubro" },
  { value: 11, label: "Novembro" },
  { value: 12, label: "Dezembro" },
];

const ITEMS_PER_PAGE = 50;

function parseBRL(input: string): number {
  const clean = input
    .replace(/[R$\s]/g, "")
    .replace(/\./g, "")
    .replace(",", ".");
  const n = Number(clean);
  return isNaN(n) ? 0 : n;
}

export function RelatorioClientes() {
  const { data } = useComercial();
  const hoje = new Date();
  const [searchTerm, setSearchTerm] = useState("");
  const [periodo, setPeriodo] = useState<PeriodoMedia>("12");
  const [ano, setAno] = useState<number>(hoje.getFullYear());
  const [mes, setMes] = useState<number>(hoje.getMonth() + 1);
  const [vendedorFilter, setVendedorFilter] = useState<string>("all");
  const [sortField, setSortField] = useState<SortField>("faturadoTotal");
  const [sortDir, setSortDir] = useState<SortDir>("desc");
  const [currentPage, setCurrentPage] = useState(1);
  const [editingCell, setEditingCell] = useState<string | null>(null);
  const [editValue, setEditValue] = useState("");
  const debouncedSearch = useDebounce(searchTerm, 300);

  const {
    vendors,
    getProjection,
    getAssignment,
    upsertProjection,
    upsertAssignment,
  } = useClientReportData(ano, mes);

  // Anos disponíveis (do faturamento + ano atual)
  const anosDisponiveis = useMemo(() => {
    const set = new Set<number>();
    set.add(hoje.getFullYear());
    set.add(hoje.getFullYear() - 1);
    (data || []).forEach((item) => {
      const d = parseDate(item.data_emissao);
      if (d) set.add(d.getFullYear());
    });
    return Array.from(set).sort((a, b) => b - a);
  }, [data]);

  const clientes = useMemo<ClienteRelatorio[]>(() => {
    if (!data || data.length === 0) return [];

    let dataLimite: Date | null = null;
    if (periodo !== "all") {
      const meses = parseInt(periodo, 10);
      dataLimite = new Date(hoje.getFullYear(), hoje.getMonth() - meses + 1, 1);
    }

    const map = new Map<
      string,
      {
        faturadoTotal: number;
        faturadoPeriodo: number;
        mesesComFaturamento: Set<string>;
        realizadoMes: number;
      }
    >();

    data.forEach((item) => {
      const nome = item.cliente;
      if (!nome) return;
      if (!map.has(nome)) {
        map.set(nome, {
          faturadoTotal: 0,
          faturadoPeriodo: 0,
          mesesComFaturamento: new Set(),
          realizadoMes: 0,
        });
      }
      const c = map.get(nome)!;
      const dataEmissao = parseDate(item.data_emissao);
      if (isFaturado(item.situacao) && dataEmissao) {
        c.faturadoTotal += item.valor || 0;
        const dentroPeriodo = !dataLimite || dataEmissao >= dataLimite;
        if (dentroPeriodo) {
          c.faturadoPeriodo += item.valor || 0;
          c.mesesComFaturamento.add(
            `${dataEmissao.getFullYear()}-${dataEmissao.getMonth()}`
          );
        }
        // Realizado para o ano/mês selecionados
        if (
          dataEmissao.getFullYear() === ano &&
          dataEmissao.getMonth() + 1 === mes
        ) {
          c.realizadoMes += item.valor || 0;
        }
      }
    });

    const result: ClienteRelatorio[] = [];
    map.forEach((c, nome) => {
      const divisor =
        periodo === "all"
          ? c.mesesComFaturamento.size || 1
          : parseInt(periodo, 10);
      const media = divisor > 0 ? c.faturadoPeriodo / divisor : 0;
      result.push({
        nome,
        faturadoTotal: c.faturadoTotal,
        mediaFaturamento: media,
        realizadoMes: c.realizadoMes,
      });
    });
    return result;
  }, [data, periodo, ano, mes]);

  const filteredClientes = useMemo(() => {
    let arr = clientes;
    if (debouncedSearch.trim()) {
      const term = debouncedSearch.toLowerCase();
      arr = arr.filter((c) => c.nome.toLowerCase().includes(term));
    }
    if (vendedorFilter !== "all") {
      if (vendedorFilter === "__none__") {
        arr = arr.filter((c) => !getAssignment(c.nome)?.vendedor_id);
      } else {
        arr = arr.filter((c) => getAssignment(c.nome)?.vendedor_id === vendedorFilter);
      }
    }
    return arr;
  }, [clientes, debouncedSearch, vendedorFilter, getAssignment]);

  const sortedClientes = useMemo(() => {
    const arr = [...filteredClientes];
    const dir = sortDir === "asc" ? 1 : -1;
    arr.sort((a, b) => {
      let av: string | number = 0;
      let bv: string | number = 0;
      switch (sortField) {
        case "nome":
          av = a.nome.toLowerCase();
          bv = b.nome.toLowerCase();
          break;
        case "vendedor":
          av = (getAssignment(a.nome)?.vendedor_nome || "").toLowerCase();
          bv = (getAssignment(b.nome)?.vendedor_nome || "").toLowerCase();
          break;
        case "faturadoTotal":
          av = a.faturadoTotal;
          bv = b.faturadoTotal;
          break;
        case "mediaFaturamento":
          av = a.mediaFaturamento;
          bv = b.mediaFaturamento;
          break;
        case "orcadoMes":
          av = getProjection(a.nome)?.valor_orcado || 0;
          bv = getProjection(b.nome)?.valor_orcado || 0;
          break;
        case "realizadoMes":
          av = a.realizadoMes;
          bv = b.realizadoMes;
          break;
      }
      if (typeof av === "string" && typeof bv === "string") {
        return av.localeCompare(bv) * dir;
      }
      return ((av as number) - (bv as number)) * dir;
    });
    return arr;
  }, [filteredClientes, sortField, sortDir, getAssignment, getProjection]);

  const totalPages = Math.ceil(sortedClientes.length / ITEMS_PER_PAGE);
  const paginatedClientes = useMemo(() => {
    const start = (currentPage - 1) * ITEMS_PER_PAGE;
    return sortedClientes.slice(start, start + ITEMS_PER_PAGE);
  }, [sortedClientes, currentPage]);

  useEffect(() => {
    setCurrentPage(1);
  }, [debouncedSearch, periodo, ano, mes, sortField, sortDir, vendedorFilter]);

  const toggleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortField(field);
      setSortDir(field === "nome" || field === "vendedor" ? "asc" : "desc");
    }
  };

  const SortIcon = ({ field }: { field: SortField }) => {
    if (sortField !== field)
      return <ArrowUpDown className="h-3 w-3 opacity-40 inline ml-1" />;
    return sortDir === "asc" ? (
      <ArrowUp className="h-3 w-3 inline ml-1" />
    ) : (
      <ArrowDown className="h-3 w-3 inline ml-1" />
    );
  };

  const startEdit = (cliente: string) => {
    const proj = getProjection(cliente);
    setEditingCell(cliente);
    setEditValue(proj ? String(proj.valor_orcado).replace(".", ",") : "");
  };

  const saveEdit = async (cliente: string) => {
    const valor = parseBRL(editValue);
    const { error } = await upsertProjection(cliente, valor);
    if (error) {
      toast.error("Erro ao salvar orçado");
    } else {
      toast.success("Orçado atualizado");
    }
    setEditingCell(null);
    setEditValue("");
  };

  const cancelEdit = () => {
    setEditingCell(null);
    setEditValue("");
  };

  const handleVendorChange = async (cliente: string, vendedorId: string) => {
    if (vendedorId === "__none__") {
      const { error } = await upsertAssignment(cliente, null, null);
      if (error) toast.error("Erro ao remover vendedor");
      else toast.success("Vendedor removido");
      return;
    }
    const v = vendors.find((x) => x.id === vendedorId);
    const { error } = await upsertAssignment(
      cliente,
      vendedorId,
      v?.full_name || null
    );
    if (error) toast.error("Erro ao vincular vendedor");
    else toast.success("Vendedor vinculado");
  };

  const handleExport = () => {
    const exportData = sortedClientes.map((c) => {
      const proj = getProjection(c.nome);
      const assign = getAssignment(c.nome);
      const orcado = proj?.valor_orcado || 0;
      const atingido = orcado > 0 ? (c.realizadoMes / orcado) * 100 : null;
      return {
        Cliente: c.nome,
        Vendedor: assign?.vendedor_nome || "",
        "Faturado (Total)": c.faturadoTotal,
        [`Média Faturamento (${PERIODO_LABEL[periodo]})`]: c.mediaFaturamento,
        [`Orçado (${MESES[mes - 1].label}/${ano})`]: orcado,
        [`Realizado (${MESES[mes - 1].label}/${ano})`]: c.realizadoMes,
        "Atingimento (%)": atingido !== null ? atingido / 100 : "",
      };
    });

    const ws = XLSX.utils.json_to_sheet(exportData);
    const range = XLSX.utils.decode_range(ws["!ref"] || "A1");
    for (let R = 1; R <= range.e.r; R++) {
      for (let C = 2; C <= 5; C++) {
        const cellRef = XLSX.utils.encode_cell({ r: R, c: C });
        if (ws[cellRef]) ws[cellRef].z = '"R$" #,##0.00';
      }
      const pctRef = XLSX.utils.encode_cell({ r: R, c: 6 });
      if (ws[pctRef] && typeof ws[pctRef].v === "number") ws[pctRef].z = "0.0%";
    }
    ws["!cols"] = [
      { wch: 50 },
      { wch: 25 },
      { wch: 22 },
      { wch: 32 },
      { wch: 22 },
      { wch: 22 },
      { wch: 14 },
    ];
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Relatório Clientes");
    const fileName = `relatorio-clientes-${ano}-${String(mes).padStart(2, "0")}.xlsx`;
    XLSX.writeFile(wb, fileName);
  };

  const totais = useMemo(() => {
    return sortedClientes.reduce(
      (acc, c) => {
        const orcado = getProjection(c.nome)?.valor_orcado || 0;
        return {
          faturadoTotal: acc.faturadoTotal + c.faturadoTotal,
          mediaFaturamento: acc.mediaFaturamento + c.mediaFaturamento,
          orcadoMes: acc.orcadoMes + orcado,
          realizadoMes: acc.realizadoMes + c.realizadoMes,
        };
      },
      { faturadoTotal: 0, mediaFaturamento: 0, orcadoMes: 0, realizadoMes: 0 }
    );
  }, [sortedClientes, getProjection]);

  const periodoSelLabel = `${MESES[mes - 1].label}/${ano}`;

  return (
    <div className="space-y-4">
      {/* Filtros — todos alinhados em uma linha */}
      <div className="flex flex-col lg:flex-row gap-3 lg:items-end">
        <div className="flex flex-col gap-1 flex-1 min-w-[200px]">
          <label className="text-xs text-muted-foreground">Pesquisar cliente</label>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Pesquisar cliente..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9 h-10"
            />
          </div>
        </div>

        <div className="flex flex-col gap-1">
          <label className="text-xs text-muted-foreground">Período da média</label>
          <Select value={periodo} onValueChange={(v) => setPeriodo(v as PeriodoMedia)}>
            <SelectTrigger className="w-full lg:w-[180px] h-10">
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

        <div className="flex flex-col gap-1">
          <label className="text-xs text-muted-foreground">Ano</label>
          <Select value={String(ano)} onValueChange={(v) => setAno(parseInt(v))}>
            <SelectTrigger className="w-full lg:w-[110px] h-10">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {anosDisponiveis.map((a) => (
                <SelectItem key={a} value={String(a)}>
                  {a}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="flex flex-col gap-1">
          <label className="text-xs text-muted-foreground">Mês</label>
          <Select value={String(mes)} onValueChange={(v) => setMes(parseInt(v))}>
            <SelectTrigger className="w-full lg:w-[150px] h-10">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {MESES.map((m) => (
                <SelectItem key={m.value} value={String(m.value)}>
                  {m.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="flex flex-col gap-1">
          <label className="text-xs text-muted-foreground opacity-0 hidden lg:block">.</label>
          <Button
            onClick={handleExport}
            disabled={sortedClientes.length === 0}
            className="gap-2 h-10"
          >
            <FileSpreadsheet className="h-4 w-4" />
            Exportar Excel
          </Button>
        </div>
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
          <div className="text-xs text-muted-foreground">Orçado ({periodoSelLabel})</div>
          <div className="text-base sm:text-lg font-bold text-blue-600 dark:text-blue-400">
            {formatCurrency(totais.orcadoMes)}
          </div>
        </Card>
        <Card className="p-3">
          <div className="text-xs text-muted-foreground">Realizado ({periodoSelLabel})</div>
          <div className="text-base sm:text-lg font-bold text-green-600 dark:text-green-400">
            {formatCurrency(totais.realizadoMes)}
          </div>
        </Card>
      </div>

      {/* Tabela */}
      <Card>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead
                  className="cursor-pointer select-none"
                  onClick={() => toggleSort("nome")}
                >
                  Cliente <SortIcon field="nome" />
                </TableHead>
                <TableHead
                  className="cursor-pointer select-none w-[200px]"
                  onClick={() => toggleSort("vendedor")}
                >
                  Vendedor <SortIcon field="vendedor" />
                </TableHead>
                <TableHead
                  className="text-right cursor-pointer select-none"
                  onClick={() => toggleSort("faturadoTotal")}
                >
                  Faturado <SortIcon field="faturadoTotal" />
                </TableHead>
                <TableHead
                  className="text-right cursor-pointer select-none"
                  onClick={() => toggleSort("mediaFaturamento")}
                >
                  Média ({PERIODO_LABEL[periodo]}) <SortIcon field="mediaFaturamento" />
                </TableHead>
                <TableHead
                  className="text-right cursor-pointer select-none"
                  onClick={() => toggleSort("orcadoMes")}
                >
                  Orçado ({periodoSelLabel}) <SortIcon field="orcadoMes" />
                </TableHead>
                <TableHead
                  className="text-right cursor-pointer select-none"
                  onClick={() => toggleSort("realizadoMes")}
                >
                  Realizado ({periodoSelLabel}) <SortIcon field="realizadoMes" />
                </TableHead>
                <TableHead className="text-right">Atingimento</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {paginatedClientes.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                    Nenhum cliente encontrado
                  </TableCell>
                </TableRow>
              ) : (
                paginatedClientes.map((c) => {
                  const proj = getProjection(c.nome);
                  const orcado = proj?.valor_orcado || 0;
                  const assign = getAssignment(c.nome);
                  const isEditing = editingCell === c.nome;
                  const atingimento = orcado > 0 ? (c.realizadoMes / orcado) * 100 : null;

                  return (
                    <TableRow key={c.nome}>
                      <TableCell
                        className="font-medium max-w-xs truncate"
                        title={c.nome}
                      >
                        {c.nome}
                      </TableCell>
                      <TableCell>
                        <Select
                          value={assign?.vendedor_id || "__none__"}
                          onValueChange={(v) => handleVendorChange(c.nome, v)}
                        >
                          <SelectTrigger className="h-8 text-xs">
                            <SelectValue placeholder="Selecionar..." />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="__none__">— Sem vendedor —</SelectItem>
                            {vendors.map((v) => (
                              <SelectItem key={v.id} value={v.id}>
                                {v.full_name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </TableCell>
                      <TableCell className="text-right">
                        {formatCurrency(c.faturadoTotal)}
                      </TableCell>
                      <TableCell className="text-right">
                        {formatCurrency(c.mediaFaturamento)}
                      </TableCell>
                      <TableCell className="text-right">
                        {isEditing ? (
                          <div className="flex items-center justify-end gap-1">
                            <Input
                              autoFocus
                              value={editValue}
                              onChange={(e) => setEditValue(e.target.value)}
                              onKeyDown={(e) => {
                                if (e.key === "Enter") saveEdit(c.nome);
                                if (e.key === "Escape") cancelEdit();
                              }}
                              className="h-8 w-32 text-right"
                              placeholder="0,00"
                            />
                            <Button
                              size="icon"
                              variant="ghost"
                              className="h-7 w-7"
                              onClick={() => saveEdit(c.nome)}
                            >
                              <Check className="h-4 w-4 text-green-600" />
                            </Button>
                            <Button
                              size="icon"
                              variant="ghost"
                              className="h-7 w-7"
                              onClick={cancelEdit}
                            >
                              <X className="h-4 w-4 text-red-600" />
                            </Button>
                          </div>
                        ) : (
                          <button
                            onClick={() => startEdit(c.nome)}
                            className="text-blue-600 dark:text-blue-400 hover:underline w-full text-right"
                          >
                            {orcado > 0 ? formatCurrency(orcado) : "Definir..."}
                          </button>
                        )}
                      </TableCell>
                      <TableCell className="text-right text-green-600 dark:text-green-400">
                        {c.realizadoMes > 0 ? formatCurrency(c.realizadoMes) : "-"}
                      </TableCell>
                      <TableCell className="text-right">
                        {atingimento !== null ? (
                          <span
                            className={cn(
                              "font-semibold",
                              atingimento >= 100
                                ? "text-green-600 dark:text-green-400"
                                : atingimento >= 70
                                  ? "text-yellow-600 dark:text-yellow-400"
                                  : "text-red-600 dark:text-red-400"
                            )}
                          >
                            {atingimento.toFixed(1)}%
                          </span>
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })
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
                    onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                    className={
                      currentPage === 1
                        ? "pointer-events-none opacity-50"
                        : "cursor-pointer"
                    }
                  />
                </PaginationItem>
                <PaginationItem>
                  <PaginationLink isActive>
                    {currentPage} / {totalPages}
                  </PaginationLink>
                </PaginationItem>
                <PaginationItem>
                  <PaginationNext
                    onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                    className={
                      currentPage === totalPages
                        ? "pointer-events-none opacity-50"
                        : "cursor-pointer"
                    }
                  />
                </PaginationItem>
              </PaginationContent>
            </Pagination>
          </div>
        )}
      </Card>

      <div className="text-xs text-muted-foreground text-right">
        {sortedClientes.length} cliente(s) encontrado(s)
      </div>
    </div>
  );
}