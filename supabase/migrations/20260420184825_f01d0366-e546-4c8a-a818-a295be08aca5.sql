
-- Tabela de projeções (orçado) mensal por cliente
CREATE TABLE public.client_projections (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  cliente_nome TEXT NOT NULL,
  ano INTEGER NOT NULL,
  mes INTEGER NOT NULL CHECK (mes >= 1 AND mes <= 12),
  valor_orcado NUMERIC NOT NULL DEFAULT 0,
  created_by UUID,
  updated_by UUID,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE (cliente_nome, ano, mes)
);

CREATE INDEX idx_client_projections_lookup ON public.client_projections (ano, mes);
CREATE INDEX idx_client_projections_cliente ON public.client_projections (cliente_nome);

ALTER TABLE public.client_projections ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated can view client projections"
ON public.client_projections FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Comercial can manage client projections"
ON public.client_projections FOR ALL
TO authenticated
USING (has_role(auth.uid(), 'admin'::user_role) OR has_role(auth.uid(), 'comercial'::user_role))
WITH CHECK (has_role(auth.uid(), 'admin'::user_role) OR has_role(auth.uid(), 'comercial'::user_role));

CREATE TRIGGER update_client_projections_updated_at
BEFORE UPDATE ON public.client_projections
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Tabela de vínculo vendedor-cliente (fixo)
CREATE TABLE public.client_vendor_assignments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  cliente_nome TEXT NOT NULL UNIQUE,
  vendedor_id UUID,
  vendedor_nome TEXT,
  created_by UUID,
  updated_by UUID,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE INDEX idx_client_vendor_assignments_vendor ON public.client_vendor_assignments (vendedor_id);

ALTER TABLE public.client_vendor_assignments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated can view client vendor assignments"
ON public.client_vendor_assignments FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Comercial can manage client vendor assignments"
ON public.client_vendor_assignments FOR ALL
TO authenticated
USING (has_role(auth.uid(), 'admin'::user_role) OR has_role(auth.uid(), 'comercial'::user_role))
WITH CHECK (has_role(auth.uid(), 'admin'::user_role) OR has_role(auth.uid(), 'comercial'::user_role));

CREATE TRIGGER update_client_vendor_assignments_updated_at
BEFORE UPDATE ON public.client_vendor_assignments
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
