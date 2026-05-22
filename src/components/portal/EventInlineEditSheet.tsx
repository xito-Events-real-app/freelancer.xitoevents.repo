import { useEffect, useMemo, useRef, useState } from 'react';
import { toast } from 'sonner';
import VenueSearchDialog from '@/components/portal/VenueSearchDialog';
import MiniMapPreview from '@/components/portal/MiniMapPreview';
import TimePicker12hPair from '@/components/portal/TimePicker12h';
import { portalApi, type PortalContext } from '@/lib/portalClient';
import { useKeyboardInset } from '@/hooks/useKeyboardInset';
import { resolveVenueCoords } from '@/lib/resolveVenueCoords';

interface Props {
  open: boolean;
  onClose: () => void;
  event: any;
  loc: any;
  ctx: PortalContext;
  references?: any[];
  onSaved: () => void;
}

function latestNoteFor(refs: any[] | undefined, eventName: string): { id: string; description: string } | null {
  if (!refs?.length) return null;
  const matches = refs
    .filter((r) => (r.event_name || '') === eventName && (r.entry_type === 'note' || r.entry_type === 'demand') && r.description)
    .sort((a, b) => new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime());
  if (!matches.length) return null;
  return { id: matches[0].id, description: matches[0].description };
}

export default function EventInlineEditSheet({ open, onClose, event, loc, ctx, references, onSaved }: Props) {
  const existingNote = useMemo(
    () => (event ? latestNoteFor(references, event.event_name) : null),
    [references, event]
  );

  const [form, setForm] = useState({
    venue_name: '', venue_address: '',
    venue_lat: null as number | null, venue_lng: null as number | null,
    venue_place_id: '', xito_venue_id: '',
    venue_type: '', venue_area: '', venue_city: '', venue_google_map: '',
    start_time: '', end_time: '',
    guest_count: '' as string,
    notes: '' as string,
    xito_avatar: '', xito_cover: '',
  });
  const [saving, setSaving] = useState(false);
  const [venueDlgOpen, setVenueDlgOpen] = useState(false);
  const [resolvingMap, setResolvingMap] = useState(false);

  useEffect(() => {
    if (open) {
      setForm({
        venue_name: loc?.venue_name || '',
        venue_address: loc?.venue_address || '',
        venue_lat: loc?.venue_lat ?? null,
        venue_lng: loc?.venue_lng ?? null,
        venue_place_id: loc?.venue_place_id || '',
        xito_venue_id: loc?.xito_venue_id || '',
        venue_type: loc?.venue_type || '',
        venue_area: loc?.venue_area || '',
        venue_city: loc?.venue_city || '',
        venue_google_map: loc?.venue_google_map || '',
        start_time: loc?.start_time || '',
        end_time: loc?.end_time || '',
        guest_count: loc?.guest_count != null ? String(loc.guest_count) : '',
        notes: existingNote?.description || '',
        xito_avatar: '', xito_cover: '',
      });
    }
  }, [open, loc, existingNote]);

  // Resolve coords for venues that have a map link OR just a name but no lat/lng.
  useEffect(() => {
    if (!open) return;
    if (form.venue_lat != null && form.venue_lng != null) return;
    if (!form.venue_google_map && !form.xito_venue_id && !form.venue_name) return;
    let cancelled = false;
    setResolvingMap(true);
    resolveVenueCoords(
      {
        lat: form.venue_lat, lng: form.venue_lng,
        venue_google_map: form.venue_google_map,
        xito_venue_id: form.xito_venue_id,
        venue_name: form.venue_name,
        venue_city: form.venue_city,
      },
      ctx,
    ).then((c) => {
      if (cancelled) return;
      if (c) setForm((f) => ({ ...f, venue_lat: c.lat, venue_lng: c.lng }));
      setResolvingMap(false);
    }).catch(() => { if (!cancelled) setResolvingMap(false); });
    return () => { cancelled = true; };
  }, [open, form.xito_venue_id, form.venue_google_map, form.venue_name]);

  // Lock body scroll
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = prev; };
  }, [open]);

  const clearVenue = () => setForm((f) => ({
    ...f,
    venue_name: '', venue_address: '',
    venue_lat: null, venue_lng: null, venue_place_id: '',
    xito_venue_id: '', venue_type: '', venue_area: '', venue_city: '', venue_google_map: '',
    xito_avatar: '', xito_cover: '',
  }));

  const isLocked = !!form.xito_venue_id;

  const save = async () => {
    setSaving(true);
    try {
      const { xito_avatar, xito_cover, notes, ...payload } = form as any;
      await portalApi.upsertEventLocation(ctx, event.id, payload);

      const trimmedNote = (notes || '').trim();
      const prevNote = (existingNote?.description || '').trim();
      if (trimmedNote && trimmedNote !== prevNote) {
        try {
          await portalApi.addReference(ctx, {
            entry_type: 'note',
            description: trimmedNote,
            event_name: event.event_name || null,
          });
        } catch (err) {
          console.warn('note save failed', err);
        }
      }

      toast.success('Details saved ✓');
      onSaved();
      onClose();
    } catch (e: any) {
      toast.error(e.message || 'Save failed');
    } finally { setSaving(false); }
  };

  const kbInset = useKeyboardInset(open);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const root = scrollRef.current;
    if (!root) return;
    const onFocus = (e: FocusEvent) => {
      const t = e.target as HTMLElement | null;
      if (!t) return;
      if (!t.matches('input, textarea, [contenteditable="true"]')) return;
      window.setTimeout(() => {
        try { t.scrollIntoView({ block: 'center', behavior: 'smooth' }); } catch { /* noop */ }
      }, 120);
    };
    root.addEventListener('focusin', onFocus);
    return () => root.removeEventListener('focusin', onFocus);
  }, [open]);

  if (!open) return null;

  return (
    <div
      className="cp-root"
      role="dialog"
      aria-modal="true"
      style={{
        position: 'fixed', inset: 0, zIndex: 160,
        background: '#fff',
        display: 'flex', flexDirection: 'column',
        height: 'min(100dvh, 100svh)',
        maxHeight: 'min(100dvh, 100svh)',
        overflow: 'hidden',
      }}
    >
      {/* Sticky header — single back control, no ✕ */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 8,
        padding: '12px 16px', borderBottom: '1px solid var(--cp-border)',
        background: '#fff', flexShrink: 0,
      }}>
        <button
          type="button"
          onClick={onClose}
          style={{
            display: 'inline-flex', alignItems: 'center', gap: 4,
            background: 'transparent', border: '1px solid var(--cp-border)',
            borderRadius: 8, padding: '6px 10px', fontSize: 12, fontWeight: 600,
            cursor: 'pointer', color: '#334155',
          }}
        >← Back</button>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontFamily: 'var(--cp-font-d)', fontSize: 17, fontWeight: 600, lineHeight: 1.2, margin: 0 }}>
            Fill Details
          </div>
          <div style={{ fontSize: 11, color: 'var(--cp-text-3)', marginTop: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {event?.event_name}
          </div>
        </div>
      </div>

      {/* Scroll body */}
      <div
        ref={scrollRef}
        style={{
          flex: 1, minHeight: 0,
          overflowY: 'auto',
          WebkitOverflowScrolling: 'touch',
          overscrollBehavior: 'contain',
          padding: '14px 18px 96px',
        }}
      >
        <div className="cp-ef-sl">Venue</div>
        {isLocked ? (
          <div style={{
            display: 'flex', alignItems: 'center', gap: 12,
            padding: 12, border: '1px solid var(--cp-border)', borderRadius: 10,
            background: '#faf8f7',
          }}>
            <div style={{ width: 44, height: 44, borderRadius: '50%', background: '#e8a87c', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: 16, flexShrink: 0 }}>
              {(form.venue_name || '?').charAt(0).toUpperCase()}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontWeight: 600, fontSize: 14 }}>{form.venue_name}</div>
              <div style={{ fontSize: 11, color: 'var(--cp-text-3)', marginTop: 2 }}>
                {[form.venue_area, form.venue_city].filter(Boolean).join(', ') || '—'}
              </div>
            </div>
            <button type="button" onClick={clearVenue} style={{
              background: 'transparent', border: '1px solid var(--cp-border)',
              borderRadius: 6, padding: '4px 8px', fontSize: 11, cursor: 'pointer', color: '#64748b', flexShrink: 0,
            }}>✕ Change</button>
          </div>
        ) : (
          <>
            <button
              type="button"
              onClick={() => setVenueDlgOpen(true)}
              style={{
                display: 'flex', alignItems: 'center', gap: 10, width: '100%',
                padding: '12px 14px', borderRadius: 10,
                border: '1px dashed var(--cp-border)', background: '#fff',
                fontSize: 13, color: form.venue_name ? '#0f172a' : '#94a3b8',
                textAlign: 'left', cursor: 'pointer',
              }}
            >
              <span style={{ fontSize: 16 }}>📍</span>
              <span style={{ flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {form.venue_name || 'Tap to search venue…'}
              </span>
              <span style={{ fontSize: 11, color: '#94a3b8' }}>{form.venue_name ? 'Change' : 'Search'}</span>
            </button>
            {form.venue_address && (
              <div className="cp-venue-filled" style={{ marginTop: 6 }}>✅ {form.venue_address}</div>
            )}
          </>
        )}

        {(form.venue_name || form.xito_venue_id) && (
          <div style={{ marginTop: 8 }}>
            <MiniMapPreview
              lat={form.venue_lat ?? undefined}
              lng={form.venue_lng ?? undefined}
              label={form.venue_name}
              resolving={resolvingMap}
              height={160}
            />
          </div>
        )}

        <div className="cp-ef-sl" style={{ marginTop: 14 }}>Time</div>
        <TimePicker12hPair
          startValue={form.start_time}
          endValue={form.end_time}
          onChangeStart={(v) => setForm((f) => ({ ...f, start_time: v }))}
          onChangeEnd={(v) => setForm((f) => ({ ...f, end_time: v }))}
        />

        <div className="cp-ef-sl" style={{ marginTop: 14 }}>Total number of guests</div>
        <input
          type="number"
          inputMode="numeric"
          min={0}
          placeholder="e.g. 250"
          value={form.guest_count}
          onChange={(e) => setForm((f) => ({ ...f, guest_count: e.target.value.replace(/[^\d]/g, '') }))}
          style={{ width: '100%', border: '1px solid var(--cp-border)', borderRadius: 8, padding: '10px 12px', fontSize: 13 }}
        />

        <div className="cp-ef-sl" style={{ marginTop: 14 }}>
          Notes for this event
          <span style={{ fontWeight: 400, color: 'var(--cp-text-3)', fontSize: 10, marginLeft: 6 }}>
            (also shown in References & Ideas)
          </span>
        </div>
        <textarea
          rows={4}
          placeholder="Anything special the photographer should know? (e.g. surprise moments, key family members, must-have shots)"
          value={form.notes}
          onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
          style={{ width: '100%', border: '1px solid var(--cp-border)', borderRadius: 8, padding: '10px 12px', fontSize: 13, resize: 'vertical', fontFamily: 'inherit' }}
        />
      </div>

      {/* Sticky footer — Save + Cancel always visible, lifts above keyboard */}
      <div
        style={{
          display: 'flex', gap: 10, padding: '12px 16px',
          borderTop: '1px solid var(--cp-border)', background: '#fff',
          flexShrink: 0,
          paddingBottom: `calc(max(env(safe-area-inset-bottom), 16px) + ${kbInset}px + 12px)`,
        }}
      >
        <button
          type="button"
          onClick={onClose}
          style={{
            flex: 1, padding: '12px 14px', borderRadius: 10,
            border: '1px solid var(--cp-border)', background: '#fff',
            fontSize: 14, fontWeight: 600, color: '#475569', cursor: 'pointer',
          }}
        >Cancel</button>
        <button
          type="button"
          onClick={save}
          disabled={saving}
          style={{
            flex: 2, padding: '12px 14px', borderRadius: 10,
            border: 'none', background: 'var(--rose, #e85d3a)',
            color: '#fff', fontSize: 14, fontWeight: 700, cursor: 'pointer',
            opacity: saving ? 0.6 : 1,
          }}
        >{saving ? 'Saving…' : 'Save Details'}</button>
      </div>

      <VenueSearchDialog
        open={venueDlgOpen}
        onClose={() => setVenueDlgOpen(false)}
        ctx={ctx}
        onPickXito={(p) =>
          setForm((f) => ({
            ...f,
            venue_name: p.venue_name,
            venue_address: [p.venue_area, p.venue_city].filter(Boolean).join(', '),
            venue_lat: p.lat, venue_lng: p.lng, venue_place_id: '',
            xito_venue_id: p.xito_venue_id,
            venue_type: p.venue_type,
            venue_area: p.venue_area,
            venue_city: p.venue_city,
            venue_google_map: p.venue_google_map,
            xito_avatar: p.avatar_url,
            xito_cover: p.cover_url,
          }))
        }
        onPickGoogle={(p) =>
          setForm((f) => ({
            ...f,
            venue_name: p.venue_name,
            venue_address: p.venue_address,
            venue_lat: p.venue_lat, venue_lng: p.venue_lng,
            venue_place_id: p.venue_place_id,
            xito_venue_id: '',
            venue_type: '', venue_area: '', venue_city: '', venue_google_map: '',
          }))
        }
      />
    </div>
  );
}
