import React, { useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { MapPin } from 'lucide-react';
import { useComercial } from '@/context/ComercialContext';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { MapContainer, TileLayer, CircleMarker, Popup } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';

// Real centroid coordinates [latitude, longitude] for each Brazilian state
const STATE_CENTROIDS: Record<string, { coords: [number, number]; name: string }> = {
  AC: { coords: [-9.02, -70.47], name: 'Acre' },
  AL: { coords: [-9.57, -36.62], name: 'Alagoas' },
  AM: { coords: [-3.77, -64.66], name: 'Amazonas' },
  AP: { coords: [1.41, -51.07], name: 'Amapá' },
  BA: { coords: [-12.58, -41.73], name: 'Bahia' },
  CE: { coords: [-5.20, -39.32], name: 'Ceará' },
  DF: { coords: [-15.78, -47.80], name: 'Distrito Federal' },
  ES: { coords: [-19.57, -40.31], name: 'Espírito Santo' },
  GO: { coords: [-15.93, -49.64], name: 'Goiás' },
  MA: { coords: [-5.06, -45.27], name: 'Maranhão' },
  MG: { coords: [-18.51, -44.68], name: 'Minas Gerais' },
  MS: { coords: [-20.51, -54.79], name: 'Mato Grosso do Sul' },
  MT: { coords: [-12.64, -55.91], name: 'Mato Grosso' },
  PA: { coords: [-3.79, -52.48], name: 'Pará' },
  PB: { coords: [-7.12, -36.62], name: 'Paraíba' },
  PE: { coords: [-8.28, -37.86], name: 'Pernambuco' },
  PI: { coords: [-7.72, -42.99], name: 'Piauí' },
  PR: { coords: [-24.89, -51.44], name: 'Paraná' },
  RJ: { coords: [-22.91, -43.21], name: 'Rio de Janeiro' },
  RN: { coords: [-5.79, -36.51], name: 'Rio Grande do Norte' },
  RO: { coords: [-10.83, -62.84], name: 'Rondônia' },
  RR: { coords: [2.74, -61.40], name: 'Roraima' },
  RS: { coords: [-29.75, -53.21], name: 'Rio Grande do Sul' },
  SC: { coords: [-27.24, -50.35], name: 'Santa Catarina' },
  SE: { coords: [-10.57, -37.07], name: 'Sergipe' },
  SP: { coords: [-22.19, -48.73], name: 'São Paulo' },
  TO: { coords: [-10.18, -48.33], name: 'Tocantins' },
};

const BUBBLE_COLOR = '#3b82f6';
const BUBBLE_COLOR_PESO = '#f97316';

export function BrazilBubbleMap() {
  const { filteredData, isLoading } = useComercial();
  const [viewMode, setViewMode] = useState<'valor' | 'peso'>('valor');

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

  const calculateRadius = (value: number) => {
    if (maxValue === 0) return 4;
    const ratio = value / maxValue;
    return Math.max(5, Math.sqrt(ratio) * 30);
  };

  const formatCurrency = (v: number) =>
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(v);

  const formatWeight = (v: number) =>
    `${new Intl.NumberFormat('pt-BR', { minimumFractionDigits: 0, maximumFractionDigits: 1 }).format(v)} kg`;

  const activeColor = viewMode === 'valor' ? BUBBLE_COLOR : BUBBLE_COLOR_PESO;

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
        <div className="flex items-center gap-2">
          <Label htmlFor="map-mode" className={`text-[11px] font-medium ${viewMode === 'valor' ? 'text-primary' : 'text-muted-foreground'}`}>
            Valor (R$)
          </Label>
          <Switch
            id="map-mode"
            checked={viewMode === 'peso'}
            onCheckedChange={(checked) => setViewMode(checked ? 'peso' : 'valor')}
            className="h-5 w-9 data-[state=checked]:bg-orange-500"
          />
          <Label htmlFor="map-mode" className={`text-[11px] font-medium ${viewMode === 'peso' ? 'text-orange-500' : 'text-muted-foreground'}`}>
            Peso (kg)
          </Label>
        </div>
      </CardHeader>
      <CardContent className="px-1 pb-1 flex-1 min-h-0">
        <div className="w-full h-full min-h-[340px] rounded-md overflow-hidden">
          <MapContainer
            center={[-15.5, -54]}
            zoom={4}
            style={{ width: '100%', height: '100%', minHeight: '340px' }}
            zoomControl={false}
            attributionControl={false}
            scrollWheelZoom={false}
          >
            <TileLayer
              url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png"
            />
            {stateData
              .sort((a, b) => (viewMode === 'valor' ? b.valor - a.valor : b.peso - a.peso))
              .map(state => {
                const centroid = STATE_CENTROIDS[state.uf];
                if (!centroid) return null;
                const value = viewMode === 'valor' ? state.valor : state.peso;
                const r = calculateRadius(value);

                return (
                  <CircleMarker
                    key={state.uf}
                    center={centroid.coords}
                    radius={r}
                    pathOptions={{
                      fillColor: activeColor,
                      fillOpacity: 0.6,
                      color: activeColor,
                      weight: 2,
                      opacity: 1,
                    }}
                  >
                    <Popup>
                      <div className="text-sm space-y-1 font-sans">
                        <p className="font-bold text-foreground">{centroid.name} ({state.uf})</p>
                        <p>Faturado: <strong>{formatCurrency(state.valor)}</strong></p>
                        <p>Peso: <strong>{formatWeight(state.peso)}</strong></p>
                      </div>
                    </Popup>
                  </CircleMarker>
                );
              })}
          </MapContainer>
        </div>
      </CardContent>
    </Card>
  );
}
