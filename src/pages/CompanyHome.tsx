import { useNavigate } from 'react-router-dom';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useMyProfile } from '@/hooks/useProfile';
import { AgencyClient, useAgencyClients } from '@/hooks/useAgencyClients';
import { useAllAgencyEvents } from '@/hooks/useAllAgencyEvents';
import { format, parseISO } from 'date-fns';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { UserPlus, CalendarCheck, Users, Calendar, Sparkles, Clock, Phone, MessageCircle, ArrowRight, MapPin, Search, X, ChevronLeft, ChevronRight, User, Briefcase, UsersRound } from 'lucide-react';
import { adToBS, getCurrentBSDate } from '@/lib/nepaliCalendar';
import { useCrewAssignments } from '@/hooks/useCrewAssignments';
import { CREW_COLUMNS } from '@/lib/crew-columns';
import CompanyCalendarCard from '@/components/company/CompanyCalendarCard';

const RECENT_SEARCH_KEY = 'company_home_recent_searches';
const MAX_RECENT = 50;
const MAX_PREVIEW_RESULTS = 8;
const MAX_DISPLAY_RECENT = 12;
const SCROLL_AMOUNT = 150;

interface RecentSearch {
  query: string;
  timestamp: number;
}

function formatDaysUntil(days: number): string {
  if (days === 0) return 'Today';
  if (days === 1) return 'Tomorrow';
  return `${days} days`;
}

function getMatchedField(client: AgencyClient, query: string): string {
  const searchLower = query.toLowerCase();
  if (client.client_name?.toLowerCase().includes(searchLower)) return 'Name';
  if (client.contact_number?.includes(query)) return 'Phone';
  if (client.whatsapp_number?.includes(query)) return 'WhatsApp';
  if (client.email?.toLowerCase().includes(searchLower)) return 'Email';
  if (client.event_name?.toLowerCase().includes(searchLower)) return 'Event';
  if (client.handler?.toLowerCase().includes(searchLower)) return 'Handler';
  if (client.status?.toLowerCase().includes(searchLower)) return 'Status';
  if (client.event_city?.toLowerCase().includes(searchLower)) return 'City';
  if (client.event_area?.toLowerCase().includes(searchLower)) return 'Area';
  if (client.source?.toLowerCase().includes(searchLower)) return 'Source';
  if (client.description?.toLowerCase().includes(searchLower)) return 'Description';
  if (client.notes?.toLowerCase().includes(searchLower)) return 'Notes';
  return 'Match';
}

