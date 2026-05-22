import { useMemo, useState } from 'react';
import { ChevronLeft, ChevronRight, Loader2, X } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { GaneshIcon } from '@/components/company/GaneshIcon';
import {
  useGlobalLaganDates,
  useAllGlobalLaganDates,
  useToggleGlobalLaganDate,
  type LaganRow,
} from '@/hooks/useGlobalLaganDates';
import { getCurrentBSDate, getDaysInBSMonth, nepaliMonthsEnglish } from '@/lib/nepaliCalendar';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

export default function LaganDatesPanel() {
  const currentBS = useMemo(() => getCurrentBSDate(), []);
  const [bsYear, setBsYear] = useState(currentBS.year);
  const [bsMonth, setBsMonth] = useState(currentBS.month);

  // Show 10 years before and 10 years after current
  const years = useMemo(
    () => Array.from({ length: 21 }, (_, i) => currentBS.year - 10 + i),
    [currentBS.year],
  );

  const daysInMonth = useMemo(() => {
    try { return getDaysInBSMonth(bsYear, bsMonth); } catch { return 30; }
  }, [bsYear, bsMonth]);

  const { data: monthDays = [], isLoading } = useGlobalLaganDates(bsYear, bsMonth);
  const { data: allLagans = [] } = useAllGlobalLaganDates();
  const toggle = useToggleGlobalLaganDate();

  const handleToggle = (day: number, isLagan: boolean) => {
    toggle.mutate(
      { bsYear, bsMonth, bsDay: day, isLagan },
      {
        onError: (e: any) => toast.error(e?.message || 'Failed to update Lagan date'),
      },
    );
  };

  const prev = () => {
    if (bsMonth === 1) { setBsMonth(12); setBsYear(y => y - 1); }
    else setBsMonth(m => m - 1);
  };
  const next = () => {
    if (bsMonth === 12) { setBsMonth(1); setBsYear(y => y + 1); }
    else setBsMonth(m => m + 1);
  };

  // Group all lagans by year then month for "All Years" overview
  const grouped = useMemo(() => {
    const map = new Map<number, Map<number, LaganRow[]>>();
    for (const r of allLagans) {
      if (!map.has(r.bs_year)) map.set(r.bs_year, new Map());
      const months = map.get(r.bs_year)!;
      if (!months.has(r.bs_month)) months.set(r.bs_month, []);
      months.get(r.bs_month)!.push(r);
    }
    return map;
  }, [allLagans]);

  return (
    <div className="space-y-6">
      <Card>
        <CardContent className="p-5 space-y-4">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-lg bg-orange-500">
              <GaneshIcon className="h-4 w-4 text-white" />
            </div>
            <div>
              <h3 className="font-bold">Manage Lagan Dates</h3>
              <p className="text-xs text-muted-foreground">
                These dates appear globally on every company event calendar and freelancer schedule.
              </p>
            </div>
          </div>

          {/* Month/Year nav */}
          <div className="flex items-center gap-2 flex-wrap">
            <Select value={String(bsYear)} onValueChange={v => setBsYear(Number(v))}>
              <SelectTrigger className="w-28 h-9"><SelectValue /></SelectTrigger>
              <SelectContent className="z-[200] max-h-72">
                {years.map(y => <SelectItem key={y} value={String(y)}>{y}</SelectItem>)}
              </SelectContent>
            </Select>
            <button onClick={prev} className="p-2 rounded-md hover:bg-muted">
              <ChevronLeft className="w-4 h-4" />
            </button>
            <Select value={String(bsMonth)} onValueChange={v => setBsMonth(Number(v))}>
              <SelectTrigger className="w-36 h-9">
                <SelectValue>{nepaliMonthsEnglish[bsMonth - 1]}</SelectValue>
              </SelectTrigger>
              <SelectContent className="z-[200]">
                {nepaliMonthsEnglish.map((m, i) => (
                  <SelectItem key={i} value={String(i + 1)}>{m}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <button onClick={next} className="p-2 rounded-md hover:bg-muted">
              <ChevronRight className="w-4 h-4" />
            </button>
            {isLoading && <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />}
          </div>

          {/* Day grid */}
          <div>
            <div className="text-xs font-bold uppercase text-muted-foreground mb-2">
              Tap a day to toggle Lagan
            </div>
            <div className="grid grid-cols-7 gap-1.5">
              {Array.from({ length: daysInMonth }, (_, i) => i + 1).map(day => {
                const isLagan = monthDays.includes(day);
                return (
                  <button
                    key={day}
                    disabled={toggle.isPending}
                    onClick={() => handleToggle(day, isLagan)}
                    className={cn(
                      'h-10 rounded-lg text-sm font-bold transition-all',
                      isLagan
                        ? 'bg-orange-500 text-white ring-2 ring-orange-300 shadow-md'
                        : 'bg-muted hover:bg-muted/70 text-foreground',
                    )}
                  >
                    {day}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Pills */}
          {monthDays.length > 0 && (
            <div>
              <div className="text-xs font-bold uppercase text-muted-foreground mb-2">
                Lagan days this month ({monthDays.length})
              </div>
              <div className="flex flex-wrap gap-2">
                {[...monthDays].sort((a, b) => a - b).map(d => (
                  <button
                    key={d}
                    onClick={() => handleToggle(d, true)}
                    className="inline-flex items-center gap-1 bg-orange-500 text-white text-xs font-bold px-2.5 py-1 rounded-full hover:bg-orange-600"
                  >
                    {d}
                    <X className="w-3 h-3" />
                  </button>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* All-years overview */}
      <Card>
        <CardContent className="p-5">
          <h3 className="font-bold mb-3">All Lagan dates ({allLagans.length})</h3>
          {grouped.size === 0 ? (
            <p className="text-sm text-muted-foreground">No Lagan dates set yet.</p>
          ) : (
            <div className="space-y-3">
              {[...grouped.entries()]
                .sort((a, b) => a[0] - b[0])
                .map(([year, months]) => (
                  <div key={year} className="border rounded-lg p-3">
                    <div className="font-bold text-sm mb-2">{year}</div>
                    <div className="space-y-1.5">
                      {[...months.entries()]
                        .sort((a, b) => a[0] - b[0])
                        .map(([month, rows]) => (
                          <button
                            key={month}
                            onClick={() => { setBsYear(year); setBsMonth(month); }}
                            className="w-full text-left flex flex-wrap items-center gap-2 hover:bg-muted/50 rounded px-2 py-1.5"
                          >
                            <span className="text-xs font-semibold w-24 shrink-0">
                              {nepaliMonthsEnglish[month - 1]}
                            </span>
                            <div className="flex flex-wrap gap-1">
                              {rows.map(r => (
                                <span
                                  key={r.id}
                                  className="text-[11px] bg-orange-500 text-white font-bold px-1.5 py-0.5 rounded-full"
                                >
                                  {r.bs_day}
                                </span>
                              ))}
                            </div>
                          </button>
                        ))}
                    </div>
                  </div>
                ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
