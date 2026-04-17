import React from 'react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { CalculoItem } from '@/context/PerfilContext';
import { Eye, Lightbulb } from 'lucide-react';
import { perfilPadraoU, perfilPadraoUE } from '@/lib/perfil-padrao-utils';

interface SugestaoPerfil {
  tipo: string;
  descricao: string;
  tira: number;
}

interface VisualizacaoPerfilPopoverProps {
  calculo: CalculoItem;
  tipoPerfil: string;
  children?: React.ReactNode;
}

// Função para encontrar perfis padrão que cabem na tira perda
function encontrarSugestoesPerfil(tiraPerda: number, espessura: number): SugestaoPerfil[] {
  const sugestoes: SugestaoPerfil[] = [];
  
  if (tiraPerda < 50) return sugestoes; // Mínimo para fazer algum perfil
  
  // Buscar perfis U que cabem na tira perda
  perfilPadraoU.forEach(perfil => {
    const tiraU = perfil.h + 2 * perfil.B;
    if (tiraU <= tiraPerda && perfil.espessuras.includes(espessura)) {
      sugestoes.push({
        tipo: 'U',
        descricao: `U ${perfil.h}x${perfil.B}`,
        tira: tiraU
      });
    }
  });
  
  // Buscar perfis UE que cabem na tira perda
  perfilPadraoUE.forEach(perfil => {
    const tiraUE = perfil.h + 2 * perfil.B + 2 * perfil.d;
    if (tiraUE <= tiraPerda && perfil.espessuras.includes(espessura)) {
      sugestoes.push({
        tipo: 'UE',
        descricao: `UE ${perfil.h}x${perfil.B}x${perfil.d}`,
        tira: tiraUE
      });
    }
  });
  
  // Ordenar por tira (maior primeiro - melhor aproveitamento)
  return sugestoes.sort((a, b) => b.tira - a.tira).slice(0, 3);
}

