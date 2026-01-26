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
  
  // Obter hora e minuto atuais
  const currentHour = brasiliaTime.getHours();
  const currentMinute = brasiliaTime.getMinutes();
  const [configHour, configMinute] = config.send_time.split(':').map(Number);

  // Calcular minutos desde meia-noite para comparação
  const currentTotalMinutes = currentHour * 60 + currentMinute;
  const configTotalMinutes = configHour * 60 + configMinute;
  
  // Janela de tolerância: aceitar envio até 10 minutos APÓS o horário configurado
  // Isso resolve o problema de cold starts do serverless que atrasam 1-3 minutos
  const minutesDiff = currentTotalMinutes - configTotalMinutes;
  
  if (minutesDiff < 0 || minutesDiff > 10) {
    console.log(
      `⏰ Fora da janela de envio. Config: ${config.send_time}, Atual: ${currentHour.toString().padStart(2, '0')}:${currentMinute.toString().padStart(2, '0')} (diff: ${minutesDiff} min)`
    );
    return false;
  }
  
  console.log(`✅ Dentro da janela de envio (${minutesDiff} min após ${config.send_time})`);
  

  // Usar dia baseado no horário de Brasília para evitar inconsistências perto da virada do dia (UTC)
  const today = getDayOfWeek(brasiliaTime);
  const dayOfMonth = brasiliaTime.getDate();

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
      console.log(`📧 Verificando envio para ${config.email}...`);
      
      try {
        // CORREÇÃO: Usar formato correto para data de Brasília
        const todayStr = `${brasiliaTime.getFullYear()}-${String(brasiliaTime.getMonth() + 1).padStart(2, '0')}-${String(brasiliaTime.getDate()).padStart(2, '0')}`;
        console.log(`📅 Data de referência para verificação: ${todayStr}`);
        
        // Lock otimista para evitar envios duplicados (ex.: múltiplos agendadores)
        // Criamos 1 registro por dia (config_id + report_date + is_scheduled=true).
        // Se já existir, pulamos o envio.
        const { data: lockRow, error: lockError } = await supabaseAdmin
          .from('email_reports_log')
          .insert({
            config_id: config.id,
            email: config.email,
            status: 'pending',
            report_date: todayStr,
            report_type: config.frequency,
            is_scheduled: true,
          })
          .select('id')
          .single();

        if (lockError) {
          // Já existe registro para hoje (pending/success/failed) => não enviar novamente
          if (lockError.code === '23505') {
            console.log(`ℹ️ Relatório já em processamento ou enviado hoje para ${config.email}. Pulando...`);
            results.push({
              email: config.email,
              status: 'skipped',
              reason: 'already_processing_or_sent',
            });
            continue;
          }

          // Qualquer outro erro no lock é crítico: não enviar para evitar duplicidade sem controle.
          console.error('❌ Erro ao criar lock (abortando envio):', lockError);
          results.push({
            email: config.email,
            status: 'failed',
            error: `Erro ao criar lock: ${lockError.message ?? 'desconhecido'}`,
          });
          continue;
        }

        console.log(`📧 Enviando relatório para ${config.email}...`);
        
        // Chamar a função de envio manual de relatórios
        const { data, error } = await supabaseAdmin.functions.invoke('send-manual-report', {
          body: { 
            configId: config.id,
            isScheduled: true,
            skipLog: true,
          }
        });

        if (error) {
          console.error(`❌ Erro ao enviar para ${config.email}:`, error);
          
          // Atualizar registro de pending para failed
          await supabaseAdmin
            .from('email_reports_log')
            .update({
              status: 'failed',
              error_message: error.message || 'Erro desconhecido',
              sent_at: new Date().toISOString(),
            })
            .eq('id', lockRow?.id);

          results.push({
            email: config.email,
            status: 'failed',
            error: error.message
          });
        } else {
          console.log(`✅ Relatório enviado com sucesso para ${config.email}`);

          // Marcar o lock como sucesso (não deletar; ele é o registro único do dia)
          await supabaseAdmin
            .from('email_reports_log')
            .update({
              status: 'success',
              error_message: null,
              sent_at: new Date().toISOString(),
            })
            .eq('id', lockRow?.id);
          
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
