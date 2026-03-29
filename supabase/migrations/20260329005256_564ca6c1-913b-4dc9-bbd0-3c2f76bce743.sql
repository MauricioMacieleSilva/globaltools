
-- Add contact_channel to lead_activities for tracking how contact was made
ALTER TABLE public.lead_activities ADD COLUMN IF NOT EXISTS contact_channel text;

-- Add document_type and competitor_info to lead_attachments
ALTER TABLE public.lead_attachments ADD COLUMN IF NOT EXISTS document_type text DEFAULT 'geral';
ALTER TABLE public.lead_attachments ADD COLUMN IF NOT EXISTS competitor_name text;
ALTER TABLE public.lead_attachments ADD COLUMN IF NOT EXISTS competitor_materials text;
ALTER TABLE public.lead_attachments ADD COLUMN IF NOT EXISTS competitor_value numeric;
ALTER TABLE public.lead_attachments ADD COLUMN IF NOT EXISTS competitor_date date;
