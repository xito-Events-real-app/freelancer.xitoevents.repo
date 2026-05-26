import { useState, useRef, useEffect, useCallback, useMemo } from "react";
import { loadDeliverables, saveDeliverable, loadAlbumTypes, saveAlbumType, DeliverableRow } from "@/lib/deliverables-api";
import { useAgencyClientEvents } from "@/hooks/useAgencyClientEvents";
import { useCrewAssignments, type CrewAssignment } from "@/hooks/useCrewAssignments";
import { useActiveCompany } from "@/contexts/ActiveCompanyContext";
import { getPhotographersForEvent } from "@/lib/photographer-utils";
import "@/styles/deliverables-glass.css";

interface EventInfo { id: string; name: string; bsLabel: string; adDate: string | null }

interface ItemState {
  enabled: boolean;
  quantity: number;
  names: string[];
  albumName?: string;
  photographerToggles?: Record<string, boolean>;
  photographerNotes?: Record<string, string>;
}

const makeKey = (event: string, section: string, type: string) => `${event}::${section}::${type}`;
const parseKey = (key: string) => { const [event, section, type] = key.split('::'); return { event, section, type }; };

function buildDefaults(events: EventInfo[]) {
  const state: Record<string, ItemState> = {};
  for (const ev of events) {
    state[makeKey(ev.name, 'photos', 'all_photos')] = { enabled: true, quantity: 1, names: [] };
    state[makeKey(ev.name, 'photos', 'selected_photos')] = { enabled: false, quantity: 1, names: [], photographerToggles: {}, photographerNotes: {} };
    state[makeKey(ev.name, 'photos', 'insta_post')] = { enabled: false, quantity: 1, names: [''] };
    state[makeKey(ev.name, 'videos', 'full_video')] = { enabled: true, quantity: 1, names: [ev.name] };
    state[makeKey(ev.name, 'videos', 'highlights')] = { enabled: true, quantity: 1, names: [ev.name], albumName: ev.name };
    state[makeKey(ev.name, 'videos', 'reel')] = { enabled: false, quantity: 1, names: [''] };
    state[makeKey(ev.name, 'videos', 'video_insta_post')] = { enabled: false, quantity: 1, names: [''] };
  }
  state[makeKey('OVERALL', 'overall', 'overall_highlights')] = { enabled: false, quantity: 1, names: [''] };
  state[makeKey('OVERALL', 'overall', 'overall_reel')] = { enabled: false, quantity: 1, names: [''] };
  state[makeKey('ALBUM', 'album', 'bride_album')] = { enabled: false, quantity: 1, names: [''] };
  state[makeKey('ALBUM', 'album', 'groom_album')] = { enabled: false, quantity: 1, names: [''] };
  state[makeKey('ALBUM', 'album', 'other_album')] = { enabled: false, quantity: 1, names: [''], albumName: '' };
  state[makeKey('PHYSICAL', 'physical', 'pendrive')] = { enabled: false, quantity: 0, names: [] };
  state[makeKey('PHYSICAL', 'physical', 'frame')] = { enabled: false, quantity: 0, names: [] };
  return state;
}

function splitEventName(name: string): [string, string] {
  for (const sep of [' & ', ' + ', ' and ', ' AND ']) {
    const idx = name.indexOf(sep);
    if (idx !== -1) return [name.slice(0, idx).trim(), name.slice(idx + sep.length).trim()];
  }
  return [name, ''];
}

function rowToState(row: DeliverableRow): ItemState {
  return {
    enabled: row.enabled, quantity: row.quantity,
    names: row.item_names ? row.item_names.split('|||') : [],
    albumName: row.album_name || undefined,
    photographerToggles: row.photographer_toggles ? (() => { try { return JSON.parse(row.photographer_toggles); } catch { return {}; } })() : {},
    photographerNotes: row.photographer_notes ? (() => { try { return JSON.parse(row.photographer_notes); } catch { return {}; } })() : {},
  };
}

function stateToRow(clientId: string, event: string, section: string, type: string, item: ItemState): DeliverableRow {
  return {
    client_id: clientId, event_name: event, section, deliverable_type: type,
    enabled: item.enabled, quantity: item.quantity,
    item_names: item.names.join('|||'),
    album_name: item.albumName || '',
    photographer_toggles: item.photographerToggles ? JSON.stringify(item.photographerToggles) : '',
    photographer_notes: item.photographerNotes ? JSON.stringify(item.photographerNotes) : '',
  };
}

