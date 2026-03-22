import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { FileText, CheckCircle2, AlertCircle, CreditCard, Loader2, Download, Paperclip } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface LeadAttachment {
  id: string;
  file_name: string;
  file_url: string;
  file_size: number | null;
  file_type: string | null;
  uploaded_by_name: string | null;
  created_at: string;
}

interface AnaliseFinanceiraResponseDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  leadId: string;
  leadName: string;
  leadEmpresa?: string;
  leadCnpj?: string;
  leadCidade?: string;
  leadEstado?: string;
  leadBudgetNumber?: string;
  leadValor?: number;
  onConfirm: () => void;
}

const PARECER_OPTIONS = [
  { value: 'aprovado', label: 'Aprovado', icon: CheckCircle2, description: 'Cliente aprovado para faturamento normal', color: 'text-emerald-600' },
  { value: 'precisa_info', label: 'Precisa de mais informações', icon: AlertCircle, description: 'Documentação insuficiente ou dados pendentes', color: 'text-amber-600' },
  { value: 'pagamento_antecipado', label: 'Pagamento antecipado', icon: CreditCard, description: 'Liberado apenas para pagamento à vista ou cartão de crédito', color: 'text-blue-600' },
] as const;

function formatFileSize(bytes: number | null): string {
  if (!bytes) return '';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function AnaliseFinanceiraResponseDialog({ open, onOpenChange, leadId, leadName, leadEmpresa, leadCnpj, leadCidade, leadEstado, leadBudgetNumber, leadValor, onConfirm }: AnaliseFinanceiraResponseDialogProps) {
  const [parecer, setParecer] = useState<string>('');
  const [consideracoes, setConsideracoes] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [attachments, setAttachments] = useState<LeadAttachment[]>([]);
  const [loadingAttachments, setLoadingAttachments] = useState(false);

  useEffect(() => {
    if (open && leadId) {
      loadAttachments();
    }
  }, [open, leadId]);

  const loadAttachments = async () => {
    setLoadingAttachments(true);
    try {
      const { data, error } = await (supabase as any)
        .from('lead_attachments')
        .select('id, file_name, file_url, file_size, file_type, uploaded_by_name, created_at')
        .eq('lead_id', leadId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setAttachments(data || []);
    } catch (err) {
      console.error('Error loading attachments:', err);
    } finally {
      setLoadingAttachments(false);
    }
  };

  const handleSubmit = () => {
    if (!parecer) {
      toast.error('Selecione um parecer');
      return;
    }
    setConfirmOpen(true);
  };

  const handleConfirmAndSend = async () => {
    setConfirmOpen(false);
    setSubmitting(true);
    try {
      const { data: userData } = await supabase.auth.getUser();
      const userId = userData.user?.id || '';
      const { data: profile } = await supabase.from('user_profiles').select('full_name, email').eq('id', userId).maybeSingle();
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

      await (supabase as any).from('leads').update({ updated_at: new Date().toISOString() }).eq('id', leadId);

      const { data: requestActivity } = await supabase
        .from('lead_activities')
        .select('user_id, sdr_name')
        .eq('lead_id', leadId)
        .ilike('description', '%Análise Financeira enviada por e-mail%')
        .order('created_at', { ascending: false })
        .limit(1);

      const recipientEmails: string[] = [];

      if (requestActivity && requestActivity.length > 0) {
        const requesterId = requestActivity[0].user_id;
        const { data: requesterProfile } = await supabase
          .from('user_profiles')
          .select('email')
          .eq('id', requesterId)
          .maybeSingle();
        if (requesterProfile?.email) {
          recipientEmails.push(requesterProfile.email);
        }
      }

      const { data: adminEmails } = await supabase.rpc('get_admin_emails' as any);
      const admins = (adminEmails || []).map((r: any) => r.email).filter(Boolean);
      for (const email of admins) {
        if (!recipientEmails.includes(email)) {
          recipientEmails.push(email);
        }
      }

      const appUrl = 'https://globaltools.lovable.app';

      for (const email of recipientEmails) {
        await supabase.functions.invoke('send-analise-financeira-response', {
          body: {
            leadId,
            leadName,
            empresa: leadEmpresa,
            cnpj: leadCnpj,
            cidade: leadCidade,
            estado: leadEstado,
            budgetNumber: leadBudgetNumber,
            valorEstimado: leadValor,
            parecer: parecerLabel,
            parecerTipo: parecer,
            consideracoes: consideracoes.trim() || null,
            analistaNome: userName,
            destinatarioEmail: email,
            appUrl,
          },
        });
      }

      toast.success('Parecer financeiro registrado e e-mail enviado');
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
    setAttachments([]);
    onOpenChange(false);
  };

  const parecerLabel = PARECER_OPTIONS.find(o => o.value === parecer)?.label || parecer;

  return (
    <>
      <Dialog open={open} onOpenChange={(v) => { if (!v) handleClose(); else onOpenChange(v); }}>
        <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-base flex items-center gap-2">
              <FileText className="h-4 w-4 text-blue-600" />
              Análise Financeira
            </DialogTitle>
            <DialogDescription className="text-xs">
              Registre o parecer da análise financeira de <strong>{leadName}</strong>
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {/* Attached documents section */}
            {(attachments.length > 0 || loadingAttachments) && (
              <div className="space-y-2">
                <div className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
                  <Paperclip className="h-3.5 w-3.5" />
                  Documentos anexados ({attachments.length})
                </div>
                {loadingAttachments ? (
                  <div className="flex items-center gap-2 text-xs text-muted-foreground py-2">
                    <Loader2 className="h-3 w-3 animate-spin" />
                    Carregando documentos...
                  </div>
                ) : (
                  <div className="space-y-1 max-h-[120px] overflow-y-auto">
                    {attachments.map((att) => (
                      <a
                        key={att.id}
                        href={att.file_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-2 text-xs bg-accent/50 rounded px-2 py-1.5 hover:bg-accent transition-colors group"
                      >
                        <FileText className="h-3 w-3 shrink-0 text-primary" />
                        <span className="truncate flex-1">{att.file_name}</span>
                        {att.file_size && (
                          <span className="text-[10px] text-muted-foreground shrink-0">{formatFileSize(att.file_size)}</span>
                        )}
                        <Download className="h-3 w-3 shrink-0 text-muted-foreground group-hover:text-primary transition-colors" />
                      </a>
                    ))}
                  </div>
                )}
              </div>
            )}

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
              {submitting ? <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" /> : <FileText className="h-3.5 w-3.5 mr-1.5" />}
              Registrar Parecer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar envio do parecer</AlertDialogTitle>
            <AlertDialogDescription>
              O parecer <strong>"{parecerLabel}"</strong> será registrado e um e-mail será enviado ao solicitante informando o resultado da análise financeira de <strong>{leadName}</strong>.
              {consideracoes.trim() && (
                <span className="block mt-2 text-xs italic">Considerações: "{consideracoes.trim()}"</span>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmAndSend}>
              Confirmar e Enviar E-mail
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
