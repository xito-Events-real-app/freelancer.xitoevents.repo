import React from 'react';
import { URL_REGEX, pickPreviewUrl } from '@/lib/linkify';
import { LinkPreview } from './LinkPreview';
import { cn } from '@/lib/utils';

interface LinkifiedTextProps {
  text: string;
  className?: string;
  /** Render a rich preview card for the first link (default true) */
  showPreview?: boolean;
  /** Element to wrap the text in (default p) */
  as?: 'p' | 'span' | 'div';
}

/** Convert URLs in text into clickable anchors */
function linkifyParts(text: string): React.ReactNode[] {
  const parts: React.ReactNode[] = [];
  let lastIndex = 0;
  const regex = new RegExp(URL_REGEX.source, 'gi');
  let match: RegExpExecArray | null;

  while ((match = regex.exec(text)) !== null) {
    if (match.index > lastIndex) {
      parts.push(text.slice(lastIndex, match.index));
    }
    const url = match[0];
    parts.push(
      <a
        key={`${match.index}-${url}`}
        href={url}
        target="_blank"
        rel="noopener noreferrer"
        onClick={(e) => e.stopPropagation()}
        className="text-primary underline underline-offset-2 hover:opacity-80 break-all"
      >
        {url}
      </a>
    );
    lastIndex = match.index + url.length;
  }
  if (lastIndex < text.length) {
    parts.push(text.slice(lastIndex));
  }
  return parts;
}

export function LinkifiedText({
  text,
  className,
  showPreview = true,
  as = 'p',
}: LinkifiedTextProps) {
  const Tag = as as any;
  const preview = showPreview ? pickPreviewUrl(text) : null;
  return (
    <>
      <Tag className={cn('whitespace-pre-wrap break-words', className)}>
        {linkifyParts(text)}
      </Tag>
      {preview && <LinkPreview info={preview} />}
    </>
  );
}