function formatAdShort(ad: string | null): string {
  if (!ad) return '';
  const d = new Date(ad);
  if (isNaN(d.getTime())) return '';
  const months = ['JAN','FEB','MAR','APR','MAY','JUN','JUL','AUG','SEP','OCT','NOV','DEC'];
  return `${months[d.getMonth()]} ${d.getDate()}`;
}

/* ── Atomic UI bits ── */
function Toggle({ checked, onChange }: { checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <label className="dg-toggle">
      <input type="checkbox" checked={checked} onChange={e => onChange(e.target.checked)} />
      <span className="dg-track"><span className="dg-thumb" /></span>
    </label>
  );
}

function Qty({ value, onMinus, onPlus }: { value: number; onMinus: () => void; onPlus: () => void }) {
  return (
    <div className="dg-qty">
      <button type="button" className="dg-qty-btn" onClick={onMinus}>−</button>
      <span className="dg-qty-num">{value}</span>
      <button type="button" className="dg-qty-btn" onClick={onPlus}>+</button>
    </div>
  );
}

export default function DeliverablesSection({ clientId }: { clientId: string }) {
  const { activeAgencyId } = useActiveCompany();
  const { data: dbEvents = [] } = useAgencyClientEvents(clientId);
  const eventIds = useMemo(() => dbEvents.map(e => e.id), [dbEvents]);
  const { data: assignments = [] } = useCrewAssignments(eventIds);

  const events = useMemo<EventInfo[]>(() => dbEvents.map(e => ({
    id: e.id, name: (e.event_name || 'Event').toUpperCase(),
    bsLabel: e.event_date_bs || '',
    adDate: e.event_date_ad || null,
  })), [dbEvents]);

  const [state, setState] = useState<Record<string, ItemState>>(() => buildDefaults(events));
  const [savedAlbumTypes, setSavedAlbumTypes] = useState<string[]>([]);
  const loadedRef = useRef(false);
  const debounceTimers = useRef<Record<string, ReturnType<typeof setTimeout>>>({});
  const pendingItems = useRef<Record<string, ItemState>>({});

  useEffect(() => {
    if (!loadedRef.current) setState(buildDefaults(events));
  }, [events]);

  useEffect(() => {
    if (!clientId || !activeAgencyId) return;
    let canceled = false;
    (async () => {
      const [rows, types] = await Promise.all([
        loadDeliverables(clientId),
        loadAlbumTypes(activeAgencyId),
      ]);
      if (canceled) return;
      setSavedAlbumTypes(types.length > 0 ? types : ['Magazine', 'Photobook', 'Canvas', 'Flush Mount', 'Coffee Table']);
      if (rows.length > 0) {
        setState(prev => {
          const merged = { ...prev };
          for (const row of rows) {
            merged[makeKey(row.event_name, row.section, row.deliverable_type)] = rowToState(row);
          }
          return merged;
        });
      }
      loadedRef.current = true;
    })();
    return () => { canceled = true; };
  }, [clientId, activeAgencyId]);

  useEffect(() => {
    return () => {
      Object.values(debounceTimers.current).forEach(t => clearTimeout(t));
      debounceTimers.current = {};
      if (clientId) {
        Object.entries(pendingItems.current).forEach(([key, item]) => {
          const { event, section, type } = parseKey(key);
          saveDeliverable(stateToRow(clientId, event, section, type, item));
        });
        pendingItems.current = {};
      }
    };
  }, [clientId]);

  const debounceSave = useCallback((key: string, item: ItemState, immediate = false) => {
    if (!clientId || !loadedRef.current) return;
    pendingItems.current[key] = item;
    if (debounceTimers.current[key]) clearTimeout(debounceTimers.current[key]);
    const doSave = () => {
      const { event, section, type } = parseKey(key);
      saveDeliverable(stateToRow(clientId, event, section, type, item));
      delete pendingItems.current[key];
    };
    if (immediate) doSave(); else debounceTimers.current[key] = setTimeout(doSave, 500);
  }, [clientId]);

  const handleSaveAlbumType = async (typeName: string) => {
    if (!activeAgencyId) return;
    const trimmed = typeName.trim();
    if (trimmed && !savedAlbumTypes.includes(trimmed)) {
      setSavedAlbumTypes(prev => [...prev, trimmed]);
      await saveAlbumType(activeAgencyId, trimmed);
    }
  };

  const get = (event: string, section: string, type: string): ItemState =>
    state[makeKey(event, section, type)] || { enabled: false, quantity: 1, names: [] };

  const update = (event: string, section: string, type: string, updates: Partial<ItemState>, immediate = false) => {
    const key = makeKey(event, section, type);
    setState(prev => {
      const updated = { ...(prev[key] || { enabled: false, quantity: 1, names: [] }), ...updates };
      const newState = { ...prev, [key]: updated };
      const shouldBeImmediate = immediate || 'enabled' in updates || 'quantity' in updates || 'photographerToggles' in updates;
      debounceSave(key, updated, shouldBeImmediate);
      return newState;
    });
  };

  // Summary counts
  const counts = useMemo(() => {
    let photos = 0, videos = 0, albums = 0;
    for (const [k, v] of Object.entries(state)) {
      if (!v.enabled) continue;
      if (k.includes('::photos::') || k === makeKey('OVERALL','overall','overall_highlights') || k === makeKey('OVERALL','overall','overall_reel')) photos++;
      if (k.includes('::videos::')) videos++;
      if (k.includes('::album::') || k.includes('::physical::')) albums++;
    }
    return { photos, videos, albums };
  }, [state]);

  if (events.length === 0) {
    return (
      <div className="deliverables-glass">
        <div className="dg-orb dg-orb-1" /><div className="dg-orb dg-orb-2" /><div className="dg-orb dg-orb-3" />
        <div className="dg-content" style={{ textAlign:'center', padding:'40px 0', color:'var(--dg-text-3)', fontSize:13 }}>
          No events found for this client.
        </div>
      </div>
    );
  }

  return (
    <div className="deliverables-glass">
      <div className="dg-orb dg-orb-1" />
      <div className="dg-orb dg-orb-2" />
      <div className="dg-orb dg-orb-3" />

      <div className="dg-content">
        {/* PAGE HEADER */}
        <div className="dg-page-header dg-fade-up">
          <div className="dg-page-title-row">
            <div className="dg-page-icon">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/><polyline points="3.27 6.96 12 12.01 20.73 6.96"/><line x1="12" y1="22.08" x2="12" y2="12"/></svg>
            </div>
            <h1 className="dg-page-title">Deliverables <span className="amp">&amp;</span> Output Plan</h1>
          </div>
          <div className="dg-page-sub">{events.length} event{events.length>1?'s':''} · Configure all photo, video, album &amp; physical deliverables</div>
        </div>

        {/* SUMMARY PILLS */}
        <div className="dg-summary-row dg-fade-up">
          <div className="dg-sum-pill"><span className="dg-sum-pill-dot" style={{ background:'var(--rose)' }} /><span className="dg-sum-pill-count">{counts.photos}</span> Photo Deliverables</div>
          <div className="dg-sum-pill"><span className="dg-sum-pill-dot" style={{ background:'hsl(270,55%,65%)' }} /><span className="dg-sum-pill-count">{counts.videos}</span> Video Deliverables</div>
          <div className="dg-sum-pill"><span className="dg-sum-pill-dot" style={{ background:'var(--green)' }} /><span className="dg-sum-pill-count">{counts.albums}</span> Albums &amp; Physical</div>
        </div>

        {/* EVENT CARDS */}
        {events.map(ev => (
          <EventCard key={ev.id} event={ev} get={get} update={update} assignments={assignments} />
        ))}

        {/* OVERALL */}
        <div className="dg-sec-card dg-glass dg-fade-up">
          <div className="dg-sec-head">
            <div className="dg-sec-head-icon">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="8" r="6"/><path d="M15.477 12.89 17 22l-5-3-5 3 1.523-9.11"/></svg>
            </div>
            <span className="dg-sec-head-title">Overall</span>
          </div>
          <div className="dg-sec-body">
            <div className="dg-ov-grid">
              <div><MultiItemRow label="Overall Highlights" item={get('OVERALL','overall','overall_highlights')} onChange={u => update('OVERALL','overall','overall_highlights', u)} /></div>
              <div><MultiItemRow label="Overall Reel" item={get('OVERALL','overall','overall_reel')} onChange={u => update('OVERALL','overall','overall_reel', u)} /></div>
            </div>
          </div>
        </div>

        {/* ALBUM */}
        <div className="dg-sec-card dg-glass dg-fade-up">
          <div className="dg-sec-head">
            <div className="dg-sec-head-icon">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/></svg>
            </div>
            <span className="dg-sec-head-title">Album</span>
          </div>
          <div className="dg-sec-body">
            <AlbumTypeRow label="Bride Side Album" item={get('ALBUM','album','bride_album')} onChange={u => update('ALBUM','album','bride_album', u)} savedTypes={savedAlbumTypes} onSaveType={handleSaveAlbumType} />
            <AlbumTypeRow label="Groom Side Album" item={get('ALBUM','album','groom_album')} onChange={u => update('ALBUM','album','groom_album', u)} savedTypes={savedAlbumTypes} onSaveType={handleSaveAlbumType} />
            <OtherAlbumRow item={get('ALBUM','album','other_album')} onChange={u => update('ALBUM','album','other_album', u)} />
          </div>
        </div>

        {/* PHYSICAL */}
        <div className="dg-sec-card dg-glass dg-fade-up">
          <div className="dg-sec-head">
            <div className="dg-sec-head-icon">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="6" width="20" height="12" rx="2"/><path d="M12 12h.01"/><path d="M17 12h.01"/><path d="M7 12h.01"/></svg>
            </div>
            <span className="dg-sec-head-title">Pendrive &amp; Frame</span>
          </div>
          <div className="dg-sec-body">
            <QuantityRow label="Pendrive" item={get('PHYSICAL','physical','pendrive')} onChange={u => update('PHYSICAL','physical','pendrive', u)} />
            <QuantityRow label="Frame" item={get('PHYSICAL','physical','frame')} onChange={u => update('PHYSICAL','physical','frame', u)} />
          </div>
        </div>
      </div>
    </div>
  );
}

