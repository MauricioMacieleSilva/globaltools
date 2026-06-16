-- Performance indexes para reduzir carga no Supabase NANO
-- Aplica indices nas colunas mais consultadas

-- Auth/Perfis
CREATE INDEX IF NOT EXISTS idx_user_roles_user_id ON user_roles(user_id);
CREATE INDEX IF NOT EXISTS idx_user_profiles_email ON user_profiles(email);
CREATE INDEX IF NOT EXISTS idx_user_profiles_needs_reset ON user_profiles(needs_password_reset)
  WHERE needs_password_reset = true;

-- CRM - tabelas mais consultadas
CREATE INDEX IF NOT EXISTS idx_leads_status ON leads(status)
  WHERE status IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_leads_user_id ON leads(user_id)
  WHERE user_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_leads_created_at ON leads(created_at DESC);

-- Follow-ups
CREATE INDEX IF NOT EXISTS idx_follow_ups_lead_id ON follow_ups(lead_id);
CREATE INDEX IF NOT EXISTS idx_follow_ups_concluido ON follow_ups(concluido)
  WHERE concluido = false;
CREATE INDEX IF NOT EXISTS idx_follow_ups_user_id ON follow_ups(user_id);
CREATE INDEX IF NOT EXISTS idx_follow_ups_data_agendada ON follow_ups(data_agendada);

-- Visitas CRM
CREATE INDEX IF NOT EXISTS idx_crm_visits_lead_id ON crm_visits(lead_id);

-- Lead activities
CREATE INDEX IF NOT EXISTS idx_lead_activities_lead_id ON lead_activities(lead_id);
CREATE INDEX IF NOT EXISTS idx_lead_activities_created_at ON lead_activities(created_at DESC);

-- Lead dispositions
CREATE INDEX IF NOT EXISTS idx_lead_dispositions_lead_id ON lead_dispositions(lead_id);
