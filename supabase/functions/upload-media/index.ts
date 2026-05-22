import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

// =====================================================
// Bucket configuration map
// Each bucket has its own public URL and a key-prefix allowlist.
// Adding new buckets in the future = add an entry here.
// =====================================================
type BucketConfig = {
  bucket: string;
  publicUrlEnv: string; // env var name holding the bucket's public base URL
  // returns true if the key is allowed for the given user
  validateKey: (key: string, userId: string) => boolean;
  // returns true if the user has permission to upload to this bucket
  authorize: (ctx: AuthorizeCtx) => Promise<boolean>;
  // optional async key-level check (e.g. venue not soft-deleted)
  validateKeyAsync?: (
    key: string,
    supabaseAdmin: ReturnType<typeof createClient>
  ) => Promise<{ ok: boolean; reason?: string }>;
};

type AuthorizeCtx = {
  userId: string;
  isAdmin: boolean;
};

const BUCKETS: Record<string, BucketConfig> = {
  // Default freelancer bucket - user-scoped paths
  "freelancer-xitoevents": {
    bucket: "freelancer-xitoevents",
    publicUrlEnv: "R2_PUBLIC_URL",
    validateKey: (key, userId) => key.startsWith(`${userId}/`),
    authorize: async () => true,
  },
  // Venue bucket - admin only, keys under venues/{venue_id}/
  "venue-xitoevents": {
    bucket: "venue-xitoevents",
    publicUrlEnv: "R2_VENUE_PUBLIC_URL",
    validateKey: (key) => /^venues\/[0-9a-f-]{36}\/(photos\/[A-Za-z0-9_-]+\.jpg|avatar\.jpg|cover\.jpg)$/.test(key),
    authorize: async ({ isAdmin }) => isAdmin,
    validateKeyAsync: async (key, supabaseAdmin) => {
      const m = key.match(/^venues\/([0-9a-f-]{36})\//);
      if (!m) return { ok: false, reason: "Invalid venue key" };
      const { data, error } = await supabaseAdmin
        .from("xito_venues")
        .select("id, deleted_at")
        .eq("id", m[1])
        .maybeSingle();
      if (error) return { ok: false, reason: error.message };
      if (!data) return { ok: false, reason: "Venue not found" };
      if (data.deleted_at) return { ok: false, reason: "Venue is deleted" };
      return { ok: true };
    },
  },
};

// =====================================================
// S3-compatible signing for Cloudflare R2
// =====================================================
async function signRequest(
  method: string,
  url: URL,
  headers: Record<string, string>,
  body: Uint8Array | null,
  accessKeyId: string,
  secretAccessKey: string,
  region = "auto"
) {
  const service = "s3";
  const now = new Date();
  const dateStamp = now.toISOString().replace(/[-:]/g, "").split(".")[0] + "Z";
  const shortDate = dateStamp.slice(0, 8);

  const payloadHash = body
    ? Array.from(new Uint8Array(await crypto.subtle.digest("SHA-256", body)))
        .map((b) => b.toString(16).padStart(2, "0"))
        .join("")
    : "UNSIGNED-PAYLOAD";

  const signedHeaders = Object.keys(headers)
    .map((k) => k.toLowerCase())
    .sort()
    .join(";");

  const canonicalHeaders = Object.keys(headers)
    .sort((a, b) => a.toLowerCase().localeCompare(b.toLowerCase()))
    .map((k) => `${k.toLowerCase()}:${headers[k].trim()}`)
    .join("\n");

  const canonicalRequest = [
    method,
    url.pathname,
    url.search.replace("?", ""),
    canonicalHeaders + "\n",
    signedHeaders,
    payloadHash,
  ].join("\n");

  const credentialScope = `${shortDate}/${region}/${service}/aws4_request`;

  const stringToSign = [
    "AWS4-HMAC-SHA256",
    dateStamp,
    credentialScope,
    Array.from(
      new Uint8Array(
        await crypto.subtle.digest(
          "SHA-256",
          new TextEncoder().encode(canonicalRequest)
        )
      )
    )
      .map((b) => b.toString(16).padStart(2, "0"))
      .join(""),
  ].join("\n");

  const enc = new TextEncoder();
  let key = await crypto.subtle.importKey(
    "raw",
    enc.encode("AWS4" + secretAccessKey),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );

  for (const msg of [shortDate, region, service, "aws4_request"]) {
    const sig = await crypto.subtle.sign("HMAC", key, enc.encode(msg));
    key = await crypto.subtle.importKey(
      "raw",
      sig,
      { name: "HMAC", hash: "SHA-256" },
      false,
      ["sign"]
    );
  }

  const signature = Array.from(
    new Uint8Array(
      await crypto.subtle.sign("HMAC", key, enc.encode(stringToSign))
    )
  )
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");

  return `AWS4-HMAC-SHA256 Credential=${accessKeyId}/${credentialScope}, SignedHeaders=${signedHeaders}, Signature=${signature}`;
}

async function uploadToR2(
  accountId: string,
  accessKeyId: string,
  secretAccessKey: string,
  bucket: string,
  key: string,
  body: Uint8Array,
  contentType: string
) {
  const url = new URL(`https://${accountId}.r2.cloudflarestorage.com/${bucket}/${key}`);
  const now = new Date();
  const dateStamp = now.toISOString().replace(/[-:]/g, "").split(".")[0] + "Z";
  const headers: Record<string, string> = {
    host: url.host,
    "content-type": contentType,
    "x-amz-content-sha256": "UNSIGNED-PAYLOAD",
    "x-amz-date": dateStamp,
  };
  const auth = await signRequest("PUT", url, headers, null, accessKeyId, secretAccessKey);
  const response = await fetch(url.toString(), {
    method: "PUT",
    headers: { ...headers, Authorization: auth },
    body,
  });
  if (!response.ok) {
    const text = await response.text();
    throw new Error(`R2 upload failed [${response.status}]: ${text}`);
  }
  await response.text();
}

async function deleteFromR2(
  accountId: string,
  accessKeyId: string,
  secretAccessKey: string,
  bucket: string,
  key: string
) {
  const url = new URL(`https://${accountId}.r2.cloudflarestorage.com/${bucket}/${key}`);
  const now = new Date();
  const dateStamp = now.toISOString().replace(/[-:]/g, "").split(".")[0] + "Z";
  const headers: Record<string, string> = {
    host: url.host,
    "x-amz-content-sha256": "UNSIGNED-PAYLOAD",
    "x-amz-date": dateStamp,
  };
  const auth = await signRequest("DELETE", url, headers, null, accessKeyId, secretAccessKey);
  const response = await fetch(url.toString(), {
    method: "DELETE",
    headers: { ...headers, Authorization: auth },
  });
  if (!response.ok && response.status !== 404) {
    const text = await response.text();
    throw new Error(`R2 delete failed [${response.status}]: ${text}`);
  }
  await response.text();
}

function jsonResponse(status: number, body: unknown) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function resolvePublicUrl(envName: string): string {
  let url = (Deno.env.get(envName) || "").trim();
  if (!url) return "";
  if (!url.startsWith("http://") && !url.startsWith("https://")) {
    url = `https://${url}`;
  }
  return url.replace(/\/$/, "");
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return jsonResponse(401, { error: "Missing authorization header" });

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const supabaseAdmin = createClient(supabaseUrl, serviceKey);

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) return jsonResponse(401, { error: "Unauthorized" });

    // Determine admin
    const { data: adminCheck } = await supabaseAdmin.rpc("has_role", {
      _user_id: user.id,
      _role: "admin",
    });
    const isAdmin = !!adminCheck;

    // R2 creds
    const accountId = Deno.env.get("R2_ACCOUNT_ID");
    const accessKeyId = Deno.env.get("R2_ACCESS_KEY_ID");
    const secretAccessKey = Deno.env.get("R2_SECRET_ACCESS_KEY");
    if (!accountId || !accessKeyId || !secretAccessKey) {
      return jsonResponse(500, { error: "R2 credentials not configured" });
    }

    const formData = await req.formData();
    const action = (formData.get("action") as string) || "upload";
    const bucketParam = (formData.get("bucket") as string) || "freelancer-xitoevents";
    const bucketCfg = BUCKETS[bucketParam];
    if (!bucketCfg) return jsonResponse(400, { error: `Unknown bucket: ${bucketParam}` });

    // Authorize bucket access
    const ok = await bucketCfg.authorize({ userId: user.id, isAdmin });
    if (!ok) return jsonResponse(403, { error: "Not authorized for this bucket" });

    const publicUrlBase = resolvePublicUrl(bucketCfg.publicUrlEnv);
    if (!publicUrlBase) return jsonResponse(500, { error: `Missing env ${bucketCfg.publicUrlEnv}` });

    // -------- DELETE --------
    if (action === "delete") {
      const filePath = (formData.get("file_path") as string) || (formData.get("key") as string);
      if (!filePath) return jsonResponse(400, { error: "file_path/key required" });
      if (!bucketCfg.validateKey(filePath, user.id)) {
        return jsonResponse(403, { error: "Key not allowed for this bucket" });
      }
      await deleteFromR2(accountId, accessKeyId, secretAccessKey, bucketCfg.bucket, filePath);
      return jsonResponse(200, { success: true });
    }

    // -------- UPLOAD --------
    const file = formData.get("file") as File | null;
    if (!file) return jsonResponse(400, { error: "No file provided" });

    const maxSize = 20 * 1024 * 1024;
    if (file.size > maxSize) return jsonResponse(400, { error: "File too large (max 20MB)" });

    // ---- Key derivation ----
    let key: string;

    if (bucketCfg.bucket === "venue-xitoevents") {
      // Venue bucket: caller specifies key_prefix (one of)
      //   venues/{uuid}/photos/   -> append {ulid}.jpg
      //   venues/{uuid}/avatar    -> avatar.jpg
      //   venues/{uuid}/cover     -> cover.jpg
      const keyPrefix = (formData.get("key_prefix") as string) || "";
      const photoMatch = keyPrefix.match(/^venues\/([0-9a-f-]{36})\/photos\/?$/);
      const avatarMatch = keyPrefix.match(/^venues\/([0-9a-f-]{36})\/avatar$/);
      const coverMatch = keyPrefix.match(/^venues\/([0-9a-f-]{36})\/cover$/);
      if (photoMatch) {
        const ulid = crypto.randomUUID().replace(/-/g, "").slice(0, 26);
        key = `venues/${photoMatch[1]}/photos/${ulid}.jpg`;
      } else if (avatarMatch) {
        key = `venues/${avatarMatch[1]}/avatar.jpg`;
      } else if (coverMatch) {
        key = `venues/${coverMatch[1]}/cover.jpg`;
      } else {
        return jsonResponse(400, { error: "Invalid key_prefix for venue bucket" });
      }
      // Soft-deleted check
      if (bucketCfg.validateKeyAsync) {
        const chk = await bucketCfg.validateKeyAsync(key, supabaseAdmin);
        if (!chk.ok) return jsonResponse(403, { error: chk.reason || "Key check failed" });
      }
    } else {
      // Legacy freelancer flow: category-based
      const category = (formData.get("category") as string) || "media";
      const valid = ["avatars", "posts", "cover", "media"];
      if (!valid.includes(category)) return jsonResponse(400, { error: "Invalid category" });
      const ext = file.name.split(".").pop()?.toLowerCase() || "jpg";
      const fileName =
        category === "avatars" ? `avatar.${ext}` :
        category === "cover"   ? `cover.${ext}` :
        `${crypto.randomUUID()}.${ext}`;
      key = `${user.id}/${category}/${fileName}`;
    }

    if (!bucketCfg.validateKey(key, user.id)) {
      return jsonResponse(403, { error: "Derived key failed validation" });
    }

    const arrayBuffer = await file.arrayBuffer();
    const body = new Uint8Array(arrayBuffer);
    await uploadToR2(
      accountId, accessKeyId, secretAccessKey,
      bucketCfg.bucket, key, body,
      file.type || "application/octet-stream"
    );

    return jsonResponse(200, {
      success: true,
      url: `${publicUrlBase}/${key}`,
      path: key,
      key,
      bucket: bucketCfg.bucket,
    });
  } catch (error) {
    console.error("upload-media error:", error);
    const message = error instanceof Error ? error.message : "Unknown error";
    return jsonResponse(500, { error: message });
  }
});
