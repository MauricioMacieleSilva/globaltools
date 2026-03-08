import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Calendar as CalendarIcon, MapPin, Clock, List, CalendarDays } from 'lucide-react';
import { Calendar } from '@/components/ui/calendar';
import { format, isToday, isBefore, startOfDay, isSameDay } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import type { CRMLead } from '@/pages/CRM';

interface Visit {
  id: string;
  lead_id: string;
  visit_date: string;
  location: string | null;
  notes: string | null;
  lead_name?: string;
  lead_status?: string;
}

interface VisitCalendarProps {
  onLeadClick: (lead: CRMLead) => void;
  leads: CRMLead[];
}

export function VisitCalendar({ onLeadClick, leads }: VisitCalendarProps) {
  const [visits, setVisits] = useState<Visit[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<'list' | 'calendar'>('list');
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date());

  useEffect(() => {
    loadVisits();
  }, []);

  const loadVisits = async () => {
    const { data } = await (supabase as any)
      .from('crm_visits')
      .select('*')
      .gte('visit_date', new Date(Date.now() - 30 * 86400000).toISOString())
      .order('visit_date', { ascending: true });

    if (data) {
      const enriched = data.map((v: any) => {
        const lead = leads.find(l => l.id === v.lead_id);
        return { ...v, lead_name: lead?.client_name || lead?.cliente_nome || 'Lead', lead_status: lead?.status };
      });
      setVisits(enriched);
    }
    setLoading(false);
  };

  // Group by date
  const grouped: Record<string, Visit[]> = {};
  visits.forEach(v => {
    const key = format(new Date(v.visit_date), 'yyyy-MM-dd');
    if (!grouped[key]) grouped[key] = [];
    grouped[key].push(v);
  });

  const sortedDates = Object.keys(grouped).sort();

  // Dates with visits for calendar dots
  const visitDates = Object.keys(grouped).map(d => new Date(d + 'T12:00:00'));

  // Visits for selected date in calendar view
  const selectedDateVisits = selectedDate
    ? visits.filter(v => isSameDay(new Date(v.visit_date), selectedDate))
    : [];

  if (loading) return <p className="text-sm text-muted-foreground text-center py-8">Carregando agenda...</p>;

  return (
    <div className="space-y-4">
      {/* Toggle buttons */}
      <div className="flex items-center gap-2">
        <Button
          variant={viewMode === 'list' ? 'default' : 'outline'}
          size="sm"
          className="gap-1.5 h-8 text-xs"
          onClick={() => setViewMode('list')}
        >
          <List className="h-3.5 w-3.5" /> Lista
        </Button>
        <Button
          variant={viewMode === 'calendar' ? 'default' : 'outline'}
          size="sm"
          className="gap-1.5 h-8 text-xs"
          onClick={() => setViewMode('calendar')}
        >
          <CalendarDays className="h-3.5 w-3.5" /> Calendário
        </Button>
      </div>

      {viewMode === 'list' ? (
        /* LIST VIEW */
        sortedDates.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-12">Nenhuma visita agendada</p>
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
                    {grouped[dateKey].length} visita{grouped[dateKey].length > 1 ? 's' : ''}
                  </Badge>
                </div>
                <div className="grid gap-2 pl-6">
                  {grouped[dateKey].map(visit => {
                    const lead = leads.find(l => l.id === visit.lead_id);
                    return (
                      <Card
                        key={visit.id}
                        className={`p-3 cursor-pointer hover:shadow-md transition-shadow ${today ? 'border-primary/30' : ''}`}
                        onClick={() => lead && onLeadClick(lead)}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="space-y-1 min-w-0">
                            <p className="text-sm font-semibold text-foreground truncate">{visit.lead_name}</p>
                            {visit.location && (
                              <p className="text-xs text-muted-foreground flex items-center gap-1">
                                <MapPin className="h-3 w-3 shrink-0" /> {visit.location}
                              </p>
                            )}
                            {visit.notes && (
                              <p className="text-xs text-muted-foreground truncate">{visit.notes}</p>
                            )}
                          </div>
                          <div className="flex items-center gap-1 text-xs text-muted-foreground shrink-0">
                            <Clock className="h-3 w-3" />
                            {format(new Date(visit.visit_date), 'HH:mm')}
                          </div>
                        </div>
                      </Card>
                    );
                  })}
                </div>
              </div>
            );
          })
        )
      ) : (
        /* CALENDAR VIEW */
        <div className="grid grid-cols-1 md:grid-cols-[auto_1fr] gap-4">
          <Card className="p-2 w-fit">
            <Calendar
              mode="single"
              selected={selectedDate}
              onSelect={setSelectedDate}
              locale={ptBR}
              className="p-3 pointer-events-auto"
              modifiers={{
                hasVisit: visitDates,
              }}
              modifiersClassNames={{
                hasVisit: 'bg-primary/20 font-bold text-primary',
              }}
            />
            {/* Legend */}
            <div className="flex items-center gap-2 px-3 pb-2 text-xs text-muted-foreground">
              <div className="w-3 h-3 rounded-sm bg-primary/20 border border-primary/30" />
              <span>Dias com visitas</span>
            </div>
          </Card>

          <div className="space-y-3">
            {selectedDate && (
              <div className="flex items-center gap-2">
                <CalendarIcon className="h-4 w-4 text-primary" />
                <span className="text-sm font-semibold text-foreground">
                  {format(selectedDate, "EEEE, dd 'de' MMMM 'de' yyyy", { locale: ptBR })}
                </span>
                <Badge variant="outline" className="text-[10px] h-5">
                  {selectedDateVisits.length} visita{selectedDateVisits.length !== 1 ? 's' : ''}
                </Badge>
              </div>
            )}

            {selectedDateVisits.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">
                Nenhuma visita neste dia
              </p>
            ) : (
              selectedDateVisits.map(visit => {
                const lead = leads.find(l => l.id === visit.lead_id);
                return (
                  <Card
                    key={visit.id}
                    className="p-3 cursor-pointer hover:shadow-md transition-shadow border-primary/20"
                    onClick={() => lead && onLeadClick(lead)}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="space-y-1 min-w-0">
                        <p className="text-sm font-semibold text-foreground truncate">{visit.lead_name}</p>
                        {visit.location && (
                          <p className="text-xs text-muted-foreground flex items-center gap-1">
                            <MapPin className="h-3 w-3 shrink-0" /> {visit.location}
                          </p>
                        )}
                        {visit.notes && (
                          <p className="text-xs text-muted-foreground truncate">{visit.notes}</p>
                        )}
                      </div>
                      <div className="flex items-center gap-1 text-xs text-muted-foreground shrink-0">
                        <Clock className="h-3 w-3" />
                        {format(new Date(visit.visit_date), 'HH:mm')}
                      </div>
                    </div>
                  </Card>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}
