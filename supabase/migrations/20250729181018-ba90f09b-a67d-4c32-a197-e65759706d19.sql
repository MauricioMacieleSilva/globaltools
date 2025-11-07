-- Fix email_reports_log table structure
DROP TABLE IF EXISTS public.email_reports_log CASCADE;

CREATE TABLE public.email_reports_log (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  config_id UUID NOT NULL REFERENCES public.email_reports_config(id) ON DELETE CASCADE,
  sent_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  status TEXT NOT NULL CHECK (status IN ('success', 'error', 'pending')),
  error_message TEXT,
  email_subject TEXT,
  recipient_email TEXT NOT NULL,
  report_data JSONB,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.email_reports_log ENABLE ROW LEVEL SECURITY;

-- RLS policies for email_reports_log
CREATE POLICY "Admins can view all email report logs" ON public.email_reports_log
  FOR SELECT USING (get_current_user_role() = 'admin');

CREATE POLICY "Users can view logs for their configs" ON public.email_reports_log
  FOR SELECT USING (
    config_id IN (
      SELECT id FROM public.email_reports_config WHERE created_by = auth.uid()
    )
  );

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_email_reports_log_config_id ON public.email_reports_log(config_id);
CREATE INDEX IF NOT EXISTS idx_email_reports_log_sent_at ON public.email_reports_log(sent_at);
CREATE INDEX IF NOT EXISTS idx_email_reports_log_created_at ON public.email_reports_log(created_at);