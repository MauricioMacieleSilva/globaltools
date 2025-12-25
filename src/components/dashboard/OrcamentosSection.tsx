import React, { useState, useMemo, useEffect } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { ChevronDown, ChevronRight, Star, MessageSquare, Search, Info, Calendar, Target } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { useComercial } from '@/context/ComercialContext';
import { useOrcamentosData } from '@/hooks/useOrcamentosData';
import { useDebounce } from '@/hooks/useDebounce';
import { TemperaturaIndicator } from './TemperaturaIndicator';
import { TemperaturaExplanation } from './TemperaturaExplanation';
import { FollowUpDialog } from './FollowUpDialog';
import { BudgetCountsIndicator } from './BudgetCountsIndicator';
import { supabase } from '@/integrations/supabase/client';

interface OrcamentosSectionProps {
  sharedOrcamentosData?: ReturnType<typeof useOrcamentosData>;
}

export function OrcamentosSection({ sharedOrcamentosData }: OrcamentosSectionProps) {
  const { data, filters } = useComercial();
  const [searchTerm, setSearchTerm] = useState("");
  const debouncedSearchTerm = useDebounce(searchTerm, 300);
  const [followUpDialogOpen, setFollowUpDialogOpen] = useState(false);
  const [selectedBudgetForFollowUp, setSelectedBudgetForFollowUp] = useState<{
    number: string;
    client: string;
  } | null>(null);
  const [sdrBudgets, setSdrBudgets] = useState<Set<string>>(new Set());
  
  const localOrcamentosData = useOrcamentosData();
  
  // Load SDR budgets
  const loadSdrBudgets = async () => {
    try {
      const { data: leadsData, error } = await supabase
        .from('leads')
        .select('budget_number')
        .not('budget_number', 'is', null);

      if (error) throw error;
      
      const budgetNumbers = new Set<string>();
      
      leadsData?.forEach(lead => {
        if (lead.budget_number) {
          // Handle multiple budget numbers (comma-separated or JSON)
          try {
            let numbers: string[] = [];
            if (lead.budget_number.startsWith('[')) {
              numbers = JSON.parse(lead.budget_number);
            } else {
              numbers = lead.budget_number.split(',').filter(Boolean);
            }
            numbers.forEach(num => budgetNumbers.add(num.trim()));
          } catch {
            // Fallback for single budget number
            budgetNumbers.add(lead.budget_number.trim());
          }
        }
      });
      
      setSdrBudgets(budgetNumbers);
    } catch (error) {
      console.error('Erro ao carregar orçamentos do pipeline SDR:', error);
    }
  };
  
  // Use shared data if provided, otherwise use local instance
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
    groupedDataWithRatings,
    calculateTemperatureStats,
    formatCurrency,
    formatDate
  } = sharedOrcamentosData || localOrcamentosData;

  // Usar dados brutos para mostrar TODOS os orçamentos em aberto, mas aplicar filtro de vendedor
  const orcamentosData = useMemo(() => {
    return data.filter(item => {
      // Excluir vendedor "VENDEDOR"
      if (item.vendedor === 'VENDEDOR') return false;
      
      // Excluir cliente GLOBAL AÇO (já filtrado no service, mas mantido como double-check)
      const nomeFantasia = item.cli_nomefantasia?.toUpperCase() || '';
      if (nomeFantasia.includes('GLOBAL AÇO')) {
        return false;
      }
      
      // Aplicar filtro de vendedor se selecionado
      if (filters.vendedor && item.vendedor !== filters.vendedor) return false;
      
      // Mostrar apenas orçamentos (não pedidos)
      return item.situacao === "Orçamento";
    });
  }, [data, filters.vendedor]);

  // Filtrar por pesquisa
  const filteredData = useMemo(() => {
    if (!debouncedSearchTerm.trim()) return orcamentosData;
    
    const searchLower = debouncedSearchTerm.toLowerCase();
    return orcamentosData.filter(item => 
      item.cli_nomefantasia?.toLowerCase().includes(searchLower) ||
      item.numeropedido?.toLowerCase().includes(searchLower)
    );
  }, [orcamentosData, debouncedSearchTerm]);

  // Calcular quantidades para o título
  const totalPedidos = useMemo(() => {
    const uniquePedidos = new Set(filteredData.map(item => item.numeropedido));
    return uniquePedidos.size;
  }, [filteredData]);
  
  const totalClientes = useMemo(() => {
    const uniqueClientes = new Set(filteredData.map(item => item.codigocliente));
    return uniqueClientes.size;
  }, [filteredData]);

  const renderStars = (budgetNumber: string) => {
    const rating = ratings[budgetNumber]?.rating || 0;
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
    return groupedDataWithRatings(filteredData, ratings);
  }, [filteredData, ratings, groupedDataWithRatings]);

  const temperatureStats = useMemo(() => {
    return calculateTemperatureStats(filteredData, ratings);
  }, [filteredData, ratings, calculateTemperatureStats]);

  // Carregar classificações e orçamentos do SDR na inicialização (apenas se usar instância local)
  useEffect(() => {
    if (!sharedOrcamentosData) {
      loadRatings();
    }
    loadSdrBudgets();
  }, [loadRatings, sharedOrcamentosData]);

  return (
    <div className="space-y-2 sm:space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm sm:text-lg font-semibold">Orçamentos em Aberto</h3>
      </div>
      
      <TemperaturaIndicator stats={temperatureStats} />
      
      <div className="flex items-center gap-2">
        <Search className="h-3 w-3 sm:h-4 sm:w-4 text-muted-foreground" />
        <Input
          placeholder="Pesquisar..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="h-8 sm:h-9 text-xs sm:text-sm"
        />
      </div>
      
      <div className="overflow-x-auto -mx-2 px-2">
        <Table className="text-xs sm:text-sm">
          <TableHeader>
            <TableRow>
              <TableHead className="w-6 sm:w-8 px-1"></TableHead>
              <TableHead className="px-1 sm:px-2">Pedido</TableHead>
              <TableHead className="px-1 sm:px-2 hidden sm:table-cell">Status</TableHead>
              <TableHead className="px-1 sm:px-2 hidden sm:table-cell">Data</TableHead>
              <TableHead className="px-1 sm:px-2">Cliente</TableHead>
              <TableHead className="px-1 sm:px-2 hidden lg:table-cell">UF</TableHead>
              <TableHead className="px-1 sm:px-2 hidden lg:table-cell">Vendedor</TableHead>
              <TableHead className="text-right px-1 sm:px-2">Valor</TableHead>
              <TableHead className="text-right px-1 sm:px-2 hidden sm:table-cell">Peso</TableHead>
              <TableHead className="px-1 sm:px-2">
                <div className="flex items-center gap-1">
                  <span className="hidden sm:inline">Classif.</span>
                  <span className="sm:hidden">★</span>
                  <TemperaturaExplanation>
                    <Button variant="ghost" size="sm" className="h-4 w-4 sm:h-6 sm:w-6 p-0">
                      <Info className="h-2.5 w-2.5 sm:h-3 sm:w-3" />
                    </Button>
                  </TemperaturaExplanation>
                </div>
              </TableHead>
              <TableHead className="px-1 sm:px-2 hidden sm:table-cell">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {groupedOrcamentos.map(([pedidoNumber, items]) => {
              const isExpanded = expandedPedidos.has(pedidoNumber);
              const totalPedido = items.reduce((sum, item) => sum + item.valor, 0);
              const totalPeso = items.reduce((sum, item) => sum + item.peso, 0);
              const firstItem = items[0];
              
              return (
                <React.Fragment key={pedidoNumber}>
                  <TableRow className="hover:bg-muted/50">
                    <TableCell className="w-6 sm:w-8 px-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => togglePedido(pedidoNumber)}
                        className="h-6 w-6 p-0"
                      >
                        {isExpanded ? <ChevronDown className="h-3 w-3 sm:h-4 sm:w-4" /> : <ChevronRight className="h-3 w-3 sm:h-4 sm:w-4" />}
                      </Button>
                    </TableCell>
                    <TableCell className="font-medium px-1 sm:px-2">
                      <div className="flex items-center gap-1">
                        <span className="text-xs sm:text-sm">{firstItem.numeropedido || pedidoNumber}</span>
                        {sdrBudgets.has(pedidoNumber) && (
                          <div title="Pipeline SDR" className="hidden sm:block">
                            <Target className="h-3 w-3 text-blue-600" />
                          </div>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="px-1 sm:px-2 hidden sm:table-cell">
                      <Badge variant={firstItem.situacao === "Pedido" ? "default" : "secondary"} className="text-[10px] sm:text-xs">
                        {firstItem.situacao}
                      </Badge>
                    </TableCell>
                    <TableCell className="px-1 sm:px-2 hidden sm:table-cell text-xs">{formatDate(firstItem.situacao === 'Orçamento' ? firstItem.data_pedido_pronto : firstItem.data_inicio)}</TableCell>
                    <TableCell className="max-w-[80px] sm:max-w-[150px] truncate px-1 sm:px-2 text-xs" title={firstItem.cli_nomefantasia}>
                      {firstItem.cli_nomefantasia}
                    </TableCell>
                    <TableCell className="px-1 sm:px-2 hidden lg:table-cell text-xs">{firstItem.uf}</TableCell>
                    <TableCell className="px-1 sm:px-2 hidden lg:table-cell text-xs">{firstItem.vendedor}</TableCell>
                    <TableCell className="text-right font-medium px-1 sm:px-2 text-xs sm:text-sm">{formatCurrency(totalPedido)}</TableCell>
                    <TableCell className="text-right px-1 sm:px-2 hidden sm:table-cell text-xs">{Math.round(totalPeso).toLocaleString('pt-BR')}</TableCell>
                    <TableCell className="px-1 sm:px-2">
                      <div className="flex items-center gap-0.5">
                        {[1, 2, 3, 4, 5].map((star) => (
                          <Star
                            key={star}
                            className={`h-3 w-3 sm:h-4 sm:w-4 cursor-pointer transition-colors ${
                              star <= (ratings[pedidoNumber]?.rating || 0)
                                ? "fill-yellow-400 text-yellow-400" 
                                : "text-gray-300 hover:text-yellow-400"
                            }`}
                            onClick={() => setRating(pedidoNumber, star)}
                          />
                        ))}
                      </div>
                    </TableCell>
                    <TableCell className="px-1 sm:px-2 hidden sm:table-cell">
                      <div className="flex items-center gap-1">
                        <Dialog>
                          <DialogTrigger asChild>
                            <Button 
                              variant="outline" 
                              size="sm"
                              onClick={() => openCommentsDialog(pedidoNumber)}
                              className="flex items-center gap-1 h-6 sm:h-8 px-1.5 sm:px-2"
                            >
                              <MessageSquare className="h-3 w-3 sm:h-4 sm:w-4" />
                              <BudgetCountsIndicator budgetNumber={pedidoNumber} type="comments" />
                            </Button>
                          </DialogTrigger>
                         <DialogContent className="max-w-2xl">
                           <DialogHeader>
                             <DialogTitle>
                               Comentários - Pedido {selectedBudget}
                             </DialogTitle>
                             <DialogDescription>
                               <div className="space-y-2 mt-2">
                                 <div className="text-sm">
                                   <strong>Cliente:</strong> {firstItem.cli_nomefantasia}
                                 </div>
                                 <div className="flex gap-4 text-sm">
                                   <span><strong>Valor:</strong> {formatCurrency(totalPedido)}</span>
                                   <span><strong>Peso:</strong> {Math.round(totalPeso).toLocaleString('pt-BR')}kg</span>
                                 </div>
                                 <div className="flex gap-4 text-sm">
                                   <span><strong>Vendedor:</strong> {firstItem.vendedor}</span>
                                   <span><strong>Data:</strong> {formatDate(firstItem.situacao === 'Orçamento' ? firstItem.data_pedido_pronto : firstItem.data_inicio)}</span>
                                 </div>
                               </div>
                               <div className="mt-4 text-muted-foreground">
                                 Adicione comentários sobre este orçamento para acompanhar o progresso.
                               </div>
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
                      
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => {
                            setSelectedBudgetForFollowUp({
                              number: pedidoNumber,
                              client: firstItem.cli_nomefantasia
                            });
                            setFollowUpDialogOpen(true);
                          }}
                          title="Criar novo follow-up"
                          className="flex items-center gap-1 h-6 sm:h-8 px-1.5 sm:px-2"
                        >
                          <Calendar className="h-3 w-3 sm:h-4 sm:w-4" />
                          <BudgetCountsIndicator budgetNumber={pedidoNumber} type="followups" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                  {isExpanded && items.map((item, itemIndex) => (
                    <TableRow key={`${pedidoNumber}-${itemIndex}`} className="bg-muted/20 text-[10px] sm:text-sm">
                      <TableCell className="px-1"></TableCell>
                      <TableCell colSpan={2} className="text-muted-foreground px-1 sm:px-2">
                        {item.descricaomat}
                      </TableCell>
                      <TableCell className="px-1 sm:px-2 hidden sm:table-cell">{item.observacao || '-'}</TableCell>
                      <TableCell className="px-1 sm:px-2">{item.qtd} {item.un}</TableCell>
                      <TableCell className="px-1 sm:px-2 hidden lg:table-cell">{formatCurrency(item.valor_un_bruto)}</TableCell>
                      <TableCell className="hidden lg:table-cell"></TableCell>
                      <TableCell className="text-right px-1 sm:px-2">{formatCurrency(item.valor)}</TableCell>
                      <TableCell className="text-right px-1 sm:px-2 hidden sm:table-cell">{Math.round(item.peso).toLocaleString('pt-BR')}</TableCell>
                      <TableCell colSpan={2} className="hidden sm:table-cell"></TableCell>
                    </TableRow>
                  ))}
                </React.Fragment>
              );
            })}
            {groupedOrcamentos.length === 0 && (
              <TableRow>
                <TableCell colSpan={11} className="text-center text-muted-foreground">
                  Nenhum orçamento ou pedido em aberto
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      {selectedBudgetForFollowUp && (
        <FollowUpDialog
          open={followUpDialogOpen}
          onOpenChange={setFollowUpDialogOpen}
          budgetNumber={selectedBudgetForFollowUp.number}
          clientName={selectedBudgetForFollowUp.client}
        />
      )}
      
    </div>
  );
}