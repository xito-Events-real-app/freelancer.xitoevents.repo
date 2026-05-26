// Thin wrappers around the portal_* RPCs. All anon-safe (RPCs verify token).
import { supabase } from '@/integrations/supabase/client';

export type PortalContext = { clientId: string; token: string };

async function rpc<T = any>(name: string, params: Record<string, unknown>) {
  const { data, error } = await (supabase as any).rpc(name, params);
  if (error) throw error;
  return data as T;
}

export const portalApi = {
  readBundle: (ctx: PortalContext) =>
    rpc('portal_read_bundle', { p_client: ctx.clientId, p_token: ctx.token }),

  searchVenues: (ctx: PortalContext, q: string, limit = 8) =>
    rpc<any[]>('portal_search_venues', { p_client: ctx.clientId, p_token: ctx.token, p_q: q, p_limit: limit }),

  upsertContact: (ctx: PortalContext, data: Record<string, unknown>) =>
    rpc('portal_upsert_contact', { p_client: ctx.clientId, p_token: ctx.token, p_data: data }),

  upsertEventLocation: (ctx: PortalContext, eventId: string, data: Record<string, unknown>) =>
    rpc('portal_upsert_event_location', { p_client: ctx.clientId, p_token: ctx.token, p_event_id: eventId, p_data: data }),

  addReference: (ctx: PortalContext, data: Record<string, unknown>) =>
    rpc('portal_add_reference', { p_client: ctx.clientId, p_token: ctx.token, p_data: data }),

  deleteReference: (ctx: PortalContext, refId: string) =>
    rpc('portal_delete_reference', { p_client: ctx.clientId, p_token: ctx.token, p_ref_id: refId }),

  backfillVenueCoords: (ctx: PortalContext, venueId: string, lat: number, lng: number) =>
    rpc<boolean>('portal_backfill_venue_coords', {
      p_client: ctx.clientId, p_token: ctx.token,
      p_venue_id: venueId, p_lat: lat, p_lng: lng,
    }),

  toggleFavourite: (ctx: PortalContext, photoKey: string, photoUrl: string) =>
    rpc<boolean>('portal_toggle_favourite', { p_client: ctx.clientId, p_token: ctx.token, p_photo_key: photoKey, p_photo_url: photoUrl }),

  setAlbumSelection: (ctx: PortalContext, args: { albumType: string; albumName: string; photoKey: string; photoUrl: string; selected: boolean }) =>
    rpc('portal_set_album_selection', {
      p_client: ctx.clientId, p_token: ctx.token,
      p_album_type: args.albumType, p_album_name: args.albumName,
      p_photo_key: args.photoKey, p_photo_url: args.photoUrl, p_selected: args.selected,
    }),

  submitAlbum: (ctx: PortalContext, payload: Record<string, unknown>) =>
    rpc('portal_submit_album', { p_client: ctx.clientId, p_token: ctx.token, p_payload: payload }),

  hideVideo: (ctx: PortalContext, videoId: string) =>
    rpc('portal_hide_video', { p_client: ctx.clientId, p_token: ctx.token, p_video_id: videoId }),

  unhideVideo: (ctx: PortalContext, videoId: string) =>
    rpc('portal_unhide_video', { p_client: ctx.clientId, p_token: ctx.token, p_video_id: videoId }),

  // Couple & family photos
  setCouplePhoto: (ctx: PortalContext, url: string) =>
    rpc('portal_set_couple_photo', { p_client: ctx.clientId, p_token: ctx.token, p_url: url }),

  addFamilyMember: (ctx: PortalContext, side: string, role: string, name: string) =>
    rpc<string>('portal_add_family_member', {
      p_client: ctx.clientId, p_token: ctx.token,
      p_side: side, p_role: role, p_name: name,
    }),

  setFamilyMemberPhoto: (ctx: PortalContext, memberId: string, url: string) =>
    rpc('portal_set_family_member_photo', {
      p_client: ctx.clientId, p_token: ctx.token, p_member_id: memberId, p_url: url,
    }),

  createReferencePhoto: (ctx: PortalContext, eventName: string) =>
    rpc<string>('portal_create_reference_photo', {
      p_client: ctx.clientId, p_token: ctx.token, p_event_name: eventName,
    }),

  setReferenceImage: (ctx: PortalContext, refId: string, url: string) =>
    rpc('portal_set_reference_image', {
      p_client: ctx.clientId, p_token: ctx.token, p_ref_id: refId, p_url: url,
    }),

  updateFamilyMember: (ctx: PortalContext, memberId: string, side: string, role: string, name: string) =>
    rpc('portal_update_family_member', {
      p_client: ctx.clientId, p_token: ctx.token, p_member_id: memberId,
      p_side: side, p_role: role, p_name: name,
    }),
};

