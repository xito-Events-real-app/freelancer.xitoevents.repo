import { useMemo, useRef, useState } from 'react';
import { toast } from 'sonner';
import {
  portalApi,
  uploadPortalPhoto,
  deletePortalFamilyMember,
  type PortalContext,
} from '@/lib/portalClient';
import { compressImage } from '@/lib/imageCompressor';

interface Props {
  open: boolean;
  onClose: () => void;
  data: any;
  ctx: PortalContext;
  onSaved: () => void;
}

type Side = 'bride' | 'groom';
type Member = {
  id: string;
  side: Side;
  role: string;
  name: string;
  photo_url: string | null;
};

const ROLES = [
  'MOTHER', 'FATHER', 'BROTHER', 'SISTER',
  'GRANDMOTHER', 'GRANDFATHER',
  'UNCLE', 'AUNT', 'COUSIN', 'FRIEND', 'OTHER',
];

type QueueItem = {
  id: string;
  file: File;
  previewUrl: string;
  side: Side;
  role: string;
  customRole: string;
  name: string;
};

function normalizeMembers(raw: any[]): Member[] {
  return (raw || []).map((m) => ({
    id: m.id,
    side: ((m.side || 'BRIDE').toLowerCase() === 'groom' ? 'groom' : 'bride') as Side,
    role: (m.role || '').toUpperCase(),
    name: m.name || '',
    photo_url: m.photo_url || null,
  }));
}

