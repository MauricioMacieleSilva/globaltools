import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Plus, Pencil, Trash2, GripVertical } from 'lucide-react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useAuth } from '@/context/AuthContext';

interface BusinessType {
  id: string;
  name: string;
  label: string;
  is_active: boolean;
  display_order: number;
  created_at: string;
  updated_at: string;
}

interface ProductInterest {
  id: string;
  name: string;
  label: string;
  is_active: boolean;
  display_order: number;
  created_at: string;
  updated_at: string;
}

interface EditDialogProps {
  open: boolean;
  onClose: () => void;
  item: BusinessType | ProductInterest | null;
  type: 'business_type' | 'product_interest';
  onSave: () => void;
}

const EditDialog: React.FC<EditDialogProps> = ({ open, onClose, item, type, onSave }) => {
  const [name, setName] = useState('');
  const [label, setLabel] = useState('');
  const [isActive, setIsActive] = useState(true);
  const [displayOrder, setDisplayOrder] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (item) {
      setName(item.name);
      setLabel(item.label);
      setIsActive(item.is_active);
      setDisplayOrder(item.display_order);
    } else {
      setName('');
      setLabel('');
      setIsActive(true);
      setDisplayOrder(0);
    }
  }, [item, open]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      const tableName = type === 'business_type' ? 'lead_business_types' : 'lead_product_interests';
      const data = {
        name: name.toLowerCase().replace(/\s+/g, '_'),
        label,
        is_active: isActive,
        display_order: displayOrder
      };

      if (item) {
        // Update
        const { error } = await supabase
          .from(tableName)
          .update(data)
          .eq('id', item.id);

        if (error) throw error;
        toast.success(`${type === 'business_type' ? 'Tipo de negócio' : 'Produto de interesse'} atualizado!`);
      } else {
        // Create
        const { error } = await supabase
          .from(tableName)
          .insert(data);

        if (error) throw error;
        toast.success(`${type === 'business_type' ? 'Tipo de negócio' : 'Produto de interesse'} criado!`);
      }

      onSave();
      onClose();
    } catch (error) {
      console.error('Error saving:', error);
      toast.error('Erro ao salvar');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {item ? 'Editar' : 'Adicionar'} {type === 'business_type' ? 'Tipo de Negócio' : 'Produto de Interesse'}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="label">Rótulo de Exibição</Label>
            <Input
              id="label"
              value={label}
              onChange={(e) => {
                setLabel(e.target.value);
                if (!item) {
                  // Para novos itens, gerar automaticamente o nome interno
                  setName(e.target.value.toLowerCase().replace(/\s+/g, '_'));
                }
              }}
              placeholder="Ex: Construtora"
              required
            />
          </div>

          <div>
            <Label htmlFor="name">Nome Interno (gerado automaticamente)</Label>
            <Input
              id="name"
              value={name}
              readOnly
              className="bg-muted"
            />
          </div>

          <div>
            <Label htmlFor="display_order">Ordem de Exibição</Label>
            <Input
              id="display_order"
              type="number"
              value={displayOrder}
              onChange={(e) => setDisplayOrder(parseInt(e.target.value) || 0)}
              min="0"
            />
          </div>

          <div className="flex items-center space-x-2">
            <Switch
              id="is_active"
              checked={isActive}
              onCheckedChange={setIsActive}
            />
            <Label htmlFor="is_active">Ativo</Label>
          </div>

          <div className="flex justify-end space-x-2">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancelar
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? 'Salvando...' : 'Salvar'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export const LeadQualificationConfig: React.FC = () => {
  const { user } = useAuth();
  const [businessTypes, setBusinessTypes] = useState<BusinessType[]>([]);
  const [productInterests, setProductInterests] = useState<ProductInterest[]>([]);
  const [loading, setLoading] = useState(true);
  const [editDialog, setEditDialog] = useState<{
    open: boolean;
    item: BusinessType | ProductInterest | null;
    type: 'business_type' | 'product_interest';
  }>({
    open: false,
    item: null,
    type: 'business_type'
  });

  const loadData = async () => {
    try {
      setLoading(true);
      
      const [businessTypesResult, productInterestsResult] = await Promise.all([
        supabase
          .from('lead_business_types')
          .select('*')
          .order('display_order', { ascending: true }),
        supabase
          .from('lead_product_interests')
          .select('*')
          .order('display_order', { ascending: true })
      ]);

      if (businessTypesResult.error) throw businessTypesResult.error;
      if (productInterestsResult.error) throw productInterestsResult.error;

      setBusinessTypes(businessTypesResult.data || []);
      setProductInterests(productInterestsResult.data || []);
    } catch (error) {
      console.error('Error loading data:', error);
      toast.error('Erro ao carregar dados');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleDelete = async (id: string, type: 'business_type' | 'product_interest') => {
    if (!confirm('Tem certeza que deseja excluir este item?')) return;

    try {
      const tableName = type === 'business_type' ? 'lead_business_types' : 'lead_product_interests';
      const { error } = await supabase
        .from(tableName)
        .delete()
        .eq('id', id);

      if (error) throw error;

      toast.success('Item excluído com sucesso!');
      loadData();
    } catch (error) {
      console.error('Error deleting:', error);
      toast.error('Erro ao excluir item');
    }
  };

  const handleToggleActive = async (id: string, type: 'business_type' | 'product_interest', isActive: boolean) => {
    try {
      const tableName = type === 'business_type' ? 'lead_business_types' : 'lead_product_interests';
      const { error } = await supabase
        .from(tableName)
        .update({ is_active: !isActive })
        .eq('id', id);

      if (error) throw error;

      toast.success('Status atualizado!');
      loadData();
    } catch (error) {
      console.error('Error updating status:', error);
      toast.error('Erro ao atualizar status');
    }
  };

  if (loading) {
    return <div className="p-6">Carregando...</div>;
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Configuração de Qualificação de Leads</CardTitle>
          <CardDescription>
            Gerencie os tipos de negócio e produtos de interesse disponíveis na qualificação de leads.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-8">
          {/* Tipos de Negócio */}
          <div>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-medium">Tipos de Negócio</h3>
              <Button
                onClick={() => setEditDialog({ open: true, item: null, type: 'business_type' })}
                size="sm"
              >
                <Plus className="h-4 w-4 mr-2" />
                Adicionar Tipo
              </Button>
            </div>

            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Ordem</TableHead>
                  <TableHead>Rótulo</TableHead>
                  <TableHead>Nome Interno</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {businessTypes.map((type) => (
                  <TableRow key={type.id}>
                    <TableCell>{type.display_order}</TableCell>
                    <TableCell>{type.label}</TableCell>
                    <TableCell>
                      <code className="text-sm bg-muted px-2 py-1 rounded">{type.name}</code>
                    </TableCell>
                    <TableCell>
                      <Badge variant={type.is_active ? "default" : "secondary"}>
                        {type.is_active ? 'Ativo' : 'Inativo'}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center space-x-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => setEditDialog({ open: true, item: type, type: 'business_type' })}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleToggleActive(type.id, 'business_type', type.is_active)}
                        >
                          {type.is_active ? 'Desativar' : 'Ativar'}
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleDelete(type.id, 'business_type')}
                          className="text-destructive hover:text-destructive"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          {/* Produtos de Interesse */}
          <div>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-medium">Produtos de Interesse</h3>
              <Button
                onClick={() => setEditDialog({ open: true, item: null, type: 'product_interest' })}
                size="sm"
              >
                <Plus className="h-4 w-4 mr-2" />
                Adicionar Produto
              </Button>
            </div>

            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Ordem</TableHead>
                  <TableHead>Rótulo</TableHead>
                  <TableHead>Nome Interno</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {productInterests.map((product) => (
                  <TableRow key={product.id}>
                    <TableCell>{product.display_order}</TableCell>
                    <TableCell>{product.label}</TableCell>
                    <TableCell>
                      <code className="text-sm bg-muted px-2 py-1 rounded">{product.name}</code>
                    </TableCell>
                    <TableCell>
                      <Badge variant={product.is_active ? "default" : "secondary"}>
                        {product.is_active ? 'Ativo' : 'Inativo'}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center space-x-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => setEditDialog({ open: true, item: product, type: 'product_interest' })}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleToggleActive(product.id, 'product_interest', product.is_active)}
                        >
                          {product.is_active ? 'Desativar' : 'Ativar'}
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleDelete(product.id, 'product_interest')}
                          className="text-destructive hover:text-destructive"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <EditDialog
        open={editDialog.open}
        onClose={() => setEditDialog({ ...editDialog, open: false })}
        item={editDialog.item}
        type={editDialog.type}
        onSave={loadData}
      />
    </div>
  );
};