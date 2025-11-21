-- Adicionar coluna para dias personalizados na configuração de relatórios
ALTER TABLE email_reports_config
ADD COLUMN custom_days text[] DEFAULT NULL;

COMMENT ON COLUMN email_reports_config.custom_days IS 'Dias da semana selecionados para envio quando frequency = custom (ex: ["monday", "wednesday", "friday"])';