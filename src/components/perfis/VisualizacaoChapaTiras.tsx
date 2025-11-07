
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { CalculoItem } from '@/context/PerfilContext';
import { formatarNumero } from '@/lib/utils-perfil';

interface VisualizacaoChapaTirasProps {
  calculos: CalculoItem[];
  tipoPerfil: string;
}

export function VisualizacaoChapaTiras({ calculos, tipoPerfil }: VisualizacaoChapaTirasProps) {
  // Filtrar apenas cálculos válidos
  const calculosValidos = calculos.filter(calc => 
    calc.pesoTotal > 0 && 
    calc.quantidade > 0 && 
    calc.tira > 0 && 
    calc.largura > 0
  );

  if (calculosValidos.length === 0) {
    return null;
  }

  // Usar o primeiro cálculo válido para a visualização (pode ser expandido para mostrar todos)
  const calculo = calculosValidos[0];
  
  // Calcular dimensões para a visualização
  const larguraTotal = calculo.largura;
  const larguraTira = calculo.tira;
  const tirasAproveitadas = calculo.tirasAproveitadas;
  const larguraPerda = calculo.tiraPerda;
  const percentualAproveitamento = ((larguraTotal - larguraPerda) / larguraTotal) * 100;
  
  // Calcular quantidade de chapas necessárias
  const totalPecas = calculosValidos.reduce((acc, item) => acc + (item.quantidade || 0), 0);
  const pecasPorChapa = tirasAproveitadas || 1;
  const quantidadeChapas = Math.ceil(totalPecas / pecasPorChapa);

  // Dimensões do SVG
  const svgWidth = 800;
  const svgHeight = 200;
  const chapaHeight = 120;
  const chapaY = (svgHeight - chapaHeight) / 2;
  
  // Escala para visualização
  const escala = (svgWidth - 100) / larguraTotal;
  const larguraTiraVis = larguraTira * escala;
  const larguraPerdaVis = larguraPerda * escala;

  return (
    <Card className="mt-6 shadow-lg border-0 bg-gradient-card">
      <CardHeader className="border-b bg-primary/5 p-4">
        <CardTitle className="flex items-center gap-2 text-primary text-lg">
          Visualização do Corte - {tipoPerfil}
        </CardTitle>
      </CardHeader>
      <CardContent className="p-6">
        <div className="space-y-4">
          {/* Informações principais */}
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4 text-sm">
            <div className="text-center">
              <div className="text-xs text-muted-foreground">Largura Total</div>
              <div className="font-semibold">{formatarNumero(larguraTotal)} mm</div>
            </div>
            <div className="text-center">
              <div className="text-xs text-muted-foreground">Largura da Tira</div>
              <div className="font-semibold text-blue-600">{formatarNumero(larguraTira)} mm</div>
            </div>
            <div className="text-center">
              <div className="text-xs text-muted-foreground">Tiras Aproveitadas</div>
              <div className="font-semibold text-green-600">{tirasAproveitadas}</div>
            </div>
            <div className="text-center">
              <div className="text-xs text-muted-foreground">Perda</div>
              <div className="font-semibold text-red-600">{formatarNumero(larguraPerda)} mm</div>
            </div>
            <div className="text-center">
              <div className="text-xs text-muted-foreground">Chapas Necessárias</div>
              <div className="font-semibold text-purple-600">{quantidadeChapas}</div>
            </div>
          </div>

          {/* Visualização SVG */}
          <div className="flex justify-center">
            <svg width={svgWidth} height={svgHeight} className="border rounded-lg bg-background">
              {/* Chapa base */}
              <rect
                x={50}
                y={chapaY}
                width={svgWidth - 100}
                height={chapaHeight}
                fill="hsl(var(--muted))"
                stroke="hsl(var(--border))"
                strokeWidth="2"
                rx="4"
              />
              
              {/* Tiras aproveitadas */}
              {Array.from({ length: tirasAproveitadas }, (_, index) => (
                <rect
                  key={index}
                  x={50 + index * larguraTiraVis}
                  y={chapaY}
                  width={larguraTiraVis}
                  height={chapaHeight}
                  fill="hsl(var(--primary) / 0.3)"
                  stroke="hsl(var(--primary))"
                  strokeWidth="1"
                />
              ))}
              
              {/* Área de perda */}
              {larguraPerda > 0 && (
                <rect
                  x={50 + tirasAproveitadas * larguraTiraVis}
                  y={chapaY}
                  width={larguraPerdaVis}
                  height={chapaHeight}
                  fill="hsl(var(--destructive) / 0.3)"
                  stroke="hsl(var(--destructive))"
                  strokeWidth="1"
                />
              )}
              
              {/* Labels */}
              <text
                x={50 + (svgWidth - 100) / 2}
                y={chapaY - 10}
                textAnchor="middle"
                className="text-xs fill-muted-foreground"
              >
                Largura Total: {formatarNumero(larguraTotal)} mm
              </text>
              
              {/* Label da primeira tira */}
              {tirasAproveitadas > 0 && (
                <text
                  x={50 + larguraTiraVis / 2}
                  y={chapaY + chapaHeight / 2 + 4}
                  textAnchor="middle"
                  className="text-xs fill-primary font-medium"
                >
                  Tira: {formatarNumero(larguraTira)}mm
                </text>
              )}
              
              {/* Label da perda */}
              {larguraPerda > 0 && (
                <text
                  x={50 + tirasAproveitadas * larguraTiraVis + larguraPerdaVis / 2}
                  y={chapaY + chapaHeight / 2 + 4}
                  textAnchor="middle"
                  className="text-xs fill-destructive font-medium"
                >
                  Perda
                </text>
              )}
              
              {/* Dimensões */}
              {Array.from({ length: tirasAproveitadas }, (_, index) => (
                <g key={`dim-${index}`}>
                  <line
                    x1={50 + index * larguraTiraVis}
                    y1={chapaY + chapaHeight + 10}
                    x2={50 + (index + 1) * larguraTiraVis}
                    y2={chapaY + chapaHeight + 10}
                    stroke="hsl(var(--muted-foreground))"
                    strokeWidth="1"
                  />
                  <line
                    x1={50 + index * larguraTiraVis}
                    y1={chapaY + chapaHeight + 5}
                    x2={50 + index * larguraTiraVis}
                    y2={chapaY + chapaHeight + 15}
                    stroke="hsl(var(--muted-foreground))"
                    strokeWidth="1"
                  />
                  <line
                    x1={50 + (index + 1) * larguraTiraVis}
                    y1={chapaY + chapaHeight + 5}
                    x2={50 + (index + 1) * larguraTiraVis}
                    y2={chapaY + chapaHeight + 15}
                    stroke="hsl(var(--muted-foreground))"
                    strokeWidth="1"
                  />
                </g>
              ))}
            </svg>
          </div>

          {/* Resumo do aproveitamento */}
          <div className="bg-primary/5 p-4 rounded-lg border border-primary/20">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-center">
              <div>
                <div className="text-sm text-muted-foreground">Aproveitamento</div>
                <div className="text-xl font-bold text-green-600">
                  {formatarNumero(percentualAproveitamento)}%
                </div>
              </div>
              <div>
                <div className="text-sm text-muted-foreground">Material Aproveitado</div>
                <div className="text-xl font-bold text-primary">
                  {formatarNumero(larguraTotal - larguraPerda)} mm
                </div>
              </div>
              <div>
                <div className="text-sm text-muted-foreground">Total Material Perdido</div>
                <div className="text-xl font-bold text-destructive">
                  {formatarNumero(larguraPerda * quantidadeChapas)} mm
                </div>
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
