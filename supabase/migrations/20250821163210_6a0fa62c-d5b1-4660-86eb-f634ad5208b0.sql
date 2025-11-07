-- Add custom fields to leads table for qualification details
ALTER TABLE public.leads 
ADD COLUMN business_type_custom text,
ADD COLUMN product_interest_custom text,
ADD COLUMN estimated_volume_custom text,
ADD COLUMN purchase_frequency_custom text,
ADD COLUMN current_pain_custom text,
ADD COLUMN opportunity_identified_custom text;