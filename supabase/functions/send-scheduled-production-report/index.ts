import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

function getDayKey(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('🏭 [send-scheduled-production-report] Verificando agendamento...');
    const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // Get schedule config
    const { data: scheduleRows, error: scheduleError } = await supabaseAdmin
      .from('production_report_schedule')
      .select('*')
      .eq('is_active', true)
      .limit(1);

    if (scheduleError) throw scheduleError;

    if (!scheduleRows || scheduleRows.length === 0) {
      console.log('ℹ️ Nenhum agendamento ativo para relatório de produção');
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

    // Idempotency check - prevent duplicate sends on the same day
    const todayStr = getDayKey(brasiliaTime);
    const lockKey = `production_report_${todayStr}`;
    
    // Use email_reports_log with a special config_id to track production report sends
    const { error: lockError } = await supabaseAdmin
      .from('email_reports_log')
      .insert({
        config_id: schedule.id,
        email: 'production-report-scheduled',
        status: 'pending',
        report_date: todayStr,
        report_type: 'production_daily',
        is_scheduled: true,
      });

    if (lockError) {
      if (lockError.code === '23505') {
        console.log('ℹ️ Relatório de produção já enviado/em processamento hoje');
        return new Response(
          JSON.stringify({ message: 'Já enviado hoje' }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      console.error('❌ Erro no lock:', lockError);
    }

    console.log('✅ Dentro da janela de envio, chamando send-production-report...');

    // Call the existing send-production-report function (no auth header = scheduled mode)
    const { data, error } = await supabaseAdmin.functions.invoke('send-production-report', {
      body: { scheduled: true }
    });

    if (error) {
      console.error('❌ Erro ao enviar relatório de produção:', error);
      // Update lock to failed
      await supabaseAdmin
        .from('email_reports_log')
        .update({ status: 'failed', error_message: error.message, sent_at: new Date().toISOString() })
        .eq('config_id', schedule.id)
        .eq('report_date', todayStr)
        .eq('report_type', 'production_daily');

      return new Response(
        JSON.stringify({ error: error.message }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('✅ Relatório de produção agendado enviado com sucesso');
    // Update lock to success
    await supabaseAdmin
      .from('email_reports_log')
      .update({ status: 'success', sent_at: new Date().toISOString() })
      .eq('config_id', schedule.id)
      .eq('report_date', todayStr)
      .eq('report_type', 'production_daily');

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
