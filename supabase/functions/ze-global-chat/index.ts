import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Initialize Supabase client
const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const supabase = createClient(supabaseUrl, supabaseKey);

// Lovable AI API Key
const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY')!;

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { message, conversationHistory = [], pageContext } = await req.json();

    if (!message || !message.trim()) {
      throw new Error('Mensagem é obrigatória');
    }

    console.log('🔍 Processando pergunta:', message);
    if (pageContext) {
      console.log('📄 Contexto da página:', pageContext.pageName);
    }

    // Get user for context
    const { data: userData } = await supabase.auth.getUser();
    const userId = userData?.user?.id;

    // Search knowledge base for relevant content
    const { data: searchResults, error: searchError } = await supabase.rpc('search_knowledge', {
      search_query: message,
      limit_results: 3
    });

    if (searchError) {
      console.error('❌ Erro na busca de conhecimento:', searchError);
    }

    // Build context from knowledge base
    let knowledgeContext = '';
    let articlesUsed: string[] = [];
    
    if (searchResults && searchResults.length > 0) {
      console.log(`✅ Encontrados ${searchResults.length} artigos relevantes`);
      articlesUsed = searchResults.map((result: any) => result.article_id);
      
      knowledgeContext = searchResults.map((result: any, index: number) => 
        `[Artigo ${index + 1}: ${result.title}]\n${result.content}\n`
      ).join('\n---\n\n');
    }

    // Get system data context (leads, orders, etc.)
    const systemContext = await getSystemContext(userId);

    // Build page context if available
    let pageContextStr = '';
    if (pageContext) {
      pageContextStr = `\n\nCONTEXTO DA PÁGINA ATUAL:\n`;
      pageContextStr += `Página: ${pageContext.pageName}\n`;
      if (pageContext.data) {
        pageContextStr += `Dados relevantes: ${JSON.stringify(pageContext.data, null, 2)}\n`;
      }
      if (pageContext.filters) {
        pageContextStr += `Filtros aplicados: ${JSON.stringify(pageContext.filters, null, 2)}\n`;
      }
      if (pageContext.selectedItems) {
        pageContextStr += `Itens selecionados: ${JSON.stringify(pageContext.selectedItems, null, 2)}\n`;
      }
    }

    // Build messages for AI
    const systemPrompt = `Você é o Zé da Global, assistente inteligente da Global Aço.

PERSONALIDADE:
- Amigável, profissional e prestativo
- Use emojis moderadamente (1-2 por mensagem)
- Seja direto e objetivo
- Use linguagem clara e acessível

CAPACIDADES:
1. Responder perguntas sobre produtos, processos e políticas usando a base de conhecimento
2. Consultar dados do sistema em tempo real (pedidos, leads, vendas)
3. Fazer cálculos técnicos (peso de chapas, cortes, etc.)
4. Sugerir ações e próximos passos

${knowledgeContext ? `\nBASE DE CONHECIMENTO RELEVANTE:\n${knowledgeContext}` : ''}

${systemContext ? `\nDADOS DO SISTEMA:\n${systemContext}` : ''}

${pageContextStr}

INSTRUÇÕES:
- Se tem informação na base de conhecimento, use-a como fonte principal
- Se tem dados do sistema relevantes, inclua-os na resposta
- Se não sabe a resposta, admita e sugira alternativas
- Sempre seja útil e proativo
- Mantenha respostas entre 100-300 palavras quando possível`;

    const messages = [
      { role: 'system', content: systemPrompt },
      ...conversationHistory,
      { role: 'user', content: message }
    ];

    console.log('🤖 Chamando Lovable AI...');

    // Call Lovable AI
    const aiResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages,
        temperature: 0.7,
        max_completion_tokens: 1000,
        tools: [
          {
            type: 'function',
            function: {
              name: 'query_system_data',
              description: 'Consulta dados do sistema como pedidos em produção, leads, orçamentos, etc.',
              parameters: {
                type: 'object',
                properties: {
                  query_type: {
                    type: 'string',
                    enum: ['production_orders', 'leads', 'lost_orders', 'budgets'],
                    description: 'Tipo de dados a consultar'
                  },
                  filters: {
                    type: 'object',
                    description: 'Filtros opcionais para a consulta'
                  }
                },
                required: ['query_type']
              }
            }
          }
        ]
      }),
    });

    if (!aiResponse.ok) {
      const errorText = await aiResponse.text();
      console.error('❌ Erro na API Lovable AI:', aiResponse.status, errorText);
      throw new Error('Erro ao processar com IA');
    }

    const aiData = await aiResponse.json();
    const assistantMessage = aiData.choices[0].message;
    
    // Check if AI wants to call a function
    if (assistantMessage.tool_calls && assistantMessage.tool_calls.length > 0) {
      console.log('🔧 IA solicitou execução de função');
      const toolCall = assistantMessage.tool_calls[0];
      
      if (toolCall.function.name === 'query_system_data') {
        const args = JSON.parse(toolCall.function.arguments);
        const queryResult = await executeSystemQuery(args.query_type, args.filters, userId);
        
        // Call AI again with function result
        const finalResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${LOVABLE_API_KEY}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            model: 'google/gemini-2.5-flash',
            messages: [
              ...messages,
              assistantMessage,
              {
                role: 'tool',
                tool_call_id: toolCall.id,
                content: JSON.stringify(queryResult)
              }
            ],
            temperature: 0.7,
            max_completion_tokens: 1000,
          }),
        });

        const finalData = await finalResponse.json();
        var response = finalData.choices[0].message.content;
      } else {
        var response = assistantMessage.content;
      }
    } else {
      var response = assistantMessage.content;
    }

    console.log('✅ Resposta gerada com sucesso');

    // Save conversation
    const sessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    await supabase.from('chat_conversations').insert({
      message,
      response,
      response_type: articlesUsed.length > 0 ? 'knowledge' : 'general',
      articles_used: articlesUsed,
      session_id: sessionId,
      user_id: userId,
      search_query: message
    });

    return new Response(JSON.stringify({ 
      message: response,
      articlesUsed,
      success: true 
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('❌ Erro no ze-global-chat:', error);
    return new Response(JSON.stringify({ 
      error: error.message,
      message: 'Desculpe, houve um erro ao processar sua pergunta. Tente novamente em alguns instantes.',
      success: false 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

// Get system context based on user query
async function getSystemContext(userId: string | undefined): Promise<string> {
  if (!userId) return '';
  
  try {
    // Get user role
    const { data: userProfile } = await supabase
      .from('user_profiles')
      .select('role, full_name')
      .eq('id', userId)
      .single();

    if (!userProfile) return '';

    let context = `Usuário: ${userProfile.full_name} (${userProfile.role})\n`;

    // Get recent leads if user is SDR or admin
    if (userProfile.role === 'comercial' || userProfile.role === 'admin') {
      const { data: recentLeads } = await supabase
        .from('leads')
        .select('client_name, status, created_at')
        .order('created_at', { ascending: false })
        .limit(5);

      if (recentLeads && recentLeads.length > 0) {
        context += `\nÚltimos leads: ${recentLeads.length} leads, status variado`;
      }
    }

    return context;
  } catch (error) {
    console.error('Erro ao buscar contexto do sistema:', error);
    return '';
  }
}

// Execute system queries when AI requests data
async function executeSystemQuery(queryType: string, filters: any, userId: string | undefined) {
  console.log(`🔍 Executando query: ${queryType}`, filters);

  try {
    switch (queryType) {
      case 'production_orders': {
        const query = supabase
          .from('ordens_producao')
          .select('numero_op, status, data_fim_prevista')
          .order('created_at', { ascending: false })
          .limit(10);

        if (filters?.status) {
          query.eq('status', filters.status);
        }

        const { data, error } = await query;
        
        if (error) throw error;
        
        return {
          success: true,
          count: data?.length || 0,
          data: data || [],
          summary: `Encontrados ${data?.length || 0} pedidos de produção`
        };
      }

      case 'leads': {
        const query = supabase
          .from('leads')
          .select('client_name, status, sdr_name, created_at')
          .order('created_at', { ascending: false })
          .limit(20);

        if (filters?.status) {
          query.eq('status', filters.status);
        }

        const { data, error } = await query;
        
        if (error) throw error;
        
        return {
          success: true,
          count: data?.length || 0,
          data: data || [],
          summary: `Encontrados ${data?.length || 0} leads`
        };
      }

      case 'lost_orders': {
        const { data, error } = await supabase
          .from('excluded_orders')
          .select('numero_pedido, motivo, excluded_at')
          .order('excluded_at', { ascending: false })
          .limit(10);
        
        if (error) throw error;
        
        return {
          success: true,
          count: data?.length || 0,
          data: data || [],
          summary: `Encontrados ${data?.length || 0} pedidos perdidos/cancelados`
        };
      }

      default:
        return {
          success: false,
          error: 'Tipo de query não suportado'
        };
    }
  } catch (error) {
    console.error('❌ Erro ao executar query:', error);
    return {
      success: false,
      error: error.message
    };
  }
}