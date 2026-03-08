
import { useEffect, useState } from 'react';
import { Clock, MessageCircle, Calendar, MapPin, Briefcase, Package } from 'lucide-react';
import { Card } from '@/components/ui/card';
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
  const [nextVisit, setNextVisit] = useState<{ date: string; location?: string } | null>(null);
  const days = getDaysInStage(lead.updated_at);
  const name = lead.client_name || lead.cliente_nome;
  const phone = lead.contact_phone || lead.cliente_telefone;
  const whatsappUrl = phone ? `https://wa.me/55${phone.replace(/\D/g, '')}` : null;

  const produtos = lead.produto_interesse
    ? lead.produto_interesse.split(',').map(p => p.trim()).filter(Boolean)
    : [];

  const localidade = lead.cidade && lead.estado
    ? `${lead.cidade}/${lead.estado}`
    : lead.cidade || lead.estado || null;

  useEffect(() => {
    import('@/integrations/supabase/client').then(({ supabase }) => {
      (supabase as any)
        .from('crm_visits')
        .select('visit_date, location')
        .eq('lead_id', lead.id)
        .gte('visit_date', new Date().toISOString())
        .order('visit_date', { ascending: true })
        .limit(1)
        .then(({ data }: any) => {
          if (data?.[0]) setNextVisit({ date: data[0].visit_date, location: data[0].location });
        });
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

        {/* Enrichment info */}
        {lead.ramo_atuacao && (
          <p className="text-[10px] text-muted-foreground flex items-center gap-1 truncate">
            <Briefcase className="h-3 w-3 shrink-0" />
            {lead.ramo_atuacao}
          </p>
        )}

        {localidade && (
          <p className="text-[10px] text-muted-foreground flex items-center gap-1 truncate">
            <MapPin className="h-3 w-3 shrink-0" />
            {localidade}
          </p>
        )}

        {nextVisit && (
          <p className="text-[10px] text-primary flex items-center gap-1 font-medium truncate">
            <Calendar className="h-3 w-3 shrink-0" />
            {new Date(nextVisit.date).toLocaleDateString('pt-BR')} {new Date(nextVisit.date).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}{nextVisit.location ? ` · ${nextVisit.location}` : ''}
          </p>
        )}

        <div className="flex items-center justify-between gap-1">
          <div className="flex flex-wrap gap-1 flex-1 min-w-0">
            {produtos.length > 0 ? (
              produtos.map((p, i) => (
                <span key={i} className="inline-block text-[10px] px-1.5 py-0.5 rounded bg-accent text-accent-foreground truncate max-w-[90px]">
                  {p}
                </span>
              ))
            ) : (
              <span />
            )}
          </div>
          <span className="flex items-center gap-1 text-muted-foreground text-xs shrink-0">
            <Clock className="h-3 w-3" />
            {days}d
          </span>
        </div>
      </div>
    </Card>
  );
}
