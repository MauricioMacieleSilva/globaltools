-- Tabela de configurações de relatórios por email
CREATE TABLE IF NOT EXISTS public.email_reports_config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT NOT NULL,
  full_name TEXT,
  frequency TEXT NOT NULL CHECK (frequency IN ('daily', 'weekly', 'monthly')),
  send_time TEXT NOT NULL,
  include_vendas BOOLEAN NOT NULL DEFAULT true,
  include_funil BOOLEAN NOT NULL DEFAULT true,
  include_perdidos BOOLEAN NOT NULL DEFAULT true,
  include_cancelamentos BOOLEAN NOT NULL DEFAULT true,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Tabela de log de envios de relatórios
CREATE TABLE IF NOT EXISTS public.email_reports_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  config_id UUID NOT NULL REFERENCES public.email_reports_config(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  report_date DATE NOT NULL DEFAULT CURRENT_DATE,
  status TEXT NOT NULL CHECK (status IN ('success', 'error')),
  error_message TEXT,
  sent_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Habilitar RLS
ALTER TABLE public.email_reports_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.email_reports_log ENABLE ROW LEVEL SECURITY;

-- Policies para email_reports_config
CREATE POLICY "Admins can manage email report configs" 
  ON public.email_reports_config FOR ALL 
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Users can view own email report configs" 
  ON public.email_reports_config FOR SELECT 
  USING (auth.uid() = created_by OR public.has_role(auth.uid(), 'admin'));

-- Policies para email_reports_log
CREATE POLICY "Admins can view email report logs" 
  ON public.email_reports_log FOR SELECT 
  USING (public.has_role(auth.uid(), 'admin'));

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_email_reports_config_active ON public.email_reports_config(is_active);
CREATE INDEX IF NOT EXISTS idx_email_reports_config_frequency ON public.email_reports_config(frequency);
CREATE INDEX IF NOT EXISTS idx_email_reports_log_config_id ON public.email_reports_log(config_id);
CREATE INDEX IF NOT EXISTS idx_email_reports_log_date ON public.email_reports_log(report_date DESC);

-- Trigger para atualizar updated_at
CREATE TRIGGER update_email_reports_config_updated_at
  BEFORE UPDATE ON public.email_reports_config
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();