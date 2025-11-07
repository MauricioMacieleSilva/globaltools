-- Criar tabela de leads para pré-vendas
CREATE TABLE IF NOT EXISTS public.leads (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  client_code TEXT NOT NULL,
  client_name TEXT NOT NULL,
  contact_name TEXT,
  contact_phone TEXT,
  contact_email TEXT,
  status TEXT NOT NULL DEFAULT 'novo' CHECK (status IN ('novo', 'contatado', 'respondeu', 'qualificado', 'encaminhado', 'perdido')),
  source TEXT,
  notes TEXT,
  sdr_id UUID NOT NULL REFERENCES auth.users(id),
  sdr_name TEXT NOT NULL,
  assigned_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_contact_at TIMESTAMPTZ,
  next_contact_at TIMESTAMPTZ,
  converted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Criar tabela de atividades de leads
CREATE TABLE IF NOT EXISTS public.lead_activities (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  lead_id UUID NOT NULL REFERENCES public.leads(id) ON DELETE CASCADE,
  activity_type TEXT NOT NULL CHECK (activity_type IN ('contato_inicial', 'resposta_recebida', 'qualificacao', 'encaminhamento', 'follow_up', 'nota')),
  description TEXT NOT NULL,
  result TEXT,
  next_action TEXT,
  next_contact_date TIMESTAMPTZ,
  sdr_id UUID NOT NULL REFERENCES auth.users(id),
  sdr_name TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Criar tabela de metas de SDR
CREATE TABLE IF NOT EXISTS public.sdr_goals (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  sdr_id UUID NOT NULL REFERENCES auth.users(id),
  month_year TEXT NOT NULL, -- formato: 'YYYY-MM'
  daily_contacts_goal INTEGER NOT NULL DEFAULT 40,
  conversion_goal_percent DECIMAL(5,2) NOT NULL DEFAULT 5.00,
  qualified_leads_goal INTEGER NOT NULL DEFAULT 2,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(sdr_id, month_year)
);

-- Adicionar campo sdr_id à tabela de follow-ups existente
ALTER TABLE public.budget_followups 
ADD COLUMN IF NOT EXISTS sdr_id UUID REFERENCES auth.users(id),
ADD COLUMN IF NOT EXISTS sdr_name TEXT,
ADD COLUMN IF NOT EXISTS lead_id UUID REFERENCES public.leads(id);

-- Atualizar enum de roles para incluir 'sdr'
-- Primeiro verificar se já existe o check constraint para role
DO $$
BEGIN
  -- Remover constraint existente se houver
  ALTER TABLE public.user_profiles DROP CONSTRAINT IF EXISTS user_profiles_role_check;
  
  -- Adicionar novo constraint com 'sdr'
  ALTER TABLE public.user_profiles 
  ADD CONSTRAINT user_profiles_role_check 
  CHECK (role IN ('admin', 'comercial', 'operacional', 'visitante', 'sdr'));
EXCEPTION 
  WHEN OTHERS THEN
    -- Se der erro, apenas adicionar o constraint
    ALTER TABLE public.user_profiles 
    ADD CONSTRAINT user_profiles_role_check 
    CHECK (role IN ('admin', 'comercial', 'operacional', 'visitante', 'sdr'));
END$$;

-- Enable RLS nas novas tabelas
ALTER TABLE public.leads ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lead_activities ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sdr_goals ENABLE ROW LEVEL SECURITY;

-- Policies para leads
CREATE POLICY "SDRs podem ver seus próprios leads" ON public.leads
  FOR SELECT USING (sdr_id = auth.uid());

CREATE POLICY "SDRs podem criar leads" ON public.leads
  FOR INSERT WITH CHECK (sdr_id = auth.uid());

CREATE POLICY "SDRs podem atualizar seus próprios leads" ON public.leads
  FOR UPDATE USING (sdr_id = auth.uid());

CREATE POLICY "Admins podem ver todos os leads" ON public.leads
  FOR ALL USING (get_current_user_role() = 'admin');

CREATE POLICY "Comerciais podem ver todos os leads" ON public.leads
  FOR SELECT USING (get_current_user_role() IN ('admin', 'comercial'));

-- Policies para atividades de leads
CREATE POLICY "SDRs podem ver atividades de seus leads" ON public.lead_activities
  FOR SELECT USING (sdr_id = auth.uid() OR lead_id IN (SELECT id FROM public.leads WHERE sdr_id = auth.uid()));

CREATE POLICY "SDRs podem criar atividades" ON public.lead_activities
  FOR INSERT WITH CHECK (sdr_id = auth.uid());

CREATE POLICY "Admins podem ver todas as atividades" ON public.lead_activities
  FOR ALL USING (get_current_user_role() = 'admin');

CREATE POLICY "Comerciais podem ver todas as atividades" ON public.lead_activities
  FOR SELECT USING (get_current_user_role() IN ('admin', 'comercial'));

-- Policies para metas de SDR
CREATE POLICY "SDRs podem ver suas próprias metas" ON public.sdr_goals
  FOR SELECT USING (sdr_id = auth.uid());

CREATE POLICY "SDRs podem criar suas próprias metas" ON public.sdr_goals
  FOR INSERT WITH CHECK (sdr_id = auth.uid());

CREATE POLICY "SDRs podem atualizar suas próprias metas" ON public.sdr_goals
  FOR UPDATE USING (sdr_id = auth.uid());

CREATE POLICY "Admins podem gerenciar todas as metas" ON public.sdr_goals
  FOR ALL USING (get_current_user_role() = 'admin');

CREATE POLICY "Comerciais podem ver todas as metas" ON public.sdr_goals
  FOR SELECT USING (get_current_user_role() IN ('admin', 'comercial'));

-- Trigger para atualizar updated_at
CREATE TRIGGER update_leads_updated_at
  BEFORE UPDATE ON public.leads
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_sdr_goals_updated_at
  BEFORE UPDATE ON public.sdr_goals
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();