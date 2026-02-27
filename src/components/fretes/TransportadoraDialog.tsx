import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useToast } from '@/hooks/use-toast';
import { Plus, Pencil, Trash2 } from 'lucide-react';
import { type Transportadora, insertTransportadora, updateTransportadora } from '@/services/fretesService';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  transportadoras: Transportadora[];
  onSaved: () => void;
}

export function TransportadoraDialog({ open, onOpenChange, transportadoras, onSaved }: Props) {
  const { toast } = useToast();
  const [editing, setEditing] = useState<Transportadora | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ nome: '', telefone: '', email: '', observacoes: '' });

  const resetForm = () => {
    setForm({ nome: '', telefone: '', email: '', observacoes: '' });
    setEditing(null);
  };

  const openNew = () => { resetForm(); setFormOpen(true); };

  const openEdit = (t: Transportadora) => {
    setEditing(t);
    setForm({ nome: t.nome, telefone: t.telefone || '', email: t.email || '', observacoes: t.observacoes || '' });
    setFormOpen(true);
  };

  const handleSave = async () => {
    if (!form.nome.trim()) {
      toast({ title: 'Nome obrigatório', variant: 'destructive' });
      return;
    }
    try {
      setSaving(true);
      if (editing) {
        await updateTransportadora(editing.id, form);
        toast({ title: 'Transportadora atualizada!' });
      } else {
        await insertTransportadora(form);
        toast({ title: 'Transportadora cadastrada!' });
      }
      setFormOpen(false);
      resetForm();
      onSaved();
    } catch (err: any) {
      toast({ title: 'Erro', description: err.message, variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  const handleDeactivate = async (t: Transportadora) => {
    try {
      await updateTransportadora(t.id, { ativo: false });
      toast({ title: 'Transportadora desativada!' });
      onSaved();
    } catch (err: any) {
      toast({ title: 'Erro', description: err.message, variant: 'destructive' });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Gerenciar Transportadoras</DialogTitle>
        </DialogHeader>

        {formOpen ? (
          <div className="space-y-3">
            <div>
              <label className="text-sm font-medium">Nome *</label>
              <Input value={form.nome} onChange={e => setForm(p => ({ ...p, nome: e.target.value }))} className="mt-1" />
            </div>
            <div>
              <label className="text-sm font-medium">Telefone</label>
              <Input value={form.telefone} onChange={e => setForm(p => ({ ...p, telefone: e.target.value }))} className="mt-1" />
            </div>
            <div>
              <label className="text-sm font-medium">Email</label>
              <Input value={form.email} onChange={e => setForm(p => ({ ...p, email: e.target.value }))} className="mt-1" />
            </div>
            <div>
              <label className="text-sm font-medium">Observações</label>
              <Textarea value={form.observacoes} onChange={e => setForm(p => ({ ...p, observacoes: e.target.value }))} rows={2} className="mt-1" />
            </div>
            <div className="flex gap-2 justify-end">
              <Button variant="outline" onClick={() => setFormOpen(false)}>Voltar</Button>
              <Button onClick={handleSave} disabled={saving}>{saving ? 'Salvando...' : editing ? 'Salvar' : 'Cadastrar'}</Button>
            </div>
          </div>
        ) : (
          <>
            <div className="flex justify-end">
              <Button onClick={openNew} size="sm" className="gap-1"><Plus className="h-4 w-4" />Nova Transportadora</Button>
            </div>
            <div className="rounded-md border overflow-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nome</TableHead>
                    <TableHead>Telefone</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead className="w-20">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {transportadoras.map(t => (
                    <TableRow key={t.id}>
                      <TableCell className="font-medium">{t.nome}</TableCell>
                      <TableCell>{t.telefone || '-'}</TableCell>
                      <TableCell>{t.email || '-'}</TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          <Button variant="ghost" size="icon" onClick={() => openEdit(t)}><Pencil className="h-4 w-4" /></Button>
                          <Button variant="ghost" size="icon" onClick={() => handleDeactivate(t)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                  {transportadoras.length === 0 && (
                    <TableRow><TableCell colSpan={4} className="text-center text-muted-foreground">Nenhuma transportadora cadastrada</TableCell></TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
