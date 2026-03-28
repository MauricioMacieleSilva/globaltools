import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { supabase } from '@/integrations/supabase/client';
import { UserCheck } from 'lucide-react';

interface Vendor {
  id: string;
  full_name: string;
  avatar_url: string | null;
}

interface PassagemBastaoDialogProps {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  leadName: string;
  onConfirm: (vendorId: string) => void;
  onCancel: () => void;
}

export function PassagemBastaoDialog({ open, onOpenChange, leadName, onConfirm, onCancel }: PassagemBastaoDialogProps) {
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [selectedVendor, setSelectedVendor] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!open) return;
    const loadVendors = async () => {
      // Get users with comercial, admin roles (vendedores + gestores)
      const { data: roleData } = await supabase
        .from('user_roles')
        .select('user_id')
        .in('role', ['comercial', 'admin']);
      
      if (!roleData?.length) return;
      
      const userIds = roleData.map(r => r.user_id);
      const { data: profiles } = await supabase
        .from('user_profiles')
        .select('id, full_name, avatar_url')
        .in('id', userIds);
      
      setVendors(profiles || []);
    };
    loadVendors();
    setSelectedVendor('');
  }, [open]);

  const handleConfirm = () => {
    if (!selectedVendor) return;
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
                <SelectValue placeholder="Escolha um vendedor..." />
              </SelectTrigger>
              <SelectContent>
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
