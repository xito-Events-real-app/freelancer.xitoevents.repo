import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { X, Check, Volume2, VolumeX, CalendarHeart, Sparkles, ChevronLeft, ChevronRight } from 'lucide-react';
import {
  getCurrentBSDate,
  getDaysInBSMonth,
  getFirstDayOfBSMonth,
  nepaliMonthsEnglish,
  bsToADString,
} from '@/lib/nepaliCalendar';
import { useBookings, useAddMultipleBookings } from '@/hooks/useBookings';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { onOpenBookingPopup } from '@/lib/bookingPopupTrigger';

const SIX_HOURS = 6 * 60 * 60 * 1000;
const LS_KEY = 'booking_reminder_last_shown';
const WEEKDAYS = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];

function MusicBars({ muted }: { muted: boolean }) {
  return (
    <div className="flex items-end gap-[3px] h-4">
      {[1, 2, 3, 4].map(i => (
        <div
          key={i}
          className="w-[3px] rounded-full"
          style={{
            background: 'linear-gradient(to top, #a78bfa, #e879f9)',
            animation: muted ? 'none' : `musicBar ${0.4 + i * 0.15}s ease-in-out infinite alternate`,
            height: muted ? '4px' : undefined,
          }}
        />
      ))}
    </div>
  );
}

