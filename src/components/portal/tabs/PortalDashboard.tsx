import { useMemo, useState } from 'react';
import type { Tab } from '@/pages/ClientPortal';
import NepaliEnglishDate from '@/components/portal/NepaliEnglishDate';
import EventInlineEditSheet from '@/components/portal/EventInlineEditSheet';
import { fmt12, durationLabel } from '@/components/portal/TimePicker12h';

function latestEventNote(refs: any[], eventName: string): string | null {
  if (!refs?.length) return null;
  const matches = refs
    .filter((r) => (r.event_name || '') === eventName && (r.entry_type === 'note' || r.entry_type === 'demand') && r.description)
    .sort((a, b) => new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime());
  return matches[0]?.description || null;
}


function getMissingFields(loc: any): string[] {
  const miss: string[] = [];
  if (!loc?.venue_name) miss.push('venue');
  if (!loc?.start_time || !loc?.end_time) miss.push('time');
  if (loc?.guest_count == null || Number(loc.guest_count) < 1) miss.push('guests');
  return miss;
}

interface Props {
  data: any;
  ctx: any;
  onRefetch: () => void;
  onOpenEvent: (eventId: string) => void;
  onGoTo: (tab: Tab) => void;
}

function getDays(d?: string | null) {
  if (!d) return -1;
  const dt = new Date(d), now = new Date();
  now.setHours(0, 0, 0, 0); dt.setHours(0, 0, 0, 0);
  return Math.ceil((dt.getTime() - now.getTime()) / 86400000);
}

