import { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { LinkInfo } from '@/lib/linkify';
import { ExternalLink, Play } from 'lucide-react';

interface OgData {
  url: string;
  title: string | null;
  description: string | null;
  image: string | null;
  siteName: string | null;
}

function siteLabel(info: LinkInfo): string {
  switch (info.kind) {
    case 'youtube': return 'YouTube';
    case 'instagram': return 'Instagram';
    case 'tiktok': return 'TikTok';
    case 'facebook': return 'Facebook';
    case 'twitter': return 'X (Twitter)';
    default:
      try { return new URL(info.url).hostname.replace(/^www\./, ''); } catch { return 'Link'; }
  }
}

export function LinkPreview({ info }: { info: LinkInfo }) {
  // For YouTube we already have a thumbnail — still fetch OG for title.
  const { data } = useQuery<OgData | null>({
    queryKey: ['link-preview', info.url],
    staleTime: 60 * 60 * 1000,
    gcTime: 24 * 60 * 60 * 1000,
    retry: false,
    queryFn: async () => {
      try {
        const { data, error } = await supabase.functions.invoke('link-preview', {
          body: { url: info.url },
        });
        if (error) throw error;
        return data as OgData;
      } catch {
        return null;
      }
    },
  });

  const thumb = info.thumbnail || data?.image || null;
  const title = data?.title || siteLabel(info);
  const description = data?.description || null;
  const site = data?.siteName || siteLabel(info);

  // Don't render an empty card for plain links with no preview at all
  if (!thumb && !data?.title && !data?.description && info.kind === 'generic') {
    return null;
  }

  return (
    <a
      href={info.url}
      target="_blank"
      rel="noopener noreferrer"
      onClick={(e) => e.stopPropagation()}
      className="mb-3 block overflow-hidden rounded-xl border border-border bg-muted/30 hover:bg-muted/50 transition-colors"
    >
      {thumb && (
        <div className="relative w-full bg-muted">
          <img
            src={thumb}
            alt={title || 'Link preview'}
            className="w-full max-h-80 object-cover"
            loading="lazy"
            onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = 'none'; }}
          />
          {info.kind === 'youtube' && (
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <div className="bg-black/70 rounded-full p-3 shadow-lg">
                <Play className="h-7 w-7 text-white fill-white" />
              </div>
            </div>
          )}
        </div>
      )}
      <div className="p-3">
        <div className="flex items-center gap-1.5 text-[11px] uppercase tracking-wide text-muted-foreground mb-1">
          <ExternalLink className="h-3 w-3" />
          <span className="truncate">{site}</span>
        </div>
        <p className="text-sm font-semibold text-foreground line-clamp-2">{title}</p>
        {description && (
          <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{description}</p>
        )}
      </div>
    </a>
  );
}
