import React from 'react';
import { DistribuicaoChapa, getCorPerfil, formatarTipoPerfil } from '@/lib/otimizacao-perfis';

interface VisualizacaoChapaCombidadaProps {
  distribuicao: DistribuicaoChapa;
  larguraChapa: number;
  comprimento?: number;
}

export function VisualizacaoChapaCombinada({ 
  distribuicao, 
  larguraChapa,
  comprimento = 6000 
}: VisualizacaoChapaCombidadaProps) {
  const svgWidth = 400;
  const svgHeight = 120;
  const padding = 10;
  const legendaHeight = 30;
  
  const escalaX = (svgWidth - 2 * padding) / larguraChapa;
  const alturaChapa = svgHeight - legendaHeight - 2 * padding;
  
  // Calcula posições das tiras
  let posicaoAtual = 0;
  const tirasVisuais: { x: number; width: number; tipo: string; quantidade: number; largura: number }[] = [];
  
  distribuicao.tiras.forEach(tira => {
    for (let i = 0; i < tira.quantidade; i++) {
      tirasVisuais.push({
        x: posicaoAtual,
        width: tira.larguraTira,
        tipo: tira.tipo,
        quantidade: 1,
        largura: tira.larguraTira
      });
      posicaoAtual += tira.larguraTira;
    }
  });
  
  // Agrupa tiras adjacentes do mesmo tipo para exibição
  const tirasAgrupadas: { x: number; width: number; tipo: string; count: number }[] = [];
  tirasVisuais.forEach(tira => {
    const ultima = tirasAgrupadas[tirasAgrupadas.length - 1];
    if (ultima && ultima.tipo === tira.tipo && ultima.x + ultima.width === tira.x) {
      ultima.width += tira.width;
      ultima.count++;
    } else {
      tirasAgrupadas.push({ x: tira.x, width: tira.width, tipo: tira.tipo, count: 1 });
    }
  });
  
  const aproveitamento = ((distribuicao.larguraUtilizada / larguraChapa) * 100).toFixed(1);
  
  return (
    <div className="bg-muted/30 rounded-lg p-3">
      <div className="flex items-center justify-between mb-2 text-xs text-muted-foreground">
        <span>Chapa {distribuicao.chapaIndex + 1}</span>
        <span>
          {distribuicao.larguraUtilizada}mm utilizado | {distribuicao.larguraPerda}mm perda | {aproveitamento}%
        </span>
      </div>
      
      <svg 
        width="100%" 
        height={svgHeight} 
        viewBox={`0 0 ${svgWidth} ${svgHeight}`}
        className="border rounded bg-background"
      >
        {/* Fundo da chapa */}
        <rect
          x={padding}
          y={padding}
          width={svgWidth - 2 * padding}
          height={alturaChapa}
          fill="hsl(var(--muted))"
          stroke="hsl(var(--border))"
          strokeWidth={1}
        />
        
        {/* Tiras */}
        {tirasAgrupadas.map((tira, index) => (
          <g key={index}>
            <rect
              x={padding + tira.x * escalaX}
              y={padding}
              width={tira.width * escalaX}
              height={alturaChapa}
              fill={getCorPerfil(tira.tipo)}
              stroke="hsl(var(--background))"
              strokeWidth={1}
              opacity={0.85}
            />
            {/* Label da largura */}
            {tira.width * escalaX > 25 && (
              <text
                x={padding + (tira.x + tira.width / 2) * escalaX}
                y={padding + alturaChapa / 2}
                textAnchor="middle"
                dominantBaseline="middle"
                fill="white"
                fontSize={tira.width * escalaX > 40 ? 10 : 8}
                fontWeight="500"
              >
                {Math.round(tira.width)}
              </text>
            )}
          </g>
        ))}
        
        {/* Área de perda */}
        {distribuicao.larguraPerda > 0 && (
          <g>
            <rect
              x={padding + distribuicao.larguraUtilizada * escalaX}
              y={padding}
              width={distribuicao.larguraPerda * escalaX}
              height={alturaChapa}
              fill="hsl(var(--destructive))"
              opacity={0.3}
            />
            <pattern id={`stripes-${distribuicao.chapaIndex}`} patternUnits="userSpaceOnUse" width="4" height="4">
              <path d="M-1,1 l2,-2 M0,4 l4,-4 M3,5 l2,-2" stroke="hsl(var(--destructive))" strokeWidth="0.5" opacity="0.5"/>
            </pattern>
            <rect
              x={padding + distribuicao.larguraUtilizada * escalaX}
              y={padding}
              width={distribuicao.larguraPerda * escalaX}
              height={alturaChapa}
              fill={`url(#stripes-${distribuicao.chapaIndex})`}
            />
          </g>
        )}
        
        {/* Dimensões */}
        <text
          x={padding}
          y={svgHeight - 5}
          fontSize={9}
          fill="hsl(var(--muted-foreground))"
        >
          Largura: {larguraChapa}mm
        </text>
      </svg>
      
      {/* Legenda */}
      <div className="flex flex-wrap gap-2 mt-2">
        {Array.from(new Set(distribuicao.tiras.map(t => t.tipo))).map(tipo => {
          const total = distribuicao.tiras
            .filter(t => t.tipo === tipo)
            .reduce((sum, t) => sum + t.quantidade, 0);
          return (
            <div key={tipo} className="flex items-center gap-1 text-xs">
              <div 
                className="w-3 h-3 rounded-sm" 
                style={{ backgroundColor: getCorPerfil(tipo) }}
              />
              <span className="text-muted-foreground">
                {formatarTipoPerfil(tipo)} ({total}x)
              </span>
            </div>
          );
        })}
        {distribuicao.larguraPerda > 0 && (
          <div className="flex items-center gap-1 text-xs">
            <div className="w-3 h-3 rounded-sm bg-destructive/30" />
            <span className="text-muted-foreground">Perda</span>
          </div>
        )}
      </div>
    </div>
  );
}
