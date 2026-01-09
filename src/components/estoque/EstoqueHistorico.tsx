import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  fetchMovimentacoes, 
  MovimentacaoEstoque, 
  TipoMovimentacao,
  getTipoMovimentacaoConfig 
} from '@/services/estoqueMovimentacoesService';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { History, Search, ArrowUpCircle, ArrowDownCircle, RefreshCw, Plus, Pencil, X } from 'lucide-react';
import { useIsMobile } from '@/hooks/use-mobile';

interface EstoqueHistoricoProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const TIPOS_MOVIMENTACAO: { value: TipoMovimentacao | 'all'; label: string }[] = [
  { value: 'all', label: 'Todos os tipos' },
  { value: 'ENTRADA', label: 'Entradas' },
  { value: 'SAIDA', label: 'Saídas' },
  { value: 'CRIACAO', label: 'Criações' },
  { value: 'EDICAO', label: 'Edições' },
  { value: 'AJUSTE', label: 'Ajustes' },
];

function getMovimentacaoIcon(tipo: TipoMovimentacao) {
  switch (tipo) {
    case 'ENTRADA':
      return <ArrowUpCircle className="h-5 w-5 text-emerald-500" />;
    case 'SAIDA':
      return <ArrowDownCircle className="h-5 w-5 text-red-500" />;
    case 'CRIACAO':
      return <Plus className="h-5 w-5 text-blue-500" />;
    case 'EDICAO':
      return <Pencil className="h-5 w-5 text-purple-500" />;
    case 'AJUSTE':
      return <RefreshCw className="h-5 w-5 text-amber-500" />;
    default:
      return <History className="h-5 w-5 text-muted-foreground" />;
  }
}

export function EstoqueHistorico({ open, onOpenChange }: EstoqueHistoricoProps) {
  const [movimentacoes, setMovimentacoes] = useState<MovimentacaoEstoque[]>([]);
  const [loading, setLoading] = useState(false);
  const [filtro, setFiltro] = useState('');
  const [tipoFiltro, setTipoFiltro] = useState<TipoMovimentacao | 'all'>('all');
  const isMobile = useIsMobile();

  useEffect(() => {
    if (open) {
      loadMovimentacoes();
    }
  }, [open, tipoFiltro]);

  const loadMovimentacoes = async () => {
    setLoading(true);
    try {
      const { data, error } = await fetchMovimentacoes({
        tipo: tipoFiltro === 'all' ? undefined : tipoFiltro,
        limit: 200,
      });

      if (error) throw error;
      setMovimentacoes(data || []);
    } catch (error) {
      console.error('Error loading movimentacoes:', error);
    } finally {
      setLoading(false);
    }
  };

  const movimentacoesFiltradas = movimentacoes.filter((mov) =>
    mov.item_descricao?.toLowerCase().includes(filtro.toLowerCase()) ||
    mov.usuario_nome?.toLowerCase().includes(filtro.toLowerCase()) ||
    mov.observacao?.toLowerCase().includes(filtro.toLowerCase())
  );

  const formatDate = (dateString: string) => {
    try {
      return format(new Date(dateString), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR });
    } catch {
      return dateString;
    }
  };

  const formatQuantidade = (qtd: number | null) => {
    if (qtd === null || qtd === undefined) return '-';
    return qtd.toLocaleString('pt-BR', { minimumFractionDigits: 0, maximumFractionDigits: 2 });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className={isMobile ? "max-w-[95vw] h-[90vh] p-4" : "max-w-3xl max-h-[85vh]"}>
        <DialogHeader className="pb-2">
          <DialogTitle className="flex items-center gap-2">
            <History className="h-5 w-5" />
            Histórico de Movimentações
          </DialogTitle>
        </DialogHeader>

        <div className="flex flex-col sm:flex-row gap-2 mb-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
            <Input
              placeholder="Buscar por item, usuário..."
              value={filtro}
              onChange={(e) => setFiltro(e.target.value)}
              className="pl-10"
            />
          </div>
          <Select value={tipoFiltro} onValueChange={(v) => setTipoFiltro(v as TipoMovimentacao | 'all')}>
            <SelectTrigger className="w-full sm:w-44">
              <SelectValue placeholder="Tipo" />
            </SelectTrigger>
            <SelectContent>
              {TIPOS_MOVIMENTACAO.map((tipo) => (
                <SelectItem key={tipo.value} value={tipo.value}>
                  {tipo.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <ScrollArea className={isMobile ? "h-[calc(90vh-180px)]" : "h-[500px]"}>
          {loading ? (
            <div className="space-y-3">
              {Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} className="h-20 w-full" />
              ))}
            </div>
          ) : movimentacoesFiltradas.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <History className="h-12 w-12 mx-auto mb-3 opacity-50" />
              <p>Nenhuma movimentação encontrada</p>
              {filtro && (
                <Button 
                  variant="link" 
                  size="sm" 
                  onClick={() => setFiltro('')}
                  className="mt-2"
                >
                  Limpar filtro
                </Button>
              )}
            </div>
          ) : (
            <div className="space-y-2">
              {movimentacoesFiltradas.map((mov) => {
                const config = getTipoMovimentacaoConfig(mov.tipo_movimentacao);
                return (
                  <Card key={mov.id} className="overflow-hidden">
                    <div className="p-3 sm:p-4">
                      <div className="flex items-start gap-3">
                        <div className="shrink-0 mt-0.5">
                          {getMovimentacaoIcon(mov.tipo_movimentacao)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex flex-wrap items-center gap-2 mb-1">
                            <Badge className={`${config.color} border-0 text-xs`}>
                              {config.label}
                            </Badge>
                            {mov.item_categoria && (
                              <Badge variant="outline" className="text-xs">
                                {mov.item_categoria}
                              </Badge>
                            )}
                          </div>
                          <p className="font-medium text-sm line-clamp-1">
                            {mov.item_descricao || 'Item não identificado'}
                          </p>
                          
                          {mov.tipo_movimentacao !== 'EDICAO' && (
                            <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground">
                              <span>Qtd: {formatQuantidade(mov.quantidade_anterior)}</span>
                              <span>→</span>
                              <span className="font-medium text-foreground">
                                {formatQuantidade(mov.quantidade_nova)}
                              </span>
                              {mov.quantidade_movimentada !== 0 && mov.quantidade_movimentada !== null && (
                                <Badge 
                                  variant="secondary" 
                                  className={`text-xs ${mov.tipo_movimentacao === 'ENTRADA' ? 'text-emerald-600' : mov.tipo_movimentacao === 'SAIDA' ? 'text-red-600' : ''}`}
                                >
                                  {mov.tipo_movimentacao === 'ENTRADA' ? '+' : mov.tipo_movimentacao === 'SAIDA' ? '-' : ''}
                                  {formatQuantidade(mov.quantidade_movimentada)}
                                </Badge>
                              )}
                            </div>
                          )}
                          
                          {mov.observacao && (
                            <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                              {mov.observacao}
                            </p>
                          )}
                          
                          <div className="flex items-center justify-between mt-2 text-xs text-muted-foreground">
                            <span>
                              {mov.usuario_nome || 'Sistema'}
                            </span>
                            <span>{formatDate(mov.created_at)}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </Card>
                );
              })}
            </div>
          )}
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
