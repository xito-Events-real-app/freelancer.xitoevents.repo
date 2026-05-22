/**
 * Normalize a media URL to ensure it has a protocol prefix.
 * Handles URLs stored without https:// due to misconfigured R2_PUBLIC_URL.
 */
export function normalizeMediaUrl(url: string | null | undefined): string | null {
  if (!url || url.trim() === '') return null;
  const trimmed = url.trim();
  if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) {
    return trimmed;
  }
  return `https://${trimmed}`;
}
