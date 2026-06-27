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

    // Verify caller is authenticated
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Não autorizado" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const token = authHeader.replace("Bearer ", "");
    const { data: { user: caller } } = await supabaseAdmin.auth.getUser(token);
    if (!caller) {
      return new Response(JSON.stringify({ error: "Não autorizado" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // Check caller role directly from app_profiles table
    const { data: callerProfile } = await supabaseAdmin
      .from("app_profiles")
      .select("role")
      .eq("auth_user_id", caller.id)
      .single();

    if (!callerProfile || callerProfile.role !== "admin") {
      return new Response(JSON.stringify({ error: "Apenas administradores podem criar utilizadores" }), { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const { email, password, name, role } = await req.json();
    if (!email || !password || password.length < 6 || !name || !role) {
      return new Response(JSON.stringify({ error: "Campos obrigatórios em falta" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // Map role from English to Portuguese for app_profiles
    const roleMap: Record<string, string> = {
      student: "aluno",
      teacher: "professor",
      admin: "admin",
    };
    const appRole = roleMap[role] || role;

    // Create auth user (does NOT affect caller session)
    const { data: newUser, error: createError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { name, role: appRole },
    });
    if (createError) throw createError;

    // The provisional key is the same as the password passed in
    const chaveProvisoria = password;

    // Create app_profiles row for the new user
    const { error: profileError } = await supabaseAdmin
      .from("app_profiles")
      .insert({
        id: newUser.user.id,
        auth_user_id: newUser.user.id,
        nome: name,
        email: email,
        role: appRole,
        primeiro_acesso: true,
        chave_provisoria: chaveProvisoria,
      });

    if (profileError) {
      // Rollback: delete auth user if profile insert fails
      await supabaseAdmin.auth.admin.deleteUser(newUser.user.id);
      throw profileError;
    }

    return new Response(JSON.stringify({ success: true, user_id: newUser.user.id }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
