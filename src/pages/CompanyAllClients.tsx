import React, { useState, useMemo, useCallback } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useSmartBack } from '@/hooks/useSmartBack';
import { ChevronLeft, ChevronRight, X, ArrowUpDown, Plus, UserPlus, MessageCircle, Users, Trash2, Filter, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { HoverCard, HoverCardContent, HoverCardTrigger } from '@/components/ui/hover-card';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList, CommandSeparator } from '@/components/ui/command';
import { useAllAgencyEvents } from '@/hooks/useAllAgencyEvents';
import { useCrewAssignments, useUpsertCrewAssignment } from '@/hooks/useCrewAssignments';
import { useRoleFilteredFreelancers } from '@/hooks/useRoleFilteredFreelancers';
import { useGlobalLaganDates } from '@/hooks/useGlobalLaganDates';
import { CREW_COLUMNS, GROUP_COLORS, PILL_STYLES, GROUP_HEADER_STYLES } from '@/lib/crew-columns';
import { CrewCategorySelector } from '@/components/company/CrewCategorySelector';
import { QuickAddFreelancerDialog } from '@/components/company/QuickAddFreelancerDialog';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useQueryClient } from '@tanstack/react-query';
import {
  getCurrentBSDate,
  nepaliMonthsEnglish,
  adToBS,
  getDaysInBSMonth,
  type NepaliDateObject,
} from '@/lib/nepaliCalendar';
import { cn } from '@/lib/utils';

type SortMode = 'default' | 'similar' | 'maxEvents' | 'minEvents' | 'unassigned' | 'drone' | 'freelancerMax' | 'freelancerMin';

const SORT_LABELS: Record<SortMode, string> = {
  default: 'Default',
  similar: 'Similar',
  maxEvents: 'Max Events',
  minEvents: 'Min Events',
  unassigned: 'Unassigned First',
  drone: 'Drone',
  freelancerMax: 'Freelancer Max',
  freelancerMin: 'Freelancer Min',
};

const DAY_COLORS = [
  'bg-white',
  'bg-blue-200/80',
  'bg-amber-200/70',
  'bg-emerald-200/70',
  'bg-purple-200/70',
  'bg-rose-200/70',
  'bg-cyan-200/70',
  'bg-orange-200/70',
];

function getFirstName(fullName: string): string {
  if (!fullName) return '';
  return fullName.trim().split(/\s+/)[0];
}

