import { useState, useEffect, useRef } from "react";
import { toast } from "sonner";
import { Venue, VenuePhoto, useUpsertVenue, useSoftDeleteVenue, useVenuePhotos, useDeleteVenuePhoto } from "@/hooks/useXitoVenues";
import { useXitoVenueTypes } from "@/hooks/useXitoVenueTypes";
import { SVG, typeConf, cover, initials } from "./venueTokens";
import { uploadVenueImage, uploadVenuePhotoWithRollback } from "@/lib/venueMediaUpload";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";
import { parseGoogleMapsCoords } from "@/lib/parseGoogleMapsCoords";

const URL_FIELDS = ["google_map","website","instagram","facebook","tiktok","youtube"] as const;
function normalizeUrl(v: string) {
  const t = (v || "").trim();
  if (!t) return "";
  if (/^https:\/\//i.test(t)) return t;
  if (/^http:\/\//i.test(t)) return "https://" + t.slice(7);
  return "https://" + t;
}

interface VenueDrawerProps {
  open: boolean;
  initial: Partial<Venue> | null; // null = new
  onClose: () => void;
}

export function VenueDrawer({ open, initial, onClose }: VenueDrawerProps) {
  const { data: types = [] } = useXitoVenueTypes();
  const upsert = useUpsertVenue();
  const softDelete = useSoftDeleteVenue();
  const qc = useQueryClient();

  const [form, setForm] = useState<Partial<Venue>>({});
  const [confirmDel, setConfirmDel] = useState(false);
  const idRef = useRef<string>("");

  const isNew = !initial?.id;
  const photos = useVenuePhotos(form.id ?? null);
  const deletePhoto = useDeleteVenuePhoto();

  useEffect(() => {
    if (!open) return;
    if (initial) {
      setForm({ ...initial });
      idRef.current = (initial.id as string) || "";
    } else {
      const newId = crypto.randomUUID();
      idRef.current = newId;
      setForm({
        id: newId, venue_name: "", venue_type: "HOTEL", city: "", area: "", location_briefing: "",
        rating: 0, company_whatsapp: "", company_phone: "", gmail: "",
        owner1_name: "", owner1_contact: "", owner1_whatsapp: "",
        owner2_name: "", owner2_contact: "", owner2_whatsapp: "",
        google_map: "", website: "", instagram: "", facebook: "", tiktok: "", youtube: "",
        cover_url: "", cover_r2_key: "", avatar_url: "", avatar_r2_key: "",
      });
    }
  }, [open, initial]);

  if (!open) return null;

  const set = (patch: Partial<Venue>) => setForm(f => ({ ...f, ...patch }));

  async function ensureRow() {
    if (!form.id) return;
    const { data } = await supabase.from("xito_venues").select("id").eq("id", form.id).maybeSingle();
    if (!data) {
      const { data: { user } } = await supabase.auth.getUser();
      const { error } = await supabase.from("xito_venues").insert({
        id: form.id,
        venue_name: (form.venue_name || "Untitled venue").trim(),
        venue_type: form.venue_type || "HOTEL",
        created_by: user?.id,
      });
      if (error) throw error;
      qc.invalidateQueries({ queryKey: ["xito-venues"] });
    }
  }

  async function handleImage(kind: "cover" | "avatar", file: File) {
    try {
      await ensureRow();
      const { url, key } = await uploadVenueImage(form.id!, kind, file);
      const patch: any = kind === "cover" ? { cover_url: url, cover_r2_key: key } : { avatar_url: url, avatar_r2_key: key };
      const { error } = await supabase.from("xito_venues").update(patch).eq("id", form.id!);
      if (error) throw error;
      set(patch);
      qc.invalidateQueries({ queryKey: ["xito-venues"] });
      toast.success(`${kind === "cover" ? "Cover" : "Avatar"} updated`);
    } catch (e: any) { toast.error(e?.message || "Upload failed"); }
  }

  async function handlePhotos(files: FileList) {
    try {
      await ensureRow();
      const startPos = photos.data?.length ?? 0;
      let i = 0;
      for (const f of Array.from(files)) {
        await uploadVenuePhotoWithRollback(form.id!, f, startPos + i);
        i++;
      }
      qc.invalidateQueries({ queryKey: ["xito-venue-photos", form.id] });
      toast.success(`Uploaded ${i} photo${i > 1 ? "s" : ""}`);
    } catch (e: any) { toast.error(e?.message || "Photo upload failed"); }
  }

  async function save() {
    if (!form.venue_name?.trim()) { toast.error("Venue name is required"); return; }
    const payload: any = { ...form, venue_name: form.venue_name!.trim() };
    for (const k of URL_FIELDS) payload[k] = normalizeUrl((form as any)[k] || "");

    // Auto-parse coordinates from google_map URL if lat/lng empty
    if ((payload.lat == null || payload.lng == null) && payload.google_map) {
      const c = parseGoogleMapsCoords(payload.google_map);
      if (c) { payload.lat = c.lat; payload.lng = c.lng; }
    }
    if (payload.lat === "" || payload.lat === undefined) payload.lat = null;
    if (payload.lng === "" || payload.lng === undefined) payload.lng = null;

    try {
      await upsert.mutateAsync(payload);
      toast.success(isNew ? "Venue added" : "Venue updated");
      onClose();
    } catch (e: any) { toast.error(e?.message || "Save failed"); }
  }

  async function doDelete() {
    if (!form.id) return;
    try {
      await softDelete.mutateAsync(form.id);
      toast.success("Venue deleted");
      setConfirmDel(false);
      onClose();
    } catch (e: any) { toast.error(e?.message || "Delete failed"); }
  }

  return (
    <div className="xa-drw-overlay xito-admin" onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="xa-drw" onClick={(e) => e.stopPropagation()}>
        <div className="xa-drw-head">
          <div>
            <h2><span className="xa-drw-icon" dangerouslySetInnerHTML={{ __html: SVG.building }} /> {isNew ? "Add Venue" : form.venue_name}</h2>
            <p className="xa-drw-sub">Fill in the details below. All data saved to XITO GLOBAL.</p>
          </div>
          <button className="xa-drw-close" onClick={onClose}><i className="ti ti-x" /></button>
        </div>

        <div className="xa-drw-body">
          {/* Media row */}
          <div className="xa-drw-media">
            <label className="xa-drw-avatar-mini">
              {form.avatar_url ? <img src={form.avatar_url} alt="" /> : (
                <div style={{ width: "100%", height: "100%", background: cover(form.venue_type || "HOTEL"), display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontFamily: "Space Grotesk", fontSize: 24, fontWeight: 700 }}>
                  {initials(form.venue_name || "?")}
                </div>
              )}
              <div className="xa-upload-overlay"><i className="ti ti-camera" /></div>
              <input type="file" accept="image/*" hidden onChange={e => e.target.files?.[0] && handleImage("avatar", e.target.files[0])} />
            </label>
            <label className="xa-drw-cover-mini" style={{ cursor: "pointer", background: !form.cover_url ? cover(form.venue_type || "HOTEL") : undefined }}>
              {form.cover_url && <img src={form.cover_url} alt="" />}
              <div className="xa-upload-overlay"><i className="ti ti-camera" /> Cover</div>
              <input type="file" accept="image/*" hidden onChange={e => e.target.files?.[0] && handleImage("cover", e.target.files[0])} />
            </label>
          </div>

          <div className="xa-form-cols">
            {/* LEFT */}
            <div className="xa-form-col">
              <div className="xa-sec-title">Basics</div>
              <div className="xa-field">
                <label>Venue Type *</label>
                <select value={form.venue_type || "HOTEL"} onChange={e => set({ venue_type: e.target.value })}>
                  {types.map(t => <option key={t.name} value={t.name}>{t.name}</option>)}
                </select>
              </div>
              <div className="xa-field"><label>Venue Name *</label>
                <input type="text" placeholder="e.g. Hyatt Regency" value={form.venue_name || ""} onChange={e => set({ venue_name: e.target.value })} />
              </div>
              <div className="xa-g2">
                <div className="xa-field"><label>City</label>
                  <input type="text" placeholder="Kathmandu" value={form.city || ""} onChange={e => set({ city: e.target.value })} />
                </div>
                <div className="xa-field"><label>Area</label>
                  <input type="text" placeholder="e.g. Boudha" value={form.area || ""} onChange={e => set({ area: e.target.value })} />
                </div>
              </div>
              <div className="xa-field"><label>Location Briefing</label>
                <textarea placeholder="Access notes, parking, landmarks…" value={form.location_briefing || ""} onChange={e => set({ location_briefing: e.target.value })} />
              </div>
              <div className="xa-sec-title">Rating</div>
              <div className="xa-rating-row">
                {[1,2,3,4,5].map(n => (
                  <button key={n} type="button" className={n <= (form.rating || 0) ? "on" : ""} onClick={() => set({ rating: n === form.rating ? 0 : n })}>
                    {n <= (form.rating || 0) ? "★" : "☆"}
                  </button>
                ))}
                <span style={{ fontSize: 13, color: "var(--xa-muted)", marginLeft: 6 }}>{form.rating || 0} / 5</span>
              </div>
            </div>
            {/* RIGHT */}
            <div className="xa-form-col">
              <div className="xa-sec-title">Company Contact</div>
              <div className="xa-g2">
                <div className="xa-field"><label>WhatsApp</label>
                  <input type="text" placeholder="98XXXXXXXX" value={form.company_whatsapp || ""} onChange={e => set({ company_whatsapp: e.target.value })} />
                </div>
                <div className="xa-field"><label>Phone</label>
                  <input type="text" placeholder="98XXXXXXXX" value={form.company_phone || ""} onChange={e => set({ company_phone: e.target.value })} />
                </div>
              </div>
              <div className="xa-field"><label>Gmail</label>
                <input type="email" placeholder="venue@gmail.com" value={form.gmail || ""} onChange={e => set({ gmail: e.target.value })} />
              </div>
              {[1, 2].map(n => (
                <div key={n}>
                  <div className="xa-sec-title">Owner {n}</div>
                  <div className="xa-field"><label>Name</label>
                    <input type="text" placeholder="Full name" value={(form as any)[`owner${n}_name`] || ""} onChange={e => set({ [`owner${n}_name`]: e.target.value } as any)} />
                  </div>
                  <div className="xa-g2">
                    <div className="xa-field"><label>Contact</label>
                      <input type="text" placeholder="98XXXXXXXX" value={(form as any)[`owner${n}_contact`] || ""} onChange={e => set({ [`owner${n}_contact`]: e.target.value } as any)} />
                    </div>
                    <div className="xa-field"><label>WhatsApp</label>
                      <input type="text" placeholder="98XXXXXXXX" value={(form as any)[`owner${n}_whatsapp`] || ""} onChange={e => set({ [`owner${n}_whatsapp`]: e.target.value } as any)} />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="xa-form-full">
            <div className="xa-sec-title">Online Presence</div>
            <div className="xa-g2" style={{ marginBottom: 10 }}>
              <div className="xa-field"><label>Google Maps URL</label>
                <input type="text" placeholder="https://maps.google.com/…" value={form.google_map || ""} onChange={e => set({ google_map: e.target.value })} />
              </div>
              <div className="xa-field"><label>Website</label>
                <input type="text" placeholder="https://…" value={form.website || ""} onChange={e => set({ website: e.target.value })} />
              </div>
            </div>
            <div className="xa-g2" style={{ marginBottom: 10 }}>
              <div className="xa-field">
                <label>Latitude</label>
                <input type="number" step="any" placeholder="auto-parsed from map URL" value={form.lat ?? ""} onChange={e => set({ lat: e.target.value === "" ? null : Number(e.target.value) } as any)} />
              </div>
              <div className="xa-field">
                <label>Longitude</label>
                <input type="number" step="any" placeholder="auto-parsed from map URL" value={form.lng ?? ""} onChange={e => set({ lng: e.target.value === "" ? null : Number(e.target.value) } as any)} />
              </div>
            </div>
            <div style={{ fontSize: 11, color: "var(--xa-muted)", marginTop: -4, marginBottom: 8 }}>
              Coordinates are parsed automatically from the map URL on save. Short links (maps.app.goo.gl) can't be read — paste lat/lng manually if the mini-map stays empty.
            </div>
            <div className="xa-g3">
              <div className="xa-field"><label>Instagram</label><input type="text" placeholder="https://instagram.com/…" value={form.instagram || ""} onChange={e => set({ instagram: e.target.value })} /></div>
              <div className="xa-field"><label>Facebook</label><input type="text" placeholder="https://facebook.com/…" value={form.facebook || ""} onChange={e => set({ facebook: e.target.value })} /></div>
              <div className="xa-field"><label>TikTok</label><input type="text" placeholder="https://tiktok.com/…" value={form.tiktok || ""} onChange={e => set({ tiktok: e.target.value })} /></div>
              <div className="xa-field"><label>YouTube</label><input type="text" placeholder="https://youtube.com/…" value={form.youtube || ""} onChange={e => set({ youtube: e.target.value })} /></div>
            </div>
          </div>

          {/* Photos */}
          <div style={{ marginTop: 20 }}>
            <div className="xa-photos-header">
              <h3 className="sg">Photos ({photos.data?.length ?? 0})</h3>
              <label className="xa-up-btn" style={{ cursor: "pointer" }}>
                <i className="ti ti-upload" /> Upload
                <input type="file" accept="image/*" multiple hidden onChange={e => e.target.files && handlePhotos(e.target.files)} />
              </label>
            </div>
            <div className="xa-photo-grid">
              {(photos.data || []).map((p: VenuePhoto) => (
                <div key={p.id} className="xa-photo-thumb">
                  <img src={p.public_url} alt="" />
                  <button className="xa-photo-del" onClick={() => deletePhoto.mutate({ id: p.id, venueId: form.id! })}><i className="ti ti-x" /></button>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="xa-drw-foot">
          <div>
            {!isNew && <button className="xa-btn-del" onClick={() => setConfirmDel(true)}><i className="ti ti-trash" /> Delete Venue</button>}
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <button className="xa-btn-cancel" onClick={onClose}>Cancel</button>
            <button className="xa-btn-save" onClick={save} disabled={upsert.isPending}>
              <i className="ti ti-check" /> {isNew ? "Add Venue" : "Save"}
            </button>
          </div>
        </div>
      </div>

      {confirmDel && (
        <div className="xa-conf-overlay">
          <div className="xa-conf-box">
            <h3 className="sg">Delete this venue?</h3>
            <p>This removes the venue from XITO GLOBAL. Existing client event records referencing this venue name are not affected.</p>
            <div className="xa-conf-btns">
              <button className="xa-btn-cancel" onClick={() => setConfirmDel(false)}>Cancel</button>
              <button className="xa-pact danger" onClick={doDelete}>Delete</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
