-- Primeiro, remover registros duplicados mantendo apenas o mais recente de cada grupo
-- Para relatórios agendados, manter apenas 1 registro por config_id + report_date
DELETE FROM email_reports_log 
WHERE id IN (
  SELECT id FROM (
    SELECT id, 
           ROW_NUMBER() OVER (
             PARTITION BY config_id, report_date, is_scheduled 
             ORDER BY sent_at DESC
           ) as rn
    FROM email_reports_log
    WHERE is_scheduled = true
  ) duplicates
  WHERE rn > 1
);

-- Agora criar o índice único para prevenir futuras duplicatas
CREATE UNIQUE INDEX IF NOT EXISTS unique_scheduled_report_per_day 
ON email_reports_log (config_id, report_date, is_scheduled) 
WHERE is_scheduled = true;