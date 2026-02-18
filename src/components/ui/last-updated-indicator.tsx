import React from 'react';
import { RefreshCw } from 'lucide-react';
import { cn } from '@/lib/utils';

interface LastUpdatedIndicatorProps {
  lastUpdated: Date | null;
  onRefresh?: () => void;
  loading?: boolean;
  className?: string;
}

export function LastUpdatedIndicator({ 
  lastUpdated, 
  onRefresh, 
  loading = false,
  className 
}: LastUpdatedIndicatorProps) {
  const formatTime = (date: Date | null) => {
    if (!date) return '—';
    return date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div className={cn(
      "inline-flex items-center gap-1 text-[10px] text-muted-foreground/60 select-none",
      className
    )}>
      <span>Atualizado {formatTime(lastUpdated)}</span>
      {onRefresh && (
        <button
          onClick={(e) => { e.stopPropagation(); onRefresh(); }}
          disabled={loading}
          className="p-0.5 rounded hover:text-muted-foreground transition-colors disabled:opacity-50"
          title="Atualizar dados"
        >
          <RefreshCw className={cn("h-2.5 w-2.5", loading && "animate-spin")} />
        </button>
      )}
    </div>
  );
}
