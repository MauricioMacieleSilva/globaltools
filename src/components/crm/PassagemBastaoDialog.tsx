import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { UserCheck, Loader2 } from 'lucide-react';
import { useCommercialVendors, preloadCommercialVendors } from '@/hooks/useCommercialVendors';

interface PassagemBastaoDialogProps {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  leadName: string;
  onConfirm: (vendorId: string) => void;
  onCancel: () => void;
}

export function PassagemBastaoDialog({ open, onOpenChange, leadName, onConfirm, onCancel }: PassagemBastaoDialogProps) {
  const { vendors, loading: vendorsLoading } = useCommercialVendors();
  const [selectedVendor, setSelectedVendor] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!open) return;
    // Make sure cache starts warming if it hasn't already
    preloadCommercialVendors();
    setSelectedVendor('');
  }, [open]);

  // Workaround for Radix bug: when a Select inside a Dialog closes,
  // it can leave `pointer-events: none` on <body>, blocking the dialog buttons.
  useEffect(() => {
    if (!selectedVendor) return;
    const t = setTimeout(() => {
      if (document.body.style.pointerEvents === 'none') {
        document.body.style.pointerEvents = '';
      }
    }, 50);
    return () => clearTimeout(t);
  }, [selectedVendor]);

  const handleConfirm = () => {
    if (!selectedVendor) return;
    // Safety: ensure body is interactive before invoking parent handler
    if (document.body.style.pointerEvents === 'none') {
      document.body.style.pointerEvents = '';
    }
    setLoading(true);
    onConfirm(selectedVendor);
    setLoading(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <UserCheck className="h-5 w-5 text-primary" />
            Passagem de Bastão
          </DialogTitle>
          <DialogDescription>
            Atribua o lead <strong>{leadName}</strong> a um vendedor do time comercial para dar continuidade ao atendimento.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div>
            <label className="text-sm font-medium mb-2 block">Selecione o vendedor responsável:</label>
            <Select value={selectedVendor} onValueChange={setSelectedVendor}>
              <SelectTrigger>
                <SelectValue placeholder={vendorsLoading && vendors.length === 0 ? 'Carregando vendedores...' : 'Escolha um vendedor...'} />
              </SelectTrigger>
              <SelectContent>
                {vendorsLoading && vendors.length === 0 && (
                  <div className="flex items-center gap-2 px-2 py-2 text-sm text-muted-foreground">
                    <Loader2 className="h-3 w-3 animate-spin" />
                    Carregando vendedores...
                  </div>
                )}
                {vendors.map(v => (
                  <SelectItem key={v.id} value={v.id}>
                    <div className="flex items-center gap-2">
                      <Avatar className="h-5 w-5">
                        <AvatarImage src={v.avatar_url || undefined} />
                        <AvatarFallback className="text-[10px]">{v.full_name?.charAt(0)}</AvatarFallback>
                      </Avatar>
                      {v.full_name}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onCancel}>Cancelar</Button>
          <Button onClick={handleConfirm} disabled={!selectedVendor || loading}>
            Atribuir Vendedor
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
