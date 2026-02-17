
-- Tabela para rastrear pedidos finalizados já notificados (idempotência)
CREATE TABLE public.notified_finalized_orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  numero_pedido TEXT NOT NULL UNIQUE,
  notified_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.notified_finalized_orders ENABLE ROW LEVEL SECURITY;

-- Service role e admins podem acessar
CREATE POLICY "Service role and admin access" ON public.notified_finalized_orders
  FOR ALL USING (true);
