import React, { useState, useMemo } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ScrollArea } from '@/components/ui/scroll-area';
import { ChevronDown, ChevronRight, FileSpreadsheet } from 'lucide-react';
import { Button } from '@/components/ui/button';
import * as XLSX from 'xlsx';
import { formatDateSafe, parseDate } from '@/lib/utils-comercial';

interface FaturamentoDialogProps {
  isOpen: boolean;
  onClose: () => void;
  data: any[];
}

export function FaturamentoDialog({ isOpen, onClose, data }: FaturamentoDialogProps) {
  const [expandedPedidos, setExpandedPedidos] = useState<Set<string>>(new Set());
  
  // Calcular quantidades para o título
  const totalPedidos = useMemo(() => {
    const uniquePedidos = new Set(data.map(item => item.numeropedido));
    return uniquePedidos.size;
  }, [data]);
  
  const totalClientes = useMemo(() => {
    const uniqueClientes = new Set(data.map(item => item.codigocliente));
    return uniqueClientes.size;
  }, [data]);
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(value);
  };

  const groupedData = useMemo(() => {
    const groups: Record<string, any[]> = {};
    data.forEach(item => {
      const pedidoKey = item.numeropedido || 'Sem Pedido';
      if (!groups[pedidoKey]) {
        groups[pedidoKey] = [];
      }
      groups[pedidoKey].push(item);
    });
    
    // Ordenar grupos pela data mais recente
    const sortedGroups: Record<string, any[]> = {};
    Object.entries(groups)
      .sort(([, a], [, b]) => {
        const dateA = (parseDate(a[0].data_emissao) || new Date(0)).getTime();
        const dateB = (parseDate(b[0].data_emissao) || new Date(0)).getTime();
        return dateB - dateA; // Data mais nova primeiro
      })
      .forEach(([key, value]) => {
        sortedGroups[key] = value;
      });
    
    return sortedGroups;
  }, [data]);

  const togglePedido = (pedidoNumber: string) => {
    const newExpanded = new Set(expandedPedidos);
    if (newExpanded.has(pedidoNumber)) {
      newExpanded.delete(pedidoNumber);
    } else {
      newExpanded.add(pedidoNumber);
    }
    setExpandedPedidos(newExpanded);
  };

  const handleExportExcel = () => {
    const rows = data.map(item => ({
      Pedido: item.numeropedido || '',
      NF: item.numeronf || '',
      Data: formatDateSafe(item.data_emissao),
      Cliente: item.cli_nomefantasia || '',
      UF: item.uf || '',
      Cidade: item.cli_cidade || '',
      Vendedor: item.vendedor || '',
      Material: item.descricaomat || '',
      Observação: item.observacao || '',
      Quantidade: item.qtd,
      Unidade: item.un || '',
      'Valor Unitário': item.valor_un_bruto,
      'Valor Total': item.valor,
      'Peso (kg)': item.peso,
    }));
    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Faturamento');
    const today = new Date().toISOString().slice(0, 10);
    XLSX.writeFile(wb, `pedidos-faturados-${today}.xlsx`);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-[90vw] max-h-[85vh]">
        <DialogHeader>
          <div className="flex items-center justify-between gap-4 pr-8">
            <DialogTitle>Pedidos Faturados ({totalPedidos} pedidos • {totalClientes} clientes)</DialogTitle>
            <Button
              variant="outline"
              size="sm"
              onClick={handleExportExcel}
              disabled={data.length === 0}
              className="gap-2"
            >
              <FileSpreadsheet className="h-4 w-4" />
              Exportar Excel
            </Button>
          </div>
        </DialogHeader>
        <ScrollArea className="h-[70vh]"> {/* Aumentado de 60vh para 70vh para aproveitar o espaço extra */}
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
              <TableRow>
                <TableHead></TableHead>
                <TableHead>Pedido</TableHead>
                <TableHead>NF</TableHead>
                <TableHead>Data</TableHead>
                <TableHead>Cliente</TableHead>
                <TableHead>UF/Cidade</TableHead>
                <TableHead>Vendedor</TableHead>
                <TableHead className="text-right">Valor Total</TableHead>
                <TableHead className="text-right">Peso (kg)</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {Object.entries(groupedData).map(([pedidoNumber, items]) => {
                const isExpanded = expandedPedidos.has(pedidoNumber);
                const totalPedido = items.reduce((sum, item) => sum + item.valor, 0);
                const totalPeso = items.reduce((sum, item) => sum + item.peso, 0);
                const firstItem = items[0];
                
                return (
                  <React.Fragment key={pedidoNumber}>
                    <TableRow 
                      className="cursor-pointer hover:bg-muted/50" 
                      onClick={() => togglePedido(pedidoNumber)}
                    >
                      <TableCell className="w-8">
                        {isExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                      </TableCell>
                      <TableCell className="font-medium">{firstItem.numeropedido || pedidoNumber}</TableCell>
                      <TableCell>{firstItem.numeronf || '-'}</TableCell>
                      <TableCell>{formatDateSafe(firstItem.data_emissao)}</TableCell>
                      <TableCell className="max-w-[150px] truncate" title={firstItem.cli_nomefantasia}>
                        {firstItem.cli_nomefantasia}
                      </TableCell>
                      <TableCell>{firstItem.uf}/{firstItem.cli_cidade}</TableCell>
                      <TableCell>{firstItem.vendedor}</TableCell>
                      <TableCell className="text-right font-medium">{formatCurrency(totalPedido)}</TableCell>
                      <TableCell className="text-right">{totalPeso.toLocaleString('pt-BR')}</TableCell>
                    </TableRow>
                    {isExpanded && items.map((item, itemIndex) => (
                      <TableRow key={`${pedidoNumber}-${itemIndex}`} className="bg-muted/20">
                        <TableCell></TableCell>
                        <TableCell colSpan={2} className="text-sm text-muted-foreground">
                          {item.descricaomat}
                        </TableCell>
                        <TableCell className="text-sm">{item.observacao || '-'}</TableCell>
                          <TableCell className="text-sm">{item.qtd} {item.un}</TableCell>
                          <TableCell className="text-sm">{formatCurrency(item.valor_un_bruto)}</TableCell>
                          <TableCell></TableCell>
                          <TableCell className="text-right text-sm">{formatCurrency(item.valor)}</TableCell>
                        <TableCell className="text-right text-sm">{item.peso.toLocaleString('pt-BR')}</TableCell>
                      </TableRow>
                    ))}
                  </React.Fragment>
                );
              })}
              {Object.keys(groupedData).length === 0 && (
                <TableRow>
                  <TableCell colSpan={9} className="text-center text-muted-foreground">
                    Nenhum pedido faturado
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
            </Table>
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}