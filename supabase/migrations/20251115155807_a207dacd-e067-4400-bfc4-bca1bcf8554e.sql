-- Criar tabela para armazenar conversas do chat
CREATE TABLE IF NOT EXISTS public.chat_conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  session_id TEXT NOT NULL,
  message TEXT NOT NULL,
  response TEXT,
  response_type TEXT CHECK (response_type IN ('knowledge', 'calculation', 'general', 'no_answer')),
  articles_used TEXT[] DEFAULT '{}',
  search_query TEXT,
  response_time_ms INTEGER,
  was_helpful BOOLEAN,
  feedback_text TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_chat_conversations_user_id ON public.chat_conversations(user_id);
CREATE INDEX IF NOT EXISTS idx_chat_conversations_session_id ON public.chat_conversations(session_id);
CREATE INDEX IF NOT EXISTS idx_chat_conversations_created_at ON public.chat_conversations(created_at DESC);

-- Habilitar RLS
ALTER TABLE public.chat_conversations ENABLE ROW LEVEL SECURITY;

-- Política: usuários podem ver suas próprias conversas
CREATE POLICY "Users can view own conversations"
  ON public.chat_conversations FOR SELECT
  USING (auth.uid() = user_id);

-- Política: sistema pode inserir conversas
CREATE POLICY "System can insert conversations"
  ON public.chat_conversations FOR INSERT
  WITH CHECK (true);

-- Política: usuários podem atualizar suas próprias conversas (para feedback)
CREATE POLICY "Users can update own conversations"
  ON public.chat_conversations FOR UPDATE
  USING (auth.uid() = user_id);

-- Função para buscar artigos relevantes na base de conhecimento
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
  relevance_score REAL
) 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    ka.id as article_id,
    COALESCE(ka.title, ka.titulo) as title,
    COALESCE(ka.summary, '') as summary,
    COALESCE(ka.content, ka.conteudo) as content,
    COALESCE(kc.name, kc.nome) as category_name,
    ka.tags,
    ts_rank(
      to_tsvector('portuguese', 
        COALESCE(ka.title, ka.titulo, '') || ' ' || 
        COALESCE(ka.content, ka.conteudo, '') || ' ' || 
        COALESCE(ka.summary, '', '') || ' ' ||
        COALESCE(array_to_string(ka.keywords, ' '), '') || ' ' ||
        COALESCE(array_to_string(ka.search_terms, ' '), '')
      ),
      plainto_tsquery('portuguese', search_query)
    ) as relevance_score
  FROM knowledge_articles ka
  LEFT JOIN knowledge_categories kc ON ka.category_id = kc.id
  WHERE 
    (ka.is_published = true OR ka.ativo = true)
    AND (category_filter IS NULL OR ka.category_id = category_filter)
    AND to_tsvector('portuguese', 
      COALESCE(ka.title, ka.titulo, '') || ' ' || 
      COALESCE(ka.content, ka.conteudo, '') || ' ' || 
      COALESCE(ka.summary, '', '') || ' ' ||
      COALESCE(array_to_string(ka.keywords, ' '), '') || ' ' ||
      COALESCE(array_to_string(ka.search_terms, ' '), '')
    ) @@ plainto_tsquery('portuguese', search_query)
  ORDER BY relevance_score DESC
  LIMIT limit_results;
END;
$$;