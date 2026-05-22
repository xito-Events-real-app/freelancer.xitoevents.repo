// Public edge function — resolves Google Maps short links (maps.app.goo.gl)
// to lat/lng by following redirects and parsing the final URL.
// POST { url: string } -> { lat, lng } or 404.

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

function parseCoords(url: string): { lat: number; lng: number } | null {
  const t = (url || '').trim();
  const at = t.match(/@(-?\d+(?:\.\d+)?),(-?\d+(?:\.\d+)?)/);
  if (at) return finish(at[1], at[2]);
  const q = t.match(/[?&](?:q|query|destination)=(-?\d+(?:\.\d+)?),(-?\d+(?:\.\d+)?)/);
  if (q) return finish(q[1], q[2]);
  const dm = t.match(/!3d(-?\d+(?:\.\d+)?)!4d(-?\d+(?:\.\d+)?)/);
  if (dm) return finish(dm[1], dm[2]);
  return null;
}
function finish(a: string, b: string) {
  const lat = Number(a), lng = Number(b);
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
  if (lat < -90 || lat > 90 || lng < -180 || lng > 180) return null;
  return { lat, lng };
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'method_not_allowed' }), {
      status: 405, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  let body: any;
  try { body = await req.json(); } catch {
    return new Response(JSON.stringify({ error: 'invalid_json' }), {
      status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
  const inputUrl = typeof body?.url === 'string' ? body.url.trim() : '';
  if (!inputUrl || !/^https?:\/\//i.test(inputUrl)) {
    return new Response(JSON.stringify({ error: 'invalid_url' }), {
      status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  // Early-out: maybe coords are already present in the input URL.
  const direct = parseCoords(inputUrl);
  if (direct) {
    return new Response(JSON.stringify(direct), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  const ctl = new AbortController();
  const tm = setTimeout(() => ctl.abort(), 8000);
  try {
    let current = inputUrl;
    for (let i = 0; i < 8; i++) {
      const r = await fetch(current, {
        method: 'GET',
        redirect: 'manual',
        signal: ctl.signal,
        headers: { 'User-Agent': 'Mozilla/5.0 (Lovable resolve-gmaps-link)' },
      });
      // Check coords in current URL after each hop.
      const here = parseCoords(current);
      if (here) {
        return new Response(JSON.stringify(here), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      if (r.status >= 300 && r.status < 400) {
        const loc = r.headers.get('location');
        if (!loc) break;
        current = new URL(loc, current).toString();
        continue;
      }
      // 2xx — try parsing final URL AND the body (Google sometimes returns
      // an HTML page with a meta-refresh containing coords).
      const finalParsed = parseCoords(current);
      if (finalParsed) {
        return new Response(JSON.stringify(finalParsed), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      try {
        const text = await r.text();
        const bodyParsed = parseCoords(text);
        if (bodyParsed) {
          return new Response(JSON.stringify(bodyParsed), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }
      } catch { /* noop */ }
      break;
    }
    return new Response(JSON.stringify({ error: 'not_found' }), {
      status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (e: any) {
    return new Response(JSON.stringify({ error: e?.name === 'AbortError' ? 'timeout' : 'fetch_failed' }), {
      status: 502, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } finally {
    clearTimeout(tm);
  }
});
