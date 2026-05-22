import { useMemo, useState } from 'react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Calendar, ChevronRight, CheckCircle, Phone, MessageCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  getCurrentBSDate,
  getDaysInBSMonth,
  nepaliMonthsEnglish,
  bsToADString,
  adToBS,
} from '@/lib/nepaliCalendar';
import type { AgencyEventWithClient } from '@/hooks/useAllAgencyEvents';

interface BookingCalendarProps {
  events: AgencyEventWithClient[];
}

function isBSDatePast(year: number, month: number, day: number): boolean {
  const current = getCurrentBSDate();
  if (year < current.year) return true;
  if (year === current.year && month < current.month) return true;
  if (year === current.year && month === current.month && day < current.day) return true;
  return false;
}

interface DayInfo {
  day: number;
  eventCount: number;
  clients: { clientName: string; eventName: string; contactNumber: string | null; whatsappNumber: string | null; eventCity: string | null }[];
}

export default function BookingCalendar({ events }: BookingCalendarProps) {
  const [showAll, setShowAll] = useState(false);
  const [hoveredDay, setHoveredDay] = useState<string | null>(null);

  const calendarData = useMemo(() => {
    // Group events by BS date
    const dateMap = new Map<string, { clientName: string; eventName: string; contactNumber: string | null; whatsappNumber: string | null; eventCity: string | null }[]>();

    events.forEach(ev => {
      if (!ev.event_date_ad) return;
      try {
        const [y, m, d] = ev.event_date_ad.split('-').map(Number);
        const bs = adToBS(new Date(y, m - 1, d));
        const key = `${bs.year}-${bs.month}-${bs.day}`;
        if (!dateMap.has(key)) dateMap.set(key, []);
        dateMap.get(key)!.push({
          clientName: ev.client_name,
          eventName: ev.event_name || 'Event',
          contactNumber: ev.contact_number,
          whatsappNumber: ev.whatsapp_number,
          eventCity: ev.event_city,
        });
      } catch {}
    });

    const current = getCurrentBSDate();

    const months: {
      year: number;
      month: number;
      monthName: string;
      days: DayInfo[];
      bookedCount: number;
    }[] = [];

    const buildMonth = (yearNum: number, monthNum: number) => {
      const daysInMonth = getDaysInBSMonth(yearNum, monthNum);
      const monthName = nepaliMonthsEnglish[monthNum - 1];
      const days: DayInfo[] = [];
      let bookedCount = 0;
      for (let day = 1; day <= daysInMonth; day++) {
        const key = `${yearNum}-${monthNum}-${day}`;
        const dayClients = dateMap.get(key) || [];
        if (dayClients.length > 0) bookedCount++;
        days.push({ day, eventCount: dayClients.length, clients: dayClients });
      }
      return { year: yearNum, month: monthNum, monthName, days, bookedCount };
    };

    if (showAll) {
      // Full BS year incl. past months (Baisakh → Chaitra of current BS year).
      for (let m = 1; m <= 12; m++) months.push(buildMonth(current.year, m));
    } else {
      // Compact: next 4 upcoming months (from current month) that have ≥1 booking.
      let y = current.year;
      let m = current.month;
      let scanned = 0;
      while (months.length < 4 && scanned < 24) {
        const built = buildMonth(y, m);
        if (built.bookedCount > 0) months.push(built);
        scanned++;
        if (m === 12) { m = 1; y += 1; } else { m += 1; }
      }
    }

    return months;
  }, [events, showAll]);

  return (
    <Card className="mb-6 shadow-sm">
      <CardHeader className="pb-2 pt-3 px-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Calendar className="w-4 h-4 text-emerald-600" />
            <span className="font-semibold text-sm text-foreground">Booking Calendar</span>
            <span className="text-xs text-muted-foreground flex items-center gap-1.5">
              (<span className="inline-flex items-center justify-center w-3 h-3 rounded-full bg-emerald-500" /> Booked)
            </span>
          </div>
          <Button
            variant="ghost"
            size="sm"
            className="text-xs h-6"
            onClick={() => setShowAll(!showAll)}
          >
            {showAll ? 'Show Less' : 'View All Year'}
            <ChevronRight className={cn('w-3 h-3 ml-1 transition-transform', showAll && 'rotate-90')} />
          </Button>
        </div>
      </CardHeader>
      <CardContent className="py-2 px-4 space-y-1.5">
        {calendarData.map((monthData) => (
          <div
            key={`${monthData.year}-${monthData.month}`}
            className="flex items-center gap-3 px-3 py-2 rounded-md bg-muted/40 border border-border"
          >
            <Badge className="bg-gradient-to-r from-emerald-500 to-emerald-600 text-white text-xs min-w-[110px] justify-center shrink-0 hover:from-emerald-500 hover:to-emerald-600">
              {monthData.monthName} {monthData.year}
            </Badge>

            <span className="text-muted-foreground/60 font-medium">:</span>

            <div className="flex-1 flex flex-wrap gap-x-1 gap-y-1.5 min-w-0 items-center">
              {monthData.days.map(({ day, eventCount, clients: dayClients }) => {
                const isPast = isBSDatePast(monthData.year, monthData.month, day);
                const calDayKey = `${monthData.year}-${monthData.month}-${day}`;

                if (eventCount > 0) {
                  const totalRingSize = 20 + (eventCount - 1) * 8;
                  return (
                    <div
                      key={day}
                      className="relative"
                      onMouseEnter={() => setHoveredDay(calDayKey)}
                      onMouseLeave={() => setHoveredDay(null)}
                    >
                      <div
                        className={cn(
                          'relative inline-flex items-center justify-center cursor-pointer transition-all hover:scale-110',
                          isPast && 'opacity-50'
                        )}
                        style={{ width: `${totalRingSize}px`, height: `${totalRingSize}px` }}
                      >
                        {/* Outer rings for multiple events */}
                        {Array.from({ length: eventCount - 1 }, (_, i) => {
                          const ringIndex = eventCount - 1 - i;
                          const size = 20 + ringIndex * 8;
                          return (
                            <span
                              key={ringIndex}
                              className={cn(
                                'absolute rounded-full border-2',
                                isPast ? 'border-muted-foreground/40' : 'border-emerald-500'
                              )}
                              style={{ width: `${size}px`, height: `${size}px` }}
                            />
                          );
                        })}
                        {/* Inner filled circle */}
                        <span
                          className={cn(
                            'w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold z-10 text-white',
                            isPast ? 'bg-muted-foreground/60' : 'bg-emerald-500'
                          )}
                        >
                          {isPast ? <CheckCircle className="w-3 h-3" /> : day}
                        </span>
                      </div>

                      {/* Hover popup */}
                      {hoveredDay === calDayKey && dayClients.length > 0 && (
                        <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 z-50 bg-popover text-popover-foreground border border-border rounded-lg shadow-xl p-3 min-w-[220px] max-w-[280px]">
                          <p className="text-xs font-bold text-foreground mb-2">
                            {monthData.monthName} {day}, {monthData.year}
                          </p>
                          <div className="space-y-2">
                            {dayClients.map((c, i) => (
                              <div key={i} className="flex items-start justify-between gap-2">
                                <div className="min-w-0 flex-1">
                                  <p className="text-xs font-semibold text-foreground truncate">{c.clientName}</p>
                                  <p className="text-[10px] text-muted-foreground">{c.eventName}</p>
                                  {c.eventCity && <p className="text-[10px] text-muted-foreground/80">{c.eventCity}</p>}
                                </div>
                                <div className="flex gap-1 shrink-0">
                                  {c.contactNumber && (
                                    <button
                                      onClick={(e) => { e.stopPropagation(); window.open(`tel:${c.contactNumber}`, '_self'); }}
                                      className="w-5 h-5 rounded-full bg-blue-100 flex items-center justify-center hover:bg-blue-200"
                                    >
                                      <Phone className="w-3 h-3 text-blue-600" />
                                    </button>
                                  )}
                                  {c.whatsappNumber && (
                                    <button
                                      onClick={(e) => { e.stopPropagation(); window.open(`https://wa.me/${c.whatsappNumber}`, '_blank'); }}
                                      className="w-5 h-5 rounded-full bg-emerald-100 flex items-center justify-center hover:bg-emerald-200"
                                    >
                                      <MessageCircle className="w-3 h-3 text-emerald-600" />
                                    </button>
                                  )}
                                </div>
                              </div>
                            ))}
                          </div>
                          {/* Arrow */}
                          <div className="absolute top-full left-1/2 -translate-x-1/2 w-0 h-0 border-l-[6px] border-r-[6px] border-t-[6px] border-l-transparent border-r-transparent border-t-border" />
                        </div>
                      )}
                    </div>
                  );
                }

                // Open day - plain number
                return (
                  <span
                    key={day}
                    className="w-5 h-5 flex items-center justify-center font-mono text-[10px] text-muted-foreground/50"
                  >
                    {day}
                  </span>
                );
              })}
            </div>

            <Badge
              variant="outline"
              className={cn(
                'text-xs shrink-0',
                monthData.bookedCount > 0
                  ? 'border-emerald-500 text-emerald-600'
                  : 'text-muted-foreground border-border'
              )}
            >
              {monthData.bookedCount} booked
            </Badge>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
