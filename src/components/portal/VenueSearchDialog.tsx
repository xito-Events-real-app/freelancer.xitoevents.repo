import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import MiniMapPreview from '@/components/portal/MiniMapPreview';
import { useVenueSearch, type XitoRow, type GoogleSug } from '@/hooks/useVenueSearch';
import { useKeyboardInset } from '@/hooks/useKeyboardInset';
import { resolveVenueCoords } from '@/lib/resolveVenueCoords';
import type { PortalContext } from '@/lib/portalClient';
import type { XitoVenuePick, GooglePick } from '@/components/portal/VenueSearchInput';

interface Props {
  open: boolean;
  onClose: () => void;
  ctx: PortalContext;
  onPickXito: (p: XitoVenuePick) => void;
  onPickGoogle: (p: GooglePick) => void;
}

type Pending =
  | { kind: 'xito'; pick: XitoVenuePick; row: XitoRow; resolving: boolean }
  | { kind: 'google'; pick: GooglePick; sug: GoogleSug; resolving: boolean }
  | null;

const COLORS = ['#e8a87c', '#87a878', '#c17c74', '#5cbdb9', '#9b72cf', '#d4842a'];
function colorFor(name: string) {
  let h = 0;
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) | 0;
  return COLORS[Math.abs(h) % COLORS.length];
}