export default function FamilyMembersOverlay({ open, onClose, data, ctx, onSaved }: Props) {
  const members = useMemo(
    () => normalizeMembers(data.family_members || []),
    [data.family_members],
  );
  const [tab, setTab] = useState<'all' | Side>('all');
  const [adding, setAdding] = useState(false);
  const [editing, setEditing] = useState<Member | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const photoInputRef = useRef<HTMLInputElement | null>(null);
  const [photoTarget, setPhotoTarget] = useState<string | null>(null);
  const [queue, setQueue] = useState<QueueItem[]>([]);
  const [bulkSaving, setBulkSaving] = useState(false);
  const bulkInputRef = useRef<HTMLInputElement | null>(null);

  if (!open) return <div className="cp-overlay" style={{ zIndex: 156 }} />;

  const filtered =
    tab === 'all' ? members : members.filter((m) => m.side === tab);
  const bride = members.filter((m) => m.side === 'bride');
  const groom = members.filter((m) => m.side === 'groom');

  // ============= Bulk upload queue =============

  const handleBulkPick = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    e.target.value = '';
    if (!files.length) return;
    const items: QueueItem[] = files.map((f, i) => ({
      id: `${Date.now()}-${i}-${Math.random().toString(36).slice(2, 7)}`,
      file: f,
      previewUrl: URL.createObjectURL(f),
      side: 'bride',
      role: 'MOTHER',
      customRole: '',
      name: '',
    }));
    setQueue((q) => [...q, ...items]);
  };

  const updateQueueItem = (id: string, patch: Partial<QueueItem>) => {
    setQueue((q) => q.map((it) => (it.id === id ? { ...it, ...patch } : it)));
  };
  const removeQueueItem = (id: string) => {
    setQueue((q) => {
      const it = q.find((x) => x.id === id);
      if (it) URL.revokeObjectURL(it.previewUrl);
      return q.filter((x) => x.id !== id);
    });
  };
  const closeQueue = () => {
    queue.forEach((it) => URL.revokeObjectURL(it.previewUrl));
    setQueue([]);
  };

  const saveQueue = async () => {
    setBulkSaving(true);
    let success = 0;
    let failed = 0;
    for (const it of queue) {
      try {
        const role = (it.role === 'CUSTOM' ? it.customRole.trim().toUpperCase() : it.role) || 'OTHER';
        const name = it.name.trim();
        const memberId = await portalApi.addFamilyMember(ctx, it.side, role, name);
        if (!memberId) throw new Error('No member id returned');
        const compressed = await compressImage(it.file);
        const { url } = await uploadPortalPhoto(ctx, compressed, 'family', { memberId });
        await portalApi.setFamilyMemberPhoto(ctx, memberId, url);
        success++;
      } catch (err: any) {
        failed++;
        console.error('queue upload failed', err);
      }
    }
    setBulkSaving(false);
    if (success) toast.success(`Added ${success} member${success > 1 ? 's' : ''} ✓`);
    if (failed) toast.error(`${failed} failed`);
    onSaved();
    closeQueue();
  };

  const handlePickPhoto = (memberId: string) => {
    setPhotoTarget(memberId);
    photoInputRef.current?.click();
  };

  const handlePhotoChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    const memberId = photoTarget;
    setPhotoTarget(null);
    if (!file || !memberId) return;
    try {
      setBusyId(memberId);
      toast.message('Compressing photo…');
      const compressed = await compressImage(file);
      toast.message('Uploading…');
      const { url } = await uploadPortalPhoto(ctx, compressed, 'family', { memberId });
      await portalApi.setFamilyMemberPhoto(ctx, memberId, url);
      toast.success('Photo updated ✓');
      onSaved();
    } catch (err: any) {
      toast.error(err?.message || 'Upload failed');
    } finally {
      setBusyId(null);
    }
  };

  const handleDelete = async (m: Member) => {
    if (!confirm(`Remove ${m.name}?`)) return;
    try {
      setBusyId(m.id);
      await deletePortalFamilyMember(ctx, m.id);
      toast.success('Removed');
      onSaved();
    } catch (err: any) {
      toast.error(err?.message || 'Delete failed');
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div className={`cp-overlay open`} style={{ zIndex: 156 }}>
      <div className="cp-overlay-top" style={{ justifyContent: 'space-between' }}>
        <button className="cp-overlay-back" onClick={onClose}>← Back</button>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <span style={{ fontSize: 15 }}>👨‍👩‍👧</span>
          <span style={{ fontSize: 15, fontWeight: 600 }}>Core Family</span>
        </div>
        <button
          className="cp-ef-save"
          onClick={() => setAdding(true)}
          style={{ flex: 'unset', padding: '8px 14px', fontSize: 12 }}
        >
          ＋ Add
        </button>
      </div>

      <div style={{ flex: 1, overflowY: 'auto', padding: '12px 16px 100px' }}>
        {/* Hero upload button */}
        <button
          onClick={() => bulkInputRef.current?.click()}
          style={{
            width: '100%',
            padding: '16px 14px',
            borderRadius: 14,
            border: 'none',
            background: 'linear-gradient(135deg, hsl(350,80%,60%), hsl(20,80%,58%))',
            color: '#fff',
            fontSize: 14,
            fontWeight: 700,
            cursor: 'pointer',
            boxShadow: '0 6px 18px hsl(350,80%,60%,.32)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 10,
            marginBottom: 8,
          }}
        >
          <span style={{ fontSize: 20 }}>📷</span>
          <span>Upload Family Photos</span>
        </button>
        <div style={{ fontSize: 11, color: 'var(--cp-text-3)', textAlign: 'center', marginBottom: 14, lineHeight: 1.5 }}>
          Pick one or many at once · assign side & relation after
        </div>

        {/* Tabs */}
        <div style={{ display: 'flex', gap: 6, marginBottom: 14 }}>
          {(['all', 'bride', 'groom'] as const).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              style={{
                flex: 1,
                padding: '8px 10px',
                borderRadius: 9,
                border: '1px solid var(--cp-border, #e6dcd6)',
                background: tab === t ? 'hsl(350,75%,60%)' : '#fff',
                color: tab === t ? '#fff' : 'var(--cp-text-2)',
                fontSize: 12,
                fontWeight: 600,
                cursor: 'pointer',
                textTransform: 'capitalize',
              }}
            >
              {t === 'all' ? `All (${members.length})` : `${t} (${t === 'bride' ? bride.length : groom.length})`}
            </button>
          ))}
        </div>

        {members.length === 0 && (
          <div
            style={{
              padding: 24,
              textAlign: 'center',
              border: '1px dashed hsl(350,55%,80%)',
              borderRadius: 14,
              background: 'hsl(350,80%,98%)',
              color: 'hsl(350,40%,45%)',
              fontSize: 13,
              lineHeight: 1.6,
            }}
          >
            👨‍👩‍👧 No family members yet.<br />
            Tap <b>Upload Family Photos</b> above to get started.
          </div>
        )}

        {tab === 'all' ? (
          <>
            {bride.length > 0 && <SectionLabel>Bride's Family</SectionLabel>}
            <CardGrid
              items={bride}
              busyId={busyId}
              onEdit={setEditing}
              onPhoto={handlePickPhoto}
              onDelete={handleDelete}
            />
            {groom.length > 0 && <SectionLabel style={{ marginTop: 16 }}>Groom's Family</SectionLabel>}
            <CardGrid
              items={groom}
              busyId={busyId}
              onEdit={setEditing}
              onPhoto={handlePickPhoto}
              onDelete={handleDelete}
            />
          </>
        ) : (
          <CardGrid
            items={filtered}
            busyId={busyId}
            onEdit={setEditing}
            onPhoto={handlePickPhoto}
            onDelete={handleDelete}
          />
        )}
      </div>

      <input
        ref={photoInputRef}
        type="file"
        accept="image/*"
        hidden
        onChange={handlePhotoChange}
      />

      <input
        ref={bulkInputRef}
        type="file"
        accept="image/*"
        multiple
        hidden
        onChange={handleBulkPick}
      />

      {queue.length > 0 && (
        <BulkAssignSheet
          items={queue}
          saving={bulkSaving}
          onUpdate={updateQueueItem}
          onRemove={removeQueueItem}
          onCancel={closeQueue}
          onSave={saveQueue}
          onAddMore={() => bulkInputRef.current?.click()}
        />
      )}

      {adding && (
        <MemberDialog
          mode="add"
          defaultSide={tab === 'groom' ? 'groom' : 'bride'}
          onCancel={() => setAdding(false)}
          onSave={async ({ side, role, name }) => {
            try {
              await portalApi.addFamilyMember(ctx, side, role, name);
              toast.success('Member added ✓');
              onSaved();
              setAdding(false);
            } catch (err: any) {
              toast.error(err?.message || 'Add failed');
            }
          }}
        />
      )}

      {editing && (
        <MemberDialog
          mode="edit"
          defaultSide={editing.side}
          defaultRole={editing.role}
          defaultName={editing.name}
          onCancel={() => setEditing(null)}
          onSave={async ({ side, role, name }) => {
            try {
              await portalApi.updateFamilyMember(ctx, editing.id, side, role, name);
              toast.success('Updated ✓');
              onSaved();
              setEditing(null);
            } catch (err: any) {
              toast.error(err?.message || 'Update failed');
            }
          }}
        />
      )}
    </div>
  );
}

