
import { useEffect, useState } from 'react';
import { Clock, MessageCircle, Calendar, MapPin, Briefcase, Package } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import type { CRMLead } from '@/pages/CRM';
import { OrderDetailDialog } from './OrderDetailDialog';

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
  const [orderDialogOpen, setOrderDialogOpen] = useState(false);
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

  const vendorName = lead.vendedor?.full_name || null;
  const vendorAvatar = lead.vendedor?.avatar_url || null;
  const vendorInitials = vendorName ? vendorName.split(' ').map(n => n[0]).slice(0, 2).join('').toUpperCase() : '';

  useEffect(() => {
    let cancelled = false;
    setNextVisit(null);
    import('@/integrations/supabase/client').then(({ supabase }) => {
      (supabase as any)
        .from('crm_visits')
        .select('visit_date, location')
        .eq('lead_id', lead.id)
        .gte('visit_date', new Date().toISOString())
        .order('visit_date', { ascending: true })
        .limit(1)
        .then(({ data }: any) => {
          if (!cancelled) {
            setNextVisit(data?.[0] ? { date: data[0].visit_date, location: data[0].location } : null);
          }
        });
    });
    return () => { cancelled = true; };
  }, [lead.id, lead.updated_at]);

  return (
    <Card
      draggable
      onDragStart={(e) => onDragStart(e, lead.id)}
      onClick={onClick}
      className={`p-3 cursor-pointer hover:shadow-md transition-all select-none ${isDragging ? 'opacity-40 scale-95' : ''}`}
    >
      <div className="space-y-1.5">
        {/* Header: empresa + whatsapp */}
        <div className="flex items-start justify-between gap-1">
          <h4 className="text-sm font-semibold text-foreground leading-tight line-clamp-2">{lead.empresa || name}</h4>
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

        {/* Contact name */}
        {(lead.empresa ? name : null) && (
          <p className="text-xs text-muted-foreground truncate">{name}</p>
        )}

        {/* Client info */}
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

        {/* Order/Budget number & value */}
        {lead.budget_number && (
          <div
            className="flex items-center gap-1 text-[10px] font-medium text-primary cursor-pointer hover:underline"
            onClick={(e) => {
              e.stopPropagation();
              setOrderDialogOpen(true);
            }}
          >
            <Package className="h-3 w-3 shrink-0" />
            <span>Pedido {lead.budget_number}</span>
            {lead.valor_estimado != null && lead.valor_estimado > 0 && (
              <span className="font-semibold text-foreground">— R$ {lead.valor_estimado.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
            )}
          </div>
        )}


        {/* Products + days */}
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

        {/* Vendor - separated at bottom, discrete */}
        {vendorName && (
          <div className="flex items-center gap-1.5 pt-1 border-t border-border/50">
            <Avatar className="h-4 w-4">
              <AvatarImage src={vendorAvatar || undefined} alt={vendorName} />
              <AvatarFallback className="text-[7px] bg-muted text-muted-foreground">{vendorInitials}</AvatarFallback>
            </Avatar>
            <span className="text-[10px] text-muted-foreground/70 truncate">{vendorName}</span>
          </div>
        )}
      </div>

      {/* Order detail popup */}
      {lead.budget_number && (
        <OrderDetailDialog
          open={orderDialogOpen}
          onClose={() => setOrderDialogOpen(false)}
          budgetNumber={lead.budget_number}
          clientName={lead.empresa || lead.cliente_nome || lead.client_name}
        />
      )}
    </Card>
  );
}
