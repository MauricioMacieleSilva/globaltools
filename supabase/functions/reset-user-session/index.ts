import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    )

    const { userEmail } = await req.json()

    if (!userEmail) {
      return new Response(
        JSON.stringify({ error: 'Email do usuário é obrigatório' }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    console.log(`🔄 Iniciando reset de sessão para usuário: ${userEmail}`)

    // 1. Buscar o usuário pelo email
    const { data: users, error: getUserError } = await supabaseClient.auth.admin.listUsers()
    
    if (getUserError) {
      console.error('❌ Erro ao buscar usuários:', getUserError)
      throw getUserError
    }

    const user = users.users.find(u => u.email === userEmail)
    
    if (!user) {
      return new Response(
        JSON.stringify({ error: 'Usuário não encontrado' }),
        { 
          status: 404, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    console.log(`✅ Usuário encontrado: ${user.id}`)

    // 2. Invalidar todas as sessões do usuário
    const { error: signOutError } = await supabaseClient.auth.admin.signOut(user.id, 'global')
    
    if (signOutError) {
      console.error('❌ Erro ao invalidar sessões:', signOutError)
      throw signOutError
    }

    console.log(`✅ Sessões invalidadas para usuário: ${user.id}`)

    // 3. Log da ação para auditoria
    const { error: logError } = await supabaseClient
      .from('admin_session_resets')
      .insert({
        target_user_id: user.id,
        target_user_email: userEmail,
        reset_timestamp: new Date().toISOString(),
        reason: 'Manual reset via admin panel'
      })

    if (logError) {
      console.warn('⚠️ Erro ao registrar log (não crítico):', logError)
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: `Sessão do usuário ${userEmail} foi resetada com sucesso`,
        userId: user.id
      }),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )

  } catch (error: any) {
    console.error('❌ Erro no reset de sessão:', error)
    
    return new Response(
      JSON.stringify({ 
        error: error.message || 'Erro interno do servidor' 
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )
  }
})