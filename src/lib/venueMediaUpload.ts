import { supabase } from "@/integrations/supabase/client";
import { compressImage } from "@/lib/imageCompressor";

export type VenueUploadKind = "photo" | "avatar" | "cover";

const KEY_PREFIX: Record<VenueUploadKind, (vid: string) => string> = {
  photo: (vid) => `venues/${vid}/photos/`,
  avatar: (vid) => `venues/${vid}/avatar`,
  cover: (vid) => `venues/${vid}/cover`,
};

export type VenueUploadResult = { url: string; key: string };

export async function uploadVenueImage(
  venueId: string,
  kind: VenueUploadKind,
  file: File
): Promise<VenueUploadResult> {
  const compressed = await compressImage(file);
  const fd = new FormData();
  fd.append("file", compressed);
  fd.append("bucket", "venue-xitoevents");
  fd.append("key_prefix", KEY_PREFIX[kind](venueId));

  const { data, error } = await supabase.functions.invoke("upload-media", { body: fd });
  if (error) throw error;
  if (!data?.url || !data?.key) throw new Error("Upload returned no url/key");
  return { url: data.url, key: data.key };
}

export async function deleteVenueR2Object(key: string): Promise<void> {
  const fd = new FormData();
  fd.append("action", "delete");
  fd.append("bucket", "venue-xitoevents");
  fd.append("key", key);
  await supabase.functions.invoke("upload-media", { body: fd });
}

/** Compress + upload + insert photo row. Rolls back R2 if DB insert fails. */
export async function uploadVenuePhotoWithRollback(
  venueId: string,
  file: File,
  position: number
): Promise<{ id: string; url: string; key: string }> {
  const { url, key } = await uploadVenueImage(venueId, "photo", file);
  try {
    const { data: { user } } = await supabase.auth.getUser();
    const { data, error } = await supabase
      .from("xito_venue_photos")
      .insert({
        venue_id: venueId,
        r2_key: key,
        public_url: url,
        position,
        uploaded_by: user?.id,
      })
      .select("id")
      .single();
    if (error) throw error;
    return { id: data.id, url, key };
  } catch (err) {
    // Best-effort rollback
    try { await deleteVenueR2Object(key); } catch (_) { /* janitor will catch */ }
    throw err;
  }
}

export async function triggerCleanupWorker(): Promise<void> {
  try {
    await supabase.functions.invoke("r2-cleanup-worker");
  } catch (_) {
    // fire-and-forget
  }
}
