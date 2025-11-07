-- First, add a new column with the new enum type
ALTER TABLE budget_followups ADD COLUMN type_new followup_type;

-- Create the new enum type
DROP TYPE IF EXISTS followup_type CASCADE;
CREATE TYPE followup_type AS ENUM (
  'reativar_cliente',
  'ligar_followup', 
  'enviar_material',
  'reforcar_proposta',
  'ajustar_proposta',
  'agendar_reuniao',
  'agendar_visita',
  'cobrar_retorno',
  'enviar_novo_orcamento',
  'checar_status_decisao',
  'agendar_nova_tentativa',
  'solicitar_documentos',
  'reabrir_negociacao_futura',
  'outro'
);

-- Recreate the new column with the new enum
ALTER TABLE budget_followups DROP COLUMN IF EXISTS type_new;
ALTER TABLE budget_followups ADD COLUMN type_new followup_type DEFAULT 'reforcar_proposta';

-- Map existing values to new enum values
UPDATE budget_followups SET type_new = 'reforcar_proposta'::followup_type WHERE type::text = 'reforcar_proposta';
UPDATE budget_followups SET type_new = 'ligar_followup'::followup_type WHERE type::text = 'ligar_followup';
UPDATE budget_followups SET type_new = 'enviar_material'::followup_type WHERE type::text = 'enviar_material';
UPDATE budget_followups SET type_new = 'agendar_reuniao'::followup_type WHERE type::text = 'agendar_reuniao';

-- Set default for unmapped records
UPDATE budget_followups SET type_new = 'reforcar_proposta'::followup_type WHERE type_new IS NULL;

-- Drop the old column and rename the new one
ALTER TABLE budget_followups DROP COLUMN type;
ALTER TABLE budget_followups RENAME COLUMN type_new TO type;

-- Set the column as NOT NULL
ALTER TABLE budget_followups ALTER COLUMN type SET NOT NULL;