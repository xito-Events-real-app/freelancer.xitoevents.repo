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
  { path: '/xito-events', icon: Camera, label: 'Xito Events', accent: 'red' as const },
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
      <aside className="w-[260px] shrink-0 border-r border-border bg-sidebar sticky top-0 h-screen flex flex-col">
        {/* Logo */}
        <div className="px-5 py-5 border-b border-sidebar-border">
          <h2 className="text-lg font-bold text-sidebar-foreground tracking-tight">Xito Crew</h2>
        </div>

        {/* Nav */}
        <nav className="flex-1 px-3 py-4 space-y-1">
          {navItems.filter(t => t.path !== '/profile' || !!user).map(({ path, icon: Icon, label, accent }) => {
            const active = location.pathname === path || (path === '/chat' && location.pathname.startsWith('/chat'));
            const badge = getBadge(path);
            const isRed = accent === 'red';
            return (
              <button
                key={path}
                onClick={() => navigate(path)}
                className={cn(
                  'w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors',
                  isRed
                    ? active
                      ? 'bg-red-600 text-white hover:bg-red-700'
                      : 'text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30'
                    : active
                    ? 'bg-sidebar-accent text-sidebar-primary'
                    : 'text-sidebar-foreground hover:bg-sidebar-accent/50'
                )}
              >
                <Icon className={cn('w-5 h-5', (active || isRed) && 'stroke-[2.5]')} />
                <span className={cn('flex-1 text-left', isRed && 'font-bold')}>{label}</span>
                {badge > 0 && (
                  <span className="w-5 h-5 bg-destructive text-destructive-foreground text-[10px] font-bold rounded-full flex items-center justify-center">
                    {badge > 9 ? '9+' : badge}
                  </span>
                )}
              </button>
            );
          })}
        </nav>

        {/* My Companies — agency users only */}
        {user && profile && profile.account_type === 'agency' && profile.business_name && (
          <div className="px-3 pb-2">
            <p className="px-3 mb-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">My Companies</p>
            <button
              onClick={() => navigate('/company')}
              className={cn(
                'w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors',
                location.pathname === '/company'
                  ? 'bg-sidebar-accent text-sidebar-primary'
                  : 'text-sidebar-foreground hover:bg-sidebar-accent/50'
              )}
            >
              <Building2 className="w-5 h-5" />
              <span className="flex-1 text-left truncate">{profile.business_name}</span>
            </button>
          </div>
        )}

        {/* User card */}
        {user && profile && (
          <div className="p-3 border-t border-sidebar-border">
            <button
              onClick={() => navigate('/profile')}
              className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-sidebar-accent/50 transition-colors"
            >
              <Avatar className="h-9 w-9">
                <AvatarImage src={profile.profile_photo_url || ''} />
                <AvatarFallback className="text-xs">{getDisplayInitial(profile)}</AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0 text-left">
                <p className="text-sm font-semibold text-sidebar-foreground truncate">{getDisplayName(profile)}</p>
                {profile.main_job && (
                  <p className="text-xs text-muted-foreground truncate">{profile.main_job}</p>
                )}
              </div>
            </button>
          </div>
        )}
      </aside>

      {/* Main content */}
      <main className="flex-1 min-w-0">
        {children}
      </main>
    </div>
  );
}
