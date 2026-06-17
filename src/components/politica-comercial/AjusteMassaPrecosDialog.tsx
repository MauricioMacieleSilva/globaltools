import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Percent, Loader2, ArrowUpRight } from 'lucide-react';
import { bulkAdjustPrices } from '@/services/politicaComercialService';
import { toast } from 'sonner';

interface AjusteMassaPrecosDialogProps {
  onDataChanged: () => void;
}

const CLASSES_OPTIONS = [
  { value: 'TODAS', label: 'Todas as classes' },
  { value: 'ARAMES', label: 'Arames' },
  { value: 'BOBINAS', label: 'Bobinas' },
  { value: 'PERFIS', label: 'Perfis' },
  { value: 'CHAPAS', label: 'Chapas' },
  { value: 'TELHAS', label: 'Telhas' },
  { value: 'TUBOS', label: 'Tubos' },
  { value: 'LAMINADOS', label: 'Laminados' },
  { value: 'VERGALHAO', label: 'Construção Civil' },
  { value: 'BLANK', label: 'Blank' }
];

export function AjusteMassaPrecosDialog({ onDataChanged }: AjusteMassaPrecosDialogProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [classe, setClasse] = useState('TODAS');
  const [variacao, setVariacao] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!variacao || isNaN(Number(variacao))) {
      toast.error('Por favor, informe um valor percentual válido');
      return;
    }

    const variacaoNum = Number(variacao);
    if (variacaoNum === 0) {
      toast.error('A variação deve ser diferente de 0%');
      return;
    }

    setIsLoading(true);
    try {
      const { error } = await bulkAdjustPrices(classe, variacaoNum);
      if (error) throw error;

      toast.success('Preços ajustados com sucesso!');
      setIsOpen(false);
      setVariacao('');
      onDataChanged();
    } catch (err: any) {
      console.error('Erro ao ajustar preços em massa:', err);
      toast.error('Erro ao processar ajuste de preços');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" className="w-full gap-2 border-primary/20 hover:border-primary/40 text-foreground hover:bg-accent py-5">
          <Percent className="h-4 w-4 text-primary" />
          Ajuste de Preço
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ArrowUpRight className="h-5 w-5 text-primary" />
              Ajuste de Preços em Massa
            </DialogTitle>
            <DialogDescription>
              Aumente ou diminua os preços de uma classe específica ou de todas as classes informando uma variação percentual.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="classe">Classe de Materiais</Label>
              <Select value={classe} onValueChange={setClasse}>
                <SelectTrigger id="classe">
                  <SelectValue placeholder="Selecione a classe" />
                </SelectTrigger>
                <SelectContent>
                  {CLASSES_OPTIONS.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="variacao">Variação Percentual (%)</Label>
              <div className="relative">
                <Input
                  id="variacao"
                  type="number"
                  step="0.01"
                  placeholder="Ex: 5 ou -3"
                  value={variacao}
                  onChange={(e) => setVariacao(e.target.value)}
                  className="pr-8"
                  disabled={isLoading}
                  required
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground font-medium">%</span>
              </div>
              <p className="text-xs text-muted-foreground leading-relaxed mt-1">
                Valores positivos (ex: <span className="font-semibold text-green-600">5.5</span>) aumentam os preços. Valores negativos (ex: <span className="font-semibold text-destructive">-2.3</span>) reduzem os preços.
              </p>
            </div>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsOpen(false)}
              disabled={isLoading}
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={isLoading} className="gap-2">
              {isLoading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Processando...
                </>
              ) : (
                'Aplicar Ajuste'
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
