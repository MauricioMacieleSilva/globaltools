import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { EstoqueItem, updateEstoqueItem } from '@/services/estoqueService';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useAuth } from '@/context/AuthContext';
import { ArrowDownCircle, ArrowUpCircle, Package, Search } from 'lucide-react';
import { cn } from '@/lib/utils';

interface EstoqueMovimentacaoDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  items: EstoqueItem[];
  onSuccess: () => void;
}

type TipoMovimentacao = 'ENTRADA' | 'SAIDA';

export function EstoqueMovimentacaoDialog({
  open,
  onOpenChange,
  items,
  onSuccess,
}: EstoqueMovimentacaoDialogProps) {
  const { user, userProfile } = useAuth();
  const [tipo, setTipo] = useState<TipoMovimentacao>('ENTRADA');
  const [selectedItemId, setSelectedItemId] = useState<string>('');
  const [quantidade, setQuantidade] = useState('');
  const [motivo, setMotivo] = useState('');
  const [observacao, setObservacao] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  const activeItems = items.filter(i => i.ativo);
  const filteredItems = activeItems.filter(item =>
    item.descricao.toLowerCase().includes(searchTerm.toLowerCase()) ||
    item.categoria.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const selectedItem = activeItems.find(i => i.id === selectedItemId);

  useEffect(() => {
    if (!open) {
      setTipo('ENTRADA');
      setSelectedItemId('');
      setQuantidade('');
      setMotivo('');
      setObservacao('');
      setSearchTerm('');
    }
  }, [open]);

  const handleSubmit = async () => {
    if (!selectedItemId) {
      toast.error('Selecione um item');
      return;
    }

    const qtd = parseFloat(quantidade);
    if (isNaN(qtd) || qtd <= 0) {
      toast.error('Quantidade deve ser maior que zero');
      return;
    }

    if (!motivo.trim()) {
      toast.error('Informe o motivo da movimentação');
      return;
    }

    if (!selectedItem) {
      toast.error('Item não encontrado');
      return;
    }

    // Validar saída
    if (tipo === 'SAIDA' && qtd > selectedItem.quantidade) {
      toast.error(`Quantidade insuficiente. Disponível: ${selectedItem.quantidade} ${selectedItem.unidade}`);
      return;
    }

    setIsLoading(true);

    try {
      const novaQuantidade = tipo === 'ENTRADA' 
        ? selectedItem.quantidade + qtd 
        : selectedItem.quantidade - qtd;

      // Registrar movimentação manualmente (além do trigger)
      const { error: movError } = await supabase.from('estoque_movimentacoes').insert({
        item_id: selectedItemId,
        tipo_movimentacao: tipo,
        quantidade_anterior: selectedItem.quantidade,
        quantidade_nova: novaQuantidade,
        quantidade_movimentada: qtd,
        motivo: motivo.trim(),
        observacao: observacao.trim() || null,
        usuario_id: user?.id,
        usuario_nome: userProfile?.full_name || 'Usuário',
        item_descricao: selectedItem.descricao,
        item_categoria: selectedItem.categoria,
      });

      if (movError) throw movError;

      // Atualizar quantidade do item (sem trigger para evitar duplicação)
      const { error: updateError } = await supabase
        .from('estoque_itens')
        .update({ quantidade: novaQuantidade })
        .eq('id', selectedItemId);

      if (updateError) throw updateError;

      toast.success(`${tipo === 'ENTRADA' ? 'Entrada' : 'Saída'} registrada com sucesso!`);
      onOpenChange(false);
      onSuccess();
    } catch (error) {
      console.error('Error:', error);
      toast.error('Erro ao registrar movimentação');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {tipo === 'ENTRADA' ? (
              <ArrowDownCircle className="h-5 w-5 text-emerald-500" />
            ) : (
              <ArrowUpCircle className="h-5 w-5 text-red-500" />
            )}
            Registrar Movimentação
          </DialogTitle>
          <DialogDescription>
            Registre entradas ou saídas de materiais do estoque.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 py-4">
          {/* Tipo de Movimentação */}
          <div className="grid grid-cols-2 gap-2">
            <Button
              type="button"
              variant={tipo === 'ENTRADA' ? 'default' : 'outline'}
              className={cn(
                'h-16 flex-col gap-1',
                tipo === 'ENTRADA' && 'bg-emerald-600 hover:bg-emerald-700'
              )}
              onClick={() => setTipo('ENTRADA')}
            >
              <ArrowDownCircle className="h-5 w-5" />
              <span>Entrada</span>
            </Button>
            <Button
              type="button"
              variant={tipo === 'SAIDA' ? 'default' : 'outline'}
              className={cn(
                'h-16 flex-col gap-1',
                tipo === 'SAIDA' && 'bg-red-600 hover:bg-red-700'
              )}
              onClick={() => setTipo('SAIDA')}
            >
              <ArrowUpCircle className="h-5 w-5" />
              <span>Saída</span>
            </Button>
          </div>

          {/* Busca de Item */}
          <div className="space-y-2">
            <Label>Item do Estoque *</Label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar item..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9"
              />
            </div>
            <Select value={selectedItemId} onValueChange={setSelectedItemId}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione o item" />
              </SelectTrigger>
              <SelectContent className="max-h-60">
                {filteredItems.length === 0 ? (
                  <div className="p-2 text-center text-sm text-muted-foreground">
                    Nenhum item encontrado
                  </div>
                ) : (
                  filteredItems.map((item) => (
                    <SelectItem key={item.id} value={item.id}>
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className="text-xs">
                          {item.categoria}
                        </Badge>
                        <span className="truncate">{item.descricao}</span>
                        <span className="text-muted-foreground text-xs ml-auto">
                          ({item.quantidade} {item.unidade})
                        </span>
                      </div>
                    </SelectItem>
                  ))
                )}
              </SelectContent>
            </Select>
          </div>

          {/* Item Selecionado Info */}
          {selectedItem && (
            <div className="p-3 bg-muted/50 rounded-lg border">
              <div className="flex items-center gap-2 mb-2">
                <Package className="h-4 w-4 text-muted-foreground" />
                <span className="font-medium text-sm">{selectedItem.descricao}</span>
              </div>
              <div className="flex items-center gap-4 text-sm">
                <span>
                  Estoque atual:{' '}
                  <strong className={selectedItem.quantidade <= 0 ? 'text-destructive' : ''}>
                    {selectedItem.quantidade} {selectedItem.unidade}
                  </strong>
                </span>
                {selectedItem.localizacao && (
                  <span className="text-muted-foreground">
                    Local: {selectedItem.localizacao}
                  </span>
                )}
              </div>
            </div>
          )}

          {/* Quantidade */}
          <div className="space-y-2">
            <Label htmlFor="quantidade">
              Quantidade ({selectedItem?.unidade || 'UN'}) *
            </Label>
            <Input
              id="quantidade"
              type="number"
              step={selectedItem?.unidade === 'KG' ? '0.01' : '1'}
              min="0"
              value={quantidade}
              onChange={(e) => setQuantidade(e.target.value)}
              placeholder="0"
            />
            {selectedItem && quantidade && !isNaN(parseFloat(quantidade)) && (
              <p className="text-xs text-muted-foreground">
                Novo estoque:{' '}
                <strong>
                  {tipo === 'ENTRADA'
                    ? selectedItem.quantidade + parseFloat(quantidade)
                    : selectedItem.quantidade - parseFloat(quantidade)}{' '}
                  {selectedItem.unidade}
                </strong>
              </p>
            )}
          </div>

          {/* Motivo */}
          <div className="space-y-2">
            <Label htmlFor="motivo">Motivo *</Label>
            <Select value={motivo} onValueChange={setMotivo}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione o motivo" />
              </SelectTrigger>
              <SelectContent>
                {tipo === 'ENTRADA' ? (
                  <>
                    <SelectItem value="Compra">Compra</SelectItem>
                    <SelectItem value="Devolução de cliente">Devolução de cliente</SelectItem>
                    <SelectItem value="Transferência de depósito">Transferência de depósito</SelectItem>
                    <SelectItem value="Produção interna">Produção interna</SelectItem>
                    <SelectItem value="Ajuste de inventário">Ajuste de inventário</SelectItem>
                    <SelectItem value="Outro">Outro</SelectItem>
                  </>
                ) : (
                  <>
                    <SelectItem value="Venda">Venda</SelectItem>
                    <SelectItem value="Consumo interno">Consumo interno</SelectItem>
                    <SelectItem value="Transferência de depósito">Transferência de depósito</SelectItem>
                    <SelectItem value="Perda/Avaria">Perda/Avaria</SelectItem>
                    <SelectItem value="Ajuste de inventário">Ajuste de inventário</SelectItem>
                    <SelectItem value="Outro">Outro</SelectItem>
                  </>
                )}
              </SelectContent>
            </Select>
          </div>

          {/* Observação */}
          <div className="space-y-2">
            <Label htmlFor="observacao">Observação</Label>
            <Textarea
              id="observacao"
              value={observacao}
              onChange={(e) => setObservacao(e.target.value)}
              placeholder="Informações adicionais (opcional)"
              rows={2}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={isLoading}
            className={cn(
              tipo === 'ENTRADA' 
                ? 'bg-emerald-600 hover:bg-emerald-700' 
                : 'bg-red-600 hover:bg-red-700'
            )}
          >
            {isLoading ? 'Registrando...' : `Registrar ${tipo === 'ENTRADA' ? 'Entrada' : 'Saída'}`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
