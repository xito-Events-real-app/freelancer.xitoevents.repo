import { useState, useMemo, useCallback } from 'react';
import { ChevronLeft, ChevronRight, X, Search } from 'lucide-react';
import {
  getCurrentBSDate,
  getDaysInBSMonth,
  getFirstDayOfBSMonth,
  nepaliMonthsEnglish,
  bsToADString,
} from '@/lib/nepaliCalendar';

const WEEKDAYS = ["S", "M", "T", "W", "T", "F", "S"];

interface DateSearchPickerProps {
  open: boolean;
  onClose: () => void;
  onConfirm: (adDates: string[]) => void;
  initialDates?: string[]; // AD date strings
}

export default function DateSearchPicker({ open, onClose, onConfirm, initialDates = [] }: DateSearchPickerProps) {
  const currentBS = useMemo(() => getCurrentBSDate(), []);
  const [navYear, setNavYear] = useState(currentBS.year);
  const [navMonth, setNavMonth] = useState(currentBS.month);
  const [selectedDates, setSelectedDates] = useState<Set<string>>(new Set());
  // Map of dateKey -> adDate string
  const [dateMap, setDateMap] = useState<Record<string, string>>({});

  const daysInMonth = getDaysInBSMonth(navYear, navMonth);
  const firstDayWeekday = getFirstDayOfBSMonth(navYear, navMonth);
  const monthName = nepaliMonthsEnglish[navMonth - 1] || "";

  const dateKey = (y: number, m: number, d: number) => `${y}-${m}-${d}`;

  const toggleDate = useCallback((day: number) => {
    const key = dateKey(navYear, navMonth, day);
    const adDate = bsToADString(navYear, navMonth, day);
    setSelectedDates(prev => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
    setDateMap(prev => ({ ...prev, [key]: adDate }));
  }, [navYear, navMonth]);

  const handlePrevMonth = () => {
    if (navMonth === 1) { setNavMonth(12); setNavYear(y => y - 1); }
    else setNavMonth(m => m - 1);
  };

  const handleNextMonth = () => {
    if (navMonth === 12) { setNavMonth(1); setNavYear(y => y + 1); }
    else setNavMonth(m => m + 1);
  };

  const handleConfirm = () => {
    const adDates = Array.from(selectedDates).map(key => dateMap[key]).filter(Boolean);
    onConfirm(adDates);
    handleClose();
  };

  const handleClose = () => {
    setSelectedDates(new Set());
    setDateMap({});
    onClose();
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={handleClose}>
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
      <div
        className="relative w-full max-w-sm bg-slate-900 border border-white/10 rounded-2xl p-5 animate-in zoom-in-95 fade-in duration-200 shadow-2xl shadow-black/40"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-bold text-white flex items-center gap-2">
            <Search className="w-4 h-4 text-blue-400" />
            Search by Date
          </h3>
          <button onClick={handleClose} className="p-1.5 rounded-lg text-white/40 hover:text-white hover:bg-white/10 transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Month Nav */}
        <div className="flex items-center justify-between mb-3">
          <button onClick={handlePrevMonth} className="p-1.5 rounded-lg bg-white/10 hover:bg-white/20 transition-colors">
            <ChevronLeft className="w-4 h-4 text-white" />
          </button>
          <p className="text-sm font-bold text-white">{monthName} {navYear}</p>
          <button onClick={handleNextMonth} className="p-1.5 rounded-lg bg-white/10 hover:bg-white/20 transition-colors">
            <ChevronRight className="w-4 h-4 text-white" />
          </button>
        </div>

        {/* Calendar Grid */}
        <div className="bg-white/5 rounded-xl p-3 mb-4">
          <div className="grid grid-cols-7 gap-1.5 mb-2">
            {WEEKDAYS.map((d, i) => (
              <div key={i} className="text-center text-[10px] font-semibold text-blue-400 py-0.5">{d}</div>
            ))}
          </div>
          <div className="grid grid-cols-7 gap-1.5">
            {Array.from({ length: firstDayWeekday }).map((_, i) => (
              <div key={`e-${i}`} className="aspect-square" />
            ))}
            {Array.from({ length: daysInMonth }).map((_, i) => {
              const day = i + 1;
              const key = dateKey(navYear, navMonth, day);
              const isSelected = selectedDates.has(key);
              const isToday = navYear === currentBS.year && navMonth === currentBS.month && day === currentBS.day;

              return (
                <button
                  key={day}
                  onClick={() => toggleDate(day)}
                  className={`aspect-square rounded-lg flex items-center justify-center text-xs font-medium transition-all
                    ${isSelected
                      ? "bg-blue-500 text-white font-bold shadow-md shadow-blue-500/30"
                      : isToday
                        ? "bg-rose-500/80 text-white font-bold ring-1 ring-rose-400/50"
                        : "text-white/60 hover:bg-white/10"
                    }`}
                >
                  {day}
                </button>
              );
            })}
          </div>
        </div>

        {/* Selected count + actions */}
        <div className="flex items-center justify-between">
          <p className="text-xs text-white/50">
            {selectedDates.size === 0
              ? "Tap dates to search"
              : `${selectedDates.size} date${selectedDates.size > 1 ? 's' : ''} selected`}
          </p>
          <div className="flex gap-2">
            {selectedDates.size > 0 && (
              <button
                onClick={() => { setSelectedDates(new Set()); setDateMap({}); }}
                className="px-3 py-2 rounded-xl bg-white/10 text-white text-xs font-semibold hover:bg-white/15 transition-colors"
              >
                Clear
              </button>
            )}
            <button
              onClick={handleConfirm}
              disabled={selectedDates.size === 0}
              className="px-4 py-2 rounded-xl bg-blue-500 hover:bg-blue-600 disabled:opacity-30 text-white text-xs font-semibold transition-colors flex items-center gap-1.5"
            >
              <Search className="w-3.5 h-3.5" />
              Search
            </button>
          </div>
        </div>

        {/* Selected dates preview */}
        {selectedDates.size > 0 && (
          <div className="mt-3 flex flex-wrap gap-1.5 max-h-16 overflow-y-auto">
            {Array.from(selectedDates).sort().map(key => {
              const [y, m, d] = key.split('-').map(Number);
              return (
                <span key={key} className="text-[11px] bg-blue-500/20 text-blue-300 px-2 py-0.5 rounded-full">
                  {d} {nepaliMonthsEnglish[m - 1]?.slice(0, 3)} {y}
                </span>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
