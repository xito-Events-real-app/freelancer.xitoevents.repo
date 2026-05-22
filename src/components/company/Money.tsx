import { Eye, EyeOff } from 'lucide-react';
import { cn } from '@/lib/utils';
import { formatNpr, NPR_MASK } from '@/lib/formatNpr';
import { useFinanceVisibility } from '@/contexts/FinanceVisibilityContext';

interface MoneyProps {
  amount: number | null | undefined;
  className?: string;
  /** Render an inline eye toggle button after the amount. */
  showToggle?: boolean;
  /** Hide the NPR prefix. */
  symbolless?: boolean;
  /** Add the legacy "/-" suffix. */
  withSuffix?: boolean;
}

/** Currency renderer that masks the value until the Finance PIN is unlocked. */
export default function Money({ amount, className, showToggle = false, symbolless = false, withSuffix = false }: MoneyProps) {
  const { revealed, unlock, lock } = useFinanceVisibility();
  const text = revealed
    ? `${formatNpr(amount, { withSymbol: !symbolless })}${withSuffix ? '/-' : ''}`
    : (symbolless ? '••••••' : NPR_MASK);

  return (
    <span className={cn('inline-flex items-center gap-1.5', className)}>
      <span className={cn(!revealed && 'tracking-widest')}>{text}</span>
      {showToggle && (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            revealed ? lock() : unlock();
          }}
          className="opacity-70 hover:opacity-100 transition-opacity"
          aria-label={revealed ? 'Hide amount' : 'Reveal amount'}
        >
          {revealed ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
        </button>
      )}
    </span>
  );
}
