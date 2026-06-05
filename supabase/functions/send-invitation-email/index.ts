import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "https://esm.sh/resend@2.0.0";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface InvitationEmailRequest {
  email: string;
  role: string;
  inviterName: string;
  inviteToken?: string;
  customMessage?: string;
}

const createEmailTemplate = (email: string, role: string, inviterName: string, customMessage?: string) => {
  const roleTranslations: Record<string, string> = {
    'admin': 'Administrador',
    'comercial': 'Comercial',
    'operacional': 'Operacional',
    'visitante': 'Visitante'
  };

  const translatedRole = roleTranslations[role] || role;
  const signupUrl = `https://globalaco-ferramentas.lovable.app/auth`;

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Convite para o Sistema</title>
    </head>
    <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Oxygen', 'Ubuntu', 'Cantarell', 'Fira Sans', 'Droid Sans', 'Helvetica Neue', sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
      <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; border-radius: 10px; text-align: center; margin-bottom: 30px;">
        <img src="https://globinho.vercel.app/logo-global-aco.png" alt="Global Aço" style="height:50px;margin-bottom:12px;" />
        <h1 style="color: white; margin: 0; font-size: 28px; font-weight: bold;">
          Você foi convidado!
        </h1>
        <p style="color: rgba(255,255,255,0.9); margin: 10px 0 0 0; font-size: 16px;">
          Para acessar nosso sistema
        </p>
      </div>

      <div style="background: #f8f9fa; padding: 30px; border-radius: 10px; margin-bottom: 30px;">
        <h2 style="color: #333; margin-top: 0;">Olá!</h2>
        <p style="font-size: 16px; margin-bottom: 20px;">
          <strong>${inviterName}</strong> convidou você para participar do nosso sistema com o perfil de <strong>${translatedRole}</strong>.
        </p>
        
        ${customMessage ? `
          <div style="background: #e3f2fd; padding: 15px; border-radius: 8px; border-left: 4px solid #2196f3; margin: 20px 0;">
            <h4 style="margin: 0 0 10px 0; color: #1976d2;">Mensagem personalizada:</h4>
            <p style="margin: 0; font-style: italic;">${customMessage}</p>
          </div>
        ` : ''}

        <div style="text-align: center; margin: 30px 0;">
          <a href="${signupUrl}" style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 15px 30px; text-decoration: none; border-radius: 8px; font-weight: bold; font-size: 16px; display: inline-block; box-shadow: 0 4px 15px rgba(102, 126, 234, 0.4);">
            Aceitar Convite
          </a>
        </div>
      </div>

      <div style="background: #fff; border: 1px solid #e0e0e0; padding: 20px; border-radius: 8px; margin-bottom: 20px;">
        <h3 style="color: #333; margin-top: 0;">Detalhes do Convite</h3>
        <ul style="margin: 0; padding-left: 20px;">
          <li><strong>Email:</strong> ${email}</li>
          <li><strong>Perfil:</strong> ${translatedRole}</li>
          <li><strong>Convidado por:</strong> ${inviterName}</li>
          <li><strong>Validade:</strong> 7 dias</li>
        </ul>
      </div>

      <div style="background: #fff3cd; border: 1px solid #ffeaa7; padding: 15px; border-radius: 8px; margin-bottom: 20px;">
        <p style="margin: 0; font-size: 14px; color: #856404;">
          <strong>⚠️ Importante:</strong> Este convite expira em 7 dias. Se você não conseguir acessar o link, entre em contato com ${inviterName}.
        </p>
      </div>

      <div style="text-align: center; padding: 20px 0; border-top: 1px solid #e0e0e0; color: #666; font-size: 14px;">
        <p>Este é um email automático. Por favor, não responda.</p>
        <p>Se você não esperava este convite, pode ignorar este email com segurança.</p>
      </div>
    </body>
    </html>
  `;
};

const handler = async (req: Request): Promise<Response> => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return new Response(
      JSON.stringify({ error: "Method not allowed" }),
      { 
        status: 405, 
        headers: { ...corsHeaders, "Content-Type": "application/json" } 
      }
    );
  }

  try {
    const { email, role, inviterName, customMessage }: InvitationEmailRequest = await req.json();

    console.log(`Sending invitation email to: ${email}, role: ${role}, inviter: ${inviterName}`);

    if (!email || !role || !inviterName) {
      throw new Error("Missing required fields: email, role, or inviterName");
    }

    const htmlContent = createEmailTemplate(email, role, inviterName, customMessage);

    const emailResponse = await resend.emails.send({
      from: "Sistema Global Aço <noreply@resend.dev>",
      to: [email],
      subject: `Convite para acessar o Sistema - Perfil ${role}`,
      html: htmlContent,
    });

    console.log("Email sent successfully:", emailResponse);

    return new Response(
      JSON.stringify({ 
        success: true, 
        emailId: emailResponse.data?.id,
        message: "Convite enviado com sucesso" 
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
    console.error("Error sending invitation email:", error);
    
    return new Response(
      JSON.stringify({ 
        error: "Falha ao enviar email de convite", 
        details: error.message 
      }),
      {
        status: 500,
        headers: { 
          "Content-Type": "application/json", 
          ...corsHeaders 
        },
      }
    );
  }
};

serve(handler);