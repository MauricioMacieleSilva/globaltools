import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Package, AlertTriangle, Weight, ArrowUpDown } from "lucide-react";
import { useProducao, MaterialAgregado } from "@/context/ProducaoContext";
import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { MaterialDetailDialog } from "./MaterialDetailDialog";

type SortField = 'descricaomat' | 'classe' | 'quantidadeTotal' | 'numPedidos' | 'numPedidosAtrasados';
type SortDirection = 'asc' | 'desc';

export function MateriaisPendentesSummary() {
  const { getMateriaisPendentesAgregados, loading } = useProducao();
  const [filtro, setFiltro] = useState("");
  const [mostrarApenasAtrasados, setMostrarApenasAtrasados] = useState(false);
  const [selectedMaterial, setSelectedMaterial] = useState<MaterialAgregado | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [sortField, setSortField] = useState<SortField>('numPedidosAtrasados');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');

  if (loading) {
    return null;
  }

  const materiaisPendentes = getMateriaisPendentesAgregados();

  // Aplicar filtros
  let materiaisFiltrados = materiaisPendentes.filter((material) => {
    const matchFiltro = material.descricaomat
      .toLowerCase()
      .includes(filtro.toLowerCase()) || 
      material.classe.toLowerCase().includes(filtro.toLowerCase());
    const matchAtrasados = !mostrarApenasAtrasados || material.numPedidosAtrasados > 0;
    return matchFiltro && matchAtrasados;
  });

  // Aplicar ordenação
  materiaisFiltrados = [...materiaisFiltrados].sort((a, b) => {
    const aValue = a[sortField];
    const bValue = b[sortField];
    
    // Para strings, usar localeCompare
    if (typeof aValue === 'string' && typeof bValue === 'string') {
      const comparison = aValue.localeCompare(bValue);
      return sortDirection === 'asc' ? comparison : -comparison;
    }
    
    // Para números
    if (typeof aValue === 'number' && typeof bValue === 'number') {
      return sortDirection === 'asc' ? aValue - bValue : bValue - aValue;
    }
    
    return 0;
  });

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('desc');
    }
  };

  const handleMaterialClick = (material: MaterialAgregado) => {
    setSelectedMaterial(material);
    setDialogOpen(true);
  };

  // KPIs
  const totalMateriaisDistintos = materiaisPendentes.length;
  const materiaisCriticos = materiaisPendentes.filter(
    (m) => m.numPedidosAtrasados > 0
  ).length;
  
  // Calcular peso total (somar KG e converter T para KG)
  const pesoTotal = materiaisPendentes.reduce((acc, material) => {
    if (material.unidade === "KG") {
      return acc + material.quantidadeTotal;
    } else if (material.unidade === "T") {
      return acc + material.quantidadeTotal * 1000;
    }
    return acc;
  }, 0);

  const formatPeso = (peso: number) => {
    if (peso >= 1000) {
      return `${(peso / 1000).toFixed(2)} T`;
    }
    return `${peso.toFixed(2)} KG`;
  };

  const formatQuantidade = (qtd: number, unidade: string) => {
    return `${qtd.toLocaleString('pt-BR', { maximumFractionDigits: 2 })} ${unidade}`;
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Package className="h-5 w-5" />
            Resumo de Materiais Pendentes
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* KPIs */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Total de Materiais</p>
                    <p className="text-2xl font-bold">{totalMateriaisDistintos}</p>
                  </div>
                  <Package className="h-8 w-8 text-primary" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Materiais Críticos</p>
                    <p className="text-2xl font-bold text-destructive">{materiaisCriticos}</p>
                    <p className="text-xs text-muted-foreground">Em pedidos atrasados</p>
                  </div>
                  <AlertTriangle className="h-8 w-8 text-destructive" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Peso Total Pendente</p>
                    <p className="text-2xl font-bold">{formatPeso(pesoTotal)}</p>
                    <p className="text-xs text-muted-foreground">
                      Para {materiaisPendentes.reduce((acc, m) => acc + m.numPedidos, 0)} pedidos
                    </p>
                  </div>
                  <Weight className="h-8 w-8 text-primary" />
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Filtros */}
          <div className="flex flex-col sm:flex-row gap-2">
            <Input
              placeholder="Buscar por material ou classe..."
              value={filtro}
              onChange={(e) => setFiltro(e.target.value)}
              className="flex-1"
            />
            <Button
              variant={mostrarApenasAtrasados ? "default" : "outline"}
              onClick={() => setMostrarApenasAtrasados(!mostrarApenasAtrasados)}
              className="gap-2"
            >
              <AlertTriangle className="h-4 w-4" />
              Apenas Críticos
            </Button>
          </div>

          {/* Tabela Desktop */}
          <div className="hidden md:block overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b">
                  <th className="text-left p-2 font-semibold">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-8 gap-1 hover:bg-transparent"
                      onClick={() => handleSort('descricaomat')}
                    >
                      Material
                      <ArrowUpDown className="h-3 w-3" />
                    </Button>
                  </th>
                  <th className="text-left p-2 font-semibold">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-8 gap-1 hover:bg-transparent"
                      onClick={() => handleSort('classe')}
                    >
                      Classe
                      <ArrowUpDown className="h-3 w-3" />
                    </Button>
                  </th>
                  <th className="text-right p-2 font-semibold">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-8 gap-1 hover:bg-transparent"
                      onClick={() => handleSort('quantidadeTotal')}
                    >
                      Quantidade
                      <ArrowUpDown className="h-3 w-3" />
                    </Button>
                  </th>
                  <th className="text-center p-2 font-semibold">Un</th>
                  <th className="text-center p-2 font-semibold">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-8 gap-1 hover:bg-transparent"
                      onClick={() => handleSort('numPedidos')}
                    >
                      Pedidos
                      <ArrowUpDown className="h-3 w-3" />
                    </Button>
                  </th>
                  <th className="text-center p-2 font-semibold">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-8 gap-1 hover:bg-transparent"
                      onClick={() => handleSort('numPedidosAtrasados')}
                    >
                      Atrasados
                      <ArrowUpDown className="h-3 w-3" />
                    </Button>
                  </th>
                </tr>
              </thead>
              <tbody>
                {materiaisFiltrados.map((material, index) => (
                  <tr
                    key={index}
                    className={`border-b cursor-pointer hover:bg-muted/50 transition-colors ${
                      material.numPedidosAtrasados > 0 ? "bg-destructive/5" : ""
                    }`}
                    onClick={() => handleMaterialClick(material)}
                  >
                    <td className="p-2">
                      <div className="flex items-center gap-2">
                        {material.numPedidosAtrasados > 0 && (
                          <AlertTriangle className="h-4 w-4 text-destructive" />
                        )}
                        <span className="font-medium">{material.descricaomat}</span>
                      </div>
                    </td>
                    <td className="p-2">
                      <Badge variant="secondary">{material.classe}</Badge>
                    </td>
                    <td className="text-right p-2">
                      {material.quantidadeTotal.toLocaleString('pt-BR', { maximumFractionDigits: 2 })}
                    </td>
                    <td className="text-center p-2">
                      <Badge variant="outline">{material.unidade}</Badge>
                    </td>
                    <td className="text-center p-2">
                      <Badge variant="secondary">{material.numPedidos}</Badge>
                    </td>
                    <td className="text-center p-2">
                      {material.numPedidosAtrasados > 0 ? (
                        <Badge variant="destructive">{material.numPedidosAtrasados}</Badge>
                      ) : (
                        <Badge variant="outline">0</Badge>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Cards Mobile */}
          <div className="md:hidden space-y-2">
            {materiaisFiltrados.map((material, index) => (
              <Card
                key={index}
                className={`cursor-pointer hover:bg-muted/50 transition-colors ${
                  material.numPedidosAtrasados > 0 ? "border-destructive" : ""
                }`}
                onClick={() => handleMaterialClick(material)}
              >
                <CardContent className="p-4">
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex items-center gap-2 flex-1">
                      {material.numPedidosAtrasados > 0 && (
                        <AlertTriangle className="h-4 w-4 text-destructive flex-shrink-0" />
                      )}
                      <span className="font-semibold">{material.descricaomat}</span>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-sm mb-2">
                    <div className="col-span-2">
                      <span className="text-muted-foreground">Classe: </span>
                      <Badge variant="secondary">{material.classe}</Badge>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Quantidade: </span>
                      <span className="font-medium">
                        {formatQuantidade(material.quantidadeTotal, material.unidade)}
                      </span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Pedidos: </span>
                      <Badge variant="secondary">{material.numPedidos}</Badge>
                    </div>
                    {material.numPedidosAtrasados > 0 && (
                      <div className="col-span-2">
                        <span className="text-muted-foreground">Atrasados: </span>
                        <Badge variant="destructive">{material.numPedidosAtrasados}</Badge>
                      </div>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground">Toque para ver detalhes</p>
                </CardContent>
              </Card>
            ))}
          </div>

          {materiaisFiltrados.length === 0 && (
            <div className="text-center py-8 text-muted-foreground">
              Nenhum material encontrado com os filtros aplicados
            </div>
          )}
        </CardContent>
      </Card>

      {/* Dialog de detalhes do material */}
      <MaterialDetailDialog
        material={selectedMaterial}
        open={dialogOpen}
        onOpenChange={setDialogOpen}
      />
    </div>
  );
}
