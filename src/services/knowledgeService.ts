import { supabase } from '@/integrations/supabase/client';

export interface KnowledgeCategory {
  id: string;
  name: string;
  description?: string;
  icon?: string;
  color?: string;
  parent_id?: string;
  display_order: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  created_by?: string;
}

export interface KnowledgeArticle {
  id: string;
  title: string;
  content: string;
  summary?: string | null;
  category_id?: string | null;
  keywords: string[] | null;
  search_terms: string[] | null;
  difficulty_level: 'beginner' | 'intermediate' | 'advanced' | null;
  article_type: 'general' | 'faq' | 'tutorial' | 'calculation' | 'policy' | 'process' | null;
  priority: number | null;
  view_count: number | null;
  helpful_count: number | null;
  unhelpful_count: number | null;
  is_published: boolean | null;
  is_featured: boolean | null;
  expires_at?: string | null;
  created_at: string | null;
  updated_at: string | null;
  created_by?: string | null;
  updated_by?: string | null;
  category?: KnowledgeCategory;
  tags?: string[];
}

export interface SearchResult {
  article_id: string;
  title: string;
  summary?: string;
  content: string;
  category_name?: string;
  tags?: string[];
  relevance_score: number;
}

export interface ChatConversation {
  id: string;
  user_id?: string;
  session_id: string;
  message: string;
  response?: string;
  response_type: 'knowledge' | 'calculation' | 'general' | 'no_answer';
  articles_used: string[];
  search_query?: string;
  response_time_ms?: number;
  was_helpful?: boolean;
  feedback_text?: string;
  created_at: string;
}

class KnowledgeService {
  // Buscar conhecimento
  async searchKnowledge(query: string, categoryId?: string, limit = 10): Promise<SearchResult[]> {
    try {
      const { data, error } = await (supabase as any).rpc('search_knowledge', {
        search_query: query,
        category_filter: categoryId || null,
        limit_results: limit
      });

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Erro ao buscar conhecimento:', error);
      return [];
    }
  }

  // Obter categorias
  async getCategories(): Promise<KnowledgeCategory[]> {
    const { data, error } = await supabase
      .from('knowledge_categories')
      .select('*')
      .eq('is_active', true)
      .order('display_order', { ascending: true });

    if (error) throw error;
    return data || [];
  }

  // Obter artigo por ID
  async getArticle(id: string): Promise<KnowledgeArticle | null> {
    const { data, error } = await supabase
      .from('knowledge_articles')
      .select(`
        *,
        category:knowledge_categories(*),
        tags:knowledge_article_tags(tag:knowledge_tags(*))
      `)
      .eq('id', id)
      .eq('is_published', true)
      .single();

    if (error) return null;
    
    if (data) {
      // Incrementar contador de visualizações
      await this.incrementViewCount(id);
      
      return {
        ...data,
        tags: data.tags?.map((t: any) => t.tag.name) || []
      } as KnowledgeArticle;
    }
    
    return null;
  }

  // Incrementar contador de visualizações
  private async incrementViewCount(articleId: string): Promise<void> {
    // Get current count and increment
    const { data: current } = await supabase
      .from('knowledge_articles')
      .select('view_count')
      .eq('id', articleId)
      .single();
    
    if (current) {
      await supabase
        .from('knowledge_articles')
        .update({ view_count: (current.view_count || 0) + 1 })
        .eq('id', articleId);
    }
  }

  // Salvar conversa
  async saveConversation(conversation: Omit<ChatConversation, 'id' | 'created_at'>): Promise<void> {
    try {
      const { error } = await (supabase as any)
        .from('chat_conversations')
        .insert(conversation);

      if (error) throw error;
    } catch (error) {
      console.error('Erro ao salvar conversa:', error);
    }
  }

  // Marcar artigo como útil/não útil
  async markArticleHelpful(articleId: string, helpful: boolean): Promise<void> {
    const { data: currentUser } = await supabase.auth.getUser();
    
    // Get current counts and increment
    const { data: current } = await supabase
      .from('knowledge_articles')
      .select('helpful_count, unhelpful_count')
      .eq('id', articleId)
      .single();
    
    if (current) {
      if (helpful) {
        await supabase
          .from('knowledge_articles')
          .update({ helpful_count: (current.helpful_count || 0) + 1 })
          .eq('id', articleId);
      } else {
        await supabase
          .from('knowledge_articles')
          .update({ unhelpful_count: (current.unhelpful_count || 0) + 1 })
          .eq('id', articleId);
      }
    }

    // Salvar feedback se usuário logado
    if (currentUser.user) {
      await (supabase as any)
        .from('knowledge_feedback')
        .insert({
          article_id: articleId,
          user_id: currentUser.user.id,
          rating: helpful ? 5 : 1,
          feedback_type: 'usefulness'
        });
    }
  }

  // Obter artigos em destaque
  async getFeaturedArticles(limit = 5): Promise<KnowledgeArticle[]> {
    const { data, error } = await supabase
      .from('knowledge_articles')
      .select(`
        *,
        category:knowledge_categories(*)
      `)
      .eq('is_published', true)
      .eq('is_featured', true)
      .order('priority', { ascending: false })
      .limit(limit);

    if (error) throw error;
    return (data || []) as KnowledgeArticle[];
  }

  // Obter perguntas frequentes
  async getFAQs(limit = 10): Promise<KnowledgeArticle[]> {
    const { data, error } = await supabase
      .from('knowledge_articles')
      .select(`
        *,
        category:knowledge_categories(*)
      `)
      .eq('is_published', true)
      .eq('article_type', 'faq')
      .order('helpful_count', { ascending: false })
      .limit(limit);

    if (error) throw error;
    return (data || []) as KnowledgeArticle[];
  }

