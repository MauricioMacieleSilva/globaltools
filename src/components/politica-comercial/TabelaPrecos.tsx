import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { PoliticaComercialData } from '@/services/politicaComercialService';
import { Search } from 'lucide-react';

interface TabelaPrecosProps {
  titulo: string;
  dados: PoliticaComercialData[];
  loading?: boolean;
  onItemClick?: (preco: number) => void;
}

export function TabelaPrecos({ titulo, dados, loading, onItemClick }: TabelaPrecosProps) {
  const [filtro, setFiltro] = useState('');

  const dadosFiltrados = dados.filter(item =>
    item.descricao.toLowerCase().includes(filtro.toLowerCase())
  );

  return (
    <Card>
      <CardHeader>
        <CardTitle>{titulo}</CardTitle>
        <CardDescription>
          Preços Com ICMS 12% | FOB RS | À Vista | Sem IPI
        </CardDescription>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
          <Input
            placeholder="Buscar por descrição..."
            value={filtro}
            onChange={(e) => setFiltro(e.target.value)}
            className="pl-10"
          />
        </div>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        ) : (
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="min-w-96">Descrição</TableHead>
                  {titulo === 'Telhas' ? (
                    <>
                      <TableHead className="w-32 text-right">R$/M²</TableHead>
                      <TableHead className="w-32 text-right">R$/KG</TableHead>
                      <TableHead className="w-20">IPI</TableHead>
                    </>
                  ) : (
                    <>
                      <TableHead className="w-32 text-right">Preço (R$)</TableHead>
                      <TableHead className="w-24">Unidade</TableHead>
                      <TableHead className="w-20">IPI</TableHead>
                    </>
                  )}
                </TableRow>
              </TableHeader>
              <TableBody>
                {dadosFiltrados.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={titulo === 'Telhas' ? 4 : 4} className="text-center py-8 text-muted-foreground">
                      {filtro ? 'Nenhum resultado encontrado' : 'Nenhum dado disponível'}
                    </TableCell>
                  </TableRow>
                ) : (
                  dadosFiltrados.map((item, index) => (
                    <TableRow 
                      key={`${item.classe}-${index}`}
                      className="cursor-pointer hover:bg-muted/50 transition-colors"
                      onClick={() => onItemClick?.(titulo === 'Telhas' ? (item.precoKg || item.preco) : item.preco)}
                    >
                      <TableCell className="text-sm">{item.descricao}</TableCell>
                      {titulo === 'Telhas' ? (
                        <>
                          <TableCell className="text-right font-medium">
                            {(item.precoM2 || item.preco).toLocaleString('pt-BR', {
                              style: 'currency',
                              currency: 'BRL'
                            })}
                          </TableCell>
                          <TableCell className="text-right font-medium">
                            {(item.precoKg || 0).toLocaleString('pt-BR', {
                              style: 'currency',
                              currency: 'BRL'
                            })}
                          </TableCell>
                          <TableCell className="text-sm text-muted-foreground">{item.ipi}</TableCell>
                        </>
                      ) : (
                        <>
                          <TableCell className="text-right font-medium">
                            {item.preco.toLocaleString('pt-BR', {
                              style: 'currency',
                              currency: 'BRL'
                            })}
                          </TableCell>
                          <TableCell className="text-sm text-muted-foreground">{item.unidade}</TableCell>
                          <TableCell className="text-sm text-muted-foreground">{item.ipi}</TableCell>
                        </>
                      )}
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}