import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { FileText, CheckCircle2, AlertCircle, CreditCard } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface AnaliseFinanceiraResponseDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  leadId: string;
  leadName: string;
  onConfirm: () => void;
}

const PARECER_OPTIONS = [
  { value: 'aprovado', label: 'Aprovado', icon: CheckCircle2, description: 'Cliente aprovado para faturamento normal', color: 'text-emerald-600' },
  { value: 'precisa_info', label: 'Precisa de mais informações', icon: AlertCircle, description: 'Documentação insuficiente ou dados pendentes', color: 'text-amber-600' },
  { value: 'somente_vista', label: 'Somente à vista', icon: CreditCard, description: 'Liberado apenas para pagamento à vista', color: 'text-blue-600' },
  { value: 'somente_cartao', label: 'Somente cartão de crédito', icon: CreditCard, description: 'Liberado apenas para pagamento via cartão', color: 'text-purple-600' },
] as const;

export function AnaliseFinanceiraResponseDialog({ open, onOpenChange, leadId, leadName, onConfirm }: AnaliseFinanceiraResponseDialogProps) {
  const [parecer, setParecer] = useState<string>('');
  const [consideracoes, setConsideracoes] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (!parecer) {
      toast.error('Selecione um parecer');
      return;
    }
    setSubmitting(true);
    try {
      const { data: userData } = await supabase.auth.getUser();
      const userId = userData.user?.id || '';
      const { data: profile } = await supabase.from('user_profiles').select('full_name').eq('id', userId).maybeSingle();
      const userName = profile?.full_name || 'Usuário';

      const parecerLabel = PARECER_OPTIONS.find(o => o.value === parecer)?.label || parecer;
      const parts = [`Análise Financeira — Parecer: ${parecerLabel}`];
      if (consideracoes.trim()) parts.push(consideracoes.trim());
      const desc = parts.join('\n');

      await supabase.from('lead_activities').insert({
        lead_id: leadId,
        activity_type: 'nota',
        description: desc,
        user_id: userId,
        sdr_name: userName,
      } as any);

      // Update lead updated_at
      await (supabase as any).from('leads').update({ updated_at: new Date().toISOString() }).eq('id', leadId);

      toast.success('Parecer financeiro registrado');
      onConfirm();
      handleClose();
    } catch (err) {
      console.error(err);
      toast.error('Erro ao registrar parecer');
    } finally {
      setSubmitting(false);
    }
  };

  const handleClose = () => {
    setParecer('');
    setConsideracoes('');
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) handleClose(); else onOpenChange(v); }}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="text-base flex items-center gap-2">
            <FileText className="h-4 w-4 text-amber-600" />
            Análise Financeira
          </DialogTitle>
          <DialogDescription className="text-xs">
            Registre o parecer da análise financeira de <strong>{leadName}</strong>
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <RadioGroup value={parecer} onValueChange={setParecer} className="space-y-2">
            {PARECER_OPTIONS.map((option) => {
              const Icon = option.icon;
              return (
                <div key={option.value} className="flex items-start space-x-3 rounded-lg border p-3 hover:bg-accent/50 transition-colors cursor-pointer" onClick={() => setParecer(option.value)}>
                  <RadioGroupItem value={option.value} id={option.value} className="mt-0.5" />
                  <Label htmlFor={option.value} className="flex-1 cursor-pointer">
                    <div className="flex items-center gap-2">
                      <Icon className={`h-4 w-4 ${option.color}`} />
                      <span className="text-sm font-medium">{option.label}</span>
                    </div>
                    <p className="text-[11px] text-muted-foreground mt-0.5">{option.description}</p>
                  </Label>
                </div>
              );
            })}
          </RadioGroup>

          <Textarea
            value={consideracoes}
            onChange={(e) => setConsideracoes(e.target.value)}
            placeholder="Considerações adicionais (opcional)..."
            className="text-sm min-h-[80px] resize-none"
          />
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button variant="outline" size="sm" onClick={handleClose}>
            Cancelar
          </Button>
          <Button size="sm" onClick={handleSubmit} disabled={!parecer || submitting}>
            <FileText className="h-3.5 w-3.5 mr-1.5" />
            Registrar Parecer
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
