import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface LeadCountsIndicatorProps {
  leadId: string;
  type: 'followups';
}

export function LeadCountsIndicator({ leadId, type }: LeadCountsIndicatorProps) {
  const [count, setCount] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadCount = async () => {
      try {
        if (type === 'followups') {
          const { count: followUpCount } = await supabase
            .from('budget_followups')
            .select('*', { count: 'exact', head: true })
            .eq('lead_id', leadId)
            .eq('is_completed', false);

          setCount(followUpCount || 0);
        }
      } catch (error) {
        console.error('Erro ao carregar contadores:', error);
      } finally {
        setLoading(false);
      }
    };

    loadCount();
  }, [leadId, type]);

  if (loading) {
    return (
      <div className="w-4 h-4 bg-muted animate-pulse rounded"></div>
    );
  }

  return (
    <>
      {count > 0 && (
        <span className="text-xs text-muted-foreground ml-1">
          {count}
        </span>
      )}
    </>
  );
}