import { useEffect, useMemo, useState } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { portalApi } from '@/lib/portalClient';
import PortalDashboard from '@/components/portal/tabs/PortalDashboard';
import PortalMyDetails from '@/components/portal/tabs/PortalMyDetails';
import PortalReferences from '@/components/portal/tabs/PortalReferences';
import PortalPhotos from '@/components/portal/tabs/PortalPhotos';
import PortalAlbum from '@/components/portal/tabs/PortalAlbum';
import PortalVideos from '@/components/portal/tabs/PortalVideos';
import EventDetailsOverlay from '@/components/portal/EventDetailsOverlay';
import ProfileFormOverlay, { type ProfileFormType } from '@/components/portal/ProfileFormOverlay';
import '@/styles/client-portal.css';

export type Tab = 'dashboard' | 'references' | 'photos' | 'album' | 'videos' | 'details';

const TABS: { id: Tab; label: string; icon: string }[] = [
  { id: 'dashboard', label: 'Home', icon: '🏠' },
  { id: 'references', label: 'Ideas', icon: '✨' },
  { id: 'photos', label: 'Photos', icon: '🖼️' },
  { id: 'album', label: 'My Album', icon: '📖' },
  { id: 'videos', label: 'Videos', icon: '🎬' },
  { id: 'details', label: 'Profile', icon: '👤' },
];

export default function ClientPortal() {
  const { clientId = '' } = useParams<{ slug: string; clientId: string }>();
  const [params] = useSearchParams();
  const token = params.get('t') || '';
  const [tab, setTab] = useState<Tab>('dashboard');
  const [evdOpen, setEvdOpen] = useState(false);
  const [evdEventId, setEvdEventId] = useState<string | null>(null);
  const [profileOpen, setProfileOpen] = useState<ProfileFormType | null>(null);

  const ctx = useMemo(() => ({ clientId, token }), [clientId, token]);

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['portal-bundle', clientId, token],
    queryFn: () => portalApi.readBundle(ctx),
    enabled: Boolean(clientId && token),
    staleTime: 30_000,
  });

  useEffect(() => {
    document.title = data?.client?.client_name
      ? `${data.client.client_name} • Wedding Portal`
      : 'Wedding Portal';
  }, [data]);

  if (!clientId || !token) {
    return <ErrorScreen title="Invalid link" message="This portal link is missing required information." />;
  }
  if (isLoading) {
    return <div className="min-h-screen flex items-center justify-center bg-[#faf8f7] text-[#6b5f5c]">Loading your portal…</div>;
  }
  if (error || !data?.client) {
    return <ErrorScreen title="Link not available" message="This portal link may have been disabled. Please contact your photographer." />;
  }

  const albumBadgeCount = (data.album_selections || []).length;

  const totalSelectedSet = new Set<string>();
  (data.album_selections || []).forEach((s: any) => totalSelectedSet.add(s.photo_key));

  return (
    <div className="cp-root">
      {tab === 'dashboard' && (
        <PortalDashboard
          data={data}
          ctx={ctx}
          onRefetch={refetch}
          onOpenEvent={(eventId) => { setEvdEventId(eventId); setEvdOpen(true); }}
          onGoTo={setTab}
        />
      )}
      {tab === 'references' && <PortalReferences data={data} ctx={ctx} onChange={refetch} />}
      {tab === 'photos' && <PortalPhotos data={data} ctx={ctx} onChange={refetch} />}
      {tab === 'album' && <PortalAlbum data={data} ctx={ctx} onChange={refetch} />}
      {tab === 'videos' && <PortalVideos data={data} ctx={ctx} onChange={refetch} />}
      {tab === 'details' && <PortalMyDetails data={data} onOpen={setProfileOpen} />}

      <nav className="cp-bnav">
        {TABS.map((t) => (
          <button
            key={t.id}
            className={`cp-nb ${tab === t.id ? 'active' : ''}`}
            onClick={() => { setTab(t.id); window.scrollTo(0, 0); }}
          >
            <span className="cp-nb-ic">{t.icon}</span>
            <span className="cp-nb-lb">{t.label}</span>
            {t.id === 'album' && albumBadgeCount > 0 && (
              <span className="cp-nb-badge">{albumBadgeCount}</span>
            )}
          </button>
        ))}
      </nav>

      <EventDetailsOverlay
        open={evdOpen}
        onClose={() => setEvdOpen(false)}
        focusEventId={evdEventId}
        data={data}
        ctx={ctx}
        onSaved={refetch}
      />

      <ProfileFormOverlay
        type={profileOpen}
        onClose={() => setProfileOpen(null)}
        data={data}
        ctx={ctx}
        onSaved={refetch}
      />
    </div>
  );
}

function ErrorScreen({ title, message }: { title: string; message: string }) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-[#faf8f7] px-6">
      <div className="max-w-sm text-center space-y-3">
        <h1 className="text-2xl" style={{ fontFamily: '"Cormorant Garamond", serif' }}>{title}</h1>
        <p className="text-sm text-[#6b5f5c]">{message}</p>
      </div>
    </div>
  );
}
