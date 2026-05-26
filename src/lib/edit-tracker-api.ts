import { supabase } from "@/integrations/supabase/client";
import { loadDeliverables } from "@/lib/deliverables-api";
import { getPhotographersForEvent } from "@/lib/photographer-utils";

export const VIDEO_STAGES = [
  'QUEUE', 'EDIT_LAB', 'EDIT_ON_PROGRESS', 'EXPORTED', 'CLIENT_REVIEW', 'RE_EDIT_ON_PROGRESS', 'FINALIZED',
] as const;
export type VideoStage = typeof VIDEO_STAGES[number];

export const PHOTO_STAGES = VIDEO_STAGES;
export type PhotoStage = VideoStage;

const VIDEO_DEFAULT_ON = ['full_video', 'highlights'] as const;

export interface VideoEditRow {
  id: string;
  client_id: string;
  event_name: string;
  sub_event_name: string;
  edit_type: string;
  video_edit_status: string;
  urgency: string;
  editor: string;
  colorist: string;
  company_notes: string;
  client_demand: string;
  reference: string;
  songs: string;
  youtube_link: string;
  is_playing: boolean;
  playing_since: string | null;
  edit_started_at: string | null;
  deadline: string | null;
  stage_history: string;
  deleted: boolean;
  created_at: string;
  updated_at: string;
  // joined fields
  client_name?: string;
  event_date_ad?: string | null;
  event_date_bs?: string | null;
  client_created_at?: string;
}

export interface PhotoEditRow {
  id: string;
  client_id: string;
  event_name: string;
  edit_type: string;
  photographer_name: string;
  photographer_role: string;
  photographer_side: string;
  photo_edit_status: string;
  urgency: string;
  editor: string;
  company_notes: string;
  client_demand: string;
  reference: string;
  is_playing: boolean;
  playing_since: string | null;
  edit_started_at: string | null;
  deadline: string | null;
  stage_history: string;
  deleted: boolean;
  created_at: string;
  updated_at: string;
  client_name?: string;
  event_date_ad?: string | null;
  event_date_bs?: string | null;
  client_created_at?: string;
}

const PROGRESS_STAGES = ['EDIT_ON_PROGRESS', 'RE_EDIT_ON_PROGRESS'];

const VIDEO_LABEL: Record<string, string> = {
  full_video: 'Full Video', highlights: 'Highlights', reel: 'Reel',
  video_insta_post: 'Video Insta Post', overall_highlights: 'Overall Highlights', overall_reel: 'Overall Reel',
};

function splitItemNames(value: string | null | undefined): string[] {
  return (value || '').split(/\|\|\||,/).map(s => s.trim()).filter(Boolean);
}

/* ─── VIDEO ─── */

export async function loadVideoEditRows(agencyId: string): Promise<VideoEditRow[]> {
  const { data: clients } = await supabase
    .from('agency_clients').select('id, client_name, created_at').eq('user_id', agencyId);
  const clientMap = new Map<string, { name: string; created: string }>(
    (clients || []).map(c => [c.id, { name: c.client_name, created: c.created_at }])
  );
  const clientIds = Array.from(clientMap.keys());
  if (clientIds.length === 0) return [];

  const { data: rows, error } = await supabase
    .from('video_edit_tracker' as any).select('*')
    .in('client_id', clientIds).eq('deleted', false);
  if (error) { console.error(error); return []; }

  const { data: events } = await supabase
    .from('agency_client_events').select('client_id, event_name, event_date_ad, event_date_bs').in('client_id', clientIds);
  const eventMap = new Map<string, { ad: string | null; bs: string | null }>();
  (events || []).forEach(e => eventMap.set(`${e.client_id}::${(e.event_name || '').toUpperCase()}`, { ad: e.event_date_ad, bs: e.event_date_bs }));

  return ((rows || []) as any[]).map(r => {
    const ev = eventMap.get(`${r.client_id}::${(r.event_name || '').toUpperCase()}`);
    const c = clientMap.get(r.client_id);
    return { ...r, client_name: c?.name || '', client_created_at: c?.created || '', event_date_ad: ev?.ad ?? null, event_date_bs: ev?.bs ?? null };
  });
}

