import React from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ChevronDown, ChevronRight } from 'lucide-react';
import { MobileTableCard } from '@/components/ui/mobile-table-card';

interface PerdidosTableMobileProps {
  groupedPerdidos: any[];
  expandedOrders: Set<string>;
  toggleOrder: (orderNumber: string) => void;
  formatCurrency: (value: number) => string;
  formatDate: (dateString: string) => string;
  getMotivoBadgeVariant: (motivo: string) => 'destructive' | 'secondary' | 'outline' | 'default';
}

export function PerdidosTableMobile({
  groupedPerdidos,
  expandedOrders,
  toggleOrder,
  formatCurrency,
  formatDate,
  getMotivoBadgeVariant
}: PerdidosTableMobileProps) {
  return (
    <div className="space-y-3">
      {groupedPerdidos.map((order: any) => (
        <div key={order.numeropedido} className="space-y-2">
          <MobileTableCard
            title={`Pedido ${order.numeropedido}`}
            subtitle={
              <div>
                <div className="font-medium">{order.cliente}</div>
                <div className="text-xs text-muted-foreground">{order.cli_cidade}</div>
              </div>
            }
            badge={
              <Badge variant={getMotivoBadgeVariant(order.perdido_motivo || '')}>
                {order.perdido_motivo || 'Não informado'}
              </Badge>
            }
            fields={[
              {
                label: 'Classe',
                value: <Badge variant="outline" className="text-xs">Classe {order.classe}</Badge>
              },
              {
                label: 'UF',
                value: <Badge variant="secondary" className="text-xs">{order.uf}</Badge>
              },
              {
                label: 'Valor Total',
                value: <span className="font-bold text-destructive">{formatCurrency(order.valor_total)}</span>
              },
              {
                label: 'Data Perdido',
                value: formatDate(order.data_perdido)
              },
              {
                label: 'Vendedor',
                value: order.vendedor
              },
              {
                label: 'Itens',
                value: `${order.items.length} item${order.items.length !== 1 ? 's' : ''}`
              }
            ]}
            actions={
              <Button
                variant="outline"
                size="sm"
                onClick={() => toggleOrder(order.numeropedido)}
                className="w-full"
              >
                {expandedOrders.has(order.numeropedido) ? (
                  <>
                    <ChevronDown className="h-4 w-4 mr-2" />
                    Ocultar Itens
                  </>
                ) : (
                  <>
                    <ChevronRight className="h-4 w-4 mr-2" />
                    Ver Itens ({order.items.length})
                  </>
                )}
              </Button>
            }
          />

          {/* Expanded Items */}
          {expandedOrders.has(order.numeropedido) && (
            <div className="ml-3 space-y-2 border-l-2 border-destructive/20 pl-3">
              {order.items.map((item: any, index: number) => (
                <div key={`${order.numeropedido}-item-${index}`} className="bg-muted/30 p-3 rounded-lg">
                  <div className="text-sm font-medium mb-2">Item {index + 1}</div>
                  <div className="space-y-1 text-xs">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Material:</span>
                      <span className="font-medium text-right">{item.descricaomat}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Quantidade:</span>
                      <span className="font-medium">{item.qtd} {item.un}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Valor:</span>
                      <span className="font-medium">{formatCurrency(item.valor)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Classe:</span>
                      <Badge variant="outline" className="text-xs">Classe {item.classe}</Badge>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-muted-foreground">Motivo:</span>
                      <Badge variant={getMotivoBadgeVariant(item.perdido_motivo || '')} className="text-xs">
                        {item.perdido_motivo || 'Não informado'}
                      </Badge>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      ))}
      
      {groupedPerdidos.length === 50 && (
        <div className="mt-4 p-3 bg-muted/50 rounded-lg text-sm text-muted-foreground text-center">
          Mostrando os primeiros 50 pedidos ordenados por valor. 
          Use os filtros para refinar a busca.
        </div>
      )}
    </div>
  );
}
