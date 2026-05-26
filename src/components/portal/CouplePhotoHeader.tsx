import { useRef, useState } from 'react';
import { compressImage } from '@/lib/imageCompressor';
import { portalApi, uploadPortalPhoto, type PortalContext } from '@/lib/portalClient';
import { toast } from '@/hooks/use-toast';

interface Props {
  ctx: PortalContext;
  data: any;
  onSaved: () => void;
}

function firstName(full?: string | null) {
  return (full || '').trim().split(/\s+/)[0] || '';
}

export default function CouplePhotoHeader({ ctx, data, onSaved }: Props) {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [busy, setBusy] = useState(false);

  const contact = data.contact || {};
  const photoUrl: string | null = data.couple_photo_url || data.client?.couple_photo_url || null;
  const bride = firstName(contact.bride_full_name);
  const groom = firstName(contact.groom_full_name);
  const headline = bride && groom ? `${bride} & ${groom}` : (data.client?.client_name || 'The Happy Couple');

  const handlePick = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    if (busy) return;
    try {
      setBusy(true);
      toast({ title: 'Compressing photo…' });
      const compressed = await compressImage(file);
      toast({ title: 'Uploading…' });
      const { url } = await uploadPortalPhoto(ctx, compressed, 'couple');
      await portalApi.setCouplePhoto(ctx, url);
      toast({ title: 'Couple photo updated ✨' });
      onSaved();
    } catch (err: any) {
      toast({ title: 'Upload failed', description: err?.message || String(err), variant: 'destructive' });
    } finally {
      setBusy(false);
    }
  };

  return (
    <div style={{ textAlign: 'center', padding: '20px 24px 8px' }}>
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        disabled={busy}
        style={{
          position: 'relative',
          width: 132, height: 132, borderRadius: '50%',
          margin: '0 auto 12px',
          background: photoUrl
            ? `center/cover no-repeat url("${photoUrl}")`
            : 'linear-gradient(135deg, hsl(350,80%,92%), hsl(350,60%,82%))',
          border: '3px solid #fff',
          boxShadow: '0 8px 24px -8px rgba(244,114,182,0.45)',
          cursor: busy ? 'progress' : 'pointer',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 32, color: 'hsl(350,80%,55%)',
        }}
        aria-label="Upload couple photo"
      >
        {!photoUrl && '📷'}
        <span
          style={{
            position: 'absolute', right: 4, bottom: 4,
            background: 'hsl(350,80%,60%)', color: '#fff',
            width: 32, height: 32, borderRadius: '50%',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 14, boxShadow: '0 2px 8px rgba(0,0,0,0.25)',
          }}
        >
          {busy ? '…' : '📷'}
        </span>
      </button>
      <div style={{ fontFamily: '"Cormorant Garamond", serif', fontSize: 24, fontWeight: 600, color: 'var(--cp-text)' }}>
        {headline}
      </div>
      {!photoUrl && (
        <div
          style={{
            marginTop: 10,
            display: 'inline-block',
            padding: '8px 14px',
            borderRadius: 999,
            background: 'hsl(350,80%,96%)',
            border: '1px dashed hsl(350,70%,75%)',
            color: 'hsl(350,70%,45%)',
            fontSize: 12,
            fontWeight: 600,
          }}
        >
          📷 Please upload your couple photo
        </div>
      )}
      <input ref={inputRef} type="file" accept="image/*" hidden onChange={handlePick} />
    </div>
  );
}
