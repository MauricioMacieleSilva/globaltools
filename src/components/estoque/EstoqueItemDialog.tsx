import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { EstoqueImageUpload } from './EstoqueImageUpload';
import {
  EstoqueItem,
  CategoriaEstoque,
  CATEGORIAS_ESTOQUE,
  TIPOS_PERFIL,
  createEstoqueItem,
  updateEstoqueItem,
} from '@/services/estoqueService';
import { toast } from 'sonner';
import { useAuth } from '@/context/AuthContext';

const UNIDADES = ['KG', 'M', 'M²', 'UN', 'PC', 'TON'];

interface EstoqueItemDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  item?: EstoqueItem | null;
  categoriaInicial?: CategoriaEstoque;
  onSuccess: () => void;
}

interface FormData {
  categoria: CategoriaEstoque;
  descricao: string;
  quantidade: string;
  unidade: string;
  tipo_perfil: string;
  espessura: string;
  largura: string;
  comprimento: string;
  base: string;
  aba1: string;
  aba2: string;
  imagem_url: string | null;
  localizacao: string;
  observacoes: string;
}

const initialFormData: FormData = {
  categoria: 'PERFIS',
  descricao: '',
  quantidade: '',
  unidade: 'KG',
  tipo_perfil: '',
  espessura: '',
  largura: '',
  comprimento: '',
  base: '',
  aba1: '',
  aba2: '',
  imagem_url: null,
  localizacao: '',
  observacoes: '',
};

