import React from 'react';
import { Badge } from '@/components/ui/badge';
import { Clock, AlertTriangle, CheckCircle } from 'lucide-react';
import { format, differenceInDays, differenceInHours, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface LeadOpenTimeIndicatorProps {
  lead: any;
}

export function LeadOpenTimeIndicator({ lead }: LeadOpenTimeIndicatorProps) {
  // Calcular tempo desde o primeiro contato ou criação até encaminhamento/conclusão
  const getLeadOpenTime = () => {
    const startDate = lead.assigned_at ? new Date(lead.assigned_at) : new Date(lead.created_at);
    const endDate = lead.forwarded_at || lead.converted_at || new Date();
    
    const days = differenceInDays(endDate, startDate);
    const hours = differenceInHours(endDate, startDate);
    
    return { days, hours, isOpen: !lead.forwarded_at && !lead.converted_at };
  };

  const { days, hours, isOpen } = getLeadOpenTime();

  // Determinar cor e ícone baseado no tempo
  const getTimeIndicator = () => {
    if (!isOpen) {
      return {
        color: 'bg-green-500 text-white',
        icon: CheckCircle,
        label: 'Concluído'
      };
    }

    if (days >= 7) {
      return {
        color: 'bg-red-500 text-white',
        icon: AlertTriangle,
        label: 'Crítico'
      };
    } else if (days >= 3) {
      return {
        color: 'bg-yellow-500 text-black',
        icon: Clock,
        label: 'Atenção'
      };
    } else {
      return {
        color: 'bg-blue-500 text-white',
        icon: Clock,
        label: 'Normal'
      };
    }
  };

  const { color, icon: Icon, label } = getTimeIndicator();

  const formatDuration = () => {
    if (days === 0 && hours === 0) {
      return 'Menos de 1h';
    } else if (days === 0) {
      return `${hours}h`;
    } else if (days === 1) {
      return `1 dia`;
    } else {
      return `${days} dias`;
    }
  };

  return (
    <div className="flex flex-col gap-1">
      <Badge 
        className={`${color} flex items-center gap-1 text-xs`}
        title={`Lead ${isOpen ? 'em aberto há' : 'ficou em aberto por'} ${formatDuration()}`}
      >
        <Icon className="h-3 w-3" />
        {formatDuration()}
      </Badge>
      <span className="text-xs text-muted-foreground">{label}</span>
    </div>
  );
}