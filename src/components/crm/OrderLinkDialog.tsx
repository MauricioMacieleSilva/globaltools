import { useState, useEffect, useMemo } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { fetchComercialData } from '@/services/googleSheetsService';
import { Search, Package, Loader2 } from 'lucide-react';

interface OrderLinkDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  targetStage: string;
  onConfirm: (orderNumber: string) => void;
  onCancel: () => void;
}

interface OrderOption {
  numeropedido: string;
  cliente: string;
  valor: number;
  situacao: string;
}

export function OrderLinkDialog({ open, onOpenChange, targetStage, onConfirm, onCancel }: OrderLinkDialogProps) {
  const [search, setSearch] = useState('');
  const [orders, setOrders] = useState<OrderOption[]>([]);
  const [loading, setLoading] = useState(false);
  const [selected, setSelected] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setSearch('');
    setSelected(null);
    setLoading(true);
    fetchComercialData()
      .then((data) => {
        const seen = new Set<string>();
        const unique: OrderOption[] = [];
        for (const d of data) {
          if (d.numeropedido && !seen.has(d.numeropedido)) {
            seen.add(d.numeropedido);
            unique.push({
              numeropedido: d.numeropedido,
              cliente: d.cli_nomefantasia || d.cliente || '',
              valor: d.valor || 0,
              situacao: d.situacao || '',
            });
          }
        }
        setOrders(unique);
      })
      .catch(() => setOrders([]))
      .finally(() => setLoading(false));
  }, [open]);

  const filtered = useMemo(() => {
    if (!search.trim()) return orders.slice(0, 50);
    const q = search.toLowerCase();
    return orders.filter(
      (o) =>
        o.numeropedido.toLowerCase().includes(q) ||
        o.cliente.toLowerCase().includes(q)
    ).slice(0, 50);
  }, [orders, search]);

  const stageLabel = targetStage === 'proposta' ? 'Proposta' : 'Pedido';

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) onCancel(); onOpenChange(v); }}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Package className="h-5 w-5 text-primary" />
            Vincular Pedido — {stageLabel}
          </DialogTitle>
          <DialogDescription>
            Busque e selecione o número do pedido para vincular a este lead.
          </DialogDescription>
        </DialogHeader>

        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por nº pedido ou cliente..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
            autoFocus
          />
        </div>

        <ScrollArea className="h-[260px] border rounded-md">
          {loading ? (
            <div className="flex items-center justify-center h-full py-10">
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            </div>
          ) : filtered.length === 0 ? (
            <p className="text-center text-sm text-muted-foreground py-10">
              Nenhum pedido encontrado
            </p>
          ) : (
            <div className="p-1 space-y-0.5">
              {filtered.map((o) => (
                <button
                  key={o.numeropedido}
                  onClick={() => setSelected(o.numeropedido)}
                  className={`w-full text-left px-3 py-2 rounded-md text-sm transition-colors ${
                    selected === o.numeropedido
                      ? 'bg-primary text-primary-foreground'
                      : 'hover:bg-accent'
                  }`}
                >
                  <div className="flex justify-between items-center">
                    <span className="font-medium">Pedido {o.numeropedido}</span>
                    <span className={`text-xs ${selected === o.numeropedido ? 'text-primary-foreground/80' : 'text-muted-foreground'}`}>
                      {o.situacao}
                    </span>
                  </div>
                  <p className={`text-xs mt-0.5 ${selected === o.numeropedido ? 'text-primary-foreground/70' : 'text-muted-foreground'}`}>
                    {o.cliente}
                    {o.valor > 0 && ` • R$ ${o.valor.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`}
                  </p>
                </button>
              ))}
            </div>
          )}
        </ScrollArea>

        <DialogFooter>
          <Button variant="outline" onClick={onCancel}>Cancelar</Button>
          <Button disabled={!selected} onClick={() => selected && onConfirm(selected)}>
            Confirmar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
