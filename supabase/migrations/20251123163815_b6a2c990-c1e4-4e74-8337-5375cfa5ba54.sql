-- Criar tabela para pedidos ocultos na produção
CREATE TABLE IF NOT EXISTS public.hidden_production_orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  numero_pedido TEXT NOT NULL UNIQUE,
  hidden_by UUID REFERENCES public.user_profiles(id),
  hidden_by_name TEXT,
  hidden_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  motivo TEXT
);

-- Habilitar RLS
ALTER TABLE public.hidden_production_orders ENABLE ROW LEVEL SECURITY;

-- Políticas RLS: Todos autenticados podem visualizar
CREATE POLICY "Authenticated users can view hidden orders"
ON public.hidden_production_orders
FOR SELECT
TO authenticated
USING (true);

-- Apenas admins podem inserir/atualizar/deletar
CREATE POLICY "Admins can manage hidden orders"
ON public.hidden_production_orders
FOR ALL
TO authenticated
USING (has_role(auth.uid(), 'admin'))
WITH CHECK (has_role(auth.uid(), 'admin'));

-- Índice para melhor performance
CREATE INDEX IF NOT EXISTS idx_hidden_production_orders_numero_pedido 
ON public.hidden_production_orders(numero_pedido);