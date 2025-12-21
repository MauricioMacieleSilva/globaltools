-- Create table for profile prices (Perfis tab in commercial policy)
-- This table has a different structure: tipo (padrao/especial), espessura, preco_kg

CREATE TABLE public.perfil_precos (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tipo TEXT NOT NULL CHECK (tipo IN ('padrao', 'especial')),
  espessura NUMERIC NOT NULL,
  preco_kg NUMERIC NOT NULL,
  ativo BOOLEAN NOT NULL DEFAULT true,
  created_by UUID REFERENCES public.user_profiles(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create unique constraint for tipo + espessura combination
CREATE UNIQUE INDEX idx_perfil_precos_tipo_espessura ON public.perfil_precos(tipo, espessura) WHERE ativo = true;

-- Create index for common queries
CREATE INDEX idx_perfil_precos_tipo ON public.perfil_precos(tipo);
CREATE INDEX idx_perfil_precos_ativo ON public.perfil_precos(ativo);

-- Enable Row Level Security
ALTER TABLE public.perfil_precos ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Authenticated users can view profile prices"
ON public.perfil_precos
FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Admins can manage profile prices"
ON public.perfil_precos
FOR ALL
TO authenticated
USING (has_role(auth.uid(), 'admin'::user_role));

-- Trigger for updated_at
CREATE TRIGGER update_perfil_precos_updated_at
  BEFORE UPDATE ON public.perfil_precos
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Add comment explaining the table purpose
COMMENT ON TABLE public.perfil_precos IS 'Tabela de preços por espessura para perfis padrão e especiais, usada na Política Comercial e integrada com Corte Perfil';