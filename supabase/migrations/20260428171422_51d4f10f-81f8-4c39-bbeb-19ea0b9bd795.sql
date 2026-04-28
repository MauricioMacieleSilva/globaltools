CREATE TABLE IF NOT EXISTS public.perfil_resumos_salvos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  user_name text,
  nome text NOT NULL,
  observacao text,
  snapshot jsonb NOT NULL,
  peso_total numeric DEFAULT 0,
  quantidade_pecas integer DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.perfil_resumos_salvos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated can view perfil resumos"
  ON public.perfil_resumos_salvos FOR SELECT
  TO authenticated USING (true);

CREATE POLICY "Users can insert own perfil resumos"
  ON public.perfil_resumos_salvos FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Owner or admin can update perfil resumos"
  ON public.perfil_resumos_salvos FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id OR has_role(auth.uid(), 'admin'::user_role));

CREATE POLICY "Owner or admin can delete perfil resumos"
  ON public.perfil_resumos_salvos FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id OR has_role(auth.uid(), 'admin'::user_role));

CREATE TRIGGER set_updated_at_perfil_resumos
  BEFORE UPDATE ON public.perfil_resumos_salvos
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX IF NOT EXISTS idx_perfil_resumos_user ON public.perfil_resumos_salvos(user_id, created_at DESC);