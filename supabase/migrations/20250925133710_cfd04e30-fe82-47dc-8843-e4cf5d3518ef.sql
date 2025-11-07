-- Criar tabela para armazenar informações de produção
CREATE TABLE public.production_orders (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  numero_pedido TEXT NOT NULL UNIQUE,
  novo_prazo DATE,
  situacao TEXT CHECK (situacao IN ('aguardando_mp', 'em_producao')),
  updated_by UUID REFERENCES auth.users(id),
  updated_by_name TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Habilitar RLS
ALTER TABLE public.production_orders ENABLE ROW LEVEL SECURITY;

-- Políticas de acesso
CREATE POLICY "Usuários autenticados podem visualizar pedidos de produção" 
ON public.production_orders 
FOR SELECT 
USING (auth.uid() IS NOT NULL);

CREATE POLICY "Usuários autenticados podem inserir pedidos de produção" 
ON public.production_orders 
FOR INSERT 
WITH CHECK (auth.uid() IS NOT NULL AND updated_by = auth.uid());

CREATE POLICY "Usuários autenticados podem atualizar pedidos de produção" 
ON public.production_orders 
FOR UPDATE 
USING (auth.uid() IS NOT NULL)
WITH CHECK (auth.uid() IS NOT NULL AND updated_by = auth.uid());

-- Trigger para atualizar updated_at
CREATE TRIGGER update_production_orders_updated_at
  BEFORE UPDATE ON public.production_orders
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Índice para melhor performance
CREATE INDEX idx_production_orders_numero_pedido ON public.production_orders(numero_pedido);