function EventCard({ event, get, update, assignments }: {
  event: EventInfo;
  get: (e: string, s: string, t: string) => ItemState;
  update: (e: string, s: string, t: string, u: Partial<ItemState>) => void;
  assignments: CrewAssignment[];
}) {
  const adShort = formatAdShort(event.adDate);
  return (
    <div className="dg-event-card dg-glass dg-fade-up">
      <div className="dg-event-head">
        {(adShort || event.bsLabel) && (
          <div className="dg-ev-date-badge">
            <span className="dg-ev-date-dot" />
            <span className="dg-ev-date-text">
              {adShort}{adShort && event.bsLabel ? ' · ' : ''}{event.bsLabel}
            </span>
          </div>
        )}
        <span className="dg-ev-title">{event.name}</span>
      </div>
      <div className="dg-ev-grid">
        <div className="dg-ev-col dg-col-photo">
          <div className="dg-col-label-row">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ color:'var(--rose-dark)' }}><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/><circle cx="12" cy="13" r="4"/></svg>
            <span className="dg-col-label">Photos</span>
          </div>
          <SimpleRow label="All Photos" item={get(event.name,'photos','all_photos')} onChange={u => update(event.name,'photos','all_photos', u)} />
          <SelectedPhotosRow item={get(event.name,'photos','selected_photos')} onChange={u => update(event.name,'photos','selected_photos', u)} eventId={event.id} assignments={assignments} />
          <MultiItemRow label="Insta Post" item={get(event.name,'photos','insta_post')} onChange={u => update(event.name,'photos','insta_post', u)} />
        </div>
        <div className="dg-ev-col dg-col-video">
          <div className="dg-col-label-row">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ color:'hsl(270,55%,50%)' }}><polygon points="23 7 16 12 23 17 23 7"/><rect x="1" y="5" width="15" height="14" rx="2" ry="2"/></svg>
            <span className="dg-col-label">Videos</span>
          </div>
          <FullVideoRow eventName={event.name} item={get(event.name,'videos','full_video')} onChange={u => update(event.name,'videos','full_video', u)} />
          <HighlightsRow eventName={event.name} item={get(event.name,'videos','highlights')} onChange={u => update(event.name,'videos','highlights', u)} />
          <MultiItemRow label="Reel" item={get(event.name,'videos','reel')} onChange={u => update(event.name,'videos','reel', u)} />
          <MultiItemRow label="Insta Post" item={get(event.name,'videos','video_insta_post')} onChange={u => update(event.name,'videos','video_insta_post', u)} />
        </div>
      </div>
    </div>
  );
}

