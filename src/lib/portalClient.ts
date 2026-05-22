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
};

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
