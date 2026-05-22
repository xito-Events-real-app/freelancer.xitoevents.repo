import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import FinancePinGate from '@/components/company/FinancePinGate';
import {
  clearFinanceSession,
  getStoredFinanceSession,
  useVerifyFinanceSession,
} from '@/hooks/useAgencyFinance';

interface FinanceVisibilityValue {
  revealed: boolean;
  unlock: () => void;
  lock: () => void;
}

const FinanceVisibilityContext = createContext<FinanceVisibilityValue | null>(null);

const AUTO_LOCK_MS = 5 * 60 * 1000; // 5 minutes of inactivity

export function FinanceVisibilityProvider({ children }: { children: ReactNode }) {
  const [revealed, setRevealed] = useState(false);
  const [pinOpen, setPinOpen] = useState(false);
  const verifySession = useVerifyFinanceSession();
  const timerRef = useRef<number | null>(null);

  const lock = useCallback(() => {
    setRevealed(false);
    clearFinanceSession();
    if (timerRef.current) {
      window.clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  const scheduleAutoLock = useCallback(() => {
    if (timerRef.current) window.clearTimeout(timerRef.current);
    timerRef.current = window.setTimeout(() => lock(), AUTO_LOCK_MS);
  }, [lock]);

  // Try to restore an existing finance session silently on mount.
  useEffect(() => {
    const stored = getStoredFinanceSession();
    if (!stored?.token) return;
    verifySession.mutate(stored.token, {
      onSuccess: (valid) => {
        if (valid) {
          setRevealed(true);
          scheduleAutoLock();
        } else {
          clearFinanceSession();
        }
      },
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Reset auto-lock on user activity while revealed.
  useEffect(() => {
    if (!revealed) return;
    const reset = () => scheduleAutoLock();
    window.addEventListener('pointerdown', reset, { passive: true });
    window.addEventListener('keydown', reset);
    return () => {
      window.removeEventListener('pointerdown', reset);
      window.removeEventListener('keydown', reset);
    };
  }, [revealed, scheduleAutoLock]);

  const unlock = useCallback(() => {
    if (revealed) return;
    setPinOpen(true);
  }, [revealed]);

  const value = useMemo<FinanceVisibilityValue>(() => ({ revealed, unlock, lock }), [revealed, unlock, lock]);

  return (
    <FinanceVisibilityContext.Provider value={value}>
      {children}
      <Dialog open={pinOpen} onOpenChange={setPinOpen}>
        <DialogContent className="max-w-md p-0 bg-transparent border-0 shadow-none">
          <DialogHeader className="sr-only">
            <DialogTitle>Finance PIN</DialogTitle>
          </DialogHeader>
          <FinancePinGate
            compact
            title="Unlock amounts"
            onUnlocked={() => {
              setRevealed(true);
              setPinOpen(false);
              scheduleAutoLock();
            }}
          />
        </DialogContent>
      </Dialog>
    </FinanceVisibilityContext.Provider>
  );
}

export function useFinanceVisibility(): FinanceVisibilityValue {
  const ctx = useContext(FinanceVisibilityContext);
  if (!ctx) {
    // Safe fallback so isolated renders don't crash; values stay masked.
    return { revealed: false, unlock: () => {}, lock: () => {} };
  }
  return ctx;
}
