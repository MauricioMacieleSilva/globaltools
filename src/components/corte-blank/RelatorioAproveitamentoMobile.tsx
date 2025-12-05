import React, { useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { FileDown, Calculator, AlertTriangle } from 'lucide-react';
import { useCorteBlanks } from '@/context/CorteBlanksContext';
import { generatePDFFromElement } from '@/lib/pdf-utils';
import { useToast } from '@/hooks/use-toast';

export function RelatorioAproveitamentoMobile() {
  const { resultado, chapa, calcularPesoChapa } = useCorteBlanks();
  const { toast } = useToast();
  const relatorioRef = useRef<HTMLDivElement>(null);

  if (!resultado) {
    return (
      <Card>
        <CardHeader className="p-4">
          <CardTitle className="text-base flex items-center gap-2">
            <Calculator className="h-5 w-5" />
            Relatório de Aproveitamento
          </CardTitle>
        </CardHeader>
        <CardContent className="p-4 pt-0">
          <div className="text-center py-6 text-muted-foreground text-sm">
            Execute a simulação para ver o relatório
          </div>
        </CardContent>
      </Card>
    );
  }

  const exportarPDF = async () => {
    if (!relatorioRef.current) {
      toast({
        title: "Erro",
        description: "Não foi possível capturar o relatório",
        variant: "destructive"
      });
      return;
    }

    try {
      toast({
        title: "Gerando PDF...",
        description: "Por favor, aguarde enquanto o PDF é gerado."
      });

      await generatePDFFromElement(relatorioRef.current, {
        filename: `relatorio_aproveitamento_${new Date().toISOString().split('T')[0]}.pdf`,
        orientation: 'portrait',
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

  const perdaAlta = chapa.perdaEstimada > 10;

  return (
    <Card>
      <CardHeader className="p-4">
        <CardTitle className="text-base flex items-center gap-2">
          <Calculator className="h-5 w-5" />
          Relatório de Aproveitamento
        </CardTitle>
      </CardHeader>
      <CardContent className="p-4 pt-0 space-y-4" ref={relatorioRef}>
        {/* Alerta de perda alta */}
        {perdaAlta && (
          <div className="flex items-start gap-2 p-3 bg-yellow-500/10 border border-yellow-500/20 rounded-lg">
            <AlertTriangle className="h-4 w-4 text-yellow-600 mt-0.5 flex-shrink-0" />
            <div className="text-xs text-yellow-800">
              <strong>Atenção:</strong> A perda estimada de {chapa.perdaEstimada}% é considerada alta.
            </div>
          </div>
        )}

        {/* Métricas principais - Grid 2x3 */}
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-primary/10 p-3 rounded-lg">
            <div className="text-xl font-bold text-primary">
              {resultado.chapasUsadas}
            </div>
            <div className="text-xs text-muted-foreground">Chapas Necessárias</div>
          </div>
          <div className="bg-blue-500/10 p-3 rounded-lg">
            <div className="text-xl font-bold text-blue-600">
              {resultado.pecasPosicionadas.length}
            </div>
            <div className="text-xs text-muted-foreground">Total de Peças</div>
          </div>
          <div className="bg-green-500/10 p-3 rounded-lg">
            <div className="text-xl font-bold text-green-600">
              {resultado.pesoUtilizado.toFixed(1)} kg
            </div>
            <div className="text-xs text-muted-foreground">Peso Utilizado</div>
          </div>
          <div className="bg-red-500/10 p-3 rounded-lg">
            <div className="text-xl font-bold text-red-600">
              {resultado.pesoSobra.toFixed(1)} kg
            </div>
            <div className="text-xs text-muted-foreground">Peso de Sobra</div>
          </div>
          <div className="bg-orange-500/10 p-3 rounded-lg">
            <div className="text-xl font-bold text-orange-600">
              {resultado.pesoPerda.toFixed(1)} kg
            </div>
            <div className="text-xs text-muted-foreground">Peso da Perda</div>
          </div>
          <div className="bg-purple-500/10 p-3 rounded-lg">
            <div className="text-xl font-bold text-purple-600">
              {resultado.aproveitamentoReal.toFixed(1)}%
            </div>
            <div className="text-xs text-muted-foreground">Aproveitamento Real</div>
          </div>
        </div>

        {/* Comparativo de aproveitamento */}
        <div className="grid grid-cols-2 gap-3">
          <div className="p-3 bg-muted/30 rounded-lg">
            <div className="text-xs text-muted-foreground mb-1">Sem Perda</div>
            <div className="text-lg font-bold text-green-600">
              {resultado.aproveitamento.toFixed(1)}%
            </div>
          </div>
          <div className="p-3 bg-muted/30 rounded-lg">
            <div className="text-xs text-muted-foreground mb-1">Com Perda ({chapa.perdaEstimada}%)</div>
            <div className="text-lg font-bold text-purple-600">
              {resultado.aproveitamentoReal.toFixed(1)}%
            </div>
          </div>
        </div>

        {/* Resumo de áreas */}
        <Card>
          <CardHeader className="p-3">
            <CardTitle className="text-sm">Distribuição de Áreas</CardTitle>
          </CardHeader>
          <CardContent className="p-3 pt-0 space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Área Total:</span>
              <span className="font-medium">{(resultado.areaTotal / 1000000).toFixed(2)} m²</span>
            </div>
            <div className="flex justify-between text-green-600">
              <span>Área Utilizada:</span>
              <span className="font-medium">{((resultado.areaTotal - resultado.areaDesperdicada) / 1000000).toFixed(2)} m²</span>
            </div>
            <div className="flex justify-between text-red-600">
              <span>Área de Sobra:</span>
              <span className="font-medium">{(resultado.areaDesperdicada / 1000000).toFixed(2)} m²</span>
            </div>
            <div className="flex justify-between text-orange-600">
              <span>Área da Perda:</span>
              <span className="font-medium">{(resultado.areaPerda / 1000000).toFixed(2)} m²</span>
            </div>
          </CardContent>
        </Card>

        {/* Resumo de pesos */}
        <Card>
          <CardHeader className="p-3">
            <CardTitle className="text-sm">Distribuição de Pesos</CardTitle>
          </CardHeader>
          <CardContent className="p-3 pt-0 space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Peso das Chapas:</span>
              <span className="font-medium">{(resultado.chapasUsadas * calcularPesoChapa()).toFixed(1)} kg</span>
            </div>
            <div className="flex justify-between text-green-600">
              <span>Peso Utilizado:</span>
              <span className="font-medium">{resultado.pesoUtilizado.toFixed(1)} kg</span>
            </div>
            <div className="flex justify-between text-red-600">
              <span>Peso de Sobra:</span>
              <span className="font-medium">{resultado.pesoSobra.toFixed(1)} kg</span>
            </div>
            <div className="flex justify-between text-orange-600">
              <span>Peso da Perda:</span>
              <span className="font-medium">{resultado.pesoPerda.toFixed(1)} kg</span>
            </div>
            <div className="flex justify-between font-semibold pt-2 border-t">
              <span>Total com Perda:</span>
              <span>{resultado.pesoTotalComPerda.toFixed(1)} kg</span>
            </div>
          </CardContent>
        </Card>

        {/* Detalhamento por peça - Cards */}
        <Card>
          <CardHeader className="p-3">
            <CardTitle className="text-sm">Detalhamento por Peça</CardTitle>
          </CardHeader>
          <CardContent className="p-3 pt-0 space-y-2">
            {resultado.detalhamentoPecas.map((item, index) => (
              <div key={index} className="p-3 border rounded-lg space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-medium text-sm">
                    {item.nome || `Peça ${index + 1}`}
                  </span>
                  <span className={`px-2 py-0.5 rounded-full text-xs ${
                    item.status === 'Ótimo' ? 'bg-green-100 text-green-800' :
                    item.status === 'Bom' ? 'bg-yellow-100 text-yellow-800' :
                    'bg-red-100 text-red-800'
                  }`}>
                    {item.status}
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div>
                    <span className="text-muted-foreground">Dimensões:</span>
                    <div className="font-medium">{item.dimensoes}</div>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Quantidade:</span>
                    <div className="font-medium">{item.quantidade}</div>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Peças/Chapa:</span>
                    <div className="font-medium">{item.pecasPorChapa}</div>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Chapas:</span>
                    <div className="font-medium">{item.chapasNecessarias}</div>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Área Total:</span>
                    <div className="font-medium">{(item.areaTotal / 1000000).toFixed(3)} m²</div>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Aproveitamento:</span>
                    <div className="font-medium">{item.aproveitamento.toFixed(1)}%</div>
                  </div>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Informações da chapa */}
        <Card>
          <CardHeader className="p-3">
            <CardTitle className="text-sm">Informações da Chapa</CardTitle>
          </CardHeader>
          <CardContent className="p-3 pt-0">
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div>
                <span className="text-muted-foreground text-xs">Dimensões:</span>
                <div className="font-medium">{chapa.largura} × {chapa.altura} mm</div>
              </div>
              <div>
                <span className="text-muted-foreground text-xs">Espessura:</span>
                <div className="font-medium">{chapa.espessura} mm</div>
              </div>
              <div>
                <span className="text-muted-foreground text-xs">Peso/chapa:</span>
                <div className="font-medium">{calcularPesoChapa().toFixed(1)} kg</div>
              </div>
              <div>
                <span className="text-muted-foreground text-xs">Margem:</span>
                <div className="font-medium">{chapa.margemSeguranca} mm</div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Botão de exportação */}
        <Button onClick={exportarPDF} className="w-full">
          <FileDown className="h-4 w-4 mr-2" />
          Baixar PDF
        </Button>
      </CardContent>
    </Card>
  );
}
