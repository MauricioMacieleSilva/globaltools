-- Adicionar campos à tabela leads para controle de conversa e tentativas
ALTER TABLE public.leads 
ADD COLUMN conversation_started boolean DEFAULT false,
ADD COLUMN contact_attempts integer DEFAULT 0,
ADD COLUMN contacted_count integer DEFAULT 0;

-- Adicionar campo à tabela lead_activities para registro de conversa iniciada
ALTER TABLE public.lead_activities 
ADD COLUMN conversation_started boolean DEFAULT null;

-- Criar tabela para metas administrativas
CREATE TABLE public.admin_goals (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  month_year text NOT NULL,
  daily_contacts_goal integer DEFAULT 40,
  monthly_contacts_goal integer DEFAULT 1200,
  qualified_leads_goal integer DEFAULT 30,
  forwarded_leads_goal integer DEFAULT 25,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  created_by uuid REFERENCES auth.users(id)
);

-- Enable Row Level Security
ALTER TABLE public.admin_goals ENABLE ROW LEVEL SECURITY;

-- Create policies for admin_goals
CREATE POLICY "Admins can manage all goals" 
ON public.admin_goals 
FOR ALL
USING (get_current_user_role() = 'admin');

CREATE POLICY "Users can view goals" 
ON public.admin_goals 
FOR SELECT 
USING (true);

-- Create trigger for automatic timestamp updates on admin_goals
CREATE TRIGGER update_admin_goals_updated_at
BEFORE UPDATE ON public.admin_goals
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();