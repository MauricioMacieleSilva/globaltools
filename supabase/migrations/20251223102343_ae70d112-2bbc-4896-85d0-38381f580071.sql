-- Create estoque_itens table for inventory management
CREATE TABLE public.estoque_itens (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  categoria TEXT NOT NULL CHECK (categoria IN ('ARAMES', 'BOBINAS', 'PERFIS', 'CHAPAS', 'TELHAS', 'TUBOS', 'LAMINADOS', 'VERGALHAO', 'BLANK', 'TIRAS')),
  descricao TEXT NOT NULL,
  quantidade NUMERIC NOT NULL DEFAULT 0,
  unidade TEXT DEFAULT 'KG',
  
  -- Campos específicos para integração com Corte Perfil
  tipo_perfil TEXT, -- U, Z, L, CARTOLA, U_ENRIJECIDO, etc.
  espessura NUMERIC,
  largura NUMERIC,
  comprimento NUMERIC,
  base NUMERIC,
  aba1 NUMERIC,
  aba2 NUMERIC,
  
  -- Imagens (URLs do storage)
  imagem_url TEXT,
  
  -- Metadados
  localizacao TEXT,
  observacoes TEXT,
  ativo BOOLEAN DEFAULT true,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.estoque_itens ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Authenticated users can view estoque items"
ON public.estoque_itens
FOR SELECT
USING (true);

CREATE POLICY "Admin, comercial and operacional can manage estoque"
ON public.estoque_itens
FOR ALL
USING (
  has_role(auth.uid(), 'admin'::user_role)
  OR has_role(auth.uid(), 'comercial'::user_role)
  OR has_role(auth.uid(), 'operacional'::user_role)
)
WITH CHECK (
  has_role(auth.uid(), 'admin'::user_role)
  OR has_role(auth.uid(), 'comercial'::user_role)
  OR has_role(auth.uid(), 'operacional'::user_role)
);

-- Create trigger for updated_at
CREATE TRIGGER update_estoque_itens_updated_at
  BEFORE UPDATE ON public.estoque_itens
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Create storage bucket for estoque images
INSERT INTO storage.buckets (id, name, public)
VALUES ('estoque-imagens', 'estoque-imagens', true)
ON CONFLICT (id) DO NOTHING;

-- Storage policies for estoque images
CREATE POLICY "Anyone can view estoque images"
ON storage.objects FOR SELECT
USING (bucket_id = 'estoque-imagens');

CREATE POLICY "Authenticated users can upload estoque images"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'estoque-imagens' AND auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can update estoque images"
ON storage.objects FOR UPDATE
USING (bucket_id = 'estoque-imagens' AND auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can delete estoque images"
ON storage.objects FOR DELETE
USING (bucket_id = 'estoque-imagens' AND auth.role() = 'authenticated');

-- Create index for common queries
CREATE INDEX idx_estoque_itens_categoria ON public.estoque_itens(categoria);
CREATE INDEX idx_estoque_itens_tipo_perfil ON public.estoque_itens(tipo_perfil);
CREATE INDEX idx_estoque_itens_espessura ON public.estoque_itens(espessura);