-- Criar sistema de conhecimento interno para o Zé da Global

-- Tabela de categorias do conhecimento
CREATE TABLE IF NOT EXISTS public.knowledge_categories (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  description TEXT,
  icon TEXT,
  color TEXT DEFAULT '#3B82F6',
  parent_id UUID REFERENCES public.knowledge_categories(id),
  display_order INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES public.user_profiles(id)
);

-- Tabela de tags para organização
CREATE TABLE IF NOT EXISTS public.knowledge_tags (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  description TEXT,
  usage_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES public.user_profiles(id)
);

-- Tabela principal de artigos de conhecimento
CREATE TABLE IF NOT EXISTS public.knowledge_articles (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  summary TEXT,
  category_id UUID REFERENCES public.knowledge_categories(id),
  keywords TEXT[] DEFAULT '{}',
  search_terms TEXT[] DEFAULT '{}',
  difficulty_level TEXT DEFAULT 'beginner' CHECK (difficulty_level IN ('beginner', 'intermediate', 'advanced')),
  article_type TEXT DEFAULT 'general' CHECK (article_type IN ('general', 'faq', 'tutorial', 'calculation', 'policy', 'process')),
  priority INTEGER DEFAULT 0,
  view_count INTEGER DEFAULT 0,
  helpful_count INTEGER DEFAULT 0,
  unhelpful_count INTEGER DEFAULT 0,
  is_published BOOLEAN DEFAULT false,
  is_featured BOOLEAN DEFAULT false,
  expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES public.user_profiles(id),
  updated_by UUID REFERENCES public.user_profiles(id)
);

-- Tabela de relacionamento entre artigos e tags
CREATE TABLE IF NOT EXISTS public.knowledge_article_tags (
  article_id UUID REFERENCES public.knowledge_articles(id) ON DELETE CASCADE,
  tag_id UUID REFERENCES public.knowledge_tags(id) ON DELETE CASCADE,
  PRIMARY KEY (article_id, tag_id)
);

