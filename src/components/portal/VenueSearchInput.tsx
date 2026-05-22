import { useEffect, useRef, useState } from 'react';
import { loadGoogleMaps, hasGoogleMapsKey } from '@/lib/googleMapsLoader';
import { portalApi, type PortalContext } from '@/lib/portalClient';
import { parseGoogleMapsCoords } from '@/lib/parseGoogleMapsCoords';

export interface XitoVenuePick {
  source: 'xito';
  xito_venue_id: string;
  venue_name: string;
  venue_type: string;
  venue_area: string;
  venue_city: string;
  venue_google_map: string;
  avatar_url: string;
  cover_url: string;
  lat: number | null;
  lng: number | null;
}
export interface GooglePick {
  source: 'google';
  venue_name: string;
  venue_address: string;
  venue_lat: number;
  venue_lng: number;
  venue_place_id: string;
}

interface XitoRow {
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
interface GoogleSug {
  placeId: string;
  primary: string;
  secondary: string;
  suggestion: any;
}

interface Props {
  ctx: PortalContext;
  value: string;
  onChange: (v: string) => void;
  onPickXito: (p: XitoVenuePick) => void;
  onPickGoogle: (p: GooglePick) => void;
  placeholder?: string;
  className?: string;
}

const COLORS = ['#e8a87c', '#87a878', '#c17c74', '#5cbdb9', '#9b72cf', '#d4842a'];
function colorFor(name: string) {
  let h = 0;
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) | 0;
  return COLORS[Math.abs(h) % COLORS.length];
}

