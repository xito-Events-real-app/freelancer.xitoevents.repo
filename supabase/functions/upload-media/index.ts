import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

// =====================================================
// Bucket configuration map (JWT-authenticated buckets)
// The photography bucket uses portal-token auth handled
// separately at the top of the request handler.
// =====================================================
type BucketConfig = {
  bucket: string;
  publicUrlEnv: string;
  validateKey: (key: string, userId: string) => boolean;
  authorize: (ctx: AuthorizeCtx) => Promise<boolean>;
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
  "freelancer-xitoevents": {
    bucket: "freelancer-xitoevents",
    publicUrlEnv: "R2_PUBLIC_URL",
    validateKey: (key, userId) => key.startsWith(`${userId}/`),
    authorize: async () => true,
  },
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

const PHOTOGRAPHY_BUCKET = "xito-photography-xitoevents-com";

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

// =====================================================
// Per-client rate limiter for portal uploads.
// NOTE: In-memory Map — per edge-function instance only, resets on cold
// start. Acceptable at current scale. If portal upload traffic grows
// significantly, move to a Durable Object or KV-backed counter so the
// limit holds across instances.
// =====================================================
const rateBuckets = new Map<string, number[]>();
function rateLimited(clientId: string, max = 10, windowMs = 60_000): boolean {
  const now = Date.now();
  const arr = (rateBuckets.get(clientId) || []).filter((t) => now - t < windowMs);
  if (arr.length >= max) {
    rateBuckets.set(clientId, arr);
    return true;
  }
  arr.push(now);
  rateBuckets.set(clientId, arr);
  return false;
}

// Parse a full public R2 URL back to a key relative to the bucket public base.
function urlToKey(publicUrlBase: string, url: string | null): string | null {
  if (!url) return null;
  const base = publicUrlBase.replace(/\/$/, "");
  if (!url.startsWith(base + "/")) return null;
  return url.slice(base.length + 1);
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabaseAdmin = createClient(supabaseUrl, serviceKey);

    const accountId = Deno.env.get("R2_ACCOUNT_ID");
    const accessKeyId = Deno.env.get("R2_ACCESS_KEY_ID");
    const secretAccessKey = Deno.env.get("R2_SECRET_ACCESS_KEY");
    if (!accountId || !accessKeyId || !secretAccessKey) {
      return jsonResponse(500, { error: "R2 credentials not configured" });
    }

    const formData = await req.formData();
    const bucketParam = (formData.get("bucket") as string) || "freelancer-xitoevents";

    // =====================================================
    // BRANCH A — Photography bucket (portal-token auth)
    // =====================================================
    if (bucketParam === PHOTOGRAPHY_BUCKET) {
      // Photography bucket uses its OWN R2 token (scoped to this bucket only).
      const photoAccessKeyId = Deno.env.get("R2_PHOTO_ACCESS_KEY_ID") || accessKeyId;
      const photoSecretAccessKey = Deno.env.get("R2_PHOTO_SECRET_ACCESS_KEY") || secretAccessKey;
      const clientId = (formData.get("client_id") as string) || "";
      const token = (formData.get("token") as string) || "";
      const kind = (formData.get("kind") as string) || ""; // couple | family | delete-family | reference | delete-reference
      const memberIdRaw = (formData.get("member_id") as string) || "";
      const refIdRaw = (formData.get("ref_id") as string) || "";

      if (!clientId || !token) {
        return jsonResponse(400, { error: "client_id and token are required" });
      }
      if (!["couple", "family", "delete-family", "reference", "delete-reference"].includes(kind)) {
        return jsonResponse(400, { error: "Invalid kind" });
      }

      // 1. Validate token BEFORE reading any file body.
      const { data: verifyRows, error: verifyErr } = await supabaseAdmin.rpc(
        "portal_verify_token",
        { p_client: clientId, p_token: token },
      );
      if (verifyErr || !verifyRows || (Array.isArray(verifyRows) && verifyRows.length === 0)) {
        return jsonResponse(401, { error: "Invalid portal token" });
      }
      const verified = Array.isArray(verifyRows) ? verifyRows[0] : verifyRows;
      const agencySlug: string | null = verified.agency_slug;
      if (!agencySlug) {
        return jsonResponse(500, { error: "Agency has no slug; cannot derive storage path" });
      }

      // 2. Rate-limit per client.
      if (rateLimited(clientId)) {
        return jsonResponse(429, { error: "Too many uploads, please wait a minute" });
      }

      const publicUrlBase = resolvePublicUrl("R2_PHOTOGRAPHY_PUBLIC_URL");
      if (!publicUrlBase) return jsonResponse(500, { error: "Missing env R2_PHOTOGRAPHY_PUBLIC_URL" });

      // ----- delete-family path -----
      // Order: delete DB row first via RPC, then R2 object.
      // If R2 delete fails, log silently — a dangling R2 object is cheaper
      // to deal with than a dangling DB row with a broken photo.
      if (kind === "delete-family") {
        if (!memberIdRaw) return jsonResponse(400, { error: "member_id required" });
        const { data: oldUrl, error: delErr } = await supabaseAdmin.rpc(
          "portal_delete_family_member",
          { p_client: clientId, p_token: token, p_member_id: memberIdRaw },
        );
        if (delErr) return jsonResponse(400, { error: delErr.message });
        const oldKey = urlToKey(publicUrlBase, oldUrl as string | null);
        if (oldKey) {
          try {
            await deleteFromR2(accountId, photoAccessKeyId, photoSecretAccessKey, PHOTOGRAPHY_BUCKET, oldKey);
          } catch (e) {
            console.warn("[photo bucket] R2 delete after row-delete failed (ignored):", e);
          }
        }
        return jsonResponse(200, { success: true });
      }

      // ----- delete-reference path -----
      if (kind === "delete-reference") {
        if (!refIdRaw) return jsonResponse(400, { error: "ref_id required" });
        const { data: oldUrl, error: delErr } = await supabaseAdmin.rpc(
          "portal_delete_reference",
          { p_client: clientId, p_token: token, p_ref_id: refIdRaw },
        );
        if (delErr) return jsonResponse(400, { error: delErr.message });
        const oldKey = urlToKey(publicUrlBase, oldUrl as string | null);
        if (oldKey) {
          try {
            await deleteFromR2(accountId, photoAccessKeyId, photoSecretAccessKey, PHOTOGRAPHY_BUCKET, oldKey);
          } catch (e) {
            console.warn("[photo bucket] R2 delete after ref-delete failed (ignored):", e);
          }
        }
        return jsonResponse(200, { success: true });
      }

      // ----- upload path (couple | family) -----
      const file = formData.get("file") as File | null;
      if (!file) return jsonResponse(400, { error: "No file provided" });
      const HARD_CAP = 210 * 1024; // 200KB + small headroom for multipart overhead
      if (file.size > HARD_CAP) {
        return jsonResponse(400, { error: "Photo is over 200KB after compression. Please try again." });
      }

      let key = "";
      let priorKey: string | null = null;

      if (kind === "couple") {
        const { data: clientRow } = await supabaseAdmin
          .from("agency_clients")
          .select("id, couple_photo_url")
          .eq("id", clientId)
          .maybeSingle();
        if (!clientRow) return jsonResponse(404, { error: "Client not found" });
        priorKey = urlToKey(publicUrlBase, clientRow.couple_photo_url);
        key = `${agencySlug}/clients/${clientId}/couple/cover-${Date.now()}.jpg`;
      } else if (kind === "family") {
        if (!memberIdRaw) return jsonResponse(400, { error: "member_id required for family upload" });
        const { data: memberRow, error: mErr } = await supabaseAdmin
          .from("agency_client_family_members")
          .select("id, client_id, photo_url")
          .eq("id", memberIdRaw)
          .maybeSingle();
        if (mErr || !memberRow) return jsonResponse(404, { error: "Family member not found" });
        if (memberRow.client_id !== clientId) {
          return jsonResponse(403, { error: "Member does not belong to this client" });
        }
        priorKey = urlToKey(publicUrlBase, memberRow.photo_url);
        key = `${agencySlug}/clients/${clientId}/family/${memberIdRaw}.jpg`;
      } else {
        // reference upload
        if (!refIdRaw) return jsonResponse(400, { error: "ref_id required for reference upload" });
        const { data: refRow, error: rErr } = await supabaseAdmin
          .from("client_portal_references")
          .select("id, client_id, image_url")
          .eq("id", refIdRaw)
          .maybeSingle();
        if (rErr || !refRow) return jsonResponse(404, { error: "Reference not found" });
        if (refRow.client_id !== clientId) {
          return jsonResponse(403, { error: "Reference does not belong to this client" });
        }
        priorKey = urlToKey(publicUrlBase, refRow.image_url);
        key = `${agencySlug}/clients/${clientId}/references/${refIdRaw}.jpg`;
      }

      // Delete old object first (best-effort).
      if (priorKey && priorKey !== key) {
        try {
          await deleteFromR2(accountId, photoAccessKeyId, photoSecretAccessKey, PHOTOGRAPHY_BUCKET, priorKey);
        } catch (e) {
          console.warn("[photo bucket] prior R2 delete failed (continuing):", e);
        }
      }

      const arrayBuffer = await file.arrayBuffer();
      const body = new Uint8Array(arrayBuffer);
      await uploadToR2(
        accountId, photoAccessKeyId, photoSecretAccessKey,
        PHOTOGRAPHY_BUCKET, key, body,
        file.type || "image/jpeg",
      );

      return jsonResponse(200, {
        success: true,
        url: `${publicUrlBase}/${key}`,
        key,
        bucket: PHOTOGRAPHY_BUCKET,
      });
    }

    // =====================================================
    // BRANCH B — JWT-authenticated buckets (existing flow)
    // =====================================================
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return jsonResponse(401, { error: "Missing authorization header" });

    const supabase = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) return jsonResponse(401, { error: "Unauthorized" });

    const { data: adminCheck } = await supabaseAdmin.rpc("has_role", {
      _user_id: user.id,
      _role: "admin",
    });
    const isAdmin = !!adminCheck;

    const bucketCfg = BUCKETS[bucketParam];
    if (!bucketCfg) return jsonResponse(400, { error: `Unknown bucket: ${bucketParam}` });

    const ok = await bucketCfg.authorize({ userId: user.id, isAdmin });
    if (!ok) return jsonResponse(403, { error: "Not authorized for this bucket" });

    const publicUrlBase = resolvePublicUrl(bucketCfg.publicUrlEnv);
    if (!publicUrlBase) return jsonResponse(500, { error: `Missing env ${bucketCfg.publicUrlEnv}` });

    const action = (formData.get("action") as string) || "upload";

    if (action === "delete") {
      const filePath = (formData.get("file_path") as string) || (formData.get("key") as string);
      if (!filePath) return jsonResponse(400, { error: "file_path/key required" });
      if (!bucketCfg.validateKey(filePath, user.id)) {
        return jsonResponse(403, { error: "Key not allowed for this bucket" });
      }
      await deleteFromR2(accountId, accessKeyId, secretAccessKey, bucketCfg.bucket, filePath);
      return jsonResponse(200, { success: true });
    }

    const file = formData.get("file") as File | null;
    if (!file) return jsonResponse(400, { error: "No file provided" });

    const maxSize = 20 * 1024 * 1024;
    if (file.size > maxSize) return jsonResponse(400, { error: "File too large (max 20MB)" });

    let key: string;

    if (bucketCfg.bucket === "venue-xitoevents") {
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
      if (bucketCfg.validateKeyAsync) {
        const chk = await bucketCfg.validateKeyAsync(key, supabaseAdmin);
        if (!chk.ok) return jsonResponse(403, { error: chk.reason || "Key check failed" });
      }
    } else {
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
