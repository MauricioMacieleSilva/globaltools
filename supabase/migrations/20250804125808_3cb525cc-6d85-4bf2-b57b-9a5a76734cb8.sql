-- Corrigir função search_knowledge que ainda tem search_path mutável
CREATE OR REPLACE FUNCTION public.search_knowledge(search_query text, category_filter uuid DEFAULT NULL::uuid, limit_results integer DEFAULT 10)
 RETURNS TABLE(article_id uuid, title text, summary text, content text, category_name text, tags text[], relevance_score numeric)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
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
$function$;

-- Corrigir função update_updated_at_column
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$function$;