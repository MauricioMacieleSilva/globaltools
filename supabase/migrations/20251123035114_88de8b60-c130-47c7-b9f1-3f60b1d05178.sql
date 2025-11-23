-- Create production_orders table to store user edits
CREATE TABLE IF NOT EXISTS public.production_orders (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  numero_pedido TEXT NOT NULL UNIQUE,
  novo_prazo DATE,
  situacao TEXT CHECK (situacao IN ('aguardando_mp', 'em_producao')),
  updated_by UUID REFERENCES auth.users(id),
  updated_by_name TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.production_orders ENABLE ROW LEVEL SECURITY;

-- Policies for authenticated users
CREATE POLICY "Authenticated users can view production orders"
  ON public.production_orders
  FOR SELECT
  USING (true);

CREATE POLICY "Authenticated users can insert production orders"
  ON public.production_orders
  FOR INSERT
  WITH CHECK (auth.uid() = updated_by);

CREATE POLICY "Authenticated users can update production orders"
  ON public.production_orders
  FOR UPDATE
  USING (true)
  WITH CHECK (auth.uid() = updated_by);

-- Create index for faster lookups
CREATE INDEX idx_production_orders_numero_pedido ON public.production_orders(numero_pedido);
CREATE INDEX idx_production_orders_updated_at ON public.production_orders(updated_at DESC);