import { useState } from 'react';
import { toast } from 'sonner';
import { portalApi, type PortalContext } from '@/lib/portalClient';

interface Props { data: any; ctx: PortalContext; onChange: () => void; }

export default function PortalVideos({ data, ctx, onChange }: Props) {
  const videos: any[] = data.youtube_videos || [];
  const hidden = new Set<string>((data.hidden_videos || []).map((h: any) => h.video_id));
  const visible = videos.filter((v) => !hidden.has(v.video_id));
  const hiddenList = videos.filter((v) => hidden.has(v.video_id));

  const [activeId, setActiveId] = useState<string>(visible[0]?.video_id || '');
  const active = visible.find((v) => v.video_id === activeId) || visible[0];

  const hide = async (id: string) => { try { await portalApi.hideVideo(ctx, id); onChange(); } catch (e: any) { toast.error(e.message); } };
  const unhide = async (id: string) => { try { await portalApi.unhideVideo(ctx, id); onChange(); } catch (e: any) { toast.error(e.message); } };

  if (videos.length === 0) {
    return (
      <div style={{ padding: 16 }}>
        <div className="cp-es">
          <div className="ic">🎬</div>
          <p>Your highlight reels will appear here once uploaded.</p>
        </div>
      </div>
    );
  }

  return (
    <>
      <div style={{ padding: '16px 16px 8px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <div style={{ fontSize: 15, fontWeight: 500 }}>{data.client?.client_name || 'Wedding Videos'}</div>
          <div style={{ fontSize: 11, color: 'var(--cp-text-3)' }}>{visible.length} video{visible.length === 1 ? '' : 's'}</div>
        </div>
        <div style={{ fontSize: 10, color: '#ef4444', background: '#fef2f2', padding: '5px 10px', borderRadius: 20 }}>▶ Playlist</div>
      </div>

      {active && (
        <>
          <div className="cp-vpw">
            <iframe
              src={`https://www.youtube.com/embed/${active.video_id}?autoplay=0`}
              title={active.title || 'Video'}
              allow="autoplay; accelerometer; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
            />
          </div>
          <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--cp-border)' }}>
            <div style={{ fontSize: 13, fontWeight: 500 }}>{active.title || active.event_name || 'Video'}</div>
          </div>
        </>
      )}

      <div className="cp-vlist">
        {visible.map((v) => (
          <div
            key={v.id}
            className={`cp-vi ${v.video_id === activeId ? 'active' : ''}`}
            onClick={() => setActiveId(v.video_id)}
          >
            <div className="cp-vth">
              <img src={`https://img.youtube.com/vi/${v.video_id}/mqdefault.jpg`} alt="" />
              <div className="cp-vpo"><div className="cp-vpic">▶</div></div>
            </div>
            <div className="cp-vinfo">
              <div className="cp-vtitle">{v.title || 'Untitled'}</div>
              <div className="cp-vsub">
                <button onClick={(e) => { e.stopPropagation(); hide(v.video_id); }} style={{ background: 'none', border: 'none', color: 'var(--cp-text-3)', cursor: 'pointer', padding: 0, fontSize: 10 }}>
                  Hide
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {hiddenList.length > 0 && (
        <details style={{ padding: '8px 16px', fontSize: 11 }}>
          <summary style={{ cursor: 'pointer', color: 'var(--cp-text-3)' }}>Hidden ({hiddenList.length})</summary>
          {hiddenList.map((v) => (
            <div key={v.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0' }}>
              <span style={{ color: 'var(--cp-text-2)' }}>{v.title || v.video_id}</span>
              <button onClick={() => unhide(v.video_id)} style={{ background: 'none', border: 'none', color: 'var(--rose)', cursor: 'pointer', fontSize: 11 }}>Unhide</button>
            </div>
          ))}
        </details>
      )}
    </>
  );
}
