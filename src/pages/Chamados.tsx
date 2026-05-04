
import { useState, useEffect, useCallback, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/context/AuthContext';
import { toast } from 'sonner';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Progress } from '@/components/ui/progress';
import {
  Plus, Search, Clock, CheckCircle, AlertTriangle, XCircle,
  Send, User, Calendar, DollarSign, FileText, Loader2,
  BarChart3, Timer, ArrowRight, MessageSquare, Paperclip, X, Download, CreditCard
} from 'lucide-react';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { format, differenceInMinutes, differenceInHours, isPast } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { cn } from '@/lib/utils';

interface TicketCategory {
  id: string;
  name: string;
  description: string | null;
  sla_minutes: number;
  display_order: number | null;
}

interface Ticket {
  id: string;
  ticket_number: string;
  category_id: string;
  title: string;
  description: string | null;
  status: string;
  priority: string;
  valor: number | null;
  requester_id: string;
  requester_name: string;
  assignee_id: string | null;
  assignee_name: string | null;
  sla_deadline: string | null;
  resolved_at: string | null;
  lead_id: string | null;
  budget_number: string | null;
  client_name: string | null;
  client_cnpj: string | null;
  created_at: string;
  updated_at: string;
  category?: TicketCategory;
}

interface TicketComment {
  id: string;
  ticket_id: string;
  user_id: string;
  user_name: string;
  content: string;
  is_internal: boolean;
  created_at: string;
}

const STATUS_CONFIG: Record<string, { label: string; color: string; icon: any }> = {
  aberto: { label: 'Aberto', color: 'bg-blue-500', icon: Clock },
  em_andamento: { label: 'Em Andamento', color: 'bg-amber-500', icon: Timer },
  concluido: { label: 'Concluído', color: 'bg-emerald-500', icon: CheckCircle },
  cancelado: { label: 'Cancelado', color: 'bg-muted', icon: XCircle },
};

const PRIORITY_CONFIG: Record<string, { label: string; color: string }> = {
  baixa: { label: 'Baixa', color: 'text-muted-foreground border-muted' },
  media: { label: 'Média', color: 'text-amber-600 border-amber-300' },
  alta: { label: 'Alta', color: 'text-orange-600 border-orange-300' },
  urgente: { label: 'Urgente', color: 'text-destructive border-destructive' },
};

function formatSLA(minutes: number): string {
  if (minutes >= 480) return `${minutes / 480} turno${minutes > 480 ? 's' : ''}`;
  if (minutes >= 60) return `${minutes / 60}h`;
  return `${minutes}min`;
}

const PARECER_OPTIONS = [
  { value: 'aprovado', label: 'Aprovado', icon: CheckCircle, description: 'Cliente aprovado para faturamento normal', color: 'text-emerald-600' },
  { value: 'precisa_info', label: 'Precisa de mais informações', icon: AlertTriangle, description: 'Documentação insuficiente ou dados pendentes', color: 'text-amber-600' },
  { value: 'pagamento_antecipado', label: 'Pagamento antecipado', icon: CreditCard, description: 'Liberado apenas para pagamento à vista ou cartão de crédito', color: 'text-blue-600' },
] as const;

function SLAIndicator({ deadline, status }: { deadline: string | null; status: string }) {
  if (!deadline || status === 'concluido' || status === 'cancelado') return null;
  const deadlineDate = new Date(deadline);
  const now = new Date();
  const isOverdue = isPast(deadlineDate);
  const minutesLeft = differenceInMinutes(deadlineDate, now);
  const hoursLeft = differenceInHours(deadlineDate, now);

  if (isOverdue) {
    const overMinutes = differenceInMinutes(now, deadlineDate);
    const overHours = differenceInHours(now, deadlineDate);
    return (
      <Badge variant="outline" className="text-destructive border-destructive text-[10px] gap-1">
        <AlertTriangle className="h-3 w-3" />
        {overHours > 0 ? `${overHours}h ${overMinutes % 60}min atrasado` : `${overMinutes}min atrasado`}
      </Badge>
    );
  }

  return (
    <Badge variant="outline" className={cn(
      "text-[10px] gap-1",
      minutesLeft < 60 ? "text-orange-500 border-orange-300" : "text-emerald-600 border-emerald-300"
    )}>
      <Clock className="h-3 w-3" />
      {hoursLeft > 0 ? `${hoursLeft}h ${minutesLeft % 60}min restantes` : `${minutesLeft}min restantes`}
    </Badge>
  );
}

