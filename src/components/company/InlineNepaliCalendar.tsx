import { useState, useMemo, useCallback } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import {
  getCurrentBSDate,
  getDaysInBSMonth,
  getFirstDayOfBSMonth,
  nepaliMonthsEnglish,
  bsToADString,
  formatBSDate,
  type NepaliDateObject,
} from '@/lib/nepaliCalendar';
import { cn } from '@/lib/utils';

const WEEKDAYS = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];

interface Props {
  selectedDates: Set<string>; // AD strings
  onToggleDate: (adDate: string, bsDisplay: string, bs: NepaliDateObject) => void;
}

export default function InlineNepaliCalendar({ selectedDates, onToggleDate }: Props) {
  const currentBS = useMemo(() => getCurrentBSDate(), []);
  const [navYear, setNavYear] = useState(currentBS.year);
  const [navMonth, setNavMonth] = useState(currentBS.month);

  const daysInMonth = getDaysInBSMonth(navYear, navMonth);
  const firstDayWeekday = getFirstDayOfBSMonth(navYear, navMonth);
  const monthName = nepaliMonthsEnglish[navMonth - 1] || '';

  const handlePrevMonth = () => {
    if (navMonth === 1) { setNavMonth(12); setNavYear(y => y - 1); }
    else setNavMonth(m => m - 1);
  };
  const handleNextMonth = () => {
    if (navMonth === 12) { setNavMonth(1); setNavYear(y => y + 1); }
    else setNavMonth(m => m + 1);
  };

  const isPast = useCallback((day: number) => {
    if (navYear < currentBS.year) return true;
    if (navYear === currentBS.year && navMonth < currentBS.month) return true;
    if (navYear === currentBS.year && navMonth === currentBS.month && day < currentBS.day) return true;
    return false;
  }, [navYear, navMonth, currentBS]);

  return (
    <div className="w-full">
      <div className="flex items-center justify-between mb-3">
        <button type="button" onClick={handlePrevMonth} className="p-1.5 rounded-lg hover:bg-white/10 transition-colors">
          <ChevronLeft className="w-4 h-4" />
        </button>
        <p className="text-sm font-bold">{monthName} {navYear}</p>
        <button type="button" onClick={handleNextMonth} className="p-1.5 rounded-lg hover:bg-white/10 transition-colors">
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>

      <div className="grid grid-cols-7 gap-1 mb-1">
        {WEEKDAYS.map((d, i) => (
          <div key={i} className="text-center text-[10px] font-semibold text-muted-foreground py-0.5">{d}</div>
        ))}
      </div>

      <div className="grid grid-cols-7 gap-1">
        {Array.from({ length: firstDayWeekday }).map((_, i) => (
          <div key={`e-${i}`} className="aspect-square" />
        ))}
        {Array.from({ length: daysInMonth }).map((_, i) => {
          const day = i + 1;
          const past = isPast(day);
          const adStr = bsToADString(navYear, navMonth, day);
          const selected = selectedDates.has(adStr);
          const isToday = navYear === currentBS.year && navMonth === currentBS.month && day === currentBS.day;

          return (
            <button
              key={day}
              type="button"
              onClick={() => {
                const bs: NepaliDateObject = { year: navYear, month: navMonth, day };
                onToggleDate(adStr, formatBSDate(bs), bs);
              }}
              className={cn(
                'aspect-square rounded-lg flex items-center justify-center text-xs font-medium transition-all',
                selected
                    ? 'bg-pink-500 text-white font-bold shadow-lg'
                    : isToday
                      ? 'bg-accent text-accent-foreground font-bold'
                      : past
                        ? 'text-muted-foreground hover:bg-accent/70'
                      : 'hover:bg-accent text-foreground'
              )}
            >
              {day}
            </button>
          );
        })}
      </div>
    </div>
  );
}
