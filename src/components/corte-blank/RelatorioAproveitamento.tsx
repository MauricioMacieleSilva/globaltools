
import React, { useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { FileDown, Calculator, AlertTriangle } from 'lucide-react';
import { useCorteBlanks } from '@/context/CorteBlanksContext';
import { generatePDFFromElement } from '@/lib/pdf-utils';
import { useToast } from '@/hooks/use-toast';

export function RelatorioAproveitamento() {
  const { resultado, chapa, calcularPesoChapa } = useCorteBlanks();
  const { toast } = useToast();
  const relatorioRef = useRef<HTMLDivElement>(null);

  if (!resultado) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calculator className="h-5 w-5" />
            Relatório de Aproveitamento
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-muted-foreground">
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
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Calculator className="h-5 w-5" />
          Relatório de Aproveitamento
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6" ref={relatorioRef}>
        {/* Alerta de perda alta */}
        {perdaAlta && (
          <div className="flex items-center gap-2 p-4 bg-yellow-500/10 border border-yellow-500/20 rounded-lg">
            <AlertTriangle className="h-5 w-5 text-yellow-600" />
            <div className="text-sm text-yellow-800">
              <strong>Atenção:</strong> A perda estimada de {chapa.perdaEstimada}% é considerada alta. 
              Considere revisar o processo de corte para reduzir desperdícios.
            </div>
          </div>
        )}

        {/* Métricas principais */}
        <div className="grid grid-cols-2 lg:grid-cols-6 gap-4">
          <div className="bg-primary/10 p-4 rounded-lg">
            <div className="text-2xl font-bold text-primary">
              {resultado.chapasUsadas}
            </div>
            <div className="text-sm text-muted-foreground">Chapas Necessárias</div>
          </div>
          <div className="bg-blue-500/10 p-4 rounded-lg">
            <div className="text-2xl font-bold text-blue-600">
              {resultado.pecasPosicionadas.length}
            </div>
            <div className="text-sm text-muted-foreground">Total de Peças</div>
          </div>
          <div className="bg-green-500/10 p-4 rounded-lg">
            <div className="text-2xl font-bold text-green-600">
              {resultado.pesoUtilizado.toFixed(1)} kg
            </div>
            <div className="text-sm text-muted-foreground">Peso Utilizado</div>
          </div>
          <div className="bg-red-500/10 p-4 rounded-lg">
            <div className="text-2xl font-bold text-red-600">
              {resultado.pesoSobra.toFixed(1)} kg
            </div>
            <div className="text-sm text-muted-foreground">Peso de Sobra</div>
          </div>
          <div className="bg-orange-500/10 p-4 rounded-lg">
            <div className="text-2xl font-bold text-orange-600">
              {resultado.pesoPerda.toFixed(1)} kg
            </div>
            <div className="text-sm text-muted-foreground">Peso da Perda</div>
          </div>
          <div className="bg-purple-500/10 p-4 rounded-lg">
            <div className="text-2xl font-bold text-purple-600">
              {resultado.aproveitamentoReal.toFixed(1)}%
            </div>
            <div className="text-sm text-muted-foreground">Aproveitamento Real</div>
          </div>
        </div>

        {/* Comparativo de aproveitamento */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <div className="p-4 bg-muted/30 rounded-lg">
            <h4 className="font-semibold mb-2">Aproveitamento sem Perda</h4>
            <div className="text-2xl font-bold text-green-600">
              {resultado.aproveitamento.toFixed(1)}%
            </div>
            <div className="text-sm text-muted-foreground">
              Baseado apenas no corte das peças
            </div>
          </div>
          <div className="p-4 bg-muted/30 rounded-lg">
            <h4 className="font-semibold mb-2">Aproveitamento Real</h4>
            <div className="text-2xl font-bold text-purple-600">
              {resultado.aproveitamentoReal.toFixed(1)}%
            </div>
            <div className="text-sm text-muted-foreground">
              Incluindo perda estimada de {chapa.perdaEstimada}%
            </div>
          </div>
        </div>

        {/* Resumo de áreas e pesos */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Áreas */}
          <div className="border rounded-lg p-4">
            <h4 className="font-semibold mb-3">Distribuição de Áreas</h4>
            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Área Total das Chapas:</span>
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
                <span>Área da Perda Estimada:</span>
                <span className="font-medium">{(resultado.areaPerda / 1000000).toFixed(2)} m²</span>
              </div>
              <hr />
              <div className="flex justify-between font-semibold">
                <span>Total com Perda:</span>
                <span>{((resultado.areaTotal + resultado.areaPerda) / 1000000).toFixed(2)} m²</span>
              </div>
            </div>
          </div>

          {/* Pesos */}
          <div className="border rounded-lg p-4">
            <h4 className="font-semibold mb-3">Distribuição de Pesos</h4>
            <div className="space-y-3">
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
              <hr />
              <div className="flex justify-between font-semibold">
                <span>Total com Perda:</span>
                <span>{resultado.pesoTotalComPerda.toFixed(1)} kg</span>
              </div>
            </div>
          </div>
        </div>

        {/* Detalhamento por peça */}
        <div className="border rounded-lg">
          <div className="p-4 border-b">
            <h4 className="font-semibold">Detalhamento por Peça</h4>
          </div>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Peça</TableHead>
                <TableHead>Dimensões</TableHead>
                <TableHead>Quantidade</TableHead>
                <TableHead>Peças/Chapa</TableHead>
                <TableHead>Chapas Necessárias</TableHead>
                <TableHead>Área Total</TableHead>
                <TableHead>Aproveitamento</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {resultado.detalhamentoPecas.map((item, index) => (
                <TableRow key={index}>
                  <TableCell className="font-medium">
                    {item.nome || `Peça ${index + 1}`}
                  </TableCell>
                  <TableCell>{item.dimensoes}</TableCell>
                  <TableCell>{item.quantidade}</TableCell>
                  <TableCell>{item.pecasPorChapa}</TableCell>
                  <TableCell>{item.chapasNecessarias}</TableCell>
                  <TableCell>{(item.areaTotal / 1000000).toFixed(3)} m²</TableCell>
                  <TableCell>{item.aproveitamento.toFixed(1)}%</TableCell>
                  <TableCell>
                    <span className={`px-2 py-1 rounded-full text-xs ${
                      item.status === 'Ótimo' ? 'bg-green-100 text-green-800' :
                      item.status === 'Bom' ? 'bg-yellow-100 text-yellow-800' :
                      'bg-red-100 text-red-800'
                    }`}>
                      {item.status}
                    </span>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>

        {/* Informações da chapa */}
        <div className="border rounded-lg p-4">
          <h4 className="font-semibold mb-3">Informações da Chapa</h4>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 text-sm">
            <div>
              <span className="text-muted-foreground">Dimensões:</span>
              <div className="font-medium">
                {chapa.largura} × {chapa.altura} mm
              </div>
            </div>
            <div>
              <span className="text-muted-foreground">Espessura:</span>
              <div className="font-medium">{chapa.espessura} mm</div>
            </div>
            <div>
              <span className="text-muted-foreground">Peso por chapa:</span>
              <div className="font-medium">{calcularPesoChapa().toFixed(1)} kg</div>
            </div>
            <div>
              <span className="text-muted-foreground">Margem de segurança:</span>
              <div className="font-medium">{chapa.margemSeguranca} mm</div>
            </div>
          </div>
          {chapa.perdaEstimada > 0 && (
            <div className="mt-3 p-3 bg-orange-500/10 rounded-lg">
              <div className="text-sm">
                <strong>Perda Estimada:</strong> {chapa.perdaEstimada}% 
                ({(resultado.areaPerda / 1000000).toFixed(2)} m² | {resultado.pesoPerda.toFixed(1)} kg)
              </div>
            </div>
          )}
        </div>

        {/* Botão de exportação */}
        <div className="flex justify-center">
          <Button onClick={exportarPDF} className="min-w-[200px]">
            <FileDown className="h-4 w-4 mr-2" />
            Baixar PDF
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
