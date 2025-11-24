import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { MaterialAgregado } from "@/context/ProducaoContext";
import { AlertTriangle, Package, User } from "lucide-react";

interface MaterialDetailDialogProps {
  material: MaterialAgregado | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function MaterialDetailDialog({
  material,
  open,
  onOpenChange,
}: MaterialDetailDialogProps) {
  if (!material) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Package className="h-5 w-5" />
            Detalhes do Material
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Material Info */}
          <div className="space-y-2">
            <div>
              <span className="text-sm text-muted-foreground">Material:</span>
              <p className="font-semibold text-lg">{material.descricaomat}</p>
            </div>
            
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div>
                <span className="text-sm text-muted-foreground">Classe:</span>
                <p className="font-medium">{material.classe}</p>
              </div>
              
              <div>
                <span className="text-sm text-muted-foreground">Quantidade Total:</span>
                <p className="font-medium">
                  {material.quantidadeTotal.toLocaleString('pt-BR', { maximumFractionDigits: 2 })} {material.unidade}
                </p>
              </div>
              
              <div>
                <span className="text-sm text-muted-foreground">Total de Pedidos:</span>
                <Badge variant="secondary" className="mt-1">{material.numPedidos}</Badge>
              </div>
              
              <div>
                <span className="text-sm text-muted-foreground">Atrasados:</span>
                {material.numPedidosAtrasados > 0 ? (
                  <Badge variant="destructive" className="mt-1">{material.numPedidosAtrasados}</Badge>
                ) : (
                  <Badge variant="outline" className="mt-1">0</Badge>
                )}
              </div>
            </div>
          </div>

          {/* Pedidos e Clientes */}
          <div>
            <h3 className="font-semibold mb-3 flex items-center gap-2">
              <User className="h-4 w-4" />
              Pedidos e Clientes
            </h3>
            
            <div className="space-y-2">
              {material.pedidos
                .sort((a, b) => {
                  // Atrasados primeiro
                  if (a.atrasado && !b.atrasado) return -1;
                  if (!a.atrasado && b.atrasado) return 1;
                  return a.numero_pedido.localeCompare(b.numero_pedido);
                })
                .map((pedido, index) => (
                  <div
                    key={index}
                    className={`p-3 rounded-lg border ${
                      pedido.atrasado ? 'bg-destructive/5 border-destructive/20' : 'bg-muted/50'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          {pedido.atrasado && (
                            <AlertTriangle className="h-4 w-4 text-destructive flex-shrink-0" />
                          )}
                          <span className="font-semibold">Pedido: {pedido.numero_pedido}</span>
                        </div>
                        <p className="text-sm text-muted-foreground truncate">
                          Cliente: {pedido.cliente}
                        </p>
                        <p className="text-sm font-medium mt-1">
                          Quantidade: {pedido.quantidade.toLocaleString('pt-BR', { maximumFractionDigits: 2 })} {material.unidade}
                        </p>
                      </div>
                      <div className="flex-shrink-0">
                        {pedido.atrasado ? (
                          <Badge variant="destructive" className="text-xs">Atrasado</Badge>
                        ) : (
                          <Badge variant="secondary" className="text-xs">No Prazo</Badge>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