const PHOTO_BUCKET = 'xito-photography-xitoevents-com';
const SUPABASE_URL = (import.meta as any).env.VITE_SUPABASE_URL as string;
const SUPABASE_ANON = (import.meta as any).env.VITE_SUPABASE_PUBLISHABLE_KEY as string;

/**
 * Upload a (already compressed) photo to the photography R2 bucket via
 * the upload-media edge function. Returns the public URL.
 * `kind` is either 'couple' or 'family' (for family, pass memberId).
 */
export async function uploadPortalPhoto(
  ctx: PortalContext,
  file: File,
  kind: 'couple' | 'family' | 'reference',
  opts?: { memberId?: string; refId?: string },
): Promise<{ url: string; key: string }> {
  const fd = new FormData();
  fd.append('bucket', PHOTO_BUCKET);
  fd.append('client_id', ctx.clientId);
  fd.append('token', ctx.token);
  fd.append('kind', kind);
  if (opts?.memberId) fd.append('member_id', opts.memberId);
  if (opts?.refId) fd.append('ref_id', opts.refId);
  fd.append('file', file);
  const res = await fetch(`${SUPABASE_URL}/functions/v1/upload-media`, {
    method: 'POST',
    headers: { apikey: SUPABASE_ANON },
    body: fd,
  });
  const json = await res.json();
  if (!res.ok) throw new Error(json?.error || 'Upload failed');
  return { url: json.url, key: json.key };
}

/** Delete a reference (including its R2 image, if any). */
export async function deletePortalReference(ctx: PortalContext, refId: string): Promise<void> {
  const fd = new FormData();
  fd.append('bucket', PHOTO_BUCKET);
  fd.append('client_id', ctx.clientId);
  fd.append('token', ctx.token);
  fd.append('kind', 'delete-reference');
  fd.append('ref_id', refId);
  const res = await fetch(`${SUPABASE_URL}/functions/v1/upload-media`, {
    method: 'POST',
    headers: { apikey: SUPABASE_ANON },
    body: fd,
  });
  const json = await res.json();
  if (!res.ok) throw new Error(json?.error || 'Delete failed');
}

/** Delete a family member via the edge function (deletes DB row + R2 object). */
export async function deletePortalFamilyMember(ctx: PortalContext, memberId: string): Promise<void> {
  const fd = new FormData();
  fd.append('bucket', PHOTO_BUCKET);
  fd.append('client_id', ctx.clientId);
  fd.append('token', ctx.token);
  fd.append('kind', 'delete-family');
  fd.append('member_id', memberId);
  const res = await fetch(`${SUPABASE_URL}/functions/v1/upload-media`, {
    method: 'POST',
    headers: { apikey: SUPABASE_ANON },
    body: fd,
  });
  const json = await res.json();
  if (!res.ok) throw new Error(json?.error || 'Delete failed');
}


// Owner-side
export const portalAdminApi = {
  regenerateToken: async (clientId: string) => {
    const { data, error } = await (supabase as any).rpc('portal_regenerate_token', { p_client: clientId });
    if (error) throw error;
    return data as string;
  },
  setEnabled: async (clientId: string, enabled: boolean) => {
    const { error } = await (supabase as any).rpc('portal_set_enabled', { p_client: clientId, p_enabled: enabled });
    if (error) throw error;
  },
};
