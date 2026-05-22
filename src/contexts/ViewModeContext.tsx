import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from 'react';

type ViewMode = 'auto' | 'mobile' | 'desktop';
type EffectiveMode = 'mobile' | 'desktop';

interface ViewModeContextType {
  viewMode: ViewMode;
  effectiveMode: EffectiveMode;
  setViewMode: (mode: ViewMode) => void;
}

const ViewModeContext = createContext<ViewModeContextType | undefined>(undefined);

const STORAGE_KEY = 'view-mode-preference';
const DESKTOP_BREAKPOINT = 1024;

function getEffective(mode: ViewMode, width: number): EffectiveMode {
  if (mode === 'auto') return width >= DESKTOP_BREAKPOINT ? 'desktop' : 'mobile';
  return mode;
}

export function ViewModeProvider({ children }: { children: ReactNode }) {
  const [viewMode, setViewModeState] = useState<ViewMode>(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored === 'mobile' || stored === 'desktop' || stored === 'auto') return stored;
    } catch {}
    return 'auto';
  });

  const [windowWidth, setWindowWidth] = useState(
    typeof window !== 'undefined' ? window.innerWidth : 0
  );

  useEffect(() => {
    const onResize = () => setWindowWidth(window.innerWidth);
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  const setViewMode = useCallback((mode: ViewMode) => {
    setViewModeState(mode);
    try { localStorage.setItem(STORAGE_KEY, mode); } catch {}
  }, []);

  const effectiveMode = getEffective(viewMode, windowWidth);

  return (
    <ViewModeContext.Provider value={{ viewMode, effectiveMode, setViewMode }}>
      {children}
    </ViewModeContext.Provider>
  );
}

export function useViewMode() {
  const ctx = useContext(ViewModeContext);
  if (!ctx) throw new Error('useViewMode must be used within ViewModeProvider');
  return ctx;
}
