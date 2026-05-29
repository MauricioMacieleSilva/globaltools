import { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface FaixaDesconto {
  id: string;
  peso_min: number;
  peso_max: number | null;
  desconto_max_percent: number;
  ordem: number;
  ativo: boolean;
}

export function formatarFaixaLabel(f: { peso_min: number; peso_max: number | null }): string {
  const min = f.peso_min;
  const max = f.peso_max;
  const t = (kg: number) => {
    const v = kg / 1000;
    return Number.isInteger(v) ? v.toString() : v.toLocaleString('pt-BR', { maximumFractionDigits: 2 });
  };
  if ((min ?? 0) <= 0 && max != null) return `Até ${t(max)} toneladas`;
  if (min != null && max != null) return `De ${t(min)} a ${t(max)} toneladas`;
  if (min != null && max == null) return `Acima de ${t(min)} toneladas`;
  return '';
}

export function useFaixasDesconto() {
  const [faixas, setFaixas] = useState<FaixaDesconto[]>([]);
  const [loading, setLoading] = useState(true);

  const refetch = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('politica_descontos_faixas')
      .select('*')
      .eq('ativo', true)
      .order('ordem', { ascending: true });
    if (!error && data) {
      setFaixas(
        data.map((d: any) => ({
          id: d.id,
          peso_min: Number(d.peso_min),
          peso_max: d.peso_max == null ? null : Number(d.peso_max),
          desconto_max_percent: Number(d.desconto_max_percent),
          ordem: d.ordem,
          ativo: d.ativo,
        }))
      );
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    refetch();
  }, [refetch]);

  return { faixas, loading, refetch };
}