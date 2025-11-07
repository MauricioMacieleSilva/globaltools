
import React, { useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { FileDown } from 'lucide-react';
import { useCorteBlanks } from '@/context/CorteBlanksContext';
import { generatePDFFromElement } from '@/lib/pdf-utils';
import { useToast } from '@/hooks/use-toast';

export function VisualizacaoCorte() {
  const { chapa, resultado } = useCorteBlanks();
  const { toast } = useToast();
  const visualizacaoRef = useRef<HTMLDivElement>(null);

  if (!resultado) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Visualização do Corte</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-muted-foreground">
            Execute a simulação para ver o resultado
          </div>
        </CardContent>
      </Card>
    );
  }

  // Forçar orientação paisagem SEMPRE - largura sempre maior que altura na visualização
  const maxWidth = Math.min(window.innerWidth - 100, 1200);
  const maxHeight = 600;
  
  // Determinar se precisamos rotacionar conceptualmente
  const precisaRotacionar = chapa.altura > chapa.largura;
  
  // Na visualização, sempre paisagem
  const larguraVisu = precisaRotacionar ? chapa.altura : chapa.largura;
  const alturaVisu = precisaRotacionar ? chapa.largura : chapa.altura;
  
  const escala = Math.min(maxWidth / larguraVisu, maxHeight / alturaVisu);
  const larguraCanvas = larguraVisu * escala;
  const alturaCanvas = alturaVisu * escala;

  console.log('Visualização - Dados da chapa:', {
    chapaOriginal: { largura: chapa.largura, altura: chapa.altura },
    precisaRotacionar,
    visualizacao: { largura: larguraVisu, altura: alturaVisu },
    escala,
    canvas: { largura: larguraCanvas, altura: alturaCanvas }
  });

  // Cores distintas para cada tipo de peça
  const coresPorTipo: { [key: string]: string } = {};
  const cores = [
    '#2563eb', '#dc2626', '#059669', '#d97706', '#7c3aed',
    '#db2777', '#0d9488', '#ea580c', '#4f46e5', '#65a30d',
    '#be123c', '#0369a1', '#047857', '#b45309', '#6d28d9'
  ];

  // Atribuir cores por tipo de peça (nome)
  let corIndex = 0;
  resultado.pecasPosicionadas.forEach(item => {
    const tipoPeca = item.peca.nome || 'Sem nome';
    if (!coresPorTipo[tipoPeca]) {
      coresPorTipo[tipoPeca] = cores[corIndex % cores.length];
      corIndex++;
    }
  });

  const exportarPDF = async () => {
    if (!visualizacaoRef.current) {
      toast({
        title: "Erro",
        description: "Não foi possível capturar a visualização",
        variant: "destructive"
      });
      return;
    }

    try {
      toast({
        title: "Gerando PDF...",
        description: "Por favor, aguarde enquanto o PDF é gerado."
      });

      await generatePDFFromElement(visualizacaoRef.current, {
        filename: `visualizacao_corte_${new Date().toISOString().split('T')[0]}.pdf`,
        orientation: 'landscape',
        format: 'a4',
        quality: 2
      });

      toast({
        title: "PDF gerado com sucesso!",
        description: "O arquivo foi baixado para sua pasta de downloads."
      });
    } catch (error) {
      toast({
        title: "Erro ao gerar PDF",
        description: "Ocorreu um erro ao gerar o PDF. Tente novamente.",
        variant: "destructive"
      });
    }
  };

  // Agrupar peças por tipo para a legenda
  const tiposPecas: { [key: string]: { largura: number; altura: number; quantidade: number } } = {};
  resultado.pecasPosicionadas.forEach(item => {
    const tipoPeca = item.peca.nome || 'Sem nome';
    if (!tiposPecas[tipoPeca]) {
      tiposPecas[tipoPeca] = {
        largura: item.peca.largura,
        altura: item.peca.altura,
        quantidade: 0
      };
    }
    tiposPecas[tipoPeca].quantidade++;
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle>Visualização do Corte</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4" ref={visualizacaoRef}>
          {/* Controles de visualização */}
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
            <div className="text-sm text-muted-foreground">
              <div>Chapas: {resultado.chapasUsadas} | Aproveitamento: {resultado.aproveitamento.toFixed(1)}%</div>
              <div>
                Dimensões: {larguraVisu} × {alturaVisu} mm
              </div>
            </div>
            <Button onClick={exportarPDF} variant="outline">
              <FileDown className="h-4 w-4 mr-2" />
              Baixar PDF
            </Button>
          </div>

          {/* Container responsivo para as chapas */}
          <div className="space-y-6">
            {Array.from({ length: resultado.chapasUsadas }, (_, chapaIndex) => {
              const pecasDaChapa = resultado.pecasPosicionadas.filter(
                item => item.chapaIndex === chapaIndex
              );

              return (
                <div key={chapaIndex} className="space-y-3">
                  <h4 className="font-semibold text-lg">Chapa {chapaIndex + 1}</h4>
                  
                  {/* Container com scroll horizontal se necessário */}
                  <div className="border rounded-lg p-4 bg-gray-50 overflow-x-auto">
                    <div className="min-w-fit flex justify-center">
                      <svg
                        width={larguraCanvas}
                        height={alturaCanvas}
                        viewBox={`0 0 ${larguraVisu} ${alturaVisu}`}
                        className="border border-gray-300 bg-white rounded shadow-sm"
                      >
                        {/* Fundo da chapa */}
                        <rect
                          x="0"
                          y="0"
                          width={larguraVisu}
                          height={alturaVisu}
                          fill="#ffffff"
                          stroke="#e5e7eb"
                          strokeWidth="2"
                        />

                        {/* Grid de referência */}
                        <defs>
                          <pattern id={`grid-${chapaIndex}`} width="100" height="100" patternUnits="userSpaceOnUse">
                            <path d="M 100 0 L 0 0 0 100" fill="none" stroke="#f3f4f6" strokeWidth="1"/>
                          </pattern>
                        </defs>
                        <rect width="100%" height="100%" fill={`url(#grid-${chapaIndex})`} />

                        {/* Margem de segurança - ajustada para visualização paisagem */}
                        {chapa.margemSeguranca > 0 && (
                          <rect
                            x={chapa.margemSeguranca}
                            y={chapa.margemSeguranca}
                            width={larguraVisu - 2 * chapa.margemSeguranca}
                            height={alturaVisu - 2 * chapa.margemSeguranca}
                            fill="none"
                            stroke="#9ca3af"
                            strokeWidth="2"
                            strokeDasharray="8,4"
                            opacity="0.7"
                          />
                        )}

                        {/* Peças posicionadas */}
                        {pecasDaChapa.map((item, index) => {
                          const tipoPeca = item.peca.nome || 'Sem nome';
                          const cor = coresPorTipo[tipoPeca];

                          // Ajustar coordenadas para visualização paisagem
                          let x = item.x;
                          let y = item.y;
                          let larguraPeca = item.peca.largura;
                          let alturaPeca = item.peca.altura;

                          // Se a chapa original era retrato, rotacionar coordenadas para paisagem
                          if (precisaRotacionar) {
                            // Transformar coordenadas: rotação 90° no sentido horário
                            x = item.y;
                            y = chapa.largura - item.x - item.peca.largura;
                            larguraPeca = item.peca.altura;
                            alturaPeca = item.peca.largura;
                          }

                          console.log(`Peça ${index + 1}:`, {
                            original: { x: item.x, y: item.y, largura: item.peca.largura, altura: item.peca.altura },
                            transformada: { x, y, largura: larguraPeca, altura: alturaPeca },
                            precisaRotacionar
                          });

                          return (
                            <g key={`${item.peca.id}-${index}`}>
                              {/* Sombra da peça */}
                              <rect
                                x={x + 2}
                                y={y + 2}
                                width={larguraPeca}
                                height={alturaPeca}
                                fill="rgba(0,0,0,0.1)"
                                rx="2"
                              />
                              
                              {/* Peça principal */}
                              <rect
                                x={x}
                                y={y}
                                width={larguraPeca}
                                height={alturaPeca}
                                fill={cor}
                                fillOpacity="0.8"
                                stroke={cor}
                                strokeWidth="2"
                                rx="2"
                              />
                              
                              {/* Texto da peça */}
                              <text
                                x={x + larguraPeca / 2}
                                y={y + alturaPeca / 2}
                                textAnchor="middle"
                                dominantBaseline="middle"
                                fontSize={Math.max(10, Math.min(16, larguraPeca / 8))}
                                fill="white"
                                fontWeight="bold"
                              >
                                {item.peca.nome || `P${index + 1}`}
                              </text>
                              
                              {/* Dimensões da peça (se houver espaço) */}
                              {larguraPeca > 80 && alturaPeca > 40 && (
                                <text
                                  x={x + larguraPeca / 2}
                                  y={y + alturaPeca / 2 + 18}
                                  textAnchor="middle"
                                  dominantBaseline="middle"
                                  fontSize="11"
                                  fill="white"
                                  fontWeight="normal"
                                >
                                  {precisaRotacionar ? `${item.peca.altura}×${item.peca.largura}` : `${item.peca.largura}×${item.peca.altura}`}
                                </text>
                              )}
                            </g>
                          );
                        })}
                      </svg>
                    </div>
                  </div>

                  {/* Informações da chapa */}
                  <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 text-xs bg-muted/50 p-3 rounded">
                    <div>
                      <span className="text-muted-foreground">Peças:</span>
                      <span className="ml-1 font-medium">{pecasDaChapa.length}</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Área usada:</span>
                      <span className="ml-1 font-medium">
                        {(pecasDaChapa.reduce((sum, item) => sum + (item.peca.largura * item.peca.altura), 0) / 1000000).toFixed(2)} m²
                      </span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Área total:</span>
                      <span className="ml-1 font-medium">
                        {((chapa.largura * chapa.altura) / 1000000).toFixed(2)} m²
                      </span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Aproveitamento:</span>
                      <span className="ml-1 font-medium">
                        {((pecasDaChapa.reduce((sum, item) => sum + (item.peca.largura * item.peca.altura), 0) / (chapa.largura * chapa.altura)) * 100).toFixed(1)}%
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Legenda com dimensões */}
          <div className="mt-6">
            <h5 className="font-semibold mb-3">Legenda das Peças (com dimensões):</h5>
            <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-3 text-sm">
              {Object.entries(tiposPecas).map(([tipoPeca, dados]) => (
                <div key={tipoPeca} className="flex items-center gap-3 p-3 bg-card rounded border">
                  <div
                    className="w-6 h-6 rounded flex-shrink-0"
                    style={{ backgroundColor: coresPorTipo[tipoPeca] }}
                  />
                  <div className="min-w-0 flex-1">
                    <div className="font-medium truncate">{tipoPeca}</div>
                    <div className="text-xs text-muted-foreground">
                      {dados.largura} × {dados.altura} mm ({dados.quantidade}x)
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