function SectionLabel({ children, style }: { children: React.ReactNode; style?: React.CSSProperties }) {
  return (
    <div
      style={{
        fontSize: 10,
        fontWeight: 700,
        textTransform: 'uppercase',
        letterSpacing: '.18em',
        color: 'var(--cp-text-3)',
        marginBottom: 10,
        display: 'flex',
        alignItems: 'center',
        gap: 8,
        ...style,
      }}
    >
      <span>{children}</span>
      <span style={{ flex: 1, height: 1, background: 'var(--cp-border, #e6dcd6)' }} />
    </div>
  );
}

function CardGrid({
  items, busyId, onEdit, onPhoto, onDelete,
}: {
  items: Member[];
  busyId: string | null;
  onEdit: (m: Member) => void;
  onPhoto: (id: string) => void;
  onDelete: (m: Member) => void;
}) {
  if (items.length === 0) return null;
  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))',
        gap: 12,
        marginBottom: 8,
      }}
    >
      {items.map((m) => {
        const sideColor = m.side === 'bride' ? 'hsl(350,80%,55%)' : 'hsl(210,80%,52%)';
        const sideBg = m.side === 'bride' ? 'hsl(350,80%,96%)' : 'hsl(210,80%,96%)';
        return (
          <div
            key={m.id}
            style={{
              borderRadius: 14,
              padding: '14px 10px 12px',
              border: '1px solid var(--cp-border,#e6dcd6)',
              background: '#fff',
              textAlign: 'center',
              position: 'relative',
            }}
          >
            <button
              onClick={() => onPhoto(m.id)}
              disabled={busyId === m.id}
              aria-label="Upload photo"
              style={{
                width: 70, height: 70, borderRadius: '50%',
                margin: '0 auto 8px',
                display: 'block',
                background: m.photo_url
                  ? `center/cover no-repeat url("${m.photo_url}")`
                  : 'linear-gradient(135deg, hsl(350,55%,92%), hsl(38,60%,90%))',
                border: '2px solid #fff',
                boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
                cursor: busyId === m.id ? 'progress' : 'pointer',
                position: 'relative',
                color: 'hsl(350,80%,55%)',
                fontFamily: '"Cormorant Garamond", serif',
                fontSize: 22, fontWeight: 600,
              }}
            >
              {!m.photo_url && (m.name?.[0] || '?').toUpperCase()}
              <span
                style={{
                  position: 'absolute', right: -2, bottom: -2,
                  background: sideColor, color: '#fff',
                  width: 22, height: 22, borderRadius: '50%',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 11, boxShadow: '0 2px 6px rgba(0,0,0,0.2)',
                  border: '2px solid #fff',
                }}
              >
                {busyId === m.id ? '…' : '📷'}
              </span>
            </button>
            <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--cp-text)', marginBottom: 3, lineHeight: 1.2 }}>
              {m.name}
            </div>
            <div style={{ fontSize: 10, color: 'var(--cp-text-3)', fontWeight: 500 }}>{m.role}</div>
            <span
              style={{
                display: 'inline-block',
                marginTop: 6,
                padding: '2px 8px',
                borderRadius: 999,
                fontSize: 9,
                fontWeight: 700,
                background: sideBg,
                color: sideColor,
                border: `1px solid ${sideColor}33`,
              }}
            >
              {m.side === 'bride' ? 'Bride' : 'Groom'}
            </span>
            <div style={{ display: 'flex', gap: 4, marginTop: 8, justifyContent: 'center' }}>
              <button
                onClick={() => onEdit(m)}
                style={chipBtn}
                aria-label="Edit"
              >✎ Edit</button>
              <button
                onClick={() => onDelete(m)}
                disabled={busyId === m.id}
                style={{ ...chipBtn, color: '#c53030', borderColor: '#feb2b2' }}
                aria-label="Delete"
              >✕</button>
            </div>
          </div>
        );
      })}
    </div>
  );
}

