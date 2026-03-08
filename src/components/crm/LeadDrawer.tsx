
import { useEffect, useState } from 'react';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Textarea } from '@/components/ui/textarea';
import { MessageCircle, Mail, Phone, Building2, Calendar, MapPin, FileText, Send, Clock, Edit2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { CRM_STAGES, type CRMLead, type CRMStageKey } from '@/pages/CRM';
import { useIsMobile } from '@/hooks/use-mobile';
import { LeadEnrichForm } from './LeadEnrichForm';
import { LeadEditDialog } from './LeadEditDialog';

interface LeadActivity {
  id: string;
  activity_type: string;
  description: string;
  created_at: string;
  sdr_name?: string;
}

interface LeadDrawerProps {
  lead: CRMLead | null;
  open: boolean;
  onClose: () => void;
  onStatusChange: (leadId: string, status: string) => void;
  onLeadUpdated: () => void;
}

export function LeadDrawer({ lead, open, onClose, onStatusChange, onLeadUpdated }: LeadDrawerProps) {
  const [activities, setActivities] = useState<LeadActivity[]>([]);
  const [newNote, setNewNote] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const { toast } = useToast();
  const isMobile = useIsMobile();

  useEffect(() => {
    if (lead?.id && open) {
      loadActivities(lead.id);
    }
  }, [lead?.id, open]);

  const loadActivities = async (leadId: string) => {
    const { data } = await supabase
      .from('lead_activities')
      .select('*')
      .eq('lead_id', leadId)
      .order('created_at', { ascending: false })
      .limit(20);
    setActivities((data as LeadActivity[]) || []);
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
      toast({ title: 'Nota adicionada' });
    } catch {
      toast({ title: 'Erro', description: 'Erro ao adicionar nota', variant: 'destructive' });
    } finally {
      setSubmitting(false);
    }
  };

  const registerContact = async () => {
    if (!lead) return;
    const already = await checkContactAlreadyToday(lead.id);
    if (already) {
      toast({ title: 'Contato já registrado hoje', description: 'Só é permitido um registro de contato por cliente por dia.', variant: 'destructive' });
      return;
    }
    try {
      const user = (await supabase.auth.getUser()).data.user;
      const { data: profile } = await supabase.from('user_profiles').select('full_name').eq('id', user?.id || '').single();
      await supabase.from('lead_activities').insert({
        lead_id: lead.id,
        activity_type: 'contato_inicial',
        description: 'Contato registrado',
        user_id: user?.id || '',
        sdr_name: profile?.full_name || 'Usuário',
      } as any);

      if (lead.status === 'lead') {
        onStatusChange(lead.id, 'contato_feito');
      }

      loadActivities(lead.id);
      toast({ title: 'Contato registrado' });
    } catch {
      toast({ title: 'Erro', variant: 'destructive' });
    }
  };

  if (!lead) return null;

  const name = lead.client_name || lead.cliente_nome;
  const phone = lead.contact_phone || lead.cliente_telefone;
  const email = lead.contact_email || lead.cliente_email;
  const whatsappUrl = phone ? `https://wa.me/55${phone.replace(/\D/g, '')}` : null;
  const currentStage = CRM_STAGES.find(s => s.key === lead.status);
  const showEnrich = lead.status !== 'lead'; // After first contact

  const getActivityIcon = (type: string) => {
    switch (type) {
      case 'contato_inicial': return <Phone className="h-3 w-3" />;
      case 'nota': return <FileText className="h-3 w-3" />;
      case 'encaminhamento': return <Send className="h-3 w-3" />;
      case 'visita': return <MapPin className="h-3 w-3" />;
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
                  <MapPin className="h-4 w-4 text-muted-foreground" />
                  <span>{lead.produto_interesse}</span>
                </div>
              )}
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Calendar className="h-4 w-4" />
                <span>Aberto em {new Date(lead.data_abertura).toLocaleDateString('pt-BR')}</span>
              </div>
            </div>

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
                    onClick={() => onStatusChange(lead.id, stage.key)}
                  >
                    <div className="w-2 h-2 rounded-full mr-1.5" style={{ backgroundColor: stage.color }} />
                    {stage.label}
                  </Button>
                ))}
                <Button
                  size="sm"
                  variant="outline"
                  className="text-xs h-7 text-warning border-warning/30"
                  onClick={() => onStatusChange(lead.id, 'perdido')}
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
                  {activities.map(activity => (
                    <div key={activity.id} className="flex gap-2">
                      <div className="mt-1 p-1 rounded bg-accent text-accent-foreground">
                        {getActivityIcon(activity.activity_type)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs text-foreground">{activity.description}</p>
                        <div className="flex items-center gap-2 mt-0.5">
                          <span className="text-[10px] text-muted-foreground">
                            {new Date(activity.created_at).toLocaleDateString('pt-BR')} {new Date(activity.created_at).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                          </span>
                          {activity.sdr_name && (
                            <span className="text-[10px] text-muted-foreground">• {activity.sdr_name}</span>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
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
    </>
  );
}
