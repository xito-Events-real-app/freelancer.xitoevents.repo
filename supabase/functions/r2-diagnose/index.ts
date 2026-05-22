// Temporary diagnostic for R2 credential / permission issues.
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

async function sign(method: string, url: URL, headers: Record<string, string>, accessKeyId: string, secretAccessKey: string) {
  const service = "s3";
  const region = "auto";
  const now = new Date();
  const dateStamp = now.toISOString().replace(/[-:]/g, "").split(".")[0] + "Z";
  const shortDate = dateStamp.slice(0, 8);

  headers["x-amz-date"] = dateStamp;
  headers["x-amz-content-sha256"] = "UNSIGNED-PAYLOAD";
  headers["host"] = url.host;

  const signedHeaders = Object.keys(headers).map((k) => k.toLowerCase()).sort().join(";");
  const canonicalHeaders = Object.keys(headers).sort((a, b) => a.toLowerCase().localeCompare(b.toLowerCase())).map((k) => `${k.toLowerCase()}:${headers[k].trim()}`).join("\n");

  const canonicalRequest = [method, url.pathname, url.search.replace("?", ""), canonicalHeaders + "\n", signedHeaders, "UNSIGNED-PAYLOAD"].join("\n");
  const credentialScope = `${shortDate}/${region}/${service}/aws4_request`;
  const enc = new TextEncoder();
  const hash = (s: string) => crypto.subtle.digest("SHA-256", enc.encode(s)).then((b) => Array.from(new Uint8Array(b)).map((x) => x.toString(16).padStart(2, "0")).join(""));
  const stringToSign = ["AWS4-HMAC-SHA256", dateStamp, credentialScope, await hash(canonicalRequest)].join("\n");

  let key: CryptoKey = await crypto.subtle.importKey("raw", enc.encode("AWS4" + secretAccessKey), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  for (const msg of [shortDate, region, service, "aws4_request"]) {
    const sig = await crypto.subtle.sign("HMAC", key, enc.encode(msg));
    key = await crypto.subtle.importKey("raw", sig, { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  }
  const signature = Array.from(new Uint8Array(await crypto.subtle.sign("HMAC", key, enc.encode(stringToSign)))).map((b) => b.toString(16).padStart(2, "0")).join("");
  return `AWS4-HMAC-SHA256 Credential=${accessKeyId}/${credentialScope}, SignedHeaders=${signedHeaders}, Signature=${signature}`;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const accountId = (Deno.env.get("R2_ACCOUNT_ID") || "").trim();
  const accessKeyId = (Deno.env.get("R2_ACCESS_KEY_ID") || "").trim();
  const secretAccessKey = (Deno.env.get("R2_SECRET_ACCESS_KEY") || "").trim();
  const publicUrl = (Deno.env.get("R2_PUBLIC_URL") || "").trim();
  const bucket = new URL(req.url).searchParams.get("bucket") || "freelancer-xitoevents";

  const out: Record<string, unknown> = {
    account_id_length: accountId.length,
    account_id_prefix: accountId.slice(0, 4),
    access_key_id_length: accessKeyId.length,
    access_key_id_prefix: accessKeyId.slice(0, 4),
    secret_length: secretAccessKey.length,
    public_url: publicUrl,
    bucket,
  };

  // Test 1: List buckets (account-level)
  try {
    const url = new URL(`https://${accountId}.r2.cloudflarestorage.com/`);
    const headers: Record<string, string> = {};
    const auth = await sign("GET", url, headers, accessKeyId, secretAccessKey);
    const res = await fetch(url, { method: "GET", headers: { ...headers, Authorization: auth } });
    const text = await res.text();
    out.list_buckets_status = res.status;
    out.list_buckets_body = text.slice(0, 800);
  } catch (e) {
    out.list_buckets_error = String(e);
  }

  // Test 2: HEAD the bucket
  try {
    const url = new URL(`https://${accountId}.r2.cloudflarestorage.com/${bucket}`);
    const headers: Record<string, string> = {};
    const auth = await sign("HEAD", url, headers, accessKeyId, secretAccessKey);
    const res = await fetch(url, { method: "HEAD", headers: { ...headers, Authorization: auth } });
    out.head_bucket_status = res.status;
    await res.text();
  } catch (e) {
    out.head_bucket_error = String(e);
  }

  // Test 3: PUT a tiny test object
  try {
    const url = new URL(`https://${accountId}.r2.cloudflarestorage.com/${bucket}/_diagnose/test.txt`);
    const headers: Record<string, string> = { "content-type": "text/plain" };
    const auth = await sign("PUT", url, headers, accessKeyId, secretAccessKey);
    const res = await fetch(url, { method: "PUT", headers: { ...headers, Authorization: auth }, body: "hello" });
    const text = await res.text();
    out.put_status = res.status;
    out.put_body = text.slice(0, 800);
  } catch (e) {
    out.put_error = String(e);
  }

  return new Response(JSON.stringify(out, null, 2), {
    status: 200,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
});
