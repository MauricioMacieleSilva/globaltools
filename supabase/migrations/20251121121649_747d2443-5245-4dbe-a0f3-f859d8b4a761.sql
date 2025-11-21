-- Adicionar campos de meta de faturamento na tabela admin_goals
ALTER TABLE admin_goals 
ADD COLUMN IF NOT EXISTS monthly_revenue_goal numeric,
ADD COLUMN IF NOT EXISTS daily_revenue_goal numeric;

-- Criar índice para otimizar consultas por mês/ano
CREATE INDEX IF NOT EXISTS idx_admin_goals_month_year ON admin_goals(month_year);