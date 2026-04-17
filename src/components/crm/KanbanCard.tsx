
import { useEffect, useState } from 'react';
import { Clock, MessageCircle, Calendar, MapPin, Briefcase, Package, CheckCircle2, AlertCircle, CreditCard, PhoneMissed, ArrowRightLeft, ShieldCheck, Ban } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import type { CRMLead } from '@/pages/CRM';
import { OrderDetailDialog } from './OrderDetailDialog';
import { isBlockedLossReason, getBlockedReasonLabel } from '@/lib/lead-blocked-reasons';
import instagramLogo from '@/assets/instagram-logo.png';

/** Converte texto para Title Case, independente do formato original */
function toTitleCase(str: string): string {
  if (!str) return str;
  return str
    .toLowerCase()
    .replace(/(^|\s|\/|-)\S/g, (match) => match.toUpperCase());
}

interface KanbanCardProps {
  lead: CRMLead;
  onDragStart: (e: React.DragEvent, leadId: string) => void;
  onClick: () => void;
  isDragging: boolean;
}

function getDaysInStage(updatedAt: string): number {
  return Math.floor((Date.now() - new Date(updatedAt).getTime()) / 86400000);
}

function getAgingColor(days: number): string {
  if (days <= 2) return 'border-l-primary';
  if (days <= 5) return 'border-l-amber-500';
  if (days <= 9) return 'border-l-orange-600';
  return 'border-l-purple-600';
}

