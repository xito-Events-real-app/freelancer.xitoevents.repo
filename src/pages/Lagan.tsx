import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronLeft } from 'lucide-react';
import { useAllGlobalLaganDates } from '@/hooks/useGlobalLaganDates';
import { GaneshIcon } from '@/components/company/GaneshIcon';
import { getCurrentBSDate, nepaliMonthsEnglish } from '@/lib/nepaliCalendar';
import { cn } from '@/lib/utils';

export default function Lagan() {
  const navigate = useNavigate();
  const { data: allLagans = [], isLoading } = useAllGlobalLaganDates();
  const currentBS = useMemo(() => getCurrentBSDate(), []);

  const grouped = useMemo(() => {
    const map = new Map<number, Map<number, number[]>>();
    for (const r of allLagans) {
      if (!map.has(r.bs_year)) map.set(r.bs_year, new Map());
      const ym = map.get(r.bs_year)!;
      if (!ym.has(r.bs_month)) ym.set(r.bs_month, []);
      ym.get(r.bs_month)!.push(r.bs_day);
    }
    for (const [, ym] of map) {
      for (const [, days] of ym) days.sort((a, b) => a - b);
    }
    return map;
  }, [allLagans]);

  const years = useMemo(
    () => Array.from(grouped.keys()).sort((a, b) => a - b),
    [grouped]
  );

  const defaultYear = years.includes(currentBS.year) ? currentBS.year : (years[0] ?? currentBS.year);
  const [selectedYear, setSelectedYear] = useState<number>(defaultYear);

  const monthsForYear = grouped.get(selectedYear) ?? new Map<number, number[]>();

  return (
    <div className="min-h-screen bg-background pb-24">
      <div className="max-w-lg lg:max-w-3xl mx-auto px-4 py-4">
        {/* Header */}
        <div className="flex items-center gap-2 mb-4">
          <button
            onClick={() => navigate(-1)}
            className="p-2 rounded-lg hover:bg-muted transition-colors"
            aria-label="Back"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          <GaneshIcon className="w-5 h-5 text-orange-400" />
          <h1 className="text-xl font-bold">Lagan Dates</h1>
        </div>

        {isLoading ? (
          <p className="text-sm text-muted-foreground py-12 text-center">Loading…</p>
        ) : years.length === 0 ? (
          <p className="text-sm text-muted-foreground py-12 text-center">
            No Lagan dates have been added yet.
          </p>
        ) : (
          <>
            {/* Year chips */}
            <div className="flex items-center gap-1.5 flex-wrap mb-4">
              {years.map(y => (
                <button
                  key={y}
                  onClick={() => setSelectedYear(y)}
                  className={cn(
                    'text-xs px-3 py-1.5 rounded-full font-semibold transition-all',
                    selectedYear === y
                      ? 'bg-orange-500 text-white ring-2 ring-orange-300'
                      : 'bg-orange-500/15 text-orange-300 hover:bg-orange-500/25'
                  )}
                >
                  {y} BS
                </button>
              ))}
            </div>

            {/* 12-month grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {Array.from({ length: 12 }).map((_, i) => {
                const monthNum = i + 1;
                const days = monthsForYear.get(monthNum) ?? [];
                const isCurrent = selectedYear === currentBS.year && monthNum === currentBS.month;

                return (
                  <div
                    key={monthNum}
                    className={cn(
                      'rounded-xl border p-3 space-y-2',
                      isCurrent
                        ? 'bg-orange-500/15 border-orange-400/50'
                        : 'bg-muted/30 border-border'
                    )}
                  >
                    <div className="flex items-center justify-between">
                      <p className={cn(
                        'text-sm font-bold',
                        isCurrent ? 'text-orange-300' : 'text-foreground'
                      )}>
                        {nepaliMonthsEnglish[i]}
                      </p>
                      <span className="text-[10px] text-muted-foreground">
                        {days.length} {days.length === 1 ? 'day' : 'days'}
                      </span>
                    </div>
                    {days.length > 0 ? (
                      <div className="flex items-center gap-1 flex-wrap">
                        {days.map(d => (
                          <span
                            key={d}
                            className="text-[11px] px-2 py-0.5 rounded-full font-semibold bg-orange-400/80 text-white"
                          >
                            {d}
                          </span>
                        ))}
                      </div>
                    ) : (
                      <p className="text-[11px] text-muted-foreground">—</p>
                    )}
                  </div>
                );
              })}
            </div>

            <p className="text-[11px] text-muted-foreground text-center mt-6">
              Lagan dates are managed by Xito admins.
            </p>
          </>
        )}
      </div>
    </div>
  );
}
