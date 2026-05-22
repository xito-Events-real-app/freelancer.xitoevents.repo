import { useState, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Star, Search, Trash2, Image as ImageIcon, X, Upload } from "lucide-react";
import { toast } from "sonner";
import {
  useXitoVenues, useUpsertVenue, useSoftDeleteVenue,
  useVenuePhotos, useDeleteVenuePhoto, type Venue,
} from "@/hooks/useXitoVenues";
import { useXitoVenueTypes } from "@/hooks/useXitoVenueTypes";
import { uploadVenueImage, uploadVenuePhotoWithRollback } from "@/lib/venueMediaUpload";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";

const blank = (): Partial<Venue> => ({
  id: crypto.randomUUID(),
  venue_name: "", venue_type: "HOTEL", city: "", area: "", location_briefing: "",
  rating: 0, company_whatsapp: "", company_phone: "", gmail: "",
  owner1_name: "", owner1_contact: "", owner1_whatsapp: "",
  owner2_name: "", owner2_contact: "", owner2_whatsapp: "",
  google_map: "", website: "", instagram: "", facebook: "", tiktok: "", youtube: "",
  cover_r2_key: "", cover_url: "", avatar_r2_key: "", avatar_url: "",
});

function StarRating({ value, onChange }: { value: number; onChange: (v: number) => void }) {
  return (
    <div className="flex gap-1">
      {[1, 2, 3, 4, 5].map((n) => (
        <button key={n} type="button" onClick={() => onChange(n === value ? 0 : n)}>
          <Star className={`w-5 h-5 ${n <= value ? "fill-yellow-400 text-yellow-400" : "text-muted-foreground"}`} />
        </button>
      ))}
      <span className="text-sm text-muted-foreground ml-1">{value} / 5</span>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1">
      <Label className="text-xs">{label}</Label>
      {children}
    </div>
  );
}

