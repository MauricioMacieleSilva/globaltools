CREATE TABLE public.politica_descontos_faixas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  peso_min numeric NOT NULL DEFAULT 0,
  peso_max numeric,
  desconto_max_percent numeric NOT NULL,
  ordem integer NOT NULL DEFAULT 0,
  ativo boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.politica_descontos_faixas TO authenticated;
GRANT ALL ON public.politica_descontos_faixas TO service_role;

ALTER TABLE public.politica_descontos_faixas ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated can view faixas"
  ON public.politica_descontos_faixas FOR SELECT TO authenticated USING (true);

CREATE POLICY "Admins manage faixas"
  ON public.politica_descontos_faixas FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'::user_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::user_role));

CREATE TRIGGER trg_faixas_updated_at
  BEFORE UPDATE ON public.politica_descontos_faixas
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

INSERT INTO public.politica_descontos_faixas (peso_min, peso_max, desconto_max_percent, ordem) VALUES
  (0, 2000, 2, 1),
  (2000, 5000, 3, 2),
  (5000, 10000, 4, 3),
  (10000, NULL, 5, 4);