import { useCallback, useEffect, useRef, useState } from 'react';
import { loadGoogleMaps, hasGoogleMapsKey } from '@/lib/googleMapsLoader';
import { portalApi, type PortalContext } from '@/lib/portalClient';
import { parseGoogleMapsCoords } from '@/lib/parseGoogleMapsCoords';
import type { XitoVenuePick, GooglePick } from '@/components/portal/VenueSearchInput';

export interface XitoRow {
  id: string;
  venue_name: string;
  venue_type: string;
  city: string;
  area: string;
  avatar_url: string;
  cover_url: string;
  lat: number | null;
  lng: number | null;
  google_map: string | null;
}
export interface GoogleSug {
  placeId: string;
  primary: string;
  secondary: string;
  suggestion: any;
}

// Module-scoped caches survive dialog open/close (per session)
const xitoCache = new Map<string, XitoRow[]>(); // key: lowercased query
const googlePlaceCache = new Map<string, GooglePick>(); // placeId -> resolved pick
let prefetchPromise: Promise<XitoRow[]> | null = null;
let prefetchedPool: XitoRow[] = [];

function clientFilter(pool: XitoRow[], q: string): XitoRow[] {
  const needle = q.toLowerCase();
  return pool
    .filter((v) => {
      const hay = `${v.venue_name} ${v.area || ''} ${v.city || ''}`.toLowerCase();
      return hay.includes(needle);
    })
    .slice(0, 8);
}

export function useVenueSearch(ctx: PortalContext) {
  const [query, setQuery] = useState('');
  const [xito, setXito] = useState<XitoRow[]>([]);
  const [google, setGoogle] = useState<GoogleSug[]>([]);
  const [loading, setLoading] = useState(false);
  const debRef = useRef<number | null>(null);
  const googleDebRef = useRef<number | null>(null);
  const reqIdRef = useRef(0);
  const sessTok = useRef<any>(null);
  const placesLib = useRef<any>(null);

  useEffect(() => {
    if (!hasGoogleMapsKey()) return;
    loadGoogleMaps().then(async (g) => {
      const lib = await g.maps.importLibrary('places');
      placesLib.current = lib;
      sessTok.current = new lib.AutocompleteSessionToken();
    }).catch(() => {});
  }, []);

  const prefetch = useCallback(() => {
    if (prefetchedPool.length > 0) {
      setXito(prefetchedPool.slice(0, 8));
      return;
    }
    if (!prefetchPromise) {
      prefetchPromise = portalApi
        .searchVenues(ctx, '', 50)
        .then((rows: any) => (rows as XitoRow[]) || [])
        .catch(() => []);
    }
    prefetchPromise.then((rows) => {
      prefetchedPool = rows;
      setXito((cur) => (cur.length === 0 ? rows.slice(0, 8) : cur));
    });
  }, [ctx]);

  const runGoogle = useCallback(async (q: string, myReq: number) => {
    if (!placesLib.current) return;
    try {
      const r = await placesLib.current.AutocompleteSuggestion.fetchAutocompleteSuggestions({
        input: q, sessionToken: sessTok.current,
      });
      if (myReq !== reqIdRef.current) return;
      const sugs: GoogleSug[] = (r.suggestions || []).map((s: any) => {
        const pp = s.placePrediction;
        return {
          placeId: pp?.placeId || '',
          primary: pp?.mainText?.text || pp?.text?.text || '',
          secondary: pp?.secondaryText?.text || '',
          suggestion: s,
        };
      }).filter((x: GoogleSug) => x.placeId);
      setGoogle(sugs);
    } catch { /* noop */ }
  }, []);

  useEffect(() => {
    if (debRef.current) window.clearTimeout(debRef.current);
    if (googleDebRef.current) window.clearTimeout(googleDebRef.current);
    const q = query.trim();

    if (q.length < 1) {
      setXito(prefetchedPool.slice(0, 8));
      setGoogle([]);
      setLoading(false);
      return;
    }

    // Stale-while-revalidate: render cache + filtered pool instantly
    const key = q.toLowerCase();
    const cached = xitoCache.get(key);
    const filtered = clientFilter(prefetchedPool, q);
    const instant = cached ?? filtered;
    setXito(instant);
    setGoogle([]); // reset; Google only fires if Xito has 0 results after idle
    setLoading(instant.length === 0);

    const myReq = ++reqIdRef.current;

    // Fire Xito (fast) on a tight debounce
    debRef.current = window.setTimeout(async () => {
      try {
        const xRows = await portalApi.searchVenues(ctx, q, 8).catch(() => []);
        if (myReq !== reqIdRef.current) return; // stale
        const freshXito = (xRows as XitoRow[]) || [];
        xitoCache.set(key, freshXito);
        setXito(freshXito);
      } finally {
        if (myReq === reqIdRef.current) setLoading(false);
      }
    }, 80);

    // Always fire Google Places in parallel on a slightly longer idle debounce
    googleDebRef.current = window.setTimeout(() => {
      if (myReq !== reqIdRef.current) return;
      runGoogle(q, myReq);
    }, 250);
    return () => {
      if (debRef.current) window.clearTimeout(debRef.current);
      if (googleDebRef.current) window.clearTimeout(googleDebRef.current);
    };
  }, [query, ctx, runGoogle]);

  const buildXitoPick = (r: XitoRow): XitoVenuePick => {
    let lat = r.lat;
    let lng = r.lng;
    if ((lat == null || lng == null) && r.google_map) {
      const parsed = parseGoogleMapsCoords(r.google_map);
      if (parsed) { lat = parsed.lat; lng = parsed.lng; }
    }
    return {
      source: 'xito',
      xito_venue_id: r.id,
      venue_name: r.venue_name,
      venue_type: r.venue_type,
      venue_area: r.area || '',
      venue_city: r.city || '',
      venue_google_map: r.google_map || '',
      avatar_url: r.avatar_url || '',
      cover_url: r.cover_url || '',
      lat, lng,
    };
  };

  const buildGooglePick = async (s: GoogleSug): Promise<GooglePick | null> => {
    const hit = googlePlaceCache.get(s.placeId);
    if (hit) return hit;
    try {
      const place = s.suggestion.placePrediction.toPlace();
      await place.fetchFields({ fields: ['displayName', 'formattedAddress', 'location'] });
      const lat = place.location?.lat?.() ?? place.location?.lat;
      const lng = place.location?.lng?.() ?? place.location?.lng;
      const address = place.formattedAddress || `${s.primary} ${s.secondary}`.trim();
      if (placesLib.current) sessTok.current = new placesLib.current.AutocompleteSessionToken();
      const pick: GooglePick = {
        source: 'google',
        venue_name: s.primary || address.split(',')[0] || address,
        venue_address: address,
        venue_lat: typeof lat === 'function' ? lat() : Number(lat),
        venue_lng: typeof lng === 'function' ? lng() : Number(lng),
        venue_place_id: s.placeId,
      };
      googlePlaceCache.set(s.placeId, pick);
      return pick;
    } catch {
      return null;
    }
  };

  return { query, setQuery, xito, google, loading, buildXitoPick, buildGooglePick, prefetch };
}
