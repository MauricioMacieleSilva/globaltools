
import { useEffect, useState, useCallback } from 'react';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Textarea } from '@/components/ui/textarea';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { MessageCircle, Mail, Phone, Building2, Calendar, MapPin, FileText, Send, Clock, Edit2, User, ArrowRightLeft, Package, Tags } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { CRM_STAGES, type CRMLead, type CRMStageKey } from '@/pages/CRM';
import { useIsMobile } from '@/hooks/use-mobile';
import { LeadEnrichForm } from './LeadEnrichForm';
import { LeadEditDialog } from './LeadEditDialog';
import { fetchComercialData } from '@/services/googleSheetsService';

interface LeadActivity {
  id: string;
  activity_type: string;
  description: string;
  created_at: string;
  sdr_name?: string;
  user_id: string;
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

export function LeadDrawer({ lead, open, onClose, onStatusChange, onLeadUpdated }: LeadDrawerProps) {
  const [activities, setActivities] = useState<LeadActivity[]>([]);
  const [userProfiles, setUserProfiles] = useState<Record<string, UserProfileInfo>>({});
  const [newNote, setNewNote] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [pendingMove, setPendingMove] = useState<{ key: string; label: string } | null>(null);
  const [orderValue, setOrderValue] = useState<number | null>(null);
  const isMobile = useIsMobile();

  useEffect(() => {
    if (lead?.id && open) {
      loadActivities(lead.id);
    }
  }, [lead?.id, open]);

  // Fetch order value from commercial data if budget_number exists but valor_estimado is missing
  useEffect(() => {
    if (!lead?.budget_number || !open) { setOrderValue(null); return; }
    if (lead.valor_estimado && lead.valor_estimado > 0) { setOrderValue(lead.valor_estimado); return; }
    fetchComercialData().then((data) => {
      let total = 0;
      for (const d of data) {
        if (d.numeropedido === lead.budget_number) {
          total += (d.valor || 0);
        }
      }
      setOrderValue(total);
      // Backfill to DB
      if (total > 0) {
        (supabase as any).from('leads').update({ valor_estimado: total }).eq('id', lead.id);
      }
    }).catch(() => setOrderValue(null));
  }, [lead?.budget_number, lead?.id, open]);

  const loadActivities = async (leadId: string) => {
    const { data } = await supabase
      .from('lead_activities')
      .select('*')
      .eq('lead_id', leadId)
      .order('created_at', { ascending: false })
      .limit(20);
    const acts = (data as LeadActivity[]) || [];
    setActivities(acts);

    // Load user profiles for all unique user_ids
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

  const checkContactAlreadyToday = async (leadId: string): Promise<boolean> => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const { data } = await supabase
      .from('lead_activities')
      .select('id')
      .eq('lead_id', leadId)
      .eq('activity_type', 'contato_inicial')
      .gte('created_at', today.toISOString())
      .limit(1);
    return (data?.length || 0) > 0;
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

  const registerContact = async () => {
    if (!lead) return;
    if (!newNote.trim()) {
      toast.error('Nota obrigatória', { description: 'Preencha uma anotação antes de registrar o contato.' });
      return;
    }
    const already = await checkContactAlreadyToday(lead.id);
    try {
      const user = (await supabase.auth.getUser()).data.user;
      const { data: profile } = await supabase.from('user_profiles').select('full_name').eq('id', user?.id || '').single();
      const userName = profile?.full_name || 'Usuário';
      // Save note
      await supabase.from('lead_activities').insert({
        lead_id: lead.id,
        activity_type: 'nota',
        description: newNote.trim(),
        user_id: user?.id || '',
        sdr_name: userName,
      } as any);
      // Only register a new contato_inicial if not already done today
      if (!already) {
        await supabase.from('lead_activities').insert({
          lead_id: lead.id,
          activity_type: 'contato_inicial',
          description: 'Contato registrado',
          user_id: user?.id || '',
          sdr_name: userName,
        } as any);
        if (lead.status === 'lead') {
          onStatusChange(lead.id, 'contato_feito');
        }
        toast.success('Contato registrado com sucesso');
      } else {
        toast.info('Contato já registrado hoje', {
          description: 'Já existe um registro de contato para este cliente hoje. Sua nota foi salva e você pode continuar atualizando as informações.',
        });
      }

      setNewNote('');
      loadActivities(lead.id);
    } catch {
      toast.error('Erro ao registrar contato');
    }
  };

  if (!lead) return null;

  const name = lead.client_name || lead.cliente_nome;
  const phone = lead.contact_phone || lead.cliente_telefone;
  const email = lead.contact_email || lead.cliente_email;
  const whatsappUrl = phone ? `https://wa.me/55${phone.replace(/\D/g, '')}` : null;
  const currentStage = CRM_STAGES.find(s => s.key === lead.status);
  const showEnrich = lead.status !== 'lead';

  // Find first contact and last contact activities
  const contactActivities = activities.filter(a => a.activity_type === 'contato_inicial');
  const firstContact = contactActivities.length > 0 ? contactActivities[contactActivities.length - 1] : null;
  const lastContact = contactActivities.length > 0 ? contactActivities[0] : null;

  const getActivityIcon = (type: string) => {
    switch (type) {
      case 'contato_inicial': return <Phone className="h-3 w-3" />;
      case 'nota': return <FileText className="h-3 w-3" />;
      case 'encaminhamento': return <Send className="h-3 w-3" />;
      case 'visita': return <MapPin className="h-3 w-3" />;
      case 'mudanca_status': return <ArrowRightLeft className="h-3 w-3" />;
      default: return <Clock className="h-3 w-3" />;
    }
  };

  return (
    <>
      <Sheet open={open} onOpenChange={(v) => !v && onClose()}>
        <SheetContent side={isMobile ? 'bottom' : 'right'} className={isMobile ? 'h-[85vh]' : 'sm:max-w-md'}>
          <SheetHeader>
            <SheetTitle className="text-left flex items-center gap-2">
              {name}
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
              {lead.empresa && (
                <div className="flex items-center gap-2 text-sm">
                  <Building2 className="h-4 w-4 text-muted-foreground" />
                  <span>{lead.empresa}</span>
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
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Calendar className="h-4 w-4" />
                <span>Aberto em {new Date(lead.data_abertura).toLocaleDateString('pt-BR')}</span>
              </div>

              {/* Order/Budget linked */}
              {lead.budget_number && (
                <div className="flex items-center gap-2 text-sm font-medium text-primary">
                  <Package className="h-4 w-4" />
                  <span>Pedido {lead.budget_number}</span>
                  {orderValue != null && orderValue > 0 && (
                    <span className="font-semibold text-foreground">
                      — R$ {orderValue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </span>
                  )}
                </div>
              )}
            </div>

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
              <Button size="sm" onClick={registerContact} className="gap-1.5">
                <Phone className="h-3.5 w-3.5" />
                Registrar Contato
              </Button>
              {whatsappUrl && (
                <Button size="sm" variant="outline" asChild className="gap-1.5">
                  <a href={whatsappUrl} target="_blank" rel="noopener noreferrer">
                    <MessageCircle className="h-3.5 w-3.5" />
                    WhatsApp
                  </a>
                </Button>
              )}
            </div>

            {/* Move Stage */}
            <div>
              <p className="text-xs font-medium text-muted-foreground mb-2">Mover para:</p>
              <div className="flex flex-wrap gap-1.5">
                {CRM_STAGES.filter(s => s.key !== lead.status).map(stage => (
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

            {/* Enrich form - only after first contact */}
            {showEnrich && (
              <>
                <LeadEnrichForm lead={lead} onUpdated={onLeadUpdated} />
                <Separator />
              </>
            )}

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
              Deseja mover o lead <strong>{lead?.client_name || lead?.cliente_nome}</strong> para <strong>{pendingMove?.label}</strong>?
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
    </>
  );
}