export default function VenueSearchInput({
  ctx, value, onChange, onPickXito, onPickGoogle, placeholder, className,
}: Props) {
  const [xito, setXito] = useState<XitoRow[]>([]);
  const [google, setGoogle] = useState<GoogleSug[]>([]);
  const [open, setOpen] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);
  const debRef = useRef<number | null>(null);
  const skipRef = useRef(false);
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

  useEffect(() => {
    if (skipRef.current) { skipRef.current = false; return; }
    if (debRef.current) window.clearTimeout(debRef.current);
    const q = value.trim();
    if (q.length < 2) { setXito([]); setGoogle([]); return; }
    debRef.current = window.setTimeout(async () => {
      const tasks: Promise<any>[] = [
        portalApi.searchVenues(ctx, q, 8).catch(() => []),
        placesLib.current
          ? placesLib.current.AutocompleteSuggestion.fetchAutocompleteSuggestions({
              input: q, sessionToken: sessTok.current,
            }).then((r: any) =>
              (r.suggestions || []).map((s: any) => {
                const pp = s.placePrediction;
                return {
                  placeId: pp?.placeId || '',
                  primary: pp?.mainText?.text || pp?.text?.text || '',
                  secondary: pp?.secondaryText?.text || '',
                  suggestion: s,
                };
              }).filter((x: GoogleSug) => x.placeId)
            ).catch(() => [])
          : Promise.resolve([]),
      ];
      const [xRows, gRows] = await Promise.all(tasks);
      setXito((xRows as XitoRow[]) || []);
      setGoogle((gRows as GoogleSug[]) || []);
      setOpen(true);
    }, 250);
    return () => { if (debRef.current) window.clearTimeout(debRef.current); };
  }, [value, ctx]);

  useEffect(() => {
    const h = (e: MouseEvent) => {
      if (!wrapRef.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, []);

  const pickXito = (r: XitoRow) => {
    skipRef.current = true;
    let lat = r.lat;
    let lng = r.lng;
    if ((lat == null || lng == null) && r.google_map) {
      const parsed = parseGoogleMapsCoords(r.google_map);
      if (parsed) { lat = parsed.lat; lng = parsed.lng; }
    }
    onPickXito({
      source: 'xito',
      xito_venue_id: r.id,
      venue_name: r.venue_name,
      venue_type: r.venue_type,
      venue_area: r.area || '',
      venue_city: r.city || '',
      venue_google_map: r.google_map || '',
      avatar_url: r.avatar_url || '',
      cover_url: r.cover_url || '',
      lat,
      lng,
    });
    setOpen(false); setXito([]); setGoogle([]);
  };

  const pickGoogle = async (s: GoogleSug) => {
    skipRef.current = true;
    try {
      const place = s.suggestion.placePrediction.toPlace();
      await place.fetchFields({ fields: ['displayName', 'formattedAddress', 'location'] });
      const lat = place.location?.lat?.() ?? place.location?.lat;
      const lng = place.location?.lng?.() ?? place.location?.lng;
      const address = place.formattedAddress || `${s.primary} ${s.secondary}`.trim();
      onPickGoogle({
        source: 'google',
        venue_name: s.primary || address.split(',')[0] || address,
        venue_address: address,
        venue_lat: typeof lat === 'function' ? lat() : Number(lat),
        venue_lng: typeof lng === 'function' ? lng() : Number(lng),
        venue_place_id: s.placeId,
      });
      if (placesLib.current) sessTok.current = new placesLib.current.AutocompleteSessionToken();
    } catch {
      onChange(`${s.primary} ${s.secondary}`.trim());
    }
    setOpen(false); setXito([]); setGoogle([]);
  };

  const hasResults = xito.length > 0 || google.length > 0;

  return (
    <div ref={wrapRef} style={{ position: 'relative', flex: 1, minWidth: 0 }}>
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onFocus={() => hasResults && setOpen(true)}
        placeholder={placeholder}
        className={className ?? 'w-full px-3 py-2 rounded-md border bg-background text-sm'}
        autoComplete="off"
      />
      {open && hasResults && (
        <div
          style={{
            position: 'absolute', top: 'calc(100% + 4px)', left: 0, right: 0,
            background: '#fff', border: '1px solid var(--cp-border, #e5e7eb)',
            borderRadius: 10, boxShadow: '0 8px 24px rgba(0,0,0,0.08)',
            zIndex: 50, maxHeight: 360, overflowY: 'auto',
          }}
        >
          {xito.length > 0 && (
            <>
              <div style={sectionHeader}>From our venues</div>
              {xito.map((v) => (
                <button
                  key={v.id} type="button" onClick={() => pickXito(v)}
                  style={rowBtn}
                  onMouseEnter={(e) => (e.currentTarget.style.background = '#f8fafc')}
                  onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                >
                  <Avatar name={v.venue_name} url={v.avatar_url || v.cover_url} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <span style={{ fontWeight: 600, color: '#0f172a', fontSize: 13, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{v.venue_name}</span>
                      <span style={typeChip}>{v.venue_type}</span>
                    </div>
                    <div style={{ fontSize: 11, color: '#64748b', marginTop: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {[v.area, v.city].filter(Boolean).join(', ') || '—'}
                    </div>
                  </div>
                </button>
              ))}
            </>
          )}
          {google.length > 0 && (
            <>
              <div style={sectionHeader}>Other places</div>
              {google.map((s) => (
                <button
                  key={s.placeId} type="button" onClick={() => pickGoogle(s)}
                  style={rowBtn}
                  onMouseEnter={(e) => (e.currentTarget.style.background = '#f8fafc')}
                  onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                >
                  <div style={{ width: 32, height: 32, borderRadius: 8, background: '#f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, flexShrink: 0 }}>📍</div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 500, color: '#0f172a', fontSize: 13, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{s.primary}</div>
                    {s.secondary && <div style={{ fontSize: 11, color: '#64748b', marginTop: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{s.secondary}</div>}
                  </div>
                </button>
              ))}
            </>
          )}
        </div>
      )}
    </div>
  );
}

function Avatar({ name, url }: { name: string; url?: string }) {
  if (url) {
    return <img src={url} alt="" style={{ width: 32, height: 32, borderRadius: '50%', objectFit: 'cover', flexShrink: 0 }} />;
  }
  const ch = (name || '?').trim().charAt(0).toUpperCase();
  return (
    <div style={{ width: 32, height: 32, borderRadius: '50%', background: colorFor(name), color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: 13, flexShrink: 0 }}>
      {ch}
    </div>
  );
}

const sectionHeader: React.CSSProperties = {
  fontSize: 10, fontWeight: 600, letterSpacing: 0.5, textTransform: 'uppercase',
  color: '#94a3b8', padding: '8px 12px 4px',
};
const rowBtn: React.CSSProperties = {
  display: 'flex', alignItems: 'center', gap: 10,
  width: '100%', textAlign: 'left', padding: '8px 12px',
  background: 'transparent', border: 'none', cursor: 'pointer',
  borderBottom: '1px solid #f1f5f9',
};
const typeChip: React.CSSProperties = {
  fontSize: 9, fontWeight: 600, padding: '2px 6px', borderRadius: 4,
  background: '#ede9fe', color: '#7c3aed', letterSpacing: 0.3,
};
