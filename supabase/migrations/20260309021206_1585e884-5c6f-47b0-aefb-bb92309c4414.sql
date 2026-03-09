
CREATE TABLE public.lead_prospecting_results (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  log_id UUID REFERENCES public.lead_prospecting_logs(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'pending',
  reviewed_by UUID REFERENCES public.user_profiles(id),
  reviewed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  cliente_nome TEXT NOT NULL,
  empresa TEXT,
  contact_name TEXT,
  cliente_telefone TEXT,
  cliente_email TEXT,
  cliente_cnpj TEXT,
  cidade TEXT,
  estado TEXT,
  ramo_atuacao TEXT,
  produto_interesse TEXT,
  valor_estimado NUMERIC,
  notes TEXT,
  fonte_dados TEXT,
  source TEXT
);

ALTER TABLE public.lead_prospecting_results ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins and comercial can view prospecting results"
  ON public.lead_prospecting_results
  FOR SELECT
  USING (
    has_role(auth.uid(), 'admin'::user_role) 
    OR has_role(auth.uid(), 'comercial'::user_role)
    OR has_role(auth.uid(), 'sdr'::user_role)
  );

CREATE POLICY "Admins and comercial can update prospecting results"
  ON public.lead_prospecting_results
  FOR UPDATE
  USING (
    has_role(auth.uid(), 'admin'::user_role) 
    OR has_role(auth.uid(), 'comercial'::user_role)
  );

CREATE POLICY "Service role can insert prospecting results"
  ON public.lead_prospecting_results
  FOR INSERT
  WITH CHECK (true);
