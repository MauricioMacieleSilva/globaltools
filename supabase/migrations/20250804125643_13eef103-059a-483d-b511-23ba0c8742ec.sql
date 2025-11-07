-- Corrigir políticas RLS para client_budget_ratings para evitar problemas com auth.uid()
-- Simplificar as políticas para ser mais robustas

-- Remover políticas existentes
DROP POLICY IF EXISTS "Users can create budget ratings" ON public.client_budget_ratings;
DROP POLICY IF EXISTS "Users can update own budget ratings" ON public.client_budget_ratings;

-- Criar novas políticas mais simples e robustas
CREATE POLICY "Users can create budget ratings" 
ON public.client_budget_ratings 
FOR INSERT 
TO authenticated
WITH CHECK (auth.uid() IS NOT NULL AND user_id = auth.uid());

CREATE POLICY "Users can update own budget ratings" 
ON public.client_budget_ratings 
FOR UPDATE 
TO authenticated
USING (auth.uid() IS NOT NULL AND user_id = auth.uid())
WITH CHECK (auth.uid() IS NOT NULL AND user_id = auth.uid());

-- Garantir que a coluna user_id não seja nula
ALTER TABLE public.client_budget_ratings 
ALTER COLUMN user_id SET NOT NULL;