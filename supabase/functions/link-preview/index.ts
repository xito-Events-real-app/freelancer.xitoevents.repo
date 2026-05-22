// Link preview / OpenGraph fetcher
// Returns: { url, title, description, image, siteName }
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
};

function pickMeta(html: string, names: string[]): string | null {
  for (const name of names) {
    // property="og:image" content="..."
    const re1 = new RegExp(
      `<meta[^>]+(?:property|name)=["']${name}["'][^>]*content=["']([^"']+)["']`,
      'i'
    );
    const re2 = new RegExp(
      `<meta[^>]+content=["']([^"']+)["'][^>]*(?:property|name)=["']${name}["']`,
      'i'
    );
    const m = html.match(re1) || html.match(re2);
    if (m && m[1]) return decodeEntities(m[1]);
  }
  return null;
}

function decodeEntities(s: string): string {
  return s
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&#x27;/g, "'");
}

function absolutize(maybeUrl: string | null, base: string): string | null {
  if (!maybeUrl) return null;
  try {
    return new URL(maybeUrl, base).toString();
  } catch {
    return null;
  }
}

async function fetchPreview(url: string) {
  const res = await fetch(url, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (compatible; LinkPreviewBot/1.0; +https://lovable.dev)',
      'Accept': 'text/html,application/xhtml+xml',
    },
    redirect: 'follow',
  });
  const html = await res.text();
  const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i);
  const baseUrl = res.url || url;

  return {
    url: baseUrl,
    title:
      pickMeta(html, ['og:title', 'twitter:title']) ||
      (titleMatch ? decodeEntities(titleMatch[1]).trim() : null),
    description: pickMeta(html, [
      'og:description',
      'twitter:description',
      'description',
    ]),
    image: absolutize(
      pickMeta(html, ['og:image', 'og:image:secure_url', 'twitter:image', 'twitter:image:src']),
      baseUrl
    ),
    siteName: pickMeta(html, ['og:site_name']),
  };
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

  try {
    const { searchParams } = new URL(req.url);
    let target = searchParams.get('url');
    if (!target && req.method === 'POST') {
      const body = await req.json().catch(() => ({}));
      target = body.url;
    }
    if (!target) {
      return new Response(JSON.stringify({ error: 'Missing url' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    // Basic safety: only http(s)
    if (!/^https?:\/\//i.test(target)) {
      return new Response(JSON.stringify({ error: 'Invalid url' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const data = await fetchPreview(target);
    return new Response(JSON.stringify(data), {
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json',
        'Cache-Control': 'public, max-age=86400',
      },
    });
  } catch (err) {
    return new Response(
      JSON.stringify({ error: err instanceof Error ? err.message : 'Failed' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
