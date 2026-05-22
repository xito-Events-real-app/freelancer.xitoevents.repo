import { useMemo, useState } from 'react';
import { format } from 'date-fns';
import { CalendarIcon, ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { cn } from '@/lib/utils';
import {
  adToBS,
  bsToADString,
  formatBSDate,
  getCurrentBSDate,
  getDaysInBSMonth,
  getFirstDayOfBSMonth,
  nepaliMonthsEnglish,
  type NepaliDateObject,
} from '@/lib/nepaliCalendar';

export type XitoDateValue = {
  adDate: string;
  bsDisplay: string;
};

interface Props {
  value: XitoDateValue;
  onChange: (value: XitoDateValue) => void;
  className?: string;
  disablePast?: boolean;
}

const WEEKDAYS = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];

function toDateString(date: Date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export function makeXitoDateValue(date = new Date()): XitoDateValue {
  return { adDate: toDateString(date), bsDisplay: formatBSDate(adToBS(date)) };
}

export default function XitoDatePicker({ value, onChange, className, disablePast = false }: Props) {
  const selectedDate = useMemo(() => new Date(`${value.adDate}T00:00:00`), [value.adDate]);
  const selectedBS = useMemo(() => adToBS(selectedDate), [selectedDate]);
  const currentBS = useMemo(() => getCurrentBSDate(), []);
  const [mode, setMode] = useState<'bs' | 'ad'>('bs');
  const [navYear, setNavYear] = useState(selectedBS.year);
  const [navMonth, setNavMonth] = useState(selectedBS.month);

  const daysInMonth = getDaysInBSMonth(navYear, navMonth);
  const firstDayWeekday = getFirstDayOfBSMonth(navYear, navMonth);
  const monthName = nepaliMonthsEnglish[navMonth - 1] || '';

  const selectBS = (bs: NepaliDateObject) => {
    onChange({ adDate: bsToADString(bs.year, bs.month, bs.day), bsDisplay: formatBSDate(bs) });
  };

  const isPastBS = (day: number) => {
    if (!disablePast) return false;
    if (navYear < currentBS.year) return true;
    if (navYear === currentBS.year && navMonth < currentBS.month) return true;
    return navYear === currentBS.year && navMonth === currentBS.month && day < currentBS.day;
  };

  return (
    <div className={cn('rounded-2xl border border-border bg-card/80 p-4 shadow-sm', className)}>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-xs font-bold uppercase text-muted-foreground">Payment Date</p>
          <p className="text-sm font-semibold text-foreground">{value.bsDisplay} · {value.adDate}</p>
        </div>
        <div className="grid grid-cols-2 rounded-full border border-border bg-muted p-1">
          <button type="button" onClick={() => setMode('bs')} className={cn('rounded-full px-4 py-1.5 text-xs font-bold uppercase transition-all', mode === 'bs' ? 'bg-accent text-accent-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground')}>BS</button>
          <button type="button" onClick={() => setMode('ad')} className={cn('rounded-full px-4 py-1.5 text-xs font-bold uppercase transition-all', mode === 'ad' ? 'bg-accent text-accent-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground')}>AD</button>
        </div>
      </div>

      {mode === 'ad' ? (
        <Popover>
          <PopoverTrigger asChild>
            <Button type="button" variant="outline" className="h-12 w-full justify-start rounded-xl border-border bg-background/70 text-left font-semibold">
              <CalendarIcon className="mr-2 h-4 w-4 text-accent" />
              {format(selectedDate, 'PPP')}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="start">
            <Calendar
              mode="single"
              selected={selectedDate}
              onSelect={(date) => date && onChange(makeXitoDateValue(date))}
              disabled={disablePast ? (date) => date < new Date(new Date().toDateString()) : undefined}
              initialFocus
              className="pointer-events-auto p-3"
            />
          </PopoverContent>
        </Popover>
      ) : (
        <div>
          <div className="mb-3 flex items-center justify-between">
            <Button type="button" variant="ghost" size="icon" className="h-9 w-9 rounded-full" onClick={() => navMonth === 1 ? (setNavMonth(12), setNavYear(y => y - 1)) : setNavMonth(m => m - 1)}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <p className="text-sm font-black uppercase tracking-wide">{monthName} {navYear}</p>
            <Button type="button" variant="ghost" size="icon" className="h-9 w-9 rounded-full" onClick={() => navMonth === 12 ? (setNavMonth(1), setNavYear(y => y + 1)) : setNavMonth(m => m + 1)}>
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
          <div className="grid grid-cols-7 gap-1.5">
            {WEEKDAYS.map((d, i) => <div key={i} className="py-1 text-center text-[10px] font-bold text-muted-foreground">{d}</div>)}
            {Array.from({ length: firstDayWeekday }).map((_, i) => <div key={`e-${i}`} className="aspect-square" />)}
            {Array.from({ length: daysInMonth }).map((_, i) => {
              const day = i + 1;
              const selected = selectedBS.year === navYear && selectedBS.month === navMonth && selectedBS.day === day;
              const today = currentBS.year === navYear && currentBS.month === navMonth && currentBS.day === day;
              const past = isPastBS(day);
              return (
                <button
                  key={day}
                  type="button"
                  disabled={past}
                  onClick={() => selectBS({ year: navYear, month: navMonth, day })}
                  className={cn('aspect-square rounded-xl text-sm font-bold transition-all', past ? 'cursor-not-allowed text-muted-foreground/40' : selected ? 'bg-accent text-accent-foreground shadow-md' : today ? 'bg-primary/15 text-primary' : 'text-foreground hover:bg-muted')}
                >
                  {day}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