function SimpleRow({ label, item, onChange }: { label: string; item: ItemState; onChange: (u: Partial<ItemState>) => void }) {
  return (
    <div className="dg-row">
      <span className="dg-row-label">{label}</span>
      <div className="dg-row-right">
        <Toggle checked={item.enabled} onChange={v => onChange({ enabled: v })} />
      </div>
    </div>
  );
}

function FullVideoRow({ eventName, item, onChange }: { eventName: string; item: ItemState; onChange: (u: Partial<ItemState>) => void }) {
  const names = [...item.names];
  while (names.length < item.quantity) names.push('');
  const handleToggle = (v: boolean) => onChange({ enabled: v, quantity: v ? Math.max(item.quantity, 1) : item.quantity });
  const handleQty = (delta: number) => {
    const newQty = Math.max(1, item.quantity + delta);
    const newNames = [...names];
    if (item.quantity === 1 && newQty === 2) {
      const [p1, p2] = splitEventName(newNames[0] || eventName);
      newNames[0] = p1; newNames.push(p2);
    } else {
      while (newNames.length < newQty) newNames.push('');
      if (newQty < newNames.length) newNames.length = newQty;
    }
    onChange({ quantity: newQty, names: newNames });
  };
  return <NameListRow label="Full Video" item={item} names={names} onToggle={handleToggle} onQty={handleQty} onName={(idx, val) => { const n = [...names]; n[idx] = val; onChange({ names: n }); }} />;
}

