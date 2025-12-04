-- Criar tabela para configurar permissões padrão por role
CREATE TABLE public.default_role_permissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  role user_role NOT NULL,
  page_key TEXT NOT NULL,
  access_type access_type NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by UUID REFERENCES auth.users(id),
  UNIQUE(role, page_key, access_type)
);

-- Habilitar RLS
ALTER TABLE public.default_role_permissions ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Admins can manage default permissions" ON public.default_role_permissions
  FOR ALL USING (has_role(auth.uid(), 'admin'::user_role));

CREATE POLICY "Authenticated users can view default permissions" ON public.default_role_permissions
  FOR SELECT USING (true);

-- Trigger para updated_at
CREATE TRIGGER update_default_role_permissions_updated_at
  BEFORE UPDATE ON public.default_role_permissions
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Popular com valores atuais (visitante)
INSERT INTO public.default_role_permissions (role, page_key, access_type) VALUES
  ('visitante', 'dashboard', 'view');

-- Popular com valores atuais (operacional)
INSERT INTO public.default_role_permissions (role, page_key, access_type) VALUES
  ('operacional', 'dashboard', 'view'),
  ('operacional', 'producao', 'view'),
  ('operacional', 'producao', 'edit'),
  ('operacional', 'corteblank', 'view'),
  ('operacional', 'corteblank', 'edit'),
  ('operacional', 'corteperfil', 'view'),
  ('operacional', 'corteperfil', 'edit');

-- Popular com valores atuais (sdr)
INSERT INTO public.default_role_permissions (role, page_key, access_type) VALUES
  ('sdr', 'dashboard', 'view'),
  ('sdr', 'pipeline', 'view'),
  ('sdr', 'pipeline', 'edit'),
  ('sdr', 'prevendas', 'view'),
  ('sdr', 'prevendas', 'edit');

-- Popular com valores atuais (comercial)
INSERT INTO public.default_role_permissions (role, page_key, access_type) VALUES
  ('comercial', 'dashboard', 'view'),
  ('comercial', 'dashboard', 'edit'),
  ('comercial', 'pipeline', 'view'),
  ('comercial', 'pipeline', 'edit'),
  ('comercial', 'prevendas', 'view'),
  ('comercial', 'prevendas', 'edit'),
  ('comercial', 'clientes', 'view'),
  ('comercial', 'clientes', 'edit'),
  ('comercial', 'politica', 'view'),
  ('comercial', 'politica', 'edit');

-- Atualizar função para ler da tabela
CREATE OR REPLACE FUNCTION public.create_default_permissions_for_user(_user_id uuid, _role user_role)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- Limpar permissões existentes do usuário
  DELETE FROM public.user_permissions WHERE user_id = _user_id;
  
  -- Admins não precisam de permissões explícitas
  IF _role = 'admin' THEN
    RETURN;
  END IF;
  
  -- Inserir permissões padrão baseadas na configuração da tabela
  INSERT INTO public.user_permissions (user_id, page_key, access_type, is_active)
  SELECT _user_id, page_key, access_type, true
  FROM public.default_role_permissions
  WHERE role = _role AND is_active = true;
END;
$$;