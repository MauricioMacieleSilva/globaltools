import React, { useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Progress } from '@/components/ui/progress';
import { Filter, TrendingDown, Users, DollarSign, Clock, Target } from 'lucide-react';
import { useComercial } from '@/context/ComercialContext';

// Função para formatar valores em milhares com mais detalhe
const formatCurrency = (value: number): string => {
  if (value >= 1000000) {
    const millions = (value / 1000000).toFixed(3);
    return `R$ ${millions.replace(/\B(?=(\d{3})+(?!\d))/g, '.')} mil`;
  } else if (value >= 1000) {
    const thousands = Math.round(value / 1000);
    return `R$ ${thousands.toLocaleString('pt-BR')} mil`;
  } else {
    return `R$ ${value.toFixed(0)}`;
  }
};

// Função para formatar datas de forma robusta
const formatDate = (dateString: string): string => {
  if (!dateString || dateString.trim() === '') {
    return 'Data não informada';
  }
  
  try {
    const date = new Date(dateString);
    if (isNaN(date.getTime())) {
      return 'Data não informada';
    }
    return date.toLocaleDateString('pt-BR');
  } catch (error) {
    return 'Data não informada';
  }
};

interface FunilStage {
  name: string;
  count: number;
  value: number;
  color: string;
  icon: React.ReactNode;
  situation: string;
}

interface FunilDetailsProps {
  stage: FunilStage | null;
  isOpen: boolean;
  onClose: () => void;
  data: any[];
}

