import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const supabase = createClient(supabaseUrl, supabaseKey);

const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY')!;

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('🤖 Iniciando análise proativa...');

    // Buscar dados para análise
    const [productionOrders, leads, followUps] = await Promise.all([
      supabase.from('production_orders').select('*'),
      supabase.from('leads').select('*'),
      supabase.from('budget_followups').select('*').eq('is_completed', false)
    ]);

    // Buscar usuários ativos
    const { data: users } = await supabase
      .from('user_profiles')
      .select('id, full_name, role');

    if (!users || users.length === 0) {
      console.log('Nenhum usuário encontrado');
      return new Response(JSON.stringify({ message: 'Nenhum usuário para notificar' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const notifications = [];

    // Analisar pedidos de produção atrasados
    if (productionOrders.data) {
      const atrasados = productionOrders.data.filter(order => {
        if (!order.novo_prazo) return false;
        const prazo = new Date(order.novo_prazo);
        return prazo < new Date() && order.situacao !== 'Finalizado';
      });

      if (atrasados.length > 0) {
        const pedidosCriticos = atrasados.filter(order => {
          const prazo = new Date(order.novo_prazo);
          const diasAtraso = Math.floor((Date.now() - prazo.getTime()) / (1000 * 60 * 60 * 24));
          return diasAtraso > 7;
        });

        // Notificar usuários de produção e admins
        const targetUsers = users.filter(u => u.role === 'operacional' || u.role === 'admin');
        
        for (const user of targetUsers) {
          if (pedidosCriticos.length > 0) {
            notifications.push({
              user_id: user.id,
              title: '🚨 Pedidos Críticos em Atraso',
              message: `${pedidosCriticos.length} pedido(s) com mais de 7 dias de atraso requerem atenção urgente!`,
              type: 'alert',
              priority: 'critical',
              category: 'production',
              action_url: '/producao',
              action_label: 'Ver Produção',
              data: { pedidos: pedidosCriticos.map(p => p.numero_pedido) }
            });
          } else if (atrasados.length > 0) {
            notifications.push({
              user_id: user.id,
              title: '⚠️ Pedidos em Atraso',
              message: `${atrasados.length} pedido(s) estão atrasados e precisam de acompanhamento.`,
              type: 'warning',
              priority: 'high',
              category: 'production',
              action_url: '/producao',
              action_label: 'Verificar'
            });
          }
        }
      }
    }

    // Analisar leads sem follow-up
    if (leads.data) {
      const leadsEstagnados = leads.data.filter(lead => {
        if (lead.status === 'perdido' || lead.status === 'convertido') return false;
        if (!lead.last_contact_at) return true;
        
        const ultimoContato = new Date(lead.last_contact_at);
        const diasSemContato = Math.floor((Date.now() - ultimoContato.getTime()) / (1000 * 60 * 60 * 24));
        return diasSemContato > 7;
      });

      if (leadsEstagnados.length > 0) {
        // Agrupar por SDR
        const leadsPorSDR = leadsEstagnados.reduce((acc, lead) => {
          const sdrId = lead.sdr_id;
          if (!acc[sdrId]) acc[sdrId] = [];
          acc[sdrId].push(lead);
          return acc;
        }, {} as Record<string, any[]>);

        for (const [sdrId, sdrLeads] of Object.entries(leadsPorSDR)) {
          notifications.push({
            user_id: sdrId,
            title: '📞 Leads Precisam de Contato',
            message: `${sdrLeads.length} lead(s) sem contato há mais de 7 dias estão esfriando.`,
            type: 'warning',
            priority: 'high',
            category: 'leads',
            action_url: '/pre-vendas',
            action_label: 'Ver Leads',
            data: { leads: sdrLeads.slice(0, 5).map(l => ({ cliente: l.client_name, codigo: l.client_code })) }
          });
        }
      }
    }

    // Analisar follow-ups atrasados
    if (followUps.data) {
      const atrasados = followUps.data.filter(f => {
        const data = new Date(f.scheduled_date);
        return data < new Date();
      });

      // Agrupar por usuário
      const followupsPorUsuario = atrasados.reduce((acc, f) => {
        const userId = f.user_id || f.sdr_id;
        if (!userId) return acc;
        if (!acc[userId]) acc[userId] = [];
        acc[userId].push(f);
        return acc;
      }, {} as Record<string, any[]>);

      for (const [userId, userFollowups] of Object.entries(followupsPorUsuario)) {
        notifications.push({
          user_id: userId,
          title: '📅 Follow-ups Atrasados',
          message: `Você tem ${userFollowups.length} follow-up(s) atrasado(s) que precisam de atenção.`,
          type: 'warning',
          priority: 'medium',
          category: 'budgets',
          action_url: '/?tab=followup',
          action_label: 'Ver Follow-ups'
        });
      }
    }

    // Usar IA para insights adicionais
    if (notifications.length > 0) {
      console.log(`📊 ${notifications.length} notificações geradas`);

      // Enviar dados para IA analisar padrões
      try {
        const context = `
Análise do sistema:
- ${productionOrders.data?.length || 0} pedidos de produção
- ${leads.data?.length || 0} leads ativos
- ${followUps.data?.length || 0} follow-ups pendentes
- ${notifications.length} alertas gerados

Identifique 1-2 insights ou oportunidades importantes com base nestes dados.
`;

        const aiResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${LOVABLE_API_KEY}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            model: 'google/gemini-2.5-flash',
            messages: [
              { role: 'system', content: 'Você é um analista de negócios. Forneça insights curtos e acionáveis.' },
              { role: 'user', content: context }
            ],
            temperature: 0.7,
            max_completion_tokens: 300,
          }),
        });

        if (aiResponse.ok) {
          const aiData = await aiResponse.json();
          const insight = aiData.choices[0].message.content;

          // Adicionar insight como notificação para admins
          const admins = users.filter(u => u.role === 'admin');
          for (const admin of admins) {
            notifications.push({
              user_id: admin.id,
              title: '💡 Insight da IA',
              message: insight.substring(0, 200),
              type: 'info',
              priority: 'low',
              category: 'sales',
              data: { full_insight: insight }
            });
          }
        }
      } catch (error) {
        console.error('Erro ao gerar insight da IA:', error);
      }
    }

    // Inserir notificações no banco
    if (notifications.length > 0) {
      const { error } = await supabase
        .from('ai_notifications')
        .insert(notifications);

      if (error) {
        console.error('Erro ao inserir notificações:', error);
        throw error;
      }

      console.log(`✅ ${notifications.length} notificações criadas com sucesso`);
    } else {
      console.log('✨ Nenhum alerta necessário no momento');
    }

    return new Response(JSON.stringify({ 
      success: true,
      notificationsCreated: notifications.length,
      message: notifications.length > 0 ? `${notifications.length} notificações criadas` : 'Sistema operando normalmente'
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('❌ Erro na análise proativa:', error);
    return new Response(JSON.stringify({ 
      error: error.message,
      success: false 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});
