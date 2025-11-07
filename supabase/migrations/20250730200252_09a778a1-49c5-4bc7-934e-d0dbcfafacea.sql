-- Criar tabela para comentários de orçamentos
CREATE TABLE public.client_budget_comments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  budget_number TEXT NOT NULL,
  comment TEXT NOT NULL,
  user_id UUID NOT NULL,
  user_name TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Criar tabela para classificação por estrelas dos orçamentos
CREATE TABLE public.client_budget_ratings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  budget_number TEXT NOT NULL UNIQUE,
  rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
  user_id UUID NOT NULL,
  user_name TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Habilitar Row Level Security
ALTER TABLE public.client_budget_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.client_budget_ratings ENABLE ROW LEVEL SECURITY;

-- Criar políticas para comentários
CREATE POLICY "Users can view all budget comments" 
ON public.client_budget_comments 
FOR SELECT 
USING (true);

CREATE POLICY "Users can create budget comments" 
ON public.client_budget_comments 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own budget comments" 
ON public.client_budget_comments 
FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Admins can manage all budget comments" 
ON public.client_budget_comments 
FOR ALL 
USING (get_current_user_role() = 'admin');

-- Criar políticas para classificações
CREATE POLICY "Users can view all budget ratings" 
ON public.client_budget_ratings 
FOR SELECT 
USING (true);

CREATE POLICY "Users can create budget ratings" 
ON public.client_budget_ratings 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own budget ratings" 
ON public.client_budget_ratings 
FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Admins can manage all budget ratings" 
ON public.client_budget_ratings 
FOR ALL 
USING (get_current_user_role() = 'admin');

-- Criar trigger para atualizar updated_at
CREATE TRIGGER update_client_budget_comments_updated_at
BEFORE UPDATE ON public.client_budget_comments
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_client_budget_ratings_updated_at
BEFORE UPDATE ON public.client_budget_ratings
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Criar índices para performance
CREATE INDEX idx_client_budget_comments_budget_number ON public.client_budget_comments(budget_number);
CREATE INDEX idx_client_budget_comments_created_at ON public.client_budget_comments(created_at);
CREATE INDEX idx_client_budget_ratings_budget_number ON public.client_budget_ratings(budget_number);