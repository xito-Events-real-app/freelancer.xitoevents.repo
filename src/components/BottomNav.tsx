import { Home, CalendarDays, Search, ShoppingBag, User, Camera } from 'lucide-react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useRef, useCallback } from 'react';
import { cn } from '@/lib/utils';
import { useAuth } from '@/contexts/AuthContext';
import { useSubscribeToMarketNotifications, useUnreadNotificationCount } from '@/hooks/useMarket';
import { useViewMode } from '@/contexts/ViewModeContext';
import { useFeatureFlag } from '@/hooks/useFeatureFlag';

const tabs = [
  { path: '/', icon: Home, label: 'Home' },
  { path: '/bookings', icon: CalendarDays, label: 'My Bookings' },
  { path: '/discover', icon: Search, label: 'Discover' },
  { path: '/xito-events', icon: Camera, label: 'Xito Events' },
  { path: '/market', icon: ShoppingBag, label: 'Market' },
  { path: '/profile', icon: User, label: 'Profile' },
];

export default function BottomNav() {
  const location = useLocation();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { effectiveMode } = useViewMode();
  useSubscribeToMarketNotifications();
  const unreadMarket = useUnreadNotificationCount();
  const marketEnabled = useFeatureFlag('marketplace_enabled');
  const lastTapRef = useRef<{ path: string; time: number }>({ path: '', time: 0 });

  const handleTabClick = useCallback((path: string) => {
    const now = Date.now();
    const isAlreadyOnRoute = location.pathname === path;

    if (isAlreadyOnRoute) {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } else {
      navigate(path);
    }

    lastTapRef.current = { path, time: now };
  }, [location.pathname, navigate]);

  if (effectiveMode === 'desktop') return null;
  if (location.pathname.startsWith('/chat/')) return null;

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-card/95 backdrop-blur-lg border-t border-border safe-area-bottom shadow-[0_-4px_20px_rgba(0,0,0,0.15)]">
      <div className="flex items-center justify-around h-16 max-w-lg mx-auto">
        {tabs
          .filter(t => t.path !== '/profile' || !!user)
          .filter(t => t.path !== '/market' || marketEnabled)
          .map(({ path, icon: Icon, label }) => {
          const active = location.pathname === path;
          return (
            <button
              key={path}
              onClick={() => handleTabClick(path)}
              className={cn(
                'flex flex-col items-center gap-1 px-4 py-2 rounded-xl transition-all duration-200 relative',
                active
                  ? 'text-primary bg-primary/10'
                  : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
              )}
            >
              <div className="relative">
                <Icon className={cn('w-5 h-5', active && 'stroke-[2.5]')} />
                {path === '/market' && user && unreadMarket > 0 && (
                  <span className="absolute -top-1.5 -right-1.5 w-4 h-4 bg-destructive text-destructive-foreground text-[8px] font-bold rounded-full flex items-center justify-center">
                    {unreadMarket > 9 ? '9+' : unreadMarket}
                  </span>
                )}
              </div>
              <span className={cn('text-[10px] font-semibold', active && 'font-bold')}>{label}</span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}
