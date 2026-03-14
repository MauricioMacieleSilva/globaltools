import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Phone } from 'lucide-react';

interface ContactDescriptionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  leadName: string;
  onConfirm: (description: string) => void;
}

export function ContactDescriptionDialog({ open, onOpenChange, leadName, onConfirm }: ContactDescriptionDialogProps) {
  const [description, setDescription] = useState('');

  const handleConfirm = () => {
    if (!description.trim()) return;
    onConfirm(description.trim());
    setDescription('');
  };

  const handleClose = (v: boolean) => {
    if (!v) setDescription('');
    onOpenChange(v);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle className="text-base">Registrar Contato</DialogTitle>
          <DialogDescription className="text-xs">
            Descreva o contato realizado com <strong>{leadName}</strong>
          </DialogDescription>
        </DialogHeader>

        <Textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Ex: Ligação realizada, cliente interessado em perfis..."
          className="text-sm min-h-[100px] resize-none"
          autoFocus
        />

        <DialogFooter className="gap-2 sm:gap-0">
          <Button variant="outline" size="sm" onClick={() => handleClose(false)}>
            Cancelar
          </Button>
          <Button size="sm" onClick={handleConfirm} disabled={!description.trim()}>
            <Phone className="h-3.5 w-3.5 mr-1.5" />
            Registrar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