export default function VenueSearchDialog({ open, onClose, ctx, onPickXito, onPickGoogle }: Props) {
  const { query, setQuery, xito, google, loading, buildXitoPick, buildGooglePick, prefetch } = useVenueSearch(ctx);
  const [pending, setPending] = useState<Pending>(null);
  const kbInset = useKeyboardInset(open);
  const inputRef = useRef<HTMLInputElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Reset on open + prefetch top venues
  useEffect(() => {
    if (open) {
      setPending(null);
      setQuery('');
      prefetch();
    }
  }, [open, setQuery, prefetch]);

  // Lock body scroll
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = prev; };
  }, [open]);

  // Synchronous auto-focus on mount → opens iOS keyboard immediately
  useLayoutEffect(() => {
    if (!open) return;
    const el = inputRef.current;
    if (!el) return;
    try { el.focus({ preventScroll: true }); } catch { el.focus(); }
    // Retry on next frame in case mount race delays the OSK
    const r = requestAnimationFrame(() => {
      try { el.focus({ preventScroll: true }); } catch { el.focus(); }
    });
    return () => cancelAnimationFrame(r);
  }, [open]);

  const pickXitoRow = async (r: XitoRow) => {
    // Toggle off if tapped again
    if (pending?.kind === 'xito' && pending.row.id === r.id) {
      setPending(null);
      return;
    }
    const pick = buildXitoPick(r);
    const needs = pick.lat == null || pick.lng == null;
    setPending({ kind: 'xito', row: r, pick, resolving: needs });
    if (needs) {
      const c = await resolveVenueCoords(
        {
          lat: pick.lat, lng: pick.lng,
          venue_google_map: pick.venue_google_map,
          xito_venue_id: pick.xito_venue_id,
          venue_name: pick.venue_name,
          venue_city: pick.venue_city,
        },
        ctx,
      );
      setPending((p) => {
        if (!p || p.kind !== 'xito' || p.row.id !== r.id) return p;
        if (c) return { ...p, pick: { ...p.pick, lat: c.lat, lng: c.lng }, resolving: false };
        return { ...p, resolving: false };
      });
    }
  };

  const pickGoogleRow = async (s: GoogleSug) => {
    if (pending?.kind === 'google' && pending.sug.placeId === s.placeId) {
      setPending(null);
      return;
    }
    const pick = await buildGooglePick(s);
    if (!pick) return;
    setPending({ kind: 'google', sug: s, pick, resolving: false });
  };

  const save = () => {
    if (!pending) return;
    if (pending.kind === 'xito') onPickXito(pending.pick);
    else onPickGoogle(pending.pick);
    onClose();
  };

  // Filter out the pinned row from the lists below the preview
  const xitoOthers = pending?.kind === 'xito'
    ? xito.filter((v) => v.id !== pending.row.id)
    : xito;
  const googleOthers = pending?.kind === 'google'
    ? google.filter((s) => s.placeId !== pending.sug.placeId)
    : google;

  const hasResults = xito.length > 0 || google.length > 0;
  const previewLat = pending ? (pending.kind === 'xito' ? pending.pick.lat ?? null : pending.pick.venue_lat) : null;
  const previewLng = pending ? (pending.kind === 'xito' ? pending.pick.lng ?? null : pending.pick.venue_lng) : null;
  const previewLabel = pending ? (pending.kind === 'xito' ? pending.pick.venue_name : pending.pick.venue_name) : '';

  if (!open) return null;

  return (
    <div
      className="cp-root"
      role="dialog"
      aria-modal="true"
      style={{
        position: 'fixed', inset: 0, zIndex: 170,
        background: '#fff',
        display: 'flex', flexDirection: 'column',
        height: 'min(100dvh, 100svh)',
        maxHeight: 'min(100dvh, 100svh)',
        overflow: 'hidden',
      }}
    >
      {/* Sticky header — only Back on the left + Save on the right */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 8,
        padding: '12px 16px', borderBottom: '1px solid var(--cp-border)',
        background: '#fff', flexShrink: 0,
      }}>
        <button
          type="button" onClick={onClose}
          style={{
            display: 'inline-flex', alignItems: 'center', gap: 4,
            background: 'transparent', border: '1px solid var(--cp-border)',
            borderRadius: 8, padding: '6px 10px', fontSize: 12, fontWeight: 600,
            cursor: 'pointer', color: '#334155',
          }}
        >← Back</button>
        <div style={{ flex: 1, fontFamily: 'var(--cp-font-d)', fontSize: 17, fontWeight: 600, margin: 0 }}>
          Search Venue
        </div>
        <button
          type="button" onClick={save} disabled={!pending}
          style={{
            borderRadius: 8, padding: '8px 14px', fontSize: 13, fontWeight: 700,
            border: 'none', background: pending ? 'var(--rose, #e85d3a)' : '#e5e7eb',
            color: pending ? '#fff' : '#94a3b8', cursor: pending ? 'pointer' : 'not-allowed',
          }}
        >Save</button>
      </div>

      {/* Search input */}
      <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--cp-border)', background: '#fff', flexShrink: 0 }}>
        <div style={{ position: 'relative' }}>
          <span style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', fontSize: 14 }}>🔎</span>
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search venue name or address…"
            autoFocus
            autoComplete="off"
            type="search"
            inputMode="search"
            enterKeyHint="search"
            style={{
              width: '100%', border: '1px solid var(--cp-border)', borderRadius: 10,
              padding: '12px 12px 12px 36px', fontSize: 14, outline: 'none',
            }}
          />
        </div>
      </div>

      {/* Scroll body — selected pinned on top, preview, then other results */}
      <div
        ref={scrollRef}
        style={{
          flex: 1, minHeight: 0,
          overflowY: 'auto', WebkitOverflowScrolling: 'touch',
          overscrollBehavior: 'contain',
          paddingBottom: `calc(max(env(safe-area-inset-bottom), 16px) + ${kbInset}px + 28px)`,
        }}
      >
        {/* Pinned selected venue + preview */}
        {pending && (
          <>
            <div style={{ ...sectionHeader, color: 'var(--rose, #e85d3a)' }}>Selected</div>
            {pending.kind === 'xito' ? (
              <button
                key={`sel-${pending.row.id}`}
                type="button"
                onClick={() => pickXitoRow(pending.row)}
                style={{ ...rowBtn, background: '#fff7ed' }}
              >
                <Avatar name={pending.row.venue_name} url={pending.row.avatar_url || pending.row.cover_url} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <span style={{ fontWeight: 600, fontSize: 13, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{pending.row.venue_name}</span>
                    {pending.row.venue_type && <span style={typeChip}>{pending.row.venue_type}</span>}
                  </div>
                  <div style={{ fontSize: 11, color: '#64748b', marginTop: 2 }}>
                    {[pending.row.area, pending.row.city].filter(Boolean).join(', ') || '—'}
                  </div>
                </div>
                <span style={{ color: 'var(--rose, #e85d3a)', fontWeight: 700 }}>✓</span>
              </button>
            ) : (
              <button
                key={`sel-${pending.sug.placeId}`}
                type="button"
                onClick={() => pickGoogleRow(pending.sug)}
                style={{ ...rowBtn, background: '#fff7ed' }}
              >
                <div style={googleIcon}>📍</div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 500, fontSize: 13, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{pending.sug.primary}</div>
                  {pending.sug.secondary && <div style={{ fontSize: 11, color: '#64748b', marginTop: 2 }}>{pending.sug.secondary}</div>}
                </div>
                <span style={{ color: 'var(--rose, #e85d3a)', fontWeight: 700 }}>✓</span>
              </button>
            )}

            <div style={{ padding: '10px 16px 14px' }}>
              <MiniMapPreview
                lat={previewLat ?? undefined}
                lng={previewLng ?? undefined}
                label={previewLabel}
                resolving={pending.resolving}
                height={160}
              />
            </div>
            <div style={{ height: 1, background: '#e2e8f0', margin: '0 16px' }} />
          </>
        )}

        {query.trim().length < 1 && !pending ? (
          xito.length > 0 ? (
            <>
              <div style={sectionHeader}>Recent venues</div>
              {xitoOthers.map((v) => renderXitoRow(v, pending, pickXitoRow))}
            </>
          ) : (
            <div style={{ padding: '40px 20px', textAlign: 'center', color: '#94a3b8', fontSize: 13 }}>
              Type to search venues
            </div>
          )
        ) : loading && !hasResults ? (
          <div style={{ padding: '40px 20px', textAlign: 'center', color: '#94a3b8', fontSize: 13 }}>Searching…</div>
        ) : !hasResults ? (
          <div style={{ padding: '40px 20px', textAlign: 'center', color: '#94a3b8', fontSize: 13 }}>No matches</div>
        ) : (
          <>
            {xitoOthers.length > 0 && (
              <>
                <div style={sectionHeader}>From our venues</div>
                {xitoOthers.map((v) => renderXitoRow(v, pending, pickXitoRow))}
              </>
            )}
            {googleOthers.length > 0 && (
              <>
                <div style={sectionHeader}>Other places</div>
                {googleOthers.map((s) => (
                  <button
                    key={s.placeId} type="button" onClick={() => pickGoogleRow(s)}
                    style={rowBtn}
                  >
                    <div style={googleIcon}>📍</div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontWeight: 500, fontSize: 13, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{s.primary}</div>
                      {s.secondary && <div style={{ fontSize: 11, color: '#64748b', marginTop: 2 }}>{s.secondary}</div>}
                    </div>
                  </button>
                ))}
              </>
            )}
          </>
        )}
      </div>
    </div>
  );
}

