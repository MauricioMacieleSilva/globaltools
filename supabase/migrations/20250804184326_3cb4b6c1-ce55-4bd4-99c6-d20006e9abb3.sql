-- Add the new enum values to the existing enum
ALTER TYPE followup_type ADD VALUE 'reativar_cliente';
ALTER TYPE followup_type ADD VALUE 'ligar_followup';
ALTER TYPE followup_type ADD VALUE 'enviar_material';
ALTER TYPE followup_type ADD VALUE 'ajustar_proposta';
ALTER TYPE followup_type ADD VALUE 'agendar_reuniao';
ALTER TYPE followup_type ADD VALUE 'agendar_visita';
ALTER TYPE followup_type ADD VALUE 'cobrar_retorno';
ALTER TYPE followup_type ADD VALUE 'enviar_novo_orcamento';
ALTER TYPE followup_type ADD VALUE 'checar_status_decisao';
ALTER TYPE followup_type ADD VALUE 'agendar_nova_tentativa';
ALTER TYPE followup_type ADD VALUE 'solicitar_documentos';
ALTER TYPE followup_type ADD VALUE 'reabrir_negociacao_futura';
ALTER TYPE followup_type ADD VALUE 'outro';

-- Add a new column for custom text when "outro" is selected
ALTER TABLE budget_followups ADD COLUMN custom_type_text text;