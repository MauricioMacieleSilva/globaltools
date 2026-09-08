-- Fix type mismatch inside create_default_permissions_for_user by explicitly casting enums
-- Also unifies obsolete 'pipeline' and 'prevendas' page keys into 'crm' page key
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
    VALUES (_user_id, 'dashboard', 'view'::public.page_access_type, true);
    RETURN;
  END IF;
  
  -- Operacional: visualizar dashboard, produção, cortes
  IF _role = 'operacional' THEN
    INSERT INTO public.user_permissions (user_id, page_key, access_type, is_active)
    VALUES 
      (_user_id, 'dashboard', 'view'::public.page_access_type, true),
      (_user_id, 'producao', 'view'::public.page_access_type, true),
      (_user_id, 'producao', 'edit'::public.page_access_type, true),
      (_user_id, 'corteblank', 'view'::public.page_access_type, true),
      (_user_id, 'corteblank', 'edit'::public.page_access_type, true),
      (_user_id, 'corteperfil', 'view'::public.page_access_type, true),
      (_user_id, 'corteperfil', 'edit'::public.page_access_type, true);
    RETURN;
  END IF;
  
  -- SDR: visualizar dashboard, crm
  IF _role = 'sdr' THEN
    INSERT INTO public.user_permissions (user_id, page_key, access_type, is_active)
    VALUES 
      (_user_id, 'dashboard', 'view'::public.page_access_type, true),
      (_user_id, 'crm', 'view'::public.page_access_type, true),
      (_user_id, 'crm', 'edit'::public.page_access_type, true);
    RETURN;
  END IF;
  
  -- Comercial: acesso completo às áreas comerciais
  IF _role = 'comercial' THEN
    INSERT INTO public.user_permissions (user_id, page_key, access_type, is_active)
    VALUES 
      (_user_id, 'dashboard', 'view'::public.page_access_type, true),
      (_user_id, 'dashboard', 'edit'::public.page_access_type, true),
      (_user_id, 'crm', 'view'::public.page_access_type, true),
      (_user_id, 'crm', 'edit'::public.page_access_type, true),
      (_user_id, 'clientes', 'view'::public.page_access_type, true),
      (_user_id, 'clientes', 'edit'::public.page_access_type, true),
      (_user_id, 'politica', 'view'::public.page_access_type, true),
      (_user_id, 'politica', 'edit'::public.page_access_type, true);
    RETURN;
  END IF;

  -- Financeiro: acesso ao dashboard
  IF _role = 'financeiro' THEN
    INSERT INTO public.user_permissions (user_id, page_key, access_type, is_active)
    VALUES 
      (_user_id, 'dashboard', 'view'::public.page_access_type, true);
    RETURN;
  END IF;
END;
$$;

-- Migrate existing permissions from 'pipeline' and 'prevendas' keys to 'crm' key
INSERT INTO public.user_permissions (user_id, page_key, access_type, is_active)
SELECT DISTINCT user_id, 'crm', access_type, true
FROM public.user_permissions
WHERE page_key IN ('pipeline', 'prevendas')
ON CONFLICT (user_id, page_key, access_type) DO UPDATE SET is_active = EXCLUDED.is_active;

-- Cleanup obsolete keys
DELETE FROM public.user_permissions WHERE page_key IN ('pipeline', 'prevendas');