export default function BookingReminderPopup() {
  const { user } = useAuth();
  const [visible, setVisible] = useState(false);
  const [muted, setMuted] = useState(false);
  const [audioStarted, setAudioStarted] = useState(false);
  const [selectedDates, setSelectedDates] = useState<Set<string>>(new Set());
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const { toast } = useToast();

  const currentBS = useMemo(() => getCurrentBSDate(), []);

  // Navigable month state — starts at current month
  const [navYear, setNavYear] = useState(currentBS.year);
  const [navMonth, setNavMonth] = useState(currentBS.month);

  const daysInMonth = getDaysInBSMonth(navYear, navMonth);
  const firstDayWeekday = getFirstDayOfBSMonth(navYear, navMonth);
  const monthName = nepaliMonthsEnglish[navMonth - 1] || '';

  const goNextMonth = useCallback(() => {
    setNavMonth(prev => {
      if (prev === 12) { setNavYear(y => y + 1); return 1; }
      return prev + 1;
    });
  }, []);

  const goPrevMonth = useCallback(() => {
    // Don't go before current month
    if (navYear === currentBS.year && navMonth === currentBS.month) return;
    setNavMonth(prev => {
      if (prev === 1) { setNavYear(y => y - 1); return 12; }
      return prev - 1;
    });
  }, [navYear, navMonth, currentBS]);

  const isPastMonth = navYear < currentBS.year || (navYear === currentBS.year && navMonth < currentBS.month);
  const isCurrentMonth = navYear === currentBS.year && navMonth === currentBS.month;

  // Fetch existing bookings for the displayed month
  const { data: bookings } = useBookings(navYear, navMonth);
  const bookedAdDates = useMemo(() => {
    const set = new Set<string>();
    (bookings || []).forEach(b => set.add(b.booking_date));
    return set;
  }, [bookings]);

  const addMultiple = useAddMultipleBookings();

  useEffect(() => {
    if (!user) return;
    const last = localStorage.getItem(LS_KEY);
    if (!last || Date.now() - Number(last) > SIX_HOURS) {
      const timer = setTimeout(() => setVisible(true), 1500);
      return () => clearTimeout(timer);
    }
  }, [user]);

  useEffect(() => {
    const unsub = onOpenBookingPopup(() => setVisible(true));
    return () => { unsub(); };
  }, []);

  useEffect(() => {
    if (!visible) {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.currentTime = 0;
        audioRef.current = null;
      }
      setAudioStarted(false);
    }
  }, [visible]);

  useEffect(() => {
    if (audioRef.current) audioRef.current.muted = muted;
  }, [muted]);

  const ensureAudio = useCallback(() => {
    if (audioStarted || !visible) return;
    const audio = new Audio('/audio/startup-music.mp3');
    audio.loop = true;
    audio.volume = 0.4;
    audioRef.current = audio;
    audio.play().catch(() => {});
    setAudioStarted(true);
  }, [audioStarted, visible]);

  const dismiss = useCallback(() => {
    localStorage.setItem(LS_KEY, String(Date.now()));
    setVisible(false);
  }, []);

  const isDayBooked = useCallback((day: number) => {
    const adStr = bsToADString(navYear, navMonth, day);
    return bookedAdDates.has(adStr);
  }, [navYear, navMonth, bookedAdDates]);

  const isDayPast = useCallback((day: number) => {
    if (!isCurrentMonth) return isPastMonth;
    return day < currentBS.day;
  }, [isCurrentMonth, isPastMonth, currentBS.day]);

  const toggleDate = useCallback((day: number) => {
    const key = `${navYear}-${navMonth}-${day}`;
    setSelectedDates(prev => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key); else next.add(key);
      return next;
    });
  }, [navYear, navMonth]);

  const handleSave = async () => {
    if (selectedDates.size === 0) return;
    const bookingsToAdd = Array.from(selectedDates).map(key => {
      const [y, m, d] = key.split('-').map(Number);
      return { date: bsToADString(y, m, d), event_name: 'Booked' };
    });
    try {
      await addMultiple.mutateAsync({ bookings: bookingsToAdd });
      toast({ title: '✅ Dates saved!', description: `${bookingsToAdd.length} date(s) added successfully.` });
      dismiss();
    } catch {
      toast({ title: 'Error', description: 'Failed to save dates.', variant: 'destructive' });
    }
  };

  if (!visible || !user) return null;

  return (
    <>
      <style>{`
        @keyframes musicBar {
          0% { height: 4px; }
          100% { height: 16px; }
        }
        @keyframes cardSlide {
          0% { opacity: 0; transform: translateY(40px) scale(0.96); }
          100% { opacity: 1; transform: translateY(0) scale(1); }
        }
        @keyframes shimmer {
          0% { background-position: -200% center; }
          100% { background-position: 200% center; }
        }
        @keyframes floatGlow {
          0%, 100% { transform: translate(0, 0) scale(1); opacity: 0.5; }
          50% { transform: translate(10px, -15px) scale(1.15); opacity: 0.8; }
        }
        @keyframes pulse-ring {
          0% { transform: scale(0.9); opacity: 0.6; }
          50% { transform: scale(1.05); opacity: 1; }
          100% { transform: scale(0.9); opacity: 0.6; }
        }
      `}</style>

      <div className="fixed inset-0 z-[100] flex items-center justify-center p-4" onClick={dismiss}>
        <div className="absolute inset-0 bg-black/80" />

        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-1/4 left-1/4 w-64 h-64 rounded-full bg-violet-500/20 blur-[100px]"
            style={{ animation: 'floatGlow 6s ease-in-out infinite' }} />
          <div className="absolute bottom-1/4 right-1/4 w-48 h-48 rounded-full bg-fuchsia-500/20 blur-[80px]"
            style={{ animation: 'floatGlow 8s ease-in-out infinite 2s' }} />
        </div>

        <div
          className="relative w-full max-w-sm bg-gradient-to-b from-slate-900 via-violet-950/90 to-slate-900 border border-white/10 rounded-3xl p-5 shadow-2xl shadow-violet-900/40"
          style={{ animation: 'cardSlide 0.5s cubic-bezier(0.16, 1, 0.3, 1) forwards' }}
          onClick={e => { e.stopPropagation(); ensureAudio(); }}
        >
          {/* Top row */}
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <div className="relative">
                <CalendarHeart className="w-5 h-5 text-violet-400" />
                <Sparkles className="w-3 h-3 text-amber-400 absolute -top-1 -right-1" style={{ animation: 'pulse-ring 2s ease-in-out infinite' }} />
              </div>
              <h3
                className="text-sm font-bold bg-clip-text text-transparent"
                style={{
                  backgroundImage: 'linear-gradient(90deg, #a78bfa, #e879f9, #a78bfa)',
                  backgroundSize: '200% auto',
                  animation: 'shimmer 3s linear infinite',
                }}
              >
                Add Your Dates!
              </h3>
            </div>
            <div className="flex items-center gap-2">
              <button onClick={() => setMuted(!muted)} className="p-1.5 rounded-lg bg-white/10 hover:bg-white/20 transition-colors">
                {muted ? <VolumeX className="w-3.5 h-3.5 text-white/60" /> : <Volume2 className="w-3.5 h-3.5 text-violet-300" />}
              </button>
              <MusicBars muted={muted} />
              <button onClick={dismiss} className="p-1.5 rounded-lg text-white/40 hover:text-white hover:bg-white/10 transition-colors">
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          <p className="text-xs text-white/50 mb-4 leading-relaxed">
            Let others know you're available! Add your free dates so clients can find & book you 🎯
          </p>

          {/* Calendar with month navigation */}
          <div className="bg-white/5 rounded-2xl p-3 mb-4 border border-white/5">
            <div className="flex items-center justify-between mb-3">
              <button
                onClick={goPrevMonth}
                disabled={isCurrentMonth}
                className="p-1 rounded-lg hover:bg-white/10 transition-colors disabled:opacity-20"
              >
                <ChevronLeft className="w-4 h-4 text-white" />
              </button>
              <p className="text-sm font-bold text-white">{monthName} {navYear}</p>
              <button
                onClick={goNextMonth}
                className="p-1 rounded-lg hover:bg-white/10 transition-colors"
              >
                <ChevronRight className="w-4 h-4 text-white" />
              </button>
            </div>
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
                const key = `${navYear}-${navMonth}-${day}`;
                const isSelected = selectedDates.has(key);
                const booked = isDayBooked(day);
                const past = isDayPast(day);
                const disabled = booked || past;

                return (
                  <button
                    key={day}
                    onClick={() => !disabled && toggleDate(day)}
                    disabled={disabled}
                    className={`aspect-square rounded-lg flex flex-col items-center justify-center text-xs font-medium transition-all
                      ${booked
                        ? 'bg-amber-500/20 text-amber-300 cursor-not-allowed'
                        : past
                          ? 'text-white/20 cursor-not-allowed'
                          : isSelected
                            ? 'bg-emerald-500 text-white font-bold shadow-md shadow-emerald-500/30 scale-105'
                            : 'text-white/60 hover:bg-white/10 hover:text-white'
                      }`}
                  >
                    {day}
                    {booked && <span className="w-1 h-1 rounded-full bg-amber-400 mt-0.5" />}
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

          {/* Actions */}
          <div className="flex gap-2">
            <button
              onClick={dismiss}
              className="flex-1 py-2.5 rounded-xl bg-white/10 text-white text-xs font-semibold hover:bg-white/15 transition-colors"
            >
              Skip for now
            </button>
            <button
              onClick={handleSave}
              disabled={selectedDates.size === 0 || addMultiple.isPending}
              className="flex-1 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-600 disabled:opacity-30 text-white text-xs font-semibold transition-colors flex items-center justify-center gap-1.5"
            >
              <Check className="w-3.5 h-3.5" />
              {addMultiple.isPending ? 'Saving...' : `Save${selectedDates.size > 0 ? ` (${selectedDates.size})` : ''}`}
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
