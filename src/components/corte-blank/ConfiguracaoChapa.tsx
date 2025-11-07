import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { useCorteBlanks } from '@/context/CorteBlanksContext';
export function ConfiguracaoChapa() {
  const {
    chapa,
    atualizarChapa,
    calcularPesoChapa
  } = useCorteBlanks();
  const handleInputChange = (field: keyof typeof chapa, value: string) => {
    const numValue = parseFloat(value) || 0;
    atualizarChapa({
      ...chapa,
      [field]: numValue
    });
  };
  return <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Configuração da Chapa</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-5 gap-3">
            <div>
              <Label htmlFor="largura">Largura (mm)</Label>
              <Input id="largura" type="number" value={chapa.largura} onChange={e => handleInputChange('largura', e.target.value)} min="1" />
            </div>
            <div>
              <Label htmlFor="altura">Comprimento (mm)</Label>
              <Input id="altura" type="number" value={chapa.altura} onChange={e => handleInputChange('altura', e.target.value)} min="1" />
            </div>
            <div>
              <Label htmlFor="espessura">Espessura (mm)</Label>
              <Input id="espessura" type="number" value={chapa.espessura} onChange={e => handleInputChange('espessura', e.target.value)} min="0.1" step="0.1" />
            </div>
            <div>
              <Label htmlFor="margemSeguranca">Margem de Segurança (mm)</Label>
              <Input id="margemSeguranca" type="number" value={chapa.margemSeguranca} onChange={e => handleInputChange('margemSeguranca', e.target.value)} min="0" />
            </div>
            <div>
              <Label htmlFor="perdaEstimada">Perda Estimada (%)</Label>
              <Input id="perdaEstimada" type="number" value={chapa.perdaEstimada} onChange={e => handleInputChange('perdaEstimada', e.target.value)} min="0" max="100" step="0.1" />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Resumo da Chapa</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 text-sm">
            <div>
              <span className="text-muted-foreground">Área Total:</span>
              <div className="font-medium">
                {(chapa.largura * chapa.altura / 1000000).toFixed(2)} m²
              </div>
            </div>
            <div>
              <span className="text-muted-foreground">Área Útil:</span>
              <div className="font-medium">
                {((chapa.largura - 2 * chapa.margemSeguranca) * (chapa.altura - 2 * chapa.margemSeguranca) / 1000000).toFixed(2)} m²
              </div>
            </div>
            <div>
              <span className="text-muted-foreground">Peso por Chapa:</span>
              <div className="font-medium">{calcularPesoChapa().toFixed(1)} kg</div>
            </div>
            <div>
              <span className="text-muted-foreground">Perda Estimada:</span>
              <div className="font-medium">{chapa.perdaEstimada.toFixed(1)}%</div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>;
}