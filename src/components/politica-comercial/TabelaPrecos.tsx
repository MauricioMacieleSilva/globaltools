import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { 
  PoliticaComercialData, 
  createPoliticaComercialItem, 
  updatePoliticaComercialItem, 
  deletePoliticaComercialItem 
} from '@/services/politicaComercialService';
import { Search, Plus, Pencil, Trash2, Package } from 'lucide-react';
import { toast } from 'sonner';

const UNIDADES = ['KG', 'M', 'M²', 'UN', 'PC'];

interface TabelaPrecosProps {
  titulo: string;
  dados: PoliticaComercialData[];
  loading?: boolean;
  onItemClick?: (preco: number) => void;
  isAdmin?: boolean;
  classeAtiva: string;
  onDataChanged?: () => void;
}

interface ItemForm {
  id?: string;
  descricao: string;
  preco: string;
  unidade: string;
  ipi: string;
  precoM2?: string;
  precoKg?: string;
}

const initialForm: ItemForm = {
  descricao: '',
  preco: '',
  unidade: 'KG',
  ipi: '-',
  precoM2: '',
  precoKg: ''
};

export function TabelaPrecos({ 
  titulo, 
  dados, 
  loading, 
  onItemClick, 
  isAdmin = false,
  classeAtiva,
  onDataChanged
}: TabelaPrecosProps) {
  const [filtro, setFiltro] = useState('');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [form, setForm] = useState<ItemForm>(initialForm);
  const [itemToDelete, setItemToDelete] = useState<PoliticaComercialData | null>(null);

  const isTelhas = titulo.toLowerCase() === 'telhas';

  const dadosFiltrados = dados.filter(item =>
    item.descricao.toLowerCase().includes(filtro.toLowerCase())
  );

  const handleOpenCreate = () => {
    setForm(initialForm);
    setIsEditing(false);
    setIsDialogOpen(true);
  };

  const handleOpenEdit = (item: PoliticaComercialData) => {
    setForm({
      id: item.id,
      descricao: item.descricao,
      preco: item.preco.toString(),
      unidade: item.unidade,
      ipi: item.ipi || '-',
      precoM2: item.precoM2?.toString() || '',
      precoKg: item.precoKg?.toString() || ''
    });
    setIsEditing(true);
    setIsDialogOpen(true);
  };

  const handleOpenDelete = (item: PoliticaComercialData) => {
    setItemToDelete(item);
    setIsDeleteDialogOpen(true);
  };

  const handleSubmit = async () => {
    if (!form.descricao.trim()) {
      toast.error('Descrição é obrigatória');
      return;
    }
    
    if (!form.preco || parseFloat(form.preco) <= 0) {
      toast.error('Preço deve ser maior que zero');
      return;
    }

    setIsLoading(true);

    try {
      if (isEditing && form.id) {
        const { error } = await updatePoliticaComercialItem(form.id, {
          descricao: form.descricao,
          preco: parseFloat(form.preco),
          unidade: form.unidade,
          ipi: form.ipi || '-',
          preco_m2: form.precoM2 ? parseFloat(form.precoM2) : null,
          preco_kg: form.precoKg ? parseFloat(form.precoKg) : null
        });

        if (error) throw error;
        toast.success('Material atualizado com sucesso!');
      } else {
        const { error } = await createPoliticaComercialItem({
          classe: classeAtiva,
          descricao: form.descricao,
          preco: parseFloat(form.preco),
          unidade: form.unidade,
          ipi: form.ipi || '-',
          preco_m2: form.precoM2 ? parseFloat(form.precoM2) : undefined,
          preco_kg: form.precoKg ? parseFloat(form.precoKg) : undefined
        });

        if (error) throw error;
        toast.success('Material adicionado com sucesso!');
      }

      setIsDialogOpen(false);
      onDataChanged?.();
    } catch (error) {
      console.error('Error saving item:', error);
      toast.error('Erro ao salvar material');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!itemToDelete?.id) return;

    setIsLoading(true);

    try {
      const { error } = await deletePoliticaComercialItem(itemToDelete.id);
      if (error) throw error;
      
      toast.success('Material removido com sucesso!');
      setIsDeleteDialogOpen(false);
      setItemToDelete(null);
      onDataChanged?.();
    } catch (error) {
      console.error('Error deleting item:', error);
      toast.error('Erro ao remover material');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>{titulo}</CardTitle>
          <CardDescription data-tour="politica-referencia">
              Preços com ICMS 17% | FOB RS | À Vista | Sem IPI
            </CardDescription>
          </div>
          {isAdmin && (
            <Button onClick={handleOpenCreate} size="sm" className="gap-2">
              <Plus className="h-4 w-4" />
              Adicionar
            </Button>
          )}
        </div>
        <div className="relative mt-2" data-tour="politica-busca">
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
          <div className="space-y-2">
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className="h-12 w-full" />
            ))}
          </div>
        ) : (
          <div className="rounded-md border" data-tour="politica-table">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="min-w-[300px]">Descrição</TableHead>
                  {isTelhas ? (
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
                  {isAdmin && <TableHead className="w-24 text-center">Ações</TableHead>}
                </TableRow>
              </TableHeader>
              <TableBody>
                {dadosFiltrados.length === 0 ? (
                  <TableRow>
                    <TableCell 
                      colSpan={isTelhas ? (isAdmin ? 5 : 4) : (isAdmin ? 5 : 4)} 
                      className="text-center py-8 text-muted-foreground"
                    >
                      <div className="flex flex-col items-center gap-2">
                        <Package className="h-8 w-8 opacity-50" />
                        <p>{filtro ? 'Nenhum resultado encontrado' : 'Nenhum material cadastrado'}</p>
                        {isAdmin && !filtro && (
                          <Button variant="outline" size="sm" onClick={handleOpenCreate} className="mt-2">
                            <Plus className="h-4 w-4 mr-2" />
                            Adicionar primeiro material
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ) : (
                  dadosFiltrados.map((item, index) => (
                    <TableRow 
                      key={item.id || `${item.classe}-${index}`}
                      className={onItemClick ? "cursor-pointer hover:bg-muted/50 transition-colors" : ""}
                      onClick={() => onItemClick?.(isTelhas ? (item.precoKg || item.preco) : item.preco)}
                    >
                      <TableCell className="text-sm font-medium">{item.descricao}</TableCell>
                      {isTelhas ? (
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
        )}
      </CardContent>

      {/* Create/Edit Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>
              {isEditing ? 'Editar Material' : 'Adicionar Material'}
            </DialogTitle>
            <DialogDescription>
              {isEditing 
                ? 'Atualize as informações do material abaixo.'
                : `Preencha as informações do novo material para ${titulo}.`}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="descricao">Descrição *</Label>
              <Input
                id="descricao"
                value={form.descricao}
                onChange={(e) => setForm({ ...form, descricao: e.target.value })}
                placeholder="Ex: ARAME GALV. BWG 18"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="preco">Preço (R$) *</Label>
                <Input
                  id="preco"
                  type="number"
                  step="0.01"
                  value={form.preco}
                  onChange={(e) => setForm({ ...form, preco: e.target.value })}
                  placeholder="0,00"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="unidade">Unidade</Label>
                <Select 
                  value={form.unidade} 
                  onValueChange={(value) => setForm({ ...form, unidade: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Unidade" />
                  </SelectTrigger>
                  <SelectContent>
                    {UNIDADES.map(u => (
                      <SelectItem key={u} value={u}>{u}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="ipi">IPI</Label>
              <Input
                id="ipi"
                value={form.ipi}
                onChange={(e) => setForm({ ...form, ipi: e.target.value })}
                placeholder="-"
              />
            </div>

            {isTelhas && (
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="precoM2">Preço/M²</Label>
                  <Input
                    id="precoM2"
                    type="number"
                    step="0.01"
                    value={form.precoM2}
                    onChange={(e) => setForm({ ...form, precoM2: e.target.value })}
                    placeholder="0,00"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="precoKg">Preço/KG</Label>
                  <Input
                    id="precoKg"
                    type="number"
                    step="0.01"
                    value={form.precoKg}
                    onChange={(e) => setForm({ ...form, precoKg: e.target.value })}
                    placeholder="0,00"
                  />
                </div>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleSubmit} disabled={isLoading}>
              {isLoading ? 'Salvando...' : isEditing ? 'Atualizar' : 'Adicionar'}
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
              Tem certeza que deseja excluir o material "{itemToDelete?.descricao}"? 
              Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isLoading ? 'Excluindo...' : 'Excluir'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  );
}
