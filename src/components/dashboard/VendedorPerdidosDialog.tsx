import React from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  TrendingDown, 
  Calendar, 
  Package, 
  DollarSign,
  Tag,
  Building2,
  MapPin
} from 'lucide-react';
import { ComercialData } from '@/context/ComercialContext';

interface VendedorPerdidosDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  vendedor: string;
  pedidos: ComercialData[];
  valorTotal: number;
  percentualTotal: number;
}

export const VendedorPerdidosDialog = ({
  open,
  onOpenChange,
  vendedor,
  pedidos,
  valorTotal,
  percentualTotal
}: VendedorPerdidosDialogProps) => {
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(value);
  };

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return '-';
    try {
      const date = new Date(dateStr);
      return date.toLocaleDateString('pt-BR');
    } catch {
      return dateStr;
    }
  };

  // Agrupar por motivo para o resumo
  const motivosAgrupados = React.useMemo(() => {
    const motivos: Record<string, { count: number; valor: number }> = {};
    pedidos.forEach(p => {
      const motivo = p.perdido_motivo || 'Não informado';
      if (!motivos[motivo]) {
        motivos[motivo] = { count: 0, valor: 0 };
      }
      motivos[motivo].count++;
      motivos[motivo].valor += p.valor || 0;
    });
    return Object.entries(motivos)
      .map(([motivo, data]) => ({ motivo, ...data }))
      .sort((a, b) => b.valor - a.valor);
  }, [pedidos]);

  const ticketMedio = pedidos.length > 0 ? valorTotal / pedidos.length : 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[85vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-lg">
            <TrendingDown className="h-5 w-5 text-destructive" />
            Perdidos - {vendedor}
          </DialogTitle>
        </DialogHeader>

        {/* Resumo */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 py-3 border-b">
          <div className="text-center p-2 rounded-lg bg-destructive/10">
            <p className="text-xs text-muted-foreground">Total Perdido</p>
            <p className="text-sm font-bold text-destructive">{formatCurrency(valorTotal)}</p>
          </div>
          <div className="text-center p-2 rounded-lg bg-muted">
            <p className="text-xs text-muted-foreground">Pedidos</p>
            <p className="text-sm font-bold">{pedidos.length}</p>
          </div>
          <div className="text-center p-2 rounded-lg bg-muted">
            <p className="text-xs text-muted-foreground">Ticket Médio</p>
            <p className="text-sm font-bold">{formatCurrency(ticketMedio)}</p>
          </div>
          <div className="text-center p-2 rounded-lg bg-amber-500/10">
            <p className="text-xs text-muted-foreground">% do Total</p>
            <p className="text-sm font-bold text-amber-600">{percentualTotal.toFixed(1)}%</p>
          </div>
        </div>

        {/* Motivos resumo */}
        <div className="py-3 border-b">
          <p className="text-xs text-muted-foreground mb-2 font-medium">Motivos de Perda</p>
          <div className="flex flex-wrap gap-2">
            {motivosAgrupados.map(({ motivo, count, valor }) => (
              <Badge 
                key={motivo} 
                variant="outline"
                className="text-xs bg-muted/50 flex items-center gap-1.5"
              >
                <Tag className="h-3 w-3" />
                {motivo}
                <span className="text-muted-foreground">({count} • {formatCurrency(valor)})</span>
              </Badge>
            ))}
          </div>
        </div>

        {/* Lista de pedidos */}
        <div className="flex-1 min-h-0">
          <p className="text-xs text-muted-foreground mb-2 font-medium">Pedidos Perdidos</p>
          <ScrollArea className="h-[300px] pr-4">
            <div className="space-y-2">
              {pedidos.map((pedido, index) => (
                <div 
                  key={`${pedido.numeropedido}-${index}`}
                  className="p-3 rounded-lg border bg-card hover:bg-accent/5 transition-colors"
                >
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-medium text-sm">#{pedido.numeropedido}</span>
                        <Badge variant="outline" className="text-xs bg-destructive/10 text-destructive border-destructive/20">
                          {pedido.perdido_motivo || 'Sem motivo'}
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground truncate mt-1 flex items-center gap-1">
                        <Building2 className="h-3 w-3 flex-shrink-0" />
                        {pedido.cliente || 'Cliente não informado'}
                      </p>
                    </div>
                    <span className="font-semibold text-destructive whitespace-nowrap">
                      {formatCurrency(pedido.valor || 0)}
                    </span>
                  </div>
                  
                  <div className="flex items-center gap-4 text-xs text-muted-foreground flex-wrap">
                    {pedido.uf && (
                      <span className="flex items-center gap-1">
                        <MapPin className="h-3 w-3" />
                        {pedido.uf}
                      </span>
                    )}
                    {pedido.data_emissao && (
                      <span className="flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        {formatDate(pedido.data_emissao)}
                      </span>
                    )}
                    {pedido.peso && (
                      <span className="flex items-center gap-1">
                        <Package className="h-3 w-3" />
                        {pedido.peso.toLocaleString('pt-BR')} kg
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </ScrollArea>
        </div>
      </DialogContent>
    </Dialog>
  );
};
