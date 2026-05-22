// Parse lat/lng out of common Google Maps URL formats.
// Short links (maps.app.goo.gl, goo.gl/maps) cannot be resolved client-side.
export function parseGoogleMapsCoords(url: string): { lat: number; lng: number } | null {
  if (!url) return null;
  const t = url.trim();
  // /@lat,lng,zoom
  const at = t.match(/@(-?\d+(?:\.\d+)?),(-?\d+(?:\.\d+)?)/);
  if (at) return finish(at[1], at[2]);
  // ?q=lat,lng or &q=lat,lng or ?query=lat,lng
  const q = t.match(/[?&](?:q|query)=(-?\d+(?:\.\d+)?),(-?\d+(?:\.\d+)?)/);
  if (q) return finish(q[1], q[2]);
  // !3dlat!4dlng (used inside data= blobs)
  const dm = t.match(/!3d(-?\d+(?:\.\d+)?)!4d(-?\d+(?:\.\d+)?)/);
  if (dm) return finish(dm[1], dm[2]);
  // bare "lat,lng"
  const bare = t.match(/^\s*(-?\d+(?:\.\d+)?)\s*,\s*(-?\d+(?:\.\d+)?)\s*$/);
  if (bare) return finish(bare[1], bare[2]);
  return null;
}

function finish(a: string, b: string) {
  const lat = Number(a), lng = Number(b);
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
  if (lat < -90 || lat > 90 || lng < -180 || lng > 180) return null;
  return { lat, lng };
}