  // Buscar por categoria
  async getArticlesByCategory(categoryId: string, limit = 20): Promise<KnowledgeArticle[]> {
    const { data, error } = await supabase
      .from('knowledge_articles')
      .select(`
        *,
        category:knowledge_categories(*)
      `)
      .eq('is_published', true)
      .eq('category_id', categoryId)
      .order('priority', { ascending: false })
      .limit(limit);

    if (error) throw error;
    return (data || []) as KnowledgeArticle[];
  }

  // Gerar resposta inteligente baseada no conhecimento
  async generateResponse(query: string, sessionId: string): Promise<{
    response: string;
    articlesUsed: string[];
    responseType: ChatConversation['response_type'];
  }> {
    const startTime = Date.now();
    
    // Buscar conhecimento relevante
    const searchResults = await this.searchKnowledge(query, undefined, 5);
    
    let response: string;
    let responseType: ChatConversation['response_type'];
    const articlesUsed: string[] = [];

    if (searchResults.length > 0) {
      // Encontrou conhecimento relevante
      const bestMatch = searchResults[0];
      articlesUsed.push(bestMatch.article_id);
      
      // Verificar tipo de resposta baseado no conteúdo
      if (query.toLowerCase().includes('calcul') || query.toLowerCase().includes('fórmula')) {
        responseType = 'calculation';
      } else {
        responseType = 'knowledge';
      }

      // Construir resposta baseada no conhecimento
      if (bestMatch.relevance_score > 2.0) {
        // Resposta direta baseada no conteúdo
        response = this.formatDirectResponse(bestMatch, query);
      } else {
        // Resposta com sugestões
        response = this.formatSuggestedResponse(searchResults, query);
      }
    } else {
      // Não encontrou conhecimento específico
      responseType = 'no_answer';
      response = this.generateFallbackResponse(query);
    }

    // Salvar conversa
    const responseTime = Date.now() - startTime;
    const { data: currentUser } = await supabase.auth.getUser();
    
    await this.saveConversation({
      user_id: currentUser.user?.id,
      session_id: sessionId,
      message: query,
      response,
      response_type: responseType,
      articles_used: articlesUsed,
      search_query: query,
      response_time_ms: responseTime
    });

    return {
      response,
      articlesUsed,
      responseType
    };
  }

  private formatDirectResponse(result: SearchResult, query: string): string {
    const greeting = this.getRandomGreeting();
    const category = result.category_name ? ` sobre ${result.category_name}` : '';
    
    return `${greeting}

**${result.title}**

${result.summary || result.content.substring(0, 300)}...

${result.content.length > 300 ? '\n💡 *Esta é uma resposta baseada no meu conhecimento interno da Global Aço. Posso fornecer mais detalhes se precisar!*' : ''}

${result.tags && result.tags.length > 0 ? `\n🏷️ **Tags relacionadas:** ${result.tags.join(', ')}` : ''}`;
  }

  private formatSuggestedResponse(results: SearchResult[], query: string): string {
    const greeting = this.getRandomGreeting();
    
    let response = `${greeting}\n\nEncontrei algumas informações relacionadas à sua pergunta:\n\n`;
    
    results.slice(0, 3).forEach((result, index) => {
      response += `**${index + 1}. ${result.title}**\n`;
      response += `${result.summary || result.content.substring(0, 150)}...\n\n`;
    });

    response += '💡 *Gostaria que eu detalhe algum destes tópicos?*';
    
    return response;
  }

  private generateFallbackResponse(query: string): string {
    const greeting = this.getRandomGreeting();
    
    // Identificar tipo de pergunta para resposta mais direcionada
    if (query.toLowerCase().includes('preço') || query.toLowerCase().includes('custo')) {
      return `${greeting}\n\nPara informações sobre preços, recomendo consultar nossa **Política Comercial** ou entrar em contato com o setor comercial.\n\n💡 *Posso ajudar com informações técnicas sobre produtos, cálculos ou processos da Global Aço!*`;
    }
    
    if (query.toLowerCase().includes('perfil') || query.toLowerCase().includes('chapa')) {
      return `${greeting}\n\nVejo que você está perguntando sobre nossos produtos! Temos informações detalhadas sobre:\n\n• **Perfis U, L e Cartola**\n• **Chapas metálicas**\n• **Processos de corte**\n• **Cálculos técnicos**\n\n💡 *Pode ser mais específico sobre qual produto ou processo te interessa?*`;
    }

    return `${greeting}\n\nAinda não tenho informações específicas sobre sua pergunta no meu conhecimento, mas posso ajudar com:\n\n• **Produtos da Global Aço** (perfis, chapas)\n• **Processos de fabricação e corte**\n• **Cálculos técnicos**\n• **Normas e padrões**\n• **Perguntas frequentes**\n\n💡 *Pode reformular sua pergunta ou escolher um dos tópicos acima?*`;
  }

  private getRandomGreeting(): string {
    const greetings = [
      'Olá! Sou o Zé da Global e estou aqui para ajudar! 👋',
      'Oi! Zé da Global aqui, pronto para esclarecer suas dúvidas! 🔧',
      'E aí! É o Zé da Global, seu assistente técnico! ⚙️',
      'Olá! Zé da Global à disposição para ajudar! 🏭',
      'Oi! Aqui é o Zé da Global, especialista em aço! 💪'
    ];
    
    return greetings[Math.floor(Math.random() * greetings.length)];
  }
}

export const knowledgeService = new KnowledgeService();