import { useState, useMemo, useCallback } from 'react';
import { ChevronLeft, ChevronRight, X, Check, CalendarPlus } from 'lucide-react';
import {
  getCurrentBSDate,
  getDaysInBSMonth,
  getFirstDayOfBSMonth,
  nepaliMonthsEnglish,
  bsToADString,
} from '@/lib/nepaliCalendar';

const WEEKDAYS = ["S", "M", "T", "W", "T", "F", "S"];

interface MultiDatePickerProps {
  open: boolean;
  onClose: () => void;
  onSave: (bookings: { adDate: string; eventName: string }[]) => void;
  saving?: boolean;
  bookedAdDates?: Set<string>;
}

export default function MultiDatePicker({ open, onClose, onSave, saving, bookedAdDates }: MultiDatePickerProps) {
  const currentBS = useMemo(() => getCurrentBSDate(), []);
  const [navYear, setNavYear] = useState(currentBS.year);
  const [navMonth, setNavMonth] = useState(currentBS.month);
  const [selectedDates, setSelectedDates] = useState<Set<string>>(new Set());
  const [eventNames, setEventNames] = useState<Record<string, string>>({});
  const [step, setStep] = useState<'select' | 'name'>('select');

  const daysInMonth = getDaysInBSMonth(navYear, navMonth);
  const firstDayWeekday = getFirstDayOfBSMonth(navYear, navMonth);
  const monthName = nepaliMonthsEnglish[navMonth - 1] || "";

  const dateKey = (y: number, m: number, d: number) => `${y}-${m}-${d}`;

  // Check if a BS day is already booked
  const isDayBooked = useCallback((day: number) => {
    if (!bookedAdDates) return false;
    const adStr = bsToADString(navYear, navMonth, day);
    return bookedAdDates.has(adStr);
  }, [navYear, navMonth, bookedAdDates]);

  const toggleDate = useCallback((day: number) => {
    const key = dateKey(navYear, navMonth, day);
    setSelectedDates(prev => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }, [navYear, navMonth]);

  const handlePrevMonth = () => {
    if (navMonth === 1) { setNavMonth(12); setNavYear(y => y - 1); }
    else setNavMonth(m => m - 1);
  };

  const handleNextMonth = () => {
    if (navMonth === 12) { setNavMonth(1); setNavYear(y => y + 1); }
    else setNavMonth(m => m + 1);
  };

  const handleContinue = () => {
    if (selectedDates.size === 0) return;
    setStep('name');
  };

  const handleSave = () => {
    const sortedKeys = Array.from(selectedDates).sort();
    const bookings = sortedKeys.map(key => {
      const [y, m, d] = key.split('-').map(Number);
      return {
        adDate: bsToADString(y, m, d),
        eventName: eventNames[key]?.trim() || 'Untitled Event',
      };
    });
    onSave(bookings);
  };

  const handleClose = () => {
    setSelectedDates(new Set());
    setEventNames({});
    setStep('select');
    onClose();
  };

  const isPast = useCallback((day: number) => {
    if (navYear < currentBS.year) return true;
    if (navYear === currentBS.year && navMonth < currentBS.month) return true;
    if (navYear === currentBS.year && navMonth === currentBS.month && day < currentBS.day) return true;
    return false;
  }, [navYear, navMonth, currentBS]);

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
            <CalendarPlus className="w-4 h-4 text-emerald-400" />
            {step === 'select' ? 'Select Multiple Dates' : 'Name Your Events'}
          </h3>
          <button onClick={handleClose} className="p-1.5 rounded-lg text-white/40 hover:text-white hover:bg-white/10 transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>

        {step === 'select' ? (
          <>
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
                  <div key={i} className="text-center text-[10px] font-semibold text-violet-400 py-0.5">{d}</div>
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
                  const past = isPast(day);
                  const booked = isDayBooked(day);

                  return (
                    <button
                      key={day}
                      onClick={() => !past && toggleDate(day)}
                      disabled={past}
                      className={`aspect-square rounded-lg flex flex-col items-center justify-center text-xs font-medium transition-all relative
                        ${past
                          ? "text-white/15 cursor-not-allowed"
                          : isSelected
                            ? "bg-emerald-500 text-white font-bold shadow-md shadow-emerald-500/30"
                            : isToday
                              ? "bg-rose-500/80 text-white font-bold ring-1 ring-rose-400/50"
                              : booked
                                ? "bg-amber-500/20 text-amber-300 hover:bg-amber-500/30"
                                : "text-white/60 hover:bg-white/10"
                        }`}
                    >
                      {day}
                      {booked && !isSelected && (
                        <span className="w-1 h-1 rounded-full bg-amber-400 mt-0.5" />
                      )}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Legend */}
            <div className="flex items-center gap-3 mb-3 text-[10px] text-white/40">
              <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-amber-400" /> Already booked</span>
              <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-emerald-500" /> Selected</span>
            </div>

            {/* Selected count + Continue */}
            <div className="flex items-center justify-between">
              <p className="text-xs text-white/50">
                {selectedDates.size === 0
                  ? "Tap dates to select"
                  : `${selectedDates.size} date${selectedDates.size > 1 ? 's' : ''} selected`}
              </p>
              <button
                onClick={handleContinue}
                disabled={selectedDates.size === 0}
                className="px-4 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-600 disabled:opacity-30 text-white text-xs font-semibold transition-colors flex items-center gap-1.5"
              >
                Continue
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </>
        ) : (
          <>
            {/* Per-date event names */}
            <div className="space-y-3 max-h-[50vh] overflow-y-auto pr-1">
              {Array.from(selectedDates).sort().map(key => {
                const [y, m, d] = key.split('-').map(Number);
                const monthLabel = nepaliMonthsEnglish[m - 1] || '';
                return (
                  <div key={key} className="flex items-center gap-3 bg-white/5 rounded-xl p-3">
                    <div className="shrink-0 w-24">
                      <p className="text-sm font-bold text-emerald-400">{monthLabel} {d}</p>
                      <p className="text-[10px] text-white/40">{y} BS</p>
                    </div>
                    <input
                      value={eventNames[key] || ''}
                      onChange={e => setEventNames(prev => ({ ...prev, [key]: e.target.value }))}
                      placeholder="Event name"
                      className="flex-1 h-9 rounded-lg bg-white/10 border border-white/10 px-3 text-sm text-white placeholder:text-white/30 focus:outline-none focus:ring-1 focus:ring-emerald-400"
                    />
                  </div>
                );
              })}
            </div>

            <div className="flex gap-2 mt-3">
              <button
                onClick={() => setStep('select')}
                className="flex-1 py-2.5 rounded-xl bg-white/10 text-white text-xs font-semibold hover:bg-white/15 transition-colors"
              >
                Back
              </button>
              <button
                onClick={handleSave}
                disabled={saving}
                className="flex-1 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-600 disabled:opacity-40 text-white text-xs font-semibold transition-colors flex items-center justify-center gap-1.5"
              >
                <Check className="w-3.5 h-3.5" />
                {saving ? 'Saving...' : 'Save All'}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
