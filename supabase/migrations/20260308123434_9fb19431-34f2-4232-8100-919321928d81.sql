
-- Table: crm_loss_reasons
CREATE TABLE public.crm_loss_reasons (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  is_active boolean NOT NULL DEFAULT true,
  display_order integer,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.crm_loss_reasons ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins can manage loss reasons" ON public.crm_loss_reasons FOR ALL USING (has_role(auth.uid(), 'admin'::user_role));
CREATE POLICY "Authenticated can view loss reasons" ON public.crm_loss_reasons FOR SELECT USING (true);
CREATE POLICY "Comercial can insert loss reasons" ON public.crm_loss_reasons FOR INSERT WITH CHECK (has_role(auth.uid(), 'admin'::user_role) OR has_role(auth.uid(), 'comercial'::user_role) OR has_role(auth.uid(), 'sdr'::user_role));

-- Seed default reasons
INSERT INTO public.crm_loss_reasons (name, display_order) VALUES
  ('Preço acima do mercado', 1),
  ('Optou pela concorrência', 2),
  ('Sem resposta / Sem interesse', 3),
  ('Prazo de entrega', 4),
  ('Produto não disponível', 5),
  ('Cliente desistiu', 6),
  ('Outro', 7);

-- Table: crm_visits
CREATE TABLE public.crm_visits (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id uuid NOT NULL,
  visit_date timestamptz NOT NULL,
  location text,
  notes text,
  user_id uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.crm_visits ENABLE ROW LEVEL SECURITY;
CREATE POLICY "CRM roles can manage visits" ON public.crm_visits FOR ALL USING (has_role(auth.uid(), 'admin'::user_role) OR has_role(auth.uid(), 'comercial'::user_role) OR has_role(auth.uid(), 'sdr'::user_role));
CREATE POLICY "CRM roles can view visits" ON public.crm_visits FOR SELECT USING (has_role(auth.uid(), 'admin'::user_role) OR has_role(auth.uid(), 'comercial'::user_role) OR has_role(auth.uid(), 'sdr'::user_role));

-- Table: crm_business_sectors
CREATE TABLE public.crm_business_sectors (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.crm_business_sectors ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins manage sectors" ON public.crm_business_sectors FOR ALL USING (has_role(auth.uid(), 'admin'::user_role));
CREATE POLICY "Auth view sectors" ON public.crm_business_sectors FOR SELECT USING (true);
CREATE POLICY "Comercial insert sectors" ON public.crm_business_sectors FOR INSERT WITH CHECK (has_role(auth.uid(), 'admin'::user_role) OR has_role(auth.uid(), 'comercial'::user_role) OR has_role(auth.uid(), 'sdr'::user_role));

-- Table: crm_product_interests
CREATE TABLE public.crm_product_interests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.crm_product_interests ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins manage product interests" ON public.crm_product_interests FOR ALL USING (has_role(auth.uid(), 'admin'::user_role));
CREATE POLICY "Auth view product interests" ON public.crm_product_interests FOR SELECT USING (true);
CREATE POLICY "Comercial insert product interests" ON public.crm_product_interests FOR INSERT WITH CHECK (has_role(auth.uid(), 'admin'::user_role) OR has_role(auth.uid(), 'comercial'::user_role) OR has_role(auth.uid(), 'sdr'::user_role));

-- Seed default product interests
INSERT INTO public.crm_product_interests (name) VALUES ('Chapas'), ('Perfis'), ('Bobinas'), ('Tubos'), ('Tiras'), ('Slitter'), ('Corte Blank');

-- Seed default business sectors
INSERT INTO public.crm_business_sectors (name) VALUES ('Indústria'), ('Construção Civil'), ('Agronegócio'), ('Metalurgia'), ('Serralheria'), ('Caldeiraria'), ('Estruturas Metálicas'), ('Outros');

-- Alter leads table
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS ramo_atuacao text;
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS regime_tributario text;