function HighlightsRow({ eventName, item, onChange }: { eventName: string; item: ItemState; onChange: (u: Partial<ItemState>) => void }) {
  const names = [...item.names];
  while (names.length < item.quantity) names.push('');
  const handleToggle = (v: boolean) => onChange({ enabled: v, quantity: v ? Math.max(item.quantity, 1) : item.quantity });
  const handleQty = (delta: number) => {
    const newQty = Math.max(1, item.quantity + delta);
    const newNames = [...names];
    if (item.quantity === 1 && newQty === 2) {
      const baseName = item.albumName || eventName;
      const [p1, p2] = splitEventName(baseName);
      newNames[0] = `${p1} HIGHLIGHTS`; newNames.push(p2 ? `${p2} HIGHLIGHTS` : '');
    } else {
      while (newNames.length < newQty) newNames.push('');
      if (newQty < newNames.length) newNames.length = newQty;
    }
    onChange({ quantity: newQty, names: newNames });
  };
  return <NameListRow label="Highlights" item={item} names={names} onToggle={handleToggle} onQty={handleQty} onName={(idx, val) => { const n = [...names]; n[idx] = val; onChange({ names: n }); }} />;
}

function NameListRow({ label, item, names, onToggle, onQty, onName }: {
  label: string; item: ItemState; names: string[];
  onToggle: (v: boolean) => void; onQty: (d: number) => void; onName: (idx: number, val: string) => void;
}) {
  return (
    <div>
      <div className="dg-row">
        <span className="dg-row-label">{label}</span>
        <div className="dg-row-right">
          {item.enabled && <Qty value={item.quantity} onMinus={() => onQty(-1)} onPlus={() => onQty(1)} />}
          <Toggle checked={item.enabled} onChange={onToggle} />
        </div>
      </div>
      {item.enabled && item.quantity > 0 && (
        <div className="dg-sub-block">
          {Array.from({ length: item.quantity }).map((_, idx) => (
            <div key={idx} className="dg-sub-row">
              <span className="dg-sub-lbl">{label} {idx + 1}</span>
              <input className="dg-inp" value={names[idx] || ''} onChange={e => onName(idx, e.target.value)} placeholder="Name…" />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function SelectedPhotosRow({ item, onChange, eventId, assignments }: {
  item: ItemState; onChange: (u: Partial<ItemState>) => void; eventId: string; assignments: CrewAssignment[];
}) {
  const photographers = getPhotographersForEvent(eventId, assignments);
  const handleToggle = (enabled: boolean) => {
    if (enabled) {
      const toggles: Record<string, boolean> = {};
      if (photographers.length === 1) toggles[photographers[0].key] = true;
      else for (const p of photographers) toggles[p.key] = false;
      onChange({ enabled: true, photographerToggles: toggles });
    } else {
      onChange({ enabled: false });
    }
  };
  const handlePhotographerToggle = (key: string, val: boolean) => {
    onChange({ photographerToggles: { ...(item.photographerToggles || {}), [key]: val } });
  };

  return (
    <div>
      <div className="dg-row">
        <span className="dg-row-label">Selected Photos</span>
        <div className="dg-row-right"><Toggle checked={item.enabled} onChange={handleToggle} /></div>
      </div>
      {item.enabled && (
        <div className="dg-sub-block">
          {photographers.length === 0 && (
            <span style={{ fontSize:11, color:'var(--dg-text-3)', fontStyle:'italic' }}>No photographers assigned</span>
          )}
          {photographers.length > 0 && (
            <div className="dg-photog-row">
              {photographers.map(p => {
                const isOn = item.photographerToggles?.[p.key] ?? false;
                return (
                  <div key={p.key} className={`dg-photog-chip ${isOn ? 'active' : ''}`}>
                    <span className="dg-photog-code">{p.code}</span>
                    <span className="dg-photog-name">{p.name}</span>
                    <Toggle checked={isOn} onChange={v => handlePhotographerToggle(p.key, v)} />
                  </div>
                );
              })}
            </div>
          )}
          {photographers.filter(p => item.photographerToggles?.[p.key]).map(p => (
            <textarea
              key={p.key}
              className="dg-note"
              value={item.photographerNotes?.[p.key] || ''}
              onChange={e => onChange({ photographerNotes: { ...(item.photographerNotes || {}), [p.key]: e.target.value } })}
              placeholder={`${p.code} · ${p.name} — selection notes…`}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function MultiItemRow({ label, item, onChange }: { label: string; item: ItemState; onChange: (u: Partial<ItemState>) => void }) {
  const names = [...item.names];
  while (names.length < item.quantity) names.push('');
  const handleToggle = (v: boolean) => onChange({ enabled: v, quantity: v ? Math.max(item.quantity, 1) : item.quantity });
  const handleQty = (delta: number) => {
    const newQty = Math.max(1, item.quantity + delta);
    const newNames = [...names];
    while (newNames.length < newQty) newNames.push('');
    if (newQty < newNames.length) newNames.length = newQty;
    onChange({ quantity: newQty, names: newNames });
  };
  return <NameListRow label={label} item={item} names={names} onToggle={handleToggle} onQty={handleQty} onName={(idx, val) => { const n = [...names]; n[idx] = val; onChange({ names: n }); }} />;
}

function AlbumTypeRow({ label, item, onChange, savedTypes, onSaveType }: {
  label: string; item: ItemState; onChange: (u: Partial<ItemState>) => void;
  savedTypes: string[]; onSaveType: (name: string) => void;
}) {
  const names = [...item.names];
  while (names.length < item.quantity) names.push('');
  const handleToggle = (v: boolean) => onChange({ enabled: v, quantity: v ? Math.max(item.quantity, 1) : item.quantity });
  const handleQty = (delta: number) => {
    const newQty = Math.max(1, item.quantity + delta);
    const newNames = [...names];
    while (newNames.length < newQty) newNames.push('');
    if (newQty < newNames.length) newNames.length = newQty;
    onChange({ quantity: newQty, names: newNames });
  };
  const handleName = (idx: number, val: string) => { const n = [...names]; n[idx] = val; onChange({ names: n }); };

  return (
    <div>
      <div className="dg-row">
        <span className="dg-row-label">{label}</span>
        <div className="dg-row-right">
          {item.enabled && <Qty value={item.quantity} onMinus={() => handleQty(-1)} onPlus={() => handleQty(1)} />}
          <Toggle checked={item.enabled} onChange={handleToggle} />
        </div>
      </div>
      {item.enabled && item.quantity > 0 && (
        <div className="dg-sub-block">
          {Array.from({ length: item.quantity }).map((_, idx) => (
            <AlbumTypeInput key={idx} idx={idx} value={names[idx] || ''} savedTypes={savedTypes}
              onSelect={val => handleName(idx, val)} onChange={val => handleName(idx, val)}
              onBlurSave={val => { if (val.trim()) onSaveType(val); }} />
          ))}
        </div>
      )}
    </div>
  );
}

function AlbumTypeInput({ idx, value, savedTypes, onSelect, onChange, onBlurSave }: {
  idx: number; value: string; savedTypes: string[];
  onSelect: (val: string) => void; onChange: (val: string) => void; onBlurSave: (val: string) => void;
}) {
  const [showDropdown, setShowDropdown] = useState(false);
  const filtered = savedTypes.filter(t => t.toLowerCase().includes(value.toLowerCase()));
  return (
    <div className="dg-sub-row" style={{ position:'relative' }}>
      <span className="dg-sub-lbl">Type {idx + 1}</span>
      <div style={{ position:'relative', flex:1 }}>
        <input className="dg-inp" value={value}
          onChange={e => { onChange(e.target.value); setShowDropdown(true); }}
          onFocus={() => setShowDropdown(true)}
          onBlur={() => { setTimeout(() => setShowDropdown(false), 150); onBlurSave(value); }}
          placeholder="Album type…" />
        {showDropdown && filtered.length > 0 && (
          <div className="dg-dropdown">
            {filtered.map(type => (
              <button key={type} type="button"
                onMouseDown={e => { e.preventDefault(); onSelect(type); setShowDropdown(false); }}>{type}</button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function OtherAlbumRow({ item, onChange }: { item: ItemState; onChange: (u: Partial<ItemState>) => void }) {
  const names = [...item.names];
  while (names.length < item.quantity) names.push('');
  const handleToggle = (v: boolean) => onChange({ enabled: v, quantity: v ? Math.max(item.quantity, 1) : item.quantity });
  const handleQty = (delta: number) => {
    const newQty = Math.max(1, item.quantity + delta);
    const newNames = [...names];
    while (newNames.length < newQty) newNames.push('');
    if (newQty < newNames.length) newNames.length = newQty;
    onChange({ quantity: newQty, names: newNames });
  };
  const handleName = (idx: number, val: string) => { const n = [...names]; n[idx] = val; onChange({ names: n }); };
  return (
    <div>
      <div className="dg-row">
        <span className="dg-row-label">Other Album</span>
        <div className="dg-row-right">
          {item.enabled && <Qty value={item.quantity} onMinus={() => handleQty(-1)} onPlus={() => handleQty(1)} />}
          <Toggle checked={item.enabled} onChange={handleToggle} />
        </div>
      </div>
      {item.enabled && (
        <div className="dg-sub-block">
          <div className="dg-sub-row">
            <span className="dg-sub-lbl accent">Album Name</span>
            <input className="dg-inp" value={item.albumName || ''} onChange={e => onChange({ albumName: e.target.value })} placeholder="e.g. Uncle's Album…" />
          </div>
          {Array.from({ length: item.quantity }).map((_, idx) => (
            <div key={idx} className="dg-sub-row">
              <span className="dg-sub-lbl">Type {idx + 1}</span>
              <input className="dg-inp" value={names[idx] || ''} onChange={e => handleName(idx, e.target.value)} placeholder="Album type…" />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function QuantityRow({ label, item, onChange }: { label: string; item: ItemState; onChange: (u: Partial<ItemState>) => void }) {
  const handleToggle = (v: boolean) => onChange({ enabled: v, quantity: v ? Math.max(item.quantity, 1) : item.quantity });
  const handleQty = (delta: number) => { const newQty = Math.max(0, item.quantity + delta); onChange({ quantity: newQty, enabled: newQty > 0 }); };
  return (
    <div className="dg-row">
      <span className="dg-row-label">{label}</span>
      <div className="dg-row-right">
        {item.enabled && <Qty value={item.quantity} onMinus={() => handleQty(-1)} onPlus={() => handleQty(1)} />}
        <Toggle checked={item.enabled} onChange={handleToggle} />
      </div>
    </div>
  );
}
