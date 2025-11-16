import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
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

    // Verificar autorização
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      throw new Error('Missing authorization header')
    }

    const token = authHeader.replace('Bearer ', '')
    const { data: { user }, error: authError } = await supabaseClient.auth.getUser(token)
    
    if (authError || !user) {
      throw new Error('Unauthorized')
    }

    // Verificar se usuário é admin
    const { data: profile, error: profileError } = await supabaseClient
      .from('user_profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    if (profileError || profile?.role !== 'admin') {
      throw new Error('Forbidden: Only admins can delete users')
    }

    const { userId } = await req.json()

    if (!userId) {
      throw new Error('User ID is required')
    }

    // Não permitir que admin delete a si mesmo
    if (userId === user.id) {
      throw new Error('Cannot delete your own account')
    }

    // Obter informações do usuário antes de deletar
    const { data: userToDelete } = await supabaseClient
      .from('user_profiles')
      .select('email, full_name')
      .eq('id', userId)
      .single()

    console.log('Deleting user:', userToDelete)

    // Atualizar foreign keys para NULL antes de deletar
    // Atualizar leads com sdr_id
    await supabaseClient
      .from('leads')
      .update({ sdr_id: null, sdr_name: 'Usuário removido' })
      .eq('sdr_id', userId)

    // Atualizar leads com assigned_specialist_id
    await supabaseClient
      .from('leads')
      .update({ assigned_specialist_id: null, assigned_specialist_name: null })
      .eq('assigned_specialist_id', userId)

    // Atualizar lead_activities
    await supabaseClient
      .from('lead_activities')
      .update({ sdr_id: null, sdr_name: 'Usuário removido' })
      .eq('sdr_id', userId)

    // Atualizar budget_followups
    await supabaseClient
      .from('budget_followups')
      .update({ sdr_id: null, sdr_name: null })
      .eq('sdr_id', userId)

    // Atualizar production_orders (updated_by)
    await supabaseClient
      .from('production_orders')
      .update({ updated_by: null, updated_by_name: null })
      .eq('updated_by', userId)

    // Anular/transferir created_by em tabelas administrativas
    await supabaseClient.from('email_reports_config').update({ created_by: user.id }).eq('created_by', userId)
    await supabaseClient.from('admin_goals').update({ created_by: null }).eq('created_by', userId)
    await supabaseClient.from('lead_business_types').update({ created_by: null }).eq('created_by', userId)
    await supabaseClient.from('lead_product_interests').update({ created_by: null }).eq('created_by', userId)
    await supabaseClient.from('revenue_goals').update({ created_by: null }).eq('created_by', userId)

    // Logs de reset de sessão (performed_by)
    await supabaseClient
      .from('admin_session_resets')
      .update({ performed_by: null })
      .eq('performed_by', userId)

    // Deletar do auth.users (isso vai fazer cascade delete no user_profiles)
    const { error: deleteError } = await supabaseClient.auth.admin.deleteUser(userId)

    if (deleteError) {
      throw deleteError
    }

    console.log('User deleted successfully:', userId)

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'User deleted successfully',
        deletedUser: userToDelete
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    )

  } catch (error: any) {
    console.error('Error deleting user:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      }
    )
  }
})