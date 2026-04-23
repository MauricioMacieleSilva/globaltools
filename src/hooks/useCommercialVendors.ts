import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface CommercialVendor {
  id: string;
  full_name: string;
  avatar_url: string | null;
}

let cachedVendors: CommercialVendor[] | null = null;
let inFlight: Promise<CommercialVendor[]> | null = null;
const subscribers = new Set<(v: CommercialVendor[]) => void>();

async function fetchVendors(): Promise<CommercialVendor[]> {
  const [rolesRes, profilesRes] = await Promise.all([
    supabase.from('user_roles').select('user_id, role').in('role', ['comercial', 'admin']),
    supabase.from('user_profiles').select('id, full_name, avatar_url'),
  ]);

  const roleData = rolesRes.data || [];
  const profilesData = profilesRes.data || [];

  const allowedIds = new Set(roleData.map((r: any) => r.user_id));
  const filtered = profilesData
    .filter((p: any) => allowedIds.has(p.id))
    .map((p: any) => ({
      id: p.id,
      full_name: p.full_name || '',
      avatar_url: p.avatar_url ?? null,
    }))
    .sort((a, b) => a.full_name.localeCompare(b.full_name, 'pt-BR'));

  return filtered;
}

export function preloadCommercialVendors() {
  if (cachedVendors || inFlight) return;
  inFlight = fetchVendors()
    .then((v) => {
      cachedVendors = v;
      subscribers.forEach((cb) => cb(v));
      return v;
    })
    .finally(() => {
      inFlight = null;
    });
}

export function useCommercialVendors() {
  const [vendors, setVendors] = useState<CommercialVendor[]>(cachedVendors || []);
  const [loading, setLoading] = useState(!cachedVendors);

  useEffect(() => {
    if (cachedVendors) {
      setVendors(cachedVendors);
      setLoading(false);
      return;
    }

    const cb = (v: CommercialVendor[]) => {
      setVendors(v);
      setLoading(false);
    };
    subscribers.add(cb);

    if (!inFlight) {
      preloadCommercialVendors();
    }

    return () => {
      subscribers.delete(cb);
    };
  }, []);

  return { vendors, loading };
}