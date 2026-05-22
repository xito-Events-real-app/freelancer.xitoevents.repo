import { useEffect, useState } from 'react';
import { Download, Share } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

type BIPEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
};

function isStandalone() {
  if (typeof window === 'undefined') return false;
  return (
    window.matchMedia?.('(display-mode: standalone)').matches ||
    // iOS Safari
    (window.navigator as any).standalone === true
  );
}

function isIOS() {
  if (typeof navigator === 'undefined') return false;
  return /iPad|iPhone|iPod/.test(navigator.userAgent) && !(window as any).MSStream;
}

interface Props {
  className?: string;
  variant?: 'default' | 'outline' | 'ghost';
  size?: 'default' | 'sm' | 'lg';
}

export default function InstallAppButton({ className, variant = 'default', size = 'default' }: Props) {
  const [deferred, setDeferred] = useState<BIPEvent | null>(null);
  const [installed, setInstalled] = useState(false);
  const [showIosHint, setShowIosHint] = useState(false);
  const ios = isIOS();

  useEffect(() => {
    if (isStandalone()) {
      setInstalled(true);
      return;
    }
    const onBIP = (e: Event) => {
      e.preventDefault();
      setDeferred(e as BIPEvent);
    };
    const onInstalled = () => {
      setInstalled(true);
      setDeferred(null);
    };
    window.addEventListener('beforeinstallprompt', onBIP);
    window.addEventListener('appinstalled', onInstalled);
    return () => {
      window.removeEventListener('beforeinstallprompt', onBIP);
      window.removeEventListener('appinstalled', onInstalled);
    };
  }, []);

  if (installed) return null;

  // iOS path
  if (ios && !deferred) {
    return (
      <div className={cn('inline-flex flex-col gap-2', className)}>
        <Button
          type="button"
          variant={variant}
          size={size}
          onClick={() => setShowIosHint(v => !v)}
          className="gap-2"
        >
          <Download className="h-4 w-4" />
          Install App
        </Button>
        {showIosHint && (
          <div className="text-xs text-muted-foreground bg-muted/60 border border-border rounded-lg p-3 max-w-xs">
            <div className="flex items-center gap-1.5 font-semibold text-foreground mb-1">
              <Share className="h-3.5 w-3.5" /> In Safari, tap Share
            </div>
            Then choose <span className="font-semibold">“Add to Home Screen”</span>.
          </div>
        )}
      </div>
    );
  }

  if (!deferred) return null;

  return (
    <Button
      type="button"
      variant={variant}
      size={size}
      className={cn('gap-2', className)}
      onClick={async () => {
        try {
          await deferred.prompt();
          const choice = await deferred.userChoice;
          if (choice.outcome === 'accepted') setInstalled(true);
          setDeferred(null);
        } catch {
          setDeferred(null);
        }
      }}
    >
      <Download className="h-4 w-4" />
      Install App
    </Button>
  );
}