function buildMapsLink(loc: any) {
  if (!loc) return '';
  if (loc.venue_google_map) return loc.venue_google_map;
  if (loc.venue_lat != null && loc.venue_lng != null) {
    return `https://www.google.com/maps?q=${loc.venue_lat},${loc.venue_lng}`;
  }
  if (loc.venue_place_id) return `https://www.google.com/maps/place/?q=place_id:${loc.venue_place_id}`;
  if (loc.venue_name) return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent([loc.venue_name, loc.venue_address].filter(Boolean).join(' '))}`;
  return '';
}

export default function PortalDashboard({ data, ctx, onRefetch, onOpenEvent, onGoTo }: Props) {
  const events: any[] = data.events || [];
  const client = data.client || {};
  const company = data.company || {};

  const businessName: string = company.business_name || company.full_name || 'Your Studio';

  const locByEvent = useMemo(() => {
    const m = new Map<string, any>();
    (data.event_locations || []).forEach((l: any) => m.set(l.event_id, l));
    return m;
  }, [data.event_locations]);

  const nextEvent = events.find((e) => e.event_date_ad && new Date(e.event_date_ad) >= new Date()) || events[0];
  const daysLeft = nextEvent ? Math.max(0, getDays(nextEvent.event_date_ad)) : 0;

  const [openIds, setOpenIds] = useState<Set<string>>(new Set());
  const [inlineEventId, setInlineEventId] = useState<string | null>(null);
  const toggle = (id: string) => {
    const s = new Set(openIds);
    s.has(id) ? s.delete(id) : s.add(id);
    setOpenIds(s);
  };
  const inlineEvent = events.find((e) => e.id === inlineEventId);
  const inlineLoc = inlineEventId ? locByEvent.get(inlineEventId) : null;

  return (
    <>
      <div className="cp-ph">
        <div className="cp-brand-tag" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, flexWrap: 'wrap' }}>
          <span className="h">♥</span>
          <span>{businessName}</span>
          <span className="h">♥</span>
        </div>
        <div style={{ fontSize: 10, color: 'var(--cp-text-3)', marginTop: 2, letterSpacing: 0.4 }}>
          powered by <strong style={{ color: 'var(--rose)' }}>Xito Events</strong>
        </div>
        <h1>{client.client_name || 'Your Wedding'}</h1>
        <p>Your wedding journey</p>
      </div>

      {nextEvent && (
        <div className="cp-cd">
          <div className="cp-cd-num">{daysLeft}</div>
          <div className="cp-cd-sub">days until your celebration</div>
          <div className="cp-cd-ev">{nextEvent.event_name}</div>
        </div>
      )}

      <button className="cp-cta" onClick={() => onGoTo('references')}>
        <div className="cp-cta-ic">✨</div>
        <div className="cp-cta-b">
          <strong>Add My References</strong>
          <span>Share your inspiration so our crew can capture your vision perfectly</span>
        </div>
        <div className="cp-cta-arr">›</div>
      </button>

      <div className="cp-sl">Your Events</div>
      <div className="cp-evlist">
        {events.length === 0 && (
          <div className="cp-es"><div className="ic">📅</div><p>No events scheduled yet</p></div>
        )}
        {events.map((ev) => {
          const days = getDays(ev.event_date_ad);
          const open = openIds.has(ev.id);
          const loc = locByEvent.get(ev.id);
          const mapsLink = buildMapsLink(loc);
          const hasVenue = !!(loc?.venue_name || loc?.venue_address);
          const missing = getMissingFields(loc);
          const isComplete = missing.length === 0;
          const missingLabel = missing
            .map((m) => (m === 'venue' ? 'venue' : m === 'time' ? 'time' : 'guests'))
            .join(', ');
          return (
            <div key={ev.id} className={`cp-evc ${open ? 'open' : ''}`}>
              <div
                className="cp-evc-hd"
                onClick={() => toggle(ev.id)}
                role="button"
                style={{ cursor: 'pointer' }}
              >
                <div className="cp-ev-dot" />
                <h3 style={{ flex: 1, display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                  <span>{ev.event_name}</span>
                  {isComplete ? (
                    <span
                      title="All details filled"
                      style={{
                        fontSize: 10, fontWeight: 600, padding: '3px 8px',
                        borderRadius: 999, border: '1px solid #86efac',
                        background: '#f0fdf4', color: '#166534',
                        display: 'inline-flex', alignItems: 'center', gap: 3,
                      }}
                    >✓ Complete</span>
                  ) : (
                    <button
                      onClick={(e) => { e.stopPropagation(); setInlineEventId(ev.id); }}
                      title={`Missing: ${missingLabel}`}
                      style={{
                        fontSize: 10, fontWeight: 600, padding: '3px 8px',
                        borderRadius: 999, border: '1px solid #fca5a5',
                        background: '#fef2f2', color: '#b91c1c', cursor: 'pointer',
                        display: 'inline-flex', alignItems: 'center', gap: 3,
                      }}
                    >● Missing: {missingLabel}</button>
                  )}
                </h3>
                {days >= 0 && (
                  <span className="cp-ev-badge">{days === 0 ? 'Today' : `${days}d`}</span>
                )}
                <button
                  className="cp-ev-edit"
                  title="Open full event details"
                  onClick={(e) => { e.stopPropagation(); onOpenEvent(ev.id); }}
                >✏️</button>
                <span className="cp-ev-chev">▾</span>
              </div>
              <div className="cp-ev-body">
                <div className="cp-ev-inner">
                  {ev.event_date_ad && (
                    <div className="cp-ev-row" style={{ alignItems: 'flex-start' }}>
                      <span className="ic">📅</span>
                      <NepaliEnglishDate value={ev.event_date_ad} size="sm" />
                    </div>
                  )}
                  {(loc?.start_time || loc?.end_time) && (
                    <div className="cp-ev-row">
                      <span className="ic">🕐</span>
                      <span>
                        {fmt12(loc.start_time)} – {fmt12(loc.end_time)}
                        {durationLabel(loc.start_time, loc.end_time) && (
                          <span style={{ color: 'var(--cp-text-3)', marginLeft: 6, fontSize: 11 }}>
                            ({durationLabel(loc.start_time, loc.end_time)})
                          </span>
                        )}
                      </span>
                    </div>
                  )}
                  {loc?.guest_count != null && Number(loc.guest_count) > 0 && (
                    <div className="cp-ev-row">
                      <span className="ic">👥</span>
                      <span>{loc.guest_count} guests</span>
                    </div>
                  )}
                  {(() => {
                    const note = latestEventNote(data.references || [], ev.event_name);
                    if (!note) return null;
                    return (
                      <div className="cp-ev-row" style={{ alignItems: 'flex-start' }}>
                        <span className="ic">📝</span>
                        <span style={{ flex: 1, minWidth: 0, fontSize: 12, color: 'var(--cp-text-2, #475569)', whiteSpace: 'pre-wrap' }}>
                          {note.length > 140 ? note.slice(0, 140) + '…' : note}
                        </span>
                      </div>
                    );
                  })()}
                  {hasVenue && (
                    <div className="cp-ev-row" style={{ alignItems: 'flex-start' }}>
                      <span className="ic">📍</span>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontWeight: 500 }}>{loc.venue_name || loc.venue_address}</div>
                        {loc.venue_name && (loc.venue_area || loc.venue_city || loc.venue_address) && (
                          <div style={{ fontSize: 11, color: 'var(--cp-text-3)', marginTop: 2 }}>
                            {[loc.venue_area, loc.venue_city].filter(Boolean).join(', ') || loc.venue_address}
                          </div>
                        )}
                      </div>
                      {mapsLink && (
                        <a
                          href={mapsLink}
                          target="_blank"
                          rel="noreferrer"
                          onClick={(e) => e.stopPropagation()}
                          style={{
                            display: 'inline-flex', alignItems: 'center', gap: 4,
                            fontSize: 11, color: '#3b82f6', padding: '4px 8px',
                            border: '1px solid #bfdbfe', borderRadius: 6, textDecoration: 'none', flexShrink: 0,
                          }}
                        >🗺️ Map</a>
                      )}
                    </div>
                  )}
                  {!isComplete && (
                    <button
                      onClick={(e) => { e.stopPropagation(); setInlineEventId(ev.id); }}
                      style={{
                        width: '100%', padding: '10px 12px', borderRadius: 10,
                        border: '1px dashed var(--rose)', background: 'transparent',
                        color: 'var(--rose)', fontSize: 12, fontWeight: 600, cursor: 'pointer',
                        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                      }}
                    >
                      ✏️ Fill Details
                    </button>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
      <div style={{ height: 16 }} />

      {inlineEvent && (
        <EventInlineEditSheet
          open={!!inlineEventId}
          onClose={() => setInlineEventId(null)}
          event={inlineEvent}
          loc={inlineLoc}
          ctx={ctx}
          references={data.references || []}
          onSaved={onRefetch}
        />
      )}
    </>
  );
}
