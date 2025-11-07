import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { Resend } from "npm:resend@4.0.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface NotifyVendorRequest {
  lead_id: string;
  vendor_id: string;
  vendor_name: string;
  vendor_email: string;
  lead_client_name: string;
  sdr_name: string;
}

const handler = async (req: Request): Promise<Response> => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Initialize Supabase client
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const {
      lead_id,
      vendor_id,
      vendor_name,
      vendor_email,
      lead_client_name,
      sdr_name,
    }: NotifyVendorRequest = await req.json();

    console.log("Notificando vendedor:", {
      vendor_name,
      lead_client_name,
      sdr_name,
    });

    // Criar notificação no banco
    const { error: notificationError } = await supabase
      .from("vendor_notifications")
      .insert([
        {
          vendor_id,
          vendor_name,
          lead_id,
          lead_client_name,
          sdr_name,
          message: `Novo lead encaminhado: ${lead_client_name} por ${sdr_name}`,
        },
      ]);

    if (notificationError) {
      console.error("Erro ao criar notificação:", notificationError);
      throw notificationError;
    }

    // Enviar email de notificação
    const resend = new Resend(Deno.env.get("RESEND_API_KEY"));
    
    const emailResponse = await resend.emails.send({
      from: "Global Aço <noreply@globalaco.com.br>",
      to: [vendor_email],
      subject: `Novo Lead Encaminhado: ${lead_client_name}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #2563eb;">Novo Lead Encaminhado</h2>
          <p>Olá ${vendor_name},</p>
          <p>Um novo lead foi encaminhado para você:</p>
          
          <div style="background-color: #f3f4f6; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <h3 style="margin-top: 0; color: #374151;">Detalhes do Lead</h3>
            <p><strong>Cliente:</strong> ${lead_client_name}</p>
            <p><strong>Encaminhado por:</strong> ${sdr_name}</p>
            <p><strong>Data:</strong> ${new Date().toLocaleDateString('pt-BR')}</p>
          </div>
          
          <p>Acesse o sistema para visualizar todos os detalhes e dar continuidade ao atendimento.</p>
          
          <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #e5e7eb;">
            <p style="color: #6b7280; font-size: 14px;">
              Esta é uma notificação automática do sistema Global Aço.
            </p>
          </div>
        </div>
      `,
    });

    console.log("Email enviado:", emailResponse);

    return new Response(
      JSON.stringify({
        success: true,
        notification_created: true,
        email_sent: true,
      }),
      {
        status: 200,
        headers: {
          "Content-Type": "application/json",
          ...corsHeaders,
        },
      }
    );
  } catch (error: any) {
    console.error("Erro na função notify-vendor-lead:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
};

serve(handler);