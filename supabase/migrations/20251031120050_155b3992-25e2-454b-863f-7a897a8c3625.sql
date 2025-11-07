-- Permitir NULL em foreign keys de usuários para preservar histórico ao deletar usuários

-- Tabela leads: permitir sdr_id NULL
ALTER TABLE public.leads 
ALTER COLUMN sdr_id DROP NOT NULL;

-- Tabela lead_activities: permitir sdr_id NULL  
ALTER TABLE public.lead_activities
ALTER COLUMN sdr_id DROP NOT NULL;

-- Tabela sdr_goals: como são metas específicas do usuário, deletamos em cascade
ALTER TABLE public.sdr_goals
DROP CONSTRAINT IF EXISTS sdr_goals_sdr_id_fkey,
ADD CONSTRAINT sdr_goals_sdr_id_fkey 
  FOREIGN KEY (sdr_id) 
  REFERENCES auth.users(id) 
  ON DELETE CASCADE;