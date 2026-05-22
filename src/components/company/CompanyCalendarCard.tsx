import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Calendar as CalendarIcon, ChevronLeft, ChevronRight, X, MapPin, Phone, MessageCircle, Sparkles } from 'lucide-react';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { cn } from '@/lib/utils';
import { format, parseISO } from 'date-fns';
import {
  adToBS,
  bsToAD,
  getCurrentBSDate,
  getDaysInBSMonth,
  getFirstDayOfBSMonth,
  nepaliMonthsEnglish,
} from '@/lib/nepaliCalendar';
import { useGlobalLaganDates } from '@/hooks/useGlobalLaganDates';
import type { AgencyEventWithClient } from '@/hooks/useAllAgencyEvents';

type Mode = 'BS' | 'AD';

const WEEK = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];
const adMonthNames = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

interface DayCell {
  key: string;
  inMonth: boolean;
  dayLabel: number;
  adKey: string | null; // YYYY-MM-DD
  isLagan: boolean;
  isToday: boolean;
  events: AgencyEventWithClient[];
  // For tooltip
  bsLabel?: string;
  adLabel?: string;
}

function pad(n: number) { return String(n).padStart(2, '0'); }
function adKey(d: Date) { return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}`; }

function useEventsByDate(events: AgencyEventWithClient[]) {
  return useMemo(() => {
    const map = new Map<string, AgencyEventWithClient[]>();
    for (const e of events) {
      if (!e.event_date_ad) continue;
      const k = e.event_date_ad.slice(0, 10);
      if (!map.has(k)) map.set(k, []);
      map.get(k)!.push(e);
    }
    return map;
  }, [events]);
}

/** Build cells for current month view in either BS or AD. */
function useMonthCells(
  mode: Mode,
  year: number,
  month: number, // 1-indexed for BS; 0-indexed for AD (we use 1-indexed everywhere here)
  eventsByDate: Map<string, AgencyEventWithClient[]>,
  laganBSDays: Set<number>,
  laganBSPrev: Set<number>,
  laganBSNext: Set<number>,
  prevMonthBS: { y: number; m: number },
  nextMonthBS: { y: number; m: number },
): { cells: DayCell[]; title: string } {
  return useMemo(() => {
    const cells: DayCell[] = [];
    const todayKey = adKey(new Date());

    if (mode === 'BS') {
      const daysIn = getDaysInBSMonth(year, month);
      const firstDow = getFirstDayOfBSMonth(year, month);
      const prevDays = getDaysInBSMonth(prevMonthBS.y, prevMonthBS.m);

      // leading
      for (let i = firstDow - 1; i >= 0; i--) {
        const d = prevDays - i;
        const ad = bsToAD(prevMonthBS.y, prevMonthBS.m, d);
        const k = adKey(ad);
        cells.push({
          key: `p-${d}`, inMonth: false, dayLabel: d, adKey: k,
          isLagan: false, isToday: k === todayKey, events: eventsByDate.get(k) || [],
        });
      }
      // current
      for (let d = 1; d <= daysIn; d++) {
        const ad = bsToAD(year, month, d);
        const k = adKey(ad);
        cells.push({
          key: `c-${d}`, inMonth: true, dayLabel: d, adKey: k,
          isLagan: laganBSDays.has(d),
          isToday: k === todayKey,
          events: eventsByDate.get(k) || [],
          bsLabel: `${nepaliMonthsEnglish[month-1]} ${d}, ${year}`,
          adLabel: format(ad, 'MMM d, yyyy'),
        });
      }
      // trailing to fill 6 rows of 7
      const total = Math.ceil(cells.length / 7) * 7;
      let nd = 1;
      while (cells.length < total) {
        const ad = bsToAD(nextMonthBS.y, nextMonthBS.m, nd);
        const k = adKey(ad);
        cells.push({
          key: `n-${nd}`, inMonth: false, dayLabel: nd, adKey: k,
          isLagan: false, isToday: k === todayKey, events: eventsByDate.get(k) || [],
        });
        nd++;
      }
      return { cells, title: `${nepaliMonthsEnglish[month-1]} ${year}` };
    }

    // AD mode
    const first = new Date(year, month - 1, 1);
    const firstDow = first.getDay();
    const daysIn = new Date(year, month, 0).getDate();
    const prevLast = new Date(year, month - 1, 0);
    const prevDays = prevLast.getDate();

    // Build set of AD lagan day-keys overlapping this month from BS lagan sets
    const adLaganSet = new Set<string>();
    const addLagan = (bsY: number, bsM: number, days: Set<number>) => {
      for (const d of days) {
        try {
          const a = bsToAD(bsY, bsM, d);
          if (a.getFullYear() === year && a.getMonth() === month - 1) adLaganSet.add(adKey(a));
        } catch {}
      }
    };
    // Determine which BS months overlap this AD month
    const startBS = adToBS(first);
    const endBS = adToBS(new Date(year, month - 1, daysIn));
    addLagan(startBS.year, startBS.month, laganBSDays);
    if (endBS.year !== startBS.year || endBS.month !== startBS.month) {
      addLagan(endBS.year, endBS.month, laganBSNext);
    }

    for (let i = firstDow - 1; i >= 0; i--) {
      const day = prevDays - i;
      const d = new Date(year, month - 2, day);
      const k = adKey(d);
      cells.push({
        key: `p-${day}`, inMonth: false, dayLabel: day, adKey: k,
        isLagan: adLaganSet.has(k), isToday: k === todayKey, events: eventsByDate.get(k) || [],
      });
    }
    for (let day = 1; day <= daysIn; day++) {
      const d = new Date(year, month - 1, day);
      const k = adKey(d);
      const bs = adToBS(d);
      cells.push({
        key: `c-${day}`, inMonth: true, dayLabel: day, adKey: k,
        isLagan: adLaganSet.has(k),
        isToday: k === todayKey,
        events: eventsByDate.get(k) || [],
        adLabel: format(d, 'MMM d, yyyy'),
        bsLabel: `${nepaliMonthsEnglish[bs.month-1]} ${bs.day}, ${bs.year}`,
      });
    }
    const total = Math.ceil(cells.length / 7) * 7;
    let nd = 1;
    while (cells.length < total) {
      const d = new Date(year, month, nd);
      const k = adKey(d);
      cells.push({
        key: `n-${nd}`, inMonth: false, dayLabel: nd, adKey: k,
        isLagan: adLaganSet.has(k), isToday: k === todayKey, events: eventsByDate.get(k) || [],
      });
      nd++;
    }
    return { cells, title: `${adMonthNames[month-1]} ${year}` };
  }, [mode, year, month, eventsByDate, laganBSDays, laganBSPrev, laganBSNext, prevMonthBS, nextMonthBS]);
}

function shiftBS(y: number, m: number, delta: number) {
  let nm = m + delta, ny = y;
  while (nm < 1) { nm += 12; ny -= 1; }
  while (nm > 12) { nm -= 12; ny += 1; }
  return { y: ny, m: nm };
}
function shiftAD(y: number, m: number, delta: number) {
  let nm = m + delta, ny = y;
  while (nm < 1) { nm += 12; ny -= 1; }
  while (nm > 12) { nm -= 12; ny += 1; }
  return { y: ny, m: nm };
}

function MonthHeader({
  title, mode, onMode, onPrev, onNext, compact,
}: { title: string; mode: Mode; onMode: (m: Mode)=>void; onPrev: ()=>void; onNext: ()=>void; compact?: boolean }) {
  return (
    <div className="flex items-center justify-between gap-2">
      <div className="flex items-center gap-1">
        <button type="button" onClick={(e)=>{e.stopPropagation();onPrev();}} className="w-7 h-7 flex items-center justify-center rounded-full hover:bg-gray-100">
          <ChevronLeft className="w-4 h-4" />
        </button>
        <span className={cn('font-bold text-gray-900', compact ? 'text-sm' : 'text-base')}>{title}</span>
        <button type="button" onClick={(e)=>{e.stopPropagation();onNext();}} className="w-7 h-7 flex items-center justify-center rounded-full hover:bg-gray-100">
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>
      <div className="inline-flex rounded-full bg-gray-100 p-0.5 text-[10px] font-bold">
        {(['BS','AD'] as Mode[]).map(m => (
          <button
            key={m}
            type="button"
            onClick={(e)=>{e.stopPropagation();onMode(m);}}
            className={cn(
              'px-2.5 py-0.5 rounded-full transition-colors',
              mode === m ? 'bg-white text-violet-700 shadow-sm' : 'text-gray-500'
            )}
          >{m}</button>
        ))}
      </div>
    </div>
  );
}

interface Props {
  events: AgencyEventWithClient[];
  className?: string;
}

export default function CompanyCalendarCard({ events, className }: Props) {
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState<Mode>('BS');

  const today = new Date();
  const todayBS = useMemo(() => getCurrentBSDate(), []);
  const [bsY, setBsY] = useState(todayBS.year);
  const [bsM, setBsM] = useState(todayBS.month);
  const [adY, setAdY] = useState(today.getFullYear());
  const [adM, setAdM] = useState(today.getMonth() + 1);

  const eventsByDate = useEventsByDate(events);

  // For BS mode: lagan for current/prev/next BS month
  const prevBS = shiftBS(bsY, bsM, -1);
  const nextBS = shiftBS(bsY, bsM, 1);
  const { data: laganCur = [] } = useGlobalLaganDates(bsY, bsM);
  const { data: laganPrev = [] } = useGlobalLaganDates(prevBS.y, prevBS.m);
  const { data: laganNext = [] } = useGlobalLaganDates(nextBS.y, nextBS.m);

  // For AD mode: need lagan for BS months overlapping current AD month
  const adFirstBS = useMemo(() => adToBS(new Date(adY, adM-1, 1)), [adY, adM]);
  const adLastBS = useMemo(() => adToBS(new Date(adY, adM, 0)), [adY, adM]);
  const { data: laganAdA = [] } = useGlobalLaganDates(adFirstBS.year, adFirstBS.month);
  const { data: laganAdB = [] } = useGlobalLaganDates(adLastBS.year, adLastBS.month);

  // Pick the right lagan sets depending on mode
  const laganBSDays = useMemo(() => new Set(mode === 'BS' ? laganCur : laganAdA), [mode, laganCur, laganAdA]);
  const laganBSPrev = useMemo(() => new Set(laganPrev), [laganPrev]);
  const laganBSNext = useMemo(() => new Set(mode === 'BS' ? laganNext : laganAdB), [mode, laganNext, laganAdB]);

  const cardYear = mode === 'BS' ? bsY : adY;
  const cardMonth = mode === 'BS' ? bsM : adM;
  const prevMonth = mode === 'BS' ? prevBS : shiftAD(adY, adM, -1);
  const nextMonth = mode === 'BS' ? nextBS : shiftAD(adY, adM, 1);

  const { cells, title } = useMonthCells(
    mode, cardYear, cardMonth, eventsByDate, laganBSDays, laganBSPrev, laganBSNext,
    mode === 'BS' ? prevMonth : { y: adFirstBS.year, m: adFirstBS.month },
    mode === 'BS' ? nextMonth : { y: adLastBS.year, m: adLastBS.month },
  );

  const goPrev = () => {
    if (mode === 'BS') { const s = shiftBS(bsY,bsM,-1); setBsY(s.y); setBsM(s.m); }
    else { const s = shiftAD(adY,adM,-1); setAdY(s.y); setAdM(s.m); }
  };
  const goNext = () => {
    if (mode === 'BS') { const s = shiftBS(bsY,bsM,1); setBsY(s.y); setBsM(s.m); }
    else { const s = shiftAD(adY,adM,1); setAdY(s.y); setAdM(s.m); }
  };

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={cn(
          'group bg-white rounded-2xl border border-gray-200 p-4 shadow-sm hover:shadow-lg shadow-rose-500/10 transition-all text-left',
          className
        )}
      >
        <div className="flex items-center gap-2 mb-2">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-rose-500 to-pink-600 flex items-center justify-center shadow-md shadow-rose-500/25">
            <CalendarIcon className="w-4 h-4 text-white" />
          </div>
          <div className="flex-1 min-w-0">
            <MonthHeader title={title} mode={mode} onMode={setMode} onPrev={goPrev} onNext={goNext} compact />
          </div>
        </div>
        <MiniGrid cells={cells} />
        <div className="mt-2 flex items-center justify-between text-[10px] text-gray-500">
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-amber-400" /> Lagan</span>
            <span className="inline-flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-emerald-500" /> Event</span>
          </div>
          <span className="font-semibold text-violet-600 group-hover:underline">Open full calendar →</span>
        </div>
      </button>

      <FullCalendarDialog
        open={open}
        onOpenChange={setOpen}
        events={events}
      />
    </>
  );
}

function MiniGrid({ cells }: { cells: DayCell[] }) {
  return (
    <div>
      <div className="grid grid-cols-7 gap-0.5 mb-1">
        {WEEK.map((d, i) => (
          <div key={i} className="text-center text-[9px] font-bold text-gray-400 uppercase">{d}</div>
        ))}
      </div>
      <div className="grid grid-cols-7 gap-0.5">
        {cells.map(c => (
          <div
            key={c.key}
            className={cn(
              'aspect-square relative flex items-center justify-center rounded-md text-[10px] font-semibold',
              !c.inMonth && 'text-gray-300',
              c.inMonth && c.isLagan && 'bg-amber-100 text-amber-800',
              c.inMonth && !c.isLagan && 'text-gray-700',
              c.isToday && 'ring-1 ring-violet-500',
            )}
          >
            {c.dayLabel}
            {c.events.length > 0 && (
              <span className="absolute bottom-0.5 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-emerald-500" />
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

function FullCalendarDialog({
  open, onOpenChange, events,
}: { open: boolean; onOpenChange: (o:boolean)=>void; events: AgencyEventWithClient[] }) {
  const navigate = useNavigate();
  const [mode, setMode] = useState<Mode>('BS');
  const today = new Date();
  const todayBS = useMemo(() => getCurrentBSDate(), []);
  const [bsY, setBsY] = useState(todayBS.year);
  const [bsM, setBsM] = useState(todayBS.month);
  const [adY, setAdY] = useState(today.getFullYear());
  const [adM, setAdM] = useState(today.getMonth() + 1);
  const [selectedKey, setSelectedKey] = useState<string>(`${today.getFullYear()}-${pad(today.getMonth()+1)}-${pad(today.getDate())}`);

  const eventsByDate = useEventsByDate(events);
  const prevBS = shiftBS(bsY, bsM, -1);
  const nextBS = shiftBS(bsY, bsM, 1);
  const { data: laganCur = [] } = useGlobalLaganDates(bsY, bsM);
  const { data: laganPrev = [] } = useGlobalLaganDates(prevBS.y, prevBS.m);
  const { data: laganNext = [] } = useGlobalLaganDates(nextBS.y, nextBS.m);
  const adFirstBS = useMemo(() => adToBS(new Date(adY, adM-1, 1)), [adY, adM]);
  const adLastBS = useMemo(() => adToBS(new Date(adY, adM, 0)), [adY, adM]);
  const { data: laganAdA = [] } = useGlobalLaganDates(adFirstBS.year, adFirstBS.month);
  const { data: laganAdB = [] } = useGlobalLaganDates(adLastBS.year, adLastBS.month);

  const laganBSDays = useMemo(() => new Set(mode === 'BS' ? laganCur : laganAdA), [mode, laganCur, laganAdA]);
  const laganBSPrev = useMemo(() => new Set(laganPrev), [laganPrev]);
  const laganBSNext = useMemo(() => new Set(mode === 'BS' ? laganNext : laganAdB), [mode, laganNext, laganAdB]);

  const cardYear = mode === 'BS' ? bsY : adY;
  const cardMonth = mode === 'BS' ? bsM : adM;

  const { cells, title } = useMonthCells(
    mode, cardYear, cardMonth, eventsByDate, laganBSDays, laganBSPrev, laganBSNext,
    mode === 'BS' ? prevBS : { y: adFirstBS.year, m: adFirstBS.month },
    mode === 'BS' ? nextBS : { y: adLastBS.year, m: adLastBS.month },
  );

  const goPrev = () => {
    if (mode === 'BS') { const s = shiftBS(bsY,bsM,-1); setBsY(s.y); setBsM(s.m); }
    else { const s = shiftAD(adY,adM,-1); setAdY(s.y); setAdM(s.m); }
  };
  const goNext = () => {
    if (mode === 'BS') { const s = shiftBS(bsY,bsM,1); setBsY(s.y); setBsM(s.m); }
    else { const s = shiftAD(adY,adM,1); setAdY(s.y); setAdM(s.m); }
  };

  const selectedCell = cells.find(c => c.adKey === selectedKey);
  const selectedEvents = selectedKey ? (eventsByDate.get(selectedKey) || []) : [];
  const selectedDate = selectedKey ? parseISO(selectedKey) : null;
  const selectedBS = selectedDate ? adToBS(selectedDate) : null;
  const selectedIsLagan = selectedCell?.isLagan;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-6xl w-[96vw] h-[90vh] p-0 flex flex-col overflow-hidden">
        <div className="flex items-center justify-between px-4 py-3 border-b">
          <div className="flex-1">
            <MonthHeader title={title} mode={mode} onMode={setMode} onPrev={goPrev} onNext={goNext} />
          </div>
          <button onClick={() => onOpenChange(false)} className="ml-3 w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="flex-1 min-h-0 grid grid-cols-1 md:grid-cols-[1fr_320px]">
          {/* Calendar */}
          <div className="p-3 md:p-4 overflow-auto border-r">
            <div className="grid grid-cols-7 gap-1 mb-1">
              {['Sun','Mon','Tue','Wed','Thu','Fri','Sat'].map(d => (
                <div key={d} className="text-center text-[10px] font-bold text-gray-500 uppercase tracking-wider">{d}</div>
              ))}
            </div>
            <div className="grid grid-cols-7 gap-1 auto-rows-fr">
              {cells.map(c => {
                const isSelected = c.adKey === selectedKey;
                return (
                  <button
                    type="button"
                    key={c.key}
                    onClick={() => c.adKey && setSelectedKey(c.adKey)}
                    className={cn(
                      'min-h-[64px] md:min-h-[88px] rounded-lg border p-1 text-left flex flex-col gap-0.5 transition-colors',
                      !c.inMonth ? 'bg-gray-50/60 border-gray-100 text-gray-300' : 'bg-white border-gray-200 hover:border-violet-300',
                      c.inMonth && c.isLagan && 'bg-amber-50 border-amber-200',
                      c.isToday && 'ring-1 ring-violet-500',
                      isSelected && 'ring-2 ring-violet-600 border-violet-400',
                    )}
                  >
                    <div className="flex items-center justify-between">
                      <span className={cn('text-xs font-bold', c.isLagan && c.inMonth && 'text-amber-700')}>{c.dayLabel}</span>
                      {c.isLagan && c.inMonth && <Sparkles className="w-3 h-3 text-amber-500" />}
                    </div>
                    <div className="flex-1 flex flex-col gap-0.5 overflow-hidden">
                      {c.events.slice(0,2).map((e, i) => (
                        <span key={i} className="truncate rounded px-1 py-px text-[9px] font-semibold bg-emerald-100 text-emerald-700">
                          {e.client_name}
                        </span>
                      ))}
                      {c.events.length > 2 && (
                        <span className="text-[9px] font-semibold text-emerald-600">+{c.events.length - 2} more</span>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Right panel */}
          <div className="overflow-auto p-4 bg-gray-50">
            {selectedDate && selectedBS ? (
              <>
                <p className="text-[11px] uppercase tracking-wider text-gray-500 font-bold">Selected</p>
                <h3 className="text-lg font-bold text-gray-900">
                  {nepaliMonthsEnglish[selectedBS.month-1]} {selectedBS.day}, {selectedBS.year}
                </h3>
                <p className="text-xs text-gray-500">{format(selectedDate, 'EEE, MMM d, yyyy')}</p>
                {selectedIsLagan && (
                  <span className="mt-2 inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-700">
                    <Sparkles className="w-3 h-3" /> Lagan Day
                  </span>
                )}

                <div className="mt-4 space-y-2">
                  {selectedEvents.length === 0 ? (
                    <p className="text-sm text-gray-500 italic">No events on this date.</p>
                  ) : selectedEvents.map(e => {
                    const wa = e.whatsapp_number ? `https://wa.me/${e.whatsapp_number.replace(/[^0-9]/g,'')}` : null;
                    return (
                      <div
                        key={e.id}
                        onClick={() => { onOpenChange(false); navigate(`/company/clients/${e.client_id}`); }}
                        className="cursor-pointer bg-white rounded-xl border border-gray-200 hover:border-emerald-300 hover:shadow-sm p-3"
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0">
                            <p className="font-bold text-gray-900 truncate">{e.client_name}</p>
                            <p className="text-xs text-emerald-600 font-semibold truncate">{e.event_name || 'Event'}</p>
                            {e.event_city && (
                              <p className="mt-1 flex items-center gap-1 text-[11px] text-gray-500 truncate">
                                <MapPin className="w-3 h-3" /> {e.event_city}
                              </p>
                            )}
                          </div>
                          <div className="flex items-center gap-1 shrink-0">
                            {e.contact_number && (
                              <a onClick={ev=>ev.stopPropagation()} href={`tel:${e.contact_number}`} className="w-7 h-7 rounded-full flex items-center justify-center bg-blue-50 text-blue-600 hover:bg-blue-100">
                                <Phone className="w-3 h-3" />
                              </a>
                            )}
                            {wa && (
                              <a onClick={ev=>ev.stopPropagation()} href={wa} target="_blank" rel="noopener noreferrer" className="w-7 h-7 rounded-full flex items-center justify-center bg-green-50 text-green-600 hover:bg-green-100">
                                <MessageCircle className="w-3 h-3" />
                              </a>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </>
            ) : (
              <p className="text-sm text-gray-500">Pick a day on the calendar.</p>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
