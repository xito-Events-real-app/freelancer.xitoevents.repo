import { useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';
import { loadGoogleMaps, hasGoogleMapsKey } from '@/lib/googleMapsLoader';

export interface HomeLocationValue {
  lat: number | null;
  lng: number | null;
  address: string;
  city: string;
  area: string;
  place_id: string;
  maps_link: string;
}

interface Props {
  value: HomeLocationValue;
  onChange: (patch: Partial<HomeLocationValue>) => void;
}

const KTM = { lat: 27.7172, lng: 85.324 };

interface Suggestion {
  placeId: string;
  primary: string;
  secondary: string;
  raw: any;
}

export default function HomeLocationPicker({ value, onChange }: Props) {
  const mapHostRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<any>(null);
  const markerRef = useRef<any>(null);
  const geocoderRef = useRef<any>(null);
  const placesLibRef = useRef<any>(null);
  const sessionTokenRef = useRef<any>(null);
  const searchWrapRef = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<number | null>(null);

  const [mapReady, setMapReady] = useState(false);
  const [busy, setBusy] = useState(false);
  const [query, setQuery] = useState('');
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [sugOpen, setSugOpen] = useState(false);
  const [gpsBusy, setGpsBusy] = useState(false);

  // Load map + places lib once
  useEffect(() => {
    if (!hasGoogleMapsKey() || !mapHostRef.current) return;
    let cancelled = false;
    loadGoogleMaps()
      .then(async (google) => {
        if (cancelled || !mapHostRef.current) return;
        const start =
          value.lat != null && value.lng != null ? { lat: value.lat, lng: value.lng } : KTM;
        mapRef.current = new google.maps.Map(mapHostRef.current, {
          center: start,
          zoom: value.lat != null ? 16 : 13,
          clickableIcons: false,
          mapTypeControl: false,
          streetViewControl: false,
          fullscreenControl: false,
          zoomControl: true,
        });
        markerRef.current = new google.maps.Marker({
          position: start,
          map: mapRef.current,
          draggable: true,
        });
        geocoderRef.current = new google.maps.Geocoder();
        markerRef.current.addListener('dragend', () => {
          const p = markerRef.current.getPosition();
          handleNewPosition({ lat: p.lat(), lng: p.lng() }, { zoom: false });
        });
        mapRef.current.addListener('click', (e: any) => {
          handleNewPosition({ lat: e.latLng.lat(), lng: e.latLng.lng() }, { zoom: false });
        });
        try {
          const lib = await google.maps.importLibrary('places');
          placesLibRef.current = lib;
          sessionTokenRef.current = new lib.AutocompleteSessionToken();
        } catch {
          /* places optional */
        }
        setMapReady(true);
      })
      .catch(() => toast.error('Could not load Google Maps'));
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Sync external value into marker/map when it changes from outside
  useEffect(() => {
    if (!mapReady || !markerRef.current || !mapRef.current) return;
    if (value.lat != null && value.lng != null) {
      const p = { lat: value.lat, lng: value.lng };
      const cur = markerRef.current.getPosition();
      if (!cur || Math.abs(cur.lat() - p.lat) > 1e-6 || Math.abs(cur.lng() - p.lng) > 1e-6) {
        markerRef.current.setPosition(p);
        mapRef.current.setCenter(p);
      }
    }
  }, [mapReady, value.lat, value.lng]);

  // Close suggestions on outside click
  useEffect(() => {
    const h = (e: MouseEvent) => {
      if (!searchWrapRef.current?.contains(e.target as Node)) setSugOpen(false);
    };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, []);

  // Autocomplete debounce
  useEffect(() => {
    if (debounceRef.current) window.clearTimeout(debounceRef.current);
    const q = query.trim();
    if (q.length < 2 || !placesLibRef.current) {
      setSuggestions([]);
      return;
    }
    debounceRef.current = window.setTimeout(async () => {
      try {
        const { AutocompleteSuggestion } = placesLibRef.current;
        const { suggestions: results } = await AutocompleteSuggestion.fetchAutocompleteSuggestions({
          input: q,
          sessionToken: sessionTokenRef.current,
        });
        const out: Suggestion[] = (results || [])
          .map((s: any) => {
            const pp = s.placePrediction;
            return {
              placeId: pp?.placeId || '',
              primary: pp?.mainText?.text || pp?.text?.text || '',
              secondary: pp?.secondaryText?.text || '',
              raw: s,
            };
          })
          .filter((x: Suggestion) => x.placeId);
        setSuggestions(out);
        setSugOpen(true);
      } catch {
        setSuggestions([]);
      }
    }, 250);
    return () => {
      if (debounceRef.current) window.clearTimeout(debounceRef.current);
    };
  }, [query]);

  // Core: write a new position + reverse-geocoded fields into parent state
  const handleNewPosition = async (
    p: { lat: number; lng: number },
    opts: { zoom?: boolean; addressOverride?: string; placeIdOverride?: string } = {}
  ) => {
    if (!mapRef.current || !markerRef.current) return;
    markerRef.current.setPosition(p);
    mapRef.current.panTo(p);
    if (opts.zoom) mapRef.current.setZoom(16);

    const patch: Partial<HomeLocationValue> = {
      lat: p.lat,
      lng: p.lng,
      maps_link: `https://www.google.com/maps?q=${p.lat},${p.lng}`,
    };
    if (opts.addressOverride) patch.address = opts.addressOverride;
    if (opts.placeIdOverride) patch.place_id = opts.placeIdOverride;
    onChange(patch);

    if (!geocoderRef.current) return;
    setBusy(true);
    try {
      const res = await geocoderRef.current.geocode({ location: p });
      const r = res?.results?.[0];
      if (r) {
        const comps: any[] = r.address_components || [];
        const find = (type: string) =>
          comps.find((c: any) => c.types?.includes(type))?.long_name || '';
        const city =
          find('locality') ||
          find('administrative_area_level_2') ||
          find('administrative_area_level_1');
        const area =
          find('sublocality_level_1') ||
          find('sublocality') ||
          find('neighborhood') ||
          find('administrative_area_level_3');
        const patch2: Partial<HomeLocationValue> = {};
        if (!opts.addressOverride && r.formatted_address) patch2.address = r.formatted_address;
        if (!opts.placeIdOverride && r.place_id) patch2.place_id = r.place_id;
        if (city) patch2.city = city;
        if (area) patch2.area = area;
        if (Object.keys(patch2).length) onChange(patch2);
      }
    } catch {
      /* noop */
    } finally {
      setBusy(false);
    }
  };

  const pickSuggestion = async (s: Suggestion) => {
    setSugOpen(false);
    setSuggestions([]);
    setQuery('');
    if (!placesLibRef.current) return;
    setBusy(true);
    try {
      const place = s.raw.placePrediction.toPlace();
      await place.fetchFields({ fields: ['displayName', 'formattedAddress', 'location'] });
      const lat =
        typeof place.location?.lat === 'function' ? place.location.lat() : Number(place.location?.lat);
      const lng =
        typeof place.location?.lng === 'function' ? place.location.lng() : Number(place.location?.lng);
      if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
        toast.error('Could not load that place');
        return;
      }
      const address = place.formattedAddress || `${s.primary} ${s.secondary}`.trim();
      await handleNewPosition(
        { lat, lng },
        { zoom: true, addressOverride: address, placeIdOverride: s.placeId }
      );
      // refresh token after pick
      if (placesLibRef.current) {
        sessionTokenRef.current = new placesLibRef.current.AutocompleteSessionToken();
      }
    } catch {
      toast.error('Could not load that place');
    } finally {
      setBusy(false);
    }
  };

  const useCurrentLocation = () => {
    if (!navigator.geolocation) {
      toast.error('Geolocation not supported on this device');
      return;
    }
    setGpsBusy(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setGpsBusy(false);
        handleNewPosition(
          { lat: pos.coords.latitude, lng: pos.coords.longitude },
          { zoom: true }
        );
      },
      (err) => {
        setGpsBusy(false);
        if (err.code === err.PERMISSION_DENIED)
          toast.error('Location permission denied');
        else if (err.code === err.POSITION_UNAVAILABLE)
          toast.error('Location unavailable. Try again outdoors.');
        else if (err.code === err.TIMEOUT) toast.error('Location request timed out');
        else toast.error('Could not get your location');
      },
      { enableHighAccuracy: true, timeout: 12000, maximumAge: 30000 }
    );
  };

  const clearField = (k: 'city' | 'area') => onChange({ [k]: '' } as Partial<HomeLocationValue>);

  // ----- shared inline styles using portal tokens -----
  const inputStyle: React.CSSProperties = {
    width: '100%',
    border: '1px solid var(--cp-border)',
    borderRadius: 10,
    padding: '10px 32px 10px 12px',
    fontSize: 13,
    background: '#fff',
    fontFamily: 'inherit',
    color: 'var(--cp-text)',
  };
  const clearBtnStyle: React.CSSProperties = {
    position: 'absolute',
    right: 6,
    top: '50%',
    transform: 'translateY(-50%)',
    width: 22,
    height: 22,
    borderRadius: '50%',
    border: 'none',
    background: 'var(--cp-surface-2)',
    color: 'var(--cp-text-3)',
    fontSize: 12,
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  };

  if (!hasGoogleMapsKey()) {
    return (
      <div style={{ padding: 12, fontSize: 12, color: 'var(--cp-text-3)' }}>
        Map is unavailable (missing Google Maps key).
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      {/* 1. Search */}
      <div ref={searchWrapRef} style={{ position: 'relative' }}>
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => suggestions.length && setSugOpen(true)}
          placeholder="🔍 Search address or place…"
          style={{ ...inputStyle, padding: '10px 12px' }}
          autoComplete="off"
        />
        {sugOpen && suggestions.length > 0 && (
          <div
            style={{
              position: 'absolute',
              top: 'calc(100% + 4px)',
              left: 0,
              right: 0,
              background: 'var(--cp-surface)',
              border: '1px solid var(--cp-border)',
              borderRadius: 10,
              boxShadow: '0 8px 24px rgba(0,0,0,0.08)',
              zIndex: 60,
              maxHeight: 240,
              overflowY: 'auto',
            }}
          >
            {suggestions.map((s) => (
              <button
                key={s.placeId}
                type="button"
                onClick={() => pickSuggestion(s)}
                style={{
                  display: 'block',
                  width: '100%',
                  textAlign: 'left',
                  padding: '8px 12px',
                  fontSize: 13,
                  background: 'transparent',
                  border: 'none',
                  cursor: 'pointer',
                  borderBottom: '1px solid var(--cp-border)',
                  fontFamily: 'inherit',
                }}
              >
                <div style={{ fontWeight: 500, color: 'var(--cp-text)' }}>{s.primary}</div>
                {s.secondary && (
                  <div style={{ fontSize: 11, color: 'var(--cp-text-3)', marginTop: 2 }}>
                    {s.secondary}
                  </div>
                )}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* 2. Use current location */}
      <button
        type="button"
        onClick={useCurrentLocation}
        disabled={gpsBusy}
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 8,
          padding: '10px 14px',
          borderRadius: 10,
          border: '1px solid var(--rose)',
          background: 'var(--rose-light)',
          color: 'var(--rose-dark)',
          fontSize: 13,
          fontWeight: 500,
          cursor: gpsBusy ? 'wait' : 'pointer',
          fontFamily: 'inherit',
          opacity: gpsBusy ? 0.7 : 1,
        }}
      >
        {gpsBusy ? '📡 Getting your location…' : '📍 Use my current location'}
      </button>

      {/* 3. Map */}
      <div
        style={{
          position: 'relative',
          width: '100%',
          height: 220,
          borderRadius: 12,
          overflow: 'hidden',
          border: '1px solid var(--cp-border)',
          background: 'var(--cp-surface-2)',
        }}
      >
        <div ref={mapHostRef} style={{ width: '100%', height: '100%' }} />
        {!mapReady && (
          <div
            style={{
              position: 'absolute',
              inset: 0,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 12,
              color: 'var(--cp-text-3)',
            }}
          >
            Loading map…
          </div>
        )}
        {busy && mapReady && (
          <div
            style={{
              position: 'absolute',
              top: 8,
              right: 8,
              background: 'rgba(255,255,255,0.92)',
              border: '1px solid var(--cp-border)',
              borderRadius: 20,
              padding: '4px 10px',
              fontSize: 11,
              color: 'var(--cp-text-2)',
            }}
          >
            Looking up address…
          </div>
        )}
      </div>
      <div style={{ fontSize: 11, color: 'var(--cp-text-3)', marginTop: -4 }}>
        Drag the pin or tap the map to adjust the exact location.
      </div>

      {/* 4-5. City + Area */}
      <div style={{ display: 'flex', gap: 8 }}>
        <div style={{ flex: 1, position: 'relative' }}>
          <label
            style={{
              display: 'block',
              fontSize: 10,
              color: 'var(--cp-text-3)',
              marginBottom: 4,
              letterSpacing: '.08em',
              textTransform: 'uppercase',
            }}
          >
            City
          </label>
          <div style={{ position: 'relative' }}>
            <input
              value={value.city || ''}
              onChange={(e) => onChange({ city: e.target.value })}
              placeholder="Kathmandu"
              style={inputStyle}
            />
            {value.city && (
              <button
                type="button"
                onClick={() => clearField('city')}
                style={clearBtnStyle}
                aria-label="Clear city"
              >
                ✕
              </button>
            )}
          </div>
        </div>
        <div style={{ flex: 1, position: 'relative' }}>
          <label
            style={{
              display: 'block',
              fontSize: 10,
              color: 'var(--cp-text-3)',
              marginBottom: 4,
              letterSpacing: '.08em',
              textTransform: 'uppercase',
            }}
          >
            Area / Tole
          </label>
          <div style={{ position: 'relative' }}>
            <input
              value={value.area || ''}
              onChange={(e) => onChange({ area: e.target.value })}
              placeholder="Thamel"
              style={inputStyle}
            />
            {value.area && (
              <button
                type="button"
                onClick={() => clearField('area')}
                style={clearBtnStyle}
                aria-label="Clear area"
              >
                ✕
              </button>
            )}
          </div>
        </div>
      </div>

      {/* 6. Maps link */}
      <div>
        <label
          style={{
            display: 'block',
            fontSize: 10,
            color: 'var(--cp-text-3)',
            marginBottom: 4,
            letterSpacing: '.08em',
            textTransform: 'uppercase',
          }}
        >
          Google Maps Link
        </label>
        <input
          value={value.maps_link || ''}
          onChange={(e) => onChange({ maps_link: e.target.value })}
          placeholder="https://www.google.com/maps?q=…"
          style={{ ...inputStyle, padding: '10px 12px' }}
        />
        {value.maps_link && (
          <a
            href={value.maps_link}
            target="_blank"
            rel="noreferrer"
            style={{ fontSize: 11, color: 'var(--rose-dark)', textDecoration: 'underline', marginTop: 4, display: 'inline-block' }}
          >
            Open in Google Maps ↗
          </a>
        )}
      </div>
    </div>
  );
}
