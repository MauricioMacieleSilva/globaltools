
import { DollarSign, Clock, MessageCircle } from 'lucide-react';
import { Card } from '@/components/ui/card';
import type { CRMLead } from '@/pages/CRM';

interface KanbanCardProps {
  lead: CRMLead;
  onDragStart: (e: React.DragEvent, leadId: string) => void;
  onClick: () => void;
  isDragging: boolean;
}

function getDaysInStage(updatedAt: string): number {
  const updated = new Date(updatedAt);
  const now = new Date();
  return Math.floor((now.getTime() - updated.getTime()) / (1000 * 60 * 60 * 24));
}

export function KanbanCard({ lead, onDragStart, onClick, isDragging }: KanbanCardProps) {
  const days = getDaysInStage(lead.updated_at);
  const name = lead.client_name || lead.cliente_nome;
  const phone = lead.contact_phone || lead.cliente_telefone;
  const whatsappUrl = phone ? `https://wa.me/55${phone.replace(/\D/g, '')}` : null;

  return (
    <Card
      draggable
      onDragStart={(e) => onDragStart(e, lead.id)}
      onClick={onClick}
      className={`p-3 cursor-pointer hover:shadow-md transition-all select-none ${isDragging ? 'opacity-40 scale-95' : ''}`}
    >
      <div className="space-y-2">
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

        <div className="flex items-center justify-between text-xs">
          {lead.valor_estimado ? (
            <span className="flex items-center gap-1 text-foreground font-medium">
              <DollarSign className="h-3 w-3" />
              {lead.valor_estimado.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', minimumFractionDigits: 0 })}
            </span>
          ) : (
            <span className="text-muted-foreground">Sem valor</span>
          )}
          <span className="flex items-center gap-1 text-muted-foreground">
            <Clock className="h-3 w-3" />
            {days}d
          </span>
        </div>

        {lead.produto_interesse && (
          <span className="inline-block text-[10px] px-1.5 py-0.5 rounded bg-accent text-accent-foreground truncate max-w-full">
            {lead.produto_interesse}
          </span>
        )}
      </div>
    </Card>
  );
}
