import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { S3Client, PutObjectCommand, DeleteObjectCommand } from "https://esm.sh/@aws-sdk/client-s3@3.535.0";
import { getSignedUrl } from "https://esm.sh/@aws-sdk/s3-request-presigner@3.535.0";

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

    const accessKeyId = Deno.env.get("R2_ACCESS_KEY_ID");
    const secretAccessKey = Deno.env.get("R2_SECRET_ACCESS_KEY");
    const endpoint = Deno.env.get("R2_ENDPOINT");
    const bucket = Deno.env.get("R2_BUCKET_NAME");
    const publicUrl = Deno.env.get("R2_PUBLIC_URL");

    if (!accessKeyId || !secretAccessKey || !endpoint || !bucket) {
      return new Response(
        JSON.stringify({
          error: "Cloudflare R2 credentials not configured",
          fallback: true,
        }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const body = await req.json();
    const { action, filename, contentType, fileUrl } = body;

    const s3 = new S3Client({
      region: "auto",
      endpoint: endpoint,
      credentials: {
        accessKeyId: accessKeyId,
        secretAccessKey: secretAccessKey,
      },
    });

    if (action === "delete") {
      if (!fileUrl || fileUrl === "#" || fileUrl.startsWith("blob:")) {
        return new Response(
          JSON.stringify({ success: true, message: "No remote R2 file to delete" }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const key = fileUrl.split("/").pop();
      if (!key) {
        throw new Error("Invalid file URL format");
      }

      const command = new DeleteObjectCommand({
        Bucket: bucket,
        Key: key,
      });

      await s3.send(command);

      return new Response(
        JSON.stringify({
          success: true,
          message: "Object deleted successfully from R2",
        }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Default action: upload presigned url
    if (!filename || !contentType) {
      return new Response(JSON.stringify({ error: "Missing filename or contentType" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const key = `${Date.now()}-${filename}`;
    const command = new PutObjectCommand({
      Bucket: bucket,
      Key: key,
      ContentType: contentType,
    });

    const uploadUrl = await getSignedUrl(s3, command, { expiresIn: 900 });
    const basePublicUrl = publicUrl ? publicUrl.replace(/\/$/, "") : "";
    const fileUrlResult = `${basePublicUrl}/${key}`;

    return new Response(
      JSON.stringify({
        uploadUrl,
        fileUrl: fileUrlResult,
        fallback: false,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
