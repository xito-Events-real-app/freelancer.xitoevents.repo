// URL detection + parsing helpers for social media links
export const URL_REGEX = /(https?:\/\/[^\s<>()]+[^\s<>().,!?;:'"])/gi;

export interface LinkInfo {
  url: string;
  kind: 'youtube' | 'instagram' | 'tiktok' | 'facebook' | 'twitter' | 'generic';
  thumbnail?: string;
  embedId?: string;
}

/** Extract all URLs from a string */
export function extractUrls(text: string): string[] {
  const urls: string[] = [];
  const matches = text.match(URL_REGEX);
  if (matches) {
    for (const m of matches) {
      if (!urls.includes(m)) urls.push(m);
    }
  }
  return urls;
}

/** Identify a URL and produce a thumbnail when possible (no network calls) */
export function classifyUrl(raw: string): LinkInfo {
  let u: URL;
  try {
    u = new URL(raw);
  } catch {
    return { url: raw, kind: 'generic' };
  }
  const host = u.hostname.replace(/^www\./, '').toLowerCase();

  // YouTube
  if (host === 'youtube.com' || host === 'm.youtube.com' || host === 'music.youtube.com') {
    let id = u.searchParams.get('v');
    if (!id && u.pathname.startsWith('/shorts/')) id = u.pathname.split('/')[2];
    if (!id && u.pathname.startsWith('/embed/')) id = u.pathname.split('/')[2];
    if (id) return { url: raw, kind: 'youtube', embedId: id, thumbnail: `https://i.ytimg.com/vi/${id}/hqdefault.jpg` };
  }
  if (host === 'youtu.be') {
    const id = u.pathname.slice(1).split('/')[0];
    if (id) return { url: raw, kind: 'youtube', embedId: id, thumbnail: `https://i.ytimg.com/vi/${id}/hqdefault.jpg` };
  }

  // Instagram
  if (host === 'instagram.com' || host.endsWith('.instagram.com')) {
    return { url: raw, kind: 'instagram' };
  }

  // TikTok
  if (host === 'tiktok.com' || host.endsWith('.tiktok.com') || host === 'vm.tiktok.com') {
    return { url: raw, kind: 'tiktok' };
  }

  // Facebook
  if (host === 'facebook.com' || host.endsWith('.facebook.com') || host === 'fb.watch' || host === 'fb.com') {
    return { url: raw, kind: 'facebook' };
  }

  // X / Twitter
  if (host === 'twitter.com' || host === 'x.com' || host.endsWith('.twitter.com') || host.endsWith('.x.com')) {
    return { url: raw, kind: 'twitter' };
  }

  return { url: raw, kind: 'generic' };
}

/** Pick the first "previewable" URL from text (used to render one rich card) */
export function pickPreviewUrl(text: string): LinkInfo | null {
  const urls = extractUrls(text);
  if (!urls.length) return null;
  // Prefer YouTube (we have instant thumbnails)
  for (const u of urls) {
    const info = classifyUrl(u);
    if (info.kind === 'youtube') return info;
  }
  // Otherwise first social link
  for (const u of urls) {
    const info = classifyUrl(u);
    if (info.kind !== 'generic') return info;
  }
  // Fallback: first url
  return classifyUrl(urls[0]);
}
