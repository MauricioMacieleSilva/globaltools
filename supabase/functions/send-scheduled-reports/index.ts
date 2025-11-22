import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface ReportConfig {
  id: string;
  email: string;
  full_name: string | null;
  frequency: string;
  send_time: string;
  custom_days: string[] | null;
  is_active: boolean;
}

function getDayOfWeek(date: Date): string {
  const days = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
  return days[date.getDay()];
}

function shouldSendReport(config: ReportConfig, now: Date): boolean {
  // Verificar se está ativo
  if (!config.is_active) {
    console.log(`❌ Config ${config.id} está inativa`);
    return false;
  }

  // Converter para horário de Brasília (UTC-3)
  const brasiliaTime = new Date(now.toLocaleString('en-US', { timeZone: 'America/Sao_Paulo' }));
  
  // Obter hora atual em formato HH:MM
  const currentTime = `${brasiliaTime.getHours().toString().padStart(2, '0')}:${brasiliaTime.getMinutes().toString().padStart(2, '0')}`;
  const [configHour, configMinute] = config.send_time.split(':').map(Number);
  const [currentHour, currentMinute] = currentTime.split(':').map(Number);

  // Verificar se está dentro da janela de 10 minutos do horário configurado
  const configTimeInMinutes = configHour * 60 + configMinute;
  const currentTimeInMinutes = currentHour * 60 + currentMinute;
  const diffMinutes = Math.abs(currentTimeInMinutes - configTimeInMinutes);

  if (diffMinutes > 10) {
    console.log(`⏰ Fora da janela de tempo. Config: ${config.send_time}, Atual: ${currentTime}`);
    return false;
  }

  const today = getDayOfWeek(now);
  const dayOfMonth = now.getDate();

  switch (config.frequency) {
    case 'daily':
      console.log(`✅ Envio diário aprovado para ${config.email}`);
      return true;

    case 'weekly':
      // Enviar toda segunda-feira
      const shouldSendWeekly = today === 'monday';
      console.log(`${shouldSendWeekly ? '✅' : '❌'} Envio semanal. Hoje: ${today}`);
      return shouldSendWeekly;

    case 'monthly':
      // Enviar no primeiro dia do mês
      const shouldSendMonthly = dayOfMonth === 1;
      console.log(`${shouldSendMonthly ? '✅' : '❌'} Envio mensal. Dia: ${dayOfMonth}`);
      return shouldSendMonthly;

    case 'custom':
      if (!config.custom_days || config.custom_days.length === 0) {
        console.log(`❌ Frequência personalizada sem dias configurados`);
        return false;
      }
      const shouldSendCustom = config.custom_days.includes(today);
      console.log(`${shouldSendCustom ? '✅' : '❌'} Envio personalizado. Hoje: ${today}, Dias configurados: ${config.custom_days.join(', ')}`);
      return shouldSendCustom;

    default:
      console.log(`❌ Frequência desconhecida: ${config.frequency}`);
      return false;
  }
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('🕐 Iniciando verificação de relatórios agendados...');
    
    const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    const now = new Date();
    const brasiliaTime = new Date(now.toLocaleString('en-US', { timeZone: 'America/Sao_Paulo' }));
    
    console.log(`📅 Data/hora UTC: ${now.toISOString()}`);
    console.log(`📅 Data/hora Brasília: ${brasiliaTime.toLocaleString('pt-BR')} (${getDayOfWeek(brasiliaTime)})`);

    // Buscar todas as configurações ativas
    const { data: configs, error: configError } = await supabaseAdmin
      .from('email_reports_config')
      .select('*')
      .eq('is_active', true);

    if (configError) {
      console.error('❌ Erro ao buscar configurações:', configError);
      throw configError;
    }

    if (!configs || configs.length === 0) {
      console.log('ℹ️ Nenhuma configuração ativa encontrada');
      return new Response(
        JSON.stringify({ message: 'Nenhuma configuração ativa encontrada' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`📋 ${configs.length} configurações ativas encontradas`);

    // Verificar quais relatórios devem ser enviados agora
    const reportsToSend = configs.filter((config: ReportConfig) => 
      shouldSendReport(config, now)
    );

    console.log(`📨 ${reportsToSend.length} relatórios devem ser enviados agora`);

    if (reportsToSend.length === 0) {
      return new Response(
        JSON.stringify({ 
          message: 'Nenhum relatório para enviar neste momento',
          checked: configs.length 
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Enviar cada relatório
    const results = [];
    for (const config of reportsToSend) {
      console.log(`📧 Enviando relatório para ${config.email}...`);
      
      try {
        // Chamar a função de envio manual de relatórios
        const { data, error } = await supabaseAdmin.functions.invoke('send-manual-report', {
          body: { 
            configId: config.id,
            isScheduled: true 
          }
        });

        if (error) {
          console.error(`❌ Erro ao enviar para ${config.email}:`, error);
          
          // Registrar erro no log
          await supabaseAdmin.from('email_reports_log').insert({
            config_id: config.id,
            email: config.email,
            status: 'failed',
            error_message: error.message || 'Erro desconhecido',
            report_date: now.toISOString().split('T')[0],
            report_type: config.frequency,
            is_scheduled: true,
          });

          results.push({
            email: config.email,
            status: 'failed',
            error: error.message
          });
        } else {
          console.log(`✅ Relatório enviado com sucesso para ${config.email}`);
          results.push({
            email: config.email,
            status: 'success'
          });
        }
      } catch (error: any) {
        console.error(`❌ Erro ao processar ${config.email}:`, error);
        results.push({
          email: config.email,
          status: 'failed',
          error: error.message
        });
      }
    }

    const successCount = results.filter(r => r.status === 'success').length;
    const failCount = results.filter(r => r.status === 'failed').length;

    console.log(`✅ Processamento concluído: ${successCount} sucessos, ${failCount} falhas`);

    return new Response(
      JSON.stringify({
        message: 'Processamento concluído',
        totalChecked: configs.length,
        totalSent: reportsToSend.length,
        successCount,
        failCount,
        results
      }),
      { 
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );

  } catch (error: any) {
    console.error('❌ Erro no handler:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
};

serve(handler);
