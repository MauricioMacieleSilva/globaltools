
import { useEffect, useState } from 'react';
import { Clock, MessageCircle, Calendar } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { supabase } from '@/integrations/supabase/client';
import type { CRMLead } from '@/pages/CRM';

interface KanbanCardProps {
  lead: CRMLead;
  onDragStart: (e: React.DragEvent, leadId: string) => void;
  onClick: () => void;
  isDragging: boolean;
}

function getDaysInStage(updatedAt: string): number {
  return Math.floor((Date.now() - new Date(updatedAt).getTime()) / 86400000);
}

export function KanbanCard({ lead, onDragStart, onClick, isDragging }: KanbanCardProps) {
  const [lastActivity, setLastActivity] = useState<string | null>(null);
  const [nextVisitDate, setNextVisitDate] = useState<string | null>(null);
  const days = getDaysInStage(lead.updated_at);
  const name = lead.client_name || lead.cliente_nome;
  const phone = lead.contact_phone || lead.cliente_telefone;
  const whatsappUrl = phone ? `https://wa.me/55${phone.replace(/\D/g, '')}` : null;

  useEffect(() => {
    // Load last activity
    supabase
      .from('lead_activities')
      .select('description')
      .eq('lead_id', lead.id)
      .order('created_at', { ascending: false })
      .limit(1)
      .then(({ data }) => {
        if (data?.[0]) setLastActivity(data[0].description);
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
          <p className="text-[10px] text-muted-foreground truncate italic">{lastActivity}</p>
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
