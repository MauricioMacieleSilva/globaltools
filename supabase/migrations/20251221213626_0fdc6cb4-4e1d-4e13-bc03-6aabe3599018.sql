-- Create table for commercial policy items
CREATE TABLE public.politica_comercial_itens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  classe TEXT NOT NULL, -- ARAMES, BOBINAS, PERFIS, CHAPAS, TELHAS, TUBOS, LAMINADOS, VERGALHAO, BLANK
  descricao TEXT NOT NULL,
  preco NUMERIC NOT NULL, -- Preço base com ICMS 17%
  unidade TEXT NOT NULL DEFAULT 'KG',
  ipi TEXT DEFAULT '-',
  preco_m2 NUMERIC, -- Para telhas
  preco_kg NUMERIC, -- Para telhas
  ativo BOOLEAN NOT NULL DEFAULT true,
  created_by UUID REFERENCES user_profiles(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX idx_politica_comercial_classe ON public.politica_comercial_itens(classe);
CREATE INDEX idx_politica_comercial_ativo ON public.politica_comercial_itens(ativo);

-- Enable RLS
ALTER TABLE public.politica_comercial_itens ENABLE ROW LEVEL SECURITY;

-- All authenticated users can view
CREATE POLICY "Authenticated users can view items" ON public.politica_comercial_itens
  FOR SELECT USING (true);

-- Only admins can manage
CREATE POLICY "Admins can manage items" ON public.politica_comercial_itens
  FOR ALL USING (has_role(auth.uid(), 'admin'::user_role));

-- Trigger for updated_at
CREATE TRIGGER update_politica_comercial_itens_updated_at
  BEFORE UPDATE ON public.politica_comercial_itens
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();