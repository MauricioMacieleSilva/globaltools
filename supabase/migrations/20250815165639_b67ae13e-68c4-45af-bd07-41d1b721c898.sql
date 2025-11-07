-- Criar tabela para notificações de vendedores
CREATE TABLE public.vendor_notifications (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  vendor_id UUID NOT NULL,
  vendor_name TEXT NOT NULL,
  lead_id UUID NOT NULL,
  lead_client_name TEXT NOT NULL,
  sdr_name TEXT NOT NULL,
  message TEXT NOT NULL,
  is_read BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Habilitar RLS
ALTER TABLE public.vendor_notifications ENABLE ROW LEVEL SECURITY;

-- Políticas RLS para notificações
CREATE POLICY "Vendedores podem ver suas próprias notificações" 
ON public.vendor_notifications 
FOR SELECT 
USING (vendor_id = auth.uid());

CREATE POLICY "Admins podem ver todas as notificações" 
ON public.vendor_notifications 
FOR ALL 
USING (get_current_user_role() = 'admin');

CREATE POLICY "Sistema pode criar notificações" 
ON public.vendor_notifications 
FOR INSERT 
WITH CHECK (true);

CREATE POLICY "Vendedores podem marcar suas notificações como lidas" 
ON public.vendor_notifications 
FOR UPDATE 
USING (vendor_id = auth.uid())
WITH CHECK (vendor_id = auth.uid());

-- Trigger para atualizar updated_at
CREATE TRIGGER update_vendor_notifications_updated_at
BEFORE UPDATE ON public.vendor_notifications
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Adicionar campos necessários na tabela leads para melhor tracking do pipeline
ALTER TABLE public.leads 
ADD COLUMN IF NOT EXISTS assigned_specialist_id UUID,
ADD COLUMN IF NOT EXISTS assigned_specialist_name TEXT;