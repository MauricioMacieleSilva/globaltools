import React, { useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ChevronDown, ChevronRight, EyeOff, Eye } from 'lucide-react';
import { useComercial } from '@/context/ComercialContext';
import { useIsMobile } from '@/hooks/use-mobile';
import { PerdidosTableMobile } from './PerdidosTableMobile';
import { ExcludedOrdersDialog } from '@/components/admin/ExcludedOrdersDialog';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

export function PerdidosTable() {
  const { filteredData, refreshData } = useComercial();
  const [expandedOrders, setExpandedOrders] = useState<Set<string>>(new Set());
  const [showExcludedDialog, setShowExcludedDialog] = useState(false);
  const isMobile = useIsMobile();
  const { toast } = useToast();

  const groupedPerdidos = useMemo(() => {
    const filtered = filteredData.filter(item => 
      item.situacao === 'Perdido' && 
      item.perdido_motivo && 
      item.perdido_motivo !== 'Não informado'
    );
    
    // Group by numeropedido
    const grouped = filtered.reduce((acc, item) => {
      const orderNumber = item.numeropedido;
      
      if (!acc[orderNumber]) {
        acc[orderNumber] = {
          numeropedido: orderNumber,
          cliente: item.cliente,
          cli_cidade: item.cli_cidade,
          uf: item.uf,
          classe: item.classe,
          vendedor: item.vendedor,
          data_perdido: item.data_perdido,
          perdido_motivo: item.perdido_motivo,
          valor_total: 0,
          items: []
        };
      }
      
      acc[orderNumber].valor_total += item.valor;
      acc[orderNumber].items.push(item);
      
      return acc;
    }, {} as Record<string, any>);

    // Convert to array and sort by total value
    return Object.values(grouped)
      .sort((a: any, b: any) => b.valor_total - a.valor_total)
      .slice(0, 50); // Limit to 50 orders
  }, [filteredData]);

  const toggleOrder = (orderNumber: string) => {
    const newExpanded = new Set(expandedOrders);
    if (newExpanded.has(orderNumber)) {
      newExpanded.delete(orderNumber);
    } else {
      newExpanded.add(orderNumber);
    }
    setExpandedOrders(newExpanded);
  };

  const handleExcludeOrder = async (numeroPedido: string) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      const { error } = await supabase
        .from('excluded_orders')
        .insert({
          numero_pedido: numeroPedido,
          motivo: 'Excluído da aba de perdidos',
          created_by: user?.id
        });

      if (error) throw error;

      toast({
        title: "Sucesso",
        description: "Pedido excluído dos indicadores de perdidos"
      });

      refreshData();
    } catch (error: any) {
      console.error('Erro ao excluir pedido:', error);
      toast({
        title: "Erro",
        description: error.message?.includes('duplicate key') 
          ? "Este pedido já está excluído" 
          : "Erro ao excluir pedido",
        variant: "destructive"
      });
    }
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value);
  };

  const formatDate = (dateString: string) => {
    if (!dateString) return '-';
    
    try {
      let date;
      if (dateString.includes('/')) {
        const [day, month, year] = dateString.split('/');
        date = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
      } else {
        date = new Date(dateString);
      }
      
      return date.toLocaleDateString('pt-BR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric'
      });
    } catch {
      return '-';
    }
  };

  const getMotivoBadgeVariant = (motivo: string) => {
    const motivosComuns = {
      'preço': 'destructive',
      'prazo': 'secondary',
      'concorrência': 'outline',
      'qualidade': 'default'
    };
    
    const motivoLower = motivo.toLowerCase();
    for (const [key, variant] of Object.entries(motivosComuns)) {
      if (motivoLower.includes(key)) {
        return variant as 'destructive' | 'secondary' | 'outline' | 'default';
      }
    }
    return 'outline' as const;
  };

  if (groupedPerdidos.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-destructive">Detalhamento dos Perdidos</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-muted-foreground">
            Nenhum pedido perdido encontrado no período selecionado.
          </div>
        </CardContent>
      </Card>
    );
  };

  return (
    <>
    <Card>
      <CardHeader className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 p-2 sm:p-4">
        <CardTitle className="text-destructive text-sm sm:text-base">
          Perdidos ({groupedPerdidos.length})
        </CardTitle>
        <Button
          variant="outline"
          size="sm"
          onClick={() => setShowExcludedDialog(true)}
          className="h-7 sm:h-8 text-xs sm:text-sm"
        >
          <Eye className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
          <span className="hidden sm:inline">Ver </span>Excluídos
        </Button>
      </CardHeader>
      <CardContent className="p-2 sm:p-4 pt-0">
        {isMobile ? (
          <PerdidosTableMobile
            groupedPerdidos={groupedPerdidos}
            expandedOrders={expandedOrders}
            toggleOrder={toggleOrder}
            formatCurrency={formatCurrency}
            formatDate={formatDate}
            getMotivoBadgeVariant={getMotivoBadgeVariant}
          />
        ) : (
          <>
            <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-12"></TableHead>
                <TableHead>Pedido</TableHead>
                <TableHead>Cliente</TableHead>
                <TableHead>Classe</TableHead>
                <TableHead>UF</TableHead>
                <TableHead className="text-right">Valor Total</TableHead>
                <TableHead>Motivo</TableHead>
                <TableHead>Data Perdido</TableHead>
                <TableHead>Vendedor</TableHead>
                <TableHead className="w-20">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {groupedPerdidos.map((order: any) => (
                <React.Fragment key={order.numeropedido}>
                  {/* Summary Row */}
                  <TableRow className="cursor-pointer hover:bg-muted/50" onClick={() => toggleOrder(order.numeropedido)}>
                    <TableCell>
                      <Button variant="ghost" size="sm" className="h-6 w-6 p-0">
                        {expandedOrders.has(order.numeropedido) ? (
                          <ChevronDown className="h-4 w-4" />
                        ) : (
                          <ChevronRight className="h-4 w-4" />
                        )}
                      </Button>
                    </TableCell>
                    <TableCell className="font-medium">
                      {order.numeropedido}
                      <div className="text-xs text-muted-foreground">
                        {order.items.length} item{order.items.length !== 1 ? 's' : ''}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div>
                        <div className="font-medium">{order.cliente}</div>
                        <div className="text-xs text-muted-foreground">{order.cli_cidade}</div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">Classe {order.classe}</Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant="secondary">{order.uf}</Badge>
                    </TableCell>
                    <TableCell className="text-right font-medium">
                      {formatCurrency(order.valor_total)}
                    </TableCell>
                    <TableCell>
                      <Badge variant={getMotivoBadgeVariant(order.perdido_motivo || '')}>
                        {order.perdido_motivo || 'Não informado'}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {formatDate(order.data_perdido)}
                    </TableCell>
                    <TableCell>
                      <div className="text-sm">{order.vendedor}</div>
                    </TableCell>
                    <TableCell>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleExcludeOrder(order.numeropedido);
                        }}
                        title="Excluir dos indicadores"
                      >
                        <EyeOff className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                  
                  {/* Expanded Product Details */}
                  {expandedOrders.has(order.numeropedido) && order.items.map((item: any, index: number) => (
                    <TableRow key={`${order.numeropedido}-item-${index}`} className="bg-muted/20">
                      <TableCell></TableCell>
                      <TableCell className="pl-8">
                        <div className="text-sm text-muted-foreground">Item {index + 1}</div>
                      </TableCell>
                      <TableCell>
                        <div>
                          <div className="font-medium">{item.descricaomat}</div>
                          <div className="text-xs text-muted-foreground">
                            {item.qtd} {item.un}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">Classe {item.classe}</Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant="secondary">{item.uf}</Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        {formatCurrency(item.valor)}
                      </TableCell>
                      <TableCell>
                        <Badge variant={getMotivoBadgeVariant(item.perdido_motivo || '')}>
                          {item.perdido_motivo || 'Não informado'}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {formatDate(item.data_perdido)}
                      </TableCell>
                      <TableCell>
                        <div className="text-sm">{item.vendedor}</div>
                      </TableCell>
                    </TableRow>
                  ))}
                </React.Fragment>
              ))}
            </TableBody>
          </Table>
        </div>
        
        {groupedPerdidos.length === 50 && (
          <div className="mt-4 p-3 bg-muted/50 rounded-lg text-sm text-muted-foreground text-center">
            Mostrando os primeiros 50 pedidos ordenados por valor. 
            Use os filtros para refinar a busca.
          </div>
        )}
        </>
        )}
      </CardContent>
    </Card>
    
    <ExcludedOrdersDialog
      isOpen={showExcludedDialog}
      onClose={() => {
        setShowExcludedDialog(false);
        refreshData();
      }}
    />
    </>
  );
}