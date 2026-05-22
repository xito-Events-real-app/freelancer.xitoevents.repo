import { useEffect, useRef, useState } from 'react';
import { loadGoogleMaps, hasGoogleMapsKey } from '@/lib/googleMapsLoader';

export interface MapPickResult {
  lat: number;
  lng: number;
  address: string;
  city: string;
  area: string;
  place_id: string;
  maps_link: string;
}

interface Props {
  open: boolean;
  initialLat?: number | null;
  initialLng?: number | null;
  onClose: () => void;
  onPick: (r: MapPickResult) => void;
}

const KTM = { lat: 27.7172, lng: 85.3240 };

export default function MapPickerDialog({ open, initialLat, initialLng, onClose, onPick }: Props) {
  const ref = useRef<HTMLDivElement>(null);
  const mapRef = useRef<any>(null);
  const markerRef = useRef<any>(null);
  const geocoderRef = useRef<any>(null);
  const [pos, setPos] = useState<{ lat: number; lng: number } | null>(
    initialLat != null && initialLng != null ? { lat: initialLat, lng: initialLng } : null
  );
  const [preview, setPreview] = useState<MapPickResult | null>(null);
  const [searching, setSearching] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!open || !ref.current || !hasGoogleMapsKey()) return;
    let cancelled = false;
    loadGoogleMaps().then((google) => {
      if (cancelled || !ref.current) return;
      const start = pos || (initialLat && initialLng ? { lat: initialLat, lng: initialLng } : KTM);
      mapRef.current = new google.maps.Map(ref.current, {
        center: start, zoom: 14, clickableIcons: false, mapTypeControl: false, streetViewControl: false, fullscreenControl: false,
      });
      markerRef.current = new google.maps.Marker({ position: start, map: mapRef.current, draggable: true });
      geocoderRef.current = new google.maps.Geocoder();
      const handle = (latLng: any) => {
        const p = { lat: latLng.lat(), lng: latLng.lng() };
        setPos(p);
        markerRef.current.setPosition(p);
        runReverse(p);
      };
      mapRef.current.addListener('click', (e: any) => handle(e.latLng));
      markerRef.current.addListener('dragend', () => handle(markerRef.current.getPosition()));
      if (pos || (initialLat && initialLng)) runReverse(start);
    });
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const runReverse = async (p: { lat: number; lng: number }) => {
    if (!geocoderRef.current) return;
    setLoading(true);
    try {
      const res = await geocoderRef.current.geocode({ location: p });
      const r = res?.results?.[0];
      if (!r) { setLoading(false); return; }
      const comps: any[] = r.address_components || [];
      const find = (type: string) => comps.find((c: any) => c.types?.includes(type))?.long_name || '';
      const city = find('locality') || find('administrative_area_level_2') || find('administrative_area_level_1');
      const area = find('sublocality') || find('sublocality_level_1') || find('neighborhood') || find('administrative_area_level_3');
      setPreview({
        lat: p.lat, lng: p.lng,
        address: r.formatted_address || '',
        city, area,
        place_id: r.place_id || '',
        maps_link: `https://www.google.com/maps?q=${p.lat},${p.lng}`,
      });
    } catch { /* noop */ }
    setLoading(false);
  };

  const runSearch = async () => {
    if (!searching.trim() || !geocoderRef.current) return;
    setLoading(true);
    try {
      const res = await geocoderRef.current.geocode({ address: searching });
      const r = res?.results?.[0];
      if (r) {
        const p = { lat: r.geometry.location.lat(), lng: r.geometry.location.lng() };
        mapRef.current.setCenter(p); mapRef.current.setZoom(16);
        markerRef.current.setPosition(p);
        setPos(p);
        runReverse(p);
      }
    } catch { /* noop */ }
    setLoading(false);
  };

  if (!open) return null;
  if (!hasGoogleMapsKey()) {
    return (
      <div className="cp-mbk open" onClick={(e) => e.target === e.currentTarget && onClose()} style={{ zIndex: 200 }}>
        <div className="cp-msh">
          <div className="cp-mt">Map unavailable</div>
          <div className="cp-ms">Google Maps key is not configured.</div>
          <div className="cp-mac"><button className="cp-bn" onClick={onClose}>Close</button></div>
        </div>
      </div>
    );
  }

  return (
    <div className="cp-mbk open" onClick={(e) => e.target === e.currentTarget && onClose()} style={{ zIndex: 200 }}>
      <div className="cp-msh" style={{ maxWidth: 520, width: '100%' }}>
        <div className="cp-mt">Pick location on map</div>
        <div className="cp-ms">Click on the map or drag the pin. City fills in automatically.</div>
        <div style={{ display: 'flex', gap: 6, marginBottom: 8 }}>
          <input
            placeholder="Search a place…"
            value={searching}
            onChange={(e) => setSearching(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), runSearch())}
            style={{ flex: 1, border: '1px solid var(--cp-border)', borderRadius: 8, padding: '8px 10px', fontSize: 13 }}
          />
          <button className="cp-bn" style={{ padding: '8px 12px' }} onClick={runSearch}>Search</button>
        </div>
        <div ref={ref} style={{ width: '100%', height: 320, borderRadius: 10, overflow: 'hidden', border: '1px solid var(--cp-border)' }} />
        <div style={{ marginTop: 10, padding: 10, background: 'var(--cp-surface-2)', borderRadius: 8, fontSize: 12, color: 'var(--cp-text-2)', minHeight: 60 }}>
          {loading ? 'Looking up address…' :
            preview ? (
              <>
                <div><strong>Address:</strong> {preview.address || '—'}</div>
                <div><strong>City:</strong> {preview.city || '—'}{preview.area ? ` · ${preview.area}` : ''}</div>
              </>
            ) : 'Tap the map to place a pin.'}
        </div>
        <div className="cp-mac">
          <button className="cp-bb" onClick={onClose}>Cancel</button>
          <button className="cp-bn" disabled={!preview} onClick={() => preview && (onPick(preview), onClose())}>Use this location</button>
        </div>
      </div>
    </div>
  );
}
