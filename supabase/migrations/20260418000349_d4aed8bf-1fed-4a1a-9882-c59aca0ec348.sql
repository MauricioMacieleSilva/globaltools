-- Adiciona coluna is_definitive na tabela de motivos de perda
ALTER TABLE public.crm_loss_reasons
ADD COLUMN IF NOT EXISTS is_definitive boolean NOT NULL DEFAULT false;

-- Marca como definitivos os motivos que já bloqueiam novo contato
UPDATE public.crm_loss_reasons
SET is_definitive = true
WHERE LOWER(TRIM(name)) IN (
  LOWER('Empresa Fechada/Inativa'),
  LOWER('Lead já é cliente'),
  LOWER('Lead é Concorrente da Global')
);