export function EstoqueItemDialog({
  open,
  onOpenChange,
  item,
  categoriaInicial,
  onSuccess,
}: EstoqueItemDialogProps) {
  const { user } = useAuth();
  const [form, setForm] = useState<FormData>(initialFormData);
  const [isLoading, setIsLoading] = useState(false);
  const isEditing = !!item;

  useEffect(() => {
    if (item) {
      setForm({
        categoria: item.categoria,
        descricao: item.descricao,
        quantidade: item.quantidade.toString(),
        unidade: item.unidade,
        tipo_perfil: item.tipo_perfil || '',
        espessura: item.espessura?.toString() || '',
        largura: item.largura?.toString() || '',
        comprimento: item.comprimento?.toString() || '',
        base: item.base?.toString() || '',
        aba1: item.aba1?.toString() || '',
        aba2: item.aba2?.toString() || '',
        imagem_url: item.imagem_url,
        localizacao: item.localizacao || '',
        observacoes: item.observacoes || '',
      });
    } else {
      setForm({
        ...initialFormData,
        categoria: categoriaInicial || 'PERFIS',
      });
    }
  }, [item, categoriaInicial, open]);

  const showProfileFields = ['PERFIS'].includes(form.categoria);
  const showDimensionFields = ['BOBINAS', 'CHAPAS', 'TIRAS', 'PERFIS'].includes(form.categoria);

  const handleSubmit = async () => {
    if (!form.descricao.trim()) {
      toast.error('Descrição é obrigatória');
      return;
    }

    if (!form.quantidade || parseFloat(form.quantidade) < 0) {
      toast.error('Quantidade deve ser um número válido');
      return;
    }

    setIsLoading(true);

    try {
      const payload = {
        categoria: form.categoria,
        descricao: form.descricao.trim(),
        quantidade: parseFloat(form.quantidade),
        unidade: form.unidade,
        tipo_perfil: showProfileFields && form.tipo_perfil ? form.tipo_perfil : null,
        espessura: showDimensionFields && form.espessura ? parseFloat(form.espessura) : null,
        largura: showDimensionFields && form.largura ? parseFloat(form.largura) : null,
        comprimento: showDimensionFields && form.comprimento ? parseFloat(form.comprimento) : null,
        base: showProfileFields && form.base ? parseFloat(form.base) : null,
        aba1: showProfileFields && form.aba1 ? parseFloat(form.aba1) : null,
        aba2: showProfileFields && form.aba2 ? parseFloat(form.aba2) : null,
        imagem_url: form.imagem_url,
        localizacao: form.localizacao.trim() || null,
        observacoes: form.observacoes.trim() || null,
        ativo: true,
        created_by: user?.id || null,
      };

      if (isEditing && item) {
        const { error } = await updateEstoqueItem(item.id, payload);
        if (error) throw error;
        toast.success('Item atualizado com sucesso!');
      } else {
        const { error } = await createEstoqueItem(payload);
        if (error) throw error;
        toast.success('Item adicionado ao estoque!');
      }

      onOpenChange(false);
      onSuccess();
    } catch (error) {
      console.error('Error saving item:', error);
      toast.error('Erro ao salvar item');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {isEditing ? 'Editar Item do Estoque' : 'Adicionar Item ao Estoque'}
          </DialogTitle>
          <DialogDescription>
            {isEditing
              ? 'Atualize as informações do item abaixo.'
              : 'Preencha as informações do novo item.'}
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 py-4">
          {/* Categoria e Descrição */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="categoria">Categoria *</Label>
              <Select
                value={form.categoria}
                onValueChange={(value) =>
                  setForm({ ...form, categoria: value as CategoriaEstoque })
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione" />
                </SelectTrigger>
                <SelectContent>
                  {CATEGORIAS_ESTOQUE.map((cat) => (
                    <SelectItem key={cat.value} value={cat.value}>
                      {cat.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="unidade">Unidade</Label>
              <Select
                value={form.unidade}
                onValueChange={(value) => setForm({ ...form, unidade: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Unidade" />
                </SelectTrigger>
                <SelectContent>
                  {UNIDADES.map((u) => (
                    <SelectItem key={u} value={u}>
                      {u}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="descricao">Descrição *</Label>
            <Input
              id="descricao"
              value={form.descricao}
              onChange={(e) => setForm({ ...form, descricao: e.target.value })}
              placeholder="Ex: Bobina ZAR 0,80mm x 1200mm"
            />
          </div>

          {/* Quantidade e Localização */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="quantidade">Quantidade *</Label>
              <Input
                id="quantidade"
                type="number"
                step="0.01"
                value={form.quantidade}
                onChange={(e) => setForm({ ...form, quantidade: e.target.value })}
                placeholder="0"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="localizacao">Localização</Label>
              <Input
                id="localizacao"
                value={form.localizacao}
                onChange={(e) => setForm({ ...form, localizacao: e.target.value })}
                placeholder="Ex: Galpão A - Corredor 3"
              />
            </div>
          </div>

          {/* Campos específicos para Perfis */}
          {showProfileFields && (
            <>
              <div className="space-y-2">
                <Label htmlFor="tipo_perfil">Tipo de Perfil</Label>
                <Select
                  value={form.tipo_perfil}
                  onValueChange={(value) => setForm({ ...form, tipo_perfil: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione o tipo" />
                  </SelectTrigger>
                  <SelectContent>
                    {TIPOS_PERFIL.map((tipo) => (
                      <SelectItem key={tipo.value} value={tipo.value}>
                        {tipo.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="base">Base (mm)</Label>
                  <Input
                    id="base"
                    type="number"
                    step="0.01"
                    value={form.base}
                    onChange={(e) => setForm({ ...form, base: e.target.value })}
                    placeholder="0"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="aba1">Aba 1 (mm)</Label>
                  <Input
                    id="aba1"
                    type="number"
                    step="0.01"
                    value={form.aba1}
                    onChange={(e) => setForm({ ...form, aba1: e.target.value })}
                    placeholder="0"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="aba2">Aba 2 (mm)</Label>
                  <Input
                    id="aba2"
                    type="number"
                    step="0.01"
                    value={form.aba2}
                    onChange={(e) => setForm({ ...form, aba2: e.target.value })}
                    placeholder="0"
                  />
                </div>
              </div>
            </>
          )}

          {/* Campos de dimensão */}
          {showDimensionFields && (
            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="espessura">Espessura (mm)</Label>
                <Input
                  id="espessura"
                  type="number"
                  step="0.01"
                  value={form.espessura}
                  onChange={(e) => setForm({ ...form, espessura: e.target.value })}
                  placeholder="0"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="largura">Largura (mm)</Label>
                <Input
                  id="largura"
                  type="number"
                  step="0.01"
                  value={form.largura}
                  onChange={(e) => setForm({ ...form, largura: e.target.value })}
                  placeholder="0"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="comprimento">Comprimento (mm)</Label>
                <Input
                  id="comprimento"
                  type="number"
                  step="0.01"
                  value={form.comprimento}
                  onChange={(e) => setForm({ ...form, comprimento: e.target.value })}
                  placeholder="0"
                />
              </div>
            </div>
          )}

          {/* Imagem */}
          <EstoqueImageUpload
            currentImageUrl={form.imagem_url}
            onImageChange={(url) => setForm({ ...form, imagem_url: url })}
          />

          {/* Observações */}
          <div className="space-y-2">
            <Label htmlFor="observacoes">Observações</Label>
            <Textarea
              id="observacoes"
              value={form.observacoes}
              onChange={(e) => setForm({ ...form, observacoes: e.target.value })}
              placeholder="Informações adicionais sobre o item..."
              rows={3}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button onClick={handleSubmit} disabled={isLoading}>
            {isLoading ? 'Salvando...' : isEditing ? 'Atualizar' : 'Adicionar'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
