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
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

  try {
    console.log('🛒 [send-scheduled-compras-report] Verificando agendamento...');
    const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    const { data: rows, error: scheduleError } = await supabaseAdmin
      .from('compras_report_schedule')
      .select('*')
      .eq('is_active', true)
      .limit(1);

    if (scheduleError) throw scheduleError;
    if (!rows || rows.length === 0) {
      console.log('ℹ️ Nenhum agendamento ativo');
      return new Response(JSON.stringify({ message: 'Nenhum agendamento ativo' }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const schedule = rows[0];
    const now = new Date();
    const brasiliaTime = new Date(now.toLocaleString('en-US', { timeZone: 'America/Sao_Paulo' }));
    const currentHour = brasiliaTime.getHours();
    const currentMinute = brasiliaTime.getMinutes();
    const [configHour, configMinute] = String(schedule.send_time).split(':').map(Number);

    const diff = (currentHour * 60 + currentMinute) - (configHour * 60 + configMinute);
    if (diff < 0 || diff > 10) {
      console.log(`⏰ Fora da janela. Config: ${schedule.send_time}, Atual: ${currentHour}:${currentMinute} (diff: ${diff}min)`);
      return new Response(JSON.stringify({ message: 'Fora da janela de envio' }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const DAY_MAP: Record<number, string> = { 0: 'dom', 1: 'seg', 2: 'ter', 3: 'qua', 4: 'qui', 5: 'sex', 6: 'sab' };
    const todayKey = DAY_MAP[brasiliaTime.getDay()];
    const sendDays: string[] = schedule.send_days || ['seg', 'ter', 'qua', 'qui', 'sex'];
    if (!sendDays.includes(todayKey)) {
      console.log(`📅 Hoje (${todayKey}) não está nos dias configurados: ${sendDays.join(', ')}`);
      return new Response(JSON.stringify({ message: `Hoje (${todayKey}) não está nos dias configurados` }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const todayStr = getDayKey(brasiliaTime);
    if (schedule.last_sent_date === todayStr) {
      console.log('ℹ️ Relatório de compras já enviado hoje');
      return new Response(JSON.stringify({ message: 'Já enviado hoje' }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    // Idempotência: marca antes de chamar
    await supabaseAdmin
      .from('compras_report_schedule')
      .update({ last_sent_date: todayStr })
      .eq('id', schedule.id);

    console.log('✅ Dentro da janela, chamando send-compras-report...');
    const functionUrl = `${SUPABASE_URL}/functions/v1/send-compras-report`;

    try {
      const invokeRes = await fetch(functionUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
        },
        body: JSON.stringify({ scheduled: true }),
      });
      const responseText = await invokeRes.text();
      console.log(`📬 send-compras-report status: ${invokeRes.status}, body: ${responseText.substring(0, 500)}`);

      if (!invokeRes.ok) {
        await supabaseAdmin.from('compras_report_schedule').update({ last_sent_date: null }).eq('id', schedule.id);
        return new Response(JSON.stringify({ error: `send-compras-report returned ${invokeRes.status}`, details: responseText.substring(0, 500) }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      }

      console.log('✅ Relatório de compras agendado enviado com sucesso');
      return new Response(JSON.stringify({ success: true, response: responseText.substring(0, 500) }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    } catch (invokeError: any) {
      console.error('❌ Exceção:', invokeError.message);
      await supabaseAdmin.from('compras_report_schedule').update({ last_sent_date: null }).eq('id', schedule.id);
      return new Response(JSON.stringify({ error: invokeError.message }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }
  } catch (error: any) {
    console.error('❌ Erro:', error);
    return new Response(JSON.stringify({ error: error.message }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }
};

serve(handler);