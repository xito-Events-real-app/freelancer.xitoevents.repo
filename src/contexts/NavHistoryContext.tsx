import { createContext, useContext, useEffect, useRef, type ReactNode } from "react";
import { useLocation } from "react-router-dom";

interface NavHistoryContextType {
  /** Number of in-app navigations that have happened in this session. */
  getCount: () => number;
}

const NavHistoryContext = createContext<NavHistoryContextType | undefined>(undefined);

export function NavHistoryProvider({ children }: { children: ReactNode }) {
  const location = useLocation();
  const countRef = useRef(0);
  const lastKeyRef = useRef<string | null>(null);

  useEffect(() => {
    // Only increment when the route key actually changes (avoid double-mount in StrictMode).
    if (lastKeyRef.current !== location.key) {
      countRef.current += 1;
      lastKeyRef.current = location.key;
    }
  }, [location.key]);

  return (
    <NavHistoryContext.Provider value={{ getCount: () => countRef.current }}>
      {children}
    </NavHistoryContext.Provider>
  );
}

export function useNavHistory() {
  const ctx = useContext(NavHistoryContext);
  // Safe fallback if provider is missing — treat as no history.
  if (!ctx) return { getCount: () => 1 };
  return ctx;
}
