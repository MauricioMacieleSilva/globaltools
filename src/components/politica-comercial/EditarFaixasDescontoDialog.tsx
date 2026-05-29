import { useEffect, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Plus, Trash2, Pencil } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { FaixaDesconto } from '@/hooks/useFaixasDesconto';
import { usePoliticaComercial } from '@/context/PoliticaComercialContext';

interface Row {
  id?: string;
  peso_min: string;
  peso_max: string; // empty string = sem limite
  desconto_max_percent: string;
  ordem: number;
  _deleted?: boolean;
  _new?: boolean;
}

export function EditarFaixasDescontoDialog() {
  const { faixasDesconto, refetchFaixas } = usePoliticaComercial();
  const [open, setOpen] = useState(false);
  const [rows, setRows] = useState<Row[]>([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) {
      setRows(
        faixasDesconto.map((f: FaixaDesconto) => ({
          id: f.id,
          peso_min: String(f.peso_min ?? 0),
          peso_max: f.peso_max == null ? '' : String(f.peso_max),
          desconto_max_percent: String(f.desconto_max_percent),
          ordem: f.ordem,
        }))
      );
    }
  }, [open, faixasDesconto]);

  const update = (i: number, patch: Partial<Row>) => {
    setRows(prev => prev.map((r, idx) => (idx === i ? { ...r, ...patch } : r)));
  };

  const addRow = () => {
    const maxOrdem = rows.reduce((m, r) => Math.max(m, r.ordem), 0);
    setRows(prev => [...prev, { peso_min: '0', peso_max: '', desconto_max_percent: '0', ordem: maxOrdem + 1, _new: true }]);
  };

  const removeRow = (i: number) => {
    setRows(prev => prev.map((r, idx) => (idx === i ? { ...r, _deleted: true } : r)));
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      for (const r of rows) {
        if (r._deleted && r.id) {
          const { error } = await supabase.from('politica_descontos_faixas').delete().eq('id', r.id);
          if (error) throw error;
          continue;
        }
        if (r._deleted) continue;
        const payload = {
          peso_min: parseFloat(r.peso_min) || 0,
          peso_max: r.peso_max === '' ? null : parseFloat(r.peso_max),
          desconto_max_percent: parseFloat(r.desconto_max_percent) || 0,
          ordem: r.ordem,
          ativo: true,
        };
        if (r.id) {
          const { error } = await supabase.from('politica_descontos_faixas').update(payload).eq('id', r.id);
          if (error) throw error;
        } else {
          const { error } = await supabase.from('politica_descontos_faixas').insert(payload);
          if (error) throw error;
        }
      }
      await refetchFaixas();
      toast.success('Faixas de desconto atualizadas');
      setOpen(false);
    } catch (e: any) {
      toast.error('Erro ao salvar: ' + (e.message || 'desconhecido'));
    } finally {
      setSaving(false);
    }
  };

  const visibleRows = rows.filter(r => !r._deleted);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="h-7 px-2 text-xs">
          <Pencil className="h-3 w-3 mr-1" /> Editar Faixas
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Editar Alçada de Descontos por Volume</DialogTitle>
        </DialogHeader>
        <div className="space-y-2">
          <div className="grid grid-cols-[1fr_1fr_1fr_auto] gap-2 text-xs font-medium text-muted-foreground px-1">
            <Label>Peso mín. (kg)</Label>
            <Label>Peso máx. (kg, vazio = sem limite)</Label>
            <Label>Desconto máx. (%)</Label>
            <span />
          </div>
          {visibleRows.map((r, i) => {
            const realIdx = rows.indexOf(r);
            return (
              <div key={r.id ?? `new-${i}`} className="grid grid-cols-[1fr_1fr_1fr_auto] gap-2 items-center">
                <Input type="number" step="1" value={r.peso_min} onChange={e => update(realIdx, { peso_min: e.target.value })} className="h-8 text-sm" />
                <Input type="number" step="1" value={r.peso_max} placeholder="sem limite" onChange={e => update(realIdx, { peso_max: e.target.value })} className="h-8 text-sm" />
                <Input type="number" step="0.1" value={r.desconto_max_percent} onChange={e => update(realIdx, { desconto_max_percent: e.target.value })} className="h-8 text-sm" />
                <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => removeRow(realIdx)}>
                  <Trash2 className="h-4 w-4 text-destructive" />
                </Button>
              </div>
            );
          })}
          <Button variant="outline" size="sm" className="w-full mt-2" onClick={addRow}>
            <Plus className="h-3 w-3 mr-1" /> Adicionar faixa
          </Button>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)} disabled={saving}>Cancelar</Button>
          <Button onClick={handleSave} disabled={saving}>{saving ? 'Salvando...' : 'Salvar'}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}