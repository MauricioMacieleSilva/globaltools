import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { AlertTriangle, Clock, ExternalLink } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/context/AuthContext';
import type { CRMLead } from '@/pages/CRM';

interface StaleLeadsAlertProps {
  leads: CRMLead[];
  onLeadClick: (lead: CRMLead) => void;
}

export function StaleLeadsAlert({ leads, onLeadClick }: StaleLeadsAlertProps) {
  const [open, setOpen] = useState(false);
  const [staleLeads, setStaleLeads] = useState<(CRMLead & { daysSinceContact: number })[]>([]);
  const { user } = useAuth();

  useEffect(() => {
    if (!user || leads.length === 0) return;

    const checkStaleLeads = async () => {
      // Check if already shown today
      const sessionKey = `stale_leads_alert_${user.id}_${new Date().toDateString()}`;
      if (sessionStorage.getItem(sessionKey)) return;

      // Get active leads (exclude perdido and pedido_fechado)
      const activeLeads = leads.filter(
        l => l.status !== 'perdido' && l.status !== 'pedido_fechado'
      );

      if (activeLeads.length === 0) return;

      // Fetch last activity date for each lead
      const leadIds = activeLeads.map(l => l.id);
      const { data: activities } = await supabase
        .from('lead_activities')
        .select('lead_id, created_at')
        .in('lead_id', leadIds)
        .order('created_at', { ascending: false });

      const now = new Date();
      const twoDaysMs = 2 * 24 * 60 * 60 * 1000;

      // Map last activity per lead
      const lastActivityMap: Record<string, Date> = {};
      (activities || []).forEach(a => {
        if (!lastActivityMap[a.lead_id]) {
          lastActivityMap[a.lead_id] = new Date(a.created_at);
        }
      });

      // Find leads with no activity or last activity > 2 days ago
      const stale = activeLeads
        .map(lead => {
          const lastActivity = lastActivityMap[lead.id];
          const referenceDate = lastActivity || new Date(lead.created_at);
          const diffMs = now.getTime() - referenceDate.getTime();
          const days = Math.floor(diffMs / (24 * 60 * 60 * 1000));
          return { ...lead, daysSinceContact: days };
        })
        .filter(l => l.daysSinceContact >= 2)
        .sort((a, b) => b.daysSinceContact - a.daysSinceContact);

      if (stale.length > 0) {
        setStaleLeads(stale);
        setOpen(true);
        sessionStorage.setItem(sessionKey, 'true');
      }
    };

    // Small delay to let page load first
    const timer = setTimeout(checkStaleLeads, 1500);
    return () => clearTimeout(timer);
  }, [user, leads]);

  const handleLeadClick = (lead: CRMLead) => {
    onLeadClick(lead);
    setOpen(false);
  };

  if (staleLeads.length === 0) return null;

  const getDaysColor = (days: number) => {
    if (days >= 7) return 'bg-destructive text-destructive-foreground';
    if (days >= 5) return 'bg-orange-500 text-white';
    return 'bg-warning text-warning-foreground';
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-warning" />
            Leads sem Contato
          </DialogTitle>
          <DialogDescription>
            {staleLeads.length} lead{staleLeads.length > 1 ? 's' : ''} está{staleLeads.length > 1 ? 'ão' : ''} há mais de 2 dias sem contato registrado.
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="max-h-[400px]">
          <div className="space-y-2">
            {staleLeads.map(lead => (
              <div
                key={lead.id}
                className="flex items-center justify-between p-3 rounded-lg border bg-card hover:bg-accent/50 cursor-pointer transition-colors"
                onClick={() => handleLeadClick(lead)}
              >
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-foreground truncate">
                    {lead.empresa || lead.cliente_nome}
                  </p>
                  <p className="text-xs text-muted-foreground truncate">
                    {lead.produto_interesse || 'Sem produto'} • {lead.cidade || lead.estado || 'Sem local'}
                  </p>
                </div>
                <div className="flex items-center gap-2 shrink-0 ml-2">
                  <Badge className={`${getDaysColor(lead.daysSinceContact)} text-xs`}>
                    <Clock className="h-3 w-3 mr-1" />
                    {lead.daysSinceContact}d
                  </Badge>
                  <ExternalLink className="h-3.5 w-3.5 text-muted-foreground" />
                </div>
              </div>
            ))}
          </div>
        </ScrollArea>

        <div className="flex justify-end pt-2">
          <Button variant="ghost" onClick={() => setOpen(false)}>
            Fechar
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
