import { useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';
import { portalApi, type PortalContext } from '@/lib/portalClient';
import VenueSearchInput from '@/components/portal/VenueSearchInput';
import MiniMapPreview from '@/components/portal/MiniMapPreview';
import NepaliEnglishDate from '@/components/portal/NepaliEnglishDate';
import TimePicker12hPair, { fmt12, durationLabel } from '@/components/portal/TimePicker12h';

function latestNoteFor(refs: any[] | undefined, eventName: string): { id: string; description: string } | null {
  if (!refs?.length) return null;
  const matches = refs
    .filter((r) => (r.event_name || '') === eventName && (r.entry_type === 'note' || r.entry_type === 'demand') && r.description)
    .sort((a, b) => new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime());
  if (!matches.length) return null;
  return { id: matches[0].id, description: matches[0].description };
}


interface Props {
  open: boolean;
  onClose: () => void;
  focusEventId: string | null;
  data: any;
  ctx: PortalContext;
  onSaved: () => void;
}

function fmtDate(d?: string | null) {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('en-US', { weekday: 'short', month: 'long', day: 'numeric', year: 'numeric' });
}
function getDays(d?: string | null) {
  if (!d) return -1;
  const dt = new Date(d), now = new Date();
  now.setHours(0, 0, 0, 0); dt.setHours(0, 0, 0, 0);
  return Math.ceil((dt.getTime() - now.getTime()) / 86400000);
}

export default function EventDetailsOverlay({ open, onClose, focusEventId, data, ctx, onSaved }: Props) {
  const events: any[] = data.events || [];
  const crew: any[] = data.crew || [];
  const locByEvent = useMemo(() => {
    const m = new Map<string, any>();
    (data.event_locations || []).forEach((l: any) => m.set(l.event_id, l));
    return m;
  }, [data.event_locations]);
  const crewByEvent = useMemo(() => {
    const m = new Map<string, any[]>();
    crew.forEach((c) => {
      if (!c.assigned_freelancer) return;
      const list = m.get(c.event_id) || [];
      list.push(c);
      m.set(c.event_id, list);
    });
    return m;
  }, [crew]);

  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());
  const [editId, setEditId] = useState<string | null>(null);
  const [dateMsgIds, setDateMsgIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (open && focusEventId) {
      setExpandedIds(new Set([focusEventId]));
      setEditId(focusEventId);
      setTimeout(() => {
        document.getElementById('cp-evdc-' + focusEventId)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }, 350);
    }
    if (!open) { setEditId(null); setExpandedIds(new Set()); }
  }, [open, focusEventId]);

  const toggleExpand = (id: string) => {
    const s = new Set(expandedIds);
    if (s.has(id)) { s.delete(id); if (editId === id) setEditId(null); }
    else s.add(id);
    setExpandedIds(s);
  };

  const toggleDateMsg = (id: string) => {
    const s = new Set(dateMsgIds);
    s.has(id) ? s.delete(id) : s.add(id);
    setDateMsgIds(s);
  };

  return (
    <div className={`cp-overlay ${open ? 'open' : ''}`}>
      <div className="cp-overlay-top">
        <button className="cp-overlay-back" onClick={onClose}>←</button>
        <div style={{ flex: 1 }}>
          <div style={{ fontFamily: 'var(--cp-font-d)', fontSize: 21, fontWeight: 600, lineHeight: 1 }}>Event Details</div>
          <div style={{ fontSize: 10, color: 'var(--cp-text-3)', marginTop: 2 }}>Tap to expand · ✏️ Edit to update</div>
        </div>
        <div className="cp-evd-dbadge">{events.length} events</div>
      </div>

      <div className="cp-evd-list">
        {events.map((ev) => {
          const isOpen = expandedIds.has(ev.id);
          const isEdit = editId === ev.id;
          const days = getDays(ev.event_date_ad);
          const loc = locByEvent.get(ev.id);
          const crewList = crewByEvent.get(ev.id) || [];

          return (
            <div key={ev.id} id={'cp-evdc-' + ev.id} className={`cp-evd-card ${isOpen ? 'open' : ''}`}>
              <div className="cp-evd-card-hd" onClick={() => toggleExpand(ev.id)}>
                <div className="cp-evd-dot" />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div className="cp-evd-name">{ev.event_name}</div>
                  <div className="cp-evd-date-sub">{fmtDate(ev.event_date_ad)}</div>
                </div>
                {days >= 0 && (
                  <span className="cp-evd-dbadge">{days === 0 ? 'Today' : `${days}d`}</span>
                )}
                <span className="cp-evd-chev">▾</span>
              </div>

              {isOpen && (
                <div className="cp-evd-body">
                  <div className="cp-evd-body-in">
                    {!isEdit ? (
                      <>
                        <div className="cp-evd-ir">
                          <span className="cp-evd-ir-ic">📅</span>
                          <div>
                            <div className="cp-evd-ir-lb">Date</div>
                            <div className="cp-evd-ir-vl">{fmtDate(ev.event_date_ad)}</div>
                            {days >= 0 && (
                              <div style={{ fontSize: 10, color: 'var(--cp-text-3)', marginTop: 2 }}>
                                <span style={{ color: 'var(--rose)', fontWeight: 500 }}>
                                  {days > 0 ? `${days} days left` : days === 0 ? 'Today' : 'Past'}
                                </span>
                              </div>
                            )}
                          </div>
                        </div>
                        <div className="cp-evd-ir">
                          <span className="cp-evd-ir-ic">📍</span>
                          <div>
                            <div className="cp-evd-ir-lb">Venue</div>
                            <div className="cp-evd-ir-vl">{loc?.venue_name || '—'}</div>
                            {loc?.venue_address && (
                              <div style={{ fontSize: 11, color: 'var(--cp-text-3)', marginTop: 2 }}>{loc.venue_address}</div>
                            )}
                          </div>
                        </div>
                        <div className="cp-evd-ir">
                          <span className="cp-evd-ir-ic">🕐</span>
                          <div>
                            <div className="cp-evd-ir-lb">Time</div>
                            <div className="cp-evd-ir-vl">{fmt12(loc?.start_time)} – {fmt12(loc?.end_time)}</div>
                            {durationLabel(loc?.start_time, loc?.end_time) && (
                              <div style={{ fontSize: 11, color: 'var(--cp-text-3)', marginTop: 2 }}>
                                Duration: {durationLabel(loc?.start_time, loc?.end_time)}
                              </div>
                            )}
                          </div>
                        </div>
                        {crewList.length > 0 && (
                          <div style={{ marginTop: 12 }}>
                            <div className="cp-crew-t">Crew Assigned</div>
                            {crewList.map((c, i) => (
                              <div className="cp-crew-r" key={i}>
                                <span className="rl">{c.role}</span>
                              </div>
                            ))}
                          </div>
                        )}
                        <button className="cp-evd-edit-btn" onClick={() => setEditId(ev.id)}>
                          ✏️ Edit This Event
                        </button>
                      </>
                    ) : (
                      <EditForm
                        ev={ev}
                        loc={loc}
                        ctx={ctx}
                        companyName={data?.company?.business_name || data?.company?.full_name || ''}
                        references={data?.references || []}
                        dateMsgOpen={dateMsgIds.has(ev.id)}
                        toggleDateMsg={() => toggleDateMsg(ev.id)}
                        onCancel={() => setEditId(null)}
                        onSaved={() => { setEditId(null); onSaved(); }}
                      />
                    )}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function EditForm({
  ev, loc, ctx, companyName, references, dateMsgOpen, toggleDateMsg, onCancel, onSaved,
}: {
  ev: any; loc: any; ctx: PortalContext; companyName: string;
  references: any[];
  dateMsgOpen: boolean; toggleDateMsg: () => void;
  onCancel: () => void; onSaved: () => void;
}) {
  const existingNote = useMemo(() => latestNoteFor(references, ev.event_name), [references, ev.event_name]);
  const [form, setForm] = useState({
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
    xito_avatar: '',
    xito_cover: '',
  });
  const [saving, setSaving] = useState(false);

  const save = async () => {
    setSaving(true);
    try {
      const { xito_avatar, xito_cover, notes, ...payload } = form as any;
      await portalApi.upsertEventLocation(ctx, ev.id, payload);
      const trimmedNote = (notes || '').trim();
      const prevNote = (existingNote?.description || '').trim();
      if (trimmedNote && trimmedNote !== prevNote) {
        try {
          await portalApi.addReference(ctx, {
            entry_type: 'note',
            description: trimmedNote,
            event_name: ev.event_name || null,
          });
        } catch (err) { console.warn('note save failed', err); }
      }
      toast.success('Event updated ✓');
      onSaved();
    } catch (e: any) {
      toast.error(e.message || 'Save failed');
    } finally { setSaving(false); }
  };


  const clearVenue = () => setForm((f) => ({
    ...f,
    venue_name: '', venue_address: '',
    venue_lat: null, venue_lng: null, venue_place_id: '',
    xito_venue_id: '', venue_type: '', venue_area: '', venue_city: '', venue_google_map: '',
    xito_avatar: '', xito_cover: '',
  }));

  const isLocked = !!form.xito_venue_id;

  return (
    <div className="cp-evd-form">
      <div className="cp-ef-sl">Date</div>
      <button type="button" className="cp-date-ro" onClick={toggleDateMsg} style={{ border: '1px solid var(--cp-border)', width: '100%', textAlign: 'left' }}>
        <span style={{ fontSize: 15, flexShrink: 0 }}>📅</span>
        <div style={{ flex: 1, minWidth: 0 }}>
          <NepaliEnglishDate value={ev.event_date_ad} size="sm" />
          <div style={{ fontSize: 10, color: 'var(--cp-text-3)', marginTop: 4 }}>Tap ℹ️ to change</div>
        </div>
      </button>
      {dateMsgOpen && (
        <div className="cp-date-msg">
          <span style={{ flexShrink: 0, marginTop: 1 }}>💬</span>
          <span>To change the event date, please contact <strong>{companyName || 'your studio'}</strong> directly.</span>
        </div>
      )}

      <div className="cp-ef-sl">Venue</div>
      {isLocked ? (
        <div style={{
          display: 'flex', alignItems: 'center', gap: 12,
          padding: 12, border: '1px solid var(--cp-border)', borderRadius: 10,
          background: '#faf8f7',
        }}>
          {form.xito_avatar ? (
            <img src={form.xito_avatar} alt="" style={{ width: 44, height: 44, borderRadius: '50%', objectFit: 'cover', flexShrink: 0 }} />
          ) : (
            <div style={{ width: 44, height: 44, borderRadius: '50%', background: '#e8a87c', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: 16, flexShrink: 0 }}>
              {(form.venue_name || '?').charAt(0).toUpperCase()}
            </div>
          )}
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
              <span style={{ fontWeight: 600, fontSize: 14 }}>{form.venue_name}</span>
              <span style={{ fontSize: 9, fontWeight: 600, padding: '2px 6px', borderRadius: 4, background: '#ede9fe', color: '#7c3aed', letterSpacing: 0.3 }}>{form.venue_type}</span>
            </div>
            <div style={{ fontSize: 11, color: 'var(--cp-text-3)', marginTop: 2 }}>
              {[form.venue_area, form.venue_city].filter(Boolean).join(', ') || '—'}
            </div>
            {form.venue_google_map && (
              <a href={form.venue_google_map} target="_blank" rel="noreferrer" style={{ fontSize: 11, color: '#3b82f6', textDecoration: 'underline' }}>
                Open map ↗
              </a>
            )}
          </div>
          <button type="button" onClick={clearVenue} style={{
            background: 'transparent', border: '1px solid var(--cp-border)',
            borderRadius: 6, padding: '4px 8px', fontSize: 11, cursor: 'pointer', color: '#64748b', flexShrink: 0,
          }}>✕ Change</button>
        </div>
      ) : (
        <>
          <div className="cp-venue-wrap">
            <div className="cp-venue-row">
              <span className="cp-venue-ico">📍</span>
              <VenueSearchInput
                ctx={ctx}
                value={form.venue_name}
                onChange={(v) => setForm((f) => ({ ...f, venue_name: v }))}
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
                placeholder="Search venue name or address…"
                className="cp-venue-inp"
              />
            </div>
          </div>
          {form.venue_address && (
            <div className="cp-venue-filled">✅ {form.venue_address}</div>
          )}
        </>
      )}

      <div style={{ marginTop: 8 }}>
        <MiniMapPreview lat={form.venue_lat ?? undefined} lng={form.venue_lng ?? undefined} label={form.venue_name} height={200} />
      </div>

      <div className="cp-ef-sl">Time</div>
      <TimePicker12hPair
        startValue={form.start_time}
        endValue={form.end_time}
        onChangeStart={(v) => setForm((f) => ({ ...f, start_time: v }))}
        onChangeEnd={(v) => setForm((f) => ({ ...f, end_time: v }))}
      />

      <div className="cp-ef-sl">Total number of guests</div>
      <input
        type="number"
        inputMode="numeric"
        min={0}
        placeholder="e.g. 250"
        value={(form as any).guest_count}
        onChange={(e) => setForm((f) => ({ ...f, guest_count: e.target.value.replace(/[^\d]/g, '') as any }))}
        style={{ width: '100%', border: '1px solid var(--cp-border)', borderRadius: 8, padding: '10px 12px', fontSize: 13 }}
      />

      <div className="cp-ef-sl">
        Notes for this event
        <span style={{ fontWeight: 400, color: 'var(--cp-text-3)', fontSize: 10, marginLeft: 6 }}>
          (also shown in References &amp; Ideas)
        </span>
      </div>
      <textarea
        rows={4}
        placeholder="Anything special the photographer should know? (e.g. surprise moments, key family members, must-have shots)"
        value={(form as any).notes}
        onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value as any }))}
        style={{ width: '100%', border: '1px solid var(--cp-border)', borderRadius: 8, padding: '10px 12px', fontSize: 13, resize: 'vertical', fontFamily: 'inherit' }}
      />




      <div className="cp-efa">
        <button className="cp-ef-cancel" onClick={onCancel}>Cancel</button>
        <button className="cp-ef-save" onClick={save} disabled={saving}>
          {saving ? 'Saving…' : 'Save Changes'}
        </button>
      </div>
    </div>
  );
}
