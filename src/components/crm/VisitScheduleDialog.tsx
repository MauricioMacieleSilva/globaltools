
import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { CalendarIcon } from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface VisitScheduleDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  leadId: string;
  leadName: string;
  onConfirm: () => void;
}

export function VisitScheduleDialog({ open, onOpenChange, leadId, leadName, onConfirm }: VisitScheduleDialogProps) {
  const [visitDate, setVisitDate] = useState<Date>();
  const [location, setLocation] = useState('');
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);

  const handleConfirm = async () => {
    if (!visitDate) {
      toast.error('Selecione a data da visita');
      return;
    }
    if (!location.trim()) {
      toast.error('Informe o local da visita');
      return;
    }
    setLoading(true);
    try {
      const user = (await supabase.auth.getUser()).data.user;
      await (supabase as any).from('crm_visits').insert({
        lead_id: leadId,
        visit_date: visitDate.toISOString(),
        location: location.trim(),
        notes: notes.trim() || null,
        user_id: user?.id,
      });
      await supabase.from('lead_activities').insert({
        lead_id: leadId,
        activity_type: 'visita',
        description: `Visita agendada: ${format(visitDate, 'dd/MM/yyyy')} - ${location.trim()}`,
        user_id: user?.id || '',
      } as any);
      toast.success('Visita agendada com sucesso');
      setVisitDate(undefined);
      setLocation('');
      setNotes('');
      onOpenChange(false);
      onConfirm();
    } catch (err: any) {
      toast.error('Erro ao agendar visita', { description: err.message });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Agendar Visita / Reunião</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Lead: <strong>{leadName}</strong>
          </p>
          <div className="space-y-1.5">
            <Label>Data da Visita *</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" className={cn("w-full justify-start text-left font-normal", !visitDate && "text-muted-foreground")}>
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {visitDate ? format(visitDate, 'dd/MM/yyyy') : 'Selecione a data'}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={visitDate}
                  onSelect={setVisitDate}
                  disabled={(date) => date < new Date(new Date().setHours(0, 0, 0, 0))}
                  initialFocus
                  className={cn("p-3 pointer-events-auto")}
                />
              </PopoverContent>
            </Popover>
          </div>
          <div className="space-y-1.5">
            <Label>Local *</Label>
            <Input value={location} onChange={(e) => setLocation(e.target.value)} placeholder="Endereço ou local da visita" />
          </div>
          <div className="space-y-1.5">
            <Label>Observações</Label>
            <Input value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Notas sobre a visita..." />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button onClick={handleConfirm} disabled={loading || !visitDate || !location.trim()}>
            {loading ? 'Agendando...' : 'Agendar'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
