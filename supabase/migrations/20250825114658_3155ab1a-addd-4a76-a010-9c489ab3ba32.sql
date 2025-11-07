-- Criar tabelas para configuração de tipos de negócio e produtos de interesse
CREATE TABLE public.lead_business_types (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name text NOT NULL UNIQUE,
  label text NOT NULL,
  is_active boolean NOT NULL DEFAULT true,
  display_order integer DEFAULT 0,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  created_by uuid REFERENCES auth.users(id)
);

CREATE TABLE public.lead_product_interests (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name text NOT NULL UNIQUE,
  label text NOT NULL,
  is_active boolean NOT NULL DEFAULT true,
  display_order integer DEFAULT 0,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  created_by uuid REFERENCES auth.users(id)
);

-- Habilitar RLS
ALTER TABLE public.lead_business_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lead_product_interests ENABLE ROW LEVEL SECURITY;

-- Políticas RLS
CREATE POLICY "Todos podem ver tipos de negócio ativos" 
ON public.lead_business_types 
FOR SELECT 
USING (is_active = true);

CREATE POLICY "Admins podem gerenciar tipos de negócio" 
ON public.lead_business_types 
FOR ALL 
USING (get_current_user_role() = 'admin');

CREATE POLICY "Todos podem ver produtos de interesse ativos" 
ON public.lead_product_interests 
FOR SELECT 
USING (is_active = true);

CREATE POLICY "Admins podem gerenciar produtos de interesse" 
ON public.lead_product_interests 
FOR ALL 
USING (get_current_user_role() = 'admin');

-- Trigger para updated_at
CREATE TRIGGER update_lead_business_types_updated_at
  BEFORE UPDATE ON public.lead_business_types
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_lead_product_interests_updated_at
  BEFORE UPDATE ON public.lead_product_interests
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Inserir dados padrão
INSERT INTO public.lead_business_types (name, label, display_order) VALUES
('construtora', 'Construtora', 1),
('serralheria', 'Serralheria', 2),
('funilaria', 'Funilaria', 3),
('metalurgica', 'Metalúrgica', 4),
('distribuidora', 'Distribuidora', 5),
('revenda', 'Revenda', 6),
('industria', 'Indústria', 7),
('outros', 'Outros', 8);

INSERT INTO public.lead_product_interests (name, label, display_order) VALUES
('telhas', 'Telhas', 1),
('bobinas', 'Bobinas', 2),
('perfis', 'Perfis', 3),
('chapas', 'Chapas', 4),
('tubos', 'Tubos', 5),
('laminados', 'Laminados', 6),
('vergalhao', 'Vergalhão', 7),
('outros', 'Outros', 8);