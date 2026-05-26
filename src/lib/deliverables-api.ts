import { supabase } from "@/integrations/supabase/client";

export interface DeliverableRow {
  client_id: string;
  event_name: string;
  section: string;
  deliverable_type: string;
  enabled: boolean;
  quantity: number;
  item_names: string;
  album_name: string;
  photographer_toggles: string;
  photographer_notes: string;
}

export async function loadDeliverables(clientId: string): Promise<DeliverableRow[]> {
  const { data, error } = await supabase
    .from('client_deliverables')
    .select('*')
    .eq('client_id', clientId);
  if (error) { console.error('loadDeliverables', error); return []; }
  return (data || []) as any;
}

export async function saveDeliverable(row: DeliverableRow): Promise<void> {
  const { error } = await supabase
    .from('client_deliverables')
    .upsert({
      client_id: row.client_id,
      event_name: row.event_name,
      section: row.section,
      deliverable_type: row.deliverable_type,
      enabled: row.enabled,
      quantity: row.quantity,
      item_names: row.item_names,
      album_name: row.album_name,
      photographer_toggles: row.photographer_toggles,
      photographer_notes: row.photographer_notes,
      updated_at: new Date().toISOString(),
    } as any, { onConflict: 'client_id,event_name,section,deliverable_type', ignoreDuplicates: false });
  if (error) console.error('saveDeliverable', error);
}

export async function loadAlbumTypes(userId: string): Promise<string[]> {
  const { data, error } = await supabase
    .from('album_types' as any)
    .select('type_name')
    .eq('user_id', userId)
    .order('created_at', { ascending: true });
  if (error) { console.error('loadAlbumTypes', error); return []; }
  return (data || []).map((r: any) => r.type_name);
}

export async function saveAlbumType(userId: string, typeName: string): Promise<void> {
  const trimmed = typeName.trim();
  if (!trimmed) return;
  const { error } = await supabase
    .from('album_types' as any)
    .upsert({ user_id: userId, type_name: trimmed } as any, { onConflict: 'user_id,type_name', ignoreDuplicates: true });
  if (error) console.error('saveAlbumType', error);
}
