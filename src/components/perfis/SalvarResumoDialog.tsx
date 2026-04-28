import { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Save } from 'lucide-react';
import { toast } from 'sonner';
import { usePerfilContext } from '@/context/PerfilContext';
import { salvarResumoPerfil } from '@/services/perfilResumosService';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function SalvarResumoDialog({ open, onOpenChange }: Props) {
  const { obterSnapshot, obterResumoGeral, calculos } = usePerfilContext();
  const [nome, setNome] = useState('');
  const [observacao, setObservacao] = useState('');
  const [salvando, setSalvando] = useState(false);

  const handleSalvar = async () => {
    if (!nome.trim()) {
      toast.error('Informe um nome para o resumo');
      return;
    }
    const calculosValidos = Object.values(calculos).filter(c => c.pesoTotal > 0 && c.quantidade > 0);
    if (calculosValidos.length === 0) {
      toast.error('Não há cálculos para salvar');
      return;
    }

    setSalvando(true);
    const resumo = obterResumoGeral();
    const { error } = await salvarResumoPerfil({
      nome: nome.trim(),
      observacao: observacao.trim() || undefined,
      snapshot: obterSnapshot(),
      pesoTotal: resumo.pesoTotal,
      quantidadePecas: resumo.quantidadeTotalPecas,
    });
    setSalvando(false);

    if (error) {
      toast.error('Erro ao salvar resumo: ' + error.message);
      return;
    }
    toast.success('Resumo salvo com sucesso!');
    setNome('');
    setObservacao('');
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Save className="h-4 w-4" />
            Salvar resumo
          </DialogTitle>
          <DialogDescription>
            Salve este cálculo para poder consultá-lo depois exatamente como está agora.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div className="space-y-2">
            <Label htmlFor="nome-resumo">Nome *</Label>
            <Input
              id="nome-resumo"
              placeholder="Ex.: Obra Cliente X - Galpão"
              value={nome}
              onChange={(e) => setNome(e.target.value)}
              autoFocus
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="obs-resumo">Observação (opcional)</Label>
            <Textarea
              id="obs-resumo"
              placeholder="Observações sobre este resumo..."
              value={observacao}
              onChange={(e) => setObservacao(e.target.value)}
              rows={3}
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={salvando}>
            Cancelar
          </Button>
          <Button onClick={handleSalvar} disabled={salvando}>
            {salvando ? 'Salvando...' : 'Salvar'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}