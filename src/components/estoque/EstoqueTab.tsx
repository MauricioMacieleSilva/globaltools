import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { EstoqueTable } from './EstoqueTable';
import { EstoqueKPIs } from './EstoqueKPIs';
import { useEstoque } from '@/context/EstoqueContext';
import { CATEGORIAS_ESTOQUE, CategoriaEstoque } from '@/services/estoqueService';
import { useUserPermissions } from '@/hooks/useUserPermissions';
import { Loader2 } from 'lucide-react';
import { useIsMobile } from '@/hooks/use-mobile';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

export function EstoqueTab() {
  const { 
    loading, 
    error, 
    categoriaAtiva, 
    setCategoriaAtiva, 
    refreshData,
    getItemsByCategoria,
    getItemCount,
    items,
    precosEspessuraMap
  } = useEstoque();
  const { isAdmin, checkPageAccess } = useUserPermissions();
  const isMobile = useIsMobile();
  
  const { canEdit } = checkPageAccess('producao');
  const canManage = isAdmin || canEdit;

  if (error) {
    return (
      <div className="text-center py-8 text-destructive">
        <p>{error}</p>
      </div>
    );
  }

  const renderTabs = () => {
    if (isMobile) {
      return (
        <div className="space-y-4">
          <Select 
            value={categoriaAtiva} 
            onValueChange={(value) => setCategoriaAtiva(value as CategoriaEstoque)}
          >
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Selecione a categoria" />
            </SelectTrigger>
            <SelectContent>
              {CATEGORIAS_ESTOQUE.map((cat) => (
                <SelectItem key={cat.value} value={cat.value}>
                  <div className="flex items-center justify-between w-full">
                    <span>{cat.label}</span>
                    <Badge variant="secondary" className="ml-2">
                      {getItemCount(cat.value)}
                    </Badge>
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <EstoqueTable
            titulo={CATEGORIAS_ESTOQUE.find(c => c.value === categoriaAtiva)?.label || ''}
            dados={getItemsByCategoria(categoriaAtiva)}
            loading={loading}
            canManage={canManage}
            categoria={categoriaAtiva}
            onDataChanged={refreshData}
          />
        </div>
      );
    }

    return (
      <Tabs 
        value={categoriaAtiva} 
        onValueChange={(value) => setCategoriaAtiva(value as CategoriaEstoque)}
        className="w-full"
      >
        <TabsList className="flex flex-wrap h-auto gap-1 bg-muted/50 p-1">
          {CATEGORIAS_ESTOQUE.map((cat) => (
            <TabsTrigger 
              key={cat.value} 
              value={cat.value}
              className="gap-2 data-[state=active]:bg-background"
            >
              {cat.label}
              <Badge 
                variant={categoriaAtiva === cat.value ? 'default' : 'secondary'} 
                className="h-5 min-w-5 px-1.5"
              >
                {getItemCount(cat.value)}
              </Badge>
            </TabsTrigger>
          ))}
        </TabsList>

        {CATEGORIAS_ESTOQUE.map((cat) => (
          <TabsContent key={cat.value} value={cat.value} className="mt-4">
            <EstoqueTable
              titulo={cat.label}
              dados={getItemsByCategoria(cat.value)}
              loading={loading}
              canManage={canManage}
              categoria={cat.value}
              onDataChanged={refreshData}
            />
          </TabsContent>
        ))}
      </Tabs>
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <EstoqueKPIs items={items} precosEspessuraMap={precosEspessuraMap} />
      {renderTabs()}
    </div>
  );
}