export default function Chamados() {
  const { userProfile } = useAuth();
  const [categories, setCategories] = useState<TicketCategory[]>([]);
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [loading, setLoading] = useState(true);
  const [userRole, setUserRole] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [categoryFilter, setCategoryFilter] = useState('all');

  // New ticket dialog
  const [newTicketOpen, setNewTicketOpen] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newDescription, setNewDescription] = useState('');
  const [newCategoryId, setNewCategoryId] = useState('');
  const [newPriority, setNewPriority] = useState('media');
  const [newValor, setNewValor] = useState('');
  const [newClientName, setNewClientName] = useState('');
  const [newClientCnpj, setNewClientCnpj] = useState('');
  const [newFiles, setNewFiles] = useState<File[]>([]);
  const [creating, setCreating] = useState(false);

  // Detail dialog
  const [selectedTicket, setSelectedTicket] = useState<Ticket | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [comments, setComments] = useState<TicketComment[]>([]);
  const [ticketAttachments, setTicketAttachments] = useState<any[]>([]);
  const [ticketLead, setTicketLead] = useState<any | null>(null);
  const [newComment, setNewComment] = useState('');
  const [sendingComment, setSendingComment] = useState(false);

  // Parecer (financial analysis response)
  const [parecer, setParecer] = useState<string>('');
  const [parecerConsideracoes, setParecerConsideracoes] = useState('');
  const [parecerConfirmOpen, setParecerConfirmOpen] = useState(false);
  const [submittingParecer, setSubmittingParecer] = useState(false);
  const [cancelConfirmOpen, setCancelConfirmOpen] = useState(false);
  const [reopenConfirmOpen, setReopenConfirmOpen] = useState(false);
  const [concluirConfirmOpen, setConcluirConfirmOpen] = useState(false);

  const isFinanceiro = userRole === 'admin' || userRole === 'financeiro';

  const loadUserRole = useCallback(async () => {
    const { data: authData } = await supabase.auth.getUser();
    if (!authData.user) return;
    const { data } = await supabase.from('user_roles').select('role').eq('user_id', authData.user.id).maybeSingle();
    setUserRole(data?.role || '');
  }, []);

  const loadCategories = useCallback(async () => {
    const { data } = await (supabase as any).from('ticket_categories').select('*').eq('is_active', true).order('display_order');
    setCategories(data || []);
  }, []);

  const loadTickets = useCallback(async () => {
    setLoading(true);
    const { data, error } = await (supabase as any)
      .from('tickets')
      .select('*, category:ticket_categories(*)')
      .order('created_at', { ascending: false });
    if (!error) setTickets(data || []);
    setLoading(false);
  }, []);

  const loadComments = useCallback(async (ticketId: string) => {
    const { data } = await (supabase as any)
      .from('ticket_comments')
      .select('*')
      .eq('ticket_id', ticketId)
      .order('created_at', { ascending: true });
    setComments(data || []);
  }, []);

  const loadTicketAttachments = useCallback(async (ticketId: string) => {
    const { data } = await (supabase as any)
      .from('ticket_attachments')
      .select('*')
      .eq('ticket_id', ticketId)
      .order('created_at', { ascending: false });
    setTicketAttachments(data || []);
  }, []);

  const loadTicketLead = useCallback(async (leadId: string | null) => {
    if (!leadId) { setTicketLead(null); return; }
    const { data } = await (supabase as any)
      .from('leads')
      .select('*, vendedor:user_profiles!leads_vendedor_id_fkey(full_name, email)')
      .eq('id', leadId)
      .maybeSingle();
    setTicketLead(data || null);
  }, []);

  useEffect(() => { loadUserRole(); loadCategories(); loadTickets(); }, [loadUserRole, loadCategories, loadTickets]);

  // Deep link: abrir ticket via ?ticket=ID
  useEffect(() => {
    if (loading || tickets.length === 0) return;
    const params = new URLSearchParams(window.location.search);
    const ticketId = params.get('ticket');
    if (!ticketId) return;
    const ticket = tickets.find(t => t.id === ticketId);
    if (ticket) {
      setSelectedTicket(ticket);
      setDetailOpen(true);
      loadComments(ticket.id);
      loadTicketAttachments(ticket.id);
      loadTicketLead(ticket.lead_id);
      // Limpa o parâmetro da URL sem recarregar
      const url = new URL(window.location.href);
      url.searchParams.delete('ticket');
      window.history.replaceState({}, '', url.toString());
    }
  }, [loading, tickets, loadComments, loadTicketAttachments, loadTicketLead]);

  const handleCreateTicket = async () => {
    if (!newTitle.trim() || !newCategoryId) {
      toast.error('Preencha o título e a categoria');
      return;
    }
    setCreating(true);
    try {
      const user = (await supabase.auth.getUser()).data.user;
      if (!user) throw new Error('Usuário não autenticado');

      const { data: ticketData, error } = await (supabase as any).from('tickets').insert({
        title: newTitle.trim(),
        description: newDescription.trim() || null,
        category_id: newCategoryId,
        priority: newPriority,
        valor: newValor ? parseFloat(newValor) : null,
        requester_id: user.id,
        requester_name: userProfile?.full_name || user.email || '',
        client_name: newClientName.trim() || null,
        client_cnpj: newClientCnpj.trim() || null,
      }).select('id').single();

      if (error) throw error;

      // Upload attachments
      if (newFiles.length > 0 && ticketData?.id) {
        for (const file of newFiles) {
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

      toast.success('Chamado criado com sucesso!');
      setNewTicketOpen(false);
      setNewTitle(''); setNewDescription(''); setNewCategoryId(''); setNewPriority('media');
      setNewValor(''); setNewClientName(''); setNewClientCnpj(''); setNewFiles([]);
      loadTickets();
    } catch (err: any) {
      toast.error(err.message || 'Erro ao criar chamado');
    } finally {
      setCreating(false);
    }
  };

  const handleStatusChange = async (ticket: Ticket, newStatus: string) => {
    const updates: any = { status: newStatus, updated_at: new Date().toISOString() };
    if (newStatus === 'em_andamento' && !ticket.assignee_id) {
      const user = (await supabase.auth.getUser()).data.user;
      updates.assignee_id = user?.id;
      updates.assignee_name = userProfile?.full_name || '';
    }
    if (newStatus === 'concluido') updates.resolved_at = new Date().toISOString();

    const { error } = await (supabase as any).from('tickets').update(updates).eq('id', ticket.id);
    if (error) { toast.error('Erro ao atualizar status'); return; }
    toast.success(`Status alterado para ${STATUS_CONFIG[newStatus]?.label || newStatus}`);
    loadTickets();
    if (selectedTicket?.id === ticket.id) {
      setSelectedTicket({ ...ticket, ...updates });
    }
  };

  const handleAddComment = async () => {
    if (!newComment.trim() || !selectedTicket) return;
    setSendingComment(true);
    try {
      const user = (await supabase.auth.getUser()).data.user;
      if (!user) throw new Error('Não autenticado');
      const { error } = await (supabase as any).from('ticket_comments').insert({
        ticket_id: selectedTicket.id,
        user_id: user.id,
        user_name: userProfile?.full_name || user.email || '',
        content: newComment.trim(),
      });
      if (error) throw error;
      setNewComment('');
      loadComments(selectedTicket.id);
    } catch (err: any) {
      toast.error(err.message || 'Erro ao enviar comentário');
    } finally {
      setSendingComment(false);
    }
  };

  const openDetail = (ticket: Ticket) => {
    setSelectedTicket(ticket);
    setDetailOpen(true);
    setParecer('');
    setParecerConsideracoes('');
    loadComments(ticket.id);
    loadTicketAttachments(ticket.id);
    loadTicketLead(ticket.lead_id);
  };

  const handleSubmitParecer = async () => {
    if (!selectedTicket || !parecer) return;
    setSubmittingParecer(true);
    try {
      const user = (await supabase.auth.getUser()).data.user;
      if (!user) throw new Error('Não autenticado');
      const userName = userProfile?.full_name || user.email || '';
      const parecerLabel = PARECER_OPTIONS.find(o => o.value === parecer)?.label || parecer;
      const content = `📋 Parecer Financeiro: ${parecerLabel}${parecerConsideracoes.trim() ? `\n\nConsiderações: ${parecerConsideracoes.trim()}` : ''}`;

      const { error: cErr } = await (supabase as any).from('ticket_comments').insert({
        ticket_id: selectedTicket.id,
        user_id: user.id,
        user_name: userName,
        content,
      });
      if (cErr) throw cErr;

      const updates: any = {
        status: 'concluido',
        resolved_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
      if (!selectedTicket.assignee_id) {
        updates.assignee_id = user.id;
        updates.assignee_name = userName;
      }
      const { error: uErr } = await (supabase as any).from('tickets').update(updates).eq('id', selectedTicket.id);
      if (uErr) throw uErr;

      // If linked to lead, persist parecer there too
      if (selectedTicket.lead_id) {
        await (supabase as any).from('leads').update({
          finance_parecer: parecer,
          finance_consideracoes: parecerConsideracoes.trim() || null,
          finance_analyst_name: userName,
          finance_parecer_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        }).eq('id', selectedTicket.lead_id);

        // Registrar atividade no histórico do lead com a resposta da análise
        try {
          const parts: string[] = [`✅ Resposta do Chamado Financeiro (${selectedTicket.ticket_number}): ${parecerLabel}`];
          if (parecerConsideracoes.trim()) parts.push(`- ${parecerConsideracoes.trim()}`);
          await (supabase as any).from('lead_activities').insert({
            lead_id: selectedTicket.lead_id,
            activity_type: 'nota',
            description: parts.join(' '),
            user_id: user.id,
            sdr_name: userName,
          });
        } catch (actErr) {
          console.error('Falha ao registrar atividade do lead:', actErr);
        }
      }

      toast.success('Parecer registrado e chamado concluído');

      // Enviar email de notificação com a resposta do chamado
      try {
        await supabase.functions.invoke('notify-ticket-resposta', {
          body: {
            ticketId: selectedTicket.id,
            ticketNumber: selectedTicket.ticket_number,
            title: selectedTicket.title,
            parecer,
            parecerLabel,
            consideracoes: parecerConsideracoes.trim() || null,
            analystName: userName,
            requesterName: selectedTicket.requester_name,
            clientName: selectedTicket.client_name || ticketLead?.empresa || ticketLead?.cliente_nome,
            clientCnpj: selectedTicket.client_cnpj || ticketLead?.cnpj,
            numeroPedido: (selectedTicket as any).numero_pedido || ticketLead?.budget_number || ticketLead?.numero_lead,
            appUrl: window.location.origin,
            leadData: ticketLead ? {
              empresa: ticketLead.empresa,
              contact_name: ticketLead.contact_name,
              contact_phone: ticketLead.contact_phone,
              cidade: ticketLead.cidade,
              estado: ticketLead.estado,
            } : null,
          },
        });
      } catch (emailErr) {
        console.error('Falha ao enviar email de resposta:', emailErr);
      }

      setParecer('');
      setParecerConsideracoes('');
      setParecerConfirmOpen(false);
      setSelectedTicket({ ...selectedTicket, ...updates });
      loadComments(selectedTicket.id);
      loadTickets();
    } catch (err: any) {
      toast.error(err.message || 'Erro ao registrar parecer');
    } finally {
      setSubmittingParecer(false);
    }
  };

  // KPIs
  const kpis = useMemo(() => {
    const open = tickets.filter(t => t.status === 'aberto');
    const inProgress = tickets.filter(t => t.status === 'em_andamento');
    const completed = tickets.filter(t => t.status === 'concluido');
    const overdue = tickets.filter(t => {
      if (t.status === 'concluido' || t.status === 'cancelado' || !t.sla_deadline) return false;
      return isPast(new Date(t.sla_deadline));
    });
    const withinSLA = tickets.filter(t => {
      if (t.status !== 'concluido' || !t.sla_deadline || !t.resolved_at) return false;
      return new Date(t.resolved_at) <= new Date(t.sla_deadline);
    });
    const slaRate = completed.length > 0 ? (withinSLA.length / completed.length) * 100 : 100;

    return { open: open.length, inProgress: inProgress.length, completed: completed.length, overdue: overdue.length, slaRate };
  }, [tickets]);

  // Filtered tickets
  const filteredTickets = useMemo(() => {
    return tickets.filter(t => {
      if (statusFilter !== 'all' && t.status !== statusFilter) return false;
      if (categoryFilter !== 'all' && t.category_id !== categoryFilter) return false;
      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        const fields = [t.ticket_number, t.title, t.requester_name, t.assignee_name, t.client_name, t.client_cnpj];
        if (!fields.some(f => f && f.toLowerCase().includes(q))) return false;
      }
      return true;
    });
  }, [tickets, statusFilter, categoryFilter, searchQuery]);

  return (
    <div className="flex flex-col h-[calc(100vh-56px)] p-3 sm:p-4 gap-3 overflow-hidden">
      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3 shrink-0">
        <Card className="border-l-4 border-l-blue-500">
          <CardContent className="p-3">
            <div className="flex items-center gap-2 mb-1">
              <Clock className="h-4 w-4 text-blue-500" />
              <span className="text-xs text-muted-foreground">Abertos</span>
            </div>
            <p className="text-2xl font-bold">{kpis.open}</p>
          </CardContent>
        </Card>
        <Card className="border-l-4 border-l-amber-500">
          <CardContent className="p-3">
            <div className="flex items-center gap-2 mb-1">
              <Timer className="h-4 w-4 text-amber-500" />
              <span className="text-xs text-muted-foreground">Em Andamento</span>
            </div>
            <p className="text-2xl font-bold">{kpis.inProgress}</p>
          </CardContent>
        </Card>
        <Card className="border-l-4 border-l-emerald-500">
          <CardContent className="p-3">
            <div className="flex items-center gap-2 mb-1">
              <CheckCircle className="h-4 w-4 text-emerald-500" />
              <span className="text-xs text-muted-foreground">Concluídos</span>
            </div>
            <p className="text-2xl font-bold">{kpis.completed}</p>
          </CardContent>
        </Card>
        <Card className="border-l-4 border-l-orange-500">
          <CardContent className="p-3">
            <div className="flex items-center gap-2 mb-1">
              <AlertTriangle className="h-4 w-4 text-orange-500" />
              <span className="text-xs text-muted-foreground">Fora do SLA</span>
            </div>
            <p className="text-2xl font-bold text-orange-600">{kpis.overdue}</p>
          </CardContent>
        </Card>
        <Card className="border-l-4 border-l-primary">
          <CardContent className="p-3">
            <div className="flex items-center gap-2 mb-1">
              <BarChart3 className="h-4 w-4 text-primary" />
              <span className="text-xs text-muted-foreground">Taxa SLA</span>
            </div>
            <p className="text-2xl font-bold">{kpis.slaRate.toFixed(0)}%</p>
          </CardContent>
        </Card>
      </div>

      {/* Filters + Actions */}
      <div className="flex items-center gap-2 flex-wrap shrink-0">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Buscar chamado..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)} className="pl-9 h-8 text-sm" />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="h-8 w-[150px] text-xs"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos Status</SelectItem>
            <SelectItem value="aberto">Abertos</SelectItem>
            <SelectItem value="em_andamento">Em Andamento</SelectItem>
            <SelectItem value="concluido">Concluídos</SelectItem>
            <SelectItem value="cancelado">Cancelados</SelectItem>
          </SelectContent>
        </Select>
        <Select value={categoryFilter} onValueChange={setCategoryFilter}>
          <SelectTrigger className="h-8 w-[200px] text-xs"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas Categorias</SelectItem>
            {categories.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
          </SelectContent>
        </Select>
        <Button size="sm" className="gap-1.5 h-8 ml-auto" onClick={() => setNewTicketOpen(true)}>
          <Plus className="h-3.5 w-3.5" /> Novo Chamado
        </Button>
      </div>

      {/* Ticket List */}
      <ScrollArea className="flex-1 min-h-0">
        <div className="space-y-2">
          {loading ? (
            <div className="flex items-center justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
          ) : filteredTickets.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <FileText className="h-10 w-10 mx-auto mb-2 opacity-40" />
              <p className="text-sm">Nenhum chamado encontrado</p>
            </div>
          ) : (
            filteredTickets.map(ticket => {
              const isOverdue = ticket.sla_deadline && ticket.status !== 'concluido' && ticket.status !== 'cancelado' && isPast(new Date(ticket.sla_deadline));
              const statusCfg = isOverdue
                ? { label: 'Em Atraso', color: 'bg-destructive', icon: AlertTriangle }
                : (STATUS_CONFIG[ticket.status] || STATUS_CONFIG.aberto);
              const priorityCfg = PRIORITY_CONFIG[ticket.priority] || PRIORITY_CONFIG.media;
              const StatusIcon = statusCfg.icon;
              const categoryName = ticket.category?.name || categories.find(c => c.id === ticket.category_id)?.name || '';

              return (
                <Card key={ticket.id} className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => openDetail(ticket)}>
                  <CardContent className="p-3 sm:p-4">
                    <div className="flex items-start gap-3">
                      <div className={cn("p-2 rounded-lg shrink-0", statusCfg.color, "bg-opacity-10")}>
                        <StatusIcon className="h-4 w-4" style={{ color: statusCfg.color.replace('bg-', '').includes('muted') ? undefined : undefined }} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-xs font-mono text-muted-foreground">{ticket.ticket_number}</span>
                          <Badge variant="outline" className={cn("text-[10px]", priorityCfg.color)}>{priorityCfg.label}</Badge>
                          <Badge variant="secondary" className="text-[10px]">{categoryName}</Badge>
                          <SLAIndicator deadline={ticket.sla_deadline} status={ticket.status} />
                        </div>
                        <p className="text-sm font-medium mt-1 truncate">{ticket.title}</p>
                        <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground flex-wrap">
                          <span className="flex items-center gap-1"><User className="h-3 w-3" />{ticket.requester_name}</span>
                          <span className="flex items-center gap-1"><Calendar className="h-3 w-3" />{format(new Date(ticket.created_at), "dd/MM HH:mm", { locale: ptBR })}</span>
                          {ticket.client_name && <span className="flex items-center gap-1">📋 {ticket.client_name}</span>}
                          {ticket.valor && <span className="flex items-center gap-1"><DollarSign className="h-3 w-3" />R$ {ticket.valor.toLocaleString('pt-BR')}</span>}
                          {ticket.assignee_name && <span className="flex items-center gap-1"><ArrowRight className="h-3 w-3" />{ticket.assignee_name}</span>}
                        </div>
                      </div>
                      <Badge className={cn("text-[10px] text-white border-none shrink-0", statusCfg.color)}>{statusCfg.label}</Badge>
                    </div>
                  </CardContent>
                </Card>
              );
            })
          )}
        </div>
      </ScrollArea>

      {/* New Ticket Dialog */}
      <Dialog open={newTicketOpen} onOpenChange={setNewTicketOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2"><Plus className="h-5 w-5" /> Novo Chamado</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1 block">Categoria *</label>
              <Select value={newCategoryId} onValueChange={setNewCategoryId}>
                <SelectTrigger className="text-sm"><SelectValue placeholder="Selecione a categoria" /></SelectTrigger>
                <SelectContent>
                  {categories.map(c => (
                    <SelectItem key={c.id} value={c.id}>
                      <div className="flex items-center justify-between w-full gap-2">
                        <span>{c.name}</span>
                        <Badge variant="outline" className="text-[10px] ml-2">SLA: {formatSLA(c.sla_minutes)}</Badge>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1 block">Título *</label>
              <Input placeholder="Descreva brevemente a solicitação" value={newTitle} onChange={e => setNewTitle(e.target.value)} />
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1 block">Descrição</label>
              <Textarea placeholder="Detalhes adicionais..." value={newDescription} onChange={e => setNewDescription(e.target.value)} rows={5} className="min-h-[120px]" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1 block">Prioridade</label>
                <Select value={newPriority} onValueChange={setNewPriority}>
                  <SelectTrigger className="text-sm"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="baixa">Baixa</SelectItem>
                    <SelectItem value="media">Média</SelectItem>
                    <SelectItem value="alta">Alta</SelectItem>
                    <SelectItem value="urgente">Urgente</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1 block">Valor (R$)</label>
                <Input type="number" placeholder="0,00" value={newValor} onChange={e => setNewValor(e.target.value)} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1 block">Cliente</label>
                <Input placeholder="Nome do cliente" value={newClientName} onChange={e => setNewClientName(e.target.value)} />
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1 block">CNPJ</label>
                <Input placeholder="00.000.000/0000-00" value={newClientCnpj} onChange={e => setNewClientCnpj(e.target.value)} />
              </div>
            </div>
            {/* File attachments */}
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1 block">Anexos</label>
              <div className="border border-dashed border-muted-foreground/30 rounded-lg p-3">
                <input
                  type="file"
                  multiple
                  id="ticket-files"
                  className="hidden"
                  onChange={e => {
                    if (e.target.files) setNewFiles(prev => [...prev, ...Array.from(e.target.files!)]);
                    e.target.value = '';
                  }}
                />
                <label htmlFor="ticket-files" className="flex items-center gap-2 text-xs text-muted-foreground cursor-pointer hover:text-foreground transition-colors">
                  <Paperclip className="h-4 w-4" />
                  Clique para anexar documentos
                </label>
                {newFiles.length > 0 && (
                  <div className="mt-2 space-y-1">
                    {newFiles.map((f, i) => (
                      <div key={i} className="flex items-center gap-2 text-xs bg-accent/50 rounded px-2 py-1">
                        <FileText className="h-3 w-3 shrink-0 text-primary" />
                        <span className="truncate flex-1">{f.name}</span>
                        <span className="text-[10px] text-muted-foreground shrink-0">{(f.size / 1024).toFixed(0)} KB</span>
                        <button onClick={() => setNewFiles(prev => prev.filter((_, j) => j !== i))} className="shrink-0 hover:text-destructive">
                          <X className="h-3 w-3" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setNewTicketOpen(false)}>Cancelar</Button>
            <Button onClick={handleCreateTicket} disabled={creating}>
              {creating ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Send className="h-4 w-4 mr-2" />}
              Criar Chamado
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Detail Dialog */}
      <Dialog open={detailOpen} onOpenChange={setDetailOpen}>
        <DialogContent className="w-[min(96vw,1120px)] sm:!max-w-5xl h-[min(92vh,820px)] max-h-[92vh] overflow-hidden p-0 gap-0 flex flex-col">
          {selectedTicket && (() => {
            const statusCfg = STATUS_CONFIG[selectedTicket.status] || STATUS_CONFIG.aberto;
            const priorityCfg = PRIORITY_CONFIG[selectedTicket.priority] || PRIORITY_CONFIG.media;
            const categoryName = selectedTicket.category?.name || categories.find(c => c.id === selectedTicket.category_id)?.name || '';
            const slaMin = selectedTicket.category?.sla_minutes || categories.find(c => c.id === selectedTicket.category_id)?.sla_minutes || 0;

            return (
              <>
                <DialogHeader className="shrink-0 border-b border-border px-5 py-4 pr-12">
                  <DialogTitle className="flex items-center gap-2 text-base">
                    <span className="font-mono text-muted-foreground">{selectedTicket.ticket_number}</span>
                    <Badge className={cn("text-white border-none", statusCfg.color)}>{statusCfg.label}</Badge>
                    <Badge variant="outline" className={cn(priorityCfg.color)}>{priorityCfg.label}</Badge>
                  </DialogTitle>
                </DialogHeader>

                <div className="grid flex-1 min-h-0 grid-cols-1 lg:grid-cols-[minmax(0,1.35fr)_minmax(360px,0.9fr)]">
                  <ScrollArea className="min-h-0 border-b border-border lg:border-b-0 lg:border-r">
                    <div className="space-y-4 p-5">
                    {/* Info */}
                    <div>
                      <h3 className="font-medium">{selectedTicket.title}</h3>
                      {selectedTicket.description && <p className="text-sm text-muted-foreground mt-1">{selectedTicket.description}</p>}
                    </div>

                    <div className="grid grid-cols-2 gap-3 text-xs">
                      <div className="space-y-1">
                        <span className="text-muted-foreground">Categoria</span>
                        <p className="font-medium">{categoryName}</p>
                      </div>
                      <div className="space-y-1">
                        <span className="text-muted-foreground">SLA</span>
                        <div className="flex items-center gap-2">
                          <p className="font-medium">{formatSLA(slaMin)}</p>
                          <SLAIndicator deadline={selectedTicket.sla_deadline} status={selectedTicket.status} />
                        </div>
                      </div>
                      <div className="space-y-1">
                        <span className="text-muted-foreground">Solicitante</span>
                        <p className="font-medium">{selectedTicket.requester_name}</p>
                      </div>
                      <div className="space-y-1">
                        <span className="text-muted-foreground">Responsável</span>
                        <p className="font-medium">{selectedTicket.assignee_name || '—'}</p>
                      </div>
                      {selectedTicket.client_name && (
                        <div className="space-y-1">
                          <span className="text-muted-foreground">Cliente</span>
                          <p className="font-medium">{selectedTicket.client_name}</p>
                        </div>
                      )}
                      {selectedTicket.valor && (
                        <div className="space-y-1">
                          <span className="text-muted-foreground">Valor</span>
                          <p className="font-medium">R$ {selectedTicket.valor.toLocaleString('pt-BR')}</p>
                        </div>
                      )}
                      <div className="space-y-1">
                        <span className="text-muted-foreground">Criado em</span>
                        <p className="font-medium">{format(new Date(selectedTicket.created_at), "dd/MM/yyyy HH:mm", { locale: ptBR })}</p>
                      </div>
                      {selectedTicket.resolved_at && (
                        <div className="space-y-1">
                          <span className="text-muted-foreground">Resolvido em</span>
                          <p className="font-medium">{format(new Date(selectedTicket.resolved_at), "dd/MM/yyyy HH:mm", { locale: ptBR })}</p>
                        </div>
                      )}
                    </div>

                    {/* Dados completos do Lead/Cliente */}
                    {ticketLead && (
                      <div className="space-y-2">
                        <h4 className="text-sm font-semibold text-primary border-b border-primary/30 pb-1 uppercase tracking-wide">
                          Dados do Lead / Cliente
                        </h4>
                        <div className="grid grid-cols-2 gap-3 text-xs">
                          {[
                            ['Empresa', ticketLead.empresa],
                            ['CNPJ', ticketLead.cliente_cnpj],
                            ['Razão Social', ticketLead.cliente_razao_social],
                            ['Nome do Contato', ticketLead.contact_name],
                            ['Cargo do Contato', ticketLead.contact_role],
                            ['Telefone', ticketLead.contact_phone || ticketLead.cliente_telefone],
                            ['E-mail', ticketLead.contact_email || ticketLead.cliente_email],
                            ['Cidade', ticketLead.cidade],
                            ['UF', ticketLead.estado],
                            ['Endereço', ticketLead.endereco],
                            ['CEP', ticketLead.cep],
                            ['Ramo de Atuação', ticketLead.ramo_atuacao],
                            ['Regime Tributário', ticketLead.regime_tributario],
                            ['Website', ticketLead.website],
                            ['Vendedor Responsável', ticketLead.vendedor?.full_name],
                            ['Origem', ticketLead.origem || ticketLead.source],
                            ['Status do Lead', ticketLead.status],
                            ['Etapa do Funil', ticketLead.disposition],
                            ['Produto de Interesse', ticketLead.produto_interesse],
                            ['Valor Estimado', ticketLead.valor_estimado ? `R$ ${Number(ticketLead.valor_estimado).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}` : null],
                            ['Nº do Lead', ticketLead.numero_lead],
                            ['Nº Pedido/Orçamento', ticketLead.budget_number],
                            ['Qualificação', ticketLead.qualification],
                          ].filter(([, v]) => v !== null && v !== undefined && v !== '').map(([label, value]) => (
                            <div key={label as string} className="space-y-0.5">
                              <span className="text-muted-foreground">{label}</span>
                              <p className="font-medium break-words">{String(value)}</p>
                            </div>
                          ))}
                        </div>

                        {(ticketLead.observacoes || ticketLead.notes) && (
                          <div className="space-y-1 pt-2">
                            <span className="text-muted-foreground text-xs">Observações</span>
                            <p className="text-xs bg-muted/40 border border-border rounded p-2 whitespace-pre-wrap">
                              {ticketLead.observacoes || ticketLead.notes}
                            </p>
                          </div>
                        )}
                      </div>
                    )}

                    {/* Attachments */}
                    {ticketAttachments.length > 0 && (
                      <div className="space-y-2">
                        <h4 className="text-sm font-medium flex items-center gap-1.5">
                          <Paperclip className="h-4 w-4" /> Anexos ({ticketAttachments.length})
                        </h4>
                        <div className="space-y-1">
                          {ticketAttachments.map((att: any) => (
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
                                <span className="text-[10px] text-muted-foreground shrink-0">{(att.file_size / 1024).toFixed(0)} KB</span>
                              )}
                              <Download className="h-3 w-3 shrink-0 text-muted-foreground group-hover:text-primary transition-colors" />
                            </a>
                          ))}
                        </div>
                      </div>
                    )}

                    </div>
                  </ScrollArea>

                  <div className="flex min-h-0 flex-col bg-muted/20">
                    <ScrollArea className="min-h-0 flex-1">
                      <div className="space-y-4 p-5">
                        {/* Status actions (financeiro only) */}
                        {isFinanceiro && selectedTicket.status !== 'concluido' && selectedTicket.status !== 'cancelado' && (
                          (() => {
                            const catName = (selectedTicket.category?.name || categories.find(c => c.id === selectedTicket.category_id)?.name || '').toLowerCase();
                            const isParamFiscal = catName.includes('parametriza') && catName.includes('fiscal');
                            if (isParamFiscal) {
                              return (
                                <div className="space-y-3 rounded-lg border border-primary/20 bg-background p-3 shadow-sm">
                                  <div className="flex items-center justify-between gap-2">
                                    <h4 className="text-sm font-semibold text-primary flex items-center gap-1.5">
                                      <FileText className="h-4 w-4" /> Parametrização Fiscal
                                    </h4>
                                    {selectedTicket.status === 'aberto' && (
                                      <Button size="sm" variant="outline" className="gap-1 text-xs h-7" onClick={() => handleStatusChange(selectedTicket, 'em_andamento')}>
                                        <Timer className="h-3 w-3" /> Assumir
                                      </Button>
                                    )}
                                  </div>
                                  <p className="text-xs text-muted-foreground">
                                    Para esta categoria não é necessário registrar parecer. Basta informar quando a parametrização estiver concluída.
                                  </p>
                                  <div className="grid gap-2 sm:grid-cols-2">
                                    <Button
                                      size="sm"
                                      variant="ghost"
                                      className="gap-1 text-xs text-muted-foreground"
                                      onClick={() => setCancelConfirmOpen(true)}
                                    >
                                      <XCircle className="h-3 w-3" /> Cancelar Chamado
                                    </Button>
                                    <Button
                                      size="sm"
                                      className="gap-1 text-xs"
                                      onClick={() => setConcluirConfirmOpen(true)}
                                    >
                                      <CheckCircle className="h-3 w-3" /> Marcar como Concluído
                                    </Button>
                                  </div>
                                </div>
                              );
                            }
                            return (
                          <div className="space-y-3 rounded-lg border border-primary/20 bg-background p-3 shadow-sm">
                            <div className="flex items-center justify-between gap-2">
                              <h4 className="text-sm font-semibold text-primary flex items-center gap-1.5">
                                <FileText className="h-4 w-4" /> Parecer da Análise
                              </h4>
                              {selectedTicket.status === 'aberto' && (
                                <Button size="sm" variant="outline" className="gap-1 text-xs h-7" onClick={() => handleStatusChange(selectedTicket, 'em_andamento')}>
                                  <Timer className="h-3 w-3" /> Assumir
                                </Button>
                              )}
                            </div>

                            <RadioGroup value={parecer} onValueChange={setParecer} className="space-y-2">
                              {PARECER_OPTIONS.map((option) => {
                                const Icon = option.icon;
                                return (
                                  <div
                                    key={option.value}
                                    className="flex items-start space-x-3 rounded-md border bg-muted/30 p-2.5 hover:bg-accent/50 transition-colors cursor-pointer"
                                    onClick={() => setParecer(option.value)}
                                  >
                                    <RadioGroupItem value={option.value} id={`parecer-${option.value}`} className="mt-0.5" />
                                    <Label htmlFor={`parecer-${option.value}`} className="flex-1 cursor-pointer">
                                      <div className="flex items-center gap-2">
                                        <Icon className={cn("h-4 w-4", option.color)} />
                                        <span className="text-sm font-medium">{option.label}</span>
                                      </div>
                                      <p className="text-[11px] text-muted-foreground mt-0.5">{option.description}</p>
                                    </Label>
                                  </div>
                                );
                              })}
                            </RadioGroup>

                            <Textarea
                              value={parecerConsideracoes}
                              onChange={(e) => setParecerConsideracoes(e.target.value)}
                              placeholder="Considerações do responsável (opcional)..."
                              className="text-sm min-h-[110px] resize-none bg-background"
                            />

                            <div className="grid gap-2 sm:grid-cols-2">
                              <Button
                                size="sm"
                                variant="ghost"
                                className="gap-1 text-xs text-muted-foreground"
                                onClick={() => setCancelConfirmOpen(true)}
                              >
                                <XCircle className="h-3 w-3" /> Cancelar Chamado
                              </Button>
                              <Button
                                size="sm"
                                className="gap-1 text-xs"
                                disabled={!parecer || submittingParecer}
                                onClick={() => setParecerConfirmOpen(true)}
                              >
                                {submittingParecer ? <Loader2 className="h-3 w-3 animate-spin" /> : <CheckCircle className="h-3 w-3" />}
                                Registrar Parecer
                              </Button>
                            </div>
                          </div>
                            );
                          })()
                        )}

                        {/* Cancel for requester */}
                        {!isFinanceiro && selectedTicket.status === 'aberto' && selectedTicket.requester_id === userProfile?.id && (
                          <Button size="sm" variant="ghost" className="gap-1 text-xs text-muted-foreground" onClick={() => setCancelConfirmOpen(true)}>
                            <XCircle className="h-3 w-3" /> Cancelar Chamado
                          </Button>
                        )}

                        {/* Reopen cancelled ticket (financeiro) */}
                        {isFinanceiro && selectedTicket.status === 'cancelado' && (
                          <div className="rounded-lg border border-amber-300 bg-amber-50 dark:bg-amber-950/20 p-3 space-y-2">
                            <p className="text-xs text-amber-700 dark:text-amber-400">
                              Este chamado foi cancelado. Você pode reabri-lo para continuar a análise.
                            </p>
                            <Button
                              size="sm"
                              className="gap-1 text-xs w-full"
                              onClick={() => setReopenConfirmOpen(true)}
                            >
                              <Timer className="h-3 w-3" /> Reabrir Chamado
                            </Button>
                          </div>
                        )}

                      </div>
                    </ScrollArea>

                  </div>
                </div>
              </>
            );
          })()}
        </DialogContent>
      </Dialog>

      <AlertDialog open={parecerConfirmOpen} onOpenChange={setParecerConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar parecer</AlertDialogTitle>
            <AlertDialogDescription>
              O parecer <strong>"{PARECER_OPTIONS.find(o => o.value === parecer)?.label}"</strong> será registrado como comentário e o chamado será marcado como concluído.
              {parecerConsideracoes.trim() && (
                <span className="block mt-2 text-xs italic">Considerações: "{parecerConsideracoes.trim()}"</span>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={submittingParecer}>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleSubmitParecer} disabled={submittingParecer}>
              {submittingParecer ? <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" /> : null}
              Confirmar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={cancelConfirmOpen} onOpenChange={setCancelConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Cancelar este chamado?</AlertDialogTitle>
            <AlertDialogDescription>
              O chamado será marcado como <strong>cancelado</strong>. Você poderá reabri-lo posteriormente, se necessário.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Voltar</AlertDialogCancel>
            <AlertDialogAction
              onClick={async () => {
                if (selectedTicket) await handleStatusChange(selectedTicket, 'cancelado');
                setCancelConfirmOpen(false);
              }}
            >
              Sim, cancelar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={reopenConfirmOpen} onOpenChange={setReopenConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Reabrir este chamado?</AlertDialogTitle>
            <AlertDialogDescription>
              O chamado voltará para o status <strong>Em andamento</strong> e poderá ser tratado novamente.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={async () => {
                if (selectedTicket) await handleStatusChange(selectedTicket, 'em_andamento');
                setReopenConfirmOpen(false);
              }}
            >
              Reabrir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={concluirConfirmOpen} onOpenChange={setConcluirConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Marcar como concluído?</AlertDialogTitle>
            <AlertDialogDescription>
              Confirme que a parametrização fiscal foi concluída. O chamado será encerrado.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Voltar</AlertDialogCancel>
            <AlertDialogAction
              onClick={async () => {
                if (selectedTicket) await handleStatusChange(selectedTicket, 'concluido');
                setConcluirConfirmOpen(false);
              }}
            >
              Sim, concluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
