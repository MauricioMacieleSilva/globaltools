import React from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine, LabelList } from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, getDay } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface DailyContact {
  date: string;
  contacts: number;
  goal: number;
  dayOfWeek: string;
  fullDate: Date;
  goalPercentage: number;
  qualifications: number;
  forwardings: number;
}

interface ContatosDiariosChartProps {
  activities: any[];
  dailyGoal: number;
  baseDate?: Date;
}

export const ContatosDiariosChart: React.FC<ContatosDiariosChartProps> = ({ activities, dailyGoal, baseDate }) => {
  const generateChartData = (): DailyContact[] => {
    const currentDate = baseDate || new Date();
    const startDate = startOfMonth(currentDate);
    const endDate = endOfMonth(currentDate);
    const allDays = eachDayOfInterval({ start: startDate, end: endDate });
    
    // Filtrar atividades do mês selecionado
    const monthActivities = activities.filter(activity => {
      const activityDate = new Date(activity.created_at);
      return activityDate >= startDate && activityDate <= endDate;
    });
    
    // Agrupar atividades por data completa (yyyy-MM-dd) e tipo
    const agrupado = monthActivities.reduce((acc, activity) => {
      const activityDate = new Date(activity.created_at);
      const dataCompleta = format(activityDate, 'yyyy-MM-dd');
      if (!acc[dataCompleta]) {
        acc[dataCompleta] = {
          contactLeadIds: new Set<string>(),
          qualifications: 0,
          forwardings: 0
        } as any;
      }
      
      if (activity.activity_type === 'contato_inicial') {
        (acc[dataCompleta].contactLeadIds as Set<string>).add(activity.lead_id);
      } else if (activity.activity_type === 'qualificacao') {
        acc[dataCompleta].qualifications += 1;
      } else if (activity.activity_type === 'encaminhamento') {
        acc[dataCompleta].forwardings += 1;
      }
      
      return acc;
    }, {} as Record<string, { contactLeadIds: Set<string>; qualifications: number; forwardings: number }>);
    
    // Criar dados para todos os dias do mês
    return allDays.map(day => {
      const dataCompleta = format(day, 'yyyy-MM-dd');
      const dayStr = format(day, 'dd/MM', { locale: ptBR });
      const dayData = agrupado[dataCompleta];
      const contactsCount = dayData ? (dayData.contactLeadIds?.size || 0) : 0;
      const qualifications = dayData ? dayData.qualifications : 0;
      const forwardings = dayData ? dayData.forwardings : 0;
      const dayOfWeekIndex = getDay(day);
      const daysOfWeek = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
      const goalPercentage = dailyGoal > 0 ? (contactsCount / dailyGoal) * 100 : 0;
      
      return {
        date: dayStr,
        contacts: contactsCount,
        goal: dailyGoal,
        dayOfWeek: daysOfWeek[dayOfWeekIndex],
        fullDate: day,
        goalPercentage: goalPercentage,
        qualifications,
        forwardings
      };
    });
  };

  const chartData = generateChartData();
  const maxContacts = Math.max(...chartData.map(d => d.contacts));
  const maxValue = Math.max(maxContacts, dailyGoal);
  const yAxisDomain = [0, Math.ceil(maxValue * 1.2)];

  return (
    <Card>
      <CardHeader>
        <CardTitle>
          Evolução Diária de Contatos - {format(baseDate || new Date(), 'MMMM yyyy', { locale: ptBR })}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis 
              dataKey="date" 
              tick={{ fontSize: 10 }} 
              angle={-45}
              textAnchor="end"
              height={60}
            />
            <YAxis domain={yAxisDomain} />
            <Tooltip 
              content={({ active, payload, label }) => {
                if (active && payload && payload.length > 0) {
                  const data = payload[0].payload as DailyContact;
                  return (
                    <div className="bg-background border border-border rounded-lg p-3 shadow-lg min-w-[200px]">
                      <p className="text-sm font-semibold mb-2">{`${label} (${data.dayOfWeek})`}</p>
                      
                      <div className="space-y-1">
                        <p className="text-sm text-primary">
                          <span className="inline-block w-3 h-3 bg-primary rounded mr-2"></span>
                          Contatos: {data.contacts}
                        </p>
                        
                        <p className="text-sm text-purple-600">
                          <span className="inline-block w-3 h-3 bg-purple-600 rounded mr-2"></span>
                          Qualificações: {data.qualifications}
                        </p>
                        
                        <p className="text-sm text-emerald-600">
                          <span className="inline-block w-3 h-3 bg-emerald-600 rounded mr-2"></span>
                          Encaminhamentos: {data.forwardings}
                        </p>
                      </div>
                      
                      <div className="border-t border-border mt-2 pt-2">
                        <p className="text-sm text-muted-foreground">
                          Meta diária: {data.goal}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          Performance: {data.goalPercentage.toFixed(1)}% da meta
                        </p>
                        {data.contacts >= data.goal && (
                          <p className="text-sm text-green-600 font-medium">✓ Meta atingida!</p>
                        )}
                      </div>
                    </div>
                  );
                }
                return null;
              }}
            />
            <ReferenceLine 
              y={dailyGoal} 
              stroke="hsl(var(--destructive))" 
              strokeDasharray="5 5" 
              strokeWidth={2}
            />
            <Bar dataKey="contacts" fill="hsl(var(--primary))" name="contacts">
              <LabelList 
                dataKey="contacts" 
                position="top" 
                style={{ 
                  fontSize: '12px', 
                  fontWeight: 'bold',
                  fill: 'hsl(var(--foreground))'
                }}
              />
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
};