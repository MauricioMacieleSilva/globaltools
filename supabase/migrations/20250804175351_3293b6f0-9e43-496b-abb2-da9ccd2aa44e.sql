-- First remove the default constraint
ALTER TABLE public.budget_followups ALTER COLUMN type DROP DEFAULT;

-- Update the followup_type enum with new options
ALTER TYPE followup_type RENAME TO followup_type_old;

CREATE TYPE followup_type AS ENUM (
  'reforcar_proposta',
  'enviar_nova_proposta', 
  'enviar_material_apoio',
  'confirmar_recebimento',
  'reuniao_apresentacao',
  'visita_tecnica',
  'solicitar_documentacao',
  'reabrir_negociacao'
);

-- Add new columns to budget_followups table
ALTER TABLE public.budget_followups 
ADD COLUMN client_name TEXT,
ADD COLUMN client_code TEXT,
ALTER COLUMN budget_number DROP NOT NULL;

-- Update existing records to use new enum values (mapping old to new)
ALTER TABLE public.budget_followups 
ALTER COLUMN type TYPE followup_type USING 
  CASE 
    WHEN type::text = 'lembrar' THEN 'reforcar_proposta'::followup_type
    WHEN type::text = 'reuniao' THEN 'reuniao_apresentacao'::followup_type 
    WHEN type::text = 'cobrar' THEN 'confirmar_recebimento'::followup_type
    WHEN type::text = 'outros' THEN 'enviar_material_apoio'::followup_type
    ELSE 'reforcar_proposta'::followup_type
  END;

-- Set new default
ALTER TABLE public.budget_followups ALTER COLUMN type SET DEFAULT 'reforcar_proposta'::followup_type;

-- Drop the old enum type
DROP TYPE followup_type_old;