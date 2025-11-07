import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { SimpleChart } from '@/components/SimpleChart';
import { usePerfilContext } from '@/context/PerfilContext';
import { formatarNumero } from '@/lib/utils-perfil';
import { Weight, Package, AlertTriangle, TrendingUp } from 'lucide-react';

const TIPO_LABELS = {
  'U': 'Perfil U',
  'L': 'Perfil L',
  'U_ENRIJECIDO': 'U Enrijecido',
  'CARTOLA': 'Cartola',
  'CARTOLA_ENRIJECIDO': 'Cartola Enrijecido'
};

export function PainelResumo() {
  const { obterResumoGeral } = usePerfilContext();
  const resumo = obterResumoGeral();
  
  const percentualPerda = resumo.pesoTotal > 0 
    ? (resumo.pesoTotalPerda / resumo.pesoTotal) * 100 
    : 0;

  const dadosGraficoPizza = Object.entries(resumo.perdaPorTipo)
    .filter(([_, valor]) => valor > 0)
    .map(([tipo, valor]) => ({
      name: TIPO_LABELS[tipo as keyof typeof TIPO_LABELS] || tipo,
      value: valor
    }));

  const eficiencia = resumo.pesoTotal > 0 
    ? ((resumo.pesoTotal - resumo.pesoTotalPerda) / resumo.pesoTotal) * 100 
    : 0;

  return (
    <div className="space-y-6">
      {/* Métricas Principais */}
      <div className="grid grid-cols-1 gap-4">
        <Card className="border border-primary/20 bg-primary/5">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-primary/20 rounded-lg">
                <Weight className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Peso Total</p>
                <p className="text-2xl font-bold text-primary">
                  {formatarNumero(resumo.pesoTotal)} kg
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border border-destructive/20 bg-destructive/5">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-destructive/20 rounded-lg">
                <AlertTriangle className="h-5 w-5 text-destructive" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Peso de Perda</p>
                <p className="text-xl font-bold text-destructive">
                  {formatarNumero(resumo.pesoTotalPerda)} kg
                </p>
                <Badge variant="outline" className="text-xs mt-1">
                  {formatarNumero(percentualPerda)}%
                </Badge>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border border-success/20 bg-success/5">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-success/20 rounded-lg">
                <TrendingUp className="h-5 w-5 text-success" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Eficiência</p>
                <p className="text-xl font-bold text-success">
                  {formatarNumero(eficiencia)}%
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border border-primary/20">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-primary/10 rounded-lg">
                <Package className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total de Peças</p>
                <p className="text-xl font-bold">
                  {formatarNumero(resumo.quantidadeTotalPecas)}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Separator />

      {/* Gráfico de Perda por Tipo */}
      {dadosGraficoPizza.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium">Distribuição de Perda por Tipo</CardTitle>
          </CardHeader>
          <CardContent>
            <SimpleChart data={dadosGraficoPizza} type="pie" height={250} />
          </CardContent>
        </Card>
      )}

      {/* Peso Líquido */}
      <Card className="bg-gradient-to-r from-primary/10 to-primary/5">
        <CardContent className="p-4">
          <div className="text-center">
            <p className="text-sm text-muted-foreground mb-2">Peso Líquido (sem perdas)</p>
            <p className="text-3xl font-bold text-primary">
              {formatarNumero(resumo.pesoTotal - resumo.pesoTotalPerda)} kg
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Lista de Perdas por Tipo */}
      {Object.entries(resumo.perdaPorTipo).filter(([_, valor]) => valor > 0).length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium">Perdas Detalhadas</CardTitle>
          </CardHeader>
          <CardContent className="p-4">
            <div className="space-y-2">
              {Object.entries(resumo.perdaPorTipo)
                .filter(([_, valor]) => valor > 0)
                .map(([tipo, valor]) => (
                  <div key={tipo} className="flex justify-between items-center py-2">
                    <span className="text-sm font-medium">
                      {TIPO_LABELS[tipo as keyof typeof TIPO_LABELS] || tipo}
                    </span>
                    <Badge variant="outline" className="text-destructive">
                      {formatarNumero(valor)} kg
                    </Badge>
                  </div>
                ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}