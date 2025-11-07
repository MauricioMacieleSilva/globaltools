-- Criar tabela para metas de faturamento globais
CREATE TABLE IF NOT EXISTS public.revenue_goals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  month_year TEXT NOT NULL UNIQUE,
  monthly_goal NUMERIC NOT NULL DEFAULT 2000000,
  daily_goal NUMERIC NOT NULL DEFAULT 100000,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Criar índice para performance
CREATE INDEX idx_revenue_goals_month_year ON public.revenue_goals(month_year);

-- Adicionar trigger para atualizar updated_at
CREATE TRIGGER update_revenue_goals_updated_at 
  BEFORE UPDATE ON public.revenue_goals 
  FOR EACH ROW 
  EXECUTE FUNCTION update_updated_at_column();

-- Habilitar RLS
ALTER TABLE public.revenue_goals ENABLE ROW LEVEL SECURITY;

-- RLS Policies: Todos podem ver, apenas admins podem editar
CREATE POLICY "Todos podem ver metas de faturamento"
  ON public.revenue_goals
  FOR SELECT
  USING (true);

CREATE POLICY "Apenas admins podem criar metas de faturamento"
  ON public.revenue_goals
  FOR INSERT
  WITH CHECK (get_current_user_role() = 'admin');

CREATE POLICY "Apenas admins podem atualizar metas de faturamento"
  ON public.revenue_goals
  FOR UPDATE
  USING (get_current_user_role() = 'admin')
  WITH CHECK (get_current_user_role() = 'admin');

-- Inserir metas padrão para o mês atual
INSERT INTO public.revenue_goals (month_year, monthly_goal, daily_goal)
VALUES (
  to_char(CURRENT_DATE, 'YYYY-MM'),
  2000000,
  100000
)
ON CONFLICT (month_year) DO NOTHING;