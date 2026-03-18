
-- Create treinamentos table
CREATE TABLE public.treinamentos (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  titulo TEXT NOT NULL,
  descricao TEXT,
  categoria TEXT NOT NULL DEFAULT 'Geral',
  file_url TEXT NOT NULL,
  file_name TEXT NOT NULL,
  file_type TEXT NOT NULL,
  file_size BIGINT,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  is_active BOOLEAN NOT NULL DEFAULT true
);

-- Enable RLS
ALTER TABLE public.treinamentos ENABLE ROW LEVEL SECURITY;

-- All authenticated users can view
CREATE POLICY "Authenticated users can view treinamentos"
  ON public.treinamentos FOR SELECT
  TO authenticated
  USING (is_active = true);

-- Admins can do everything
CREATE POLICY "Admins can manage treinamentos"
  ON public.treinamentos FOR ALL
  USING (public.has_role(auth.uid(), 'admin'::user_role));

-- Create storage bucket
INSERT INTO storage.buckets (id, name, public)
VALUES ('treinamentos', 'treinamentos', true);

-- Storage RLS: anyone authenticated can read
CREATE POLICY "Authenticated users can read treinamentos files"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (bucket_id = 'treinamentos');

-- Storage RLS: only admins can upload
CREATE POLICY "Admins can upload treinamentos files"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'treinamentos' AND public.has_role(auth.uid(), 'admin'::user_role));

-- Storage RLS: only admins can delete
CREATE POLICY "Admins can delete treinamentos files"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (bucket_id = 'treinamentos' AND public.has_role(auth.uid(), 'admin'::user_role));
