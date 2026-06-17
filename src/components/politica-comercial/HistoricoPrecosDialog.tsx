import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { History, Loader2, RefreshCw } from 'lucide-react';
import { fetchPoliticaComercialHistory, PoliticaComercialHistorico } from '@/services/politicaComercialService';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';

const CLASSES_MAP: Record<string, string> = {
  'TODAS': 'Todas as classes',
  'ARAMES': 'Arames',
  'BOBINAS': 'Bobinas',
  'PERFIS': 'Perfis',
  'CHAPAS': 'Chapas',
  'TELHAS': 'Telhas',
  'TUBOS': 'Tubos',
  'LAMINADOS': 'Laminados',
  'VERGALHAO': 'Construção Civil',
  'BLANK': 'Blank'
};

const TIPO_AJUSTE_MAP: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
  'CRIACAO': { label: 'Novo Item', variant: 'secondary' },
  'AJUSTE': { label: 'Ajuste', variant: 'default' },
  'EXCLUSAO': { label: 'Inativado', variant: 'destructive' },
  'DELECAO_FISICA': { label: 'Excluído', variant: 'destructive' }
};

export function HistoricoPrecosDialog() {
  const [isOpen, setIsOpen] = useState(false);
  const [history, setHistory] = useState<PoliticaComercialHistorico[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const loadHistory = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await fetchPoliticaComercialHistory();
      if (error) throw error;
      setHistory(data || []);
    } catch (error) {
      console.error('Erro ao carregar histórico de preços:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      loadHistory();
    }
  }, [isOpen]);

  const formatCurrency = (val: number | null | undefined) => {
    if (val === null || val === undefined) return '-';
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);
  };

  const formatDate = (dateStr: string) => {
    try {
      const date = new Date(dateStr);
      return date.toLocaleString('pt-BR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch (e) {
      return dateStr;
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" className="w-full gap-2 border-primary/20 hover:border-primary/40 text-foreground hover:bg-accent py-5">
          <History className="h-4 w-4 text-primary" />
          Histórico de Ajustes
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-4xl max-h-[85vh] flex flex-col">
        <DialogHeader className="flex flex-row items-center justify-between pr-6">
          <div>
            <DialogTitle className="flex items-center gap-2 text-xl font-bold">
              <History className="h-5 w-5 text-primary" />
              Histórico de Alterações de Preços
            </DialogTitle>
            <DialogDescription className="mt-1">
              Registro completo de todas as alterações, criações e exclusões na tabela de preços.
            </DialogDescription>
          </div>
          <Button 
            variant="outline" 
            size="icon" 
            onClick={loadHistory} 
            disabled={isLoading}
            className="h-8 w-8"
          >
            {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
          </Button>
        </DialogHeader>

        <div className="flex-1 min-h-[300px] mt-4 border rounded-md">
          {isLoading ? (
            <div className="flex flex-col items-center justify-center h-[400px] gap-2">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
              <p className="text-sm text-muted-foreground">Carregando histórico...</p>
            </div>
          ) : history.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-[400px] text-muted-foreground">
              <History className="h-12 w-12 opacity-30 mb-2" />
              <p>Nenhuma alteração de preço registrada no histórico.</p>
            </div>
          ) : (
            <ScrollArea className="h-[500px]">
              <Table>
                <TableHeader className="sticky top-0 bg-background z-10 shadow-sm border-b">
                  <TableRow>
                    <TableHead className="w-[140px]">Data/Hora</TableHead>
                    <TableHead className="w-[100px]">Ação</TableHead>
                    <TableHead className="w-[120px]">Classe</TableHead>
                    <TableHead>Material / Descrição</TableHead>
                    <TableHead className="text-right w-[110px]">Preço Ant.</TableHead>
                    <TableHead className="text-right w-[110px]">Preço Novo</TableHead>
                    <TableHead className="text-right w-[90px]">Ajuste (%)</TableHead>
                    <TableHead className="w-[140px]">Usuário</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {history.map((log) => {
                    const tipo = TIPO_AJUSTE_MAP[log.tipo_ajuste] || { label: log.tipo_ajuste, variant: 'outline' };
                    const percent = log.percentual_ajuste;
                    const isPositive = percent !== null && percent > 0;
                    const isNegative = percent !== null && percent < 0;

                    return (
                      <TableRow key={log.id} className="hover:bg-muted/50">
                        <TableCell className="text-xs font-medium">{formatDate(log.created_at)}</TableCell>
                        <TableCell>
                          <Badge variant={tipo.variant} className="text-[10px] px-1.5 py-0.5 font-semibold">
                            {tipo.label}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-xs font-semibold text-muted-foreground">
                          {CLASSES_MAP[log.classe] || log.classe}
                        </TableCell>
                        <TableCell className="text-xs max-w-[200px] truncate" title={log.descricao}>
                          {log.descricao}
                        </TableCell>
                        <TableCell className="text-right text-xs text-muted-foreground">
                          {formatCurrency(log.preco_anterior)}
                        </TableCell>
                        <TableCell className="text-right text-xs font-semibold">
                          {formatCurrency(log.preco_novo)}
                        </TableCell>
                        <TableCell className="text-right text-xs font-bold">
                          {percent !== null ? (
                            <span className={isPositive ? 'text-green-600' : isNegative ? 'text-destructive' : 'text-foreground'}>
                              {isPositive ? `+${percent.toFixed(2)}%` : `${percent.toFixed(2)}%`}
                            </span>
                          ) : (
                            <span className="text-muted-foreground">-</span>
                          )}
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground truncate max-w-[120px]" title={log.usuario_nome || 'Sistema'}>
                          {log.usuario_nome || 'Sistema'}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </ScrollArea>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
