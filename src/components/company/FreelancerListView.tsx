import React, { useState, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSmartBack } from '@/hooks/useSmartBack';
import { ChevronLeft, ChevronRight, X, Users } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/contexts/AuthContext';
import { useAcceptedStaffProfiles, useUpdateStaffGadget } from '@/hooks/useAgencyStaff';
import { useAllAgencyEvents } from '@/hooks/useAllAgencyEvents';
import { useCrewAssignments } from '@/hooks/useCrewAssignments';
import { supabase } from '@/integrations/supabase/client';
import { useQuery } from '@tanstack/react-query';
import {
  getCurrentBSDate,
  nepaliMonthsEnglish,
  adToBS,
  getDaysInBSMonth,
} from '@/lib/nepaliCalendar';
import { CREW_COLUMNS, PILL_STYLES } from '@/lib/crew-columns';
import { cn } from '@/lib/utils';

// Role filter definitions matching crew columns
const ROLE_FILTERS = [
  { key: 'photographer', label: 'PB', group: 'photo', field: 'photographer' },
  { key: 'videographer', label: 'VB', group: 'video', field: 'videographer' },
  { key: 'photo_editor', label: 'EP', group: 'photo', field: 'photo_editor' },
  { key: 'video_editor', label: 'EV', group: 'video', field: 'video_editor' },
  { key: 'hybrid_shooter', label: 'Hybrid', group: 'assist', field: 'hybrid_shooter' },
  { key: 'assistant', label: 'Asst', group: 'assist', field: null },
  { key: 'iphone_shooter', label: 'iPhone', group: 'tech', field: 'iphone_shooter' },
  { key: 'drone_operator', label: 'Drone', group: 'tech', field: 'drone_operator' },
  { key: 'fpv_operator', label: 'FPV', group: 'tech', field: 'fpv_operator' },
];

