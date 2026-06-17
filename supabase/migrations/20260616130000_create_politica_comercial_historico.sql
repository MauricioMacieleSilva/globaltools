-- Create table for commercial policy pricing history
CREATE TABLE IF NOT EXISTS public.politica_comercial_historico (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  item_id UUID,
  descricao TEXT NOT NULL,
  classe TEXT NOT NULL,
  preco_anterior NUMERIC(10,2),
  preco_novo NUMERIC(10,2),
  percentual_ajuste NUMERIC(10,2),
  tipo_ajuste TEXT NOT NULL, -- 'CRIACAO', 'AJUSTE', 'EXCLUSAO', 'DELECAO_FISICA'
  usuario_id UUID REFERENCES public.user_profiles(id) ON DELETE SET NULL,
  usuario_nome TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Enable Row Level Security (RLS)
ALTER TABLE public.politica_comercial_historico ENABLE ROW LEVEL SECURITY;

-- Create policies for RLS
CREATE POLICY "Allow read access for all authenticated users"
  ON public.politica_comercial_historico
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Allow insert access for authenticated users"
  ON public.politica_comercial_historico
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() IS NOT NULL);

-- Create trigger function to log price changes automatically
CREATE OR REPLACE FUNCTION public.log_politica_comercial_change()
RETURNS TRIGGER AS $$
DECLARE
  current_user_id UUID;
  current_user_name TEXT;
  tipo_ajuste_val TEXT;
  percentual_val NUMERIC;
BEGIN
  -- Get current authenticated user ID
  current_user_id := auth.uid();
  
  -- Fetch user's full name from profiles if exists
  IF current_user_id IS NOT NULL THEN
    SELECT full_name INTO current_user_name 
    FROM public.user_profiles 
    WHERE id = current_user_id;
  END IF;
  
  -- Handle Insert
  IF (TG_OP = 'INSERT') THEN
    INSERT INTO public.politica_comercial_historico (
      item_id, descricao, classe, preco_anterior, preco_novo, percentual_ajuste, tipo_ajuste, usuario_id, usuario_nome
    ) VALUES (
      NEW.id, NEW.descricao, NEW.classe, NULL, NEW.preco, NULL, 'CRIACAO', current_user_id, current_user_name
    );
    
  -- Handle Update
  ELSIF (TG_OP = 'UPDATE') THEN
    -- Log if price changed, or if the item was deactivated (soft delete)
    IF (OLD.preco <> NEW.preco OR OLD.ativo <> NEW.ativo) THEN
      IF (NEW.ativo = false AND OLD.ativo = true) THEN
        tipo_ajuste_val := 'EXCLUSAO';
        percentual_val := NULL;
      ELSE
        tipo_ajuste_val := 'AJUSTE';
        IF (OLD.preco > 0) THEN
          percentual_val := ROUND(((NEW.preco - OLD.preco) / OLD.preco) * 100, 2);
        ELSE
          percentual_val := NULL;
        END IF;
      END IF;

      INSERT INTO public.politica_comercial_historico (
        item_id, descricao, classe, preco_anterior, preco_novo, percentual_ajuste, tipo_ajuste, usuario_id, usuario_nome
      ) VALUES (
        NEW.id, NEW.descricao, NEW.classe, OLD.preco, NEW.preco, percentual_val, tipo_ajuste_val, current_user_id, current_user_name
      );
    END IF;
    
  -- Handle Delete
  ELSIF (TG_OP = 'DELETE') THEN
    INSERT INTO public.politica_comercial_historico (
      item_id, descricao, classe, preco_anterior, preco_novo, percentual_ajuste, tipo_ajuste, usuario_id, usuario_nome
    ) VALUES (
      OLD.id, OLD.descricao, OLD.classe, OLD.preco, NULL, NULL, 'DELECAO_FISICA', current_user_id, current_user_name
    );
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create the trigger on the items table
DROP TRIGGER IF EXISTS tr_log_politica_comercial_change ON public.politica_comercial_itens;
CREATE TRIGGER tr_log_politica_comercial_change
  AFTER INSERT OR UPDATE OR DELETE ON public.politica_comercial_itens
  FOR EACH ROW
  EXECUTE FUNCTION public.log_politica_comercial_change();
