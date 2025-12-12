import React, { useMemo, useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ScrollArea } from '@/components/ui/scroll-area';
import { ChevronDown, ChevronRight, FileText } from 'lucide-react';
import { useComercial } from '@/context/ComercialContext';
import { parseDate } from '@/lib/utils-comercial';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { supabase } from '@/integrations/supabase/client';

// Helper para obter iniciais do nome
const getInitials = (name: string) => {
  const parts = name.split(' ').filter(p => p.length > 0);
  if (parts.length >= 2) {
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  }
  return name.slice(0, 2).toUpperCase();
};

export function OrcamentosTrafficLight() {
  const { data, isLoading } = useComercial();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedVendedor, setSelectedVendedor] = useState<string | null>(null);
  const [expandedPedidos, setExpandedPedidos] = useState<Set<string>>(new Set());
  const [vendedorAvatars, setVendedorAvatars] = useState<Record<string, string>>({});

  // Carregar avatares dos vendedores (mesmo padrão do Top 5 vendedores)
  const loadVendorAvatars = useCallback(async () => {
    const avatarMap: Record<string, string> = {};

    // Buscar da tabela vendor_avatars (prioridade)
    const { data: vendorAvatars } = await supabase
      .from('vendor_avatars')
      .select('vendor_name, avatar_url')
      .not('avatar_url', 'is', null);
    
    if (vendorAvatars) {
      vendorAvatars.forEach(vendor => {
        if (vendor.avatar_url) {
          avatarMap[vendor.vendor_name] = vendor.avatar_url;
        }
      });
    }

    // Buscar da tabela user_profiles (fallback)
    const { data: profiles } = await supabase
      .from('user_profiles')
      .select('full_name, avatar_url')
      .not('avatar_url', 'is', null);
    
    if (profiles) {
      profiles.forEach(profile => {
        const nomeNormalizado = profile.full_name
          .toLowerCase()
          .split(' ')
          .map((palavra: string) => palavra.charAt(0).toUpperCase() + palavra.slice(1))
          .join(' ');
        // Só adiciona se não existir já (vendor_avatars tem prioridade)
        if (profile.avatar_url && !avatarMap[nomeNormalizado]) {
          avatarMap[nomeNormalizado] = profile.avatar_url;
        }
      });
    }

    setVendedorAvatars(avatarMap);
  }, []);

  useEffect(() => {
    loadVendorAvatars();
  }, [loadVendorAvatars]);

  // Função para agrupar orçamentos por vendedor
  const getGroupedOrcamentosPorVendedor = (vendedor: string) => {
    const orcamentosAbertos = data.filter(item => {
      // Excluir vendedor "VENDEDOR"
      if (item.vendedor === 'VENDEDOR') return false;
      
      // Filtrar cliente GLOBAL AÇO SC
      const normalizeText = (text: string) => text?.toUpperCase().replace(/\s+/g, ' ').trim();
      const nomeFantasia = normalizeText(item.cli_nomefantasia || '');
      const cliente = normalizeText(item.cliente || '');
      
      if (nomeFantasia.includes('GLOBAL') && nomeFantasia.includes('AÇO') && nomeFantasia.includes('SC')) {
        return false;
      }
      if (cliente.includes('GLOBAL') && cliente.includes('AÇO') && cliente.includes('SC')) {
        return false;
      }
      
      // Filtrar apenas orçamentos
      if (item.situacao !== "Orçamento") return false;
      
      // Filtrar por vendedor específico
      return item.vendedor === vendedor;
    });
    
    // Agrupar por pedido
    const groups: Record<string, any[]> = {};
    orcamentosAbertos.forEach(item => {
      const pedidoKey = item.numeropedido || 'Sem Pedido';
      if (!groups[pedidoKey]) {
        groups[pedidoKey] = [];
      }
      groups[pedidoKey].push(item);
    });

    // Ordenar os grupos por data do mais novo para o mais antigo
    const sortedGroups: Record<string, any[]> = {};
    Object.entries(groups)
      .sort(([, itemsA], [, itemsB]) => {
        const dataA = parseDate(itemsA[0]?.data_pedido_pronto || itemsA[0]?.data_emissao || '1900-01-01')?.getTime() || 0;
        const dataB = parseDate(itemsB[0]?.data_pedido_pronto || itemsB[0]?.data_emissao || '1900-01-01')?.getTime() || 0;
        return dataB - dataA;
      })
      .forEach(([key, items]) => {
        sortedGroups[key] = items;
      });

    return sortedGroups;
  };

  const vendedoresData = useMemo(() => {
    // Filtrar apenas orçamentos, excluindo VENDEDOR e GLOBAL AÇO SC
    const orcamentosAbertos = data.filter(item => {
      // Excluir vendedor "VENDEDOR"
      if (item.vendedor === 'VENDEDOR') return false;
      
      // Filtrar cliente GLOBAL AÇO SC
      const normalizeText = (text: string) => text?.toUpperCase().replace(/\s+/g, ' ').trim();
      const nomeFantasia = normalizeText(item.cli_nomefantasia || '');
      const cliente = normalizeText(item.cliente || '');
      
      if (nomeFantasia.includes('GLOBAL') && nomeFantasia.includes('AÇO') && nomeFantasia.includes('SC')) {
        return false;
      }
      if (cliente.includes('GLOBAL') && cliente.includes('AÇO') && cliente.includes('SC')) {
        return false;
      }
      
      // Filtrar apenas orçamentos
      if (item.situacao !== "Orçamento") return false;
      
      return true;
    });

    // Agrupar por vendedor contando pedidos únicos
    const vendedoresMap: Record<string, { pedidos: Set<string>; valor: number }> = {};
    
    orcamentosAbertos.forEach(item => {
      const vendedor = item.vendedor || 'Sem Vendedor';
      const numeroPedido = item.numeropedido || 'Sem Pedido';
      
      if (!vendedoresMap[vendedor]) {
        vendedoresMap[vendedor] = { pedidos: new Set(), valor: 0 };
      }
      
      vendedoresMap[vendedor].pedidos.add(numeroPedido);
      vendedoresMap[vendedor].valor += item.valor || 0;
    });

    // Calcular total para percentuais
    const totalValor = Object.values(vendedoresMap).reduce((sum, v) => sum + v.valor, 0);
    const totalPedidos = Object.values(vendedoresMap).reduce((sum, v) => sum + v.pedidos.size, 0);

    // Converter para array e adicionar percentuais, depois ordenar por valor
    const vendedoresArray = Object.entries(vendedoresMap)
      .map(([vendedor, data]) => ({
        vendedor,
        count: data.pedidos.size,
        valor: data.valor,
        percentual: totalPedidos > 0 ? (data.pedidos.size / totalPedidos) * 100 : 0
      }))
      .sort((a, b) => b.valor - a.valor); // Ordenar por valor decrescente

    return vendedoresArray;
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

  const formatDate = (dateString: string) => {
    if (!dateString || dateString === 'Invalid Date') return '-';
    const date = parseDate(dateString);
    return !date ? '-' : date.toLocaleDateString('pt-BR');
  };

  const getDateForItem = (item: any) => {
    return item.situacao === 'Orçamento' ? item.data_pedido_pronto : item.data_inicio;
  };

  const formatCurrencyDetailed = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(value);
  };

  const handleVendedorClick = (vendedor: string) => {
    setSelectedVendedor(vendedor);
    setExpandedPedidos(new Set());
    setDialogOpen(true);
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(value);
  };

  if (isLoading) {
    return (
      <Card className="h-56">
        <CardHeader className="pb-2 px-3 pt-3">
          <div className="h-4 w-48 bg-muted animate-pulse rounded" />
        </CardHeader>
        <CardContent className="px-3 pb-3">
          <div className="h-44 bg-muted animate-pulse rounded" />
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card className="p-4 h-56">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 px-0 pt-0">
          <CardTitle className="text-sm font-medium text-blue-600 flex items-center gap-2">
            <FileText className="h-4 w-4" />
            Orçamentos em Aberto
          </CardTitle>
          <div className="text-right">
            <span className="text-lg font-bold text-blue-600">
              {vendedoresData.reduce((acc, v) => acc + v.count, 0)}
            </span>
            <span className="text-xs text-muted-foreground ml-1">orç.</span>
          </div>
        </CardHeader>
        <CardContent className="px-0 pb-0 overflow-hidden">
          <div className="space-y-1.5">
            {vendedoresData.length > 0 ? (
              vendedoresData.slice(0, 5).map((vendedor, index) => (
                <div 
                  key={vendedor.vendedor}
                  className="flex items-center justify-between p-1.5 rounded-lg hover:bg-muted/50 transition-all cursor-pointer group"
                  onClick={() => handleVendedorClick(vendedor.vendedor)}
                >
                  <div className="flex items-center gap-3">
                    {/* Avatar com badge de posição */}
                    <div className="relative">
                      <Avatar className="h-8 w-8 flex-shrink-0 transition-all ring-2 ring-blue-200 dark:ring-blue-800 group-hover:scale-105">
                        <AvatarImage src={vendedorAvatars[vendedor.vendedor]} alt={vendedor.vendedor} className="object-cover" />
                        <AvatarFallback className="text-xs bg-blue-100 dark:bg-blue-900/50 text-blue-600 dark:text-blue-400 font-semibold">
                          {getInitials(vendedor.vendedor)}
                        </AvatarFallback>
                      </Avatar>
                      {/* Badge de posição */}
                      <span className="absolute -bottom-0.5 -right-0.5 w-4 h-4 rounded-full flex items-center justify-center text-[9px] font-bold bg-blue-500 text-white shadow-sm">
                        {index + 1}
                      </span>
                    </div>
                    
                    {/* Nome do vendedor */}
                    <div className="flex flex-col min-w-0">
                      <span className="font-medium text-sm truncate max-w-[90px]" title={vendedor.vendedor}>
                        {vendedor.vendedor}
                      </span>
                      <span className="text-[10px] text-muted-foreground">
                        {vendedor.count} orç. • {vendedor.percentual.toFixed(0)}%
                      </span>
                    </div>
                  </div>
                  
                  {/* Valor total */}
                  <span className="font-semibold text-sm text-blue-600">
                    {formatCurrency(vendedor.valor)}
                  </span>
                </div>
              ))
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <p className="text-sm">Nenhum orçamento em aberto</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Dialog para exibir detalhes do vendedor selecionado */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              Orçamentos de {selectedVendedor}
            </DialogTitle>
          </DialogHeader>

          <ScrollArea className="max-h-[70vh]">
            {selectedVendedor && (() => {
              const groupedData = getGroupedOrcamentosPorVendedor(selectedVendedor);
              const totalValor = Object.values(groupedData).reduce((sum, items) => sum + items.reduce((itemSum, item) => itemSum + (item.valor || 0), 0), 0);
              const totalPedidos = Object.keys(groupedData).length;

              return (
                <div className="space-y-4">
                  {/* Resumo */}
                  <div className="flex justify-between items-center p-4 bg-muted rounded-lg">
                    <div>
                      <p className="text-sm font-medium">Total de Pedidos</p>
                      <p className="text-2xl font-bold">{totalPedidos}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-medium">Valor Total</p>
                      <p className="text-2xl font-bold text-primary">{formatCurrencyDetailed(totalValor)}</p>
                    </div>
                  </div>

                  {/* Tabela agrupada */}
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-[50px]"></TableHead>
                        <TableHead>Pedido</TableHead>
                        <TableHead>Cliente</TableHead>
                        <TableHead>Data</TableHead>
                        <TableHead>Situação</TableHead>
                        <TableHead className="text-right">Itens</TableHead>
                        <TableHead className="text-right">Valor Total</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {Object.entries(groupedData).map(([pedidoNumber, items]) => {
                        const isExpanded = expandedPedidos.has(pedidoNumber);
                        const totalItems = items.length;
                        const totalValorPedido = items.reduce((sum, item) => sum + (item.valor || 0), 0);
                        const firstItem = items[0];

                        return (
                          <React.Fragment key={pedidoNumber}>
                            {/* Linha do pedido */}
                            <TableRow 
                              className="cursor-pointer hover:bg-muted/50"
                              onClick={() => togglePedido(pedidoNumber)}
                            >
                              <TableCell>
                                {isExpanded ? (
                                  <ChevronDown className="h-4 w-4" />
                                ) : (
                                  <ChevronRight className="h-4 w-4" />
                                )}
                              </TableCell>
                              <TableCell className="font-medium">{pedidoNumber}</TableCell>
                              <TableCell>{firstItem.cli_nomefantasia || firstItem.cliente || '-'}</TableCell>
                              <TableCell>{formatDate(getDateForItem(firstItem) || firstItem.data_emissao)}</TableCell>
                              <TableCell>{firstItem.situacao}</TableCell>
                              <TableCell className="text-right">{totalItems}</TableCell>
                              <TableCell className="text-right font-medium">{formatCurrencyDetailed(totalValorPedido)}</TableCell>
                            </TableRow>

                            {/* Linhas expandidas dos itens */}
                            {isExpanded && items.map((item, idx) => (
                              <TableRow key={`${pedidoNumber}-${idx}`} className="bg-muted/30">
                                <TableCell></TableCell>
                                <TableCell className="pl-8 text-sm text-muted-foreground">{item.numeroorcamento}</TableCell>
                                <TableCell className="text-sm">{item.material || '-'}</TableCell>
                                <TableCell className="text-sm">{formatDate(getDateForItem(item) || item.data_emissao)}</TableCell>
                                <TableCell className="text-sm">{item.classe || '-'}</TableCell>
                                <TableCell className="text-right text-sm">{item.quantidade || '-'}</TableCell>
                                <TableCell className="text-right text-sm">{formatCurrencyDetailed(item.valor || 0)}</TableCell>
                              </TableRow>
                            ))}
                          </React.Fragment>
                        );
                      })}
                    </TableBody>
                  </Table>
                </div>
              );
            })()}
          </ScrollArea>
        </DialogContent>
      </Dialog>
    </>
  );
}
