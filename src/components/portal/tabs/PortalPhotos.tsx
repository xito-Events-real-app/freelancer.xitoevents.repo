import { useMemo, useState } from 'react';
import { toast } from 'sonner';
import { portalApi, type PortalContext } from '@/lib/portalClient';

interface Props { data: any; ctx: PortalContext; onChange: () => void; }

export default function PortalPhotos({ data, ctx, onChange }: Props) {
  const events: any[] = data.events || [];
  const photos: any[] = data.photos || [];
  const selections: any[] = data.album_selections || [];
  const mainSelKeys = new Set(selections.filter((s) => s.album_type === 'main').map((s) => s.photo_key));

  const eventNames = useMemo(() => events.map((e) => e.event_name).filter(Boolean), [events]);
  const [activeEv, setActiveEv] = useState<string>(eventNames[0] || '');

  const filtered = activeEv
    ? photos.filter((p) => (p.event_name || p.event || '') === activeEv)
    : photos;

  const toggle = async (p: any) => {
    const selected = !mainSelKeys.has(p.id);
    try {
      await portalApi.setAlbumSelection(ctx, {
        albumType: 'main',
        albumName: 'Main Album',
        photoKey: p.id,
        photoUrl: p.file_path || '',
        selected,
      });
      onChange();
      toast.success(selected ? 'Added to album!' : 'Removed from album');
    } catch (e: any) { toast.error(e.message); }
  };

  if (photos.length === 0) {
    return (
      <>
        <div className="cp-sl" style={{ paddingTop: 20 }}>Photos Gallery</div>
        <div style={{ padding: '0 16px' }}>
          <div className="cp-es">
            <div className="ic">🖼️</div>
            <p>Your photos are being prepared</p>
            <p style={{ marginTop: 6, fontSize: 10 }}>
              We'll notify your handler the moment your edited photos are ready.
            </p>
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <div className="cp-sl" style={{ paddingTop: 20 }}>Photos Gallery</div>
      {eventNames.length > 0 && (
        <div className="cp-ptb">
          {eventNames.map((name) => (
            <button
              key={name}
              className={`cp-ep ${name === activeEv ? 'active' : ''}`}
              onClick={() => setActiveEv(name)}
            >
              {name}
            </button>
          ))}
        </div>
      )}
      <div className="cp-pgrid">
        {filtered.map((p) => {
          const inA = mainSelKeys.has(p.id);
          return (
            <div key={p.id} className={`cp-pth ${inA ? 'in' : ''}`}>
              {p.file_path ? (
                <img src={p.file_path} alt={p.file_name || ''} loading="lazy" />
              ) : (
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', fontSize: 10, color: 'var(--cp-text-3)' }}>
                  {p.file_name}
                </div>
              )}
              <button className="ab" onClick={() => toggle(p)}>{inA ? '✓' : '+'}</button>
            </div>
          );
        })}
      </div>
      <div style={{ height: 16 }} />
    </>
  );
}
