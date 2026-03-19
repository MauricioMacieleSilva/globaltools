import React, { useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { MapPin } from 'lucide-react';
import { useComercial } from '@/context/ComercialContext';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  ComposableMap,
  Geographies,
  Geography,
  Marker,
} from 'react-simple-maps';
import { Tooltip } from 'react-tooltip';

const GEO_URL = '/data/brazil-states.json';

// Real centroid coordinates [longitude, latitude] for each Brazilian state
const STATE_CENTROIDS: Record<string, { coords: [number, number]; name: string }> = {
  AC: { coords: [-70.47, -9.02], name: 'Acre' },
  AL: { coords: [-36.62, -9.57], name: 'Alagoas' },
  AM: { coords: [-64.66, -3.77], name: 'Amazonas' },
  AP: { coords: [-51.07, 1.41], name: 'Amapá' },
  BA: { coords: [-41.73, -12.58], name: 'Bahia' },
  CE: { coords: [-39.32, -5.20], name: 'Ceará' },
  DF: { coords: [-47.80, -15.78], name: 'Distrito Federal' },
  ES: { coords: [-40.31, -19.57], name: 'Espírito Santo' },
  GO: { coords: [-49.64, -15.93], name: 'Goiás' },
  MA: { coords: [-45.27, -5.06], name: 'Maranhão' },
  MG: { coords: [-44.68, -18.51], name: 'Minas Gerais' },
  MS: { coords: [-54.79, -20.51], name: 'Mato Grosso do Sul' },
  MT: { coords: [-55.91, -12.64], name: 'Mato Grosso' },
  PA: { coords: [-52.48, -3.79], name: 'Pará' },
  PB: { coords: [-36.62, -7.12], name: 'Paraíba' },
  PE: { coords: [-37.86, -8.28], name: 'Pernambuco' },
  PI: { coords: [-42.99, -7.72], name: 'Piauí' },
  PR: { coords: [-51.44, -24.89], name: 'Paraná' },
  RJ: { coords: [-43.21, -22.91], name: 'Rio de Janeiro' },
  RN: { coords: [-36.51, -5.79], name: 'Rio Grande do Norte' },
  RO: { coords: [-62.84, -10.83], name: 'Rondônia' },
  RR: { coords: [-61.40, 2.74], name: 'Roraima' },
  RS: { coords: [-53.21, -29.75], name: 'Rio Grande do Sul' },
  SC: { coords: [-50.35, -27.24], name: 'Santa Catarina' },
  SE: { coords: [-37.07, -10.57], name: 'Sergipe' },
  SP: { coords: [-48.73, -22.19], name: 'São Paulo' },
  TO: { coords: [-48.33, -10.18], name: 'Tocantins' },
};

type ViewMode = 'valor' | 'peso';

