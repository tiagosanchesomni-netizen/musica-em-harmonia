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

    const { email, new_password } = await req.json();
    if (!email || !new_password || new_password.length < 8) {
      return new Response(JSON.stringify({ error: "Campos inválidos" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Get the user ID from app_profiles
    const { data: profile, error: profileErr } = await supabaseAdmin
      .from("app_profiles")
      .select("auth_user_id")
      .eq("email", email)
      .single();

    if (profileErr || !profile?.auth_user_id) {
      return new Response(JSON.stringify({ error: "Utilizador não encontrado" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Update the password in auth.users using the admin API
    const { error: updateAuthErr } = await supabaseAdmin.auth.admin.updateUserById(
      profile.auth_user_id,
      { password: new_password }
    );

    if (updateAuthErr) throw updateAuthErr;

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
