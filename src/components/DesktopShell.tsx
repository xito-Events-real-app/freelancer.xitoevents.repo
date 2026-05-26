import { useLocation, useNavigate } from 'react-router-dom';
import { Home, CalendarDays, Search, ShoppingBag, MessageSquare, User, Building2, Camera } from 'lucide-react';
import { cn, getDisplayName, getDisplayInitial } from '@/lib/utils';
import { useAuth } from '@/contexts/AuthContext';
import { useMyProfile } from '@/hooks/useProfile';
import { useUnreadNotificationCount } from '@/hooks/useMarket';
import { useUnreadChatCount } from '@/hooks/useChat';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';

const navItems = [
  { path: '/', icon: Home, label: 'Home' },
  { path: '/bookings', icon: CalendarDays, label: 'My Bookings' },
  { path: '/discover', icon: Search, label: 'Discover' },
  { path: '/xito-events', icon: Camera, label: 'Xito Events', accent: 'coral' as const },
  { path: '/market', icon: ShoppingBag, label: 'Market' },
  { path: '/chat', icon: MessageSquare, label: 'Chat' },
  { path: '/profile', icon: User, label: 'Profile' },
];

export default function DesktopShell({ children }: { children: React.ReactNode }) {
  const location = useLocation();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { data: profile } = useMyProfile();
  const unreadMarket = useUnreadNotificationCount();
  const { data: unreadChat = 0 } = useUnreadChatCount();

  const getBadge = (path: string) => {
    if (path === '/market' && user && unreadMarket > 0) return unreadMarket;
    if (path === '/chat' && user && unreadChat > 0) return unreadChat;
    return 0;
  };

  return (
    <div className="min-h-screen flex bg-background">
      {/* Sidebar */}
      <aside
        className="w-16 lg:w-[252px] shrink-0 sticky top-0 h-screen flex flex-col overflow-hidden transition-all duration-300"
        style={{
          background: 'hsl(var(--sidebar-background))',
          borderRight: '1px solid hsl(18 32% 90%)',
        }}
      >
        {/* Logo */}
        <div
          className="px-3 lg:px-5 py-5 flex items-center justify-center lg:justify-start gap-3 min-h-[68px]"
          style={{ borderBottom: '1px solid hsl(18 32% 91%)' }}
        >
          <div
            className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0 shadow-sm"
            style={{ background: 'linear-gradient(135deg, hsl(4 68% 60%), hsl(340 60% 62%))' }}
          >
            <span className="text-white font-bold text-sm tracking-tight" style={{ fontFamily: 'Poppins, sans-serif' }}>X</span>
          </div>
          <div className="hidden lg:block">
            <h2
              className="text-xl font-semibold leading-none tracking-wide"
              style={{ fontFamily: 'Cormorant Garamond, Georgia, serif', color: 'hsl(15 40% 18%)' }}
            >
              Xito Crew
            </h2>
            <p className="text-[10px] tracking-[0.15em] uppercase mt-0.5" style={{ color: 'hsl(15 14% 55%)', fontFamily: 'Poppins, sans-serif' }}>
              Wedding Platform
            </p>
          </div>
        </div>

        {/* Nav */}
        <nav className="flex-1 px-2 lg:px-3 py-5 space-y-1 overflow-y-auto">
          {navItems.filter(t => t.path !== '/profile' || !!user).map(({ path, icon: Icon, label, accent }) => {
            const active = location.pathname === path || (path === '/chat' && location.pathname.startsWith('/chat'));
            const badge = getBadge(path);
            const isCoral = accent === 'coral';

            return (
              <button
                key={path}
                onClick={() => navigate(path)}
                title={label}
                className="w-full flex items-center justify-center lg:justify-start gap-3 px-2 lg:px-3 py-2.5 rounded-xl text-sm transition-all duration-150 relative group"
                style={
                  active
                    ? {
                        background: isCoral
                          ? 'hsl(4 68% 96%)'
                          : 'hsl(18 45% 93%)',
                        color: isCoral ? 'hsl(4 68% 50%)' : 'hsl(15 40% 18%)',
                        fontWeight: 600,
                      }
                    : {
                        color: isCoral ? 'hsl(4 68% 52%)' : 'hsl(15 14% 52%)',
                        fontWeight: 400,
                      }
                }
                onMouseEnter={e => {
                  if (!active) {
                    (e.currentTarget as HTMLElement).style.background = 'hsl(18 45% 95%)';
                    (e.currentTarget as HTMLElement).style.color = 'hsl(15 40% 18%)';
                  }
                }}
                onMouseLeave={e => {
                  if (!active) {
                    (e.currentTarget as HTMLElement).style.background = '';
                    (e.currentTarget as HTMLElement).style.color = isCoral ? 'hsl(4 68% 52%)' : 'hsl(15 14% 52%)';
                  }
                }}
              >
                {/* Active indicator bar */}
                {active && (
                  <span
                    className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-5 rounded-r-full"
                    style={{ background: isCoral ? 'hsl(4 68% 58%)' : 'hsl(4 68% 58%)' }}
                  />
                )}
                <Icon className="w-[18px] h-[18px] shrink-0" strokeWidth={active ? 2.2 : 1.8} />
                <span className="hidden lg:block flex-1 text-left text-[13px]">{label}</span>
                {badge > 0 && (
                  <span
                    className="absolute top-1.5 right-1.5 lg:static lg:ml-auto w-5 h-5 text-white text-[10px] font-semibold rounded-full flex items-center justify-center shrink-0"
                    style={{ background: 'hsl(4 68% 58%)' }}
                  >
                    {badge > 9 ? '9+' : badge}
                  </span>
                )}
              </button>
            );
          })}
        </nav>

        {/* My Companies */}
        {user && profile && profile.account_type === 'agency' && profile.business_name && (
          <div className="px-2 lg:px-3 pb-2">
            <p
              className="hidden lg:block px-3 mb-1.5 text-[10px] font-semibold uppercase tracking-[0.14em]"
              style={{ color: 'hsl(15 14% 58%)', fontFamily: 'Poppins, sans-serif' }}
            >
              My Studio
            </p>
            <button
              onClick={() => navigate('/company')}
              title={profile.business_name}
              className="w-full flex items-center justify-center lg:justify-start gap-3 px-2 lg:px-3 py-2.5 rounded-xl text-[13px] transition-all duration-150"
              style={{
                color: location.pathname.startsWith('/company') ? 'hsl(15 40% 18%)' : 'hsl(15 14% 52%)',
                background: location.pathname.startsWith('/company') ? 'hsl(18 45% 93%)' : '',
                fontWeight: location.pathname.startsWith('/company') ? 600 : 400,
              }}
            >
              <Building2 className="w-[18px] h-[18px] shrink-0" strokeWidth={1.8} />
              <span className="hidden lg:block flex-1 text-left truncate">{profile.business_name}</span>
            </button>
          </div>
        )}

        {/* User card */}
        {user && profile && (
          <div
            className="p-2 lg:p-3"
            style={{ borderTop: '1px solid hsl(18 32% 91%)' }}
          >
            <button
              onClick={() => navigate('/profile')}
              title={getDisplayName(profile)}
              className="w-full flex items-center justify-center lg:justify-start gap-3 px-2 lg:px-3 py-2 rounded-xl transition-all duration-150"
              onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = 'hsl(18 45% 94%)'; }}
              onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = ''; }}
            >
              <Avatar className="h-8 w-8 shrink-0 ring-2" style={{ '--tw-ring-color': 'hsl(18 32% 88%)' } as React.CSSProperties}>
                <AvatarImage src={profile.profile_photo_url || ''} />
                <AvatarFallback
                  className="text-xs font-medium"
                  style={{ background: 'hsl(18 45% 92%)', color: 'hsl(4 68% 52%)' }}
                >
                  {getDisplayInitial(profile)}
                </AvatarFallback>
              </Avatar>
              <div className="hidden lg:block flex-1 min-w-0 text-left">
                <p className="text-[13px] font-semibold truncate leading-tight" style={{ color: 'hsl(15 40% 18%)' }}>
                  {getDisplayName(profile)}
                </p>
                {profile.main_job && (
                  <p className="text-[11px] truncate" style={{ color: 'hsl(15 14% 55%)' }}>{profile.main_job}</p>
                )}
              </div>
            </button>
          </div>
        )}
      </aside>

      {/* Main content */}
      <main className="flex-1 min-w-0 overflow-x-hidden">
        {children}
      </main>
    </div>
  );
}
