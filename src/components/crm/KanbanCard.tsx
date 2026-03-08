
import { useEffect, useState } from 'react';
import { Clock, MessageCircle, Calendar } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { supabase } from '@/integrations/supabase/client';
import type { CRMLead } from '@/pages/CRM';

interface KanbanCardProps {
  lead: CRMLead;
  onDragStart: (e: React.DragEvent, leadId: string) => void;
  onClick: () => void;
  isDragging: boolean;
}

interface LastActivityInfo {
  description: string;
  sdr_name?: string;
  user_id?: string;
  avatar_url?: string | null;
}

function getDaysInStage(updatedAt: string): number {
  return Math.floor((Date.now() - new Date(updatedAt).getTime()) / 86400000);
}

export function KanbanCard({ lead, onDragStart, onClick, isDragging }: KanbanCardProps) {
  const [lastActivity, setLastActivity] = useState<LastActivityInfo | null>(null);
  const [nextVisitDate, setNextVisitDate] = useState<string | null>(null);
  const days = getDaysInStage(lead.updated_at);
  const name = lead.client_name || lead.cliente_nome;
  const phone = lead.contact_phone || lead.cliente_telefone;
  const whatsappUrl = phone ? `https://wa.me/55${phone.replace(/\D/g, '')}` : null;

  useEffect(() => {
    // Load last activity with user info
    supabase
      .from('lead_activities')
      .select('description, sdr_name, user_id')
      .eq('lead_id', lead.id)
      .order('created_at', { ascending: false })
      .limit(1)
      .then(async ({ data }) => {
        if (data?.[0]) {
          const act = data[0] as any;
          let avatar_url: string | null = null;
          if (act.user_id) {
            const { data: profile } = await supabase
              .from('user_profiles')
              .select('avatar_url, full_name')
              .eq('id', act.user_id)
              .single();
            if (profile) {
              avatar_url = profile.avatar_url;
              if (!act.sdr_name) act.sdr_name = profile.full_name;
            }
          }
          setLastActivity({ description: act.description, sdr_name: act.sdr_name, user_id: act.user_id, avatar_url });
        }
      });

    // Load next visit
    (supabase as any)
      .from('crm_visits')
      .select('visit_date')
      .eq('lead_id', lead.id)
      .gte('visit_date', new Date().toISOString())
      .order('visit_date', { ascending: true })
      .limit(1)
      .then(({ data }: any) => {
        if (data?.[0]) setNextVisitDate(data[0].visit_date);
      });
  }, [lead.id, lead.updated_at]);

  const initials = lastActivity?.sdr_name?.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2) || 'U';

  return (
    <Card
      draggable
      onDragStart={(e) => onDragStart(e, lead.id)}
      onClick={onClick}
      className={`p-3 cursor-pointer hover:shadow-md transition-all select-none ${isDragging ? 'opacity-40 scale-95' : ''}`}
    >
      <div className="space-y-1.5">
        <div className="flex items-start justify-between gap-1">
          <h4 className="text-sm font-semibold text-foreground leading-tight line-clamp-2">{name}</h4>
          {whatsappUrl && (
            <a
              href={whatsappUrl}
              target="_blank"
              rel="noopener noreferrer"
              onClick={(e) => e.stopPropagation()}
              className="shrink-0 p-1 rounded-md hover:bg-accent transition-colors"
              title="WhatsApp"
            >
              <MessageCircle className="h-3.5 w-3.5 text-success" />
            </a>
          )}
        </div>

        {lead.empresa && (
          <p className="text-xs text-muted-foreground truncate">{lead.empresa}</p>
        )}

        {lastActivity && (
          <div className="flex items-center gap-1.5">
            <Avatar className="h-4 w-4">
              <AvatarImage src={lastActivity.avatar_url || undefined} alt={lastActivity.sdr_name || ''} />
              <AvatarFallback className="bg-primary text-primary-foreground text-[6px]">
                {initials}
              </AvatarFallback>
            </Avatar>
            <p className="text-[10px] text-muted-foreground truncate italic flex-1">
              {lastActivity.sdr_name && <span className="font-medium not-italic">{lastActivity.sdr_name.split(' ')[0]}: </span>}
              {lastActivity.description}
            </p>
          </div>
        )}

        {nextVisitDate && (
          <p className="text-[10px] text-primary flex items-center gap-1 font-medium">
            <Calendar className="h-3 w-3" />
            Visita: {new Date(nextVisitDate).toLocaleDateString('pt-BR')}
          </p>
        )}

        <div className="flex items-center justify-between text-xs">
          {lead.produto_interesse ? (
            <span className="inline-block text-[10px] px-1.5 py-0.5 rounded bg-accent text-accent-foreground truncate max-w-[60%]">
              {lead.produto_interesse}
            </span>
          ) : (
            <span />
          )}
          <span className="flex items-center gap-1 text-muted-foreground">
            <Clock className="h-3 w-3" />
            {days}d
          </span>
        </div>
      </div>
    </Card>
  );
}
