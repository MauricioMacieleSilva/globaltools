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
  return <div className="space-y-4 sm:space-y-6">
      <Card>
        <CardHeader className="p-3 sm:p-6">
          <CardTitle className="text-base sm:text-lg">Configuração da Chapa</CardTitle>
        </CardHeader>
        <CardContent className="p-3 sm:p-6 pt-0">
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
            <div>
              <Label htmlFor="largura" className="text-xs sm:text-sm">Largura (mm)</Label>
              <Input id="largura" type="number" value={chapa.largura} onChange={e => handleInputChange('largura', e.target.value)} min="1" className="h-9" />
            </div>
            <div>
              <Label htmlFor="altura" className="text-xs sm:text-sm">Comprimento (mm)</Label>
              <Input id="altura" type="number" value={chapa.altura} onChange={e => handleInputChange('altura', e.target.value)} min="1" className="h-9" />
            </div>
            <div>
              <Label htmlFor="espessura" className="text-xs sm:text-sm">Espessura (mm)</Label>
              <Input id="espessura" type="number" value={chapa.espessura} onChange={e => handleInputChange('espessura', e.target.value)} min="0.1" step="0.1" className="h-9" />
            </div>
            <div>
              <Label htmlFor="margemSeguranca" className="text-xs sm:text-sm">Margem (mm)</Label>
              <Input id="margemSeguranca" type="number" value={chapa.margemSeguranca} onChange={e => handleInputChange('margemSeguranca', e.target.value)} min="0" className="h-9" />
            </div>
            <div className="col-span-2 sm:col-span-1">
              <Label htmlFor="perdaEstimada" className="text-xs sm:text-sm">Perda Est. (%)</Label>
              <Input id="perdaEstimada" type="number" value={chapa.perdaEstimada} onChange={e => handleInputChange('perdaEstimada', e.target.value)} min="0" max="100" step="0.1" className="h-9" />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="p-3 sm:p-6">
          <CardTitle className="text-base sm:text-lg">Resumo da Chapa</CardTitle>
        </CardHeader>
        <CardContent className="p-3 sm:p-6 pt-0">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 text-xs sm:text-sm">
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
              <span className="text-muted-foreground">Peso/Chapa:</span>
              <div className="font-medium">{calcularPesoChapa().toFixed(1)} kg</div>
            </div>
            <div>
              <span className="text-muted-foreground">Perda Est.:</span>
              <div className="font-medium">{chapa.perdaEstimada.toFixed(1)}%</div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>;
}