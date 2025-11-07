import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Users, Clock, CheckCircle, ArrowRight, AlertCircle } from 'lucide-react';

interface LeadStatusCardsProps {
  leads: any[];
}

export function LeadStatusCards({ leads }: LeadStatusCardsProps) {
  // Calcular estatísticas dos leads
  const statusStats = leads.reduce((acc, lead) => {
    const status = lead.status || 'novo';
    acc[status] = (acc[status] || 0) + 1;
    return acc;
  }, {});

  const totalLeads = leads.length;
  const novos = statusStats['novo'] || 0;
  const emAndamento = statusStats['em_andamento'] || 0;
  const qualificados = statusStats['qualificado'] || 0;
  const encaminhados = statusStats['encaminhado'] || 0;
  const perdidos = statusStats['perdido'] || 0;

  const cards = [
    {
      title: 'Total de Leads',
      value: totalLeads,
      icon: Users,
      color: 'bg-blue-500',
      textColor: 'text-blue-700'
    },
    {
      title: 'Novos Leads',
      value: novos,
      icon: AlertCircle,
      color: 'bg-yellow-500',
      textColor: 'text-yellow-700'
    },
    {
      title: 'Em Andamento',
      value: emAndamento,
      icon: Clock,
      color: 'bg-orange-500',
      textColor: 'text-orange-700'
    },
    {
      title: 'Qualificados',
      value: qualificados,
      icon: CheckCircle,
      color: 'bg-green-500',
      textColor: 'text-green-700'
    },
    {
      title: 'Encaminhados',
      value: encaminhados,
      icon: ArrowRight,
      color: 'bg-purple-500',
      textColor: 'text-purple-700'
    }
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
      {cards.map((card, index) => {
        const Icon = card.icon;
        return (
          <Card key={index} className="hover:shadow-md transition-shadow">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                {card.title}
              </CardTitle>
              <Icon className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="flex items-center space-x-2">
                <div className="text-2xl font-bold">{card.value}</div>
                {card.value > 0 && (
                  <Badge variant="outline" className={`${card.textColor} border-current`}>
                    {((card.value / totalLeads) * 100).toFixed(0)}%
                  </Badge>
                )}
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}