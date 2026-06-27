import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey);

    // Verify caller is authenticated (must be logged in with provisional credentials)
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Não autorizado" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const token = authHeader.replace("Bearer ", "");
    const { data: { user: caller } } = await supabaseAdmin.auth.getUser(token);
    if (!caller) {
      return new Response(JSON.stringify({ error: "Sessão inválida" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { new_email, new_password } = await req.json();
    if (!new_email || !new_password || new_password.length < 8) {
      return new Response(JSON.stringify({ error: "Campos inválidos" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Use admin API to update email + password WITHOUT sending confirmation emails
    const { error: updateAuthErr } = await supabaseAdmin.auth.admin.updateUserById(caller.id, {
      email: new_email,
      password: new_password,
      email_confirm: true, // mark as confirmed immediately
    });

    if (updateAuthErr) throw updateAuthErr;

    // Update app_profiles: set real email, clear primeiro_acesso flag
    const { error: profileErr } = await supabaseAdmin
      .from("app_profiles")
      .update({
        email: new_email,
        primeiro_acesso: false,
        chave_provisoria: null,
      })
      .eq("auth_user_id", caller.id);

    if (profileErr) throw profileErr;

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
