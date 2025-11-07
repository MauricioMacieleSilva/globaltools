import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { CheckCircle, Circle, AlertCircle, X } from 'lucide-react';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { Lead } from '@/context/PreVendasContext';
import { toast } from 'sonner';
import { useMemo } from 'react';
import { computeQualification } from '@/lib/utils';
import { useLeadQualificationConfig } from '@/hooks/useLeadQualificationConfig';

interface LeadQualificationDialogProps {
  open: boolean;
  onClose: () => void;
  lead: Lead | null;
  onSave: (data: Partial<Lead>) => Promise<void>;
}


const purchaseFrequencies = [
  'mensal',
  'bimestral',
  'trimestral',
  'semestral',
  'anual',
  'esporádica',
  'primeira_compra',
  'sob_demanda'
];

const purchaseFrequencyLabels = {
  mensal: 'Mensal',
  bimestral: 'Bimestral',
  trimestral: 'Trimestral',
  semestral: 'Semestral',
  anual: 'Anual',
  esporádica: 'Esporádica',
  primeira_compra: 'Primeira Compra',
  sob_demanda: 'Sob Demanda'
};


export const LeadQualificationDialog: React.FC<LeadQualificationDialogProps> = ({
  open,
  onClose,
  lead,
  onSave
}) => {
  const { businessTypes, businessTypeLabels, productInterests, productInterestLabels, loading } = useLeadQualificationConfig();
  const [formData, setFormData] = useState({
    business_type: [] as string[],
    product_interest: [] as string[],
    estimated_volume: '',
    purchase_frequency: '',
    current_pain: '',
    opportunity_identified: '',
    custom_business_type: '',
    custom_product_interest: '',
    custom_purchase_frequency: ''
  });

  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    console.log('=== LeadQualificationDialog useEffect ===');
    console.log('Lead data:', lead);
    console.log('Dialog open:', open);
    
    if (lead) {
      console.log('Setting form data for lead:', lead.client_name);
      console.log('business_type from lead:', lead.business_type);
      console.log('product_interest from lead:', lead.product_interest);
      console.log('estimated_volume from lead:', lead.estimated_volume);
      console.log('purchase_frequency from lead:', lead.purchase_frequency);
      
      const newFormData = {
        business_type: Array.isArray(lead.business_type) ? lead.business_type : 
                      lead.business_type && lead.business_type.trim() ? lead.business_type.split(',').map(s => s.trim()) : [],
        product_interest: Array.isArray(lead.product_interest) ? lead.product_interest : 
                         lead.product_interest && lead.product_interest.trim() ? lead.product_interest.split(',').map(s => s.trim()) : [],
        estimated_volume: lead.estimated_volume || '',
        purchase_frequency: lead.purchase_frequency || '',
        current_pain: lead.current_pain || '',
        opportunity_identified: lead.opportunity_identified || '',
        custom_business_type: lead.business_type_custom || '',
        custom_product_interest: lead.product_interest_custom || '',
        custom_purchase_frequency: lead.purchase_frequency_custom || ''
      };
      
      console.log('New form data being set:', newFormData);
      setFormData(newFormData);
    } else {
      console.log('No lead provided, resetting form data');
      setFormData({
        business_type: [],
        product_interest: [],
        estimated_volume: '',
        purchase_frequency: '',
        current_pain: '',
        opportunity_identified: '',
        custom_business_type: '',
        custom_product_interest: '',
        custom_purchase_frequency: ''
      });
    }
  }, [lead, open]);

  // Use the centralized qualification computation
  const qualification = useMemo(() => {
    return computeQualification(formData);
  }, [formData]);

  const { qualificationScore, isQualified, qualifiedCriteria, criteriaList } = qualification;

  const getCriteriaStatus = (criteria: any) => {
    if (Array.isArray(criteria.field)) {
      return criteria.field.some((field: string) => {
        const value = formData[field as keyof typeof formData];
        return Array.isArray(value) ? value.length > 0 : value?.trim();
      });
    }
    const value = formData[criteria.field as keyof typeof formData];
    return Array.isArray(value) ? value.length > 0 : value?.trim();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      if (!lead) {
        console.error('No lead provided for qualification');
        return;
      }
      
      console.log('=== INÍCIO DO SALVAMENTO DA QUALIFICAÇÃO ===');
      console.log('Lead ID:', lead.id);
      console.log('Form data:', formData);
      console.log('Is qualified:', isQualified);
      console.log('Qualification score:', qualificationScore);
      
      // Create lean update object with only relevant columns
      const updates = {
        business_type: Array.isArray(formData.business_type) ? formData.business_type.join(',') : formData.business_type,
        product_interest: Array.isArray(formData.product_interest) ? formData.product_interest.join(',') : formData.product_interest,
        estimated_volume: formData.estimated_volume,
        purchase_frequency: formData.purchase_frequency,
        current_pain: formData.current_pain,
        opportunity_identified: formData.opportunity_identified,
        business_type_custom: formData.custom_business_type,
        product_interest_custom: formData.custom_product_interest,
        purchase_frequency_custom: formData.custom_purchase_frequency,
        is_qualified: isQualified,
        qualification_score: qualificationScore,
        qualification_criteria_met: qualifiedCriteria,
        status: isQualified ? 'qualificado' : lead.status
      };

      console.log('Updates object:', updates);
      console.log('Calling onSave function...');
      
      await onSave(updates);
      console.log('onSave completed successfully');
      
      toast.success("Qualificação salva com sucesso!");
      console.log('Toast success displayed');
      onClose();
      console.log('Dialog closed');
      console.log('=== FIM DO SALVAMENTO DA QUALIFICAÇÃO ===');
    } catch (error) {
      console.error('=== ERRO NO SALVAMENTO DA QUALIFICAÇÃO ===');
      console.error('Error details:', error);
      console.error('Error message:', error?.message);
      console.error('Error stack:', error?.stack);
      toast.error("Erro ao salvar qualificação");
    } finally {
      setIsSubmitting(false);
      console.log('isSubmitting set to false');
    }
  };

  if (loading) {
    return (
      <Dialog open={open} onOpenChange={onClose}>
        <DialogContent>
          <div className="p-6 text-center">Carregando configurações...</div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onOpenChange={(isOpen) => {
      if (!isOpen) {
        onClose();
      }
    }}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            Qualificação do Lead: {lead?.client_name}
            <Badge variant={isQualified ? "default" : "secondary"}>
              {qualificationScore}/5 critérios
            </Badge>
          </DialogTitle>
          <DialogDescription>
            Preencha os dados abaixo para qualificar o lead. São necessários pelo menos 2 critérios para qualificar.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Status dos Critérios */}
          <div className="bg-muted/50 p-4 rounded-lg">
            <h3 className="font-medium mb-3 flex items-center gap-2">
              Status da Qualificação
              {isQualified && <CheckCircle className="h-5 w-5 text-green-500" />}
              {!isQualified && <AlertCircle className="h-5 w-5 text-amber-500" />}
            </h3>
            <div className="grid grid-cols-2 gap-2">
              {criteriaList.map((criteria) => (
                <div key={criteria.key} className="flex items-center gap-2">
                  {getCriteriaStatus(criteria) ? (
                    <CheckCircle className="h-4 w-4 text-green-500" />
                  ) : (
                    <Circle className="h-4 w-4 text-muted-foreground" />
                  )}
                  <span className={getCriteriaStatus(criteria) ? "text-green-700" : "text-muted-foreground"}>
                    {criteria.label}
                  </span>
                </div>
              ))}
            </div>
            {isQualified && (
              <div className="mt-3 p-2 bg-green-50 border border-green-200 rounded text-sm text-green-700">
                ✅ Lead qualificado! Pode ser encaminhado ao especialista.
              </div>
            )}
            {!isQualified && (
              <div className="mt-3 p-2 bg-amber-50 border border-amber-200 rounded text-sm text-amber-700">
                ⚠️ Necessário pelo menos 2 critérios para qualificar o lead.
              </div>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4">
            {/* Informações Básicas */}
            <div className="space-y-4">
              <h3 className="font-medium">Informações do Negócio</h3>
              
              <div>
                <Label htmlFor="business_type">Tipo de Negócio (múltipla seleção)</Label>
                <div className="space-y-2">
                  <ToggleGroup 
                    type="multiple" 
                    value={formData.business_type}
                    onValueChange={(values) => {
                      setFormData({...formData, business_type: values});
                    }}
                    className="flex flex-wrap gap-2 justify-start"
                  >
                    {businessTypes.map((type) => (
                      <ToggleGroupItem 
                        key={type} 
                        value={type}
                        className="border border-border data-[state=on]:bg-primary data-[state=on]:text-primary-foreground"
                      >
                        {businessTypeLabels[type as keyof typeof businessTypeLabels]}
                      </ToggleGroupItem>
                    ))}
                  </ToggleGroup>
                  
                  {formData.business_type.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-2">
                      {formData.business_type.map((type) => (
                        <Badge key={type} variant="secondary" className="text-xs">
                          {businessTypeLabels[type as keyof typeof businessTypeLabels]}
                          <button
                            type="button"
                            onClick={() => {
                              setFormData({
                                ...formData, 
                                business_type: formData.business_type.filter(t => t !== type)
                              });
                            }}
                            className="ml-1 hover:text-destructive"
                          >
                            <X className="h-3 w-3" />
                          </button>
                        </Badge>
                      ))}
                    </div>
                  )}
                  
                  {formData.business_type.includes('outros') && (
                    <Input
                      className="mt-2"
                      placeholder="Especifique o tipo de negócio"
                      value={formData.custom_business_type}
                      onChange={(e) => setFormData({...formData, custom_business_type: e.target.value})}
                    />
                  )}
                </div>
              </div>

              <div>
                <Label htmlFor="product_interest">Produto de Interesse (múltipla seleção)</Label>
                <div className="space-y-2">
                  <ToggleGroup 
                    type="multiple" 
                    value={formData.product_interest}
                    onValueChange={(values) => {
                      setFormData({...formData, product_interest: values});
                    }}
                    className="flex flex-wrap gap-2 justify-start"
                  >
                    {productInterests.map((product) => (
                      <ToggleGroupItem 
                        key={product} 
                        value={product}
                        className="border border-border data-[state=on]:bg-primary data-[state=on]:text-primary-foreground"
                      >
                        {productInterestLabels[product as keyof typeof productInterestLabels]}
                      </ToggleGroupItem>
                    ))}
                  </ToggleGroup>
                  
                  {formData.product_interest.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-2">
                      {formData.product_interest.map((product) => (
                        <Badge key={product} variant="secondary" className="text-xs">
                          {productInterestLabels[product as keyof typeof productInterestLabels]}
                          <button
                            type="button"
                            onClick={() => {
                              setFormData({
                                ...formData, 
                                product_interest: formData.product_interest.filter(p => p !== product)
                              });
                            }}
                            className="ml-1 hover:text-destructive"
                          >
                            <X className="h-3 w-3" />
                          </button>
                        </Badge>
                      ))}
                    </div>
                  )}
                  
                  {formData.product_interest.includes('outros') && (
                    <Input
                      className="mt-2"
                      placeholder="Especifique o produto de interesse"
                      value={formData.custom_product_interest}
                      onChange={(e) => setFormData({...formData, custom_product_interest: e.target.value})}
                    />
                  )}
                </div>
              </div>

            </div>

            {/* Volume e Frequência */}
            <div className="space-y-4">
              <h3 className="font-medium">Volume e Necessidades</h3>
              
              <div>
                <Label htmlFor="estimated_volume">Volume Estimado</Label>
                <Input
                  id="estimated_volume"
                  value={formData.estimated_volume}
                  onChange={(e) => setFormData({...formData, estimated_volume: e.target.value})}
                  placeholder="Ex: 1000m², 50 toneladas/mês"
                />
              </div>

              <div>
                <Label htmlFor="purchase_frequency">Frequência de Compra</Label>
                <Select 
                  value={formData.purchase_frequency} 
                  onValueChange={(value) => {
                    setFormData({...formData, purchase_frequency: value, custom_purchase_frequency: ''});
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Com que frequência compra?" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="nao_informado">Não informado</SelectItem>
                    {purchaseFrequencies.map((freq) => (
                      <SelectItem key={freq} value={freq}>
                        {purchaseFrequencyLabels[freq as keyof typeof purchaseFrequencyLabels]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {formData.purchase_frequency === 'outros' && (
                  <Input
                    className="mt-2"
                    placeholder="Especifique a frequência de compra"
                    value={formData.custom_purchase_frequency}
                    onChange={(e) => setFormData({...formData, custom_purchase_frequency: e.target.value})}
                  />
                )}
              </div>
            </div>
          </div>

          {/* Dores e Oportunidades */}
          <div className="space-y-4">
            <h3 className="font-medium">Dores e Oportunidades</h3>
            
            <div>
              <Label htmlFor="current_pain">Dor Atual ou Problema com Fornecedor</Label>
              <Textarea
                id="current_pain"
                value={formData.current_pain}
                onChange={(e) => setFormData({...formData, current_pain: e.target.value})}
                placeholder="Problemas com o fornecedor atual, qualidade, prazo, preço..."
                rows={3}
              />
            </div>

            <div>
              <Label htmlFor="opportunity_identified">Oportunidade Identificada</Label>
              <Textarea
                id="opportunity_identified"
                value={formData.opportunity_identified}
                onChange={(e) => setFormData({...formData, opportunity_identified: e.target.value})}
                placeholder="Necessidades específicas, projetos futuros, expansão..."
                rows={3}
              />
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-4 border-t">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancelar
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? 'Salvando...' : 'Salvar Qualificação'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};