export async function loadPhotoEditRows(agencyId: string): Promise<PhotoEditRow[]> {
  const { data: clients } = await supabase
    .from('agency_clients').select('id, client_name, created_at').eq('user_id', agencyId);
  const clientMap = new Map<string, { name: string; created: string }>(
    (clients || []).map(c => [c.id, { name: c.client_name, created: c.created_at }])
  );
  const clientIds = Array.from(clientMap.keys());
  if (clientIds.length === 0) return [];

  const { data: rows, error } = await supabase
    .from('photo_edit_tracker' as any).select('*')
    .in('client_id', clientIds).eq('deleted', false);
  if (error) { console.error(error); return []; }

  const { data: events } = await supabase
    .from('agency_client_events').select('client_id, event_name, event_date_ad, event_date_bs').in('client_id', clientIds);
  const eventMap = new Map<string, { ad: string | null; bs: string | null }>();
  (events || []).forEach(e => eventMap.set(`${e.client_id}::${(e.event_name || '').toUpperCase()}`, { ad: e.event_date_ad, bs: e.event_date_bs }));

  return ((rows || []) as any[]).map(r => {
    const ev = eventMap.get(`${r.client_id}::${(r.event_name || '').toUpperCase()}`);
    const c = clientMap.get(r.client_id);
    return { ...r, client_name: c?.name || '', client_created_at: c?.created || '', event_date_ad: ev?.ad ?? null, event_date_bs: ev?.bs ?? null };
  });
}

export async function ensureVideoEditRowsForClient(clientId: string): Promise<void> {
  const deliverables = await loadDeliverables(clientId);
  const { data: events } = await supabase
    .from('agency_client_events').select('id, event_name').eq('client_id', clientId);
  const eventNames = new Set((events || []).map(e => (e.event_name || '').toUpperCase()));

  const { data: existing } = await supabase
    .from('video_edit_tracker' as any).select('id, event_name, sub_event_name, edit_type, video_edit_status, deleted')
    .eq('client_id', clientId);

  const existingKey = (en: string, sn: string, et: string) =>
    `${en.toUpperCase()}||${sn.trim().toLowerCase()}||${et.trim().toLowerCase()}`;
  const existingMap = new Map<string, any>();
  ((existing as any[]) || []).forEach((r: any) => existingMap.set(existingKey(r.event_name || '', r.sub_event_name || '', r.edit_type || ''), r));

  const desired: { event_name: string; sub_event_name: string; edit_type: string }[] = [];

  for (const evName of eventNames) {
    const evDels = deliverables.filter(d => d.event_name.toUpperCase() === evName && (d.section === 'videos' || d.section === 'video'));
    const byType = new Map(evDels.map(d => [d.deliverable_type, d]));
    const effective: { deliverable_type: string; quantity: number; item_names: string }[] = [];
    for (const t of VIDEO_DEFAULT_ON) {
      const row = byType.get(t);
      if (!row) effective.push({ deliverable_type: t, quantity: 1, item_names: '' });
      else if (row.enabled) effective.push({ deliverable_type: t, quantity: row.quantity, item_names: row.item_names });
    }
    for (const d of evDels) {
      if ((VIDEO_DEFAULT_ON as readonly string[]).includes(d.deliverable_type)) continue;
      if (d.enabled) effective.push({ deliverable_type: d.deliverable_type, quantity: d.quantity, item_names: d.item_names });
    }
    for (const d of effective) {
      const label = VIDEO_LABEL[d.deliverable_type] || d.deliverable_type;
      const items = splitItemNames(d.item_names);
      const qty = d.quantity || 1;
      if (qty <= 1 && items.length <= 1) {
        desired.push({ event_name: evName, sub_event_name: items[0] || '', edit_type: label });
      } else {
        for (let i = 0; i < qty; i++) desired.push({ event_name: evName, sub_event_name: items[i] || `${label} ${i + 1}`, edit_type: label });
      }
    }
  }

  // Overall
  const overallDels = deliverables.filter(d => d.section === 'overall' && d.enabled);
  for (const d of overallDels) {
    const label = VIDEO_LABEL[d.deliverable_type] || d.deliverable_type;
    const items = splitItemNames(d.item_names);
    const qty = d.quantity || 1;
    if (qty <= 1 && items.length <= 1) desired.push({ event_name: 'OVERALL', sub_event_name: items[0] || '', edit_type: label });
    else for (let i = 0; i < qty; i++) desired.push({ event_name: 'OVERALL', sub_event_name: items[i] || `${label} ${i + 1}`, edit_type: label });
  }

  // Insert missing
  const toInsert = desired.filter(d => !existingMap.has(existingKey(d.event_name, d.sub_event_name, d.edit_type)))
    .map(d => ({ client_id: clientId, event_name: d.event_name, sub_event_name: d.sub_event_name, edit_type: d.edit_type, video_edit_status: 'QUEUE' }));
  if (toInsert.length > 0) {
    await supabase.from('video_edit_tracker' as any).insert(toInsert as any);
  }

  // Soft-delete rows whose deliverable was turned off & still in QUEUE
  const desiredKeys = new Set(desired.map(d => existingKey(d.event_name, d.sub_event_name, d.edit_type)));
  const toRemove = ((existing as any[]) || []).filter((r: any) => !r.deleted && r.video_edit_status === 'QUEUE'
    && !desiredKeys.has(existingKey(r.event_name || '', r.sub_event_name || '', r.edit_type || '')));
  if (toRemove.length > 0) {
    await supabase.from('video_edit_tracker' as any).update({ deleted: true } as any).in('id', toRemove.map((r: any) => r.id));
  }
}

