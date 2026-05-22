import { useEffect, useRef, useState } from 'react';
import { loadGoogleMaps, hasGoogleMapsKey } from '@/lib/googleMapsLoader';
import { MapPin, ExternalLink } from 'lucide-react';

interface Props {
  lat?: number | null;
  lng?: number | null;
  label?: string;
  height?: number;
  resolving?: boolean;
}

export default function MiniMapPreview({ lat, lng, label, height = 140, resolving = false }: Props) {
  const ref = useRef<HTMLDivElement>(null);
  const mapRef = useRef<any>(null);
  const markerRef = useRef<any>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    if (!ref.current || lat == null || lng == null || !hasGoogleMapsKey()) return;
    let cancelled = false;
    loadGoogleMaps()
      .then((google) => {
        if (cancelled || !ref.current) return;
        if (!mapRef.current) {
          mapRef.current = new google.maps.Map(ref.current, {
            center: { lat, lng },
            zoom: 15,
            disableDefaultUI: true,
            gestureHandling: 'none',
            clickableIcons: false,
          });
          markerRef.current = new google.maps.Marker({
            position: { lat, lng },
            map: mapRef.current,
          });
        } else {
          mapRef.current.setCenter({ lat, lng });
          markerRef.current?.setPosition({ lat, lng });
        }
      })
      .catch(() => setFailed(true));
    return () => {
      cancelled = true;
    };
  }, [lat, lng]);

  useEffect(() => {
    return () => {
      markerRef.current?.setMap(null);
      mapRef.current = null;
      markerRef.current = null;
    };
  }, []);

  if (resolving && (lat == null || lng == null)) {
    return (
      <div
        className="flex items-center justify-center rounded-xl bg-muted/40 border border-dashed text-xs text-muted-foreground animate-pulse"
        style={{ height }}
      >
        Loading map…
      </div>
    );
  }

  if (lat == null || lng == null) {
    return (
      <div
        className="flex items-center justify-center rounded-xl bg-muted/40 border border-dashed text-xs text-muted-foreground"
        style={{ height }}
      >
        <MapPin className="h-4 w-4 mr-1" /> No location pinned yet
      </div>
    );
  }

  if (!hasGoogleMapsKey() || failed) {
    const href = `https://www.google.com/maps?q=${lat},${lng}`;
    return (
      <a
        href={href}
        target="_blank"
        rel="noreferrer"
        className="flex items-center justify-center rounded-xl bg-muted/40 border text-xs text-primary underline"
        style={{ height }}
      >
        Open in Maps <ExternalLink className="h-3 w-3 ml-1" />
      </a>
    );
  }

  return (
    <div className="relative">
      <div ref={ref} className="rounded-xl overflow-hidden border" style={{ height }} />
      <a
        href={`https://www.google.com/maps?q=${lat},${lng}${label ? `(${encodeURIComponent(label)})` : ''}`}
        target="_blank"
        rel="noreferrer"
        className="absolute right-2 bottom-2 bg-white/95 backdrop-blur text-[11px] px-2 py-1 rounded-md shadow flex items-center gap-1 text-slate-700"
      >
        Open <ExternalLink className="h-3 w-3" />
      </a>
    </div>
  );
}
