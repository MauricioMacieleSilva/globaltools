import { useEffect, useState, useMemo, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Calendar as CalendarIcon, MapPin, Clock, ChevronLeft, ChevronRight, Pencil } from 'lucide-react';
import {
  format, isToday, isBefore, startOfDay, isSameMonth, isSameDay,
  startOfMonth, endOfMonth, startOfWeek, endOfWeek, addDays, addMonths, subMonths, addWeeks, subWeeks
} from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { useIsMobile } from '@/hooks/use-mobile';
import { VisitEditDialog } from './VisitEditDialog';
import { FollowUpEditDialog } from './FollowUpEditDialog';
import type { CRMLead } from '@/pages/CRM';

interface Visit {
  id: string;
  lead_id: string;
  visit_date: string;
  location: string | null;
  notes: string | null;
  lead_name?: string;
  lead_search?: string;
  lead_status?: string;
  type: 'visit' | 'followup';
  followup_tipo?: string;
  followup_titulo?: string;
}

interface VisitCalendarProps {
  onLeadClick: (lead: CRMLead) => void;
  leads: CRMLead[];
  searchQuery?: string;
  vendorFilter?: string;
}

const WEEKDAYS = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];

export function VisitCalendar({ onLeadClick, leads, searchQuery = '', vendorFilter = 'all' }: VisitCalendarProps) {
  const [visits, setVisits] = useState<Visit[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [viewMode, setViewMode] = useState<'month' | 'week'>('month');
  const [selectedDayVisits, setSelectedDayVisits] = useState<{ date: Date; visits: Visit[] } | null>(null);
  const [editingVisit, setEditingVisit] = useState<Visit | null>(null);
  const [editingFollowUp, setEditingFollowUp] = useState<Visit | null>(null);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const isMobile = useIsMobile();
  const hasAutoConcludedRef = useRef(false);

  // Build O(1) lookup for lead enrichment (avoids O(n*m) .find per visit)
  const leadsById = useMemo(() => {
    const m = new Map<string, CRMLead>();
    leads.forEach(l => m.set(l.id, l));
    return m;
  }, [leads]);

  useEffect(() => {
    const init = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      setCurrentUserId(user.id);
    };
    init();
  }, []);

  useEffect(() => {
    if (currentUserId) loadVisits();
    // Intentionally do NOT depend on `leads` — enrichment uses leadsById memo.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [vendorFilter, currentUserId]);

  const loadVisits = async () => {
    const cutoff = new Date(Date.now() - 90 * 86400000).toISOString();
    const nowIso = new Date().toISOString();

    // Auto-conclude past follow-ups: run once per session, fire-and-forget,
    // so it never blocks the agenda from rendering.
    if (!hasAutoConcludedRef.current) {
      hasAutoConcludedRef.current = true;
      (supabase as any)
        .from('follow_ups')
        .update({ concluido: true, updated_at: nowIso })
        .eq('concluido', false)
        .not('lead_id', 'is', null)
        .lt('data_agendada', nowIso)
        .then(() => {}, (e: any) => console.warn('Auto-conclude past follow-ups failed:', e));
    }

    try {
      let visitsQuery = (supabase as any).from('crm_visits').select('*').gte('visit_date', cutoff).order('visit_date', { ascending: true });
      let followupsQuery = (supabase as any).from('follow_ups').select('*').not('lead_id', 'is', null).eq('concluido', false).gte('data_agendada', nowIso).order('data_agendada', { ascending: true });

      const filterUserId = vendorFilter !== 'all' ? vendorFilter : null;
      if (filterUserId) {
        visitsQuery = visitsQuery.eq('user_id', filterUserId);
        followupsQuery = followupsQuery.eq('user_id', filterUserId);
      }

      const [visitsRes, followupsRes] = await Promise.all([visitsQuery, followupsQuery]);

      // Store raw rows; enrichment happens in a memo so it stays cheap when
      // `leads` updates without triggering a refetch.
      const rawVisits: Visit[] = (visitsRes.data || []).map((v: any) => ({
        ...v, type: 'visit' as const,
      }));
      const rawFollowups: Visit[] = (followupsRes.data || []).map((f: any) => ({
        id: f.id, lead_id: f.lead_id, visit_date: f.data_agendada,
        location: null, notes: f.descricao,
        type: 'followup' as const, followup_tipo: f.tipo, followup_titulo: f.titulo,
      }));
      const all = [...rawVisits, ...rawFollowups].sort(
        (a, b) => new Date(a.visit_date).getTime() - new Date(b.visit_date).getTime()
      );
      setVisits(all);
    } catch (e) {
      console.error('Erro ao carregar agenda:', e);
    } finally {
      setLoading(false);
    }
  };

  const handleEditClick = (e: React.MouseEvent, visit: Visit) => {
    e.stopPropagation();
    if (visit.type === 'followup') {
      setEditingFollowUp(visit);
    } else {
      setEditingVisit(visit);
    }
  };

  const handleVisitUpdated = () => {
    loadVisits();
    if (selectedDayVisits) setSelectedDayVisits(null);
  };

  // Group by date, filter by searchQuery
  const filteredVisits = useMemo(() => {
    // Enrich with lead info via O(1) map lookup
    const enriched = visits.map(v => {
      const lead = v.lead_id ? leadsById.get(v.lead_id) : undefined;
      const displayName = lead?.empresa || lead?.client_name || lead?.cliente_nome || 'Lead';
      const search = [lead?.empresa, lead?.client_name, lead?.cliente_nome, lead?.contact_name, lead?.cliente_telefone, lead?.contact_phone]
        .filter(Boolean).join(' ').toLowerCase();
      return { ...v, lead_name: displayName, lead_search: search, lead_status: lead?.status };
    });
    if (!searchQuery) return enriched;
    const q = searchQuery.toLowerCase();
    return enriched.filter(v =>
      v.lead_name?.toLowerCase().includes(q) ||
      v.lead_search?.includes(q)
    );
  }, [visits, searchQuery, leadsById]);

  const grouped: Record<string, Visit[]> = {};
  filteredVisits.forEach(v => {
    const key = format(new Date(v.visit_date), 'yyyy-MM-dd');
    if (!grouped[key]) grouped[key] = [];
    grouped[key].push(v);
  });

  const sortedDates = Object.keys(grouped).sort();

  const calendarDays = useMemo(() => {
    if (viewMode === 'week') {
      const wStart = startOfWeek(currentMonth, { locale: ptBR });
      const wEnd = endOfWeek(currentMonth, { locale: ptBR });
      const days: Date[] = [];
      let d = wStart;
      while (d <= wEnd) { days.push(d); d = addDays(d, 1); }
      return days;
    }
    const monthStart = startOfMonth(currentMonth);
    const monthEnd = endOfMonth(currentMonth);
    const calStart = startOfWeek(monthStart, { locale: ptBR });
    const calEnd = endOfWeek(monthEnd, { locale: ptBR });
    const days: Date[] = [];
    let day = calStart;
    while (day <= calEnd) { days.push(day); day = addDays(day, 1); }
    return days;
  }, [currentMonth, viewMode]);

  const getVisitsForDay = (date: Date): Visit[] => grouped[format(date, 'yyyy-MM-dd')] || [];

  const handleDayClick = (date: Date) => {
    const dayVisits = getVisitsForDay(date);
    if (dayVisits.length > 0) setSelectedDayVisits({ date, visits: dayVisits });
  };

  const goPrev = () => setCurrentMonth(viewMode === 'week' ? subWeeks(currentMonth, 1) : subMonths(currentMonth, 1));
  const goNext = () => setCurrentMonth(viewMode === 'week' ? addWeeks(currentMonth, 1) : addMonths(currentMonth, 1));

  const headerLabel = useMemo(() => {
    if (viewMode === 'week') {
      const wStart = startOfWeek(currentMonth, { locale: ptBR });
      const wEnd = endOfWeek(currentMonth, { locale: ptBR });
      const sameMonth = isSameMonth(wStart, wEnd);
      if (sameMonth) {
        return `${format(wStart, 'd', { locale: ptBR })} – ${format(wEnd, "d 'de' MMMM 'de' yyyy", { locale: ptBR })}`;
      }
      return `${format(wStart, "d 'de' MMM", { locale: ptBR })} – ${format(wEnd, "d 'de' MMM 'de' yyyy", { locale: ptBR })}`;
    }
    return format(currentMonth, "MMMM 'de' yyyy", { locale: ptBR });
  }, [currentMonth, viewMode]);

  if (loading) return <p className="text-sm text-muted-foreground text-center py-8">Carregando agenda...</p>;

  const VisitCard = ({ visit, showEdit = true }: { visit: Visit; showEdit?: boolean }) => {
    const lead = leads.find(l => l.id === visit.lead_id);
    const today = isToday(new Date(visit.visit_date));
    const isFollowup = visit.type === 'followup';
    return (
      <Card
        className={cn('p-3 cursor-pointer hover:shadow-md transition-shadow', today && 'border-primary/30', isFollowup && 'border-l-4 border-l-amber-500')}
        onClick={() => lead && onLeadClick(lead)}
      >
        <div className="flex items-start justify-between gap-2">
          <div className="space-y-1 min-w-0">
            <div className="flex items-center gap-1.5">
              {isFollowup && (
                <Badge variant="outline" className="text-[10px] h-4 bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950 dark:text-amber-300 dark:border-amber-800">
                  Follow-up
                </Badge>
              )}
              <p className="text-sm font-semibold text-foreground truncate">{visit.lead_name}</p>
            </div>
            {isFollowup && visit.followup_titulo && (
              <p className="text-xs text-muted-foreground truncate">{visit.followup_titulo}</p>
            )}
            {visit.location && (
              <p className="text-xs text-muted-foreground flex items-center gap-1">
                <MapPin className="h-3 w-3 shrink-0" /> {visit.location}
              </p>
            )}
            {visit.notes && <p className="text-xs text-muted-foreground truncate">{visit.notes}</p>}
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <div className="flex items-center gap-1 text-xs text-muted-foreground">
              <Clock className="h-3 w-3" />
              {format(new Date(visit.visit_date), 'HH:mm')}
            </div>
            {showEdit && (
              <Button variant="ghost" size="icon" className="h-7 w-7" onClick={(e) => handleEditClick(e, visit)} title={isFollowup ? 'Editar follow-up' : 'Editar visita'}>
                <Pencil className="h-3.5 w-3.5 text-muted-foreground" />
              </Button>
            )}
          </div>
        </div>
      </Card>
    );
  };

  return (
    <div className={cn('space-y-3', viewMode === 'week' && 'flex flex-col h-[calc(100vh-220px)] min-h-[500px]')}>
      {/* Always show calendar */}
        <div className={cn('space-y-3', viewMode === 'week' && 'flex flex-col flex-1 min-h-0')}>
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <Button variant="ghost" size="sm" onClick={goPrev}><ChevronLeft className="h-4 w-4" /></Button>
            <h3 className="text-base font-bold text-foreground capitalize flex-1 text-center">{headerLabel}</h3>
            <div className="flex items-center gap-1">
              <div className="flex rounded-md border border-border overflow-hidden mr-1">
                <Button
                  variant={viewMode === 'month' ? 'default' : 'ghost'}
                  size="sm"
                  className="text-xs h-7 rounded-none px-2"
                  onClick={() => setViewMode('month')}
                >
                  Mês
                </Button>
                <Button
                  variant={viewMode === 'week' ? 'default' : 'ghost'}
                  size="sm"
                  className="text-xs h-7 rounded-none px-2"
                  onClick={() => setViewMode('week')}
                >
                  Semana
                </Button>
              </div>
              <Button variant="outline" size="sm" className="text-xs h-7" onClick={() => setCurrentMonth(new Date())}>Hoje</Button>
              <Button variant="ghost" size="sm" onClick={goNext}><ChevronRight className="h-4 w-4" /></Button>
            </div>
          </div>

          <div className="grid grid-cols-7 border-b border-border">
            {WEEKDAYS.map(day => (
              <div key={day} className="py-2 text-center text-xs font-semibold text-muted-foreground uppercase tracking-wide">{day}</div>
            ))}
          </div>

          <div className={cn(
            'grid grid-cols-7 border-l border-border',
            viewMode === 'week' && 'flex-1 min-h-0 auto-rows-fr overflow-auto'
          )}>
            {calendarDays.map((day, idx) => {
              const dayVisits = getVisitsForDay(day);
              const today = isToday(day);
              const inMonth = viewMode === 'week' ? true : isSameMonth(day, currentMonth);
              const past = isBefore(day, startOfDay(new Date())) && !today;
              const maxShow = isMobile ? 1 : (viewMode === 'week' ? 20 : 3);

              return (
                <div
                  key={idx}
                  className={cn(
                    'border-r border-b border-border p-1 sm:p-1.5 cursor-pointer transition-colors hover:bg-muted/50 relative flex flex-col',
                    viewMode === 'week' ? 'h-full min-h-[200px]' : 'min-h-[80px] sm:min-h-[100px]',
                    !inMonth && 'bg-muted/20', today && 'bg-primary/5',
                  )}
                  onClick={() => handleDayClick(day)}
                >
                  <div className={cn(
                    'text-xs sm:text-sm font-medium mb-0.5 w-6 h-6 sm:w-7 sm:h-7 flex items-center justify-center rounded-full',
                    today && 'bg-primary text-primary-foreground font-bold',
                    !inMonth && 'text-muted-foreground/40',
                    inMonth && !today && (past ? 'text-muted-foreground' : 'text-foreground'),
                  )}>
                    {format(day, 'd')}
                  </div>

                  <div className={cn('space-y-0.5', viewMode === 'week' && 'flex-1 overflow-y-auto')}>
                    {dayVisits.slice(0, maxShow).map(visit => (
                      <TooltipProvider key={visit.id} delayDuration={200}>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <div
                              className={cn(
                                'text-[10px] sm:text-xs px-1 sm:px-1.5 py-0.5 rounded truncate cursor-pointer transition-colors',
                                visit.type === 'followup'
                                  ? 'bg-amber-500/15 text-amber-700 border-l-2 border-amber-500 hover:bg-amber-500/25 dark:text-amber-300'
                                  : 'bg-primary/15 text-primary border-l-2 border-primary hover:bg-primary/25',
                              )}
                              onClick={(e) => {
                                e.stopPropagation();
                                const lead = leads.find(l => l.id === visit.lead_id);
                                if (lead) onLeadClick(lead);
                              }}
                            >
                              <span className="font-medium">{format(new Date(visit.visit_date), 'HH:mm')}</span>
                              {!isMobile && <span className="ml-1">{visit.type === 'followup' ? `📋 ${visit.lead_name}` : visit.lead_name}</span>}
                            </div>
                          </TooltipTrigger>
                          <TooltipContent side="top" className="max-w-[220px]">
                            <p className="font-semibold text-xs">{visit.lead_name}</p>
                            {visit.type === 'followup' && visit.followup_titulo && (
                              <p className="text-xs text-muted-foreground mt-0.5">📋 {visit.followup_titulo}</p>
                            )}
                            {visit.location && (
                              <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                                <MapPin className="h-3 w-3" /> {visit.location}
                              </p>
                            )}
                            {visit.notes && <p className="text-xs mt-0.5">{visit.notes}</p>}
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    ))}
                    {dayVisits.length > maxShow && (
                      <div className="text-[10px] text-primary font-semibold px-1 cursor-pointer hover:underline">
                        +{dayVisits.length - maxShow} mais
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          <div className="flex items-center gap-4 text-xs text-muted-foreground pt-1">
            <div className="flex items-center gap-1.5"><div className="w-3 h-3 rounded-full bg-primary" /><span>Hoje</span></div>
            <div className="flex items-center gap-1.5"><div className="w-3 h-3 rounded-sm bg-primary/15 border-l-2 border-primary" /><span>Visita</span></div>
            <div className="flex items-center gap-1.5"><div className="w-3 h-3 rounded-sm bg-amber-500/15 border-l-2 border-amber-500" /><span>Follow-up</span></div>
          </div>
        </div>

      <Dialog open={!!selectedDayVisits} onOpenChange={(v) => { if (!v) setSelectedDayVisits(null); }}>
        <DialogContent className="max-w-lg max-h-[80vh] overflow-auto">
          {selectedDayVisits && (
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <CalendarIcon className="h-5 w-5 text-primary" />
                <h3 className="text-base font-bold text-foreground capitalize">
                  {format(selectedDayVisits.date, "EEEE, dd 'de' MMMM", { locale: ptBR })}
                </h3>
                <Badge variant="outline" className="text-[10px] h-5">
                  {selectedDayVisits.visits.length} compromisso{selectedDayVisits.visits.length !== 1 ? 's' : ''}
                </Badge>
              </div>
              <div className="space-y-2">
                {selectedDayVisits.visits.map(visit => <VisitCard key={visit.id} visit={visit} />)}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <VisitEditDialog
        open={!!editingVisit}
        onOpenChange={(v) => { if (!v) setEditingVisit(null); }}
        visit={editingVisit}
        onUpdated={handleVisitUpdated}
      />

      <FollowUpEditDialog
        open={!!editingFollowUp}
        onOpenChange={(v) => { if (!v) setEditingFollowUp(null); }}
        followUp={editingFollowUp}
        onUpdated={handleVisitUpdated}
      />
    </div>
  );
}