function renderXitoRow(v: XitoRow, pending: Pending, onPick: (r: XitoRow) => void) {
  return (
    <button
      key={v.id} type="button" onClick={() => onPick(v)}
      style={rowBtn}
    >
      <Avatar name={v.venue_name} url={v.avatar_url || v.cover_url} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <span style={{ fontWeight: 600, fontSize: 13, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{v.venue_name}</span>
          {v.venue_type && <span style={typeChip}>{v.venue_type}</span>}
        </div>
        <div style={{ fontSize: 11, color: '#64748b', marginTop: 2 }}>
          {[v.area, v.city].filter(Boolean).join(', ') || '—'}
        </div>
      </div>
    </button>
  );
}

function Avatar({ name, url }: { name: string; url?: string }) {
  if (url) return <img src={url} alt="" style={{ width: 32, height: 32, borderRadius: '50%', objectFit: 'cover', flexShrink: 0 }} />;
  const ch = (name || '?').trim().charAt(0).toUpperCase();
  return (
    <div style={{ width: 32, height: 32, borderRadius: '50%', background: colorFor(name), color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: 13, flexShrink: 0 }}>
      {ch}
    </div>
  );
}

const sectionHeader: React.CSSProperties = {
  fontSize: 10, fontWeight: 600, letterSpacing: 0.5, textTransform: 'uppercase',
  color: '#94a3b8', padding: '12px 16px 4px',
};
const rowBtn: React.CSSProperties = {
  display: 'flex', alignItems: 'center', gap: 10,
  width: '100%', textAlign: 'left', padding: '10px 16px',
  border: 'none', cursor: 'pointer', background: 'transparent',
  borderBottom: '1px solid #f1f5f9',
};
const typeChip: React.CSSProperties = {
  fontSize: 9, fontWeight: 600, padding: '2px 6px', borderRadius: 4,
  background: '#ede9fe', color: '#7c3aed', letterSpacing: 0.3,
};
const googleIcon: React.CSSProperties = {
  width: 32, height: 32, borderRadius: 8, background: '#f1f5f9',
  display: 'flex', alignItems: 'center', justifyContent: 'center',
  fontSize: 14, flexShrink: 0,
};
