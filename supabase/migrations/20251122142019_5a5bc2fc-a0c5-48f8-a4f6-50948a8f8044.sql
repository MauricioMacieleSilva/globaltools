-- Função para criar permissões padrão baseadas na role do usuário
CREATE OR REPLACE FUNCTION public.create_default_permissions_for_user(
  _user_id uuid,
  _role user_role
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Limpar permissões existentes do usuário (caso existam)
  DELETE FROM public.user_permissions WHERE user_id = _user_id;
  
  -- Admins não precisam de permissões explícitas
  IF _role = 'admin' THEN
    RETURN;
  END IF;
  
  -- Visitante: apenas visualizar dashboard
  IF _role = 'visitante' THEN
    INSERT INTO public.user_permissions (user_id, page_key, access_type, is_active)
    VALUES (_user_id, 'dashboard', 'view', true);
    RETURN;
  END IF;
  
  -- Operacional: visualizar dashboard, produção, cortes
  IF _role = 'operacional' THEN
    INSERT INTO public.user_permissions (user_id, page_key, access_type, is_active)
    VALUES 
      (_user_id, 'dashboard', 'view', true),
      (_user_id, 'producao', 'view', true),
      (_user_id, 'producao', 'edit', true),
      (_user_id, 'corteblank', 'view', true),
      (_user_id, 'corteblank', 'edit', true),
      (_user_id, 'corteperfil', 'view', true),
      (_user_id, 'corteperfil', 'edit', true);
    RETURN;
  END IF;
  
  -- SDR: visualizar dashboard, pipeline e pré-vendas
  IF _role = 'sdr' THEN
    INSERT INTO public.user_permissions (user_id, page_key, access_type, is_active)
    VALUES 
      (_user_id, 'dashboard', 'view', true),
      (_user_id, 'pipeline', 'view', true),
      (_user_id, 'pipeline', 'edit', true),
      (_user_id, 'prevendas', 'view', true),
      (_user_id, 'prevendas', 'edit', true);
    RETURN;
  END IF;
  
  -- Comercial: acesso completo às áreas comerciais
  IF _role = 'comercial' THEN
    INSERT INTO public.user_permissions (user_id, page_key, access_type, is_active)
    VALUES 
      (_user_id, 'dashboard', 'view', true),
      (_user_id, 'dashboard', 'edit', true),
      (_user_id, 'pipeline', 'view', true),
      (_user_id, 'pipeline', 'edit', true),
      (_user_id, 'prevendas', 'view', true),
      (_user_id, 'prevendas', 'edit', true),
      (_user_id, 'clientes', 'view', true),
      (_user_id, 'clientes', 'edit', true),
      (_user_id, 'politica', 'view', true),
      (_user_id, 'politica', 'edit', true);
    RETURN;
  END IF;
END;
$$;

-- Trigger para criar permissões automáticas quando uma role é atribuída
CREATE OR REPLACE FUNCTION public.handle_user_role_created()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Criar permissões padrão para o novo usuário baseadas na role
  PERFORM public.create_default_permissions_for_user(NEW.user_id, NEW.role);
  RETURN NEW;
END;
$$;

-- Criar o trigger se não existir
DROP TRIGGER IF EXISTS on_user_role_created ON public.user_roles;
CREATE TRIGGER on_user_role_created
  AFTER INSERT ON public.user_roles
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_user_role_created();

-- Popular permissões para usuários existentes baseadas em suas roles atuais
DO $$
DECLARE
  user_record RECORD;
BEGIN
  FOR user_record IN 
    SELECT user_id, role 
    FROM public.user_roles 
    WHERE role != 'admin'
  LOOP
    PERFORM public.create_default_permissions_for_user(user_record.user_id, user_record.role);
  END LOOP;
END $$;