-- Tabela de termos de busca e sinônimos
CREATE TABLE IF NOT EXISTS public.knowledge_search_terms (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  term TEXT NOT NULL,
  synonyms TEXT[] DEFAULT '{}',
  article_id UUID REFERENCES public.knowledge_articles(id) ON DELETE CASCADE,
  weight DECIMAL DEFAULT 1.0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Tabela de conversas do chat
CREATE TABLE IF NOT EXISTS public.chat_conversations (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES public.user_profiles(id),
  session_id TEXT NOT NULL,
  message TEXT NOT NULL,
  response TEXT,
  response_type TEXT DEFAULT 'knowledge' CHECK (response_type IN ('knowledge', 'calculation', 'general', 'no_answer')),
  articles_used UUID[] DEFAULT '{}',
  search_query TEXT,
  response_time_ms INTEGER,
  was_helpful BOOLEAN,
  feedback_text TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Tabela de feedback sobre o conhecimento
CREATE TABLE IF NOT EXISTS public.knowledge_feedback (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  article_id UUID REFERENCES public.knowledge_articles(id) ON DELETE CASCADE,
  user_id UUID REFERENCES public.user_profiles(id),
  rating INTEGER CHECK (rating BETWEEN 1 AND 5),
  feedback_type TEXT DEFAULT 'general' CHECK (feedback_type IN ('accuracy', 'clarity', 'completeness', 'usefulness', 'general')),
  comment TEXT,
  is_suggestion BOOLEAN DEFAULT false,
  suggested_improvement TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Tabela de templates de resposta
CREATE TABLE IF NOT EXISTS public.knowledge_response_templates (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  template TEXT NOT NULL,
  placeholders TEXT[] DEFAULT '{}',
  category_id UUID REFERENCES public.knowledge_categories(id),
  usage_count INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES public.user_profiles(id)
);

-- Enable RLS em todas as tabelas
ALTER TABLE public.knowledge_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.knowledge_tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.knowledge_articles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.knowledge_article_tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.knowledge_search_terms ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.knowledge_feedback ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.knowledge_response_templates ENABLE ROW LEVEL SECURITY;

-- Políticas RLS - Visualização pública para conhecimento publicado
CREATE POLICY "Published articles are viewable by all" ON public.knowledge_articles
  FOR SELECT USING (is_published = true);

CREATE POLICY "Categories are viewable by all" ON public.knowledge_categories
  FOR SELECT USING (is_active = true);

CREATE POLICY "Tags are viewable by all" ON public.knowledge_tags
  FOR SELECT USING (true);

CREATE POLICY "Article tags are viewable by all" ON public.knowledge_article_tags
  FOR SELECT USING (true);

CREATE POLICY "Search terms are viewable by all" ON public.knowledge_search_terms
  FOR SELECT USING (true);

CREATE POLICY "Response templates are viewable by all" ON public.knowledge_response_templates
  FOR SELECT USING (is_active = true);

-- Políticas para administradores - controle total
CREATE POLICY "Admins can manage categories" ON public.knowledge_categories
  FOR ALL USING (get_current_user_role() = 'admin');

CREATE POLICY "Admins can manage tags" ON public.knowledge_tags
  FOR ALL USING (get_current_user_role() = 'admin');

CREATE POLICY "Admins can manage articles" ON public.knowledge_articles
  FOR ALL USING (get_current_user_role() = 'admin');

CREATE POLICY "Admins can manage article tags" ON public.knowledge_article_tags
  FOR ALL USING (get_current_user_role() = 'admin');

CREATE POLICY "Admins can manage search terms" ON public.knowledge_search_terms
  FOR ALL USING (get_current_user_role() = 'admin');

CREATE POLICY "Admins can view all conversations" ON public.chat_conversations
  FOR SELECT USING (get_current_user_role() = 'admin');

CREATE POLICY "Admins can view all feedback" ON public.knowledge_feedback
  FOR SELECT USING (get_current_user_role() = 'admin');

CREATE POLICY "Admins can manage templates" ON public.knowledge_response_templates
  FOR ALL USING (get_current_user_role() = 'admin');

-- Políticas para usuários - suas próprias conversas e feedback
CREATE POLICY "Users can view own conversations" ON public.chat_conversations
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Users can create conversations" ON public.chat_conversations
  FOR INSERT WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can create feedback" ON public.knowledge_feedback
  FOR INSERT WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can view own feedback" ON public.knowledge_feedback
  FOR SELECT USING (user_id = auth.uid());

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_knowledge_articles_category ON public.knowledge_articles(category_id);
CREATE INDEX IF NOT EXISTS idx_knowledge_articles_published ON public.knowledge_articles(is_published);
CREATE INDEX IF NOT EXISTS idx_knowledge_articles_featured ON public.knowledge_articles(is_featured);
CREATE INDEX IF NOT EXISTS idx_knowledge_articles_keywords ON public.knowledge_articles USING GIN(keywords);
CREATE INDEX IF NOT EXISTS idx_knowledge_articles_search_terms ON public.knowledge_articles USING GIN(search_terms);
CREATE INDEX IF NOT EXISTS idx_knowledge_search_terms_term ON public.knowledge_search_terms(term);
CREATE INDEX IF NOT EXISTS idx_knowledge_search_terms_synonyms ON public.knowledge_search_terms USING GIN(synonyms);
CREATE INDEX IF NOT EXISTS idx_chat_conversations_session ON public.chat_conversations(session_id);
CREATE INDEX IF NOT EXISTS idx_chat_conversations_user ON public.chat_conversations(user_id);
CREATE INDEX IF NOT EXISTS idx_knowledge_feedback_article ON public.knowledge_feedback(article_id);

-- Trigger para atualizar updated_at
CREATE TRIGGER update_knowledge_categories_updated_at
  BEFORE UPDATE ON public.knowledge_categories
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_knowledge_articles_updated_at
  BEFORE UPDATE ON public.knowledge_articles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Função para busca inteligente de conhecimento
CREATE OR REPLACE FUNCTION public.search_knowledge(
  search_query TEXT,
  category_filter UUID DEFAULT NULL,
  limit_results INTEGER DEFAULT 10
)
RETURNS TABLE (
  article_id UUID,
  title TEXT,
  summary TEXT,
  content TEXT,
  category_name TEXT,
  tags TEXT[],
  relevance_score DECIMAL
) AS $$
BEGIN
  RETURN QUERY
  WITH search_results AS (
    SELECT 
      a.id,
      a.title,
      a.summary,
      a.content,
      c.name as category_name,
      ARRAY_AGG(DISTINCT t.name) FILTER (WHERE t.name IS NOT NULL) as tags,
      (
        -- Peso para título
        CASE WHEN UPPER(a.title) LIKE UPPER('%' || search_query || '%') THEN 3.0 ELSE 0.0 END +
        -- Peso para palavras-chave
        CASE WHEN search_query = ANY(a.keywords) THEN 2.5 ELSE 0.0 END +
        -- Peso para termos de busca
        CASE WHEN search_query = ANY(a.search_terms) THEN 2.0 ELSE 0.0 END +
        -- Peso para conteúdo
        CASE WHEN UPPER(a.content) LIKE UPPER('%' || search_query || '%') THEN 1.0 ELSE 0.0 END +
        -- Peso para sinônimos
        CASE WHEN EXISTS(
          SELECT 1 FROM public.knowledge_search_terms st 
          WHERE st.article_id = a.id 
          AND search_query = ANY(st.synonyms)
        ) THEN 1.5 ELSE 0.0 END +
        -- Boost para artigos em destaque
        CASE WHEN a.is_featured THEN 0.5 ELSE 0.0 END +
        -- Boost baseado em popularidade
        (a.helpful_count::DECIMAL / GREATEST(a.helpful_count + a.unhelpful_count, 1)) * 0.3
      ) as relevance_score
    FROM public.knowledge_articles a
    LEFT JOIN public.knowledge_categories c ON a.category_id = c.id
    LEFT JOIN public.knowledge_article_tags at ON a.id = at.article_id
    LEFT JOIN public.knowledge_tags t ON at.tag_id = t.id
    WHERE a.is_published = true
      AND (category_filter IS NULL OR a.category_id = category_filter)
      AND (
        UPPER(a.title) LIKE UPPER('%' || search_query || '%') OR
        UPPER(a.content) LIKE UPPER('%' || search_query || '%') OR
        search_query = ANY(a.keywords) OR
        search_query = ANY(a.search_terms) OR
        EXISTS(
          SELECT 1 FROM public.knowledge_search_terms st 
          WHERE st.article_id = a.id 
          AND search_query = ANY(st.synonyms)
        )
      )
    GROUP BY a.id, a.title, a.summary, a.content, c.name, a.keywords, a.search_terms, a.is_featured, a.helpful_count, a.unhelpful_count
  )
  SELECT 
    sr.id,
    sr.title,
    sr.summary,
    sr.content,
    sr.category_name,
    sr.tags,
    sr.relevance_score
  FROM search_results sr
  WHERE sr.relevance_score > 0
  ORDER BY sr.relevance_score DESC, sr.title
  LIMIT limit_results;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Inserir dados iniciais
INSERT INTO public.knowledge_categories (name, description, icon, color) VALUES
('Produtos', 'Informações sobre produtos da Global Aço', 'Package', '#3B82F6'),
('Processos', 'Processos de fabricação e corte', 'Cog', '#10B981'),
('Cálculos', 'Fórmulas e cálculos técnicos', 'Calculator', '#F59E0B'),
('Normas', 'Normas técnicas e padrões', 'BookOpen', '#8B5CF6'),
('FAQ', 'Perguntas frequentes', 'HelpCircle', '#EF4444'),
('Política Comercial', 'Políticas de preços e descontos', 'DollarSign', '#06B6D4')
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.knowledge_tags (name, description) VALUES
('perfil-u', 'Perfis em formato U'),
('perfil-l', 'Perfis em formato L'),
('cartola', 'Perfis cartola'),
('chapa', 'Chapas metálicas'),
('corte', 'Processos de corte'),
('cálculo', 'Cálculos técnicos'),
('preço', 'Informações de preço'),
('desconto', 'Políticas de desconto'),
('norma-técnica', 'Normas e padrões técnicos'),
('aproveitamento', 'Otimização de material')
ON CONFLICT (name) DO NOTHING;