import { supabase } from '@/integrations/supabase/client';
import { parseGoogleMapsCoords } from '@/lib/parseGoogleMapsCoords';
import { portalApi, type PortalContext } from '@/lib/portalClient';
import { loadGoogleMaps, hasGoogleMapsKey } from '@/lib/googleMapsLoader';

type Coords = { lat: number; lng: number };

const memCache = new Map<string, Coords | null>();
const LS_PREFIX = 'cp:venue-coords:';

function lsGet(key: string): Coords | null | undefined {
  try {
    const raw = localStorage.getItem(LS_PREFIX + key);
    if (!raw) return undefined;
    const v = JSON.parse(raw);
    if (v && typeof v.lat === 'number' && typeof v.lng === 'number') return v;
    return null;
  } catch { return undefined; }
}
function lsSet(key: string, v: Coords | null) {
  try { localStorage.setItem(LS_PREFIX + key, JSON.stringify(v)); } catch { /* noop */ }
}

interface Input {
  lat?: number | null;
  lng?: number | null;
  venue_google_map?: string | null;
  xito_venue_id?: string | null;
  venue_name?: string | null;
  venue_city?: string | null;
}

async function resolveByName(name: string, city?: string | null): Promise<Coords | null> {
  if (!name || !hasGoogleMapsKey()) return null;
  try {
    const g = await loadGoogleMaps();
    const places = await g.maps.importLibrary('places');
    const textQuery = city ? `${name} ${city}` : name;
    // New Places API: Place.searchByText
    const { places: results } = await places.Place.searchByText({
      textQuery,
      fields: ['location'],
      maxResultCount: 1,
    });
    const p = results?.[0];
    const loc = p?.location;
    const lat = typeof loc?.lat === 'function' ? loc.lat() : loc?.lat;
    const lng = typeof loc?.lng === 'function' ? loc.lng() : loc?.lng;
    if (typeof lat === 'number' && typeof lng === 'number' && Number.isFinite(lat) && Number.isFinite(lng)) {
      return { lat, lng };
    }
    return null;
  } catch {
    return null;
  }
}

/**
 * Resolution order:
 *  1) explicit lat/lng on the input
 *  2) coords parsed from venue_google_map
 *  3) edge function resolve-gmaps-link (follows redirects)
 *  4) Google Places Text Search by venue name (+ city)
 *
 * Caches in-memory and in localStorage. Fire-and-forget backfill to DB when
 * we resolve coords for an xito venue.
 */
export async function resolveVenueCoords(
  v: Input,
  ctx?: PortalContext,
): Promise<Coords | null> {
  if (typeof v.lat === 'number' && typeof v.lng === 'number') {
    return { lat: v.lat, lng: v.lng };
  }

  const url = (v.venue_google_map || '').trim();
  const nameKey = `n:${(v.venue_name || '').trim().toLowerCase()}|${(v.venue_city || '').trim().toLowerCase()}`;
  const urlKey = url ? `u:${url}` : '';
  const primaryKey = urlKey || nameKey;

  // Step 2: parse url client-side
  if (url) {
    const local = parseGoogleMapsCoords(url);
    if (local) return local;
  }

  // Cache check
  if (memCache.has(primaryKey)) return memCache.get(primaryKey) ?? null;
  const ls = lsGet(primaryKey);
  if (ls !== undefined) {
    memCache.set(primaryKey, ls);
    if (ls && ctx && v.xito_venue_id) {
      portalApi.backfillVenueCoords?.(ctx, v.xito_venue_id, ls.lat, ls.lng).catch(() => {});
    }
    return ls;
  }

  // Step 3: edge function for short links
  if (url) {
    try {
      const { data, error } = await (supabase as any).functions.invoke('resolve-gmaps-link', {
        body: { url },
      });
      if (!error && data && typeof data.lat === 'number' && typeof data.lng === 'number') {
        const coords: Coords = { lat: data.lat, lng: data.lng };
        memCache.set(primaryKey, coords);
        lsSet(primaryKey, coords);
        if (ctx && v.xito_venue_id) {
          portalApi.backfillVenueCoords?.(ctx, v.xito_venue_id, coords.lat, coords.lng).catch(() => {});
        }
        return coords;
      }
    } catch { /* fall through */ }
  }

  // Step 4: fall back to name lookup
  if (v.venue_name && v.venue_name.trim()) {
    const byName = await resolveByName(v.venue_name, v.venue_city);
    if (byName) {
      memCache.set(primaryKey, byName);
      lsSet(primaryKey, byName);
      if (ctx && v.xito_venue_id) {
        portalApi.backfillVenueCoords?.(ctx, v.xito_venue_id, byName.lat, byName.lng).catch(() => {});
      }
      return byName;
    }
  }

  memCache.set(primaryKey, null);
  // Don't poison localStorage with null — allow retry next session.
  return null;
}