export default function CompanyAllClients() {
  const navigate = useNavigate();
  const goBack = useSmartBack('/company');
  const { user } = useAuth();
  const qc = useQueryClient();
  const currentBS = useMemo(() => getCurrentBSDate(), []);
  const [searchParams] = useSearchParams();
  const urlMonth = Number(searchParams.get('bsMonth'));
  const urlYear = Number(searchParams.get('bsYear'));
  const [bsYear, setBsYear] = useState(urlYear && urlYear >= 2079 && urlYear <= 2099 ? urlYear : currentBS.year);
  const [bsMonth, setBsMonth] = useState(urlMonth && urlMonth >= 1 && urlMonth <= 12 ? urlMonth : currentBS.month);
  const [filterDay, setFilterDay] = useState<number | null>(null);
  const [filterClient, setFilterClient] = useState<string | null>(null);
  const [filterFreelancer, setFilterFreelancer] = useState<string | null>(null);
  const [sortMode, setSortMode] = useState<SortMode>('default');
  const [similarFilter, setSimilarFilter] = useState<number | null>(null);
  const [eventCountFilter, setEventCountFilter] = useState<number | null>(null);

  // Quick add dialog state
  const [quickAddOpen, setQuickAddOpen] = useState(false);
  const [quickAddContext, setQuickAddContext] = useState<{
    eventId: string; role: string; eventName: string; eventDate: string;
  } | null>(null);

  const { data: allEvents = [] } = useAllAgencyEvents();
  const { getByRole, isRegistered, getWhatsApp } = useRoleFilteredFreelancers();
  const { data: laganDays = [] } = useGlobalLaganDates(bsYear, bsMonth);

  const daysInMonth = useMemo(() => {
    try { return getDaysInBSMonth(bsYear, bsMonth); } catch { return 30; }
  }, [bsYear, bsMonth]);

  // Filter events by selected BS month/year
  const monthEvents = useMemo(() => {
    return allEvents
      .filter(e => {
        if (!e.event_date_ad) return false;
        const bs = adToBS(new Date(e.event_date_ad + 'T00:00:00'));
        return bs.year === bsYear && bs.month === bsMonth;
      })
      .map(e => {
        const bs = adToBS(new Date(e.event_date_ad! + 'T00:00:00'));
        return { ...e, bsDay: bs.day, bs };
      })
      .sort((a, b) => a.bsDay - b.bsDay);
  }, [allEvents, bsYear, bsMonth]);

  const eventIds = useMemo(() => monthEvents.map(e => e.id), [monthEvents]);
  const { data: assignments = [] } = useCrewAssignments(eventIds);
  const upsert = useUpsertCrewAssignment();

  // Build assignment map
  const assignmentMap = useMemo(() => {
    const m = new Map<string, string>();
    assignments.forEach(a => {
      if (a.assigned_freelancer) m.set(`${a.event_id}_${a.role}`, a.assigned_freelancer);
    });
    return m;
  }, [assignments]);

  // Required crew per event
  const getRequiredCrew = (event: any): string[] => {
    if (!event.required_crew) return [];
    return event.required_crew.split(',').filter(Boolean);
  };

  // Stats
  const totalSlots = useMemo(() => {
    return monthEvents.reduce((sum, e) => sum + getRequiredCrew(e).length, 0);
  }, [monthEvents]);

  const assignedSlots = useMemo(() => {
    return monthEvents.reduce((sum, e) => {
      const req = getRequiredCrew(e);
      return sum + req.filter(k => assignmentMap.has(`${e.id}_${k}`)).length;
    }, 0);
  }, [monthEvents, assignmentMap]);

  const remainingSlots = totalSlots - assignedSlots;

  const hasUnassigned = (event: any): boolean => {
    const req = getRequiredCrew(event);
    if (req.length === 0) return false;
    return req.some(k => !assignmentMap.has(`${event.id}_${k}`));
  };

  const dayEventCounts = useMemo(() => {
    const m = new Map<number, number>();
    monthEvents.forEach(e => m.set(e.bsDay, (m.get(e.bsDay) || 0) + 1));
    return m;
  }, [monthEvents]);

  const maxEventsPerDay = useMemo(() => Math.max(0, ...dayEventCounts.values()), [dayEventCounts]);

  const freelancerEventCounts = useMemo(() => {
    const m = new Map<string, number>();
    assignmentMap.forEach(name => m.set(name, (m.get(name) || 0) + 1));
    return m;
  }, [assignmentMap]);

  const getFreelancerStats = useCallback((name: string) => {
    const total = monthEvents.filter(e =>
      CREW_COLUMNS.some(col => assignmentMap.get(`${e.id}_${col.key}`) === name)
    );
    const done = total.filter(e => !isUpcoming(e.bs));
    const remaining = total.filter(e => isUpcoming(e.bs));
    return { total: total.length, done: done.length, remaining: remaining.length, upcomingEvents: remaining.slice(0, 5) };
  }, [monthEvents, assignmentMap]);

  // Filter
  let filteredEvents = monthEvents.filter(e => {
    if (filterDay !== null && e.bsDay !== filterDay) return false;
    if (filterClient && e.client_name !== filterClient) return false;
    if (filterFreelancer) {
      const hasF = CREW_COLUMNS.some(col => assignmentMap.get(`${e.id}_${col.key}`) === filterFreelancer);
      if (!hasF) return false;
    }
    if (sortMode === 'similar' && eventCountFilter !== null && (dayEventCounts.get(e.bsDay) || 0) !== eventCountFilter) return false;
    if (sortMode === 'drone') {
      if (!assignmentMap.has(`${e.id}_drone`)) return false;
    }
    return true;
  });

  if (sortMode === 'maxEvents') {
    filteredEvents = [...filteredEvents].sort((a, b) => (dayEventCounts.get(b.bsDay) || 0) - (dayEventCounts.get(a.bsDay) || 0));
  } else if (sortMode === 'minEvents') {
    filteredEvents = [...filteredEvents].sort((a, b) => (dayEventCounts.get(a.bsDay) || 0) - (dayEventCounts.get(b.bsDay) || 0));
  } else if (sortMode === 'unassigned') {
    filteredEvents = [...filteredEvents].sort((a, b) => {
      const aU = hasUnassigned(a) ? 0 : 1;
      const bU = hasUnassigned(b) ? 0 : 1;
      return aU - bU || a.bsDay - b.bsDay;
    });
  }

  const isUpcoming = (bs: NepaliDateObject) => {
    if (bs.year > currentBS.year) return true;
    if (bs.year === currentBS.year && bs.month > currentBS.month) return true;
    if (bs.year === currentBS.year && bs.month === currentBS.month && bs.day >= currentBS.day) return true;
    return false;
  };

  const upcoming = filteredEvents.filter(e => isUpcoming(e.bs));
  const completed = filteredEvents.filter(e => !isUpcoming(e.bs));

  // Day color grouping
  const dayGroups = useMemo(() => {
    const map = new Map<string, number>();
    let groupIdx = 0;
    let lastDay = -1;
    filteredEvents.forEach(e => {
      if (e.bsDay !== lastDay) {
        if (lastDay !== -1) groupIdx++;
        lastDay = e.bsDay;
      }
      map.set(e.id, groupIdx);
    });
    return map;
  }, [filteredEvents]);

  const prevMonth = () => {
    if (bsMonth === 1) { setBsMonth(12); setBsYear(y => y - 1); }
    else setBsMonth(m => m - 1);
  };
  const nextMonth = () => {
    if (bsMonth === 12) { setBsMonth(1); setBsYear(y => y + 1); }
    else setBsMonth(m => m + 1);
  };

  const years = Array.from({ length: 11 }, (_, i) => currentBS.year - 2 + i);

  const updateRequiredCrew = useCallback(async (eventId: string, currentCrew: string[], key: string) => {
    const updated = currentCrew.includes(key)
      ? currentCrew.filter(k => k !== key)
      : [...currentCrew, key];
    const value = updated.length > 0 ? updated.join(',') : null;

    // Optimistic update
    qc.setQueriesData<any[]>({ queryKey: ['all-agency-events'] }, (old) => {
      if (!old) return old;
      return old.map((e: any) => e.id === eventId ? { ...e, required_crew: value } : e);
    });

    await supabase
      .from('agency_client_events')
      .update({ required_crew: value } as any)
      .eq('id', eventId);
    qc.invalidateQueries({ queryKey: ['all-agency-events'] });
  }, [qc]);

  const columnStats = useMemo(() => {
    const stats: Record<string, { total: number; assigned: number; remaining: number }> = {};
    for (const col of CREW_COLUMNS) {
      let total = 0;
      let assigned = 0;
      for (const e of monthEvents) {
        const req = getRequiredCrew(e);
        const isReq = req.includes(col.key);
        if (!isReq) continue;
        total++;
        if (assignmentMap.has(`${e.id}_${col.key}`)) assigned++;
      }
      stats[col.key] = { total, assigned, remaining: Math.max(0, total - assigned) };
    }
    return stats;
  }, [monthEvents, assignmentMap]);

  // Column widths removed — using equal flex distribution

  const hasAnyFilter = filterDay !== null || filterClient !== null || filterFreelancer !== null;

  const handleQuickAdd = (eventId: string, role: string, eventName: string, eventDate: string) => {
    setQuickAddContext({ eventId, role, eventName, eventDate });
    setQuickAddOpen(true);
  };

  const handleQuickAddSave = (name: string, _whatsapp: string) => {
    if (!quickAddContext) return;
    upsert.mutate({ eventId: quickAddContext.eventId, role: quickAddContext.role, freelancer: name });
  };

  // Sort mode thick border detection
  const showThickBorder = (events: any[], idx: number) => {
    return (sortMode === 'maxEvents' || sortMode === 'minEvents') && idx > 0 && events[idx - 1]?.bsDay !== events[idx]?.bsDay;
  };

  return (
    <div className="fixed inset-0 z-40 flex flex-col bg-gray-200">
      {/* Header Bar */}
      <div className="bg-gradient-to-r from-violet-600 via-purple-600 to-violet-700 text-white px-4 sm:px-6 py-3 shrink-0 shadow-lg">
        <div className="flex items-center gap-3 flex-wrap">
          <button onClick={goBack} className="p-1.5 rounded-lg hover:bg-white/20 transition-colors">
            <ChevronLeft className="w-5 h-5" />
          </button>
          <div className="flex items-center gap-2">
            <Users className="w-5 h-5" />
            <h1 className="text-lg font-bold tracking-wide">EVENT MANAGEMENT</h1>
          </div>

          {/* Year / Month Nav */}
          <div className="flex items-center gap-1 ml-4">
            <Select value={String(bsYear)} onValueChange={v => setBsYear(Number(v))}>
              <SelectTrigger className="w-24 h-8 bg-white/15 border-white/30 text-white text-sm [&>svg]:text-white">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="z-[200]">
                {years.map(y => <SelectItem key={y} value={String(y)}>{y}</SelectItem>)}
              </SelectContent>
            </Select>
            <button onClick={prevMonth} className="p-1 rounded hover:bg-white/20 transition-colors">
              <ChevronLeft className="w-4 h-4" />
            </button>
            <Select value={String(bsMonth)} onValueChange={v => setBsMonth(Number(v))}>
              <SelectTrigger className="w-32 h-8 bg-white/15 border-white/30 text-white text-sm [&>svg]:text-white">
                <SelectValue>{nepaliMonthsEnglish[bsMonth - 1]}</SelectValue>
              </SelectTrigger>
              <SelectContent className="z-[200]">
                {nepaliMonthsEnglish.map((m, i) => <SelectItem key={i} value={String(i + 1)}>{m}</SelectItem>)}
              </SelectContent>
            </Select>
            <button onClick={nextMonth} className="p-1 rounded hover:bg-white/20 transition-colors">
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>


          {/* Lagan pills */}
          {laganDays.length > 0 && (
            <div className="flex items-center gap-1 flex-wrap">
              {laganDays.sort((a, b) => a - b).map(d => (
                <button
                  key={d}
                  onClick={() => setFilterDay(filterDay === d ? null : d)}
                  className={cn(
                    'text-[10px] px-1.5 py-0.5 rounded-full font-semibold transition-all cursor-pointer',
                    filterDay === d
                      ? 'bg-orange-600 text-white ring-2 ring-orange-300 scale-110'
                      : 'bg-orange-400/80 text-white hover:bg-orange-500'
                  )}
                >
                  {d}
                </button>
              ))}
            </div>
          )}

          {/* Sort */}
          <Select value={sortMode} onValueChange={(v) => { setSortMode(v as SortMode); if (v !== 'similar') setEventCountFilter(null); }}>
            <SelectTrigger className="w-auto h-8 bg-white/15 border-white/30 text-white text-xs gap-1.5 [&>svg]:text-white px-2.5">
              <ArrowUpDown className="w-3.5 h-3.5 shrink-0" />
              <SelectValue placeholder="Sort" />
            </SelectTrigger>
            <SelectContent className="z-[200]">
              {Object.entries(SORT_LABELS).map(([k, v]) => (
                <SelectItem key={k} value={k}>{v}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* Similar event count pills */}
          {sortMode === 'similar' && (
            <div className="flex items-center gap-1">
              {Array.from({ length: maxEventsPerDay }, (_, i) => i + 1).map(n => (
                <button
                  key={n}
                  onClick={() => setEventCountFilter(eventCountFilter === n ? null : n)}
                  className={cn(
                    'w-6 h-6 rounded-full text-xs font-bold transition-all flex items-center justify-center',
                    eventCountFilter === n
                      ? 'bg-white text-violet-700 shadow-md scale-110'
                      : 'bg-white/20 text-white hover:bg-white/30'
                  )}
                >
                  {n}
                </button>
              ))}
            </div>
          )}

          {/* Stats */}
          <div className="ml-auto flex items-center gap-2 text-sm">
            <span className="bg-white/20 px-3 py-1 rounded-full font-semibold">{filteredEvents.length} events</span>
            <span className="bg-emerald-500/80 px-3 py-1 rounded-full font-medium text-xs">{assignedSlots}/{totalSlots} assigned</span>
            {remainingSlots > 0 && (
              <span className="bg-red-500/90 px-3 py-1 rounded-full font-medium text-xs animate-pulse">{remainingSlots} remaining</span>
            )}
          </div>
        </div>
      </div>

      {/* Active Filter Bar */}
      {hasAnyFilter && (
        <div className="bg-violet-50 border-b border-violet-200 px-4 py-2 flex items-center gap-2 shrink-0">
          <span className="text-xs font-medium text-violet-700">Filtered by:</span>
          {filterDay !== null && (
            <button onClick={() => setFilterDay(null)} className="inline-flex items-center gap-1 bg-violet-200 text-violet-800 text-xs font-bold px-2.5 py-1 rounded-full hover:bg-violet-300 transition-colors">
              Day {filterDay} <X className="w-3 h-3" />
            </button>
          )}
          {filterClient && (
            <button onClick={() => setFilterClient(null)} className="inline-flex items-center gap-1 bg-violet-200 text-violet-800 text-xs font-bold px-2.5 py-1 rounded-full hover:bg-violet-300 transition-colors">
              {filterClient} <X className="w-3 h-3" />
            </button>
          )}
          {filterFreelancer && (
            <button onClick={() => setFilterFreelancer(null)} className="inline-flex items-center gap-1 bg-amber-200 text-amber-800 text-xs font-bold px-2.5 py-1 rounded-full hover:bg-amber-300 transition-colors">
              👤 {filterFreelancer} <X className="w-3 h-3" />
            </button>
          )}
          <button onClick={() => { setFilterDay(null); setFilterClient(null); setFilterFreelancer(null); setEventCountFilter(null); }} className="text-xs text-violet-500 hover:text-violet-700 underline ml-2">
            Clear All
          </button>
        </div>
      )}

      {/* Table */}
      <div className="flex-1 overflow-auto">
        <table className="w-full text-sm border-collapse table-fixed" style={{ minWidth: '900px' }}>
          <colgroup>
            <col style={{ width: '40px' }} />
            <col style={{ width: '280px' }} />
            <col style={{ width: '360px' }} />
            {CREW_COLUMNS.map(col => (
              <col key={col.key} />
            ))}
          </colgroup>
          <thead className="sticky top-0 z-10">
            <tr className="bg-gray-100 border-b border-gray-300">
              <th className="px-1 py-2 text-center font-bold text-gray-600 border-r border-gray-200 text-xs">Day</th>
              <th className="px-2 py-2 text-left font-bold text-gray-600 border-r border-gray-200 text-xs">Client</th>
              <th className="px-2 py-2 text-left font-bold text-gray-600 border-r border-gray-200 text-xs">Event</th>
              {CREW_COLUMNS.map(col => {
                const stats = columnStats[col.key] || { total: 0, assigned: 0, remaining: 0 };
                return (
                  <th
                    key={col.key}
                    className={cn('px-1 py-1 text-center font-bold border-r border-gray-100 last:border-r-0', GROUP_HEADER_STYLES[col.group])}
                  >
                    <div className="text-[10px] text-gray-500 font-bold leading-none">{stats.remaining}</div>
                    <div className="text-xs font-black leading-tight">{col.shortCode}</div>
                    <div className="text-[9px] font-semibold opacity-60">{stats.assigned}/{stats.total}</div>
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody>
            {upcoming.length > 0 && (
              <>
                {upcoming.length > 0 && completed.length > 0 && sortMode === 'default' && (
                  <tr>
                    <td colSpan={3 + CREW_COLUMNS.length} className="px-3 py-1.5 bg-green-100 text-green-800 font-bold text-xs uppercase tracking-wider border-b border-green-200">
                      Upcoming Events ({upcoming.length})
                    </td>
                  </tr>
                )}
                {upcoming.map((event, idx) => {
                  const groupIdx = dayGroups.get(event.id) ?? 0;
                  const dayColor = DAY_COLORS[groupIdx % DAY_COLORS.length];
                  return (
                    <React.Fragment key={event.id}>
                      {showThickBorder(upcoming, idx) && (
                        <tr><td colSpan={3 + CREW_COLUMNS.length} className="h-1 bg-violet-400" /></tr>
                      )}
                      <EventRow
                        event={event}
                        dayColor={dayColor}
                        assignmentMap={assignmentMap}
                        getByRole={getByRole}
                        isRegistered={isRegistered}
                        getWhatsApp={getWhatsApp}
                        onAssign={(role, name) => upsert.mutate({ eventId: event.id, role, freelancer: name })}
                        onFilterDay={() => setFilterDay(filterDay === event.bsDay ? null : event.bsDay)}
                        onFilterClient={() => setFilterClient(filterClient === event.client_name ? null : event.client_name)}
                        onFilterFreelancer={setFilterFreelancer}
                        isLagan={laganDays.includes(event.bsDay)}
                        hasUnassigned={hasUnassigned(event)}
                        requiredCrew={getRequiredCrew(event)}
                        onToggleRequiredCrew={(key) => updateRequiredCrew(event.id, getRequiredCrew(event), key)}
                        getFreelancerStats={getFreelancerStats}
                        onQuickAdd={(role) => handleQuickAdd(event.id, role, event.event_name || event.client_name, event.event_date_ad || '')}
                      />
                    </React.Fragment>
                  );
                })}
              </>
            )}
            {completed.length > 0 && sortMode === 'default' && (
              <>
                <tr>
                  <td colSpan={3 + CREW_COLUMNS.length} className="px-3 py-1.5 bg-gray-200 text-gray-500 font-bold text-xs uppercase tracking-wider border-b border-gray-300">
                    Completed Events ({completed.length})
                  </td>
                </tr>
                {completed.map((event, idx) => {
                  const groupIdx = dayGroups.get(event.id) ?? 0;
                  const dayColor = DAY_COLORS[groupIdx % DAY_COLORS.length];
                  return (
                    <React.Fragment key={event.id}>
                      {showThickBorder(completed, idx) && (
                        <tr><td colSpan={3 + CREW_COLUMNS.length} className="h-1 bg-violet-400" /></tr>
                      )}
                      <EventRow
                        event={event}
                        dayColor={dayColor}
                        assignmentMap={assignmentMap}
                        getByRole={getByRole}
                        isRegistered={isRegistered}
                        getWhatsApp={getWhatsApp}
                        onAssign={(role, name) => upsert.mutate({ eventId: event.id, role, freelancer: name })}
                        onFilterDay={() => setFilterDay(filterDay === event.bsDay ? null : event.bsDay)}
                        onFilterClient={() => setFilterClient(filterClient === event.client_name ? null : event.client_name)}
                        onFilterFreelancer={setFilterFreelancer}
                        dimmed
                        isLagan={laganDays.includes(event.bsDay)}
                        hasUnassigned={false}
                        requiredCrew={getRequiredCrew(event)}
                        onToggleRequiredCrew={(key) => updateRequiredCrew(event.id, getRequiredCrew(event), key)}
                        getFreelancerStats={getFreelancerStats}
                        onQuickAdd={(role) => handleQuickAdd(event.id, role, event.event_name || event.client_name, event.event_date_ad || '')}
                      />
                    </React.Fragment>
                  );
                })}
              </>
            )}
            {monthEvents.length === 0 && (
              <tr>
                <td colSpan={3 + CREW_COLUMNS.length} className="text-center py-20 text-gray-400">
                  <Users className="w-12 h-12 mx-auto mb-3 opacity-30" />
                  <p className="text-lg font-medium">No events for {nepaliMonthsEnglish[bsMonth - 1]} {bsYear}</p>
                  <p className="text-sm mt-1">Try selecting a different year or month</p>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Quick Add Dialog */}
      <QuickAddFreelancerDialog
        open={quickAddOpen}
        onOpenChange={setQuickAddOpen}
        onSave={handleQuickAddSave}
        eventName={quickAddContext?.eventName}
        eventDate={quickAddContext?.eventDate}
      />
    </div>
  );
}

/* ─── Event Row ─── */
const EventRow = React.memo(function EventRow({
  event, dayColor, assignmentMap, getByRole, isRegistered, getWhatsApp, onAssign, onFilterDay, onFilterClient, onFilterFreelancer,
  dimmed, isLagan, hasUnassigned, requiredCrew, onToggleRequiredCrew, getFreelancerStats, onQuickAdd,
}: {
  event: any;
  dayColor: string;
  assignmentMap: Map<string, string>;
  getByRole: (columnKey: string) => string[];
  isRegistered: (name: string) => boolean;
  getWhatsApp: (name: string) => string | null;
  onAssign: (role: string, name: string | null) => void;
  onFilterDay: () => void;
  onFilterClient: () => void;
  onFilterFreelancer: (name: string) => void;
  dimmed?: boolean;
  isLagan: boolean;
  hasUnassigned: boolean;
  requiredCrew: string[];
  onToggleRequiredCrew: (key: string) => void;
  getFreelancerStats: (name: string) => { total: number; done: number; remaining: number; upcomingEvents: any[] };
  onQuickAdd: (role: string) => void;
}) {
  return (
    <tr className={cn(dayColor, dimmed && 'opacity-60', 'hover:brightness-95 transition-all border-b border-gray-200')}>
      {/* Day */}
      <td className="px-1 py-2 border-r border-gray-200 text-center whitespace-nowrap">
        <button
          onClick={onFilterDay}
          className={cn(
            'hover:text-violet-600 transition-colors flex items-center justify-center w-full text-sm font-black',
            isLagan && 'text-orange-600 w-7 h-7 mx-auto ring-2 ring-orange-300 rounded-full bg-orange-50',
            hasUnassigned && 'animate-lagan-spin w-7 h-7 mx-auto',
            hasUnassigned && !isLagan && 'ring-2 ring-red-400 rounded-full text-red-500',
            hasUnassigned && isLagan && 'bg-orange-50 text-orange-600 ring-2 ring-orange-400',
            !isLagan && !hasUnassigned && 'text-gray-700'
          )}
        >
          {event.bsDay}
        </button>
      </td>
      {/* Client */}
      <td className="px-2 py-2 border-r border-gray-200">
        <button onClick={onFilterClient} className="text-xs font-bold text-gray-800 hover:text-violet-600 transition-colors truncate block text-left w-full uppercase">
          {event.client_name}
        </button>
      </td>
      {/* Event */}
      <td className="px-2 py-2 border-r border-gray-200">
        <div className="flex items-center justify-between gap-1">
          <span className="text-xs text-gray-600 truncate block uppercase">{event.event_name || '—'}</span>
          <CrewCategorySelector selected={requiredCrew} onToggle={onToggleRequiredCrew} />
        </div>
      </td>
      {/* Crew Cells */}
      {CREW_COLUMNS.map((col, colIdx) => {
        const key = `${event.id}_${col.key}`;
        const assigned = assignmentMap.get(key) || null;
        const isRequired = requiredCrew.includes(col.key);
        const nextCol = CREW_COLUMNS[colIdx + 1];
        const nextIsRequired = nextCol ? requiredCrew.includes(nextCol.key) : true;
        return (
          <CrewCell
            key={col.key}
            assigned={assigned}
            columnKey={col.key}
            label={col.label}
            group={col.group}
            getByRole={getByRole}
            isRegistered={isRegistered}
            getWhatsApp={getWhatsApp}
            onSelect={(name) => onAssign(col.key, name)}
            onFilterFreelancer={onFilterFreelancer}
            getFreelancerStats={getFreelancerStats}
            onQuickAdd={() => onQuickAdd(col.key)}
            isRequired={isRequired}
            isNextRequired={nextIsRequired}
          />
        );
      })}
    </tr>
  );
});

/* ─── Desktop Crew Cell: HoverCard and Popover SEPARATED ─── */
const CrewCell = React.memo(function CrewCell({
  assigned, columnKey, label, group, getByRole, isRegistered, getWhatsApp, onSelect, onFilterFreelancer, getFreelancerStats, onQuickAdd, isRequired, isNextRequired,
}: {
  assigned: string | null;
  columnKey: string;
  label: string;
  group: string;
  getByRole: (columnKey: string) => string[];
  isRegistered: (name: string) => boolean;
  getWhatsApp: (name: string) => string | null;
  onSelect: (name: string | null) => void;
  onFilterFreelancer: (name: string) => void;
  getFreelancerStats: (name: string) => { total: number; done: number; remaining: number; upcomingEvents: any[] };
  onQuickAdd: () => void;
  isRequired: boolean;
  isNextRequired: boolean;
}) {
  const [open, setOpen] = useState(false);
  const roleNames = useMemo(() => getByRole(columnKey), [columnKey, getByRole]);
  const hasValue = assigned && assigned.trim().length > 0;
  const firstName = hasValue ? getFirstName(assigned) : '';
  const pillStyle = PILL_STYLES[group] || '';

  if (!isRequired) {
    return (
      <td className={cn('py-1.5 bg-white', isNextRequired && 'border-r border-gray-100')} />
    );
  }

  const renderNameList = (showClear: boolean) => (
    <Command>
      <CommandInput placeholder={`Search ${label}...`} className="text-sm" />
      <CommandList>
        <CommandEmpty className="py-2 text-xs text-center">No freelancers found</CommandEmpty>
        {showClear && (
          <CommandGroup heading="Actions">
            <CommandItem
              onSelect={() => { onSelect(null); setOpen(false); }}
              className="text-red-500 font-medium text-sm"
            >
              <Trash2 className="w-3.5 h-3.5 mr-1.5" />
              Clear Assignment
            </CommandItem>
          </CommandGroup>
        )}
        {showClear && <CommandSeparator />}
        <CommandGroup>
          {roleNames.map(name => (
            <CommandItem
              key={name}
              value={name}
              onSelect={() => { onSelect(name); setOpen(false); }}
              className="text-sm"
            >
              {name}
            </CommandItem>
          ))}
        </CommandGroup>
        <CommandSeparator />
        <CommandGroup>
          <CommandItem
            onSelect={() => { setOpen(false); onQuickAdd(); }}
            className="text-emerald-600 font-medium text-sm"
          >
            <Plus className="w-3.5 h-3.5 mr-1.5" />
            Add New Freelancer
          </CommandItem>
        </CommandGroup>
      </CommandList>
    </Command>
  );

  return (
    <td className="px-1 py-1.5 border-r border-gray-100 last:border-r-0">
      {hasValue ? (
        <div className="relative">
          <HoverCard openDelay={200}>
            <HoverCardTrigger asChild>
              <span
                className={cn(
                  'block w-full text-sm px-2 py-1.5 rounded-md text-center truncate border font-semibold transition-all cursor-pointer',
                  isRegistered(assigned!)
                    ? pillStyle
                    : `${pillStyle} animate-pulse-red`
                )}
                onClick={() => setOpen(true)}
              >
                {firstName}
              </span>
            </HoverCardTrigger>
            <HoverCardContent className="w-72 p-3 z-[300] bg-popover border shadow-xl" side="bottom" avoidCollisions collisionPadding={16}>
              {isRegistered(assigned!) ? (
                <FreelancerHoverInfo
                  name={assigned!}
                  stats={getFreelancerStats(assigned!)}
                  onFilter={() => onFilterFreelancer(assigned!)}
                  getWhatsApp={getWhatsApp}
                />
              ) : (
                <UnregisteredHoverInfo name={assigned!} getWhatsApp={getWhatsApp} />
              )}
            </HoverCardContent>
          </HoverCard>

          <Popover open={open} onOpenChange={setOpen}>
            <PopoverTrigger asChild>
              <span className="absolute inset-0 opacity-0 pointer-events-none" />
            </PopoverTrigger>
            <PopoverContent className="z-[200] w-56 p-0" align="start">
              {renderNameList(true)}
            </PopoverContent>
          </Popover>
        </div>
      ) : (
        <Popover open={open} onOpenChange={setOpen}>
          <PopoverTrigger asChild>
            <button className="w-full text-sm px-2 py-1.5 rounded-md text-center truncate transition-all border border-dashed border-red-400 text-red-400 hover:border-red-500 hover:text-red-600 hover:bg-red-50 animate-pulse-red font-medium">
              <Plus className="w-3 h-3 mx-auto" />
            </button>
          </PopoverTrigger>
          <PopoverContent className="z-[200] w-56 p-0" align="start">
            {renderNameList(false)}
          </PopoverContent>
        </Popover>
      )}
    </td>
  );
});

/* ─── Freelancer Hover Info (Registered) ─── */
function FreelancerHoverInfo({ name, stats, onFilter, getWhatsApp }: {
  name: string;
  stats: { total: number; done: number; remaining: number; upcomingEvents: any[] };
  onFilter: () => void;
  getWhatsApp: (name: string) => string | null;
}) {
  const whatsapp = getWhatsApp(name);

  const handleChatWhatsApp = () => {
    if (!whatsapp) return;
    window.open(`https://wa.me/${whatsapp}`, '_blank');
  };

  return (
    <div className="space-y-2.5">
      <div className="font-bold text-sm text-gray-800">{name}</div>
      <div className="flex gap-2 text-[10px] font-semibold flex-wrap">
        <span className="bg-violet-100 text-violet-700 px-2 py-0.5 rounded-full">This: {stats.total}</span>
        <span className="bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-full">{stats.done} Done</span>
        <span className="bg-red-100 text-red-700 px-2 py-0.5 rounded-full">{stats.remaining} Left</span>
      </div>
      {stats.upcomingEvents.length > 0 && (
        <div className="space-y-1">
          <div className="text-[9px] font-bold text-gray-400 uppercase tracking-wider">Upcoming:</div>
          {stats.upcomingEvents.map((e: any) => (
            <div key={e.id} className="text-[10px] font-medium text-gray-600 truncate">
              {e.bsDay} — {e.client_name}
            </div>
          ))}
        </div>
      )}
      <div className="flex flex-col gap-1.5">
        <button
          onClick={onFilter}
          className="w-full flex items-center justify-center gap-1.5 border border-violet-200 hover:bg-violet-50 text-violet-700 text-xs font-semibold py-1.5 px-3 rounded-lg transition-colors"
        >
          <Filter className="w-3 h-3" />
          Show only {getFirstName(name)}'s rows
        </button>
        {whatsapp && (
          <button
            onClick={handleChatWhatsApp}
            className="w-full flex items-center justify-center gap-1 bg-emerald-500 hover:bg-emerald-600 text-white text-xs font-semibold py-1.5 px-2 rounded-lg transition-colors"
          >
            <MessageCircle className="w-3 h-3" />
            Chat on WhatsApp
          </button>
        )}
      </div>
    </div>
  );
}

/* ─── Unregistered Hover Info ─── */
function UnregisteredHoverInfo({ name, getWhatsApp }: {
  name: string;
  getWhatsApp: (name: string) => string | null;
}) {
  const whatsapp = getWhatsApp(name);

  const handleResend = () => {
    if (!whatsapp) return;
    const appUrl = window.location.origin;
    const msg = encodeURIComponent(
      `Reminder: You have been assigned for an event. Sign up at ${appUrl} to get details and manage your bookings.`
    );
    window.open(`https://wa.me/${whatsapp}?text=${msg}`, '_blank');
  };

  return (
    <div className="space-y-2">
      <div className="font-bold text-sm text-gray-800">{name}</div>
      <div className="text-[10px] font-bold bg-orange-100 text-orange-700 rounded px-2 py-0.5 inline-block">
        ⚠ UNREGISTERED — TEMPORARY
      </div>
      <p className="text-[10px] text-gray-500">
        This freelancer has not signed up yet. Replace with a registered freelancer later.
      </p>
      {whatsapp ? (
        <button
          onClick={handleResend}
          className="w-full flex items-center justify-center gap-1 bg-emerald-500 hover:bg-emerald-600 text-white text-xs font-semibold py-1.5 px-2 rounded-lg transition-colors"
        >
          <MessageCircle className="w-3 h-3" />
          Resend WhatsApp Invite
        </button>
      ) : (
        <p className="text-[9px] text-gray-400">No WhatsApp number saved</p>
      )}
    </div>
  );
}
