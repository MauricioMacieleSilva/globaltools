import React, { useState, useMemo, useCallback, useEffect } from "react";
import { Input } from "@/components/ui/input";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Pagination, PaginationContent, PaginationItem, PaginationLink, PaginationNext, PaginationPrevious } from "@/components/ui/pagination";
import { Search, History, Eye, ChevronDown, ChevronRight, MessageSquare, RefreshCw, X } from "lucide-react";
import { useComercial } from "@/context/ComercialContext";
import { isFaturado, formatCurrency, getDiasEntreDatas, formatDateSafe } from "@/lib/utils-comercial";
import { useDebounce } from "@/hooks/useDebounce";
import { usePagination } from "@/hooks/usePagination";
import { useIsMobile } from "@/hooks/use-mobile";
import { ClientFollowUpDialog } from "./ClientFollowUpDialog";
import { BaseClientesTableMobile } from "./BaseClientesTableMobile";
import { ClientesKPIsMobile } from "./ClientesKPIsMobile";
import { supabase } from "@/integrations/supabase/client";

interface ClienteInfo {
  nome: string;
  totalFaturado: number;
  ultimaCompra: Date | null;
  ativo: boolean;
  pedidosFaturados: number;
  ticketMedio: number;
  historico: Array<{
    numero_pedido: string;
    valor_total: number;
    peso_total: number;
    data_emissao: string;
    status: string;
    data_perdido?: string;
    perdido_motivo?: string;
    vendedor?: string;
    itens: Array<{
      descricao: string;
      quantidade: number;
      peso: number;
      valor: number;
      preco_unitario: number;
    }>;
  }>;
}

