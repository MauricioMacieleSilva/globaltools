
import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { CalendarIcon } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface VisitEditDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  visit: {
    id: string;
    lead_id: string;
    visit_date: string;
    location: string | null;
    notes: string | null;
    lead_name?: string;
  } | null;
  onUpdated: () => void;
}

export function VisitEditDialog({ open, onOpenChange, visit, onUpdated }: VisitEditDialogProps) {
  const [visitDate, setVisitDate] = useState<Date>();
  const [visitTime, setVisitTime] = useState('');
  const [location, setLocation] = useState('');
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (visit) {
      const d = new Date(visit.visit_date);
      setVisitDate(d);
      setVisitTime(format(d, 'HH:mm'));
      setLocation(visit.location || '');
      setNotes(visit.notes || '');
    }
  }, [visit]);

  const handleSave = async () => {
    if (!visit || !visitDate) {
      toast.error('Selecione a data da visita');
      return;
    }
    if (!location.trim()) {
      toast.error('Informe o local da visita');
      return;
    }

    setLoading(true);
    try {
      // Combine date + time
      const [hours, minutes] = (visitTime || '00:00').split(':').map(Number);
      const combined = new Date(visitDate);
      combined.setHours(hours || 0, minutes || 0, 0, 0);

      const { error } = await (supabase as any)
        .from('crm_visits')
        .update({
          visit_date: combined.toISOString(),
          location: location.trim(),
          notes: notes.trim() || null,
        })
        .eq('id', visit.id);

      if (error) throw error;

      // Log activity
      const user = (await supabase.auth.getUser()).data.user;
      await supabase.from('lead_activities').insert({
        lead_id: visit.lead_id,
        activity_type: 'visita',
        description: `Visita remarcada: ${format(combined, 'dd/MM/yyyy HH:mm')} - ${location.trim()}`,
        user_id: user?.id || '',
      } as any);

      toast.success('Visita atualizada com sucesso');
      onOpenChange(false);
      onUpdated();
    } catch (err: any) {
      toast.error('Erro ao atualizar visita', { description: err.message });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Editar Visita / Reunião</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          {visit && (
            <p className="text-sm text-muted-foreground">
              Lead: <strong>{visit.lead_name || 'Lead'}</strong>
            </p>
          )}
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
                  locale={ptBR}
                  initialFocus
                  className={cn("p-3 pointer-events-auto")}
                />
              </PopoverContent>
            </Popover>
          </div>
          <div className="space-y-1.5">
            <Label>Horário</Label>
            <Input type="time" value={visitTime} onChange={(e) => setVisitTime(e.target.value)} />
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
          <Button onClick={handleSave} disabled={loading || !visitDate || !location.trim()}>
            {loading ? 'Salvando...' : 'Salvar'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
