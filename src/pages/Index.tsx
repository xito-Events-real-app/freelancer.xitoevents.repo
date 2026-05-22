import { useState, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useMyProfile } from '@/hooks/useProfile';
import { useBookings, useAddBooking, useDeleteBooking, useAddMultipleBookings, useUpdateBooking } from '@/hooks/useBookings';
import { useAllGlobalLaganDates } from '@/hooks/useGlobalLaganDates';
import { GaneshIcon } from '@/components/company/GaneshIcon';
import MultiDatePicker from '@/components/MultiDatePicker';
import BookingDetailPopup from '@/components/BookingDetailPopup';
import BookingViewDetails from '@/components/BookingViewDetails';
import {
  getCurrentBSDate,
  getDaysInBSMonth,
  getFirstDayOfBSMonth,
  nepaliMonthsEnglish,
  getNepaliDayNames,
  formatBSDate,
  bsToADString,
  adToBS,
  bsToAD,
  type NepaliDateObject,
} from '@/lib/nepaliCalendar';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { ChevronLeft, ChevronRight, Plus, Trash2, CalendarDays, List, Calendar, Pencil, Check, X } from 'lucide-react';
import { toast } from 'sonner';

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

const DEMO_EVENT_NAMES = [
  'Wedding (Bride Side)', 'Wedding (Groom Side)', 'Mehendi (Bride Side)',
  'Reception', 'Pre-wedding Shoot', 'Music Video', 'Documentary',
  'Corporate Event', 'Engagement Ceremony', 'Birthday Party',
];

function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return "Good Morning";
  if (hour < 17) return "Good Afternoon";
  return "Good Evening";
}

