import React from 'react';
import { MobileTableCard } from '@/components/ui/mobile-table-card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Eye, MessageSquare } from 'lucide-react';
import { formatCurrency } from '@/lib/utils-comercial';

interface ClienteInfo {
  nome: string;
  totalFaturado: number;
  ultimaCompra: Date | null;
  ativo: boolean;
  pedidosFaturados: number;
  ticketMedio: number;
}

interface BaseClientesTableMobileProps {
  clientes: ClienteInfo[];
  onViewHistory: (cliente: ClienteInfo) => void;
  onFollowUp: (clienteName: string) => void;
}

export function BaseClientesTableMobile({
  clientes,
  onViewHistory,
  onFollowUp
}: BaseClientesTableMobileProps) {
  const getDiasUltimaCompra = (ultimaCompra: Date | null) => {
    if (!ultimaCompra) return "Nunca";
    const dias = Math.floor((new Date().getTime() - ultimaCompra.getTime()) / (1000 * 60 * 60 * 24));
    return `${dias} dias atrás`;
  };

  return (
    <div className="space-y-3 w-full min-w-0">
      {clientes.map((cliente) => (
        <MobileTableCard
          key={cliente.nome}
          title={cliente.nome}
          className="w-full min-w-0"
          badge={
            cliente.ativo ? (
              <Badge className="bg-green-100 text-green-800 text-[10px] px-1.5 py-0.5">Ativo</Badge>
            ) : (
              <Badge className="bg-red-100 text-red-800 text-[10px] px-1.5 py-0.5">Inativo</Badge>
            )
          }
          fields={[
            { label: 'Faturado', value: formatCurrency(cliente.totalFaturado) },
            { label: 'Pedidos', value: cliente.pedidosFaturados.toString() },
            { label: 'Ticket', value: formatCurrency(cliente.ticketMedio) },
            { 
              label: 'Última Compra', 
              value: cliente.ultimaCompra 
                ? cliente.ultimaCompra.toLocaleDateString('pt-BR')
                : "Nunca"
            },
            { 
              label: 'Tempo', 
              value: getDiasUltimaCompra(cliente.ultimaCompra),
              className: 'text-muted-foreground'
            }
          ]}
          actions={
            <>
              <Button 
                size="sm" 
                variant="outline"
                className="text-xs h-7 px-2"
                onClick={() => onViewHistory(cliente)}
              >
                <Eye className="h-3 w-3 mr-1" />
                Histórico
              </Button>
              <Button 
                size="sm" 
                variant="outline"
                className="text-xs h-7 px-2"
                onClick={() => onFollowUp(cliente.nome)}
              >
                <MessageSquare className="h-3 w-3 mr-1" />
                Follow-up
              </Button>
            </>
          }
        />
      ))}
    </div>
  );
}