export default function FreelancerListView() {
  const navigate = useNavigate();
  const goBack = useSmartBack('/company/my-freelancers');
  const { user } = useAuth();

  const currentBS = useMemo(() => getCurrentBSDate(), []);
  const [bsYear, setBsYear] = useState(currentBS.year);
  const [bsMonth, setBsMonth] = useState(currentBS.month);
  const [activeFilters, setActiveFilters] = useState<Set<string>>(new Set());

  const { data: staff = [] } = useAcceptedStaffProfiles();
  const { data: allEvents = [] } = useAllAgencyEvents();
  const eventIds = useMemo(() => allEvents.map(e => e.id), [allEvents]);
  const { data: crewAssignments = [] } = useCrewAssignments(eventIds);
  const updateGadget = useUpdateStaffGadget();

  const daysInMonth = useMemo(() => {
    try { return getDaysInBSMonth(bsYear, bsMonth); } catch { return 30; }
  }, [bsYear, bsMonth]);

  const monthName = nepaliMonthsEnglish[bsMonth - 1];
  const years = Array.from({ length: 11 }, (_, i) => currentBS.year - 2 + i);

  // Staff other bookings
  const staffUserIds = useMemo(() => staff.map(s => s.user_id), [staff]);
  const { data: allBookings = [] } = useQuery({
    queryKey: ['staff-other-bookings', staffUserIds],
    queryFn: async () => {
      if (!staffUserIds.length) return [];
      const { data, error } = await supabase
        .from('bookings')
        .select('user_id, booking_date')
        .in('user_id', staffUserIds);
      if (error) throw error;
      return data || [];
    },
    enabled: staffUserIds.length > 0,
  });

  // My bookings map: freelancer name → days in selected BS month
  const myBookingsMap = useMemo(() => {
    const map = new Map<string, number[]>();
    if (!allEvents.length || !crewAssignments.length) return map;
    const eventMap = new Map(allEvents.map(e => [e.id, e]));
    crewAssignments.forEach(ca => {
      if (!ca.assigned_freelancer) return;
      const event = eventMap.get(ca.event_id);
      if (!event?.event_date_ad) return;
      try {
        const bs = adToBS(new Date(event.event_date_ad));
        if (bs.year === bsYear && bs.month === bsMonth) {
          const name = ca.assigned_freelancer;
          if (!map.has(name)) map.set(name, []);
          const arr = map.get(name)!;
          if (!arr.includes(bs.day)) arr.push(bs.day);
        }
      } catch {}
    });
    map.forEach(arr => arr.sort((a, b) => a - b));
    return map;
  }, [allEvents, crewAssignments, bsYear, bsMonth]);

  // Other bookings map: user_id → days in selected BS month
  const otherBookingsMap = useMemo(() => {
    const map = new Map<string, number[]>();
    allBookings.forEach(b => {
      try {
        const bs = adToBS(new Date(b.booking_date));
        if (bs.year === bsYear && bs.month === bsMonth) {
          if (!map.has(b.user_id)) map.set(b.user_id, []);
          const arr = map.get(b.user_id)!;
          if (!arr.includes(bs.day)) arr.push(bs.day);
        }
      } catch {}
    });
    map.forEach(arr => arr.sort((a, b) => a - b));
    return map;
  }, [allBookings, bsYear, bsMonth]);

  // Filter staff by active role filters
  const filteredStaff = useMemo(() => {
    if (activeFilters.size === 0) return staff;
    return staff.filter(s => {
      for (const filterKey of activeFilters) {
        const rf = ROLE_FILTERS.find(r => r.key === filterKey);
        if (!rf) continue;
        if (rf.field === null) {
          if (s.main_job?.toLowerCase().includes('assistant')) return true;
        } else {
          if ((s as any)[rf.field] === 'YES') return true;
        }
      }
      return false;
    });
  }, [staff, activeFilters]);

  const toggleFilter = (key: string) => {
    setActiveFilters(prev => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  // Navigation
  const prevMonth = () => {
    if (bsMonth === 1) { setBsMonth(12); setBsYear(y => y - 1); }
    else setBsMonth(m => m - 1);
  };
  const nextMonth = () => {
    if (bsMonth === 12) { setBsMonth(1); setBsYear(y => y + 1); }
    else setBsMonth(m => m + 1);
  };

  // Gadget editing
  const [editingGadget, setEditingGadget] = useState<string | null>(null);
  const [gadgetValue, setGadgetValue] = useState('');
  const handleGadgetSave = useCallback((invitationId: string) => {
    updateGadget.mutate({ id: invitationId, gadget: gadgetValue });
    setEditingGadget(null);
  }, [gadgetValue, updateGadget]);

  const hasAnyFilter = activeFilters.size > 0;

  return (
    <div className="fixed inset-0 z-40 flex flex-col bg-gray-200">
      {/* Header */}
      <div className="bg-gradient-to-r from-violet-600 via-purple-600 to-violet-700 text-white px-4 sm:px-6 py-3 shrink-0 shadow-lg">
        <div className="flex items-center gap-3 flex-wrap">
          <button onClick={goBack} className="p-1.5 rounded-lg hover:bg-white/20 transition-colors">
            <ChevronLeft className="w-5 h-5" />
          </button>
          <div className="flex items-center gap-2">
            <Users className="w-5 h-5" />
            <h1 className="text-lg font-bold tracking-wide">MY FREELANCERS</h1>
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

          {/* Role Filter Pills */}
          <div className="flex items-center gap-1 ml-4 flex-wrap">
            {ROLE_FILTERS.map(rf => (
              <button
                key={rf.key}
                onClick={() => toggleFilter(rf.key)}
                className={cn(
                  'text-[10px] px-2 py-0.5 rounded-full font-bold transition-all border',
                  activeFilters.has(rf.key)
                    ? 'bg-white text-violet-700 border-white shadow-md scale-105'
                    : cn('border-white/30 hover:bg-white/20', PILL_STYLES[rf.group] ? 'bg-white/10 text-white' : 'bg-white/10 text-white')
                )}
              >
                {rf.label}
              </button>
            ))}
          </div>

          {/* Stats */}
          <div className="ml-auto flex items-center gap-2 text-sm">
            <span className="bg-white/20 px-3 py-1 rounded-full font-semibold">
              {filteredStaff.length}{hasAnyFilter ? `/${staff.length}` : ''} members
            </span>
          </div>
        </div>
      </div>

      {/* Active Filter Bar */}
      {hasAnyFilter && (
        <div className="bg-violet-50 border-b border-violet-200 px-4 py-2 flex items-center gap-2 shrink-0">
          <span className="text-xs font-medium text-violet-700">Filtered by:</span>
          {Array.from(activeFilters).map(key => {
            const rf = ROLE_FILTERS.find(r => r.key === key);
            return (
              <button
                key={key}
                onClick={() => toggleFilter(key)}
                className="inline-flex items-center gap-1 bg-violet-200 text-violet-800 text-xs font-bold px-2.5 py-1 rounded-full hover:bg-violet-300 transition-colors"
              >
                {rf?.label || key} <X className="w-3 h-3" />
              </button>
            );
          })}
          <button
            onClick={() => setActiveFilters(new Set())}
            className="text-xs text-violet-500 hover:text-violet-700 underline ml-2"
          >
            Clear All
          </button>
        </div>
      )}

      {/* Table */}
      <div className="flex-1 overflow-auto">
        <table className="w-full text-sm border-collapse table-fixed" style={{ minWidth: '1100px' }}>
          <colgroup>
            <col style={{ width: '160px' }} />
            <col style={{ width: '120px' }} />
            <col style={{ width: '100px' }} />
            <col style={{ width: '60px' }} />
            <col style={{ width: '70px' }} />
            <col style={{ width: '70px' }} />
            <col style={{ width: '70px' }} />
            <col />
            <col />
            <col />
          </colgroup>
          <thead className="sticky top-0 z-10">
            <tr className="bg-gray-100 border-b border-gray-300">
              <th className="px-2 py-2 text-left font-bold text-gray-600 border-r border-gray-200 text-xs">NAME</th>
              <th className="px-2 py-2 text-left font-bold text-gray-600 border-r border-gray-200 text-xs">GADGET</th>
              <th className="px-2 py-2 text-left font-bold text-gray-600 border-r border-gray-200 text-xs">MAIN SKILL</th>
              <th className="px-1 py-2 text-center font-bold text-gray-600 border-r border-gray-200 text-xs">HYBRID</th>
              <th className="px-1 py-2 text-center font-bold text-gray-600 border-r border-gray-200 text-xs">PHOTO ED.</th>
              <th className="px-1 py-2 text-center font-bold text-gray-600 border-r border-gray-200 text-xs">VIDEO ED.</th>
              <th className="px-1 py-2 text-center font-bold text-gray-600 border-r border-gray-200 text-xs">RATE</th>
              <th className="px-2 py-2 text-left font-bold text-blue-700 border-r border-gray-200 text-xs bg-blue-50">
                MY BOOKINGS
              </th>
              <th className="px-2 py-2 text-left font-bold text-orange-700 border-r border-gray-200 text-xs bg-orange-50">
                OTHER BOOKINGS
              </th>
              <th className="px-2 py-2 text-left font-bold text-green-700 text-xs bg-green-50">
                AVAILABLE
              </th>
            </tr>
          </thead>
          <tbody>
            {filteredStaff.length === 0 && (
              <tr>
                <td colSpan={10} className="text-center text-muted-foreground py-8">
                  {staff.length === 0
                    ? 'No team members yet. Go to Dashboard to invite freelancers.'
                    : 'No freelancers match the selected filters.'}
                </td>
              </tr>
            )}
            {filteredStaff.map((s, idx) => {
              const myDays = myBookingsMap.get(s.full_name) || [];
              const otherDays = otherBookingsMap.get(s.user_id) || [];
              const allBusyDays = new Set([...myDays, ...otherDays]);
              const availableDays: number[] = [];
              for (let d = 1; d <= daysInMonth; d++) {
                if (!allBusyDays.has(d)) availableDays.push(d);
              }
              const isEditing = editingGadget === s.invitation_id;
              const rowBg = idx % 2 === 0 ? 'bg-white' : 'bg-gray-50';

              return (
                <tr key={s.invitation_id} className={cn(rowBg, 'border-b border-gray-200 hover:bg-violet-50/40 transition-colors')}>
                  <td className="px-2 py-1.5 font-bold text-xs border-r border-gray-100 uppercase truncate">
                    {s.full_name}
                  </td>
                  <td className="px-2 py-1.5 border-r border-gray-100">
                    {isEditing ? (
                      <Input
                        value={gadgetValue}
                        onChange={e => setGadgetValue(e.target.value)}
                        onBlur={() => handleGadgetSave(s.invitation_id)}
                        onKeyDown={e => e.key === 'Enter' && handleGadgetSave(s.invitation_id)}
                        className="h-6 text-xs"
                        autoFocus
                      />
                    ) : (
                      <span
                        className="text-xs cursor-pointer hover:bg-muted/50 px-1 py-0.5 rounded inline-block min-w-[40px]"
                        onClick={() => { setEditingGadget(s.invitation_id); setGadgetValue(s.gadget || ''); }}
                      >
                        {s.gadget || '—'}
                      </span>
                    )}
                  </td>
                  <td className="px-2 py-1.5 text-xs border-r border-gray-100">{s.main_job || '—'}</td>
                  <td className="px-1 py-1.5 text-center border-r border-gray-100">
                    <Badge variant={s.hybrid_shooter === 'YES' ? 'default' : 'secondary'} className="text-[9px] px-1">
                      {s.hybrid_shooter === 'YES' ? 'YES' : 'NO'}
                    </Badge>
                  </td>
                  <td className="px-1 py-1.5 text-center border-r border-gray-100">
                    <Badge variant={s.photo_editor === 'YES' ? 'default' : 'secondary'} className="text-[9px] px-1">
                      {s.photo_editor === 'YES' ? 'YES' : 'NO'}
                    </Badge>
                  </td>
                  <td className="px-1 py-1.5 text-center border-r border-gray-100">
                    <Badge variant={s.video_editor === 'YES' ? 'default' : 'secondary'} className="text-[9px] px-1">
                      {s.video_editor === 'YES' ? 'YES' : 'NO'}
                    </Badge>
                  </td>
                  <td className="px-1 py-1.5 text-center border-r border-gray-100">
                    <Badge variant="outline" className="text-[8px] px-1">Soon</Badge>
                  </td>
                  <td className="px-2 py-1.5 text-xs border-r border-gray-100 bg-blue-50/30">
                    {myDays.length > 0 ? (
                      <span className="text-blue-700 font-medium">
                        {monthName} {myDays.join(', ')}
                      </span>
                    ) : (
                      <span className="text-muted-foreground">—</span>
                    )}
                  </td>
                  <td className="px-2 py-1.5 text-xs border-r border-gray-100 bg-orange-50/30">
                    {otherDays.length > 0 ? (
                      <span className="text-orange-600 font-medium">
                        {monthName} {otherDays.join(', ')}
                      </span>
                    ) : (
                      <span className="text-muted-foreground">—</span>
                    )}
                  </td>
                  <td className="px-2 py-1.5 text-xs bg-green-50/30">
                    {availableDays.length > 0 ? (
                      <span className="text-green-600 font-medium">
                        {monthName} {availableDays.join(', ')}
                      </span>
                    ) : (
                      <span className="text-muted-foreground">Fully booked</span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
