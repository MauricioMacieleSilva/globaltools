-- Remover a constraint restritiva do entry_channel para permitir valores vazios/null
ALTER TABLE public.leads DROP CONSTRAINT IF EXISTS leads_entry_channel_check;

-- Recriar a constraint permitindo valores vazios/null também
ALTER TABLE public.leads ADD CONSTRAINT leads_entry_channel_check 
CHECK (entry_channel IS NULL OR entry_channel = '' OR entry_channel = ANY (ARRAY['prospeccao'::text, 'marketing'::text, 'indicacao'::text, 'site'::text, 'redes_sociais'::text, 'outros'::text]));