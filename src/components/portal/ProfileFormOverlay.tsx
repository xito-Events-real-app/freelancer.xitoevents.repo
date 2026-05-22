import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { portalApi, type PortalContext } from '@/lib/portalClient';
import HomeLocationPicker from '@/components/portal/HomeLocationPicker';

export type ProfileFormType = 'bride' | 'groom' | 'pcloud' | null;

interface Props {
  type: ProfileFormType;
  onClose: () => void;
  data: any;
  ctx: PortalContext;
  onSaved: () => void;
}

const RELATIONS = ['MOTHER', 'FATHER', 'BROTHER', 'SISTER', 'FRIEND', 'UNCLE', 'AUNT', 'OTHER'];

const PERSON_FIELDS = [
  'full_name', 'instagram', 'contact_number', 'whatsapp_number',
  'backup_number', 'backup_relation', 'backup_number2', 'backup_relation2',
  'home_city', 'home_area', 'home_address', 'home_landmark',
  'home_lat', 'home_lng', 'home_place_id', 'home_maps_link',
];

export default function ProfileFormOverlay({ type, onClose, data, ctx, onSaved }: Props) {
  const open = type !== null;
  const [form, setForm] = useState<any>({});
  const [pcEmails, setPcEmails] = useState<string[]>([]);
  const [pcInput, setPcInput] = useState('');
  const [saving, setSaving] = useState(false);
  

  useEffect(() => {
    if (!open) return;
    const c = data.contact || {};
    setForm({ ...c });
    setPcEmails(Array.isArray(c.pcloud_share_emails) ? c.pcloud_share_emails : []);
    setPcInput('');
  }, [open, data.contact]);

  if (!open || !type) return <div className="cp-overlay" style={{ zIndex: 155 }} />;

  const prefix = type === 'bride' ? 'bride_' : type === 'groom' ? 'groom_' : '';
  const set = (key: string, value: any) => setForm((f: any) => ({ ...f, [key]: value }));

  const headerIcon = type === 'pcloud' ? '☁️' : '👤';
  const headerTitle = type === 'bride' ? 'Bride' : type === 'groom' ? 'Groom' : 'pCloud Sharing';
  const headerColor = type === 'bride' ? 'var(--rose)' : type === 'groom' ? 'hsl(210,80%,55%)' : 'hsl(270,70%,55%)';

  const addEmail = () => {
    const val = pcInput.trim();
    if (!val.includes('@')) return toast.error('Enter a valid email');
    if (pcEmails.length >= 10) return toast.error('Maximum 10 emails');
    if (pcEmails.includes(val)) return toast.error('Email already added');
    setPcEmails([...pcEmails, val]);
    setPcInput('');
  };

  const save = async () => {
    setSaving(true);
    try {
      if (type === 'pcloud') {
        await portalApi.upsertContact(ctx, { ...data.contact, pcloud_share_emails: pcEmails });
        toast.success('pCloud sharing saved ✓');
      } else {
        if (!form[`${prefix}full_name`]?.trim()) {
          toast.error('Full name is required');
          setSaving(false); return;
        }
        await portalApi.upsertContact(ctx, form);
        toast.success(`${headerTitle} details saved ✓`);
      }
      onSaved();
      onClose();
    } catch (e: any) {
      toast.error(e.message || 'Save failed');
    } finally { setSaving(false); }
  };

  return (
    <div className={`cp-overlay ${open ? 'open' : ''}`} style={{ zIndex: 155 }}>
      <div className="cp-overlay-top" style={{ justifyContent: 'space-between' }}>
        <button className="cp-overlay-back" onClick={onClose}>← Back</button>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, flex: 1, justifyContent: 'center' }}>
          <span style={{ fontSize: 15 }}>{headerIcon}</span>
          <span style={{ fontSize: 15, fontWeight: 600, color: headerColor }}>{headerTitle}</span>
        </div>
        <button
          className="cp-ef-save"
          onClick={save}
          disabled={saving}
          style={{ flex: 'unset', padding: '8px 14px', fontSize: 12 }}
        >
          {saving ? '…' : '💾 Save'}
        </button>
      </div>

      <div style={{ flex: 1, overflowY: 'auto', padding: '16px 16px 100px' }}>
        {type === 'pcloud' ? (
          <div className="cp-pf-section">
            <div className="cp-pf-section-header">
              <span className="cp-pf-section-icon">☁️</span>
              <span className="cp-pf-section-title">pCloud Sharing</span>
            </div>
            <p style={{ fontSize: 12, color: 'var(--cp-text-2)', marginBottom: 14, lineHeight: 1.6 }}>
              Add email addresses to grant access to your wedding photos &amp; videos on pCloud. Up to 10 emails allowed.
            </p>
            <div className="cp-pcloud-chips">
              {pcEmails.map((e, i) => (
                <div key={i} className="cp-pcloud-chip">
                  {e}
                  <button onClick={() => setPcEmails(pcEmails.filter((_, idx) => idx !== i))}>✕</button>
                </div>
              ))}
            </div>
            <div className="cp-pcloud-add-row">
              <input
                type="email"
                value={pcInput}
                onChange={(e) => setPcInput(e.target.value)}
                placeholder="Add email address…"
                onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addEmail())}
              />
              <button className="cp-pcloud-add-btn" onClick={addEmail}>Add</button>
            </div>
            <p style={{ fontSize: 10, color: 'var(--cp-text-3)', marginTop: 10 }}>{pcEmails.length}/10 emails added</p>
          </div>
        ) : (
          <>
            <div className="cp-pf-section">
              <div className="cp-pf-section-header">
                <span className="cp-pf-section-icon">👤</span>
                <span className="cp-pf-section-title">Personal Info</span>
              </div>
              <div className="cp-pf-row">
                <div className="cp-pf-group">
                  <label>Full Name <span className="cp-pf-required">*</span></label>
                  <input
                    type="text"
                    value={form[`${prefix}full_name`] || ''}
                    onChange={(e) => set(`${prefix}full_name`, e.target.value)}
                    placeholder="Full name"
                  />
                </div>
              </div>
              <div className="cp-pf-row">
                <div className="cp-pf-group">
                  <label>Instagram Handle</label>
                  <div className="cp-pf-instagram-wrap">
                    <span className="cp-pf-instagram-at">@</span>
                    <input
                      type="text"
                      value={(form[`${prefix}instagram`] || '').replace(/^@/, '')}
                      onChange={(e) => set(`${prefix}instagram`, e.target.value)}
                      placeholder="username"
                    />
                  </div>
                </div>
              </div>
            </div>

            <div className="cp-pf-section">
              <div className="cp-pf-section-header">
                <span className="cp-pf-section-icon">📞</span>
                <span className="cp-pf-section-title">Contact Numbers</span>
              </div>
              <div className="cp-pf-row">
                <div className="cp-pf-group">
                  <label>Contact <span className="cp-pf-required">*</span></label>
                  <input
                    type="tel"
                    value={form[`${prefix}contact_number`] || ''}
                    onChange={(e) => set(`${prefix}contact_number`, e.target.value)}
                    placeholder="98XXXXXXXX"
                  />
                </div>
                <div className="cp-pf-group">
                  <label>WhatsApp <span className="cp-pf-required">*</span></label>
                  <input
                    type="tel"
                    value={form[`${prefix}whatsapp_number`] || ''}
                    onChange={(e) => set(`${prefix}whatsapp_number`, e.target.value)}
                    placeholder="98XXXXXXXX"
                  />
                </div>
              </div>
              <div className="cp-pf-subsection-label">Backup Contacts</div>
              <div className="cp-pf-row" style={{ alignItems: 'flex-end' }}>
                <div className="cp-pf-group" style={{ flex: 1.4 }}>
                  <label>Number 1</label>
                  <input
                    type="tel"
                    value={form[`${prefix}backup_number`] || ''}
                    onChange={(e) => set(`${prefix}backup_number`, e.target.value)}
                    placeholder="98XXXXXXXX"
                  />
                </div>
                <div className="cp-pf-group">
                  <label>Relation</label>
                  <div className="cp-pf-select-wrap">
                    <select
                      value={form[`${prefix}backup_relation`] || ''}
                      onChange={(e) => set(`${prefix}backup_relation`, e.target.value)}
                    >
                      <option value="">Select</option>
                      {RELATIONS.map((r) => <option key={r} value={r}>{r}</option>)}
                    </select>
                  </div>
                </div>
              </div>
              <div className="cp-pf-row" style={{ alignItems: 'flex-end' }}>
                <div className="cp-pf-group" style={{ flex: 1.4 }}>
                  <label>Number 2</label>
                  <input
                    type="tel"
                    value={form[`${prefix}backup_number2`] || ''}
                    onChange={(e) => set(`${prefix}backup_number2`, e.target.value)}
                    placeholder="98XXXXXXXX"
                  />
                </div>
                <div className="cp-pf-group">
                  <label>Relation</label>
                  <div className="cp-pf-select-wrap">
                    <select
                      value={form[`${prefix}backup_relation2`] || ''}
                      onChange={(e) => set(`${prefix}backup_relation2`, e.target.value)}
                    >
                      <option value="">Select</option>
                      {RELATIONS.map((r) => <option key={r} value={r}>{r}</option>)}
                    </select>
                  </div>
                </div>
              </div>
            </div>

            <div className="cp-pf-section">
              <div className="cp-pf-section-header">
                <span className="cp-pf-section-icon">📍</span>
                <span className="cp-pf-section-title">Home Address</span>
              </div>

              <HomeLocationPicker
                value={{
                  lat: form[`${prefix}home_lat`] ?? null,
                  lng: form[`${prefix}home_lng`] ?? null,
                  address: form[`${prefix}home_address`] || '',
                  city: form[`${prefix}home_city`] || '',
                  area: form[`${prefix}home_area`] || '',
                  place_id: form[`${prefix}home_place_id`] || '',
                  maps_link: form[`${prefix}home_maps_link`] || '',
                }}
                onChange={(patch) => {
                  setForm((f: any) => {
                    const next = { ...f };
                    if ('lat' in patch) next[`${prefix}home_lat`] = patch.lat;
                    if ('lng' in patch) next[`${prefix}home_lng`] = patch.lng;
                    if ('address' in patch) next[`${prefix}home_address`] = patch.address;
                    if ('city' in patch) next[`${prefix}home_city`] = patch.city;
                    if ('area' in patch) next[`${prefix}home_area`] = patch.area;
                    if ('place_id' in patch) next[`${prefix}home_place_id`] = patch.place_id;
                    if ('maps_link' in patch) next[`${prefix}home_maps_link`] = patch.maps_link;
                    return next;
                  });
                }}
              />

              {/* Landmark stays manual */}
              <div className="cp-pf-row" style={{ marginTop: 12 }}>
                <div className="cp-pf-group">
                  <label>Landmark</label>
                  <textarea
                    rows={3}
                    value={form[`${prefix}home_landmark`] || ''}
                    onChange={(e) => set(`${prefix}home_landmark`, e.target.value)}
                    placeholder="Near temple, opposite to..."
                  />
                </div>
              </div>
            </div>
          </>
        )}
      </div>

    </div>
  );
}
