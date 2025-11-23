-- Add reference_month column to email_reports_log for monthly closing reports
ALTER TABLE email_reports_log 
ADD COLUMN IF NOT EXISTS reference_month TEXT;