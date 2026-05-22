import { useState, useMemo } from 'react';
import { useFreelancerBookings } from '@/hooks/useFreelancerBookings';
import { useAllGlobalLaganDates } from '@/hooks/useGlobalLaganDates';
import {
  getCurrentBSDate,
  getDaysInBSMonth,
  getFirstDayOfBSMonth,
  nepaliMonthsEnglish,
  bsToADString,
  adToBS,
} from '@/lib/nepaliCalendar';
import { ChevronLeft, ChevronRight, Calendar } from 'lucide-react';
import { GaneshIcon } from '@/components/company/GaneshIcon';

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

interface Props {
  userId: string;
  userName: string;
}

export default function FreelancerCalendar({ userId, userName }: Props) {
  const currentBS = useMemo(() => getCurrentBSDate(), []);
  const { data: bookings = [], isLoading } = useFreelancerBookings(userId);
  const { data: allLagans = [] } = useAllGlobalLaganDates();

  // Find the month of the next upcoming event to auto-navigate there
  const initialNav = useMemo(() => {
    if (!bookings.length) return { year: currentBS.year, month: currentBS.month };

    const today = new Date(new Date().toDateString());
    const upcoming = bookings
      .filter(b => new Date(b.booking_date + 'T00:00:00') >= today)
      .sort((a, b) => a.booking_date.localeCompare(b.booking_date));

    if (upcoming.length > 0) {
      const bs = adToBS(new Date(upcoming[0].booking_date + 'T00:00:00'));
      return { year: bs.year, month: bs.month };
    }
    return { year: currentBS.year, month: currentBS.month };
  }, [bookings, currentBS]);

  const [navOverride, setNavOverride] = useState<{ year: number; month: number } | null>(null);
  const navYear = navOverride?.year ?? initialNav.year;
  const navMonth = navOverride?.month ?? initialNav.month;

  const daysInMonth = getDaysInBSMonth(navYear, navMonth);
  const firstDayWeekday = getFirstDayOfBSMonth(navYear, navMonth);
  const monthName = nepaliMonthsEnglish[navMonth - 1] || "";

  const bookedDaysMap = useMemo(() => {
    const map = new Map<number, string>();
    for (let d = 1; d <= daysInMonth; d++) {
      const adStr = bsToADString(navYear, navMonth, d);
      const booking = bookings.find(b => b.booking_date === adStr);
      if (booking) map.set(d, booking.event_name);
    }
    return map;
  }, [bookings, navYear, navMonth, daysInMonth]);

  const laganDaysSet = useMemo(() => {
    const set = new Set<number>();
    for (const r of allLagans) {
      if (r.bs_year === navYear && r.bs_month === navMonth) set.add(r.bs_day);
    }
    return set;
  }, [allLagans, navYear, navMonth]);

  // Stats
  const stats = useMemo(() => {
    const thisMonthCount = bookedDaysMap.size;
    let remainingThisMonth = 0;
    bookedDaysMap.forEach((_, day) => {
      if (navYear > currentBS.year ||
          (navYear === currentBS.year && navMonth > currentBS.month) ||
          (navYear === currentBS.year && navMonth === currentBS.month && day >= currentBS.day)) {
        remainingThisMonth++;
      }
    });
    return { thisMonthCount, remainingThisMonth, total: bookings.length };
  }, [bookedDaysMap, bookings.length, navYear, navMonth, currentBS]);

  const isDayPast = (day: number) => {
    if (navYear < currentBS.year) return true;
    if (navYear === currentBS.year && navMonth < currentBS.month) return true;
    if (navYear === currentBS.year && navMonth === currentBS.month && day < currentBS.day) return true;
    return false;
  };

  const handlePrev = () => {
    if (navMonth === 1) { setNavOverride({ year: navYear - 1, month: 12 }); } else setNavOverride({ year: navYear, month: navMonth - 1 });
  };
  const handleNext = () => {
    if (navMonth === 12) { setNavOverride({ year: navYear + 1, month: 1 }); } else setNavOverride({ year: navYear, month: navMonth + 1 });
  };

  return (
    <div className="bg-gradient-to-br from-slate-900 via-violet-950 to-slate-900 rounded-2xl p-3 space-y-2">
      {/* Header with stats */}
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-white flex items-center gap-1.5">
          <Calendar className="w-4 h-4" /> Schedule
        </h3>
      </div>

      {/* Stats badges */}
      <div className="flex items-center gap-1.5 flex-wrap">
        <span className="text-[10px] bg-emerald-500/20 text-emerald-300 px-2 py-0.5 rounded-full font-semibold">
          {stats.thisMonthCount} This Month
        </span>
        <span className="text-[10px] bg-amber-500/20 text-amber-300 px-2 py-0.5 rounded-full font-semibold">
          {stats.remainingThisMonth} Remaining
        </span>
        <span className="text-[10px] bg-cyan-500/20 text-cyan-300 px-2 py-0.5 rounded-full font-semibold">
          {stats.total} Total
        </span>
        {laganDaysSet.size > 0 && (
          <span className="text-[10px] bg-orange-500/20 text-orange-300 px-2 py-0.5 rounded-full font-semibold inline-flex items-center gap-1">
            <GaneshIcon className="w-3 h-3" />
            {laganDaysSet.size} Lagan
          </span>
        )}
      </div>

      {/* Lagan dates pill row (current month) */}
      {laganDaysSet.size > 0 && (
        <div className="flex items-center gap-1 flex-wrap bg-orange-500/10 border border-orange-400/30 rounded-lg px-2 py-1.5">
          <GaneshIcon className="w-3.5 h-3.5 text-orange-300 shrink-0" />
          <span className="text-[10px] font-bold text-orange-300 mr-0.5">Lagan:</span>
          {Array.from(laganDaysSet).sort((a, b) => a - b).map(d => (
            <span
              key={d}
              className="text-[10px] px-1.5 py-0.5 rounded-full font-semibold bg-orange-400/80 text-white"
            >
              {d}
            </span>
          ))}
        </div>
      )}

      {/* Month nav */}
      <div className="flex items-center justify-between">
        <button onClick={handlePrev} className="p-2 rounded-lg bg-white/10 hover:bg-white/20 transition-colors">
          <ChevronLeft className="w-4 h-4 text-white" />
        </button>
        <p className="text-sm font-bold text-white">{monthName} {navYear}</p>
        <button onClick={handleNext} className="p-2 rounded-lg bg-white/10 hover:bg-white/20 transition-colors">
          <ChevronRight className="w-4 h-4 text-white" />
        </button>
      </div>

      {isLoading ? (
        <div className="h-48 rounded-xl bg-white/5 animate-pulse" />
      ) : (
        <div className="bg-white/5 backdrop-blur rounded-2xl p-3">
          {/* Weekday headers */}
          <div className="grid grid-cols-7 gap-1 mb-2">
            {WEEKDAYS.map(d => (
              <div key={d} className="text-center text-[10px] font-semibold text-violet-400 py-1">{d}</div>
            ))}
          </div>

          {/* Days */}
          <div className="grid grid-cols-7 gap-1">
            {Array.from({ length: firstDayWeekday }).map((_, i) => (
              <div key={`e-${i}`} className="aspect-square" />
            ))}
            {Array.from({ length: daysInMonth }).map((_, i) => {
              const day = i + 1;
              const isBooked = bookedDaysMap.has(day);
              const isToday = navYear === currentBS.year && navMonth === currentBS.month && day === currentBS.day;
              const past = isDayPast(day);
              const isLagan = laganDaysSet.has(day);

              const baseClasses = isToday
                ? "bg-rose-500 text-white font-bold ring-2 ring-rose-300 shadow-[0_0_14px_rgba(251,113,133,0.6)]"
                : isLagan
                  ? past
                    ? "bg-orange-500/15 text-orange-300/60 ring-2 ring-orange-400/40"
                    : "bg-orange-500/30 text-orange-100 ring-2 ring-orange-300 animate-lagan-pulse"
                  : isBooked
                    ? past
                      ? "bg-emerald-500/15 text-emerald-400/50"
                      : "bg-emerald-500/30 text-emerald-300"
                    : past
                      ? "text-gray-400"
                      : "text-emerald-300/80";

              return (
                <div
                  key={day}
                  className={`aspect-square rounded-md flex flex-col items-center justify-center text-xs font-medium relative ${baseClasses}`}
                  title={isLagan ? `Lagan${isBooked ? ' • ' + bookedDaysMap.get(day) : ''}` : (isBooked ? bookedDaysMap.get(day) : undefined)}
                >
                  {isLagan && (
                    <GaneshIcon className="absolute top-0.5 right-0.5 w-2.5 h-2.5 text-orange-300" />
                  )}
                  {day}
                  {isBooked && (
                    <span className={`w-1 h-1 rounded-full mt-0.5 ${past ? "bg-emerald-500/40" : "bg-emerald-400"}`} />
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
