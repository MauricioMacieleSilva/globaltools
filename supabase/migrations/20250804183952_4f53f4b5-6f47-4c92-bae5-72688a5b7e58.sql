-- Update the followup_type enum with the new options
ALTER TYPE followup_type RENAME TO followup_type_old;

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

-- Update the budget_followups table to use the new enum
ALTER TABLE budget_followups 
ALTER COLUMN type SET DEFAULT 'reforcar_proposta'::followup_type;

-- Update existing records to map old values to new ones
UPDATE budget_followups SET type = 'reforcar_proposta'::followup_type WHERE type::text = 'reforcar_proposta';
UPDATE budget_followups SET type = 'ligar_followup'::followup_type WHERE type::text = 'ligar_followup';
UPDATE budget_followups SET type = 'enviar_material'::followup_type WHERE type::text = 'enviar_material';
UPDATE budget_followups SET type = 'agendar_reuniao'::followup_type WHERE type::text = 'agendar_reuniao';

-- Convert the column to use the new enum type
ALTER TABLE budget_followups 
ALTER COLUMN type TYPE followup_type USING type::text::followup_type;

-- Drop the old enum type
DROP TYPE followup_type_old;