export async function ensurePhotoEditRowsForClient(clientId: string): Promise<void> {
  const deliverables = await loadDeliverables(clientId);
  const { data: events } = await supabase
    .from('agency_client_events').select('id, event_name').eq('client_id', clientId);
  const eventList = (events || []).map(e => ({ id: e.id, name: (e.event_name || '').toUpperCase() }));

  const { data: assignments } = await supabase
    .from('crew_assignments').select('event_id, role, assigned_freelancer').in('event_id', eventList.map(e => e.id));

  const { data: existing } = await supabase
    .from('photo_edit_tracker' as any).select('id, event_name, edit_type, photographer_role, photographer_name, photo_edit_status, deleted')
    .eq('client_id', clientId);

  const key = (en: string, et: string, role: string, name: string) =>
    `${en.toUpperCase()}||${et.toLowerCase()}||${role.toLowerCase()}||${name.toLowerCase()}`;
  const existingMap = new Map<string, any>();
  ((existing as any[]) || []).forEach((r: any) => existingMap.set(key(r.event_name || '', r.edit_type || '', r.photographer_role || '', r.photographer_name || ''), r));

  const desired: { event_name: string; edit_type: string; photographer_role: string; photographer_name: string; photographer_side: string }[] = [];

  for (const ev of eventList) {
    // Photo deliverables for this event
    const evDels = deliverables.filter(d => d.event_name.toUpperCase() === ev.name && d.section === 'photos' && d.enabled);
    if (evDels.length === 0) continue;
    const photographers = getPhotographersForEvent(ev.id, (assignments || []) as any);

    for (const d of evDels) {
      // all_photos: enabled-by-default → one row per photographer
      // selected_photos: only photographers with toggle on
      // insta_post: one row per photographer
      let pickedPhotographers = photographers;
      if (d.deliverable_type === 'selected_photos') {
        try {
          const toggles = d.photographer_toggles ? JSON.parse(d.photographer_toggles) : {};
          pickedPhotographers = photographers.filter(p => toggles[p.key]);
        } catch { pickedPhotographers = []; }
      }
      const label = d.deliverable_type === 'all_photos' ? 'All Photos'
        : d.deliverable_type === 'selected_photos' ? 'Selected Photos'
        : d.deliverable_type === 'insta_post' ? 'Insta Post'
        : d.deliverable_type;
      for (const p of pickedPhotographers) {
        const side = p.code === 'PB' ? 'BRIDE' : p.code === 'PG' ? 'GROOM' : 'EXTRA';
        desired.push({ event_name: ev.name, edit_type: label, photographer_role: p.code, photographer_name: p.name, photographer_side: side });
      }
    }
  }

  const toInsert = desired.filter(d => !existingMap.has(key(d.event_name, d.edit_type, d.photographer_role, d.photographer_name)))
    .map(d => ({ client_id: clientId, event_name: d.event_name, edit_type: d.edit_type,
      photographer_role: d.photographer_role, photographer_name: d.photographer_name,
      photographer_side: d.photographer_side, photo_edit_status: 'QUEUE' }));
  if (toInsert.length > 0) {
    await supabase.from('photo_edit_tracker' as any).insert(toInsert as any);
  }

  const desiredKeys = new Set(desired.map(d => key(d.event_name, d.edit_type, d.photographer_role, d.photographer_name)));
  const toRemove = ((existing as any[]) || []).filter((r: any) => !r.deleted && r.photo_edit_status === 'QUEUE'
    && !desiredKeys.has(key(r.event_name || '', r.edit_type || '', r.photographer_role || '', r.photographer_name || '')));
  if (toRemove.length > 0) {
    await supabase.from('photo_edit_tracker' as any).update({ deleted: true } as any).in('id', toRemove.map((r: any) => r.id));
  }
}

