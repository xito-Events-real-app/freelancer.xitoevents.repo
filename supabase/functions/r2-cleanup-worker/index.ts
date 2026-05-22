// Drains rows from r2_deletion_queue. Admin-callable or cron-callable.
// Idempotent: 404 from R2 is treated as success.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const PUBLIC_URL_ENV: Record<string, string> = {
  "venue-xitoevents": "R2_VENUE_PUBLIC_URL",
  "freelancer-xitoevents": "R2_PUBLIC_URL",
};

async function signRequest(
  method: string, url: URL, headers: Record<string, string>,
  accessKeyId: string, secretAccessKey: string, region = "auto"
) {
  const service = "s3";
  const now = new Date();
  const dateStamp = now.toISOString().replace(/[-:]/g, "").split(".")[0] + "Z";
  const shortDate = dateStamp.slice(0, 8);
  const payloadHash = "UNSIGNED-PAYLOAD";
  const signedHeaders = Object.keys(headers).map(k => k.toLowerCase()).sort().join(";");
  const canonicalHeaders = Object.keys(headers).sort((a,b)=>a.toLowerCase().localeCompare(b.toLowerCase()))
    .map(k => `${k.toLowerCase()}:${headers[k].trim()}`).join("\n");
  const canonicalRequest = [method, url.pathname, url.search.replace("?",""), canonicalHeaders+"\n", signedHeaders, payloadHash].join("\n");
  const credentialScope = `${shortDate}/${region}/${service}/aws4_request`;
  const stringToSign = [
    "AWS4-HMAC-SHA256", dateStamp, credentialScope,
    Array.from(new Uint8Array(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(canonicalRequest))))
      .map(b => b.toString(16).padStart(2,"0")).join(""),
  ].join("\n");
  const enc = new TextEncoder();
  let key = await crypto.subtle.importKey("raw", enc.encode("AWS4"+secretAccessKey), {name:"HMAC",hash:"SHA-256"}, false, ["sign"]);
  for (const msg of [shortDate, region, service, "aws4_request"]) {
    const sig = await crypto.subtle.sign("HMAC", key, enc.encode(msg));
    key = await crypto.subtle.importKey("raw", sig, {name:"HMAC",hash:"SHA-256"}, false, ["sign"]);
  }
  const signature = Array.from(new Uint8Array(await crypto.subtle.sign("HMAC", key, enc.encode(stringToSign))))
    .map(b => b.toString(16).padStart(2,"0")).join("");
  return `AWS4-HMAC-SHA256 Credential=${accessKeyId}/${credentialScope}, SignedHeaders=${signedHeaders}, Signature=${signature}`;
}

async function deleteFromR2(accountId: string, accessKeyId: string, secretAccessKey: string, bucket: string, key: string) {
  const url = new URL(`https://${accountId}.r2.cloudflarestorage.com/${bucket}/${key}`);
  const dateStamp = new Date().toISOString().replace(/[-:]/g,"").split(".")[0] + "Z";
  const headers = { host: url.host, "x-amz-content-sha256": "UNSIGNED-PAYLOAD", "x-amz-date": dateStamp } as Record<string,string>;
  const auth = await signRequest("DELETE", url, headers, accessKeyId, secretAccessKey);
  const res = await fetch(url.toString(), { method:"DELETE", headers: { ...headers, Authorization: auth } });
  if (!res.ok && res.status !== 404) {
    const text = await res.text();
    throw new Error(`R2 delete ${res.status}: ${text}`);
  }
  await res.text();
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  const json = (s:number,b:unknown)=>new Response(JSON.stringify(b),{status:s,headers:{...corsHeaders,"Content-Type":"application/json"}});

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const admin = createClient(supabaseUrl, serviceKey);

    // Auth: either admin user OR matching anon key from cron
    const authHeader = req.headers.get("Authorization") || "";
    const apiKey = req.headers.get("apikey") || "";
    let authorized = false;
    if (authHeader) {
      const userClient = createClient(supabaseUrl, Deno.env.get("SUPABASE_ANON_KEY")!, {
        global: { headers: { Authorization: authHeader } },
      });
      const { data: { user } } = await userClient.auth.getUser();
      if (user) {
        const { data: isAdmin } = await admin.rpc("has_role", { _user_id: user.id, _role: "admin" });
        if (isAdmin) authorized = true;
      }
    }
    // Allow cron (apikey == anon key, no user)
    if (!authorized && apiKey && apiKey === Deno.env.get("SUPABASE_ANON_KEY")) {
      authorized = true;
    }
    if (!authorized) return json(403, { error: "Forbidden" });

    const accountId = Deno.env.get("R2_ACCOUNT_ID")!;
    const accessKeyId = Deno.env.get("R2_ACCESS_KEY_ID")!;
    const secretAccessKey = Deno.env.get("R2_SECRET_ACCESS_KEY")!;

    const { data: rows, error } = await admin
      .from("r2_deletion_queue")
      .select("id, bucket, r2_key, attempts")
      .lt("attempts", 5)
      .order("created_at", { ascending: true })
      .limit(50);
    if (error) return json(500, { error: error.message });

    let processed = 0, failed = 0;
    for (const row of rows ?? []) {
      try {
        await deleteFromR2(accountId, accessKeyId, secretAccessKey, row.bucket, row.r2_key);
        await admin.from("r2_deletion_queue").delete().eq("id", row.id);
        processed++;
      } catch (e) {
        failed++;
        const msg = e instanceof Error ? e.message : String(e);
        await admin.from("r2_deletion_queue").update({
          attempts: (row.attempts ?? 0) + 1,
          last_error: msg.slice(0, 500),
          last_attempt_at: new Date().toISOString(),
        }).eq("id", row.id);
      }
    }
    return json(200, { processed, failed, scanned: rows?.length ?? 0 });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return json(500, { error: msg });
  }
});
