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
  CATEGORIAS_UNIDADE_UN,
  getUnidadePadrao,
  calcularPesoPeca,
  createEstoqueItem,
  updateEstoqueItem,
} from '@/services/estoqueService';
import { toast } from 'sonner';
import { useAuth } from '@/context/AuthContext';
import { useMemo } from 'react';

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
      const cat = categoriaInicial || 'PERFIS';
      setForm({
        ...initialFormData,
        categoria: cat,
        unidade: getUnidadePadrao(cat),
      });
    }
  }, [item, categoriaInicial, open]);

  // Atualiza unidade automaticamente quando categoria muda (apenas para novos itens)
  useEffect(() => {
    if (!isEditing) {
      setForm(prev => ({
        ...prev,
        unidade: getUnidadePadrao(prev.categoria)
      }));
    }
  }, [form.categoria, isEditing]);

  const isUnidadeUN = CATEGORIAS_UNIDADE_UN.includes(form.categoria);
  const showProfileFields = ['PERFIS'].includes(form.categoria);
  const showDimensionFields = ['BOBINAS', 'CHAPAS', 'TIRAS', 'PERFIS', 'BLANK', 'LAMINADOS', 'TUBOS', 'ARAMES', 'VERGALHAO'].includes(form.categoria);
  
  // Categorias que geram descrição automaticamente a partir das dimensões
  const autoDescricao = ['TIRAS', 'PERFIS', 'CHAPAS', 'BLANK'].includes(form.categoria);

  // Gera descrição automática baseada nas dimensões
  const gerarDescricaoAutomatica = useMemo(() => {
    if (!autoDescricao) return '';
    
    const partes: string[] = [];
    
    if (form.categoria === 'PERFIS' && form.tipo_perfil) {
      const tipoLabel = TIPOS_PERFIL.find(t => t.value === form.tipo_perfil)?.label || form.tipo_perfil;
      partes.push(tipoLabel);
    } else {
      partes.push(CATEGORIAS_ESTOQUE.find(c => c.value === form.categoria)?.label || form.categoria);
    }
    
    if (form.espessura) partes.push(`${form.espessura}mm`);
    
    if (form.categoria === 'PERFIS') {
      const dims: string[] = [];
      if (form.base) dims.push(`B${form.base}`);
      if (form.aba1) dims.push(`A${form.aba1}`);
      if (form.aba2) dims.push(`A2${form.aba2}`);
      if (dims.length > 0) partes.push(dims.join(' x '));
    } else {
      if (form.largura) partes.push(`x ${form.largura}mm`);
    }
    
    if (form.comprimento) partes.push(`x ${form.comprimento}mm`);
    
    return partes.join(' ');
  }, [form.categoria, form.tipo_perfil, form.espessura, form.largura, form.comprimento, form.base, form.aba1, form.aba2, autoDescricao]);

  // Calcula peso automaticamente para categorias UN
  const pesoCalculado = useMemo(() => {
    if (!isUnidadeUN) return null;
    
    const peso = calcularPesoPeca(
      form.categoria,
      form.espessura ? parseFloat(form.espessura) : null,
      form.largura ? parseFloat(form.largura) : null,
      form.comprimento ? parseFloat(form.comprimento) : null,
      form.base ? parseFloat(form.base) : null,
      form.aba1 ? parseFloat(form.aba1) : null,
      form.aba2 ? parseFloat(form.aba2) : null,
      form.tipo_perfil || null
    );
    
    return peso;
  }, [form.categoria, form.espessura, form.largura, form.comprimento, form.base, form.aba1, form.aba2, form.tipo_perfil, isUnidadeUN]);

  const pesoTotal = useMemo(() => {
    if (pesoCalculado === null || !form.quantidade) return null;
    return pesoCalculado * parseFloat(form.quantidade);
  }, [pesoCalculado, form.quantidade]);

  const handleSubmit = async () => {
    const descricaoFinal = autoDescricao ? gerarDescricaoAutomatica : form.descricao.trim();
    
    if (!descricaoFinal) {
      toast.error(autoDescricao ? 'Preencha as dimensões para gerar a descrição' : 'Descrição é obrigatória');
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
        descricao: descricaoFinal,
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
              <Input
                id="unidade"
                value={isUnidadeUN ? 'UN (peças)' : 'KG'}
                disabled
                className="bg-muted"
              />
            </div>
          </div>

          {/* Descrição - oculta para categorias com descrição automática */}
          {autoDescricao ? (
            <div className="space-y-2">
              <Label>Descrição (gerada automaticamente)</Label>
              <div className="p-2 bg-muted rounded-md text-sm min-h-[40px] flex items-center">
                {gerarDescricaoAutomatica || <span className="text-muted-foreground">Preencha as dimensões abaixo</span>}
              </div>
            </div>
          ) : (
            <div className="space-y-2">
              <Label htmlFor="descricao">Descrição *</Label>
              <Input
                id="descricao"
                value={form.descricao}
                onChange={(e) => setForm({ ...form, descricao: e.target.value })}
                placeholder="Ex: Bobina ZAR 0,80mm x 1200mm"
              />
            </div>
          )}

          {/* Quantidade e Localização */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="quantidade">
                {isUnidadeUN ? 'Quantidade (peças) *' : 'Quantidade (kg) *'}
              </Label>
              <Input
                id="quantidade"
                type="number"
                step={isUnidadeUN ? '1' : '0.01'}
                min="0"
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

          {/* Peso calculado para categorias UN */}
          {isUnidadeUN && (
            <div className="grid grid-cols-2 gap-4 p-3 bg-muted/50 rounded-lg border">
              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">Peso por peça</Label>
                <div className="text-sm font-medium">
                  {pesoCalculado !== null 
                    ? `${pesoCalculado.toFixed(2)} kg` 
                    : 'Preencha dimensões'}
                </div>
              </div>
              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">Peso total estimado</Label>
                <div className="text-sm font-medium text-primary">
                  {pesoTotal !== null 
                    ? `${pesoTotal.toFixed(2)} kg` 
                    : '-'}
                </div>
              </div>
            </div>
          )}

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
