import React, { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { useComercial } from '@/context/ComercialContext';
import { useIsMobile } from '@/hooks/use-mobile';
import { CancelamentosDevolucoesTableMobile } from './CancelamentosDevolucoesTableMobile';

export function CancelamentosDevolucoesTable() {
  const { filteredData } = useComercial();
  const isMobile = useIsMobile();

  const cancelamentosEDevolucoes = useMemo(() => {
    return filteredData
      .filter(item => item.situacao === 'Cancelada' || item.situacao === 'Devolução')
      .sort((a, b) => b.valor - a.valor)
      .slice(0, 50); // Limitar a 50 registros
  }, [filteredData]);

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

  const getSituacaoBadgeVariant = (situacao: string) => {
    switch (situacao) {
      case 'Cancelada':
        return 'destructive';
      case 'Devolução':
        return 'secondary';
      default:
        return 'outline';
    }
  };

  if (cancelamentosEDevolucoes.length === 0) {
    return (
      <Card>
        <CardContent className="p-6 text-center">
          <p className="text-muted-foreground">Nenhum pedido cancelado ou devolvido encontrado.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Pedidos Cancelados e Devolvidos</CardTitle>
        <p className="text-sm text-muted-foreground">
          Lista detalhada dos pedidos cancelados e devolvidos
        </p>
      </CardHeader>
      <CardContent>
        {isMobile ? (
          <CancelamentosDevolucoesTableMobile items={cancelamentosEDevolucoes} />
        ) : (
          <>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nº Pedido</TableHead>
                  <TableHead>Cliente</TableHead>
                  <TableHead>Produto</TableHead>
                  <TableHead>Valor</TableHead>
                  <TableHead>Situação</TableHead>
                  <TableHead>Data</TableHead>
                  <TableHead>Vendedor</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {cancelamentosEDevolucoes.map((item, index) => (
                  <TableRow key={index}>
                    <TableCell className="font-mono text-sm">
                      {item.numeropedido || 'N/A'}
                    </TableCell>
                    <TableCell>{item.cliente || 'N/A'}</TableCell>
                    <TableCell>{item.descricaomat || 'N/A'}</TableCell>
                    <TableCell className="font-medium">
                      {formatCurrency(item.valor)}
                    </TableCell>
                    <TableCell>
                      <Badge variant={getSituacaoBadgeVariant(item.situacao)}>
                        {item.situacao}
                      </Badge>
                    </TableCell>
                    <TableCell>{formatDate(item.data_emissao)}</TableCell>
                    <TableCell>{item.vendedor || 'N/A'}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            {cancelamentosEDevolucoes.length === 50 && (
              <p className="text-sm text-muted-foreground mt-4 text-center">
                Mostrando os primeiros 50 registros. Use os filtros para refinar a busca.
              </p>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}