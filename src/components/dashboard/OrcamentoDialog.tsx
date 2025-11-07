import React, { useMemo } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogTrigger } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { ChevronDown, ChevronRight, Star, MessageSquare, Info } from 'lucide-react';
import { useOrcamentosData } from '@/hooks/useOrcamentosData';
import { TemperaturaIndicator } from './TemperaturaIndicator';
import { TemperaturaExplanation } from './TemperaturaExplanation';

interface OrcamentoDialogProps {
  isOpen: boolean;
  onClose: () => void;
  data: any[];
}

export function OrcamentoDialog({ isOpen, onClose, data }: OrcamentoDialogProps) {
  const {
    expandedPedidos,
    selectedBudget,
    newComment,
    comments,
    ratings,
    loading,
    setNewComment,
    loadRatings,
    addComment,
    setRating,
    openCommentsDialog,
    togglePedido,
    groupedData,
    calculateTemperatureStats,
    formatCurrency,
    formatDate
  } = useOrcamentosData();
  
  // Calcular quantidades para o título
  const totalPedidos = useMemo(() => {
    const uniquePedidos = new Set(data.map(item => item.numeropedido));
    return uniquePedidos.size;
  }, [data]);
  
  const totalClientes = useMemo(() => {
    const uniqueClientes = new Set(data.map(item => item.codigocliente));
    return uniqueClientes.size;
  }, [data]);

  const renderStars = (budgetNumber: string) => {
    const rating = ratings[budgetNumber]?.rating || 1;
    return (
      <div className="flex items-center gap-1">
        {[1, 2, 3, 4, 5].map((star) => (
          <Star
            key={star}
            className={`h-4 w-4 cursor-pointer transition-colors ${
              star <= rating 
                ? "fill-yellow-400 text-yellow-400" 
                : "text-gray-300 hover:text-yellow-400"
            }`}
            onClick={() => setRating(budgetNumber, star)}
          />
        ))}
      </div>
    );
  };

  const groupedOrcamentos = useMemo(() => {
    return groupedData(data);
  }, [data, groupedData]);

  const temperatureStats = useMemo(() => {
    return calculateTemperatureStats(data, ratings);
  }, [data, ratings, calculateTemperatureStats]);

  // Carregar classificações na inicialização
  useMemo(() => {
    if (isOpen) {
      loadRatings();
    }
  }, [isOpen]);

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-7xl max-h-[85vh]">
        <DialogHeader>
          <DialogTitle>Temperatura dos Orçamentos</DialogTitle>
        </DialogHeader>
        
        <div className="mb-4">
          <TemperaturaIndicator stats={temperatureStats} />
        </div>
        <ScrollArea className="h-[70vh]">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
              <TableRow>
                <TableHead></TableHead>
                <TableHead>Pedido</TableHead>
                <TableHead>NF</TableHead>
                <TableHead>Data</TableHead>
                <TableHead>Cliente</TableHead>
                <TableHead>UF/Cidade</TableHead>
                <TableHead>Vendedor</TableHead>
                <TableHead className="text-right">Valor Total</TableHead>
                <TableHead className="text-right">Peso (kg)</TableHead>
                <TableHead>
                  <div className="flex items-center gap-2">
                    Classificação
                    <TemperaturaExplanation>
                      <Button variant="ghost" size="sm" className="h-6 w-6 p-0">
                        <Info className="h-3 w-3" />
                      </Button>
                    </TemperaturaExplanation>
                  </div>
                </TableHead>
                <TableHead>Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {Object.entries(groupedOrcamentos).map(([pedidoNumber, items]) => {
                const isExpanded = expandedPedidos.has(pedidoNumber);
                const totalPedido = items.reduce((sum, item) => sum + item.valor, 0);
                const totalPeso = items.reduce((sum, item) => sum + item.peso, 0);
                const firstItem = items[0];
                
                return (
                  <React.Fragment key={pedidoNumber}>
                    <TableRow className="hover:bg-muted/50">
                      <TableCell className="w-8">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => togglePedido(pedidoNumber)}
                        >
                          {isExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                        </Button>
                      </TableCell>
                      <TableCell className="font-medium">{firstItem.numeropedido || pedidoNumber}</TableCell>
                      <TableCell>{firstItem.numeronf || '-'}</TableCell>
                      <TableCell>{formatDate(firstItem.situacao === 'Orçamento' ? firstItem.data_pedido_pronto : firstItem.data_inicio)}</TableCell>
                      <TableCell className="max-w-[150px] truncate" title={firstItem.cli_nomefantasia}>
                        {firstItem.cli_nomefantasia}
                      </TableCell>
                      <TableCell>{firstItem.uf}/{firstItem.cli_cidade}</TableCell>
                      <TableCell>{firstItem.vendedor}</TableCell>
                      <TableCell className="text-right font-medium">{formatCurrency(totalPedido)}</TableCell>
                      <TableCell className="text-right">{totalPeso.toLocaleString('pt-BR')}</TableCell>
                      <TableCell>
                        {renderStars(pedidoNumber)}
                      </TableCell>
                      <TableCell>
                        <Dialog>
                          <DialogTrigger asChild>
                            <Button 
                              variant="outline" 
                              size="sm"
                              onClick={() => openCommentsDialog(pedidoNumber)}
                            >
                              <MessageSquare className="h-4 w-4 mr-1" />
                              Comentários
                            </Button>
                          </DialogTrigger>
                          <DialogContent className="max-w-2xl">
                            <DialogHeader>
                              <DialogTitle>
                                Comentários - Pedido {selectedBudget}
                              </DialogTitle>
                              <DialogDescription>
                                Adicione comentários sobre este orçamento para acompanhar o progresso.
                              </DialogDescription>
                            </DialogHeader>
                            
                            <div className="space-y-4">
                              <div className="space-y-2">
                                <label className="text-sm font-medium">Novo Comentário</label>
                                <Textarea
                                  placeholder="Digite seu comentário sobre este orçamento..."
                                  value={newComment}
                                  onChange={(e) => setNewComment(e.target.value)}
                                />
                              </div>
                              
                              <Button 
                                onClick={addComment}
                                disabled={!newComment.trim() || loading}
                              >
                                {loading ? "Salvando..." : "Adicionar Comentário"}
                              </Button>
                              
                              <div className="space-y-2">
                                <label className="text-sm font-medium">
                                  Histórico de Comentários ({comments[selectedBudget || ""]?.length || 0})
                                </label>
                                <ScrollArea className="h-64 border rounded-md p-3">
                                  {comments[selectedBudget || ""]?.length > 0 ? (
                                    <div className="space-y-3">
                                      {comments[selectedBudget || ""].map((comment) => (
                                        <div key={comment.id} className="border-b pb-2 last:border-b-0">
                                          <div className="flex justify-between items-start mb-1">
                                            <span className="font-medium text-sm">
                                              {comment.user_name}
                                            </span>
                                            <span className="text-xs text-muted-foreground">
                                              {new Date(comment.created_at).toLocaleString('pt-BR')}
                                            </span>
                                          </div>
                                          <p className="text-sm text-muted-foreground">
                                            {comment.comment}
                                          </p>
                                        </div>
                                      ))}
                                    </div>
                                  ) : (
                                    <p className="text-sm text-muted-foreground text-center">
                                      Nenhum comentário ainda.
                                    </p>
                                  )}
                                </ScrollArea>
                              </div>
                            </div>
                          </DialogContent>
                        </Dialog>
                      </TableCell>
                    </TableRow>
                    {isExpanded && items.map((item, itemIndex) => (
                      <TableRow key={`${pedidoNumber}-${itemIndex}`} className="bg-muted/20">
                        <TableCell></TableCell>
                        <TableCell colSpan={2} className="text-sm text-muted-foreground">
                          {item.descricaomat}
                        </TableCell>
                        <TableCell className="text-sm">{item.observacao || '-'}</TableCell>
                          <TableCell className="text-sm">{item.qtd} {item.un}</TableCell>
                          <TableCell className="text-sm">{formatCurrency(item.valor_un_bruto)}</TableCell>
                          <TableCell></TableCell>
                          <TableCell className="text-right text-sm">{formatCurrency(item.valor)}</TableCell>
                        <TableCell className="text-right text-sm">{item.peso.toLocaleString('pt-BR')}</TableCell>
                        <TableCell colSpan={2}></TableCell>
                      </TableRow>
                    ))}
                  </React.Fragment>
                );
              })}
              {Object.keys(groupedOrcamentos).length === 0 && (
                <TableRow>
                  <TableCell colSpan={11} className="text-center text-muted-foreground">
                    Nenhum orçamento em aberto
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
            </Table>
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}