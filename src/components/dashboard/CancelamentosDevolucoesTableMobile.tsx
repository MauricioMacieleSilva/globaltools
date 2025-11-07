import React from 'react';
import { MobileTableCard } from '@/components/ui/mobile-table-card';
import { Badge } from '@/components/ui/badge';

interface CancelamentoDevolucao {
  numeropedido: string;
  cliente: string;
  descricaomat: string;
  valor: number;
  situacao: string;
  data_emissao: string;
  vendedor: string;
}

interface CancelamentosDevolucoesTableMobileProps {
  items: CancelamentoDevolucao[];
}

export function CancelamentosDevolucoesTableMobile({
  items
}: CancelamentosDevolucoesTableMobileProps) {
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(value);
  };

  const formatDate = (dateString: string) => {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return date.toLocaleDateString('pt-BR');
  };

  const getSituacaoBadgeVariant = (situacao: string): "default" | "destructive" | "secondary" => {
    switch (situacao) {
      case 'Cancelada':
        return 'destructive';
      case 'Devolução':
        return 'secondary';
      default:
        return 'default';
    }
  };

  if (items.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        Nenhum pedido cancelado ou devolvido encontrado.
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {items.map((item, index) => (
        <MobileTableCard
          key={index}
          title={`Pedido ${item.numeropedido || 'N/A'}`}
          subtitle={item.cliente || 'N/A'}
          badge={
            <Badge variant={getSituacaoBadgeVariant(item.situacao)}>
              {item.situacao}
            </Badge>
          }
          fields={[
            { label: 'Produto', value: item.descricaomat || 'N/A', fullWidth: true },
            { label: 'Valor', value: formatCurrency(item.valor) },
            { label: 'Data', value: formatDate(item.data_emissao) },
            { label: 'Vendedor', value: item.vendedor || 'N/A' }
          ]}
        />
      ))}
      {items.length === 50 && (
        <p className="text-sm text-muted-foreground text-center py-4">
          Mostrando os primeiros 50 registros. Use os filtros para refinar a busca.
        </p>
      )}
    </div>
  );
}
