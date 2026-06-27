import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const BREVO_API_KEY = Deno.env.get("BREVO_API_KEY")!;
const FROM_NAME = "Escola de Música GRT";
const FROM_EMAIL = "tiagosanchesomni@gmail.com";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey);

    // Verify caller is authenticated
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Não autorizado" }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const token = authHeader.replace("Bearer ", "");
    const { data: { user: caller } } = await supabaseAdmin.auth.getUser(token);
    if (!caller) {
      return new Response(JSON.stringify({ error: "Sessão inválida" }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { action, new_email } = await req.json();

    if (action === "change-email") {
      if (!new_email) {
        return new Response(JSON.stringify({ error: "Novo email em falta" }), {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Update email in Auth (instantly confirmed)
      const { error: updateAuthErr } = await supabaseAdmin.auth.admin.updateUserById(caller.id, {
        email: new_email,
        email_confirm: true,
      });

      if (updateAuthErr) {
        let msg = updateAuthErr.message;
        if (msg.includes("already registered") || msg.includes("already exists")) {
          msg = "Este email já se encontra registado noutra conta.";
        }
        return new Response(JSON.stringify({ error: msg }), {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Update app_profiles
      const { error: profileErr } = await supabaseAdmin
        .from("app_profiles")
        .update({ email: new_email })
        .eq("auth_user_id", caller.id);

      if (profileErr) {
        return new Response(JSON.stringify({ error: profileErr.message }), {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    } 
    
    else if (action === "request-provisional-pass") {
      const tempPass = Math.random().toString(36).slice(2, 8).toUpperCase();

      // 1. Update user password in Auth
      const { error: updateAuthErr } = await supabaseAdmin.auth.admin.updateUserById(caller.id, {
        password: tempPass,
      });

      if (updateAuthErr) {
        return new Response(JSON.stringify({ error: updateAuthErr.message }), {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // 2. Set primeiro_acesso = true, chave_provisoria = tempPass in app_profiles
      const { error: profileErr } = await supabaseAdmin
        .from("app_profiles")
        .update({
          primeiro_acesso: true,
          chave_provisoria: tempPass,
        })
        .eq("auth_user_id", caller.id);

      if (profileErr) {
        return new Response(JSON.stringify({ error: profileErr.message }), {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // 3. Send email to user with the new provisional key using Brevo
      const emailSubject = "🔑 Escola de Música GRT — Nova Palavra-passe Provisória";
      const emailHtml = `
        <div style="font-family: Arial, sans-serif; max-width: 480px; margin: 0 auto; background: #f9fafb; padding: 32px; border-radius: 12px;">
          <div style="text-align: center; margin-bottom: 24px;">
            <h1 style="color: #1e1b4b; font-size: 22px; margin: 0;">🎵 Escola de Música GRT</h1>
            <p style="color: #6b7280; margin: 8px 0 0;">Pedido de Nova Palavra-passe</p>
          </div>
          <div style="background: white; border-radius: 8px; padding: 24px; border: 1px solid #e5e7eb;">
            <p style="color: #374151; margin: 0 0 16px;">Como solicitado, foi gerada uma nova palavra-passe provisória para a sua conta:</p>
            <div style="text-align: center; background: #f3f4f6; border-radius: 8px; padding: 20px; margin: 16px 0;">
              <span style="font-size: 30px; font-weight: bold; letter-spacing: 4px; color: #dc2626; font-family: monospace;">${tempPass}</span>
            </div>
            <p style="color: #374151; margin: 0 0 16px;">
              Ao iniciar sessão com esta chave, ser-lhe-á solicitado que configure uma palavra-passe definitiva.
            </p>
            <p style="color: #6b7280; font-size: 13px; margin: 0;">Se não solicitou esta redefinição, contacte a administração de imediato.</p>
          </div>
          <p style="color: #9ca3af; font-size: 12px; text-align: center; margin-top: 24px;">Escola de Música GRT — Sistema de Gestão</p>
        </div>
      `;

      try {
        const mailRes = await fetch("https://api.brevo.com/v3/smtp/email", {
          method: "POST",
          headers: {
            "api-key": BREVO_API_KEY,
            "Content-Type": "application/json",
            "Accept": "application/json",
          },
          body: JSON.stringify({
            sender: { name: FROM_NAME, email: FROM_EMAIL },
            to: [{ email: caller.email }],
            subject: emailSubject,
            htmlContent: emailHtml,
          }),
        });

        if (!mailRes.ok) {
          const mailErrData = await mailRes.json();
          console.warn("Falha ao enviar email via Brevo:", mailErrData);
        }
      } catch (mailErr) {
        console.error("Erro na ligação ao Brevo:", mailErr);
      }

      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ error: "Ação inválida" }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message || err }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
