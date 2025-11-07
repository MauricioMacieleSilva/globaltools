import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { AlertTriangle } from 'lucide-react';

export function PoliticaDescontos() {
  return (
    <Card className="mb-6">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <AlertTriangle className="h-5 w-5 text-amber-500" />
          Política de Descontos por Volume
        </CardTitle>
        <CardDescription>
          Diretrizes para aplicação de descontos conforme volume
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-3">
            <h4 className="font-medium text-sm">Conforme Volume:</h4>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between p-2 bg-muted/50 rounded">
                <span>Até 2 toneladas</span>
                <span className="font-medium">Até 2%</span>
              </div>
              <div className="flex justify-between p-2 bg-muted/50 rounded">
                <span>De 2 a 5 toneladas</span>
                <span className="font-medium">Até 3%</span>
              </div>
              <div className="flex justify-between p-2 bg-muted/50 rounded">
                <span>De 5 a 10 toneladas</span>
                <span className="font-medium">Até 4%</span>
              </div>
              <div className="flex justify-between p-2 bg-muted/50 rounded">
                <span>Acima de 10 toneladas</span>
                <span className="font-medium">Até 5%</span>
              </div>
            </div>
          </div>
          
          <div className="space-y-3">
            <h4 className="font-medium text-sm">Observações Importantes:</h4>
            <div className="space-y-2 text-sm text-muted-foreground">
              <div className="p-3 bg-amber-50 border border-amber-200 rounded text-amber-800">
                <p className="font-medium">⚠️ Aprovação Necessária</p>
                <p className="mt-1">Descontos que excedam o máximo por volume (5%) deverão ser avaliados pela gestão.</p>
              </div>
              <div className="p-3 bg-blue-50 border border-blue-200 rounded text-blue-800">
                <p className="font-medium">🚚 Pedidos CIF</p>
                <p className="mt-1">Para pedidos CIF deverá ser realizada cotação de frete (Tabela de frete em desenvolvimento).</p>
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}