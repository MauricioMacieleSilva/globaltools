import React, { useMemo } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Calendar } from 'lucide-react';
import { format, startOfMonth, endOfMonth } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface MonthlyContactsKPIProps {
  activities: any[];
  monthlyGoal: number;
  baseDate?: Date;
}

export const MonthlyContactsKPI: React.FC<MonthlyContactsKPIProps> = ({ activities, monthlyGoal, baseDate }) => {
  const monthlyContacts = useMemo(() => {
    const currentDate = baseDate || new Date();
    const monthStart = startOfMonth(currentDate);
    const monthEnd = endOfMonth(currentDate);
    
    return activities.filter(activity => {
      const activityDate = new Date(activity.created_at);
      return activity.activity_type === 'contato_inicial' &&
             activityDate >= monthStart && 
             activityDate <= monthEnd;
    }).length;
  }, [activities, baseDate]);

  const progressPercentage = (monthlyContacts / monthlyGoal) * 100;

  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-center space-x-2">
          <Calendar className="h-4 w-4 text-indigo-500" />
          <div>
            <p className="text-sm font-medium">Contatos no Mês</p>
            <p className="text-2xl font-bold">{monthlyContacts}</p>
            <p className="text-xs text-muted-foreground">
              Meta: {monthlyGoal} ({format(baseDate || new Date(), 'MMMM', { locale: ptBR })})
            </p>
          </div>
        </div>
        <Progress 
          value={progressPercentage} 
          className="mt-2" 
        />
        <p className="text-xs text-muted-foreground mt-1">
          {progressPercentage.toFixed(1)}% da meta mensal
        </p>
      </CardContent>
    </Card>
  );
};