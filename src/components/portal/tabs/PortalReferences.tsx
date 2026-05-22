import { useMemo, useState } from 'react';
import { toast } from 'sonner';
import { portalApi, type PortalContext } from '@/lib/portalClient';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

interface Props { data: any; ctx: PortalContext; onChange: () => void; }

const PLATS = [
  { id: 'instagram', label: 'Instagram', icon: '📷' },
  { id: 'youtube', label: 'YouTube', icon: '▶️' },
  { id: 'pinterest', label: 'Pinterest', icon: '📌' },
  { id: 'tiktok', label: 'TikTok', icon: '🎵' },
  { id: 'website', label: 'Website', icon: '🌐' },
  { id: 'other', label: 'Other', icon: '🔗' },
];

export default function PortalReferences({ data, ctx, onChange }: Props) {
  const refs: any[] = data.references || [];
  const events: any[] = data.events || [];

  const tabs = useMemo(() => [{ key: '', label: 'General' }, ...events.map((e) => ({ key: e.event_name, label: e.event_name }))], [events]);

  const [activeEv, setActiveEv] = useState('');
  const [showLinkForm, setShowLinkForm] = useState(false);
  const [showDemandForm, setShowDemandForm] = useState(false);
  const [linkUrl, setLinkUrl] = useState('');
  const [linkTitle, setLinkTitle] = useState('');
  const [selPlat, setSelPlat] = useState('instagram');
  const [demandText, setDemandText] = useState('');

  // Edit state — one item at a time.
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editText, setEditText] = useState('');
  const [editUrl, setEditUrl] = useState('');
  const [editTitle, setEditTitle] = useState('');
  const [editPlat, setEditPlat] = useState('instagram');

  // Delete confirm state.
  const [confirm, setConfirm] = useState<{ id: string; label: string } | null>(null);

  const filtered = refs.filter((r) => (r.event_name || '') === activeEv);
  const links = filtered.filter((r) => r.entry_type === 'link');
  const demands = filtered.filter((r) => r.entry_type === 'note' || r.entry_type === 'demand');

  const saveLink = async () => {
    if (!linkUrl.trim()) return toast.error('Please enter a URL');
    try {
      await portalApi.addReference(ctx, {
        entry_type: 'link', platform: selPlat,
        link_url: linkUrl.trim(), link_title: linkTitle.trim() || linkUrl.trim(),
        event_name: activeEv || null,
      });
      setLinkUrl(''); setLinkTitle(''); setShowLinkForm(false);
      toast.success('Reference added!');
      onChange();
    } catch (e: any) { toast.error(e.message); }
  };

  const saveDemand = async () => {
    if (!demandText.trim()) return toast.error('Please write something');
    try {
      await portalApi.addReference(ctx, {
        entry_type: 'note',
        description: demandText.trim(),
        event_name: activeEv || null,
      });
      setDemandText(''); setShowDemandForm(false);
      toast.success('Note added!');
      onChange();
    } catch (e: any) { toast.error(e.message); }
  };

  const beginEditNote = (r: any) => {
    setEditingId(r.id);
    setEditText(r.description || '');
  };
  const beginEditLink = (r: any) => {
    setEditingId(r.id);
    setEditUrl(r.link_url || '');
    setEditTitle(r.link_title || '');
    setEditPlat(r.platform || 'instagram');
  };
  const cancelEdit = () => { setEditingId(null); setEditText(''); setEditUrl(''); setEditTitle(''); };

  const saveEditNote = async (oldId: string, eventName: string | null) => {
    const text = editText.trim();
    if (!text) return toast.error('Please write something');
    try {
      await portalApi.addReference(ctx, {
        entry_type: 'note', description: text, event_name: eventName || null,
      });
      await portalApi.deleteReference(ctx, oldId);
      cancelEdit();
      toast.success('Saved');
      onChange();
    } catch (e: any) { toast.error(e.message); }
  };

  const saveEditLink = async (oldId: string, eventName: string | null) => {
    const url = editUrl.trim();
    if (!url) return toast.error('Please enter a URL');
    try {
      await portalApi.addReference(ctx, {
        entry_type: 'link', platform: editPlat,
        link_url: url, link_title: editTitle.trim() || url,
        event_name: eventName || null,
      });
      await portalApi.deleteReference(ctx, oldId);
      cancelEdit();
      toast.success('Saved');
      onChange();
    } catch (e: any) { toast.error(e.message); }
  };

  const doDelete = async () => {
    if (!confirm) return;
    try {
      await portalApi.deleteReference(ctx, confirm.id);
      setConfirm(null);
      toast.success('Deleted');
      onChange();
    } catch (e: any) { toast.error(e.message); }
  };

  const actionBtn: React.CSSProperties = {
    border: '1px solid var(--cp-border)', background: '#fff',
    borderRadius: 6, padding: '4px 8px', fontSize: 11, cursor: 'pointer',
    color: '#475569', flexShrink: 0,
  };
  const dangerBtn: React.CSSProperties = {
    ...actionBtn, color: '#dc2626', borderColor: '#fecaca',
  };

  return (
    <>
      <div className="cp-rh">
        <div className="cp-brand-tag">✨ Your Vision</div>
        <h2>My References &amp; Ideas</h2>
        <p>Share your inspiration so our crew can capture it perfectly</p>
      </div>
      <div className="cp-retabs">
        {tabs.map((t) => (
          <button
            key={t.key || 'general'}
            className={`cp-rpill ${t.key === activeEv ? 'active' : ''}`}
            onClick={() => setActiveEv(t.key)}
          >{t.label}</button>
        ))}
      </div>
      <div style={{ padding: '0 16px', marginBottom: 16 }}>
        <div style={{ fontSize: 10, color: 'var(--cp-text-3)' }}>
          {activeEv ? `Specific to "${activeEv}"` : 'These apply to your entire wedding'}
        </div>
      </div>

      <div className="cp-rsec">
        <div className="cp-rsh">
          <div className="cp-rst">Reference Links</div>
          <button className="cp-alb" onClick={() => { setShowLinkForm(!showLinkForm); setShowDemandForm(false); }}>+ Add Link</button>
        </div>
        {showLinkForm && (
          <div className="cp-af">
            <div className="cp-pbtns">
              {PLATS.map((p) => (
                <button
                  key={p.id}
                  className={`cp-pb ${p.id === selPlat ? 'active' : ''}`}
                  onClick={() => setSelPlat(p.id)}
                >{p.icon} {p.label}</button>
              ))}
            </div>
            <input type="url" value={linkUrl} onChange={(e) => setLinkUrl(e.target.value)} placeholder="Paste link here…" />
            <input type="text" value={linkTitle} onChange={(e) => setLinkTitle(e.target.value)} placeholder="Title (optional)" />
            <div className="cp-fa">
              <button onClick={() => setShowLinkForm(false)}>Cancel</button>
              <button className="sv" onClick={saveLink}>Save</button>
            </div>
          </div>
        )}
        {links.length === 0 ? (
          <div className="cp-es"><div className="ic">🔗</div><p>No reference links yet</p></div>
        ) : links.map((r) => {
          const p = PLATS.find((x) => x.id === r.platform) || PLATS[5];
          const isEditing = editingId === r.id;
          if (isEditing) {
            return (
              <div className="cp-af" key={r.id} style={{ marginBottom: 10 }}>
                <div className="cp-pbtns">
                  {PLATS.map((pp) => (
                    <button
                      key={pp.id}
                      className={`cp-pb ${pp.id === editPlat ? 'active' : ''}`}
                      onClick={() => setEditPlat(pp.id)}
                    >{pp.icon} {pp.label}</button>
                  ))}
                </div>
                <input type="url" value={editUrl} onChange={(e) => setEditUrl(e.target.value)} placeholder="Paste link here…" />
                <input type="text" value={editTitle} onChange={(e) => setEditTitle(e.target.value)} placeholder="Title (optional)" />
                <div className="cp-fa">
                  <button onClick={cancelEdit}>Cancel</button>
                  <button className="sv" onClick={() => saveEditLink(r.id, r.event_name)}>Save</button>
                </div>
              </div>
            );
          }
          return (
            <div className="cp-rcard" key={r.id}>
              <span className="cp-rpi">{p.icon}</span>
              <div className="cp-rcb">
                <div className="cp-rct">{r.link_title || r.link_url}</div>
                {r.link_title && <div className="cp-rcu">{r.link_url}</div>}
              </div>
              <a href={r.link_url?.startsWith('http') ? r.link_url : `https://${r.link_url}`} target="_blank" rel="noreferrer" style={{ fontSize: 14, textDecoration: 'none', padding: 4 }}>↗</a>
              <button onClick={() => beginEditLink(r)} style={actionBtn}>✎ Edit</button>
              <button onClick={() => setConfirm({ id: r.id, label: r.link_title || r.link_url })} style={dangerBtn}>🗑</button>
            </div>
          );
        })}
      </div>

      <div className="cp-rsec">
        <div className="cp-rsh">
          <div className="cp-rst">My Demands &amp; Notes</div>
          <button className="cp-alb" onClick={() => { setShowDemandForm(!showDemandForm); setShowLinkForm(false); }}>+ Add Note</button>
        </div>
        {showDemandForm && (
          <div className="cp-af">
            <textarea
              rows={4}
              value={demandText}
              onChange={(e) => setDemandText(e.target.value)}
              placeholder="Describe your ideas, demands, or special requests..."
            />
            <div className="cp-fa">
              <button onClick={() => setShowDemandForm(false)}>Cancel</button>
              <button className="sv" onClick={saveDemand}>Save</button>
            </div>
          </div>
        )}
        {demands.length === 0 ? (
          <div className="cp-es"><div className="ic">💬</div><p>No demands or notes yet</p></div>
        ) : demands.map((r) => {
          const isEditing = editingId === r.id;
          if (isEditing) {
            return (
              <div className="cp-af" key={r.id} style={{ marginBottom: 10 }}>
                <textarea
                  rows={4}
                  value={editText}
                  onChange={(e) => setEditText(e.target.value)}
                />
                <div className="cp-fa">
                  <button onClick={cancelEdit}>Cancel</button>
                  <button className="sv" onClick={() => saveEditNote(r.id, r.event_name)}>Save</button>
                </div>
              </div>
            );
          }
          return (
            <div className="cp-dcard" key={r.id}>
              <span style={{ fontSize: 16 }}>💬</span>
              <p style={{ flex: 1 }}>{r.description}</p>
              <button onClick={() => beginEditNote(r)} style={actionBtn}>✎ Edit</button>
              <button onClick={() => setConfirm({ id: r.id, label: (r.description || '').slice(0, 60) })} style={dangerBtn}>🗑</button>
            </div>
          );
        })}
      </div>

      <AlertDialog open={!!confirm} onOpenChange={(v) => !v && setConfirm(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this entry?</AlertDialogTitle>
            <AlertDialogDescription>
              {confirm?.label ? `"${confirm.label}"` : 'This entry'} will be permanently removed. This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={doDelete} className="bg-red-600 hover:bg-red-700">Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
