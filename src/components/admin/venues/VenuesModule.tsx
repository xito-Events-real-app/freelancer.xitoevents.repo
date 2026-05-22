import { useState, useMemo, useEffect } from "react";
import { AdminShell } from "@/components/admin/AdminShell";
import { useXitoVenues, useVenuePhotos, Venue } from "@/hooks/useXitoVenues";
import { useXitoVenueTypes } from "@/hooks/useXitoVenueTypes";
import { useVenueBookings } from "@/hooks/useVenueBookings";
import { TYPESVG, typeConf, typeSvg, cover, accent, initials, socialLinks, SVG } from "./venueTokens";
import { VenueDrawer } from "./VenueDrawer";
import { TypeSettingsModal } from "./TypeSettingsModal";

function Stars({ n, big = false }: { n: number; big?: boolean }) {
  return (
    <div className="xa-stars" style={big ? { fontSize: 18, gap: 2 } : undefined}>
      {[0,1,2,3,4].map(i => (
        <span key={i} className={`xa-star ${i < n ? "on" : "off"}`} style={big ? { fontSize: 18 } : undefined}>{i < n ? "★" : "☆"}</span>
      ))}
    </div>
  );
}

function BookingsList({ venueId }: { venueId: string }) {
  const { data = [], isLoading } = useVenueBookings(venueId);
  if (isLoading) return <div className="xa-tab-pane"><div className="xa-empty">Loading…</div></div>;
  if (!data.length) return <div className="xa-tab-pane"><div className="xa-empty">No bookings yet.</div></div>;
  return (
    <div className="xa-tab-pane">
      <div className="xa-twrap">
        <table className="xa-vtable">
          <thead><tr><th>Company</th><th>Bride & Groom</th><th>Event</th><th>Date</th><th>Time</th></tr></thead>
          <tbody>
            {data.map(b => (
              <tr key={b.event_id}>
                <td>{b.company_name}</td>
                <td>{[b.bride_name, b.groom_name].filter(Boolean).join(" & ") || "—"}</td>
                <td>{b.event_name || "—"}</td>
                <td>{b.event_date_ad ? new Date(b.event_date_ad).toLocaleDateString() : "—"}</td>
                <td>{[b.start_time, b.end_time].filter(Boolean).join(" – ") || "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}


function VenueCard({ v, onOpen }: { v: Venue; onOpen: () => void }) {
  const ac = accent(v.venue_type);
  const icons = socialLinks(v);
  const hasMedia = !!v.avatar_url || !!v.cover_url;
  const archived = !!v.deleted_at;
  return (
    <div className="xa-vcard" onClick={onOpen} style={archived ? { opacity: 0.7 } : undefined}>
      <div className="xa-vc-cover" style={!hasMedia ? { background: cover(v.venue_type) } : undefined}>
        {hasMedia ? (
          <img className="xa-vc-ss-img" src={v.cover_url || v.avatar_url} alt={v.venue_name} />
        ) : (
          <div className="xa-vc-initials">{initials(v.venue_name)}</div>
        )}
        {archived && (
          <div style={{ position: "absolute", top: 8, left: 8, background: "rgba(15,23,42,0.85)", color: "#fff", fontSize: 10, fontWeight: 700, padding: "3px 8px", borderRadius: 4, letterSpacing: 0.4 }}>
            ARCHIVED
          </div>
        )}
        {(v.bookings_count ?? 0) > 0 && (
          <div style={{ position: "absolute", top: 8, right: 8, background: "#fff", color: "#0f172a", fontSize: 11, fontWeight: 600, padding: "3px 8px", borderRadius: 999, boxShadow: "0 2px 6px rgba(0,0,0,0.1)" }}>
            📅 {v.bookings_count} booking{v.bookings_count === 1 ? "" : "s"}
          </div>
        )}
      </div>
      <div className="xa-vc-body">
        <div className="xa-vc-name">{v.venue_name}</div>
        <div className="xa-vc-loc">{[v.city, v.area].filter(Boolean).join(" · ") || "—"}</div>
        <div className="xa-vc-row" style={{ marginBottom: icons.length ? 10 : 0 }}>
          <span className="xa-tbadge" style={{ color: ac, background: ac + "18", border: `1px solid ${ac}28` }}>{v.venue_type}</span>
          <Stars n={v.rating || 0} />
        </div>
        {icons.length > 0 && (
          <div className="xa-ci-row">
            {icons.map(i => (
              <a key={i.key} href={i.href!} className="xa-ci-icon" style={{ color: i.col, background: i.bg }}
                target={i.key === "gmail" || i.key === "call" ? "_self" : "_blank"} rel="noreferrer"
                title={i.label} onClick={e => e.stopPropagation()}
                dangerouslySetInnerHTML={{ __html: i.svg }} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function VenueTable({ list, onOpen }: { list: Venue[]; onOpen: (v: Venue) => void }) {
  return (
    <div className="xa-twrap">
      <table className="xa-vtable">
        <thead><tr><th>Name</th><th>Type</th><th>Location</th><th>Rating</th><th>Contact</th></tr></thead>
        <tbody>
          {list.map(v => {
            const ac = accent(v.venue_type);
            return (
              <tr key={v.id} onClick={() => onOpen(v)}>
                <td><div className="sg" style={{ fontWeight: 600 }}>{v.venue_name}</div>
                  {v.location_briefing && <div style={{ fontSize: 11, color: "var(--xa-muted)", marginTop: 1, maxWidth: 220, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{v.location_briefing}</div>}
                </td>
                <td><span className="xa-tbadge" style={{ color: ac, background: ac+"18", border: `1px solid ${ac}28` }}>{v.venue_type}</span></td>
                <td><div>{v.city || "—"}</div><div style={{ fontSize: 11, color: "var(--xa-muted)" }}>{v.area || ""}</div></td>
                <td><Stars n={v.rating || 0} /></td>
                <td><div>{v.company_phone || v.company_whatsapp || "—"}</div>{v.gmail && <div style={{ fontSize: 11, color: "var(--xa-muted)" }}>{v.gmail}</div>}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function VenueProfile({ venue, onBack, onEdit }: { venue: Venue; onBack: () => void; onEdit: () => void }) {
  const [tab, setTab] = useState<"about" | "photos" | "bookings">("about");
  const [lb, setLb] = useState<number | null>(null);
  const photos = useVenuePhotos(venue.id);
  const ac = accent(venue.venue_type);
  const presence = socialLinks(venue);

  const photoUrls = useMemo(() => (photos.data ?? []).map(p => p.public_url), [photos.data]);

  return (
    <div className="xito-admin" style={{ minHeight: "100vh" }}>
      <div className="xa-prof-cover-wrap" style={!venue.cover_url ? { background: cover(venue.venue_type) } : undefined}>
        {venue.cover_url && <img className="xa-prof-cover-bg" src={venue.cover_url} alt="" />}
        <div className="xa-prof-vignette" />
        <button className="xa-prof-back" onClick={onBack}><i className="ti ti-arrow-left" /> Back</button>
      </div>
      <div className="xa-prof-infobar">
        <div className="xa-prof-avatar-wrap" style={!venue.avatar_url ? { background: cover(venue.venue_type) } : undefined}>
          {venue.avatar_url ? <img className="xa-prof-avatar-img" src={venue.avatar_url} alt="" />
            : <div className="xa-prof-avatar-inner">{initials(venue.venue_name)}</div>}
        </div>
        <div className="xa-prof-meta-row">
          <div>
            <div className="xa-prof-name">{venue.venue_name}</div>
            <div className="xa-prof-sub">
              <span className="xa-tbadge" style={{ color: ac, background: ac+"18", border: `1px solid ${ac}28` }}>{venue.venue_type}</span>
              <span>{[venue.city, venue.area].filter(Boolean).join(" · ") || "—"}</span>
              <Stars n={venue.rating || 0} />
            </div>
          </div>
          <div className="xa-prof-acts">
            <button className="xa-pact pri" onClick={onEdit}><i className="ti ti-edit" /> Edit</button>
          </div>
        </div>
      </div>
      <div className="xa-prof-tabs">
        {(["about","photos","bookings"] as const).map(k => (
          <button key={k} className={`xa-tab-btn ${tab===k?"active":""}`} onClick={() => setTab(k)}>
            <i className={`ti ${k==="about"?"ti-info-circle":k==="photos"?"ti-photo":"ti-calendar-event"}`} />
            {k[0].toUpperCase()+k.slice(1)}
          </button>
        ))}
      </div>

      {tab === "about" && (
        <div className="xa-tab-pane">
          <div className="xa-ag">
            <div className="xa-acard">
              <h3 className="sg">Company Contact</h3>
              {venue.company_phone && <div className="xa-dr"><i className="ti ti-phone" /><div><div className="xa-dl">Phone</div><a className="xa-da" href={`tel:${venue.company_phone}`}>{venue.company_phone}</a></div></div>}
              {venue.company_whatsapp && <div className="xa-dr"><i className="ti ti-brand-whatsapp" /><div><div className="xa-dl">WhatsApp</div><div className="xa-dv">{venue.company_whatsapp}</div></div></div>}
              {venue.gmail && <div className="xa-dr"><i className="ti ti-mail" /><div><div className="xa-dl">Email</div><a className="xa-da" href={`mailto:${venue.gmail}`}>{venue.gmail}</a></div></div>}
              {!venue.company_phone && !venue.company_whatsapp && !venue.gmail && <div style={{ fontSize: 12, color: "var(--xa-muted)" }}>No contact info.</div>}
            </div>

            {[1,2].map(n => {
              const name = (venue as any)[`owner${n}_name`];
              if (!name) return null;
              return (
                <div className="xa-acard" key={n}>
                  <h3 className="sg">Owner {n}</h3>
                  <div className="xa-dr"><i className="ti ti-user" /><div><div className="xa-dl">Name</div><div className="xa-dv">{name}</div></div></div>
                  {(venue as any)[`owner${n}_contact`] && <div className="xa-dr"><i className="ti ti-phone" /><div><div className="xa-dl">Contact</div><a className="xa-da" href={`tel:${(venue as any)[`owner${n}_contact`]}`}>{(venue as any)[`owner${n}_contact`]}</a></div></div>}
                  {(venue as any)[`owner${n}_whatsapp`] && <div className="xa-dr"><i className="ti ti-brand-whatsapp" /><div><div className="xa-dl">WhatsApp</div><div className="xa-dv">{(venue as any)[`owner${n}_whatsapp`]}</div></div></div>}
                </div>
              );
            })}

            <div className="xa-acard">
              <h3 className="sg">Location</h3>
              <div className="xa-dr"><i className="ti ti-map-pin" /><div><div className="xa-dl">Address</div><div className="xa-dv">{[venue.city, venue.area].filter(Boolean).join(", ") || "—"}</div></div></div>
              {venue.location_briefing && <div className="xa-dr"><i className="ti ti-notes" /><div><div className="xa-dl">Briefing</div><div className="xa-dv">{venue.location_briefing}</div></div></div>}
            </div>

            <div className="xa-acard">
              <h3 className="sg">Rating</h3>
              <div className="xa-rating-block">
                <div className="xa-rnum sg">{venue.rating || 0}</div>
                <div>
                  <div className="xa-rstars"><Stars n={venue.rating || 0} big /></div>
                  <div className="xa-rlabel">out of 5</div>
                </div>
              </div>
            </div>

            {presence.length > 0 && (
              <div className="xa-acard" style={{ gridColumn: "1 / -1" }}>
                <h3 className="sg">Online Presence</h3>
                <div className="xa-presence-grid">
                  {presence.map(p => (
                    <a key={p.key} href={p.href!} target={p.key==="gmail"||p.key==="call"?"_self":"_blank"} rel="noreferrer"
                      className="xa-presence-chip" style={{ color: p.col, background: p.bg }}
                    >
                      <span className="xa-presence-icon" dangerouslySetInnerHTML={{ __html: p.svg }} />
                      <span className="xa-presence-label">{p.label}</span>
                    </a>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {tab === "photos" && (
        <div className="xa-tab-pane">
          <div className="xa-photos-header">
            <h3 className="sg">Photos ({photoUrls.length})</h3>
          </div>
          {photoUrls.length === 0 ? (
            <div className="xa-empty">No photos yet. Click "Edit" to upload.</div>
          ) : (
            <div className="xa-photo-grid">
              {photoUrls.map((u, i) => (
                <div key={i} className="xa-photo-thumb" onClick={() => setLb(i)}>
                  <img src={u} alt="" />
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {tab === "bookings" && <BookingsList venueId={venue.id} />}

      {lb !== null && photoUrls[lb] && (
        <div className="xa-lightbox" onClick={() => setLb(null)}>
          <button className="xa-lb-close" onClick={() => setLb(null)}><i className="ti ti-x" /></button>
          <button className="xa-lb-arrow xa-lb-prev" onClick={e => { e.stopPropagation(); setLb((lb - 1 + photoUrls.length) % photoUrls.length); }}><i className="ti ti-chevron-left" /></button>
          <img src={photoUrls[lb]} alt="" onClick={e => e.stopPropagation()} />
          <button className="xa-lb-arrow xa-lb-next" onClick={e => { e.stopPropagation(); setLb((lb + 1) % photoUrls.length); }}><i className="ti ti-chevron-right" /></button>
        </div>
      )}
    </div>
  );
}

export function VenuesModule({ onExit }: { onExit: () => void }) {
  const { data: venues = [], isLoading } = useXitoVenues();
  const { data: types = [] } = useXitoVenueTypes();
  const [search, setSearch] = useState("");
  const [selType, setSelType] = useState<string | null>(null);
  const [view, setView] = useState<"card" | "table">("card");
  const [openSettings, setOpenSettings] = useState(false);
  const [drawer, setDrawer] = useState<{ open: boolean; initial: Partial<Venue> | null }>({ open: false, initial: null });
  const [profileId, setProfileId] = useState<string | null>(null);

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return venues.filter(v =>
      (!selType || v.venue_type === selType) &&
      (!q || v.venue_name.toLowerCase().includes(q) || (v.city || "").toLowerCase().includes(q) || (v.area || "").toLowerCase().includes(q))
    );
  }, [venues, search, selType]);

  const counts = useMemo(() => {
    const c: Record<string, number> = {};
    venues.forEach(v => { c[v.venue_type] = (c[v.venue_type] || 0) + 1; });
    return c;
  }, [venues]);

  const activeVenue = venues.find(v => v.id === profileId) || null;

  if (activeVenue) {
    return (
      <>
        <VenueProfile venue={activeVenue} onBack={() => setProfileId(null)} onEdit={() => setDrawer({ open: true, initial: activeVenue })} />
        <VenueDrawer open={drawer.open} initial={drawer.initial} onClose={() => setDrawer({ open: false, initial: null })} />
      </>
    );
  }

  const sidebar = (
    <>
      <button className={`xa-type-btn ${selType === null ? "active" : ""}`} onClick={() => setSelType(null)}>
        <span className="lbl">
          <span className="xa-type-ic" style={{ background: "#ede9fe", color: "#7c3aed" }} dangerouslySetInnerHTML={{ __html: TYPESVG.all }} />
          <span className="xa-type-name">All Venues</span>
        </span>
        <span className="xa-cnt">{venues.length}</span>
      </button>
      <div className="xa-sdiv" />
      {types.map(t => {
        const c = typeConf(t.name);
        return (
          <button key={t.name} className={`xa-type-btn ${selType === t.name ? "active" : ""}`} onClick={() => setSelType(t.name)}>
            <span className="lbl">
              <span className="xa-type-ic" style={{ background: c.bg, color: c.col }} dangerouslySetInnerHTML={{ __html: typeSvg(t.name) }} />
              <span className="xa-type-name">{t.name}</span>
            </span>
            <span className="xa-cnt">{counts[t.name] || 0}</span>
          </button>
        );
      })}
    </>
  );

  const toolbar = (
    <div className="xa-toolbar">
      <div className="xa-sw">
        <i className="ti ti-search" />
        <input type="text" placeholder="Search venues…" value={search} onChange={e => setSearch(e.target.value)} />
      </div>
      <div className="xa-vbtns">
        <button className={`xa-vbtn ${view === "card" ? "active" : ""}`} onClick={() => setView("card")} title="Cards"><i className="ti ti-layout-grid" /></button>
        <button className={`xa-vbtn ${view === "table" ? "active" : ""}`} onClick={() => setView("table")} title="Table"><i className="ti ti-table" /></button>
      </div>
      <button className="xa-add-btn" onClick={() => setDrawer({ open: true, initial: null })}>
        <i className="ti ti-plus" /> Add Venue
      </button>
    </div>
  );

  return (
    <>
      <AdminShell
        brand={{ title: "XITO VENUES", sub: "Venue Directory" }}
        sidebar={sidebar}
        toolbar={toolbar}
        onBack={onExit}
        topbarExtras={
          <button className="xa-icon-btn" onClick={() => setOpenSettings(true)} title="Manage venue types">
            <i className="ti ti-settings" />
          </button>
        }
      >
        {isLoading ? <p style={{ color: "var(--xa-muted)" }}>Loading…</p>
          : !filtered.length ? <div className="xa-empty">No venues match the current filters.</div>
          : view === "card" ? (
            <div className="xa-cards-grid">
              {filtered.map(v => <VenueCard key={v.id} v={v} onOpen={() => setProfileId(v.id)} />)}
            </div>
          ) : <VenueTable list={filtered} onOpen={v => setProfileId(v.id)} />
        }
      </AdminShell>
      <VenueDrawer open={drawer.open} initial={drawer.initial} onClose={() => setDrawer({ open: false, initial: null })} />
      {openSettings && <TypeSettingsModal onClose={() => setOpenSettings(false)} />}
    </>
  );
}
