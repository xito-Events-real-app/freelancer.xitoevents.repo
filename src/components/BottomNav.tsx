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
  { path: '/bookings', icon: CalendarDays, label: 'Bookings' },
  { path: '/discover', icon: Search, label: 'Discover' },
  { path: '/xito-events', icon: Camera, label: 'Events' },
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
    const isAlreadyOnRoute = location.pathname === path;
    if (isAlreadyOnRoute) {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } else {
      navigate(path);
    }
    lastTapRef.current = { path, time: Date.now() };
  }, [location.pathname, navigate]);

  if (effectiveMode === 'desktop') return null;
  if (location.pathname.startsWith('/chat/')) return null;

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-50 safe-area-bottom"
      style={{
        background: 'rgba(255,252,250,0.96)',
        backdropFilter: 'blur(20px)',
        WebkitBackdropFilter: 'blur(20px)',
        borderTop: '1px solid hsl(18 32% 89%)',
        boxShadow: '0 -2px 20px rgba(180,130,110,0.08)',
      }}
    >
      <div className="flex items-center justify-around h-[60px] max-w-lg mx-auto px-1">
        {tabs
          .filter(t => t.path !== '/profile' || !!user)
          .filter(t => t.path !== '/market' || marketEnabled)
          .map(({ path, icon: Icon, label }) => {
            const active = location.pathname === path;
            const isEvents = path === '/xito-events';

            return (
              <button
                key={path}
                onClick={() => handleTabClick(path)}
                className="flex flex-col items-center gap-0.5 px-3 py-1.5 rounded-xl transition-all duration-200 relative min-w-[48px]"
                style={{
                  color: active
                    ? 'hsl(4 68% 54%)'
                    : isEvents
                      ? 'hsl(4 68% 60%)'
                      : 'hsl(15 14% 58%)',
                }}
              >
                {active && (
                  <span
                    className="absolute inset-0 rounded-xl"
                    style={{ background: 'hsl(4 68% 97%)' }}
                  />
                )}
                <div className="relative z-10">
                  <Icon
                    className="w-[19px] h-[19px]"
                    strokeWidth={active ? 2.3 : 1.7}
                  />
                  {path === '/market' && user && unreadMarket > 0 && (
                    <span
                      className="absolute -top-1.5 -right-1.5 w-4 h-4 text-white text-[8px] font-semibold rounded-full flex items-center justify-center"
                      style={{ background: 'hsl(4 68% 58%)' }}
                    >
                      {unreadMarket > 9 ? '9+' : unreadMarket}
                    </span>
                  )}
                </div>
                <span
                  className="text-[10px] z-10 relative leading-none"
                  style={{ fontWeight: active ? 600 : 400 }}
                >
                  {label}
                </span>
              </button>
            );
          })}
      </div>
    </nav>
  );
}
