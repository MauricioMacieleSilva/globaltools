
-- Create frete history table for full lifecycle tracking
CREATE TABLE public.frete_historico (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  frete_id uuid NOT NULL,
  acao text NOT NULL,
  status_anterior text,
  status_novo text,
  usuario_id uuid,
  usuario_nome text,
  observacao text,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.frete_historico ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Authenticated users can view frete history"
ON public.frete_historico FOR SELECT
USING (true);

CREATE POLICY "Authenticated users can insert frete history"
ON public.frete_historico FOR INSERT
WITH CHECK (auth.uid() IS NOT NULL);
