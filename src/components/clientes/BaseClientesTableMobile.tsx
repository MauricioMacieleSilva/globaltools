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
  responsavel?: string;
}

interface BaseClientesTableMobileProps {
  clientes: ClienteInfo[];
  onViewHistory: (cliente: ClienteInfo) => void;
  onFollowUp: (clienteName: string) => void;
}

// Formatar moeda de forma compacta para mobile
function formatCurrencyCompact(value: number): string {
  if (value >= 1_000_000_000) {
    return `R$ ${(value / 1_000_000_000).toFixed(1)}B`;
  }
  if (value >= 1_000_000) {
    return `R$ ${(value / 1_000_000).toFixed(1)}M`;
  }
  if (value >= 1_000) {
    return `R$ ${(value / 1_000).toFixed(1)}K`;
  }
  return formatCurrency(value);
}

export function BaseClientesTableMobile({
  clientes,
  onViewHistory,
  onFollowUp
}: BaseClientesTableMobileProps) {
  const getDiasUltimaCompra = (ultimaCompra: Date | null) => {
    if (!ultimaCompra) return "Nunca";
    const dias = Math.floor((new Date().getTime() - ultimaCompra.getTime()) / (1000 * 60 * 60 * 24));
    return `${dias}d`;
  };

  return (
    <div className="space-y-3">
      {clientes.map((cliente) => (
        <MobileTableCard
          key={cliente.nome}
          title={cliente.nome}
          badge={
            cliente.ativo ? (
              <Badge className="bg-green-100 text-green-800 text-[10px] px-1.5 py-0.5">
                Ativo
              </Badge>
            ) : (
              <Badge className="bg-red-100 text-red-800 text-[10px] px-1.5 py-0.5">
                Inativo
              </Badge>
            )
          }
          fields={[
            { 
              label: 'Responsável', 
              value: cliente.responsavel || '—'
            },
            { 
              label: 'Faturado', 
              value: formatCurrencyCompact(cliente.totalFaturado)
            },
            { 
              label: 'Pedidos', 
              value: cliente.pedidosFaturados.toString()
            },
            { 
              label: 'Ticket Médio', 
              value: formatCurrencyCompact(cliente.ticketMedio)
            },
            { 
              label: 'Última Compra', 
              value: cliente.ultimaCompra 
                ? `${cliente.ultimaCompra.toLocaleDateString('pt-BR')} (${getDiasUltimaCompra(cliente.ultimaCompra)})`
                : "Nunca"
            }
          ]}
          actions={
            <div className="grid grid-cols-2 gap-2 w-full">
              <Button 
                size="sm" 
                variant="outline"
                className="w-full min-w-0 h-8 px-2 text-[11px] gap-1 overflow-hidden"
                onClick={() => onViewHistory(cliente)}
              >
                <Eye className="h-3 w-3" />
                <span className="min-w-0 truncate">Histórico</span>
              </Button>
              <Button 
                size="sm" 
                variant="outline"
                className="w-full min-w-0 h-8 px-2 text-[11px] gap-1 overflow-hidden"
                onClick={() => onFollowUp(cliente.nome)}
              >
                <MessageSquare className="h-3 w-3" />
                <span className="min-w-0 truncate">Follow-up</span>
              </Button>
            </div>
          }
        />
      ))}
    </div>
  );
}
