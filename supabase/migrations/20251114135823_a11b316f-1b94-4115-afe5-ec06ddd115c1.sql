-- Corrigir search_path da função para security
CREATE OR REPLACE FUNCTION sync_leads_client_name()
RETURNS TRIGGER 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  NEW.client_name = NEW.cliente_nome;
  RETURN NEW;
END;
$$;