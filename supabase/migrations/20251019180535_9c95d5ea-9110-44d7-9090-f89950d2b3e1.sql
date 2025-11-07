-- Criar tabela de notificações proativas da IA
CREATE TABLE IF NOT EXISTS public.ai_notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  type TEXT NOT NULL, -- 'alert', 'warning', 'info', 'opportunity'
  priority TEXT NOT NULL DEFAULT 'medium', -- 'low', 'medium', 'high', 'critical'
  category TEXT NOT NULL, -- 'production', 'leads', 'budgets', 'sales'
  data JSONB,
  is_read BOOLEAN NOT NULL DEFAULT false,
  action_url TEXT,
  action_label TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  read_at TIMESTAMP WITH TIME ZONE,
  expires_at TIMESTAMP WITH TIME ZONE
);

-- Criar índices para performance
CREATE INDEX idx_ai_notifications_user_id ON public.ai_notifications(user_id);
CREATE INDEX idx_ai_notifications_created_at ON public.ai_notifications(created_at DESC);
CREATE INDEX idx_ai_notifications_is_read ON public.ai_notifications(is_read);
CREATE INDEX idx_ai_notifications_priority ON public.ai_notifications(priority);

-- Habilitar RLS
ALTER TABLE public.ai_notifications ENABLE ROW LEVEL SECURITY;

-- Políticas RLS
CREATE POLICY "Usuários podem ver suas próprias notificações"
ON public.ai_notifications
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Sistema pode criar notificações"
ON public.ai_notifications
FOR INSERT
WITH CHECK (true);

CREATE POLICY "Usuários podem marcar suas notificações como lidas"
ON public.ai_notifications
FOR UPDATE
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins podem gerenciar todas as notificações"
ON public.ai_notifications
FOR ALL
USING (get_current_user_role() = 'admin');

-- Função para limpar notificações antigas
CREATE OR REPLACE FUNCTION clean_old_notifications()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  DELETE FROM public.ai_notifications
  WHERE created_at < NOW() - INTERVAL '30 days'
    OR (expires_at IS NOT NULL AND expires_at < NOW());
END;
$$;