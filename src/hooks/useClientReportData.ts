import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface ClientProjection {
  id: string;
  cliente_nome: string;
  ano: number;
  mes: number;
  valor_orcado: number;
}

export interface ClientVendorAssignment {
  id: string;
  cliente_nome: string;
  vendedor_id: string | null;
  vendedor_nome: string | null;
}

export interface VendorOption {
  id: string;
  full_name: string;
}

const keyOf = (cliente: string) => cliente.toUpperCase().trim();

export function useClientReportData(ano: number, mes: number) {
  const [projections, setProjections] = useState<Map<string, ClientProjection>>(new Map());
  const [assignments, setAssignments] = useState<Map<string, ClientVendorAssignment>>(new Map());
  const [vendors, setVendors] = useState<VendorOption[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchAll = useCallback(async () => {
    setLoading(true);
    try {
      const [projRes, assignRes, vendorsRes] = await Promise.all([
        supabase
          .from("client_projections")
          .select("*")
          .eq("ano", ano)
          .eq("mes", mes),
        supabase.from("client_vendor_assignments").select("*"),
        supabase
          .from("user_profiles")
          .select("id, full_name")
          .order("full_name"),
      ]);

      const projMap = new Map<string, ClientProjection>();
      (projRes.data || []).forEach((p: any) => projMap.set(keyOf(p.cliente_nome), p));
      setProjections(projMap);

      const assignMap = new Map<string, ClientVendorAssignment>();
      (assignRes.data || []).forEach((a: any) => assignMap.set(keyOf(a.cliente_nome), a));
      setAssignments(assignMap);

      setVendors((vendorsRes.data || []) as VendorOption[]);
    } finally {
      setLoading(false);
    }
  }, [ano, mes]);

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  const upsertProjection = async (cliente: string, valor: number) => {
    const { data, error } = await supabase
      .from("client_projections")
      .upsert(
        { cliente_nome: cliente, ano, mes, valor_orcado: valor },
        { onConflict: "cliente_nome,ano,mes" }
      )
      .select()
      .single();
    if (!error && data) {
      setProjections((prev) => {
        const next = new Map(prev);
        next.set(keyOf(cliente), data as ClientProjection);
        return next;
      });
    }
    return { error };
  };

  const upsertAssignment = async (
    cliente: string,
    vendedor_id: string | null,
    vendedor_nome: string | null
  ) => {
    const { data, error } = await supabase
      .from("client_vendor_assignments")
      .upsert(
        { cliente_nome: cliente, vendedor_id, vendedor_nome },
        { onConflict: "cliente_nome" }
      )
      .select()
      .single();
    if (!error && data) {
      setAssignments((prev) => {
        const next = new Map(prev);
        next.set(keyOf(cliente), data as ClientVendorAssignment);
        return next;
      });
    }
    return { error };
  };

  const getProjection = (cliente: string) => projections.get(keyOf(cliente));
  const getAssignment = (cliente: string) => assignments.get(keyOf(cliente));

  return {
    loading,
    vendors,
    getProjection,
    getAssignment,
    upsertProjection,
    upsertAssignment,
    refresh: fetchAll,
  };
}