export function KanbanCard({ lead, onDragStart, onClick, isDragging }: KanbanCardProps) {
  const [nextVisit, setNextVisit] = useState<{ date: string; location?: string } | null>(null);
  const [orderDialogOpen, setOrderDialogOpen] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<string | null>(null);
  const [financeParecer, setFinanceParecer] = useState<string | null>(null);
  const [failedAttempts, setFailedAttempts] = useState(0);
  const [isInAnalysis, setIsInAnalysis] = useState(false);
  const [blockedReason, setBlockedReason] = useState<string | null>(null);
  const days = getDaysInStage(lead.updated_at);
  const name = lead.empresa || lead.client_name || lead.cliente_nome;
  const phone = lead.contact_phone || lead.cliente_telefone;
  const whatsappUrl = phone ? `https://wa.me/55${phone.replace(/\D/g, '')}` : null;

  // SDR badge: read directly from persisted lead data — instant, no async
  const handoffBy = lead.handoff_sdr_name || null;
  const bastaoAndBeyond = ['passagem_bastao', 'oportunidade', 'visita_reuniao', 'proposta', 'pedido_fechado'];
  const showHandoff = !!handoffBy && bastaoAndBeyond.includes(lead.status);

  const isTrafegoPage = ((lead.source && lead.source.toLowerCase().replace(/[áàã]/g, 'a').includes('trafego pago')) || (lead.origem && lead.origem.toLowerCase().replace(/[áàã]/g, 'a').includes('trafego pago')));

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
    setFinanceParecer(null);
    setFailedAttempts(0);
    setIsInAnalysis(false);
    import('@/integrations/supabase/client').then(({ supabase }) => {
      // Fetch next visit
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

      // Fetch financial parecer directly from leads table
      (supabase as any)
        .from('leads')
        .select('finance_parecer')
        .eq('id', lead.id)
        .maybeSingle()
        .then(({ data }: any) => {
          if (!cancelled && data?.finance_parecer) {
            setFinanceParecer(data.finance_parecer);
          }
        });

      // Fetch failed contact attempts count - scoped to AFTER the last stage transition
      (supabase as any)
        .from('lead_activities')
        .select('created_at')
        .eq('lead_id', lead.id)
        .eq('activity_type', 'mudanca_status')
        .order('created_at', { ascending: false })
        .limit(1)
        .then(({ data: moveData }: any) => {
          if (cancelled) return;
          const sinceDate = moveData?.[0]?.created_at || null;
          let query = (supabase as any)
            .from('lead_activities')
            .select('id', { count: 'exact', head: true })
            .eq('lead_id', lead.id)
            .eq('activity_type', 'contato_sem_sucesso');
          if (sinceDate) {
            query = query.gt('created_at', sinceDate);
          }
          query.then(({ count }: any) => {
            if (!cancelled) setFailedAttempts(count || 0);
          });
        });

      // Check if lead is currently in financial analysis (status = analise_financeira)
      if (lead.status === 'analise_financeira') {
        setIsInAnalysis(true);
      } else {
        // Check if there's a pending analysis (sent but no parecer yet)
        (supabase as any)
          .from('lead_activities')
          .select('id')
          .eq('lead_id', lead.id)
          .eq('activity_type', 'nota')
          .ilike('description', '%Enviado para Análise Financeira%')
          .order('created_at', { ascending: false })
          .limit(1)
          .then(({ data: sentData }: any) => {
            if (!cancelled && sentData?.length > 0) {
              (supabase as any)
                .from('leads')
                .select('finance_parecer')
                .eq('id', lead.id)
                .maybeSingle()
                .then(({ data: fp }: any) => {
                  if (!cancelled && !fp?.finance_parecer) {
                    setIsInAnalysis(true);
                  }
                });
            }
          });
      }
    });
    return () => { cancelled = true; };
  }, [lead.id, lead.updated_at, lead.status]);

  return (
    <Card
      draggable
      onDragStart={(e) => onDragStart(e, lead.id)}
      onClick={onClick}
      className={`p-2 cursor-pointer hover:shadow-md transition-all select-none border-l-[3px] ${getAgingColor(days)} ${isDragging ? 'opacity-40 scale-95' : ''}`}
    >
      <div className="space-y-1">
        {/* Header: empresa + whatsapp */}
        <div className="flex items-start justify-between gap-1">
          <div className="flex items-center gap-1 min-w-0">
            <h4 className="text-xs font-semibold text-foreground leading-tight line-clamp-1">{toTitleCase(lead.empresa || name || '')}</h4>
            {isTrafegoPage && (
              <img src={instagramLogo} alt="Tráfego Pago" className="h-3.5 w-3.5 shrink-0" title="Tráfego Pago" />
            )}
          </div>
          {whatsappUrl && (
            <a
              href={whatsappUrl}
              target="_blank"
              rel="noopener noreferrer"
              onClick={(e) => e.stopPropagation()}
              className="shrink-0 p-0.5 rounded hover:bg-accent transition-colors"
              title="WhatsApp"
            >
              <MessageCircle className="h-3 w-3 text-success" />
            </a>
          )}
        </div>

        {/* Financial analysis badge */}
        {financeParecer && (
          <div className="flex">
            {financeParecer === 'aprovado' && (
              <Badge variant="outline" className="text-[9px] px-1.5 py-0 h-4 gap-0.5 border-emerald-300 bg-emerald-50 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-400 dark:border-emerald-800">
                <CheckCircle2 className="h-2.5 w-2.5" />
                Aprovado
              </Badge>
            )}
            {financeParecer === 'precisa_info' && (
              <Badge variant="outline" className="text-[9px] px-1.5 py-0 h-4 gap-0.5 border-amber-300 bg-amber-50 text-amber-700 dark:bg-amber-950/30 dark:text-amber-400 dark:border-amber-800">
                <AlertCircle className="h-2.5 w-2.5" />
                Mais informações
              </Badge>
            )}
            {financeParecer === 'pagamento_antecipado' && (
              <Badge variant="outline" className="text-[9px] px-1.5 py-0 h-4 gap-0.5 border-blue-300 bg-blue-50 text-blue-700 dark:bg-blue-950/30 dark:text-blue-400 dark:border-blue-800">
                <CreditCard className="h-2.5 w-2.5" />
                Pgto. Antecipado
              </Badge>
            )}
          </div>
        )}

        {/* In analysis badge (no parecer yet) */}
        {isInAnalysis && !financeParecer && (
          <div className="flex">
            <Badge variant="outline" className="text-[9px] px-1.5 py-0 h-4 gap-0.5 border-indigo-300 bg-indigo-50 text-indigo-700 dark:bg-indigo-950/30 dark:text-indigo-400 dark:border-indigo-800">
              <ShieldCheck className="h-2.5 w-2.5" />
              Em Análise de Crédito
            </Badge>
          </div>
        )}

        {/* Handoff badge - SDR who made first contact (instant from persisted data) */}
        {showHandoff && (
          <div className="flex">
            <Badge variant="outline" className="text-[9px] px-1.5 py-0 h-4 gap-0.5 border-blue-300 bg-blue-50 text-blue-700 dark:bg-blue-950/30 dark:text-blue-400 dark:border-blue-800">
              <ArrowRightLeft className="h-2.5 w-2.5" />
              Bastão: {handoffBy!.split(' ')[0]}
            </Badge>
          </div>
        )}

        {failedAttempts > 0 && (
          <div className="flex">
            <Badge variant="outline" className="text-[9px] px-1.5 py-0 h-4 gap-0.5 border-destructive/30 bg-destructive/5 text-destructive">
              <PhoneMissed className="h-2.5 w-2.5" />
              {failedAttempts} tentativa{failedAttempts > 1 ? 's' : ''} sem sucesso
            </Badge>
          </div>
        )}

        {/* Ramo + Localidade + Origem inline */}
        {(lead.ramo_atuacao || localidade) && (
          <div className="flex items-center gap-2 text-[10px] text-muted-foreground truncate">
            {lead.ramo_atuacao && (
              <span className="flex items-center gap-0.5 truncate">
                <Briefcase className="h-2.5 w-2.5 shrink-0" />
                {toTitleCase(lead.ramo_atuacao)}
              </span>
            )}
            {localidade && (
              <span className="flex items-center gap-0.5 truncate">
                <MapPin className="h-2.5 w-2.5 shrink-0" />
                {toTitleCase(localidade)}
              </span>
            )}
          </div>
        )}

        {nextVisit && (
          <p className="text-[10px] text-primary flex items-center gap-0.5 font-medium truncate">
            <Calendar className="h-2.5 w-2.5 shrink-0" />
            {new Date(nextVisit.date).toLocaleDateString('pt-BR')} {new Date(nextVisit.date).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}{nextVisit.location ? ` · ${nextVisit.location}` : ''}
          </p>
        )}

        {/* Orders inline + value */}
        {lead.budget_number && (() => {
          const orders = lead.budget_number.split(',').map(s => s.trim()).filter(Boolean);
          return (
            <div className="flex items-center gap-2 flex-wrap text-[10px]">
              {orders.map((orderNum, idx) => (
                <span
                  key={idx}
                  className="font-medium text-primary cursor-pointer hover:underline flex items-center gap-0.5"
                  onClick={(e) => {
                    e.stopPropagation();
                    setSelectedOrder(orderNum);
                    setOrderDialogOpen(true);
                  }}
                >
                  <Package className="h-2.5 w-2.5 shrink-0" />
                  {orderNum}
                </span>
              ))}
              {lead.valor_estimado != null && lead.valor_estimado > 0 && (
                <span className="font-semibold text-foreground">
                  R$ {lead.valor_estimado.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                </span>
              )}
            </div>
          );
        })()}

        {/* Products + days */}
        <div className="flex items-center justify-between gap-1">
          <div className="flex flex-wrap gap-0.5 flex-1 min-w-0">
            {produtos.length > 0 && produtos.map((p, i) => (
              <span key={i} className="inline-block text-[9px] px-1 py-0.5 rounded bg-accent text-accent-foreground truncate max-w-[80px]">
                {toTitleCase(p)}
              </span>
            ))}
          </div>
          <span className="flex items-center gap-0.5 text-muted-foreground text-[10px] shrink-0">
            <Clock className="h-2.5 w-2.5" />
            {days}d
          </span>
        </div>

        {/* Vendor */}
        {vendorName && (
          <div className="flex items-center gap-1 pt-0.5 border-t border-border/40">
            <Avatar className="h-3.5 w-3.5">
              <AvatarImage src={vendorAvatar || undefined} alt={vendorName} />
              <AvatarFallback className="text-[6px] bg-muted text-muted-foreground">{vendorInitials}</AvatarFallback>
            </Avatar>
            <span className="text-[9px] text-muted-foreground/70 truncate">{toTitleCase(vendorName)}</span>
          </div>
        )}
      </div>

      {/* Order detail popup */}
      {selectedOrder && (
        <OrderDetailDialog
          open={orderDialogOpen}
          onClose={() => { setOrderDialogOpen(false); setSelectedOrder(null); }}
          budgetNumber={selectedOrder}
          clientName={lead.empresa || lead.cliente_nome || lead.client_name}
          linkedClientName={((lead as any).linked_orders_meta || {})[selectedOrder] || undefined}
        />
      )}
    </Card>
  );
}
