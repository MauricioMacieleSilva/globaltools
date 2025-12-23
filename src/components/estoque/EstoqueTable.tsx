import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
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
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { EstoqueItem, CategoriaEstoque, deleteEstoqueItem, TIPOS_PERFIL } from '@/services/estoqueService';
import { Search, Plus, Pencil, Trash2, Package, Image as ImageIcon } from 'lucide-react';
import { toast } from 'sonner';
import { EstoqueItemDialog } from './EstoqueItemDialog';
import { useIsMobile } from '@/hooks/use-mobile';

interface EstoqueTableProps {
  titulo: string;
  dados: EstoqueItem[];
  loading?: boolean;
  canManage?: boolean;
  categoria: CategoriaEstoque;
  onDataChanged: () => void;
}

const getTipoPerfilLabel = (value: string | null) => {
  if (!value) return '-';
  return TIPOS_PERFIL.find(t => t.value === value)?.label || value;
};

export function EstoqueTable({
  titulo,
  dados,
  loading,
  canManage = false,
  categoria,
  onDataChanged,
}: EstoqueTableProps) {
  const [filtro, setFiltro] = useState('');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState<EstoqueItem | null>(null);
  const [itemToDelete, setItemToDelete] = useState<EstoqueItem | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const isMobile = useIsMobile();

  const showDimensionColumns = ['BOBINAS', 'CHAPAS', 'TIRAS', 'PERFIS'].includes(categoria);
  const showPerfilColumns = categoria === 'PERFIS';

  const dadosFiltrados = dados.filter((item) =>
    item.descricao.toLowerCase().includes(filtro.toLowerCase()) ||
    item.localizacao?.toLowerCase().includes(filtro.toLowerCase()) ||
    item.tipo_perfil?.toLowerCase().includes(filtro.toLowerCase())
  );

  const handleOpenCreate = () => {
    setSelectedItem(null);
    setIsDialogOpen(true);
  };

  const handleOpenEdit = (item: EstoqueItem) => {
    setSelectedItem(item);
    setIsDialogOpen(true);
  };

  const handleOpenDelete = (item: EstoqueItem) => {
    setItemToDelete(item);
    setIsDeleteDialogOpen(true);
  };

  const handleDelete = async () => {
    if (!itemToDelete?.id) return;

    setIsLoading(true);

    try {
      const { error } = await deleteEstoqueItem(itemToDelete.id);
      if (error) throw error;

      toast.success('Item removido com sucesso!');
      setIsDeleteDialogOpen(false);
      setItemToDelete(null);
      onDataChanged();
    } catch (error) {
      console.error('Error deleting item:', error);
      toast.error('Erro ao remover item');
    } finally {
      setIsLoading(false);
    }
  };

  if (isMobile) {
    return (
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-lg">{titulo}</CardTitle>
              <CardDescription>{dados.length} itens no estoque</CardDescription>
            </div>
            {canManage && (
              <Button onClick={handleOpenCreate} size="sm" className="gap-2">
                <Plus className="h-4 w-4" />
                Adicionar
              </Button>
            )}
          </div>
          <div className="relative mt-2">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
            <Input
              placeholder="Buscar..."
              value={filtro}
              onChange={(e) => setFiltro(e.target.value)}
              className="pl-10"
            />
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          {loading ? (
            Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} className="h-24 w-full" />
            ))
          ) : dadosFiltrados.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Package className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p>{filtro ? 'Nenhum resultado encontrado' : 'Nenhum item cadastrado'}</p>
            </div>
          ) : (
            dadosFiltrados.map((item) => (
              <Card key={item.id} className="p-3">
                <div className="flex gap-3">
                  {item.imagem_url && (
                    <img
                      src={item.imagem_url}
                      alt={item.descricao}
                      className="w-16 h-16 object-cover rounded"
                    />
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="font-medium truncate">{item.descricao}</p>
                    <div className="flex flex-wrap gap-1 mt-1">
                      <Badge variant="secondary">
                        {item.quantidade.toLocaleString('pt-BR')} {item.unidade}
                      </Badge>
                      {item.espessura && (
                        <Badge variant="outline">{item.espessura}mm</Badge>
                      )}
                    </div>
                    {item.localizacao && (
                      <p className="text-xs text-muted-foreground mt-1">{item.localizacao}</p>
                    )}
                  </div>
                  {canManage && (
                    <div className="flex flex-col gap-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleOpenEdit(item)}
                        className="h-8 w-8 p-0"
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleOpenDelete(item)}
                        className="h-8 w-8 p-0 text-destructive"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  )}
                </div>
              </Card>
            ))
          )}
        </CardContent>

        <EstoqueItemDialog
          open={isDialogOpen}
          onOpenChange={setIsDialogOpen}
          item={selectedItem}
          categoriaInicial={categoria}
          onSuccess={onDataChanged}
        />

        <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Confirmar exclusão</AlertDialogTitle>
              <AlertDialogDescription>
                Tem certeza que deseja excluir "{itemToDelete?.descricao}"?
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

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>{titulo}</CardTitle>
            <CardDescription>{dados.length} itens no estoque</CardDescription>
          </div>
          {canManage && (
            <Button onClick={handleOpenCreate} size="sm" className="gap-2">
              <Plus className="h-4 w-4" />
              Adicionar
            </Button>
          )}
        </div>
        <div className="relative mt-2">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
          <Input
            placeholder="Buscar por descrição, localização..."
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
          <div className="rounded-md border overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-12"></TableHead>
                  <TableHead className="min-w-[200px]">Descrição</TableHead>
                  <TableHead className="w-32 text-right">Quantidade</TableHead>
                  {showPerfilColumns && (
                    <TableHead className="w-32">Tipo Perfil</TableHead>
                  )}
                  {showDimensionColumns && (
                    <>
                      <TableHead className="w-24 text-right">Espessura</TableHead>
                      <TableHead className="w-24 text-right">Largura</TableHead>
                    </>
                  )}
                  <TableHead className="w-32">Localização</TableHead>
                  {canManage && <TableHead className="w-24 text-center">Ações</TableHead>}
                </TableRow>
              </TableHeader>
              <TableBody>
                {dadosFiltrados.length === 0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={showPerfilColumns ? 8 : showDimensionColumns ? 7 : 5}
                      className="text-center py-8 text-muted-foreground"
                    >
                      <div className="flex flex-col items-center gap-2">
                        <Package className="h-8 w-8 opacity-50" />
                        <p>{filtro ? 'Nenhum resultado encontrado' : 'Nenhum item cadastrado'}</p>
                        {canManage && !filtro && (
                          <Button variant="outline" size="sm" onClick={handleOpenCreate} className="mt-2">
                            <Plus className="h-4 w-4 mr-2" />
                            Adicionar primeiro item
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ) : (
                  dadosFiltrados.map((item) => (
                    <TableRow key={item.id}>
                      <TableCell>
                        {item.imagem_url ? (
                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <img
                                  src={item.imagem_url}
                                  alt={item.descricao}
                                  className="w-10 h-10 object-cover rounded cursor-pointer hover:opacity-80"
                                />
                              </TooltipTrigger>
                              <TooltipContent side="right" className="p-0">
                                <img
                                  src={item.imagem_url}
                                  alt={item.descricao}
                                  className="max-w-xs max-h-64 object-contain rounded"
                                />
                              </TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                        ) : (
                          <div className="w-10 h-10 rounded bg-muted flex items-center justify-center">
                            <ImageIcon className="h-5 w-5 text-muted-foreground" />
                          </div>
                        )}
                      </TableCell>
                      <TableCell className="font-medium">{item.descricao}</TableCell>
                      <TableCell className="text-right">
                        <Badge variant={item.quantidade > 0 ? 'secondary' : 'destructive'}>
                          {item.quantidade.toLocaleString('pt-BR')} {item.unidade}
                        </Badge>
                      </TableCell>
                      {showPerfilColumns && (
                        <TableCell>{getTipoPerfilLabel(item.tipo_perfil)}</TableCell>
                      )}
                      {showDimensionColumns && (
                        <>
                          <TableCell className="text-right">
                            {item.espessura ? `${item.espessura} mm` : '-'}
                          </TableCell>
                          <TableCell className="text-right">
                            {item.largura ? `${item.largura} mm` : '-'}
                          </TableCell>
                        </>
                      )}
                      <TableCell className="text-muted-foreground">
                        {item.localizacao || '-'}
                      </TableCell>
                      {canManage && (
                        <TableCell>
                          <div className="flex items-center justify-center gap-1">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleOpenEdit(item)}
                              className="h-8 w-8 p-0"
                            >
                              <Pencil className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleOpenDelete(item)}
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

      <EstoqueItemDialog
        open={isDialogOpen}
        onOpenChange={setIsDialogOpen}
        item={selectedItem}
        categoriaInicial={categoria}
        onSuccess={onDataChanged}
      />

      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar exclusão</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir "{itemToDelete?.descricao}"? Esta ação não pode ser
              desfeita.
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
