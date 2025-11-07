import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { 
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from '@/components/ui/pagination';
import { useComercial } from '@/context/ComercialContext';
import { usePagination } from '@/hooks/usePagination';

export function PedidosTable() {
  const { filteredData, isLoading } = useComercial();
  
  const {
    currentPage,
    totalPages,
    paginatedData,
    itemsPerPage,
    startIndex,
    endIndex,
    goToPage,
    nextPage,
    previousPage,
    setItemsPerPage,
    canGoNext,
    canGoPrevious
  } = usePagination({ 
    data: filteredData, 
    itemsPerPage: 50 
  });

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value);
  };

  const formatNumber = (value: number) => {
    return new Intl.NumberFormat('pt-BR').format(value);
  };

  const getSituacaoVariant = (situacao: string) => {
    switch (situacao) {
      case 'Emitida':
        return 'default';
      case 'Pendente':
        return 'secondary';
      default:
        return 'outline';
    }
  };

  if (isLoading) {
    return (
      <Card className="h-64">
        <CardHeader className="pb-2 px-3 pt-3">
          <div className="h-4 w-24 bg-muted animate-pulse rounded" />
        </CardHeader>
        <CardContent className="px-3 pb-3">
          <div className="space-y-2">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="flex space-x-2">
                <div className="h-3 w-[80px] bg-muted animate-pulse rounded" />
                <div className="h-3 w-[60px] bg-muted animate-pulse rounded" />
                <div className="h-3 w-[120px] bg-muted animate-pulse rounded" />
                <div className="h-3 w-[40px] bg-muted animate-pulse rounded" />
                <div className="h-3 w-[60px] bg-muted animate-pulse rounded" />
                <div className="h-3 w-[80px] bg-muted animate-pulse rounded" />
                <div className="h-3 w-[50px] bg-muted animate-pulse rounded" />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  const renderPaginationItems = () => {
    const items = [];
    const maxVisiblePages = 3;
    const startPage = Math.max(1, currentPage - Math.floor(maxVisiblePages / 2));
    const endPage = Math.min(totalPages, startPage + maxVisiblePages - 1);

    for (let page = startPage; page <= endPage; page++) {
      items.push(
        <PaginationItem key={page}>
          <PaginationLink
            href="#"
            onClick={(e) => {
              e.preventDefault();
              goToPage(page);
            }}
            isActive={page === currentPage}
            className="h-8 w-8 text-xs"
          >
            {page}
          </PaginationLink>
        </PaginationItem>
      );
    }

    return items;
  };

  return (
    <Card className="flex-1 min-h-0">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-lg font-bold">Pedidos</CardTitle>
        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground">
            {startIndex}-{endIndex} de {filteredData.length}
          </span>
          <Select value={itemsPerPage.toString()} onValueChange={(value) => setItemsPerPage(Number(value))}>
            <SelectTrigger className="w-20 h-8">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="25">25</SelectItem>
              <SelectItem value="50">50</SelectItem>
              <SelectItem value="100">100</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </CardHeader>
      <CardContent className="p-0 flex-1 flex flex-col">
        <div className="flex-1 overflow-auto">
          {filteredData.length === 0 ? (
            <div className="p-6 text-center text-muted-foreground">
              Nenhum registro encontrado.
            </div>
          ) : (
            <Table>
              <TableHeader className="sticky top-0 bg-background z-10">
                <TableRow>
                  <TableHead className="w-[150px]">Cliente</TableHead>
                  <TableHead className="w-[100px]">Produto</TableHead>
                  <TableHead className="w-[80px]">Qtd</TableHead>
                  <TableHead className="w-[100px]">Valor Unit.</TableHead>
                  <TableHead className="w-[100px]">Valor Total</TableHead>
                  <TableHead className="w-[60px]">UF</TableHead>
                  <TableHead className="w-[100px]">Situação</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paginatedData.map((pedido, index) => (
                  <TableRow key={index}>
                    <TableCell className="font-medium text-xs">
                      {pedido.cli_nomefantasia}
                    </TableCell>
                    <TableCell className="text-xs">{pedido.descricaomat}</TableCell>
                    <TableCell className="text-xs">{formatNumber(pedido.qtd)} {pedido.un}</TableCell>
                    <TableCell className="text-xs">{formatCurrency(pedido.valor_un_bruto)}</TableCell>
                    <TableCell className="text-xs">{formatCurrency(pedido.valor)}</TableCell>
                    <TableCell className="text-xs">{pedido.uf}</TableCell>
                    <TableCell>
                      <Badge variant={getSituacaoVariant(pedido.situacao)} className="text-xs">
                        {pedido.situacao}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </div>
        
        {/* Pagination */}
        {totalPages > 1 && (
          <div className="border-t bg-background px-6 py-3">
            <Pagination>
              <PaginationContent>
                <PaginationItem>
                  <PaginationPrevious 
                    href="#"
                    onClick={(e) => {
                      e.preventDefault();
                      if (canGoPrevious) previousPage();
                    }}
                    className={`h-8 text-xs ${!canGoPrevious ? 'pointer-events-none opacity-50' : ''}`}
                  />
                </PaginationItem>
                
                {currentPage > 2 && (
                  <>
                    <PaginationItem>
                      <PaginationLink 
                        href="#" 
                        onClick={(e) => { e.preventDefault(); goToPage(1); }}
                        className="h-8 w-8 text-xs"
                      >
                        1
                      </PaginationLink>
                    </PaginationItem>
                    {currentPage > 3 && (
                      <PaginationItem>
                        <PaginationEllipsis className="h-8 w-8" />
                      </PaginationItem>
                    )}
                  </>
                )}
                
                {renderPaginationItems()}
                
                {currentPage < totalPages - 1 && (
                  <>
                    {currentPage < totalPages - 2 && (
                      <PaginationItem>
                        <PaginationEllipsis className="h-8 w-8" />
                      </PaginationItem>
                    )}
                    <PaginationItem>
                      <PaginationLink 
                        href="#" 
                        onClick={(e) => { e.preventDefault(); goToPage(totalPages); }}
                        className="h-8 w-8 text-xs"
                      >
                        {totalPages}
                      </PaginationLink>
                    </PaginationItem>
                  </>
                )}
                
                <PaginationItem>
                  <PaginationNext 
                    href="#"
                    onClick={(e) => {
                      e.preventDefault();
                      if (canGoNext) nextPage();
                    }}
                    className={`h-8 text-xs ${!canGoNext ? 'pointer-events-none opacity-50' : ''}`}
                  />
                </PaginationItem>
              </PaginationContent>
            </Pagination>
          </div>
        )}
      </CardContent>
    </Card>
  );
}