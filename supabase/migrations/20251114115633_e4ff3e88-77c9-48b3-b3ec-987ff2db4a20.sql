-- Adicionar colunas faltantes nas tabelas existentes para compatibilidade

-- Tabela admin_goals: adicionar colunas faltantes no código
ALTER TABLE admin_goals ADD COLUMN IF NOT EXISTS forwarded_leads_goal integer;
ALTER TABLE admin_goals ADD COLUMN IF NOT EXISTS conversion_goal_percent numeric;

-- Tabela lead_activities: adicionar colunas que o código espera
ALTER TABLE lead_activities ADD COLUMN IF NOT EXISTS next_contact_date timestamp with time zone;
ALTER TABLE lead_activities ADD COLUMN IF NOT EXISTS conversation_started boolean DEFAULT false;
ALTER TABLE lead_activities ADD COLUMN IF NOT EXISTS sdr_name text;
ALTER TABLE lead_activities ADD COLUMN IF NOT EXISTS sdr_id uuid;

-- Tabela lead_dispositions: adicionar colunas que o código espera  
ALTER TABLE lead_dispositions ADD COLUMN IF NOT EXISTS lead_client_name text;
ALTER TABLE lead_dispositions ADD COLUMN IF NOT EXISTS lead_client_code text;
ALTER TABLE lead_dispositions ADD COLUMN IF NOT EXISTS custom_reason text;
ALTER TABLE lead_dispositions ADD COLUMN IF NOT EXISTS disposed_by uuid;
ALTER TABLE lead_dispositions ADD COLUMN IF NOT EXISTS disposed_by_name text;

-- Tabela knowledge_articles: adicionar colunas em inglês como computed columns
ALTER TABLE knowledge_articles ADD COLUMN IF NOT EXISTS title text GENERATED ALWAYS AS (titulo) STORED;
ALTER TABLE knowledge_articles ADD COLUMN IF NOT EXISTS content text GENERATED ALWAYS AS (conteudo) STORED;
ALTER TABLE knowledge_articles ADD COLUMN IF NOT EXISTS summary text;
ALTER TABLE knowledge_articles ADD COLUMN IF NOT EXISTS keywords text[];
ALTER TABLE knowledge_articles ADD COLUMN IF NOT EXISTS search_terms text[];
ALTER TABLE knowledge_articles ADD COLUMN IF NOT EXISTS difficulty_level text DEFAULT 'beginner';
ALTER TABLE knowledge_articles ADD COLUMN IF NOT EXISTS article_type text DEFAULT 'general';
ALTER TABLE knowledge_articles ADD COLUMN IF NOT EXISTS is_published boolean GENERATED ALWAYS AS (ativo) STORED;
ALTER TABLE knowledge_articles ADD COLUMN IF NOT EXISTS is_featured boolean DEFAULT false;
ALTER TABLE knowledge_articles ADD COLUMN IF NOT EXISTS priority integer DEFAULT 0;
ALTER TABLE knowledge_articles ADD COLUMN IF NOT EXISTS view_count integer GENERATED ALWAYS AS (views) STORED;
ALTER TABLE knowledge_articles ADD COLUMN IF NOT EXISTS helpful_count integer DEFAULT 0;
ALTER TABLE knowledge_articles ADD COLUMN IF NOT EXISTS unhelpful_count integer DEFAULT 0;

-- Tabela knowledge_categories: adicionar colunas em inglês  
ALTER TABLE knowledge_categories ADD COLUMN IF NOT EXISTS name text GENERATED ALWAYS AS (nome) STORED;
ALTER TABLE knowledge_categories ADD COLUMN IF NOT EXISTS description text GENERATED ALWAYS AS (descricao) STORED;
ALTER TABLE knowledge_categories ADD COLUMN IF NOT EXISTS icon text GENERATED ALWAYS AS (icone) STORED;
ALTER TABLE knowledge_categories ADD COLUMN IF NOT EXISTS display_order integer GENERATED ALWAYS AS (ordem) STORED;
ALTER TABLE knowledge_categories ADD COLUMN IF NOT EXISTS is_active boolean GENERATED ALWAYS AS (ativo) STORED;
ALTER TABLE knowledge_categories ADD COLUMN IF NOT EXISTS color text DEFAULT '#3B82F6';

-- Criar view para leads com alias de colunas em inglês
CREATE OR REPLACE VIEW leads_view AS
SELECT 
  id,
  cliente_nome as client_name,
  cliente_cnpj,
  cliente_telefone,
  cliente_email,
  contact_name,
  contact_phone,
  contact_email,
  client_code,
  numero_lead,
  origem as source,
  produto_interesse,
  valor_estimado,
  status,
  data_abertura,
  data_fechamento,
  observacoes as notes,
  temperatura,
  qualificacao_score,
  vendedor_id,
  especialista_id,
  empresa,
  budget_number,
  created_at,
  updated_at
FROM leads;