export function BaseClientesTable() {
  const { data } = useComercial();
  const isMobile = useIsMobile();
  const [searchTerm, setSearchTerm] = useState("");
  const [vendorFilter, setVendorFilter] = useState("all");
  const [vendorSearchTerm, setVendorSearchTerm] = useState("");
  const [vendorDropdownOpen, setVendorDropdownOpen] = useState(false);
  const [selectedCliente, setSelectedCliente] = useState<ClienteInfo | null>(null);
  const [historicoCache, setHistoricoCache] = useState<Map<string, ClienteInfo>>(new Map());
  const [expandedPedidos, setExpandedPedidos] = useState<Set<string>>(new Set());
  const [followUpDialogOpen, setFollowUpDialogOpen] = useState(false);
  const [selectedClienteFollowUp, setSelectedClienteFollowUp] = useState<string>("");
  
  // Debounce search para melhor performance
  const debouncedSearchTerm = useDebounce(searchTerm, 300);


  // Processamento otimizado dos clientes
  const clientesProcessados = useMemo(() => {
    if (!data) return [];

    const clientesMap = new Map<string, Omit<ClienteInfo, 'historico'>>();
    const tresMesesAtras = new Date();
    tresMesesAtras.setMonth(tresMesesAtras.getMonth() - 3);

    // Processar apenas dados essenciais sem histórico
    data.forEach(item => {
      const nomeCliente = item.cliente;
      
      if (!clientesMap.has(nomeCliente)) {
        clientesMap.set(nomeCliente, {
          nome: nomeCliente,
          totalFaturado: 0,
          ultimaCompra: null,
          ativo: false,
          pedidosFaturados: 0,
          ticketMedio: 0
        });
      }

      const cliente = clientesMap.get(nomeCliente)!;

      // Processar apenas pedidos faturados
      if (isFaturado(item.situacao)) {
        cliente.totalFaturado += item.valor;
        cliente.pedidosFaturados++;
        
        // Parse seguro da data usando nossa função utilitária
        const dataEmissaoStr = item.data_emissao;
        let dataEmissao: Date;
        
        // Tentar parsing inteligente da data
        if (dataEmissaoStr.includes('/')) {
          // Formato brasileiro dd/MM/yyyy
          const parts = dataEmissaoStr.split('/');
          if (parts.length === 3) {
            const day = parseInt(parts[0]);
            const month = parseInt(parts[1]);
            const year = parseInt(parts[2]);
            dataEmissao = new Date(year, month - 1, day);
          } else {
            dataEmissao = new Date(dataEmissaoStr);
          }
        } else {
          dataEmissao = new Date(dataEmissaoStr);
        }
        
        if (!cliente.ultimaCompra || dataEmissao > cliente.ultimaCompra) {
          cliente.ultimaCompra = dataEmissao;
        }
        
        // Verificar se está ativo (comprou nos últimos 3 meses)
        if (dataEmissao >= tresMesesAtras) {
          cliente.ativo = true;
        }
      }
    });

    // Calcular ticket médio
    return Array.from(clientesMap.values())
      .map(cliente => ({
        ...cliente,
        ticketMedio: cliente.pedidosFaturados > 0 ? cliente.totalFaturado / cliente.pedidosFaturados : 0,
        historico: [] // Será carregado sob demanda
      }))
      .sort((a, b) => b.totalFaturado - a.totalFaturado);
  }, [data]);

  // Invalidar cache de histórico quando dados mudam
  React.useEffect(() => {
    if (data && data.length > 0) {
      setHistoricoCache(new Map());
      console.log('Cache de histórico limpo devido a novos dados');
    }
  }, [data]);

  // Índice de produtos por cliente para busca rápida
  const clienteProdutosIndex = useMemo(() => {
    if (!data) return new Map<string, string[]>();
    const index = new Map<string, string[]>();
    data.forEach(item => {
      const nome = item.cliente;
      if (!index.has(nome)) {
        index.set(nome, []);
      }
      if (item.descricaomat) {
        index.get(nome)!.push(item.descricaomat.toLowerCase());
      }
    });
    return index;
  }, [data]);


  // Lista de vendedores únicos para o filtro
  const vendedoresUnicos = useMemo(() => {
    if (!data) return [];
    const set = new Set<string>();
    data.forEach(item => {
      if (item.vendedor) set.add(item.vendedor);
    });
    return Array.from(set).sort();
  }, [data]);

  // Filtrar clientes com debounce - busca por nome OU por produto comprado + filtro vendedor
  const clientesFiltrados = useMemo(() => {
    let resultado = clientesProcessados;

    // Filtro por vendedor
    if (vendorFilter !== "all") {
      resultado = resultado.filter(cliente => {
        const vendedores = clienteVendedorIndex.get(cliente.nome);
        return vendedores?.has(vendorFilter) ?? false;
      });
    }

    // Filtro por texto (nome ou produto)
    if (debouncedSearchTerm !== "") {
      const term = debouncedSearchTerm.toLowerCase();
      resultado = resultado.filter(cliente => {
        if (cliente.nome.toLowerCase().includes(term)) return true;
        const produtos = clienteProdutosIndex.get(cliente.nome);
        return produtos?.some(p => p.includes(term)) ?? false;
      });
    }

    return resultado;
  }, [clientesProcessados, debouncedSearchTerm, clienteProdutosIndex, vendorFilter, clienteVendedorIndex]);

  // Implementar paginação
  const {
    currentPage,
    totalPages,
    paginatedData: clientes,
    goToPage,
    nextPage,
    previousPage,
    canGoNext,
    canGoPrevious,
    startIndex,
    endIndex
  } = usePagination({
    data: clientesFiltrados,
    itemsPerPage: 50
  });

  // Paginação para o histórico de pedidos - sempre chamado para evitar erro de hooks
  const historicoData = selectedCliente?.historico || [];
  const {
    currentPage: currentHistoricoPage,
    totalPages: totalHistoricoPages,
    paginatedData: pedidosPaginados,
    goToPage: goToHistoricoPage,
    nextPage: nextHistoricoPage,
    previousPage: previousHistoricoPage,
    canGoNext: canGoNextHistorico,
    canGoPrevious: canGoPreviousHistorico,
    startIndex: startHistoricoIndex,
    endIndex: endHistoricoIndex
  } = usePagination({
    data: historicoData,
    itemsPerPage: 10
  });

  // Funções de navegação que resetam pedidos expandidos
  const goToHistoricoPageWithReset = useCallback((page: number) => {
    setExpandedPedidos(new Set()); // Reset expanded orders when changing page
    goToHistoricoPage(page);
  }, [goToHistoricoPage]);

  const nextHistoricoPageWithReset = useCallback(() => {
    setExpandedPedidos(new Set()); // Reset expanded orders when changing page
    nextHistoricoPage();
  }, [nextHistoricoPage]);

  const previousHistoricoPageWithReset = useCallback(() => {
    setExpandedPedidos(new Set()); // Reset expanded orders when changing page
    previousHistoricoPage();
  }, [previousHistoricoPage]);

  // Função para carregar histórico sob demanda
  const carregarHistorico = useCallback((nomeCliente: string): ClienteInfo => {
    if (historicoCache.has(nomeCliente)) {
      return historicoCache.get(nomeCliente)!;
    }

    const clienteBase = clientes.find(c => c.nome === nomeCliente);
    if (!clienteBase || !data) return clienteBase as ClienteInfo;

      // Usar Map para agrupar por numero_pedido e evitar duplicações
      const pedidosMap = new Map<string, {
        numero_pedido: string;
        valor_total: number;
        peso_total: number;
        data_emissao: string;
        status: string;
        data_perdido?: string;
        perdido_motivo?: string;
        vendedor?: string;
        itens: Array<{
          descricao: string;
          quantidade: number;
          peso: number;
          valor: number;
          preco_unitario: number;
        }>;
      }>();

    // Agrupar dados por numero_pedido
    data
      .filter(item => item.cliente === nomeCliente)
      .forEach(item => {
        console.log('Item processado - Pedido:', item.numeropedido, 'Vendedor:', item.vendedor, 'Peso:', item.peso);
        const numeroPedido = item.numeropedido;
        
        if (pedidosMap.has(numeroPedido)) {
          // Se já existe, somar valor e peso, adicionar item
          const pedidoExistente = pedidosMap.get(numeroPedido)!;
          pedidoExistente.valor_total += item.valor;
          pedidoExistente.peso_total += item.peso || 0;
          pedidoExistente.itens.push({
            descricao: item.descricaomat || 'Sem descrição',
            quantidade: item.qtd || 0,
            peso: item.peso || 0,
            valor: item.valor,
            preco_unitario: item.valor_un_bruto || 0
          });
        } else {
          // Criar novo pedido agrupado
          const novoPedido = {
            numero_pedido: numeroPedido,
            valor_total: item.valor,
            peso_total: item.peso || 0,
            data_emissao: item.data_emissao,
            status: item.situacao,
            data_perdido: item.data_perdido,
            perdido_motivo: item.perdido_motivo,
            vendedor: item.vendedor,
            itens: [{
              descricao: item.descricaomat || 'Sem descrição',
              quantidade: item.qtd || 0,
              peso: item.peso || 0,
              valor: item.valor,
              preco_unitario: item.valor_un_bruto || 0
            }]
          };
          pedidosMap.set(numeroPedido, novoPedido);
          console.log('Pedido criado no Map:', numeroPedido, 'com vendedor:', item.vendedor, 'peso:', item.peso);
        }
      });

    // Converter Map para array e ordenar por data
    const historico = Array.from(pedidosMap.values())
      .sort((a, b) => {
        const parseDate = (dateStr: string): Date => {
          if (!dateStr) return new Date(0); // Data muito antiga para datas vazias
          
          // Tentar parsing brasileiro dd/MM/yyyy
          const parts = dateStr.split('/');
          if (parts.length === 3) {
            const [day, month, year] = parts.map(Number);
            const date = new Date(year, month - 1, day);
            
            // Validar se a data é válida
            if (!isNaN(date.getTime())) {
              return date;
            }
          }
          
          // Fallback: tentar new Date() direto
          const fallbackDate = new Date(dateStr);
          return isNaN(fallbackDate.getTime()) ? new Date(0) : fallbackDate;
        };
        
        const dateA = parseDate(a.data_emissao);
        const dateB = parseDate(b.data_emissao);
        
        // Ordenação decrescente: mais recente primeiro
        return dateB.getTime() - dateA.getTime();
      });

    const clienteComHistorico = { ...clienteBase, historico };
    
    // Cache do histórico
    setHistoricoCache(prev => new Map(prev).set(nomeCliente, clienteComHistorico));
    
    return clienteComHistorico;
  }, [clientes, data, historicoCache]);

  const estatisticas = useMemo(() => {
    const total = clientesFiltrados.length;
    const ativos = clientesFiltrados.filter(c => c.ativo).length;
    const inativos = total - ativos;
    const faturamentoTotal = clientesFiltrados.reduce((sum, c) => sum + c.totalFaturado, 0);
    const totalPedidos = clientesFiltrados.reduce((sum, c) => sum + c.pedidosFaturados, 0);
    const ticketMedioGeral = totalPedidos > 0 ? faturamentoTotal / totalPedidos : 0;

    return { total, ativos, inativos, faturamentoTotal, ticketMedioGeral };
  }, [clientesFiltrados]);

  const getStatusBadge = (ativo: boolean) => {
    return ativo ? (
      <Badge className="bg-green-100 text-green-800">Ativo</Badge>
    ) : (
      <Badge className="bg-red-100 text-red-800">Inativo</Badge>
    );
  };

  const getDiasUltimaCompra = (ultimaCompra: Date | null) => {
    if (!ultimaCompra) return "Nunca";
    const dias = Math.floor((new Date().getTime() - ultimaCompra.getTime()) / (1000 * 60 * 60 * 24));
    return `${dias} dias`;
  };

  const togglePedido = (pedidoNumber: string) => {
    setExpandedPedidos(prev => {
      const newSet = new Set(prev);
      if (newSet.has(pedidoNumber)) {
        newSet.delete(pedidoNumber);
      } else {
        newSet.add(pedidoNumber);
      }
      return newSet;
    });
  };

  return (
    <div className="space-y-4">
      {/* KPIs - Mobile vs Desktop */}
      {isMobile ? (
        <ClientesKPIsMobile
          total={estatisticas.total}
          ativos={estatisticas.ativos}
          inativos={estatisticas.inativos}
          faturamentoTotal={estatisticas.faturamentoTotal}
          ticketMedioGeral={estatisticas.ticketMedioGeral}
        />
      ) : (
        <div className="grid grid-cols-3 lg:grid-cols-5 gap-4" data-tour="clientes-kpis">
          <Card>
            <CardHeader className="p-4 pb-2">
              <CardTitle className="text-sm text-muted-foreground">Total Clientes</CardTitle>
            </CardHeader>
            <CardContent className="p-4 pt-0">
              <div className="text-2xl font-bold">{estatisticas.total}</div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="p-4 pb-2">
              <CardTitle className="text-sm text-muted-foreground">Ativos</CardTitle>
            </CardHeader>
            <CardContent className="p-4 pt-0">
              <div className="text-2xl font-bold text-green-600">{estatisticas.ativos}</div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="p-4 pb-2">
              <CardTitle className="text-sm text-muted-foreground">Inativos</CardTitle>
            </CardHeader>
            <CardContent className="p-4 pt-0">
              <div className="text-2xl font-bold text-red-600">{estatisticas.inativos}</div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="p-4 pb-2">
              <CardTitle className="text-sm text-muted-foreground">Faturamento</CardTitle>
            </CardHeader>
            <CardContent className="p-4 pt-0">
              <div className="text-lg font-bold">
                {formatCurrency(estatisticas.faturamentoTotal)}
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="p-4 pb-2">
              <CardTitle className="text-sm text-muted-foreground">Ticket Médio</CardTitle>
            </CardHeader>
            <CardContent className="p-4 pt-0">
              <div className="text-lg font-bold">
                {formatCurrency(estatisticas.ticketMedioGeral)}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Search + Vendor Filter */}
      <div className="flex gap-2 items-center" data-tour="clientes-search">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
          <Input
            placeholder="Buscar por cliente ou produto (ex: 1,95)..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
        <div className="relative">
          <div className="relative">
            <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
            <Input
              placeholder="Vendedor"
              value={vendorSearchTerm}
              onChange={(e) => {
                const val = e.target.value;
                setVendorSearchTerm(val);
                setVendorDropdownOpen(val.length > 0);
                if (val === '') {
                  setVendorFilter("all");
                }
              }}
              onFocus={() => setVendorDropdownOpen(true)}
              onBlur={() => setTimeout(() => setVendorDropdownOpen(false), 200)}
              className={`pl-8 h-10 w-[160px] sm:w-[200px] text-sm ${vendorFilter !== "all" ? 'pr-7 bg-muted/30' : ''}`}
            />
            {vendorFilter !== "all" && (
              <X
                className="absolute right-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground cursor-pointer hover:text-foreground"
                onClick={() => {
                  setVendorSearchTerm('');
                  setVendorFilter("all");
                  setVendorDropdownOpen(false);
                }}
              />
            )}
          </div>
          {vendorDropdownOpen && (
            <div className="absolute z-50 w-full mt-1 bg-popover border border-border rounded-md shadow-lg max-h-48 overflow-y-auto">
              <div
                className="px-3 py-1.5 text-sm cursor-pointer hover:bg-accent font-medium"
                onMouseDown={() => {
                  setVendorSearchTerm('');
                  setVendorFilter("all");
                  setVendorDropdownOpen(false);
                }}
              >
                Todos vendedores
              </div>
              {vendedoresUnicos
                .filter(v => !vendorSearchTerm || v.toLowerCase().includes(vendorSearchTerm.toLowerCase()))
                .slice(0, 15)
                .map(v => (
                  <div
                    key={v}
                    className="px-3 py-1.5 text-sm cursor-pointer hover:bg-accent"
                    onMouseDown={() => {
                      setVendorSearchTerm(v);
                      setVendorFilter(v);
                      setVendorDropdownOpen(false);
                    }}
                  >
                    {v}
                  </div>
                ))}
            </div>
          )}
        </div>
      </div>

      {/* Lista de Clientes */}
      <Card data-tour="clientes-table">
        <CardHeader className="p-3 sm:p-4">
          <CardTitle className="text-sm sm:text-base">
            Base de Clientes ({clientesFiltrados.length})
            {clientesFiltrados.length > 0 && (
              <span className="text-xs sm:text-sm font-normal text-muted-foreground ml-2">
                {startIndex}-{endIndex} de {clientesFiltrados.length}
              </span>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent className="p-3 sm:p-4 pt-0">
          {isMobile ? (
            <BaseClientesTableMobile
              clientes={clientes.map(c => ({
                ...c,
                responsavel: (() => {
                  const vendedores = clienteVendedorIndex.get(c.nome);
                  return vendedores ? Array.from(vendedores).join(', ') : undefined;
                })()
              }))}
              onViewHistory={(cliente) => {
                const clienteComHistorico = carregarHistorico(cliente.nome);
                setSelectedCliente(clienteComHistorico);
                setExpandedPedidos(new Set());
                goToHistoricoPage(1);
              }}
              onFollowUp={(clienteName) => {
                setSelectedClienteFollowUp(clienteName);
                setFollowUpDialogOpen(true);
              }}
            />
          ) : (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Cliente</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Total Faturado</TableHead>
                    <TableHead>Pedidos</TableHead>
                    <TableHead>Ticket Médio</TableHead>
                    <TableHead>Última Compra</TableHead>
                    <TableHead>Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {clientes.map((cliente, index) => (
                    <TableRow key={cliente.nome}>
                      <TableCell className="font-medium">{cliente.nome}</TableCell>
                      <TableCell>{getStatusBadge(cliente.ativo)}</TableCell>
                      <TableCell>
                        {formatCurrency(cliente.totalFaturado)}
                      </TableCell>
                      <TableCell>{cliente.pedidosFaturados}</TableCell>
                      <TableCell>
                        {formatCurrency(cliente.ticketMedio)}
                      </TableCell>
                      <TableCell>
                        {cliente.ultimaCompra 
                          ? cliente.ultimaCompra.toLocaleDateString('pt-BR')
                          : "Nunca"
                        }
                        <div className="text-xs text-muted-foreground">
                          {getDiasUltimaCompra(cliente.ultimaCompra)}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-2">
                          <Button 
                            variant="outline" 
                            size="sm"
                            data-tour={index === 0 ? "clientes-historico" : undefined}
                            onClick={() => {
                              const clienteComHistorico = carregarHistorico(cliente.nome);
                              setSelectedCliente(clienteComHistorico);
                              setExpandedPedidos(new Set());
                              goToHistoricoPage(1);
                            }}
                          >
                            <Eye className="h-4 w-4 mr-1" />
                            Histórico
                          </Button>
                          
                          <Button 
                            variant="outline" 
                            size="sm"
                            data-tour={index === 0 ? "clientes-followup" : undefined}
                            onClick={() => {
                              setSelectedClienteFollowUp(cliente.nome);
                              setFollowUpDialogOpen(true);
                            }}
                          >
                            <MessageSquare className="h-4 w-4 mr-1" />
                            Follow-up
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </>
          )}
          
          {/* Paginação */}
          {totalPages > 1 && (
            <div className="flex justify-center mt-4" data-tour="clientes-pagination">
              <Pagination>
                <PaginationContent>
                  <PaginationItem>
                    <PaginationPrevious 
                      onClick={previousPage}
                      className={!canGoPrevious ? "pointer-events-none opacity-50" : "cursor-pointer"}
                    />
                  </PaginationItem>
                  
                  {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                    let pageNum;
                    if (totalPages <= 5) {
                      pageNum = i + 1;
                    } else if (currentPage <= 3) {
                      pageNum = i + 1;
                    } else if (currentPage >= totalPages - 2) {
                      pageNum = totalPages - 4 + i;
                    } else {
                      pageNum = currentPage - 2 + i;
                    }
                    
                    return (
                      <PaginationItem key={pageNum}>
                        <PaginationLink
                          onClick={() => goToPage(pageNum)}
                          isActive={currentPage === pageNum}
                          className="cursor-pointer"
                        >
                          {pageNum}
                        </PaginationLink>
                      </PaginationItem>
                    );
                  })}
                  
                  <PaginationItem>
                    <PaginationNext 
                      onClick={nextPage}
                      className={!canGoNext ? "pointer-events-none opacity-50" : "cursor-pointer"}
                    />
                  </PaginationItem>
                </PaginationContent>
              </Pagination>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Dialog de Histórico do Cliente */}
      <Dialog open={!!selectedCliente} onOpenChange={(open) => !open && setSelectedCliente(null)}>
        <DialogContent className="max-w-6xl max-h-[80vh]">
          <DialogHeader>
            <div className="flex items-center justify-between">
              <div>
                <DialogTitle>Histórico de Pedidos - {selectedCliente?.nome}</DialogTitle>
                <DialogDescription>
                  Total de {selectedCliente?.historico.length || 0} pedidos
                  {selectedCliente?.historico.length > 0 && (
                    <span className="ml-2">
                      (Mostrando {startHistoricoIndex}-{endHistoricoIndex} de {selectedCliente.historico.length})
                    </span>
                  )}
                </DialogDescription>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  if (selectedCliente) {
                    const nomeCliente = selectedCliente.nome;
                    setHistoricoCache(prev => {
                      const newCache = new Map(prev);
                      newCache.delete(nomeCliente);
                      return newCache;
                    });
                    console.log('Cache removido para cliente:', nomeCliente, '- Recarregando...');
                    const novoHistorico = carregarHistorico(nomeCliente);
                    setSelectedCliente(novoHistorico);
                  }
                }}
              >
                <RefreshCw className="h-4 w-4 mr-2" />
                Recarregar
              </Button>
            </div>
          </DialogHeader>
          
          <ScrollArea className="h-[60vh] w-full pr-4">
            {pedidosPaginados.length > 0 ? (
              <div className="space-y-2">
                {pedidosPaginados.map((pedido) => {
                  const isExpanded = expandedPedidos.has(pedido.numero_pedido);
                  
                  return (
                    <Card key={pedido.numero_pedido} className="overflow-hidden">
                      <div className="p-4">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <div>
                              <div className="font-semibold">Pedido #{pedido.numero_pedido}</div>
                              <div className="text-sm text-muted-foreground">
                                Emissão: {pedido.data_emissao}
                              </div>
                              {pedido.vendedor && (
                                <div className="text-sm text-muted-foreground">
                                  Vendedor: {pedido.vendedor}
                                </div>
                              )}
                            </div>
                          </div>
                          
                          <div className="flex items-center gap-4">
                            <div className="text-right">
                              <div className="font-semibold">{formatCurrency(pedido.valor_total)}</div>
                              <div className="text-sm text-muted-foreground">
                                Peso: {pedido.peso_total.toFixed(2)} kg
                              </div>
                              <Badge className={
                                pedido.status === "Faturado" 
                                  ? "bg-green-100 text-green-800" 
                                  : pedido.status === "Perdido"
                                  ? "bg-red-100 text-red-800"
                                  : "bg-blue-100 text-blue-800"
                              }>
                                {pedido.status}
                              </Badge>
                            </div>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => togglePedido(pedido.numero_pedido)}
                            >
                              {isExpanded ? (
                                <>
                                  <ChevronDown className="h-4 w-4 mr-1" />
                                  Ocultar Itens
                                </>
                              ) : (
                                <>
                                  <ChevronRight className="h-4 w-4 mr-1" />
                                  Ver Itens
                                </>
                              )}
                            </Button>
                          </div>
                        </div>
                        
                        {pedido.perdido_motivo && (
                          <div className="mt-2 text-sm text-red-600">
                            Motivo: {pedido.perdido_motivo}
                          </div>
                        )}
                      </div>
                      
                      {isExpanded && pedido.itens.length > 0 && (
                        <div className="border-t bg-muted/20 p-4">
                          <Table>
                            <TableHeader>
                             <TableRow>
                                <TableHead>Descrição</TableHead>
                                <TableHead className="text-right">Quantidade</TableHead>
                                <TableHead className="text-right">Peso (kg)</TableHead>
                                <TableHead className="text-right">Preço Unit.</TableHead>
                                <TableHead className="text-right">Valor</TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {pedido.itens.map((item, idx) => (
                                <TableRow key={idx}>
                                  <TableCell>{item.descricao}</TableCell>
                                  <TableCell className="text-right">{item.quantidade}</TableCell>
                                  <TableCell className="text-right">{item.peso.toFixed(2)}</TableCell>
                                  <TableCell className="text-right">{formatCurrency(item.preco_unitario)}</TableCell>
                                  <TableCell className="text-right">{formatCurrency(item.valor)}</TableCell>
                                </TableRow>
                              ))}
                            </TableBody>
                          </Table>
                        </div>
                      )}
                    </Card>
                  );
                })}
              </div>
            ) : (
              <div className="text-center text-muted-foreground py-8">
                Nenhum pedido encontrado para este cliente.
              </div>
            )}
          </ScrollArea>
          
          {/* Paginação do Histórico */}
          {totalHistoricoPages > 1 && (
            <div className="flex justify-center mt-4 pt-4 border-t">
              <Pagination>
                <PaginationContent>
                  <PaginationItem>
                    <PaginationPrevious 
                      onClick={previousHistoricoPageWithReset}
                      className={!canGoPreviousHistorico ? "pointer-events-none opacity-50" : "cursor-pointer"}
                    />
                  </PaginationItem>
                  
                  {Array.from({ length: Math.min(5, totalHistoricoPages) }, (_, i) => {
                    let pageNum;
                    if (totalHistoricoPages <= 5) {
                      pageNum = i + 1;
                    } else if (currentHistoricoPage <= 3) {
                      pageNum = i + 1;
                    } else if (currentHistoricoPage >= totalHistoricoPages - 2) {
                      pageNum = totalHistoricoPages - 4 + i;
                    } else {
                      pageNum = currentHistoricoPage - 2 + i;
                    }
                    
                    return (
                      <PaginationItem key={pageNum}>
                        <PaginationLink
                          onClick={() => goToHistoricoPageWithReset(pageNum)}
                          isActive={currentHistoricoPage === pageNum}
                          className="cursor-pointer"
                        >
                          {pageNum}
                        </PaginationLink>
                      </PaginationItem>
                    );
                  })}
                  
                  <PaginationItem>
                    <PaginationNext 
                      onClick={nextHistoricoPageWithReset}
                      className={!canGoNextHistorico ? "pointer-events-none opacity-50" : "cursor-pointer"}
                    />
                  </PaginationItem>
                </PaginationContent>
              </Pagination>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Dialog de Follow-up do Cliente */}
      <ClientFollowUpDialog
        open={followUpDialogOpen}
        onOpenChange={setFollowUpDialogOpen}
        clientName={selectedClienteFollowUp}
      />
    </div>
  );
}