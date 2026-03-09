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
  TIPOS_TUBO,
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
  enrij1: string;
  enrij2: string;
  enrij3: string;
  enrij4: string;
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
  enrij1: '',
  enrij2: '',
  enrij3: '',
  enrij4: '',
  imagem_url: null,
  localizacao: '',
  observacoes: '',
};

// Configuração de campos por tipo de perfil
const PERFIL_FIELDS_CONFIG: Record<string, { 
  base?: boolean; 
  aba1?: boolean; 
  aba2?: boolean; 
  enrij1?: boolean; 
  enrij2?: boolean;
  enrij3?: boolean;
  enrij4?: boolean;
  aba1Label?: string;
  aba2Label?: string;
  enrij1Label?: string;
  enrij2Label?: string;
  enrij3Label?: string;
  enrij4Label?: string;
}> = {
  'U': { base: true, aba1: true, aba2: true, aba1Label: 'Aba 1', aba2Label: 'Aba 2' },
  'Z': { base: true, aba1: true, aba2: true, aba1Label: 'Aba 1', aba2Label: 'Aba 2' },
  'L': { base: true, aba1: true, aba2: true, aba1Label: 'Aba 1', aba2Label: 'Aba 2' },
  'CARTOLA': { base: true, aba1: true, aba2: true, enrij1: true, enrij2: true, aba1Label: 'Aba 1', aba2Label: 'Aba 2', enrij1Label: 'Enrij. 1', enrij2Label: 'Enrij. 2' },
  'U_ENRIJECIDO': { base: true, aba1: true, aba2: true, enrij1: true, enrij2: true, aba1Label: 'Aba 1', aba2Label: 'Aba 2', enrij1Label: 'Enrij. 1', enrij2Label: 'Enrij. 2' },
  'U_SEMI_ENRIJECIDO': { base: true, aba1: true, aba2: true, enrij1: true, aba1Label: 'Aba 1', aba2Label: 'Aba 2', enrij1Label: 'Enrij.' },
  'Z_ENRIJECIDO': { base: true, aba1: true, aba2: true, enrij1: true, enrij2: true, aba1Label: 'Aba 1', aba2Label: 'Aba 2', enrij1Label: 'Enrij. 1', enrij2Label: 'Enrij. 2' },
  'CARTOLA_ENRIJECIDO': { base: true, aba1: true, aba2: true, enrij1: true, enrij2: true, enrij3: true, enrij4: true, aba1Label: 'Aba 1', aba2Label: 'Aba 2', enrij1Label: 'Enrij. 1', enrij2Label: 'Enrij. 2', enrij3Label: 'Enrij. 3', enrij4Label: 'Enrij. 4' },
  'CARTOLA_SEMI_ENRIJECIDO': { base: true, aba1: true, aba2: true, enrij1: true, aba1Label: 'Aba 1', aba2Label: 'Aba 2', enrij1Label: 'Enrij.' },
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
  const [aba2ManualEdit, setAba2ManualEdit] = useState(false);
  const [enrij2ManualEdit, setEnrij2ManualEdit] = useState(false);
  const [enrij4ManualEdit, setEnrij4ManualEdit] = useState(false);
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
        enrij1: '',
        enrij2: '',
        enrij3: '',
        enrij4: '',
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
  const showTubeFields = form.categoria === 'TUBOS';
  const showDimensionFields = ['BOBINAS', 'CHAPAS', 'TIRAS', 'PERFIS', 'BLANK', 'LAMINADOS', 'TUBOS', 'ARAMES', 'VERGALHAO'].includes(form.categoria);
  
  // Configuração de campos dinâmica baseada no tipo de perfil
  const perfilConfig = form.tipo_perfil ? PERFIL_FIELDS_CONFIG[form.tipo_perfil] : null;
  
  // Categorias que geram descrição automaticamente a partir das dimensões
  const autoDescricao = ['TIRAS', 'PERFIS', 'CHAPAS', 'BLANK', 'TUBOS'].includes(form.categoria);

  // Gera descrição automática baseada nas dimensões
  const gerarDescricaoAutomatica = useMemo(() => {
    if (!autoDescricao) return '';
    
    // Formato para TUBOS: TB QD #4,75 100×100 6000mm ou TB RT #1,55 30×50 6000mm
    if (form.categoria === 'TUBOS' && form.tipo_perfil) {
      const tipoLabel = TIPOS_TUBO.find(t => t.value === form.tipo_perfil)?.label || form.tipo_perfil;
      const tipoAbrev = form.tipo_perfil === 'QD' ? 'TB QD' : form.tipo_perfil === 'RT' ? 'TB RT' : 'TB RD';
      const espessuraFormatada = form.espessura ? `#${parseFloat(form.espessura).toFixed(2).replace('.', ',')}` : '';
      
      let dimensoes = '';
      if (form.tipo_perfil === 'QD' && form.largura) {
        // Tubo Quadrado: lado x lado
        dimensoes = `${Math.round(parseFloat(form.largura))}×${Math.round(parseFloat(form.largura))}`;
      } else if (form.tipo_perfil === 'RT' && form.largura && form.aba1) {
        // Tubo Retangular: largura x altura
        dimensoes = `${Math.round(parseFloat(form.largura))}×${Math.round(parseFloat(form.aba1))}`;
      } else if (form.tipo_perfil === 'RD' && form.largura) {
        // Tubo Redondo: diâmetro
        dimensoes = `Ø${Math.round(parseFloat(form.largura))}`;
      }
      
      const comprimentoFormatado = form.comprimento ? `${Math.round(parseFloat(form.comprimento))}mm` : '';
      
      const partes = [tipoAbrev, espessuraFormatada, dimensoes, comprimentoFormatado].filter(Boolean);
      return partes.join(' ');
    }
    
    // Formato para PERFIS: PERFIL U #2,00 40x100x40 6000mm
    if (form.categoria === 'PERFIS' && form.tipo_perfil) {
      const tipoLabel = TIPOS_PERFIL.find(t => t.value === form.tipo_perfil)?.label || form.tipo_perfil;
      const espessuraFormatada = form.espessura ? `#${parseFloat(form.espessura).toFixed(2).replace('.', ',')}` : '';
      
      // Monta dimensões no formato correto baseado no tipo de perfil
      let dimensoes = '';
      if (form.tipo_perfil === 'U' || form.tipo_perfil === 'Z') {
        // U/Z: aba1 x base x aba2
        if (form.aba1 && form.base && form.aba2) {
          dimensoes = `${Math.round(parseFloat(form.aba1))}x${Math.round(parseFloat(form.base))}x${Math.round(parseFloat(form.aba2))}`;
        }
      } else if (form.tipo_perfil === 'L') {
        // L: base x aba
        if (form.base && form.aba1) {
          dimensoes = `${Math.round(parseFloat(form.base))}x${Math.round(parseFloat(form.aba1))}`;
        }
      } else if (form.tipo_perfil === 'CARTOLA') {
        // Cartola: base x aba x enrij
        if (form.base && form.aba1 && form.enrij1) {
          dimensoes = `${Math.round(parseFloat(form.base))}x${Math.round(parseFloat(form.aba1))}x${Math.round(parseFloat(form.enrij1))}`;
        }
      } else if (form.tipo_perfil === 'U_ENRIJECIDO') {
        // UE: enrij1 x aba1 x base x aba2 x enrij2
        if (form.enrij1 && form.aba1 && form.base && form.aba2 && form.enrij2) {
          dimensoes = `${Math.round(parseFloat(form.enrij1))}x${Math.round(parseFloat(form.aba1))}x${Math.round(parseFloat(form.base))}x${Math.round(parseFloat(form.aba2))}x${Math.round(parseFloat(form.enrij2))}`;
        }
      } else if (form.tipo_perfil === 'U_SEMI_ENRIJECIDO') {
        // U Semi: enrij1 x aba1 x base x aba2
        if (form.enrij1 && form.aba1 && form.base && form.aba2) {
          dimensoes = `${Math.round(parseFloat(form.enrij1))}x${Math.round(parseFloat(form.aba1))}x${Math.round(parseFloat(form.base))}x${Math.round(parseFloat(form.aba2))}`;
        }
      } else if (form.tipo_perfil === 'Z_ENRIJECIDO') {
        // Z Enrij: enrij1 x aba1 x base x aba2 x enrij2
        if (form.enrij1 && form.aba1 && form.base && form.aba2 && form.enrij2) {
          dimensoes = `${Math.round(parseFloat(form.enrij1))}x${Math.round(parseFloat(form.aba1))}x${Math.round(parseFloat(form.base))}x${Math.round(parseFloat(form.aba2))}x${Math.round(parseFloat(form.enrij2))}`;
        }
      } else if (form.tipo_perfil === 'CARTOLA_ENRIJECIDO') {
        // Cartola Enrij: enrij1 x aba1 x base x aba2 x enrij2
        if (form.enrij1 && form.aba1 && form.base && form.aba2 && form.enrij2) {
          dimensoes = `${Math.round(parseFloat(form.enrij1))}x${Math.round(parseFloat(form.aba1))}x${Math.round(parseFloat(form.base))}x${Math.round(parseFloat(form.aba2))}x${Math.round(parseFloat(form.enrij2))}`;
        }
      } else if (form.tipo_perfil === 'CARTOLA_SEMI_ENRIJECIDO') {
        // Cartola Semi: enrij1 x aba1 x base x aba2
        if (form.enrij1 && form.aba1 && form.base && form.aba2) {
          dimensoes = `${Math.round(parseFloat(form.enrij1))}x${Math.round(parseFloat(form.aba1))}x${Math.round(parseFloat(form.base))}x${Math.round(parseFloat(form.aba2))}`;
        }
      }
      
      const comprimentoFormatado = form.comprimento ? `${Math.round(parseFloat(form.comprimento))}mm` : '';
      
      // Monta descrição final: PERFIL U #2,00 40x100x40 6000mm
      const partes = [tipoLabel, espessuraFormatada, dimensoes, comprimentoFormatado].filter(Boolean);
      return partes.join(' ');
    }
    
    // Formato para outras categorias (TIRAS, CHAPAS, BLANK)
    const partes: string[] = [];
    partes.push(CATEGORIAS_ESTOQUE.find(c => c.value === form.categoria)?.label || form.categoria);
    
    if (form.espessura) partes.push(`${form.espessura}mm`);
    if (form.largura) partes.push(`x ${form.largura}mm`);
    if (form.comprimento) partes.push(`x ${form.comprimento}mm`);
    
    return partes.join(' ');
  }, [form.categoria, form.tipo_perfil, form.espessura, form.largura, form.comprimento, form.base, form.aba1, form.aba2, form.enrij1, form.enrij2, autoDescricao]);

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
        tipo_perfil: (showProfileFields || showTubeFields) && form.tipo_perfil ? form.tipo_perfil : null,
        espessura: showDimensionFields && form.espessura ? parseFloat(form.espessura) : null,
        largura: showDimensionFields && form.largura ? parseFloat(form.largura) : null,
        comprimento: showDimensionFields && form.comprimento ? parseFloat(form.comprimento) : null,
        base: showProfileFields && form.base ? parseFloat(form.base) : null,
        aba1: (showProfileFields || (showTubeFields && form.tipo_perfil === 'RT')) && form.aba1 ? parseFloat(form.aba1) : null,
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
                <Label htmlFor="tipo_perfil">Tipo de Perfil *</Label>
                <Select
                  value={form.tipo_perfil}
                  onValueChange={(value) => { setForm({ ...form, tipo_perfil: value, aba1: '', aba2: '', base: '', enrij1: '', enrij2: '', enrij3: '', enrij4: '' }); setAba2ManualEdit(false); setEnrij2ManualEdit(false); setEnrij4ManualEdit(false); }}
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

              {/* Espessura primeiro para perfis */}
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

              {/* Campos dinâmicos baseados no tipo de perfil selecionado */}
              {perfilConfig && (
                <div className="grid grid-cols-3 gap-4">
                  {perfilConfig.base && (
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
                  )}

                  {perfilConfig.aba1 && (
                    <div className="space-y-2">
                      <Label htmlFor="aba1">{perfilConfig.aba1Label || 'Aba 1'} (mm)</Label>
                      <Input
                        id="aba1"
                        type="number"
                        step="0.01"
                        value={form.aba1}
                        onChange={(e) => {
                          const val = e.target.value;
                          const updates: Partial<FormData> = { aba1: val };
                          if (perfilConfig?.aba2 && !aba2ManualEdit) {
                            updates.aba2 = val;
                          }
                          setForm(prev => ({ ...prev, ...updates }));
                        }}
                        placeholder="0"
                      />
                    </div>
                  )}

                  {perfilConfig.aba2 && (
                    <div className="space-y-2">
                      <Label htmlFor="aba2">{perfilConfig.aba2Label || 'Aba 2'} (mm)</Label>
                      <Input
                        id="aba2"
                        type="number"
                        step="0.01"
                        value={form.aba2}
                        onChange={(e) => { setAba2ManualEdit(true); setForm({ ...form, aba2: e.target.value }); }}
                        placeholder="0"
                      />
                    </div>
                  )}

                  {perfilConfig.enrij1 && (
                    <div className="space-y-2">
                      <Label htmlFor="enrij1">{perfilConfig.enrij1Label || 'Enrij. 1'} (mm)</Label>
                      <Input
                        id="enrij1"
                        type="number"
                        step="0.01"
                        value={form.enrij1}
                        onChange={(e) => {
                          const val = e.target.value;
                          const updates: Partial<FormData> = { enrij1: val };
                          if (perfilConfig?.enrij2 && !enrij2ManualEdit) {
                            updates.enrij2 = val;
                          }
                          setForm(prev => ({ ...prev, ...updates }));
                        }}
                        placeholder="0"
                      />
                    </div>
                  )}

                  {perfilConfig.enrij2 && (
                    <div className="space-y-2">
                      <Label htmlFor="enrij2">{perfilConfig.enrij2Label || 'Enrij. 2'} (mm)</Label>
                      <Input
                        id="enrij2"
                        type="number"
                        step="0.01"
                        value={form.enrij2}
                        onChange={(e) => { setEnrij2ManualEdit(true); setForm({ ...form, enrij2: e.target.value }); }}
                        placeholder="0"
                      />
                    </div>
                  )}
                </div>
              )}

              {/* Comprimento para perfis */}
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
            </>
          )}

          {/* Campos específicos para Tubos */}
          {showTubeFields && (
            <>
              <div className="space-y-2">
                <Label htmlFor="tipo_tubo">Tipo de Tubo *</Label>
                <Select
                  value={form.tipo_perfil}
                  onValueChange={(value) => setForm({ ...form, tipo_perfil: value, aba1: '', largura: '' })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione o tipo" />
                  </SelectTrigger>
                  <SelectContent>
                    {TIPOS_TUBO.map((tipo) => (
                      <SelectItem key={tipo.value} value={tipo.value}>
                        {tipo.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

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

                {form.tipo_perfil === 'QD' && (
                  <div className="space-y-2">
                    <Label htmlFor="largura">Lado (mm)</Label>
                    <Input
                      id="largura"
                      type="number"
                      step="0.01"
                      value={form.largura}
                      onChange={(e) => setForm({ ...form, largura: e.target.value })}
                      placeholder="0"
                    />
                  </div>
                )}

                {form.tipo_perfil === 'RT' && (
                  <>
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
                      <Label htmlFor="aba1">Altura (mm)</Label>
                      <Input
                        id="aba1"
                        type="number"
                        step="0.01"
                        value={form.aba1}
                        onChange={(e) => setForm({ ...form, aba1: e.target.value })}
                        placeholder="0"
                      />
                    </div>
                  </>
                )}

                {form.tipo_perfil === 'RD' && (
                  <div className="space-y-2">
                    <Label htmlFor="largura">Diâmetro (mm)</Label>
                    <Input
                      id="largura"
                      type="number"
                      step="0.01"
                      value={form.largura}
                      onChange={(e) => setForm({ ...form, largura: e.target.value })}
                      placeholder="0"
                    />
                  </div>
                )}

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
            </>
          )}

          {/* Campos de dimensão para outras categorias (não perfis e não tubos) */}
          {showDimensionFields && !showProfileFields && !showTubeFields && (
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
