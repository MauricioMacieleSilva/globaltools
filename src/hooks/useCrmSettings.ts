import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface StaleLeadsBlinkSettings {
  enabled: boolean;
  days_threshold: number;
}

const DEFAULT_STALE: StaleLeadsBlinkSettings = { enabled: false, days_threshold: 2 };

export function useStaleLeadsBlinkSettings() {
  const [settings, setSettings] = useState<StaleLeadsBlinkSettings>(DEFAULT_STALE);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    const { data } = await (supabase as any)
      .from('crm_settings')
      .select('value')
      .eq('key', 'stale_leads_blink')
      .maybeSingle();
    if (data?.value) {
      setSettings({
        enabled: !!data.value.enabled,
        days_threshold: Number(data.value.days_threshold) || 2,
      });
    }
    setLoading(false);
  };

  useEffect(() => {
    load();
    // Realtime updates so toggle propagates instantly
    const ch = (supabase as any)
      .channel('crm_settings_stale')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'crm_settings' }, () => load())
      .subscribe();
    return () => { (supabase as any).removeChannel(ch); };
  }, []);

  const save = async (next: StaleLeadsBlinkSettings) => {
    const { data: existing } = await (supabase as any)
      .from('crm_settings').select('id').eq('key', 'stale_leads_blink').maybeSingle();
    if (existing?.id) {
      await (supabase as any).from('crm_settings').update({ value: next, updated_at: new Date().toISOString() }).eq('id', existing.id);
    } else {
      await (supabase as any).from('crm_settings').insert({ key: 'stale_leads_blink', value: next });
    }
    setSettings(next);
  };

  return { settings, loading, save, reload: load };
}
