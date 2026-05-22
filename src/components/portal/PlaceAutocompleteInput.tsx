import { useEffect, useRef, useState } from 'react';
import { loadGoogleMaps, hasGoogleMapsKey } from '@/lib/googleMapsLoader';

export interface PlaceResult {
  address: string;
  lat: number;
  lng: number;
  placeId: string;
}

interface Suggestion {
  placeId: string;
  primary: string;
  secondary: string;
  suggestion: any; // google.maps.places.AutocompleteSuggestion
}

interface Props {
  value: string;
  onChange: (v: string) => void;
  onPlace?: (p: PlaceResult) => void;
  placeholder?: string;
  className?: string;
}

export default function PlaceAutocompleteInput({ value, onChange, onPlace, placeholder, className }: Props) {
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [open, setOpen] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<number | null>(null);
  const skipNextRef = useRef(false);
  const sessionTokenRef = useRef<any>(null);
  const placesLibRef = useRef<any>(null);

  useEffect(() => {
    if (!hasGoogleMapsKey()) return;
    loadGoogleMaps()
      .then(async (google) => {
        const lib = await google.maps.importLibrary('places');
        placesLibRef.current = lib;
        sessionTokenRef.current = new lib.AutocompleteSessionToken();
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (skipNextRef.current) { skipNextRef.current = false; return; }
    if (debounceRef.current) window.clearTimeout(debounceRef.current);
    const q = value.trim();
    if (q.length < 2 || !placesLibRef.current) { setSuggestions([]); return; }
    debounceRef.current = window.setTimeout(async () => {
      try {
        const { AutocompleteSuggestion } = placesLibRef.current;
        const { suggestions: results } = await AutocompleteSuggestion.fetchAutocompleteSuggestions({
          input: q,
          sessionToken: sessionTokenRef.current,
        });
        const out: Suggestion[] = (results || []).map((s: any) => {
          const pp = s.placePrediction;
          return {
            placeId: pp?.placeId || '',
            primary: pp?.mainText?.text || pp?.text?.text || '',
            secondary: pp?.secondaryText?.text || '',
            suggestion: s,
          };
        }).filter((x: Suggestion) => x.placeId);
        setSuggestions(out);
        setOpen(true);
      } catch {
        setSuggestions([]);
      }
    }, 250);
    return () => { if (debounceRef.current) window.clearTimeout(debounceRef.current); };
  }, [value]);

  useEffect(() => {
    const h = (e: MouseEvent) => {
      if (!wrapRef.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, []);

  const pick = async (s: Suggestion) => {
    skipNextRef.current = true;
    try {
      const place = s.suggestion.placePrediction.toPlace();
      await place.fetchFields({ fields: ['displayName', 'formattedAddress', 'location'] });
      const lat = place.location?.lat?.() ?? place.location?.lat;
      const lng = place.location?.lng?.() ?? place.location?.lng;
      const address = place.formattedAddress || `${s.primary} ${s.secondary}`.trim();
      onChange(address);
      onPlace?.({
        address,
        lat: typeof lat === 'function' ? lat() : Number(lat),
        lng: typeof lng === 'function' ? lng() : Number(lng),
        placeId: s.placeId,
      });
      // refresh session token after a successful pick
      if (placesLibRef.current) {
        sessionTokenRef.current = new placesLibRef.current.AutocompleteSessionToken();
      }
    } catch {
      onChange(`${s.primary} ${s.secondary}`.trim());
    }
    setOpen(false);
    setSuggestions([]);
  };

  return (
    <div ref={wrapRef} style={{ position: 'relative', flex: 1, minWidth: 0 }}>
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onFocus={() => suggestions.length && setOpen(true)}
        placeholder={placeholder}
        className={className ?? 'w-full px-3 py-2 rounded-md border bg-background text-sm'}
        autoComplete="off"
      />
      {open && suggestions.length > 0 && (
        <div
          style={{
            position: 'absolute',
            top: 'calc(100% + 4px)',
            left: 0,
            right: 0,
            background: '#fff',
            border: '1px solid var(--cp-border, #e5e7eb)',
            borderRadius: 10,
            boxShadow: '0 8px 24px rgba(0,0,0,0.08)',
            zIndex: 50,
            maxHeight: 240,
            overflowY: 'auto',
          }}
        >
          {suggestions.map((s) => (
            <button
              key={s.placeId}
              type="button"
              onClick={() => pick(s)}
              style={{
                display: 'block',
                width: '100%',
                textAlign: 'left',
                padding: '8px 12px',
                fontSize: 13,
                background: 'transparent',
                border: 'none',
                cursor: 'pointer',
                borderBottom: '1px solid #f1f5f9',
              }}
              onMouseEnter={(e) => (e.currentTarget.style.background = '#f8fafc')}
              onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
            >
              <div style={{ fontWeight: 500, color: '#0f172a' }}>{s.primary}</div>
              {s.secondary && (
                <div style={{ fontSize: 11, color: '#64748b', marginTop: 2 }}>{s.secondary}</div>
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