const chipBtn: React.CSSProperties = {
  padding: '4px 8px',
  borderRadius: 7,
  border: '1px solid var(--cp-border,#e6dcd6)',
  background: '#fff',
  fontSize: 10,
  fontWeight: 600,
  color: 'var(--cp-text-2)',
  cursor: 'pointer',
};

function MemberDialog({
  mode, defaultSide, defaultRole = '', defaultName = '',
  onCancel, onSave,
}: {
  mode: 'add' | 'edit';
  defaultSide: Side;
  defaultRole?: string;
  defaultName?: string;
  onCancel: () => void;
  onSave: (v: { side: Side; role: string; name: string }) => Promise<void> | void;
}) {
  const [side, setSide] = useState<Side>(defaultSide);
  const [role, setRole] = useState(defaultRole || 'MOTHER');
  const [name, setName] = useState(defaultName);
  const [saving, setSaving] = useState(false);

  const submit = async () => {
    if (!name.trim()) return toast.error('Name is required');
    setSaving(true);
    try { await onSave({ side, role, name: name.trim() }); }
    finally { setSaving(false); }
  };

  return (
    <div
      style={{
        position: 'fixed', inset: 0, zIndex: 200,
        background: 'rgba(20,10,15,.55)',
        display: 'flex', alignItems: 'flex-end', justifyContent: 'center',
      }}
      onClick={onCancel}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          width: '100%', maxWidth: 460,
          background: '#fff',
          borderRadius: '18px 18px 0 0',
          padding: '18px 18px 24px',
          boxShadow: '0 -8px 32px rgba(0,0,0,.2)',
        }}
      >
        <div style={{ fontSize: 16, fontWeight: 600, marginBottom: 14, fontFamily: '"Cormorant Garamond", serif' }}>
          {mode === 'add' ? 'Add Family Member' : 'Edit Family Member'}
        </div>

        <label style={fieldLabel}>Side</label>
        <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
          {(['bride', 'groom'] as const).map((s) => (
            <button
              key={s}
              onClick={() => setSide(s)}
              style={{
                flex: 1,
                padding: '10px',
                borderRadius: 10,
                border: `1.5px solid ${side === s ? (s === 'bride' ? 'hsl(350,80%,55%)' : 'hsl(210,80%,52%)') : 'var(--cp-border,#e6dcd6)'}`,
                background: side === s ? (s === 'bride' ? 'hsl(350,80%,96%)' : 'hsl(210,80%,96%)') : '#fff',
                color: side === s ? (s === 'bride' ? 'hsl(350,80%,45%)' : 'hsl(210,80%,40%)') : 'var(--cp-text-2)',
                fontWeight: 600,
                fontSize: 13,
                cursor: 'pointer',
                textTransform: 'capitalize',
              }}
            >{s}'s Side</button>
          ))}
        </div>

        <label style={fieldLabel}>Relation</label>
        <select
          value={role}
          onChange={(e) => setRole(e.target.value)}
          style={fieldInput}
        >
          {ROLES.map((r) => <option key={r} value={r}>{r}</option>)}
        </select>

        <label style={{ ...fieldLabel, marginTop: 12 }}>Name</label>
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="e.g. Sita Sharma"
          style={fieldInput}
        />

        <div style={{ display: 'flex', gap: 10, marginTop: 18 }}>
          <button
            onClick={onCancel}
            style={{
              flex: 1, padding: '12px',
              borderRadius: 10,
              border: '1px solid var(--cp-border,#e6dcd6)',
              background: '#fff',
              color: 'var(--cp-text-2)',
              fontWeight: 600, fontSize: 13,
              cursor: 'pointer',
            }}
          >Cancel</button>
          <button
            onClick={submit}
            disabled={saving}
            style={{
              flex: 1, padding: '12px',
              borderRadius: 10,
              border: 'none',
              background: 'linear-gradient(135deg, hsl(350,80%,60%), hsl(350,75%,48%))',
              color: '#fff',
              fontWeight: 600, fontSize: 13,
              cursor: saving ? 'progress' : 'pointer',
              boxShadow: '0 4px 12px hsl(350,80%,60%,.35)',
            }}
          >{saving ? 'Saving…' : (mode === 'add' ? 'Add' : 'Save')}</button>
        </div>
      </div>
    </div>
  );
}

