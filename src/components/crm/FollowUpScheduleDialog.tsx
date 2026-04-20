import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { CalendarIcon, AlertTriangle } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

const FOLLOWUP_TYPES = [
  { value: 'ligar', label: 'Ligar' },
  { value: 'email', label: 'Enviar E-mail' },
  { value: 'whatsapp', label: 'WhatsApp' },
  { value: 'enviar_proposta', label: 'Enviar Proposta' },
  { value: 'cobrar_retorno', label: 'Cobrar Retorno' },
  { value: 'enviar_material', label: 'Enviar Material' },
  { value: 'agendar_reuniao', label: 'Agendar Reunião' },
  { value: 'outro', label: 'Outro' },
] as const;

interface FollowUpScheduleDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  leadId: string;
  leadName: string;
  onConfirm: () => void;
}

interface OccupiedSlot {
  time: string;
  title: string;
  lead_name: string;
}

export function FollowUpScheduleDialog({ open, onOpenChange, leadId, leadName, onConfirm }: FollowUpScheduleDialogProps) {
  const [date, setDate] = useState<Date>();
  const [time, setTime] = useState('09:00');
  const [tipo, setTipo] = useState('ligar');
  const [titulo, setTitulo] = useState('');
  const [descricao, setDescricao] = useState('');
  const [loading, setLoading] = useState(false);
  const [occupiedSlots, setOccupiedSlots] = useState<OccupiedSlot[]>([]);
  const [timeConflict, setTimeConflict] = useState(false);

  // Load occupied slots when date changes
  useEffect(() => {
    if (!date) { setOccupiedSlots([]); return; }
    const loadOccupied = async () => {
      const user = (await supabase.auth.getUser()).data.user;
      if (!user) return;
      const dayStart = new Date(date);
      dayStart.setHours(0, 0, 0, 0);
      const dayEnd = new Date(date);
      dayEnd.setHours(23, 59, 59, 999);

      const [followups, visits] = await Promise.all([
        supabase.from('follow_ups')
          .select('data_agendada, titulo, lead_id')
          .eq('user_id', user.id)
          .eq('concluido', false)
          .gte('data_agendada', dayStart.toISOString())
          .lte('data_agendada', dayEnd.toISOString()),
        (supabase as any).from('crm_visits')
          .select('visit_date, notes, lead_id')
          .eq('user_id', user.id)
          .gte('visit_date', dayStart.toISOString())
          .lte('visit_date', dayEnd.toISOString()),
      ]);

      const slots: OccupiedSlot[] = [];
      (followups.data || []).forEach((f: any) => {
        slots.push({
          time: format(new Date(f.data_agendada), 'HH:mm'),
          title: f.titulo || 'Follow-up',
          lead_name: '',
        });
      });
      (visits.data || []).forEach((v: any) => {
        slots.push({
          time: format(new Date(v.visit_date), 'HH:mm'),
          title: 'Visita',
          lead_name: '',
        });
      });
      setOccupiedSlots(slots.sort((a, b) => a.time.localeCompare(b.time)));
    };
    loadOccupied();
  }, [date]);

  // Check for time conflict
  useEffect(() => {
    setTimeConflict(occupiedSlots.some(s => s.time === time));
  }, [time, occupiedSlots]);

  const handleConfirm = async () => {
    if (!date) {
      toast.error('Selecione a data do follow-up');
      return;
    }
    if (!titulo.trim()) {
      toast.error('Informe o título do follow-up');
      return;
    }
    if (timeConflict) {
      const proceed = window.confirm(`Já existe um compromisso agendado para ${time} neste dia. Deseja agendar mesmo assim?`);
      if (!proceed) return;
    }
    setLoading(true);
    try {
      const user = (await supabase.auth.getUser()).data.user;
      const [hours, minutes] = time.split(':').map(Number);
      const combined = new Date(date);
      combined.setHours(hours, minutes, 0, 0);

      const tipoLabel = FOLLOWUP_TYPES.find(t => t.value === tipo)?.label || tipo;
      const descFull = [tipoLabel, descricao.trim()].filter(Boolean).join(' - ');

      // Ensure the lead only appears in the agenda on the new date:
      // mark any previously scheduled (pending) follow-ups for this lead as concluded.
      try {
        await supabase
          .from('follow_ups')
          .update({ concluido: true, updated_at: new Date().toISOString() })
          .eq('lead_id', leadId)
          .eq('concluido', false);
      } catch (e) {
        console.warn('Failed to clear previous pending follow-ups:', e);
      }

      const { error: insertError } = await supabase.from('follow_ups').insert({
        lead_id: leadId,
        user_id: user?.id || '',
        tipo: 'lead',
        titulo: titulo.trim(),
        descricao: descFull || null,
        data_agendada: combined.toISOString(),
      });
      if (insertError) throw insertError;

      const { data: profile } = await supabase.from('user_profiles').select('full_name').eq('id', user?.id || '').maybeSingle();
      await supabase.from('lead_activities').insert({
        lead_id: leadId,
        activity_type: 'nota',
        description: `Follow-up agendado: ${titulo.trim()} - ${format(combined, 'dd/MM/yyyy HH:mm')}`,
        user_id: user?.id || '',
        sdr_name: (profile as any)?.full_name || 'Usuário',
      } as any);

      toast.success('Follow-up agendado com sucesso');
      setDate(undefined);
      setTitulo('');
      setDescricao('');
      setTipo('ligar');
      setOccupiedSlots([]);
      onOpenChange(false);
      onConfirm();
    } catch (err: any) {
      toast.error('Erro ao agendar follow-up', { description: err.message });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Agendar Follow-up</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Lead: <strong>{leadName}</strong>
          </p>

          <div className="space-y-1.5">
            <Label>Tipo *</Label>
            <Select value={tipo} onValueChange={setTipo}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {FOLLOWUP_TYPES.map(t => (
                  <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label>Título *</Label>
            <Input value={titulo} onChange={(e) => setTitulo(e.target.value)} placeholder="Ex: Retornar ligação sobre proposta" />
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
                  <Calendar
                    mode="single"
                    selected={date}
                    onSelect={setDate}
                    locale={ptBR}
                    disabled={(d) => d < new Date(new Date().setHours(0, 0, 0, 0))}
                    initialFocus
                    className={cn("p-3 pointer-events-auto")}
                  />
                </PopoverContent>
              </Popover>
            </div>
            <div className="space-y-1.5">
              <Label>Hora *</Label>
              <Input type="time" value={time} onChange={(e) => setTime(e.target.value)} />
              {timeConflict && (
                <p className="text-[11px] text-destructive flex items-center gap-1">
                  <AlertTriangle className="h-3 w-3" /> Horário já ocupado
                </p>
              )}
            </div>
          </div>

          {/* Occupied slots for selected date */}
          {date && occupiedSlots.length > 0 && (
            <div className="bg-muted/50 rounded-md p-2 space-y-1">
              <p className="text-[11px] font-medium text-muted-foreground">Horários ocupados em {format(date, 'dd/MM')}:</p>
              <div className="flex flex-wrap gap-1.5">
                {occupiedSlots.map((slot, i) => (
                  <Badge key={i} variant="outline" className="text-[10px] h-5 gap-1">
                    {slot.time} — {slot.title}
                  </Badge>
                ))}
              </div>
            </div>
          )}

          <div className="space-y-1.5">
            <Label>Descrição</Label>
            <Textarea value={descricao} onChange={(e) => setDescricao(e.target.value)} placeholder="Detalhes do follow-up..." rows={2} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button onClick={handleConfirm} disabled={loading || !date || !titulo.trim()}>
            {loading ? 'Agendando...' : 'Agendar'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
