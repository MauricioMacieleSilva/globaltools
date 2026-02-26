
CREATE TABLE public.fretes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  numero_pedido TEXT NOT NULL,
  notas_fiscais TEXT[] NOT NULL DEFAULT '{}',
  data_embarque DATE NOT NULL,
  transportadora_id UUID REFERENCES public.transportadoras(id),
  transportadora_nome TEXT NOT NULL,
  valor_frete NUMERIC NOT NULL DEFAULT 0,
  data_entrega DATE,
  observacoes TEXT,
  created_by UUID NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.fretes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view fretes"
  ON public.fretes FOR SELECT
  USING (true);

CREATE POLICY "Admin, comercial, operacional can insert fretes"
  ON public.fretes FOR INSERT
  WITH CHECK (
    has_role(auth.uid(), 'admin'::user_role) OR 
    has_role(auth.uid(), 'comercial'::user_role) OR 
    has_role(auth.uid(), 'operacional'::user_role)
  );

CREATE POLICY "Admin, comercial, operacional can update fretes"
  ON public.fretes FOR UPDATE
  USING (
    has_role(auth.uid(), 'admin'::user_role) OR 
    has_role(auth.uid(), 'comercial'::user_role) OR 
    has_role(auth.uid(), 'operacional'::user_role)
  );

CREATE POLICY "Only admin can delete fretes"
  ON public.fretes FOR DELETE
  USING (has_role(auth.uid(), 'admin'::user_role));

CREATE TRIGGER update_fretes_updated_at
  BEFORE UPDATE ON public.fretes
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
