-- Remover a política atual que impede usuários não-admin de ver pedidos excluídos
DROP POLICY IF EXISTS "Apenas admins podem gerenciar pedidos excluídos" ON public.excluded_orders;

-- Criar políticas separadas: todos podem ver, apenas admins podem gerenciar
CREATE POLICY "Todos podem ver pedidos excluídos" 
ON public.excluded_orders 
FOR SELECT 
USING (true);

CREATE POLICY "Apenas admins podem gerenciar pedidos excluídos" 
ON public.excluded_orders 
FOR ALL 
USING (get_current_user_role() = 'admin'::text)
WITH CHECK (get_current_user_role() = 'admin'::text);