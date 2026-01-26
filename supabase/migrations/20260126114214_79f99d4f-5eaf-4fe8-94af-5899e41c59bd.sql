-- Remover constraint antiga que só aceita 'success' e 'error'
ALTER TABLE email_reports_log DROP CONSTRAINT IF EXISTS email_reports_log_status_check;

-- Adicionar nova constraint que aceita 'pending', 'success', 'failed' e 'error'
ALTER TABLE email_reports_log ADD CONSTRAINT email_reports_log_status_check 
  CHECK (status = ANY (ARRAY['pending', 'success', 'failed', 'error']));