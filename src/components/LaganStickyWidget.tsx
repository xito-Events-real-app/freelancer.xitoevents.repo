import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { ChevronDown, ChevronUp, ExternalLink } from 'lucide-react';
import { useAllGlobalLaganDates } from '@/hooks/useGlobalLaganDates';
import { GaneshIcon } from '@/components/company/GaneshIcon';
import { getCurrentBSDate, nepaliMonthsEnglish } from '@/lib/nepaliCalendar';
import { cn } from '@/lib/utils';

export default function LaganStickyWidget() {
  const { data: allLagans = [] } = useAllGlobalLaganDates();
  const [expanded, setExpanded] = useState(false);
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

  const thisMonthDays = useMemo(
    () => (grouped.get(currentBS.year)?.get(currentBS.month) ?? []).slice(),
    [grouped, currentBS]
  );

  if (allLagans.length === 0) return null;

  const sortedYears = Array.from(grouped.keys()).sort((a, b) => a - b);

  return (
    <div className="-mx-4 px-4 pt-1 pb-1.5">
      <div className="rounded-lg bg-gradient-to-r from-violet-500/15 via-fuchsia-500/10 to-emerald-500/15 border border-violet-400/30 overflow-hidden">
        <button
          onClick={() => setExpanded(e => !e)}
          className="w-full flex items-center gap-1.5 px-2 py-1 text-left"
        >
          <GaneshIcon className="w-3 h-3 text-violet-300 shrink-0" />
          <span className="text-[9px] font-bold text-violet-300 shrink-0 uppercase tracking-wide">
            Lagan • {nepaliMonthsEnglish[currentBS.month - 1]}
          </span>
          <div className="flex items-center gap-0.5 flex-wrap flex-1 min-w-0">
            {thisMonthDays.length > 0 ? (
              thisMonthDays.map(d => (
                <span
                  key={d}
                  className="text-[9px] px-1 py-px rounded-full font-semibold bg-violet-500/70 text-white"
                >
                  {d}
                </span>
              ))
            ) : (
              <span className="text-[9px] text-violet-300/70">No Lagan this month</span>
            )}
          </div>
          <Link
            to="/lagan"
            onClick={(e) => e.stopPropagation()}
            className="p-0.5 rounded hover:bg-violet-500/20 transition-colors shrink-0"
            title="Open full Lagan calendar"
          >
            <ExternalLink className="w-3 h-3 text-violet-300" />
          </Link>
          {expanded ? (
            <ChevronUp className="w-3 h-3 text-violet-300 shrink-0" />
          ) : (
            <ChevronDown className="w-3 h-3 text-violet-300 shrink-0" />
          )}
        </button>

        {expanded && (
          <div className="border-t border-violet-400/20 px-2 py-1.5 max-h-64 overflow-y-auto space-y-2">
            {sortedYears.map(year => {
              const months = grouped.get(year)!;
              const sortedMonths = Array.from(months.keys()).sort((a, b) => a - b);
              return (
                <div key={year} className="space-y-1">
                  <p className="text-[10px] font-bold text-violet-300">{year} BS</p>
                  {sortedMonths.map(m => (
                    <div key={m} className="flex items-start gap-1.5">
                      <span className={cn(
                        'text-[9px] font-semibold w-14 shrink-0 pt-0.5',
                        year === currentBS.year && m === currentBS.month
                          ? 'text-violet-200'
                          : 'text-violet-300/70'
                      )}>
                        {nepaliMonthsEnglish[m - 1]}
                      </span>
                      <div className="flex items-center gap-0.5 flex-wrap flex-1">
                        {months.get(m)!.map(d => (
                          <span
                            key={d}
                            className="text-[9px] px-1 py-px rounded-full font-semibold bg-violet-500/70 text-white"
                          >
                            {d}
                          </span>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              );
            })}
            <Link
              to="/lagan"
              className="block text-center text-[10px] font-semibold text-violet-300 hover:text-violet-200 underline pt-1"
            >
              Open full Lagan calendar →
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
