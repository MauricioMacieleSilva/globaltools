import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// Valid database columns for leads table
const VALID_LEAD_COLUMNS = [
  'id', 'client_code', 'client_name', 'contact_name', 'contact_phone', 
  'contact_email', 'uf', 'cidade', 'status', 'source', 'notes', 'sdr_id', 
  'sdr_name', 'assigned_at', 'last_contact_at', 'next_contact_at', 
  'converted_at', 'created_at', 'updated_at', 'business_type', 
  'product_interest', 'estimated_volume', 'purchase_frequency', 
  'current_pain', 'opportunity_identified', 'entry_channel', 
  'qualification_criteria_met', 'qualification_score', 'is_qualified', 
  'forwarded_to_specialist', 'forwarded_at', 'assigned_specialist_id', 
  'assigned_specialist_name', 'conversation_started', 'contact_attempts', 
  'contacted_count', 'business_type_custom', 'product_interest_custom',
  'estimated_volume_custom', 'purchase_frequency_custom', 'current_pain_custom',
  'opportunity_identified_custom'
];

export function sanitizeLeadUpdates(updates: Record<string, any>): Record<string, any> {
  const sanitized: Record<string, any> = {};
  
  for (const [key, value] of Object.entries(updates)) {
    if (VALID_LEAD_COLUMNS.includes(key) && value !== undefined) {
      sanitized[key] = value;
    }
  }
  
  console.log('Lead updates sanitized:', { original: updates, sanitized });
  return sanitized;
}

// Compute qualification score and status based on criteria
export function computeQualification(formData: {
  business_type?: string[] | string;
  product_interest?: string[] | string;
  estimated_volume?: string;
  purchase_frequency?: string;
  current_pain?: string;
  opportunity_identified?: string;
  custom_business_type?: string;
  custom_product_interest?: string;
  custom_purchase_frequency?: string;
}) {
  const criteriaList = [
    { key: 'business_type', label: 'Tipo de Negócio', field: 'business_type' },
    { key: 'product_interest', label: 'Produto de Interesse', field: 'product_interest' },
    { key: 'volume_frequency', label: 'Volume/Frequência', field: ['estimated_volume', 'purchase_frequency'] },
    { key: 'current_pain', label: 'Dor Atual', field: 'current_pain' },
    { key: 'opportunity', label: 'Oportunidade Identificada', field: 'opportunity_identified' }
  ];

  // Helper to check if a value is valid (not empty, not "nao_informado", not generic "outros" without custom text)
  const isValidValue = (value: any, customValue?: string): boolean => {
    if (!value) return false;
    
    if (Array.isArray(value)) {
      // For arrays, check if there are valid items (excluding "nao_informado")
      const validItems = value.filter(item => 
        item && 
        item.trim() && 
        item !== 'nao_informado' && 
        (item !== 'outros' || (customValue && customValue.trim()))
      );
      return validItems.length > 0;
    }
    
    if (typeof value === 'string') {
      const trimmed = value.trim();
      if (!trimmed || trimmed === 'nao_informado') return false;
      // If it's "outros", check if there's custom text
      if (trimmed === 'outros') {
        return !!(customValue && customValue.trim());
      }
      return true;
    }
    
    return false;
  };

  const getCriteriaStatus = (criteria: any) => {
    if (Array.isArray(criteria.field)) {
      return criteria.field.some((field: string) => {
        const value = formData[field as keyof typeof formData];
        
        // Special handling for purchase_frequency with custom field
        if (field === 'purchase_frequency') {
          return isValidValue(value, formData.custom_purchase_frequency);
        }
        
        return isValidValue(value);
      });
    }
    
    const field = criteria.field;
    const value = formData[field as keyof typeof formData];
    
    // Special handling for business_type and product_interest with custom fields
    if (field === 'business_type') {
      return isValidValue(value, formData.custom_business_type);
    }
    if (field === 'product_interest') {
      return isValidValue(value, formData.custom_product_interest);
    }
    
    return isValidValue(value);
  };

  const qualifiedCriteria = criteriaList.filter(criteria => getCriteriaStatus(criteria));
  const qualificationScore = qualifiedCriteria.length;
  const isQualified = qualificationScore >= 2;
  
  return {
    qualificationScore,
    isQualified,
    qualifiedCriteria: qualifiedCriteria.map(c => c.key),
    criteriaList
  };
}

// Helper function to get qualification details for display
export function getQualificationDetails(lead: any) {
  const formData = {
    business_type: typeof lead.business_type === 'string' 
      ? lead.business_type.split(',').filter(Boolean)
      : (lead.business_type || []),
    product_interest: typeof lead.product_interest === 'string'
      ? lead.product_interest.split(',').filter(Boolean) 
      : (lead.product_interest || []),
    estimated_volume: lead.estimated_volume || '',
    purchase_frequency: lead.purchase_frequency || '',
    current_pain: lead.current_pain || '',
    opportunity_identified: lead.opportunity_identified || '',
    custom_business_type: lead.business_type_custom || '',
    custom_product_interest: lead.product_interest_custom || '',
    custom_purchase_frequency: lead.purchase_frequency_custom || ''
  };

  return computeQualification(formData);
}
