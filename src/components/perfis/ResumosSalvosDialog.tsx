import { useEffect, useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { FolderOpen, Trash2, FileText, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { usePerfilContext } from '@/context/PerfilContext';
import { listarResumosPerfil, excluirResumoPerfil, type ResumoSalvo } from '@/services/perfilResumosService';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ResumosSalvosDialog({ open, onOpenChange }: Props) {
  const { restaurarSnapshot, calculos } = usePerfilContext();
  const [resumos, setResumos] = useState<ResumoSalvo[]>([]);
  const [loading, setLoading] = useState(false);

  const carregar = async () => {
    setLoading(true);
    const { data, error } = await listarResumosPerfil();
    setLoading(false);
    if (error) {
      toast.error('Erro ao carregar resumos');
      return;
    }
    setResumos(data);
  };

  useEffect(() => {
    if (open) carregar();
  }, [open]);

  const handleAbrir = (resumo: ResumoSalvo) => {
    const temDadosAtuais = Object.values(calculos).some(c => c.pesoTotal > 0 && c.quantidade > 0);
    if (temDadosAtuais) {
      const ok = window.confirm('Você tem cálculos em andamento. Eles serão substituídos pelo resumo selecionado. Continuar?');
      if (!ok) return;
    }
    restaurarSnapshot(resumo.snapshot);
    toast.success(`Resumo "${resumo.nome}" carregado`);
    onOpenChange(false);
  };

  const handleExcluir = async (resumo: ResumoSalvo) => {
    if (!window.confirm(`Excluir o resumo "${resumo.nome}"? Esta ação não pode ser desfeita.`)) return;
    const { error } = await excluirResumoPerfil(resumo.id);
    if (error) {
      toast.error('Erro ao excluir');
      return;
    }
    toast.success('Resumo excluído');
    setResumos(prev => prev.filter(r => r.id !== resumo.id));
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FolderOpen className="h-4 w-4" />
            Resumos salvos
          </DialogTitle>
          <DialogDescription>
            Selecione um resumo para abrir no Corte Perfil exatamente como foi salvo.
          </DialogDescription>
        </DialogHeader>
        <ScrollArea className="max-h-[60vh] pr-3">
          {loading ? (
            <div className="flex items-center justify-center py-12 text-muted-foreground">
              <Loader2 className="h-5 w-5 animate-spin mr-2" /> Carregando...
            </div>
          ) : resumos.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <FileText className="h-10 w-10 mx-auto mb-2 opacity-50" />
              Nenhum resumo salvo ainda.
            </div>
          ) : (
            <div className="space-y-2">
              {resumos.map((r) => (
                <div
                  key={r.id}
                  className="border rounded-lg p-3 flex items-start justify-between gap-3 hover:bg-accent/50 transition-colors"
                >
                  <div className="flex-1 min-w-0">
                    <div className="font-medium truncate">{r.nome}</div>
                    {r.observacao && (
                      <div className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{r.observacao}</div>
                    )}
                    <div className="flex flex-wrap gap-x-3 gap-y-1 text-xs text-muted-foreground mt-1.5">
                      <span>{format(new Date(r.created_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}</span>
                      {r.user_name && <span>· {r.user_name}</span>}
                      <span>· {r.quantidade_pecas} peças</span>
                      <span>· {r.peso_total.toLocaleString('pt-BR', { maximumFractionDigits: 1 })} kg</span>
                    </div>
                  </div>
                  <div className="flex gap-1 shrink-0">
                    <Button size="sm" onClick={() => handleAbrir(r)}>Abrir</Button>
                    <Button size="sm" variant="ghost" onClick={() => handleExcluir(r)} title="Excluir">
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}