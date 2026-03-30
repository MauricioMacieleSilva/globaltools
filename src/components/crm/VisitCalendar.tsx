import { useEffect, useState, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Calendar as CalendarIcon, MapPin, Clock, List, CalendarDays, ChevronLeft, ChevronRight, Pencil } from 'lucide-react';
import {
  format, isToday, isBefore, startOfDay, isSameMonth,
  startOfMonth, endOfMonth, startOfWeek, endOfWeek, addDays, addMonths, subMonths
} from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { useIsMobile } from '@/hooks/use-mobile';
import { VisitEditDialog } from './VisitEditDialog';
import type { CRMLead } from '@/pages/CRM';

interface Visit {
  id: string;
  lead_id: string;
  visit_date: string;
  location: string | null;
  notes: string | null;
  lead_name?: string;
  lead_status?: string;
  type: 'visit' | 'followup';
  followup_tipo?: string;
  followup_titulo?: string;
}

interface VisitCalendarProps {
  onLeadClick: (lead: CRMLead) => void;
  leads: CRMLead[];
}

const WEEKDAYS = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];

export function VisitCalendar({ onLeadClick, leads }: VisitCalendarProps) {
  const [visits, setVisits] = useState<Visit[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<'list' | 'calendar'>('calendar');
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDayVisits, setSelectedDayVisits] = useState<{ date: Date; visits: Visit[] } | null>(null);
  const [editingVisit, setEditingVisit] = useState<Visit | null>(null);
  const isMobile = useIsMobile();

  useEffect(() => {
    loadVisits();
  }, [leads]);

  const loadVisits = async () => {
    const cutoff = new Date(Date.now() - 90 * 86400000).toISOString();

    // Get current user for filtering
    const { data: { user } } = await supabase.auth.getUser();
    let userId: string | null = null;
    let isManager = false;
    if (user) {
      userId = user.id;
      const { data: roleData } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', user.id)
        .maybeSingle();
      const role = (roleData as any)?.role;
      isManager = role === 'admin' || role === 'comercial';
    }

    let visitsQuery = (supabase as any).from('crm_visits').select('*').gte('visit_date', cutoff).order('visit_date', { ascending: true });
    let followupsQuery = (supabase as any).from('follow_ups').select('*').not('lead_id', 'is', null).eq('concluido', false).gte('data_agendada', cutoff).order('data_agendada', { ascending: true });

    // Filter by current user if not manager
    if (!isManager && userId) {
      visitsQuery = visitsQuery.eq('user_id', userId);
      followupsQuery = followupsQuery.eq('user_id', userId);
    }

    const [visitsRes, followupsRes] = await Promise.all([visitsQuery, followupsQuery]);

    const enrichedVisits: Visit[] = (visitsRes.data || []).map((v: any) => {
      const lead = leads.find(l => l.id === v.lead_id);
      return { ...v, lead_name: lead?.client_name || lead?.cliente_nome || 'Lead', lead_status: lead?.status, type: 'visit' as const };
    });

    const enrichedFollowups: Visit[] = (followupsRes.data || []).map((f: any) => {
      const lead = leads.find(l => l.id === f.lead_id);
      return {
        id: f.id, lead_id: f.lead_id, visit_date: f.data_agendada,
        location: null, notes: f.descricao,
        lead_name: lead?.client_name || lead?.cliente_nome || 'Lead', lead_status: lead?.status,
        type: 'followup' as const, followup_tipo: f.tipo, followup_titulo: f.titulo,
      };
    });

    const all = [...enrichedVisits, ...enrichedFollowups].sort(
      (a, b) => new Date(a.visit_date).getTime() - new Date(b.visit_date).getTime()
    );
    setVisits(all);
    setLoading(false);
  };

  const handleEditClick = (e: React.MouseEvent, visit: Visit) => {
    e.stopPropagation();
    setEditingVisit(visit);
  };

  const handleVisitUpdated = () => {
    loadVisits();
    if (selectedDayVisits) setSelectedDayVisits(null);
  };

  // Group by date
  const grouped: Record<string, Visit[]> = {};
  visits.forEach(v => {
    const key = format(new Date(v.visit_date), 'yyyy-MM-dd');
    if (!grouped[key]) grouped[key] = [];
    grouped[key].push(v);
  });

  const sortedDates = Object.keys(grouped).sort();

  const calendarDays = useMemo(() => {
    const monthStart = startOfMonth(currentMonth);
    const monthEnd = endOfMonth(currentMonth);
    const calStart = startOfWeek(monthStart, { locale: ptBR });
    const calEnd = endOfWeek(monthEnd, { locale: ptBR });
    const days: Date[] = [];
    let day = calStart;
    while (day <= calEnd) { days.push(day); day = addDays(day, 1); }
    return days;
  }, [currentMonth]);

  const getVisitsForDay = (date: Date): Visit[] => grouped[format(date, 'yyyy-MM-dd')] || [];

  const handleDayClick = (date: Date) => {
    const dayVisits = getVisitsForDay(date);
    if (dayVisits.length > 0) setSelectedDayVisits({ date, visits: dayVisits });
  };

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
            {showEdit && !isFollowup && (
              <Button variant="ghost" size="icon" className="h-7 w-7" onClick={(e) => handleEditClick(e, visit)} title="Editar visita">
                <Pencil className="h-3.5 w-3.5 text-muted-foreground" />
              </Button>
            )}
          </div>
        </div>
      </Card>
    );
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Button variant={viewMode === 'list' ? 'default' : 'outline'} size="sm" className="gap-1.5 h-8 text-xs" onClick={() => setViewMode('list')}>
          <List className="h-3.5 w-3.5" /> Lista
        </Button>
        <Button variant={viewMode === 'calendar' ? 'default' : 'outline'} size="sm" className="gap-1.5 h-8 text-xs" onClick={() => setViewMode('calendar')}>
          <CalendarDays className="h-3.5 w-3.5" /> Calendário
        </Button>
      </div>

      {viewMode === 'list' ? (
        sortedDates.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-12">Nenhuma visita ou follow-up agendado</p>
        ) : (
          sortedDates.map(dateKey => {
            const date = new Date(dateKey + 'T12:00:00');
            const today = isToday(date);
            const past = isBefore(date, startOfDay(new Date())) && !today;
            return (
              <div key={dateKey} className="space-y-2">
                <div className="flex items-center gap-2">
                  <CalendarIcon className="h-4 w-4 text-muted-foreground" />
                  <span className={`text-sm font-semibold ${today ? 'text-primary' : past ? 'text-muted-foreground' : 'text-foreground'}`}>
                    {format(date, "EEEE, dd 'de' MMMM", { locale: ptBR })}
                  </span>
                  {today && <Badge className="text-[10px] h-5">Hoje</Badge>}
                  <Badge variant="outline" className="text-[10px] h-5 ml-auto">
                    {grouped[dateKey].length} compromisso{grouped[dateKey].length > 1 ? 's' : ''}
                  </Badge>
                </div>
                <div className="grid gap-2 pl-6">
                  {grouped[dateKey].map(visit => <VisitCard key={visit.id} visit={visit} />)}
                </div>
              </div>
            );
          })
        )
      ) : (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <Button variant="ghost" size="sm" onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}><ChevronLeft className="h-4 w-4" /></Button>
            <h3 className="text-base font-bold text-foreground capitalize">{format(currentMonth, "MMMM 'de' yyyy", { locale: ptBR })}</h3>
            <div className="flex items-center gap-1">
              <Button variant="outline" size="sm" className="text-xs h-7" onClick={() => setCurrentMonth(new Date())}>Hoje</Button>
              <Button variant="ghost" size="sm" onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}><ChevronRight className="h-4 w-4" /></Button>
            </div>
          </div>

          <div className="grid grid-cols-7 border-b border-border">
            {WEEKDAYS.map(day => (
              <div key={day} className="py-2 text-center text-xs font-semibold text-muted-foreground uppercase tracking-wide">{day}</div>
            ))}
          </div>

          <div className="grid grid-cols-7 border-l border-border">
            {calendarDays.map((day, idx) => {
              const dayVisits = getVisitsForDay(day);
              const today = isToday(day);
              const inMonth = isSameMonth(day, currentMonth);
              const past = isBefore(day, startOfDay(new Date())) && !today;
              const maxShow = isMobile ? 1 : 3;

              return (
                <div
                  key={idx}
                  className={cn(
                    'border-r border-b border-border min-h-[80px] sm:min-h-[100px] p-1 sm:p-1.5 cursor-pointer transition-colors hover:bg-muted/50 relative',
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

                  <div className="space-y-0.5">
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
      )}

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
    </div>
  );
}