function normalizeUrl(v: string): string {
  const t = v.trim();
  if (!t) return "";
  if (/^https:\/\//i.test(t)) return t;
  if (/^http:\/\//i.test(t)) return "https://" + t.slice(7);
  return "https://" + t;
}

export default function XitoVenuesPanel() {
  const { data: venues = [], isLoading } = useXitoVenues();
  const { data: types = [] } = useXitoVenueTypes();
  const upsert = useUpsertVenue();
  const softDelete = useSoftDeleteVenue();
  const qc = useQueryClient();

  const [search, setSearch] = useState("");
  const [editing, setEditing] = useState<Partial<Venue> | null>(null);
  const [isNew, setIsNew] = useState(false);

  const filtered = useMemo(() => {
    const s = search.toLowerCase();
    return venues.filter(v =>
      v.venue_name.toLowerCase().includes(s) ||
      v.city.toLowerCase().includes(s) ||
      v.venue_type.toLowerCase().includes(s)
    );
  }, [venues, search]);

  const openNew = () => { setEditing(blank()); setIsNew(true); };
  const openEdit = (v: Venue) => { setEditing({ ...v }); setIsNew(false); };
  const close = () => { setEditing(null); setIsNew(false); };

  const photos = useVenuePhotos(editing?.id ?? null);
  const deletePhoto = useDeleteVenuePhoto();

  async function handleSave() {
    if (!editing?.venue_name?.trim()) {
      toast.error("Venue name is required");
      return;
    }
    const payload: any = {
      ...editing,
      venue_name: editing.venue_name!.trim(),
      google_map: normalizeUrl(editing.google_map || ""),
      website: normalizeUrl(editing.website || ""),
      instagram: normalizeUrl(editing.instagram || ""),
      facebook: normalizeUrl(editing.facebook || ""),
      tiktok: normalizeUrl(editing.tiktok || ""),
      youtube: normalizeUrl(editing.youtube || ""),
    };
    try {
      await upsert.mutateAsync(payload);
      toast.success(isNew ? "Venue added" : "Venue updated");
      close();
    } catch (e: any) {
      toast.error(e?.message || "Save failed");
    }
  }

  async function handleDelete() {
    if (!editing?.id) return;
    if (!confirm(`Delete "${editing.venue_name}"? This is reversible until cleanup.`)) return;
    try {
      await softDelete.mutateAsync(editing.id);
      toast.success("Venue deleted");
      close();
    } catch (e: any) {
      toast.error(e?.message || "Delete failed");
    }
  }

  async function ensureVenueRowExists() {
    // For new venues, insert minimal row first so photos can reference it
    if (!isNew || !editing?.id) return;
    const { data } = await supabase.from("xito_venues").select("id").eq("id", editing.id).maybeSingle();
    if (!data) {
      const { data: { user } } = await supabase.auth.getUser();
      await supabase.from("xito_venues").insert({
        id: editing.id,
        venue_name: editing.venue_name?.trim() || "Untitled venue",
        venue_type: editing.venue_type || "HOTEL",
        created_by: user?.id,
      });
      qc.invalidateQueries({ queryKey: ["xito-venues"] });
    }
  }

  async function handleImageUpload(kind: "cover" | "avatar", file: File) {
    if (!editing?.id) return;
    try {
      await ensureVenueRowExists();
      const { url, key } = await uploadVenueImage(editing.id, kind, file);
      // Update DB so the trigger queues the old key for cleanup
      const updates: any = kind === "cover"
        ? { cover_r2_key: key, cover_url: url }
        : { avatar_r2_key: key, avatar_url: url };
      const { error } = await supabase.from("xito_venues").update(updates).eq("id", editing.id);
      if (error) throw error;
      setEditing({ ...editing, ...updates });
      qc.invalidateQueries({ queryKey: ["xito-venues"] });
      toast.success(`${kind === "cover" ? "Cover" : "Avatar"} updated`);
    } catch (e: any) {
      toast.error(e?.message || "Upload failed");
    }
  }

  async function handlePhotoUpload(files: FileList) {
    if (!editing?.id) return;
    try {
      await ensureVenueRowExists();
      const nextPos = (photos.data?.length ?? 0);
      let i = 0;
      for (const f of Array.from(files)) {
        await uploadVenuePhotoWithRollback(editing.id, f, nextPos + i);
        i++;
      }
      qc.invalidateQueries({ queryKey: ["xito-venue-photos", editing.id] });
      toast.success(`Uploaded ${i} photo${i > 1 ? "s" : ""}`);
    } catch (e: any) {
      toast.error(e?.message || "Photo upload failed");
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-2 top-2.5 w-4 h-4 text-muted-foreground" />
          <Input className="pl-8" placeholder="Search by name, city, type…" value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <Button onClick={openNew}><Plus className="w-4 h-4 mr-1" /> Add venue</Button>
      </div>

      {isLoading ? (
        <p className="text-muted-foreground text-sm">Loading…</p>
      ) : filtered.length === 0 ? (
        <p className="text-muted-foreground text-sm">No venues yet. Click "Add venue" to create one.</p>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {filtered.map((v) => (
            <Card key={v.id} className="p-3 cursor-pointer hover:bg-accent/40" onClick={() => openEdit(v)}>
              <div className="flex gap-3 items-center">
                {v.avatar_url ? (
                  <img src={v.avatar_url} alt="" className="w-12 h-12 rounded-full object-cover" />
                ) : (
                  <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center text-sm font-bold">
                    {v.venue_name.slice(0, 2).toUpperCase()}
                  </div>
                )}
                <div className="min-w-0 flex-1">
                  <div className="font-medium truncate">{v.venue_name}</div>
                  <div className="text-xs text-muted-foreground truncate">
                    {v.venue_type} • {v.city || "—"}{v.area ? `, ${v.area}` : ""}
                  </div>
                  <div className="flex items-center gap-0.5 mt-1">
                    {[1, 2, 3, 4, 5].map((n) => (
                      <Star key={n} className={`w-3 h-3 ${n <= v.rating ? "fill-yellow-400 text-yellow-400" : "text-muted-foreground/40"}`} />
                    ))}
                  </div>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      <Sheet open={!!editing} onOpenChange={(o) => { if (!o) close(); }}>
        <SheetContent className="w-full sm:max-w-2xl overflow-y-auto">
          <SheetHeader>
            <SheetTitle>{isNew ? "Add venue" : editing?.venue_name || "Edit venue"}</SheetTitle>
          </SheetHeader>

          {editing && (
            <div className="space-y-5 mt-4 pb-32">
              {/* Cover + avatar */}
              <div className="relative h-40 rounded-lg overflow-hidden bg-muted">
                {editing.cover_url && <img src={editing.cover_url} alt="" className="w-full h-full object-cover" />}
                <label className="absolute bottom-2 right-2 bg-background/90 border rounded px-2 py-1 text-xs cursor-pointer flex items-center gap-1">
                  <Upload className="w-3 h-3" /> Cover
                  <input type="file" accept="image/*" className="hidden" onChange={(e) => e.target.files?.[0] && handleImageUpload("cover", e.target.files[0])} />
                </label>
                <label className="absolute -bottom-6 left-4 w-16 h-16 rounded-full border-4 border-background bg-muted overflow-hidden cursor-pointer flex items-center justify-center">
                  {editing.avatar_url
                    ? <img src={editing.avatar_url} alt="" className="w-full h-full object-cover" />
                    : <ImageIcon className="w-5 h-5 text-muted-foreground" />}
                  <input type="file" accept="image/*" className="hidden" onChange={(e) => e.target.files?.[0] && handleImageUpload("avatar", e.target.files[0])} />
                </label>
              </div>
              <div className="h-6" />

              {/* Core fields */}
              <div className="grid sm:grid-cols-2 gap-3">
                <Field label="Venue Name *">
                  <Input value={editing.venue_name ?? ""} onChange={(e) => setEditing({ ...editing, venue_name: e.target.value })} />
                </Field>
                <Field label="Type">
                  <Select value={editing.venue_type} onValueChange={(v) => setEditing({ ...editing, venue_type: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {types.map((t) => <SelectItem key={t.name} value={t.name}>{t.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </Field>
                <Field label="City"><Input value={editing.city ?? ""} onChange={(e) => setEditing({ ...editing, city: e.target.value })} /></Field>
                <Field label="Area"><Input value={editing.area ?? ""} onChange={(e) => setEditing({ ...editing, area: e.target.value })} /></Field>
              </div>
              <Field label="Location Briefing">
                <Textarea value={editing.location_briefing ?? ""} onChange={(e) => setEditing({ ...editing, location_briefing: e.target.value })} />
              </Field>
              <Field label="Rating">
                <StarRating value={editing.rating ?? 0} onChange={(v) => setEditing({ ...editing, rating: v })} />
              </Field>

              <h3 className="font-medium text-sm pt-2">Company Contact</h3>
              <div className="grid sm:grid-cols-2 gap-3">
                <Field label="WhatsApp"><Input value={editing.company_whatsapp ?? ""} onChange={(e) => setEditing({ ...editing, company_whatsapp: e.target.value })} /></Field>
                <Field label="Phone"><Input value={editing.company_phone ?? ""} onChange={(e) => setEditing({ ...editing, company_phone: e.target.value })} /></Field>
              </div>
              <Field label="Gmail"><Input type="email" value={editing.gmail ?? ""} onChange={(e) => setEditing({ ...editing, gmail: e.target.value })} /></Field>

              {[1, 2].map((n) => (
                <div key={n} className="space-y-3">
                  <h3 className="font-medium text-sm pt-2">Owner {n}</h3>
                  <Field label="Name">
                    <Input value={(editing as any)[`owner${n}_name`] ?? ""} onChange={(e) => setEditing({ ...editing, [`owner${n}_name`]: e.target.value } as any)} />
                  </Field>
                  <div className="grid sm:grid-cols-2 gap-3">
                    <Field label="Contact">
                      <Input value={(editing as any)[`owner${n}_contact`] ?? ""} onChange={(e) => setEditing({ ...editing, [`owner${n}_contact`]: e.target.value } as any)} />
                    </Field>
                    <Field label="WhatsApp">
                      <Input value={(editing as any)[`owner${n}_whatsapp`] ?? ""} onChange={(e) => setEditing({ ...editing, [`owner${n}_whatsapp`]: e.target.value } as any)} />
                    </Field>
                  </div>
                </div>
              ))}

              <h3 className="font-medium text-sm pt-2">Online Presence</h3>
              <div className="grid sm:grid-cols-2 gap-3">
                <Field label="Google Maps URL"><Input value={editing.google_map ?? ""} onChange={(e) => setEditing({ ...editing, google_map: e.target.value })} /></Field>
                <Field label="Website"><Input value={editing.website ?? ""} onChange={(e) => setEditing({ ...editing, website: e.target.value })} /></Field>
                <Field label="Instagram"><Input value={editing.instagram ?? ""} onChange={(e) => setEditing({ ...editing, instagram: e.target.value })} /></Field>
                <Field label="Facebook"><Input value={editing.facebook ?? ""} onChange={(e) => setEditing({ ...editing, facebook: e.target.value })} /></Field>
                <Field label="TikTok"><Input value={editing.tiktok ?? ""} onChange={(e) => setEditing({ ...editing, tiktok: e.target.value })} /></Field>
                <Field label="YouTube"><Input value={editing.youtube ?? ""} onChange={(e) => setEditing({ ...editing, youtube: e.target.value })} /></Field>
              </div>

              {/* Photos */}
              <div className="pt-2">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="font-medium text-sm">Photos ({photos.data?.length ?? 0})</h3>
                  <label className="text-xs cursor-pointer border px-2 py-1 rounded flex items-center gap-1 hover:bg-accent">
                    <Upload className="w-3 h-3" /> Add photos
                    <input type="file" accept="image/*" multiple className="hidden" onChange={(e) => e.target.files && handlePhotoUpload(e.target.files)} />
                  </label>
                </div>
                <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                  {photos.data?.map((p) => (
                    <div key={p.id} className="relative aspect-square rounded overflow-hidden bg-muted group">
                      <img src={p.public_url} alt="" className="w-full h-full object-cover" />
                      <button
                        type="button"
                        onClick={() => deletePhoto.mutate({ id: p.id, venueId: editing.id! })}
                        className="absolute top-1 right-1 bg-background/90 rounded-full p-1 opacity-0 group-hover:opacity-100"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              <div className="fixed bottom-0 right-0 w-full sm:max-w-2xl bg-background border-t p-3 flex items-center justify-between gap-2">
                {!isNew && (
                  <Button variant="destructive" size="sm" onClick={handleDelete}>
                    <Trash2 className="w-4 h-4 mr-1" /> Delete
                  </Button>
                )}
                <div className="ml-auto flex gap-2">
                  <Button variant="ghost" onClick={close}>Cancel</Button>
                  <Button onClick={handleSave} disabled={upsert.isPending}>
                    {isNew ? "Add venue" : "Save"}
                  </Button>
                </div>
              </div>
            </div>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}
