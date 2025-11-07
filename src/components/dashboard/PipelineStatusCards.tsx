import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Lead } from '@/context/PreVendasContext';
import { 
  Clock, 
  Users, 
  TrendingUp, 
  CheckCircle,
  XCircle
} from 'lucide-react';

interface PipelineStatusCardsProps {
  leads: Lead[];
}

export const PipelineStatusCards: React.FC<PipelineStatusCardsProps> = ({ leads }) => {
  // Agrupar leads por categorias de status
  const pendentesAtendimento = leads.filter(lead => 
    (lead.pipeline_status || 'encaminhado') === 'encaminhado'
  );

  const emAtendimento = leads.filter(lead => {
    const status = lead.pipeline_status || 'encaminhado';
    return status === 'em_atendimento' || status === 'contatado';
  });

  const negociando = leads.filter(lead => 
    (lead.pipeline_status || 'encaminhado') === 'orçando'
  );

  const pedidoFechado = leads.filter(lead => 
    (lead.pipeline_status || 'encaminhado') === 'pedido_fechado'
  );

  const perdido = leads.filter(lead => 
    (lead.pipeline_status || 'encaminhado') === 'perdido'
  );

  const statusCards = [
    {
      title: 'Pendente Atendimento',
      count: pendentesAtendimento.length,
      color: 'bg-purple-500',
      icon: Clock,
      description: 'Leads encaminhados aguardando contato'
    },
    {
      title: 'Em Atendimento',
      count: emAtendimento.length,
      color: 'bg-blue-500',
      icon: Users,
      description: 'Leads em contato ou atendimento'
    },
    {
      title: 'Negociando',
      count: negociando.length,
      color: 'bg-indigo-500',
      icon: TrendingUp,
      description: 'Leads em negociação ou orçamento'
    },
    {
      title: 'Pedido Fechado',
      count: pedidoFechado.length,
      color: 'bg-emerald-600',
      icon: CheckCircle,
      description: 'Leads convertidos em pedidos'
    },
    {
      title: 'Perdido',
      count: perdido.length,
      color: 'bg-red-500',
      icon: XCircle,
      description: 'Leads que não se converteram'
    }
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4">
      {statusCards.map((card) => {
        const Icon = card.icon;
        return (
          <Card key={card.title} className="relative overflow-hidden">
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  {card.title}
                </CardTitle>
                <Icon className="h-4 w-4 text-muted-foreground" />
              </div>
            </CardHeader>
            <CardContent className="pt-0">
              <div className="flex items-center justify-between">
                <div className="text-2xl font-bold">
                  {card.count}
                </div>
                <Badge 
                  className={`${card.color} text-white border-none text-xs`}
                  variant="secondary"
                >
                  {((card.count / leads.length) * 100 || 0).toFixed(0)}%
                </Badge>
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                {card.description}
              </p>
            </CardContent>
            <div className={`absolute bottom-0 left-0 right-0 h-1 ${card.color}`} />
          </Card>
        );
      })}
    </div>
  );
};