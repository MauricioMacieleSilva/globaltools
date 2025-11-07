-- Promover Maurício Maciel para admin
UPDATE public.user_profiles 
SET role = 'admin' 
WHERE email = 'mauricio.maciel@globalaco.com.br';

-- Criar função para verificar se usuário é admin (previne recursão RLS)
CREATE OR REPLACE FUNCTION public.get_current_user_role()
RETURNS TEXT AS $$
  SELECT role FROM public.user_profiles WHERE id = auth.uid();
$$ LANGUAGE SQL SECURITY DEFINER STABLE;

-- Atualizar política RLS para admins gerenciarem todos os usuários
DROP POLICY IF EXISTS "Admins can view all profiles" ON public.user_profiles;
CREATE POLICY "Admins can view all profiles" 
ON public.user_profiles 
FOR SELECT 
USING (public.get_current_user_role() = 'admin');

-- Permitir admins atualizarem qualquer perfil
CREATE POLICY "Admins can update all profiles" 
ON public.user_profiles 
FOR UPDATE 
USING (public.get_current_user_role() = 'admin');

-- Permitir admins excluírem perfis
CREATE POLICY "Admins can delete profiles" 
ON public.user_profiles 
FOR DELETE 
USING (public.get_current_user_role() = 'admin');

-- Atualizar políticas de convites para admins
DROP POLICY IF EXISTS "Admins can manage all invitations" ON public.user_invitations;
CREATE POLICY "Admins can manage all invitations" 
ON public.user_invitations 
FOR ALL 
USING (public.get_current_user_role() = 'admin');

-- Permitir admins criarem convites
CREATE POLICY "Admins can create invitations" 
ON public.user_invitations 
FOR INSERT 
WITH CHECK (public.get_current_user_role() = 'admin');