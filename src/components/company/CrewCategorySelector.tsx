import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Users } from 'lucide-react';
import { CREW_COLUMNS, GROUP_COLORS } from '@/lib/crew-columns';
import { cn } from '@/lib/utils';

interface Props {
  selected: string[];
  onToggle: (key: string) => void;
}

export function CrewCategorySelector({ selected, onToggle }: Props) {
  const handleSelectAll = () => {
    CREW_COLUMNS.forEach(col => {
      if (!selected.includes(col.key)) onToggle(col.key);
    });
  };

  const handleClearAll = () => {
    selected.forEach(key => onToggle(key));
  };

  return (
    <Popover>
      <PopoverTrigger asChild>
        <button className={cn(
          'w-6 h-6 rounded-full flex items-center justify-center transition-all',
          selected.length > 0
            ? 'bg-violet-500 text-white shadow-md shadow-violet-500/30'
            : 'bg-muted text-muted-foreground hover:bg-muted/80'
        )}>
          <Users className="w-3 h-3" />
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-4" align="start">
        <div className="text-xs font-bold uppercase text-muted-foreground mb-3 tracking-wider">
          REQUIRED CREW
        </div>
        {/* Row 1: PB, PG, VB, VG, EP */}
        <div className="flex gap-3 mb-3 justify-center">
          {CREW_COLUMNS.slice(0, 5).map(col => {
            const gc = GROUP_COLORS[col.group];
            const isSelected = selected.includes(col.key);
            return (
              <button
                key={col.key}
                onClick={() => onToggle(col.key)}
                title={col.label}
                className="flex flex-col items-center gap-0.5"
              >
                <div className={cn(
                  'w-10 h-10 rounded-full flex items-center justify-center text-xs font-black transition-all border-2',
                  isSelected
                    ? `${gc.headerBg} ${gc.text} border-current shadow-md`
                    : 'bg-gray-100 text-gray-400 border-gray-200 hover:bg-gray-200'
                )}>
                  {col.shortCode}
                </div>
                <span className="text-[7px] text-muted-foreground leading-tight text-center max-w-[50px]">
                  {col.label}
                </span>
              </button>
            );
          })}
        </div>
        {/* Row 2: EV, Asst, iPhone, Drone, FPV */}
        <div className="flex gap-3 mb-3 justify-center">
          {CREW_COLUMNS.slice(5).map(col => {
            const gc = GROUP_COLORS[col.group];
            const isSelected = selected.includes(col.key);
            return (
              <button
                key={col.key}
                onClick={() => onToggle(col.key)}
                title={col.label}
                className="flex flex-col items-center gap-0.5"
              >
                <div className={cn(
                  'w-10 h-10 rounded-full flex items-center justify-center text-xs font-black transition-all border-2',
                  isSelected
                    ? `${gc.headerBg} ${gc.text} border-current shadow-md`
                    : 'bg-gray-100 text-gray-400 border-gray-200 hover:bg-gray-200'
                )}>
                  {col.shortCode}
                </div>
                <span className="text-[7px] text-muted-foreground leading-tight text-center max-w-[50px]">
                  {col.label}
                </span>
              </button>
            );
          })}
        </div>
        {/* Select All / Clear All */}
        <div className="flex items-center justify-center gap-3 pt-1 border-t border-gray-100">
          <button
            onClick={handleSelectAll}
            className="text-xs font-semibold text-blue-600 hover:text-blue-800 transition-colors"
          >
            Select All
          </button>
          <button
            onClick={handleClearAll}
            className="text-xs font-semibold text-red-500 hover:text-red-700 transition-colors"
          >
            Clear All
          </button>
        </div>
      </PopoverContent>
    </Popover>
  );
}
