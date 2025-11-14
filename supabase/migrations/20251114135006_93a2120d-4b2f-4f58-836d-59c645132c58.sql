-- Remover a view com security definer e adicionar RLS policies apropriadas
DROP VIEW IF EXISTS leads_view;

-- Não vamos usar view, vamos adicionar coluna alias diretamente
-- Como generated columns não podem ser escritas, vamos usar triggers

-- Adicionar coluna client_name (não generated)
ALTER TABLE leads ADD COLUMN IF NOT EXISTS client_name text;

-- Trigger para sincronizar cliente_nome -> client_name  
CREATE OR REPLACE FUNCTION sync_leads_client_name()
RETURNS TRIGGER AS $$
BEGIN
  NEW.client_name = NEW.cliente_nome;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER sync_leads_client_name_trigger
  BEFORE INSERT OR UPDATE ON leads
  FOR EACH ROW
  EXECUTE FUNCTION sync_leads_client_name();

-- Popular coluna para registros existentes
UPDATE leads SET client_name = cliente_nome WHERE client_name IS NULL;

-- Adicionar observacoes como alias de notes
ALTER TABLE leads RENAME COLUMN observacoes TO notes;
ALTER TABLE leads ADD COLUMN observacoes text GENERATED ALWAYS AS (notes) STORED;

-- Adicionar origem como alias de source  
ALTER TABLE leads RENAME COLUMN origem TO source;
ALTER TABLE leads ADD COLUMN origem text GENERATED ALWAYS AS (source) STORED;