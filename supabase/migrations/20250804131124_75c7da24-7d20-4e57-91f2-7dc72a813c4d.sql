-- Criar tabela para logs de reset de sessão
CREATE TABLE public.admin_session_resets (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  target_user_id UUID NOT NULL,
  target_user_email TEXT NOT NULL,
  performed_by UUID REFERENCES auth.users(id),
  reset_timestamp TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  reason TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Habilitar RLS
ALTER TABLE public.admin_session_resets ENABLE ROW LEVEL SECURITY;

-- Apenas admins podem ver e gerenciar logs de reset
CREATE POLICY "Apenas admins podem ver logs de reset de sessão"
ON public.admin_session_resets
FOR SELECT
USING (get_current_user_role() = 'admin');

CREATE POLICY "Apenas admins podem inserir logs de reset de sessão"
ON public.admin_session_resets
FOR INSERT
WITH CHECK (get_current_user_role() = 'admin');

-- Criar índice para performance
CREATE INDEX idx_admin_session_resets_target_user ON public.admin_session_resets(target_user_id);
CREATE INDEX idx_admin_session_resets_timestamp ON public.admin_session_resets(reset_timestamp);