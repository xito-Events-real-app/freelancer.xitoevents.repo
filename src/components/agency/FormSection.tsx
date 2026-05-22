import { useState } from 'react';
import { ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';

interface FormSectionProps {
  icon: React.ReactNode;
  title: string;
  gradientFrom: string;
  gradientTo: string;
  borderColor: string;
  defaultOpen?: boolean;
  children: React.ReactNode;
}

export default function FormSection({
  icon,
  title,
  gradientFrom,
  gradientTo,
  borderColor,
  defaultOpen = true,
  children,
}: FormSectionProps) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <div className={cn('rounded-2xl border overflow-hidden', borderColor)}>
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className={cn(
          'w-full flex items-center justify-between px-4 py-3 bg-gradient-to-r',
          gradientFrom,
          gradientTo
        )}
      >
        <div className="flex items-center gap-2.5">
          {icon}
          <span className="text-sm font-semibold text-white">{title}</span>
        </div>
        <ChevronDown
          className={cn(
            'w-4 h-4 text-slate-400 transition-transform',
            open && 'rotate-180'
          )}
        />
      </button>
      {open && <div className="p-4 bg-slate-800/40 space-y-4">{children}</div>}
    </div>
  );
}
