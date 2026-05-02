import { useEffect, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/context/AuthContext';
import { toast } from 'sonner';
import { Send, Loader2, Ticket, Paperclip, FileText, X } from 'lucide-react';
import type { CRMLead } from '@/pages/CRM';

interface TicketCategory {
  id: string;
  name: string;
  sla_minutes: number;
}

interface OpenTicketDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  lead: CRMLead | null;
  onCreated?: () => void;
}

export function OpenTicketDialog({ open, onOpenChange, lead, onCreated }: OpenTicketDialogProps) {
  const { userProfile } = useAuth();
  const [categories, setCategories] = useState<TicketCategory[]>([]);
  const [categoryId, setCategoryId] = useState('');
  const [description, setDescription] = useState('');
  const [priority, setPriority] = useState('media');
  const [valor, setValor] = useState('');
  const [files, setFiles] = useState<File[]>([]);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!open) return;
    (async () => {
      const { data } = await (supabase as any)
        .from('ticket_categories')
        .select('id, name, sla_minutes')
        .eq('is_active', true)
        .order('display_order');
      setCategories(data || []);
    })();
    if (lead) {
      const valorEst = lead.valor_estimado;
      if (valorEst) setValor(String(valorEst));
    }
  }, [open, lead]);

  const reset = () => {
    setCategoryId(''); setDescription('');
    setPriority('media'); setValor(''); setFiles([]);
  };

  const handleSubmit = async () => {
    if (!lead) return;
    if (!categoryId) {
      toast.error('Selecione a categoria');
      return;
    }
    setSubmitting(true);
    try {
      const user = (await supabase.auth.getUser()).data.user;
      if (!user) throw new Error('Usuário não autenticado');

      const empresa = lead.empresa || null;
      const cnpj = (lead as any).cliente_cnpj || null;
      const categoria = categories.find(c => c.id === categoryId)?.name || '';
      const clienteLabel = empresa || lead.cliente_nome || 'Cliente';

      const { data: ticketData, error } = await (supabase as any).from('tickets').insert({
        title: `${categoria} - ${clienteLabel}`,
        description: description.trim() || null,
        category_id: categoryId,
        priority,
        valor: valor ? parseFloat(valor) : null,
        requester_id: user.id,
        requester_name: userProfile?.full_name || user.email || '',
        client_name: empresa || lead.cliente_nome || null,
        client_cnpj: cnpj,
        lead_id: lead.id,
      }).select('id, ticket_number').single();

      if (error) throw error;

      // Upload de anexos (mesmo padrão da página de Chamados)
      if (files.length > 0 && ticketData?.id) {
        for (const file of files) {
          const ext = file.name.split('.').pop();
          const filePath = `${ticketData.id}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
          const { error: uploadErr } = await supabase.storage
            .from('ticket-attachments')
            .upload(filePath, file);
          if (uploadErr) { console.error('Upload error:', uploadErr); continue; }
          const { data: urlData } = supabase.storage.from('ticket-attachments').getPublicUrl(filePath);
          await (supabase as any).from('ticket_attachments').insert({
            ticket_id: ticketData.id,
            file_name: file.name,
            file_url: urlData.publicUrl,
            file_size: file.size,
            file_type: file.type,
            uploaded_by: user.id,
            uploaded_by_name: userProfile?.full_name || '',
          });
        }
      }

      const appUrl = window.location.origin;
      const subjectTitle = `${categoria} - ${clienteLabel} | ${ticketData.ticket_number}`;

      // Disparar email (não bloqueia em caso de erro)
      supabase.functions.invoke('notify-financeiro-ticket', {
        body: {
          ticketId: ticketData.id,
          ticketNumber: ticketData.ticket_number,
          title: subjectTitle,
          description: description.trim(),
          priority,
          valor: valor ? parseFloat(valor) : null,
          categoria,
          requesterName: userProfile?.full_name || '',
          clientName: empresa || lead.cliente_nome,
          clientCnpj: cnpj,
          leadId: lead.id,
          appUrl,
        },
      }).catch(err => console.error('Erro ao notificar financeiro:', err));

      toast.success(`Chamado ${ticketData.ticket_number} aberto e enviado ao Financeiro!`);
      reset();
      onOpenChange(false);
      onCreated?.();
    } catch (err: any) {
      toast.error(err.message || 'Erro ao abrir chamado');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) reset(); onOpenChange(v); }}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-base">
            <Ticket className="h-4 w-4 text-primary" />
            Abrir Chamado para o Financeiro
          </DialogTitle>
          <DialogDescription className="text-xs">
            Envie a demanda relacionada a <strong>{lead?.empresa || lead?.cliente_nome}</strong>. O time financeiro receberá um e-mail com o link direto.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          <div className="space-y-1">
            <Label className="text-xs">Categoria *</Label>
            <Select value={categoryId} onValueChange={setCategoryId}>
              <SelectTrigger className="h-9 text-sm">
                <SelectValue placeholder="Selecione a categoria" />
              </SelectTrigger>
              <SelectContent>
                {categories.map(c => (
                  <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1">
            <Label className="text-xs">Descrição</Label>
            <Textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Detalhes da solicitação..."
              className="text-sm min-h-[90px] resize-none"
              maxLength={2000}
            />
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-1">
              <Label className="text-xs">Prioridade</Label>
              <Select value={priority} onValueChange={setPriority}>
                <SelectTrigger className="h-9 text-sm"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="baixa">Baixa</SelectItem>
                  <SelectItem value="media">Média</SelectItem>
                  <SelectItem value="alta">Alta</SelectItem>
                  <SelectItem value="urgente">Urgente</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Valor (R$)</Label>
              <Input
                type="number"
                step="0.01"
                value={valor}
                onChange={(e) => setValor(e.target.value)}
                placeholder="0,00"
                className="h-9 text-sm"
              />
            </div>
          </div>
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button variant="outline" size="sm" onClick={() => onOpenChange(false)} disabled={submitting}>
            Cancelar
          </Button>
          <Button size="sm" onClick={handleSubmit} disabled={submitting || !categoryId} className="gap-1.5">
            {submitting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Send className="h-3.5 w-3.5" />}
            Enviar ao Financeiro
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}