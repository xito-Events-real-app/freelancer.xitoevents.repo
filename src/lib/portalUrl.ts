export function slugifyClientName(name: string): string {
  return (name || '')
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^\w\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-') || 'client';
}

export function buildPortalUrl(opts: { clientId: string; clientName: string; token: string }) {
  const slug = slugifyClientName(opts.clientName);
  const base = typeof window !== 'undefined' ? window.location.origin : '';
  const url = `${base}/client-portal/${slug}/${opts.clientId}?t=${encodeURIComponent(opts.token)}`;
  return { url, slug };
}
