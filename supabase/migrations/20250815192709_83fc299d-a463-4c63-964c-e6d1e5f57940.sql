
-- Permitir que usuários autenticados vejam perfis do departamento Comercial
CREATE POLICY "Authenticated can view Comercial department profiles"
ON public.user_profiles
FOR SELECT
TO authenticated
USING (
  department IS NOT NULL
  AND lower(department) LIKE 'comercial%'
);
