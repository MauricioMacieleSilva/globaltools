-- Add qualification fields to leads table
ALTER TABLE public.leads ADD COLUMN business_type TEXT;
ALTER TABLE public.leads ADD COLUMN product_interest TEXT;
ALTER TABLE public.leads ADD COLUMN estimated_volume TEXT;
ALTER TABLE public.leads ADD COLUMN purchase_frequency TEXT;
ALTER TABLE public.leads ADD COLUMN current_pain TEXT;
ALTER TABLE public.leads ADD COLUMN opportunity_identified TEXT;
ALTER TABLE public.leads ADD COLUMN entry_channel TEXT CHECK (entry_channel IN ('prospeccao', 'marketing', 'indicacao', 'site', 'redes_sociais', 'outros'));
ALTER TABLE public.leads ADD COLUMN qualification_criteria_met TEXT[] DEFAULT '{}';
ALTER TABLE public.leads ADD COLUMN qualification_score INTEGER DEFAULT 0 CHECK (qualification_score >= 0 AND qualification_score <= 6);
ALTER TABLE public.leads ADD COLUMN is_qualified BOOLEAN DEFAULT FALSE;
ALTER TABLE public.leads ADD COLUMN forwarded_to_specialist BOOLEAN DEFAULT FALSE;
ALTER TABLE public.leads ADD COLUMN forwarded_at TIMESTAMPTZ;

-- Update existing leads to have default qualification score
UPDATE public.leads SET qualification_score = 0 WHERE qualification_score IS NULL;