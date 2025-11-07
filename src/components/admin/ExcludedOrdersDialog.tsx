import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Trash2, Plus, X } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface ExcludedOrder {
  id: string;
  numero_pedido: string;
  numero_nf?: string;
  motivo?: string;
  excluded_by: string;
  excluded_at: string;
}

interface ExcludedOrdersDialogProps {
  isOpen: boolean;
  onClose: () => void;
}

export function ExcludedOrdersDialog({ isOpen, onClose }: ExcludedOrdersDialogProps) {
  const [excludedOrders, setExcludedOrders] = useState<ExcludedOrder[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isAdding, setIsAdding] = useState(false);
  const [newOrder, setNewOrder] = useState({
    numero_pedido: '',
    numero_nf: '',
    motivo: ''
  });
  const { toast } = useToast();

  const loadExcludedOrders = async () => {
    try {
      setIsLoading(true);
      const { data, error } = await supabase
        .from('excluded_orders')
        .select('*')
        .order('excluded_at', { ascending: false });

      if (error) throw error;
      setExcludedOrders(data || []);
    } catch (error) {
      console.error('Erro ao carregar pedidos excluídos:', error);
      toast({
        title: "Erro",
        description: "Erro ao carregar pedidos excluídos",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleAddExclusion = async () => {
    if (!newOrder.numero_pedido.trim()) {
      toast({
        title: "Erro",
        description: "Número do pedido é obrigatório",
        variant: "destructive"
      });
      return;
    }

    try {
      const { error } = await supabase
        .from('excluded_orders')
        .insert({
          numero_pedido: newOrder.numero_pedido.trim(),
          numero_nf: newOrder.numero_nf.trim() || null,
          motivo: newOrder.motivo.trim() || null,
          excluded_by: (await supabase.auth.getUser()).data.user?.id
        });

      if (error) throw error;

      toast({
        title: "Sucesso",
        description: "Pedido excluído dos indicadores"
      });

      setNewOrder({ numero_pedido: '', numero_nf: '', motivo: '' });
      setIsAdding(false);
      loadExcludedOrders();
    } catch (error: any) {
      console.error('Erro ao excluir pedido:', error);
      toast({
        title: "Erro",
        description: error.message === 'duplicate key value violates unique constraint "excluded_orders_numero_pedido_key"' 
          ? "Este pedido já está excluído dos indicadores"
          : "Erro ao excluir pedido dos indicadores",
        variant: "destructive"
      });
    }
  };

  const handleRemoveExclusion = async (id: string) => {
    try {
      const { error } = await supabase
        .from('excluded_orders')
        .delete()
        .eq('id', id);

      if (error) throw error;

      toast({
        title: "Sucesso",
        description: "Pedido removido da lista de exclusões"
      });

      loadExcludedOrders();
    } catch (error) {
      console.error('Erro ao remover exclusão:', error);
      toast({
        title: "Erro",
        description: "Erro ao remover exclusão",
        variant: "destructive"
      });
    }
  };

  useEffect(() => {
    if (isOpen) {
      loadExcludedOrders();
    }
  }, [isOpen]);

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl">
        <DialogHeader>
          <DialogTitle>Gerenciar Pedidos Excluídos dos Indicadores</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Formulário para adicionar nova exclusão */}
          {isAdding ? (
            <div className="border rounded-lg p-4 space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="font-medium">Excluir Novo Pedido</h3>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setIsAdding(false)}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
              
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-sm font-medium">Número do Pedido *</label>
                  <Input
                    value={newOrder.numero_pedido}
                    onChange={(e) => setNewOrder(prev => ({ ...prev, numero_pedido: e.target.value }))}
                    placeholder="Ex: 12345"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium">Número da NF</label>
                  <Input
                    value={newOrder.numero_nf}
                    onChange={(e) => setNewOrder(prev => ({ ...prev, numero_nf: e.target.value }))}
                    placeholder="Ex: NF12345"
                  />
                </div>
              </div>
              
              <div>
                <label className="text-sm font-medium">Motivo da Exclusão</label>
                <Textarea
                  value={newOrder.motivo}
                  onChange={(e) => setNewOrder(prev => ({ ...prev, motivo: e.target.value }))}
                  placeholder="Descreva o motivo para excluir este pedido dos indicadores..."
                  rows={2}
                />
              </div>
              
              <div className="flex gap-2">
                <Button onClick={handleAddExclusion} size="sm">
                  Excluir dos Indicadores
                </Button>
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => setIsAdding(false)}
                >
                  Cancelar
                </Button>
              </div>
            </div>
          ) : (
            <Button onClick={() => setIsAdding(true)} className="w-fit">
              <Plus className="h-4 w-4 mr-2" />
              Excluir Novo Pedido
            </Button>
          )}

          {/* Lista de pedidos excluídos */}
          <div className="border rounded-lg">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Número do Pedido</TableHead>
                  <TableHead>Número da NF</TableHead>
                  <TableHead>Motivo</TableHead>
                  <TableHead>Excluído em</TableHead>
                  <TableHead className="w-20">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center py-4">
                      Carregando...
                    </TableCell>
                  </TableRow>
                ) : excludedOrders.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center py-4 text-muted-foreground">
                      Nenhum pedido excluído dos indicadores
                    </TableCell>
                  </TableRow>
                ) : (
                  excludedOrders.map((order) => (
                    <TableRow key={order.id}>
                      <TableCell>
                        <Badge variant="outline">{order.numero_pedido}</Badge>
                      </TableCell>
                      <TableCell>{order.numero_nf || '-'}</TableCell>
                      <TableCell>
                        <span className="text-sm text-muted-foreground">
                          {order.motivo || 'Sem motivo especificado'}
                        </span>
                      </TableCell>
                      <TableCell className="text-sm">
                        {format(new Date(order.excluded_at), 'dd/MM/yyyy HH:mm', { locale: ptBR })}
                      </TableCell>
                      <TableCell>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleRemoveExclusion(order.id)}
                          className="text-red-600 hover:text-red-700"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}