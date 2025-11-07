-- Criar enum para tipos de páginas do sistema
CREATE TYPE page_access_type AS ENUM ('view', 'edit');

-- Criar tabela para permissões granulares dos usuários
CREATE TABLE public.user_permissions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  page_key TEXT NOT NULL,
  access_type page_access_type NOT NULL DEFAULT 'view',
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_by UUID REFERENCES public.user_profiles(id),
  
  -- Constraint para evitar duplicatas
  UNIQUE(user_id, page_key, access_type)
);

-- Habilitar RLS
ALTER TABLE public.user_permissions ENABLE ROW LEVEL SECURITY;

-- Políticas RLS para user_permissions
CREATE POLICY "Admins podem gerenciar todas as permissões" 
ON public.user_permissions 
FOR ALL 
USING (get_current_user_role() = 'admin');

CREATE POLICY "Usuários podem ver suas próprias permissões" 
ON public.user_permissions 
FOR SELECT 
USING (user_id = auth.uid());

-- Trigger para atualizar updated_at
CREATE TRIGGER update_user_permissions_updated_at
BEFORE UPDATE ON public.user_permissions
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();