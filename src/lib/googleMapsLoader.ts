// Lazy-loads the Google Maps JS API once with the Places library.
let loadPromise: Promise<any> | null = null;

const KEY =
  (import.meta as any).env?.VITE_LOVABLE_CONNECTOR_GOOGLE_MAPS_BROWSER_KEY ||
  (import.meta as any).env?.VITE_GOOGLE_MAPS_BROWSER_KEY ||
  '';

export function hasGoogleMapsKey() {
  return Boolean(KEY);
}

export function loadGoogleMaps(): Promise<any> {
  if (typeof window === 'undefined') return Promise.reject(new Error('no window'));
  if ((window as any).google?.maps) return Promise.resolve((window as any).google);
  if (loadPromise) return loadPromise;
  if (!KEY) return Promise.reject(new Error('Missing Google Maps key'));

  loadPromise = new Promise((resolve, reject) => {
    const cb = `__gmaps_cb_${Date.now()}`;
    (window as any)[cb] = () => {
      delete (window as any)[cb];
      resolve((window as any).google);
    };
    const s = document.createElement('script');
    const channel = (import.meta as any).env?.VITE_LOVABLE_CONNECTOR_GOOGLE_MAPS_TRACKING_ID || '';
    s.src = `https://maps.googleapis.com/maps/api/js?key=${encodeURIComponent(KEY)}&libraries=places&loading=async&callback=${cb}&v=weekly${channel ? `&channel=${encodeURIComponent(channel)}` : ''}`;
    s.async = true;
    s.defer = true;
    s.onerror = () => {
      loadPromise = null;
      reject(new Error('Failed to load Google Maps'));
    };
    document.head.appendChild(s);
  });
  return loadPromise;
}
