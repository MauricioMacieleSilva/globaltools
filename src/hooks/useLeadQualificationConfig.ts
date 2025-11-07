import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface BusinessType {
  id: string;
  name: string;
  label: string;
  is_active: boolean;
  display_order: number;
}

interface ProductInterest {
  id: string;
  name: string;
  label: string;
  is_active: boolean;
  display_order: number;
}

export const useLeadQualificationConfig = () => {
  const [businessTypes, setBusinessTypes] = useState<BusinessType[]>([]);
  const [productInterests, setProductInterests] = useState<ProductInterest[]>([]);
  const [loading, setLoading] = useState(true);

  const loadBusinessTypes = async () => {
    try {
      const { data, error } = await supabase
        .from('lead_business_types')
        .select('*')
        .eq('is_active', true)
        .order('display_order', { ascending: true });

      if (error) throw error;
      setBusinessTypes(data || []);
    } catch (error) {
      console.error('Error loading business types:', error);
      toast.error('Erro ao carregar tipos de negócio');
    }
  };

  const loadProductInterests = async () => {
    try {
      const { data, error } = await supabase
        .from('lead_product_interests')
        .select('*')
        .eq('is_active', true)
        .order('display_order', { ascending: true });

      if (error) throw error;
      setProductInterests(data || []);
    } catch (error) {
      console.error('Error loading product interests:', error);
      toast.error('Erro ao carregar produtos de interesse');
    }
  };

  const loadData = async () => {
    setLoading(true);
    await Promise.all([loadBusinessTypes(), loadProductInterests()]);
    setLoading(false);
  };

  useEffect(() => {
    loadData();
  }, []);

  // Create label mappings for backward compatibility
  const businessTypeLabels = businessTypes.reduce((acc, type) => {
    acc[type.name] = type.label;
    return acc;
  }, {} as Record<string, string>);

  const productInterestLabels = productInterests.reduce((acc, product) => {
    acc[product.name] = product.label;
    return acc;
  }, {} as Record<string, string>);

  return {
    businessTypes: businessTypes.map(t => t.name),
    businessTypeLabels,
    productInterests: productInterests.map(p => p.name),
    productInterestLabels,
    loading,
    refresh: loadData
  };
};