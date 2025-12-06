-- Add business_days column to admin_goals table
ALTER TABLE admin_goals 
ADD COLUMN IF NOT EXISTS business_days INTEGER DEFAULT NULL;

COMMENT ON COLUMN admin_goals.business_days IS 'Número de dias úteis configuráveis para o mês (considera feriados)';