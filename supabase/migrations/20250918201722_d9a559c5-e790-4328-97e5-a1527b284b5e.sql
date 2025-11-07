-- Criar tabela para armazenar pedidos excluídos dos indicadores
CREATE TABLE public.excluded_orders (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  numero_pedido TEXT NOT NULL UNIQUE,
  numero_nf TEXT,
  motivo TEXT,
  excluded_by UUID NOT NULL,
  excluded_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.excluded_orders ENABLE ROW LEVEL SECURITY;

-- Políticas de segurança
CREATE POLICY "Apenas admins podem gerenciar pedidos excluídos"
ON public.excluded_orders
FOR ALL
USING (get_current_user_role() = 'admin');

-- Função para atualizar updated_at
CREATE OR REPLACE FUNCTION public.update_excluded_orders_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger para atualizar updated_at
CREATE TRIGGER update_excluded_orders_updated_at
  BEFORE UPDATE ON public.excluded_orders
  FOR EACH ROW
  EXECUTE FUNCTION public.update_excluded_orders_updated_at();