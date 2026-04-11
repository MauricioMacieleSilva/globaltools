import { useState, useEffect, useCallback } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { AlertTriangle, Clock, ExternalLink, User } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/context/AuthContext';
import type { CRMLead } from '@/pages/CRM';

interface StaleLeadsAlertProps {
  leads: CRMLead[];
  onLeadClick: (lead: CRMLead) => void;
}

export function StaleLeadsAlert({ leads, onLeadClick }: StaleLeadsAlertProps) {
  const [open, setOpen] = useState(false);
  const [staleLeads, setStaleLeads] = useState<(CRMLead & { daysSinceContact: number; vendedor_name: string })[]>([]);
  const { user, userProfile } = useAuth();
  const [userRole, setUserRole] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;
    supabase.from('user_roles').select('role').eq('user_id', user.id).maybeSingle()
      .then(({ data }) => setUserRole(data?.role || null));
  }, [user]);

  const computeStaleLeads = useCallback(async (showAlways = false) => {
    if (!user || leads.length === 0 || userRole === null) return;

    if (!showAlways) {
      const sessionKey = `stale_leads_alert_${user.id}_${new Date().toDateString()}`;
      if (sessionStorage.getItem(sessionKey)) return;
    }

    const isManager = userRole === 'admin' || userRole === 'comercial';

    // Filter active leads, and by user if not manager
    const activeLeads = leads.filter(l => {
      if (l.status === 'perdido' || l.status === 'pedido_fechado') return false;
      if (!isManager && l.vendedor_id !== user.id) return false;
      return true;
    });

    if (activeLeads.length === 0) {
      setStaleLeads([]);
      return;
    }

    // Fetch lead IDs that have future scheduled follow-ups (they are in the agenda)
    const activeLeadIds = activeLeads.map(l => l.id);
    const { data: futureFollowUps } = await supabase
      .from('follow_ups')
      .select('lead_id')
      .in('lead_id', activeLeadIds)
      .eq('concluido', false)
      .gte('data_agendada', new Date().toISOString());
    
    const leadsInAgenda = new Set((futureFollowUps || []).map(f => f.lead_id).filter(Boolean));
    
    // Exclude leads that are in the agenda
    const filteredLeads = activeLeads.filter(l => !leadsInAgenda.has(l.id));

    if (filteredLeads.length === 0) {
      setStaleLeads([]);
      return;
    }

    // Fetch last activity date for each lead
    const leadIds = filteredLeads.map(l => l.id);
    const { data: activities } = await supabase
      .from('lead_activities')
      .select('lead_id, created_at')
      .in('lead_id', leadIds)
      .order('created_at', { ascending: false });

    // Fetch vendedor names
    const vendorIds = [...new Set(filteredLeads.map(l => l.vendedor_id).filter(Boolean))] as string[];
    const vendorMap: Record<string, string> = {};
    if (vendorIds.length > 0) {
      const { data: profiles } = await supabase
        .from('user_profiles')
        .select('id, full_name')
        .in('id', vendorIds);
      (profiles || []).forEach(p => { vendorMap[p.id] = p.full_name || 'Sem nome'; });
    }

    const now = new Date();
    const lastActivityMap: Record<string, Date> = {};
    (activities || []).forEach(a => {
      if (!lastActivityMap[a.lead_id]) {
        lastActivityMap[a.lead_id] = new Date(a.created_at);
      }
    });

    const stale = activeLeads
      .map(lead => {
        const lastActivity = lastActivityMap[lead.id];
        const referenceDate = lastActivity || new Date(lead.created_at);
        const diffMs = now.getTime() - referenceDate.getTime();
        const days = Math.floor(diffMs / (24 * 60 * 60 * 1000));
        const vendedor_name = lead.vendedor_id ? (vendorMap[lead.vendedor_id] || 'Não atribuído') : 'Não atribuído';
        return { ...lead, daysSinceContact: days, vendedor_name };
      })
      .filter(l => l.daysSinceContact >= 2)
      .sort((a, b) => b.daysSinceContact - a.daysSinceContact);

    setStaleLeads(stale);
    return stale;
  }, [user, leads, userRole]);

  // Auto-show once per day
  useEffect(() => {
    if (!user || leads.length === 0 || userRole === null) return;

    const timer = setTimeout(async () => {
      const sessionKey = `stale_leads_alert_${user.id}_${new Date().toDateString()}`;
      if (sessionStorage.getItem(sessionKey)) return;

      const stale = await computeStaleLeads();
      if (stale && stale.length > 0) {
        setOpen(true);
        sessionStorage.setItem(sessionKey, 'true');
      }
    }, 1500);
    return () => clearTimeout(timer);
  }, [user, leads, userRole, computeStaleLeads]);

  const handleManualOpen = async () => {
    await computeStaleLeads(true);
    setOpen(true);
  };

  const handleLeadClick = (lead: CRMLead) => {
    onLeadClick(lead);
    setOpen(false);
  };

  const getDaysColor = (days: number) => {
    if (days >= 7) return 'bg-destructive text-destructive-foreground';
    if (days >= 5) return 'bg-orange-500 text-white';
    return 'bg-warning text-warning-foreground';
  };

  const isManager = userRole === 'admin' || userRole === 'comercial';

  return (
    <>
      {/* Manual trigger button */}
      <Button
        variant="ghost"
        size="sm"
        onClick={handleManualOpen}
        className="h-8 gap-1.5 text-xs text-warning hover:text-warning"
        title="Leads sem contato"
      >
        <AlertTriangle className="h-3.5 w-3.5" />
        <span className="hidden sm:inline">Leads Parados</span>
        {staleLeads.length > 0 && (
          <Badge variant="secondary" className="h-5 px-1.5 text-[10px] bg-warning/20 text-warning">
            {staleLeads.length}
          </Badge>
        )}
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-warning" />
              Leads sem Contato
            </DialogTitle>
            <DialogDescription>
              {staleLeads.length > 0
                ? `${staleLeads.length} lead${staleLeads.length > 1 ? 's' : ''} está${staleLeads.length > 1 ? 'ão' : ''} há mais de 2 dias sem contato registrado.`
                : 'Nenhum lead parado encontrado. Tudo em dia! 🎉'}
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
                    {isManager && (
                      <p className="text-[10px] text-muted-foreground flex items-center gap-1 mt-0.5">
                        <User className="h-2.5 w-2.5" />
                        {lead.vendedor_name}
                      </p>
                    )}
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
    </>
  );
}
