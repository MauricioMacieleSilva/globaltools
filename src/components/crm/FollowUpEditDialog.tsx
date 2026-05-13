import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { CalendarIcon } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface FollowUpEditDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  followUp: {
    id: string;
    lead_id: string;
    visit_date: string; // data_agendada
    notes: string | null; // descricao
    followup_titulo?: string;
    lead_name?: string;
  } | null;
  onUpdated: () => void;
}

export function FollowUpEditDialog({ open, onOpenChange, followUp, onUpdated }: FollowUpEditDialogProps) {
  const [date, setDate] = useState<Date>();
  const [time, setTime] = useState('09:00');
  const [titulo, setTitulo] = useState('');
  const [descricao, setDescricao] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (followUp) {
      const d = new Date(followUp.visit_date);
      setDate(d);
      setTime(format(d, 'HH:mm'));
      setTitulo(followUp.followup_titulo || '');
      setDescricao(followUp.notes || '');
    }
  }, [followUp]);

  const handleSave = async () => {
    if (!followUp || !date) {
      toast.error('Selecione a data do follow-up');
      return;
    }
    if (!titulo.trim()) {
      toast.error('Informe o título do follow-up');
      return;
    }
    setLoading(true);
    try {
      const [h, m] = (time || '09:00').split(':').map(Number);
      const combined = new Date(date);
      combined.setHours(h || 0, m || 0, 0, 0);

      const { error } = await supabase
        .from('follow_ups')
        .update({
          data_agendada: combined.toISOString(),
          titulo: titulo.trim(),
          descricao: descricao.trim() || null,
          updated_at: new Date().toISOString(),
        })
        .eq('id', followUp.id);
      if (error) throw error;

      const user = (await supabase.auth.getUser()).data.user;
      await supabase.from('lead_activities').insert({
        lead_id: followUp.lead_id,
        activity_type: 'nota',
        description: `Follow-up remarcado: ${titulo.trim()} - ${format(combined, 'dd/MM/yyyy HH:mm')}`,
        user_id: user?.id || '',
      } as any);

      toast.success('Follow-up atualizado');
      onOpenChange(false);
      onUpdated();
    } catch (err: any) {
      toast.error('Erro ao atualizar follow-up', { description: err.message });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Editar Follow-up</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          {followUp && (
            <p className="text-sm text-muted-foreground">
              Lead: <strong>{followUp.lead_name || 'Lead'}</strong>
            </p>
          )}
          <div className="space-y-1.5">
            <Label>Título *</Label>
            <Input value={titulo} onChange={(e) => setTitulo(e.target.value)} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Data *</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className={cn("w-full justify-start text-left font-normal", !date && "text-muted-foreground")}>
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {date ? format(date, 'dd/MM/yyyy') : 'Data'}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar mode="single" selected={date} onSelect={setDate} locale={ptBR} initialFocus className="p-3 pointer-events-auto" />
                </PopoverContent>
              </Popover>
            </div>
            <div className="space-y-1.5">
              <Label>Hora *</Label>
              <Input type="time" value={time} onChange={(e) => setTime(e.target.value)} />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label>Descrição</Label>
            <Textarea value={descricao} onChange={(e) => setDescricao(e.target.value)} rows={2} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button onClick={handleSave} disabled={loading || !date || !titulo.trim()}>
            {loading ? 'Salvando...' : 'Salvar'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
