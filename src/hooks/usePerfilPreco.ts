import { useState, useEffect } from 'react';
import { fetchPerfilPrecos, PerfilPreco } from '@/services/perfilPrecosService';

interface UsePerfilPrecoResult {
  precos: PerfilPreco[];
  loading: boolean;
  getPreco: (espessura: number, isPadrao: boolean) => number | null;
}

export function usePerfilPreco(): UsePerfilPrecoResult {
  const [precos, setPrecos] = useState<PerfilPreco[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadPrecos() {
      setLoading(true);
      const { data } = await fetchPerfilPrecos();
      setPrecos(data || []);
      setLoading(false);
    }
    loadPrecos();
  }, []);

  const getPreco = (espessura: number, isPadrao: boolean): number | null => {
    if (!espessura || precos.length === 0) return null;

    const tipo = isPadrao ? 'padrao' : 'especial';
    const precosDoTipo = precos.filter(p => p.tipo === tipo);

    if (precosDoTipo.length === 0) return null;

    // Try exact match first
    const exactMatch = precosDoTipo.find(p => p.espessura === espessura);
    if (exactMatch) return exactMatch.preco_kg;

    // Find closest espessura
    let closest = precosDoTipo[0];
    let minDiff = Math.abs(closest.espessura - espessura);

    for (const preco of precosDoTipo) {
      const diff = Math.abs(preco.espessura - espessura);
      if (diff < minDiff) {
        minDiff = diff;
        closest = preco;
      }
    }

    // Only return if within 0.5mm tolerance
    if (minDiff <= 0.5) {
      return closest.preco_kg;
    }

    return null;
  };

  return { precos, loading, getPreco };
}