export function VisualizacaoPerfilPopover({ calculo, tipoPerfil, children }: VisualizacaoPerfilPopoverProps) {
  const larguraTotal = Math.ceil(calculo.largura);
  const larguraTira = Math.ceil(calculo.tira);
  const tirasAproveitadas = calculo.tirasAproveitadas;
  const larguraPerda = Math.ceil(calculo.tiraPerda);
  const percentualAproveitamento = ((larguraTotal - larguraPerda) / larguraTotal) * 100;
  
  // Encontrar sugestões de perfis padrão para a tira perda
  const sugestoes = encontrarSugestoesPerfil(larguraPerda, calculo.espessura);
  
  // Calcular quantidade de chapas necessárias
  const totalPecas = calculo.quantidade || 0;
  const pecasPorChapa = tirasAproveitadas || 1;
  const quantidadeChapas = Math.ceil(totalPecas / pecasPorChapa);
  // Tiras vazias na última chapa (peças não utilizadas) também contam como perda
  const tirasVaziasUltimaChapa = Math.max(0, (quantidadeChapas * pecasPorChapa) - totalPecas);
  const larguraPerdaTotal = (larguraPerda * quantidadeChapas) + (larguraTira * tirasVaziasUltimaChapa);

  // Dimensões do SVG
  const svgWidth = 400;
  const svgHeight = 120;
  const chapaHeight = 70;
  const chapaY = (svgHeight - chapaHeight) / 2;
  
  // Escala para visualização
  const escala = (svgWidth - 40) / larguraTotal;
  const larguraTiraVis = larguraTira * escala;
  const larguraPerdaVis = larguraPerda * escala;

  return (
    <Popover>
      <PopoverTrigger asChild>
        {children || (
          <button className="flex items-center justify-center w-full h-full cursor-pointer hover:bg-primary/5 rounded transition-colors">
            <Eye className="h-3 w-3 text-primary" />
          </button>
        )}
      </PopoverTrigger>
      <PopoverContent className="w-[450px] p-4" side="left" align="center">
        <div className="space-y-3">
          <div className="text-sm font-semibold text-primary border-b pb-2">
            Visualização do Corte - {tipoPerfil}
          </div>
          
          {/* Informações principais */}
          <div className="grid grid-cols-5 gap-2 text-xs">
            <div className="text-center">
              <div className="text-muted-foreground">Larg. Total</div>
              <div className="font-semibold">{larguraTotal} mm</div>
            </div>
            <div className="text-center">
              <div className="text-muted-foreground">Larg. Tira</div>
              <div className="font-semibold text-blue-600">{larguraTira} mm</div>
            </div>
            <div className="text-center">
              <div className="text-muted-foreground">Tiras</div>
              <div className="font-semibold text-green-600">{tirasAproveitadas}</div>
            </div>
            <div className="text-center">
              <div className="text-muted-foreground">Perda</div>
              <div className="font-semibold text-red-600">{larguraPerda} mm</div>
            </div>
            <div className="text-center">
              <div className="text-muted-foreground">Chapas</div>
              <div className="font-semibold text-purple-600">{quantidadeChapas}</div>
            </div>
          </div>

          {/* Visualização SVG */}
          <div className="flex justify-center">
            <svg width={svgWidth} height={svgHeight} className="border rounded bg-background">
              {/* Chapa base */}
              <rect
                x={20}
                y={chapaY}
                width={svgWidth - 40}
                height={chapaHeight}
                fill="hsl(var(--muted))"
                stroke="hsl(var(--border))"
                strokeWidth="1"
                rx="2"
              />
              
              {/* Tiras aproveitadas */}
              {Array.from({ length: tirasAproveitadas }, (_, index) => (
                <rect
                  key={index}
                  x={20 + index * larguraTiraVis}
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
                  x={20 + tirasAproveitadas * larguraTiraVis}
                  y={chapaY}
                  width={larguraPerdaVis}
                  height={chapaHeight}
                  fill="hsl(var(--destructive) / 0.3)"
                  stroke="hsl(var(--destructive))"
                  strokeWidth="1"
                />
              )}
              
              {/* Label da primeira tira */}
              {tirasAproveitadas > 0 && (
                <text
                  x={20 + larguraTiraVis / 2}
                  y={chapaY + chapaHeight / 2 + 4}
                  textAnchor="middle"
                  className="text-[10px] fill-primary font-medium"
                >
                  {larguraTira}mm
                </text>
              )}
              
              {/* Label da perda */}
              {larguraPerda > 0 && larguraPerdaVis > 30 && (
                <text
                  x={20 + tirasAproveitadas * larguraTiraVis + larguraPerdaVis / 2}
                  y={chapaY + chapaHeight / 2 + 4}
                  textAnchor="middle"
                  className="text-[10px] fill-destructive font-medium"
                >
                  Perda
                </text>
              )}
            </svg>
          </div>

          {/* Resumo do aproveitamento */}
          <div className="bg-primary/5 p-2 rounded border border-primary/20">
            <div className="grid grid-cols-3 gap-2 text-center text-xs">
              <div>
                <div className="text-muted-foreground">Aproveitamento</div>
                <div className="font-bold text-green-600">
                  {((larguraTotal - larguraPerda) / larguraTotal * 100).toFixed(2)}%
                </div>
              </div>
              <div>
                <div className="text-muted-foreground">Material Aproveitado</div>
                <div className="font-bold text-primary">
                  {Math.ceil(larguraTotal - larguraPerda)} mm
                </div>
              </div>
              <div>
                <div className="text-muted-foreground">Total Perda</div>
                <div className="font-bold text-destructive">
                  {Math.ceil(larguraPerdaTotal)} mm
                </div>
              </div>
            </div>
          </div>

          {/* Sugestões de perfis padrão */}
          {sugestoes.length > 0 && (
            <div className="bg-amber-500/10 p-2 rounded border border-amber-500/30">
              <div className="flex items-center gap-1 mb-2">
                <Lightbulb className="h-3 w-3 text-amber-600" />
                <span className="text-xs font-semibold text-amber-700">Sugestões com a Tira Perda ({larguraPerda} mm)</span>
              </div>
              <div className="grid grid-cols-3 gap-2">
                {sugestoes.map((sug, idx) => (
                  <div key={idx} className="text-center text-xs bg-background/50 rounded p-1">
                    <div className="font-semibold text-amber-700">{sug.descricao}</div>
                    <div className="text-muted-foreground">Tira: {sug.tira} mm</div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}
