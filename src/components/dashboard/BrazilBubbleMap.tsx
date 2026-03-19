import React, { useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { MapPin } from 'lucide-react';
import { useComercial } from '@/context/ComercialContext';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

// Approximate center coordinates for each Brazilian state on a 400x450 viewBox
const STATE_COORDS: Record<string, { x: number; y: number; name: string }> = {
  AC: { x: 62, y: 230, name: 'Acre' },
  AL: { x: 355, y: 230, name: 'Alagoas' },
  AM: { x: 115, y: 160, name: 'Amazonas' },
  AP: { x: 220, y: 80, name: 'Amapá' },
  BA: { x: 320, y: 260, name: 'Bahia' },
  CE: { x: 340, y: 180, name: 'Ceará' },
  DF: { x: 260, y: 290, name: 'Distrito Federal' },
  ES: { x: 330, y: 320, name: 'Espírito Santo' },
  GO: { x: 245, y: 300, name: 'Goiás' },
  MA: { x: 280, y: 160, name: 'Maranhão' },
  MG: { x: 290, y: 320, name: 'Minas Gerais' },
  MS: { x: 195, y: 340, name: 'Mato Grosso do Sul' },
  MT: { x: 180, y: 260, name: 'Mato Grosso' },
  PA: { x: 200, y: 140, name: 'Pará' },
  PB: { x: 360, y: 195, name: 'Paraíba' },
  PE: { x: 350, y: 210, name: 'Pernambuco' },
  PI: { x: 305, y: 195, name: 'Piauí' },
  PR: { x: 215, y: 380, name: 'Paraná' },
  RJ: { x: 305, y: 350, name: 'Rio de Janeiro' },
  RN: { x: 360, y: 178, name: 'Rio Grande do Norte' },
  RO: { x: 118, y: 250, name: 'Rondônia' },
  RR: { x: 130, y: 80, name: 'Roraima' },
  RS: { x: 205, y: 420, name: 'Rio Grande do Sul' },
  SC: { x: 230, y: 400, name: 'Santa Catarina' },
  SE: { x: 355, y: 245, name: 'Sergipe' },
  SP: { x: 255, y: 355, name: 'São Paulo' },
  TO: { x: 255, y: 230, name: 'Tocantins' },
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
      if (!uf || !STATE_COORDS[uf]) return;
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
    if (maxValue === 0) return 4;
    const ratio = value / maxValue;
    return Math.max(5, Math.sqrt(ratio) * 30);
  };

  const formatCurrency = (v: number) =>
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(v);

  const formatWeight = (v: number) =>
    `${new Intl.NumberFormat('pt-BR', { minimumFractionDigits: 0, maximumFractionDigits: 1 }).format(v)} t`;

  const bubbleColor = viewMode === 'valor' ? 'hsl(var(--primary))' : 'hsl(25, 95%, 53%)';
  const bubbleColorFill = viewMode === 'valor' ? 'hsl(var(--primary) / 0.35)' : 'hsla(25, 95%, 53%, 0.35)';
  const bubbleColorStroke = viewMode === 'valor' ? 'hsl(var(--primary) / 0.7)' : 'hsla(25, 95%, 53%, 0.7)';

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
      <CardContent className="px-2 pb-2 flex-1 flex items-center justify-center">
        <svg
          viewBox="30 50 370 410"
          className="w-full h-full max-h-[380px]"
          style={{ overflow: 'visible' }}
        >
          {/* Brazil outline silhouette - simplified path */}
          <path
            d="M220,65 C230,60 250,65 260,75 L280,80 C290,75 300,80 310,90
               L330,110 C345,120 355,140 360,160 L365,180 C370,195 370,210 365,225
               L355,245 C350,255 340,260 335,270 L330,290 C328,300 325,310 320,320
               L310,340 C305,350 300,355 295,360 L280,370 C270,375 260,380 250,385
               L240,390 C230,400 225,410 220,420 L210,430 C205,435 200,435 195,430
               L185,410 C180,395 175,385 170,375 L165,360 C160,350 155,340 150,330
               L140,310 C130,295 120,280 110,270 L95,255 C85,245 75,235 70,225
               L60,210 C55,195 55,180 60,165 L70,145 C75,130 85,120 95,110
               L110,100 C120,90 130,85 140,80 L160,75 C175,70 190,65 200,65 Z"
            fill="hsl(var(--muted))"
            stroke="hsl(var(--border))"
            strokeWidth="1"
            opacity="0.5"
          />

          {/* Bubbles */}
          {stateData
            .sort((a, b) => (viewMode === 'valor' ? b.valor - a.valor : b.peso - a.peso))
            .map(state => {
              const coords = STATE_COORDS[state.uf];
              if (!coords) return null;
              const value = viewMode === 'valor' ? state.valor : state.peso;
              const r = getRadius(value);

              return (
                <g key={state.uf} className="group">
                  <circle
                    cx={coords.x}
                    cy={coords.y}
                    r={r}
                    fill={bubbleColorFill}
                    stroke={bubbleColorStroke}
                    strokeWidth="1.5"
                    className="transition-all duration-500 ease-out"
                    style={{ cursor: 'pointer' }}
                  />
                  {r > 10 && (
                    <text
                      x={coords.x}
                      y={coords.y}
                      textAnchor="middle"
                      dominantBaseline="central"
                      className="fill-foreground pointer-events-none select-none"
                      style={{ fontSize: Math.max(7, Math.min(r * 0.55, 11)) }}
                      fontWeight="600"
                    >
                      {state.uf}
                    </text>
                  )}

                  {/* Tooltip on hover */}
                  <g className="opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" style={{ zIndex: 50 }}>
                    <rect
                      x={coords.x + r + 4}
                      y={coords.y - 32}
                      width="140"
                      height="56"
                      rx="6"
                      fill="hsl(var(--popover))"
                      stroke="hsl(var(--border))"
                      strokeWidth="1"
                      filter="drop-shadow(0 2px 6px rgba(0,0,0,0.15))"
                    />
                    <text x={coords.x + r + 12} y={coords.y - 16} fill="hsl(var(--popover-foreground))" style={{ fontSize: 10 }} fontWeight="700">
                      {coords.name} ({state.uf})
                    </text>
                    <text x={coords.x + r + 12} y={coords.y} fill="hsl(var(--popover-foreground))" style={{ fontSize: 9 }}>
                      Valor: {formatCurrency(state.valor)}
                    </text>
                    <text x={coords.x + r + 12} y={coords.y + 14} fill="hsl(var(--popover-foreground))" style={{ fontSize: 9 }}>
                      Peso: {formatWeight(state.peso)}
                    </text>
                  </g>
                </g>
              );
            })}
        </svg>
      </CardContent>
    </Card>
  );
}
