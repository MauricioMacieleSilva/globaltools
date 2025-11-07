import React from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { CheckCircle, Circle, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { getQualificationDetails } from '@/lib/utils';

interface LeadQualificationPreviewProps {
  open: boolean;
  onClose: () => void;
  lead: any | null;
}

const businessTypeLabels = {
  construtora: 'Construtora',
  serralheria: 'Serralheria',
  funilaria: 'Funilaria',
  metalúrgica: 'Metalúrgica',
  distribuidora: 'Distribuidora',
  revenda: 'Revenda',
  indústria: 'Indústria',
  outros: 'Outros'
};

const productInterestLabels = {
  telhas: 'Telhas',
  bobinas: 'Bobinas',
  perfis: 'Perfis',
  chapas: 'Chapas',
  tubos: 'Tubos',
  laminados: 'Laminados',
  vergalhao: 'Vergalhão',
  outros: 'Outros'
};

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

export const LeadQualificationPreview: React.FC<LeadQualificationPreviewProps> = ({
  open,
  onClose,
  lead
}) => {
  if (!lead) return null;

  const qualification = getQualificationDetails(lead);
  const { qualificationScore, isQualified, qualifiedCriteria, criteriaList } = qualification;

  const formatBusinessType = (businessType: string | string[]) => {
    const types = typeof businessType === 'string' 
      ? businessType.split(',').filter(Boolean)
      : (businessType || []);
    
    return types.map(type => {
      const label = businessTypeLabels[type as keyof typeof businessTypeLabels] || type;
      if (type === 'outros' && lead.business_type_custom) {
        return `${label} (${lead.business_type_custom})`;
      }
      return label;
    });
  };

  const formatProductInterest = (productInterest: string | string[]) => {
    const products = typeof productInterest === 'string'
      ? productInterest.split(',').filter(Boolean)
      : (productInterest || []);
    
    return products.map(product => {
      const label = productInterestLabels[product as keyof typeof productInterestLabels] || product;
      if (product === 'outros' && lead.product_interest_custom) {
        return `${label} (${lead.product_interest_custom})`;
      }
      return label;
    });
  };

  const formatPurchaseFrequency = (frequency: string) => {
    if (!frequency || frequency === 'nao_informado') return null;
    
    const label = purchaseFrequencyLabels[frequency as keyof typeof purchaseFrequencyLabels] || frequency;
    if (frequency === 'outros' && lead.purchase_frequency_custom) {
      return `${label} (${lead.purchase_frequency_custom})`;
    }
    return label;
  };

  const getCriteriaIcon = (criteriaKey: string) => {
    return qualifiedCriteria.includes(criteriaKey) ? (
      <CheckCircle className="h-4 w-4 text-green-500" />
    ) : (
      <Circle className="h-4 w-4 text-muted-foreground" />
    );
  };

  return (
    <Dialog open={open} onOpenChange={(isOpen) => {
      if (!isOpen) onClose();
    }}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            Detalhes da Qualificação: {lead.client_name}
            <Badge variant={isQualified ? "default" : "secondary"}>
              {qualificationScore}/5 critérios
            </Badge>
          </DialogTitle>
          <DialogDescription>
            Informações detalhadas dos critérios de qualificação do lead.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Status da Qualificação */}
          <div className="bg-muted/50 p-4 rounded-lg">
            <h3 className="font-medium mb-3 flex items-center gap-2">
              Status da Qualificação
              {isQualified ? (
                <CheckCircle className="h-5 w-5 text-green-500" />
              ) : (
                <Circle className="h-5 w-5 text-amber-500" />
              )}
            </h3>
            <div className="grid grid-cols-2 gap-2">
              {criteriaList.map((criteria) => (
                <div key={criteria.key} className="flex items-center gap-2">
                  {getCriteriaIcon(criteria.key)}
                  <span className={qualifiedCriteria.includes(criteria.key) ? "text-green-700" : "text-muted-foreground"}>
                    {criteria.label}
                  </span>
                </div>
              ))}
            </div>
            {isQualified ? (
              <div className="mt-3 p-2 bg-green-50 border border-green-200 rounded text-sm text-green-700">
                ✅ Lead qualificado! Pode ser encaminhado ao especialista.
              </div>
            ) : (
              <div className="mt-3 p-2 bg-amber-50 border border-amber-200 rounded text-sm text-amber-700">
                ⚠️ Necessário pelo menos 2 critérios para qualificar o lead.
              </div>
            )}
          </div>

          {/* Detalhes dos Critérios */}
          <div className="grid grid-cols-1 gap-4">
            {/* Tipo de Negócio */}
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                {getCriteriaIcon('business_type')}
                <h4 className="font-medium">Tipo de Negócio</h4>
              </div>
              {lead.business_type ? (
                <div className="flex flex-wrap gap-1">
                  {formatBusinessType(lead.business_type).map((type, index) => (
                    <Badge key={index} variant="outline" className="text-xs">
                      {type}
                    </Badge>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">Não informado</p>
              )}
            </div>

            {/* Produto de Interesse */}
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                {getCriteriaIcon('product_interest')}
                <h4 className="font-medium">Produto de Interesse</h4>
              </div>
              {lead.product_interest ? (
                <div className="flex flex-wrap gap-1">
                  {formatProductInterest(lead.product_interest).map((product, index) => (
                    <Badge key={index} variant="outline" className="text-xs">
                      {product}
                    </Badge>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">Não informado</p>
              )}
            </div>

            {/* Volume e Frequência */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  {getCriteriaIcon('volume_frequency')}
                  <h4 className="font-medium">Volume Estimado</h4>
                </div>
                <p className="text-sm">
                  {lead.estimated_volume || (
                    <span className="text-muted-foreground">Não informado</span>
                  )}
                </p>
              </div>
              
              <div className="space-y-2">
                <h4 className="font-medium">Frequência de Compra</h4>
                <p className="text-sm">
                  {formatPurchaseFrequency(lead.purchase_frequency) || (
                    <span className="text-muted-foreground">Não informado</span>
                  )}
                </p>
              </div>
            </div>

            {/* Dor Atual */}
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                {getCriteriaIcon('current_pain')}
                <h4 className="font-medium">Dor Atual</h4>
              </div>
              <p className="text-sm">
                {lead.current_pain || (
                  <span className="text-muted-foreground">Não informado</span>
                )}
              </p>
            </div>

            {/* Oportunidade Identificada */}
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                {getCriteriaIcon('opportunity')}
                <h4 className="font-medium">Oportunidade Identificada</h4>
              </div>
              <p className="text-sm">
                {lead.opportunity_identified || (
                  <span className="text-muted-foreground">Não informado</span>
                )}
              </p>
            </div>
          </div>

          {/* Botão Fechar */}
          <div className="flex justify-end pt-4">
            <Button onClick={onClose} variant="outline">
              <X className="h-4 w-4 mr-2" />
              Fechar
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};