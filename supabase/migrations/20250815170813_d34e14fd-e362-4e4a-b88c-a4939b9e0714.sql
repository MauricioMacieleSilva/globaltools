-- Criar tabela para armazenar motivos de disposição de leads
CREATE TABLE public.lead_dispositions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  lead_id UUID NOT NULL,
  lead_client_name TEXT NOT NULL,
  lead_client_code TEXT NOT NULL,
  reason TEXT NOT NULL,
  custom_reason TEXT,
  disposed_by UUID NOT NULL,
  disposed_by_name TEXT NOT NULL,
  disposed_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.lead_dispositions ENABLE ROW LEVEL SECURITY;

-- Create policies for lead dispositions
CREATE POLICY "Admins podem gerenciar todas as disposições" 
ON public.lead_dispositions 
FOR ALL 
USING (get_current_user_role() = 'admin'::text);

CREATE POLICY "Comerciais podem ver todas as disposições" 
ON public.lead_dispositions 
FOR SELECT 
USING (get_current_user_role() = ANY(ARRAY['admin'::text, 'comercial'::text]));

CREATE POLICY "SDRs podem criar disposições de seus leads" 
ON public.lead_dispositions 
FOR INSERT 
WITH CHECK (disposed_by = auth.uid());

CREATE POLICY "SDRs podem ver disposições de seus leads" 
ON public.lead_dispositions 
FOR SELECT 
USING (disposed_by = auth.uid());

-- Add trigger for automatic timestamp updates
CREATE TRIGGER update_lead_dispositions_updated_at
BEFORE UPDATE ON public.lead_dispositions
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();