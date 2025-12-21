import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { 
  PerfilPreco,
  fetchPerfilPrecos,
  createPerfilPreco, 
  updatePerfilPreco, 
  deletePerfilPreco 
} from '@/services/perfilPrecosService';
import { Plus, Pencil, Trash2, Package, CheckCircle2, AlertCircle, Info } from 'lucide-react';
import { toast } from 'sonner';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

interface TabelaPerfisProps {
  isAdmin?: boolean;
  onItemClick?: (preco: number) => void;
}

interface ItemForm {
  id?: string;
  tipo: 'padrao' | 'especial';
  espessura: string;
  preco_kg: string;
}

const initialForm: ItemForm = {
  tipo: 'padrao',
  espessura: '',
  preco_kg: ''
};

export function TabelaPerfis({ isAdmin = false, onItemClick }: TabelaPerfisProps) {
  const [dados, setDados] = useState<PerfilPreco[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'padrao' | 'especial'>('padrao');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [form, setForm] = useState<ItemForm>(initialForm);
  const [itemToDelete, setItemToDelete] = useState<PerfilPreco | null>(null);

  const loadData = async () => {
    setLoading(true);
    const { data, error } = await fetchPerfilPrecos();
    if (error) {
      toast.error('Erro ao carregar preços de perfis');
    } else {
      setDados(data || []);
    }
    setLoading(false);
  };

  useEffect(() => {
    loadData();
  }, []);

  const dadosFiltrados = dados.filter(item => item.tipo === activeTab);
  const precosPadrao = dados.filter(item => item.tipo === 'padrao');
  const precosEspecial = dados.filter(item => item.tipo === 'especial');

  const handleOpenCreate = (tipo: 'padrao' | 'especial') => {
    setForm({ ...initialForm, tipo });
    setIsEditing(false);
    setIsDialogOpen(true);
  };

  const handleOpenEdit = (item: PerfilPreco) => {
    setForm({
      id: item.id,
      tipo: item.tipo,
      espessura: item.espessura.toString(),
      preco_kg: item.preco_kg.toString()
    });
    setIsEditing(true);
    setIsDialogOpen(true);
  };

  const handleOpenDelete = (item: PerfilPreco) => {
    setItemToDelete(item);
    setIsDeleteDialogOpen(true);
  };

  const handleSubmit = async () => {
    if (!form.espessura || parseFloat(form.espessura) <= 0) {
      toast.error('Espessura deve ser maior que zero');
      return;
    }
    
    if (!form.preco_kg || parseFloat(form.preco_kg) <= 0) {
      toast.error('Preço/kg deve ser maior que zero');
      return;
    }

    setIsSaving(true);

    try {
      if (isEditing && form.id) {
        const { error } = await updatePerfilPreco(form.id, {
          espessura: parseFloat(form.espessura),
          preco_kg: parseFloat(form.preco_kg)
        });

        if (error) throw error;
        toast.success('Preço atualizado com sucesso!');
      } else {
        const { error } = await createPerfilPreco({
          tipo: form.tipo,
          espessura: parseFloat(form.espessura),
          preco_kg: parseFloat(form.preco_kg)
        });

        if (error) throw error;
        toast.success('Preço adicionado com sucesso!');
      }

      setIsDialogOpen(false);
      loadData();
    } catch (error: any) {
      console.error('Error saving item:', error);
      if (error.code === '23505') {
        toast.error('Já existe um preço cadastrado para esta espessura e tipo');
      } else {
        toast.error('Erro ao salvar preço');
      }
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!itemToDelete?.id) return;

    setIsSaving(true);

    try {
      const { error } = await deletePerfilPreco(itemToDelete.id);
      if (error) throw error;
      
      toast.success('Preço removido com sucesso!');
      setIsDeleteDialogOpen(false);
      setItemToDelete(null);
      loadData();
    } catch (error) {
      console.error('Error deleting item:', error);
      toast.error('Erro ao remover preço');
    } finally {
      setIsSaving(false);
    }
  };

  const renderTable = (items: PerfilPreco[], tipo: 'padrao' | 'especial') => (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-32">Espessura (mm)</TableHead>
            <TableHead className="text-right">Preço/kg (R$)</TableHead>
            {isAdmin && <TableHead className="w-24 text-center">Ações</TableHead>}
          </TableRow>
        </TableHeader>
        <TableBody>
          {items.length === 0 ? (
            <TableRow>
              <TableCell 
                colSpan={isAdmin ? 3 : 2} 
                className="text-center py-8 text-muted-foreground"
              >
                <div className="flex flex-col items-center gap-2">
                  <Package className="h-8 w-8 opacity-50" />
                  <p>Nenhum preço cadastrado para perfil {tipo === 'padrao' ? 'padrão' : 'especial'}</p>
                  {isAdmin && (
                    <Button variant="outline" size="sm" onClick={() => handleOpenCreate(tipo)} className="mt-2">
                      <Plus className="h-4 w-4 mr-2" />
                      Adicionar primeiro preço
                    </Button>
                  )}
                </div>
              </TableCell>
            </TableRow>
          ) : (
            items.map((item) => (
              <TableRow 
                key={item.id}
                className={onItemClick ? "cursor-pointer hover:bg-muted/50 transition-colors" : ""}
                onClick={() => onItemClick?.(item.preco_kg)}
              >
                <TableCell className="font-medium">{item.espessura.toFixed(2)} mm</TableCell>
                <TableCell className="text-right font-medium">
                  {item.preco_kg.toLocaleString('pt-BR', {
                    style: 'currency',
                    currency: 'BRL'
                  })}
                </TableCell>
                {isAdmin && (
                  <TableCell>
                    <div className="flex items-center justify-center gap-1">
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        onClick={(e) => {
                          e.stopPropagation();
                          handleOpenEdit(item);
                        }}
                        className="h-8 w-8 p-0"
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button 
                        variant="ghost" 
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleOpenDelete(item);
                        }}
                        className="h-8 w-8 p-0 text-destructive hover:text-destructive"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                )}
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </div>
  );

  return (
    <Card>
      <CardHeader>
        <CardTitle>Preços de Perfis</CardTitle>
        <CardDescription>
          Preços por kg baseados na espessura da chapa e tipo do perfil (padrão ou especial)
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <Alert>
          <Info className="h-4 w-4" />
          <AlertTitle>Integração com Corte Perfil</AlertTitle>
          <AlertDescription>
            Estes preços são utilizados na página Corte Perfil. 
            <strong> Perfil Padrão</strong>: medidas comerciais predefinidas. 
            <strong> Perfil Especial</strong>: medidas customizadas.
          </AlertDescription>
        </Alert>

        {loading ? (
          <div className="space-y-2">
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className="h-12 w-full" />
            ))}
          </div>
        ) : (
          <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as 'padrao' | 'especial')}>
            <div className="flex items-center justify-between mb-4">
              <TabsList>
                <TabsTrigger value="padrao" className="gap-2">
                  <CheckCircle2 className="h-4 w-4" />
                  Padrão
                  <Badge variant="secondary" className="ml-1">{precosPadrao.length}</Badge>
                </TabsTrigger>
                <TabsTrigger value="especial" className="gap-2">
                  <AlertCircle className="h-4 w-4" />
                  Especial
                  <Badge variant="secondary" className="ml-1">{precosEspecial.length}</Badge>
                </TabsTrigger>
              </TabsList>
              
              {isAdmin && (
                <Button onClick={() => handleOpenCreate(activeTab)} size="sm" className="gap-2">
                  <Plus className="h-4 w-4" />
                  Adicionar
                </Button>
              )}
            </div>

            <TabsContent value="padrao">
              {renderTable(precosPadrao, 'padrao')}
            </TabsContent>
            
            <TabsContent value="especial">
              {renderTable(precosEspecial, 'especial')}
            </TabsContent>
          </Tabs>
        )}
      </CardContent>

      {/* Create/Edit Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>
              {isEditing ? 'Editar Preço' : 'Adicionar Preço'}
            </DialogTitle>
            <DialogDescription>
              {isEditing 
                ? 'Atualize as informações do preço abaixo.'
                : `Adicione um novo preço para perfil ${form.tipo === 'padrao' ? 'padrão' : 'especial'}.`}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="flex items-center gap-2 p-3 rounded-md bg-muted">
              {form.tipo === 'padrao' ? (
                <>
                  <CheckCircle2 className="h-5 w-5 text-green-600" />
                  <span className="text-sm font-medium">Perfil Padrão</span>
                </>
              ) : (
                <>
                  <AlertCircle className="h-5 w-5 text-amber-600" />
                  <span className="text-sm font-medium">Perfil Especial</span>
                </>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="espessura">Espessura (mm) *</Label>
              <Input
                id="espessura"
                type="number"
                step="0.01"
                value={form.espessura}
                onChange={(e) => setForm({ ...form, espessura: e.target.value })}
                placeholder="Ex: 2.00, 2.25, 2.65, 3.00"
              />
              <p className="text-xs text-muted-foreground">
                Espessuras comuns: 2.00, 2.25, 2.65, 3.00, 4.75 mm
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="preco_kg">Preço por kg (R$) *</Label>
              <Input
                id="preco_kg"
                type="number"
                step="0.01"
                value={form.preco_kg}
                onChange={(e) => setForm({ ...form, preco_kg: e.target.value })}
                placeholder="0,00"
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleSubmit} disabled={isSaving}>
              {isSaving ? 'Salvando...' : isEditing ? 'Atualizar' : 'Adicionar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar exclusão</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir o preço para espessura {itemToDelete?.espessura.toFixed(2)}mm 
              ({itemToDelete?.tipo === 'padrao' ? 'padrão' : 'especial'})? 
              Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isSaving ? 'Excluindo...' : 'Excluir'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  );
}
