import React, { useState, useMemo } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ChevronDown, ChevronRight } from 'lucide-react';
import { ComercialData } from '@/context/ComercialContext';

interface DevolucaoDialogProps {
  isOpen: boolean;
  onClose: () => void;
  data: ComercialData[];
}

export function DevolucaoDialog({ isOpen, onClose, data }: DevolucaoDialogProps) {
  const [expandedPedidos, setExpandedPedidos] = useState<Set<string>>(new Set());

  const { totalPedidos, totalClientes, groupedData } = useMemo(() => {
    const devolucaoData = data.filter(item => item.situacao === 'Devolvido');
    const pedidosUnicos = new Set(devolucaoData.map(item => item.numeropedido));
    const clientesUnicos = new Set(devolucaoData.map(item => item.cliente));
    
    const grouped = devolucaoData.reduce((acc, item) => {
      if (!acc[item.numeropedido]) {
        acc[item.numeropedido] = [];
      }
      acc[item.numeropedido].push(item);
      return acc;
    }, {} as Record<string, ComercialData[]>);

    return {
      totalPedidos: pedidosUnicos.size,
      totalClientes: clientesUnicos.size,
      groupedData: grouped
    };
  }, [data]);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(value);
  };

  const formatDate = (dateString: string) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.toLocaleDateString('pt-BR');
  };

  const togglePedido = (numeroPedido: string) => {
    const newExpanded = new Set(expandedPedidos);
    if (newExpanded.has(numeroPedido)) {
      newExpanded.delete(numeroPedido);
    } else {
      newExpanded.add(numeroPedido);
    }
    setExpandedPedidos(newExpanded);
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-6xl max-h-[80vh] overflow-hidden">
        <DialogHeader>
          <DialogTitle className="text-orange-600">Pedidos com Devolução</DialogTitle>
          <p className="text-sm text-muted-foreground">
            {totalPedidos} pedidos • {totalClientes} clientes
          </p>
        </DialogHeader>
        
        <div className="overflow-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[50px]"></TableHead>
                <TableHead>Pedido</TableHead>
                <TableHead>Data</TableHead>
                <TableHead>Cliente</TableHead>
                <TableHead>Vendedor</TableHead>
                <TableHead className="text-right">Valor Total</TableHead>
                <TableHead className="text-right">Peso (kg)</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {Object.entries(groupedData).map(([numeroPedido, items]) => {
                const firstItem = items[0];
                const totalPedido = items.reduce((sum, item) => sum + item.valor, 0);
                const totalPeso = items.reduce((sum, item) => sum + item.peso, 0);
                const isExpanded = expandedPedidos.has(numeroPedido);

                return (
                  <React.Fragment key={numeroPedido}>
                    <TableRow 
                      className="cursor-pointer hover:bg-muted/50"
                      onClick={() => togglePedido(numeroPedido)}
                    >
                      <TableCell>
                        {isExpanded ? (
                          <ChevronDown className="h-4 w-4" />
                        ) : (
                          <ChevronRight className="h-4 w-4" />
                        )}
                      </TableCell>
                      <TableCell className="font-medium">{numeroPedido}</TableCell>
                      <TableCell>{formatDate(firstItem.data_emissao)}</TableCell>
                      <TableCell>{firstItem.cliente}</TableCell>
                      <TableCell>{firstItem.vendedor}</TableCell>
                      <TableCell className="text-right font-medium text-orange-600">
                        {formatCurrency(totalPedido)}
                      </TableCell>
                      <TableCell className="text-right">
                        {new Intl.NumberFormat('pt-BR').format(totalPeso)}
                      </TableCell>
                    </TableRow>

                    {isExpanded && items.map((item, index) => (
                      <TableRow key={`${numeroPedido}-${index}`} className="bg-muted/20">
                        <TableCell></TableCell>
                        <TableCell className="pl-8 text-sm text-muted-foreground">
                          Item #{index + 1}
                        </TableCell>
                        <TableCell className="text-sm">{item.classe}</TableCell>
                        <TableCell className="text-sm">{item.uf}</TableCell>
                        <TableCell className="text-sm">-</TableCell>
                        <TableCell className="text-right text-sm">
                          {formatCurrency(item.valor)}
                        </TableCell>
                        <TableCell className="text-right text-sm">
                          {new Intl.NumberFormat('pt-BR').format(item.peso)}
                        </TableCell>
                      </TableRow>
                    ))}
                  </React.Fragment>
                );
              })}
            </TableBody>
          </Table>

          {Object.keys(groupedData).length === 0 && (
            <div className="text-center py-8 text-muted-foreground">
              Nenhuma devolução encontrada para o período selecionado.
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}