const FunilDetails: React.FC<FunilDetailsProps> = ({ stage, isOpen, onClose, data }) => {
  if (!stage) return null;

  let stageData = [];
  
  if (stage.situation === 'all') {
    // Orçamento: todos os dados (incluindo perdidos)
    stageData = data;
  } else if (stage.situation === 'pedido-faturamento') {
    // Pedido: pedidos + faturamentos
    stageData = data.filter(item => 
      item.situacao === 'Pedido' || 
      (item.situacao === 'Emitida' && item.faturamento_tipo === 1)
    );
  } else if (stage.situation === 'Emitida') {
    // Faturamento: apenas faturados
    stageData = data.filter(item => item.situacao === 'Emitida' && item.faturamento_tipo === 1);
  } else {
    stageData = data.filter(item => item.situacao === stage.situation);
  }

  // Agrupar dados por cliente
  const groupedByClient = useMemo(() => {
    const groups = stageData.reduce((acc: any, item) => {
      const clientKey = item.cliente || 'Cliente não informado';
      if (!acc[clientKey]) {
        acc[clientKey] = {
          cliente: clientKey,
          pedidos: [],
          valorTotal: 0,
          temPedidoPendente: false,
          ultimaData: null
        };
      }
      acc[clientKey].pedidos.push(item);
      acc[clientKey].valorTotal += item.valor || 0;
      
      // Verificar se tem pedido não faturado
      if (item.situacao === 'Pedido') {
        acc[clientKey].temPedidoPendente = true;
      }
      
      // Manter a data mais recente
      const itemDate = new Date(item.data_emissao);
      if (!isNaN(itemDate.getTime()) && (!acc[clientKey].ultimaData || itemDate > acc[clientKey].ultimaData)) {
        acc[clientKey].ultimaData = itemDate;
      }
      
      return acc;
    }, {});

    return Object.values(groups).sort((a: any, b: any) => b.valorTotal - a.valorTotal);
  }, [stageData]);

  const uniqueClients = groupedByClient.length;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-5xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {stage.icon}
            Detalhes - {stage.name}
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="grid grid-cols-3 gap-4">
            <Card>
              <CardContent className="p-4">
                <div className="text-2xl font-bold">{uniqueClients}</div>
                <div className="text-sm text-muted-foreground">Total de Clientes</div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="text-2xl font-bold">
                  {formatCurrency(stage.value)}
                </div>
                <div className="text-sm text-muted-foreground">Valor Total</div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="text-2xl font-bold">
                  {uniqueClients > 0 ? formatCurrency(stage.value / uniqueClients) : 'R$ 0'}
                </div>
                <div className="text-sm text-muted-foreground">Valor Médio por Cliente</div>
              </CardContent>
            </Card>
          </div>

          <div className="border rounded-lg">
            <div className="grid grid-cols-6 gap-4 p-4 bg-muted/50 font-medium text-sm">
              <div>Cliente</div>
              <div>Qtd Pedidos</div>
              <div>Valor Total</div>
              <div>Status</div>
              <div>Última Data</div>
              <div>Vendedor</div>
            </div>
            <div className="max-h-80 overflow-y-auto">
              {groupedByClient.slice(0, 50).map((group: any, index) => (
                <div key={index} className="grid grid-cols-6 gap-4 p-4 border-t text-sm">
                  <div className="truncate font-medium">{group.cliente}</div>
                  <div>{group.pedidos.length}</div>
                  <div className="font-medium">
                    {formatCurrency(group.valorTotal)}
                  </div>
                  <div>
                    {group.temPedidoPendente ? (
                      <Badge className="bg-orange-100 text-orange-800 text-xs">
                        Pendente Faturamento
                      </Badge>
                    ) : stage.situation === 'Emitida' ? (
                      <Badge className="bg-green-100 text-green-800 text-xs">
                        Faturado
                      </Badge>
                    ) : stage.situation === 'Perdido' ? (
                      <Badge className="bg-red-100 text-red-800 text-xs">
                        Perdido
                      </Badge>
                    ) : (
                      <Badge className="bg-blue-100 text-blue-800 text-xs">
                        Em Andamento
                      </Badge>
                    )}
                  </div>
                  <div>
                    {group.ultimaData ? formatDate(group.ultimaData.toISOString()) : 'Data não informada'}
                  </div>
                  <div className="truncate">
                    {group.pedidos[0]?.vendedor || 'N/A'}
                  </div>
                </div>
              ))}
            </div>
            {groupedByClient.length > 50 && (
              <div className="p-4 text-center text-sm text-muted-foreground border-t">
                Mostrando 50 de {groupedByClient.length} clientes
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export const FunilVendas: React.FC = () => {
  const { filteredData, isLoading } = useComercial();
  const [selectedStage, setSelectedStage] = useState<FunilStage | null>(null);
  const [detailsOpen, setDetailsOpen] = useState(false);

  const funilData = useMemo(() => {
    if (!filteredData.length) return { stages: [], conversions: [] };

    // Filtrar por situação (incluindo perdidos na base do funil)
    const orcamentos = filteredData.filter(item => item.situacao === 'Orçamento');
    const pedidos = filteredData.filter(item => item.situacao === 'Pedido');
    const perdidos = filteredData.filter(item => item.situacao === 'Perdido');
    const faturados = filteredData.filter(item => item.situacao === 'Emitida' && item.faturamento_tipo === 1);

    // Contagem única de pedidos (numeropedido) - incluindo perdidos na base
    const uniqueOrcamentos = new Set([...orcamentos, ...pedidos, ...perdidos, ...faturados].map(item => item.numeropedido));
    const uniquePedidos = new Set([...pedidos, ...faturados].map(item => item.numeropedido));
    const uniqueFaturados = new Set(faturados.map(item => item.numeropedido));

    // Valores acumulativos - incluindo perdidos na base
    const valorOrcamento = [...orcamentos, ...pedidos, ...perdidos, ...faturados].reduce((sum, item) => sum + (item.valor || 0), 0);
    const valorPedido = [...pedidos, ...faturados].reduce((sum, item) => sum + (item.valor || 0), 0);
    const valorFaturamento = faturados.reduce((sum, item) => sum + (item.valor || 0), 0);

    const stages: FunilStage[] = [
      {
        name: 'Orçamento',
        count: uniqueOrcamentos.size,
        value: valorOrcamento,
        color: 'hsl(212, 100%, 47%)',
        icon: <Target className="h-4 w-4" />,
        situation: 'all' // Para exibir todos os dados no drill-down
      },
      {
        name: 'Pedido',
        count: uniquePedidos.size,
        value: valorPedido,
        color: 'hsl(38, 92%, 50%)',
        icon: <Clock className="h-4 w-4" />,
        situation: 'pedido-faturamento' // Para exibir pedidos + faturamentos
      },
      {
        name: 'Faturamento',
        count: uniqueFaturados.size,
        value: valorFaturamento,
        color: 'hsl(142, 76%, 36%)',
        icon: <DollarSign className="h-4 w-4" />,
        situation: 'Emitida'
      }
    ];

    // Calcular conversões baseadas na nova lógica
    const conversions = [
      {
        from: 'Orçamento',
        to: 'Pedido',
        rate: uniqueOrcamentos.size > 0 ? (uniquePedidos.size / uniqueOrcamentos.size) * 100 : 0
      },
      {
        from: 'Pedido',
        to: 'Faturamento',
        rate: uniquePedidos.size > 0 ? (uniqueFaturados.size / uniquePedidos.size) * 100 : 0
      },
      {
        from: 'Orçamento',
        to: 'Faturamento',
        rate: uniqueOrcamentos.size > 0 ? (uniqueFaturados.size / uniqueOrcamentos.size) * 100 : 0
      }
    ];

    return { stages, conversions };
  }, [filteredData]);

  const handleStageClick = (stage: FunilStage) => {
    setSelectedStage(stage);
    setDetailsOpen(true);
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-6 text-center">
          <div className="text-muted-foreground">Carregando dados do funil...</div>
        </CardContent>
      </Card>
    );
  }

  const maxCount = Math.max(...funilData.stages.map(s => s.count), 1);

  return (
    <div className="space-y-4">
      {/* Funil Visual */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="h-5 w-5" />
            Funil de Vendas
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-6">
            {/* Etapas do Funil */}
            <div className="space-y-4">
              {funilData.stages.map((stage, index) => {
                const width = (stage.count / maxCount) * 100;
                const isLast = index === funilData.stages.length - 1;
                
                return (
                  <div key={stage.name} className="space-y-2">
                    {/* Etapa */}
                    <div 
                      className="relative cursor-pointer group"
                      onClick={() => handleStageClick(stage)}
                    >
                      <div 
                        className="h-16 rounded-lg flex items-center justify-between px-4 text-white font-medium transition-all duration-200 group-hover:shadow-lg group-hover:scale-[1.02]"
                        style={{ 
                          backgroundColor: stage.color,
                          width: `${Math.max(width, 20)}%`,
                          marginLeft: `${(100 - Math.max(width, 20)) / 2}%`
                        }}
                      >
                        <div className="flex items-center gap-2">
                          {stage.icon}
                          <span className="font-semibold">{stage.name}</span>
                        </div>
                        <div className="text-right">
                          <div className="text-lg font-bold">{stage.count}</div>
                          <div className="text-xs opacity-90">
                            {formatCurrency(stage.value)}
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Seta e Taxa de Conversão */}
                    {!isLast && (
                      <div className="flex items-center justify-center">
                        <div className="flex items-center gap-2 bg-muted px-3 py-1 rounded-full">
                          <TrendingDown className="h-3 w-3 text-muted-foreground" />
                          <span className="text-xs font-medium">
                            {funilData.conversions[index]?.rate.toFixed(1)}%
                          </span>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Métricas de Conversão */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {funilData.conversions.map((conversion, index) => (
          <Card key={index}>
            <CardContent className="p-4">
              <div className="space-y-2">
                <div className="text-sm text-muted-foreground">
                  {conversion.from} → {conversion.to}
                </div>
                <div className="text-2xl font-bold">
                  {conversion.rate.toFixed(1)}%
                </div>
                <Progress value={conversion.rate} className="h-2" />
                 <div className="flex items-center gap-2">
                   {conversion.rate > 50 ? (
                     <Badge className="bg-green-100 text-green-800">Excelente</Badge>
                   ) : conversion.rate > 40 ? (
                     <Badge className="bg-yellow-100 text-yellow-800">Bom</Badge>
                   ) : (
                     <Badge className="bg-red-100 text-red-800">Atenção</Badge>
                   )}
                 </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Dialog de Detalhes */}
      <FunilDetails
        stage={selectedStage}
        isOpen={detailsOpen}
        onClose={() => setDetailsOpen(false)}
        data={filteredData}
      />
    </div>
  );
};