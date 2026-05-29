import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { AlertTriangle } from 'lucide-react';
import { usePoliticaComercial } from '@/context/PoliticaComercialContext';
import { formatarFaixaLabel } from '@/hooks/useFaixasDesconto';
import { EditarFaixasDescontoDialog } from './EditarFaixasDescontoDialog';

interface PoliticaDescontosProps {
  isAdmin?: boolean;
}

export function PoliticaDescontos({ isAdmin }: PoliticaDescontosProps) {
  const { faixasDesconto } = usePoliticaComercial();
  const ordenadas = [...faixasDesconto].sort((a, b) => a.ordem - b.ordem);
  const descontoMaximo = ordenadas.reduce((m, f) => Math.max(m, f.desconto_max_percent), 0);
  return (
    <Card className="mb-6" data-tour="politica-descontos">
      <CardHeader>
        <div className="flex items-center justify-between gap-2">
          <CardTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-amber-500" />
            Política de Descontos por Volume
          </CardTitle>
          {isAdmin && <EditarFaixasDescontoDialog />}
        </div>
        <CardDescription>
          Diretrizes para aplicação de descontos conforme volume
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-3">
            <h4 className="font-medium text-sm">Conforme Volume:</h4>
            <div className="space-y-2 text-sm">
              {ordenadas.length === 0 && (
                <div className="text-xs text-muted-foreground italic">Nenhuma faixa cadastrada.</div>
              )}
              {ordenadas.map(f => (
                <div key={f.id} className="flex justify-between p-2 bg-muted/50 rounded">
                  <span>{formatarFaixaLabel(f)}</span>
                  <span className="font-medium">Até {f.desconto_max_percent}%</span>
                </div>
              ))}
            </div>
          </div>
          
          <div className="space-y-3">
            <h4 className="font-medium text-sm">Observações Importantes:</h4>
            <div className="space-y-2 text-sm text-muted-foreground">
              <div className="p-3 bg-amber-50 border border-amber-200 rounded text-amber-800">
                <p className="font-medium">⚠️ Aprovação Necessária</p>
                <p className="mt-1">Descontos que excedam o máximo por volume ({descontoMaximo}%) deverão ser avaliados pela gestão.</p>
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}