export async function ensureAllVideoEditRows(agencyId: string): Promise<void> {
  const { data: clients } = await supabase.from('agency_clients').select('id').eq('user_id', agencyId);
  for (const c of clients || []) {
    try { await ensureVideoEditRowsForClient(c.id); } catch (e) { console.error('ensureVideo', c.id, e); }
  }
}

export async function ensureAllPhotoEditRows(agencyId: string): Promise<void> {
  const { data: clients } = await supabase.from('agency_clients').select('id').eq('user_id', agencyId);
  for (const c of clients || []) {
    try { await ensurePhotoEditRowsForClient(c.id); } catch (e) { console.error('ensurePhoto', c.id, e); }
  }
}

export async function updateVideoField(id: string, field: keyof VideoEditRow, value: any) {
  const { error } = await supabase.from('video_edit_tracker' as any).update({ [field]: value } as any).eq('id', id);
  if (error) console.error(error);
}

export async function updatePhotoField(id: string, field: keyof PhotoEditRow, value: any) {
  const { error } = await supabase.from('photo_edit_tracker' as any).update({ [field]: value } as any).eq('id', id);
  if (error) console.error(error);
}

export async function pushVideoToStatus(id: string, newStatus: string) {
  const { data } = await supabase.from('video_edit_tracker' as any).select('edit_started_at, stage_history').eq('id', id).single();
  const update: any = { video_edit_status: newStatus };
  if (PROGRESS_STAGES.includes(newStatus)) {
    if (!(data as any)?.edit_started_at) update.edit_started_at = new Date().toISOString();
    if (newStatus === 'EDIT_ON_PROGRESS') { update.is_playing = true; update.playing_since = new Date().toISOString(); }
  }
  const entry = `${newStatus} [${new Date().toISOString()}]`;
  update.stage_history = (data as any)?.stage_history ? `${(data as any).stage_history}\n${entry}` : entry;
  await supabase.from('video_edit_tracker' as any).update(update).eq('id', id);
}

export async function pushPhotoToStatus(id: string, newStatus: string) {
  const { data } = await supabase.from('photo_edit_tracker' as any).select('edit_started_at, stage_history').eq('id', id).single();
  const update: any = { photo_edit_status: newStatus };
  if (PROGRESS_STAGES.includes(newStatus)) {
    if (!(data as any)?.edit_started_at) update.edit_started_at = new Date().toISOString();
    if (newStatus === 'EDIT_ON_PROGRESS') { update.is_playing = true; update.playing_since = new Date().toISOString(); }
  }
  const entry = `${newStatus} [${new Date().toISOString()}]`;
  update.stage_history = (data as any)?.stage_history ? `${(data as any).stage_history}\n${entry}` : entry;
  await supabase.from('photo_edit_tracker' as any).update(update).eq('id', id);
}

export async function toggleVideoPlaying(id: string, currentlyPlaying: boolean) {
  await supabase.from('video_edit_tracker' as any).update({
    is_playing: !currentlyPlaying,
    playing_since: !currentlyPlaying ? new Date().toISOString() : null,
  } as any).eq('id', id);
}

export async function togglePhotoPlaying(id: string, currentlyPlaying: boolean) {
  await supabase.from('photo_edit_tracker' as any).update({
    is_playing: !currentlyPlaying,
    playing_since: !currentlyPlaying ? new Date().toISOString() : null,
  } as any).eq('id', id);
}
