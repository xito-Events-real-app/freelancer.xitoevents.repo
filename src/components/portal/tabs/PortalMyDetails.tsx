import type { ProfileFormType } from '@/components/portal/ProfileFormOverlay';
import CouplePhotoHeader from '@/components/portal/CouplePhotoHeader';
import type { PortalContext } from '@/lib/portalClient';

interface Props {
  data: any;
  ctx: PortalContext;
  onOpen: (type: ProfileFormType) => void;
  onOpenFamily: () => void;
  onRefetch: () => void;
}


const PERSON_FIELDS = [
  'full_name', 'instagram', 'contact_number', 'whatsapp_number',
  'backup_number', 'backup_relation', 'backup_number2', 'backup_relation2',
  'home_city', 'home_area', 'home_address', 'home_landmark',
];

function progress(contact: any, prefix: 'bride' | 'groom') {
  const filled = PERSON_FIELDS.filter((f) => {
    const v = contact?.[`${prefix}_${f}`];
    return v !== null && v !== undefined && String(v).trim().length > 0;
  }).length;
  return `${filled}/${PERSON_FIELDS.length}`;
}

export default function PortalMyDetails({ data, ctx, onOpen, onOpenFamily, onRefetch }: Props) {
  const contact = data.contact || {};
  // Do NOT fall back to client_name — show explicit empty state instead.
  const brideName = (contact.bride_full_name || '').trim() || 'Not added yet';
  const groomName = (contact.groom_full_name || '').trim() || 'Not added yet';
  const brideFilled = !!(contact.bride_full_name || '').trim();
  const groomFilled = !!(contact.groom_full_name || '').trim();
  const pcloudEmails: string[] = Array.isArray(contact.pcloud_share_emails) ? contact.pcloud_share_emails : [];

  return (
    <>
      <CouplePhotoHeader ctx={ctx} data={data} onSaved={onRefetch} />

      <div style={{ textAlign: 'center', padding: '12px 24px 20px' }}>
        <div style={{ fontSize: 22, color: 'var(--rose)', marginBottom: 8 }}>♡</div>
        <div style={{ fontSize: 20, fontWeight: 600, color: 'var(--cp-text)' }}>My Profile</div>
        <div style={{ fontSize: 11, color: 'var(--cp-text-3)', marginTop: 3 }}>
          Manage your contact &amp; location details
        </div>
      </div>


      <div style={{ padding: '0 16px', display: 'flex', flexDirection: 'column', gap: 12 }}>
        <button
          className="cp-prof-card"
          onClick={() => onOpen('bride')}
          style={{ background: 'linear-gradient(135deg, hsl(350,80%,97%) 0%, hsl(350,60%,92%) 100%)' }}
        >
          <div className="cp-prof-card-icon" style={{ background: 'hsl(350,80%,65%)' }}>👤</div>
          <div className="cp-prof-card-body">
            <div className="cp-prof-card-title">Bride Details</div>
            <div className="cp-prof-card-sub" style={{ opacity: brideFilled ? 1 : 0.55 }}>
              {brideFilled ? brideName.toUpperCase() : 'Tap to add bride details'}
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
            <span className="cp-prof-progress">{progress(contact, 'bride')}</span>
            <span style={{ fontSize: 18, color: brideFilled ? '#22c55e' : '#cbd5e1' }}>✅</span>
          </div>
        </button>

        <button
          className="cp-prof-card"
          onClick={() => onOpen('groom')}
          style={{ background: 'linear-gradient(135deg, hsl(210,80%,97%) 0%, hsl(210,60%,92%) 100%)' }}
        >
          <div className="cp-prof-card-icon" style={{ background: 'hsl(210,80%,60%)' }}>👤</div>
          <div className="cp-prof-card-body">
            <div className="cp-prof-card-title">Groom Details</div>
            <div className="cp-prof-card-sub" style={{ opacity: groomFilled ? 1 : 0.55 }}>
              {groomFilled ? groomName.toUpperCase() : 'Tap to add groom details'}
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
            <span className="cp-prof-progress" style={{ color: 'hsl(210,80%,45%)' }}>{progress(contact, 'groom')}</span>
            <span style={{ fontSize: 18, color: groomFilled ? '#22c55e' : '#cbd5e1' }}>✅</span>
          </div>
        </button>

        <button
          className="cp-prof-card"
          onClick={onOpenFamily}
          style={{ background: 'linear-gradient(135deg, hsl(38,80%,97%) 0%, hsl(38,60%,92%) 100%)' }}
        >
          <div className="cp-prof-card-icon" style={{ background: 'linear-gradient(135deg, hsl(38,80%,55%), hsl(20,75%,55%))' }}>👨‍👩‍👧</div>
          <div className="cp-prof-card-body">
            <div className="cp-prof-card-title">Core Family Members</div>
            <div className="cp-prof-card-sub">Help photographers recognise key family — never miss a portrait</div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
            <span className="cp-prof-progress" style={{ color: 'hsl(20,70%,40%)' }}>
              {(Array.isArray(data.family_members) ? data.family_members.length : 0)}/20
            </span>
            <span style={{ fontSize: 18, color: (data.family_members?.length ? '#22c55e' : '#cbd5e1') }}>✅</span>
          </div>
        </button>

        <button
          className="cp-prof-card"
          onClick={() => onOpen('pcloud')}
          style={{ background: 'linear-gradient(135deg, hsl(270,60%,97%) 0%, hsl(270,40%,92%) 100%)' }}
        >
          <div className="cp-prof-card-icon" style={{ background: 'linear-gradient(135deg, hsl(270,70%,60%), hsl(220,70%,55%))' }}>☁️</div>
          <div className="cp-prof-card-body">
            <div className="cp-prof-card-title">pCloud Sharing</div>
            <div className="cp-prof-card-sub">Add emails for photo/video access</div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
            <span className="cp-prof-progress" style={{ color: 'hsl(270,60%,45%)' }}>{pcloudEmails.length}/10</span>
            <span style={{ fontSize: 18, color: '#22c55e' }}>✅</span>
          </div>
        </button>
      </div>
    </>
  );
}
