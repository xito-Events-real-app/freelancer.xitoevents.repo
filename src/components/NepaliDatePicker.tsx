import { useState, useMemo, useCallback } from 'react';
import { ChevronLeft, ChevronRight, CalendarDays } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
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

const WEEKDAYS = ["S", "M", "T", "W", "T", "F", "S"];

interface NepaliDatePickerProps {
  /** Called when a date is picked. Returns AD string (YYYY-MM-DD) and BS display info */
  onDateSelect: (adDate: string, bsDisplay: string, bs: NepaliDateObject) => void;
  /** Dates already picked (AD strings) to show as disabled */
  disabledDates?: Set<string>;
  /** Custom trigger label */
  triggerLabel?: string;
}

export default function NepaliDatePicker({ onDateSelect, disabledDates, triggerLabel }: NepaliDatePickerProps) {
  const currentBS = useMemo(() => getCurrentBSDate(), []);
  const [navYear, setNavYear] = useState(currentBS.year);
  const [navMonth, setNavMonth] = useState(currentBS.month);
  const [open, setOpen] = useState(false);

  const daysInMonth = getDaysInBSMonth(navYear, navMonth);
  const firstDayWeekday = getFirstDayOfBSMonth(navYear, navMonth);
  const monthName = nepaliMonthsEnglish[navMonth - 1] || "";

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

  const handleDayClick = (day: number) => {
    const adStr = bsToADString(navYear, navMonth, day);
    const bs: NepaliDateObject = { year: navYear, month: navMonth, day };
    const bsDisplay = formatBSDate(bs);
    onDateSelect(adStr, bsDisplay, bs);
    setOpen(false);
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="outline" className="justify-start text-left rounded-xl gap-2">
          <CalendarDays className="w-4 h-4" />
          {triggerLabel || 'Add Date (BS)'}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start">
        <div className="p-4 w-[280px]">
          {/* Month Nav */}
          <div className="flex items-center justify-between mb-3">
            <button onClick={handlePrevMonth} className="p-1.5 rounded-lg hover:bg-accent transition-colors">
              <ChevronLeft className="w-4 h-4" />
            </button>
            <p className="text-sm font-bold">{monthName} {navYear}</p>
            <button onClick={handleNextMonth} className="p-1.5 rounded-lg hover:bg-accent transition-colors">
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          {/* Weekday headers */}
          <div className="grid grid-cols-7 gap-1 mb-1">
            {WEEKDAYS.map((d, i) => (
              <div key={i} className="text-center text-[10px] font-semibold text-muted-foreground py-0.5">{d}</div>
            ))}
          </div>

          {/* Day grid */}
          <div className="grid grid-cols-7 gap-1">
            {Array.from({ length: firstDayWeekday }).map((_, i) => (
              <div key={`e-${i}`} className="aspect-square" />
            ))}
            {Array.from({ length: daysInMonth }).map((_, i) => {
              const day = i + 1;
              const past = isPast(day);
              const adStr = !past ? bsToADString(navYear, navMonth, day) : '';
              const alreadyPicked = !past && disabledDates?.has(adStr);
              const isToday = navYear === currentBS.year && navMonth === currentBS.month && day === currentBS.day;

              return (
                <button
                  key={day}
                  onClick={() => !past && !alreadyPicked && handleDayClick(day)}
                  disabled={past || !!alreadyPicked}
                  className={cn(
                    "aspect-square rounded-lg flex items-center justify-center text-xs font-medium transition-all",
                    past
                      ? "text-muted-foreground/30 cursor-not-allowed"
                      : alreadyPicked
                        ? "bg-primary/20 text-primary cursor-not-allowed"
                        : isToday
                          ? "bg-accent text-accent-foreground font-bold"
                          : "hover:bg-accent text-foreground"
                  )}
                >
                  {day}
                </button>
              );
            })}
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}
