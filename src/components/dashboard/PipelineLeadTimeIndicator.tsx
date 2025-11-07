import React from 'react';
import { Badge } from '@/components/ui/badge';
import { Clock, AlertTriangle, CheckCircle, Zap } from 'lucide-react';
import { differenceInDays, differenceInHours } from 'date-fns';

interface PipelineLeadTimeIndicatorProps {
  lead: any;
}

export function PipelineLeadTimeIndicator({ lead }: PipelineLeadTimeIndicatorProps) {
  // Calcular tempo desde o encaminhamento até finalização ou momento atual
  const getAttendanceTime = () => {
    if (!lead.forwarded_at) {
      return { days: 0, hours: 0, isOpen: true };
    }

    const startDate = new Date(lead.forwarded_at);
    const pipelineStatus = lead.pipeline_status || 'encaminhado';
    const isFinalized = pipelineStatus === 'pedido_fechado' || pipelineStatus === 'perdido';
    
    // Se finalizado, usar o updated_at como fim, senão usar agora
    const endDate = isFinalized ? new Date(lead.updated_at) : new Date();
    
    const days = differenceInDays(endDate, startDate);
    const hours = differenceInHours(endDate, startDate);
    
    return { days, hours, isOpen: !isFinalized };
  };

  const { days, hours, isOpen } = getAttendanceTime();

  // Determinar cor e ícone baseado no tempo e status
  const getTimeIndicator = () => {
    if (!lead.forwarded_at) {
      return {
        color: 'bg-gray-400 text-white',
        icon: Clock,
        label: 'Não encaminhado'
      };
    }

    if (!isOpen) {
      // Lead finalizado
      const pipelineStatus = lead.pipeline_status || 'encaminhado';
      if (pipelineStatus === 'pedido_fechado') {
        return {
          color: 'bg-emerald-600 text-white',
          icon: CheckCircle,
          label: 'Pedido Fechado'
        };
      } else if (pipelineStatus === 'perdido') {
        return {
          color: 'bg-red-600 text-white',
          icon: AlertTriangle,
          label: 'Perdido'
        };
      }
    }

    // Lead em atendimento - avaliar tempo
    if (days >= 14) {
      return {
        color: 'bg-red-500 text-white',
        icon: AlertTriangle,
        label: 'Crítico'
      };
    } else if (days >= 7) {
      return {
        color: 'bg-orange-500 text-white',
        icon: Clock,
        label: 'Atenção'
      };
    } else if (days >= 3) {
      return {
        color: 'bg-yellow-500 text-black',
        icon: Clock,
        label: 'Acompanhar'
      };
    } else {
      return {
        color: 'bg-blue-500 text-white',
        icon: Zap,
        label: 'Em andamento'
      };
    }
  };

  const { color, icon: Icon, label } = getTimeIndicator();

  const formatDuration = () => {
    if (!lead.forwarded_at) {
      return 'N/A';
    }

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

  const getTooltip = () => {
    if (!lead.forwarded_at) {
      return 'Lead ainda não foi encaminhado para o pipeline';
    }
    
    const action = isOpen ? 'em atendimento há' : 'foi atendido em';
    return `Lead ${action} ${formatDuration()}`;
  };

  return (
    <div className="flex flex-col gap-1">
      <Badge 
        className={`${color} flex items-center gap-1 text-xs`}
        title={getTooltip()}
      >
        <Icon className="h-3 w-3" />
        {formatDuration()}
      </Badge>
      <span className="text-xs text-muted-foreground">{label}</span>
    </div>
  );
}