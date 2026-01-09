-- Criar tabela de movimentações de estoque
CREATE TABLE public.estoque_movimentacoes (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  item_id UUID REFERENCES public.estoque_itens(id) ON DELETE SET NULL,
  tipo_movimentacao TEXT NOT NULL CHECK (tipo_movimentacao IN ('ENTRADA', 'SAIDA', 'AJUSTE', 'CRIACAO', 'EDICAO')),
  quantidade_anterior NUMERIC,
  quantidade_nova NUMERIC,
  quantidade_movimentada NUMERIC,
  motivo TEXT,
  observacao TEXT,
  usuario_id UUID REFERENCES auth.users(id),
  usuario_nome TEXT,
  item_descricao TEXT,
  item_categoria TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Índices para performance
CREATE INDEX idx_estoque_mov_item_id ON estoque_movimentacoes(item_id);
CREATE INDEX idx_estoque_mov_created_at ON estoque_movimentacoes(created_at DESC);

-- RLS
ALTER TABLE estoque_movimentacoes ENABLE ROW LEVEL SECURITY;

-- Todos autenticados podem ver
CREATE POLICY "Authenticated users can view movimentacoes" ON estoque_movimentacoes
  FOR SELECT TO authenticated USING (true);

-- Apenas quem pode editar estoque pode inserir movimentações
CREATE POLICY "Users with estoque edit can insert movimentacoes" ON estoque_movimentacoes
  FOR INSERT TO authenticated
  WITH CHECK (
    public.has_role(auth.uid(), 'admin') OR 
    public.has_role(auth.uid(), 'comercial') OR 
    public.has_role(auth.uid(), 'operacional')
  );

-- Remover política existente de estoque_itens
DROP POLICY IF EXISTS "Admin, comercial and operacional can manage estoque" ON estoque_itens;

-- INSERT: admin, comercial, operacional
CREATE POLICY "Users with edit permission can insert estoque" ON estoque_itens
  FOR INSERT TO authenticated
  WITH CHECK (
    public.has_role(auth.uid(), 'admin') OR 
    public.has_role(auth.uid(), 'comercial') OR 
    public.has_role(auth.uid(), 'operacional')
  );

-- UPDATE: admin, comercial, operacional  
CREATE POLICY "Users with edit permission can update estoque" ON estoque_itens
  FOR UPDATE TO authenticated
  USING (
    public.has_role(auth.uid(), 'admin') OR 
    public.has_role(auth.uid(), 'comercial') OR 
    public.has_role(auth.uid(), 'operacional')
  )
  WITH CHECK (
    public.has_role(auth.uid(), 'admin') OR 
    public.has_role(auth.uid(), 'comercial') OR 
    public.has_role(auth.uid(), 'operacional')
  );

-- DELETE: apenas admin
CREATE POLICY "Only admin can delete estoque items" ON estoque_itens
  FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- Trigger para registrar movimentações automaticamente
CREATE OR REPLACE FUNCTION registrar_movimentacao_estoque()
RETURNS TRIGGER AS $$
DECLARE
  tipo_mov TEXT;
  usuario_nome_var TEXT;
BEGIN
  -- Buscar nome do usuário
  SELECT full_name INTO usuario_nome_var 
  FROM user_profiles 
  WHERE id = auth.uid();
  
  IF TG_OP = 'INSERT' THEN
    INSERT INTO estoque_movimentacoes (
      item_id, tipo_movimentacao, quantidade_anterior, quantidade_nova,
      quantidade_movimentada, usuario_id, usuario_nome,
      item_descricao, item_categoria
    ) VALUES (
      NEW.id, 'CRIACAO', 0, NEW.quantidade,
      NEW.quantidade, auth.uid(), usuario_nome_var,
      NEW.descricao, NEW.categoria
    );
    RETURN NEW;
    
  ELSIF TG_OP = 'UPDATE' THEN
    -- Verificar se quantidade mudou
    IF OLD.quantidade != NEW.quantidade THEN
      IF NEW.quantidade > OLD.quantidade THEN
        tipo_mov := 'ENTRADA';
      ELSIF NEW.quantidade < OLD.quantidade THEN
        tipo_mov := 'SAIDA';
      END IF;
      
      INSERT INTO estoque_movimentacoes (
        item_id, tipo_movimentacao, quantidade_anterior, quantidade_nova,
        quantidade_movimentada, usuario_id, usuario_nome,
        item_descricao, item_categoria
      ) VALUES (
        NEW.id, tipo_mov, OLD.quantidade, NEW.quantidade,
        ABS(NEW.quantidade - OLD.quantidade), auth.uid(), usuario_nome_var,
        NEW.descricao, NEW.categoria
      );
    ELSE
      -- Se não mudou quantidade mas mudou outros campos
      INSERT INTO estoque_movimentacoes (
        item_id, tipo_movimentacao, quantidade_anterior, quantidade_nova,
        quantidade_movimentada, usuario_id, usuario_nome,
        item_descricao, item_categoria, observacao
      ) VALUES (
        NEW.id, 'EDICAO', OLD.quantidade, NEW.quantidade,
        0, auth.uid(), usuario_nome_var,
        NEW.descricao, NEW.categoria, 'Alteração de dados do item'
      );
    END IF;
    RETURN NEW;
  END IF;
  
  RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER trigger_estoque_movimentacao
  AFTER INSERT OR UPDATE ON estoque_itens
  FOR EACH ROW
  EXECUTE FUNCTION registrar_movimentacao_estoque();