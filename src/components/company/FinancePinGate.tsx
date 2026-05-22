import { useEffect, useState } from 'react';
import { Lock, ShieldCheck } from 'lucide-react';
import {
  clearFinanceSession,
  getStoredFinanceSession,
  storeFinanceSession,
  useFinancePinStatus,
  useSetFinancePin,
  useVerifyFinancePin,
  useVerifyFinanceSession,
} from '@/hooks/useAgencyFinance';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { toast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';

const isSixDigitPin = (pin: string) => /^\d{6}$/.test(pin);

interface Props {
  /** Called as soon as the user has a valid finance session (from cache or fresh entry). */
  onUnlocked: () => void;
  /** Optional title shown above the gate. */
  title?: string;
  /** When true, render an inline card (for use inside a dialog) instead of full-screen. */
  compact?: boolean;
}

/**
 * Full-screen finance PIN gate. Reuses the existing 10-minute session token
 * machinery so unlocking here also unlocks `FinanceEditDialog` and vice-versa.
 */
export default function FinancePinGate({ onUnlocked, title = 'Finance Manager Locked', compact = false }: Props) {
  const { data: hasPin = false, isLoading: pinStatusLoading } = useFinancePinStatus();
  const setPin = useSetFinancePin();
  const verifyPin = useVerifyFinancePin();
  const verifySession = useVerifyFinanceSession();

  const [pin, setPinValue] = useState('');
  const [confirmPin, setConfirmPin] = useState('');
  const [checkingSession, setCheckingSession] = useState(true);

  // On mount, try to reuse a stored finance session before asking for the PIN.
  useEffect(() => {
    const stored = getStoredFinanceSession();
    if (!stored?.token) {
      setCheckingSession(false);
      return;
    }
    verifySession.mutate(stored.token, {
      onSuccess: (valid) => {
        setCheckingSession(false);
        if (valid) {
          onUnlocked();
        } else {
          clearFinanceSession();
        }
      },
      onError: () => {
        setCheckingSession(false);
        clearFinanceSession();
      },
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleSetPin = async () => {
    if (!isSixDigitPin(pin) || pin !== confirmPin) {
      toast({ title: 'PIN setup failed', description: 'Enter the same 6 digit PIN in both fields.' });
      return;
    }
    try {
      const result = await setPin.mutateAsync(pin);
      if (!result.success || !result.sessionToken) throw new Error(result.message || 'Please try again.');
      storeFinanceSession(result);
      toast({ title: 'Finance PIN set', description: 'Unlocked for 10 minutes.' });
      onUnlocked();
    } catch (error) {
      toast({ title: 'PIN setup failed', description: error instanceof Error ? error.message : 'Please try again.' });
    }
  };

  const handleVerifyPin = async () => {
    if (!isSixDigitPin(pin)) {
      toast({ title: 'Invalid PIN', description: 'Enter your 6 digit finance PIN.' });
      return;
    }
    try {
      const result = await verifyPin.mutateAsync(pin);
      if (!result.success || !result.sessionToken) {
        toast({ title: 'PIN not verified', description: result.message || 'Please try again.' });
        return;
      }
      storeFinanceSession(result);
      toast({ title: 'Finance unlocked', description: 'PIN will not be asked again for 10 minutes.' });
      onUnlocked();
    } catch (error) {
      toast({ title: 'PIN not verified', description: error instanceof Error ? error.message : 'Please try again.' });
    }
  };

  if (checkingSession || pinStatusLoading) {
    return (
      <div className={compact ? 'flex items-center justify-center py-12' : 'min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-emerald-950/20 to-slate-900'}>
        <div className="w-8 h-8 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const settingUp = !hasPin;
  const Icon = settingUp ? ShieldCheck : Lock;

  const inner = (
    <div className={compact
      ? 'w-full rounded-2xl border border-border bg-card p-6 shadow-sm'
      : 'w-full max-w-md rounded-3xl border border-emerald-500/30 bg-slate-900/80 p-8 shadow-2xl shadow-emerald-950/40 backdrop-blur'}>
      <div className="flex flex-col items-center text-center mb-6">
        <div className={cn(
          'w-14 h-14 rounded-2xl flex items-center justify-center mb-4',
          compact ? 'bg-emerald-100 border border-emerald-200' : 'bg-emerald-500/15 border border-emerald-500/40'
        )}>
          <Icon className={cn('w-7 h-7', compact ? 'text-emerald-600' : 'text-emerald-400')} />
        </div>
        <h1 className={cn('text-xl font-black uppercase tracking-wide', compact ? 'text-foreground' : 'text-white')}>{title}</h1>
        <p className={cn('text-sm mt-1', compact ? 'text-muted-foreground' : 'text-emerald-300/80')}>
          {settingUp
            ? 'Set a 6-digit finance PIN to protect this section.'
            : 'Enter your 6-digit finance PIN to continue.'}
        </p>
      </div>

      <div className="space-y-4">
        <div className="space-y-2">
          <Label className={cn('text-xs font-black uppercase', compact ? 'text-muted-foreground' : 'text-emerald-300/80')}>
            {settingUp ? 'New PIN' : '6 digit PIN'}
          </Label>
          <Input
            inputMode="numeric"
            pattern="[0-9]*"
            maxLength={6}
            value={pin}
            onChange={(e) => setPinValue(e.target.value.replace(/\D/g, '').slice(0, 6))}
            placeholder="••••••"
            autoComplete="one-time-code"
            autoFocus
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !settingUp) handleVerifyPin();
            }}
            className={cn(
              'h-14 rounded-xl text-center text-2xl font-black tracking-[0.5em]',
              compact
                ? 'bg-background border-border text-foreground placeholder:text-muted-foreground/40'
                : 'bg-slate-800 border-emerald-500/30 text-white placeholder:text-emerald-700'
            )}
          />
        </div>

        {settingUp && (
          <div className="space-y-2">
            <Label className={cn('text-xs font-black uppercase', compact ? 'text-muted-foreground' : 'text-emerald-300/80')}>Confirm PIN</Label>
            <Input
              inputMode="numeric"
              pattern="[0-9]*"
              maxLength={6}
              value={confirmPin}
              onChange={(e) => setConfirmPin(e.target.value.replace(/\D/g, '').slice(0, 6))}
              placeholder="••••••"
              autoComplete="one-time-code"
              className={cn(
                'h-14 rounded-xl text-center text-2xl font-black tracking-[0.5em]',
                compact
                  ? 'bg-background border-border text-foreground placeholder:text-muted-foreground/40'
                  : 'bg-slate-800 border-emerald-500/30 text-white placeholder:text-emerald-700'
              )}
            />
          </div>
        )}

        <Button
          className="h-12 w-full rounded-xl font-black uppercase bg-emerald-500 hover:bg-emerald-400 text-emerald-950"
          onClick={settingUp ? handleSetPin : handleVerifyPin}
          disabled={settingUp ? setPin.isPending : verifyPin.isPending}
        >
          {settingUp ? 'Set PIN & Unlock' : 'Unlock'}
        </Button>
      </div>
    </div>
  );

  if (compact) return inner;

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-emerald-950/20 to-slate-900 px-4">
      {inner}
    </div>
  );
}
