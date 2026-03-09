import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

function getDayKey(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('📦 [send-scheduled-estoque-report] Verificando agendamento...');
    const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // Get schedule config
    const { data: scheduleRows, error: scheduleError } = await supabaseAdmin
      .from('estoque_report_schedule')
      .select('*')
      .eq('is_active', true)
      .limit(1);

    if (scheduleError) throw scheduleError;

    if (!scheduleRows || scheduleRows.length === 0) {
      console.log('ℹ️ Nenhum agendamento ativo para relatório de estoque');
      return new Response(
        JSON.stringify({ message: 'Nenhum agendamento ativo' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const schedule = scheduleRows[0];
    const now = new Date();
    const brasiliaTime = new Date(now.toLocaleString('en-US', { timeZone: 'America/Sao_Paulo' }));
    const currentHour = brasiliaTime.getHours();
    const currentMinute = brasiliaTime.getMinutes();
    const [configHour, configMinute] = schedule.send_time.split(':').map(Number);

    const currentTotal = currentHour * 60 + currentMinute;
    const configTotal = configHour * 60 + configMinute;
    const diff = currentTotal - configTotal;

    if (diff < 0 || diff > 10) {
      console.log(`⏰ Fora da janela. Config: ${schedule.send_time}, Atual: ${currentHour}:${currentMinute} (diff: ${diff}min)`);
      return new Response(
        JSON.stringify({ message: 'Fora da janela de envio' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Verificar se é dia útil (segunda a sexta)
    const dayOfWeek = brasiliaTime.getDay(); // 0=Dom, 6=Sáb
    if (dayOfWeek === 0 || dayOfWeek === 6) {
      console.log(`📅 Fim de semana (dia ${dayOfWeek}), pulando envio`);
      return new Response(
        JSON.stringify({ message: 'Fim de semana - envio apenas de segunda a sexta' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Idempotency check
    const todayStr = getDayKey(brasiliaTime);
    if (schedule.last_sent_date === todayStr) {
      console.log('ℹ️ Relatório de estoque já enviado hoje');
      return new Response(
        JSON.stringify({ message: 'Já enviado hoje' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Mark as sent today immediately to prevent concurrent runs
    const { error: updateError } = await supabaseAdmin
      .from('estoque_report_schedule')
      .update({ last_sent_date: todayStr })
      .eq('id', schedule.id);

    if (updateError) {
      console.error('❌ Erro ao atualizar last_sent_date:', updateError);
    }

    console.log('✅ Dentro da janela de envio, chamando send-estoque-report...');

    // Call the existing send-estoque-report function
    const { data, error } = await supabaseAdmin.functions.invoke('send-estoque-report', {
      body: { scheduled: true }
    });

    if (error) {
      console.error('❌ Erro ao enviar relatório de estoque:', error);
      // Reset last_sent_date on failure so it can retry
      await supabaseAdmin
        .from('estoque_report_schedule')
        .update({ last_sent_date: null })
        .eq('id', schedule.id);

      return new Response(
        JSON.stringify({ error: error.message }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('✅ Relatório de estoque agendado enviado com sucesso');

    return new Response(
      JSON.stringify({ success: true, data }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: any) {
    console.error('❌ Erro:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
};

serve(handler);
