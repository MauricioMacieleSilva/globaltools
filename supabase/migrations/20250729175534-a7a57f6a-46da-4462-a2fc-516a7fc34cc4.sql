-- Tabela para configuração de relatórios por e-mail
CREATE TABLE public.email_reports_config (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  email TEXT NOT NULL,
  full_name TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  frequency TEXT NOT NULL DEFAULT 'daily' CHECK (frequency IN ('daily', 'weekly', 'monthly')),
  send_time TIME NOT NULL DEFAULT '08:00:00',
  include_vendas BOOLEAN NOT NULL DEFAULT true,
  include_funil BOOLEAN NOT NULL DEFAULT true,
  include_perdidos BOOLEAN NOT NULL DEFAULT true,
  include_cancelamentos BOOLEAN NOT NULL DEFAULT true,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Tabela para histórico de envios
CREATE TABLE public.email_reports_log (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  config_id UUID REFERENCES public.email_reports_config(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  report_date DATE NOT NULL,
  report_type TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('success', 'failed', 'pending')),
  error_message TEXT,
  sent_at TIMESTAMP WITH TIME ZONE,
  opened_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.email_reports_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.email_reports_log ENABLE ROW LEVEL SECURITY;

-- RLS Policies para email_reports_config
CREATE POLICY "Admins can manage all report configs"
ON public.email_reports_config
FOR ALL
USING (get_current_user_role() = 'admin');

CREATE POLICY "Users can view their own config"
ON public.email_reports_config
FOR SELECT
USING (created_by = auth.uid());

-- RLS Policies para email_reports_log
CREATE POLICY "Admins can view all report logs"
ON public.email_reports_log
FOR SELECT
USING (get_current_user_role() = 'admin');

-- Trigger para atualizar updated_at
CREATE TRIGGER update_email_reports_config_updated_at
BEFORE UPDATE ON public.email_reports_config
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Índices para performance
CREATE INDEX idx_email_reports_config_active ON public.email_reports_config(is_active);
CREATE INDEX idx_email_reports_config_frequency ON public.email_reports_config(frequency);
CREATE INDEX idx_email_reports_log_date ON public.email_reports_log(report_date);
CREATE INDEX idx_email_reports_log_status ON public.email_reports_log(status);

-- Configurar cron job para execução diária às 8h
SELECT cron.schedule(
  'send-daily-reports',
  '0 8 * * *', -- Todos os dias às 8h
  $$
  SELECT
    net.http_post(
        url:='https://kqltnuyfwobzkdmxqrqm.supabase.co/functions/v1/send-daily-report',
        headers:='{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtxbHRudXlmd29iemtkbXhxcnFtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTM3MDY3MjEsImV4cCI6MjA2OTI4MjcyMX0.GKhHagERNyn8iyIBVtGJFYF1w3CglvuYRKmKfBDFZwQ"}'::jsonb,
        body:='{"type": "daily"}'::jsonb
    ) as request_id;
  $$
);