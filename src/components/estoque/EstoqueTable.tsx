import { useState, useMemo } from 'react';
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
import {
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
} from '@/components/ui/hover-card';
import { EstoqueItem, CategoriaEstoque, deleteEstoqueItem, TIPOS_PERFIL, calcularPesoTotal } from '@/services/estoqueService';
import { Search, Plus, Pencil, Trash2, Package, Image as ImageIcon, ZoomIn } from 'lucide-react';
import { toast } from 'sonner';
import { EstoqueItemDialog } from './EstoqueItemDialog';
import { useIsMobile } from '@/hooks/use-mobile';
import { useEstoque } from '@/context/EstoqueContext';
import { formatCurrency } from '@/lib/utils-comercial';

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

// Categorias que usam preço por espessura
const CATEGORIAS_PRECO_ESPESSURA: CategoriaEstoque[] = ['PERFIS', 'TIRAS', 'CHAPAS', 'BLANK'];

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
  const { precosEspessuraMap } = useEstoque();

  const showDimensionColumns = ['BOBINAS', 'CHAPAS', 'TIRAS', 'PERFIS'].includes(categoria);
  const showPerfilColumns = categoria === 'PERFIS';
  const showValorColumn = CATEGORIAS_PRECO_ESPESSURA.includes(categoria);

  // Função para buscar preço por espessura
  const getPrecoByEspessura = (espessura: number | null): number => {
    if (!espessura || Object.keys(precosEspessuraMap).length === 0) return 0;
    
    if (precosEspessuraMap[espessura]) {
      return precosEspessuraMap[espessura];
    }
    
    const espessuras = Object.keys(precosEspessuraMap).map(Number);
    if (espessuras.length === 0) return 0;
    
    let closest = espessuras[0];
    let minDiff = Math.abs(closest - espessura);
    
    for (const esp of espessuras) {
      const diff = Math.abs(esp - espessura);
      if (diff < minDiff) {
        minDiff = diff;
        closest = esp;
      }
    }
    
    return precosEspessuraMap[closest] || 0;
  };

  // Calcular valor de cada item
  const calcularValorItem = (item: EstoqueItem): number => {
    if (!CATEGORIAS_PRECO_ESPESSURA.includes(item.categoria as CategoriaEstoque)) return 0;
    
    const peso = calcularPesoTotal(
      item.categoria,
      item.quantidade,
      item.espessura,
      item.largura,
      item.comprimento,
      item.base,
      item.aba1,
      item.aba2,
      item.tipo_perfil
    );
    
    if (!peso) return 0;
    
    const precoKg = getPrecoByEspessura(item.espessura);
    return peso * precoKg;
  };

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
                      {showValorColumn && (
                        <Badge variant="default" className="bg-emerald-600">
                          {formatCurrency(calcularValorItem(item))}
                        </Badge>
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
                  <TableHead className="w-20">Imagem</TableHead>
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
                  {showValorColumn && (
                    <TableHead className="w-32 text-right">Valor</TableHead>
                  )}
                  <TableHead className="w-32">Localização</TableHead>
                  {canManage && <TableHead className="w-24 text-center">Ações</TableHead>}
                </TableRow>
              </TableHeader>
              <TableBody>
                {dadosFiltrados.length === 0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={showPerfilColumns ? (showValorColumn ? 9 : 8) : showDimensionColumns ? (showValorColumn ? 8 : 7) : 5}
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
                      <TableCell className="py-2">
                        {item.imagem_url ? (
                          <HoverCard openDelay={200}>
                            <HoverCardTrigger asChild>
                              <div className="relative group cursor-pointer w-16 h-16">
                                <img
                                  src={item.imagem_url}
                                  alt={item.descricao}
                                  className="w-16 h-16 object-cover rounded-lg border shadow-sm transition-transform group-hover:scale-105"
                                />
                                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 rounded-lg transition-colors flex items-center justify-center">
                                  <ZoomIn className="h-5 w-5 text-white opacity-0 group-hover:opacity-100 transition-opacity" />
                                </div>
                              </div>
                            </HoverCardTrigger>
                            <HoverCardContent side="right" align="start" className="w-auto p-2">
                              <img
                                src={item.imagem_url}
                                alt={item.descricao}
                                className="max-w-md max-h-80 object-contain rounded-lg"
                              />
                              <p className="text-xs text-muted-foreground mt-2 text-center max-w-md truncate">
                                {item.descricao}
                              </p>
                            </HoverCardContent>
                          </HoverCard>
                        ) : (
                          <div className="w-16 h-16 rounded-lg bg-muted/50 border border-dashed flex items-center justify-center">
                            <ImageIcon className="h-6 w-6 text-muted-foreground/50" />
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
                      {showValorColumn && (
                        <TableCell className="text-right font-medium text-emerald-600">
                          {formatCurrency(calcularValorItem(item))}
                        </TableCell>
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
