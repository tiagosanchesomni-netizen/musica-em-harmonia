import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

Deno.serve(async (req) => {
  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );

  const { data, error } = await supabase.auth.admin.createUser({
    email: "1999tiagosanches@gmail.com",
    password: "grt",
    email_confirm: true,
    user_metadata: { name: "Tiago Sanches", role: "admin" },
  });

  if (error) return new Response(JSON.stringify({ error: error.message }), { status: 400 });
  return new Response(JSON.stringify({ user: data.user?.id }), { status: 200 });
});
