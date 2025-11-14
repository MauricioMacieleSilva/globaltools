import React, { useState, useEffect } from 'react';
import { Badge } from '@/components/ui/badge';
import { MessageSquare, Calendar } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

interface BudgetCountsIndicatorProps {
  budgetNumber: string;
  type: 'comments' | 'followups';
}

interface Counts {
  comments: number;
  openFollowUps: number;
}

export function BudgetCountsIndicator({ budgetNumber, type }: BudgetCountsIndicatorProps) {
  const [counts, setCounts] = useState<Counts>({ comments: 0, openFollowUps: 0 });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadCounts = async () => {
      try {
        // Load comment count
        const { count: commentCount } = await supabase
          .from('client_budget_comments')
          .select('*', { count: 'exact', head: true })
          .eq('budget_number', budgetNumber);

        // Load open follow-up count
        const { count: followUpCount } = await supabase
          .from('budget_followups')
          .select('*', { count: 'exact', head: true })
          .eq('budget_number', budgetNumber)
          .eq('completed', false);

        setCounts({
          comments: commentCount || 0,
          openFollowUps: followUpCount || 0
        });
      } catch (error) {
        console.error('Erro ao carregar contadores:', error);
      } finally {
        setLoading(false);
      }
    };

    loadCounts();
  }, [budgetNumber]);

  if (loading) {
    return (
      <div className="flex items-center gap-2">
        <div className="w-8 h-5 bg-muted animate-pulse rounded"></div>
        <div className="w-8 h-5 bg-muted animate-pulse rounded"></div>
      </div>
    );
  }

  const count = type === 'comments' ? counts.comments : counts.openFollowUps;

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