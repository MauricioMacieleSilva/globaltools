
import instagramLogo from '@/assets/instagram-logo.png';
import { useEffect, useState, useCallback } from 'react';
import { OrderDetailDialog } from './OrderDetailDialog';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Textarea } from '@/components/ui/textarea';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { MessageCircle, Mail, Phone, Building2, Calendar, MapPin, FileText, Send, Clock, Edit2, User, ArrowRightLeft, Package, Tags, Globe, ExternalLink, CalendarX2, Plus, ClipboardList, Loader2, PhoneMissed, DollarSign, CheckCircle2, Ticket, Presentation } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { FollowUpScheduleDialog } from './FollowUpScheduleDialog';
import { OrderLinkDialog } from './OrderLinkDialog';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { CRM_STAGES, type CRMLead, type CRMStageKey } from '@/pages/CRM';
import { useIsMobile } from '@/hooks/use-mobile';
import { LeadEnrichForm } from './LeadEnrichForm';
import { LeadEditDialog } from './LeadEditDialog';
import { LeadAttachments } from './LeadAttachments';
import { AnaliseFinanceiraResponseDialog } from './AnaliseFinanceiraResponseDialog';
import { OpenTicketDialog } from './OpenTicketDialog';
import { fetchComercialData } from '@/services/googleSheetsService';
import { parseDate } from '@/lib/utils-comercial';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

interface LeadActivity {
  id: string;
  activity_type: string;
  description: string;
  created_at: string;
  sdr_name?: string;
  user_id: string;
  contact_channel?: string;
}

interface UserProfileInfo {
  full_name: string;
  avatar_url: string | null;
}

interface LeadDrawerProps {
  lead: CRMLead | null;
  open: boolean;
  onClose: () => void;
  onStatusChange: (leadId: string, status: string) => void;
  onLeadUpdated: () => void;
}

function UserAvatar({ name, avatarUrl, size = 'sm' }: { name: string; avatarUrl?: string | null; size?: 'sm' | 'xs' }) {
  const initials = name?.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2) || 'U';
  const sizeClass = size === 'sm' ? 'h-6 w-6' : 'h-4 w-4';
  const textClass = size === 'sm' ? 'text-[9px]' : 'text-[7px]';
  return (
    <Avatar className={sizeClass}>
      <AvatarImage src={avatarUrl || undefined} alt={name} />
      <AvatarFallback className={`bg-primary text-primary-foreground ${textClass}`}>
        {initials}
      </AvatarFallback>
    </Avatar>
  );
}

const CONTACT_CHANNELS = [
  { value: 'ligacao', label: 'Ligação', icon: '📞' },
  { value: 'whatsapp', label: 'WhatsApp', icon: '💬' },
  { value: 'email', label: 'E-mail', icon: '📧' },
  { value: 'reuniao', label: 'Reunião', icon: '🤝' },
];

