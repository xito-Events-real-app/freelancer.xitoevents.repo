import { useState } from "react";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useXitoVenueTypes } from "@/hooks/useXitoVenueTypes";

export function TypeSettingsModal({ onClose }: { onClose: () => void }) {
  const { data: types = [] } = useXitoVenueTypes();
  const qc = useQueryClient();
  const [edits, setEdits] = useState<Record<string, string>>({});
  const [newType, setNewType] = useState("");

  function setName(orig: string, v: string) {
    setEdits(e => ({ ...e, [orig]: v.toUpperCase() }));
  }

  async function rename(orig: string) {
    const newName = (edits[orig] || "").trim();
    if (!newName || newName === orig) return;
    const { error } = await supabase.from("xito_venue_types").update({ name: newName }).eq("name", orig);
    if (error) { toast.error(error.message); return; }
    toast.success("Renamed");
    setEdits(e => { const { [orig]: _, ...rest } = e; return rest; });
    qc.invalidateQueries({ queryKey: ["xito-venue-types"] });
    qc.invalidateQueries({ queryKey: ["xito-venues"] });
  }

  async function remove(name: string) {
    if (!confirm(`Delete venue type "${name}"? This will fail if any venue still uses it.`)) return;
    const { error } = await supabase.from("xito_venue_types").delete().eq("name", name);
    if (error) { toast.error(error.message); return; }
    toast.success("Deleted");
    qc.invalidateQueries({ queryKey: ["xito-venue-types"] });
  }

  async function add() {
    const v = newType.trim().toUpperCase();
    if (!v) return;
    const nextPos = (types[types.length - 1]?.position ?? 0) + 1;
    const { error } = await supabase.from("xito_venue_types").insert({ name: v, position: nextPos });
    if (error) { toast.error(error.message); return; }
    setNewType("");
    qc.invalidateQueries({ queryKey: ["xito-venue-types"] });
    toast.success("Added");
  }

  return (
    <div className="xa-m-overlay xito-admin" onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="xa-modal">
        <div className="xa-modal-head">
          <h2><i className="ti ti-settings" style={{ color: "var(--xa-v2)" }} /> Venue Type Settings</h2>
          <button className="xa-drw-close" onClick={onClose}><i className="ti ti-x" /></button>
        </div>
        <div className="xa-modal-body">
          <p style={{ fontSize: 12, color: "var(--xa-muted)", marginBottom: 14 }}>
            Add, rename, or remove venue types. Renaming updates all existing venues automatically.
          </p>
          {types.map(t => (
            <div key={t.name} className="xa-type-row">
              <input
                value={edits[t.name] ?? t.name}
                onChange={e => setName(t.name, e.target.value)}
                onBlur={() => edits[t.name] && rename(t.name)}
                onKeyDown={(e) => { if (e.key === "Enter") (e.target as HTMLInputElement).blur(); }}
              />
              <button onClick={() => remove(t.name)} title="Delete"><i className="ti ti-trash" /></button>
            </div>
          ))}
          <div className="xa-add-type-row">
            <input placeholder="New type name (e.g. CONVENTION HALL)…" value={newType}
              onChange={e => setNewType(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") add(); }} />
            <button className="xa-add-type-btn" onClick={add}><i className="ti ti-plus" /> Add</button>
          </div>
        </div>
      </div>
    </div>
  );
}
