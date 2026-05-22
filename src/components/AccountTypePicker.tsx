import { ACCOUNT_TYPES, AccountTypeKey } from '@/lib/constants';
import { Camera, Package, ShoppingBag, Printer, Building2 } from 'lucide-react';

const ICONS: Record<string, React.ReactNode> = {
  Camera: <Camera className="w-6 h-6" />,
  Package: <Package className="w-6 h-6" />,
  ShoppingBag: <ShoppingBag className="w-6 h-6" />,
  Printer: <Printer className="w-6 h-6" />,
  Building2: <Building2 className="w-6 h-6" />,
};

const ENABLED_TYPES: AccountTypeKey[] = ['solo_creative', 'agency'];

export default function AccountTypePicker({ selected, onSelect }: { selected: AccountTypeKey | ''; onSelect: (t: AccountTypeKey) => void }) {
  return (
    <div className="space-y-3">
      <p className="text-sm text-muted-foreground">What best describes you?</p>
      <div className="grid gap-3">
        {ACCOUNT_TYPES.map(t => {
          const enabled = ENABLED_TYPES.includes(t.key);
          return (
            <button
              key={t.key}
              onClick={() => enabled && onSelect(t.key)}
              disabled={!enabled}
              className={`relative flex items-center gap-4 p-4 rounded-xl border-2 text-left transition-all ${
                !enabled
                  ? 'opacity-40 pointer-events-none border-border bg-card'
                  : selected === t.key
                    ? 'border-primary bg-primary/10'
                    : 'border-border bg-card hover:border-muted-foreground/30'
              }`}
            >
              <div className={`p-2 rounded-lg ${selected === t.key && enabled ? 'bg-primary/20 text-primary' : 'bg-muted text-muted-foreground'}`}>
                {ICONS[t.icon]}
              </div>
              <div className="flex-1">
                <p className="font-semibold text-sm text-foreground">{t.label}</p>
                <p className="text-xs text-muted-foreground">{t.description}</p>
              </div>
              {!enabled && (
                <span className="text-[10px] font-semibold text-muted-foreground bg-muted px-2 py-0.5 rounded-full">
                  Coming soon
                </span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
