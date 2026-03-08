import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Calendar, MapPin, Clock } from 'lucide-react';
import { format, isToday, isBefore, startOfDay } from 'date-fns';
import { ptBR } from 'date-fns/locale';
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

  useEffect(() => {
    loadVisits();
  }, []);

  const loadVisits = async () => {
    const { data } = await (supabase as any)
      .from('crm_visits')
      .select('*')
      .gte('visit_date', new Date(Date.now() - 7 * 86400000).toISOString())
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

  if (loading) return <p className="text-sm text-muted-foreground text-center py-8">Carregando agenda...</p>;

  return (
    <div className="space-y-4">
      {sortedDates.length === 0 ? (
        <p className="text-sm text-muted-foreground text-center py-12">Nenhuma visita agendada</p>
      ) : (
        sortedDates.map(dateKey => {
          const date = new Date(dateKey + 'T12:00:00');
          const today = isToday(date);
          const past = isBefore(date, startOfDay(new Date())) && !today;

          return (
            <div key={dateKey} className="space-y-2">
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4 text-muted-foreground" />
                <span className={`text-sm font-semibold ${today ? 'text-primary' : past ? 'text-muted-foreground' : 'text-foreground'}`}>
                  {format(date, "EEEE, dd 'de' MMMM", { locale: ptBR })}
                </span>
                {today && <Badge className="text-[10px] h-5">Hoje</Badge>}
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
      )}
    </div>
  );
}
