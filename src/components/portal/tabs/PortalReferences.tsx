import { useMemo, useRef, useState } from 'react';
import { toast } from 'sonner';
import {
  portalApi,
  uploadPortalPhoto,
  deletePortalReference,
  type PortalContext,
} from '@/lib/portalClient';
import { compressImage } from '@/lib/imageCompressor';
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

const PLATS: Record<string, { label: string; icon: string }> = {
  instagram: { label: 'Instagram', icon: '📷' },
  youtube: { label: 'YouTube', icon: '▶️' },
  pinterest: { label: 'Pinterest', icon: '📌' },
  tiktok: { label: 'TikTok', icon: '🎵' },
  website: { label: 'Website', icon: '🌐' },
  other: { label: 'Link', icon: '🔗' },
};

function detectPlatform(url: string): string {
  const u = url.toLowerCase();
  if (u.includes('instagram.')) return 'instagram';
  if (u.includes('youtube.') || u.includes('youtu.be')) return 'youtube';
  if (u.includes('pinterest.')) return 'pinterest';
  if (u.includes('tiktok.')) return 'tiktok';
  if (/^(https?:\/\/)?[^\s/]+\.[^\s]+/.test(u)) return 'website';
  return 'other';
}

export default function PortalReferences({ data, ctx, onChange }: Props) {
  const refs: any[] = data.references || [];
  const events: any[] = data.events || [];

  const tabs = useMemo(
    () => [{ key: '', label: 'General' }, ...events.map((e) => ({ key: e.event_name, label: e.event_name }))],
    [events],
  );

  const [activeEv, setActiveEv] = useState('');
  const [showLinkForm, setShowLinkForm] = useState(false);
  const [showDemandForm, setShowDemandForm] = useState(false);
  const [linkUrl, setLinkUrl] = useState('');
  const [demandText, setDemandText] = useState('');

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editText, setEditText] = useState('');
  const [editUrl, setEditUrl] = useState('');

  const [confirm, setConfirm] = useState<{ id: string; label: string; hasPhoto?: boolean } | null>(null);
  const [lightbox, setLightbox] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<{ done: number; total: number }>({ done: 0, total: 0 });
  const fileRef = useRef<HTMLInputElement | null>(null);

  const filtered = refs.filter((r) => (r.event_name || '') === activeEv);
  const photos = filtered.filter((r) => r.entry_type === 'photo' && r.image_url);
  const links = filtered.filter((r) => r.entry_type === 'link');
  const demands = filtered.filter((r) => r.entry_type === 'note' || r.entry_type === 'demand');

  const saveLink = async () => {
    const url = linkUrl.trim();
    if (!url) return toast.error('Please enter a URL');
    try {
      await portalApi.addReference(ctx, {
        entry_type: 'link',
        platform: detectPlatform(url),
        link_url: url,
        link_title: '',
        event_name: activeEv || null,
      });
      setLinkUrl(''); setShowLinkForm(false);
      toast.success('Link added!');
      onChange();
    } catch (e: any) { toast.error(e.message); }
  };

  const saveDemand = async () => {
    if (!demandText.trim()) return toast.error('Please write something');
    try {
      await portalApi.addReference(ctx, {
        entry_type: 'note', description: demandText.trim(), event_name: activeEv || null,
      });
      setDemandText(''); setShowDemandForm(false);
      toast.success('Note added!');
      onChange();
    } catch (e: any) { toast.error(e.message); }
  };

  const beginEditNote = (r: any) => { setEditingId(r.id); setEditText(r.description || ''); };
  const beginEditLink = (r: any) => { setEditingId(r.id); setEditUrl(r.link_url || ''); };
  const cancelEdit = () => { setEditingId(null); setEditText(''); setEditUrl(''); };

  const saveEditNote = async (oldId: string, eventName: string | null) => {
    const text = editText.trim();
    if (!text) return toast.error('Please write something');
    try {
      await portalApi.addReference(ctx, {
        entry_type: 'note', description: text, event_name: eventName || null,
      });
      await portalApi.deleteReference(ctx, oldId);
      cancelEdit(); toast.success('Saved'); onChange();
    } catch (e: any) { toast.error(e.message); }
  };

  const saveEditLink = async (oldId: string, eventName: string | null) => {
    const url = editUrl.trim();
    if (!url) return toast.error('Please enter a URL');
    try {
      await portalApi.addReference(ctx, {
        entry_type: 'link',
        platform: detectPlatform(url),
        link_url: url,
        link_title: '',
        event_name: eventName || null,
      });
      await portalApi.deleteReference(ctx, oldId);
      cancelEdit(); toast.success('Saved'); onChange();
    } catch (e: any) { toast.error(e.message); }
  };

  const doDelete = async () => {
    if (!confirm) return;
    try {
      if (confirm.hasPhoto) {
        await deletePortalReference(ctx, confirm.id);
      } else {
        await portalApi.deleteReference(ctx, confirm.id);
      }
      setConfirm(null); toast.success('Deleted'); onChange();
    } catch (e: any) { toast.error(e.message); }
  };

  const handleFiles = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    const list = Array.from(files);
    setUploading(true);
    setUploadProgress({ done: 0, total: list.length });
    let okCount = 0;
    for (let i = 0; i < list.length; i++) {
      const f = list[i];
      try {
        const compressed = await compressImage(f);
        const refId = await portalApi.createReferencePhoto(ctx, activeEv || '');
        const { url } = await uploadPortalPhoto(ctx, compressed, 'reference', { refId });
        await portalApi.setReferenceImage(ctx, refId, url);
        okCount++;
      } catch (e: any) {
        toast.error(`${f.name}: ${e.message || 'Upload failed'}`);
      }
      setUploadProgress({ done: i + 1, total: list.length });
    }
    setUploading(false);
    if (okCount > 0) {
      toast.success(`${okCount} photo${okCount > 1 ? 's' : ''} uploaded`);
      onChange();
    }
    if (fileRef.current) fileRef.current.value = '';
  };

  const actionBtn: React.CSSProperties = {
    border: '1px solid var(--cp-border)', background: '#fff',
    borderRadius: 6, padding: '4px 8px', fontSize: 11, cursor: 'pointer',
    color: '#475569', flexShrink: 0,
  };
  const dangerBtn: React.CSSProperties = { ...actionBtn, color: '#dc2626', borderColor: '#fecaca' };

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

      {/* ===== Photos (TOP) ===== */}
      <div className="cp-rsec">
        <div className="cp-rsh">
          <div className="cp-rst">Reference Photos</div>
          {photos.length > 0 && (
            <span style={{ fontSize: 11, color: 'var(--cp-text-3)' }}>{photos.length}</span>
          )}
        </div>

        {photos.length === 0 ? (
          <div className="cp-es"><div className="ic">🖼️</div><p>No reference photos yet</p></div>
        ) : (
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(3, 1fr)',
              gap: 8,
              marginBottom: 12,
            }}
          >
            {photos.map((r) => (
              <div
                key={r.id}
                style={{
                  position: 'relative',
                  aspectRatio: '1 / 1',
                  borderRadius: 10,
                  overflow: 'hidden',
                  background: 'var(--rose-faint)',
                  border: '1px solid var(--cp-border)',
                }}
              >
                <img
                  src={r.image_url}
                  alt="reference"
                  onClick={() => setLightbox(r.image_url)}
                  style={{
                    width: '100%', height: '100%', objectFit: 'cover',
                    cursor: 'zoom-in', display: 'block',
                  }}
                />
                <button
                  onClick={() => setConfirm({ id: r.id, label: 'this photo', hasPhoto: true })}
                  aria-label="Delete photo"
                  style={{
                    position: 'absolute', top: 4, right: 4,
                    width: 24, height: 24, borderRadius: 999,
                    border: 'none', background: 'rgba(0,0,0,.55)',
                    color: '#fff', cursor: 'pointer',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 12,
                  }}
                >×</button>
              </div>
            ))}
          </div>
        )}

        {/* Upload button at the BOTTOM */}
        <input
          ref={fileRef}
          type="file"
          accept="image/*,.heic,.heif"
          multiple
          style={{ display: 'none' }}
          onChange={(e) => handleFiles(e.target.files)}
        />
        <button
          className="cp-alb"
          disabled={uploading}
          onClick={() => fileRef.current?.click()}
          style={{ width: '100%', justifyContent: 'center', display: 'flex', gap: 6 }}
        >
          {uploading
            ? `Uploading ${uploadProgress.done}/${uploadProgress.total}…`
            : '📷  Upload Photos'}
        </button>
      </div>

      {/* ===== Links ===== */}
      <div className="cp-rsec">
        <div className="cp-rsh">
          <div className="cp-rst">Reference Links</div>
          <button className="cp-alb" onClick={() => { setShowLinkForm(!showLinkForm); setShowDemandForm(false); }}>+ Add Link</button>
        </div>
        {showLinkForm && (
          <div className="cp-af">
            <input
              type="url"
              value={linkUrl}
              onChange={(e) => setLinkUrl(e.target.value)}
              placeholder="Paste link here…"
              autoFocus
            />
            <div className="cp-fa">
              <button onClick={() => { setShowLinkForm(false); setLinkUrl(''); }}>Cancel</button>
              <button className="sv" onClick={saveLink}>Save</button>
            </div>
          </div>
        )}
        {links.length === 0 ? (
          <div className="cp-es"><div className="ic">🔗</div><p>No reference links yet</p></div>
        ) : links.map((r) => {
          const p = PLATS[r.platform || 'other'] || PLATS.other;
          const isEditing = editingId === r.id;
          if (isEditing) {
            return (
              <div className="cp-af" key={r.id} style={{ marginBottom: 10 }}>
                <input type="url" value={editUrl} onChange={(e) => setEditUrl(e.target.value)} placeholder="Paste link here…" autoFocus />
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
                <div className="cp-rct" style={{ wordBreak: 'break-all' }}>{r.link_url}</div>
                <div className="cp-rcu">{p.label}</div>
              </div>
              <a href={r.link_url?.startsWith('http') ? r.link_url : `https://${r.link_url}`} target="_blank" rel="noreferrer" style={{ fontSize: 14, textDecoration: 'none', padding: 4 }}>↗</a>
              <button onClick={() => beginEditLink(r)} style={actionBtn}>✎</button>
              <button onClick={() => setConfirm({ id: r.id, label: r.link_url })} style={dangerBtn}>🗑</button>
            </div>
          );
        })}
      </div>

      {/* ===== Notes ===== */}
      <div className="cp-rsec">
        <div className="cp-rsh">
          <div className="cp-rst">My Demands &amp; Notes</div>
          <button className="cp-alb" onClick={() => { setShowDemandForm(!showDemandForm); setShowLinkForm(false); }}>+ Add Note</button>
        </div>
        {showDemandForm && (
          <div className="cp-af">
            <textarea rows={4} value={demandText} onChange={(e) => setDemandText(e.target.value)} placeholder="Describe your ideas, demands, or special requests..." />
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
                <textarea rows={4} value={editText} onChange={(e) => setEditText(e.target.value)} />
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

      {lightbox && (
        <div
          onClick={() => setLightbox(null)}
          style={{
            position: 'fixed', inset: 0, background: 'rgba(0,0,0,.9)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            zIndex: 9999, cursor: 'zoom-out', padding: 16,
          }}
        >
          <img src={lightbox} alt="reference" style={{ maxWidth: '95vw', maxHeight: '90vh', objectFit: 'contain' }} />
        </div>
      )}
    </>
  );
}