export function LeadDrawer({ lead, open, onClose, onStatusChange, onLeadUpdated }: LeadDrawerProps) {
  const [activities, setActivities] = useState<LeadActivity[]>([]);
  const [userProfiles, setUserProfiles] = useState<Record<string, UserProfileInfo>>({});
  const [newNote, setNewNote] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [pendingMove, setPendingMove] = useState<{ key: string; label: string } | null>(null);
  const [orderValue, setOrderValue] = useState<number | null>(null);
  const [orderValues, setOrderValues] = useState<Record<string, number>>({});
  const [lossReason, setLossReason] = useState<string | null>(null);
  const [proposalsTab, setProposalsTab] = useState<'abertas' | 'perdidas' | 'fechadas'>('abertas');
  const [nextVisit, setNextVisit] = useState<{ id: string; date: string; location: string | null } | null>(null);
  const isMobile = useIsMobile();
  const [orderDialogOpen, setOrderDialogOpen] = useState(false);
  const [selectedOrderNum, setSelectedOrderNum] = useState<string | null>(null);
  const [addOrderOpen, setAddOrderOpen] = useState(false);
  const [followUpDialogOpen, setFollowUpDialogOpen] = useState(false);
  const [nextFollowUp, setNextFollowUp] = useState<{ id: string; data_agendada: string; titulo: string; tipo: string } | null>(null);
  const [analiseResponseOpen, setAnaliseResponseOpen] = useState(false);
  const [canAccessFinanceiro, setCanAccessFinanceiro] = useState(false);
  const [failedConfirmOpen, setFailedConfirmOpen] = useState(false);
  const [openTicketDialogOpen, setOpenTicketDialogOpen] = useState(false);
  const [apresentacaoConfirmOpen, setApresentacaoConfirmOpen] = useState(false);

  useEffect(() => {
    const checkFinanceAccess = async () => {
      const { data: authData } = await supabase.auth.getUser();
      if (!authData.user) return;
      const { data: roleData } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', authData.user.id)
        .maybeSingle();
      const role = (roleData as any)?.role;
      setCanAccessFinanceiro(role === 'admin' || role === 'financeiro' || role === 'comercial');
    };
    checkFinanceAccess();
  }, []);

  useEffect(() => {
    if (lead?.id && open) {
      setNewNote('');
      loadActivities(lead.id);
      loadNextVisit(lead.id);
      loadNextFollowUp(lead.id);
    }
  }, [lead?.id, open]);

  // Load latest loss reason when lead is marked as perdido
  useEffect(() => {
    if (!lead?.id || !open) { setLossReason(null); return; }
    if (lead.status !== 'perdido') { setLossReason(null); return; }
    (async () => {
      const { data } = await (supabase as any)
        .from('lead_dispositions')
        .select('reason, custom_reason, notes, created_at')
        .eq('lead_id', lead.id)
        .order('created_at', { ascending: false })
        .limit(1);
      const row = data?.[0];
      if (!row) { setLossReason(null); return; }
      setLossReason(row.custom_reason || row.reason || row.notes || null);
    })();
  }, [lead?.id, lead?.status, open]);

  // Default proposals tab to the lead's current status bucket
  useEffect(() => {
    if (!lead) return;
    if (lead.status === 'perdido') setProposalsTab('perdidas');
    else if (lead.status === 'pedido_fechado') setProposalsTab('fechadas');
    else setProposalsTab('abertas');
  }, [lead?.status, lead?.id]);

  useEffect(() => {
    if (!lead?.budget_number || !open) {
      setOrderValue(null);
      return;
    }

    const orderNums = lead.budget_number.split(',').map(s => s.trim()).filter(Boolean);
    if (orderNums.length === 0) {
      setOrderValue(null);
      return;
    }

    const meta = (lead as any).linked_orders_meta || {};

    const norm = (s: string) => (s || '').trim().toLowerCase();
    fetchComercialData()
      .then((data) => {
        let total = 0;
        const perOrder: Record<string, number> = {};

        for (const num of orderNums) {
          let matches = data.filter(d => String(d.numeropedido).trim() === num);
          if (matches.length === 0) continue;

          const metaName = meta[num];
          if (metaName) {
            const target = norm(metaName);
            const exact = matches.filter(d => norm(d.cli_nomefantasia || d.cliente) === target);
            if (exact.length === 0) continue;
            matches = exact;
          } else {
            const candidates = [lead.empresa, lead.cliente_nome, lead.client_name].filter(Boolean).map(norm);
            if (candidates.length > 0) {
              const exact = matches.filter(d => candidates.includes(norm(d.cli_nomefantasia || d.cliente)));
              if (exact.length === 0) continue;
              matches = exact;
            }
          }

          const sorted = [...matches].sort((a, b) => {
            const da = parseDate(a.data_emissao)?.getTime() || 0;
            const db = parseDate(b.data_emissao)?.getTime() || 0;
            return db - da;
          });

          const mostRecentDate = sorted[0]?.data_emissao;
          const finalItems = mostRecentDate
            ? matches.filter(d => d.data_emissao === mostRecentDate)
            : matches;

          const orderTotal = finalItems.reduce((sum, item) => sum + (item.valor || 0), 0);
          perOrder[num] = orderTotal;
          total += orderTotal;
        }

        setOrderValue(total);
        setOrderValues(perOrder);

        if (total > 0 && total !== lead.valor_estimado) {
          (supabase as any)
            .from('leads')
            .update({ valor_estimado: total })
            .eq('id', lead.id);
        }
      })
      .catch(() => { setOrderValue(null); setOrderValues({}); });
  }, [lead?.budget_number, lead?.empresa, lead?.cliente_nome, lead?.client_name, lead?.valor_estimado, lead?.id, open]);

  const handleAddOrderFromDrawer = async (orderNumber: string, orderValue: number, orderClientName: string) => {
    if (!lead) return;
    const existingOrders = lead.budget_number
      ? lead.budget_number.split(',').map(s => s.trim()).filter(Boolean)
      : [];
    if (existingOrders.includes(orderNumber)) {
      toast.info('Pedido já vinculado');
      setAddOrderOpen(false);
      return;
    }
    existingOrders.push(orderNumber);
    const newBudgetNumber = existingOrders.join(', ');
    const existingMeta = (lead as any).linked_orders_meta || {};
    const newMeta = { ...existingMeta, [orderNumber]: orderClientName };
    await (supabase as any).from('leads').update({
      budget_number: newBudgetNumber,
      valor_estimado: (lead.valor_estimado || 0) + orderValue,
      linked_orders_meta: newMeta,
      updated_at: new Date().toISOString(),
    }).eq('id', lead.id);
    toast.success(`Pedido ${orderNumber} vinculado`);
    setAddOrderOpen(false);
    onLeadUpdated();
  };

  const loadNextVisit = async (leadId: string) => {
    const { data } = await (supabase as any)
      .from('crm_visits')
      .select('id, visit_date, location')
      .eq('lead_id', leadId)
      .order('visit_date', { ascending: false })
      .limit(1);
    if (data?.[0]) {
      setNextVisit({ id: data[0].id, date: data[0].visit_date, location: data[0].location });
    } else {
      setNextVisit(null);
    }
  };

  const loadNextFollowUp = async (leadId: string) => {
    const { data } = await supabase
      .from('follow_ups')
      .select('id, data_agendada, titulo, tipo')
      .eq('lead_id', leadId)
      .eq('concluido', false)
      .order('data_agendada', { ascending: true })
      .limit(1);
    if (data?.[0]) {
      setNextFollowUp({ id: data[0].id, data_agendada: data[0].data_agendada, titulo: data[0].titulo, tipo: data[0].tipo });
    } else {
      setNextFollowUp(null);
    }
  };

  const cancelVisit = async () => {
    if (!nextVisit || !lead) return;
    try {
      await (supabase as any).from('crm_visits').delete().eq('id', nextVisit.id);
      const user = (await supabase.auth.getUser()).data.user;
      const { data: profile } = await supabase.from('user_profiles').select('full_name').eq('id', user?.id || '').maybeSingle();
      await supabase.from('lead_activities').insert({
        lead_id: lead.id,
        user_id: user?.id || '',
        activity_type: 'visita',
        description: `Reunião desmarcada: ${new Date(nextVisit.date).toLocaleDateString('pt-BR')} ${new Date(nextVisit.date).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}${nextVisit.location ? ` em ${nextVisit.location}` : ''}`,
        sdr_name: (profile as any)?.full_name || 'Usuário',
      });
      const updatePayload: any = { updated_at: new Date().toISOString() };
      if (lead.status === 'visita_reuniao') {
        updatePayload.status = 'contato_feito';
      }
      await (supabase as any).from('leads').update(updatePayload).eq('id', lead.id);
      setNextVisit(null);
      toast.success('Reunião desmarcada');
      onLeadUpdated();
      loadActivities(lead.id);
    } catch (err: any) {
      toast.error('Erro ao desmarcar reunião', { description: err.message });
    }
  };

  const loadActivities = async (leadId: string) => {
    const { data } = await supabase
      .from('lead_activities')
      .select('*')
      .eq('lead_id', leadId)
      .order('created_at', { ascending: false })
      .limit(20);
    const acts = (data as LeadActivity[]) || [];
    setActivities(acts);

    const userIds = [...new Set(acts.map(a => a.user_id).filter(Boolean))];
    if (userIds.length > 0) {
      const { data: profiles } = await supabase
        .from('user_profiles')
        .select('id, full_name, avatar_url')
        .in('id', userIds);
      if (profiles) {
        const map: Record<string, UserProfileInfo> = {};
        profiles.forEach((p: any) => { map[p.id] = { full_name: p.full_name, avatar_url: p.avatar_url }; });
        setUserProfiles(map);
      }
    }
  };

  const countContactsToday = async (leadId: string): Promise<number> => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const { data } = await supabase
      .from('lead_activities')
      .select('id')
      .eq('lead_id', leadId)
      .eq('activity_type', 'contato_inicial')
      .gte('created_at', today.toISOString());
    return data?.length || 0;
  };

  const ordinal = (n: number) => {
    if (n === 1) return '1º';
    if (n === 2) return '2º';
    if (n === 3) return '3º';
    return `${n}º`;
  };

  const addNote = async () => {
    if (!lead || !newNote.trim()) return;
    setSubmitting(true);
    try {
      const user = (await supabase.auth.getUser()).data.user;
      const { data: profile } = await supabase.from('user_profiles').select('full_name').eq('id', user?.id || '').single();
      await supabase.from('lead_activities').insert({
        lead_id: lead.id,
        activity_type: 'nota',
        description: newNote.trim(),
        user_id: user?.id || '',
        sdr_name: profile?.full_name || 'Usuário',
      } as any);
      setNewNote('');
      loadActivities(lead.id);
      toast.success('Nota adicionada com sucesso');
    } catch {
      toast.error('Erro ao adicionar nota');
    } finally {
      setSubmitting(false);
    }
  };

  const [showEnrichAfterContact, setShowEnrichAfterContact] = useState(false);
  const [contactDialogOpen, setContactDialogOpen] = useState(false);
  const [contactNote, setContactNote] = useState('');
  const [contactChannel, setContactChannel] = useState('ligacao');
  const [contactSubmitting, setContactSubmitting] = useState(false);

  const openContactDialog = () => {
    setContactNote('');
    setContactChannel('ligacao');
    setContactDialogOpen(true);
  };

  const submitContact = async () => {
    if (!lead) return;
    if (!contactNote.trim()) {
      toast.error('Nota obrigatória', { description: 'Preencha uma anotação antes de registrar o contato.' });
      return;
    }
    setContactSubmitting(true);
    try {
      const todayCount = await countContactsToday(lead.id);
      const user = (await supabase.auth.getUser()).data.user;
      const { data: profile } = await supabase.from('user_profiles').select('full_name').eq('id', user?.id || '').single();
      const userName = profile?.full_name || 'Usuário';
      const channelLabel = CONTACT_CHANNELS.find(c => c.value === contactChannel)?.label || contactChannel;
      // Save note
      await supabase.from('lead_activities').insert({
        lead_id: lead.id,
        activity_type: 'nota',
        description: contactNote.trim(),
        user_id: user?.id || '',
        sdr_name: userName,
        contact_channel: contactChannel,
      } as any);
      // Register contato_inicial with channel
      await supabase.from('lead_activities').insert({
        lead_id: lead.id,
        activity_type: 'contato_inicial',
        description: `Contato registrado via ${channelLabel}`,
        user_id: user?.id || '',
        sdr_name: userName,
        contact_channel: contactChannel,
      } as any);
      // Update lead updated_at
      await (supabase as any).from('leads').update({ updated_at: new Date().toISOString() }).eq('id', lead.id);
      if (lead.status === 'lead') {
        onStatusChange(lead.id, 'contato_feito');
      }
      const newCount = todayCount + 1;
      if (newCount === 1) {
        toast.success('Contato registrado com sucesso');
      } else {
        toast.success(`${ordinal(newCount)} contato do dia registrado`);
      }
      setContactNote('');
      setContactDialogOpen(false);
      loadActivities(lead.id);
      setShowEnrichAfterContact(true);
    } catch (err: any) {
      console.error('Erro ao registrar contato:', err);
      toast.error('Erro ao registrar contato', { description: err?.message || 'Tente novamente' });
    } finally {
      setContactSubmitting(false);
    }
  };

  const handleFailedContact = async () => {
    if (!lead) return;
    try {
      const user = (await supabase.auth.getUser()).data.user;
      const { data: profile } = await supabase.from('user_profiles').select('full_name').eq('id', user?.id || '').single();
      await supabase.from('lead_activities').insert({
        lead_id: lead.id,
        activity_type: 'contato_sem_sucesso',
        description: 'Tentativa de contato sem sucesso (cliente não atendeu)',
        user_id: user?.id || '',
        sdr_name: profile?.full_name || 'Usuário',
      } as any);
      await (supabase as any).from('leads').update({ updated_at: new Date().toISOString() }).eq('id', lead.id);
      toast.success('Tentativa registrada', { description: 'Contato sem sucesso registrado.' });
      loadActivities(lead.id);
      onLeadUpdated(); // Force immediate refresh so KanbanCard re-fetches count
    } catch {
      toast.error('Erro ao registrar tentativa');
    }
  };

  if (!lead) return null;

  const name = lead.empresa || lead.client_name || lead.cliente_nome;
  const phone = lead.contact_phone || lead.cliente_telefone;
  const email = lead.contact_email || lead.cliente_email;
  const whatsappUrl = phone ? `https://wa.me/55${phone.replace(/\D/g, '')}` : null;
  const currentStage = CRM_STAGES.find(s => s.key === lead.status);


  // Find first contact and last contact activities
  const contactActivities = activities.filter(a => a.activity_type === 'contato_inicial');
  const firstContact = contactActivities.length > 0 ? contactActivities[contactActivities.length - 1] : null;
  const lastContact = contactActivities.length > 0 ? contactActivities[0] : null;

  const getActivityIcon = (type: string) => {
    switch (type) {
      case 'contato_inicial': return <Phone className="h-3 w-3" />;
      case 'contato_sem_sucesso': return <PhoneMissed className="h-3 w-3" />;
      case 'nota': return <FileText className="h-3 w-3" />;
      case 'encaminhamento': return <Send className="h-3 w-3" />;
      case 'visita': return <MapPin className="h-3 w-3" />;
      case 'mudanca_status': return <ArrowRightLeft className="h-3 w-3" />;
      default: return <Clock className="h-3 w-3" />;
    }
  };

  const getChannelBadge = (channel?: string) => {
    if (!channel) return null;
    const ch = CONTACT_CHANNELS.find(c => c.value === channel);
    if (!ch) return null;
    return <span className="text-[9px] text-muted-foreground ml-1">({ch.icon} {ch.label})</span>;
  };

  return (
    <>
      <Sheet open={open} onOpenChange={(v) => !v && onClose()}>
        <SheetContent side={isMobile ? 'bottom' : 'right'} className={isMobile ? 'h-[85vh]' : 'sm:max-w-md'}>
          <SheetHeader>
            <SheetTitle className="text-left flex items-center gap-2">
              {name}
              {((lead.source && lead.source.toLowerCase().replace(/[áàã]/g, 'a').includes('trafego pago')) || (lead.origem && lead.origem.toLowerCase().replace(/[áàã]/g, 'a').includes('trafego pago'))) && (
                <img src={instagramLogo} alt="Tráfego Pago" className="h-5 w-5 shrink-0" title="Tráfego Pago" />
              )}
              {currentStage && (
                <Badge style={{ backgroundColor: currentStage.color, color: '#fff' }} className="text-[10px]">
                  {currentStage.label}
                </Badge>
              )}
              <Button size="icon" variant="ghost" className="h-6 w-6 ml-auto" onClick={() => setEditOpen(true)} title="Editar Lead">
                <Edit2 className="h-3.5 w-3.5" />
              </Button>
            </SheetTitle>
          </SheetHeader>

          <div className="mt-4 space-y-4 overflow-y-auto max-h-[calc(100vh-180px)]">
            {/* Info */}
            <div className="space-y-2">
              {(lead.contact_name || lead.cliente_nome) && (
                <div className="flex items-center gap-2 text-sm">
                  <User className="h-4 w-4 text-muted-foreground" />
                  <span>{lead.contact_name || lead.cliente_nome}</span>
                </div>
              )}
              {phone && (
                <div className="flex items-center gap-2 text-sm">
                  <Phone className="h-4 w-4 text-muted-foreground" />
                  <span>{phone}</span>
                </div>
              )}
              {email && (
                <div className="flex items-center gap-2 text-sm">
                  <Mail className="h-4 w-4 text-muted-foreground" />
                  <span>{email}</span>
                </div>
              )}
              {lead.produto_interesse && (
                <div className="flex items-center gap-2 text-sm">
                  <Tags className="h-4 w-4 text-muted-foreground" />
                  <span>{lead.produto_interesse}</span>
                </div>
              )}
              {lead.ramo_atuacao && (
                <div className="flex items-center gap-2 text-sm">
                  <Building2 className="h-4 w-4 text-muted-foreground" />
                  <span className="text-muted-foreground">Ramo:</span>
                  <span>{lead.ramo_atuacao}</span>
                </div>
              )}
              {(lead.cidade || lead.estado) && (
                <div className="flex items-center gap-2 text-sm">
                  <MapPin className="h-4 w-4 text-muted-foreground" />
                  <span>{[lead.cidade, lead.estado].filter(Boolean).join(' - ')}</span>
                </div>
              )}
              {lead.website && (
                <div className="flex items-center gap-2 text-sm">
                  <Globe className="h-4 w-4 text-muted-foreground" />
                  <a
                    href={
                      lead.website.includes('pncp.gov.br/app/editais/')
                        ? `https://www.google.com/search?q=pncp+${encodeURIComponent((lead.empresa || lead.cliente_nome || '').slice(0, 60))}`
                        : (lead.website.startsWith('http') ? lead.website : `https://${lead.website}`)
                    }
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-primary hover:underline truncate flex items-center gap-1"
                  >
                    {lead.website.replace(/^https?:\/\//, '').replace(/\/$/, '')}
                    <ExternalLink className="h-3 w-3 shrink-0" />
                  </a>
                </div>
              )}
              {lead.cliente_cnpj && (
                <div className="flex items-center gap-2 text-sm">
                  <FileText className="h-4 w-4 text-muted-foreground" />
                  <span className="text-muted-foreground">CNPJ:</span>
                  <span>{lead.cliente_cnpj}</span>
                </div>
              )}
              {lead.regime_tributario && (
                <div className="flex items-center gap-2 text-sm">
                  <Building2 className="h-4 w-4 text-muted-foreground" />
                  <span className="text-muted-foreground">Regime:</span>
                  <span>{lead.regime_tributario}</span>
                </div>
              )}
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Calendar className="h-4 w-4" />
                <span>Aberto em {new Date(lead.data_abertura).toLocaleDateString('pt-BR')}</span>
              </div>

              {/* Orders linked */}
              {(() => {
                const orders = lead.budget_number ? lead.budget_number.split(',').map(s => s.trim()).filter(Boolean) : [];
                const bucket: 'abertas' | 'perdidas' | 'fechadas' =
                  lead.status === 'perdido' ? 'perdidas'
                  : lead.status === 'pedido_fechado' ? 'fechadas'
                  : 'abertas';
                const abertasOrders = bucket === 'abertas' ? orders : [];
                const perdidasOrders = bucket === 'perdidas' ? orders : [];
                const fechadasOrders = bucket === 'fechadas' ? orders : [];

                const renderOrders = (list: string[], emptyMsg: string, showLossReason = false) => (
                  <div className="space-y-1.5 mt-2">
                    {list.length === 0 ? (
                      <p className="text-xs text-muted-foreground italic py-2">{emptyMsg}</p>
                    ) : (
                      <>
                        {showLossReason && lossReason && (
                          <div className="text-[11px] rounded-md border border-warning/30 bg-warning/10 px-2 py-1 text-foreground">
                            <span className="font-medium text-muted-foreground">Motivo:</span> {lossReason}
                          </div>
                        )}
                        {list.map((orderNum, idx) => {
                          const v = orderValues[orderNum];
                          return (
                            <div
                              key={idx}
                              className="flex items-center justify-between gap-2 text-sm rounded-md border px-2 py-1.5 cursor-pointer hover:bg-accent/40 transition-colors"
                              onClick={() => { setSelectedOrderNum(orderNum); setOrderDialogOpen(true); }}
                            >
                              <span className="flex items-center gap-1.5 font-medium text-primary">
                                <Package className="h-3.5 w-3.5" />
                                Pedido {orderNum}
                              </span>
                              {v != null && v > 0 && (
                                <span className="text-xs font-semibold text-foreground">
                                  R$ {v.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                                </span>
                              )}
                            </div>
                          );
                        })}
                      </>
                    )}
                  </div>
                );

                return (
                  <div className="rounded-lg border p-2.5 bg-muted/20 space-y-2">
                    <p className="text-xs font-semibold text-foreground">Histórico de Propostas</p>
                    <Tabs value={proposalsTab} onValueChange={(v) => setProposalsTab(v as any)}>
                      <TabsList className="grid grid-cols-3 h-8 w-full">
                        <TabsTrigger value="abertas" className="text-[11px] gap-1">
                          Em Aberto
                          <Badge variant="secondary" className="h-4 px-1 text-[10px]">{abertasOrders.length}</Badge>
                        </TabsTrigger>
                        <TabsTrigger value="perdidas" className="text-[11px] gap-1">
                          Perdidas
                          <Badge variant="secondary" className="h-4 px-1 text-[10px]">{perdidasOrders.length}</Badge>
                        </TabsTrigger>
                        <TabsTrigger value="fechadas" className="text-[11px] gap-1">
                          Fechadas
                          <Badge variant="secondary" className="h-4 px-1 text-[10px]">{fechadasOrders.length}</Badge>
                        </TabsTrigger>
                      </TabsList>
                      <TabsContent value="abertas" className="mt-1">
                        {renderOrders(abertasOrders, 'Nenhuma proposta em aberto.')}
                      </TabsContent>
                      <TabsContent value="perdidas" className="mt-1">
                        {renderOrders(perdidasOrders, 'Nenhuma proposta perdida.', true)}
                      </TabsContent>
                      <TabsContent value="fechadas" className="mt-1">
                        {renderOrders(fechadasOrders, 'Nenhum pedido fechado.')}
                      </TabsContent>
                    </Tabs>

                    {orderValue != null && orderValue > 0 && orders.length > 0 && (
                      <p className="text-xs font-semibold text-foreground pt-1 border-t">
                        Total: R$ {orderValue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                      </p>
                    )}

                    <Button
                      size="sm"
                      variant="outline"
                      className="gap-1.5 text-xs w-full"
                      onClick={() => setAddOrderOpen(true)}
                    >
                      <Plus className="h-3.5 w-3.5" />
                      Vincular Pedido
                    </Button>
                  </div>
                );
              })()}
            </div>

            {/* Próxima Reunião */}
            {nextVisit && (
              <div className="flex items-center justify-between rounded-lg border p-3 bg-accent/30">
                <div className="flex items-center gap-2 text-sm">
                  <Calendar className="h-4 w-4 text-primary" />
                  <div>
                    <p className="font-medium text-foreground">
                      {new Date(nextVisit.date).toLocaleDateString('pt-BR')} às {new Date(nextVisit.date).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                    </p>
                    {nextVisit.location && (
                      <p className="text-xs text-muted-foreground flex items-center gap-1">
                        <MapPin className="h-3 w-3" />
                        {nextVisit.location}
                      </p>
                    )}
                  </div>
                </div>
                <Button
                  size="sm"
                  variant="ghost"
                  className="text-destructive hover:text-destructive hover:bg-destructive/10 gap-1 text-xs"
                  onClick={cancelVisit}
                >
                  <CalendarX2 className="h-3.5 w-3.5" />
                  Desmarcar
                </Button>
              </div>
            )}

            {/* Próximo Follow-up */}
            {nextFollowUp && (
              <div className="flex items-center justify-between rounded-lg border p-3 bg-accent/30">
                <div className="flex items-center gap-2 text-sm">
                  <ClipboardList className="h-4 w-4 text-primary" />
                  <div>
                    <p className="font-medium text-foreground">
                      {nextFollowUp.titulo}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {new Date(nextFollowUp.data_agendada).toLocaleDateString('pt-BR')} às {new Date(nextFollowUp.data_agendada).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  <Button
                    size="sm"
                    variant="ghost"
                    className="text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50 gap-1 text-xs"
                    onClick={async () => {
                      if (!lead) return;
                      try {
                        await supabase.from('follow_ups').update({ concluido: true }).eq('id', nextFollowUp.id);
                        const user = (await supabase.auth.getUser()).data.user;
                        const { data: profile } = await supabase.from('user_profiles').select('full_name').eq('id', user?.id || '').maybeSingle();
                        await supabase.from('lead_activities').insert({
                          lead_id: lead.id,
                          user_id: user?.id || '',
                          activity_type: 'nota',
                          description: `Follow-up concluído: ${nextFollowUp.titulo}`,
                          sdr_name: (profile as any)?.full_name || 'Usuário',
                        } as any);
                        setNextFollowUp(null);
                        toast.success('Follow-up concluído');
                        onLeadUpdated();
                        loadActivities(lead.id);
                      } catch (err: any) {
                        toast.error('Erro ao concluir follow-up', { description: err.message });
                      }
                    }}
                  >
                    <CheckCircle2 className="h-3.5 w-3.5" />
                    Concluir
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="text-destructive hover:text-destructive hover:bg-destructive/10 gap-1 text-xs"
                    onClick={async () => {
                      if (!lead) return;
                      try {
                        await supabase.from('follow_ups').update({ concluido: true }).eq('id', nextFollowUp.id);
                        const user = (await supabase.auth.getUser()).data.user;
                        const { data: profile } = await supabase.from('user_profiles').select('full_name').eq('id', user?.id || '').maybeSingle();
                        await supabase.from('lead_activities').insert({
                          lead_id: lead.id,
                          user_id: user?.id || '',
                          activity_type: 'nota',
                          description: `Follow-up cancelado: ${nextFollowUp.titulo}`,
                          sdr_name: (profile as any)?.full_name || 'Usuário',
                        } as any);
                        setNextFollowUp(null);
                        toast.success('Follow-up cancelado');
                        onLeadUpdated();
                        loadActivities(lead.id);
                      } catch (err: any) {
                        toast.error('Erro ao cancelar follow-up', { description: err.message });
                      }
                    }}
                  >
                    <CalendarX2 className="h-3.5 w-3.5" />
                    Cancelar
                  </Button>
                </div>
              </div>
            )}

            {/* Contact Responsibility */}
            {(firstContact || lastContact) && (
              <div className="space-y-2 rounded-lg border p-3 bg-accent/30">
                <p className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
                  <User className="h-3.5 w-3.5" />
                  Responsáveis pelo contato
                </p>
                {firstContact && (
                  <div className="flex items-center gap-2">
                    <UserAvatar
                      name={userProfiles[firstContact.user_id]?.full_name || firstContact.sdr_name || 'Usuário'}
                      avatarUrl={userProfiles[firstContact.user_id]?.avatar_url}
                    />
                    <div className="min-w-0">
                      <p className="text-xs font-medium text-foreground truncate">
                        {userProfiles[firstContact.user_id]?.full_name || firstContact.sdr_name || 'Usuário'}
                      </p>
                      <p className="text-[10px] text-muted-foreground">
                        Primeiro contato • {new Date(firstContact.created_at).toLocaleDateString('pt-BR')}
                      </p>
                    </div>
                  </div>
                )}
                {lastContact && lastContact.id !== firstContact?.id && (
                  <div className="flex items-center gap-2">
                    <UserAvatar
                      name={userProfiles[lastContact.user_id]?.full_name || lastContact.sdr_name || 'Usuário'}
                      avatarUrl={userProfiles[lastContact.user_id]?.avatar_url}
                    />
                    <div className="min-w-0">
                      <p className="text-xs font-medium text-foreground truncate">
                        {userProfiles[lastContact.user_id]?.full_name || lastContact.sdr_name || 'Usuário'}
                      </p>
                      <p className="text-[10px] text-muted-foreground">
                        Último contato • {new Date(lastContact.created_at).toLocaleDateString('pt-BR')}
                      </p>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Quick Actions */}
            <div className="flex flex-wrap gap-2">
              {lead.status === 'analise_financeira' && canAccessFinanceiro ? (
                <Button size="sm" onClick={() => setAnaliseResponseOpen(true)} className="gap-1.5 bg-blue-600 hover:bg-blue-700">
                  <FileText className="h-3.5 w-3.5" />
                  Análise Financeira
                </Button>
              ) : (
                <Button size="sm" onClick={openContactDialog} className="gap-1.5">
                  <Phone className="h-3.5 w-3.5" />
                  Registrar Contato
                </Button>
              )}
              <Button size="sm" variant="outline" onClick={() => setFailedConfirmOpen(true)} className="gap-1.5 text-destructive border-destructive/30 hover:bg-destructive/5">
                <PhoneMissed className="h-3.5 w-3.5" />
                Sem Sucesso
              </Button>
              {lead.status === 'analise_financeira' && (
                <Button size="sm" variant="outline" disabled className="gap-1.5 text-indigo-600 border-indigo-300 bg-indigo-50 cursor-not-allowed">
                  <DollarSign className="h-3.5 w-3.5" />
                  Em Análise
                </Button>
              )}
              {whatsappUrl && (
                <Button size="sm" variant="outline" asChild className="gap-1.5">
                  <a href={whatsappUrl} target="_blank" rel="noopener noreferrer">
                    <MessageCircle className="h-3.5 w-3.5" />
                    WhatsApp
                  </a>
                </Button>
              )}
              <Button size="sm" variant="outline" onClick={() => setFollowUpDialogOpen(true)} className="gap-1.5">
                <ClipboardList className="h-3.5 w-3.5" />
                Agendar Follow-up
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => setOpenTicketDialogOpen(true)}
                className="gap-1.5 text-purple-700 border-purple-300 hover:bg-purple-50"
              >
                <Ticket className="h-3.5 w-3.5" />
                Chamado Financeiro
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => setApresentacaoConfirmOpen(true)}
                className={`gap-1.5 ${lead.apresentacao_enviada_at ? 'text-primary border-primary/40 bg-primary/5' : ''}`}
              >
                <Presentation className="h-3.5 w-3.5" />
                {lead.apresentacao_enviada_at ? 'Apresentação Enviada ✓' : 'Apresentação Enviada'}
              </Button>
            </div>

            {/* Move Stage */}
            <div>
              <p className="text-xs font-medium text-muted-foreground mb-2">Mover para:</p>
              <div className="flex flex-wrap gap-1.5">
                {CRM_STAGES.filter(s => s.key !== lead.status && s.key !== 'analise_financeira').map(stage => (
                  <Button
                    key={stage.key}
                    size="sm"
                    variant="outline"
                    className="text-xs h-7"
                    onClick={() => setPendingMove({ key: stage.key, label: stage.label })}
                  >
                    <div className="w-2 h-2 rounded-full mr-1.5" style={{ backgroundColor: stage.color }} />
                    {stage.label}
                  </Button>
                ))}
                <Button
                  size="sm"
                  variant="outline"
                  className="text-xs h-7 text-warning border-warning/30"
                  onClick={() => setPendingMove({ key: 'perdido', label: 'Perdido' })}
                >
                  Perdido
                </Button>
              </div>
            </div>

            <Separator />


            {/* Observações / Notes */}
            {(lead.notes || lead.source) && (
              <div className="space-y-2 rounded-lg border p-3 bg-muted/30">
                {lead.source && (
                  <div className="flex items-center gap-2 text-xs">
                    <span className="font-medium text-muted-foreground">Origem:</span>
                    {(lead.source.toLowerCase().replace(/[áàã]/g, 'a').includes('trafego pago') || (lead.origem && lead.origem.toLowerCase().replace(/[áàã]/g, 'a').includes('trafego pago'))) && (
                      <img src={instagramLogo} alt="Tráfego Pago" className="h-4 w-4 shrink-0" />
                    )}
                    <Badge variant="outline" className="text-[10px]">
                      {lead.source.replace('prospeccao_', 'Prospecção ').replace('google', 'Google').replace('pncp', 'PNCP').replace('brasilapi', 'BrasilAPI').replace('ia', 'IA')}
                    </Badge>
                  </div>
                )}
                {lead.notes && (
                  <div>
                    <p className="text-xs font-medium text-muted-foreground mb-1">Observações</p>
                    <p className="text-xs text-foreground whitespace-pre-wrap">{lead.notes}</p>
                  </div>
                )}
              </div>
            )}

            {/* Attachments */}
            <LeadAttachments leadId={lead.id} />

            <Separator />

            {/* Add Note */}
            <div className="space-y-2">
              <p className="text-xs font-medium text-muted-foreground">Adicionar nota</p>
              <Textarea
                value={newNote}
                onChange={(e) => setNewNote(e.target.value)}
                placeholder="Escreva uma nota..."
                rows={2}
                className="text-sm"
              />
              <Button size="sm" onClick={addNote} disabled={!newNote.trim() || submitting}>
                Salvar nota
              </Button>
            </div>

            <Separator />

            {/* Timeline */}
            <div>
              <p className="text-xs font-medium text-muted-foreground mb-3">Histórico de Atividades</p>
              {activities.length === 0 ? (
                <p className="text-xs text-muted-foreground text-center py-4">Nenhuma atividade registrada</p>
              ) : (
                <div className="space-y-3">
                  {activities.map(activity => {
                    const profile = userProfiles[activity.user_id];
                    const displayName = profile?.full_name || activity.sdr_name || 'Usuário';
                    return (
                      <div key={activity.id} className="flex gap-2">
                        <div className="mt-0.5">
                          <UserAvatar
                            name={displayName}
                            avatarUrl={profile?.avatar_url}
                            size="sm"
                          />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-1.5">
                            <span className="text-[10px] font-medium text-foreground">{displayName}</span>
                            <div className="p-0.5 rounded bg-accent text-accent-foreground">
                              {getActivityIcon(activity.activity_type)}
                            </div>
                            {getChannelBadge(activity.contact_channel)}
                          </div>
                          <p className="text-xs text-foreground mt-0.5">{activity.description}</p>
                          <span className="text-[10px] text-muted-foreground">
                            {new Date(activity.created_at).toLocaleDateString('pt-BR')} {new Date(activity.created_at).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </SheetContent>
      </Sheet>

      <LeadEditDialog
        lead={lead}
        open={editOpen}
        onOpenChange={setEditOpen}
        onUpdated={onLeadUpdated}
      />

      <AlertDialog open={!!pendingMove} onOpenChange={(v) => { if (!v) setPendingMove(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar movimentação</AlertDialogTitle>
            <AlertDialogDescription>
              Deseja mover o lead <strong>{lead?.empresa || lead?.client_name || lead?.cliente_nome}</strong> para <strong>{pendingMove?.label}</strong>?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={() => {
              if (lead && pendingMove) {
                onStatusChange(lead.id, pendingMove.key);
              }
              setPendingMove(null);
            }}>
              Confirmar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Failed contact confirmation dialog */}
      <AlertDialog open={failedConfirmOpen} onOpenChange={setFailedConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Registrar tentativa sem sucesso</AlertDialogTitle>
            <AlertDialogDescription>
              Confirma o registro de tentativa de contato sem sucesso com <strong>{name}</strong>?
              <br />
              <span className="text-muted-foreground text-xs">O cliente não atendeu ou não respondeu.</span>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={() => {
              setFailedConfirmOpen(false);
              handleFailedContact();
            }}>
              Confirmar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Apresentação enviada confirmation dialog */}
      <AlertDialog open={apresentacaoConfirmOpen} onOpenChange={setApresentacaoConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {lead?.apresentacao_enviada_at ? 'Remover marcação?' : 'Confirmar apresentação enviada?'}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {lead?.apresentacao_enviada_at
                ? <>Deseja remover a marcação de apresentação enviada para <strong>{lead?.empresa || lead?.client_name || lead?.cliente_nome}</strong>?</>
                : <>Confirma que a apresentação foi enviada para <strong>{lead?.empresa || lead?.client_name || lead?.cliente_nome}</strong>?</>}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={async () => {
              const isSent = !!lead.apresentacao_enviada_at;
              const newValue = isSent ? null : new Date().toISOString();
              const { error } = await (supabase as any)
                .from('leads')
                .update({ apresentacao_enviada_at: newValue })
                .eq('id', lead.id);
              setApresentacaoConfirmOpen(false);
              if (error) {
                toast.error('Erro ao atualizar apresentação');
                return;
              }
              await (supabase as any).from('lead_activities').insert({
                lead_id: lead.id,
                activity_type: 'nota',
                description: isSent ? 'Marcação de apresentação enviada removida' : 'Apresentação enviada ao cliente',
              });
              toast.success(isSent ? 'Marcação removida' : 'Apresentação marcada como enviada');
              onLeadUpdated();
            }}>
              Confirmar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Order detail popup */}
      {selectedOrderNum && (
        <OrderDetailDialog
          open={orderDialogOpen}
          onClose={() => { setOrderDialogOpen(false); setSelectedOrderNum(null); }}
          budgetNumber={selectedOrderNum}
          clientName={lead.empresa || lead.cliente_nome || lead.client_name}
          linkedClientName={((lead as any).linked_orders_meta || {})[selectedOrderNum] || undefined}
        />
      )}

      {/* Add order dialog */}
      <OrderLinkDialog
        open={addOrderOpen}
        onOpenChange={setAddOrderOpen}
        targetStage={lead?.status || ''}
        onConfirm={handleAddOrderFromDrawer}
        onCancel={() => setAddOrderOpen(false)}
      />

      {/* Contact registration dialog */}
      <Dialog open={contactDialogOpen} onOpenChange={setContactDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-sm">Registrar Contato</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <p className="text-xs text-muted-foreground">
              Descreva o contato realizado com <strong>{name}</strong>
            </p>
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1 block">Canal de contato</label>
              <Select value={contactChannel} onValueChange={setContactChannel}>
                <SelectTrigger className="h-8 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {CONTACT_CHANNELS.map(ch => (
                    <SelectItem key={ch.value} value={ch.value} className="text-xs">
                      {ch.icon} {ch.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Textarea
              value={contactNote}
              onChange={(e) => setContactNote(e.target.value)}
              placeholder="Ex: Ligação realizada, cliente interessado em perfis..."
              rows={3}
              className="text-sm"
              autoFocus
            />
          </div>
          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => setContactDialogOpen(false)}>
              Cancelar
            </Button>
            <Button size="sm" onClick={submitContact} disabled={!contactNote.trim() || contactSubmitting} className="gap-1.5">
              {contactSubmitting ? (
                <span className="animate-spin h-3 w-3 border-2 border-current border-t-transparent rounded-full" />
              ) : (
                <Phone className="h-3.5 w-3.5" />
              )}
              Registrar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Enrich form dialog after contact */}
      <Dialog open={showEnrichAfterContact} onOpenChange={setShowEnrichAfterContact}>
        <DialogContent className="sm:max-w-lg max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-sm">Enriquecer Cadastro</DialogTitle>
          </DialogHeader>
          <LeadEnrichForm lead={lead} onUpdated={() => { onLeadUpdated(); setShowEnrichAfterContact(false); }} />
        </DialogContent>
      </Dialog>

      {/* Follow-up schedule dialog */}
      <FollowUpScheduleDialog
        open={followUpDialogOpen}
        onOpenChange={setFollowUpDialogOpen}
        leadId={lead.id}
        leadName={name || ''}
        onConfirm={() => {
          loadNextFollowUp(lead.id);
          loadActivities(lead.id);
          onLeadUpdated();
        }}
      />

      {/* Análise Financeira Response Dialog */}
      <AnaliseFinanceiraResponseDialog
        open={analiseResponseOpen}
        onOpenChange={setAnaliseResponseOpen}
        leadId={lead.id}
        leadName={name || ''}
        leadEmpresa={lead.empresa}
        leadCnpj={lead.cliente_cnpj}
        leadCidade={lead.cidade}
        leadEstado={lead.estado}
        leadBudgetNumber={lead.budget_number}
        leadValor={orderValue ?? undefined}
        leadRamoAtuacao={lead.ramo_atuacao}
        leadProdutoInteresse={lead.produto_interesse}
        leadWebsite={lead.website}
        leadRegimeTributario={lead.regime_tributario}
        leadTelefone={lead.cliente_telefone}
        leadEmail={lead.cliente_email}
        onConfirm={() => {
          loadActivities(lead.id);
          onLeadUpdated();
        }}
      />
      <OpenTicketDialog
        open={openTicketDialogOpen}
        onOpenChange={setOpenTicketDialogOpen}
        lead={lead}
        onCreated={() => loadActivities(lead.id)}
      />
    </>
  );
}
