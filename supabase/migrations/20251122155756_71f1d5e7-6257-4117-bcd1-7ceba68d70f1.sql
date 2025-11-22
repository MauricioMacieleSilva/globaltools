-- Permitir frequência personalizada para relatórios automáticos
ALTER TABLE public.email_reports_config
  DROP CONSTRAINT IF EXISTS email_reports_config_frequency_check;

ALTER TABLE public.email_reports_config
  ADD CONSTRAINT email_reports_config_frequency_check
  CHECK (frequency = ANY (ARRAY['daily'::text, 'weekly'::text, 'monthly'::text, 'custom'::text]));