const fieldLabel: React.CSSProperties = {
  display: 'block', fontSize: 11, fontWeight: 600,
  color: 'var(--cp-text-2)', marginBottom: 6, letterSpacing: '.04em',
};
const fieldInput: React.CSSProperties = {
  width: '100%', padding: '10px 12px',
  borderRadius: 10,
  border: '1px solid var(--cp-border,#e6dcd6)',
  background: '#fff', fontSize: 13, color: 'var(--cp-text)',
  outline: 'none',
};

function BulkAssignSheet({
  items, saving, onUpdate, onRemove, onCancel, onSave, onAddMore,
}: {
  items: QueueItem[];
  saving: boolean;
  onUpdate: (id: string, patch: Partial<QueueItem>) => void;
  onRemove: (id: string) => void;
  onCancel: () => void;
  onSave: () => void;
  onAddMore: () => void;
}) {
  return (
    <div
      style={{
        position: 'fixed', inset: 0, zIndex: 210,
        background: 'rgba(20,10,15,.55)',
        display: 'flex', alignItems: 'flex-end', justifyContent: 'center',
      }}
    >
      <div
        style={{
          width: '100%', maxWidth: 520,
          background: '#fff',
          borderRadius: '18px 18px 0 0',
          maxHeight: '92vh',
          display: 'flex', flexDirection: 'column',
          boxShadow: '0 -8px 32px rgba(0,0,0,.2)',
        }}
      >
        <div
          style={{
            padding: '14px 18px 10px',
            borderBottom: '1px solid var(--cp-border,#eee)',
            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          }}
        >
          <div>
            <div style={{ fontSize: 16, fontWeight: 700, fontFamily: '"Cormorant Garamond", serif' }}>
              Assign {items.length} photo{items.length > 1 ? 's' : ''}
            </div>
            <div style={{ fontSize: 11, color: 'var(--cp-text-3)', marginTop: 2 }}>
              Pick side + relation. Name is optional.
            </div>
          </div>
          <button
            onClick={onCancel}
            disabled={saving}
            style={{
              background: 'none', border: 'none', fontSize: 22,
              cursor: 'pointer', color: 'var(--cp-text-3)', padding: 0, lineHeight: 1,
            }}
            aria-label="Close"
          >✕</button>
        </div>

        <div style={{ flex: 1, overflowY: 'auto', padding: '12px 14px' }}>
          {items.map((it) => {
            const sideColor = it.side === 'bride' ? 'hsl(350,80%,55%)' : 'hsl(210,80%,52%)';
            return (
              <div
                key={it.id}
                style={{
                  display: 'flex', gap: 10,
                  padding: 10, marginBottom: 10,
                  border: '1px solid var(--cp-border,#e6dcd6)',
                  borderRadius: 12,
                  background: '#fafafa',
                }}
              >
                <div
                  style={{
                    width: 70, height: 70, borderRadius: 10,
                    background: `center/cover no-repeat url("${it.previewUrl}")`,
                    flexShrink: 0,
                    border: `2px solid ${sideColor}`,
                  }}
                />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', gap: 6, marginBottom: 6 }}>
                    {(['bride', 'groom'] as const).map((s) => (
                      <button
                        key={s}
                        onClick={() => onUpdate(it.id, { side: s })}
                        style={{
                          flex: 1, padding: '6px',
                          borderRadius: 7,
                          border: `1.5px solid ${it.side === s ? (s === 'bride' ? 'hsl(350,80%,55%)' : 'hsl(210,80%,52%)') : 'var(--cp-border,#e6dcd6)'}`,
                          background: it.side === s ? (s === 'bride' ? 'hsl(350,80%,96%)' : 'hsl(210,80%,96%)') : '#fff',
                          color: it.side === s ? (s === 'bride' ? 'hsl(350,80%,45%)' : 'hsl(210,80%,40%)') : 'var(--cp-text-3)',
                          fontWeight: 700, fontSize: 11,
                          cursor: 'pointer',
                          textTransform: 'uppercase', letterSpacing: '.06em',
                        }}
                      >{s}</button>
                    ))}
                  </div>
                  <select
                    value={it.role}
                    onChange={(e) => onUpdate(it.id, { role: e.target.value })}
                    style={{
                      width: '100%', padding: '7px 8px',
                      borderRadius: 8,
                      border: '1px solid var(--cp-border,#e6dcd6)',
                      background: '#fff', fontSize: 12, color: 'var(--cp-text)',
                      marginBottom: 6,
                    }}
                  >
                    {ROLES.map((r) => <option key={r} value={r}>{r}</option>)}
                    <option value="CUSTOM">✎ Custom relation…</option>
                  </select>
                  {it.role === 'CUSTOM' && (
                    <input
                      value={it.customRole}
                      onChange={(e) => onUpdate(it.id, { customRole: e.target.value })}
                      placeholder="e.g. NEPHEW, BHAUJU…"
                      style={{
                        width: '100%', padding: '7px 8px',
                        borderRadius: 8,
                        border: '1px solid var(--cp-border,#e6dcd6)',
                        background: '#fff', fontSize: 12, color: 'var(--cp-text)',
                        marginBottom: 6, textTransform: 'uppercase',
                      }}
                    />
                  )}
                  <input
                    value={it.name}
                    onChange={(e) => onUpdate(it.id, { name: e.target.value })}
                    placeholder="Name (optional)"
                    style={{
                      width: '100%', padding: '7px 8px',
                      borderRadius: 8,
                      border: '1px solid var(--cp-border,#e6dcd6)',
                      background: '#fff', fontSize: 12, color: 'var(--cp-text)',
                    }}
                  />
                </div>
                <button
                  onClick={() => onRemove(it.id)}
                  disabled={saving}
                  style={{
                    background: 'none', border: 'none', cursor: 'pointer',
                    color: '#c53030', fontSize: 16, padding: '0 4px',
                    alignSelf: 'flex-start',
                  }}
                  aria-label="Remove"
                >✕</button>
              </div>
            );
          })}

          <button
            onClick={onAddMore}
            disabled={saving}
            style={{
              width: '100%', padding: '10px',
              borderRadius: 10,
              border: '1px dashed var(--cp-border,#d6c9c2)',
              background: '#fff',
              color: 'var(--cp-text-2)',
              fontWeight: 600, fontSize: 12,
              cursor: 'pointer',
            }}
          >＋ Add more photos</button>
        </div>

        <div
          style={{
            display: 'flex', gap: 10,
            padding: '12px 16px 18px',
            borderTop: '1px solid var(--cp-border,#eee)',
            background: '#fff',
          }}
        >
          <button
            onClick={onCancel}
            disabled={saving}
            style={{
              flex: 1, padding: '12px',
              borderRadius: 10,
              border: '1px solid var(--cp-border,#e6dcd6)',
              background: '#fff', color: 'var(--cp-text-2)',
              fontWeight: 600, fontSize: 13,
              cursor: saving ? 'not-allowed' : 'pointer',
            }}
          >Cancel</button>
          <button
            onClick={onSave}
            disabled={saving}
            style={{
              flex: 2, padding: '12px',
              borderRadius: 10,
              border: 'none',
              background: 'linear-gradient(135deg, hsl(350,80%,60%), hsl(20,80%,58%))',
              color: '#fff',
              fontWeight: 700, fontSize: 13,
              cursor: saving ? 'progress' : 'pointer',
              boxShadow: '0 4px 12px hsl(350,80%,60%,.35)',
            }}
          >{saving ? 'Uploading…' : `Save all (${items.length})`}</button>
        </div>
      </div>
    </div>
  );
}