function CompanyMasterSearch({ clients }: { clients: AgencyClient[] }) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [query, setQuery] = useState('');
  const [recentSearches, setRecentSearches] = useState<RecentSearch[]>([]);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const recentRowRef = useRef<HTMLDivElement>(null);
  const isDragging = useRef(false);
  const startX = useRef(0);
  const startScrollLeft = useRef(0);
  const navigate = useNavigate();

  const updateScrollButtons = useCallback(() => {
    const el = recentRowRef.current;
    if (!el) return;
    setCanScrollLeft(el.scrollLeft > 0);
    setCanScrollRight(el.scrollLeft < el.scrollWidth - el.clientWidth - 1);
  }, []);

  useEffect(() => {
    try {
      const cached = localStorage.getItem(RECENT_SEARCH_KEY);
      if (cached) setRecentSearches(JSON.parse(cached));
    } catch {}
  }, []);

  useEffect(() => {
    updateScrollButtons();
  }, [recentSearches, isExpanded, updateScrollButtons]);

  useEffect(() => {
    if (isExpanded) inputRef.current?.focus();
  }, [isExpanded]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsExpanded(false);
        setQuery('');
      }
    };
    if (isExpanded) document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isExpanded]);

  const results = useMemo(() => {
    if (query.trim().length < 2) return [];
    const searchLower = query.toLowerCase();
    return clients.filter(client => [
      client.client_name,
      client.contact_number,
      client.whatsapp_number,
      client.email,
      client.event_name,
      client.event_date_bs,
      client.event_date_ad,
      client.event_city,
      client.event_area,
      client.event_from_city,
      client.event_to_city,
      client.source,
      client.handler,
      client.status,
      client.description,
      client.notes,
      client.package_amount?.toString(),
      client.advance_amount?.toString(),
    ].filter(Boolean).join(' ').toLowerCase().includes(searchLower)).slice(0, MAX_PREVIEW_RESULTS);
  }, [clients, query]);

  const saveSearch = (searchQuery: string) => {
    if (!searchQuery.trim()) return;
    const updated = [
      { query: searchQuery.trim(), timestamp: Date.now() },
      ...recentSearches.filter(s => s.query.toLowerCase() !== searchQuery.toLowerCase())
    ].slice(0, MAX_RECENT);
    setRecentSearches(updated);
    try { localStorage.setItem(RECENT_SEARCH_KEY, JSON.stringify(updated)); } catch {}
  };

  const handleResultClick = (client: AgencyClient) => {
    saveSearch(query);
    navigate(`/company/clients/${client.id}`);
    setIsExpanded(false);
    setQuery('');
  };

  const handlePointerDown = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    const el = recentRowRef.current;
    if (!el) return;
    isDragging.current = true;
    startX.current = e.clientX;
    startScrollLeft.current = el.scrollLeft;
    el.setPointerCapture(e.pointerId);
    el.style.cursor = 'grabbing';
  }, []);

  const handlePointerMove = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    const el = recentRowRef.current;
    if (!isDragging.current || !el) return;
    el.scrollLeft = startScrollLeft.current - (e.clientX - startX.current);
    updateScrollButtons();
  }, [updateScrollButtons]);

  const handlePointerUp = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    const el = recentRowRef.current;
    isDragging.current = false;
    if (!el) return;
    el.releasePointerCapture(e.pointerId);
    el.style.cursor = 'grab';
  }, []);

  const scrollLeft = useCallback(() => {
    recentRowRef.current?.scrollBy({ left: -SCROLL_AMOUNT, behavior: 'smooth' });
    setTimeout(updateScrollButtons, 200);
  }, [updateScrollButtons]);

  const scrollRight = useCallback(() => {
    recentRowRef.current?.scrollBy({ left: SCROLL_AMOUNT, behavior: 'smooth' });
    setTimeout(updateScrollButtons, 200);
  }, [updateScrollButtons]);

  const recentToShow = recentSearches.slice(0, MAX_DISPLAY_RECENT);

  if (!isExpanded) {
    return (
      <button
        onClick={() => setIsExpanded(true)}
        className="w-full min-w-0 h-10 rounded-full font-bold uppercase tracking-wider flex items-center justify-center gap-2 px-3 overflow-hidden bg-[#111] text-[#FFD700] border-2 border-[#FFD700] shadow-lg transition-all text-xs hover:scale-[1.02] active:scale-[0.98]"
      >
        <Search className="w-4 h-4 shrink-0" />
        <span className="truncate">Saugat Search</span>
      </button>
    );
  }

  return (
    <div className="fixed inset-0 z-[9999] flex items-start justify-center pt-[12vh]">
      <div className="absolute inset-0 bg-black/70" onClick={() => { setIsExpanded(false); setQuery(''); }} />
      <div ref={containerRef} className="relative w-[700px] max-w-[90vw] rounded-2xl overflow-hidden bg-[#111] border-2 border-[#FFD700] shadow-[0_0_40px_rgba(255,215,0,0.35)]">
        <button onClick={() => { setIsExpanded(false); setQuery(''); }} className="absolute top-4 right-4 z-10 p-1.5 rounded-full hover:bg-yellow-500/20 transition-colors">
          <X className="w-5 h-5 text-[#FFD700]" />
        </button>

        <div className="pt-6 pb-3 px-6 text-center">
          <h2 className="text-2xl font-black uppercase tracking-[0.2em] bg-gradient-to-br from-[#FFD700] via-[#FFA500] to-[#FFD700] bg-clip-text text-transparent drop-shadow-[0_0_10px_rgba(255,215,0,0.35)]">
            ⚡ SAUGAT SEARCH ⚡
          </h2>
          <p className="text-[10px] uppercase tracking-[0.3em] mt-1 text-[#B8860B]">Find anything instantly</p>
        </div>

        <div className="px-6 pb-3">
          <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-[#FFD700]" />
            <input
              ref={inputRef}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search clients, events, handlers..."
              className="w-full h-14 pl-12 pr-12 rounded-xl text-base font-semibold outline-none bg-[#1a1a1a] border-2 border-[#FFD700] text-[#FFD700] caret-[#FFD700] placeholder:text-[#806f24]"
              onKeyDown={(e) => {
                if (e.key === 'Escape') {
                  setIsExpanded(false);
                  setQuery('');
                }
              }}
            />
            {query && (
              <button onClick={() => setQuery('')} className="absolute right-4 top-1/2 -translate-y-1/2 p-1 rounded-full hover:bg-yellow-500/20 transition-colors">
                <X className="w-4 h-4 text-[#FFD700]" />
              </button>
            )}
          </div>
        </div>

        <div className="px-6 pb-3">
          {query.trim().length < 2 && (
            <p className="text-xs mb-2 flex items-center gap-1 px-1 uppercase tracking-wider font-bold text-[#B8860B]">
              <Clock className="w-3 h-3" /> Recent Searches
            </p>
          )}
          {recentToShow.length > 0 ? (
            <div className="relative flex items-center gap-1">
              {canScrollLeft && <button onClick={scrollLeft} className="shrink-0 w-6 h-6 flex items-center justify-center rounded-full bg-[#333] text-[#FFD700] transition-colors z-10"><ChevronLeft className="w-4 h-4" /></button>}
              <div ref={recentRowRef} onPointerDown={handlePointerDown} onPointerMove={handlePointerMove} onPointerUp={handlePointerUp} onPointerCancel={handlePointerUp} onScroll={updateScrollButtons} className="flex gap-2 overflow-x-auto pb-2 cursor-grab active:cursor-grabbing flex-1 select-none scrollbar-hide">
                {recentToShow.map((item, i) => (
                  <button key={i} onClick={() => setQuery(item.query)} className="shrink-0 px-3 py-1.5 rounded-full text-xs font-bold uppercase tracking-wider whitespace-nowrap bg-[#1a1a1a] text-[#FFD700] border border-[#FFD700] transition-all duration-150 hover:scale-105">
                    {item.query}
                  </button>
                ))}
              </div>
              {canScrollRight && <button onClick={scrollRight} className="shrink-0 w-6 h-6 flex items-center justify-center rounded-full bg-[#333] text-[#FFD700] transition-colors z-10"><ChevronRight className="w-4 h-4" /></button>}
            </div>
          ) : query.trim().length < 2 ? (
            <p className="text-xs italic px-1 text-[#666]">No recent searches</p>
          ) : null}
        </div>

        {query.trim().length >= 2 && results.length > 0 && (
          <div className="px-6 pb-4 max-h-72 overflow-y-auto">
            <p className="text-xs mb-2 px-1 font-bold uppercase tracking-wider text-[#B8860B]">{results.length} result{results.length !== 1 ? 's' : ''} found</p>
            <div className="space-y-1">
              {results.map((client) => (
                <button key={client.id} onClick={() => handleResultClick(client)} className="w-full flex items-start gap-3 px-3 py-3 rounded-xl transition-colors text-left hover:bg-yellow-500/10 border border-[#333]">
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#FFD700] to-[#FFA500] flex items-center justify-center shrink-0">
                    <User className="w-5 h-5 text-black" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                      <span className="font-bold truncate text-[#FFD700]">{client.client_name}</span>
                      <Badge className="text-[10px] shrink-0 border font-bold bg-[#1a1a1a] text-[#FFA500] border-[#FFA500]">{getMatchedField(client, query)}</Badge>
                    </div>
                    <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs text-[#888]">
                      {client.contact_number && <span className="flex items-center gap-1"><Phone className="w-3 h-3" />{client.contact_number}</span>}
                      {client.event_name && <span className="flex items-center gap-1"><Calendar className="w-3 h-3" />{client.event_name}</span>}
                      {client.event_city && <span className="flex items-center gap-1"><MapPin className="w-3 h-3" />{client.event_city}</span>}
                      {client.handler && <span className="flex items-center gap-1"><Briefcase className="w-3 h-3" />{client.handler}</span>}
                    </div>
                    {client.status && <span className="inline-block mt-1 text-[10px] bg-[#332800] text-[#FFD700] px-2 py-0.5 rounded-full font-bold">{client.status}</span>}
                  </div>
                  <ChevronRight className="w-4 h-4 text-[#FFD700] shrink-0 mt-3" />
                </button>
              ))}
            </div>
          </div>
        )}
        {query.trim().length >= 2 && results.length === 0 && clients.length > 0 && (
          <div className="px-6 pb-6 text-center">
            <p className="text-sm text-[#888]">No results found for <span className="text-[#FFD700]">"{query}"</span></p>
          </div>
        )}
      </div>
    </div>
  );
}

export default function CompanyHome() {
  const navigate = useNavigate();
  const { data: profile } = useMyProfile();
  const { data: clients = [] } = useAgencyClients();
  const { data: allEvents = [] } = useAllAgencyEvents();

  const companyName = profile?.business_name || profile?.full_name || 'My Company';
  const bookedCount = clients.filter(c => c.status === 'booked').length;

  // Events this month — uses Nepali (BS) month, since BS is the primary calendar.
  const currentBS = useMemo(() => getCurrentBSDate(), []);
  const eventsThisMonthStats = useMemo(() => {
    const todayMs = new Date().setHours(0, 0, 0, 0);
    let total = 0;
    let remaining = 0;
    for (const event of allEvents) {
      if (!event.event_date_ad) continue;
      const eventDate = parseISO(event.event_date_ad);
      if (Number.isNaN(eventDate.getTime())) continue;
      const bs = adToBS(eventDate);
      if (bs.year !== currentBS.year || bs.month !== currentBS.month) continue;
      total += 1;
      if (eventDate.getTime() >= todayMs) remaining += 1;
    }
    return { total, remaining };
  }, [allEvents, currentBS.year, currentBS.month]);

  const upcomingEvents = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    return allEvents
      .map((event) => {
        if (!event.event_date_ad) return null;
        const eventDate = parseISO(event.event_date_ad);
        if (Number.isNaN(eventDate.getTime())) return null;
        eventDate.setHours(0, 0, 0, 0);
        const daysUntil = Math.ceil((eventDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
        if (daysUntil < 0) return null;
        return { ...event, eventDate, daysUntil };
      })
      .filter(Boolean)
      .sort((a, b) => a!.daysUntil - b!.daysUntil);
  }, [allEvents]);

  // Upcoming events only (today and forward) for crew demand
  const upcomingEventIds = useMemo(() => {
    const todayMs = new Date().setHours(0, 0, 0, 0);
    return allEvents
      .filter(e => {
        if (!e.event_date_ad) return false;
        const d = parseISO(e.event_date_ad);
        return !Number.isNaN(d.getTime()) && d.getTime() >= todayMs;
      })
      .map(e => e.id);
  }, [allEvents]);

  const { data: crewAssignments = [] } = useCrewAssignments(upcomingEventIds);

  const crewStats = useMemo(() => {
    const upcomingSet = new Set(upcomingEventIds);
    const required: Record<string, number> = {};
    const assigned: Record<string, number> = {};
    CREW_COLUMNS.forEach(c => { required[c.key] = 0; assigned[c.key] = 0; });

    // Tally required from each upcoming event
    const requiredPerEvent = new Map<string, Set<string>>();
    for (const e of allEvents) {
      if (!upcomingSet.has(e.id)) continue;
      const roles = (e.required_crew || '').split(',').map(s => s.trim()).filter(Boolean);
      requiredPerEvent.set(e.id, new Set(roles));
      for (const r of roles) {
        if (r in required) required[r] += 1;
      }
    }

    // Tally assignments only when role was required for that event
    for (const a of crewAssignments) {
      if (!a.assigned_freelancer) continue;
      const reqSet = requiredPerEvent.get(a.event_id);
      if (reqSet?.has(a.role) && a.role in assigned) {
        assigned[a.role] += 1;
      }
    }

    const totalRequired = Object.values(required).reduce((s, n) => s + n, 0);
    const totalAssigned = Object.values(assigned).reduce((s, n) => s + n, 0);
    return { required, assigned, totalRequired, totalAssigned, totalRemaining: totalRequired - totalAssigned };
  }, [allEvents, upcomingEventIds, crewAssignments]);

  const moduleCards = [
    {
      icon: UserPlus,
      label: 'Add Client',
      description: 'Register a new booked client',
      path: '/company/quick-add',
      gradient: 'from-blue-600 to-indigo-600',
      shadow: 'shadow-blue-500/25',
    },
    {
      icon: CalendarCheck,
      label: 'Booked Clients',
      description: `${bookedCount} confirmed bookings`,
      path: '/company/booked',
      gradient: 'from-green-500 to-emerald-600',
      shadow: 'shadow-green-500/25',
    },
    {
      icon: Calendar,
      label: 'Events This Month',
      description: `${eventsThisMonthStats.remaining} / ${eventsThisMonthStats.total} remaining`,
      path: '/company/all-clients',
      gradient: 'from-violet-500 to-purple-600',
      shadow: 'shadow-violet-500/25',
    },
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="border-b border-gray-200 bg-white sticky top-0 z-50 shadow-sm">
        <div className="px-6 py-4 flex items-center gap-4">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center shadow-lg shadow-violet-500/30">
            <span className="text-white font-bold text-lg">{companyName.charAt(0)}</span>
          </div>
          <div>
            <h1 className="text-lg font-bold text-gray-900">{companyName}</h1>
            <p className="text-xs text-gray-500">Business Suite</p>
          </div>
        </div>
      </div>

      <div className="px-6 py-8 max-w-5xl mx-auto space-y-8">
        {/* Module Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6">
          {moduleCards.map((mod) => {
            const Icon = mod.icon;
            return (
              <button
                key={mod.path}
                onClick={() => navigate(mod.path)}
                className={`group bg-white rounded-2xl border border-gray-200 p-6 shadow-sm hover:shadow-lg ${mod.shadow} transition-all text-left`}
              >
                <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${mod.gradient} flex items-center justify-center mb-4 shadow-lg ${mod.shadow}`}>
                  <Icon className="w-6 h-6 text-white" />
                </div>
                <h3 className="font-bold text-gray-900 text-lg group-hover:text-violet-700 transition-colors">
                  {mod.label}
                </h3>
                <p className="text-sm text-gray-500 mt-1">{mod.description}</p>
              </button>
            );
          })}
          <CompanyCalendarCard events={allEvents} />
        </div>

        {/* Crew Required */}
        <button
          type="button"
          onClick={() => navigate('/company/all-clients')}
          className="w-full text-left rounded-2xl bg-white border border-gray-200 shadow-sm hover:shadow-lg hover:border-amber-300 transition-all p-5 md:p-6"
        >
          <div className="flex items-center gap-3 mb-4">
            <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center shadow-md shadow-amber-500/25">
              <UsersRound className="w-5 h-5 text-white" />
            </div>
            <div className="flex-1 min-w-0">
              <h2 className="text-base md:text-lg font-bold text-gray-900">Crew Required</h2>
              <p className="text-xs text-gray-500">Across all upcoming events</p>
            </div>
            <ArrowRight className="w-5 h-5 text-gray-400" />
          </div>

          <div className="grid grid-cols-3 gap-2 md:gap-3 mb-4">
            <div className="rounded-xl bg-gray-50 border border-gray-200 px-3 py-2.5 text-center">
              <p className="text-[10px] uppercase tracking-wider font-semibold text-gray-500">Required</p>
              <p className="text-xl md:text-2xl font-black text-gray-900 tabular-nums">{crewStats.totalRequired}</p>
            </div>
            <div className="rounded-xl bg-emerald-50 border border-emerald-200 px-3 py-2.5 text-center">
              <p className="text-[10px] uppercase tracking-wider font-semibold text-emerald-700">Assigned</p>
              <p className="text-xl md:text-2xl font-black text-emerald-700 tabular-nums">{crewStats.totalAssigned}</p>
            </div>
            <div className="rounded-xl bg-rose-50 border border-rose-200 px-3 py-2.5 text-center">
              <p className="text-[10px] uppercase tracking-wider font-semibold text-rose-700">Remaining</p>
              <p className="text-xl md:text-2xl font-black text-rose-700 tabular-nums">{crewStats.totalRemaining}</p>
            </div>
          </div>

          <div className="flex flex-wrap gap-1.5">
            {CREW_COLUMNS.map(col => {
              const req = crewStats.required[col.key] || 0;
              const asg = crewStats.assigned[col.key] || 0;
              const isEmpty = req === 0;
              const isFull = req > 0 && asg >= req;
              return (
                <span
                  key={col.key}
                  className={cn(
                    'inline-flex items-center gap-1 px-2 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider border',
                    isEmpty
                      ? 'bg-gray-50 text-gray-400 border-gray-200'
                      : isFull
                      ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                      : 'bg-amber-50 text-amber-700 border-amber-200'
                  )}
                >
                  {col.shortCode}
                  <span className="tabular-nums font-black">{asg}/{req}</span>
                </span>
              );
            })}
          </div>
        </button>

        <CompanyMasterSearch clients={clients} />

        {/* Upcoming Events */}
        <div className="relative overflow-hidden rounded-2xl bg-white border border-gray-200 shadow-sm w-full max-w-full">
          <div className={cn(
            'absolute left-0 top-0 bottom-0 w-1 bg-gradient-to-b',
            upcomingEvents.length > 0 ? 'from-emerald-500 to-teal-600' : 'from-gray-300 to-gray-400'
          )} />
          <div className="relative z-10 p-3 md:p-8 pl-3 md:pl-7">
            <div className="flex items-center gap-2 md:gap-3 mb-2.5 md:mb-4">
              <div className={cn(
                'w-9 h-9 md:w-12 md:h-12 rounded-xl flex items-center justify-center shadow-md',
                upcomingEvents.length > 0 ? 'bg-gradient-to-br from-emerald-500 to-teal-600' : 'bg-gradient-to-br from-gray-400 to-gray-500'
              )}>
                <Calendar className="w-4 h-4 md:w-6 md:h-6 text-white" />
              </div>
              <div className="flex-1 min-w-0">
                <h2 className="text-sm md:text-2xl font-bold text-gray-900">Upcoming Events</h2>
                <p className="text-[11px] md:text-sm text-gray-500">
                  {upcomingEvents.length > 0
                    ? `${upcomingEvents.length} event${upcomingEvents.length > 1 ? 's' : ''} scheduled`
                    : 'No upcoming events'}
                </p>
              </div>
              <div className="h-9 rounded-full font-semibold px-4 flex items-center gap-1.5 text-[11px] md:text-xs shrink-0 bg-gradient-to-r from-orange-500 via-red-500 to-purple-600 shadow-md shadow-orange-500/25 text-white">
                <Calendar className="w-3.5 h-3.5 shrink-0" />
                <span>{format(new Date(), 'MMM d')}</span>
              </div>
            </div>

            {upcomingEvents.length > 0 ? (
              <div className="max-h-[180px] md:max-h-[400px] overflow-y-auto overflow-x-hidden pr-1 scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-transparent">
                <div className="space-y-2">
                  {upcomingEvents.slice(0, 30).map((event, idx) => {
                    const isToday = event!.daysUntil === 0;
                    const isTomorrow = event!.daysUntil === 1;
                    const isUrgent = event!.daysUntil <= 3;
                    const waLink = event!.whatsapp_number
                      ? `https://wa.me/${event!.whatsapp_number.replace(/[^0-9]/g, '')}`
                      : null;

                    return (
                      <div
                        key={`${event!.id}-${idx}`}
                        className="p-2.5 rounded-xl bg-gray-50 hover:bg-gray-100 border border-gray-200 hover:border-emerald-300 transition-all group"
                      >
                        <div className="flex items-start gap-2">
                          <div className="flex items-center gap-1.5 shrink-0 mt-0.5">
                            {isToday ? (
                              <>
                                <Sparkles className="w-4 h-4 text-emerald-500" />
                                <span className="text-xs font-medium text-white uppercase tracking-wide px-2 py-0.5 bg-gradient-to-r from-emerald-500 to-teal-600 rounded-full shadow-sm">TODAY</span>
                              </>
                            ) : (
                              <>
                                <Clock className="w-4 h-4 text-gray-400" />
                                <span className={cn(
                                  'text-xs font-medium px-2 py-0.5 rounded-full',
                                  isTomorrow ? 'bg-amber-100 text-amber-700' : isUrgent ? 'bg-orange-100 text-orange-700' : 'bg-gray-100 text-gray-600'
                                )}>
                                  {formatDaysUntil(event!.daysUntil)}
                                </span>
                              </>
                            )}
                          </div>
                          <button
                            type="button"
                            onClick={() => navigate(`/company/clients/${event!.client_id}`)}
                            className="flex-1 min-w-0 text-left"
                          >
                            <div className="flex items-center justify-between gap-1.5">
                              <p className="text-gray-900 font-semibold truncate group-hover:text-emerald-700 transition-colors">{event!.client_name}</p>
                              <span className="shrink-0 text-[10px] font-bold text-white px-2 py-0.5 rounded-full bg-gradient-to-r from-orange-500 via-red-500 to-purple-600 shadow-sm shadow-orange-500/20">
                                {event!.event_date_bs ? `${event!.event_date_bs} / ${format(event!.eventDate, 'MMM d')}` : format(event!.eventDate, 'MMM d')}
                              </span>
                            </div>
                            <p className="text-sm font-medium text-emerald-600 truncate">{event!.event_name || 'Event'}</p>
                            {event!.event_city && (
                              <p className="mt-1 flex items-center gap-1 text-xs text-gray-500 truncate">
                                <MapPin className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                                {event!.event_city}
                              </p>
                            )}
                          </button>
                          <div className="flex items-center gap-1 shrink-0">
                            {event!.contact_number && (
                              <a href={`tel:${event!.contact_number}`} className="flex items-center gap-1 px-1.5 py-1 rounded-full bg-blue-50 hover:bg-blue-100 text-blue-600 text-xs transition-colors">
                                <Phone className="w-3 h-3" />
                                <span className="hidden sm:inline">...{event!.contact_number.slice(-4)}</span>
                              </a>
                            )}
                            {waLink && (
                              <a href={waLink} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 px-1.5 py-1 rounded-full bg-green-50 hover:bg-green-100 text-green-600 text-xs transition-colors">
                                <MessageCircle className="w-3 h-3" />
                                <span className="hidden sm:inline">...{event!.whatsapp_number!.slice(-4)}</span>
                              </a>
                            )}
                          </div>
                          <button type="button" onClick={() => navigate(`/company/clients/${event!.client_id}`)} className="shrink-0">
                            <ArrowRight className="w-5 h-5 text-gray-400 group-hover:text-emerald-600 group-hover:translate-x-1 transition-all" />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ) : (
              <div className="py-6 text-center text-sm text-gray-500">Add booked clients with event dates to see them here.</div>
            )}
          </div>
        </div>


      </div>
    </div>
  );
}