export default function Index() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { data: myProfile } = useMyProfile();

  const currentBS = useMemo(() => getCurrentBSDate(), []);
  const [navYear, setNavYear] = useState(currentBS.year);
  const [navMonth, setNavMonth] = useState(currentBS.month);
  const [selectedDay, setSelectedDay] = useState<number | null>(null);
  const [activeTab, setActiveTab] = useState<"calendar" | "upcoming">("calendar");
  const [eventName, setEventName] = useState('');
  const [multiDateOpen, setMultiDateOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState('');
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [detailPopupBooking, setDetailPopupBooking] = useState<{ id: string; day: number } | null>(null);
  const [viewDetailsBooking, setViewDetailsBooking] = useState<{ id: string; day: number } | null>(null);

  const { data: realBookings = [] } = useBookings(navYear, navMonth);
  const addBooking = useAddBooking();
  const deleteBooking = useDeleteBooking();
  const addMultiple = useAddMultipleBookings();
  const updateBooking = useUpdateBooking();

  // Generate demo bookings for guests — 10 random events across this and next month
  const demoBookings = useMemo(() => {
    if (user) return [];
    const demos: { id: string; booking_date: string; event_name: string }[] = [];
    const usedDays = new Set<string>();
    const months = [
      { year: currentBS.year, month: currentBS.month },
      { year: currentBS.month === 12 ? currentBS.year + 1 : currentBS.year, month: currentBS.month === 12 ? 1 : currentBS.month + 1 },
    ];
    let seed = 42;
    const seededRandom = () => { seed = (seed * 16807) % 2147483647; return (seed - 1) / 2147483646; };
    for (let i = 0; i < 10; i++) {
      const mi = seededRandom() > 0.5 ? 1 : 0;
      const m = months[mi];
      const dim = getDaysInBSMonth(m.year, m.month);
      const day = Math.floor(seededRandom() * dim) + 1;
      const adStr = bsToADString(m.year, m.month, day);
      if (usedDays.has(adStr)) continue;
      usedDays.add(adStr);
      demos.push({
        id: `demo-${i}`,
        booking_date: adStr,
        event_name: DEMO_EVENT_NAMES[i % DEMO_EVENT_NAMES.length],
      });
    }
    return demos;
  }, [user, currentBS]);

  const bookings = user ? realBookings : demoBookings;

  const firstName = user ? (myProfile?.full_name?.split(' ')[0] || user?.email?.split('@')[0] || 'there') : 'Guest';
  const bsMonth = nepaliMonthsEnglish[currentBS.month - 1] || "";
  const adFormatted = new Date().toLocaleDateString("en-US", { month: "short", day: "numeric" });

  const daysInMonth = getDaysInBSMonth(navYear, navMonth);
  const firstDayWeekday = getFirstDayOfBSMonth(navYear, navMonth);
  const monthName = nepaliMonthsEnglish[navMonth - 1] || "";

  // Build bookings map by AD date string — support multiple bookings per day
  const bookedDaysMap = useMemo(() => {
    const map = new Map<number, { id: string; event_name: string }[]>();
    for (let d = 1; d <= daysInMonth; d++) {
      const adStr = bsToADString(navYear, navMonth, d);
      const dayBookings = bookings.filter(b => b.booking_date === adStr);
      if (dayBookings.length > 0) {
        map.set(d, dayBookings.map(b => ({ id: b.id, event_name: b.event_name })));
      }
    }
    return map;
  }, [bookings, navYear, navMonth, daysInMonth]);

  // Global Lagan dates for current BS month
  const { data: allLagans = [] } = useAllGlobalLaganDates();
  const laganDaysSet = useMemo(() => {
    const set = new Set<number>();
    for (const r of allLagans) {
      if (r.bs_year === navYear && r.bs_month === navMonth) set.add(r.bs_day);
    }
    return set;
  }, [allLagans, navYear, navMonth]);

  // Set of all booked AD dates for MultiDatePicker
  const bookedAdDates = useMemo(() => {
    return new Set(bookings.map(b => b.booking_date));
  }, [bookings]);

  // Stats
  const stats = useMemo(() => {
    let totalThisMonth = 0;
    let remainingThisMonth = 0;
    bookedDaysMap.forEach((events, day) => {
      totalThisMonth += events.length;
      if (navYear > currentBS.year || 
          (navYear === currentBS.year && navMonth > currentBS.month) ||
          (navYear === currentBS.year && navMonth === currentBS.month && day >= currentBS.day)) {
        remainingThisMonth += events.length;
      }
    });
    return { totalThisMonth, remainingThisMonth, totalBookings: bookings.length };
  }, [bookedDaysMap, bookings.length, navYear, navMonth, currentBS]);

  const isDayPast = useCallback((day: number) => {
    if (navYear < currentBS.year) return true;
    if (navYear === currentBS.year && navMonth < currentBS.month) return true;
    if (navYear === currentBS.year && navMonth === currentBS.month && day < currentBS.day) return true;
    return false;
  }, [navYear, navMonth, currentBS]);

  const handlePrevMonth = () => {
    if (navMonth === 1) { setNavMonth(12); setNavYear(y => y - 1); } else setNavMonth(m => m - 1);
    setSelectedDay(null);
  };
  const handleNextMonth = () => {
    if (navMonth === 12) { setNavMonth(1); setNavYear(y => y + 1); } else setNavMonth(m => m + 1);
    setSelectedDay(null);
  };

  // Selected day bookings (multiple)
  const selectedDayBookings = selectedDay !== null ? bookedDaysMap.get(selectedDay) || [] : [];

  // Default bottom events: today's or next upcoming
  const defaultBottomEvent = useMemo(() => {
    const todayAdStr = bsToADString(currentBS.year, currentBS.month, currentBS.day);
    const todayBookings = bookings.filter(b => b.booking_date === todayAdStr);
    if (todayBookings.length > 0) return { bookings: todayBookings, label: "Today's Events", bs: currentBS };

    const upcoming = bookings
      .filter(b => {
        const ad = new Date(b.booking_date + 'T00:00:00');
        return ad >= new Date(new Date().toDateString());
      })
      .sort((a, b) => a.booking_date.localeCompare(b.booking_date));
    
    if (upcoming.length > 0) {
      const bs = adToBS(new Date(upcoming[0].booking_date + 'T00:00:00'));
      return { 
        bookings: [upcoming[0]], 
        label: `Next Event — ${formatBSDate(bs)}`,
        bs,
      };
    }
    return null;
  }, [bookings, currentBS]);

  async function handleAddEvent() {
    if (selectedDay === null || !eventName.trim()) return;
    const adStr = bsToADString(navYear, navMonth, selectedDay);
    try {
      await addBooking.mutateAsync({ booking_date: adStr, event_name: eventName.trim() });
      toast.success('Event added!');
      setEventName('');
    } catch {
      toast.error('Failed to add event');
    }
  }

  async function handleDeleteEvent(bookingId: string) {
    try {
      await deleteBooking.mutateAsync(bookingId);
      toast.success('Event removed');
      setDeleteConfirmId(null);
    } catch {
      toast.error('Failed to remove event');
    }
  }

  async function handleUpdateEvent(bookingId: string) {
    if (!editingName.trim()) return;
    try {
      await updateBooking.mutateAsync({ bookingId, event_name: editingName.trim() });
      toast.success('Event updated!');
      setEditingId(null);
      setEditingName('');
    } catch {
      toast.error('Failed to update event');
    }
  }

  // Upcoming events for "Upcoming" tab
  const upcomingEvents = useMemo(() => {
    return bookings
      .filter(b => {
        const ad = new Date(b.booking_date + 'T00:00:00');
        return ad >= new Date(new Date().toDateString());
      })
      .sort((a, b) => a.booking_date.localeCompare(b.booking_date));
  }, [bookings]);

  // Render a single booking row with edit/delete
  function BookingRow({ booking, showDate, bsDate }: { booking: { id: string; event_name: string }; showDate?: boolean; bsDate?: { day: number; month: number; year: number } }) {
    const isEditing = editingId === booking.id;
    const isDeleting = deleteConfirmId === booking.id;

    if (isDeleting) {
      return (
        <div className="bg-rose-500/10 backdrop-blur rounded-xl p-4 border border-rose-500/20">
          <p className="text-sm text-white mb-2">Delete "<span className="font-semibold">{booking.event_name}</span>"?</p>
          <div className="flex gap-2">
            <button
              onClick={() => setDeleteConfirmId(null)}
              className="flex-1 py-2 rounded-lg bg-white/10 text-white text-xs font-semibold hover:bg-white/15 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={() => handleDeleteEvent(booking.id)}
              disabled={deleteBooking.isPending}
              className="flex-1 py-2 rounded-lg bg-rose-500 text-white text-xs font-semibold hover:bg-rose-600 transition-colors"
            >
              {deleteBooking.isPending ? 'Deleting...' : 'Delete'}
            </button>
          </div>
        </div>
      );
    }

    return (
      <div className="bg-white/5 backdrop-blur rounded-xl p-4 border border-white/10">
        <div className="flex items-center justify-between">
          <div className="flex-1 min-w-0">
            {isEditing ? (
              <div className="flex gap-2">
                <input
                  value={editingName}
                  onChange={e => setEditingName(e.target.value)}
                  autoFocus
                  className="flex-1 h-8 rounded-lg bg-white/10 border border-white/10 px-2 text-sm text-white placeholder:text-white/30 focus:outline-none focus:ring-1 focus:ring-emerald-400"
                  onKeyDown={e => {
                    if (e.key === 'Enter') handleUpdateEvent(booking.id);
                    if (e.key === 'Escape') { setEditingId(null); setEditingName(''); }
                  }}
                />
                <button
                  onClick={() => handleUpdateEvent(booking.id)}
                  disabled={updateBooking.isPending}
                  className="p-1.5 rounded-lg text-emerald-400 hover:bg-emerald-500/20 transition-colors"
                >
                  <Check className="w-4 h-4" />
                </button>
                <button
                  onClick={() => { setEditingId(null); setEditingName(''); }}
                  className="p-1.5 rounded-lg text-white/40 hover:bg-white/10 transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <>
                <p className="text-sm font-semibold text-white truncate">{booking.event_name}</p>
                {showDate && bsDate && (
                  <p className="text-xs text-violet-300 mt-0.5">{formatBSDate(bsDate)}</p>
                )}
              </>
            )}
          </div>
          {!isEditing && user && (
            <div className="flex items-center gap-1 ml-2 shrink-0">
              <button
                onClick={() => { setEditingId(booking.id); setEditingName(booking.event_name); }}
                className="p-1.5 rounded-lg text-white/30 hover:text-emerald-400 hover:bg-emerald-500/20 transition-colors"
              >
                <Pencil className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() => setDeleteConfirmId(booking.id)}
                className="p-1.5 rounded-lg text-white/30 hover:text-rose-400 hover:bg-rose-500/20 transition-colors"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          )}
        </div>
        {/* Action buttons */}
        {!isEditing && !isDeleting && user && (
          <div className="flex gap-2 mt-3">
            <button
              onClick={() => {
                const bookingDay = bsDate?.day || selectedDay;
                if (bookingDay) setDetailPopupBooking({ id: booking.id, day: bookingDay });
              }}
              className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg bg-emerald-500/20 text-emerald-300 text-xs font-semibold hover:bg-emerald-500/30 transition-colors border border-emerald-500/20"
            >
              <Pencil className="w-3 h-3" />
              Enter Details
            </button>
            <button
              onClick={() => {
                const bookingDay = bsDate?.day || selectedDay;
                if (bookingDay) setViewDetailsBooking({ id: booking.id, day: bookingDay });
              }}
              className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg bg-violet-500/20 text-violet-300 text-xs font-semibold hover:bg-violet-500/30 transition-colors border border-violet-500/20"
            >
              <List className="w-3 h-3" />
              View Details
            </button>
          </div>
        )}
      </div>
    );
  }

  // Guest: show calendar read-only (no early return)

  return (
    <div className="h-screen bg-gradient-to-br from-slate-900 via-violet-950 to-slate-900 text-white flex flex-col pb-16 max-w-md mx-auto">
      {/* Compact Header */}
      <div className="px-4 pt-4 pb-2 space-y-1.5 flex-shrink-0">
        <div className="flex items-center justify-between">
          <p className="text-xs text-violet-200 truncate">
            {getGreeting()}, <span className="font-semibold text-white">{firstName}</span>
          </p>
          <span className="text-[10px] bg-white/10 text-violet-300 px-2 py-0.5 rounded-full whitespace-nowrap ml-2">
            {currentBS.day} {bsMonth} {currentBS.year} / {adFormatted}
          </span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="text-[10px] bg-emerald-500/20 text-emerald-300 px-2 py-0.5 rounded-full font-semibold">
            {stats.totalThisMonth} This Month
          </span>
          <span className="text-[10px] bg-amber-500/20 text-amber-300 px-2 py-0.5 rounded-full font-semibold">
            {stats.remainingThisMonth} Remaining
          </span>
          <span className="text-[10px] bg-cyan-500/20 text-cyan-300 px-2 py-0.5 rounded-full font-semibold">
            {stats.totalBookings} Total
          </span>
        </div>
      </div>

      {/* Tab Bar */}
      <div className="flex-shrink-0 px-4 pb-2 flex gap-2">
        <button
          onClick={() => setActiveTab("calendar")}
          className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl text-xs font-medium transition-all
            ${activeTab === "calendar" ? "bg-white/15 text-white font-bold" : "text-white/50"}`}
        >
          <CalendarDays className="w-4 h-4" />
          Booking Calendar
        </button>
        <button
          onClick={() => setActiveTab("upcoming")}
          className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl text-xs font-medium transition-all
            ${activeTab === "upcoming" ? "bg-white/15 text-white font-bold" : "text-white/50"}`}
        >
          <List className="w-4 h-4" />
          Upcoming Events
        </button>
      </div>

      {/* Scrollable Tab Content */}
      <div className="flex-1 overflow-y-auto px-4 pb-4">
        {activeTab === "calendar" ? (
          <div className="space-y-4">
            {/* Calendar Navigation */}
            <div className="flex items-center justify-between">
              <button onClick={handlePrevMonth} className="p-2 rounded-lg bg-white/10 hover:bg-white/20 transition-colors">
                <ChevronLeft className="w-5 h-5" />
              </button>
              <p className="text-lg font-bold">{monthName} {navYear}</p>
              <button onClick={handleNextMonth} className="p-2 rounded-lg bg-white/10 hover:bg-white/20 transition-colors">
                <ChevronRight className="w-5 h-5" />
              </button>
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

            {/* Calendar Grid */}
            <div className="bg-white/5 backdrop-blur rounded-2xl p-3">
              <div className="grid grid-cols-7 gap-1 mb-2">
                {WEEKDAYS.map(d => (
                  <div key={d} className="text-center text-[10px] font-semibold text-violet-400 py-1">{d}</div>
                ))}
              </div>
              <div className="grid grid-cols-7 gap-1">
                {Array.from({ length: firstDayWeekday }).map((_, i) => (
                  <div key={`empty-${i}`} className="aspect-square" />
                ))}
                {Array.from({ length: daysInMonth }).map((_, i) => {
                  const day = i + 1;
                  const dayBookings = bookedDaysMap.get(day);
                  const isBooked = !!dayBookings && dayBookings.length > 0;
                  const isToday = navYear === currentBS.year && navMonth === currentBS.month && day === currentBS.day;
                  const isSelected = selectedDay === day;
                  const isPast = isDayPast(day);
                  const isLagan = laganDaysSet.has(day);

                  const stateClasses = isToday
                    ? "bg-rose-500 text-white font-bold ring-2 ring-rose-300 shadow-[0_0_14px_rgba(251,113,133,0.6)]"
                    : isBooked
                      ? isSelected
                        ? "bg-emerald-500 text-white ring-2 ring-emerald-300 scale-105"
                        : isPast
                          ? "bg-emerald-500/15 text-emerald-400/50"
                          : "bg-emerald-500/30 text-emerald-300 hover:bg-emerald-500/50"
                      : isSelected
                        ? "bg-white/20 text-white ring-1 ring-white/30"
                        : isPast
                          ? "text-gray-400"
                          : "text-emerald-300/80 hover:bg-white/10";

                  // Lagan overlay: orange ring + glowing pulse for non-today, non-past Lagan days
                  const laganOverlay = isLagan && !isToday
                    ? isPast
                      ? " ring-2 ring-orange-400/40"
                      : " ring-2 ring-orange-300 animate-lagan-pulse"
                    : "";

                  return (
                    <button
                      key={day}
                      onClick={() => {
                        setSelectedDay(isSelected ? null : day);
                      }}
                      className={`aspect-square rounded-lg flex flex-col items-center justify-center text-sm font-medium transition-all relative ${stateClasses}${laganOverlay}`}
                    >
                      {isLagan && !isToday && (
                        <GaneshIcon className="absolute top-0.5 right-0.5 w-2.5 h-2.5 text-orange-300" />
                      )}
                      {day}
                      {isBooked && (
                        <span className={`w-1 h-1 rounded-full mt-0.5 ${isPast ? "bg-emerald-500/40" : "bg-emerald-400"}`} />
                      )}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Events below calendar */}
            {selectedDay !== null && (
              <div className="space-y-2">
                <p className="text-sm font-bold text-emerald-400 flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5" />
                  {selectedDay} {monthName} — {selectedDayBookings.length > 0 ? `${selectedDayBookings.length} event${selectedDayBookings.length > 1 ? 's' : ''}` : "No events"}
                </p>
                {selectedDayBookings.map(booking => (
                  <BookingRow key={booking.id} booking={booking} />
                ))}
                {/* Add event input - only for logged in users */}
                {user && (
                  <div className="bg-white/5 backdrop-blur rounded-xl p-4 border border-white/10">
                    <p className="text-xs text-violet-300 mb-3">
                      {selectedDayBookings.length > 0 ? 'Add another event:' : 'No event on this date. Add one:'}
                    </p>
                    <div className="flex gap-2">
                      <input
                        value={eventName}
                        onChange={e => setEventName(e.target.value)}
                        placeholder="e.g. Wedding at Kathmandu"
                        className="flex-1 h-10 rounded-lg bg-white/10 border border-white/10 px-3 text-sm text-white placeholder:text-white/30 focus:outline-none focus:ring-1 focus:ring-emerald-400"
                        onKeyDown={e => e.key === 'Enter' && handleAddEvent()}
                      />
                      <button
                        onClick={handleAddEvent}
                        disabled={!eventName.trim() || addBooking.isPending}
                        className="h-10 w-10 rounded-lg bg-emerald-500 hover:bg-emerald-600 disabled:opacity-40 flex items-center justify-center transition-colors"
                      >
                        <Plus className="w-5 h-5 text-white" />
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Default bottom events when no day selected */}
            {selectedDay === null && defaultBottomEvent && (
              <div className="space-y-2">
                <p className="text-sm font-bold text-emerald-400 flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5" />
                  {defaultBottomEvent.label}
                </p>
                {defaultBottomEvent.bookings.map(b => (
                  <BookingRow key={b.id} booking={b} showDate bsDate={defaultBottomEvent.bs} />
                ))}
              </div>
            )}
          </div>
        ) : (
          /* Upcoming Events Tab */
          <div className="space-y-3">
            {upcomingEvents.length === 0 ? (
              <div className="text-center py-12">
                <CalendarDays className="w-12 h-12 mx-auto mb-3 text-violet-500/50" />
                <p className="text-white/40 text-sm">No upcoming events</p>
                <p className="text-white/25 text-xs mt-1">Add events from the calendar tab</p>
              </div>
            ) : (
              <>
                <p className="text-xs font-semibold text-violet-400 uppercase tracking-wider">
                  {upcomingEvents.length} Upcoming Event{upcomingEvents.length !== 1 ? 's' : ''}
                </p>
                {upcomingEvents.map(b => {
                  const bs = adToBS(new Date(b.booking_date + 'T00:00:00'));
                  const daysUntil = Math.ceil(
                    (new Date(b.booking_date + 'T00:00:00').getTime() - new Date(new Date().toDateString()).getTime()) / (1000 * 60 * 60 * 24)
                  );
                  return (
                    <div key={b.id}>
                      <div className="flex items-center gap-2 mb-1">
                        <span className={`text-[10px] px-2 py-0.5 rounded-full font-semibold ${
                          daysUntil === 0
                            ? "bg-rose-500/20 text-rose-300"
                            : daysUntil <= 3
                              ? "bg-amber-500/20 text-amber-300"
                              : "bg-emerald-500/20 text-emerald-300"
                        }`}>
                          {daysUntil === 0 ? "Today" : daysUntil === 1 ? "Tomorrow" : `${daysUntil} days`}
                        </span>
                      </div>
                      <BookingRow booking={b} showDate bsDate={bs} />
                    </div>
                  );
                })}
              </>
            )}
          </div>
        )}
      </div>

      {/* Add Multiple Dates Button - show for everyone, gate action for guests */}
      <div className="flex-shrink-0 px-4 pb-1">
        <button
          onClick={() => user ? setMultiDateOpen(true) : navigate('/auth')}
          className="w-full py-2.5 rounded-xl bg-emerald-500/20 hover:bg-emerald-500/30 border border-emerald-500/20 text-emerald-300 text-xs font-semibold transition-colors flex items-center justify-center gap-2"
        >
          <Plus className="w-4 h-4" />
          Add Multiple Dates
        </button>
      </div>

      {/* Guest CTA */}
      {!user && (
        <div className="flex-shrink-0 px-4 pb-1">
          <button
            onClick={() => navigate('/auth')}
            className="w-full py-2 rounded-xl text-violet-300 text-xs hover:text-white transition-colors"
          >
            Sign up to manage your bookings and track events →
          </button>
        </div>
      )}

      {/* Footer */}
      <p className="text-center text-[10px] text-violet-500 py-1 flex-shrink-0">Powered by XITO</p>

      {/* Multi Date Picker Modal */}
      <MultiDatePicker
        open={multiDateOpen}
        onClose={() => setMultiDateOpen(false)}
        saving={addMultiple.isPending}
        bookedAdDates={bookedAdDates}
        onSave={async (newBookings) => {
          try {
            await addMultiple.mutateAsync({ bookings: newBookings.map(b => ({ date: b.adDate, event_name: b.eventName })) });
            toast.success(`${newBookings.length} event${newBookings.length > 1 ? 's' : ''} added!`);
            setMultiDateOpen(false);
          } catch {
            toast.error('Failed to add events');
          }
        }}
      />

      {/* Booking Detail Popup */}
      {detailPopupBooking && (
        <BookingDetailPopup
          open={!!detailPopupBooking}
          onClose={() => setDetailPopupBooking(null)}
          bookingId={detailPopupBooking.id}
          bookingDate={{ year: navYear, month: navMonth, day: detailPopupBooking.day }}
          existingEventName={bookings.find(b => b.id === detailPopupBooking.id)?.event_name || ''}
        />
      )}

      {/* Booking View Details */}
      {viewDetailsBooking && (
        <BookingViewDetails
          open={!!viewDetailsBooking}
          onClose={() => setViewDetailsBooking(null)}
          bookingId={viewDetailsBooking.id}
          bookingDate={{ year: navYear, month: navMonth, day: viewDetailsBooking.day }}
          existingEventName={bookings.find(b => b.id === viewDetailsBooking.id)?.event_name || ''}
        />
      )}
    </div>
  );
}