export function BrazilBubbleMap() {
  const { filteredData, isLoading } = useComercial();
  const [viewMode, setViewMode] = useState<ViewMode>('valor');

  const stateData = useMemo(() => {
    const faturados = filteredData.filter(
      item => (item.situacao === 'Emitida' || item.situacao === 'Pedido') && item.faturamento_tipo === 1
    );

    const map: Record<string, { valor: number; peso: number; uf: string }> = {};
    faturados.forEach(item => {
      const uf = (item.uf || '').toUpperCase().trim();
      if (!uf || !STATE_CENTROIDS[uf]) return;
      if (!map[uf]) map[uf] = { valor: 0, peso: 0, uf };
      map[uf].valor += item.valor || 0;
      map[uf].peso += item.peso || 0;
    });

    return Object.values(map);
  }, [filteredData]);

  const maxValue = useMemo(() => {
    if (stateData.length === 0) return 1;
    return Math.max(...stateData.map(s => viewMode === 'valor' ? s.valor : s.peso));
  }, [stateData, viewMode]);

  const getRadius = (value: number) => {
    if (maxValue === 0) return 3;
    const ratio = value / maxValue;
    return Math.max(4, Math.sqrt(ratio) * 28);
  };

  const formatCurrency = (v: number) =>
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(v);

  const formatWeight = (v: number) =>
    `${new Intl.NumberFormat('pt-BR', { minimumFractionDigits: 0, maximumFractionDigits: 1 }).format(v)} t`;

  if (isLoading) {
    return (
      <Card className="h-full">
        <CardHeader className="pb-2 px-3 pt-3">
          <div className="h-4 w-48 bg-muted animate-pulse rounded" />
        </CardHeader>
        <CardContent className="px-3 pb-3">
          <div className="h-[340px] bg-muted animate-pulse rounded" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="h-full flex flex-col">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-1 px-3 pt-3">
        <CardTitle className="text-sm font-medium text-foreground flex items-center gap-1.5">
          <MapPin className="h-4 w-4 text-primary" />
          Mapa de Faturamento
        </CardTitle>
        <Select value={viewMode} onValueChange={(v) => setViewMode(v as ViewMode)}>
          <SelectTrigger className="h-7 w-[130px] text-[11px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="valor" className="text-xs">Ver por Valor (R$)</SelectItem>
            <SelectItem value="peso" className="text-xs">Ver por Peso (kg)</SelectItem>
          </SelectContent>
        </Select>
      </CardHeader>
      <CardContent className="px-1 pb-1 flex-1 flex items-center justify-center min-h-0">
        <div className="w-full h-full max-h-[380px] relative">
          <ComposableMap
            projection="geoMercator"
            projectionConfig={{
              scale: 580,
              center: [-54, -15.5],
            }}
            style={{ width: '100%', height: '100%' }}
          >
            <Geographies geography={GEO_URL}>
              {({ geographies }) =>
                geographies.map((geo) => (
                  <Geography
                    key={geo.rsmKey}
                    geography={geo}
                    fill="hsl(var(--muted))"
                    stroke="hsl(var(--border))"
                    strokeWidth={0.5}
                    style={{
                      default: { outline: 'none' },
                      hover: { outline: 'none', fill: 'hsl(var(--accent))' },
                      pressed: { outline: 'none' },
                    }}
                  />
                ))
              }
            </Geographies>

            {stateData
              .sort((a, b) => (viewMode === 'valor' ? b.valor - a.valor : b.peso - a.peso))
              .map(state => {
                const centroid = STATE_CENTROIDS[state.uf];
                if (!centroid) return null;
                const value = viewMode === 'valor' ? state.valor : state.peso;
                const r = getRadius(value);

                return (
                  <Marker key={state.uf} coordinates={centroid.coords}>
                    <circle
                      r={r}
                      fill={viewMode === 'valor' ? 'hsl(var(--primary) / 0.4)' : 'hsla(25, 95%, 53%, 0.4)'}
                      stroke={viewMode === 'valor' ? 'hsl(var(--primary) / 0.8)' : 'hsla(25, 95%, 53%, 0.8)'}
                      strokeWidth={1.5}
                      style={{
                        cursor: 'pointer',
                        transition: 'r 500ms ease-out, fill 300ms ease, stroke 300ms ease',
                      }}
                      data-tooltip-id="map-tooltip"
                      data-tooltip-html={`
                        <div style="text-align:left">
                          <strong>${centroid.name} (${state.uf})</strong><br/>
                          Valor: ${formatCurrency(state.valor)}<br/>
                          Peso: ${formatWeight(state.peso)}
                        </div>
                      `}
                    />
                    {r > 12 && (
                      <text
                        textAnchor="middle"
                        dominantBaseline="central"
                        style={{
                          fontSize: Math.max(7, Math.min(r * 0.5, 10)),
                          fontWeight: 600,
                          fill: 'hsl(var(--foreground))',
                          pointerEvents: 'none',
                          userSelect: 'none',
                        }}
                      >
                        {state.uf}
                      </text>
                    )}
                  </Marker>
                );
              })}
          </ComposableMap>
          <Tooltip
            id="map-tooltip"
            style={{
              backgroundColor: 'hsl(var(--popover))',
              color: 'hsl(var(--popover-foreground))',
              border: '1px solid hsl(var(--border))',
              borderRadius: '8px',
              padding: '8px 12px',
              fontSize: '12px',
              zIndex: 50,
              boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
            }}
          />
        </div>
      </CardContent>
    </Card>
  );
}
