import { createContext, useCallback, useContext, useEffect, useRef, useState, ReactNode } from 'react';
import { supabase } from '@/integrations/supabase/client';
import type { CRMLead } from '@/pages/CRM';

export interface PendingFollowUp {
  lead_id: string;
  data_agendada: string;
  titulo: string;
  user_id: string;
}

interface CRMDataContextValue {
  leads: CRMLead[];
  setLeads: React.Dispatch<React.SetStateAction<CRMLead[]>>;
  pendingFollowUps: PendingFollowUp[];
  loading: boolean;
  lastUpdated: Date | null;
  currentUserId: string | null;
  currentUserRole: string | null;
  loadLeads: () => Promise<void>;
  loadFollowUps: () => Promise<void>;
}

const CRMDataContext = createContext<CRMDataContextValue | null>(null);

/**
 * Provider que mantém os dados do CRM vivos acima das rotas.
 * Sair de /crm e voltar não dispara nova carga — os dados permanecem em memória.
 * Auto-refresh único de 15 minutos.
 */
export function CRMDataProvider({ children }: { children: ReactNode }) {
  const [leads, setLeads] = useState<CRMLead[]>([]);
  const [pendingFollowUps, setPendingFollowUps] = useState<PendingFollowUp[]>([]);
  const [loading, setLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [currentUserRole, setCurrentUserRole] = useState<string | null>(null);

  const initialLoadDoneRef = useRef(false);
  const bgReconcileDoneRef = useRef(false);
  const refreshTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const loadFollowUps = useCallback(async () => {
    try {
      const { data } = await supabase
        .from('follow_ups')
        .select('lead_id, data_agendada, titulo, user_id')
        .eq('concluido', false)
        .not('lead_id', 'is', null);
      setPendingFollowUps((data || []).map((d: any) => ({
        lead_id: d.lead_id!,
        data_agendada: d.data_agendada,
        titulo: d.titulo,
        user_id: d.user_id,
      })));
    } catch (e) {
      console.error('Erro ao carregar follow-ups:', e);
    }
  }, []);

  const loadLeads = useCallback(async () => {
    try {
      // Reactivate "perdido" leads whose scheduled follow-up date has arrived.
      try {
        const nowIso = new Date().toISOString();
        const { data: expired } = await (supabase as any)
          .from('follow_ups')
          .select('id, lead_id')
          .eq('concluido', false)
          .not('lead_id', 'is', null)
          .lte('data_agendada', nowIso);
        const expiredLeadIds = Array.from(new Set((expired || []).map((f: any) => f.lead_id))).filter(Boolean);
        if (expiredLeadIds.length > 0) {
          const { data: perdidoLeads } = await (supabase as any)
            .from('leads')
            .select('id')
            .in('id', expiredLeadIds)
            .eq('status', 'perdido');
          const perdidoIds = (perdidoLeads || []).map((l: any) => l.id);
          if (perdidoIds.length > 0) {
            await (supabase as any)
              .from('leads')
              .update({ status: 'lead', updated_at: nowIso })
              .in('id', perdidoIds);
            const user = (await supabase.auth.getUser()).data.user;
            const activities = perdidoIds.map((lid: string) => ({
              lead_id: lid,
              activity_type: 'mudanca_status',
              description: 'Lead reativado automaticamente: data do follow-up agendado chegou',
              user_id: user?.id || '',
            }));
            await supabase.from('lead_activities').insert(activities as any);
          }
          await (supabase as any)
            .from('follow_ups')
            .update({ concluido: true, updated_at: nowIso })
            .in('id', (expired || []).map((f: any) => f.id));
        }
      } catch (e) {
        console.warn('Auto-reactivate perdido leads failed:', e);
      }

      const PAGE_SIZE = 1000;
      let allLeads: any[] = [];
      let from = 0;
      let hasMore = true;

      while (hasMore) {
        const { data, error } = await (supabase as any)
          .from('leads')
          .select('*')
          .order('updated_at', { ascending: false })
          .range(from, from + PAGE_SIZE - 1);
        if (error) throw error;

        allLeads = allLeads.concat(data || []);
        hasMore = (data?.length || 0) === PAGE_SIZE;
        from += PAGE_SIZE;
      }

      // Client-side join com user_profiles — evita o JOIN no servidor (muito mais leve no Postgres)
      const vendorIds = Array.from(
        new Set((allLeads as any[]).map((l) => l.vendedor_id).filter(Boolean))
      );
      let profilesMap = new Map<string, { full_name: string; avatar_url: string | null }>();
      if (vendorIds.length > 0) {
        const { data: profiles } = await (supabase as any)
          .from('user_profiles')
          .select('id, full_name, avatar_url')
          .in('id', vendorIds);
        (profiles || []).forEach((p: any) => {
          profilesMap.set(p.id, { full_name: p.full_name || '', avatar_url: p.avatar_url ?? null });
        });
      }
      const leadsWithVendor = (allLeads as any[]).map((l) => ({
        ...l,
        vendedor: l.vendedor_id ? profilesMap.get(l.vendedor_id) || null : null,
      }));
      setLeads(leadsWithVendor as CRMLead[]);
      setLastUpdated(new Date());

      // Background reconcile do valor_estimado: roda no máximo UMA vez por sessão
      // (antes rodava em cada loadLeads, baixando ~20MB do Google Sheets toda vez)
      if (!bgReconcileDoneRef.current) {
        bgReconcileDoneRef.current = true;
        const leadsToFix = (allLeads as any[]).filter((l: any) => l.budget_number);
        if (leadsToFix.length > 0) {
          import('@/services/googleSheetsService').then(({ fetchComercialData }) => {
            import('@/lib/utils-comercial').then(({ parseDate }) => {
              fetchComercialData().then((comercialData) => {
                const norm = (s: string) => (s || '').trim().toLowerCase();
                for (const lead of leadsToFix) {
                  const orderNums = lead.budget_number.split(',').map((s: string) => s.trim()).filter(Boolean);
                  const meta = lead.linked_orders_meta || {};
                  let total = 0;
                  for (const num of orderNums) {
                    let matches = comercialData.filter((d: any) => String(d.numeropedido).trim() === num);
                    if (matches.length === 0) continue;
                    const metaName = meta[num];
                    if (metaName) {
                      const target = norm(metaName);
                      const exact = matches.filter((d: any) => norm(d.cli_nomefantasia || d.cliente) === target);
                      if (exact.length === 0) continue;
                      matches = exact;
                    } else {
                      const candidates = [lead.empresa, lead.cliente_nome, lead.client_name].filter(Boolean).map(norm);
                      if (candidates.length > 0) {
                        const exact = matches.filter((d: any) =>
                          candidates.includes(norm(d.cli_nomefantasia || d.cliente))
                        );
                        if (exact.length === 0) continue;
                        matches = exact;
                      }
                    }
                    const sorted = [...matches].sort((a: any, b: any) => {
                      const da = parseDate(a.data_emissao)?.getTime() || 0;
                      const db = parseDate(b.data_emissao)?.getTime() || 0;
                      return db - da;
                    });
                    const mostRecentDate = sorted[0]?.data_emissao;
                    const finalItems = mostRecentDate
                      ? matches.filter((d: any) => d.data_emissao === mostRecentDate)
                      : matches;
                    total += finalItems.reduce((sum: number, item: any) => sum + (item.valor || 0), 0);
                  }
                  if (total !== (lead.valor_estimado || 0)) {
                    (supabase as any).from('leads').update({ valor_estimado: total }).eq('id', lead.id);
                    setLeads(prev => prev.map(l => l.id === lead.id ? { ...l, valor_estimado: total } : l));
                  }
                }
              }).catch(() => {});
            });
          });
        }
      }
    } catch (error) {
      console.error('Erro ao carregar leads:', error);
    } finally {
      setLoading(false);
    }
    loadFollowUps();
  }, [loadFollowUps]);

  // Carrega usuário corrente UMA vez
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { data: authData } = await supabase.auth.getUser();
      if (cancelled || !authData.user) return;
      setCurrentUserId(authData.user.id);
      const { data: roleData } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', authData.user.id)
        .maybeSingle();
      if (!cancelled) setCurrentUserRole(roleData?.role || null);
    })();
    return () => { cancelled = true; };
  }, []);

  // Primeira carga + auto-refresh único (15min)
  useEffect(() => {
    if (initialLoadDoneRef.current) return;
    initialLoadDoneRef.current = true;
    loadLeads();
    loadFollowUps();
    refreshTimerRef.current = setInterval(() => {
      loadLeads();
      loadFollowUps();
    }, 15 * 60 * 1000);
    return () => {
      if (refreshTimerRef.current) clearInterval(refreshTimerRef.current);
    };
  }, [loadLeads, loadFollowUps]);

  return (
    <CRMDataContext.Provider
      value={{
        leads,
        setLeads,
        pendingFollowUps,
        loading,
        lastUpdated,
        currentUserId,
        currentUserRole,
        loadLeads,
        loadFollowUps,
      }}
    >
      {children}
    </CRMDataContext.Provider>
  );
}

export function useCRMData(): CRMDataContextValue {
  const ctx = useContext(CRMDataContext);
  if (!ctx) throw new Error('useCRMData must be used within CRMDataProvider');
  return ctx;
}