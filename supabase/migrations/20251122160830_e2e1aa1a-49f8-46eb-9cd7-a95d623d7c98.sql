-- Adicionar colunas para identificar tipo de envio e relatório
ALTER TABLE public.email_reports_log
  ADD COLUMN IF NOT EXISTS report_type text DEFAULT 'custom',
  ADD COLUMN IF NOT EXISTS is_scheduled boolean DEFAULT false;

-- Atualizar registros existentes como manuais
UPDATE public.email_reports_log
SET is_scheduled = false
WHERE is_scheduled IS NULL;