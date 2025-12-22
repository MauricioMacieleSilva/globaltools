import React, { useState, useEffect } from 'react';
import { Truck, Plus, Search, Trash2, Edit2, Save, X, MapPin } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { ScrollArea } from '@/components/ui/scroll-area';

interface Transportadora {
  id: string;
  nome: string;
  telefone: string | null;
  email: string | null;
  cidades_atendimento: string[];
  regioes_atendimento: string[];
  observacoes: string | null;
  ativo: boolean;
}

export function TransportadorasDialog() {
  const [open, setOpen] = useState(false);
  const [transportadoras, setTransportadoras] = useState<Transportadora[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  
  // Form states
  const [formData, setFormData] = useState({
    nome: '',
    telefone: '',
    email: '',
    cidades: '',
    regioes: '',
    observacoes: ''
  });

  const fetchTransportadoras = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('transportadoras')
      .select('*')
      .eq('ativo', true)
      .order('nome');
    
    if (error) {
      console.error('Error fetching transportadoras:', error);
      toast.error('Erro ao carregar transportadoras');
    } else {
      setTransportadoras(data || []);
    }
    setLoading(false);
  };

  useEffect(() => {
    if (open) {
      fetchTransportadoras();
    }
  }, [open]);

  const resetForm = () => {
    setFormData({
      nome: '',
      telefone: '',
      email: '',
      cidades: '',
      regioes: '',
      observacoes: ''
    });
    setEditingId(null);
    setShowForm(false);
  };

  const handleEdit = (t: Transportadora) => {
    setFormData({
      nome: t.nome,
      telefone: t.telefone || '',
      email: t.email || '',
      cidades: t.cidades_atendimento.join(', '),
      regioes: t.regioes_atendimento.join(', '),
      observacoes: t.observacoes || ''
    });
    setEditingId(t.id);
    setShowForm(true);
  };

  const handleSave = async () => {
    if (!formData.nome.trim()) {
      toast.error('Nome da transportadora é obrigatório');
      return;
    }

    const cidades = formData.cidades.split(',').map(c => c.trim()).filter(Boolean);
    const regioes = formData.regioes.split(',').map(r => r.trim()).filter(Boolean);

    const payload = {
      nome: formData.nome.trim(),
      telefone: formData.telefone.trim() || null,
      email: formData.email.trim() || null,
      cidades_atendimento: cidades,
      regioes_atendimento: regioes,
      observacoes: formData.observacoes.trim() || null
    };

    if (editingId) {
      const { error } = await supabase
        .from('transportadoras')
        .update(payload)
        .eq('id', editingId);
      
      if (error) {
        toast.error('Erro ao atualizar transportadora');
        console.error(error);
      } else {
        toast.success('Transportadora atualizada');
        fetchTransportadoras();
        resetForm();
      }
    } else {
      const { error } = await supabase
        .from('transportadoras')
        .insert(payload);
      
      if (error) {
        toast.error('Erro ao cadastrar transportadora');
        console.error(error);
      } else {
        toast.success('Transportadora cadastrada');
        fetchTransportadoras();
        resetForm();
      }
    }
  };

  const handleDelete = async (id: string) => {
    const { error } = await supabase
      .from('transportadoras')
      .update({ ativo: false })
      .eq('id', id);
    
    if (error) {
      toast.error('Erro ao remover transportadora');
    } else {
      toast.success('Transportadora removida');
      fetchTransportadoras();
    }
  };

  const filteredTransportadoras = transportadoras.filter(t => {
    const term = searchTerm.toLowerCase();
    return (
      t.nome.toLowerCase().includes(term) ||
      t.cidades_atendimento.some(c => c.toLowerCase().includes(term)) ||
      t.regioes_atendimento.some(r => r.toLowerCase().includes(term))
    );
  });

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <DialogTrigger asChild>
              <Button variant="outline" size="icon" className="h-9 w-9">
                <Truck className="h-4 w-4" />
              </Button>
            </DialogTrigger>
          </TooltipTrigger>
          <TooltipContent>
            <p>Transportadoras e Regiões</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>

      <DialogContent className="max-w-2xl max-h-[85vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Truck className="h-5 w-5" />
            Transportadoras e Regiões de Atendimento
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Search and Add */}
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por nome, cidade ou região..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-8"
              />
            </div>
            <Button onClick={() => setShowForm(true)} size="sm">
              <Plus className="h-4 w-4 mr-1" />
              Nova
            </Button>
          </div>

          {/* Form */}
          {showForm && (
            <div className="border rounded-lg p-4 space-y-3 bg-muted/30">
              <div className="flex justify-between items-center">
                <h4 className="font-medium">
                  {editingId ? 'Editar Transportadora' : 'Nova Transportadora'}
                </h4>
                <Button variant="ghost" size="icon" onClick={resetForm}>
                  <X className="h-4 w-4" />
                </Button>
              </div>
              
              <div className="grid grid-cols-2 gap-3">
                <Input
                  placeholder="Nome da transportadora *"
                  value={formData.nome}
                  onChange={(e) => setFormData(prev => ({ ...prev, nome: e.target.value }))}
                />
                <Input
                  placeholder="Telefone"
                  value={formData.telefone}
                  onChange={(e) => setFormData(prev => ({ ...prev, telefone: e.target.value }))}
                />
                <Input
                  placeholder="Email"
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                  className="col-span-2"
                />
                <Input
                  placeholder="Cidades (separadas por vírgula)"
                  value={formData.cidades}
                  onChange={(e) => setFormData(prev => ({ ...prev, cidades: e.target.value }))}
                  className="col-span-2"
                />
                <Input
                  placeholder="Regiões (separadas por vírgula)"
                  value={formData.regioes}
                  onChange={(e) => setFormData(prev => ({ ...prev, regioes: e.target.value }))}
                  className="col-span-2"
                />
                <Textarea
                  placeholder="Observações"
                  value={formData.observacoes}
                  onChange={(e) => setFormData(prev => ({ ...prev, observacoes: e.target.value }))}
                  className="col-span-2"
                  rows={2}
                />
              </div>

              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={resetForm}>
                  Cancelar
                </Button>
                <Button onClick={handleSave}>
                  <Save className="h-4 w-4 mr-1" />
                  {editingId ? 'Atualizar' : 'Cadastrar'}
                </Button>
              </div>
            </div>
          )}

          {/* List */}
          <ScrollArea className="h-[350px]">
            {loading ? (
              <div className="text-center py-8 text-muted-foreground">
                Carregando...
              </div>
            ) : filteredTransportadoras.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                {searchTerm ? 'Nenhuma transportadora encontrada' : 'Nenhuma transportadora cadastrada'}
              </div>
            ) : (
              <div className="space-y-3">
                {filteredTransportadoras.map((t) => (
                  <div key={t.id} className="border rounded-lg p-3 space-y-2">
                    <div className="flex justify-between items-start">
                      <div>
                        <h4 className="font-medium">{t.nome}</h4>
                        {(t.telefone || t.email) && (
                          <p className="text-xs text-muted-foreground">
                            {[t.telefone, t.email].filter(Boolean).join(' • ')}
                          </p>
                        )}
                      </div>
                      <div className="flex gap-1">
                        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => handleEdit(t)}>
                          <Edit2 className="h-3.5 w-3.5" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive hover:text-destructive" onClick={() => handleDelete(t.id)}>
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </div>

                    {t.cidades_atendimento.length > 0 && (
                      <div className="flex items-center gap-1 flex-wrap">
                        <MapPin className="h-3 w-3 text-muted-foreground" />
                        {t.cidades_atendimento.map((cidade, i) => (
                          <Badge key={i} variant="secondary" className="text-xs">
                            {cidade}
                          </Badge>
                        ))}
                      </div>
                    )}

                    {t.regioes_atendimento.length > 0 && (
                      <div className="flex items-center gap-1 flex-wrap">
                        <span className="text-xs text-muted-foreground">Regiões:</span>
                        {t.regioes_atendimento.map((regiao, i) => (
                          <Badge key={i} variant="outline" className="text-xs">
                            {regiao}
                          </Badge>
                        ))}
                      </div>
                    )}

                    {t.observacoes && (
                      <p className="text-xs text-muted-foreground italic">{t.observacoes}</p>
                    )}
                  </div>
                ))}
              </div>
            )}
          </ScrollArea>
        </div>
      </DialogContent>
    </Dialog>
  );
}
