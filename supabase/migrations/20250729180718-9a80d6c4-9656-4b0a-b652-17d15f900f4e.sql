-- Create email reports configuration table
CREATE TABLE IF NOT EXISTS public.email_reports_config (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  email TEXT NOT NULL,
  full_name TEXT,
  frequency TEXT NOT NULL DEFAULT 'daily' CHECK (frequency IN ('daily', 'weekly', 'monthly')),
  send_time TIME NOT NULL DEFAULT '08:00:00',
  include_vendas BOOLEAN NOT NULL DEFAULT true,
  include_funil BOOLEAN NOT NULL DEFAULT true,
  include_perdidos BOOLEAN NOT NULL DEFAULT true,
  include_cancelamentos BOOLEAN NOT NULL DEFAULT true,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_by UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create email reports log table
CREATE TABLE IF NOT EXISTS public.email_reports_log (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  config_id UUID NOT NULL REFERENCES public.email_reports_config(id) ON DELETE CASCADE,
  sent_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  status TEXT NOT NULL CHECK (status IN ('success', 'error', 'pending')),
  error_message TEXT,
  email_subject TEXT,
  recipient_email TEXT NOT NULL,
  report_data JSONB
);

-- Enable Row Level Security
ALTER TABLE public.email_reports_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.email_reports_log ENABLE ROW LEVEL SECURITY;

-- RLS policies for email_reports_config
CREATE POLICY "Admins can manage all email report configs" ON public.email_reports_config
  FOR ALL USING (get_current_user_role() = 'admin');

CREATE POLICY "Users can view configs they created" ON public.email_reports_config
  FOR SELECT USING (created_by = auth.uid());

-- RLS policies for email_reports_log
CREATE POLICY "Admins can view all email report logs" ON public.email_reports_log
  FOR SELECT USING (get_current_user_role() = 'admin');

CREATE POLICY "Users can view logs for their configs" ON public.email_reports_log
  FOR SELECT USING (
    config_id IN (
      SELECT id FROM public.email_reports_config WHERE created_by = auth.uid()
    )
  );

-- Create trigger for updating updated_at timestamp
CREATE TRIGGER update_email_reports_config_updated_at
  BEFORE UPDATE ON public.email_reports_config
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_email_reports_config_created_by ON public.email_reports_config(created_by);
CREATE INDEX IF NOT EXISTS idx_email_reports_config_frequency ON public.email_reports_config(frequency);
CREATE INDEX IF NOT EXISTS idx_email_reports_config_is_active ON public.email_reports_config(is_active);
CREATE INDEX IF NOT EXISTS idx_email_reports_log_config_id ON public.email_reports_log(config_id);
CREATE INDEX IF NOT EXISTS idx_email_reports_log_sent_at ON public.email_reports_log(sent_at);

-- Setup cron job to run daily at 8 AM (requires pg_cron extension)
SELECT cron.schedule(
  'daily-reports-sender',
  '0 8 * * *',
  $$
  SELECT net.http_post(
    url := 'https://kqltnuyfwobzkdmxqrqm.supabase.co/functions/v1/send-daily-report',
    headers := '{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtxbHRudXlmd29iemtkbXhxcnFtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTM3MDY3MjEsImV4cCI6MjA2OTI4MjcyMX0.GKhHagERNyn8iyIBVtGJFYF1w3CglvuYRKmKfBDFZwQ"}'::jsonb,
    body := '{"trigger": "cron"}'::jsonb
  );
  $$
);